import type { Layout } from './types.js';
export type SeatField = 'label' | 'deck' | 'row' | 'col' | 'rowSpan' | 'colSpan' | 'type' | 'unit' | 'capacity' | 'sale' | 'femaleOnly' | 'fareTier' | 'features';
/** Changing any of these changes what a booking means. The rest is cosmetic. */
export declare const IDENTITY_FIELDS: readonly SeatField[];
export interface SeatChange {
    key: string;
    fields: SeatField[];
    identity: boolean;
}
export interface LayoutDiff {
    added: string[];
    removed: string[];
    changed: SeatChange[];
    unchanged: number;
    fixturesChanged: boolean;
    decksChanged: boolean;
}
/** Compare two layouts by seat key. `prev = null` means a brand-new layout. */
export declare function diffLayouts(prev: Layout | null, next: Layout): LayoutDiff;
/** Seats whose bookings/locks would be disturbed by this change. */
export declare function affectedKeys(diff: LayoutDiff): string[];
