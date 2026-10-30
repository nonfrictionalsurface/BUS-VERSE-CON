import type { MoneyDTO, StandDTO, CityDTO } from '../network/network.types.js';

export interface OperatorAdminDTO {
  id: string;
  companyName: string;
  gstin: string;
  pan: string;
  status: 'APPLIED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ACTIVE' | 'DEACTIVATED';
  bankAccountRef: string | null;
  busCount: number;
  driverCount: number;
  operatorUserCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusAdminDTO {
  id: string;
  registrationNumber: string;
  model: string | null;
  capacity: number;
  busType: 'SEATER' | 'AC_SEATER' | 'SLEEPER' | 'AC_SLEEPER' | 'SEMI_SLEEPER';
  amenities: string[];
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  operator: { id: string; companyName: string; status: string };
  insuranceDocRef: string | null;
  insuranceExpiresAt: string | null;
  createdAt: string;
}

export interface RouteAdminDTO {
  id: string;
  operator: { id: string; companyName: string };
  originCity: CityDTO;
  destinationCity: CityDTO;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  standCount: number;
  createdAt: string;
}

export interface ScheduleAdminDTO {
  id: string;
  operator: { id: string; companyName: string };
  bus: { id: string; registrationNumber: string; approvalStatus: string };
  route: { id: string; originCity: CityDTO; destinationCity: CityDTO; approvalStatus: string };
  departureTime: string;
  arrivalTime: string;
  fare: MoneyDTO;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
  createdAt: string;
}

export interface AdminBookingPassengerDTO {
  name: string;
  seatLabel: string;
  age: number | null;
  gender: string | null;
  // PII — absent unless includePii=true & reason provided
  phone?: string;
  email?: string;
  idNumber?: string;
}

export interface AdminBookingDTO {
  bookingId: string;
  bookingReference: string;
  status: string;
  userId: string;
  scheduleId: string;
  departureTime: string;
  operator: { id: string; companyName: string };
  routeSummary: { originCity: string; destinationCity: string };
  passengerCount: number;
  passengers: AdminBookingPassengerDTO[];
  totalFarePaise: number;
  confirmedAt: string | null;
  createdAt: string;
  // Present only when includePii=true & reason provided
  pii?: {
    userPhone: string;
    userEmail: string | null;
    boardingStand: StandDTO | { id: string; name: string; type: string };
    droppingStand: StandDTO | { id: string; name: string; type: string };
    auditLogId: string;
  };
}

export interface AdminDashboardDTO {
  asOf: string;
  timezone: string;
  operators: { total: number; byStatus: Record<string, number> };
  buses: { total: number; pending: number; approved: number };
  routes: { total: number; pending: number };
  schedules: { total: number; published: number; draft: number };
  bookings: {
    total: number;
    today: number;
    confirmed: number;
    cancelled: number;
  };
  revenue: {
    todayPaise: number;
    last7DaysPaise: number;
    totalPaise: number;
  };
  drivers: { total: number; onDuty: number };
}
// ---------- Payments oversight (Phase 5) ----------

export interface AdminPaymentDTO {
  paymentId: string;
  userId: string;
  bookingId: string;
  bookingReference: string;
  status: string;
  method: string | null;
  amountPaise: number;
  currency: string;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  initiatedAt: string;
  succeededAt: string | null;
  failedAt: string | null;
  expiresAt: string | null;
  operator: { id: string; companyName: string };
  createdAt: string;
}

export interface AdminRefundDTO {
  refundId: string;
  paymentId: string;
  bookingId: string | null;
  bookingReference: string | null;
  amountPaise: number;
  status: 'INITIATED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  refundTier: 'TIER_FULL' | 'TIER_75' | 'TIER_50' | 'TIER_ZERO' | 'TIER_NOT_ELIGIBLE';
  reason: 'PASSENGER_CANCELLED' | 'OPERATOR_CANCELLED' | 'TRIP_CANCELLED' | 'DUPLICATE_CHARGE' | 'DISPUTE';
  gatewayRefundId: string | null;
  initiatedAt: string;
  processedAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface AdminPaymentDetailDTO extends AdminPaymentDTO {
  refunds: AdminRefundDTO[];
  webhookCount: number;
}