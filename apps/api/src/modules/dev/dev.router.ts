import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';

const schema = z.object({ email: z.string().email() });

export async function devRouter(server: FastifyInstance): Promise<void> {
  if (process.env.NODE_ENV === 'production') return;

  server.post('/dev/verify-and-approve-operator', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(422).send({ error: { code: 'VALIDATION_ERROR', message: 'Email required' } });
    }
    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No user with that email' } });

    const ou = await prisma.operatorUser.findFirst({ where: { userId: user.id } });
    if (!ou) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No operator profile' } });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { emailVerified: true } });
      await tx.operator.update({ where: { id: ou.operatorId }, data: { status: 'APPROVED' } });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          entityType: 'operator',
          entityId: ou.operatorId,
          action: 'operator_auto_approved_dev',
          reason: 'Dev mode: email verified + operator auto-approved',
          metadataJson: { _v: 1, source: 'dev_router', email },
        },
      });
    });

    return reply.send({ data: { ok: true, userId: user.id, operatorId: ou.operatorId, email } });
  });
}