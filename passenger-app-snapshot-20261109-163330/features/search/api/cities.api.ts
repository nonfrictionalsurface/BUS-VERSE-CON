import { api, EP } from '../../../lib/api';
import type { CityDTO } from '../../../types';

export type ListCitiesParams = {
  q?: string;
  limit?: number;
};

function buildQuery(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.join('&');
}

export async function listCities(params: ListCitiesParams = {}): Promise<CityDTO[]> {
  const qs = buildQuery({ q: params.q, limit: params.limit ?? 30 });
  return api.get<CityDTO[]>(`${EP.cities}${qs ? `?${qs}` : ''}`);
}