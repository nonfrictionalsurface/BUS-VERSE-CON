import { WALKABLE_FIXTURES } from "./types.js";
export const cellId = (deck, row, col) => `${deck}:${row}:${col}`;
export function forEachCell(r, fn) {
    for (let i = 0; i < r.rowSpan; i++)
        for (let j = 0; j < r.colSpan; j++)
            fn(r.row + i, r.col + j);
}
export function deckById(layout, id) {
    return layout.decks.find((d) => d.id === id);
}
export function inBounds(deck, row, col) {
    return row >= 0 && col >= 0 && row < deck.rows && col < deck.cols;
}
const fixtureName = (f) => `${f.fixture}@${f.row},${f.col}`;
export function buildOccupancy(layout) {
    const seatAt = new Map();
    const fixtureAt = new Map();
    const overlaps = [];
    for (const s of layout.seats) {
        forEachCell(s, (row, col) => {
            const id = cellId(s.deck, row, col);
            const prev = seatAt.get(id);
            if (prev)
                overlaps.push({ deck: s.deck, row, col, a: prev.key, b: s.key });
            else
                seatAt.set(id, s);
        });
    }
    for (const f of layout.fixtures) {
        forEachCell(f, (row, col) => {
            const id = cellId(f.deck, row, col);
            const s = seatAt.get(id);
            if (s)
                overlaps.push({ deck: f.deck, row, col, a: s.key, b: fixtureName(f) });
            const prev = fixtureAt.get(id);
            if (prev)
                overlaps.push({ deck: f.deck, row, col, a: fixtureName(prev), b: fixtureName(f) });
            else
                fixtureAt.set(id, f);
        });
    }
    return { seatAt, fixtureAt, overlaps };
}
/** Walkable floor = inside the grid, no seat, and either empty or a door/stairs. */
export function isFloor(occ, deck, row, col) {
    if (!inBounds(deck, row, col))
        return false;
    const id = cellId(deck.id, row, col);
    if (occ.seatAt.has(id))
        return false;
    const f = occ.fixtureAt.get(id);
    return !f || WALKABLE_FIXTURES.has(f.fixture);
}
//# sourceMappingURL=grid.js.map