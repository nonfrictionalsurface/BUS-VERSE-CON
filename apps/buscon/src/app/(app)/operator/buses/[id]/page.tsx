'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBus, useBusLayout, useUpdateLayout } from '@/features/buses/hooks/useBuses';
import { SeatLayoutStudio } from '@/features/buses/components/SeatLayoutStudio';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Bus as BusIcon, LayoutGrid, AlertCircle } from 'lucide-react';
import { isApiError } from '@/lib/api/errors';
import { TransitLoader } from '@/lib/brand';

export default function BusDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: bus, isLoading: loadingBus, error: busError } = useBus(id);
  const { data: initialLayout, isLoading: loadingLayout } = useBusLayout(id);
  const updateMutation = useUpdateLayout();

  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loadingBus || loadingLayout) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <TransitLoader size="md" caption="LOADING BUS DETAILS" />
      </div>
    );
  }

  if (busError || !bus) {
    return (
      <div className="space-y-6">
        <Link href="/operator/buses" className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-text transition-colors">
          <ArrowLeft size={16} /> Back to Fleet
        </Link>
        <div className="p-4 rounded-lg bg-danger-crimson/10 border border-danger-crimson/30 text-danger-crimson flex items-center gap-2">
          <AlertCircle size={20} />
          Failed to load bus details. {isApiError(busError) ? busError.message : ''}
        </div>
      </div>
    );
  }

  const handleSaveLayout = async (payload: any) => {
    setError(null);
    try {
      await updateMutation.mutateAsync({ id, data: payload });
      setIsEditingLayout(false);
    } catch (err) {
      if (isApiError(err)) setError(`Failed to save: ${err.message}`);
      else setError('Failed to save layout.');
    }
  };

  if (isEditingLayout) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div>
          <h1 className="text-2xl font-bold text-ink-bright">Edit Seat Layout</h1>
          <p className="text-sm text-ink-secondary">{bus.registrationNumber} · {bus.model}</p>
        </div>
        {error && (
          <div className="p-4 rounded-lg bg-danger-crimson/10 text-danger-crimson text-sm font-medium border border-danger-crimson/20">
            {error}
          </div>
        )}
        <SeatLayoutStudio
          capacity={bus.capacity}
          initialLayout={initialLayout || undefined}
          onSave={handleSaveLayout}
          onCancel={() => setIsEditingLayout(false)}
          isSaving={updateMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <Link href="/operator/buses" className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-text mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Fleet
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ink-bright tracking-tight flex items-center gap-3">
              <BusIcon className="text-brand-text" size={32} />
              {bus.registrationNumber}
            </h1>
            <p className="text-sm text-ink-secondary mt-1">{bus.model} · {bus.busType.replace('_', ' ')}</p>
          </div>
          <Badge tone={bus.approvalStatus === 'APPROVED' ? 'emerald' : 'amber'}>
            {bus.approvalStatus}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-ink-bright mb-4">Bus Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-ink-secondary font-medium mb-1">Registration</p>
                <p className="font-mono font-bold text-ink-bright">{bus.registrationNumber}</p>
              </div>
              <div>
                <p className="text-ink-secondary font-medium mb-1">Model</p>
                <p className="text-ink-primary">{bus.model}</p>
              </div>
              <div>
                <p className="text-ink-secondary font-medium mb-1">Capacity</p>
                <p className="text-ink-primary">{bus.capacity} seats</p>
              </div>
              <div>
                <p className="text-ink-secondary font-medium mb-1">Type</p>
                <p className="text-ink-primary">{bus.busType.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-line-hairline">
            <h2 className="text-sm font-bold text-ink-bright mb-3">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {bus.amenities.length > 0 ? bus.amenities.map((a, i) => (
                <span key={i} className="px-2.5 py-1 bg-surface-sunken border border-line-hairline rounded-md text-xs font-medium text-ink-secondary">{a}</span>
              )) : (
                <span className="text-sm text-ink-muted">No amenities listed.</span>
              )}
            </div>
          </div>
        </Card>

        <Card className="bg-surface-sunken border-dashed flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4 text-brand-text">
            <LayoutGrid size={32} />
          </div>
          <h3 className="text-lg font-bold text-ink-bright mb-1">Seat Layout</h3>
          <p className="text-sm text-ink-secondary mb-6">
            {initialLayout
              ? `Configured (${initialLayout.rowsCount} rows × ${initialLayout.columnsCount} cols)`
              : 'No layout configured yet.'}
          </p>
          <Button onClick={() => setIsEditingLayout(true)} className="w-full">
            {initialLayout ? 'Edit Layout' : 'Create Layout'}
          </Button>
        </Card>
      </div>
    </div>
  );
}