import { api } from '@/lib/api/client';

export interface PendingOperator {
  id: string;
  userId: string;
  companyName: string;
  gstin: string;
  pan?: string;
  email: string;
  phone: string;
  status?: string;
  createdAt: string;
  bankAccountRef?: string | null;
}

export interface PendingBus {
  id: string;
  registrationNumber: string;
  model: string;
  capacity: number;
  busType?: string;
  amenities?: string[];
  approvalStatus?: string;
  operatorName?: string;
  insuranceDocRef?: string | null;
  insuranceExpiresAt?: string | null;
  createdAt: string;
}

export interface PendingRoute {
  id: string;
  originCity: { name: string; state?: string };
  destinationCity: { name: string; state?: string };
  approvalStatus: string;
  createdAt: string;
}

export interface PendingSchedule {
  id: string;
  bus: { registrationNumber: string; model?: string };
  route: { originCity: { name: string }; destinationCity: { name: string } };
  departureTime: string;
  status: string;
  createdAt: string;
}

export const approvalsApi = {
  // Operators
  listOperators: async (): Promise<PendingOperator[]> => {
    const res = await api.get<PendingOperator[]>('/admin/operators?limit=100');
    return res.data.filter((o: any) => {
      const s = o.status || 'PENDING';
      return s === 'PENDING' || s === 'APPLIED';
    });
  },
  approveOperator: async (id: string, reason?: string): Promise<void> => {
    await api.post(`/admin/operators/${id}/approve`, { reason: reason || 'Approved by platform admin after KYC verification' });
  },
  rejectOperator: async (id: string, reason: string): Promise<void> => {
    await api.post(`/admin/operators/${id}/reject`, { reason });
  },

  // Buses
  listBuses: async (): Promise<PendingBus[]> => {
    const res = await api.get<PendingBus[]>('/admin/buses?limit=100');
    return res.data.filter((b: any) => (b.approvalStatus || 'PENDING') === 'PENDING');
  },
  approveBus: async (id: string, reason?: string): Promise<void> => {
    await api.post(`/admin/buses/${id}/approve`, { reason: reason || 'Bus documents verified by platform admin' });
  },
  rejectBus: async (id: string, reason: string): Promise<void> => {
    await api.post(`/admin/buses/${id}/reject`, { reason });
  },

  // Routes
  listRoutes: async (): Promise<PendingRoute[]> => {
    const res = await api.get<PendingRoute[]>('/admin/routes?limit=100');
    return res.data.filter((r: any) => (r.approvalStatus || 'PENDING') === 'PENDING');
  },
  approveRoute: async (id: string, reason?: string): Promise<void> => {
    await api.post(`/admin/routes/${id}/approve`, { reason: reason || 'Route verified by platform admin' });
  },

  // Schedules
  listSchedules: async (): Promise<PendingSchedule[]> => {
    const res = await api.get<PendingSchedule[]>('/admin/schedules?limit=100');
    // Schedules may be auto-approved via DRAFT -> PUBLISHED flow; only show if backend returns PENDING/DRAFT
    return res.data.filter((s: any) => {
      const status = s.status || 'DRAFT';
      return status === 'PENDING' || status === 'DRAFT';
    });
  },
  approveSchedule: async (id: string, reason?: string): Promise<void> => {
    await api.post(`/admin/schedules/${id}/approve`, { reason: reason || 'Schedule verified by platform admin' });
  },
};