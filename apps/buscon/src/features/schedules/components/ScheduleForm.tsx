'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreateSchedule } from '../hooks/useSchedules';
import { useBuses } from '@/features/buses/hooks/useBuses';
import { useRoutes } from '@/features/routes/hooks/useRoutes';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { isApiError, getErrorMessage } from '@/lib/api/errors';
import { AlertCircle, PlusCircle, Bus, Map as MapIcon, MapPin, ArrowRight, ExternalLink } from 'lucide-react';

export function ScheduleForm() {
  const router = useRouter();
  const { data: buses, isLoading: loadingBuses } = useBuses();
  const { data: routes, isLoading: loadingRoutes } = useRoutes();
  const createMutation = useCreateSchedule();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    busId: '',
    routeId: '',
    departureDate: '',
    departureTime: '',
    arrivalDate: '',
    arrivalTime: '',
    fareRupees: 500,
  });

  const availableBuses = useMemo(
    () => (buses || []).filter((b) => b.approvalStatus === 'APPROVED'),
    [buses]
  );

  const availableRoutes = useMemo(
    () => (routes || []).filter((r) => (r.approvalStatus as string) !== 'REJECTED'),
    [routes]
  );

  const selectedRoute = useMemo(
    () => availableRoutes.find((r) => r.id === formData.routeId),
    [availableRoutes, formData.routeId]
  );

  const sortedStands = useMemo(() => {
    if (!selectedRoute?.stands) return [];
    return [...selectedRoute.stands].sort((a, b) => a.sequence - b.sequence);
  }, [selectedRoute]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.busId) { setError('Select a bus'); return; }
    if (!formData.routeId) { setError('Select a route'); return; }
    if (!formData.departureDate || !formData.departureTime) { setError('Set departure date and time'); return; }
    if (!formData.arrivalDate || !formData.arrivalTime) { setError('Set arrival date and time'); return; }

    const depIso = new Date(formData.departureDate + 'T' + formData.departureTime + ':00.000').toISOString();
    const arrIso = new Date(formData.arrivalDate + 'T' + formData.arrivalTime + ':00.000').toISOString();

    if (new Date(arrIso) <= new Date(depIso)) {
      setError('Arrival must be after departure');
      return;
    }

    try {
      await createMutation.mutateAsync({
        busId: formData.busId,
        routeId: formData.routeId,
        departureTime: depIso,
        arrivalTime: arrIso,
        fareAmountPaise: Math.round(formData.fareRupees * 100),
      });
      router.push('/operator/schedules');
    } catch (err) {
      if (isApiError(err)) setError('[' + err.code + '] ' + getErrorMessage(err.code, err.message));
      else setError('Failed to create schedule.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Warning: no buses */}
      {!loadingBuses && availableBuses.length === 0 && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-500 text-sm">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">No approved buses available</p>
              <Link
                href="/operator/buses/new"
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-amber-700 dark:text-amber-500 hover:underline"
              >
                <PlusCircle size={12} /> Add a new bus
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Warning: no routes */}
      {!loadingRoutes && availableRoutes.length === 0 && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-500 text-sm">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">No routes available</p>
              <Link
                href="/operator/routes/new"
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-amber-700 dark:text-amber-500 hover:underline"
              >
                <PlusCircle size={12} /> Create a route
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div role="alert" className="p-4 rounded-lg bg-danger-crimson/10 border border-danger-crimson/30 text-danger-crimson text-sm font-medium">
          {error}
        </div>
      )}

      <Card className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-ink-secondary flex items-center gap-1.5">
              <Bus size={12} /> Bus ({availableBuses.length} approved)
            </label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-line-subtle bg-surface-card text-ink-primary text-sm focus:border-line-focus focus:outline-none"
              value={formData.busId}
              onChange={(e) => setFormData({ ...formData, busId: e.target.value })}
              disabled={loadingBuses || availableBuses.length === 0}
            >
              <option value="">Select a bus…</option>
              {availableBuses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.registrationNumber} · {b.model} ({b.capacity} seats)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-ink-secondary flex items-center gap-1.5">
              <MapIcon size={12} /> Route ({availableRoutes.length} available)
            </label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-line-subtle bg-surface-card text-ink-primary text-sm focus:border-line-focus focus:outline-none"
              value={formData.routeId}
              onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
              disabled={loadingRoutes || availableRoutes.length === 0}
            >
              <option value="">Select a route…</option>
              {availableRoutes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.originCity?.name} → {r.destinationCity?.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Route Stops Preview */}
        {selectedRoute && (
          <div className="p-4 rounded-lg bg-brand/5 border border-brand/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-brand-text" />
                <p className="text-sm font-semibold text-ink-bright">Stops on this route</p>
              </div>
              <Link
                href={`/operator/routes/${selectedRoute.id}`}
                className="inline-flex items-center gap-1 text-xs text-brand-text hover:underline font-medium"
              >
                <ExternalLink size={12} /> Edit route stops
              </Link>
            </div>

            {sortedStands.length === 0 ? (
              <div className="p-3 rounded bg-surface-card border border-line-hairline text-xs text-ink-secondary">
                This route has no stands defined. Add a boarding and dropping stand to make this schedule sellable.
                <Link
                  href={`/operator/routes/${selectedRoute.id}`}
                  className="inline-flex items-center gap-1 ml-1 text-brand-text font-medium hover:underline"
                >
                  Add stands <ArrowRight size={10} />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedStands.map((s, i) => {
                  const isFirst = i === 0;
                  const isLast = i === sortedStands.length - 1;
                  const isIntermediate = !isFirst && !isLast;
                  return (
                    <div key={s.standId} className="flex items-center gap-3">
                      <div
                        className={
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ' +
                          (isFirst
                            ? 'bg-signal-emerald text-white'
                            : isLast
                            ? 'bg-danger-crimson text-white'
                            : 'bg-brand text-white')
                        }
                      >
                        {s.sequence}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-bright truncate">
                          {s.stand?.name || s.standId.slice(0, 8)}
                        </p>
                        {isIntermediate && (
                          <p className="text-[10px] text-ink-muted">Intermediate stop</p>
                        )}
                      </div>
                      <span
                        className={
                          'text-[10px] font-bold uppercase px-2 py-0.5 rounded ' +
                          (isFirst
                            ? 'bg-signal-emerald/10 text-signal-emerald'
                            : isLast
                            ? 'bg-danger-crimson/10 text-danger-crimson'
                            : 'bg-brand/10 text-brand-text')
                        }
                      >
                        {isFirst ? 'Boarding' : isLast ? 'Drop-off' : 'Stop'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-ink-secondary">Departure</label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={formData.departureDate}
                onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                className="flex-1"
              />
              <Input
                type="time"
                value={formData.departureTime}
                onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                className="w-32"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-ink-secondary">Arrival</label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={formData.arrivalDate}
                onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                className="flex-1"
              />
              <Input
                type="time"
                value={formData.arrivalTime}
                onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                className="w-32"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-ink-secondary">Fare (Rupees)</label>
          <Input
            type="number"
            min={1}
            value={formData.fareRupees}
            onChange={(e) => setFormData({ ...formData, fareRupees: parseInt(e.target.value) || 0 })}
          />
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" loading={createMutation.isPending}>Save as Draft</Button>
      </div>
    </form>
  );
}
