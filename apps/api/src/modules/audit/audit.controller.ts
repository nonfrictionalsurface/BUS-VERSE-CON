import type { FastifyReply, FastifyRequest } from 'fastify';
import { success } from '../../lib/response.js';
import * as schema from './audit.schema.js';
import * as svc from './audit.service.js';

export async function getAuditLogs(request: FastifyRequest, reply: FastifyReply) {
  const q = schema.auditListQuerySchema.parse(request.query ?? {});
  const result = await svc.listAuditLogs({
    entityType: q.entityType,
    entityId: q.entityId,
    actorId: q.actorId,
    action: q.action,
    from: q.from,
    to: q.to,
    limit: q.limit,
    cursor: q.cursor,
  });
  return reply.status(200).send(success(result.data, { nextCursor: result.nextCursor }));
}

export async function getAuditLogsExport(request: FastifyRequest, reply: FastifyReply) {
  const q = schema.auditExportQuerySchema.parse(request.query ?? {});
  const result = await svc.exportAuditLogsCsv({
    entityType: q.entityType,
    entityId: q.entityId,
    actorId: q.actorId,
    action: q.action,
    from: q.from,
    to: q.to,
  });
  const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  return reply
    .status(200)
    .header('Content-Type', 'text/csv; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .header('X-Export-Row-Count', String(result.rowCount))
    .header('X-Export-Capped', String(result.capped))
    .send(result.csv);
}

export async function postAuditLogsExportAsync(request: FastifyRequest, reply: FastifyReply) {
  const body = schema.auditExportQuerySchema.parse(request.body ?? {});
  const result = await svc.queueAuditExport({
    entityType: body.entityType,
    entityId: body.entityId,
    actorId: body.actorId,
    action: body.action,
    from: body.from,
    to: body.to,
  });
  return reply.status(202).send(success({ jobId: result.jobId }));
}

export async function getAuditLogsExportStatus(request: FastifyRequest, reply: FastifyReply) {
  const { jobId } = request.params as { jobId: string };
  const result = await svc.getAuditExportStatus(jobId);
  if (result.status === 'not_found') {
    return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Export job not found' } });
  }
  return reply.status(200).send(success(result));
}