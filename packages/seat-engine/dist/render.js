import { DECK_TITLES } from "./types.js";
import { analyzeSeats } from "./geometry.js";
import { compareSeats } from "./labels.js";
export const DEFAULT_RENDER = {
    cellW: 44,
    cellH: 44,
    gap: 8,
    aisleW: 22,
    aisleH: 16,
    typeHeight: { SEATER: 1, SEMI_SLEEPER: 1.15, SLEEPER: 1.45 },
};
function tracks(layout, deck, o) {
    const colSeat = new Array(deck.cols).fill(false);
    const rowFactor = new Array(deck.rows).fill(0);
    const rowCovered = new Array(deck.rows).fill(false);
    for (const s of layout.seats) {
        if (s.deck !== deck.id)
            continue;
        for (let c = s.col; c < s.col + s.colSpan && c < deck.cols; c++)
            if (c >= 0)
                colSeat[c] = true;
        if (s.rowSpan === 1) {
            if (s.row >= 0 && s.row < deck.rows)
                rowFactor[s.row] = Math.max(rowFactor[s.row] ?? 0, o.typeHeight[s.type]);
        }
        else {
            for (let r = s.row; r < s.row + s.rowSpan && r < deck.rows; r++)
                if (r >= 0)
                    rowCovered[r] = true;
        }
    }
    for (const f of layout.fixtures) {
        if (f.deck !== deck.id)
            continue;
        for (let r = f.row; r < f.row + f.rowSpan && r < deck.rows; r++)
            if (r >= 0)
                rowCovered[r] = true;
    }
    return {
        colW: colSeat.map((has) => (has ? o.cellW : o.aisleW)),
        rowH: rowFactor.map((f, r) => (f > 0 ? o.cellH * f : rowCovered[r] ? o.cellH : o.aisleH)),
    };
}
const offsets = (sizes, gap) => {
    const out = [];
    let at = 0;
    for (const s of sizes) {
        out.push(at);
        at += s + gap;
    }
    return out;
};
const span = (sizes, from, count, gap) => {
    let total = 0;
    for (let i = from; i < from + count; i++)
        total += sizes[i] ?? 0;
    return total + Math.max(0, count - 1) * gap;
};
/**
 * Turn any layout into absolute rectangles. Column/row sizes come from what is
 * actually in the track (seat = full size, empty = aisle), so 2+2, 3+2, 1+1,
 * sleepers, double berths and rear benches all work with no special cases.
 */
export function buildRenderPlan(layout, options = {}) {
    const o = { ...DEFAULT_RENDER, ...options, typeHeight: { ...DEFAULT_RENDER.typeHeight, ...(options.typeHeight ?? {}) } };
    const geo = analyzeSeats(layout);
    const order = new Map();
    [...layout.seats].sort(compareSeats).forEach((s, i) => order.set(s.key, i));
    const decks = layout.decks.map((deck) => {
        const { colW, rowH } = tracks(layout, deck, o);
        const colX = offsets(colW, o.gap);
        const rowY = offsets(rowH, o.gap);
        const seats = layout.seats
            .filter((s) => s.deck === deck.id)
            .map((s) => {
            const g = geo.get(s.key);
            return {
                kind: 'seat',
                key: s.key,
                label: s.label,
                deck: s.deck,
                x: colX[s.col] ?? 0,
                y: rowY[s.row] ?? 0,
                w: span(colW, s.col, s.colSpan, o.gap),
                h: span(rowH, s.row, s.rowSpan, o.gap),
                type: s.type,
                unit: s.unit,
                capacity: s.capacity,
                femaleOnly: s.femaleOnly,
                features: s.features,
                window: g?.window ?? false,
                aisleSide: g?.aisleSide ?? false,
                middle: g?.middle ?? false,
                order: order.get(s.key) ?? 0,
            };
        });
        const fixtures = layout.fixtures
            .filter((f) => f.deck === deck.id)
            .map((f) => ({
            kind: 'fixture',
            fixture: f.fixture,
            label: f.label,
            deck: f.deck,
            x: colX[f.col] ?? 0,
            y: rowY[f.row] ?? 0,
            w: span(colW, f.col, f.colSpan, o.gap),
            h: span(rowH, f.row, f.rowSpan, o.gap),
        }));
        return {
            id: deck.id,
            title: DECK_TITLES[deck.id],
            width: span(colW, 0, deck.cols, o.gap),
            height: span(rowH, 0, deck.rows, o.gap),
            seats,
            fixtures,
            colX,
            colW,
            rowY,
            rowH,
        };
    });
    return {
        decks,
        width: Math.max(0, ...decks.map((d) => d.width)),
        height: Math.max(0, ...decks.map((d) => d.height)),
        options: o,
    };
}
/** Shrink the plan to fit `maxWidth` (never below `minScale`, so touch targets stay usable). */
export function fitToWidth(layout, maxWidth, base = {}, minScale = 0.8) {
    const start = buildRenderPlan(layout, base).options;
    const natural = buildRenderPlan(layout, start).width;
    if (natural <= 0 || natural <= maxWidth)
        return { options: start, scale: 1, overflow: false };
    const wanted = maxWidth / natural;
    const scale = Math.max(minScale, wanted);
    const options = {
        ...start,
        cellW: start.cellW * scale,
        cellH: start.cellH * scale,
        gap: start.gap * scale,
        aisleW: start.aisleW * scale,
        aisleH: start.aisleH * scale,
    };
    return { options, scale, overflow: wanted < minScale };
}
/** Pointer position -> grid cell. For editors and canvas-style renderers. */
export function cellAt(deck, x, y) {
    const find = (pos, starts, sizes) => {
        for (let i = 0; i < starts.length; i++) {
            const s = starts[i] ?? 0;
            if (pos >= s && pos <= s + (sizes[i] ?? 0))
                return i;
        }
        return -1;
    };
    const col = find(x, deck.colX, deck.colW);
    const row = find(y, deck.rowY, deck.rowH);
    return col < 0 || row < 0 ? null : { row, col };
}
//# sourceMappingURL=render.js.map