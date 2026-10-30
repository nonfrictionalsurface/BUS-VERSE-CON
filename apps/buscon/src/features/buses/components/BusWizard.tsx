'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateBus, useUpdateLayout, useBuses } from '../hooks/useBuses';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { isApiError, getErrorMessage } from '@/lib/api/errors';
import { BusType, LayoutPayload } from '../api';
import { SeatLayoutStudio } from './SeatLayoutStudio';
import { Check, AlertCircle, Dices, RefreshCw } from 'lucide-react';
import { generateRegistrationNumber } from '@/lib/utils/random';

const BUS_TYPES: BusType[] = ['SEATER', 'AC_SEATER', 'SLEEPER', 'AC_SLEEPER', 'SEMI_SLEEPER'];

export function BusWizard() {
  const router = useRouter();
  const createMutation = useCreateBus();
  const layoutMutation = useUpdateLayout();
  const { data: existingBuses } = useBuses();

  const [step, setStep] = useState(1);
  const [error, setError] = useState<{ message: string; code?: string; details?: any } | null>(null);
  const [busId, setBusId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    registrationNumber: '',
    model: '',
    capacity: 40,
    busType: 'AC_SEATER' as BusType,
    amenities: 'WiFi, AC, Water',
  });

  const takenRegNumbers = (existingBuses || []).map((b) => b.registrationNumber);

  const showError = (err: unknown, fallback: string) => {
    if (isApiError(err)) {
      setError({
        message: getErrorMessage(err.code, err.message),
        code: err.code,
        details: (err as any).details,
      });
      console.error('[BusWizard Error]', err);
    } else {
      setError({ message: (err as Error)?.message || fallback });
      console.error('[BusWizard Unknown Error]', err);
    }
  };

  const generateUniqueReg = () => {
    const fresh = generateRegistrationNumber(takenRegNumbers);
    setFormData((f) => ({ ...f, registrationNumber: fresh }));
    setError(null);
  };

  const doCreate = async () => {
    const mockInsuranceRef = `r2://mock/insurance-${Date.now()}.pdf`;
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const mockExpiry = futureDate.toISOString().split('T')[0];

    const newBus = await createMutation.mutateAsync({
      ...formData,
      amenities: formData.amenities.split(',').map((s) => s.trim()).filter(Boolean),
      insuranceDocRef: mockInsuranceRef,
      insuranceExpiresAt: mockExpiry,
    });

    if (!newBus.id) throw new Error('Backend did not return a valid bus ID.');
    return newBus.id;
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const id = await doCreate();
      setBusId(id);
      setStep(2);
    } catch (err) {
      showError(err, 'Failed to create bus.');
    }
  };

  // When the backend rejects with BUS_REGISTRATION_EXISTS, offer one-click retry
  const retryWithNewNumber = async () => {
    setError(null);
    const fresh = generateRegistrationNumber(takenRegNumbers);
    setFormData((f) => ({ ...f, registrationNumber: fresh }));
    // Small delay so state updates, then retry
    setTimeout(async () => {
      try {
        const id = await createMutation.mutateAsync({
          ...formData,
          registrationNumber: fresh,
          amenities: formData.amenities.split(',').map((s) => s.trim()).filter(Boolean),
          insuranceDocRef: `r2://mock/insurance-${Date.now()}.pdf`,
          insuranceExpiresAt: (() => {
            const d = new Date();
            d.setFullYear(d.getFullYear() + 1);
            return d.toISOString().split('T')[0];
          })(),
        });
        if (!id.id) throw new Error('No bus ID returned.');
        setBusId(id.id);
        setStep(2);
      } catch (err) {
        showError(err, 'Retry failed.');
      }
    }, 50);
  };

  const handleSaveLayout = async (layout: LayoutPayload) => {
    if (!busId) {
      setError({ message: 'Bus ID missing. Please go back and recreate the bus.' });
      return;
    }
    setError(null);
    try {
      await layoutMutation.mutateAsync({ id: busId, data: layout });
      router.push('/operator/buses');
    } catch (err) {
      showError(err, 'Failed to save layout.');
    }
  };

  const isRegCollision = error?.code === 'BUS_REGISTRATION_EXISTS' || /registration.*exists/i.test(error?.message || '');

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 text-sm font-medium">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-brand-text' : 'text-ink-muted'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-brand text-white' : 'bg-surface-sunken'}`}>
            {step > 1 ? <Check size={14} /> : '1'}
          </div>
          Vehicle Details
        </div>
        <div className="h-px w-12 bg-line-hairline"></div>
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-brand-text' : 'text-ink-muted'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-brand text-white' : 'bg-surface-sunken'}`}>2</div>
          Seat Layout
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-lg bg-danger-crimson/10 border border-danger-crimson/30 text-danger-crimson">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <p className="font-semibold">{error.message}</p>
              {error.code && <p className="text-xs font-mono opacity-80">Code: {error.code}</p>}
              {error.details && (
                <pre className="text-xs font-mono bg-black/10 p-2 rounded overflow-auto mt-2">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              )}
              {isRegCollision && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={retryWithNewNumber}
                  loading={createMutation.isPending}
                  className="mt-3"
                >
                  <RefreshCw size={14} className="mr-1.5" />
                  Generate unique number &amp; retry
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-6 max-w-2xl animate-in fade-in slide-in-from-left-4">
          <Card className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  name="registrationNumber"
                  label="Registration Number"
                  placeholder="DL-1P-1234"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                  required
                  trailing={
                    <button
                      type="button"
                      onClick={generateUniqueReg}
                      className="p-1.5 rounded-md text-ink-muted hover:text-brand-text hover:bg-brand/10 transition-colors"
                      title="Generate unique registration number"
                    >
                      <Dices size={14} />
                    </button>
                  }
                />
                <p className="text-[10px] text-ink-muted mt-1 leading-tight">
                  Must be unique in your fleet. Click 🎲 to generate one.
                </p>
              </div>
              <Input
                name="model"
                label="Bus Model"
                placeholder="Volvo 9400 Multi-Axle"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-ink-secondary">Bus Type</label>
                <select
                  className="w-full h-10 px-3 rounded-lg border border-line-subtle bg-surface-card text-ink-primary focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-brand/20"
                  value={formData.busType}
                  onChange={(e) => setFormData({ ...formData, busType: e.target.value as BusType })}
                >
                  {BUS_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <Input
                name="capacity"
                label="Total Capacity"
                type="number"
                min={1}
                max={60}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                required
              />
            </div>

            <Input
              name="amenities"
              label="Amenities (comma separated)"
              placeholder="WiFi, AC, Charging, Blanket"
              value={formData.amenities}
              onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
            />
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Continue to Layout</Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-right-4">
          <SeatLayoutStudio
            capacity={formData.capacity}
            onSave={handleSaveLayout}
            onCancel={() => setStep(1)}
            isSaving={layoutMutation.isPending}
          />
        </div>
      )}
    </div>
  );
}