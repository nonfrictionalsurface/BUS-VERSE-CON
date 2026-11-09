import { api, ApiError } from '@/lib/api/client';

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

export interface CreateBookingInput {
  scheduleId: string;
  lockIds: string[];
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
  status: 'PENDING' | 'CONFIRMED';
  totalFarePaise?: number;
  expiresAt?: string;
}

export interface PassengerSummary {
  seatId: string;
  seatLabel?: string;
  name: string;
  age?: number;
  gender?: string;
}

export interface BookingDetail {
  bookingId: string;
  displayId?: string;
  bookingReference: string;
  status: string;
  scheduleId?: string;
  totalFarePaise: number;
  confirmedAt?: string;
  createdAt?: string;
  expiresAt?: string;
  gstInvoiceAvailable?: boolean;
  boardingStandId?: string;
  droppingStandId?: string;
  passengers: PassengerSummary[];
  schedule?: ScheduleDetail;
}

export interface Ticket {
  ticketId: string;
  bookingId: string;
  qrPayload: string;
  status: string;
  issuedAt: string;
}

function toFarePaise(raw: any): number {
  if (typeof raw?.fare === 'number') return raw.fare;
  if (raw?.fare?.amountPaise) return raw.fare.amountPaise;
  if (typeof raw?.fareAmountPaise === 'number') return raw.fareAmountPaise;
  if (typeof raw?.totalFarePaise === 'number') return raw.totalFarePaise;
  return 0;
}

function toStops(raw: any): Stand[] {
  const list: any[] = raw?.route?.stands ?? raw?.route?.stops ?? raw?.stands ?? raw?.stops ?? [];
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
  if (!raw) {
    return {
      scheduleId: '',
      departureTime: '',
      arrivalTime: '',
      farePaise: 0,
      operatorName: 'Operator',
      originCityName: 'Origin',
      destinationCityName: 'Destination',
      stops: [],
    };
  }
  return {
    scheduleId: String(raw?.scheduleId ?? raw?.id ?? ''),
    departureTime: raw?.departureTime ?? '',
    arrivalTime: raw?.arrivalTime ?? '',
    farePaise: toFarePaise(raw),
    operatorName: raw?.operatorName ?? raw?.operator?.companyName ?? raw?.operator?.name ?? 'Operator',
    originCityName:
      raw?.route?.originCity?.name ??
      raw?.originCityName ??
      raw?.originCity?.name ??
      'Origin',
    destinationCityName:
      raw?.route?.destinationCity?.name ??
      raw?.destinationCityName ??
      raw?.destinationCity?.name ??
      'Destination',
    busType: raw?.busType ?? raw?.bus?.busType,
    stops: toStops(raw),
  };
}

function toBookingDetail(raw: any): BookingDetail {
  const scheduleId =
    raw?.scheduleId ??
    raw?.schedule?.scheduleId ??
    raw?.schedule?.id ??
    raw?.trip?.scheduleId ??
    undefined;

  const embeddedSchedule =
    raw?.schedule ??
    raw?.trip?.schedule ??
    undefined;

  return {
    bookingId: String(raw?.bookingId ?? raw?.id ?? ''),
    displayId: raw?.displayId,
    bookingReference: String(raw?.bookingReference ?? raw?.reference ?? ''),
    status: String(raw?.status ?? 'PENDING'),
    scheduleId: scheduleId ? String(scheduleId) : undefined,
    totalFarePaise: toFarePaise(raw),
    confirmedAt: raw?.confirmedAt,
    createdAt: raw?.createdAt,
    expiresAt: raw?.expiresAt,
    gstInvoiceAvailable: !!raw?.gstInvoiceAvailable,
    boardingStandId: raw?.boardingStandId,
    droppingStandId: raw?.droppingStandId,
    passengers: (raw?.passengers ?? []).map((p: any) => ({
      seatId: String(p?.seatId ?? ''),
      seatLabel: p?.seatLabel ?? p?.label,
      name: String(p?.name ?? ''),
      age: p?.age,
      gender: p?.gender,
    })),
    schedule: embeddedSchedule ? toScheduleDetail(embeddedSchedule) : undefined,
  };
}

