import { api } from '@/lib/api/client';

export interface AuditLog {
  id: string;
  action?: string;
  entity?: string;
  entityType?: string;
  entityId?: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  reason?: string | null;
  createdAt: string;
}

export const auditApi = {
  list: async (): Promise<AuditLog[]> => {
    const res = await api.get<AuditLog[]>('/admin/audit-logs?limit=50');
    return res.data;
  }
};