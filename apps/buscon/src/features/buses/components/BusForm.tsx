'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateBus } from '../hooks/useBuses';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { isApiError, getErrorMessage } from '@/lib/api/errors';
import { BusType } from '../api';

const BUS_TYPES: BusType[] = ['SEATER', 'AC_SEATER', 'SLEEPER', 'AC_SLEEPER', 'SEMI_SLEEPER'];

export function BusForm() {
  const router = useRouter();
  const mutation = useCreateBus();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    registrationNumber: '',
    model: '',
    capacity: 40,
    busType: 'AC_SEATER' as BusType,
    amenities: 'WiFi, AC, Water',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await mutation.mutateAsync({
        ...formData,
        amenities: formData.amenities.split(',').map((s) => s.trim()).filter(Boolean),
      });
      router.push('/operator/buses');
    } catch (err) {
      setError(isApiError(err) ? getErrorMessage(err.code, err.message) : 'Failed to create bus.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div role="alert" className="p-4 rounded-lg bg-danger-crimson/10 text-danger-crimson text-sm font-medium border border-danger-crimson/20">
          {error}
        </div>
      )}

      <Card className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Registration Number (RTO format)"
            placeholder="DL-1P-1234"
            value={formData.registrationNumber}
            onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
            required
          />
          <Input
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
              className="w-full h-10 px-3 rounded-lg border border-line-subtle bg-surface-card text-ink-primary focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-brand-subtle"
              value={formData.busType}
              onChange={(e) => setFormData({ ...formData, busType: e.target.value as BusType })}
            >
              {BUS_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <Input
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
          label="Amenities (comma separated)"
          placeholder="WiFi, AC, Charging, Blanket"
          value={formData.amenities}
          onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
        />
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" loading={mutation.isPending}>Save & Continue to Layout</Button>
      </div>
    </form>
  );
}