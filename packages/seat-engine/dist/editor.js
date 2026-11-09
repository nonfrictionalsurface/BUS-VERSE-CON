import { DEFAULT_FARE_TIER, defaultUnitFor } from "./types.js";
import { relabel, nextKey } from "./labels.js";
import { buildOccupancy, cellId, forEachCell } from "./grid.js";
import { validateLayout } from "./validate.js";
import { normalizeLayout } from "./parse.js";
const HISTORY = 100;
const BLOCKING = new Set([
    'OUT_OF_BOUNDS', 'OVERLAP', 'DUPLICATE_KEY', 'DUPLICATE_LABEL', 'BAD_SPAN', 'BAD_DECKS', 'GRID_TOO_LARGE',
    'BAD_KEY', 'BAD_LABEL', 'BAD_CAPACITY', 'TYPE_UNIT_MISMATCH',
]);
const clone = (l) => JSON.parse(JSON.stringify(l));
export function createEditor(layout, autoLabel = null) {
    return { layout, past: [], future: [], issues: validateLayout(layout), error: null, autoLabel };
}
function commit(state, candidate) {
    const next = normalizeLayout(state.autoLabel ? relabel(candidate, state.autoLabel) : candidate);
    const issues = validateLayout(next);
    const known = new Set(state.issues.filter((i) => i.severity === 'error' && BLOCKING.has(i.code)).map((i) => i.message));
    const fresh = issues.find((i) => i.severity === 'error' && BLOCKING.has(i.code) && !known.has(i.message));
    if (fresh)
        return { ...state, error: fresh.message };
    return { ...state, layout: next, past: [...state.past.slice(-(HISTORY - 1)), state.layout], future: [], issues, error: null };
}
const covers = (r, row, col) => row >= r.row && row < r.row + r.rowSpan && col >= r.col && col < r.col + r.colSpan;
export function editorReducer(state, action) {
    const l = clone(state.layout);
    switch (action.type) {
        case 'REPLACE':
            return commit({ ...state, error: null }, clone(action.layout));
        case 'SET_AUTO_LABEL':
            return { ...state, autoLabel: action.scheme, error: null };
        case 'UNDO': {
            const prev = state.past[state.past.length - 1];
            if (!prev)
                return state;
            return { ...state, layout: prev, past: state.past.slice(0, -1), future: [state.layout, ...state.future], issues: validateLayout(prev), error: null };
        }
        case 'REDO': {
            const nxt = state.future[0];
            if (!nxt)
                return state;
            return { ...state, layout: nxt, past: [...state.past, state.layout], future: state.future.slice(1), issues: validateLayout(nxt), error: null };
        }
        case 'SET_DECK_SIZE': {
            const d = l.decks.find((x) => x.id === action.deck);
            if (!d)
                return { ...state, error: `Deck ${action.deck} does not exist` };
            d.rows = action.rows;
            d.cols = action.cols;
            return commit(state, l);
        }
        case 'ADD_DECK':
            l.decks.push({ id: action.deck, rows: action.rows, cols: action.cols });
            return commit(state, l);
        case 'REMOVE_DECK': {
            if (l.seats.some((s) => s.deck === action.deck))
                return { ...state, error: `Deck ${action.deck} still has seats` };
            l.decks = l.decks.filter((d) => d.id !== action.deck);
            l.fixtures = l.fixtures.filter((f) => f.deck !== action.deck);
            return commit(state, l);
        }
        case 'RENAME_DECK': {
            for (const d of l.decks)
                if (d.id === action.from)
                    d.id = action.to;
            for (const s of l.seats)
                if (s.deck === action.from)
                    s.deck = action.to;
            for (const f of l.fixtures)
                if (f.deck === action.from)
                    f.deck = action.to;
            return commit(state, l);
        }
        case 'PLACE_SEAT': {
            const type = action.seatType ?? 'SEATER';
            const key = nextKey(l);
            l.seats.push({
                key, label: key, deck: action.deck, row: action.row, col: action.col,
                rowSpan: action.rowSpan ?? 1, colSpan: action.colSpan ?? 1, type, unit: defaultUnitFor(type),
                capacity: action.capacity ?? 1, sale: 'WHOLE', femaleOnly: false, fareTier: DEFAULT_FARE_TIER, features: [],
            });
            return commit(state, l);
        }
        case 'PLACE_FIXTURE':
            l.fixtures.push({
                fixture: action.fixture, deck: action.deck, row: action.row, col: action.col,
                rowSpan: action.rowSpan ?? 1, colSpan: action.colSpan ?? 1, label: action.fixture === 'VOID' ? '' : action.fixture,
            });
            return commit(state, l);
        case 'ERASE': {
            const before = l.seats.length + l.fixtures.length;
            l.seats = l.seats.filter((s) => !(s.deck === action.deck && covers(s, action.row, action.col)));
            l.fixtures = l.fixtures.filter((f) => !(f.deck === action.deck && covers(f, action.row, action.col)));
            return l.seats.length + l.fixtures.length === before ? state : commit(state, l);
        }
        case 'UPDATE_SEAT': {
            const s = l.seats.find((x) => x.key === action.key);
            if (!s)
                return { ...state, error: `Seat ${action.key} not found` };
            Object.assign(s, action.patch);
            return commit(state, l);
        }
        case 'MOVE_SEAT': {
            const s = l.seats.find((x) => x.key === action.key);
            if (!s)
                return { ...state, error: `Seat ${action.key} not found` };
            s.row = action.row;
            s.col = action.col;
            if (action.deck)
                s.deck = action.deck;
            return commit(state, l);
        }
        case 'RELABEL':
            return commit({ ...state, error: null }, relabel(l, action.scheme));
    }
}
/** What is at a grid cell (for hover / selection in the studio). */
export function whatIsAt(layout, deck, row, col) {
    const occ = buildOccupancy(layout);
    const id = cellId(deck, row, col);
    const seat = occ.seatAt.get(id);
    const fixture = occ.fixtureAt.get(id);
    return { ...(seat ? { seat } : {}), ...(fixture ? { fixture } : {}) };
}
export { forEachCell };
//# sourceMappingURL=editor.js.map