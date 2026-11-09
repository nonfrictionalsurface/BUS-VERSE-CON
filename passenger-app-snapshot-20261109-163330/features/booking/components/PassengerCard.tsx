import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useCleanTheme } from '../../../theme/passengerAdapter';
import { PassengerInput } from '../types';

interface Props {
  index: number;
  passenger: PassengerInput;
  onChange: (patch: Partial<PassengerInput>) => void;
}

export function PassengerCard({ index, passenger, onChange }: Props) {
  const theme = useCleanTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.borderSubtle }]}>
        <Text style={[styles.indexLabel, { color: theme.colors.textMuted }]}>PASSENGER {index + 1}</Text>
        <View style={[styles.seatBadge, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.primary }]}>
          <Text style={[styles.seatBadgeText, { color: theme.colors.primary }]}>Seat {passenger.seatLabel}</Text>
        </View>
      </View>

      <Text style={[styles.label, { color: theme.colors.text }]}>Full name</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.colors.surfaceElevated, color: theme.colors.text, borderColor: theme.colors.border }]}
        value={passenger.name}
        onChangeText={(v) => onChange({ name: v })}
        placeholder="e.g. Alice Sharma"
        placeholderTextColor={theme.colors.textMuted}
        autoComplete="name"
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Age</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surfaceElevated, color: theme.colors.text, borderColor: theme.colors.border }]}
            value={passenger.age}
            onChangeText={(v) => onChange({ age: v.replace(/\D/g, '').slice(0, 3) })}
            placeholder="28"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>
        <View style={{ flex: 2 }}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Gender</Text>
          <View style={[styles.genderRow, { borderColor: theme.colors.border }]}>
            {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
              <Text
                key={g}
                onPress={() => onChange({ gender: g })}
                style={[
                  styles.genderOption,
                  passenger.gender === g
                    ? { backgroundColor: theme.colors.primary, color: theme.isDark ? '#000' : '#FFF' }
                    : { backgroundColor: theme.colors.surfaceElevated, color: theme.colors.textMuted },
                ]}
              >
                {g === 'MALE' ? 'M' : g === 'FEMALE' ? 'F' : 'O'}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1 },
  indexLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  seatBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  seatBadgeText: { fontSize: 12, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { height: 44, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  genderRow: { flexDirection: 'row', borderRadius: 8, borderWidth: 1, overflow: 'hidden', height: 44 },
  genderOption: { flex: 1, textAlign: 'center', textAlignVertical: 'center', fontSize: 14, fontWeight: '700', paddingVertical: 12 },
});