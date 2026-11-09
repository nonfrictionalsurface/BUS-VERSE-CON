import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCleanTheme } from '../../../theme/passengerAdapter';

export function SeatLegend() {
  const theme = useCleanTheme();

  const items = [
    { bg: theme.colors.surface, border: theme.colors.border, label: 'Available' },
    { bg: theme.colors.primary, border: theme.colors.primary, label: 'Selected' },
    { bg: theme.isDark ? 'rgba(245,158,11,0.15)' : 'rgba(216,168,96,0.2)', border: theme.colors.warning, label: 'Locked' },
    { bg: theme.colors.surfaceElevated, border: theme.colors.borderSubtle, label: 'Booked' },
    { bg: theme.isDark ? 'rgba(236,72,153,0.15)' : 'rgba(219,39,119,0.1)', border: '#DB2777', label: 'Female' },
  ];

  return (
    <View style={styles.row}>
      {items.map((it) => (
        <View key={it.label} style={styles.item}>
          <View style={[styles.chip, { backgroundColor: it.bg, borderColor: it.border }]} />
          <Text style={[styles.text, { color: theme.colors.textMuted }]}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chip: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5 },
  text: { fontSize: 11 },
});