import * as events from '../../realtime/events.js';
import { emitBusPositionThrottled, emitToTopic } from '../../realtime/emit.js';
import { prisma } from '../../lib/prisma.js';
import { redis, keys } from '../../lib/redis.js';
import { runProvenance, type RawGpsSample, type NormalizedSample } from '../../lib/gps.js';
import * as repo from './trip.repository.js';
import { tripErrors } from './trip.errors.js';

const GPS_LIST_MAX = 720;
const GPS_TTL_SEC = 6 * 3600;
const GPS_PG_EVERY_N = 6;

const GPS_FAIL_KEY_PREFIX = 'gps:fail:';
const GPS_FAIL_THRESHOLD = 3;

async function recordGpsFailure(
  tripId: string,
  driverId: string,
  failureType: events.GpsFailureType,
): Promise<void> {
  try {
    const key = GPS_FAIL_KEY_PREFIX + tripId;
    const count = await redis.incr(key);
    await redis.expire(key, GPS_TTL_SEC);
    if (count >= GPS_FAIL_THRESHOLD && count % GPS_FAIL_THRESHOLD === 0) {
      emitToTopic('trip:live:' + tripId, events.gpsAnomaly({
        tripId,
        driverId,
        failureCount: count,
        lastFailureType: failureType,
        detectedAt: new Date().toISOString(),
      }));
    }
  } catch {
    /* Redis down: skip emit, no throw */
  }
}

export interface GpsIngestResult {
  accepted: boolean;
  serverSpeedKmh: number | null;
}

async function readPreviousSample(tripId: string): Promise<NormalizedSample | null> {
  try {
    const raw = await redis.lindex(keys.gpsTrip(tripId), 0);
    if (raw) return JSON.parse(raw) as NormalizedSample;
  } catch { /* fall through to Postgres */ }

  const lastPg = await prisma.gpsSample.findFirst({
    where: { tripId },
    orderBy: { recordedAt: 'desc' },
  });
  if (!lastPg) return null;
  return {
    lat: Number(lastPg.lat),
    lng: Number(lastPg.lng),
    serverSpeedKmh: lastPg.speedKmh !== null ? Number(lastPg.speedKmh) : null,
    clientSpeedKmh: lastPg.clientReportedSpeedKmh !== null ? Number(lastPg.clientReportedSpeedKmh) : 0,
    accuracyM: lastPg.accuracyM !== null ? Number(lastPg.accuracyM) : 0,
    recordedAt: lastPg.recordedAt.toISOString(),
    receivedAt: lastPg.receivedAt.toISOString(),
    timestampDrift: false,
  };
}
export async function ingestGpsSample(
  userId: string,
  tripId: string,
  body: RawGpsSample,
  deviceHashes: { sessionDeviceHash: string | null; activeSessionDeviceHash: string | null },
): Promise<GpsIngestResult> {
  const trip = await repo.findTripForDriver(userId, tripId);
  if (!trip) throw tripErrors.notFound();
  if (trip.status !== 'IN_PROGRESS') throw tripErrors.notInProgress();

  const previous = await readPreviousSample(tripId);
  const receivedAt = new Date();

  let outcome;
  try {
    outcome = runProvenance({
      current: body,
      previous,
      receivedAt,
      sessionDeviceHash: deviceHashes.sessionDeviceHash,
      activeSessionDeviceHash: deviceHashes.activeSessionDeviceHash,
    });
  } catch (err) {
    const errCode = (err as { code?: string }).code;
    let failType: events.GpsFailureType | null = null;
    if (errCode === 'TELEPORT_DETECTED') failType = 'TELEPORT_DETECTED';
    else if (errCode === 'INVALID_COORDINATES' || errCode === 'INVALID_ACCURACY') failType = 'COORDINATE_INVALID';
    if (failType && trip.driver.id) void recordGpsFailure(tripId, trip.driver.id, failType).catch(() => {});
    throw err;
  }

  if (!outcome.accepted || !outcome.sample) {
    if (outcome.reason === 'speed_mismatch' && trip.driver.id) {
      void recordGpsFailure(tripId, trip.driver.id, 'SPEED_MISMATCH').catch(() => {});
    }
    return { accepted: false, serverSpeedKmh: null };
  }

  const redisKey = keys.gpsTrip(tripId);
  try {
    await redis.lpush(redisKey, JSON.stringify(outcome.sample));
    await redis.ltrim(redisKey, 0, GPS_LIST_MAX - 1);
    await redis.expire(redisKey, GPS_TTL_SEC);
  } catch { /* non-fatal: Redis down, Postgres below still persists */ }

  let counter = 0;
  try {
    const counterKey = `gps:count:${tripId}`;
    counter = await redis.incr(counterKey);
    await redis.expire(counterKey, GPS_TTL_SEC);
  } catch { counter = GPS_PG_EVERY_N; /* force write when Redis down */ }

  if (counter % GPS_PG_EVERY_N === 0) {
    await prisma.gpsSample.create({
      data: {
        tripId,
        lat: outcome.sample.lat,
        lng: outcome.sample.lng,
        speedKmh: outcome.sample.serverSpeedKmh,
        accuracyM: outcome.sample.accuracyM,
        clientReportedSpeedKmh: outcome.sample.clientSpeedKmh,
        receivedAt: new Date(outcome.sample.receivedAt),
        recordedAt: new Date(outcome.sample.recordedAt),
      },
    });
  }

  emitBusPositionThrottled(tripId, events.busPosition({
    tripId,
    scheduleId: trip.scheduleId,
    lat: outcome.sample.lat,
    lng: outcome.sample.lng,
    speedKmh: outcome.sample.serverSpeedKmh ?? 0,
    bearing: null,
    accuracyM: outcome.sample.accuracyM,
    recordedAt: outcome.sample.recordedAt,
    receivedAt: outcome.sample.receivedAt,
    nextStandId: null,
    etaMinutes: null,
  }));

  return { accepted: true, serverSpeedKmh: outcome.sample.serverSpeedKmh };
}