import type { Deck, DeckId, Fixture, FixtureKind, Layout, Seat, SeatType } from './types.ts';
import { DEFAULT_FARE_TIER, defaultUnitFor } from './types.ts';
import { keysFromLabels, relabel, type LabelScheme } from './labels.ts';
import { normalizeLayout } from './parse.ts';

interface Draft {
  decks: Deck[];
  seats: Seat[];
  fixtures: Fixture[];
  n: number;
}

const blank = (): Draft => ({ decks: [], seats: [], fixtures: [], n: 0 });

function addSeat(d: Draft, deck: DeckId, row: number, col: number, type: SeatType, extra: Partial<Seat> = {}): void {
  d.n += 1;
  d.seats.push({
    key: `T${d.n}`,
    label: `T${d.n}`,
    deck,
    row,
    col,
    rowSpan: 1,
    colSpan: 1,
    type,
    unit: defaultUnitFor(type),
    capacity: 1,
    sale: 'WHOLE',
    femaleOnly: false,
    fareTier: DEFAULT_FARE_TIER,
    features: [],
    ...extra,
  });
}

function addFixture(d: Draft, kind: FixtureKind, deck: DeckId, row: number, col: number, rowSpan = 1, colSpan = 1): void {
  d.fixtures.push({ fixture: kind, deck, row, col, rowSpan, colSpan, label: kind === 'VOID' ? '' : kind });
}

function finish(d: Draft, scheme: LabelScheme, name: string, preset: string): Layout {
  const base = normalizeLayout({ v: 2, decks: d.decks, seats: d.seats, fixtures: d.fixtures, meta: { name, preset } });
  return normalizeLayout(keysFromLabels(relabel(base, scheme)));
}

export interface SeaterOptions {
  /** Seats left of the aisle (1-4). */
  left: number;
  /** Seats right of the aisle (1-4). */
  right: number;
  /** Full seat rows (not counting the cab row or the rear bench). */
  rows: number;
  type?: SeatType;
  /** Seats in a final row that spans the whole width (the aisle cell becomes a seat). */
  rearBench?: number;
  /** Driver + door row at the front. Default true. */
  cab?: boolean;
  /** Stairs marker in the front row (double-deckers). Gives the front row even without a cab. */
  stairs?: boolean;
  /** Where the driver sits. India = RIGHT, door on the opposite side. */
  driverSide?: 'LEFT' | 'RIGHT';
  deck?: DeckId;
  /** Leave grid cells empty: `row` counts seat rows from 0, `col` is the grid column. */
  skip?: Array<{ row: number; col: number }>;
  /** Extra fixtures in grid coordinates (mid doors, toilets, luggage...). */
  fixtures?: Array<{ fixture: FixtureKind; row: number; col: number; rowSpan?: number; colSpan?: number }>;
  /** Extra seats in grid coordinates (co-driver seat...). */
  extraSeats?: Array<{ row: number; col: number }>;
  labels?: LabelScheme;
}

function addSeaterDeck(d: Draft, o: SeaterOptions): void {
  const deck = o.deck ?? 'MAIN';
  const type = o.type ?? 'SEATER';
  if (o.left < 1 || o.right < 1 || o.rows < 1) throw new Error('seater layout needs left >= 1, right >= 1, rows >= 1');
  const cols = o.left + 1 + o.right;
  const cab = o.cab !== false;
  const front = cab || o.stairs ? 1 : 0;
  const bench = o.rearBench ?? 0;
  if (bench > cols) throw new Error(`rear bench of ${bench} does not fit ${cols} columns`);
  d.decks.push({ id: deck, rows: front + o.rows + (bench > 0 ? 1 : 0), cols });
  if (cab) {
    const driverRight = (o.driverSide ?? 'RIGHT') === 'RIGHT';
    addFixture(d, 'DRIVER', deck, 0, driverRight ? cols - 1 : 0);
    addFixture(d, 'DOOR', deck, 0, driverRight ? 0 : cols - 1);
  }
  if (o.stairs) addFixture(d, 'STAIRS', deck, 0, o.left);
  const skipped = new Set((o.skip ?? []).map((s) => `${s.row}:${s.col}`));
  for (let i = 0; i < o.rows; i++) {
    for (let c = 0; c < cols; c++) {
      if (c === o.left || skipped.has(`${i}:${c}`)) continue;
      addSeat(d, deck, front + i, c, type);
    }
  }
  for (let c = 0; c < bench; c++) addSeat(d, deck, front + o.rows, c, type);
  for (const f of o.fixtures ?? []) addFixture(d, f.fixture, deck, f.row, f.col, f.rowSpan ?? 1, f.colSpan ?? 1);
  for (const s of o.extraSeats ?? []) addSeat(d, deck, s.row, s.col, type);
}

