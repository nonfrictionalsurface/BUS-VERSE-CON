import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useCleanTheme } from '../../../theme/passengerAdapter';
import { Seat } from '../types';

interface Props {
  seat: Seat;
  isSelectedByMe: boolean;
  onToggle: (seat: Seat) => void;
  disabled?: boolean;
}

export function SeatCell({ seat, isSelectedByMe, onToggle, disabled = false }: Props) {
  const theme = useCleanTheme();
  const isBooked = seat.status === 'BOOKED';
  const isLockedByOther = seat.status === 'LOCKED' && !isSelectedByMe;
  const isInactive = isBooked || isLockedByOther || disabled;

  let bg = theme.colors.surface;
  let border = theme.colors.border;
  let text = theme.colors.text;

  if (isBooked) {
    bg = theme.colors.surfaceElevated;
    border = theme.colors.borderSubtle;
    text = theme.colors.textMuted;
  } else if (isSelectedByMe) {
    bg = theme.colors.primary;
    border = theme.colors.primary;
    text = theme.isDark ? '#000' : '#FFF';
  } else if (isLockedByOther) {
    bg = theme.isDark ? 'rgba(245,158,11,0.15)' : 'rgba(216,168,96,0.2)';
    border = theme.colors.warning;
    text = theme.colors.warning;
  } else if (seat.isFemaleOnly) {
    bg = theme.isDark ? 'rgba(236,72,153,0.15)' : 'rgba(219,39,119,0.1)';
    border = '#DB2777';
    text = theme.isDark ? '#F472B6' : '#BE185D';
  }

  const height = seat.seatType === 'SLEEPER' ? 62 : seat.seatType === 'SEMI_SLEEPER' ? 54 : 44;

  return (
    <Pressable
      onPress={() => !isInactive && onToggle(seat)}
      disabled={isInactive}
      style={[
        styles.cell,
        { height, backgroundColor: bg, borderColor: border, opacity: isBooked ? 0.5 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, selected: isSelectedByMe }}
      accessibilityLabel={`Seat ${seat.seatLabel}, ${isBooked ? 'booked' : isLockedByOther ? 'locked' : isSelectedByMe ? 'selected' : 'available'}${seat.isFemaleOnly ? ', female only' : ''}`}
    >
      <Text style={[styles.label, { color: text }]}>{seat.seatLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: 42,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});