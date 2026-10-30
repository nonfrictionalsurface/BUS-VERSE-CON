export interface PassengerTicket {
  ticketId: string;
  bookingId: string;
  primaryPassengerName: string;
  primarySeatLabel: string;
  allSeatLabels: string[];
  passengerCount: number;
  scheduleId: string;
  issuedAt: string;
}

export interface ManifestEntry {
  seatLabel: string;
  passengerName: string;
  boardingPoint: string;
  status: 'BOARDED' | 'WAITING' | 'NO_SHOW';
  gender: 'M' | 'F';
  isFemaleOnly?: boolean;
}

export interface RouteWaypoint {
  id: string;
  title: string;
  eta: string;
  distanceKm: number;
  boardCount: number;
  status: 'PASSED' | 'CURRENT' | 'UPCOMING';
}

export interface DutyProfile {
  busPlate: string;
  model: string;
  driverName: string;
  conductorBadge: string;
  routeTitle: string;
  departureTime: string;
  currentSpeedKmh: number;
  totalSeats: number;
}