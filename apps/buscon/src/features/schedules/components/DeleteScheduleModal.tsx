'use client';

import { X, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Schedule } from '../api';
import { formatIST } from '@/lib/utils/formatters';

interface Props {
  isOpen: boolean;
  schedule: Schedule | null;
  hasTrip: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
  isLoading: boolean;
}

export function DeleteScheduleModal({ isOpen, schedule, hasTrip, onClose, onConfirm, isLoading }: Props) {
  if (!isOpen || !schedule) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <div className="bg-surface-card w-full max-w-md rounded-xl shadow-modal border border-line-hairline overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-5 border-b border-line-hairline bg-danger-crimson/5">
          <div className="flex items-center gap-2 text-danger-crimson">
            <AlertCircle size={20} />
            <h2 className="text-lg font-bold">Delete Schedule</h2>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink-primary">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-ink-secondary">Are you sure you want to delete this schedule?</p>

          <div className="p-3 rounded-lg bg-surface-sunken border border-line-hairline text-xs space-y-1">
            <p className="text-ink-muted">Route:</p>
            <p className="font-medium text-ink-primary">
              {schedule.route?.originCity?.name} → {schedule.route?.destinationCity?.name}
            </p>
            <p className="text-ink-muted mt-2">Departure:</p>
            <p className="font-medium text-ink-primary">{formatIST(schedule.departureTime)}</p>
            <p className="text-ink-muted mt-2">Bus:</p>
            <p className="font-medium text-ink-primary font-mono">{schedule.bus?.registrationNumber}</p>
          </div>

          {hasTrip && (
            <div className="p-3 rounded-lg bg-amber-500/100/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-500">
              This schedule has an assigned trip. Deleting will also unassign the driver.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-line-hairline">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => onConfirm(schedule.id)} loading={isLoading}>
            <Trash2 size={14} className="mr-1.5" /> Delete Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
