// Trip module — enums, DTOs, constants. No runtime imports.

export const TRIP_STATUS = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type TripStatus = (typeof TRIP_STATUS)[number];

export const DELAY_REASON = [
  'TRAFFIC',
  'WEATHER',
  'BREAKDOWN',
  'ACCIDENT',
  'ROAD_CLOSURE',
  'OTHER',
] as const;
export type DelayReason = (typeof DELAY_REASON)[number];

export const SCAN_RESULT = ['VALID', 'DUPLICATE'] as const;
export type ScanResult = (typeof SCAN_RESULT)[number];

// buscon/02 §7.3 — trip start allowed within ±2h of departure
export const TRIP_START_WINDOW_MINUTES = 120;
export const TRIP_START_WINDOW_MS = TRIP_START_WINDOW_MINUTES * 60 * 1000;

// buscon/02 §12.4 — delay constraints
export const DELAY_MIN_MINUTES = 1;
export const DELAY_MAX_MINUTES = 180;
export const DELAY_MAX_NOTES_LENGTH = 200;

// Scan payload constraints (shared/02 §3.5)
export const MAX_QR_PAYLOAD_BYTES = 500;
export const MAX_SCAN_WIRE_BYTES = 770;

// Status helpers
export function isTripScannable(status: TripStatus): boolean {
  return status === 'SCHEDULED' || status === 'IN_PROGRESS';
}

export function isTripActive(status: TripStatus): boolean {
  return status === 'IN_PROGRESS';
}

export interface DriverTripSummaryDTO {
  tripId: string;
  scheduleId: string;
  bus: { id: string; registrationNumber: string; model: string | null };
  route: { originCity: string; destinationCity: string };
  departureTime: string;
  arrivalTime: string;
  status: TripStatus;
  boardedCount: number;
  confirmedCount: number;
}

export interface TripDetailDTO extends DriverTripSummaryDTO {
  busId: string;
  driverId: string;
  boardingStands: Array<{ standId: string; standName: string; sequence: number }>;
  startedAt: string | null;
  endedAt: string | null;
  cancelledAt: string | null;
  delayReason: DelayReason | null;
  delayMinutes: number | null;
  distanceKm: number | null;
}

export interface StartTripResultDTO {
  tripId: string;
  status: 'IN_PROGRESS';
  startedAt: string;
}

export interface EndTripResultDTO {
  tripId: string;
  status: 'COMPLETED';
  startedAt: string | null;
  endedAt: string;
  durationMinutes: number;
  distanceKm: number;
  boardedCount: number;
  confirmedCount: number;
}

export interface DelayReportRequestDTO {
  reason: DelayReason;
  delayMinutes: number;
  notes?: string | undefined;
}

export interface DelayReportDTO {
  tripId: string;
  delayReason: DelayReason;
  delayMinutes: number;
  reportedAt: string;
}
// ---------- Manifest (buscon/05 §12.2) ----------

export interface ManifestPassengerDTO {
  bookingId: string;
  bookingReference: string;
  seatLabels: string[];
  passengerNames: string[];
  boardingStatus: 'CONFIRMED' | 'BOARDED' | 'CANCELLED' | 'EXPIRED';
  boardedAt: string | null;
}

export interface ManifestStandGroupDTO {
  standId: string;
  standName: string;
  sequence: number;
  passengers: ManifestPassengerDTO[];
}

export interface ManifestDTO {
  tripId: string;
  scheduleId: string;
  totalPassengers: number;
  totalBoarded: number;
  lastUpdatedAt: string;
  byStand: ManifestStandGroupDTO[];
}

// ---------- Scan (buscon/05 §5.2) ----------

export interface ScanRequestDTO {
  qrPayload?: string | undefined;
  scannedAt: string;
  scannedLat?: number | undefined;
  scannedLng?: number | undefined;
  manualEntry?: boolean | undefined;
  bookingReference?: string | undefined;
  primaryPassengerName?: string | undefined;
}

export interface ScanResultDTO {
  result: ScanResult;
  ticketId: string;
  bookingId: string;
  primaryPassengerName: string;
  seatLabels: string[];
  passengerCount: number;
  bookingStatus: 'CHECKED_IN';
  scannedAt: string;
  originalScannedAt?: string | undefined;
}

// ---------- Live tracking (buscon/04 §8B.2) ----------

export interface LiveTripPositionDTO {
  lat: number;
  lng: number;
  recordedAt: string;
}

export interface LiveTripEtaDTO {
  standId: string;
  standName: string;
  etaMinutes: number;
}

export interface LiveTripDTO {
  tripId: string;
  status: TripStatus;
  currentPosition: LiveTripPositionDTO | null;
  speedKmh: number | null;
  lastUpdatedAt: string | null;
  isStale: boolean;
  eta: LiveTripEtaDTO[];
  occupancy: { occupied: number; total: number } | null;
  nextStandId: string | null;
}

export interface MapDTO {
  tripId: string;
  route: {
    originCity: string;
    destinationCity: string;
    stands: Array<{
      standId: string;
      standName: string;
      lat: number;
      lng: number;
      sequence: number;
    }>;
  };
  currentPosition: LiveTripPositionDTO | null;
  lastUpdatedAt: string | null;
}

// ---------- Config + Me (buscon/02 §4.4, §13.2) ----------

export interface DriverConfigDTO {
  qrPublicKey: string;
  serverTime: string;
  minAppVersion: string;
  featureFlags: { offlineScan: boolean; gpsTracking: boolean };
}

export interface DriverMeDTO {
  userId: string;
  phone: string;
  name: string | null;
  licenseNumber: string;
  kycStatus: string;
  onDuty: boolean;
  operator: { id: string; companyName: string };
  verifiedAt: string | null;
  createdAt: string;
}
export interface CancelTripResultDTO {
  tripId: string;
  status: 'CANCELLED';
  cancelledBookings: number;
  refundedPaise: number;
}