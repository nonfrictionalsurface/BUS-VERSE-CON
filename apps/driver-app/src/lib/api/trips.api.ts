import { api } from './client';

export const listTrips = (date?: string) => api.get(`/driver/trips${date ? `?date=${date}` : ''}`);
export const getTrip = (tripId: string) => api.get(`/driver/trips/${tripId}`);
export const startTrip = (tripId: string) => api.post(`/driver/trips/${tripId}/start`, {});
export const endTrip = (tripId: string) => api.post(`/driver/trips/${tripId}/end`, {});
export const getManifest = (tripId: string) => api.get(`/driver/trips/${tripId}/manifest`);
export const postScan = (tripId: string, body: any) => api.post(`/driver/trips/${tripId}/scan`, body);
export const getPublicSchedule = (scheduleId: string) => api.get(`/public/schedules/${scheduleId}`);

export type GpsSample = {
  lat: number;
  lng: number;
  speedKmh: number;
  accuracyM: number;
  recordedAt: string;
};

export const postGps = (tripId: string, sample: GpsSample) =>
  api.post(`/driver/trips/${tripId}/gps`, sample);
