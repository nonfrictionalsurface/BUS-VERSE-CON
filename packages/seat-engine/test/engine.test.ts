import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.ts';

const preset = (id: string): E.Layout => {
  const p = E.getPreset(id);
  if (!p) throw new Error(`no preset ${id}`);
  return p.build();
};

const mk = (rows: number, cols: number, seats: Array<Partial<E.Seat> & { key: string; row: number; col: number }>, fixtures: E.Layout['fixtures'] = []): E.Layout => ({
  v: 2,
  decks: [{ id: 'MAIN', rows, cols }],
  seats: seats.map((s) => ({
    label: s.key, deck: 'MAIN', rowSpan: 1, colSpan: 1, type: 'SEATER', unit: 'SEAT', capacity: 1, sale: 'WHOLE',
    femaleOnly: false, fareTier: 'STANDARD', features: [], ...s,
  })) as E.Seat[],
  fixtures,
  meta: { name: '', preset: '' },
});

const codes = (issues: E.LayoutIssue[], severity?: 'error' | 'warning'): string[] =>
  issues.filter((i) => !severity || i.severity === severity).map((i) => i.code);

describe('labels', () => {
  test('rowLetters / letterIndex round trip', () => {
    assert.equal(E.rowLetters(0), 'A');
    assert.equal(E.rowLetters(25), 'Z');
    assert.equal(E.rowLetters(26), 'AA');
    assert.equal(E.rowLetters(701), 'ZZ');
    assert.equal(E.rowLetters(702), 'AAA');
    for (let i = 0; i < 1000; i++) assert.equal(E.letterIndex(E.rowLetters(i)), i);
    assert.equal(E.letterIndex('A1'), -1);
    assert.equal(E.letterIndex(''), -1);
  });

  test('relabel schemes never change keys', () => {
    const l = preset('seater-2x2-40');
    assert.equal(l.seats[0]?.label, '1A');
    assert.equal(l.seats[3]?.label, '1D');
    assert.equal(l.seats[39]?.label, '10D');
    const seq = E.relabel(l, 'SEQUENTIAL');
    assert.deepEqual(seq.seats.map((s) => s.label).slice(0, 3), ['1', '2', '3']);
    assert.equal(seq.seats[39]?.label, '40');
    assert.deepEqual(seq.seats.map((s) => s.key), l.seats.map((s) => s.key));
    const s2 = preset('sleeper-2x1-36');
    assert.ok(s2.seats.some((s) => s.label === 'L1') && s2.seats.some((s) => s.label === 'U1'));
  });

  test('nextKey finds the first gap', () => {
    const l = mk(2, 2, [{ key: 'S1', row: 0, col: 0 }, { key: 'S3', row: 0, col: 1 }]);
    assert.equal(E.nextKey(l), 'S2');
  });
});

describe('parse / compact', () => {
  test('defaults are filled in', () => {
    const r = E.parseLayout({ v: 2, decks: [{ id: 'MAIN', rows: 1, cols: 1 }], seats: [{ key: 'A', label: 'A', deck: 'MAIN', row: 0, col: 0, type: 'SLEEPER' }] });
    assert.ok(r.layout);
    const s = r.layout.seats[0];
    assert.equal(s?.unit, 'BERTH');
    assert.equal(s?.capacity, 1);
    assert.equal(s?.rowSpan, 1);
    assert.equal(s?.fareTier, 'STANDARD');
    assert.deepEqual(r.layout.fixtures, []);
  });

  test('rejects garbage with SCHEMA errors and no layout', () => {
    for (const bad of [null, 5, 'x', [], { v: 1 }, { v: 2 }, { v: 2, decks: [], seats: [{ key: 1 }] }]) {
      const r = E.parseLayout(bad);
      assert.equal(r.layout, null);
      assert.ok(r.issues.length > 0 && r.issues.every((i) => i.code === 'SCHEMA'));
    }
  });

  test('compact -> parse is lossless for every preset', () => {
    for (const p of E.PRESETS) {
      const l = p.build();
      const back = E.parseLayout(JSON.parse(JSON.stringify(E.compactLayout(l))));
      assert.deepEqual(back.layout, l, p.id);
    }
  });

  test('compact drops defaults', () => {
    const c = E.compactLayout(mk(1, 1, [{ key: 'A', row: 0, col: 0 }])) as { seats: Array<Record<string, unknown>> };
    assert.deepEqual(Object.keys(c.seats[0] ?? {}).sort(), ['col', 'deck', 'key', 'label', 'row', 'type']);
  });
});

