'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('buscon_access_token');
    router.replace(token ? '/dashboard' : '/login');
  }, [router]);
  return <div className="min-h-screen flex items-center justify-center text-ink-secondary">Redirecting…</div>;
}