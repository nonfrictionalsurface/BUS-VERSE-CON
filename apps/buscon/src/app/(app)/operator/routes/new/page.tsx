'use client';

import { RouteWizard } from '@/features/routes/components/RouteWizard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewRoutePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link href="/operator/routes" className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-text mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Routes
        </Link>
        <h1 className="text-3xl font-bold text-ink-bright tracking-tight">Create Route</h1>
        <p className="text-sm text-ink-secondary mt-1">Define the cities and the specific boarding stands along the way.</p>
      </div>
      <RouteWizard />
    </div>
  );
}