describe('validate', () => {
  test('clean layouts have no errors; a missing door is only a warning', () => {
    const l = mk(1, 3, [{ key: 'A', row: 0, col: 0 }, { key: 'B', row: 0, col: 2 }]);
    assert.deepEqual(E.validateLayout(l, { access: 'off' }), []);
    assert.deepEqual(codes(E.validateLayout(l)), ['NO_ACCESS_POINT']);
    assert.deepEqual(codes(E.validateLayout(l), 'error'), []);
  });

  test('overlap, bounds, duplicates', () => {
    const l = mk(2, 2, [
      { key: 'A', row: 0, col: 0, colSpan: 2 },
      { key: 'B', row: 0, col: 1 },
      { key: 'C', row: 5, col: 0 },
      { key: 'D', label: 'a', row: 1, col: 0 },
    ]);
    const c = codes(E.validateLayout(l), 'error');
    assert.ok(c.includes('OVERLAP'));
    assert.ok(c.includes('OUT_OF_BOUNDS'));
    assert.ok(c.includes('DUPLICATE_LABEL'));
    const dup = mk(1, 2, [{ key: 'A', row: 0, col: 0 }, { key: 'A', label: 'B', row: 0, col: 1 }]);
    assert.ok(codes(E.validateLayout(dup)).includes('DUPLICATE_KEY'));
  });

  test('bad label / key / span / capacity / type-unit', () => {
    const l = mk(4, 4, [
      { key: 'A', label: '', row: 0, col: 0 },
      { key: 'B', row: 1, col: 0, rowSpan: 9 },
      { key: 'C', row: 2, col: 0, capacity: 2 },
      { key: 'D', row: 3, col: 0, type: 'SLEEPER' },
    ]);
    const c = codes(E.validateLayout(l), 'error');
    for (const x of ['BAD_LABEL', 'BAD_SPAN', 'BAD_CAPACITY', 'TYPE_UNIT_MISMATCH']) assert.ok(c.includes(x), x);
  });

  test('deck rules', () => {
    const l = mk(2, 2, [{ key: 'A', row: 0, col: 0 }]);
    l.decks.push({ id: 'LOWER', rows: 2, cols: 2 });
    assert.ok(codes(E.validateLayout(l)).includes('BAD_DECKS'));
    const up: E.Layout = { ...mk(2, 2, []), decks: [{ id: 'UPPER', rows: 2, cols: 2 }] };
    assert.ok(codes(E.validateLayout(up)).includes('BAD_DECKS'));
    const big: E.Layout = { ...mk(2, 2, []), decks: [{ id: 'MAIN', rows: 99, cols: 2 }] };
    assert.ok(codes(E.validateLayout(big)).includes('GRID_TOO_LARGE'));
  });

  test('capacity must match the bus', () => {
    const l = mk(1, 2, [{ key: 'A', row: 0, col: 0 }]);
    assert.ok(codes(E.validateLayout(l, { expectedUnits: 2 })).includes('CAPACITY_MISMATCH'));
    assert.ok(!codes(E.validateLayout(l, { expectedUnits: 1 })).includes('CAPACITY_MISMATCH'));
    assert.ok(codes(E.validateLayout(mk(1, 1, []))).includes('NO_SEATS'));
  });

  test('Phase 2 features are gated', () => {
    const cabin = mk(2, 2, [{ key: 'A', row: 0, col: 0, rowSpan: 2, colSpan: 2, type: 'SLEEPER', unit: 'CABIN', capacity: 2 }]);
    assert.ok(codes(E.validateLayout(cabin)).includes('FEATURE_DISABLED'));
    assert.ok(!codes(E.validateLayout(cabin, { allowCabins: true })).includes('FEATURE_DISABLED'));
    const either = mk(1, 2, [{ key: 'A', row: 0, col: 0, colSpan: 2, type: 'SLEEPER', capacity: 2, sale: 'EITHER' }]);
    assert.ok(codes(E.validateLayout(either)).includes('FEATURE_DISABLED'));
    assert.ok(!codes(E.validateLayout(either, { allowEitherSale: true })).includes('FEATURE_DISABLED'));
  });

  test('access: no floor at all is reported, severity follows the mode', () => {
    const l = mk(1, 3, [{ key: 'A', row: 0, col: 0 }, { key: 'B', row: 0, col: 1 }, { key: 'C', row: 0, col: 2 }]);
    assert.deepEqual(codes(E.validateLayout(l, { access: 'strict' }), 'error'), ['UNREACHABLE_SEAT', 'UNREACHABLE_SEAT', 'UNREACHABLE_SEAT']);
    assert.deepEqual(codes(E.validateLayout(l, { access: 'warn' }), 'error'), []);
    assert.ok(codes(E.validateLayout(l, { access: 'warn' }), 'warning').includes('UNREACHABLE_SEAT'));
    assert.deepEqual(E.validateLayout(l, { access: 'off' }), []);
  });

  test('access: walk-through is limited to two seats deep', () => {
    const door: E.Layout['fixtures'] = [{ fixture: 'DOOR', deck: 'MAIN', row: 0, col: 0, rowSpan: 1, colSpan: 1, label: 'DOOR' }];
    const row = (n: number): E.Layout => mk(1, n + 1, Array.from({ length: n }, (_, c) => ({ key: `S${c}`, row: 0, col: c + 1 })), door);
    assert.deepEqual(codes(E.validateLayout(row(3), { access: 'strict' })), []);
    const six = E.validateLayout(row(6), { access: 'strict' });
    assert.deepEqual(six.map((i) => i.keys?.[0]), ['S3', 'S4', 'S5']);
    assert.ok(six.every((i) => i.code === 'UNREACHABLE_SEAT' && i.severity === 'error'));
  });

  test('access: a blocked aisle is detected from the door', () => {
    const l = mk(
      3, 3,
      [{ key: 'A', row: 2, col: 0 }, { key: 'B', row: 2, col: 2 }],
      [
        { fixture: 'DOOR', deck: 'MAIN', row: 0, col: 1, rowSpan: 1, colSpan: 1, label: 'DOOR' },
        { fixture: 'VOID', deck: 'MAIN', row: 1, col: 0, rowSpan: 1, colSpan: 3, label: '' },
      ],
    );
    assert.ok(codes(E.validateLayout(l, { access: 'strict' }), 'error').includes('UNREACHABLE_SEAT'));
  });

  test('checkLayout = parse + validate', () => {
    assert.equal(E.checkLayout('nope').ok, false);
    const r = E.checkLayout(E.compactLayout(preset('seater-2x2-40')), { expectedUnits: 40, access: 'strict' });
    assert.equal(r.ok, true);
    assert.deepEqual(r.issues, []);
  });

  test('stats', () => {
    const st = E.layoutStats(preset('sleeper-double-24'));
    assert.equal(st.units, 24);
    assert.equal(st.passengerCapacity, 36);
    assert.deepEqual(st.byDeck, { LOWER: 12, UPPER: 12 });
  });
});

