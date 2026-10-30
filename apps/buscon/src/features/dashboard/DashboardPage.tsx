'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import { Card } from '@/components/ui/Card';
import { DemoDisclaimer } from '@/components/ui/DemoDisclaimer';
import {
  Bus, IndianRupee, Activity, CalendarCheck, ShieldCheck,
  Users, ArrowUpRight, ArrowRight, Bot, User
} from 'lucide-react';
import Link from 'next/link';
import { TransitLoader } from '@/lib/brand';
import { formatIST } from '@/lib/utils/formatters';
import { useBuses } from '@/features/buses/hooks/useBuses';
import { useDrivers } from '@/features/drivers/hooks/useDrivers';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  actorEmail?: string;
  actorRole?: string;
  createdAt: string;
}

export function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const path = isAdmin ? '/admin/dashboard' : '/operator/dashboard';

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', isAdmin ? 'admin' : 'operator'],
    queryFn: async () => (await api.get<any>(path)).data,
    enabled: !!user,
    refetchInterval: 30_000,
  });

  // Real-time cross-check: even if the dashboard endpoint doesn't return counts,
  // we can count from the actual bus & driver lists (auto-invalidated on create).
  const { data: busesList } = useBuses();
  const { data: driversList } = useDrivers();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-ink-bright tracking-tight">
          {isAdmin ? 'Platform Oversight' : 'Operations Dashboard'}
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          {isAdmin ? 'Monitor approvals, refunds, and platform activity.' : `Welcome back${user?.name ? `, ${user.name}` : ''}. Here is your daily summary.`}
        </p>
      </div>

      {isLoading && (
        <div className="py-16 flex items-center justify-center">
          <TransitLoader size="md" caption="FETCHING METRICS" />
        </div>
      )}

      {error && (
        <Card className="border-danger-crimson/30 bg-danger-crimson/5">
          <p className="text-sm text-danger-crimson font-medium">
            {isApiError(error) ? error.message : 'Failed to load dashboard.'}
          </p>
        </Card>
      )}

      {data && (
        isAdmin ? (
          <AdminDashboard data={data} />
        ) : (
          <OperatorDashboard
            data={data}
            realBusCount={busesList?.length ?? 0}
            realDriverCount={driversList?.length ?? 0}
          />
        )
      )}
    </div>
  );
}

