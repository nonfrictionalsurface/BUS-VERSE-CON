// Money formatter per 05-UI-SPEC §8.2.
// Source of truth: integer paise → display string with ₹ symbol.

const INR = 'INR';

function groupIndian(numStr: string): string {
  // Indian numbering: last 3 digits, then groups of 2 (e.g. 12,34,567).
  if (numStr.length <= 3) return numStr;
  const last3 = numStr.slice(-3);
  const rest = numStr.slice(0, -3);
  const groups: string[] = [];
  let cursor = rest;
  while (cursor.length > 2) {
    groups.unshift(cursor.slice(-2));
    cursor = cursor.slice(0, -2);
  }
  if (cursor.length > 0) groups.unshift(cursor);
  return `${groups.join(',')},${last3}`;
}

export function formatMoney(amountPaise: number, currency: string = INR): string {
  const safe = Number.isFinite(amountPaise) ? amountPaise : 0;
  const negative = safe < 0;
  const abs = Math.abs(Math.round(safe));
  const rupees = Math.floor(abs / 100);
  const paise = abs % 100;
  const rupeeStr = groupIndian(String(rupees));
  const paiseStr = String(paise).padStart(2, '0');
  const symbol = currency === 'INR' ? '₹' : currency + ' ';
  return `${negative ? '-' : ''}${symbol}${rupeeStr}.${paiseStr}`;
}

export function formatMoneyCompact(amountPaise: number): string {
  const safe = Number.isFinite(amountPaise) ? amountPaise : 0;
  const rupees = Math.round(safe / 100);
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
  return `₹${rupees}`;
}
