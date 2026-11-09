import type { DeckId, FixtureKind, Layout, SeatType } from './types.js';
import { type LabelScheme } from './labels.js';
export interface SeaterOptions {
    /** Seats left of the aisle (1-4). */
    left: number;
    /** Seats right of the aisle (1-4). */
    right: number;
    /** Full seat rows (not counting the cab row or the rear bench). */
    rows: number;
    type?: SeatType;
    /** Seats in a final row that spans the whole width (the aisle cell becomes a seat). */
    rearBench?: number;
    /** Driver + door row at the front. Default true. */
    cab?: boolean;
    /** Stairs marker in the front row (double-deckers). Gives the front row even without a cab. */
    stairs?: boolean;
    /** Where the driver sits. India = RIGHT, door on the opposite side. */
    driverSide?: 'LEFT' | 'RIGHT';
    deck?: DeckId;
    /** Leave grid cells empty: `row` counts seat rows from 0, `col` is the grid column. */
    skip?: Array<{
        row: number;
        col: number;
    }>;
    /** Extra fixtures in grid coordinates (mid doors, toilets, luggage...). */
    fixtures?: Array<{
        fixture: FixtureKind;
        row: number;
        col: number;
        rowSpan?: number;
        colSpan?: number;
    }>;
    /** Extra seats in grid coordinates (co-driver seat...). */
    extraSeats?: Array<{
        row: number;
        col: number;
    }>;
    labels?: LabelScheme;
}
/** 2+2, 3+2, 2+1, 1+1 ... single-deck seater or semi-sleeper. */
export declare function buildSeaterLayout(o: SeaterOptions, name?: string, preset?: string): Layout;
export interface SleeperOptions {
    /** 1 or 2 single berths, or one DOUBLE berth (2 columns wide, holds 2). */
    left: 1 | 2 | 'DOUBLE';
    right: 1 | 2 | 'DOUBLE';
    /** Berth rows per deck. Each berth is two grid rows long. */
    berthRows: number;
    decks?: Array<'LOWER' | 'UPPER'>;
    driverSide?: 'LEFT' | 'RIGHT';
    labels?: LabelScheme;
}
/** Lower/upper berth coach, e.g. 2+1 sleeper. */
export declare function buildSleeperLayout(o: SleeperOptions, name?: string, preset?: string): Layout;
export interface DoubleDeckerOptions {
    left: number;
    right: number;
    lowerRows: number;
    upperRows: number;
    type?: SeatType;
    labels?: LabelScheme;
}
/** Two-floor seater with a staircase. */
export declare function buildDoubleDeckerLayout(o: DoubleDeckerOptions, name?: string, preset?: string): Layout;
export interface PresetInfo {
    id: string;
    name: string;
    description: string;
    build: () => Layout;
}
export declare const PRESETS: readonly PresetInfo[];
export declare const getPreset: (id: string) => PresetInfo | undefined;
