'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useBuses } from '@/features/buses/hooks/useBuses';
import { BusTable } from '@/features/buses/components/BusTable';
import { Button } from '@/components/ui/Button';

export default function BusesPage() {
  const { data, isLoading } = useBuses();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink-bright tracking-tight">Fleet</h1>
          <p className="text-sm text-ink-secondary mt-1">Manage your buses and seat layouts.</p>
        </div>
        <Link href="/operator/buses/new">
          <Button>
            <Plus size={16} /> Add Bus
          </Button>
        </Link>
      </div>

      <BusTable data={data} isLoading={isLoading} />
    </div>
  );
}