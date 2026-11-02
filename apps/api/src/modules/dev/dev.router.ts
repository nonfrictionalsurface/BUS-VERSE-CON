import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';

const verifyApproveSchema = z.object({ email: z.string().email() });
const assignDriverSchema = z.object({
  scheduleId: z.string().min(1),
  driverId: z.string().min(1),
});

export async function devRouter(server: FastifyInstance): Promise<void> {
  if (process.env.NODE_ENV === 'production') return;

  // ============================================================
  // 1. POST /dev/verify-and-approve-operator
  // ============================================================
  server.post('/dev/verify-and-approve-operator', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = verifyApproveSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(422).send({ error: { code: 'VALIDATION_ERROR', message: 'Email required', details: parsed.error.issues } });
    }
    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No user with that email' } });
    const operatorUser = await prisma.operatorUser.findFirst({ where: { userId: user.id } });
    if (!operatorUser) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User has no operator profile' } });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { emailVerified: true } });
      await tx.operator.update({ where: { id: operatorUser.operatorId }, data: { status: 'APPROVED' } });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          entityType: 'operator',
          entityId: operatorUser.operatorId,
          action: 'operator_auto_approved_dev',
          reason: 'Dev mode: email verified + operator approved',
          metadataJson: { _v: 1, source: 'dev_router', email },
        },
      });
    });

    return reply.send({ data: { ok: true, userId: user.id, operatorId: operatorUser.operatorId, email } });
  });

  // ============================================================
  // 2. GET /dev/list-all-drivers
  // ============================================================
  server.get('/dev/list-all-drivers', async (_req: FastifyRequest, reply: FastifyReply) => {
    const drivers = await prisma.driverProfile.findMany({
      where: { deletedAt: null },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({
      data: drivers.map((d) => ({
        id: d.id,
        name: d.user.name,
        phone: d.user.phone,
        kycStatus: d.kycStatus,
        onDuty: d.onDuty,
      })),
    });
  });

  // ============================================================
  // 3. POST /dev/verify-driver/:id
  // ============================================================
  server.post('/dev/verify-driver/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    try {
      const driver = await prisma.driverProfile.update({
        where: { id },
        data: { kycStatus: 'VERIFIED', verifiedAt: new Date() },
      });
      return reply.send({ data: { id: driver.id, kycStatus: driver.kycStatus } });
    } catch (err: any) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: err?.message || 'Driver not found' } });
    }
  });

  // ============================================================
  // 4. POST /dev/reject-driver/:id
  // ============================================================
  server.post('/dev/reject-driver/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    try {
      const driver = await prisma.driverProfile.update({
        where: { id },
        data: { kycStatus: 'KYC_FAILED' },
      });
      return reply.send({ data: { id: driver.id, kycStatus: driver.kycStatus } });
    } catch (err: any) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: err?.message || 'Driver not found' } });
    }
  });

  // ============================================================
  // 5. GET /dev/operator/trips
  // ============================================================
  server.get('/dev/operator/trips', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as any).user;
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No user' } });
    const opUser = await prisma.operatorUser.findFirst({ where: { userId: user.userId } });
    if (!opUser) return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not an operator' } });

    const trips = await prisma.trip.findMany({
      where: { deletedAt: null, schedule: { operatorId: opUser.operatorId, deletedAt: null } },
      include: { driver: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return reply.send({
      data: trips.map((t: any) => ({
        tripId: t.id,
        scheduleId: t.scheduleId,
        busId: t.busId,
        status: t.status,
        startedAt: t.startedAt,
        endedAt: t.endedAt,
        driverId: t.driverId,
        driverName: t.driver?.user?.name || 'Unassigned',
        driverPhone: t.driver?.user?.phone || '',
      })),
    });
  });

  // ============================================================
  // 6. POST /dev/assign-driver
  // ============================================================
  server.post('/dev/assign-driver', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as any).user;
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No user' } });

    const parsed = assignDriverSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(422).send({ error: { code: 'VALIDATION_ERROR', message: 'scheduleId + driverId required', details: parsed.error.issues } });
    }
    const { scheduleId, driverId } = parsed.data;

    const opUser = await prisma.operatorUser.findFirst({ where: { userId: user.userId } });
    if (!opUser) return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not an operator' } });

    const schedule = await prisma.schedule.findFirst({ where: { id: scheduleId, operatorId: opUser.operatorId, deletedAt: null } });
    if (!schedule) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Schedule not found' } });

    const driver = await prisma.driverProfile.findFirst({ where: { id: driverId, operatorId: opUser.operatorId, deletedAt: null } });
    if (!driver) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Driver not found' } });

    let trip = await prisma.trip.findFirst({ where: { scheduleId, deletedAt: null } });
    if (trip) {
      if (trip.status === 'IN_PROGRESS' || trip.status === 'COMPLETED') {
        return reply.status(409).send({ error: { code: 'TRIP_IN_PROGRESS', message: `Cannot reassign: trip is ${trip.status}` } });
      }
      trip = await prisma.trip.update({ where: { id: trip.id }, data: { driverId, updatedAt: new Date() } });
    } else {
      trip = await prisma.trip.create({
        data: { scheduleId, busId: schedule.busId, driverId, status: 'SCHEDULED' } as any,
      });
    }

    return reply.send({ data: { tripId: trip.id, scheduleId: trip.scheduleId, driverId: trip.driverId, status: trip.status } });
  });

  // ============================================================
  // 7. POST /dev/unassign-driver/:tripId
  // ============================================================
  server.post('/dev/unassign-driver/:tripId', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as any).user;
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No user' } });
    const { tripId } = req.params as { tripId: string };
    const opUser = await prisma.operatorUser.findFirst({ where: { userId: user.userId } });
    if (!opUser) return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not an operator' } });

    const trip = await prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null, schedule: { operatorId: opUser.operatorId } },
    });
    if (!trip) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    if (trip.status === 'IN_PROGRESS' || trip.status === 'COMPLETED') {
      return reply.status(409).send({ error: { code: 'TRIP_IN_PROGRESS', message: `Cannot unassign: trip is ${trip.status}` } });
    }

    await prisma.trip.update({ where: { id: trip.id }, data: { deletedAt: new Date() } });
    return reply.send({ data: { ok: true, tripId } });
  });

  // ============================================================
  // 8. DELETE /dev/delete-schedule/:id  ← SINGLE, CLEAN
  // ============================================================
  server.delete('/dev/delete-schedule/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as any).user;
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No user' } });

    const { id } = req.params as { id: string };
    if (!id) return reply.status(422).send({ error: { code: 'VALIDATION_ERROR', message: 'id required' } });

    const opUser = await prisma.operatorUser.findFirst({ where: { userId: user.userId } });
    if (!opUser) return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not an operator' } });

    const schedule = await prisma.schedule.findFirst({
      where: { id, operatorId: opUser.operatorId, deletedAt: null },
    });
    if (!schedule) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: `Schedule ${id} not found or already deleted` } });
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Unassign trips first
        await tx.trip.updateMany({
          where: { scheduleId: id, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        // Soft-delete schedule
        await tx.schedule.update({
          where: { id },
          data: { deletedAt: new Date(), status: 'CANCELLED' } as any,
        });
        // Audit
        await tx.auditLog.create({
          data: {
            actorId: user.userId,
            entityType: 'schedule',
            entityId: id,
            action: 'schedule_deleted',
            reason: 'Operator deleted schedule',
            metadataJson: { _v: 1, source: 'dev_router' },
          },
        });
      });

      return reply.send({ data: { ok: true, id } });
    } catch (err: any) {
      console.error('[dev/delete-schedule] failed:', err);
      return reply.status(500).send({
        error: {
          code: 'DELETE_FAILED',
          message: err?.message || 'Delete failed',
          details: { scheduleId: id },
        },
      });
    }
  });
}
