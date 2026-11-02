export function formatINR(paise?: number | bigint | string | null): string {
  if (paise === undefined || paise === null || paise === '') return '—';
  const num = typeof paise === 'string' ? parseFloat(paise) : Number(paise);
  if (Number.isNaN(num) || num <= 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(num / 100);
}

export function formatIST(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}