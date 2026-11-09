import type { Fixture, Layout, Seat } from './types.js';
/** 0 -> A, 25 -> Z, 26 -> AA ... */
export declare function rowLetters(index: number): string;
/** Inverse of rowLetters. Returns -1 for anything that is not A-Z letters. */
export declare function letterIndex(letters: string): number;
export type LabelScheme = 'ROW_LETTER' | 'SEQUENTIAL' | 'DECK_SEQUENTIAL';
export declare function compareSeats(a: Seat, b: Seat): number;
export declare function compareFixtures(a: Fixture, b: Fixture): number;
/**
 * Re-label every seat. Keys never change, so seat identity (and therefore
 * locks/bookings) survives relabelling.
 *  - ROW_LETTER:      1A 1B | 1C 1D  (row number + letter, left to right)
 *  - SEQUENTIAL:      1 2 3 ... N
 *  - DECK_SEQUENTIAL: L1 L2 ... U1 U2 ...
 */
export declare function relabel(layout: Layout, scheme: LabelScheme): Layout;
/** Smallest unused key of the form S1, S2, ... */
export declare function nextKey(layout: Layout, prefix?: string): string;
/** Make keys human readable: key := label (sanitised). Only for brand-new layouts. */
export declare function keysFromLabels(layout: Layout): Layout;
