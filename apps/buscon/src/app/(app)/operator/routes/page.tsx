'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useRoutes } from '@/features/routes/hooks/useRoutes';
import { RouteTable } from '@/features/routes/components/RouteTable';
import { Button } from '@/components/ui/Button';

export default function RoutesPage() {
  const { data, isLoading } = useRoutes();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink-bright tracking-tight">Routes</h1>
          <p className="text-sm text-ink-secondary mt-1">Manage transit corridors and boarding points.</p>
        </div>
        <Link href="/operator/routes/new">
          <Button>
            <Plus size={16} /> Add Route
          </Button>
        </Link>
      </div>

      <RouteTable data={data} isLoading={isLoading} />
    </div>
  );
}