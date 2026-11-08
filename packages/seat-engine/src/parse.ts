import type { Deck, Fixture, Layout, LayoutIssue, Seat } from './types.ts';
import {
  DECK_IDS,
  DECK_ORDER,
  DEFAULT_FARE_TIER,
  FIXTURE_KINDS,
  LAYOUT_VERSION,
  SALE_MODES,
  SEAT_FEATURES,
  SEAT_TYPES,
  UNIT_KINDS,
  defaultUnitFor,
  type DeckId,
  type FixtureKind,
  type SaleMode,
  type SeatFeature,
  type SeatType,
  type UnitKind,
} from './types.ts';
import { compareFixtures, compareSeats } from './labels.ts';

export const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,15}$/;
export const LABEL_RE = /^[A-Za-z0-9][A-Za-z0-9._ -]{0,7}$/;
export const TIER_RE = /^[A-Z0-9_]{1,16}$/;

export interface ParseResult {
  layout: Layout | null;
  issues: LayoutIssue[];
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);
const oneOf = <T extends string>(list: readonly T[], x: unknown): x is T => typeof x === 'string' && (list as readonly string[]).includes(x);

const FIXTURE_LABELS: Record<FixtureKind, string> = {
  DOOR: 'DOOR',
  DRIVER: 'DRIVER',
  CREW: 'CREW',
  STAIRS: 'STAIRS',
  WC: 'WC',
  LUGGAGE: 'LUGGAGE',
  VOID: '',
};

/**
 * Structural parse: accepts loose input (optional fields, missing defaults),
 * returns a fully normalised Layout. Semantic rules live in validate.ts.
 */
export function parseLayout(input: unknown): ParseResult {
  const issues: LayoutIssue[] = [];
  const err = (message: string): void => {
    issues.push({ code: 'SCHEMA', severity: 'error', message });
  };
  if (!isObj(input)) {
    err('Layout must be an object');
    return { layout: null, issues };
  }
  if (input.v !== LAYOUT_VERSION) err(`Unsupported layout version (expected v: ${LAYOUT_VERSION})`);

  const decks: Deck[] = [];
  if (!Array.isArray(input.decks)) err('decks must be an array');
  else {
    input.decks.forEach((d: unknown, i: number) => {
      if (!isObj(d) || !oneOf(DECK_IDS, d.id) || !isInt(d.rows) || !isInt(d.cols)) {
        err(`decks[${i}] must be { id, rows, cols }`);
        return;
      }
      decks.push({ id: d.id, rows: d.rows, cols: d.cols });
    });
  }

  const seats: Seat[] = [];
  if (!Array.isArray(input.seats)) err('seats must be an array');
  else {
    input.seats.forEach((s: unknown, i: number) => {
      const at = `seats[${i}]`;
      if (!isObj(s)) return err(`${at} must be an object`);
      if (typeof s.key !== 'string') return err(`${at}.key must be a string`);
      if (typeof s.label !== 'string') return err(`${at}.label must be a string`);
      if (!oneOf(DECK_IDS, s.deck)) return err(`${at}.deck is invalid`);
      if (!isInt(s.row) || !isInt(s.col)) return err(`${at}.row/col must be integers`);
      if (!oneOf(SEAT_TYPES, s.type)) return err(`${at}.type is invalid`);
      const rowSpan = s.rowSpan === undefined ? 1 : s.rowSpan;
      const colSpan = s.colSpan === undefined ? 1 : s.colSpan;
      if (!isInt(rowSpan) || !isInt(colSpan)) return err(`${at}.rowSpan/colSpan must be integers`);
      const type: SeatType = s.type;
      const unit: UnitKind = s.unit === undefined ? defaultUnitFor(type) : oneOf(UNIT_KINDS, s.unit) ? s.unit : defaultUnitFor(type);
      if (s.unit !== undefined && !oneOf(UNIT_KINDS, s.unit)) return err(`${at}.unit is invalid`);
      const capacity = s.capacity === undefined ? 1 : s.capacity;
      if (!isInt(capacity)) return err(`${at}.capacity must be an integer`);
      if (s.sale !== undefined && !oneOf(SALE_MODES, s.sale)) return err(`${at}.sale is invalid`);
      const sale: SaleMode = s.sale === undefined ? 'WHOLE' : (s.sale as SaleMode);
      if (s.fareTier !== undefined && typeof s.fareTier !== 'string') return err(`${at}.fareTier must be a string`);
      const features: SeatFeature[] = [];
      if (s.features !== undefined) {
        if (!Array.isArray(s.features)) return err(`${at}.features must be an array`);
        for (const f of s.features as unknown[]) {
          if (!oneOf(SEAT_FEATURES, f)) return err(`${at}.features has unknown value`);
          if (!features.includes(f)) features.push(f);
        }
      }
      seats.push({
        key: s.key.trim(),
        label: s.label.trim(),
        deck: s.deck,
        row: s.row,
        col: s.col,
        rowSpan,
        colSpan,
        type,
        unit,
        capacity,
        sale,
        femaleOnly: s.femaleOnly === true,
        fareTier: typeof s.fareTier === 'string' ? s.fareTier : DEFAULT_FARE_TIER,
        features: features.sort(),
      });
    });
  }

  const fixtures: Fixture[] = [];
  const rawFixtures = input.fixtures === undefined ? [] : input.fixtures;
  if (!Array.isArray(rawFixtures)) err('fixtures must be an array');
  else {
    rawFixtures.forEach((f: unknown, i: number) => {
      const at = `fixtures[${i}]`;
      if (!isObj(f)) return err(`${at} must be an object`);
      if (!oneOf(FIXTURE_KINDS, f.fixture)) return err(`${at}.fixture is invalid`);
      if (!oneOf(DECK_IDS, f.deck)) return err(`${at}.deck is invalid`);
      if (!isInt(f.row) || !isInt(f.col)) return err(`${at}.row/col must be integers`);
      const rowSpan = f.rowSpan === undefined ? 1 : f.rowSpan;
      const colSpan = f.colSpan === undefined ? 1 : f.colSpan;
      if (!isInt(rowSpan) || !isInt(colSpan)) return err(`${at}.rowSpan/colSpan must be integers`);
      fixtures.push({
        fixture: f.fixture,
        deck: f.deck,
        row: f.row,
        col: f.col,
        rowSpan,
        colSpan,
        label: typeof f.label === 'string' ? f.label.trim() : FIXTURE_LABELS[f.fixture],
      });
    });
  }

  let meta = { name: '', preset: '' };
  if (input.meta !== undefined) {
    if (!isObj(input.meta)) err('meta must be an object');
    else
      meta = {
        name: typeof input.meta.name === 'string' ? input.meta.name : '',
        preset: typeof input.meta.preset === 'string' ? input.meta.preset : '',
      };
  }

  if (issues.length > 0) return { layout: null, issues };
  return { layout: normalizeLayout({ v: LAYOUT_VERSION, decks, seats, fixtures, meta }), issues };
}

