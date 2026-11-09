// Seat Layout v2 - canonical types. Pure data, no runtime dependencies.
export const LAYOUT_VERSION = 2;
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
};
export const DECK_IDS = ['MAIN', 'LOWER', 'UPPER'];
export const DECK_ORDER = { MAIN: 0, LOWER: 0, UPPER: 1 };
export const DECK_TITLES = {
    MAIN: 'Main deck',
    LOWER: 'Lower deck',
    UPPER: 'Upper deck',
};
export const SEAT_TYPES = ['SEATER', 'SEMI_SLEEPER', 'SLEEPER'];
/** Taxonomy of a bookable unit. Phase 1 sells SEAT and BERTH only. */
export const UNIT_KINDS = ['SEAT', 'BERTH', 'CABIN'];
/** WHOLE = sold as one unit. EITHER (half-berth sale) is modelled but disabled in Phase 1. */
export const SALE_MODES = ['WHOLE', 'EITHER'];
export const FIXTURE_KINDS = ['DOOR', 'DRIVER', 'CREW', 'STAIRS', 'WC', 'LUGGAGE', 'VOID'];
/** Fixtures a passenger can walk through. Everything else blocks movement. */
export const WALKABLE_FIXTURES = new Set(['DOOR', 'STAIRS']);
export const SEAT_FEATURES = [
    'EXTRA_LEGROOM',
    'EMERGENCY_EXIT_ROW',
    'ACCESSIBLE',
    'CHARGING',
    'FOLD_UP',
    'NEAR_DOOR',
    'NEAR_WC',
];
export const DEFAULT_FARE_TIER = 'STANDARD';
export function defaultUnitFor(type) {
    return type === 'SLEEPER' ? 'BERTH' : 'SEAT';
}
//# sourceMappingURL=types.js.map