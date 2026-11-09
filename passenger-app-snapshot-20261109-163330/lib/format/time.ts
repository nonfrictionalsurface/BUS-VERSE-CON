// Time formatter per 05-UI-SPEC §8.4.
// All times displayed in IST. Server stores UTC.

function istParts(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const istMs = d.getTime() + 5.5 * 3600 * 1000;
  const ist = new Date(istMs);
  return { hours: ist.getUTCHours(), minutes: ist.getUTCMinutes() };
}

export function formatTime(iso: string): string {
  const p = istParts(iso);
  if (!p) return '—';
  return `${String(p.hours).padStart(2, '0')}:${String(p.minutes).padStart(2, '0')} IST`;
}

export function formatTimeRange(departIso: string, arriveIso: string): string {
  const dep = istParts(departIso);
  const arr = istParts(arriveIso);
  if (!dep || !arr) return '—';
  const fmt = (p: { hours: number; minutes: number }) =>
    `${String(p.hours).padStart(2, '0')}:${String(p.minutes).padStart(2, '0')}`;
  return `${fmt(dep)} → ${fmt(arr)} IST`;
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function formatCountdown(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
