import React, { useEffect, useMemo, useRef } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MAX_SEATS_PER_BOOKING, suggestTogether, summarize, validateSelection, type RuntimeMap } from '@busverse/seat-engine';
import type { AvailabilitySeatDTO, RootStackParamList } from '../types';
import { useTheme } from '../theme';
import { useAuth } from '../lib/auth';
import { formatMoney } from '../lib/format';
import { AppHeader, ScreenContainer } from '../components/layout';
import { Banner, Card, Chip, Skeleton, useToast } from '../components/ui';
import { SignInRequired } from '../features/auth';
import {
  LockCountdown,
  SeatLegend,
  SeatMap,
  SelectedSeatsSummary,
  useAvailability,
  useSeatLock,
  useSeatRealtime,
} from '../features/seats';

type Props = NativeStackScreenProps<RootStackParamList, 'SeatSelection'>;

export const SeatSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { scheduleId, farePaise } = route.params;
  const { tokens, typography, spacing } = useTheme();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const { width } = useWindowDimensions();

  const availability = useAvailability(scheduleId, isAuthenticated);
  useSeatRealtime(scheduleId);
  const seatLock = useSeatLock(scheduleId);
  const { layout, index, runtime } = availability;

  const selectedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const seatId of Object.keys(seatLock.locks)) {
      const s = index.byId.get(seatId);
      if (s) keys.add(s.key ?? s.label);
    }
    return keys;
  }, [seatLock.locks, index]);

  const pendingKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const seatId of seatLock.pending) {
      const s = index.byId.get(seatId);
      if (s) keys.add(s.key ?? s.label);
    }
    return keys;
  }, [seatLock.pending, index]);

  // Selected seats in bus order (front to back), not in the order they were tapped.
  const selectedSeats = useMemo(() => {
    const out: AvailabilitySeatDTO[] = [];
    for (const s of layout?.seats ?? []) {
      const dto = selectedKeys.has(s.key) ? index.byKey.get(s.key) : undefined;
      if (dto) out.push(dto);
    }
    return out;
  }, [layout, selectedKeys, index]);

  const summary = useMemo(() => (layout ? summarize(layout, runtime) : null), [layout, runtime]);

  // Leaving the screen frees the seats, unless we are handing them to the next step.
  const handoff = useRef(false);
  const releaseAll = useRef(seatLock.releaseAll);
  releaseAll.current = seatLock.releaseAll;
  useEffect(() => {
    const off = navigation.addListener('focus', () => {
      handoff.current = false;
    });
    return () => {
      off();
      if (!handoff.current) void releaseAll.current();
    };
  }, [navigation]);

  const onToggle = (key: string): void => {
    const seat = index.byKey.get(key);
    if (seat) void seatLock.toggleSeat(seat.id);
  };

  const seatTogether = async (n: number): Promise<void> => {
    if (!layout) return;
    const rt: Record<string, RuntimeMap[string]> = { ...runtime };
    for (const k of selectedKeys) rt[k] = { status: 'BOOKED' }; // only add new seats
    const pick = suggestTogether(layout, rt, n);
    if (!pick) {
      toast.show(`No ${n} seats are free together.`, 'info');
      return;
    }
    const ids = pick.flatMap((k) => {
      const id = index.byKey.get(k)?.id;
      return id ? [id] : [];
    });
    await seatLock.lockMany(ids);
  };

  const handleContinue = (): void => {
    if (!layout || selectedSeats.length === 0) return;
    const issues = validateSelection(layout, [...selectedKeys]);
    const blocking = issues.find((i) => i.severity === 'error');
    if (blocking) {
      toast.show(blocking.message, 'error');
      return;
    }
    const seats = selectedSeats.flatMap((s) => {
      const lock = seatLock.locks[s.id];
      return lock ? [{ seatId: s.id, label: s.label, lockId: lock.lockId, femaleOnly: s.isFemaleOnly }] : [];
    });
    if (seats.length !== selectedSeats.length) {
      toast.show('Some seat holds ended. Please check your seats.', 'warning');
      return;
    }
    handoff.current = true;
    navigation.navigate('PassengerManifest', {
      scheduleId,
      farePaise,
      seats,
      lockExpiresAt: new Date(seatLock.earliestExpiry ?? Date.now()).toISOString(),
    });
  };

  const body = (): React.ReactNode => {
    if (!isAuthenticated) {
      return <SignInRequired message="Sign in with your phone number to see live seats and hold the ones you like." />;
    }
    if (availability.isError) {
      return <Banner type="error" message="Could not load the seat map." action={{ label: 'Retry', onPress: () => void availability.refetch() }} />;
    }
    if (availability.isLoading || !availability.data) {
      return (
        <View style={{ gap: 12 }}>
          <Skeleton height={44} />
          <Skeleton height={360} borderRadius={28} />
        </View>
      );
    }
    if (!layout) {
      return <Banner type="error" message="This bus layout cannot be shown right now. Please try another bus." />;
    }
    return (
      <>
        {seatLock.resumable.length > 0 && selectedKeys.size === 0 ? (
          <View style={{ marginBottom: spacing.sm }}>
            <Banner
              type="info"
              message={`You still hold ${seatLock.resumable.length} seat${seatLock.resumable.length > 1 ? 's' : ''} from earlier.`}
              action={{ label: 'Continue with them', onPress: seatLock.resume }}
              onDismiss={() => void seatLock.discardResumable()}
            />
          </View>
        ) : null}

        <Card padding={spacing.sm}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[typography.label, { color: tokens.textSecondary }]}>{`${summary?.available ?? 0} of ${summary?.total ?? 0} seats free`}</Text>
            <Text style={[typography.monoData, { color: tokens.textBright }]}>{`${formatMoney(farePaise)} / seat`}</Text>
          </View>
        </Card>

        <View style={{ marginTop: spacing.sm, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={[typography.caption, { color: tokens.textMuted }]}>Seat together</Text>
          {[2, 3, 4].map((n) => (
            <Chip key={n} label={`${n}`} disabled={(summary?.available ?? 0) < n} onPress={() => void seatTogether(n)} />
          ))}
        </View>

        <SeatMap
          layout={layout}
          runtime={runtime}
          selected={selectedKeys}
          pending={pendingKeys}
          onToggle={onToggle}
          availableWidth={width - spacing.sm * 2}
        />

        <View style={{ marginTop: spacing.md }}>
          <SeatLegend />
        </View>

        {seatLock.earliestExpiry ? (
          <View style={{ marginTop: spacing.md }}>
            <LockCountdown
              expiresAt={seatLock.earliestExpiry}
              onExpire={() => {
                seatLock.dropExpired();
                toast.show('Your seat hold ended. Please pick your seats again.', 'warning');
                void availability.refetch();
              }}
            />
          </View>
        ) : null}

        <View style={{ marginTop: spacing.md }}>
          <SelectedSeatsSummary
            seats={selectedSeats}
            farePaise={farePaise}
            onRemove={(id) => void seatLock.releaseSeat(id)}
            onContinue={handleContinue}
            disabled={selectedSeats.length === 0 || selectedSeats.length > MAX_SEATS_PER_BOOKING}
          />
        </View>
      </>
    );
  };

  return (
    <ScreenContainer scroll padded={false}>
      <AppHeader title="Choose seats" onBackPress={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xl }}>{body()}</View>
    </ScreenContainer>
  );
};

export default SeatSelectionScreen;
