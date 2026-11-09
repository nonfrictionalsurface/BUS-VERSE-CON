import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useCleanTheme } from '../../../theme/passengerAdapter';
import { Stand } from '../types';

interface Props {
  label: string;
  stops: Stand[];
  value: string;
  onChange: (standId: string) => void;
}

export function StandsPicker({ label, stops, value, onChange }: Props) {
  const theme = useCleanTheme();

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <View style={styles.list}>
        {stops.map((s) => {
          const active = s.standId === value;
          return (
            <Pressable
              key={s.standId}
              onPress={() => onChange(s.standId)}
              style={[
                styles.row,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surfaceElevated,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.rowText,
                  { color: active ? (theme.isDark ? '#000' : '#FFF') : theme.colors.text },
                ]}
              >
                {s.sequence}. {s.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  list: { gap: 6 },
  row: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1 },
  rowText: { fontSize: 14, fontWeight: '600' },
});