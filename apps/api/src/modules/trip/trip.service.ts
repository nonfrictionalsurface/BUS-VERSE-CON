import * as events from '../../realtime/events.js';
import { emitToTopic, clearThrottleState } from '../../realtime/emit.js';
import { prisma } from '../../lib/prisma.js';
import { writeAuditEvent } from '../../lib/audit.js';
import { logger } from '../../lib/logger.js';
import { errors } from '../../lib/errors.js';
import * as repo from './trip.repository.js';
import { tripErrors } from './trip.errors.js';
import {
  TRIP_START_WINDOW_MS,
  DELAY_MIN_MINUTES,
  DELAY_MAX_MINUTES,
  type TripStatus,
  type DriverTripSummaryDTO,
  type TripDetailDTO,
  type StartTripResultDTO,
  type EndTripResultDTO,
  type DelayReportDTO,
  type DelayReason,
  type ManifestDTO,
  type ManifestStandGroupDTO,
  type ManifestPassengerDTO,
  type DriverMeDTO,
  type DriverConfigDTO,
} from './trip.types.js';

function mapTripSummary(t: Awaited<ReturnType<typeof repo.findTripsForDriver>>[number]): DriverTripSummaryDTO {
  return {
    tripId: t.id,
    scheduleId: t.scheduleId,
    bus: t.bus,
    route: {
      originCity: t.route.originCityName,
      destinationCity: t.route.destCityName,
    },
    departureTime: t.departureTime.toISOString(),
    arrivalTime: t.arrivalTime.toISOString(),
    status: t.status as TripStatus,
    boardedCount: t.counts.boarded,
    confirmedCount: t.counts.confirmed,
  };
}

export async function listDriverTrips(
  userId: string,
  opts: { date?: string | undefined },
): Promise<DriverTripSummaryDTO[]> {
  const rows = await repo.findTripsForDriver(userId, opts.date);
  return rows.map(mapTripSummary);
}

export async function getTripDetail(
  userId: string,
  tripId: string,
): Promise<TripDetailDTO> {
  const t = await repo.findTripForDriver(userId, tripId);
  if (!t) throw tripErrors.notFound();

  const counts = await repo.findTripsForDriver(userId, undefined).then(
    (all) => all.find((x) => x.id === tripId)?.counts ?? { boarded: 0, confirmed: 0 },
  );

  const boardingStands = t.schedule.route.stands.map((s) => ({
    standId: s.stand.id,
    standName: s.stand.name,
    sequence: s.sequence,
  }));

  return {
    tripId: t.id,
    scheduleId: t.schedule.id,
    bus: t.bus,
    route: {
      originCity: t.schedule.route.originCity.name,
      destinationCity: t.schedule.route.destCity.name,
    },
    departureTime: t.schedule.departureTime.toISOString(),
    arrivalTime: t.schedule.arrivalTime.toISOString(),
    status: t.status as TripStatus,
    boardedCount: counts.boarded,
    confirmedCount: counts.confirmed,
    busId: t.bus.id,
    driverId: t.driverId,
    boardingStands,
    startedAt: t.startedAt?.toISOString() ?? null,
    endedAt: t.endedAt?.toISOString() ?? null,
    cancelledAt: t.cancelledAt?.toISOString() ?? null,
    delayReason: (t.delayReason as DelayReason | null) ?? null,
    delayMinutes: t.delayMinutes,
    distanceKm: t.distanceKm ? Number(t.distanceKm) : null,
  };
}
// ---------- Start pre-checks (buscon/02 §7.2 + §7.3) ----------
// Note: license expiry check skipped — driver_profiles has no licenseExpiresAt column yet.
// Wire when Phase 7 adds the column.

type StartContext = {
  trip: NonNullable<Awaited<ReturnType<typeof repo.findTripForStart>>>;
  driver: NonNullable<Awaited<ReturnType<typeof repo.findDriverContextForStart>>>;
  userId: string;
  now: Date;
};

