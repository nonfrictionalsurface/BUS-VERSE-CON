import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';

type LegendItem = { label: string; bg: string; border: string };

export const SeatLegend: React.FC = () => {
  const { tokens, typography, radius } = useTheme();
  const items: LegendItem[] = [
    { label: 'Available', bg: tokens.seatAvailableBg, border: tokens.seatAvailableBorder },
    { label: 'Female', bg: tokens.seatFemaleBg, border: tokens.seatFemaleBorder },
    { label: 'Selected', bg: tokens.seatSelectedBg, border: tokens.seatSelectedBorder },
    { label: 'Locked', bg: tokens.seatLockedBg, border: tokens.seatLockedBorder },
    { label: 'Booked', bg: tokens.seatBookedBg, border: tokens.seatBookedBorder },
  ];

  return (
    <View style={styles.wrap}>
      {items.map((it) => (
        <View key={it.label} style={styles.item}>
          <View
            style={[
              styles.dot,
              { backgroundColor: it.bg, borderColor: it.border, borderRadius: radius.xs },
            ]}
          />
          <Text style={[typography.caption, { color: tokens.textSecondary, marginLeft: 6 }]}>
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginVertical: 12,
  },
  item: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 14, height: 14, borderWidth: 1.5 },
});

export default SeatLegend;