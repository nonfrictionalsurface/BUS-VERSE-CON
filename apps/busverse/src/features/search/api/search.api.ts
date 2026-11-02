import { api } from '@/lib/api/client';

export interface City {
  id: string;
  name: string;
  state: string;
  isActive: boolean;
}

export interface ScheduleSearchResult {
  scheduleId: string;
  busType: string;
  operatorName: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  fare: {
    amountPaise: number;
    currency: string;
  };
  availableSeats: number;
}

export const searchApi = {
  getCities: async (q?: string): Promise<City[]> => {
    const res = await api.get<City[]>(`/public/cities?limit=50${q ? `&q=${encodeURIComponent(q)}` : ''}`);
    return res.data;
  },

  searchSchedules: async (originCityId: string, destinationCityId: string, date: string): Promise<ScheduleSearchResult[]> => {
    const res = await api.get<ScheduleSearchResult[]>(
      `/public/search?originCityId=${originCityId}&destinationCityId=${destinationCityId}&date=${date}`
    );
    return res.data;
  },

  getScheduleDetail: async (scheduleId: string) => {
    const res = await api.get<any>(`/public/schedules/${scheduleId}`);
    return res.data;
  },
};
