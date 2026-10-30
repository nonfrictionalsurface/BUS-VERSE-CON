/**
 * All storage is UTC (timestamptz). All display uses Asia/Kolkata (IST).
 */

export function nowUtc(): Date {
  return new Date();
}

/**
 * Format UTC ISO string as IST display string.
 * e.g. "2026-10-24T14:00:00.000Z" → "24 Oct 2026, 19:30 IST"
 */
export function formatIstDisplay(utcIso: string): string {
  const d = new Date(utcIso);
  const datePart = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${datePart}, ${timePart} IST`;
}

/**
 * Seconds until a future UTC timestamp. Negative if past.
 */
export function secondsUntil(utcIso: string): number {
  return Math.floor((new Date(utcIso).getTime() - Date.now()) / 1000);
}

export function addSeconds(d: Date, seconds: number): Date {
  return new Date(d.getTime() + seconds * 1000);
}

export function addMinutes(d: Date, minutes: number): Date {
  return addSeconds(d, minutes * 60);
}