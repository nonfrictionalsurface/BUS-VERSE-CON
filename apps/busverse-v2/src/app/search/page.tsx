'use client';

import Link from 'next/link';
import { SearchForm } from '@/components/search/SearchForm';

export default function SearchPage() {
  return (
    <main className="min-h-screen flex flex-col p-6">
      <header className="max-w-md w-full mx-auto mb-6">
        <Link href="/" className="text-sm text-text-secondary hover:text-text-primary">
          ← Back to home
        </Link>
      </header>
      <div className="max-w-md w-full mx-auto flex-1">
        <h1 className="text-3xl font-extrabold text-text-bright tracking-tight mb-2">
          Find a bus
        </h1>
        <p className="text-text-secondary mb-6">
          Search 3,000+ verified operators across India
        </p>
        <SearchForm />
      </div>
    </main>
  );
}