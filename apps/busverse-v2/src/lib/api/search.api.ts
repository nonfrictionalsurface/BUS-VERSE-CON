import { api } from '@/lib/api/client';

export interface City {
  cityId: string;
  name: string;
  state?: string;
}

export interface ScheduleResult {
  scheduleId: string;
  operatorName: string;
  busType?: string;
  busModel?: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  farePaise: number;
  availableSeats?: number;
  originCityName: string;
  destinationCityName: string;
  originStandName?: string;
  destinationStandName?: string;
}

interface RawCity {
  cityId?: string;
  id?: string;
  name: string;
  state?: string;
}

interface RawSchedule {
  scheduleId?: string;
  id?: string;
  operatorName?: string;
  operator?: { companyName?: string; name?: string };
  busType?: string;
  bus?: { model?: string; busType?: string };
  departureTime?: string;
  arrivalTime?: string;
  durationMinutes?: number;
  fare?: { amountPaise?: number; currency?: string } | number;
  fareAmountPaise?: number;
  availableSeats?: number;
  seatsAvailable?: number;
  route?: {
    originCity?: { name?: string };
    destinationCity?: { name?: string };
    stands?: Array<{ name?: string; sequence?: number; stand?: { name?: string } }>;
  };
  originCity?: { name?: string };
  destinationCity?: { name?: string };
  originStand?: { name?: string };
  destinationStand?: { name?: string };
}

function mapCity(raw: RawCity): City | null {
  const id = raw.cityId ?? raw.id;
  if (!id || !raw.name) return null;
  return { cityId: id, name: raw.name, state: raw.state };
}

function mapSchedule(raw: RawSchedule): ScheduleResult | null {
  const id = raw.scheduleId ?? raw.id;
  if (!id) return null;

  const dep = raw.departureTime ?? '';
  const arr = raw.arrivalTime ?? '';
  const farePaise =
    typeof raw.fare === 'number'
      ? raw.fare
      : raw.fare?.amountPaise ?? raw.fareAmountPaise ?? 0;

  const originName =
    raw.route?.originCity?.name ??
    raw.originCity?.name ??
    raw.originStand?.name ??
    'Origin';

  const destName =
    raw.route?.destinationCity?.name ??
    raw.destinationCity?.name ??
    raw.destinationStand?.name ??
    'Destination';

  const opName =
    raw.operatorName ??
    raw.operator?.companyName ??
    raw.operator?.name ??
    'Operator';

  const seats =
    raw.availableSeats ?? raw.seatsAvailable ?? undefined;

  const busType = raw.busType ?? raw.bus?.busType;
  const busModel = raw.bus?.model;

  let duration = raw.durationMinutes ?? 0;
  if (!duration && dep && arr) {
    duration = Math.round((new Date(arr).getTime() - new Date(dep).getTime()) / 60000);
  }

  return {
    scheduleId: id,
    operatorName: opName,
    busType,
    busModel,
    departureTime: dep,
    arrivalTime: arr,
    durationMinutes: duration,
    farePaise,
    availableSeats: seats,
    originCityName: originName,
    destinationCityName: destName,
  };
}

export const searchApi = {
  async cities(q: string): Promise<City[]> {
    if (!q || q.trim().length < 2) return [];
    const data = await api.get<RawCity[] | { data?: RawCity[] }>(
      `/public/cities?q=${encodeURIComponent(q.trim())}`,
      { skipAuth: true },
    );
    const list = Array.isArray(data) ? data : data?.data ?? [];
    return list.map(mapCity).filter((c): c is City => !!c);
  },

  async search(params: { originCityId: string; destinationCityId: string; date: string }): Promise<ScheduleResult[]> {
    const qs = new URLSearchParams({
      originCityId: params.originCityId,
      destinationCityId: params.destinationCityId,
      date: params.date,
    }).toString();
    const data = await api.get<RawSchedule[] | { data?: RawSchedule[] }>(
      `/public/search?${qs}`,
      { skipAuth: true },
    );
    const list = Array.isArray(data) ? data : data?.data ?? [];
    return list.map(mapSchedule).filter((s): s is ScheduleResult => !!s);
  },
};