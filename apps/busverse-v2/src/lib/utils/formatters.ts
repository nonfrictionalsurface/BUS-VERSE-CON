const IST_TIME_ZONE = 'Asia/Kolkata';

export function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function formatISTTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: IST_TIME_ZONE,
    });
  } catch { return '--:--'; }
}

export function formatISTDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      timeZone: IST_TIME_ZONE,
    });
  } catch { return ''; }
}

export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '--';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function todayISODate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function durationBetween(depIso: string, arrIso: string): number {
  try {
    return Math.round((new Date(arrIso).getTime() - new Date(depIso).getTime()) / 60000);
  } catch { return 0; }
}