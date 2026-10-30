export interface Money {
  amountPaise: bigint;
  currency: string;
}

export function toMoney(paise: bigint | number, currency = 'INR'): Money {
  return { amountPaise: BigInt(paise), currency };
}

/**
 * Format for display: ₹487.50 (Indian lakh/crore grouping).
 */
export function formatMoney(money: Money): string {
  const rupees = Number(money.amountPaise) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Convert rupees (user input) → paise (storage).
 */
export function rupeesToPaise(rupees: number | string): bigint {
  const r = typeof rupees === 'string' ? Number(rupees) : rupees;
  if (!Number.isFinite(r)) throw new Error('Invalid rupee amount');
  return BigInt(Math.round(r * 100));
}

/**
 * Convert paise (storage) → rupees (calculation).
 */
export function paiseToRupees(paise: bigint | number): number {
  return Number(paise) / 100;
}