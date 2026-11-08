import * as events from '../../realtime/events.js';
import { emitToBooking } from '../../realtime/emit.js';
import { prisma } from '../../lib/prisma.js';
import { writeAuditEvent } from '../../lib/audit.js';
import { verify } from '../../lib/ed25519.js';
import { parseWireFormat } from '../../lib/qr.js';
import * as repo from './trip.repository.js';
import { tripErrors } from './trip.errors.js';
import type { ScanRequestDTO, ScanResultDTO } from './trip.types.js';

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isTripScannable(status: string): boolean {
  return status === 'SCHEDULED' || status === 'IN_PROGRESS';
}

interface ResolvedTicket {
  ticketId: string;
  bookingId: string;
  boardingStandId: string;
  primaryName: string;
  seatLabels: string[];
  passengerCount: number;
  bookingStatus: string;
  ticketStatus: string;
  scheduleId: string;
}
async function resolveFromQr(qrPayload: string, tripScheduleId: string): Promise<ResolvedTicket> {
  let parsed: ReturnType<typeof parseWireFormat>;
  try {
    parsed = parseWireFormat(qrPayload);
  } catch {
    throw tripErrors.invalidSignature();
  }

  const sigOk = await verify(parsed.signature, parsed.canonicalBytes);
  if (!sigOk) throw tripErrors.invalidSignature();

  const payload = parsed.payload;
  if (payload.scheduleId !== tripScheduleId) {
    throw tripErrors.invalidTrip('Schedule mismatch');
  }

  const ticket = await repo.findTicketForScan(payload.ticketId);
  if (!ticket) throw tripErrors.invalidBooking('Ticket not found');
  // SCANNED allowed through so DUPLICATE path runs; misuse on another trip
  // is caught by the post-duplicate guard in scanTicket.
  if (ticket.status !== 'ACTIVE' && ticket.status !== 'ISSUED' && ticket.status !== 'SCANNED') {
    throw tripErrors.invalidBooking('Ticket not active');
  }
  if (ticket.booking.scheduleId !== tripScheduleId) {
    throw tripErrors.invalidTrip('Ticket is for a different schedule');
  }
  if (ticket.booking.status !== 'CONFIRMED' && ticket.booking.status !== 'CHECKED_IN') {
    throw tripErrors.invalidBooking('Booking is cancelled or not confirmed');
  }

  const passengers = ticket.booking.passengers;
  if (passengers.length === 0) throw tripErrors.invalidBooking('No passengers on booking');

  return {
    ticketId: ticket.id,
    bookingId: ticket.bookingId,
    boardingStandId: ticket.booking.boardingStandId,
    primaryName: passengers[0]!.name,
    seatLabels: passengers.map((p) => p.seat.seatLabel),
    passengerCount: passengers.length,
    bookingStatus: ticket.booking.status,
    ticketStatus: ticket.status,
    scheduleId: ticket.booking.scheduleId,
  };
}
async function resolveFromManual(
  bookingReference: string,
  primaryPassengerName: string,
  tripScheduleId: string,
): Promise<ResolvedTicket> {
  const booking = await repo.findBookingByReferenceAndSchedule(bookingReference, tripScheduleId);
  if (!booking) throw tripErrors.invalidBooking('Booking not found for this trip');
  if (!booking.ticket) throw tripErrors.invalidBooking('No ticket issued for this booking');
  if (booking.status !== 'CONFIRMED' && booking.status !== 'CHECKED_IN') {
    throw tripErrors.invalidBooking('Booking is cancelled or not confirmed');
  }
  const passengers = booking.passengers;
  if (passengers.length === 0) throw tripErrors.invalidBooking('No passengers on booking');
  if (normalizeName(passengers[0]!.name) !== normalizeName(primaryPassengerName)) {
    throw tripErrors.invalidBooking('Passenger name does not match');
  }
  return {
    ticketId: booking.ticket.id,
    bookingId: booking.id,
    boardingStandId: booking.boardingStandId,
    primaryName: passengers[0]!.name,
    seatLabels: passengers.map((p) => p.seat.seatLabel),
    passengerCount: passengers.length,
    bookingStatus: booking.status,
    ticketStatus: booking.ticket.status,
    scheduleId: booking.scheduleId,
  };
}

