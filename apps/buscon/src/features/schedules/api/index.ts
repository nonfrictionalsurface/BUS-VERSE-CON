import { api } from '@/lib/api/client';

export interface Schedule {
  id: string;
  busId: string;
  routeId: string;
  departureTime: string;
  arrivalTime: string;
  fareAmountPaise: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  bus: { registrationNumber: string; model: string };
  route: { originCity: { name: string }; destinationCity: { name: string } };
}

export interface CreateScheduleInput {
  busId: string;
  routeId: string;
  departureTime: string; // ISO string
  arrivalTime: string;   // ISO string
  fareAmountPaise: number;
}

export const schedulesApi = {
  list: async (): Promise<Schedule[]> => {
    const res = await api.get<Schedule[]>('/operator/schedules');
    return res.data;
  },
  create: async (data: CreateScheduleInput): Promise<Schedule> => {
    const res = await api.post<Schedule>('/operator/schedules', data);
    return res.data;
  },
  publish: async (id: string): Promise<void> => {
    await api.post(`/operator/schedules/${id}/publish`, {});
  }
};