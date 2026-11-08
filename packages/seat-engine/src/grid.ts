import type { Deck, DeckId, Fixture, Layout, Seat } from './types.ts';
import { WALKABLE_FIXTURES } from './types.ts';

export interface Rect {
  deck: DeckId;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

export const cellId = (deck: DeckId, row: number, col: number): string => `${deck}:${row}:${col}`;

export function forEachCell(r: Rect, fn: (row: number, col: number) => void): void {
  for (let i = 0; i < r.rowSpan; i++) for (let j = 0; j < r.colSpan; j++) fn(r.row + i, r.col + j);
}

export function deckById(layout: Layout, id: DeckId): Deck | undefined {
  return layout.decks.find((d) => d.id === id);
}

export function inBounds(deck: Deck, row: number, col: number): boolean {
  return row >= 0 && col >= 0 && row < deck.rows && col < deck.cols;
}

export interface Overlap {
  deck: DeckId;
  row: number;
  col: number;
  a: string;
  b: string;
}

export interface Occupancy {
  seatAt: Map<string, Seat>;
  fixtureAt: Map<string, Fixture>;
  overlaps: Overlap[];
}

const fixtureName = (f: Fixture): string => `${f.fixture}@${f.row},${f.col}`;

export function buildOccupancy(layout: Layout): Occupancy {
  const seatAt = new Map<string, Seat>();
  const fixtureAt = new Map<string, Fixture>();
  const overlaps: Overlap[] = [];
  for (const s of layout.seats) {
    forEachCell(s, (row, col) => {
      const id = cellId(s.deck, row, col);
      const prev = seatAt.get(id);
      if (prev) overlaps.push({ deck: s.deck, row, col, a: prev.key, b: s.key });
      else seatAt.set(id, s);
    });
  }
  for (const f of layout.fixtures) {
    forEachCell(f, (row, col) => {
      const id = cellId(f.deck, row, col);
      const s = seatAt.get(id);
      if (s) overlaps.push({ deck: f.deck, row, col, a: s.key, b: fixtureName(f) });
      const prev = fixtureAt.get(id);
      if (prev) overlaps.push({ deck: f.deck, row, col, a: fixtureName(prev), b: fixtureName(f) });
      else fixtureAt.set(id, f);
    });
  }
  return { seatAt, fixtureAt, overlaps };
}

/** Walkable floor = inside the grid, no seat, and either empty or a door/stairs. */
export function isFloor(occ: Occupancy, deck: Deck, row: number, col: number): boolean {
  if (!inBounds(deck, row, col)) return false;
  const id = cellId(deck.id, row, col);
  if (occ.seatAt.has(id)) return false;
  const f = occ.fixtureAt.get(id);
  return !f || WALKABLE_FIXTURES.has(f.fixture);
}
