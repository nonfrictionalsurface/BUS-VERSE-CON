import { api } from '@/lib/api/client';

export type BusType = 'SEATER' | 'AC_SEATER' | 'SLEEPER' | 'AC_SLEEPER' | 'SEMI_SLEEPER';

export interface Bus {
  id: string;
  registrationNumber: string;
  model: string;
  capacity: number;
  busType: BusType;
  amenities: string[];
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface CreateBusInput {
  registrationNumber: string;
  model: string;
  capacity: number;
  busType: BusType;
  amenities: string[];
  insuranceDocRef: string;
  insuranceExpiresAt: string;
}

export interface LayoutPayload {
  rowsCount: number;
  columnsCount: number;
  seats: Array<{
    seatRow: string;
    seatColumn: number;
    seatType: 'SEATER' | 'SLEEPER';
    isFemaleOnly: boolean;
  }>;
}

export const busesApi = {
  list: async (): Promise<Bus[]> => {
    const res = await api.get<Bus[]>('/operator/buses?limit=50');
    return res.data;
  },
  get: async (id: string): Promise<Bus> => {
    const res = await api.get<Bus>(`/operator/buses/${id}`);
    return res.data;
  },
  create: async (data: CreateBusInput): Promise<Bus> => {
    const res = await api.post<Bus>('/operator/buses', data);
    return res.data;
  },
  updateLayout: async (id: string, data: LayoutPayload): Promise<void> => {
    await api.put(`/operator/buses/${id}/layout`, data);
  }
};