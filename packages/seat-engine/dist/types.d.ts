export declare const LAYOUT_VERSION: 2;
export declare const LIMITS: {
    readonly maxDecks: 2;
    readonly maxRows: 40;
    readonly maxCols: 10;
    readonly maxUnits: 150;
    readonly maxSpan: 4;
    readonly maxCapacity: 4;
    readonly maxLabelLength: 8;
    readonly maxKeyLength: 16;
    readonly maxFeatures: 8;
};
export declare const DECK_IDS: readonly ["MAIN", "LOWER", "UPPER"];
export type DeckId = (typeof DECK_IDS)[number];
export declare const DECK_ORDER: Record<DeckId, number>;
export declare const DECK_TITLES: Record<DeckId, string>;
export declare const SEAT_TYPES: readonly ["SEATER", "SEMI_SLEEPER", "SLEEPER"];
export type SeatType = (typeof SEAT_TYPES)[number];
/** Taxonomy of a bookable unit. Phase 1 sells SEAT and BERTH only. */
export declare const UNIT_KINDS: readonly ["SEAT", "BERTH", "CABIN"];
export type UnitKind = (typeof UNIT_KINDS)[number];
/** WHOLE = sold as one unit. EITHER (half-berth sale) is modelled but disabled in Phase 1. */
export declare const SALE_MODES: readonly ["WHOLE", "EITHER"];
export type SaleMode = (typeof SALE_MODES)[number];
export declare const FIXTURE_KINDS: readonly ["DOOR", "DRIVER", "CREW", "STAIRS", "WC", "LUGGAGE", "VOID"];
export type FixtureKind = (typeof FIXTURE_KINDS)[number];
/** Fixtures a passenger can walk through. Everything else blocks movement. */
export declare const WALKABLE_FIXTURES: ReadonlySet<FixtureKind>;
export declare const SEAT_FEATURES: readonly ["EXTRA_LEGROOM", "EMERGENCY_EXIT_ROW", "ACCESSIBLE", "CHARGING", "FOLD_UP", "NEAR_DOOR", "NEAR_WC"];
export type SeatFeature = (typeof SEAT_FEATURES)[number];
export declare const DEFAULT_FARE_TIER = "STANDARD";
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
export type IssueCode = 'SCHEMA' | 'BAD_DECKS' | 'GRID_TOO_LARGE' | 'OUT_OF_BOUNDS' | 'OVERLAP' | 'DUPLICATE_KEY' | 'DUPLICATE_LABEL' | 'BAD_KEY' | 'BAD_LABEL' | 'BAD_SPAN' | 'BAD_CAPACITY' | 'TYPE_UNIT_MISMATCH' | 'NO_SEATS' | 'TOO_MANY_SEATS' | 'CAPACITY_MISMATCH' | 'UNREACHABLE_SEAT' | 'NO_ACCESS_POINT' | 'FEATURE_DISABLED' | 'DECK_EMPTY';
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
export declare function defaultUnitFor(type: SeatType): UnitKind;
