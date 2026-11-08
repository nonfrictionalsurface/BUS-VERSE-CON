import type { Prisma } from '@prisma/client';
import {
  affectedKeys,
  checkLayout,
  compactLayout,
  diffLayouts,
  fromLegacy,
  hasErrors,
  legacyAisleCellsLetters,
  toLegacy,
  validateLayout,
  type Layout,
  type LayoutDiff,
  type LayoutIssue,
} from '@busverse/seat-engine';
import { prisma } from '../../lib/prisma.js';
import { newUuid } from '../../lib/ids.js';
import { withAdvisoryLock } from '../../lib/advisory-lock.js';
import { networkErrors } from './network.errors.js';
import { layoutOfRows, seatKeyOf } from './seat-layout.shared.js';
import type { SeatType } from './network.types.js';

export interface SeatInput {
  seatRow: string;
  seatColumn: number;
  seatType: SeatType;
  isFemaleOnly: boolean;
}

/** Legacy (v1) request body: rows A.., columns 1.., one cell per seat. */
export interface PutSeatLayoutInput {
  rowsCount: number;
  columnsCount: number;
  seats: SeatInput[];
}

export type SeatLayoutBody =
  | { kind: 'legacy'; input: PutSeatLayoutInput }
  | { kind: 'v2'; layout: unknown; syncCapacity: boolean };

export interface LayoutConflict {
  seatKey: string;
  seatLabel: string;
  scheduleId: string;
  departureTime: string;
  reason: 'BOOKING' | 'LOCK';
}

export interface LayoutPreview {
  ok: boolean;
  issues: LayoutIssue[];
  summary: { added: number; removed: number; changed: number; unchanged: number } | null;
  conflicts: LayoutConflict[];
}

type Db = Prisma.TransactionClient;

function analyzeIncoming(body: SeatLayoutBody, busCapacity: number): { layout: Layout | null; issues: LayoutIssue[] } {
  if (body.kind === 'v2') {
    // Access problems (unreachable seats, no door) are reported as warnings: they never block a save,
    // because an unusual but real bus must always be representable. The studio shows them.
    const res = checkLayout(body.layout, { ...(body.syncCapacity ? {} : { expectedUnits: busCapacity }), access: 'warn' });
    return { layout: res.layout, issues: res.issues };
  }
  const layout = fromLegacy({
    rowsCount: body.input.rowsCount,
    columnsCount: body.input.columnsCount,
    seats: body.input.seats.map((s) => ({
      seatRow: s.seatRow,
      seatColumn: s.seatColumn,
      seatType: s.seatType,
      isFemaleOnly: s.isFemaleOnly,
    })),
  });
  return { layout, issues: validateLayout(layout, { expectedUnits: busCapacity, access: 'off' }) };
}

/** Same errors, in the same precedence, that the v1 endpoint always returned for v1 bodies. */
function resolveIncoming(body: SeatLayoutBody, busCapacity: number): Layout {
  const { layout, issues } = analyzeIncoming(body, busCapacity);
  const errs = issues.filter((i) => i.severity === 'error');
  if (body.kind === 'legacy' && layout) {
    if (errs.some((i) => i.code === 'CAPACITY_MISMATCH')) throw networkErrors.capacityMismatch(layout.seats.length, busCapacity);
    const oob = errs.find((i) => i.code === 'OUT_OF_BOUNDS');
    if (oob) throw networkErrors.invalidSeatCoordinates(oob.message);
    const dup = errs.find((i) => i.code === 'OVERLAP' || i.code === 'DUPLICATE_KEY' || i.code === 'DUPLICATE_LABEL');
    if (dup) throw networkErrors.duplicateSeatCoordinates(dup.keys?.[0] ?? dup.message);
  }
  if (!layout || errs.length > 0) throw networkErrors.layoutInvalid(errs.length > 0 ? errs : issues);
  return layout;
}

/**
 * Seats a booking depends on. Removing, re-shaping, relabelling or re-gendering one of these
 * must wait until it has no active booking or live lock (tickets and manifests must agree).
 */