/** 2+2, 3+2, 2+1, 1+1 ... single-deck seater or semi-sleeper. */
export function buildSeaterLayout(o: SeaterOptions, name = '', preset = ''): Layout {
  const d = blank();
  addSeaterDeck(d, o);
  return finish(d, o.labels ?? 'ROW_LETTER', name, preset);
}

export interface SleeperOptions {
  /** 1 or 2 single berths, or one DOUBLE berth (2 columns wide, holds 2). */
  left: 1 | 2 | 'DOUBLE';
  right: 1 | 2 | 'DOUBLE';
  /** Berth rows per deck. Each berth is two grid rows long. */
  berthRows: number;
  decks?: Array<'LOWER' | 'UPPER'>;
  driverSide?: 'LEFT' | 'RIGHT';
  labels?: LabelScheme;
}

/** Lower/upper berth coach, e.g. 2+1 sleeper. */
export function buildSleeperLayout(o: SleeperOptions, name = '', preset = ''): Layout {
  if (o.berthRows < 1) throw new Error('sleeper layout needs berthRows >= 1');
  const d = blank();
  const leftCols = o.left === 'DOUBLE' ? 2 : o.left;
  const rightCols = o.right === 'DOUBLE' ? 2 : o.right;
  const cols = leftCols + 1 + rightCols;
  const rows = 1 + o.berthRows * 2;
  for (const deck of o.decks ?? ['LOWER', 'UPPER']) {
    d.decks.push({ id: deck, rows, cols });
    if (deck === 'LOWER') {
      const driverRight = (o.driverSide ?? 'RIGHT') === 'RIGHT';
      addFixture(d, 'DRIVER', deck, 0, driverRight ? cols - 1 : 0);
      addFixture(d, 'DOOR', deck, 0, driverRight ? 0 : cols - 1);
    }
    for (let i = 0; i < o.berthRows; i++) {
      const row = 1 + i * 2;
      const side = (from: number, spec: 1 | 2 | 'DOUBLE'): void => {
        if (spec === 'DOUBLE') addSeat(d, deck, row, from, 'SLEEPER', { rowSpan: 2, colSpan: 2, capacity: 2 });
        else for (let c = 0; c < spec; c++) addSeat(d, deck, row, from + c, 'SLEEPER', { rowSpan: 2 });
      };
      side(0, o.left);
      side(leftCols + 1, o.right);
    }
  }
  return finish(d, o.labels ?? 'DECK_SEQUENTIAL', name, preset);
}

export interface DoubleDeckerOptions {
  left: number;
  right: number;
  lowerRows: number;
  upperRows: number;
  type?: SeatType;
  labels?: LabelScheme;
}

/** Two-floor seater with a staircase. */
export function buildDoubleDeckerLayout(o: DoubleDeckerOptions, name = '', preset = ''): Layout {
  const d = blank();
  const type = o.type ?? 'SEATER';
  addSeaterDeck(d, { left: o.left, right: o.right, rows: o.lowerRows, type, deck: 'LOWER', stairs: true });
  addSeaterDeck(d, { left: o.left, right: o.right, rows: o.upperRows, type, deck: 'UPPER', cab: false, stairs: true });
  return finish(d, o.labels ?? 'ROW_LETTER', name, preset);
}

