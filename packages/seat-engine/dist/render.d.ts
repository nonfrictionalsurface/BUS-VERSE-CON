import type { DeckId, FixtureKind, Layout, SeatFeature, SeatType, UnitKind } from './types.js';
export interface RenderOptions {
    cellW: number;
    cellH: number;
    gap: number;
    /** Width of a column that holds no seat (the aisle). */
    aisleW: number;
    /** Height of a row that holds no seat. */
    aisleH: number;
    /** Height multiplier for single-row seats, so legacy 1x1 sleepers still draw taller. */
    typeHeight: Record<SeatType, number>;
}
export declare const DEFAULT_RENDER: RenderOptions;
export interface PlanSeat {
    kind: 'seat';
    key: string;
    label: string;
    deck: DeckId;
    x: number;
    y: number;
    w: number;
    h: number;
    type: SeatType;
    unit: UnitKind;
    capacity: number;
    femaleOnly: boolean;
    features: SeatFeature[];
    window: boolean;
    aisleSide: boolean;
    middle: boolean;
    /** Reading order, front to back then left to right. Use for screen readers. */
    order: number;
}
export interface PlanFixture {
    kind: 'fixture';
    fixture: FixtureKind;
    label: string;
    deck: DeckId;
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface DeckPlan {
    id: DeckId;
    title: string;
    width: number;
    height: number;
    seats: PlanSeat[];
    fixtures: PlanFixture[];
    colX: number[];
    colW: number[];
    rowY: number[];
    rowH: number[];
}
export interface RenderPlan {
    decks: DeckPlan[];
    width: number;
    height: number;
    options: RenderOptions;
}
/**
 * Turn any layout into absolute rectangles. Column/row sizes come from what is
 * actually in the track (seat = full size, empty = aisle), so 2+2, 3+2, 1+1,
 * sleepers, double berths and rear benches all work with no special cases.
 */
export declare function buildRenderPlan(layout: Layout, options?: Partial<RenderOptions>): RenderPlan;
export interface FitResult {
    options: RenderOptions;
    scale: number;
    /** True when even the minimum scale does not fit: wrap the map in a horizontal scroller. */
    overflow: boolean;
}
/** Shrink the plan to fit `maxWidth` (never below `minScale`, so touch targets stay usable). */
export declare function fitToWidth(layout: Layout, maxWidth: number, base?: Partial<RenderOptions>, minScale?: number): FitResult;
/** Pointer position -> grid cell. For editors and canvas-style renderers. */
export declare function cellAt(deck: DeckPlan, x: number, y: number): {
    row: number;
    col: number;
} | null;