describe('geometry', () => {
  test('3+2: window / middle / aisle flags', () => {
    const l = preset('seater-3x2-55');
    const g = E.analyzeSeats(l);
    const at = (label: string): E.SeatGeometry => {
      const s = l.seats.find((x) => x.label === label);
      const geo = s ? g.get(s.key) : undefined;
      if (!geo) throw new Error(label);
      return geo;
    };
    assert.equal(at('1A').window, true);
    assert.equal(at('1A').aisleSide, false);
    assert.equal(at('1B').middle, true);
    assert.equal(at('1C').aisleSide, true);
    assert.equal(at('1D').aisleSide, true);
    assert.equal(at('1E').window, true);
    assert.equal(at('1A').front, true);
    assert.equal(at('11A').rear, true);
  });

  test('adjacency strengths', () => {
    const l = preset('seater-2x2-40');
    const adj = E.adjacency(l);
    const key = (label: string): string => l.seats.find((s) => s.label === label)?.key ?? '';
    const s = (a: string, b: string): number => adj.get(key(a))?.find((n) => n.key === key(b))?.strength ?? 0;
    assert.equal(s('1A', '1B'), 3);
    assert.equal(s('1B', '1C'), 2);
    assert.equal(s('1A', '2A'), 1);
    assert.equal(s('1A', '1C'), 0);
  });

  test('upper and lower berths in the same bay are linked', () => {
    const l = preset('sleeper-2x1-36');
    const adj = E.adjacency(l);
    assert.equal(adj.get('L1')?.find((n) => n.key === 'U1')?.strength, 2);
  });

  test('window seats next to a blocking fixture count as window', () => {
    const l = mk(2, 3, [{ key: 'A', row: 1, col: 1 }], [{ fixture: 'WC', deck: 'MAIN', row: 1, col: 0, rowSpan: 1, colSpan: 1, label: 'WC' }]);
    assert.equal(E.analyzeSeats(l).get('A')?.window, true);
  });
});

