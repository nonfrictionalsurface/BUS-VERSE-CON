// Phone formatter per 05-UI-SPEC §8.5.
// Backend stores E.164 (e.g. +919876543210).

export function formatPhone(e164: string): string {
  if (!e164) return '';
  const digits = e164.replace(/[^0-9]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return e164;
}

export function maskPhone(e164: string): string {
  const digits = e164.replace(/[^0-9]/g, '');
  if (digits.length >= 4) {
    const last4 = digits.slice(-4);
    const prefix = digits.startsWith('91') ? '+91 ' : '';
    return `${prefix}•••••• ${last4}`;
  }
  return e164;
}

export function phoneToE164(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return raw.startsWith('+') ? raw : `+${digits}`;
}
