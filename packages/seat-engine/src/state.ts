import type { DeckId, Layout, RuntimeMap, Seat, SeatStatus } from './types.ts';
import { adjacency, analyzeSeats } from './geometry.ts';
import { compareSeats } from './labels.ts';

/** Server limit for one booking (createBookingSchema: passengers max 8). */
export const MAX_SEATS_PER_BOOKING = 8;

export const isSelectable = (status: SeatStatus): boolean => status === 'AVAILABLE' || status === 'MINE';

/** Unknown keys are BLOCKED until the next refetch: never let a user tap a seat we cannot see state for. */
export const statusOf = (runtime: RuntimeMap, key: string): SeatStatus => runtime[key]?.status ?? 'BLOCKED';

export interface AvailabilitySummary {
  total: number;
  available: number;
  booked: number;
  locked: number;
  mine: number;
  blocked: number;
  byDeck: Record<string, number>;
}

export function summarize(layout: Layout, runtime: RuntimeMap): AvailabilitySummary {
  const out: AvailabilitySummary = { total: layout.seats.length, available: 0, booked: 0, locked: 0, mine: 0, blocked: 0, byDeck: {} };
  for (const s of layout.seats) {
    const st = statusOf(runtime, s.key);
    if (st === 'AVAILABLE') {
      out.available++;
      out.byDeck[s.deck] = (out.byDeck[s.deck] ?? 0) + 1;
    } else if (st === 'BOOKED') out.booked++;
    else if (st === 'LOCKED') out.locked++;
    else if (st === 'MINE') out.mine++;
    else out.blocked++;
  }
  return out;
}

export interface SelectionIssue {
  code: 'MAX_SEATS' | 'UNKNOWN_SEAT' | 'SPLIT_GROUP';
  severity: 'error' | 'warning';
  message: string;
}

/** Connected groups of selected seats (side by side, across one aisle, stacked, or one row behind another). */
export function selectionGroups(layout: Layout, selected: readonly string[]): string[][] {
  const adj = adjacency(layout);
  const set = new Set(selected);
  const seen = new Set<string>();
  const groups: string[][] = [];
  for (const start of selected) {
    if (seen.has(start)) continue;
    const group: string[] = [];
    const stack = [start];
    seen.add(start);
    while (stack.length > 0) {
      const k = stack.pop() ?? '';
      group.push(k);
      for (const n of adj.get(k) ?? []) {
        if (set.has(n.key) && !seen.has(n.key)) {
          seen.add(n.key);
          stack.push(n.key);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

export function validateSelection(layout: Layout, selected: readonly string[], opts: { maxSeats?: number } = {}): SelectionIssue[] {
  const issues: SelectionIssue[] = [];
  const known = new Set(layout.seats.map((s) => s.key));
  const max = opts.maxSeats ?? MAX_SEATS_PER_BOOKING;
  if (selected.some((k) => !known.has(k))) issues.push({ code: 'UNKNOWN_SEAT', severity: 'error', message: 'A selected seat is no longer part of this bus layout.' });
  if (selected.length > max) issues.push({ code: 'MAX_SEATS', severity: 'error', message: `You can book at most ${max} seats at a time.` });
  if (selected.length > 1 && selectionGroups(layout, selected).length > 1) {
    issues.push({ code: 'SPLIT_GROUP', severity: 'warning', message: 'Your seats are not all together.' });
  }
  return issues;
}

export interface SuggestOptions {
  prefer?: 'WINDOW' | 'AISLE' | 'ANY';
  deck?: DeckId;
  exclude?: readonly string[];
}

/**
 * "Seat us together": greedy best group of `count` AVAILABLE seats that are
 * adjacent (side by side > across the aisle/stacked > front/back).
 * Deterministic: ties resolve to the front-left-most seats.
 */
export function suggestTogether(layout: Layout, runtime: RuntimeMap, count: number, opts: SuggestOptions = {}): string[] | null {
  if (!Number.isInteger(count) || count < 1) return null;
  const exclude = new Set(opts.exclude ?? []);
  const free = new Map<string, Seat>();
  for (const s of layout.seats) {
    if (opts.deck && s.deck !== opts.deck) continue;
    if (exclude.has(s.key) || statusOf(runtime, s.key) !== 'AVAILABLE') continue;
    free.set(s.key, s);
  }
  if (free.size < count) return null;

  const geo = analyzeSeats(layout);
  const adj = adjacency(layout);
  const order = new Map<string, number>();
  [...layout.seats].sort(compareSeats).forEach((s, i) => order.set(s.key, i));
  const prefer = opts.prefer ?? 'ANY';
  const bonus = (key: string): number => {
    const g = geo.get(key);
    if (!g) return 0;
    return (prefer === 'WINDOW' && g.window) || (prefer === 'AISLE' && g.aisleSide) ? 0.5 : 0;
  };
  const strength = (a: string, b: string): number => adj.get(a)?.find((n) => n.key === b)?.strength ?? 0;

  let best: { keys: string[]; score: number; start: number } | null = null;
  for (const start of free.keys()) {
    const group = [start];
    let score = bonus(start);
    while (group.length < count) {
      const candidates = new Set<string>();
      for (const g of group) for (const n of adj.get(g) ?? []) if (free.has(n.key) && !group.includes(n.key)) candidates.add(n.key);
      let pick: { key: string; gain: number } | null = null;
      for (const c of candidates) {
        let gain = bonus(c);
        for (const g of group) gain += strength(g, c);
        const better = !pick || gain > pick.gain || (gain === pick.gain && (order.get(c) ?? 0) < (order.get(pick.key) ?? 0));
        if (better) pick = { key: c, gain };
      }
      if (!pick) break;
      group.push(pick.key);
      score += pick.gain;
    }
    if (group.length < count) continue;
    const startOrder = order.get(start) ?? 0;
    if (!best || score > best.score || (score === best.score && startOrder < best.start)) best = { keys: group, score, start: startOrder };
  }
  if (!best) return null;
  return best.keys.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}
