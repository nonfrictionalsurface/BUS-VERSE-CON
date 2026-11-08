import { compactLayout, fromLegacy, parseLayout, type Layout } from '@busverse/seat-engine';

/** Pure helpers shared by the network and booking modules (no database access here). */

export interface LayoutRowLike {
  specJson: unknown;
  rowsCount: number;
  columnsCount: number;
}

export interface SeatRowLike {
  seatRow: string;
  seatColumn: number;
  seatLabel: string;
  seatType: string;
  isFemaleOnly: boolean;
  seatKey: string | null;
}

/** Stable identity of a stored seat: its explicit key, else its label (rows written before layout v2). */
export const seatKeyOf = (s: Pick<SeatRowLike, 'seatKey' | 'seatLabel'>): string => s.seatKey ?? s.seatLabel;

/** The v2 layout of a stored layout. Layouts saved before v2 are upgraded on the fly, losslessly. */
export function layoutOfRows(layout: LayoutRowLike, seats: readonly SeatRowLike[]): Layout {
  if (layout.specJson) {
    const parsed = parseLayout(layout.specJson);
    if (parsed.layout) return parsed.layout;
  }
  return fromLegacy({
    rowsCount: layout.rowsCount,
    columnsCount: layout.columnsCount,
    seats: seats.map((s) => ({
      seatRow: s.seatRow,
      seatColumn: s.seatColumn,
      seatLabel: s.seatLabel,
      seatType: s.seatType,
      isFemaleOnly: s.isFemaleOnly,
      key: seatKeyOf(s),
    })),
  });
}

/** Compact JSON of the layout, ready to send to clients (they parse it with parseLayout). */
export const specOfRows = (layout: LayoutRowLike, seats: readonly SeatRowLike[]): Record<string, unknown> =>
  compactLayout(layoutOfRows(layout, seats));
