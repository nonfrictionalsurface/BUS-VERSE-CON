import { api } from '@/lib/api/client';

export type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Trip {
  tripId: string;
  scheduleId: string;
  busId: string;
  status: TripStatus;
  startedAt: string | null;
  endedAt: string | null;
  driverId: string;
  driverName: string;
  driverPhone: string;
}

export interface AssignDriverInput {
  scheduleId: string;
  driverId: string;
}

function normalizeTrip(t: any): Trip {
  return {
    tripId: t?.tripId || t?.id || '',
    scheduleId: t?.scheduleId || '',
    busId: t?.busId || '',
    status: (t?.status || 'SCHEDULED') as TripStatus,
    startedAt: t?.startedAt || null,
    endedAt: t?.endedAt || null,
    driverId: t?.driverId || t?.driver?.id || '',
    driverName: t?.driverName || t?.driver?.user?.name || 'Unassigned',
    driverPhone: t?.driverPhone || t?.driver?.user?.phone || '',
  };
}

export const tripsApi = {
  list: async (): Promise<Trip[]> => {
    const res = await api.get<any>('/operator/trips');
    const raw = Array.isArray(res.data) ? res.data
      : Array.isArray(res.data?.trips) ? res.data.trips
      : Array.isArray(res.data?.data) ? res.data.data
      : [];
    return raw.map(normalizeTrip);
  },

  assign: async (input: AssignDriverInput): Promise<Trip> => {
    const res = await api.post<any>('/dev/assign-driver', {
      scheduleId: input.scheduleId,
      driverId: input.driverId,
    });
    return normalizeTrip(res.data);
  },

  unassign: async (tripId: string): Promise<void> => {
    await api.post(`/dev/unassign-driver/${tripId}`, {});
  },
};
