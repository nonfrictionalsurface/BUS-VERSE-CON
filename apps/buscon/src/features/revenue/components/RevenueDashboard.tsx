'use client';

import { useRevenueSummary, useDailyTrend } from '../hooks/useRevenue';
import { Card } from '@/components/ui/Card';
import { formatINR } from '@/lib/utils/formatters';
import { IndianRupee, TrendingUp, RotateCcw, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' });
  } catch {
    return iso;
  }
}

export function RevenueDashboard() {
  const { data: summary, isLoading: loadingSummary } = useRevenueSummary();
  const { data: trend, isLoading: loadingTrend } = useDailyTrend();

  if (loadingSummary || loadingTrend) {
    return <div className="text-sm text-ink-secondary animate-pulse">Loading revenue data...</div>;
  }

  // Guarantee trend is a real array (defensive — API shape varies)
  const safeTrend = Array.isArray(trend) ? trend : [];

  const chartData = safeTrend.map((t) => ({
    date: formatShortDate(t.date),
    revenue: (t.revenuePaise || 0) / 100,
    bookings: t.bookingsCount || 0,
  }));

  const hasChart = chartData.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="relative overflow-hidden group hover:shadow-floating transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <IndianRupee size={20} />
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
              <TrendingUp size={12} /> Gross
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-ink-secondary">Gross Revenue</p>
            <h3 className="text-3xl font-bold text-ink-bright mt-1">
              {formatINR(summary?.totalRevenuePaise || 0)}
            </h3>
          </div>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-floating transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500">
              <RotateCcw size={20} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-ink-secondary">Total Refunds</p>
            <h3 className="text-3xl font-bold text-ink-bright mt-1">
              {formatINR(summary?.totalRefundsPaise || 0)}
            </h3>
          </div>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-floating transition-all duration-300 border-signal-emerald/30 bg-signal-emerald/5">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 rounded-lg bg-signal-emerald/20 text-brand-text">
              <Activity size={20} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-brand-text">Net Revenue</p>
            <h3 className="text-3xl font-bold text-ink-bright mt-1">
              {formatINR(summary?.netRevenuePaise || 0)}
            </h3>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-ink-bright">7-Day Revenue Trend</h2>
          <p className="text-sm text-ink-secondary">Daily gross revenue in INR</p>
        </div>

        {!hasChart ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-ink-muted">
            No revenue data yet. Once bookings come in, the trend will appear here.
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand-emerald)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--brand-emerald)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-hairline)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickFormatter={(val) => `₹${val}`} dx={-10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-card)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-floating)',
                  }}
                  itemStyle={{ color: 'var(--brand-emerald)', fontWeight: 'bold' }}
                  formatter={(value) => [`₹${Number(value ?? 0).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--brand-emerald)" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

