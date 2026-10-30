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
import { AlertCircle, PlusCircle, Bus, Map as MapIcon } from 'lucide-react';

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

  // Buses still require admin approval (insurance verification).
  const availableBuses = useMemo(() => {
    return (buses || []).filter((b) => b.approvalStatus === 'APPROVED');
  }, [buses]);

  // Routes do NOT require approval (removed in v1 — routes are factual data).
  // Show every route except explicitly rejected ones.
  const availableRoutes = useMemo(() => {
    return (routes || []).filter((r) => (r.approvalStatus as string) !== 'REJECTED');
  }, [routes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const depIso = new Date(`${formData.departureDate}T${formData.departureTime}:00`).toISOString();
      const arrIso = new Date(`${formData.arrivalDate}T${formData.arrivalTime}:00`).toISOString();

      await createMutation.mutateAsync({
        busId: formData.busId,
        routeId: formData.routeId,
        departureTime: depIso,
        arrivalTime: arrIso,
        fareAmountPaise: formData.fareRupees * 100,
      });
      router.push('/operator/schedules');
    } catch (err) {
      setError(isApiError(err) ? getErrorMessage(err.code, err.message) : 'Failed to create schedule.');
    }
  };

  const canSubmit = !!formData.busId && !!formData.routeId && !!formData.departureDate && !!formData.departureTime && !!formData.arrivalDate && !!formData.arrivalTime;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Warning when prerequisites are missing */}
      {!loadingBuses && availableBuses.length === 0 && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-500 text-sm">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">No approved buses available</p>
              <p className="text-xs mt-1 text-amber-600/80">
                Schedules need an admin-approved bus (insurance verification). Ask your admin to approve a bus, or add one and wait for approval.
              </p>
              <Link
                href="/operator/buses/new"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-amber-700 dark:text-amber-500 hover:underline"
              >
                <PlusCircle size={12} /> Add a new bus
              </Link>
            </div>
          </div>
        </div>
      )}

      {!loadingRoutes && availableRoutes.length === 0 && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-500 text-sm">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">No routes available</p>
              <p className="text-xs mt-1 text-amber-600/80">
                Create a route first, then come back to add schedules against it.
              </p>
              <Link
                href="/operator/routes/new"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-amber-700 dark:text-amber-500 hover:underline"
              >
                <PlusCircle size={12} /> Create a route
              </Link>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 rounded-lg bg-danger-crimson/10 border border-danger-crimson/30 text-danger-crimson text-sm font-medium">
          {error}
        </div>
      )}

      <Card className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Bus picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-ink-secondary flex items-center gap-1.5">
              <Bus size={12} /> Bus
              <span className="text-ink-muted font-normal">({availableBuses.length} available)</span>
            </label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-line-subtle bg-surface-card text-ink-primary text-sm"
              value={formData.busId}
              onChange={(e) => setFormData({ ...formData, busId: e.target.value })}
              required
              disabled={loadingBuses || availableBuses.length === 0}
            >
              <option value="">
                {loadingBuses
                  ? 'Loading buses…'
                  : availableBuses.length === 0
                  ? 'No approved buses — see warning above'
                  : 'Select a bus…'}
              </option>
              {availableBuses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.registrationNumber} · {b.model} ({b.capacity} seats)
                </option>
              ))}
            </select>
          </div>

          {/* Route picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-ink-secondary flex items-center gap-1.5">
              <MapIcon size={12} /> Route
              <span className="text-ink-muted font-normal">({availableRoutes.length} available)</span>
            </label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-line-subtle bg-surface-card text-ink-primary text-sm"
              value={formData.routeId}
              onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
              required
              disabled={loadingRoutes || availableRoutes.length === 0}
            >
              <option value="">
                {loadingRoutes
                  ? 'Loading routes…'
                  : availableRoutes.length === 0
                  ? 'No routes — see warning above'
                  : 'Select a route…'}
              </option>
              {availableRoutes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.originCity?.name} → {r.destinationCity?.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-ink-secondary">Departure Date &amp; Time</label>
            <div className="flex gap-2">
              <Input
                type="date"
                required
                value={formData.departureDate}
                onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                className="flex-1"
              />
              <Input
                type="time"
                required
                value={formData.departureTime}
                onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                className="w-32"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-ink-secondary">Arrival Date &amp; Time</label>
            <div className="flex gap-2">
              <Input
                type="date"
                required
                value={formData.arrivalDate}
                onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                className="flex-1"
              />
              <Input
                type="time"
                required
                value={formData.arrivalTime}
                onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                className="w-32"
              />
            </div>
          </div>
        </div>

        <Input
          label="Fare (Rupees)"
          type="number"
          min={1}
          value={formData.fareRupees}
          onChange={(e) => setFormData({ ...formData, fareRupees: parseInt(e.target.value) || 0 })}
          required
        />
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" loading={createMutation.isPending} disabled={!canSubmit}>
          Save as Draft
        </Button>
      </div>
    </form>
  );
}