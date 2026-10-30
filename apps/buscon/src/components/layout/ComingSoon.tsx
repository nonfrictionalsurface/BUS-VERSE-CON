'use client';

import { Hammer } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-brand-subtle rounded-xl text-brand-text">
          <Hammer size={24} />
        </div>
        <h1 className="text-3xl font-bold text-ink-bright">{title}</h1>
      </div>
      
      <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 bg-surface-sunken/50">
        <div className="w-16 h-16 bg-surface-card rounded-full flex items-center justify-center mb-4 shadow-sm border border-line-hairline">
          <Hammer size={28} className="text-ink-muted" />
        </div>
        <h2 className="text-xl font-semibold text-ink-bright mb-2">Under Construction</h2>
        <p className="text-sm text-ink-secondary max-w-md mb-6">
          The {title} module is currently being built. It will arrive in the next milestone update.
        </p>
        <Link href="/dashboard">
          <Button variant="primary">Return to Dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}