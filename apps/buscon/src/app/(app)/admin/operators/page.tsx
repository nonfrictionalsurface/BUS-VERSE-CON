'use client';

import { useAdminOperators } from '@/features/admin-operators/hooks/useAdminOperators';
import { OperatorTable } from '@/features/admin-operators/components/OperatorTable';

export default function AdminOperatorsPage() {
  const { data, isLoading } = useAdminOperators();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold text-ink-bright tracking-tight">Operators</h1>
        <p className="text-sm text-ink-secondary mt-1">All approved, pending, and suspended operators on the platform.</p>
      </div>
      <OperatorTable data={data} isLoading={isLoading} />
    </div>
  );
}