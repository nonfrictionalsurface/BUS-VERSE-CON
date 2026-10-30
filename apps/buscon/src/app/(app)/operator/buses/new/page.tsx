'use client';

import { BusWizard } from '@/features/buses/components/BusWizard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewBusPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link href="/operator/buses" className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-text mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Fleet
        </Link>
        <h1 className="text-3xl font-bold text-ink-bright tracking-tight">Register New Bus</h1>
        <p className="text-sm text-ink-secondary mt-1">Enter the vehicle details and build the seat layout.</p>
      </div>
      <BusWizard />
    </div>
  );
}