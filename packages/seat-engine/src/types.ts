// Seat Layout v2 - canonical types. Pure data, no runtime dependencies.

export const LAYOUT_VERSION = 2 as const;

export const LIMITS = {
  maxDecks: 2,
  maxRows: 40,
  maxCols: 10,
  maxUnits: 150,
  maxSpan: 4,
  maxCapacity: 4,
  maxLabelLength: 8,
  maxKeyLength: 16,
  maxFeatures: 8,
} as const;

export const DECK_IDS = ['MAIN', 'LOWER', 'UPPER'] as const;
export type DeckId = (typeof DECK_IDS)[number];
export const DECK_ORDER: Record<DeckId, number> = { MAIN: 0, LOWER: 0, UPPER: 1 };
export const DECK_TITLES: Record<DeckId, string> = {
  MAIN: 'Main deck',
  LOWER: 'Lower deck',
  UPPER: 'Upper deck',
};

export const SEAT_TYPES = ['SEATER', 'SEMI_SLEEPER', 'SLEEPER'] as const;
export type SeatType = (typeof SEAT_TYPES)[number];

/** Taxonomy of a bookable unit. Phase 1 sells SEAT and BERTH only. */
export const UNIT_KINDS = ['SEAT', 'BERTH', 'CABIN'] as const;
export type UnitKind = (typeof UNIT_KINDS)[number];

/** WHOLE = sold as one unit. EITHER (half-berth sale) is modelled but disabled in Phase 1. */
export const SALE_MODES = ['WHOLE', 'EITHER'] as const;
export type SaleMode = (typeof SALE_MODES)[number];

export const FIXTURE_KINDS = ['DOOR', 'DRIVER', 'CREW', 'STAIRS', 'WC', 'LUGGAGE', 'VOID'] as const;
export type FixtureKind = (typeof FIXTURE_KINDS)[number];
/** Fixtures a passenger can walk through. Everything else blocks movement. */
export const WALKABLE_FIXTURES: ReadonlySet<FixtureKind> = new Set<FixtureKind>(['DOOR', 'STAIRS']);

export const SEAT_FEATURES = [
  'EXTRA_LEGROOM',
  'EMERGENCY_EXIT_ROW',
  'ACCESSIBLE',
  'CHARGING',
  'FOLD_UP',
  'NEAR_DOOR',
  'NEAR_WC',
] as const;
export type SeatFeature = (typeof SEAT_FEATURES)[number];

export const DEFAULT_FARE_TIER = 'STANDARD';

export interface Deck {
  id: DeckId;
  rows: number;
  cols: number;
}

/** A bookable unit: seat, berth or cabin. Coordinates are 0-based, row 0 is the front of the bus. */
export interface Seat {
  key: string;
  label: string;
  deck: DeckId;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  type: SeatType;
  unit: UnitKind;
  capacity: number;
  sale: SaleMode;
  femaleOnly: boolean;
  fareTier: string;
  features: SeatFeature[];
}

/** Non-bookable object on the floor plan (door, driver cab, stairs, toilet, ...). */
export interface Fixture {
  fixture: FixtureKind;
  deck: DeckId;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  label: string;
}

export interface LayoutMeta {
  name: string;
  preset: string;
}

/** The canonical layout document (always fully normalised). */
export interface Layout {
  v: 2;
  decks: Deck[];
  seats: Seat[];
  fixtures: Fixture[];
  meta: LayoutMeta;
}

export type IssueSeverity = 'error' | 'warning';
export type IssueCode =
  | 'SCHEMA'
  | 'BAD_DECKS'
  | 'GRID_TOO_LARGE'
  | 'OUT_OF_BOUNDS'
  | 'OVERLAP'
  | 'DUPLICATE_KEY'
  | 'DUPLICATE_LABEL'
  | 'BAD_KEY'
  | 'BAD_LABEL'
  | 'BAD_SPAN'
  | 'BAD_CAPACITY'
  | 'TYPE_UNIT_MISMATCH'
  | 'NO_SEATS'
  | 'TOO_MANY_SEATS'
  | 'CAPACITY_MISMATCH'
  | 'UNREACHABLE_SEAT'
  | 'NO_ACCESS_POINT'
  | 'FEATURE_DISABLED'
  | 'DECK_EMPTY';

export interface LayoutIssue {
  code: IssueCode;
  severity: IssueSeverity;
  message: string;
  keys?: string[];
  deck?: DeckId;
  row?: number;
  col?: number;
}

export type SeatStatus = 'AVAILABLE' | 'LOCKED' | 'BOOKED' | 'MINE' | 'BLOCKED';
export interface SeatRuntime {
  status: SeatStatus;
  lockedUntil?: string | null;
}
/** Runtime state keyed by seat `key` (not by database id). */
export type RuntimeMap = Readonly<Record<string, SeatRuntime>>;

export function defaultUnitFor(type: SeatType): UnitKind {
  return type === 'SLEEPER' ? 'BERTH' : 'SEAT';
}
