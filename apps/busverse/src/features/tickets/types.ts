/**
 * Ticket, Refund Preview & Telemetry Types
 * Contract Reference: 07-API-AND-REALTIME-CONTRACTS.md Section 4.5, 4.7
 */

export interface TicketData {
  ticketId: string;
  bookingId: string;
  qrPayload: string; // Wire format: v1:{base64}:{base64}
  status: 'ACTIVE' | 'BOARDED' | 'CANCELLED';
  issuedAt: string;
}

export type RefundTier = 'TIER_FULL' | 'TIER_75' | 'TIER_50' | 'TIER_ZERO' | 'TIER_NOT_ELIGIBLE';

export interface RefundPreviewData {
  bookingId: string;
  tier: RefundTier;
  amountPaise: number;
  cancellationFeePaise: number;
  departureTime: string;
  hoursToDeparture: number;
}

export interface LiveGpsTelemetry {
  lat: number;
  lng: number;
  speedKmh: number;
  recordedAt: string;
}

export interface StopEta {
  standId: string;
  name: string;
  type: string;
  sequence: number;
  scheduledArrival: string;
  estimatedArrival: string;
  status: 'PENDING' | 'ARRIVED' | 'PASSED';
}

export interface LiveTripSnapshot {
  tripId: string;
  scheduleId: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  delayMinutes: number;
  bus: {
    registrationNumber: string;
    model: string;
    busType: string;
  };
  gps?: LiveGpsTelemetry;
  stops: StopEta[];
}