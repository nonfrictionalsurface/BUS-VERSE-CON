import type { Socket } from 'socket.io';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import type { WsClaims } from './auth.js';

export interface SubscribeResult {
  allowed: boolean;
  reason?: string;
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const SEAT_AVAILABILITY_RE = new RegExp(`^seat:availability:(${UUID})$`);
const TRIP_LIVE_RE = new RegExp(`^trip:live:(${UUID})$`);
const BOOKING_RE = new RegExp(`^booking:(${UUID})$`);
const ADMIN_NOTIFICATIONS = 'admin:notifications';

async function canSeatAvailability(scheduleId: string): Promise<boolean> {
  const row = await prisma.schedule.findFirst({
    where: { id: scheduleId, status: 'PUBLISHED', deletedAt: null },
    select: { id: true },
  });
  return !!row;
}

async function canTripLive(tripId: string, claims: WsClaims): Promise<boolean> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { scheduleId: true },
  });
  if (!trip) return false;
  if (claims.role === 'SUPER_ADMIN') return true;
  const booking = await prisma.booking.findFirst({
    where: {
      userId: claims.userId,
      scheduleId: trip.scheduleId,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      deletedAt: null,
    },
    select: { id: true },
  });
  return !!booking;
}

async function canBooking(bookingId: string, claims: WsClaims): Promise<boolean> {
  if (claims.role === 'SUPER_ADMIN') return true;
  const b = await prisma.booking.findFirst({
    where: { id: bookingId, userId: claims.userId, deletedAt: null },
    select: { id: true },
  });
  return !!b;
}

export async function subscribeToTopic(
  socket: Socket,
  topic: string,
  claims: WsClaims,
): Promise<SubscribeResult> {
  if (topic === ADMIN_NOTIFICATIONS) {
    if (claims.role !== 'SUPER_ADMIN') return { allowed: false, reason: 'FORBIDDEN' };
    socket.join(topic);
    return { allowed: true };
  }

  let m = topic.match(SEAT_AVAILABILITY_RE);
  if (m) {
    if (!(await canSeatAvailability(m[1]!))) return { allowed: false, reason: 'SCHEDULE_NOT_FOUND' };
    socket.join(topic);
    return { allowed: true };
  }

  m = topic.match(TRIP_LIVE_RE);
  if (m) {
    if (!(await canTripLive(m[1]!, claims))) return { allowed: false, reason: 'FORBIDDEN' };
    socket.join(topic);
    return { allowed: true };
  }

  m = topic.match(BOOKING_RE);
  if (m) {
    if (!(await canBooking(m[1]!, claims))) return { allowed: false, reason: 'FORBIDDEN' };
    socket.join(topic);
    return { allowed: true };
  }

  logger.warn({ topic, userId: claims.userId }, 'unknown topic pattern');
  return { allowed: false, reason: 'UNKNOWN_TOPIC' };
}