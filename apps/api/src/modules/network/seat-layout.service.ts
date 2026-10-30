import { prisma } from '../../lib/prisma.js';
import { newUuid } from '../../lib/ids.js';
import { errors } from '../../lib/errors.js';
import { networkErrors } from './network.errors.js';
import type { SeatType } from './network.types.js';

export interface SeatInput {
  seatRow: string;
  seatColumn: number;
  seatType: SeatType;
  isFemaleOnly: boolean;
}

export interface PutSeatLayoutInput {
  rowsCount: number;
  columnsCount: number;
  seats: SeatInput[];
}

/**
 * Replace the seat layout of a bus. Fails if the bus has any bookings
 * (to preserve booking_passengers FK integrity).
 */
export async function replaceSeatLayout(params: {
  busId: string;
  busCapacity: number;
  input: PutSeatLayoutInput;
}) {
  const { busId, busCapacity, input } = params;

  // 1. Cannot change layout if the bus has any bookings
  const hasBookings = await (await import('./network.repository.js')).busLayoutHasBookings(busId);
  if (hasBookings) throw networkErrors.layoutHasBookings();

  // 2. Validate seat count vs capacity
  if (input.seats.length !== busCapacity) {
    throw networkErrors.capacityMismatch(input.seats.length, busCapacity);
  }

  // 3. Validate each seat within grid bounds
  const maxRowIdx = input.rowsCount; // 1..rowsCount → A..[A+rowsCount-1]
  const maxRowChar = String.fromCharCode('A'.charCodeAt(0) + maxRowIdx - 1);
  for (const s of input.seats) {
    if (s.seatRow < 'A' || s.seatRow > maxRowChar) {
      throw networkErrors.invalidSeatCoordinates(`Row ${s.seatRow} outside grid (A..${maxRowChar})`);
    }
    if (s.seatColumn < 1 || s.seatColumn > input.columnsCount) {
      throw networkErrors.invalidSeatCoordinates(
        `Column ${s.seatColumn} outside grid (1..${input.columnsCount})`,
      );
    }
  }

  // 4. Validate no duplicate (row, column)
  const occupied = new Set<string>();
  for (const s of input.seats) {
    const key = `${s.seatRow}${s.seatColumn}`;
    if (occupied.has(key)) throw networkErrors.duplicateSeatCoordinates(key);
    occupied.add(key);
  }

  // 5. Compute aisle_cells = all grid cells minus seats
  const aisleCells: Array<{ row: string; column: number }> = [];
  for (let r = 0; r < input.rowsCount; r++) {
    const rowChar = String.fromCharCode('A'.charCodeAt(0) + r);
    for (let c = 1; c <= input.columnsCount; c++) {
      if (!occupied.has(`${rowChar}${c}`)) {
        aisleCells.push({ row: rowChar, column: c });
      }
    }
  }

  // 6. Upsert layout + replace seats in a single transaction
  return prisma.$transaction(async (tx) => {
    let layout = await tx.seatLayout.findFirst({ where: { busId, deletedAt: null } });

    if (layout) {
      // Delete existing seats (safe — no bookings by step 1)
      await tx.seat.deleteMany({ where: { layoutId: layout.id } });
      layout = await tx.seatLayout.update({
        where: { id: layout.id },
        data: {
          rowsCount: input.rowsCount,
          columnsCount: input.columnsCount,
          aisleMapJson: { _v: 1, aisle_cells: aisleCells },
        },
      });
    } else {
      layout = await tx.seatLayout.create({
        data: {
          id: newUuid(),
          busId,
          rowsCount: input.rowsCount,
          columnsCount: input.columnsCount,
          aisleMapJson: { _v: 1, aisle_cells: aisleCells },
        },
      });
    }

    // Create seats
    const createdSeats = await Promise.all(
      input.seats.map((s) =>
        tx.seat.create({
          data: {
            id: newUuid(),
            layoutId: layout!.id,
            seatRow: s.seatRow,
            seatColumn: s.seatColumn,
            seatLabel: `${s.seatRow}${s.seatColumn}`,
            seatType: s.seatType,
            isFemaleOnly: s.isFemaleOnly,
          },
        }),
      ),
    );

    return { layout, seats: createdSeats };
  });
}