describe('render plan', () => {
  test('2+2 geometry: slim aisle, exact pixel positions', () => {
    const p = E.buildRenderPlan(preset('seater-2x2-40'));
    const d = p.decks[0];
    assert.ok(d);
    assert.deepEqual(d.colX, [0, 52, 104, 134, 186]);
    assert.deepEqual(d.colW, [44, 44, 22, 44, 44]);
    assert.equal(d.width, 230);
    assert.equal(d.height, 11 * 44 + 10 * 8);
    const first = d.seats.find((s) => s.label === '1A');
    assert.deepEqual([first?.x, first?.y, first?.w, first?.h], [0, 52, 44, 44]);
  });

  test('sleeper berths are two rows tall, double berths two columns wide', () => {
    const s = E.buildRenderPlan(preset('sleeper-2x1-36')).decks[0]?.seats[0];
    assert.equal(s?.h, 44 * 2 + 8);
    const d = E.buildRenderPlan(preset('sleeper-double-24')).decks[0]?.seats.find((x) => x.capacity === 2);
    assert.equal(d?.w, 44 * 2 + 8);
  });

  test('legacy 1x1 sleepers still draw taller than seaters', () => {
    const l = mk(2, 1, [{ key: 'A', row: 0, col: 0, type: 'SLEEPER', unit: 'BERTH' }, { key: 'B', row: 1, col: 0 }]);
    const seats = E.buildRenderPlan(l).decks[0]?.seats ?? [];
    assert.ok((seats.find((s) => s.key === 'A')?.h ?? 0) > (seats.find((s) => s.key === 'B')?.h ?? 0));
  });

  test('every preset renders with disjoint, in-bounds rectangles', () => {
    for (const pr of E.PRESETS) {
      const plan = E.buildRenderPlan(pr.build());
      for (const deck of plan.decks) {
        const rects = [...deck.seats, ...deck.fixtures];
        for (const r of rects) {
          assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= deck.width + 1e-9 && r.y + r.h <= deck.height + 1e-9, `${pr.id} bounds`);
        }
        for (let i = 0; i < deck.seats.length; i++) {
          for (let j = i + 1; j < deck.seats.length; j++) {
            const a = deck.seats[i];
            const b = deck.seats[j];
            if (!a || !b) continue;
            const apart = a.x + a.w <= b.x + 1e-9 || b.x + b.w <= a.x + 1e-9 || a.y + a.h <= b.y + 1e-9 || b.y + b.h <= a.y + 1e-9;
            assert.ok(apart, `${pr.id}: ${a.label} overlaps ${b.label}`);
          }
        }
      }
    }
  });

  test('fitToWidth scales, and flags overflow below the minimum scale', () => {
    const l = preset('seater-3x2-55');
    assert.equal(E.fitToWidth(l, 400).scale, 1);
    const fit = E.fitToWidth(l, 250);
    assert.ok(fit.scale < 1 && fit.scale >= 0.8 && !fit.overflow);
    assert.ok(E.buildRenderPlan(l, fit.options).width <= 250 + 1e-9);
    const tiny = E.fitToWidth(l, 150);
    assert.equal(tiny.scale, 0.8);
    assert.equal(tiny.overflow, true);
  });

  test('cellAt maps pixels back to the grid', () => {
    const d = E.buildRenderPlan(preset('seater-2x2-40')).decks[0];
    assert.ok(d);
    assert.deepEqual(E.cellAt(d, 1, 53), { row: 1, col: 0 });
    assert.deepEqual(E.cellAt(d, 190, 53), { row: 1, col: 4 });
    assert.equal(E.cellAt(d, 9999, 1), null);
  });
});

