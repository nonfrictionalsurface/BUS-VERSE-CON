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
  lat: number;
  lng: number;
}

export interface RouteStand {
  standId: string;
  sequence: number;
  distanceFromPrevKm: number;
  durationFromPrevMin: number;
  stand?: Stand;
}

export interface Route {
  id: string;
  originCityId: string;
  destinationCityId: string;
  originCity: City;
  destinationCity: City;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  stands?: RouteStand[];
  createdAt: string;
}

export interface CreateRouteStandInput {
  standId: string;
  sequence: number;
  distanceFromPrevKm: number;
  durationFromPrevMin: number;
}

export interface CreateRouteInput {
  originCityId: string;
  destinationCityId: string;
  stands: CreateRouteStandInput[];
}

export const routesApi = {
  list: async (): Promise<Route[]> => {
    const res = await api.get<Route[]>('/operator/routes');
    return res.data;
  },
  create: async (input: CreateRouteInput): Promise<Route> => {
    if (!input.stands || input.stands.length < 2) {
      throw new Error('Route needs at least 2 stands (origin + destination)');
    }
    const res = await api.post<Route>('/operator/routes', input);
    return res.data;
  },
  addStand: async (routeId: string, stand: CreateRouteStandInput): Promise<void> => {
    await api.post(`/operator/routes/${routeId}/stands`, stand);
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
