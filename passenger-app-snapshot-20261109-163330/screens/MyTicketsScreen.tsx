import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useTheme } from '../theme';
import { useAuth } from '../lib/auth';
import { AppHeader, ScreenContainer } from '../components/layout';
import { Banner, Button, Chip, Skeleton } from '../components/ui';
import { SignInRequired } from '../features/auth';
import { BookingCard } from '../features/booking/components/BookingCard';
import { useBookings } from '../features/booking/hooks/useBookings';
import { bucketOf, type Bucket } from '../features/booking/status';

type Props = NativeStackScreenProps<RootStackParamList, 'MyTickets'>;

const TABS: Array<{ id: Bucket; label: string; empty: string }> = [
  { id: 'upcoming', label: 'Upcoming', empty: 'No upcoming trips yet.' },
  { id: 'past', label: 'Past', empty: 'Your completed trips will show up here.' },
  { id: 'cancelled', label: 'Cancelled', empty: 'Nothing cancelled.' },
];

export const MyTicketsScreen: React.FC<Props> = ({ navigation }) => {
  const { tokens, typography, spacing } = useTheme();
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Bucket>('upcoming');
  const bookings = useBookings(isAuthenticated);

  // Always show fresh data when the screen comes back into view (e.g. after paying or cancelling).
  useEffect(() => {
    const off = navigation.addListener('focus', () => {
      if (isAuthenticated) void bookings.refetch();
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, isAuthenticated]);

  const grouped = useMemo(() => {
    const now = Date.now();
    const out: Record<Bucket, NonNullable<typeof bookings.data>> = { upcoming: [], past: [], cancelled: [] };
    for (const b of bookings.data ?? []) out[bucketOf(b, now)].push(b);
    out.upcoming.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
    out.past.sort((a, b) => b.departureTime.localeCompare(a.departureTime));
    out.cancelled.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return out;
  }, [bookings.data]);

  const current = TABS.find((t) => t.id === tab) ?? TABS[0];
  const list = grouped[tab];

  const body = (): React.ReactNode => {
    if (!isAuthenticated) return <SignInRequired message="Sign in to see the tickets you have booked." />;
    return (
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {TABS.map((t) => (
            <Chip key={t.id} label={`${t.label} (${grouped[t.id].length})`} selected={tab === t.id} onPress={() => setTab(t.id)} />
          ))}
        </View>
        {bookings.isError ? (
          <Banner type="error" message="Could not load your tickets." action={{ label: 'Retry', onPress: () => void bookings.refetch() }} />
        ) : bookings.isLoading ? (
          <View style={{ gap: spacing.sm }}>
            <Skeleton height={120} borderRadius={18} />
            <Skeleton height={120} borderRadius={18} />
          </View>
        ) : list.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm }}>
            <Text style={[typography.body, { color: tokens.textSecondary }]}>{current?.empty}</Text>
            {tab === 'upcoming' ? (
              <Button onPress={() => navigation.navigate('Search')}>Find a bus</Button>
            ) : null}
          </View>
        ) : (
          list.map((b) => <BookingCard key={b.bookingId} booking={b} onPress={() => navigation.navigate('Ticket', { bookingId: b.bookingId })} />)
        )}
      </View>
    );
  };

  return (
    <ScreenContainer scroll padded={false}>
      <AppHeader title="My tickets" onBackPress={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xl }}>{body()}</View>
    </ScreenContainer>
  );
};

export default MyTicketsScreen;
