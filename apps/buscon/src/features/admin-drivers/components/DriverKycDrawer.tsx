'use client';

import { useState } from 'react';
import {
  X, User, Phone, CreditCard, Clock, ShieldAlert, CheckCircle2,
  Building2, FileText, Info,
} from 'lucide-react';
import { AdminDriver } from '../api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatIST } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';

interface Props {
  driver: AdminDriver | null;
  onClose: () => void;
  onApprove: (id: string) => Promise<void> | void;
  onReject: (id: string) => void;
  isApproving?: boolean;
}

function FieldRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-sunken border border-line-hairline">
      <div className="p-2 rounded-md bg-surface-card text-ink-muted shrink-0">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{label}</p>
        <p className="text-sm font-mono font-medium text-ink-bright break-all mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function DriverKycDrawer({ driver, onClose, onApprove, onReject, isApproving }: Props) {
  if (!driver) return null;

  const needsReview =
    driver.kycStatus === 'INVITED' ||
    driver.kycStatus === 'SIGNED_UP' ||
    driver.kycStatus === 'KYC_PENDING';

  const checklist = [
    { label: 'Driver license format valid', ok: /^[A-Z0-9-]{8,25}$/.test(driver.licenseNumber) },
    { label: 'Phone has country code (+91)', ok: driver.phone.startsWith('+91') && driver.phone.length >= 12 },
    { label: 'Invited by verified operator', ok: !!driver.operatorName || true },
    { label: 'KYC documents uploaded', ok: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 animate-in fade-in" onClick={onClose} />
      <aside className="w-full max-w-xl bg-canvas-subtle border-l border-line-hairline flex flex-col shadow-modal animate-in slide-in-from-right duration-300">
        <header className="h-16 px-6 flex items-center justify-between border-b border-line-hairline shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand-text">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink-bright leading-tight">Driver KYC Review</h2>
              <p className="text-xs text-ink-secondary">Verify identity before approval</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-hover transition-colors">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge tone={needsReview ? 'amber' : driver.kycStatus === 'VERIFIED' || driver.kycStatus === 'ACTIVE' ? 'emerald' : 'red'}>
              {driver.kycStatus}
            </Badge>
            <span className="text-xs text-ink-muted flex items-center gap-1">
              <Clock size={12} /> Invited {formatIST(driver.createdAt)}
            </span>
          </div>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-2">
              <User size={14} /> Driver
            </h3>
            <div className="p-4 rounded-xl bg-surface-card border border-line-hairline">
              <p className="text-xl font-bold text-ink-bright">{driver.name}</p>
              <p className="text-xs text-ink-muted mt-1 font-mono">Driver ID: {driver.id}</p>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-2">
              <CreditCard size={14} /> Identity
            </h3>
            <FieldRow icon={Phone} label="Phone" value={driver.phone} />
            <FieldRow icon={CreditCard} label="Driving License" value={driver.licenseNumber} />
          </section>

          {driver.operatorName && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-2">
                <Building2 size={14} /> Operator
              </h3>
              <FieldRow icon={Building2} label="Fleet" value={driver.operatorName} />
            </section>
          )}

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-2">
              <FileText size={14} /> KYC Documents
            </h3>
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-500">
              <div className="flex items-start gap-2">
                <Info size={16} className="shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold">No documents uploaded</p>
                  <p className="mt-1 text-amber-600/80">
                    Document upload requires the Operator App (Phase 2). The driver will
                    upload their license, government ID, and photo once the mobile app ships.
                  </p>
                  <p className="mt-2 text-amber-600/80">
                    For this review, verify the license number and name against the operator's records.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-2">
              <ShieldAlert size={14} /> Pre-Approval Checklist
            </h3>
            <ul className="space-y-2 text-sm">
              {checklist.map((item, i) => (
                <li key={i} className={cn('flex items-start gap-2', item.ok ? 'text-ink-secondary' : 'text-amber-600')}>
                  {item.ok ? (
                    <CheckCircle2 size={16} className="text-brand-text shrink-0 mt-0.5" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">!</span>
                  )}
                  {item.label}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {needsReview && (
          <footer className="p-4 border-t border-line-hairline flex items-center gap-3 shrink-0 bg-canvas-subtle">
            <Button variant="secondary" className="flex-1 text-danger-crimson hover:bg-danger-crimson/10" onClick={() => onReject(driver.id)}>
              <X size={16} className="mr-1.5" /> Reject
            </Button>
            <Button className="flex-1" onClick={() => onApprove(driver.id)} loading={isApproving}>
              <CheckCircle2 size={16} className="mr-1.5" /> Approve KYC
            </Button>
          </footer>
        )}
      </aside>
    </div>
  );
}