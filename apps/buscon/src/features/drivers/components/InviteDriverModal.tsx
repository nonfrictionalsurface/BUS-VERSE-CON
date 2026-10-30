'use client';

import { useState } from 'react';
import { useInviteDriver } from '../hooks/useDrivers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { isApiError, getErrorMessage } from '@/lib/api/errors';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteDriverModal({ isOpen, onClose }: Props) {
  const mutation = useInviteDriver();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '+91', licenseNumber: '' });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await mutation.mutateAsync(formData);
      setFormData({ name: '', phone: '+91', licenseNumber: '' }); // Reset
      onClose();
    } catch (err) {
      setError(isApiError(err) ? getErrorMessage(err.code, err.message) : 'Failed to invite driver.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <div className="bg-surface-card w-full max-w-md rounded-xl shadow-modal border border-line-hairline overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-5 border-b border-line-hairline">
          <h2 className="text-lg font-bold text-ink-bright">Invite Driver</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink-primary">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-danger-crimson/10 text-danger-crimson text-sm font-medium border border-danger-crimson/20">
              {error}
            </div>
          )}
          
          <Input
            label="Full Name"
            placeholder="Rajesh Kumar"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Phone Number (E.164)"
            placeholder="+919876543210"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          <Input
            label="Driving License Number"
            placeholder="DL-0420110000123"
            value={formData.licenseNumber}
            onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
            required
          />

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>Send Invite</Button>
          </div>
        </form>
      </div>
    </div>
  );
}