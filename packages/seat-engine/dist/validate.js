import { LIMITS } from "./types.js";
import { KEY_RE, LABEL_RE, TIER_RE, parseLayout } from "./parse.js";
import { buildOccupancy, cellId, deckById, inBounds, isFloor } from "./grid.js";
import { adjacency } from "./geometry.js";
export const hasErrors = (issues) => issues.some((i) => i.severity === 'error');
export function validateLayout(layout, opts = {}) {
    const issues = [];
    const add = (code, severity, message, extra = {}) => {
        issues.push({ code, severity, message, ...extra });
    };
    const ids = layout.decks.map((d) => d.id);
    if (ids.length < 1 || ids.length > LIMITS.maxDecks)
        add('BAD_DECKS', 'error', `A layout needs 1 to ${LIMITS.maxDecks} decks`);
    if (new Set(ids).size !== ids.length)
        add('BAD_DECKS', 'error', 'Duplicate deck id');
    if (ids.includes('MAIN') && ids.length > 1)
        add('BAD_DECKS', 'error', 'MAIN cannot be combined with LOWER/UPPER');
    if (ids.includes('UPPER') && !ids.includes('LOWER'))
        add('BAD_DECKS', 'error', 'An UPPER deck needs a LOWER deck');
    for (const d of layout.decks) {
        if (d.rows < 1 || d.cols < 1 || d.rows > LIMITS.maxRows || d.cols > LIMITS.maxCols) {
            add('GRID_TOO_LARGE', 'error', `Deck ${d.id} must be between 1x1 and ${LIMITS.maxRows}x${LIMITS.maxCols} cells`, { deck: d.id });
        }
    }
    const keySeen = new Set();
    const labelSeen = new Set();
    for (const s of layout.seats) {
        const at = { keys: [s.key], deck: s.deck, row: s.row, col: s.col };
        if (!KEY_RE.test(s.key))
            add('BAD_KEY', 'error', `Invalid seat key "${s.key}"`, { keys: [s.key] });
        if (!LABEL_RE.test(s.label))
            add('BAD_LABEL', 'error', `Invalid seat label "${s.label}" (1-${LIMITS.maxLabelLength} letters, digits, . _ - or space)`, at);
        if (keySeen.has(s.key))
            add('DUPLICATE_KEY', 'error', `Duplicate seat key "${s.key}"`, { keys: [s.key] });
        keySeen.add(s.key);
        const lower = s.label.toLowerCase();
        if (labelSeen.has(lower))
            add('DUPLICATE_LABEL', 'error', `Duplicate seat label "${s.label}"`, at);
        labelSeen.add(lower);
        const deck = deckById(layout, s.deck);
        if (!deck) {
            add('BAD_DECKS', 'error', `Seat ${s.label} is on deck ${s.deck}, which does not exist`, at);
            continue;
        }
        if (s.rowSpan < 1 || s.colSpan < 1 || s.rowSpan > LIMITS.maxSpan || s.colSpan > LIMITS.maxSpan) {
            add('BAD_SPAN', 'error', `Seat ${s.label} span must be 1-${LIMITS.maxSpan}`, at);
        }
        else if (s.row < 0 || s.col < 0 || s.row + s.rowSpan > deck.rows || s.col + s.colSpan > deck.cols) {
            add('OUT_OF_BOUNDS', 'error', `Seat ${s.label} is outside the ${deck.rows}x${deck.cols} grid`, at);
        }
        if (s.capacity < 1 || s.capacity > LIMITS.maxCapacity)
            add('BAD_CAPACITY', 'error', `Seat ${s.label} capacity must be 1-${LIMITS.maxCapacity}`, at);
        else if (s.capacity > 1 && s.unit === 'SEAT')
            add('BAD_CAPACITY', 'error', `Seat ${s.label}: a seat holds one person, use a berth for more`, at);
        if ((s.type === 'SLEEPER') !== (s.unit === 'BERTH') && s.unit !== 'CABIN') {
            add('TYPE_UNIT_MISMATCH', 'error', `Seat ${s.label}: ${s.type} does not match unit ${s.unit}`, at);
        }
        if (!TIER_RE.test(s.fareTier))
            add('BAD_KEY', 'error', `Seat ${s.label}: invalid fare tier "${s.fareTier}"`, at);
        if (s.features.length > LIMITS.maxFeatures)
            add('BAD_KEY', 'error', `Seat ${s.label}: too many features`, at);
        if (s.sale === 'EITHER') {
            if (s.capacity < 2)
                add('BAD_CAPACITY', 'error', `Seat ${s.label}: sale EITHER needs capacity of 2 or more`, at);
            if (!opts.allowEitherSale)
                add('FEATURE_DISABLED', 'error', `Seat ${s.label}: sale mode EITHER is not enabled yet`, at);
        }
        if (s.unit === 'CABIN' && !opts.allowCabins)
            add('FEATURE_DISABLED', 'error', `Seat ${s.label}: cabins are not enabled yet`, at);
    }
    for (const f of layout.fixtures) {
        const deck = deckById(layout, f.deck);
        const at = { deck: f.deck, row: f.row, col: f.col };
        if (!deck)
            add('BAD_DECKS', 'error', `Fixture ${f.fixture} is on missing deck ${f.deck}`, at);
        else if (f.rowSpan < 1 || f.colSpan < 1 || f.rowSpan > LIMITS.maxRows || f.colSpan > LIMITS.maxCols)
            add('BAD_SPAN', 'error', `Fixture ${f.fixture} has an invalid span`, at);
        else if (f.row < 0 || f.col < 0 || f.row + f.rowSpan > deck.rows || f.col + f.colSpan > deck.cols)
            add('OUT_OF_BOUNDS', 'error', `Fixture ${f.fixture} is outside the grid`, at);
    }
    const reported = new Set();
    for (const o of buildOccupancy(layout).overlaps) {
        const id = `${o.a}|${o.b}`;
        if (reported.has(id))
            continue;
        reported.add(id);
        add('OVERLAP', 'error', `${o.a} overlaps ${o.b}`, { deck: o.deck, row: o.row, col: o.col, keys: [o.a, o.b] });
    }
    const units = layout.seats.length;
    if (units === 0)
        add('NO_SEATS', 'error', 'A layout needs at least one seat');
    if (units > LIMITS.maxUnits)
        add('TOO_MANY_SEATS', 'error', `At most ${LIMITS.maxUnits} seats are supported`);
    if (opts.expectedUnits !== undefined && opts.expectedUnits !== units) {
        add('CAPACITY_MISMATCH', 'error', `Seat count (${units}) does not match bus capacity (${opts.expectedUnits})`);
    }
    for (const d of layout.decks) {
        if (!layout.seats.some((s) => s.deck === d.id))
            add('DECK_EMPTY', 'warning', `Deck ${d.id} has no seats`, { deck: d.id });
    }
    const mode = opts.access ?? 'warn';
    if (mode !== 'off' && !hasErrors(issues))
        checkAccess(layout, mode === 'strict' ? 'error' : 'warning', add);
    return issues;
}
/** Seat accessibility: floor reachable from a door/stairs, then at most two side-by-side hops. */
function checkAccess(layout, severity, add) {
    const occ = buildOccupancy(layout);
    const adj = adjacency(layout);
    for (const deck of layout.decks) {
        const doors = [];
        const stairs = [];
        const floor = [];
        for (let r = 0; r < deck.rows; r++) {
            for (let c = 0; c < deck.cols; c++) {
                if (!isFloor(occ, deck, r, c))
                    continue;
                floor.push([r, c]);
                const f = occ.fixtureAt.get(cellId(deck.id, r, c));
                if (f?.fixture === 'DOOR')
                    doors.push([r, c]);
                if (f?.fixture === 'STAIRS')
                    stairs.push([r, c]);
            }
        }
        const seeds = doors.length > 0 ? doors : stairs.length > 0 ? stairs : floor;
        if (doors.length === 0 && stairs.length === 0 && deck.id !== 'UPPER') {
            add('NO_ACCESS_POINT', 'warning', `Deck ${deck.id} has no door or stairs, so walk-through access was not checked`, { deck: deck.id });
        }
        const reached = new Set();
        const queue = [];
        for (const [r, c] of seeds) {
            reached.add(cellId(deck.id, r, c));
            queue.push([r, c]);
        }
        for (let i = 0; i < queue.length; i++) {
            const [r, c] = queue[i] ?? [0, 0];
            for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nr = r + dr;
                const nc = c + dc;
                const id = cellId(deck.id, nr, nc);
                if (reached.has(id) || !inBounds(deck, nr, nc) || !isFloor(occ, deck, nr, nc))
                    continue;
                reached.add(id);
                queue.push([nr, nc]);
            }
        }
        const seats = layout.seats.filter((s) => s.deck === deck.id && s.unit === 'SEAT');
        const hops = new Map();
        const touches = (s) => {
            for (let i = 0; i < s.rowSpan; i++) {
                if (reached.has(cellId(deck.id, s.row + i, s.col - 1)) || reached.has(cellId(deck.id, s.row + i, s.col + s.colSpan)))
                    return true;
            }
            for (let j = 0; j < s.colSpan; j++) {
                if (reached.has(cellId(deck.id, s.row - 1, s.col + j)) || reached.has(cellId(deck.id, s.row + s.rowSpan, s.col + j)))
                    return true;
            }
            return false;
        };
        const frontier = [];
        for (const s of seats) {
            if (touches(s)) {
                hops.set(s.key, 0);
                frontier.push(s.key);
            }
        }
        for (let i = 0; i < frontier.length; i++) {
            const key = frontier[i] ?? '';
            const h = hops.get(key) ?? 0;
            if (h >= 2)
                continue;
            for (const n of adj.get(key) ?? []) {
                if (n.strength !== 3 || hops.has(n.key))
                    continue;
                const target = seats.find((x) => x.key === n.key);
                if (!target)
                    continue;
                hops.set(n.key, h + 1);
                frontier.push(n.key);
            }
        }
        for (const s of seats) {
            if (!hops.has(s.key)) {
                add('UNREACHABLE_SEAT', severity, `Seat ${s.label} cannot be reached from a door or aisle`, { keys: [s.key], deck: s.deck, row: s.row, col: s.col });
            }
        }
    }
}
/** parse + validate in one call. Use this at every trust boundary (API input, studio save). */
export function checkLayout(input, opts = {}) {
    const parsed = parseLayout(input);
    if (!parsed.layout)
        return { ok: false, layout: null, issues: parsed.issues };
    const issues = validateLayout(parsed.layout, opts);
    return { ok: !hasErrors(issues), layout: parsed.layout, issues };
}
export function layoutStats(layout) {
    const byDeck = {};
    const byType = {};
    let passengerCapacity = 0;
    let femaleOnly = 0;
    for (const s of layout.seats) {
        byDeck[s.deck] = (byDeck[s.deck] ?? 0) + 1;
        byType[s.type] = (byType[s.type] ?? 0) + 1;
        passengerCapacity += s.capacity;
        if (s.femaleOnly)
            femaleOnly++;
    }
    return { units: layout.seats.length, passengerCapacity, byDeck, byType, femaleOnly };
}
//# sourceMappingURL=validate.js.map