function protectedKeys(diff: LayoutDiff): string[] {
  const keys = new Set(affectedKeys(diff));
  for (const c of diff.changed) if (c.fields.includes('label') || c.fields.includes('femaleOnly')) keys.add(c.key);
  return [...keys];
}

async function loadCurrent(db: Db, busId: string) {
  const row = await db.seatLayout.findFirst({ where: { busId, deletedAt: null } });
  const seats = row ? await db.seat.findMany({ where: { layoutId: row.id, deletedAt: null } }) : [];
  return { row, seats, current: row ? layoutOfRows(row, seats) : null };
}

/**
 * Seats that would be disturbed by removing or re-shaping them: active bookings or live locks
 * on schedules that have not departed yet. Past and cancelled bookings never block an edit.
 */
async function findConflicts(db: Db, seatIds: string[]): Promise<LayoutConflict[]> {
  if (seatIds.length === 0) return [];
  const rows = await db.$queryRaw<
    Array<{ seat_key: string | null; seat_label: string; schedule_id: string; departure_time: Date; reason: string }>
  >`
    SELECT s.seat_key, s.seat_label, x.schedule_id, x.departure_time, x.reason
    FROM (
      SELECT bp.seat_id, bp.schedule_id, sch.departure_time, 'BOOKING' AS reason
      FROM booking_passengers bp
      JOIN bookings b ON b.id = bp.booking_id
        AND b.deleted_at IS NULL
        AND b.status NOT IN ('CANCELLED','OPERATOR_CANCELLED','REFUNDED','EXPIRED','FAILED')
      JOIN schedules sch ON sch.id = bp.schedule_id AND sch.deleted_at IS NULL AND sch.departure_time > now()
      WHERE bp.deleted_at IS NULL AND bp.seat_id = ANY(${seatIds}::uuid[])
      UNION ALL
      SELECT sl.seat_id, sl.schedule_id, sch.departure_time, 'LOCK' AS reason
      FROM seat_locks sl
      JOIN schedules sch ON sch.id = sl.schedule_id AND sch.deleted_at IS NULL AND sch.departure_time > now()
      WHERE sl.deleted_at IS NULL AND sl.expires_at > now() AND sl.seat_id = ANY(${seatIds}::uuid[])
    ) x
    JOIN seats s ON s.id = x.seat_id
    ORDER BY x.departure_time, s.seat_label
    LIMIT 50
  `;
  return rows.map((r) => ({
    seatKey: r.seat_key ?? r.seat_label,
    seatLabel: r.seat_label,
    scheduleId: r.schedule_id,
    departureTime: r.departure_time.toISOString(),
    reason: r.reason === 'LOCK' ? 'LOCK' : 'BOOKING',
  }));
}

/** Dry run for the operator studio: validate, diff against what is stored, report conflicts. Writes nothing. */
export async function previewSeatLayout(params: { busId: string; busCapacity: number; body: SeatLayoutBody }): Promise<LayoutPreview> {
  const { layout: incoming, issues } = analyzeIncoming(params.body, params.busCapacity);
  if (!incoming || hasErrors(issues)) return { ok: false, issues, summary: null, conflicts: [] };
  const { seats, current } = await loadCurrent(prisma, params.busId);
  const diff = diffLayouts(current, incoming);
  const idByKey = new Map(seats.map((s) => [seatKeyOf(s), s.id] as const));
  const ids = protectedKeys(diff).flatMap((k) => {
    const id = idByKey.get(k);
    return id ? [id] : [];
  });
  const conflicts = await findConflicts(prisma, ids);
  return {
    ok: conflicts.length === 0,
    issues,
    summary: { added: diff.added.length, removed: diff.removed.length, changed: diff.changed.length, unchanged: diff.unchanged },
    conflicts,
  };
}

/**
 * Save a seat layout (v1 or v2 body).
 *
 * Seats keep their database id as long as their key survives, so bookings and locks stay valid
 * through edits. Removed seats are soft-deleted (history stays readable). An edit is refused with
 * LAYOUT_IN_USE only when it would remove, re-shape, relabel or re-gender a seat that has an active
 * booking or lock on a schedule that has not departed yet.
 */
