import type { Layout } from './types.js';
export interface SeatGeometry {
    /** Next to the bus wall (grid edge or a blocking fixture) on at least one side. */
    window: boolean;
    /** Next to walkable floor on at least one side. */
    aisleSide: boolean;
    /** Seat on both sides, no wall and no aisle (the middle of a 3-seat run). */
    middle: boolean;
    /** Keys of seats immediately to the left / right (no floor between). */
    left: string[];
    right: string[];
    /** 1-based rank of the seat's start row among seat rows of its deck. */
    rowRank: number;
    front: boolean;
    rear: boolean;
}
export declare function analyzeSeats(layout: Layout): Map<string, SeatGeometry>;
export interface Neighbor {
    key: string;
    /** 3 = side by side, 2 = across a one-cell aisle or stacked upper/lower, 1 = front/back. */
    strength: 1 | 2 | 3;
}
/** Which seats are next to which. Used for "sit together" and access checks. */
export declare function adjacency(layout: Layout): Map<string, Neighbor[]>;
