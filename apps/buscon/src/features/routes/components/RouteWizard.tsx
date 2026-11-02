'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateRoute, useStands } from '../hooks/useRoutes';
import { City, CreateRouteStandInput, Stand } from '../api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CityAutocomplete } from './CityAutocomplete';
import { isApiError, getErrorMessage } from '@/lib/api/errors';
import { haversineKm, estimateMinutes } from '@/lib/utils/geo';
import { ArrowRight, Plus, Trash2, Check, AlertCircle, MapPin, Wand2 } from 'lucide-react';

interface ErrState {
  message: string;
  code?: string;
  details?: any;
}

interface IntermediateStop {
  standId: string;
  distance: number;
  duration: number;
}

export function RouteWizard() {
  const router = useRouter();
  const createRoute = useCreateRoute();

  const [step, setStep] = useState(1);
  const [error, setError] = useState<ErrState | null>(null);

  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);

  const { data: originStands, isLoading: loadingOriginStands } = useStands(origin?.id);
  const { data: destStands, isLoading: loadingDestStands } = useStands(destination?.id);

  const [originStandId, setOriginStandId] = useState('');
  const [destStandId, setDestStandId] = useState('');
  const [destDistance, setDestDistance] = useState(0);
  const [destDuration, setDestDuration] = useState(0);
  const [intermediates, setIntermediates] = useState<IntermediateStop[]>([]);

  // Toggle to allow manual override (defaults to auto-calc on)
  const [autoCalc, setAutoCalc] = useState(true);

  const allAvailableStands = useMemo<Stand[]>(() => {
    const byId = new Map<string, Stand>();
    (originStands || []).forEach((s) => byId.set(s.id, s));
    (destStands || []).forEach((s) => byId.set(s.id, s));
    return Array.from(byId.values());
  }, [originStands, destStands]);

  const findStand = (id: string): Stand | null =>
    allAvailableStands.find((s) => s.id === id) || null;

  // Stable key — JSON so no delimiter collisions
  const intermediateIdsKey = JSON.stringify(intermediates.map((i) => i.standId));

  // Auto-compute distances whenever stands change
  useEffect(() => {
    if (!autoCalc) return;

    console.log('[auto-calc] effect fired', {
      originStandId,
      destStandId,
      intermediateIds: intermediates.map((i) => i.standId),
      standsAvailable: allAvailableStands.length,
    });

    const originStand = findStand(originStandId);
    if (!originStand) {
      console.warn('[auto-calc] origin stand not found:', originStandId);
      return;
    }

    // Compute all intermediate distances in one pass
    const nextIntermediates = intermediates.map((inter, idx) => {
      if (!inter.standId) {
        console.log('[auto-calc] intermediate[' + idx + '] has no stand — skipping');
        return inter;
      }
      const currentStand = findStand(inter.standId);
      if (!currentStand) {
        console.warn('[auto-calc] intermediate[' + idx + '] stand not found:', inter.standId);
        return inter;
      }

      // Walk backwards to find previous valid stand
      let prevStand: Stand | null = null;
      for (let j = idx - 1; j >= 0; j--) {
        const candidate = findStand(intermediates[j].standId);
        if (candidate) { prevStand = candidate; break; }
      }
      if (!prevStand) prevStand = originStand;

      const rawKm = haversineKm(prevStand.lat, prevStand.lng, currentStand.lat, currentStand.lng);
      // Smart rounding: keep 1 decimal for < 10 km, integer for larger
      const km = rawKm < 10 ? Math.round(rawKm * 10) / 10 : Math.round(rawKm);
      const min = km > 0 ? Math.max(1, Math.round(km * 1.2)) : 0;

      console.log('[auto-calc] intermediate[' + idx + '] ' +
        (prevStand.name || 'origin') + ' -> ' + (currentStand.name || '?') +
        ' = ' + km.toFixed(1) + ' km, ' + min + ' min');

      return { ...inter, distance: km, duration: min };
    });

    // Update intermediates only if something changed
    const interChanged = nextIntermediates.some((n, i) =>
      n.distance !== intermediates[i].distance || n.duration !== intermediates[i].duration
    );
    if (interChanged) {
      console.log('[auto-calc] updating intermediates');
      setIntermediates(nextIntermediates);
    }

    // Destination distance (from last valid intermediate or origin)
    const destStand = findStand(destStandId);
    if (destStand) {
      let prevStand: Stand | null = null;
      for (let j = intermediates.length - 1; j >= 0; j--) {
        const candidate = findStand(intermediates[j].standId);
        if (candidate) { prevStand = candidate; break; }
      }
      if (!prevStand) prevStand = originStand;

      const rawKm = haversineKm(prevStand.lat, prevStand.lng, destStand.lat, destStand.lng);
      const km = rawKm < 10 ? Math.round(rawKm * 10) / 10 : Math.round(rawKm);
      const min = km > 0 ? Math.max(1, Math.round(km * 1.2)) : 0;

      console.log('[auto-calc] destination ' +
        (prevStand.name || 'origin') + ' -> ' + (destStand.name || '?') +
        ' = ' + km.toFixed(1) + ' km, ' + min + ' min');

      if (km !== destDistance || min !== destDuration) {
        setDestDistance(km);
        setDestDuration(min);
      }
    } else {
      console.log('[auto-calc] no destination stand selected yet');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originStandId, destStandId, intermediateIdsKey, allAvailableStands, autoCalc]);

  const showError = (err: unknown, fallback: string) => {
    if (isApiError(err)) {
      setError({
        message: getErrorMessage(err.code, err.message),
        code: err.code,
        details: (err as any).details,
      });
    } else {
      setError({ message: (err as Error)?.message || fallback });
    }
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!origin || !destination) return;
    if (origin.id === destination.id) {
      setError({ message: 'Origin and destination cities must be different.' });
      return;
    }
    setStep(2);
  };

  const addIntermediate = () => {
    setIntermediates([...intermediates, { standId: '', distance: 0, duration: 0 }]);
  };

  const updateIntermediate = (i: number, field: keyof IntermediateStop, value: any) => {
    const next = [...intermediates];
    (next[i] as any)[field] = value;
    setIntermediates(next);
  };

  const removeIntermediate = (i: number) => {
    setIntermediates(intermediates.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!origin || !destination) {
      setError({ message: 'Select origin and destination cities.' });
      setStep(1);
      return;
    }
    if (!originStandId) {
      setError({ message: 'Select the origin (boarding) stand.' });
      return;
    }
    if (!destStandId) {
      setError({ message: 'Select the destination (drop-off) stand.' });
      return;
    }
    if (intermediates.some((s) => !s.standId)) {
      setError({ message: 'Select a stand for every intermediate stop, or remove the empty ones.' });
      return;
    }

    // ---- Recompute distances NOW from live stand data ----
    // (don't trust the state values from the auto-calc effect — React batching
    // means they may be stale if the user clicked Save immediately after picking
    // the last stand)
    const originStand = findStand(originStandId);
    const destStand = findStand(destStandId);

    if (!originStand) {
      setError({ message: 'Origin stand not found. Re-select it and try again.' });
      return;
    }
    if (!destStand) {
      setError({ message: 'Destination stand not found. Re-select it and try again.' });
      return;
    }

    const stands: CreateRouteStandInput[] = [
      {
        standId: originStandId,
        sequence: 1,
        distanceFromPrevKm: 0,
        durationFromPrevMin: 0,
      },
    ];

    // Walk intermediates in order, computing each distance from its true previous stand
    let prevStand = originStand;
    for (let i = 0; i < intermediates.length; i++) {
      const interStand = findStand(intermediates[i].standId);
      if (!interStand) {
        setError({ message: `Intermediate stop ${i + 1} has an invalid stand. Re-select it.` });
        return;
      }
      const rawKm = haversineKm(prevStand.lat, prevStand.lng, interStand.lat, interStand.lng);
      const km = rawKm < 10 ? Math.round(rawKm * 10) / 10 : Math.round(rawKm);
      const min = km > 0 ? Math.max(1, Math.round(km * 1.2)) : 0;

      stands.push({
        standId: interStand.id,
        sequence: i + 2,
        distanceFromPrevKm: km,
        durationFromPrevMin: min,
      });

      prevStand = interStand;
    }

    // Final destination — from last intermediate (or origin if none)
    const destRawKm = haversineKm(prevStand.lat, prevStand.lng, destStand.lat, destStand.lng);
    const destKm = destRawKm < 10 ? Math.round(destRawKm * 10) / 10 : Math.round(destRawKm);
    const destMin = destKm > 0 ? Math.max(1, Math.round(destKm * 1.2)) : 0;

    stands.push({
      standId: destStandId,
      sequence: intermediates.length + 2,
      distanceFromPrevKm: destKm,
      durationFromPrevMin: destMin,
    });

    console.log('[route-submit] stands payload:', stands);

    try {
      await createRoute.mutateAsync({
        originCityId: origin.id,
        destinationCityId: destination.id,
        stands,
      });
      router.push('/operator/routes');
    } catch (err) {
      showError(err, 'Failed to create route.');
    }
  };

  const totalKm = destDistance + intermediates.reduce((sum, s) => sum + s.distance, 0);
  const totalMin = destDuration + intermediates.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Step indicator */}
      <div className="flex items-center gap-4 text-sm font-medium">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-brand-text' : 'text-ink-muted'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-brand text-white' : 'bg-surface-sunken'}`}>
            {step > 1 ? <Check size={14} /> : '1'}
          </div>
          Cities
        </div>
        <div className="h-px w-12 bg-line-hairline"></div>
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-brand-text' : 'text-ink-muted'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-brand text-white' : 'bg-surface-sunken'}`}>2</div>
          Stands &amp; Stops
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-lg bg-danger-crimson/10 border border-danger-crimson/30 text-danger-crimson">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1 min-w-0">
              <p className="font-semibold">{error.message}</p>
              {error.code && <p className="text-xs font-mono opacity-80">Code: {error.code}</p>}
              {error.details && (
                <pre className="text-xs font-mono bg-black/10 p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap mt-2">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleStep1Next} className="space-y-6 animate-in fade-in slide-in-from-left-4">
          <Card className="space-y-5">
            <div className="grid grid-cols-2 gap-6">
              <CityAutocomplete label="Origin City" value={origin} onChange={setOrigin} placeholder="e.g. Delhi" />
              <CityAutocomplete label="Destination City" value={destination} onChange={setDestination} placeholder="e.g. Lucknow" />
            </div>
            {origin && destination && (
              <div className="p-3 rounded-lg bg-surface-sunken text-xs text-ink-secondary flex items-center gap-2">
                <ArrowRight size={14} />
                <span className="font-medium">{origin.name} → {destination.name}</span>
              </div>
            )}
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={!origin || !destination}>
              Continue to Stands <ArrowRight size={16} />
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          {/* Auto-calculate toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-brand/5 border border-brand/30">
            <div className="flex items-center gap-2 text-sm">
              <Wand2 size={16} className="text-brand-text" />
              <div>
                <p className="font-semibold text-ink-bright">Auto-calculate distances</p>
                <p className="text-xs text-ink-secondary">
                  Distances estimated from GPS coordinates (straight-line km). Duration assumes ~50 km/h.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoCalc((v) => !v)}
              className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ${
                autoCalc ? 'bg-brand' : 'bg-ink-muted'
              }`}
              aria-label="Toggle auto-calculate"
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                  autoCalc ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <Card className="space-y-6">
            {/* Origin stand */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted border-b border-line-hairline pb-2 mb-3 flex items-center gap-2">
                <MapPin size={14} /> Boarding Stand · {origin?.name}
              </h3>
              <select
                className="w-full h-10 px-3 rounded-lg border border-line-subtle bg-surface-card text-ink-primary text-sm focus:border-line-focus focus:outline-none"
                value={originStandId}
                onChange={(e) => setOriginStandId(e.target.value)}
                disabled={loadingOriginStands}
              >
                <option value="">{loadingOriginStands ? 'Loading stands…' : 'Select boarding stand…'}</option>
                {(originStands || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {(originStands || []).length === 0 && !loadingOriginStands && (
                <p className="text-[11px] text-amber-600 mt-1">No stands found for {origin?.name}.</p>
              )}
            </div>

            {/* Intermediate stops */}
            <div>
              <div className="flex items-center justify-between border-b border-line-hairline pb-2 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Intermediate Stops (optional)
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={addIntermediate} className="text-xs">
                  <Plus size={12} className="mr-1" /> Add stop
                </Button>
              </div>

              {intermediates.length === 0 ? (
                <p className="text-xs text-ink-muted italic py-2">
                  Direct route — no intermediate stops between {origin?.name} and {destination?.name}.
                </p>
              ) : (
                <div className="space-y-2">
                  {intermediates.map((stop, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-surface-sunken rounded-lg border border-line-hairline">
                      <div className="w-6 h-6 mt-1 rounded-full bg-surface-card text-ink-secondary flex items-center justify-center text-xs font-bold shrink-0 border border-line-hairline">
                        {i + 2}
                      </div>
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-ink-muted">Stand</label>
                          <select
                            className="w-full h-9 mt-1 text-xs rounded border border-line-subtle bg-surface-card px-2 focus:border-line-focus focus:outline-none"
                            value={stop.standId}
                            onChange={(e) => updateIntermediate(i, 'standId', e.target.value)}
                          >
                            <option value="">Select…</option>
                            {allAvailableStands.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-ink-muted flex items-center gap-1">
                            Distance (km)
                            {autoCalc && stop.standId && <span className="text-brand-text">✦</span>}
                          </label>
                          <Input
                            type="number"
                            min={0}
                            value={stop.distance || ''}
                            onChange={(e) => updateIntermediate(i, 'distance', parseFloat(e.target.value) || 0)}
                            className="h-9 text-xs mt-1"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-ink-muted flex items-center gap-1">
                            Duration (min)
                            {autoCalc && stop.standId && <span className="text-brand-text">✦</span>}
                          </label>
                          <Input
                            type="number"
                            min={0}
                            value={stop.duration || ''}
                            onChange={(e) => updateIntermediate(i, 'duration', parseInt(e.target.value) || 0)}
                            className="h-9 text-xs mt-1"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIntermediate(i)}
                        className="mt-5 text-danger-crimson hover:bg-danger-crimson/10 shrink-0"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Destination stand */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted border-b border-line-hairline pb-2 mb-3 flex items-center gap-2">
                <MapPin size={14} /> Drop-off Stand · {destination?.name}
              </h3>
              <select
                className="w-full h-10 px-3 rounded-lg border border-line-subtle bg-surface-card text-ink-primary text-sm focus:border-line-focus focus:outline-none"
                value={destStandId}
                onChange={(e) => setDestStandId(e.target.value)}
                disabled={loadingDestStands}
              >
                <option value="">{loadingDestStands ? 'Loading stands…' : 'Select drop-off stand…'}</option>
                {(destStands || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {(destStands || []).length === 0 && !loadingDestStands && (
                <p className="text-[11px] text-amber-600 mt-1">No stands found for {destination?.name}.</p>
              )}

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-ink-muted flex items-center gap-1">
                    Distance from previous (km)
                    {autoCalc && destStandId && <span className="text-brand-text">✦</span>}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={destDistance || ''}
                    onChange={(e) => setDestDistance(parseFloat(e.target.value) || 0)}
                    className="h-9 text-sm mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-ink-muted flex items-center gap-1">
                    Duration from previous (min)
                    {autoCalc && destStandId && <span className="text-brand-text">✦</span>}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={destDuration || ''}
                    onChange={(e) => setDestDuration(parseInt(e.target.value) || 0)}
                    className="h-9 text-sm mt-1"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="pt-4 border-t border-line-hairline">
              <p className="text-[10px] uppercase font-bold text-ink-muted mb-1">Summary</p>
              <p className="text-sm text-ink-primary">
                <strong>{origin?.name}</strong>
                {intermediates.length > 0 && (
                  <> · {intermediates.length} intermediate stop{intermediates.length > 1 ? 's' : ''} ·</>
                )}{' '}
                <strong>{destination?.name}</strong>
              </p>
              <p className="text-xs text-ink-secondary mt-1">
                ~{totalKm.toFixed(1)} km · ~{Math.floor(totalMin / 60)}h {totalMin % 60}m total travel time
              </p>
              {autoCalc && (
                <p className="text-[10px] text-ink-muted mt-1 italic">
                  ✦ Values auto-estimated from stand GPS coordinates. You can override any field manually.
                </p>
              )}
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={handleSubmit} loading={createRoute.isPending}>
              Save Route &amp; Finish
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


