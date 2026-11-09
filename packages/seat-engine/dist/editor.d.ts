import type { DeckId, FixtureKind, Layout, LayoutIssue, Seat, SeatType } from './types.js';
import { type LabelScheme } from './labels.js';
import { forEachCell } from './grid.js';
/**
 * Headless editor state for the BusCon seat-layout studio. The UI only draws
 * and dispatches; every rule (overlap, bounds, undo, relabel) lives here and is
 * identical to what the API enforces on save.
 */
export interface EditorState {
    layout: Layout;
    past: Layout[];
    future: Layout[];
    issues: LayoutIssue[];
    /** Why the last action was refused, or null. */
    error: string | null;
    autoLabel: LabelScheme | null;
}
export type EditorAction = {
    type: 'REPLACE';
    layout: Layout;
} | {
    type: 'SET_AUTO_LABEL';
    scheme: LabelScheme | null;
} | {
    type: 'SET_DECK_SIZE';
    deck: DeckId;
    rows: number;
    cols: number;
} | {
    type: 'ADD_DECK';
    deck: DeckId;
    rows: number;
    cols: number;
} | {
    type: 'REMOVE_DECK';
    deck: DeckId;
} | {
    type: 'RENAME_DECK';
    from: DeckId;
    to: DeckId;
} | {
    type: 'PLACE_SEAT';
    deck: DeckId;
    row: number;
    col: number;
    rowSpan?: number;
    colSpan?: number;
    seatType?: SeatType;
    capacity?: number;
} | {
    type: 'PLACE_FIXTURE';
    fixture: FixtureKind;
    deck: DeckId;
    row: number;
    col: number;
    rowSpan?: number;
    colSpan?: number;
} | {
    type: 'ERASE';
    deck: DeckId;
    row: number;
    col: number;
} | {
    type: 'UPDATE_SEAT';
    key: string;
    patch: Partial<Omit<Seat, 'key'>>;
} | {
    type: 'MOVE_SEAT';
    key: string;
    row: number;
    col: number;
    deck?: DeckId;
} | {
    type: 'RELABEL';
    scheme: LabelScheme;
} | {
    type: 'UNDO';
} | {
    type: 'REDO';
};
export declare function createEditor(layout: Layout, autoLabel?: LabelScheme | null): EditorState;
export declare function editorReducer(state: EditorState, action: EditorAction): EditorState;
/** What is at a grid cell (for hover / selection in the studio). */
export declare function whatIsAt(layout: Layout, deck: DeckId, row: number, col: number): {
    seat?: Seat;
    fixture?: Layout['fixtures'][number];
};
export { forEachCell };