/** Canonical ordering (decks, seats, fixtures). Every producer of a Layout should end with this. */
export function normalizeLayout(layout: Layout): Layout {
  return {
    ...layout,
    decks: [...layout.decks].sort((a, b) => DECK_ORDER[a.id] - DECK_ORDER[b.id]),
    seats: [...layout.seats].sort(compareSeats),
    fixtures: [...layout.fixtures].sort(compareFixtures),
  };
}

/** Strip defaults for storage / transport. parseLayout() restores them. */
export function compactLayout(layout: Layout): Record<string, unknown> {
  return {
    v: layout.v,
    decks: layout.decks,
    seats: layout.seats.map((s) => {
      const o: Record<string, unknown> = { key: s.key, label: s.label, deck: s.deck, row: s.row, col: s.col, type: s.type };
      if (s.rowSpan !== 1) o.rowSpan = s.rowSpan;
      if (s.colSpan !== 1) o.colSpan = s.colSpan;
      if (s.unit !== defaultUnitFor(s.type)) o.unit = s.unit;
      if (s.capacity !== 1) o.capacity = s.capacity;
      if (s.sale !== 'WHOLE') o.sale = s.sale;
      if (s.femaleOnly) o.femaleOnly = true;
      if (s.fareTier !== DEFAULT_FARE_TIER) o.fareTier = s.fareTier;
      if (s.features.length > 0) o.features = s.features;
      return o;
    }),
    fixtures: layout.fixtures.map((f) => {
      const o: Record<string, unknown> = { fixture: f.fixture, deck: f.deck, row: f.row, col: f.col };
      if (f.rowSpan !== 1) o.rowSpan = f.rowSpan;
      if (f.colSpan !== 1) o.colSpan = f.colSpan;
      if (f.label !== FIXTURE_LABELS[f.fixture]) o.label = f.label;
      return o;
    }),
    meta: layout.meta,
  };
}

/** Deterministic JSON for equality checks and change detection. */
export function layoutFingerprint(layout: Layout): string {
  return JSON.stringify(compactLayout(layout));
}

export type { DeckId };
