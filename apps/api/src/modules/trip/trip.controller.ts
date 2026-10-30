import type { FastifyReply, FastifyRequest } from 'fastify';
import { success } from '../../lib/response.js';
import * as schema from './trip.schema.js';
import * as svc from './trip.service.js';
import * as gps from './gps.service.js';
import * as scan from './scan.service.js';

function actorIp(request: FastifyRequest): string | undefined {
  const xff = request.headers['x-forwarded-for'];
  if (typeof xff === 'string') return xff.split(',')[0]?.trim();
  return request.ip;
}

// ---------- Driver trip surface ----------

export async function getMyTrips(request: FastifyRequest, reply: FastifyReply) {
  const q = schema.tripListQuerySchema.parse(request.query ?? {});
  const rows = await svc.listDriverTrips(request.user!.userId, { date: q.date });
  return reply.status(200).send(success(rows));
}

export async function getTrip(request: FastifyRequest, reply: FastifyReply) {
  const { id } = schema.tripIdParamSchema.parse(request.params);
  const row = await svc.getTripDetail(request.user!.userId, id);
  return reply.status(200).send(success(row));
}

export async function postStartTrip(request: FastifyRequest, reply: FastifyReply) {
  const { id } = schema.tripIdParamSchema.parse(request.params);
  const row = await svc.startTrip(request.user!.userId, id, actorIp(request));
  return reply.status(200).send(success(row));
}

export async function postEndTrip(request: FastifyRequest, reply: FastifyReply) {
  const { id } = schema.tripIdParamSchema.parse(request.params);
  const row = await svc.endTrip(request.user!.userId, id, actorIp(request));
  return reply.status(200).send(success(row));
}

export async function getManifest(request: FastifyRequest, reply: FastifyReply) {
  const { id } = schema.tripIdParamSchema.parse(request.params);
  const row = await svc.getManifest(request.user!.userId, id);
  return reply.status(200).send(success(row));
}

export async function getHistory(request: FastifyRequest, reply: FastifyReply) {
  const q = schema.historyQuerySchema.parse(request.query ?? {});
  const result = await svc.listHistory(request.user!.userId, {
    from: q.from,
    to: q.to,
    limit: q.limit,
    cursor: q.cursor,
  });
  return reply.status(200).send(success(result.data, { nextCursor: result.nextCursor }));
}
// ---------- GPS + scan ----------

export async function postGps(request: FastifyRequest, reply: FastifyReply) {
  const { id } = schema.tripIdParamSchema.parse(request.params);
  const body = schema.gpsBodySchema.parse(request.body ?? {});
  const session = await import('../../lib/prisma.js').then((m) =>
    m.prisma.session.findUnique({
      where: { id: request.user!.sessionId },
      select: { deviceFingerprintHash: true },
    }),
  );
  const result = await gps.ingestGpsSample(
    request.user!.userId,
    id,
    {
      lat: body.lat,
      lng: body.lng,
      speedKmh: body.speedKmh,
      accuracyM: body.accuracyM,
      recordedAt: body.recordedAt,
    },
    {
      sessionDeviceHash: session?.deviceFingerprintHash ?? null,
      activeSessionDeviceHash: session?.deviceFingerprintHash ?? null,
    },
  );
  return reply.status(200).send(success(result));
}

export async function postScan(request: FastifyRequest, reply: FastifyReply) {
  const { id } = schema.tripIdParamSchema.parse(request.params);
  const body = schema.scanBodySchema.parse(request.body ?? {});
  const result = await scan.scanTicket(request.user!.userId, id, body, actorIp(request));
  return reply.status(200).send(success(result));
}

// ---------- Delay ----------

export async function postDelay(request: FastifyRequest, reply: FastifyReply) {
  const { id } = schema.tripIdParamSchema.parse(request.params);
  const body = schema.delayBodySchema.parse(request.body ?? {});
  const result = await svc.reportDelay(
    request.user!.userId,
    id,
    { reason: body.reason, delayMinutes: body.delayMinutes, notes: body.notes },
    actorIp(request),
  );
  return reply.status(200).send(success(result));
}

// ---------- Me + config ----------

export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const row = await svc.getDriverMe(request.user!.userId);
  return reply.status(200).send(success(row));
}

export async function getConfig(request: FastifyRequest, reply: FastifyReply) {
  const row = await svc.getDriverConfig(request.user!.userId);
  return reply.status(200).send(success(row));
}
// ---------- Uploads (buscon/02 §14, mock) ----------

export async function postDriverUploads(request: FastifyRequest, reply: FastifyReply) {
  const body = schema.uploadUrlBodySchema.parse(request.body ?? {});
  const result = await svc.createDriverUploadUrl(request.user!.userId, body);
  return reply.status(201).send(success(result));
}

export async function postDriverDocuments(request: FastifyRequest, reply: FastifyReply) {
  const body = schema.attachDocsBodySchema.parse(request.body ?? {});
  const result = await svc.attachDriverDocuments(request.user!.userId, body, actorIp(request));
  return reply.status(200).send(success(result));
}

export async function postCancelTrip(request: FastifyRequest, reply: FastifyReply) {
  const { id } = schema.tripIdParamSchema.parse(request.params);
  const body = schema.cancelTripBodySchema.parse(request.body ?? {});
  const result = await svc.cancelTrip(request.user!.userId, id, { reason: body.reason }, actorIp(request));
  return reply.status(200).send(success(result));
}