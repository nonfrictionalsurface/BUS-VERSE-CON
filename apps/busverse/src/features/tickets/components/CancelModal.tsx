'use client';

import React, { useState } from 'react';
import { RefundPreviewData } from '../types';
import { executeCancelBooking } from '../api/tickets.api';
import { formatINR } from '@/lib/utils/formatters';
import { AlertCircle, AlertTriangle, Loader2, X, CheckCircle2 } from 'lucide-react';

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  preview: RefundPreviewData | null;
  onCancelled: () => void;
}

const REFUND_TIER_EXPLANATIONS: Record<string, string> = {
  TIER_FULL: 'Full 100% refund (cancelled more than 24h prior to departure or operator action).',
  TIER_75: '75% refund tier (cancelled between 12h and 24h prior to departure).',
  TIER_50: '50% refund tier (cancelled between 2h and 12h prior to departure).',
  TIER_ZERO: 'Zero refund (cancelled within 2 hours of departure window).',
  TIER_NOT_ELIGIBLE: 'Booking is not eligible for cancellation refund.',
};

export function CancelModal({
  isOpen,
  onClose,
  bookingId,
  preview,
  onCancelled,
}: CancelModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmCancel = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await executeCancelBooking(bookingId);
      onCancelled();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Cancellation could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-md">
      <div className="w-full max-w-md p-6 rounded-3xl bg-surface-card border border-border-strong shadow-modal relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full text-ink-muted hover:text-ink-primary hover:bg-surface-hover"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-danger-subtle text-danger-crimson flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink-bright">Cancel Reservation?</h2>
            <p className="text-xs text-ink-secondary">Refund calculation per official transit rules</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-danger-subtle text-danger-crimson text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {preview && (
          <div className="p-4 rounded-2xl bg-canvas-subtle border border-border-subtle space-y-3 mb-6">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-secondary">Refund Tier:</span>
              <span className="font-mono font-bold text-ink-bright px-2 py-0.5 rounded bg-surface-card border border-border-subtle">
                {preview.tier}
              </span>
            </div>

            <p className="text-[11px] text-ink-muted leading-relaxed">
              {REFUND_TIER_EXPLANATIONS[preview.tier] || 'Standard policy applies.'}
            </p>

            <div className="pt-2 border-t border-border-hairline flex items-center justify-between">
              <span className="text-xs font-bold text-ink-bright">Refundable Amount:</span>
              <span className="text-lg font-extrabold text-signal-emerald">
                {formatINR(preview.amountPaise)}
              </span>
            </div>

            {preview.cancellationFeePaise > 0 && (
              <div className="flex items-center justify-between text-[11px] text-ink-muted">
                <span>Cancellation Fee:</span>
                <span>{formatINR(preview.cancellationFeePaise)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 py-2.5 text-xs font-bold rounded-xl border border-border-strong text-ink-secondary hover:bg-surface-hover transition-colors"
          >
            Keep Reservation
          </button>

          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={submitting}
            className="w-1/2 py-2.5 text-xs font-bold rounded-xl bg-danger-crimson text-white hover:opacity-90 shadow-glow disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>Confirm Cancel</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}