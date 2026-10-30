'use client';

import { useState } from 'react';
import {
  X, Building2, Hash, CreditCard, Mail, Phone, Clock, ShieldAlert,
  CheckCircle2, Wallet, FileText, Copy, Check
} from 'lucide-react';
import { PendingOperator } from '../api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatIST } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';

interface Props {
  operator: PendingOperator | null;
  onClose: () => void;
  onApprove: (id: string) => Promise<void> | void;
  onReject: (id: string) => void;
  isApproving?: boolean;
}

function FieldRow({
  icon: Icon,
  label,
  value,
  copyable,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-surface-sunken border border-line-hairline">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="p-2 rounded-md bg-surface-card text-ink-muted shrink-0">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{label}</p>
          <p className="text-sm font-mono font-medium text-ink-bright break-all mt-0.5">{value}</p>
        </div>
      </div>
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded-md text-ink-muted hover:text-brand-text hover:bg-brand/10 transition-colors shrink-0"
          title="Copy to clipboard"
        >
          {copied ? <Check size={14} className="text-brand-text" /> : <Copy size={14} />}
        </button>
      )}
    </div>
  );
}

export function OperatorApplicationDrawer({ operator, onClose, onApprove, onReject, isApproving }: Props) {
  if (!operator) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50 animate-in fade-in" onClick={onClose} />

      {/* Drawer */}
      <aside className="w-full max-w-xl bg-canvas-subtle border-l border-line-hairline flex flex-col shadow-modal animate-in slide-in-from-right duration-300">
        {/* Header */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-line-hairline shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink-bright leading-tight">Operator Application</h2>
              <p className="text-xs text-ink-secondary">Review before approving or rejecting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-hover transition-colors"
          >
            <X size={20} />
          </button>
        </header>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status chip */}
          <div className="flex items-center gap-3">
            <Badge tone="amber">PENDING REVIEW</Badge>
            <span className="text-xs text-ink-muted flex items-center gap-1">
              <Clock size={12} /> Submitted {formatIST(operator.createdAt)}
            </span>
          </div>

          {/* Company card */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-2">
              <Building2 size={14} /> Company
            </h3>
            <div className="p-4 rounded-xl bg-surface-card border border-line-hairline">
              <p className="text-xl font-bold text-ink-bright">{operator.companyName}</p>
              <p className="text-xs text-ink-muted mt-1 font-mono">Operator ID: {operator.id}</p>
            </div>
          </section>

          {/* Tax identifiers */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-2">
              <Hash size={14} /> Tax Identifiers
            </h3>
            <FieldRow icon={Hash} label="GSTIN" value={operator.gstin} copyable />
            <FieldRow
              icon={CreditCard}
              label="PAN"
              value={operator.pan || '—'}
              copyable={!!operator.pan}
            />
          </section>

          {/* Contact */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-2">
              <Mail size={14} /> Contact
            </h3>
            <FieldRow icon={Mail} label="Email" value={operator.email} copyable />
            <FieldRow icon={Phone} label="Phone" value={operator.phone} copyable />
          </section>

          {/* Payout */}
          {operator.bankAccountRef && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-2">
                <Wallet size={14} /> Payout Account
              </h3>
              <FieldRow icon={Wallet} label="Bank Account Reference" value={operator.bankAccountRef} copyable />
            </section>
          )}

          {/* Verification checklist */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-2">
              <ShieldAlert size={14} /> Pre-Approval Checklist
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'GSTIN format valid (15 chars, matches regex)', ok: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(operator.gstin) },
                { label: 'PAN format valid (10 chars, matches regex)', ok: operator.pan ? /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(operator.pan) : false },
                { label: 'Email present', ok: !!operator.email },
                { label: 'Phone has country code', ok: !!operator.phone && operator.phone.length >= 12 },
              ].map((item, i) => (
                <li key={i} className={cn('flex items-start gap-2', item.ok ? 'text-ink-secondary' : 'text-danger-crimson')}>
                  {item.ok ? (
                    <CheckCircle2 size={16} className="text-brand-text shrink-0 mt-0.5" />
                  ) : (
                    <AlertIcon />
                  )}
                  {item.label}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Footer actions */}
        <footer className="p-4 border-t border-line-hairline flex items-center gap-3 shrink-0 bg-canvas-subtle">
          <Button
            variant="secondary"
            className="flex-1 text-danger-crimson hover:bg-danger-crimson/10"
            onClick={() => onReject(operator.id)}
          >
            <X size={16} className="mr-1.5" /> Reject
          </Button>
          <Button
            className="flex-1 bg-brand hover:bg-brand-hover"
            onClick={() => onApprove(operator.id)}
            loading={isApproving}
          >
            <CheckCircle2 size={16} className="mr-1.5" /> Approve
          </Button>
        </footer>
      </aside>
    </div>
  );
}

function AlertIcon() {
  return (
    <span className="w-4 h-4 rounded-full bg-danger-crimson/10 text-danger-crimson flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
      !
    </span>
  );
}