export async function saveSeatLayout(params: { busId: string; busCapacity: number; body: SeatLayoutBody }) {
  const { busId, busCapacity, body } = params;
  const incoming = resolveIncoming(body, busCapacity);
  const syncCapacity = body.kind === 'v2' && body.syncCapacity;

  return prisma.$transaction(async (tx) =>
    withAdvisoryLock(tx, `seat-layout:${busId}`, async () => {
      const { row, seats, current } = await loadCurrent(tx, busId);
      const diff = diffLayouts(current, incoming);
      const byKey = new Map(seats.map((s) => [seatKeyOf(s), s] as const));

      const affectedIds = protectedKeys(diff).flatMap((k) => {
        const s = byKey.get(k);
        return s ? [s.id] : [];
      });
      const conflicts = await findConflicts(tx, affectedIds);
      if (conflicts.length > 0) throw networkErrors.layoutInUse(conflicts);

      const legacy = toLegacy(incoming);
      const legacyByKey = new Map(legacy.seats.map((s) => [s.key, s] as const));
      const data = {
        rowsCount: legacy.rowsCount,
        columnsCount: legacy.columnsCount,
        aisleMapJson: { _v: 1, aisle_cells: legacyAisleCellsLetters(incoming) },
        specJson: compactLayout(incoming) as unknown as Prisma.InputJsonObject,
        schemaVersion: 2,
      };
      const layout = row
        ? await tx.seatLayout.update({ where: { id: row.id }, data: { ...data, layoutRev: { increment: 1 } } })
        : await tx.seatLayout.create({ data: { id: newUuid(), busId, ...data, layoutRev: 1 } });

      // 1. Removed seats leave the layout but keep their row (old tickets still point at them).
      const removedIds = diff.removed.flatMap((k) => {
        const s = byKey.get(k);
        return s ? [s.id] : [];
      });
      if (removedIds.length > 0) await tx.seat.updateMany({ where: { id: { in: removedIds } }, data: { deletedAt: new Date() } });

      // 2. Kept seats: move labels out of the way first so swaps and shifts never hit the unique index.
      const dirty = seats.flatMap((s) => {
        const next = legacyByKey.get(seatKeyOf(s));
        if (!next) return [];
        const same =
          next.seatLabel === s.seatLabel && next.seatRow === s.seatRow && next.seatColumn === s.seatColumn &&
          next.seatType === s.seatType && next.isFemaleOnly === s.isFemaleOnly && s.seatKey === next.key;
        return same ? [] : [{ seat: s, next }];
      });
      const relabelled = dirty.filter((d) => d.next.seatLabel !== d.seat.seatLabel);
      for (const [i, d] of relabelled.entries()) {
        await tx.seat.update({ where: { id: d.seat.id }, data: { seatLabel: `~${i + 1}` } });
      }
      for (const { seat, next } of dirty) {
        await tx.seat.update({
          where: { id: seat.id },
          data: {
            seatRow: next.seatRow,
            seatColumn: next.seatColumn,
            seatLabel: next.seatLabel,
            seatType: next.seatType,
            isFemaleOnly: next.isFemaleOnly,
            seatKey: next.key,
          },
        });
      }

      // 3. New seats.
      const added = diff.added.flatMap((k) => {
        const n = legacyByKey.get(k);
        return n ? [n] : [];
      });
      if (added.length > 0) {
        await tx.seat.createMany({
          data: added.map((n) => ({
            id: newUuid(),
            layoutId: layout.id,
            seatRow: n.seatRow,
            seatColumn: n.seatColumn,
            seatLabel: n.seatLabel,
            seatType: n.seatType,
            isFemaleOnly: n.isFemaleOnly,
            seatKey: n.key,
          })),
        });
      }

      if (syncCapacity && busCapacity !== incoming.seats.length) {
        await tx.bus.update({ where: { id: busId }, data: { capacity: incoming.seats.length } });
      }

      const finalSeats = await tx.seat.findMany({
        where: { layoutId: layout.id, deletedAt: null },
        orderBy: [{ seatRow: 'asc' }, { seatColumn: 'asc' }],
      });
      return { layout, seats: finalSeats };
    }),
  );
}
