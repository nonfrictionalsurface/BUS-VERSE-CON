'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  operatorName: string;
  isLoading: boolean;
}

export function SuspendModal({ isOpen, onClose, onConfirm, operatorName, isLoading }: Props) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <div className="bg-surface-card w-full max-w-md rounded-xl shadow-modal border border-line-hairline overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-5 border-b border-line-hairline bg-danger-crimson/5">
          <div className="flex items-center gap-2 text-danger-crimson">
            <ShieldAlert size={20} />
            <h2 className="text-lg font-bold">Suspend Operator</h2>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink-primary">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="p-3 rounded-lg bg-danger-crimson/10 text-danger-crimson text-xs">
            <p className="font-semibold mb-1">Suspending {operatorName} will:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Revoke all active sessions immediately</li>
              <li>Hide their buses from BusVerse search</li>
              <li>Block new bookings</li>
              <li>Existing bookings will be honored</li>
            </ul>
          </div>
          <Input
            label="Suspension Reason (min 10 chars)"
            placeholder="e.g. Repeated policy violations, KYC fraud suspicion..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button 
              type="button" 
              variant="danger" 
              onClick={() => onConfirm(reason)}
              disabled={reason.length < 10}
              loading={isLoading}
            >
              Confirm Suspension
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}