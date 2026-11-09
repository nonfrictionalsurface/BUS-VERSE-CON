import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useTheme } from '../theme';
import { useAuth } from '../lib/auth';
import { AppHeader, ScreenContainer } from '../components/layout';
import { Banner, Button, PageLoader } from '../components/ui';
import { SignInRequired } from '../features/auth';
import { SeatDeck, SeatLegend, LockCountdown, useSeatDeck } from '../features/seats';
import { fetchScheduleDetail } from '../features/booking';

type Props = NativeStackScreenProps<RootStackParamList, 'SeatSelection'>;

export const SeatSelectionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { scheduleId } = route.params;
  const { tokens, typography, spacing } = useTheme();
  const { isAuthenticated } = useAuth();

  const deck = useSeatDeck(scheduleId, isAuthenticated);
  const schedule = useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: () => fetchScheduleDetail(scheduleId),
    staleTime: 5 * 60_000,
  });

  const handleContinue = useCallback(() => {
    if (deck.locks.size === 0) return;
    const seatById = new Map(deck.seats.map((s) => [s.id, s]));
    const seats = Array.from(deck.locks.values()).map((l) => ({
      seatId: l.seatId,
      label: l.seatLabel,
      lockId: l.lockId,
      femaleOnly: seatById.get(l.seatId)?.isFemaleOnly ?? false,
    }));
    const lockExpiresAt =
      deck.earliestExpiry ?? new Date(Date.now() + 5 * 60_000).toISOString();
    navigation.navigate('PassengerManifest', {
      scheduleId,
      farePaise: schedule.data?.farePaise ?? 0,
      seats,
      lockExpiresAt,
    });
  }, [deck.locks, deck.seats, deck.earliestExpiry, navigation, scheduleId, schedule.data?.farePaise]);

  if (!isAuthenticated) {
    return (
      <ScreenContainer scroll padded={false}>
        <AppHeader title="Choose seats" onBackPress={() => navigation.goBack()} />
        <View style={{ paddingHorizontal: spacing.sm, paddingTop: spacing.lg }}>
          <SignInRequired message="Sign in to view seat availability and book." />
        </View>
      </ScreenContainer>
    );
  }

  if (deck.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.canvasBg }}>
        <AppHeader title="Choose seats" onBackPress={() => navigation.goBack()} />
        <PageLoader message="LOADING SEATS" />
      </View>
    );
  }

  const totalPaise = (schedule.data?.farePaise ?? 0) * deck.locks.size;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.canvasBg }}>
      <AppHeader title="Choose seats" onBackPress={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.sm, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {schedule.data && (
          <View style={[styles.infoCard, { backgroundColor: tokens.surfaceCard, borderColor: tokens.borderHairline }]}>
            <Text style={[typography.h4, { color: tokens.textBright }]}>
              {schedule.data.originCityName} → {schedule.data.destinationCityName}
            </Text>
            <Text style={[typography.caption, { color: tokens.textMuted, marginTop: 4 }]}>
              {schedule.data.operatorName} · {schedule.data.stops.length} stops · ₹
              {(schedule.data.farePaise / 100).toFixed(0)}/seat
            </Text>
          </View>
        )}

        {deck.error && (
          <Banner
            type="error"
            message={deck.error}
            action={{ label: 'Retry', onPress: () => void deck.refresh() }}
          />
        )}

        <View style={{ marginVertical: spacing.sm }}>
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
        ) : !deck.error ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Text style={[typography.body, { color: tokens.textSecondary, textAlign: 'center' }]}>
              No seats available for this trip.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {deck.locks.size > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: tokens.surfaceCard, borderTopColor: tokens.borderSubtle }]}>
          {deck.earliestExpiry && (
            <LockCountdown expiresAt={deck.earliestExpiry} onExpire={deck.handleExpire} />
          )}
          <View style={styles.bottomRow}>
            <View>
              <Text style={[typography.caption, { color: tokens.textMuted }]}>
                {deck.locks.size} seat{deck.locks.size > 1 ? 's' : ''}
              </Text>
              <Text style={[typography.monoData, { color: tokens.textBright, fontSize: 18 }]}>
                ₹{(totalPaise / 100).toFixed(0)}
              </Text>
            </View>
            <Button onPress={handleContinue}>Continue ({deck.locks.size})</Button>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  infoCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, borderTopWidth: 1, paddingBottom: 32 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
});

export default SeatSelectionScreen;