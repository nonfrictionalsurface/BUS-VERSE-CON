'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateRoute, useStands } from '../hooks/useRoutes';
import { City } from '../api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CityAutocomplete } from './CityAutocomplete';
import { isApiError, getErrorMessage } from '@/lib/api/errors';
import { ArrowRight, Plus, Trash2, Check, AlertCircle, MapPin } from 'lucide-react';

interface ErrState {
  message: string;
  code?: string;
  details?: any;
}

interface Stop {
  standId: string;
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
  const [stops, setStops] = useState<Stop[]>([]);

  const showError = (err: unknown, fallback: string, debugPayload?: any) => {
    if (debugPayload) console.error('[RouteWizard] Payload:', JSON.stringify(debugPayload, null, 2));
    if (isApiError(err)) {
      setError({ message: getErrorMessage(err.code, err.message), code: err.code, details: (err as any).details });
      console.error('[RouteWizard Error]', err, (err as any).details);
    } else {
      setError({ message: (err as Error)?.message || fallback });
      console.error('[RouteWizard Unknown Error]', err);
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

  const handleAddStop = () => setStops([...stops, { standId: '' }]);
  const updateStop = (i: number, standId: string) => {
    const next = [...stops];
    next[i].standId = standId;
    setStops(next);
  };
  const removeStop = (i: number) => setStops(stops.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setError(null);

    if (!origin || !destination) {
      setError({ message: 'Please select origin and destination cities.' });
      setStep(1);
      return;
    }
    if (!originStandId) {
      setError({ message: 'Select the origin boarding stand.' });
      return;
    }
    if (!destStandId) {
      setError({ message: 'Select the destination drop-off stand.' });
      return;
    }
    if (stops.some((s) => !s.standId)) {
      setError({ message: 'Select a stand for every intermediate stop, or remove empty rows.' });
      return;
    }

    // All stands now use distance=0, duration=0 (schema accepts this)
    const stands = [
      {
        standId: originStandId,
        sequence: 1,
        distanceFromPrevKm: 0,
        durationFromPrevMin: 0,
      },
      ...stops.map((s, i) => ({
        standId: s.standId,
        sequence: i + 2,
        distanceFromPrevKm: 0,
        durationFromPrevMin: 0,
      })),
      {
        standId: destStandId,
        sequence: stops.length + 2,
        distanceFromPrevKm: 0,
        durationFromPrevMin: 0,
      },
    ];

    const payload = {
      originCityId: origin.id,
      destinationCityId: destination.id,
      stands,
    };

    try {
      await createRoute.mutateAsync(payload);
      router.push('/operator/routes');
    } catch (err) {
      showError(err, 'Failed to create route.', payload);
    }
  };

  const totalStopsCount = 2 + stops.length;

  return (
    <div className="space-y-8 max-w-3xl">
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
          Stops
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
              Continue to Stops <ArrowRight size={16} />
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <Card className="space-y-6">
            {/* Origin stand */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted border-b border-line-hairline pb-2 mb-3 flex items-center gap-2">
                <MapPin size={14} /> Boarding Point · {origin?.name}
              </h3>
              <select
                className="w-full h-10 px-3 rounded-lg border border-line-subtle bg-surface-card text-ink-primary text-sm"
                value={originStandId}
                onChange={(e) => setOriginStandId(e.target.value)}
                disabled={loadingOriginStands}
              >
                <option value="">{loadingOriginStands ? 'Loading…' : 'Select origin boarding stand…'}</option>
                {(originStands || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Intermediate stops */}
            <div>
              <div className="flex items-center justify-between border-b border-line-hairline pb-2 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Intermediate Stops (optional)</h3>
                <Button type="button" variant="ghost" size="sm" onClick={handleAddStop} className="text-xs">
                  <Plus size={12} className="mr-1" /> Add Stop
                </Button>
              </div>

              {stops.length === 0 ? (
                <p className="text-xs text-ink-muted italic py-2">
                  No intermediate stops — direct from {origin?.name} to {destination?.name}.
                </p>
              ) : (
                <div className="space-y-2">
                  {stops.map((stop, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-surface-sunken rounded-lg border border-line-hairline">
                      <div className="w-6 h-6 rounded-full bg-surface-card text-ink-secondary flex items-center justify-center text-xs font-bold shrink-0 border border-line-hairline">
                        {i + 2}
                      </div>
                      <select
                        className="flex-1 h-9 text-sm rounded border border-line-subtle bg-surface-card px-2"
                        value={stop.standId}
                        onChange={(e) => updateStop(i, e.target.value)}
                      >
                        <option value="">Select a stand…</option>
                        {[...(originStands || []), ...(destStands || [])].map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeStop(i)} className="text-danger-crimson hover:bg-danger-crimson/10 shrink-0">
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
                <MapPin size={14} /> Drop-off Point · {destination?.name}
              </h3>
              <select
                className="w-full h-10 px-3 rounded-lg border border-line-subtle bg-surface-card text-ink-primary text-sm"
                value={destStandId}
                onChange={(e) => setDestStandId(e.target.value)}
                disabled={loadingDestStands}
              >
                <option value="">{loadingDestStands ? 'Loading…' : 'Select drop-off stand…'}</option>
                {(destStands || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Summary */}
            <div className="pt-4 border-t border-line-hairline">
              <p className="text-xs text-ink-secondary">
                <strong className="text-ink-primary">{origin?.name}</strong>
                {stops.length > 0 && <span> → {stops.length} stop{stops.length > 1 ? 's' : ''} → </span>}
                {stops.length === 0 && <span> → </span>}
                <strong className="text-ink-primary">{destination?.name}</strong>
              </p>
              <p className="text-[11px] text-ink-muted mt-1">
                {totalStopsCount} boarding points · distances can be edited later
              </p>
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