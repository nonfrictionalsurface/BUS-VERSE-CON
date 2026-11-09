export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-6xl font-extrabold text-text-primary mb-4">404</h1>
      <p className="text-text-secondary mb-6">We couldn&apos;t find that page</p>
      <a href="/" className="px-4 py-2 bg-brand text-white rounded-lg">Go to home</a>
    </main>
  );
}
