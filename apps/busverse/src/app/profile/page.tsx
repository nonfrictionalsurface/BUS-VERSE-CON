'use client';

import React, { useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { User, Shield, Check } from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/passenger/me', { name, email });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />

      <main className="mx-auto max-w-xl px-4 py-8">
        <div className="rounded-2xl border border-border-strong bg-surface-card p-6 shadow-floating">
          <div className="flex items-center gap-3 border-b border-border-subtle pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-white font-bold text-lg">
              {user?.name ? user.name[0].toUpperCase() : 'P'}
            </div>
            <div>
              <h1 className="font-sans text-lg font-bold text-ink-bright">{user?.name || 'Passenger Profile'}</h1>
              <div className="flex items-center gap-1.5 text-xs text-signal-emerald font-medium">
                <Shield className="h-3.5 w-3.5" />
                <span>Verified Identity</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Phone Number (Anchor)</label>
              <input
                type="text"
                disabled
                value={user?.phone || ''}
                className="w-full rounded-xl border border-border-hairline bg-surface-sunken p-2.5 font-mono text-xs text-ink-muted cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-surface-card p-2.5 text-xs font-semibold text-ink-bright"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-surface-card p-2.5 text-xs font-semibold text-ink-bright"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 py-2.5 text-xs font-bold text-white hover:bg-brand-hover"
            >
              {saved ? <Check className="h-4 w-4" /> : 'Save Profile'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
