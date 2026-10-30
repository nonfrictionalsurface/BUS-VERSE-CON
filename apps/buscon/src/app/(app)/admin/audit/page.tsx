import { AuditTable } from '@/features/audit/components/AuditTable';

export default function AuditPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold text-ink-bright tracking-tight">Audit Log</h1>
        <p className="text-sm text-ink-secondary mt-1">Immutable record of all critical platform actions.</p>
      </div>
      <AuditTable />
    </div>
  );
}