describe('presets', () => {
  const expected: Record<string, number> = {
    'seater-2x2-40': 40, 'seater-2x2-49': 49, 'seater-3x2-55': 55, 'seater-2x1-30': 30, 'seater-1x1-18': 18,
    'semi-sleeper-2x2-45': 45, 'sleeper-2x1-36': 36, 'sleeper-2x1-30': 30, 'sleeper-double-24': 24,
    'minibus-2x1-16': 16, 'double-decker-2x2-72': 72,
  };

  test('every preset is strictly valid with zero issues and the advertised seat count', () => {
    assert.equal(E.PRESETS.length, Object.keys(expected).length);
    for (const p of E.PRESETS) {
      const r = E.checkLayout(E.compactLayout(p.build()), { access: 'strict', expectedUnits: expected[p.id] ?? -1 });
      assert.deepEqual(r.issues, [], p.id);
      assert.equal(r.ok, true, p.id);
    }
  });

  test('presets are deterministic', () => {
    for (const p of E.PRESETS) assert.deepEqual(p.build(), p.build());
  });

  test('double-decker has two decks joined by stairs', () => {
    const l = preset('double-decker-2x2-72');
    assert.deepEqual(l.decks.map((d) => d.id), ['LOWER', 'UPPER']);
    assert.equal(l.fixtures.filter((f) => f.fixture === 'STAIRS').length, 2);
    assert.ok(l.seats.some((s) => s.label.startsWith('U')) && l.seats.some((s) => s.label.startsWith('L')));
  });

  test('semi-sleeper keeps its type; double berth is one unit for two people', () => {
    assert.ok(preset('semi-sleeper-2x2-45').seats.every((s) => s.type === 'SEMI_SLEEPER'));
    const dbl = preset('sleeper-double-24').seats.filter((s) => s.capacity === 2);
    assert.equal(dbl.length, 12);
    assert.ok(dbl.every((s) => s.colSpan === 2 && s.rowSpan === 2 && s.unit === 'BERTH'));
  });

  test('builder options: skip, fixtures, extra seats, left-hand drive', () => {
    const l = E.buildSeaterLayout({ left: 2, right: 2, rows: 3, driverSide: 'LEFT', skip: [{ row: 0, col: 0 }], fixtures: [{ fixture: 'WC', row: 4, col: 0 }] });
    assert.equal(l.seats.length, 11);
    assert.equal(l.fixtures.find((f) => f.fixture === 'DRIVER')?.col, 0);
    assert.equal(l.fixtures.find((f) => f.fixture === 'DOOR')?.col, 4);
    assert.throws(() => E.buildSeaterLayout({ left: 2, right: 2, rows: 3, rearBench: 9 }));
    assert.throws(() => E.buildSleeperLayout({ left: 2, right: 1, berthRows: 0 }));
  });
});

