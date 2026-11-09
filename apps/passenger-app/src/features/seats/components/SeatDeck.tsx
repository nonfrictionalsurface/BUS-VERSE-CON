import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCleanTheme } from '../../../theme/passengerAdapter';
import { Seat, SeatLayout } from '../types';
import { SeatCell } from './SeatCell';

interface Props {
  seats: Seat[];
  layout: SeatLayout;
  selectedSeatIds: string[];
  onSeatClick: (seat: Seat) => void;
  disabled?: boolean;
}

export function SeatDeck({ seats, layout, selectedSeatIds, onSeatClick, disabled = false }: Props) {
  const theme = useCleanTheme();

  const seatByKey = new Map<string, Seat>();
  seats.forEach((s) => seatByKey.set(`${s.seatRow}${s.seatColumn}`, s));

  const rowLetters: string[] = [];
  for (let r = 0; r < layout.rowsCount; r++) {
    rowLetters.push(String.fromCharCode(65 + r));
  }

  const cols = layout.columnsCount;
  const leftCols = Math.min(2, Math.max(1, cols - 1));
  const selectedSet = new Set(selectedSeatIds);

  return (
    <View
      style={[
        styles.deck,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View style={[styles.shield, { borderBottomColor: theme.colors.borderSubtle }]}>
        <Text style={[styles.shieldText, { color: theme.colors.textMuted }]}>WINDSCREEN</Text>
        <Text style={[styles.shieldText, { color: theme.colors.textMuted }]}>DRIVER</Text>
      </View>

      {rowLetters.map((rowChar) => {
        const leftSeats: Seat[] = [];
        const rightSeats: Seat[] = [];
        for (let c = 1; c <= leftCols; c++) {
          const s = seatByKey.get(`${rowChar}${c}`);
          if (s) leftSeats.push(s);
        }
        for (let c = leftCols + 1; c <= cols; c++) {
          const s = seatByKey.get(`${rowChar}${c}`);
          if (s) rightSeats.push(s);
        }

        return (
          <View key={rowChar} style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.colors.textMuted }]}>{rowChar}</Text>
            <View style={styles.seats}>
              {leftSeats.map((s) => (
                <SeatCell
                  key={s.id}
                  seat={s}
                  isSelectedByMe={selectedSet.has(s.id)}
                  onToggle={onSeatClick}
                  disabled={disabled}
                />
              ))}
            </View>
            <View style={styles.aisle} />
            <View style={styles.seats}>
              {rightSeats.map((s) => (
                <SeatCell
                  key={s.id}
                  seat={s}
                  isSelectedByMe={selectedSet.has(s.id)}
                  onToggle={onSeatClick}
                  disabled={disabled}
                />
              ))}
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.textMuted }]}>{rowChar}</Text>
          </View>
        );
      })}

      <View style={[styles.rearExit, { borderTopColor: theme.colors.borderSubtle }]}>
        <Text style={[styles.shieldText, { color: theme.colors.textMuted }]}>REAR EXIT</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deck: { padding: 16, borderRadius: 20, borderWidth: 2 },
  shield: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  shieldText: { fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: 'monospace' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  rowLabel: { width: 20, textAlign: 'center', fontSize: 10, fontWeight: '700' },
  seats: { flexDirection: 'row', gap: 6 },
  aisle: { width: 20 },
  rearExit: { paddingTop: 12, marginTop: 12, borderTopWidth: 1, alignItems: 'center' },
});