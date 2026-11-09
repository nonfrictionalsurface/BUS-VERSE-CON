import { DEFAULT_FARE_TIER, SEAT_TYPES, WALKABLE_FIXTURES, defaultUnitFor } from "./types.js";
import { letterIndex, rowLetters, compareSeats } from "./labels.js";
import { buildOccupancy, cellId } from "./grid.js";
const isSeatType = (x) => typeof x === 'string' && SEAT_TYPES.includes(x);
/** Lossless upgrade of a v1 layout. Seat key = existing key, else label, so database identity is preserved. */
export function fromLegacy(input) {
    const seats = input.seats.map((s) => {
        const label = (s.seatLabel ?? `${s.seatRow.toUpperCase()}${s.seatColumn}`).trim();
        const type = isSeatType(s.seatType) ? s.seatType : 'SEATER';
        return {
            key: s.key && s.key.length > 0 ? s.key : label,
            label,
            deck: 'MAIN',
            row: letterIndex(s.seatRow),
            col: s.seatColumn - 1,
            rowSpan: 1,
            colSpan: 1,
            type,
            unit: defaultUnitFor(type),
            capacity: 1,
            sale: 'WHOLE',
            femaleOnly: s.isFemaleOnly === true,
            fareTier: DEFAULT_FARE_TIER,
            features: [],
        };
    });
    seats.sort(compareSeats);
    return {
        v: 2,
        decks: [{ id: 'MAIN', rows: input.rowsCount, cols: input.columnsCount }],
        seats,
        fixtures: [],
        meta: { name: '', preset: '' },
    };
}
/**
 * Legacy columns for old clients. Decks are stacked top to bottom so
 * (seatRow, seatColumn) stays unique even for double-deckers.
 */
export function toLegacy(layout) {
    const offset = new Map();
    let acc = 0;
    for (const d of layout.decks) {
        offset.set(d.id, acc);
        acc += d.rows;
    }
    return {
        rowsCount: acc,
        columnsCount: Math.max(0, ...layout.decks.map((d) => d.cols)),
        seats: [...layout.seats].sort(compareSeats).map((s) => ({
            key: s.key,
            seatRow: rowLetters((offset.get(s.deck) ?? 0) + s.row),
            seatColumn: s.col + 1,
            seatLabel: s.label,
            seatType: s.type,
            isFemaleOnly: s.femaleOnly,
        })),
    };
}
/** Every walkable, seat-free cell of the first deck, 1-based. This is what the v1 "aisleCells" meant. */
export function legacyAisleCells(layout) {
    const deck = layout.decks[0];
    if (!deck)
        return [];
    const occ = buildOccupancy(layout);
    const out = [];
    for (let r = 0; r < deck.rows; r++) {
        for (let c = 0; c < deck.cols; c++) {
            const id = cellId(deck.id, r, c);
            if (occ.seatAt.has(id))
                continue;
            const f = occ.fixtureAt.get(id);
            if (f && !WALKABLE_FIXTURES.has(f.fixture))
                continue;
            out.push({ row: r + 1, column: c + 1 });
        }
    }
    return out;
}
/** Same cells with the letter row used by the operator DTO. */
export function legacyAisleCellsLetters(layout) {
    return legacyAisleCells(layout).map((c) => ({ row: rowLetters(c.row - 1), column: c.column }));
}
//# sourceMappingURL=legacy.js.map