'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  isLoading: boolean;
}

export function RejectModal({ isOpen, onClose, onConfirm, title, isLoading }: Props) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <div className="bg-surface-card w-full max-w-md rounded-xl shadow-modal border border-line-hairline overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-5 border-b border-line-hairline bg-danger-crimson/5">
          <div className="flex items-center gap-2 text-danger-crimson">
            <AlertTriangle size={20} />
            <h2 className="text-lg font-bold">{title}</h2>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink-primary">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <p className="text-sm text-ink-secondary">
            Please provide a reason for rejection. This will be sent via email to the operator.
          </p>
          <Input
            label="Rejection Reason (min 10 chars)"
            placeholder="e.g. Invalid GSTIN document, not matching PAN..."
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
              Confirm Rejection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}