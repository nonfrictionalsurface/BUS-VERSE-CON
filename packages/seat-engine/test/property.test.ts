import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.ts';

/** Small deterministic PRNG so a failing seed can be replayed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomLayout(seed: number): E.Layout {
  const r = rng(seed);
  const int = (lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1));
  const double = r() < 0.3;
  const decks: E.Layout['decks'] = double
    ? [{ id: 'LOWER', rows: int(2, 14), cols: int(2, 8) }, { id: 'UPPER', rows: int(2, 14), cols: int(2, 8) }]
    : [{ id: 'MAIN', rows: int(1, 16), cols: int(1, 9) }];
  const seats: E.Seat[] = [];
  const fixtures: E.Fixture[] = [];
  const taken = new Set<string>();
  const free = (deck: E.DeckId, row: number, col: number, rs: number, cs: number): boolean => {
    for (let i = 0; i < rs; i++) for (let j = 0; j < cs; j++) if (taken.has(`${deck}:${row + i}:${col + j}`)) return false;
    return true;
  };
  const take = (deck: E.DeckId, row: number, col: number, rs: number, cs: number): void => {
    for (let i = 0; i < rs; i++) for (let j = 0; j < cs; j++) taken.add(`${deck}:${row + i}:${col + j}`);
  };
  for (const d of decks) {
    for (let n = int(0, 4); n > 0; n--) {
      const kinds: E.FixtureKind[] = ['DOOR', 'DRIVER', 'WC', 'LUGGAGE', 'VOID', 'STAIRS', 'CREW'];
      const kind = kinds[int(0, kinds.length - 1)] ?? 'VOID';
      const row = int(0, d.rows - 1);
      const col = int(0, d.cols - 1);
      if (!free(d.id, row, col, 1, 1)) continue;
      take(d.id, row, col, 1, 1);
      fixtures.push({ fixture: kind, deck: d.id, row, col, rowSpan: 1, colSpan: 1, label: kind });
    }
    for (let attempts = int(5, 80); attempts > 0; attempts--) {
      const sleeper = r() < 0.35;
      const rs = Math.min(d.rows, sleeper ? int(1, 2) : 1);
      const cs = Math.min(d.cols, r() < 0.15 ? 2 : 1);
      const row = int(0, d.rows - rs);
      const col = int(0, d.cols - cs);
      if (!free(d.id, row, col, rs, cs)) continue;
      take(d.id, row, col, rs, cs);
      const key = `K${seats.length + 1}`;
      seats.push({
        key, label: key, deck: d.id, row, col, rowSpan: rs, colSpan: cs,
        type: sleeper ? 'SLEEPER' : r() < 0.3 ? 'SEMI_SLEEPER' : 'SEATER',
        unit: sleeper ? 'BERTH' : 'SEAT', capacity: sleeper && cs === 2 ? 2 : 1, sale: 'WHOLE',
        femaleOnly: r() < 0.1, fareTier: 'STANDARD', features: r() < 0.1 ? ['CHARGING'] : [],
      });
    }
  }
  return E.normalizeLayout({ v: 2, decks, seats, fixtures, meta: { name: '', preset: '' } });
}

const SEEDS = Array.from({ length: 400 }, (_, i) => i + 1);

describe('property tests over 400 random layouts', () => {
  test('generated layouts are structurally valid and survive storage round trips', () => {
    for (const seed of SEEDS) {
      const l = randomLayout(seed);
      const errs = E.validateLayout(l, { access: 'off' }).filter((i) => i.severity === 'error' && i.code !== 'NO_SEATS');
      assert.deepEqual(errs, [], `seed ${seed}`);
      const stored = JSON.parse(JSON.stringify(E.compactLayout(l)));
      const back = E.parseLayout(stored).layout;
      assert.deepEqual(back, l, `seed ${seed}`);
      assert.equal(E.layoutFingerprint(back as E.Layout), E.layoutFingerprint(l));
    }
  });

  test('render plan: seat rectangles never overlap and always fit inside the deck', () => {
    for (const seed of SEEDS) {
      const l = randomLayout(seed);
      const plan = E.buildRenderPlan(l);
      assert.equal(plan.decks.length, l.decks.length);
      for (const deck of plan.decks) {
        assert.equal(deck.seats.length, l.seats.filter((s) => s.deck === deck.id).length);
        for (const r of [...deck.seats, ...deck.fixtures]) {
          assert.ok(r.x >= -1e-9 && r.y >= -1e-9 && r.x + r.w <= deck.width + 1e-6 && r.y + r.h <= deck.height + 1e-6, `seed ${seed} bounds`);
          assert.ok(r.w > 0 && r.h > 0, `seed ${seed} size`);
        }
        const s = deck.seats;
        for (let i = 0; i < s.length; i++) {
          for (let j = i + 1; j < s.length; j++) {
            const a = s[i];
            const b = s[j];
            if (!a || !b) continue;
            const apart = a.x + a.w <= b.x + 1e-6 || b.x + b.w <= a.x + 1e-6 || a.y + a.h <= b.y + 1e-6 || b.y + b.h <= a.y + 1e-6;
            assert.ok(apart, `seed ${seed}: ${a.key}/${b.key}`);
          }
        }
      }
    }
  });

  test('geometry + adjacency are total, symmetric and never throw', () => {
    for (const seed of SEEDS) {
      const l = randomLayout(seed);
      const geo = E.analyzeSeats(l);
      assert.equal(geo.size, l.seats.length);
      const adj = E.adjacency(l);
      for (const [a, ns] of adj) {
        for (const n of ns) assert.equal(adj.get(n.key)?.find((x) => x.key === a)?.strength, n.strength, `seed ${seed}`);
      }
      E.validateLayout(l, { access: 'strict' });
    }
  });

  test('suggestTogether returns distinct, available, requested-size groups', () => {
    for (const seed of SEEDS.slice(0, 150)) {
      const l = randomLayout(seed);
      if (l.seats.length === 0) continue;
      const r = rng(seed * 7);
      const runtime: Record<string, E.SeatRuntime> = {};
      for (const s of l.seats) runtime[s.key] = { status: r() < 0.4 ? 'BOOKED' : 'AVAILABLE' };
      const count = 1 + Math.floor(r() * 4);
      const group = E.suggestTogether(l, runtime, count);
      if (!group) continue;
      assert.equal(group.length, count, `seed ${seed}`);
      assert.equal(new Set(group).size, count);
      assert.ok(group.every((k) => runtime[k]?.status === 'AVAILABLE'));
      if (count > 1) assert.equal(E.selectionGroups(l, group).length, 1, `seed ${seed} stays together`);
    }
  });

  test('legacy v1 grids round trip exactly', () => {
    for (const seed of SEEDS.slice(0, 200)) {
      const r = rng(seed);
      const rows = 1 + Math.floor(r() * 20);
      const cols = 1 + Math.floor(r() * 6);
      const seats: E.LegacySeatInput[] = [];
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) if (r() < 0.8) seats.push({ seatRow: E.rowLetters(i), seatColumn: j + 1, seatType: r() < 0.3 ? 'SLEEPER' : 'SEATER', isFemaleOnly: r() < 0.1 });
      if (seats.length === 0) seats.push({ seatRow: 'A', seatColumn: 1, seatType: 'SEATER', isFemaleOnly: false });
      const l = E.fromLegacy({ rowsCount: rows, columnsCount: cols, seats });
      assert.deepEqual(E.validateLayout(l, { access: 'off' }), [], `seed ${seed}`);
      const out = E.toLegacy(l);
      assert.deepEqual(out.seats.map((s) => [s.seatRow, s.seatColumn, s.seatType, s.isFemaleOnly]), seats.map((s) => [s.seatRow, s.seatColumn, s.seatType, s.isFemaleOnly]));
      assert.equal(out.rowsCount, rows);
      assert.equal(E.legacyAisleCells(l).length, rows * cols - seats.length);
    }
  });

  test('editor never leaves a layout with blocking errors', () => {
    for (const seed of SEEDS.slice(0, 120)) {
      const r = rng(seed);
      let st = E.createEditor(E.buildSeaterLayout({ left: 2, right: 2, rows: 4 }));
      for (let step = 0; step < 60; step++) {
        const rows = st.layout.decks[0]?.rows ?? 1;
        const cols = st.layout.decks[0]?.cols ?? 1;
        const roll = r();
        const row = Math.floor(r() * (rows + 1));
        const col = Math.floor(r() * (cols + 1));
        st = E.editorReducer(
          st,
          roll < 0.4 ? { type: 'PLACE_SEAT', deck: 'MAIN', row, col, rowSpan: 1 + Math.floor(r() * 2), colSpan: 1 + Math.floor(r() * 2) }
            : roll < 0.55 ? { type: 'ERASE', deck: 'MAIN', row, col }
            : roll < 0.7 ? { type: 'PLACE_FIXTURE', fixture: 'WC', deck: 'MAIN', row, col }
            : roll < 0.8 ? { type: 'UNDO' }
            : roll < 0.9 ? { type: 'REDO' }
            : { type: 'RELABEL', scheme: 'ROW_LETTER' },
        );
        const blocking = E.validateLayout(st.layout, { access: 'off' }).filter((i) => i.severity === 'error');
        assert.deepEqual(blocking, [], `seed ${seed} step ${step}`);
      }
    }
  });
});
