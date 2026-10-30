/**
 * BusVerse Transit Formatters
 * Strict adherence to IST timestamps and integer paise currency units
 */

// Formats integer paise to INR currency (e.g. 45000 -> ₹450)
export function formatINR(amountPaise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountPaise / 100);
}

// Converts ISO UTC to Indian Standard Time (Asia/Kolkata)
export function formatISTTime(isoDateString: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(isoDateString));
  } catch {
    return '--:--';
  }
}

export function formatISTDate(isoDateString: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(isoDateString));
  } catch {
    return '--';
  }
}

// Formats duration in minutes to readable hours & minutes (e.g. 480 -> "8h 00m")
export function formatDuration(durationMinutes: number): string {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

// Countdown formatter (seconds to MM:SS)
export function formatCountdown(remainingSeconds: number): string {
  const safe = Math.max(0, Math.floor(remainingSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
