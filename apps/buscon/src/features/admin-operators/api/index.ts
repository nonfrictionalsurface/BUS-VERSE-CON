import { api } from '@/lib/api/client';

export type OperatorStatus = 'APPLIED' | 'APPROVED' | 'SUSPENDED' | 'DEACTIVATED';

export interface AdminOperator {
  id: string;
  companyName: string;
  gstin: string;
  email: string;
  phone: string;
  status: OperatorStatus;
  busCount?: number;
  routeCount?: number;
  createdAt: string;
}

export const adminOperatorsApi = {
  list: async (): Promise<AdminOperator[]> => {
    const res = await api.get<AdminOperator[]>('/admin/operators?limit=100');
    return res.data;
  },
  suspend: async (id: string, reason: string): Promise<void> => {
    await api.post(`/admin/operators/${id}/suspend`, { reason });
  },
  // Backend has no /unsuspend endpoint — /approve reinstates
  unsuspend: async (id: string): Promise<void> => {
    await api.post(`/admin/operators/${id}/approve`, { reason: 'Reinstated by platform admin after review' });
  }
};