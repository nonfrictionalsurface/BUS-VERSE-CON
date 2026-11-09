export default async function Page({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  return <main className="min-h-screen flex items-center justify-center p-6"><p className="text-text-secondary">Tracking trip {tripId} — placeholder</p></main>;
}
