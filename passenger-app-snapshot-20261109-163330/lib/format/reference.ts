// Reference formatters per 05-UI-SPEC §8.6.
// Backend format: BKG-YYYY-NNNNN (booking_reference_seq_{year}).

export function isValidBookingReference(ref: string): boolean {
  return /^BKG-\d{4}-\d{5}$/.test(ref);
}

export function formatBookingReference(ref: string): string {
  // Backend already returns canonical form; this is just a sanity display helper.
  return isValidBookingReference(ref) ? ref : ref;
}

// Per Design_guide §7 illustration, seating label like "2B (Window)".
// Window vs aisle is derived from column relative to aisle cells.
export function seatPositionLabel(column: number, aisleColumns: number[]): 'Window' | 'Aisle' | 'Middle' {
  const minAisle = Math.min(...aisleColumns.filter((c) => c > 0), Infinity);
  if (!Number.isFinite(minAisle)) return 'Window';
  if (column < minAisle) return 'Window';
  if (column === minAisle || column === minAisle + 1) return 'Aisle';
  return 'Window';
}