async function runStartPreChecks(ctx: StartContext): Promise<void> {
  const { trip, driver, userId, now } = ctx;

  // 1. Driver not blocked/deactivated (checked first so TS narrowing works)
  if (driver.kycStatus === 'BLOCKED' || driver.kycStatus === 'DEACTIVATED') {
    throw tripErrors.driverBlocked();
  }
  // 2. Driver KYC must be VERIFIED or ACTIVE
  if (driver.kycStatus !== 'VERIFIED' && driver.kycStatus !== 'ACTIVE') {
    throw tripErrors.driverNotVerified();
  }
  // 3. (license expiry — skipped, no column)
  // 4. Bus approved
  if (trip.bus.approvalStatus !== 'APPROVED') {
    throw tripErrors.busNotApproved();
  }
  // 5. Bus has layout
  if (!trip.bus.layout) {
    throw tripErrors.busLayoutMissing();
  }
  // 6. Schedule is published (not cancelled)
  if (trip.schedule.status === 'CANCELLED') {
    throw tripErrors.scheduleCancelled();
  }
  if (trip.schedule.status !== 'PUBLISHED') {
    throw tripErrors.notActive();
  }
  // 7. Trip currently SCHEDULED (not already IN_PROGRESS/COMPLETED/CANCELLED)
  if (trip.status !== 'SCHEDULED') {
    if (trip.status === 'IN_PROGRESS') throw tripErrors.alreadyStarted();
    throw tripErrors.notActive();
  }
  // 8. Time window: within ±2h of scheduled departure
  const delta = Math.abs(now.getTime() - trip.schedule.departureTime.getTime());
  if (delta > TRIP_START_WINDOW_MS) {
    throw tripErrors.outsideWindow();
  }
  // 9. No other active trip for this driver
  const active = await repo.findActiveTripForDriver(userId);
  if (active && active.id !== trip.id) {
    throw tripErrors.activeTripExists(active.id);
  }
}
// ---------- Start trip (WF-D-02) ----------
// A5: SELECT ... FOR UPDATE on driver_profiles to prevent concurrent start race.
// Session metadata active_trip_id skipped — sessions has no metadata_json column.
// Double-start prevention comes from runStartPreChecks + FOR UPDATE, which is sufficient.

