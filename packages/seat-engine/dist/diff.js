/** Changing any of these changes what a booking means. The rest is cosmetic. */
export const IDENTITY_FIELDS = ['deck', 'row', 'col', 'rowSpan', 'colSpan', 'type', 'unit', 'capacity', 'sale'];
const ALL_FIELDS = [...IDENTITY_FIELDS, 'label', 'femaleOnly', 'fareTier', 'features'];
const same = (a, b, f) => JSON.stringify(a[f]) === JSON.stringify(b[f]);
/** Compare two layouts by seat key. `prev = null` means a brand-new layout. */
export function diffLayouts(prev, next) {
    const before = new Map((prev?.seats ?? []).map((s) => [s.key, s]));
    const after = new Map(next.seats.map((s) => [s.key, s]));
    const added = [];
    const removed = [];
    const changed = [];
    let unchanged = 0;
    for (const [key, s] of after) {
        const old = before.get(key);
        if (!old) {
            added.push(key);
            continue;
        }
        const fields = ALL_FIELDS.filter((f) => !same(old, s, f));
        if (fields.length === 0)
            unchanged++;
        else
            changed.push({ key, fields, identity: fields.some((f) => IDENTITY_FIELDS.includes(f)) });
    }
    for (const key of before.keys())
        if (!after.has(key))
            removed.push(key);
    return {
        added,
        removed,
        changed,
        unchanged,
        fixturesChanged: JSON.stringify(prev?.fixtures ?? []) !== JSON.stringify(next.fixtures),
        decksChanged: JSON.stringify(prev?.decks ?? []) !== JSON.stringify(next.decks),
    };
}
/** Seats whose bookings/locks would be disturbed by this change. */
export function affectedKeys(diff) {
    return [...diff.removed, ...diff.changed.filter((c) => c.identity).map((c) => c.key)];
}
//# sourceMappingURL=diff.js.map