import type { Layout, LayoutIssue } from './types.js';
import { type DeckId } from './types.js';
export declare const KEY_RE: RegExp;
export declare const LABEL_RE: RegExp;
export declare const TIER_RE: RegExp;
export interface ParseResult {
    layout: Layout | null;
    issues: LayoutIssue[];
}
/**
 * Structural parse: accepts loose input (optional fields, missing defaults),
 * returns a fully normalised Layout. Semantic rules live in validate.ts.
 */
export declare function parseLayout(input: unknown): ParseResult;
/** Canonical ordering (decks, seats, fixtures). Every producer of a Layout should end with this. */
export declare function normalizeLayout(layout: Layout): Layout;
/** Strip defaults for storage / transport. parseLayout() restores them. */
export declare function compactLayout(layout: Layout): Record<string, unknown>;
/** Deterministic JSON for equality checks and change detection. */
export declare function layoutFingerprint(layout: Layout): string;
export type { DeckId };