describe('legacy v1 <-> v2', () => {
  const grid = (rows: number, cols: number): E.LegacyLayoutInput => ({
    rowsCount: rows,
    columnsCount: cols,
    seats: Array.from({ length: rows * cols }, (_, i) => ({ seatRow: E.rowLetters(Math.floor(i / cols)), seatColumn: (i % cols) + 1 })),
  });

  test('upgrade keeps labels, keys and coordinates; full grid has no aisle', () => {
    const l = E.fromLegacy(grid(2, 2));
    assert.deepEqual(l.seats.map((s) => s.label), ['A1', 'A2', 'B1', 'B2']);
    assert.deepEqual(l.seats.map((s) => [s.row, s.col]), [[0, 0], [0, 1], [1, 0], [1, 1]]);
    assert.deepEqual(E.validateLayout(l, { access: 'off' }), []);
    assert.deepEqual(E.legacyAisleCells(l), []);
  });

  test('existing database keys are preserved', () => {
    const l = E.fromLegacy({ rowsCount: 1, columnsCount: 1, seats: [{ seatRow: 'A', seatColumn: 1, seatLabel: 'A1', key: 'uuid-123' }] });
    assert.equal(l.seats[0]?.key, 'uuid-123');
  });

  test('round trip through v2 is exact', () => {
    const input = grid(3, 4);
    const out = E.toLegacy(E.fromLegacy(input));
    assert.equal(out.rowsCount, 3);
    assert.equal(out.columnsCount, 4);
    assert.deepEqual(out.seats.map((s) => [s.seatRow, s.seatColumn]), input.seats.map((s) => [s.seatRow, s.seatColumn]));
  });

  test('aisle cells = seat-free walkable cells, 1-based, numeric and letter forms', () => {
    const l = E.fromLegacy({ rowsCount: 2, columnsCount: 3, seats: [{ seatRow: 'A', seatColumn: 1 }, { seatRow: 'A', seatColumn: 3 }, { seatRow: 'B', seatColumn: 1 }, { seatRow: 'B', seatColumn: 3 }] });
    assert.deepEqual(E.legacyAisleCells(l), [{ row: 1, column: 2 }, { row: 2, column: 2 }]);
    assert.deepEqual(E.legacyAisleCellsLetters(l), [{ row: 'A', column: 2 }, { row: 'B', column: 2 }]);
  });

  test('bad legacy input is rejected by the validator', () => {
    const oob = E.fromLegacy({ rowsCount: 1, columnsCount: 1, seats: [{ seatRow: 'B', seatColumn: 1 }] });
    assert.ok(codes(E.validateLayout(oob)).includes('OUT_OF_BOUNDS'));
    const badRow = E.fromLegacy({ rowsCount: 1, columnsCount: 1, seats: [{ seatRow: '1', seatColumn: 1 }] });
    assert.ok(codes(E.validateLayout(badRow)).includes('OUT_OF_BOUNDS'));
    const dup = E.fromLegacy({ rowsCount: 1, columnsCount: 1, seats: [{ seatRow: 'A', seatColumn: 1 }, { seatRow: 'A', seatColumn: 1 }] });
    assert.ok(codes(E.validateLayout(dup), 'error').length > 0);
  });

  test('double-decker flattens to unique legacy coordinates', () => {
    const out = E.toLegacy(preset('double-decker-2x2-72'));
    assert.equal(new Set(out.seats.map((s) => `${s.seatRow}${s.seatColumn}`)).size, 72);
    assert.equal(new Set(out.seats.map((s) => s.seatLabel)).size, 72);
    assert.equal(out.rowsCount, 20);
  });
});

