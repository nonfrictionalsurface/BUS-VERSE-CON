import { api } from '@/lib/api/client';

export interface DailyRevenue {
  date: string;
  revenuePaise: number;
  bookingsCount: number;
}

export interface RevenueSummary {
  totalRevenuePaise: number;
  totalRefundsPaise: number;
  netRevenuePaise: number;
  buckets: Array<{ date: string; grossPaise: number; refundsPaise: number; netPaise: number }>;
}

// The backend may return `[...]` OR `{ buckets: [...] }` OR `{ data: [...] }`.
// Normalize to an array defensively.
function normalizeDaily(raw: any): DailyRevenue[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.buckets)) {
    return raw.buckets.map((b: any) => ({
      date: b.date,
      revenuePaise: b.grossPaise ?? b.revenuePaise ?? 0,
      bookingsCount: b.bookingsCount ?? 0,
    }));
  }
  if (raw && Array.isArray(raw.data)) return raw.data;
  return [];
}

export const revenueApi = {
  getSummary: async (): Promise<RevenueSummary> => {
    const res = await api.get<any>('/operator/revenue');
    const d = res.data || {};
    return {
      totalRevenuePaise: d.totalRevenuePaise ?? 0,
      totalRefundsPaise: d.totalRefundsPaise ?? 0,
      netRevenuePaise: d.netRevenuePaise ?? 0,
      buckets: Array.isArray(d.buckets) ? d.buckets : [],
    };
  },
  getDailyTrend: async (): Promise<DailyRevenue[]> => {
    const res = await api.get<any>('/operator/revenue/daily');
    return normalizeDaily(res.data);
  },
};