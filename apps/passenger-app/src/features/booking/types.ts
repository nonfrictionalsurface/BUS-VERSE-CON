export interface Stand {
  standId: string;
  name: string;
  sequence: number;
}

export interface ScheduleDetail {
  scheduleId: string;
  departureTime: string;
  arrivalTime: string;
  farePaise: number;
  operatorName: string;
  originCityName: string;
  destinationCityName: string;
  busType?: string;
  stops: Stand[];
}

export interface PassengerInput {
  seatId: string;
  seatLabel: string;
  name: string;
  age: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | '';
}

export interface CreateBookingPayload {
  lockId: string;
  boardingStandId: string;
  droppingStandId: string;
  passengers: Array<{
    seatId: string;
    name: string;
    age: number;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
  }>;
}

export interface CreateBookingResponse {
  bookingId: string;
  status: string;
  expiresAt?: string;
}