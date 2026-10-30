'use client';

import { RevenueDashboard } from '@/features/revenue/components/RevenueDashboard';

export default function RevenuePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold text-ink-bright tracking-tight">Revenue</h1>
        <p className="text-sm text-ink-secondary mt-1">Track your earnings, refunds, and net income.</p>
      </div>
      <RevenueDashboard />
    </div>
  );
}