describe('diff', () => {
  test('cosmetic vs identity changes', () => {
    const a = preset('seater-2x2-40');
    const b = JSON.parse(JSON.stringify(a)) as E.Layout;
    const first = b.seats[0];
    const second = b.seats[1];
    const third = b.seats[2];
    if (!first || !second || !third) throw new Error('fixture');
    first.label = 'X1';
    second.femaleOnly = true;
    third.col = 2;
    b.seats.pop();
    b.seats.push({ ...first, key: 'NEW', label: 'N1', row: 40, col: 0 });
    const d = E.diffLayouts(a, b);
    assert.deepEqual(d.added, ['NEW']);
    assert.equal(d.removed.length, 1);
    assert.deepEqual(d.changed.find((c) => c.key === first.key)?.identity, false);
    assert.deepEqual(d.changed.find((c) => c.key === second.key)?.identity, false);
    assert.deepEqual(d.changed.find((c) => c.key === third.key)?.identity, true);
    assert.deepEqual(E.affectedKeys(d).sort(), [...d.removed, third.key].sort());
    assert.equal(E.diffLayouts(a, a).changed.length, 0);
    assert.equal(E.diffLayouts(null, a).added.length, 40);
  });
});

describe('selection + suggestions', () => {
  const l = preset('seater-2x2-40');
  const all = (except: Record<string, E.SeatStatus> = {}): E.RuntimeMap =>
    Object.fromEntries(l.seats.map((s) => [s.key, { status: except[s.label] ?? 'AVAILABLE' }]));

  test('unknown keys are blocked, summary counts', () => {
    assert.equal(E.statusOf({}, 'nope'), 'BLOCKED');
    const sum = E.summarize(l, all({ '1A': 'BOOKED', '1B': 'LOCKED', '1C': 'MINE' }));
    assert.deepEqual([sum.total, sum.available, sum.booked, sum.locked, sum.mine], [40, 37, 1, 1, 1]);
  });

  test('suggestTogether picks adjacent seats and skips taken ones', () => {
    assert.deepEqual(E.suggestTogether(l, all(), 2), ['1A', '1B']);
    assert.deepEqual(E.suggestTogether(l, all(), 4), ['1A', '1B', '1C', '1D']);
    const pair = E.suggestTogether(l, all({ '1B': 'BOOKED' }), 2);
    assert.ok(pair && !pair.includes('1B'));
    assert.equal(E.selectionGroups(l, pair ?? []).length, 1);
    assert.deepEqual(E.suggestTogether(l, all({ '1A': 'BOOKED' }), 1, { prefer: 'WINDOW' }), ['1D']);
  });

  test('suggestTogether returns null when impossible', () => {
    assert.equal(E.suggestTogether(l, all(), 0), null);
    assert.equal(E.suggestTogether(l, all(), 41), null);
    const sparse: E.RuntimeMap = Object.fromEntries(l.seats.map((s) => [s.key, { status: s.label === '1A' || s.label === '10D' ? 'AVAILABLE' : 'BOOKED' } as E.SeatRuntime]));
    assert.equal(E.suggestTogether(l, sparse, 2), null);
  });

  test('validateSelection', () => {
    const keys = l.seats.map((s) => s.key);
    assert.deepEqual(E.validateSelection(l, keys.slice(0, 2)), []);
    assert.deepEqual(E.validateSelection(l, keys.slice(0, 9)).map((i) => i.code), ['MAX_SEATS']);
    assert.ok(E.validateSelection(l, ['1A', 'ZZ9']).some((i) => i.code === 'UNKNOWN_SEAT'));
    const split = E.validateSelection(l, [keys[0] ?? '', keys[39] ?? '']);
    assert.deepEqual(split.map((i) => i.code), ['SPLIT_GROUP']);
  });
});
