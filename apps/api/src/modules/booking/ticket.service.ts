import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { sign } from '../../lib/ed25519.js';
import { canonicalizeToBytes, buildWireFormat, MAX_PAYLOAD_BYTES, type QRPayloadV2 } from '../../lib/qr.js';
import { newUuid } from '../../lib/ids.js';

export interface IssueTicketInput {
  bookingId: string;
  scheduleId: string;
  boardingStandId: string;
  passengers: Array<{ seatId: string; seatLabel: string; name: string }>;
}

export async function issueTicket(
  tx: Prisma.TransactionClient,
  input: IssueTicketInput,
): Promise<{ ticketId: string; qrPayload: string; qrSignature: string; wireFormat: string }> {
  if (input.passengers.length === 0) throw new Error('Cannot issue ticket without passengers');
  if (input.passengers.length > 8) throw new Error('Too many passengers for one ticket');

  const sorted = [...input.passengers].sort((a, b) => a.seatLabel.localeCompare(b.seatLabel));
  const primary = sorted[0]!;

  const payload: QRPayloadV2 = {
    v: 1,
    ticketId: newUuid(),
    bookingId: input.bookingId,
    scheduleId: input.scheduleId,
    primarySeatId: primary.seatId,
    primarySeatLabel: primary.seatLabel,
    primaryPassengerName: primary.name,
    passengerCount: sorted.length,
    allSeatLabels: sorted.map((p) => p.seatLabel),
    boardingStandId: input.boardingStandId,
    issuedAt: new Date().toISOString(),
    nonce: randomBytes(16).toString('base64'),
  };

  const canonicalBytes = canonicalizeToBytes(payload);
  if (canonicalBytes.length > MAX_PAYLOAD_BYTES) {
    throw new Error(`QR payload ${canonicalBytes.length}B exceeds ${MAX_PAYLOAD_BYTES}B limit`);
  }

  const signature = await sign(canonicalBytes);
  const qrPayload = Buffer.from(canonicalBytes).toString('base64');
  const qrSignature = Buffer.from(signature).toString('base64');
  const wireFormat = buildWireFormat(payload, signature);

  const ticket = await tx.ticket.create({
    data: {
      id: payload.ticketId,
      bookingId: input.bookingId,
      qrPayload,
      qrSignature,
      status: 'ISSUED',
    },
    select: { id: true },
  });

  return { ticketId: ticket.id, qrPayload, qrSignature, wireFormat };
}