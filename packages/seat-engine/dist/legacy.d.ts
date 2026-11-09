import type { Layout, SeatType } from './types.js';
/** Shape stored by the v1 engine: rows A.., columns 1.., single deck, one cell per seat. */
export interface LegacySeatInput {
    seatRow: string;
    seatColumn: number;
    seatLabel?: string | null;
    seatType?: string | null;
    isFemaleOnly?: boolean | null;
    key?: string | null;
}
export interface LegacyLayoutInput {
    rowsCount: number;
    columnsCount: number;
    seats: LegacySeatInput[];
}
/** Lossless upgrade of a v1 layout. Seat key = existing key, else label, so database identity is preserved. */
export declare function fromLegacy(input: LegacyLayoutInput): Layout;
export interface LegacySeatOut {
    key: string;
    seatRow: string;
    seatColumn: number;
    seatLabel: string;
    seatType: SeatType;
    isFemaleOnly: boolean;
}
export interface LegacyLayoutOut {
    rowsCount: number;
    columnsCount: number;
    seats: LegacySeatOut[];
}
/**
 * Legacy columns for old clients. Decks are stacked top to bottom so
 * (seatRow, seatColumn) stays unique even for double-deckers.
 */
export declare function toLegacy(layout: Layout): LegacyLayoutOut;
/** Every walkable, seat-free cell of the first deck, 1-based. This is what the v1 "aisleCells" meant. */
export declare function legacyAisleCells(layout: Layout): Array<{
    row: number;
    column: number;
}>;
/** Same cells with the letter row used by the operator DTO. */
export declare function legacyAisleCellsLetters(layout: Layout): Array<{
    row: string;
    column: number;
}>;
