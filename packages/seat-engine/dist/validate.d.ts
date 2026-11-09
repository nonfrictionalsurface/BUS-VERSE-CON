import type { Layout, LayoutIssue } from './types.js';
export interface ValidateOptions {
    /** bus.capacity - must equal the number of bookable units. */
    expectedUnits?: number;
    /** Walk-through checks. 'off' skips them, 'warn' reports warnings, 'strict' reports errors. */
    access?: 'off' | 'warn' | 'strict';
    /** Phase 2 switches. */
    allowCabins?: boolean;
    allowEitherSale?: boolean;
}
export declare const hasErrors: (issues: readonly LayoutIssue[]) => boolean;
export declare function validateLayout(layout: Layout, opts?: ValidateOptions): LayoutIssue[];
export interface CheckResult {
    ok: boolean;
    layout: Layout | null;
    issues: LayoutIssue[];
}
/** parse + validate in one call. Use this at every trust boundary (API input, studio save). */
export declare function checkLayout(input: unknown, opts?: ValidateOptions): CheckResult;
export interface LayoutStats {
    units: number;
    passengerCapacity: number;
    byDeck: Record<string, number>;
    byType: Record<string, number>;
    femaleOnly: number;
}
export declare function layoutStats(layout: Layout): LayoutStats;
