import type { DeckId, Layout, Seat } from './types.ts';
import { WALKABLE_FIXTURES } from './types.ts';
import { buildOccupancy, cellId, deckById, inBounds, isFloor, type Occupancy } from './grid.ts';
import { compareSeats } from './labels.ts';

export interface SeatGeometry {
  /** Next to the bus wall (grid edge or a blocking fixture) on at least one side. */
  window: boolean;
  /** Next to walkable floor on at least one side. */
  aisleSide: boolean;
  /** Seat on both sides, no wall and no aisle (the middle of a 3-seat run). */
  middle: boolean;
  /** Keys of seats immediately to the left / right (no floor between). */
  left: string[];
  right: string[];
  /** 1-based rank of the seat's start row among seat rows of its deck. */
  rowRank: number;
  front: boolean;
  rear: boolean;
}

interface Side {
  wall: number;
  floor: number;
  seats: string[];
  total: number;
}

function inspectSide(occ: Occupancy, layout: Layout, s: Seat, side: 'left' | 'right'): Side {
  const deck = deckById(layout, s.deck);
  const col = side === 'left' ? s.col - 1 : s.col + s.colSpan;
  const out: Side = { wall: 0, floor: 0, seats: [], total: s.rowSpan };
  for (let i = 0; i < s.rowSpan; i++) {
    const row = s.row + i;
    if (!deck || !inBounds(deck, row, col)) {
      out.wall++;
      continue;
    }
    const id = cellId(s.deck, row, col);
    const n = occ.seatAt.get(id);
    if (n) {
      if (!out.seats.includes(n.key)) out.seats.push(n.key);
      continue;
    }
    const f = occ.fixtureAt.get(id);
    if (f && !WALKABLE_FIXTURES.has(f.fixture)) out.wall++;
    else out.floor++;
  }
  return out;
}

export function analyzeSeats(layout: Layout): Map<string, SeatGeometry> {
  const occ = buildOccupancy(layout);
  const startRows = new Map<DeckId, number[]>();
  for (const s of layout.seats) {
    const arr = startRows.get(s.deck) ?? [];
    if (!arr.includes(s.row)) arr.push(s.row);
    startRows.set(s.deck, arr);
  }
  for (const arr of startRows.values()) arr.sort((a, b) => a - b);

  const out = new Map<string, SeatGeometry>();
  for (const s of layout.seats) {
    const l = inspectSide(occ, layout, s, 'left');
    const r = inspectSide(occ, layout, s, 'right');
    const window = l.wall === l.total || r.wall === r.total;
    const aisleSide = l.floor > 0 || r.floor > 0;
    const rows = startRows.get(s.deck) ?? [];
    const rowRank = rows.indexOf(s.row) + 1;
    out.set(s.key, {
      window,
      aisleSide,
      middle: !window && !aisleSide && l.seats.length > 0 && r.seats.length > 0,
      left: l.seats,
      right: r.seats,
      rowRank,
      front: rowRank === 1,
      rear: rowRank === rows.length,
    });
  }
  return out;
}

export interface Neighbor {
  key: string;
  /** 3 = side by side, 2 = across a one-cell aisle or stacked upper/lower, 1 = front/back. */
  strength: 1 | 2 | 3;
}

const overlaps = (a0: number, an: number, b0: number, bn: number): boolean => a0 < b0 + bn && b0 < a0 + an;

/** Which seats are next to which. Used for "sit together" and access checks. */
export function adjacency(layout: Layout): Map<string, Neighbor[]> {
  const occ = buildOccupancy(layout);
  const map = new Map<string, Map<string, 1 | 2 | 3>>();
  for (const s of layout.seats) map.set(s.key, new Map());
  const link = (a: Seat, b: Seat, strength: 1 | 2 | 3): void => {
    const ma = map.get(a.key);
    const mb = map.get(b.key);
    if (!ma || !mb) return;
    if ((ma.get(b.key) ?? 0) < strength) {
      ma.set(b.key, strength);
      mb.set(a.key, strength);
    }
  };
  const seats = [...layout.seats].sort(compareSeats);
  for (let i = 0; i < seats.length; i++) {
    const a = seats[i];
    if (!a) continue;
    for (let j = i + 1; j < seats.length; j++) {
      const b = seats[j];
      if (!b) continue;
      if (a.deck !== b.deck) {
        const stacked = a.deck !== b.deck && overlaps(a.row, a.rowSpan, b.row, b.rowSpan) && overlaps(a.col, a.colSpan, b.col, b.colSpan);
        if (stacked) link(a, b, 2);
        continue;
      }
      const rowsOverlap = overlaps(a.row, a.rowSpan, b.row, b.rowSpan);
      const colsOverlap = overlaps(a.col, a.colSpan, b.col, b.colSpan);
      if (rowsOverlap && !colsOverlap) {
        const [left, right] = a.col < b.col ? [a, b] : [b, a];
        const gap = right.col - (left.col + left.colSpan);
        if (gap === 0) link(a, b, 3);
        else if (gap === 1) {
          const deck = deckById(layout, a.deck);
          const rowFrom = Math.max(a.row, b.row);
          const rowTo = Math.min(a.row + a.rowSpan, b.row + b.rowSpan);
          let allFloor = false;
          for (let r = rowFrom; r < rowTo; r++) if (deck && isFloor(occ, deck, r, left.col + left.colSpan)) allFloor = true;
          if (allFloor) link(a, b, 2);
        }
      } else if (colsOverlap && !rowsOverlap) {
        const [top, bottom] = a.row < b.row ? [a, b] : [b, a];
        if (bottom.row === top.row + top.rowSpan) link(a, b, 1);
      }
    }
  }
  const out = new Map<string, Neighbor[]>();
  for (const [key, m] of map) {
    out.set(
      key,
      [...m.entries()].map(([k, strength]) => ({ key: k, strength })).sort((x, y) => y.strength - x.strength || x.key.localeCompare(y.key)),
    );
  }
  return out;
}
