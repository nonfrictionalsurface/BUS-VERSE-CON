import { api, EP } from '../../../lib/api';
import type {
  CreateBookingResultDTO,
  BookingDetailDTO,
  BookingSummaryDTO,
  TicketDTO,
  RefundPreviewDTO,
  CancelBookingResultDTO,
} from '../../../types';
import { ScheduleDetail, CreateBookingPayload, Stand } from '../types';

function unwrap<T = any>(raw: any): T {
  if (raw?.data !== undefined) return raw.data as T;
  return raw as T;
}

function toFarePaise(raw: any): number {
  if (typeof raw?.fare === 'number') return raw.fare;
  if (raw?.fare?.amountPaise) return raw.fare.amountPaise;
  if (typeof raw?.fareAmountPaise === 'number') return raw.fareAmountPaise;
  if (typeof raw?.totalFarePaise === 'number') return raw.totalFarePaise;
  return 0;
}

function toStops(raw: any): Stand[] {
  const list: any[] = raw?.route?.stands ?? raw?.route?.stops ?? [];
  const mapped = list.map((s: any, idx: number) => {
    const nested = s?.stand ?? {};
    return {
      standId: String(s?.standId ?? nested.id ?? nested.standId ?? s?.id ?? ''),
      name: String(s?.name ?? nested.name ?? s?.standName ?? `Stop ${idx + 1}`),
      sequence: Number(s?.sequence ?? s?.seq ?? idx + 1),
    };
  }).filter((s) => !!s.standId);
  mapped.sort((a, b) => a.sequence - b.sequence);
  return mapped;
}

function toScheduleDetail(raw: any): ScheduleDetail {
  return {
    scheduleId: String(raw?.scheduleId ?? raw?.id ?? ''),
    departureTime: raw?.departureTime ?? '',
    arrivalTime: raw?.arrivalTime ?? '',
    farePaise: toFarePaise(raw),
    operatorName:
      raw?.operatorName ?? raw?.operator?.companyName ?? raw?.operator?.name ?? 'Operator',
    originCityName: raw?.route?.originCity?.name ?? raw?.originCity?.name ?? 'Origin',
    destinationCityName:
      raw?.route?.destinationCity?.name ?? raw?.destinationCity?.name ?? 'Destination',
    busType: raw?.busType ?? raw?.bus?.busType,
    stops: toStops(raw),
  };
}

export async function fetchScheduleDetail(scheduleId: string): Promise<ScheduleDetail> {
  const raw = unwrap(await api.get(`/public/schedules/${scheduleId}`));
  return toScheduleDetail(raw);
}

export async function createBooking(payload: CreateBookingPayload): Promise<CreateBookingResultDTO> {
  const raw = unwrap(await api.post('/passenger/bookings', payload));
  return {
    bookingId: String(raw?.bookingId ?? raw?.id ?? ''),
    bookingReference: String(raw?.bookingReference ?? raw?.reference ?? ''),
    status: (raw?.status ?? 'PENDING') as CreateBookingResultDTO['status'],
    expiresAt: String(raw?.expiresAt ?? ''),
    totalFarePaise: Number(raw?.totalFarePaise ?? 0),
  };
}

export async function getBooking(bookingId: string): Promise<BookingDetailDTO> {
  return api.get<BookingDetailDTO>(EP.booking(bookingId));
}

export async function listBookings(limit = 20): Promise<BookingSummaryDTO[]> {
  return api.get<BookingSummaryDTO[]>(`${EP.bookings}?limit=${limit}`);
}

export async function getTicket(bookingId: string): Promise<TicketDTO> {
  return api.get<TicketDTO>(EP.bookingTicket(bookingId));
}

export async function getRefundPreview(bookingId: string): Promise<RefundPreviewDTO> {
  return api.get<RefundPreviewDTO>(EP.refundPreview(bookingId));
}

export async function cancelBooking(bookingId: string): Promise<CancelBookingResultDTO> {
  return api.post<CancelBookingResultDTO>(EP.cancelBooking(bookingId), {});
}