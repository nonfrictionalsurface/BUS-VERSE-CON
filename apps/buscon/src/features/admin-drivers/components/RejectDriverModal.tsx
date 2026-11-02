'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  driverName: string;
  isLoading: boolean;
}

export function RejectDriverModal({ isOpen, onClose, onConfirm, driverName, isLoading }: Props) {
  const [reason, setReason] = useState('');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <div className="bg-surface-card w-full max-w-md rounded-xl shadow-modal border border-line-hairline overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-5 border-b border-line-hairline bg-danger-crimson/5">
          <div className="flex items-center gap-2 text-danger-crimson">
            <AlertTriangle size={20} />
            <h2 className="text-lg font-bold">Reject Driver KYC</h2>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink-primary"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-ink-secondary">
            Rejecting <strong className="text-ink-bright">{driverName}</strong> will mark their KYC as <code className="bg-surface-sunken px-1 rounded text-xs">KYC_FAILED</code>. They will not be assignable to trips until re-verified.
          </p>
          <Input
            label="Rejection Reason (min 10 chars)"
            placeholder="e.g. License number does not match RTO records"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="button" variant="danger" onClick={() => onConfirm(reason)} disabled={reason.length < 10} loading={isLoading}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}