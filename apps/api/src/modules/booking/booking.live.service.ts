import { redis, keys } from '../../lib/redis.js';
import { errors } from '../../lib/errors.js';
import { computeEta } from '../../lib/eta.js';
import * as repo from '../trip/trip.repository.js';
import type { NormalizedSample } from '../../lib/gps.js';
import type {
  LiveTripDTO,
  LiveTripEtaDTO,
  LiveTripPositionDTO,
  MapDTO,
  TripStatus,
} from '../trip/trip.types.js';

const STALE_MS = 30_000;

async function readRedisSamples(tripId: string): Promise<NormalizedSample[]> {
  try {
    const raws = await redis.lrange(keys.gpsTrip(tripId), 0, -1);
    return raws.map((r) => JSON.parse(r) as NormalizedSample);
  } catch {
    return [];
  }
}

export async function getLiveTrip(userId: string, tripId: string): Promise<LiveTripDTO> {
  const trip = await repo.findTripForPassenger(userId, tripId);
  if (!trip) throw errors.notFound('Trip not found or not accessible');

  const samples = await readRedisSamples(tripId);
  const occupancy = await repo.findOccupancyForSchedule(trip.scheduleId);

  if (samples.length === 0) {
    return {
      tripId,
      status: trip.status as TripStatus,
      currentPosition: null,
      speedKmh: null,
      lastUpdatedAt: null,
      isStale: true,
      eta: [],
      occupancy,
      nextStandId: null,
    };
  }

  const latest = samples[0]!;
  const lastUpdatedAt = latest.receivedAt;
  const isStale = Date.now() - new Date(lastUpdatedAt).getTime() > STALE_MS;

  const routeStands = trip.schedule.route.stands.map((s) => ({
    standId: s.stand.id,
    standName: s.stand.name,
    sequence: s.sequence,
    distanceFromPrevKm: Number(s.distanceFromPrevKm),
  }));

  const ordered = samples
    .slice()
    .reverse()
    .map((s) => ({ lat: s.lat, lng: s.lng, recordedAt: s.recordedAt }));

  const etaResult = computeEta({ samples: ordered, routeStands, now: new Date() });

  const currentPosition: LiveTripPositionDTO = {
    lat: latest.lat,
    lng: latest.lng,
    recordedAt: latest.recordedAt,
  };
  const eta: LiveTripEtaDTO[] = etaResult.eta;

  return {
    tripId,
    status: trip.status as TripStatus,
    currentPosition,
    speedKmh: latest.serverSpeedKmh,
    lastUpdatedAt,
    isStale,
    eta,
    occupancy,
    nextStandId: etaResult.nextStandId,
  };
}
export async function getMap(userId: string, tripId: string): Promise<MapDTO> {
  const trip = await repo.findTripForPassenger(userId, tripId);
  if (!trip) throw errors.notFound('Trip not found or not accessible');

  const samples = await readRedisSamples(tripId);
  const latest = samples[0] ?? null;

  const stands = trip.schedule.route.stands.map((s) => ({
    standId: s.stand.id,
    standName: s.stand.name,
    lat: Number(s.stand.lat),
    lng: Number(s.stand.lng),
    sequence: s.sequence,
  }));

  return {
    tripId,
    route: {
      originCity: trip.schedule.route.originCity.name,
      destinationCity: trip.schedule.route.destCity.name,
      stands,
    },
    currentPosition: latest ? { lat: latest.lat, lng: latest.lng, recordedAt: latest.recordedAt } : null,
    lastUpdatedAt: latest?.receivedAt ?? null,
  };
}