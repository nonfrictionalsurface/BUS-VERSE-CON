import { api } from '@/lib/api/client';

export type KycStatus = 'INVITED' | 'SIGNED_UP' | 'KYC_PENDING' | 'VERIFIED' | 'KYC_FAILED' | 'ACTIVE' | 'BLOCKED' | 'DEACTIVATED';

export interface Driver {
  id: string;
  userId: string;
  name: string;
  phone: string;
  licenseNumber: string;
  kycStatus: KycStatus;
  onDuty: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export interface InviteDriverInput {
  name: string;
  phone: string;
  licenseNumber: string;
}

export const driversApi = {
  list: async (): Promise<Driver[]> => {
    const res = await api.get<Driver[]>('/operator/drivers?limit=50');
    return res.data;
  },
  invite: async (data: InviteDriverInput): Promise<Driver> => {
    const res = await api.post<Driver>('/operator/drivers/invite', data);
    return res.data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/operator/drivers/${id}`);
  },
  // Dev-only: verify a driver
  verify: async (id: string): Promise<void> => {
    await api.post(`/dev/verify-driver/${id}`, {});
  }
};