/**
 * Booking & Passenger Manifest Types
 * Contract Reference: 07-API-AND-REALTIME-CONTRACTS.md Section 4.5
 */

export interface PassengerInput {
  seatId: string;
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
}

export interface CreateBookingRequest {
  lockId: string;
  boardingStandId: string;
  droppingStandId: string;
  passengers: PassengerInput[];
}

export interface BookingResponse {
  bookingId: string;
  bookingReference: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  expiresAt: string; // Authoritative 15-minute server expiration
  totalFarePaise: number;
  scheduleId: string;
  createdAt?: string;
  passengers?: Array<{
    id: string;
    seatId: string;
    seatLabel: string;
    name: string;
    age: number;
    gender: string;
  }>;
  schedule?: {
    departureTime: string;
    arrivalTime: string;
    operatorName: string;
    busType: string;
  };
  boardingStand?: {
    id: string;
    name: string;
  };
  droppingStand?: {
    id: string;
    name: string;
  };
}