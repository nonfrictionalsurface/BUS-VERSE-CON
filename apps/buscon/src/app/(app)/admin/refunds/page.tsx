import { RefundTable } from '@/features/refunds/components/RefundTable';

export default function RefundsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold text-ink-bright tracking-tight">Refunds</h1>
        <p className="text-sm text-ink-secondary mt-1">Process cancellation refunds requested by passengers.</p>
      </div>
      <RefundTable />
    </div>
  );
}