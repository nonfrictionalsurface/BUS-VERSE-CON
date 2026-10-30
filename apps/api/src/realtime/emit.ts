import type { Server as SocketIOServer } from 'socket.io';
import { logger } from '../lib/logger.js';
import type { EventEnvelope } from './events.js';

const BUS_POSITION_FLOOR_MS = 3000;

let ioRef: SocketIOServer | null = null;
const lastBusPositionEmit = new Map<string, number>();

export function setIO(io: SocketIOServer | null): void {
  ioRef = io;
}

export function getIO(): SocketIOServer | null {
  return ioRef;
}

interface WireEnvelope {
  event: string;
  data: Record<string, unknown>;
  ts: string;
}

function toWire(e: EventEnvelope): WireEnvelope {
  return { event: e.event, data: e.data, ts: new Date().toISOString() };
}

function safeEmit(target: string, e: EventEnvelope): void {
  const io = ioRef;
  if (!io) {
    logger.warn({ event: e.event, target }, 'emit skipped - ws not attached');
    return;
  }
  try {
    io.to(target).emit('message', toWire(e));
  } catch (err) {
    logger.warn({ err, event: e.event, target }, 'emit failed');
  }
}

export function emitToTopic(topic: string, e: EventEnvelope): void {
  safeEmit(topic, e);
}

export function emitToBooking(bookingId: string, e: EventEnvelope): void {
  safeEmit(`booking:${bookingId}`, e);
}

export function emitBusPositionThrottled(tripId: string, e: EventEnvelope): void {
  const now = Date.now();
  const last = lastBusPositionEmit.get(tripId) ?? 0;
  if (now - last < BUS_POSITION_FLOOR_MS) {
    logger.debug({ tripId, deltaMs: now - last }, 'bus:position throttled');
    return;
  }
  lastBusPositionEmit.set(tripId, now);
  emitToTopic(`trip:live:${tripId}`, e);
}

export function clearThrottleState(tripId: string): void {
  lastBusPositionEmit.delete(tripId);
}

export function clearAllThrottleState(): void {
  lastBusPositionEmit.clear();
}