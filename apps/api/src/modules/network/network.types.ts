export const BUS_TYPE = ['SEATER','AC_SEATER','NON_AC_SEATER','SLEEPER','AC_SLEEPER','NON_AC_SLEEPER','SEMI_SLEEPER','AC_SEMI_SLEEPER'] as const;
export type BusType = (typeof BUS_TYPE)[number];
export const SEAT_TYPE = ['SEATER','SEMI_SLEEPER','SLEEPER'] as const;
export type SeatType = (typeof SEAT_TYPE)[number];
export const STAND_TYPE = ['BUS_STAND','PICKUP_POINT','DROP_POINT'] as const;
export type StandType = (typeof STAND_TYPE)[number];
export const BUS_APPROVAL_STATUS = ['PENDING','APPROVED','REJECTED'] as const;
export type BusApprovalStatus = (typeof BUS_APPROVAL_STATUS)[number];
export const ROUTE_APPROVAL_STATUS = ['PENDING','APPROVED','REJECTED'] as const;
export type RouteApprovalStatus = (typeof ROUTE_APPROVAL_STATUS)[number];
export const SCHEDULE_STATUS = ['DRAFT','PUBLISHED','CANCELLED','COMPLETED','EXPIRED'] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUS)[number];
export const OPERATOR_STATUS = ['APPLIED','PENDING_REVIEW','APPROVED','REJECTED','SUSPENDED','ACTIVE','DEACTIVATED'] as const;
export type OperatorStatus = (typeof OPERATOR_STATUS)[number];
export const DRIVER_KYC_STATUS = ['INVITED','SIGNED_UP','KYC_PENDING','VERIFIED','KYC_FAILED','ACTIVE','BLOCKED','DEACTIVATED'] as const;
export type DriverKycStatus = (typeof DRIVER_KYC_STATUS)[number];
export const BOOKING_STATUS = ['PENDING','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED','OPERATOR_CANCELLED','REFUNDED','EXPIRED','FAILED'] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];

export interface MoneyDTO { amountPaise: number; currency: string; }
export interface CityDTO { id: string; name: string; state: string; isActive: boolean; }
export interface StandDTO { id: string; cityId: string; name: string; type: StandType; lat: number; lng: number; }
export interface OperatorSummaryDTO { id: string; companyName: string; gstin: string; pan: string; status: OperatorStatus; }
export interface OperatorMeResponse {
  operator: OperatorSummaryDTO;
  user: { id: string; phone: string; email: string | null; name: string | null };
  role: 'OPERATOR_OWNER' | 'OPERATOR_MANAGER';
}
export interface BusDTO {
  id: string; operatorId: string; registrationNumber: string; model: string | null;
  capacity: number; busType: BusType; amenities: string[]; approvalStatus: BusApprovalStatus;
  insuranceDocRef: string | null; insuranceExpiresAt: string | null; createdAt: string;
}
export interface SeatDTO { id: string; key: string; seatRow: string; seatColumn: number; seatLabel: string; seatType: SeatType; isFemaleOnly: boolean; }
export interface SeatLayoutDTO { id: string; busId: string; rowsCount: number; columnsCount: number; aisleCells: Array<{ row: string; column: number }>; seats: SeatDTO[]; rev: number; spec: Record<string, unknown>; }
export interface RouteStandDTO { stand: StandDTO; sequence: number; distanceFromPrevKm: number; durationFromPrevMin: number; }
export interface RouteDTO { id: string; operatorId: string; originCity: CityDTO; destinationCity: CityDTO; approvalStatus: RouteApprovalStatus; stands: RouteStandDTO[]; createdAt: string; }

