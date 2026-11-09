import { DECK_ORDER } from "./types.js";
/** 0 -> A, 25 -> Z, 26 -> AA ... */
export function rowLetters(index) {
    let n = index;
    let out = '';
    do {
        out = String.fromCharCode(65 + (n % 26)) + out;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return out;
}
/** Inverse of rowLetters. Returns -1 for anything that is not A-Z letters. */
export function letterIndex(letters) {
    if (!/^[A-Za-z]+$/.test(letters))
        return -1;
    let n = 0;
    for (const ch of letters.toUpperCase())
        n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
}
export function compareSeats(a, b) {
    return (DECK_ORDER[a.deck] - DECK_ORDER[b.deck] ||
        a.row - b.row ||
        a.col - b.col ||
        a.key.localeCompare(b.key));
}
export function compareFixtures(a, b) {
    return (DECK_ORDER[a.deck] - DECK_ORDER[b.deck] ||
        a.row - b.row ||
        a.col - b.col ||
        a.fixture.localeCompare(b.fixture));
}
const DECK_PREFIX = { MAIN: '', LOWER: 'L', UPPER: 'U' };
/**
 * Re-label every seat. Keys never change, so seat identity (and therefore
 * locks/bookings) survives relabelling.
 *  - ROW_LETTER:      1A 1B | 1C 1D  (row number + letter, left to right)
 *  - SEQUENTIAL:      1 2 3 ... N
 *  - DECK_SEQUENTIAL: L1 L2 ... U1 U2 ...
 */
export function relabel(layout, scheme) {
    const multiDeck = layout.decks.length > 1;
    const labels = new Map();
    if (scheme === 'SEQUENTIAL') {
        [...layout.seats].sort(compareSeats).forEach((s, i) => labels.set(s.key, String(i + 1)));
    }
    else if (scheme === 'DECK_SEQUENTIAL') {
        const counters = new Map();
        for (const s of [...layout.seats].sort(compareSeats)) {
            const n = (counters.get(s.deck) ?? 0) + 1;
            counters.set(s.deck, n);
            labels.set(s.key, `${DECK_PREFIX[s.deck]}${n}`);
        }
    }
    else {
        for (const deck of layout.decks) {
            const inDeck = layout.seats.filter((s) => s.deck === deck.id).sort(compareSeats);
            const rowsUsed = [...new Set(inDeck.map((s) => s.row))].sort((a, b) => a - b);
            for (const [rowIdx, row] of rowsUsed.entries()) {
                const inRow = inDeck.filter((s) => s.row === row);
                inRow.forEach((s, i) => {
                    const prefix = multiDeck ? DECK_PREFIX[deck.id] : '';
                    labels.set(s.key, `${prefix}${rowIdx + 1}${rowLetters(i)}`);
                });
            }
        }
    }
    return { ...layout, seats: layout.seats.map((s) => ({ ...s, label: labels.get(s.key) ?? s.label })) };
}
/** Smallest unused key of the form S1, S2, ... */
export function nextKey(layout, prefix = 'S') {
    const used = new Set(layout.seats.map((s) => s.key));
    for (let n = 1;; n++)
        if (!used.has(`${prefix}${n}`))
            return `${prefix}${n}`;
}
/** Make keys human readable: key := label (sanitised). Only for brand-new layouts. */
export function keysFromLabels(layout) {
    return { ...layout, seats: layout.seats.map((s) => ({ ...s, key: s.label })) };
}
//# sourceMappingURL=labels.js.map