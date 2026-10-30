'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useDrivers } from '@/features/drivers/hooks/useDrivers';
import { DriverTable } from '@/features/drivers/components/DriverTable';
import { InviteDriverModal } from '@/features/drivers/components/InviteDriverModal';
import { Button } from '@/components/ui/Button';

export default function DriversPage() {
  const { data, isLoading } = useDrivers();
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink-bright tracking-tight">Drivers</h1>
          <p className="text-sm text-ink-secondary mt-1">Manage your fleet operators and track KYC verification.</p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)}>
          <Plus size={16} /> Invite Driver
        </Button>
      </div>

      <DriverTable data={data} isLoading={isLoading} />
      
      <InviteDriverModal 
        isOpen={isInviteOpen} 
        onClose={() => setIsInviteOpen(false)} 
      />
    </div>
  );
}