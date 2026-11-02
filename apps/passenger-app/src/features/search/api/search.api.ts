import { api, EP } from '../../../lib/api';
import type { ScheduleSearchResultDTO } from '../../../types';

export type SearchParams = {
  originCityId: string;
  destinationCityId: string;
  date: string;
  sortBy?: 'departureTime' | 'fare';
};

function buildQuery(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.join('&');
}

export async function searchSchedules(params: SearchParams): Promise<ScheduleSearchResultDTO[]> {
  const qs = buildQuery({
    originCityId: params.originCityId,
    destinationCityId: params.destinationCityId,
    date: params.date,
    sortBy: params.sortBy,
  });
  return api.get<ScheduleSearchResultDTO[]>(`${EP.search}?${qs}`);
}