export interface ScheduleOperatorDTO {
  id: string; operatorId: string; busId: string; routeId: string;
  departureTime: string; arrivalTime: string; fare: MoneyDTO; status: ScheduleStatus;
  bus: { id: string; registrationNumber: string; model: string | null; capacity: number; busType: BusType; approvalStatus: BusApprovalStatus; };
  route: { id: string; originCity: CityDTO; destinationCity: CityDTO; approvalStatus: RouteApprovalStatus; };
  createdAt: string;
}
export interface ScheduleSearchResultDTO {
  scheduleId: string; busType: BusType; operatorName: string;
  departureTime: string; arrivalTime: string; durationMinutes: number;
  fare: MoneyDTO; availableSeats: number;
}
export interface ScheduleDetailDTO extends ScheduleSearchResultDTO {
  status: ScheduleStatus;
  bus: { id: string; registrationNumber: string; model: string | null; capacity: number; busType: BusType; amenities: string[]; };
  route: { id: string; originCity: CityDTO; destinationCity: CityDTO; stands: Array<{ stand: StandDTO; sequence: number; distanceFromPrevKm: number; durationFromPrevMin: number }>; };
}

// ---------- Phase 3c DTOs ----------
export interface DriverDTO {
  id: string;
  userId: string;
  name: string;
  phone: string;
  licenseNumber: string;
  kycStatus: DriverKycStatus;
  onDuty: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export interface PassengerSummaryDTO {
  name: string;
  seatLabel: string;
  age: number | null;
  gender: string | null;
}

export interface BookingSummaryDTO {
  bookingId: string;
  bookingReference: string;
  status: BookingStatus;
  scheduleId: string;
  departureTime: string;
  routeSummary: { originCity: string; destinationCity: string };
  passengerCount: number;
  passengers: PassengerSummaryDTO[];
  totalFarePaise: number;
  confirmedAt: string | null;
  createdAt: string;
}

export interface BookingDetailDTO extends BookingSummaryDTO {
  schedule: {
    busId: string;
    departureTime: string;
    arrivalTime: string;
    routeSummary: { originCity: string; destinationCity: string };
  };
  boardingStand: { id: string; name: string; type: StandType };
  droppingStand: { id: string; name: string; type: StandType };
  fareBreakdown: { baseFarePaise: number; taxPaise: number; convenienceFeePaise: number };
  payment: { status: string; amountPaise: number; currency: string } | null;
  boardingScans: Array<{ seatLabel: string; scannedAt: string; result: string }>;
}

export interface DashboardDTO {
  asOf: string;
  today: { date: string; timezone: string; bookingsCount: number; passengerCount: number; revenuePaise: number; cancelledCount: number; refundedPaise: number; };
  activeTrips: number;
  upcomingTripsToday: number;
  pendingApprovals: { buses: number; routes: number; schedules: number; };
  drivers: { total: number; onDuty: number; kycPending: number; };
}

export interface RevenueBucketDTO { date: string; revenuePaise: number; refundsPaise: number; bookingCount: number; }
export interface RevenueDTO {
  from: string; to: string; groupBy: 'day' | 'week' | 'month';
  totalRevenuePaise: number; totalRefundsPaise: number; netRevenuePaise: number;
  buckets: RevenueBucketDTO[];
}
export interface RevenueDailyDTO {
  days: Array<{ date: string; revenuePaise: number; bookingCount: number }>;
  timezone: string;
}
export interface SettlementDTO {
  id: string; cycleStart: string; cycleEnd: string;
  grossPaise: number; refundsPaise: number; netPaise: number;
  status: string; settledAt: string | null;
}
export interface ManagerDTO {
  operatorUserId: string; userId: string; name: string | null;
  email: string | null; phone: string; role: 'OWNER' | 'MANAGER';
  invitedAt: string; acceptedAt: string | null;
}
// ---------- Phase 13: Operator trip assignment ----------
export interface OperatorTripDTO {
  tripId: string;
  scheduleId: string;
  busId: string;
  driverId: string;
  driverName: string | null;
  driverPhone: string;
  busRegistrationNumber: string;
  routeSummary: { originCity: string; destinationCity: string };
  departureTime: string;
  arrivalTime: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startedAt: string | null;
  endedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}