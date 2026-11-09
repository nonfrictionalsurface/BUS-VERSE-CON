import type { Deck, DeckId, Fixture, Layout, Seat } from './types.js';
export interface Rect {
    deck: DeckId;
    row: number;
    col: number;
    rowSpan: number;
    colSpan: number;
}
export declare const cellId: (deck: DeckId, row: number, col: number) => string;
export declare function forEachCell(r: Rect, fn: (row: number, col: number) => void): void;
export declare function deckById(layout: Layout, id: DeckId): Deck | undefined;
export declare function inBounds(deck: Deck, row: number, col: number): boolean;
export interface Overlap {
    deck: DeckId;
    row: number;
    col: number;
    a: string;
    b: string;
}
export interface Occupancy {
    seatAt: Map<string, Seat>;
    fixtureAt: Map<string, Fixture>;
    overlaps: Overlap[];
}
export declare function buildOccupancy(layout: Layout): Occupancy;
/** Walkable floor = inside the grid, no seat, and either empty or a door/stairs. */
export declare function isFloor(occ: Occupancy, deck: Deck, row: number, col: number): boolean;