export interface PresetInfo {
  id: string;
  name: string;
  description: string;
  build: () => Layout;
}

export const PRESETS: readonly PresetInfo[] = [
  { id: 'seater-2x2-40', name: '2+2 Seater (40)', description: 'Standard AC/Non-AC seater, 10 rows of 4.', build: () => buildSeaterLayout({ left: 2, right: 2, rows: 10 }, '2+2 Seater (40)', 'seater-2x2-40') },
  { id: 'seater-2x2-49', name: '2+2 Seater with rear bench (49)', description: '11 rows of 4 plus a 5-seat rear bench.', build: () => buildSeaterLayout({ left: 2, right: 2, rows: 11, rearBench: 5 }, '2+2 Seater with rear bench (49)', 'seater-2x2-49') },
  { id: 'seater-3x2-55', name: '3+2 Seater (55)', description: 'Ordinary 3+2 seating, 11 rows of 5.', build: () => buildSeaterLayout({ left: 3, right: 2, rows: 11 }, '3+2 Seater (55)', 'seater-3x2-55') },
  { id: 'seater-2x1-30', name: '2+1 Luxury seater (30)', description: 'Wide 2+1 recliners, 10 rows of 3.', build: () => buildSeaterLayout({ left: 2, right: 1, rows: 10 }, '2+1 Luxury seater (30)', 'seater-2x1-30') },
  { id: 'seater-1x1-18', name: '1+1 VIP seater (18)', description: 'Single seats on both sides, 9 rows.', build: () => buildSeaterLayout({ left: 1, right: 1, rows: 9 }, '1+1 VIP seater (18)', 'seater-1x1-18') },
  { id: 'semi-sleeper-2x2-45', name: '2+2 Semi-sleeper (45)', description: 'Push-back semi-sleeper, 10 rows plus rear bench.', build: () => buildSeaterLayout({ left: 2, right: 2, rows: 10, rearBench: 5, type: 'SEMI_SLEEPER' }, '2+2 Semi-sleeper (45)', 'semi-sleeper-2x2-45') },
  { id: 'sleeper-2x1-36', name: '2+1 Sleeper (36)', description: 'Lower + upper berths, 6 berth rows per deck.', build: () => buildSleeperLayout({ left: 2, right: 1, berthRows: 6 }, '2+1 Sleeper (36)', 'sleeper-2x1-36') },
  { id: 'sleeper-2x1-30', name: '2+1 Sleeper (30)', description: 'Lower + upper berths, 5 berth rows per deck.', build: () => buildSleeperLayout({ left: 2, right: 1, berthRows: 5 }, '2+1 Sleeper (30)', 'sleeper-2x1-30') },
  { id: 'sleeper-double-24', name: 'Double + single sleeper (24 berths)', description: 'Left side double berths (2 persons), right side singles.', build: () => buildSleeperLayout({ left: 'DOUBLE', right: 1, berthRows: 6 }, 'Double + single sleeper (24 berths)', 'sleeper-double-24') },
  { id: 'minibus-2x1-16', name: 'Mini bus 2+1 (16)', description: '4 rows of 3 plus a 4-seat rear bench.', build: () => buildSeaterLayout({ left: 2, right: 1, rows: 4, rearBench: 4 }, 'Mini bus 2+1 (16)', 'minibus-2x1-16') },
  { id: 'double-decker-2x2-72', name: 'Double-decker 2+2 (72)', description: 'Two floors of 9 rows of 4, joined by a staircase.', build: () => buildDoubleDeckerLayout({ left: 2, right: 2, lowerRows: 9, upperRows: 9 }, 'Double-decker 2+2 (72)', 'double-decker-2x2-72') },
];

export const getPreset = (id: string): PresetInfo | undefined => PRESETS.find((p) => p.id === id);
