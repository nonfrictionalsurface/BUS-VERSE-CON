import { api } from '@/lib/api/client';

export type DriverKycStatus = 'INVITED' | 'SIGNED_UP' | 'KYC_PENDING' | 'VERIFIED' | 'KYC_FAILED' | 'ACTIVE' | 'BLOCKED' | 'DEACTIVATED';

export interface AdminDriver {
  id: string;
  userId: string;
  name: string;
  phone: string;
  licenseNumber: string;
  kycStatus: DriverKycStatus;
  onDuty: boolean;
  verifiedAt: string | null;
  createdAt: string;
  operatorName?: string;
  operatorId?: string;
}

export const adminDriversApi = {
  listAll: async (): Promise<AdminDriver[]> => {
    const res = await api.get<AdminDriver[]>('/dev/list-all-drivers');
    return res.data;
  },
  approve: async (id: string): Promise<void> => {
    await api.post(`/dev/verify-driver/${id}`, {});
  },
  reject: async (id: string, reason: string): Promise<void> => {
    await api.post(`/dev/reject-driver/${id}`, { reason });
  },
};