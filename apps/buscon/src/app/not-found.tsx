import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-bg p-6">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-brand-text">404</h1>
        <p className="mt-4 text-ink-primary">We couldn&apos;t find that page.</p>
        <Link href="/dashboard" className="inline-block mt-6 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}