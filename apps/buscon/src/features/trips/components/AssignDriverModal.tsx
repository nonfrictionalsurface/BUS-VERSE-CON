'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useDrivers } from '@/features/drivers/hooks/useDrivers';
import { useAssignDriver, useReassignDriver } from '../hooks/useTrips';
import { isApiError } from '@/lib/api/errors';
import { Schedule } from '@/features/schedules/api';
import { Trip } from '../api';

interface Props {
  isOpen: boolean;
  schedule: Schedule | null;
  currentTrip: Trip | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignDriverModal({ isOpen, schedule, currentTrip, onClose, onSuccess }: Props) {
  const { data: drivers, isLoading: loadingDrivers } = useDrivers();
  const assignMutation = useAssignDriver();
  const reassignMutation = useReassignDriver();
  const [selectedDriverId, setSelectedDriverId] = useState<string>(currentTrip?.driverId || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedDriverId(currentTrip?.driverId || '');
      setError(null);
    }
  }, [isOpen, currentTrip?.driverId]);

  if (!isOpen || !schedule) return null;

  const availableDrivers = (drivers || []).filter(
    (d) => d.kycStatus === 'VERIFIED' || d.kycStatus === 'ACTIVE'
  );

  const isReassign = !!currentTrip;
  const isPending = assignMutation.isPending || reassignMutation.isPending;

  const handleAssign = async () => {
    if (!selectedDriverId) {
      setError('Select a driver first');
      return;
    }
    setError(null);
    try {
      if (isReassign && currentTrip) {
        await reassignMutation.mutateAsync({
          existingTripId: currentTrip.tripId,
          input: { scheduleId: schedule.id, driverId: selectedDriverId },
        });
      } else {
        await assignMutation.mutateAsync({
          scheduleId: schedule.id,
          driverId: selectedDriverId,
        });
      }
      onSuccess();
    } catch (err) {
      if (isApiError(err)) {
        setError(`(${err.code}) ${err.message}`);
      } else {
        setError('Failed to assign driver');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <div className="bg-surface-card w-full max-w-lg rounded-xl shadow-modal border border-line-hairline overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-5 border-b border-line-hairline">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand/10 text-brand-text">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink-bright">
                {isReassign ? 'Reassign Driver' : 'Assign Driver'}
              </h2>
              <p className="text-xs text-ink-secondary">
                {schedule.route?.originCity?.name} → {schedule.route?.destinationCity?.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-hover">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {currentTrip && (
            <div className="p-3 rounded-lg bg-surface-sunken border border-line-hairline text-xs">
              <p className="text-ink-muted">Currently assigned:</p>
              <p className="font-medium text-ink-primary mt-1">
                {currentTrip.driverName} · {currentTrip.driverPhone}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-2">
              Select a driver {loadingDrivers && '(loading...)'}
            </label>

            {!loadingDrivers && availableDrivers.length === 0 && (
              <Card className="bg-amber-500/10 border-amber-500/30 p-4">
                <div className="flex items-start gap-2 text-amber-700 dark:text-amber-500 text-xs">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>No verified drivers yet. Invite and verify a driver from the Drivers page first.</span>
                </div>
              </Card>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableDrivers.map((driver) => {
                const isSelected = selectedDriverId === driver.id;
                return (
                  <button
                    key={driver.id}
                    type="button"
                    onClick={() => setSelectedDriverId(driver.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-brand bg-brand/5 shadow-sm'
                        : 'border-line-hairline hover:border-ink-muted hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-ink-bright">{driver.name}</p>
                        <p className="text-xs text-ink-secondary mt-0.5">{driver.phone}</p>
                        <p className="text-[10px] text-ink-muted mt-0.5 font-mono">License: {driver.licenseNumber}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={driver.onDuty ? 'amber' : 'emerald'}>
                          {driver.onDuty ? 'On Trip' : 'Available'}
                        </Badge>
                        {isSelected && <CheckCircle2 size={18} className="text-brand-text" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-danger-crimson/10 text-danger-crimson text-sm border border-danger-crimson/20 font-mono text-xs break-words">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-line-hairline bg-surface-sunken">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleAssign}
            loading={isPending}
            disabled={!selectedDriverId || availableDrivers.length === 0}
          >
            {isReassign ? 'Reassign' : 'Assign'} Driver
          </Button>
        </div>
      </div>
    </div>
  );
}