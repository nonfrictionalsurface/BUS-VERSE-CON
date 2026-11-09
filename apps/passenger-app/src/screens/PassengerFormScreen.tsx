import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useCleanTheme } from '../theme/passengerAdapter';
import { PassengerCard, StandsPicker, fetchScheduleDetail } from '../features/booking';
import { createBooking } from '../features/booking/api/booking.api';
import { PassengerInput, Stand } from '../features/booking/types';

export function PassengerFormScreen({ route, navigation }: any) {
  const theme = useCleanTheme();
  const { scheduleId, locks } = route.params;

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: () => fetchScheduleDetail(scheduleId),
    staleTime: 5 * 60_000,
  });

  const sortedStops = useMemo(() => [...(schedule?.stops ?? [])].sort((a, b) => a.sequence - b.sequence), [schedule]);
  const boardingStops = sortedStops.slice(0, Math.max(1, sortedStops.length - 1));
  const droppingStops = sortedStops.slice(1);

  const [boardingStandId, setBoardingStandId] = useState<string>(boardingStops[0]?.standId ?? '');
  const [droppingStandId, setDroppingStandId] = useState<string>(droppingStops[droppingStops.length - 1]?.standId ?? '');
  const [passengers, setPassengers] = useState<PassengerInput[]>(
    (locks ?? []).map((l: any) => ({
      seatId: l.seatId,
      seatLabel: l.seatLabel ?? l.seatId.slice(0, 4),
      name: '',
      age: '',
      gender: '',
    })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePassenger = (idx: number, patch: Partial<PassengerInput>) => {
    setPassengers((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const validate = (): string | null => {
    if (!boardingStandId) return 'Select a boarding stand.';
    if (!droppingStandId) return 'Select a dropping stand.';
    const bIdx = sortedStops.findIndex((s) => s.standId === boardingStandId);
    const dIdx = sortedStops.findIndex((s) => s.standId === droppingStandId);
    if (bIdx < 0 || dIdx < 0) return 'Invalid stand selection.';
    if (bIdx >= dIdx) return 'Dropping stand must come after boarding.';
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.name.trim() || p.name.trim().length < 2) return `Passenger ${i + 1}: enter a valid name.`;
      const age = parseInt(p.age, 10);
      if (isNaN(age) || age < 1 || age > 119) return `Passenger ${i + 1}: enter age 1–119.`;
      if (!p.gender) return `Passenger ${i + 1}: select a gender.`;
    }
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    if (!locks || locks.length === 0) {
      setError('No seats selected.');
      return;
    }

    setSubmitting(true);
    try {
      // Backend schema expects one lockId + passengers array
      const payload = {
        lockId: locks[0].lockId,
        boardingStandId,
        droppingStandId,
        passengers: passengers.map((p) => ({
          seatId: p.seatId,
          name: p.name.trim(),
          age: parseInt(p.age, 10),
          gender: p.gender as 'MALE' | 'FEMALE' | 'OTHER',
        })),
      };
      const result = await createBooking(payload as any);
      navigation.replace('Payment', { bookingId: result.bookingId });
    } catch (e: any) {
      console.warn('[PassengerForm] submit failed:', e?.message);
      setError(e?.message ?? 'Could not create booking. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !schedule) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (sortedStops.length < 2) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg, padding: 24 }]}>
        <Text style={{ color: theme.colors.text, textAlign: 'center' }}>
          This route has {sortedStops.length} stop{sortedStops.length === 1 ? '' : 's'} — need at least 2.
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>← Back to seats</Text>
        </Pressable>
      </View>
    );
  }

  const totalPaise = schedule.farePaise * passengers.length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.text }]}>Passenger details</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={[styles.summary, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '800' }}>
            {schedule.originCityName} → {schedule.destinationCityName}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
            {schedule.operatorName}
          </Text>
        </View>

        <StandsPicker label="Boarding stand" stops={boardingStops} value={boardingStandId} onChange={setBoardingStandId} />
        <StandsPicker label="Dropping stand" stops={droppingStops} value={droppingStandId} onChange={setDroppingStandId} />

        {passengers.map((p, idx) => (
          <PassengerCard key={p.seatId} index={idx} passenger={p} onChange={(patch) => updatePassenger(idx, patch)} />
        ))}

        {error && (
          <View style={[styles.err, { backgroundColor: theme.isDark ? 'rgba(239,68,68,0.15)' : 'rgba(209,106,106,0.15)', borderColor: theme.colors.danger }]}>
            <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: '600' }}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <View style={styles.bottomRow}>
          <View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>Total</Text>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', fontFamily: 'monospace' }}>
              ₹{(totalPaise / 100).toFixed(0)}
            </Text>
          </View>
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[styles.primaryBtn, { backgroundColor: theme.colors.primary, opacity: submitting ? 0.6 : 1 }]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
              {submitting ? 'Creating…' : 'Continue to pay'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 56, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  summary: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  err: { padding: 12, borderRadius: 8, borderWidth: 1, marginTop: 8, marginBottom: 8 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, borderTopWidth: 1, paddingBottom: 32 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  primaryBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 10 },
});