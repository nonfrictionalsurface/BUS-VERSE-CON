import { describe, it, expect } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { newUuid } from '../../src/lib/ids.js';
import { writeAuditEvent } from '../../src/lib/audit.js';

describe('audit_logs DELETE immutability', () => {
  it('DELETE via raw SQL is rejected by trigger', async () => {
    const entityId = newUuid();
    const auditId = await writeAuditEvent({
      actorId: null, sessionId: null,
      entityType: 'Test', entityId, action: 'delete_trigger_test',
    });
    expect(typeof auditId).toBe('string');
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM audit_logs WHERE id = '${auditId}'::uuid`),
    ).rejects.toThrow(/append-only|DELETE rejected/);
    const row = await prisma.auditLog.findUnique({ where: { id: auditId } });
    expect(row).not.toBeNull();
  });
});