import { ApprovalsTabs } from '@/features/approvals/components/ApprovalsTabs';

export default function ApprovalsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold text-ink-bright tracking-tight">Approvals</h1>
        <p className="text-sm text-ink-secondary mt-1">Review pending operator applications and bus registrations.</p>
      </div>
      <ApprovalsTabs />
    </div>
  );
}