export const bookingsApi = {
  async getScheduleDetail(scheduleId: string): Promise<ScheduleDetail> {
    const raw = await api.get<any>(`/public/schedules/${scheduleId}`, { skipAuth: true });
    return toScheduleDetail(raw);
  },

  async createBooking(input: CreateBookingInput): Promise<CreateBookingResponse> {
    if (input.lockIds.length === 0) {
      throw new Error('No seat locks — please select a seat first.');
    }

    const payload = {
      lockId: input.lockIds[0],
      boardingStandId: input.boardingStandId,
      droppingStandId: input.droppingStandId,
      passengers: input.passengers.map((p) => ({
        seatId: p.seatId,
        name: p.name.trim(),
        age: p.age,
        gender: p.gender,
      })),
    };

    console.log('[bookings.api] createBooking payload:', JSON.stringify(payload));

    try {
      const raw = await api.post<any>('/passenger/bookings', payload);
      return {
        bookingId: String(raw.bookingId ?? raw.id ?? ''),
        status: (raw.status ?? 'PENDING') as 'PENDING' | 'CONFIRMED',
        totalFarePaise: raw.totalFarePaise,
        expiresAt: raw.expiresAt,
      };
    } catch (err: any) {
      const apiErr = err as ApiError;
      if ((apiErr.code === 'VALIDATION_ERROR' || apiErr.status === 422) && input.lockIds.length > 1) {
        console.log('[bookings.api] Multi-seat rejected — falling back to per-seat');
        return await createPerSeatBookings(input);
      }
      throw err;
    }
  },

  async getBooking(bookingId: string): Promise<BookingDetail> {
    const raw = await api.get<any>(`/passenger/bookings/${bookingId}`);
    console.log('[bookings.api] getBooking raw:', JSON.stringify(raw, null, 2));
    return toBookingDetail(raw);
  },

  async getTicket(bookingId: string): Promise<Ticket> {
    const raw = await api.get<any>(`/passenger/bookings/${bookingId}/ticket`);
    return {
      ticketId: String(raw?.ticketId ?? raw?.id ?? ''),
      bookingId: String(raw?.bookingId ?? bookingId),
      qrPayload: String(raw?.qrPayload ?? raw?.qr_content ?? ''),
      status: String(raw?.status ?? 'ACTIVE'),
      issuedAt: String(raw?.issuedAt ?? ''),
    };
  },

  async listBookings(opts?: { limit?: number }): Promise<BookingDetail[]> {
    const limit = opts?.limit ?? 20;
    const raw = await api.get<any>(`/passenger/bookings?limit=${limit}`);
    const list = Array.isArray(raw) ? raw : raw?.bookings ?? raw?.data ?? [];
    return list.map(toBookingDetail);
  },

  async getTripIdForBooking(bookingId: string): Promise<string | null> {
    try {
      const b = await api.get<any>(`/passenger/bookings/${bookingId}`);
      const candidate = b?.tripId ?? b?.trip?.id ?? b?.trip?.tripId;
      if (candidate) return String(candidate);
    } catch {}
    try {
      const t = await api.get<any>(`/passenger/bookings/${bookingId}/trip`);
      const candidate = t?.tripId ?? t?.id ?? t?.trip?.id;
      if (candidate) return String(candidate);
    } catch {}
    return null;
  },
};

async function createPerSeatBookings(input: CreateBookingInput): Promise<CreateBookingResponse> {
  const results: CreateBookingResponse[] = [];
  for (let i = 0; i < input.passengers.length; i++) {
    const passenger = input.passengers[i];
    const lockId = input.lockIds[i];
    if (!lockId) continue;
    const raw = await api.post<any>('/passenger/bookings', {
      lockId,
      boardingStandId: input.boardingStandId,
      droppingStandId: input.droppingStandId,
      passengers: [{
        seatId: passenger.seatId,
        name: passenger.name.trim(),
        age: passenger.age,
        gender: passenger.gender,
      }],
    });
    results.push({
      bookingId: String(raw.bookingId ?? raw.id ?? ''),
      status: (raw.status ?? 'PENDING') as 'PENDING' | 'CONFIRMED',
      totalFarePaise: raw.totalFarePaise,
      expiresAt: raw.expiresAt,
    });
  }
  if (results.length === 0) throw new Error('No bookings created.');
  return results[0];
}