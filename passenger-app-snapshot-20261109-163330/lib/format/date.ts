// Date formatter per 05-UI-SPEC §8.3.
// Every date is displayed in IST (Asia/Kolkata) unless noted.

const IST = 'Asia/Kolkata';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function partsInIst(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // Convert to IST
  const istMs = d.getTime() + 5.5 * 3600 * 1000;
  const ist = new Date(istMs);
  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth(),
    day: ist.getUTCDate(),
    weekday: ist.getUTCDay(),
    hours: ist.getUTCHours(),
    minutes: ist.getUTCMinutes(),
  };
}

export type DateStyle = 'full' | 'short' | 'day' | 'relative';

export function formatDate(iso: string, style: DateStyle = 'full'): string {
  const p = partsInIst(iso);
  if (!p) return '—';
  if (style === 'short') return `${String(p.day).padStart(2, '0')} ${MONTHS_SHORT[p.month]}`;
  if (style === 'day') return `${DAYS_SHORT[p.weekday]}, ${String(p.day).padStart(2, '0')} ${MONTHS_SHORT[p.month]}`;
  if (style === 'relative') {
    const now = new Date();
    const istNow = new Date(now.getTime() + 5.5 * 3600 * 1000);
    const dayMs = 24 * 3600 * 1000;
    const todayIst = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate());
    const targetIst = Date.UTC(p.year, p.month, p.day);
    const diffDays = Math.round((targetIst - todayIst) / dayMs);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    return `${String(p.day).padStart(2, '0')} ${MONTHS_SHORT[p.month]} ${p.year}`;
  }
  return `${String(p.day).padStart(2, '0')} ${MONTHS_LONG[p.month]} ${p.year}`;
}

export function todayIsoDateIst(): string {
  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return istNow.toISOString().slice(0, 10);
}