export async function startTrip(
  userId: string,
  tripId: string,
  actorIp?: string | undefined,
): Promise<StartTripResultDTO> {
  const trip = await repo.findTripForStart(tripId);
  if (!trip) throw tripErrors.notFound();

  const driver = await repo.findDriverContextForStart(userId);
  if (!driver) throw tripErrors.notAssigned();
  if (trip.driver.userId !== userId) throw tripErrors.notAssigned();

  const now = new Date();
  await runStartPreChecks({ trip, driver, userId, now });

  const startedAt = await prisma.$transaction(async (tx) => {
    // A5: row-lock driver_profiles so concurrent /start calls serialize
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM driver_profiles
      WHERE id = ${trip.driver.id}::uuid AND deleted_at IS NULL
      FOR UPDATE
    `;
    if (locked.length === 0) throw tripErrors.notAssigned();

    const updated = await tx.trip.updateMany({
      where: { id: tripId, status: 'SCHEDULED' },
      data: { status: 'IN_PROGRESS', startedAt: now },
    });
    if (updated.count === 0) throw tripErrors.alreadyStarted();

    await tx.driverProfile.update({
      where: { id: trip.driver.id },
      data: { onDuty: true },
    });

    await writeAuditEvent({
      tx,
      actorId: userId,
      sessionId: null,
      entityType: 'Trip',
      entityId: tripId,
      action: 'trip_started',
      ipAddress: actorIp ?? null,
      metadata: { scheduleId: trip.schedule.id, busId: trip.bus.id },
    });

    return now;
  });

  emitToTopic(`trip:live:${tripId}`, events.tripStarted({
    tripId,
    startedAt: startedAt.toISOString(),
  }));

  return {
    tripId,
    status: 'IN_PROGRESS',
    startedAt: startedAt.toISOString(),
  };
}
// ---------- End trip (WF-D-06) ----------
// Distance computed from all Postgres gps_samples (buscon/04 §18).
// Atomic: trips COMPLETED + driver.onDuty=false + audit_logs.

export async function endTrip(
  userId: string,
  tripId: string,
  actorIp?: string | undefined,
): Promise<EndTripResultDTO> {
  const trip = await repo.findTripForDriver(userId, tripId);
  if (!trip) throw tripErrors.notFound();
  if (trip.status !== 'IN_PROGRESS') throw tripErrors.notInProgress();

  const gpsRows = await prisma.gpsSample.findMany({
    where: { tripId },
    select: { lat: true, lng: true, recordedAt: true },
    orderBy: { recordedAt: 'asc' },
  });
  const { computeTripDistanceKm } = await import('../../lib/eta.js');
  const samples = gpsRows.map((r) => ({
    lat: Number(r.lat),
    lng: Number(r.lng),
    recordedAt: r.recordedAt,
  }));
  const distanceKm = computeTripDistanceKm(samples);

  const counts = await repo
    .findTripsForDriver(userId, undefined)
    .then((all) => all.find((x) => x.id === tripId)?.counts ?? { boarded: 0, confirmed: 0 });

  const now = new Date();
  const startedAtMs = trip.startedAt?.getTime() ?? now.getTime();
  const durationMinutes = Math.round((now.getTime() - startedAtMs) / 60_000);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.trip.updateMany({
      where: { id: tripId, status: 'IN_PROGRESS' },
      data: { status: 'COMPLETED', endedAt: now, distanceKm },
    });
    if (updated.count === 0) throw tripErrors.notInProgress();

    await tx.driverProfile.update({
      where: { id: trip.driverId },
      data: { onDuty: false },
    });

    await writeAuditEvent({
      tx,
      actorId: userId,
      sessionId: null,
      entityType: 'Trip',
      entityId: tripId,
      action: 'trip_ended',
      ipAddress: actorIp ?? null,
      metadata: { distanceKm, durationMinutes, boardedCount: counts.boarded },
    });
  });

  emitToTopic(`trip:live:${tripId}`, events.tripEnded({
    tripId,
    endedAt: now.toISOString(),
    distanceKm: Math.round(distanceKm * 100) / 100,
  }));
  clearThrottleState(tripId);

  return {
    tripId,
    status: 'COMPLETED',
    startedAt: trip.startedAt?.toISOString() ?? null,
    endedAt: now.toISOString(),
    durationMinutes,
    distanceKm: Math.round(distanceKm * 100) / 100,
    boardedCount: counts.boarded,
    confirmedCount: counts.confirmed,
  };
}
// ---------- Report delay (buscon/02 §12) ----------

export async function reportDelay(
  userId: string,
  tripId: string,
  body: { reason: DelayReason; delayMinutes: number; notes?: string | undefined },
  actorIp?: string | undefined,
): Promise<DelayReportDTO> {
  if (body.delayMinutes < DELAY_MIN_MINUTES || body.delayMinutes > DELAY_MAX_MINUTES) {
    throw tripErrors.notFound();
  }

  const trip = await repo.findTripForDriver(userId, tripId);
  if (!trip) throw tripErrors.notFound();
  if (trip.status !== 'IN_PROGRESS') throw tripErrors.notInProgress();

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.trip.update({
      where: { id: tripId },
      data: { delayReason: body.reason, delayMinutes: body.delayMinutes },
    });
    await writeAuditEvent({
      tx,
      actorId: userId,
      sessionId: null,
      entityType: 'Trip',
      entityId: tripId,
      action: 'trip_delayed',
      ipAddress: actorIp ?? null,
      metadata: {
        reason: body.reason,
        delayMinutes: body.delayMinutes,
        notes: body.notes ?? null,
      },
    });
  });

  emitToTopic(`trip:live:${tripId}`, events.tripDelayed({
    tripId,
    reason: body.reason as events.TripDelayReason,
    minutes: body.delayMinutes,
  }));

  return {
    tripId,
    delayReason: body.reason,
    delayMinutes: body.delayMinutes,
    reportedAt: now.toISOString(),
  };
}
// ---------- Manifest (buscon/05 §12) ----------

export async function getManifest(userId: string, tripId: string): Promise<ManifestDTO> {
  const trip = await repo.findTripForDriver(userId, tripId);
  if (!trip) throw tripErrors.notFound();

  const rows = await repo.findManifestRowsForSchedule(trip.scheduleId);
  const stands = await repo.findBoardingStandsForSchedule(trip.scheduleId);

  type Agg = {
    bookingId: string;
    bookingReference: string;
    seatLabels: string[];
    passengerNames: string[];
    boardingStatus: 'CONFIRMED' | 'BOARDED';
    boardedAt: string | null;
    boardingStandId: string;
  };

  const bookingsById = new Map<string, Agg>();
  for (const row of rows) {
    let agg = bookingsById.get(row.bookingId);
    if (!agg) {
      agg = {
        bookingId: row.bookingId,
        bookingReference: row.booking.bookingReference,
        seatLabels: [],
        passengerNames: [],
        boardingStatus: row.booking.status === 'CHECKED_IN' ? 'BOARDED' : 'CONFIRMED',
        boardedAt: row.booking.checkedInAt?.toISOString() ?? null,
        boardingStandId: row.booking.boardingStand.id,
      };
      bookingsById.set(row.bookingId, agg);
    }
    agg.seatLabels.push(row.seat.seatLabel);
    agg.passengerNames.push(row.name);
  }

  const byStandMap = new Map<string, ManifestStandGroupDTO>();
  for (const s of stands) {
    byStandMap.set(s.stand.id, {
      standId: s.stand.id,
      standName: s.stand.name,
      sequence: s.sequence,
      passengers: [],
    });
  }

  let totalPassengers = 0;
  let totalBoarded = 0;
  for (const agg of bookingsById.values()) {
    agg.seatLabels.sort();
    agg.passengerNames.sort();
    totalPassengers += agg.passengerNames.length;
    if (agg.boardingStatus === 'BOARDED') totalBoarded += agg.passengerNames.length;

    const passenger: ManifestPassengerDTO = {
      bookingId: agg.bookingId,
      bookingReference: agg.bookingReference,
      seatLabels: agg.seatLabels,
      passengerNames: agg.passengerNames,
      boardingStatus: agg.boardingStatus,
      boardedAt: agg.boardedAt,
    };

    const group = byStandMap.get(agg.boardingStandId);
    if (group) group.passengers.push(passenger);
    else
      byStandMap.set(agg.boardingStandId, {
        standId: agg.boardingStandId,
        standName: 'Unknown Stand',
        sequence: 999,
        passengers: [passenger],
      });
  }

  return {
    tripId,
    scheduleId: trip.scheduleId,
    totalPassengers,
    totalBoarded,
    lastUpdatedAt: new Date().toISOString(),
    byStand: Array.from(byStandMap.values()).sort((a, b) => a.sequence - b.sequence),
  };
}
// ---------- Past trips history (buscon/02 §11) ----------

export async function listHistory(
  userId: string,
  opts: { from?: string | undefined; to?: string | undefined; limit: number; cursor?: string | undefined },
): Promise<{ data: DriverTripSummaryDTO[]; nextCursor: string | null }> {
  let cursorCreatedAt: Date | undefined;
  if (opts.cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(opts.cursor, 'base64').toString('utf8')) as { createdAt: string };
      cursorCreatedAt = new Date(decoded.createdAt);
    } catch {
      throw tripErrors.notFound();
    }
  }

  const rows = await repo.findHistoryForDriver(userId, {
    ...(opts.from !== undefined ? { from: opts.from } : {}),
    ...(opts.to !== undefined ? { to: opts.to } : {}),
    limit: opts.limit,
    ...(cursorCreatedAt !== undefined ? { cursorCreatedAt } : {}),
  });

  const hasMore = rows.length > opts.limit;
  const data = hasMore ? rows.slice(0, opts.limit) : rows;
  const nextCursor = hasMore
    ? Buffer.from(JSON.stringify({ createdAt: data[data.length - 1]!.createdAt.toISOString() })).toString('base64')
    : null;

  const scheduleIds = data.map((t) => t.schedule.id);
  type CountRow = { scheduleId: string; status: string; cnt: number };
  const countRows =
    scheduleIds.length === 0
      ? []
      : await prisma.$queryRaw<CountRow[]>`
          SELECT bp.schedule_id AS "scheduleId", b.status, COUNT(*)::int AS cnt
          FROM booking_passengers bp
          JOIN bookings b ON b.id = bp.booking_id
          WHERE bp.schedule_id = ANY(${scheduleIds}::uuid[])
            AND bp.deleted_at IS NULL
            AND b.deleted_at IS NULL
            AND b.status IN ('CONFIRMED', 'CHECKED_IN')
          GROUP BY bp.schedule_id, b.status
        `;
  const countsMap = new Map<string, { boarded: number; confirmed: number }>();
  for (const id of scheduleIds) countsMap.set(id, { boarded: 0, confirmed: 0 });
  for (const r of countRows) {
    const cur = countsMap.get(r.scheduleId) ?? { boarded: 0, confirmed: 0 };
    if (r.status === 'CHECKED_IN') cur.boarded += r.cnt;
    cur.confirmed += r.cnt;
    countsMap.set(r.scheduleId, cur);
  }

  return {
    data: data.map((t) => {
      const counts = countsMap.get(t.schedule.id) ?? { boarded: 0, confirmed: 0 };
      return {
        tripId: t.id,
        scheduleId: t.schedule.id,
        bus: t.bus,
        route: {
          originCity: t.schedule.route.originCity.name,
          destinationCity: t.schedule.route.destCity.name,
        },
        departureTime: t.schedule.departureTime.toISOString(),
        arrivalTime: t.schedule.arrivalTime.toISOString(),
        status: t.status as TripStatus,
        boardedCount: counts.boarded,
        confirmedCount: counts.confirmed,
      };
    }),
    nextCursor,
  };
}
// ---------- Driver me + config (buscon/02 §4.4, §13.2) ----------

export async function getDriverMe(userId: string): Promise<DriverMeDTO> {
  const d = await repo.findDriverMeForUser(userId);
  if (!d) throw tripErrors.notFound();
  return {
    userId: d.user.id,
    phone: d.user.phone,
    name: d.user.name,
    licenseNumber: d.licenseNumber,
    kycStatus: d.kycStatus,
    onDuty: d.onDuty,
    operator: { id: d.operator.id, companyName: d.operator.companyName },
    verifiedAt: d.verifiedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
  };
}

export async function getDriverConfig(userId: string): Promise<DriverConfigDTO> {
  const d = await repo.findDriverMeForUser(userId);
  if (!d) throw tripErrors.notFound();
  const { getPublicKeyB64 } = await import('../../lib/ed25519.js');
  const qrPublicKey = await getPublicKeyB64();
  return {
    qrPublicKey,
    serverTime: new Date().toISOString(),
    minAppVersion: '1.0.0',
    featureFlags: { offlineScan: true, gpsTracking: true },
  };
}
// ---------- Driver uploads (buscon/02 §14, mock — real R2 in Phase 12) ----------

export async function createDriverUploadUrl(
  userId: string,
  body: { filename: string; contentType: string; purpose: string },
): Promise<{ uploadId: string; uploadUrl: string; expiresAt: string }> {
  const d = await repo.findDriverMeForUser(userId);
  if (!d) throw tripErrors.notFound();
  const { createSignedUploadUrl } = await import('../../lib/r2.js');
  return createSignedUploadUrl({
    userId,
    filename: body.filename,
    contentType: body.contentType,
    purpose: body.purpose,
  });
}

export async function attachDriverDocuments(
  userId: string,
  body: { uploadIds: string[] },
  actorIp?: string | undefined,
): Promise<{ attached: number; kycStatus: string }> {
  const d = await repo.findDriverMeForUser(userId);
  if (!d) throw tripErrors.notFound();

  const newKycStatus = d.kycStatus === 'INVITED' || d.kycStatus === 'SIGNED_UP' ? 'KYC_PENDING' : d.kycStatus;
  const current = (d.kycDocumentsJson as Record<string, unknown> | null) ?? {};
  const nextDocs = { ...current };
  const now = new Date().toISOString();
  for (const uploadId of body.uploadIds) {
    nextDocs[uploadId] = { uploadId, attachedAt: now };
  }

  await prisma.$transaction(async (tx) => {
    await tx.driverProfile.update({
      where: { id: d.id },
      data: {
        kycDocumentsJson: nextDocs as never,
        kycStatus: newKycStatus,
      },
    });
    await writeAuditEvent({
      tx,
      actorId: userId,
      sessionId: null,
      entityType: 'DriverProfile',
      entityId: d.id,
      action: 'driver_docs_attached',
      ipAddress: actorIp ?? null,
      metadata: { uploadIds: body.uploadIds, previousKycStatus: d.kycStatus },
    });
  });

  return { attached: body.uploadIds.length, kycStatus: newKycStatus };
}

// ---------- Cancel trip (Phase 12 — cascade via cancelBooking) ----------

export async function cancelTrip(
  userId: string,
  tripId: string,
  body: { reason: string },
  actorIp?: string | undefined,
): Promise<import('./trip.types.js').CancelTripResultDTO> {
  const trip = await repo.findTripForDriver(userId, tripId);
  if (!trip) throw tripErrors.notFound();

  if (trip.status === 'CANCELLED') {
    throw errors.invalidTransition('Trip is already cancelled');
  }
  if (trip.status === 'COMPLETED') {
    throw errors.invalidTransition('Cannot cancel a completed trip');
  }

  const bookings = await prisma.booking.findMany({
    where: {
      scheduleId: trip.scheduleId,
      deletedAt: null,
      status: { in: ['CONFIRMED', 'OPERATOR_CANCELLED', 'PENDING'] },
    },
    select: { id: true, userId: true, status: true },
  });

  const { cancelBooking, expirePendingBooking } = await import('../booking/booking.service.js');

  let cancelledBookings = 0;
  let refundedPaise = 0;

  for (const b of bookings) {
    try {
      if (b.status === 'CONFIRMED') {
        await prisma.booking.update({
          where: { id: b.id },
          data: { status: 'OPERATOR_CANCELLED' },
        });
        const result = await cancelBooking(b.userId, b.id);
        cancelledBookings++;
        refundedPaise += result.refund.amountPaise;
      } else if (b.status === 'OPERATOR_CANCELLED') {
        const result = await cancelBooking(b.userId, b.id);
        cancelledBookings++;
        refundedPaise += result.refund.amountPaise;
      } else if (b.status === 'PENDING') {
        await expirePendingBooking(b.id);
        cancelledBookings++;
      }
    } catch (err) {
      logger.warn({ err, bookingId: b.id, tripId }, 'cancelTrip: cascade failed for booking');
    }
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.trip.update({
      where: { id: tripId },
      data: { status: 'CANCELLED', cancelledAt: now },
    });
    await writeAuditEvent({
      tx,
      actorId: userId,
      sessionId: null,
      entityType: 'Trip',
      entityId: tripId,
      action: 'trip_cancelled',
      ipAddress: actorIp ?? null,
      metadata: {
        scheduleId: trip.scheduleId,
        reason: body.reason,
        cancelledBookings,
        refundedPaise,
      },
    });
  });

  emitToTopic('trip:live:' + tripId, events.tripCancelled({
    tripId,
    reason: body.reason,
  }));
  clearThrottleState(tripId);

  return {
    tripId,
    status: 'CANCELLED',
    cancelledBookings,
    refundedPaise,
  };
}