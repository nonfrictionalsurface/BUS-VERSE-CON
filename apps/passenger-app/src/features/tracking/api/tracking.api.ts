import { api, EP } from '../../../lib/api';
import type { LiveTripDTO, MapDTO } from '../../../types';

export const getLiveTrip = (tripId: string) => api.get<LiveTripDTO>(EP.tripLive(tripId));
export const getTripMap = (tripId: string) => api.get<MapDTO>(EP.tripMap(tripId));