/**
 * Development only. With DEMO_SCAN_BYPASS=true every scan succeeds without checking the ticket
 * (handy for a live demo). Off by default and ignored in production.
 */
function demoScan(body: ScanRequestDTO): ScanResultDTO {
  let name = body.primaryPassengerName ?? 'Demo Passenger';
  try {
    if (body.qrPayload && body.qrPayload.startsWith('v1:')) {
      const b64 = body.qrPayload.split(':')[1] ?? '';
      const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as { primaryPassengerName?: string };
      name = json.primaryPassengerName ?? name;
    }
  } catch {
    // keep the default name
  }
  return {
    result: 'VALID',
    ticketId: 'DEMO-TCK',
    bookingId: 'DEMO-BKG',
    primaryPassengerName: name,
    seatLabels: ['A1'],
    passengerCount: 1,
    bookingStatus: 'CHECKED_IN',
    scannedAt: new Date().toISOString(),
  };
}

export async function scanTicket(
  userId: string,
  tripId: string,
  body: ScanRequestDTO,
  actorIp?: string | undefined,
): Promise<ScanResultDTO> {
  if (process.env.DEMO_SCAN_BYPASS === 'true' && process.env.NODE_ENV !== 'production') return demoScan(body);
  const trip = await repo.findTripForDriver(userId, tripId);
  if (!trip) throw tripErrors.notFound();
  if (!isTripScannable(trip.status)) {
    if (trip.status === 'CANCELLED') throw tripErrors.invalidTrip('Trip cancelled');
    throw tripErrors.notActive();
  }

  const resolved = body.manualEntry
    ? await resolveFromManual(body.bookingReference ?? '', body.primaryPassengerName ?? '', trip.scheduleId)
    : await resolveFromQr(body.qrPayload ?? '', trip.scheduleId);

  const existing = await repo.findExistingScanForTicket(resolved.ticketId, tripId);
  if (!existing && resolved.ticketStatus === 'SCANNED') {
    throw tripErrors.invalidBooking('Ticket already used on another trip');
  }
  if (existing) {
    return {
      result: 'DUPLICATE',
      ticketId: resolved.ticketId,
      bookingId: resolved.bookingId,
      primaryPassengerName: resolved.primaryName,
      seatLabels: resolved.seatLabels,
      passengerCount: resolved.passengerCount,
      bookingStatus: 'CHECKED_IN',
      scannedAt: existing.scannedAt.toISOString(),
      originalScannedAt: existing.scannedAt.toISOString(),
    };
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.boardingScan.create({
      data: {
        tripId,
        ticketId: resolved.ticketId,
        driverId: trip.driverId,
        standId: resolved.boardingStandId,
        result: 'VALID',
        scannedAt: now,
        scannedLat: body.scannedLat ?? null,
        scannedLng: body.scannedLng ?? null,
      },
    });
    await tx.ticket.update({
      where: { id: resolved.ticketId },
      data: { status: 'SCANNED', scannedAt: now },
    });
    await tx.booking.update({
      where: { id: resolved.bookingId },
      data: { status: 'CHECKED_IN', checkedInAt: now },
    });
    await writeAuditEvent({
      tx,
      actorId: userId,
      sessionId: null,
      entityType: 'Ticket',
      entityId: resolved.ticketId,
      action: 'ticket_scanned',
      ipAddress: actorIp ?? null,
      metadata: {
        tripId,
        bookingId: resolved.bookingId,
        passengerCount: resolved.passengerCount,
        manualEntry: body.manualEntry === true,
      },
    });
  });

  emitToBooking(resolved.bookingId, events.boardingVerified({
    bookingId: resolved.bookingId,
    ticketId: resolved.ticketId,
    passengerCount: resolved.passengerCount,
    allSeatLabels: resolved.seatLabels,
    boardedAt: now.toISOString(),
  }));

  return {
    result: 'VALID',
    ticketId: resolved.ticketId,
    bookingId: resolved.bookingId,
    primaryPassengerName: resolved.primaryName,
    seatLabels: resolved.seatLabels,
    passengerCount: resolved.passengerCount,
    bookingStatus: 'CHECKED_IN',
    scannedAt: now.toISOString(),
  };
}
