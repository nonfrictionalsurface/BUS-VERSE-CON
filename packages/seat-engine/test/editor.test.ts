import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.ts';

const start = (): E.EditorState => E.createEditor(E.getPreset('seater-2x2-40')?.build() as E.Layout);
const run = (s: E.EditorState, ...a: E.EditorAction[]): E.EditorState => a.reduce((st, x) => E.editorReducer(st, x), s);

describe('headless editor', () => {
  test('placing on an occupied cell is refused and changes nothing', () => {
    const s = start();
    const r = run(s, { type: 'PLACE_SEAT', deck: 'MAIN', row: 1, col: 0 });
    assert.ok(r.error?.includes('overlaps'));
    assert.equal(r.layout, s.layout);
    assert.equal(r.past.length, 0);
  });

  test('place, undo, redo', () => {
    const s = start();
    const placed = run(s, { type: 'PLACE_SEAT', deck: 'MAIN', row: 1, col: 2 });
    assert.equal(placed.error, null);
    assert.equal(placed.layout.seats.length, 41);
    assert.ok(placed.layout.seats.some((x) => x.key === 'S1'));
    const undone = run(placed, { type: 'UNDO' });
    assert.equal(undone.layout.seats.length, 40);
    const redone = run(undone, { type: 'REDO' });
    assert.equal(redone.layout.seats.length, 41);
    assert.equal(run(s, { type: 'UNDO' }), s);
  });

  test('erase removes a seat or fixture, even from the middle of a span', () => {
    const l = E.getPreset('sleeper-double-24')?.build() as E.Layout;
    const target = l.seats.find((x) => x.capacity === 2);
    assert.ok(target);
    const r = run(E.createEditor(l), { type: 'ERASE', deck: target.deck, row: target.row + 1, col: target.col + 1 });
    assert.equal(r.layout.seats.length, 23);
    const door = run(start(), { type: 'ERASE', deck: 'MAIN', row: 0, col: 0 });
    assert.equal(door.layout.fixtures.some((f) => f.fixture === 'DOOR'), false);
    assert.equal(run(start(), { type: 'ERASE', deck: 'MAIN', row: 1, col: 2 }).past.length, 0);
  });

  test('shrinking a deck below its content is refused', () => {
    const r = run(start(), { type: 'SET_DECK_SIZE', deck: 'MAIN', rows: 5, cols: 5 });
    assert.ok(r.error?.includes('outside'));
    assert.equal(run(start(), { type: 'SET_DECK_SIZE', deck: 'MAIN', rows: 12, cols: 5 }).error, null);
  });

  test('single deck becomes double deck via rename + add', () => {
    const s = run(
      E.createEditor(E.buildSeaterLayout({ left: 2, right: 2, rows: 2 })),
      { type: 'RENAME_DECK', from: 'MAIN', to: 'LOWER' },
      { type: 'ADD_DECK', deck: 'UPPER', rows: 3, cols: 5 },
      { type: 'PLACE_SEAT', deck: 'UPPER', row: 0, col: 0 },
    );
    assert.equal(s.error, null);
    assert.deepEqual(s.layout.decks.map((d) => d.id), ['LOWER', 'UPPER']);
    assert.equal(run(start(), { type: 'ADD_DECK', deck: 'UPPER', rows: 3, cols: 5 }).error !== null, true);
    assert.ok(run(s, { type: 'REMOVE_DECK', deck: 'UPPER' }).error?.includes('still has seats'));
  });

  test('auto-label relabels after each edit but never touches keys', () => {
    const s = run(E.createEditor(E.buildSeaterLayout({ left: 1, right: 1, rows: 2 })), { type: 'SET_AUTO_LABEL', scheme: 'SEQUENTIAL' }, { type: 'PLACE_SEAT', deck: 'MAIN', row: 1, col: 1 });
    assert.deepEqual(s.layout.seats.map((x) => x.label).sort(), ['1', '2', '3', '4', '5']);
    assert.ok(s.layout.seats.some((x) => x.key === 'S1'));
    const r = run(s, { type: 'RELABEL', scheme: 'ROW_LETTER' });
    assert.equal(new Set(r.layout.seats.map((x) => x.key)).size, 5);
  });

  test('update and move seats', () => {
    let s = start();
    s = run(s, { type: 'UPDATE_SEAT', key: '1A', patch: { femaleOnly: true, label: 'LA1' } });
    assert.equal(s.layout.seats.find((x) => x.key === '1A')?.femaleOnly, true);
    const dup = run(s, { type: 'UPDATE_SEAT', key: '1B', patch: { label: 'LA1' } });
    assert.ok(dup.error?.includes('Duplicate seat label'));
    const moved = run(s, { type: 'MOVE_SEAT', key: '1A', row: 1, col: 2 });
    assert.equal(moved.error, null);
    assert.ok(run(s, { type: 'MOVE_SEAT', key: 'nope', row: 0, col: 0 }).error);
    assert.ok(run(s, { type: 'MOVE_SEAT', key: '1A', row: 1, col: 1 }).error?.includes('overlaps'));
  });

  test('a pre-existing problem does not block unrelated edits', () => {
    const broken = E.fromLegacy({ rowsCount: 1, columnsCount: 2, seats: [{ seatRow: 'A', seatColumn: 1 }, { seatRow: 'B', seatColumn: 1 }] });
    const s = E.createEditor(broken);
    assert.ok(s.issues.some((i) => i.code === 'OUT_OF_BOUNDS'));
    const r = run(s, { type: 'UPDATE_SEAT', key: 'A1', patch: { femaleOnly: true } });
    assert.equal(r.error, null);
    assert.equal(r.layout.seats.find((x) => x.key === 'A1')?.femaleOnly, true);
  });

  test('REPLACE loads a preset into history; whatIsAt reports the cell', () => {
    const s = run(start(), { type: 'REPLACE', layout: E.getPreset('sleeper-2x1-36')?.build() as E.Layout });
    assert.equal(s.layout.seats.length, 36);
    assert.equal(s.past.length, 1);
    assert.equal(E.whatIsAt(s.layout, 'LOWER', 0, 0).fixture?.fixture, 'DOOR');
    assert.equal(E.whatIsAt(s.layout, 'LOWER', 2, 0).seat?.label, 'L1');
  });
});
