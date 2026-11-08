import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { PlanSeat, SeatStatus } from '@busverse/seat-engine';
import { isSelectable } from '@busverse/seat-engine';
import { useTheme } from '../../../theme';

type Props = {
  item: PlanSeat;
  status: SeatStatus;
  selected: boolean;
  pending: boolean;
  onPress: (key: string) => void;
};

const STATUS_WORD: Record<SeatStatus, string> = {
  AVAILABLE: 'available',
  LOCKED: 'held by another passenger',
  BOOKED: 'booked',
  MINE: 'held for you',
  BLOCKED: 'not for sale',
};

export const SeatTile: React.FC<Props> = React.memo(({ item, status, selected, pending, onPress }) => {
  const { tokens, typography, radius } = useTheme();
  const tappable = (isSelectable(status) || selected) && !pending;

  let bg = tokens.seatAvailableBg;
  let border = tokens.seatAvailableBorder;
  let fg = tokens.seatAvailableText;
  if (item.femaleOnly) {
    bg = tokens.seatFemaleBg;
    border = tokens.seatFemaleBorder;
    fg = tokens.seatFemaleText;
  }
  if (status === 'LOCKED') {
    bg = tokens.seatLockedBg;
    border = tokens.seatLockedBorder;
    fg = tokens.seatLockedText;
  }
  if (status === 'BOOKED' || status === 'BLOCKED') {
    bg = tokens.seatBookedBg;
    border = tokens.seatBookedBorder;
    fg = tokens.seatBookedText;
  }
  if (selected || status === 'MINE') {
    bg = tokens.seatSelectedBg;
    border = tokens.seatSelectedBorder;
    fg = tokens.seatSelectedText;
  }

  const berth = item.unit !== 'SEAT';
  const where = item.window ? 'window' : item.aisleSide ? 'aisle' : item.middle ? 'middle' : '';
  const word = selected ? 'selected' : STATUS_WORD[status];
  const label = `${berth ? 'Berth' : 'Seat'} ${item.label}${where ? `, ${where}` : ''}${item.femaleOnly ? ', women only' : ''}, ${word}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: !tappable }}
      disabled={!tappable}
      onPress={() => onPress(item.key)}
      hitSlop={4}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.w,
        height: item.h,
        backgroundColor: bg,
        borderColor: border,
        borderWidth: selected ? 2 : 1,
        borderRadius: berth ? radius.xs + 2 : radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pending ? 0.55 : status === 'BLOCKED' ? 0.5 : 1,
      }}
    >
      {berth ? (
        <View style={{ position: 'absolute', top: 4, width: '55%', height: 5, borderRadius: 3, backgroundColor: border, opacity: 0.45 }} />
      ) : null}
      <Text style={[typography.monoSmall, { color: fg, fontSize: 11 }]} numberOfLines={1}>
        {item.label}
      </Text>
      {item.capacity > 1 ? <Text style={[typography.caption, { color: fg, fontSize: 9, marginTop: 1 }]}>{`x${item.capacity}`}</Text> : null}
    </Pressable>
  );
});
SeatTile.displayName = 'SeatTile';
