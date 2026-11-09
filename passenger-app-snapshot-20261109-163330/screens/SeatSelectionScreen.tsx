import React, { useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useCleanTheme } from '../theme/passengerAdapter';
import { SeatDeck, SeatLegend, LockCountdown, useSeatDeck } from '../features/seats';
import { fetchScheduleDetail } from '../features/booking';

export function SeatSelectionScreen({ route, navigation }: any) {
  const theme = useCleanTheme();
  const { scheduleId } = route.params;

  const deck = useSeatDeck(scheduleId);
  const { data: schedule } = useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: () => fetchScheduleDetail(scheduleId),
    staleTime: 5 * 60_000,
  });

  const handleContinue = useCallback(() => {
    if (deck.locks.size === 0) return;
    const locks = Array.from(deck.locks.values());
    navigation.navigate('PassengerForm', { scheduleId, locks });
  }, [deck.locks, navigation, scheduleId]);

  if (deck.loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.textMuted, marginTop: 12 }}>Loading seats…</Text>
      </View>
    );
  }

  const totalPaise = (schedule?.farePaise ?? 0) * deck.locks.size;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.text }]}>Choose seats</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {schedule && (
          <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.route, { color: theme.colors.text }]}>
              {schedule.originCityName} → {schedule.destinationCityName}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
              {schedule.operatorName} · {schedule.stops.length} stops · ₹{(schedule.farePaise / 100).toFixed(0)}/seat
            </Text>
          </View>
        )}

        {deck.error && (
          <View style={[styles.err, { backgroundColor: theme.isDark ? 'rgba(239,68,68,0.15)' : 'rgba(209,106,106,0.15)', borderColor: theme.colors.danger }]}>
            <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: '600' }}>{deck.error}</Text>
          </View>
        )}

        <View style={{ marginBottom: 16 }}>
          <SeatLegend />
        </View>

        {deck.layout && deck.seats.length > 0 ? (
          <SeatDeck
            seats={deck.seats}
            layout={deck.layout}
            selectedSeatIds={deck.selectedSeatIds}
            onSeatClick={deck.toggle}
            disabled={!!deck.togglingSeatId}
          />
        ) : (
          <Text style={{ color: theme.colors.textMuted, textAlign: 'center', padding: 40 }}>
            No seats available.
          </Text>
        )}
      </ScrollView>

      {deck.locks.size > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          {deck.earliestExpiry && (
            <LockCountdown expiresAt={deck.earliestExpiry} onExpire={deck.handleExpire} />
          )}
          <View style={styles.bottomRow}>
            <View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>{deck.locks.size} seat{deck.locks.size > 1 ? 's' : ''}</Text>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800', fontFamily: 'monospace' }}>
                ₹{(totalPaise / 100).toFixed(0)}
              </Text>
            </View>
            <Pressable
              onPress={handleContinue}
              style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={{ color: theme.isDark ? '#000' : '#FFF', fontWeight: '800' }}>
                Continue ({deck.locks.size})
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 56, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  infoCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  route: { fontSize: 18, fontWeight: '800' },
  err: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, borderTopWidth: 1, paddingBottom: 32 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  primaryBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 10 },
});