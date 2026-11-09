import type { DeckId, Layout, RuntimeMap, SeatStatus } from './types.js';
/** Server limit for one booking (createBookingSchema: passengers max 8). */
export declare const MAX_SEATS_PER_BOOKING = 8;
export declare const isSelectable: (status: SeatStatus) => boolean;
/** Unknown keys are BLOCKED until the next refetch: never let a user tap a seat we cannot see state for. */
export declare const statusOf: (runtime: RuntimeMap, key: string) => SeatStatus;
export interface AvailabilitySummary {
    total: number;
    available: number;
    booked: number;
    locked: number;
    mine: number;
    blocked: number;
    byDeck: Record<string, number>;
}
export declare function summarize(layout: Layout, runtime: RuntimeMap): AvailabilitySummary;
export interface SelectionIssue {
    code: 'MAX_SEATS' | 'UNKNOWN_SEAT' | 'SPLIT_GROUP';
    severity: 'error' | 'warning';
    message: string;
}
/** Connected groups of selected seats (side by side, across one aisle, stacked, or one row behind another). */
export declare function selectionGroups(layout: Layout, selected: readonly string[]): string[][];
export declare function validateSelection(layout: Layout, selected: readonly string[], opts?: {
    maxSeats?: number;
}): SelectionIssue[];
export interface SuggestOptions {
    prefer?: 'WINDOW' | 'AISLE' | 'ANY';
    deck?: DeckId;
    exclude?: readonly string[];
}
/**
 * "Seat us together": greedy best group of `count` AVAILABLE seats that are
 * adjacent (side by side > across the aisle/stacked > front/back).
 * Deterministic: ties resolve to the front-left-most seats.
 */
export declare function suggestTogether(layout: Layout, runtime: RuntimeMap, count: number, opts?: SuggestOptions): string[] | null;