function OperatorDashboard({
  data,
  realBusCount,
  realDriverCount,
}: {
  data: any;
  realBusCount: number;
  realDriverCount: number;
}) {
  // Prefer real list count; fall back to dashboard-provided total; fall back to 0
  const fleetValue = realBusCount || data.totalBuses || 0;
  const driverValue = realDriverCount || data.drivers?.total || 0;
  const pendingBus = data.pendingApprovals?.buses ?? 0;

  const stats = [
    {
      label: "Today's Bookings",
      value: data.today?.bookingsCount ?? 0,
      icon: CalendarCheck,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: "Today's Revenue",
      value: `₹${Math.round((data.today?.revenuePaise ?? 0) / 100).toLocaleString('en-IN')}`,
      icon: IndianRupee,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      trend: '+12.5%',
    },
    {
      label: 'Active Trips',
      value: data.activeTrips ?? 0,
      icon: Activity,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Total Fleet',
      value: fleetValue,
      icon: Bus,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      hint: pendingBus > 0 ? `${pendingBus} pending approval` : undefined,
    },
    {
      label: 'Drivers',
      value: driverValue,
      icon: Users,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <DemoDisclaimer />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {stats.map((stat, i) => (
          <Card key={i} className="relative overflow-hidden group hover:shadow-floating transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              {stat.trend && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                  <ArrowUpRight size={12} /> {stat.trend}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-ink-secondary">{stat.label}</p>
              <h3 className="text-3xl font-bold text-ink-bright mt-1">{stat.value}</h3>
              {stat.hint && (
                <p className="text-xs text-amber-500 font-medium mt-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {stat.hint}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-line-hairline flex justify-between items-center">
          <h2 className="text-lg font-bold text-ink-bright">Recent Bookings</h2>
          <Link href="/operator/bookings" className="text-sm text-brand-text font-medium hover:underline flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="p-5">
          {data.recentBookings && data.recentBookings.length > 0 ? (
            <div className="text-sm">Bookings list...</div>
          ) : (
            <div className="text-center py-6 text-ink-secondary text-sm">
              No bookings yet today.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function AdminDashboard({ data }: { data: any }) {
  const { data: recentLogs } = useQuery({
    queryKey: ['admin', 'recent-audit'],
    queryFn: async () => {
      try {
        const res = await api.get<AuditEntry[]>('/admin/audit-logs?limit=8');
        return res.data;
      } catch {
        return [] as AuditEntry[];
      }
    },
  });

  const recentActivity = recentLogs?.slice(0, 4) || [];
  const recentAudit = recentLogs?.slice(4, 8) || [];

  return (
    <div className="space-y-6">
      <DemoDisclaimer />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="border-amber-500/20 bg-amber-500/5 hover:shadow-floating transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-500">Pending Approvals</p>
              <h3 className="text-4xl font-bold text-ink-bright mt-2">{data.pendingApprovals ?? 0}</h3>
              <Link href="/admin/approvals" className="text-sm text-amber-600 font-medium hover:underline mt-4 inline-flex items-center gap-1">
                Review queue <ArrowRight size={14} />
              </Link>
            </div>
            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-600">
              <ShieldCheck size={28} />
            </div>
          </div>
        </Card>

        <Card className="border-rose-500/20 bg-rose-500/5 hover:shadow-floating transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-rose-600 dark:text-rose-500">Pending Refunds</p>
              <h3 className="text-4xl font-bold text-ink-bright mt-2">₹{Math.round((data.pendingRefunds ?? 0) / 100).toLocaleString('en-IN')}</h3>
              <Link href="/admin/refunds" className="text-sm text-rose-600 font-medium hover:underline mt-4 inline-flex items-center gap-1">
                Process refunds <ArrowRight size={14} />
              </Link>
            </div>
            <div className="p-3 bg-rose-500/20 rounded-xl text-rose-600">
              <IndianRupee size={28} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-0">
          <div className="p-5 border-b border-line-hairline flex justify-between items-center">
            <h2 className="text-lg font-bold text-ink-bright">Recent Activity</h2>
            <Link href="/admin/audit" className="text-xs text-brand-text font-medium hover:underline">Full Log</Link>
          </div>
          <div className="divide-y divide-line-hairline">
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-muted">No recent activity.</div>
            ) : recentActivity.map((log) => (
              <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-surface-hover/30 transition-colors">
                <div className={`p-1.5 rounded-md shrink-0 ${log.actorRole ? 'bg-signal-emerald/10 text-brand-text' : 'bg-ink-muted/10 text-ink-muted'}`}>
                  {log.actorRole ? <User size={12} /> : <Bot size={12} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-bright truncate">
                    {log.action || 'unknown'} <span className="text-ink-muted font-normal">on</span> {log.entity || 'unknown'}
                  </p>
                  <p className="text-[10px] text-ink-muted mt-0.5">
                    {log.actorEmail || 'System'} · {formatIST(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-0">
          <div className="p-5 border-b border-line-hairline flex justify-between items-center">
            <h2 className="text-lg font-bold text-ink-bright">Audit Snapshot</h2>
            <Link href="/admin/audit" className="text-xs text-brand-text font-medium hover:underline">Full Log</Link>
          </div>
          <div className="divide-y divide-line-hairline">
            {recentAudit.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-muted">No audit events.</div>
            ) : recentAudit.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-surface-hover/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-xs font-mono font-bold text-ink-primary truncate">{log.action || 'unknown'}</p>
                  <p className="text-[10px] text-ink-muted mt-0.5 truncate">{log.entity || 'unknown'}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-surface-sunken rounded text-ink-secondary shrink-0">
                  {formatIST(log.createdAt).split(',')[0]}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}