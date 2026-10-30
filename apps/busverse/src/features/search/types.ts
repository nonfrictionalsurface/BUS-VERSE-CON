export interface City {
  id: string;
  name: string;
  state: string;
  isActive: boolean;
}

export interface CityStand {
  id: string;
  cityId: string;
  name: string;
  type: 'BUS_STAND' | 'PICKUP_POINT' | 'DROP_POINT';
  lat: number;
  lng: number;
}

export type BusType = 'SEATER' | 'AC_SEATER' | 'SLEEPER' | 'AC_SLEEPER' | 'SEMI_SLEEPER';

export interface ScheduleFare {
  amountPaise: number;
  currency: string;
}

export interface ScheduleSearchResult {
  scheduleId: string;
  busType: BusType;
  operatorName: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  fare: ScheduleFare | number;
  availableSeats: number;
}

export interface SearchFilters {
  originCity: City | null;
  destinationCity: City | null;
  date: string;
  sortBy: 'departureTime' | 'fare';
}