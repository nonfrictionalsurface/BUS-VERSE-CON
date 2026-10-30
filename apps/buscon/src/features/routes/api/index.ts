import { api } from '@/lib/api/client';

export interface City {
  id: string;
  name: string;
  state: string;
}

export interface Stand {
  id: string;
  cityId: string;
  name: string;
  type: string;
}

export interface Route {
  id: string;
  originCityId: string;
  destinationCityId: string;
  originCity: City;
  destinationCity: City;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface CreateRouteStand {
  standId: string;
  sequence: number;
  distanceFromPrevKm: number;
  durationFromPrevMin: number;
}

export interface CreateRouteInput {
  originCityId: string;
  destinationCityId: string;
  stands: CreateRouteStand[]; // must have >= 2
}

export const routesApi = {
  list: async (): Promise<Route[]> => {
    const res = await api.get<Route[]>('/operator/routes');
    return res.data;
  },
  create: async (input: CreateRouteInput): Promise<Route> => {
    const res = await api.post<Route>('/operator/routes', input);
    return res.data;
  },
  searchCities: async (query: string): Promise<City[]> => {
    const res = await api.get<City[]>(`/public/cities?q=${encodeURIComponent(query)}&limit=10`);
    return res.data;
  },
  getStands: async (cityId: string): Promise<Stand[]> => {
    const res = await api.get<Stand[]>(`/public/cities/${cityId}/stands`);
    return res.data;
  },
};