import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useTheme } from '../theme';
import { useAuth } from '../lib/auth';
import { formatBookingReference, formatDate, formatMoney, formatTime } from '../lib/format';
import { AppHeader, ScreenContainer } from '../components/layout';
import { Badge, Banner, Button, Card, Skeleton } from '../components/ui';
import { SignInRequired } from '../features/auth';
import { useBooking, useTicket } from '../features/booking/hooks/useBookings';
import { canCancel, statusMeta } from '../features/booking/status';

type Props = NativeStackScreenProps<RootStackParamList, 'Ticket'>;

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong = false }) => {
  const { tokens, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={[typography.body, { color: tokens.textSecondary }]}>{label}</Text>
      <Text style={[strong ? typography.monoData : typography.body, { color: tokens.textBright }]}>{value}</Text>
    </View>
  );
};

export const TicketScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;
  const { tokens, typography, spacing, radius } = useTheme();
  const { isAuthenticated } = useAuth();

  // While the payment is still landing, keep checking.
  const [poll, setPoll] = useState<number | false>(false);
  const booking = useBooking(bookingId, poll);
  const b = booking.data;
  useEffect(() => {
    setPoll(b?.status === 'PENDING' ? 4000 : false);
  }, [b?.status]);

  const live = b?.status === 'CONFIRMED' || b?.status === 'CHECKED_IN' || b?.status === 'COMPLETED';
  const ticket = useTicket(bookingId, live && !!b?.ticket);
  const qrVisible = ticket.data && (ticket.data.status === 'ISSUED' || ticket.data.status === 'ACTIVE');

  const body = (): React.ReactNode => {
    if (!isAuthenticated) return <SignInRequired message="Sign in to see your tickets." />;
    if (booking.isError) {
      return <Banner type="error" message="Could not load this ticket." action={{ label: 'Retry', onPress: () => void booking.refetch() }} />;
    }
    if (!b) return <Skeleton height={420} borderRadius={18} />;

    const meta = statusMeta(b.status);
    const trackable = !!b.trip && (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') && (b.trip.status === 'SCHEDULED' || b.trip.status === 'IN_PROGRESS');

    return (
      <View style={{ gap: spacing.sm }}>
        <Card elevation="elevated" padding={spacing.lg}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[typography.monoSmall, { color: tokens.textMuted }]}>{formatBookingReference(b.bookingReference)}</Text>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </View>
          <Text style={[typography.h3, { color: tokens.textBright, marginTop: 10 }]}>
            {`${b.routeSummary.originCity} \u2192 ${b.routeSummary.destinationCity}`}
          </Text>
          <Text style={[typography.body, { color: tokens.textSecondary, marginTop: 2 }]}>
            {`${formatDate(b.departureTime, 'full')}, ${formatTime(b.departureTime)}`}
          </Text>
        </Card>

        {b.status === 'PENDING' ? (
          <Banner
            type="warning"
            message="Payment is not complete yet."
            action={{
              label: 'Pay now',
              onPress: () =>
                navigation.navigate('Payment', {
                  bookingId: b.bookingId,
                  amountPaise: b.totalFarePaise,
                  reference: b.bookingReference,
                  expiresAt: b.expiresAt ?? new Date(Date.now() + 10 * 60_000).toISOString(),
                }),
            }}
          />
        ) : null}

        {qrVisible && ticket.data ? (
          <Card elevation="elevated" padding={spacing.lg}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: radius.lg }}>
                <QRCode value={ticket.data.qrPayload} size={208} color="#0B1830" backgroundColor="#FFFFFF" />
              </View>
              <Text style={[typography.caption, { color: tokens.textMuted, marginTop: 10, textAlign: 'center' }]}>
                Show this code to the driver when you board.
              </Text>
            </View>
          </Card>
        ) : live && b.ticket && ticket.isLoading ? (
          <Skeleton height={260} borderRadius={18} />
        ) : null}

        <Card padding={spacing.md}>
          <Text style={[typography.label, { color: tokens.textSecondary, marginBottom: 6 }]}>Journey</Text>
          <Row label="Board at" value={b.boardingStand.name} />
          <Row label="Get off at" value={b.droppingStand.name} />
          <Row label="Arrives" value={`${formatDate(b.arrivalTime, 'short')}, ${formatTime(b.arrivalTime)}`} />
        </Card>

        <Card padding={spacing.md}>
          <Text style={[typography.label, { color: tokens.textSecondary, marginBottom: 6 }]}>Passengers</Text>
          {b.passengers.map((p) => (
            <Row
              key={p.seatId}
              label={`${p.name}${p.age ? `, ${p.age}` : ''}`}
              value={`Seat ${p.seatLabel}`}
            />
          ))}
        </Card>

        <Card padding={spacing.md}>
          <Text style={[typography.label, { color: tokens.textSecondary, marginBottom: 6 }]}>Fare</Text>
          <Row label="Base fare" value={formatMoney(b.fareBreakdown.baseFarePaise)} />
          <Row label="Taxes" value={formatMoney(b.fareBreakdown.taxPaise)} />
          <Row label="Convenience fee" value={formatMoney(b.fareBreakdown.convenienceFeePaise)} />
          <Row label="Total" value={formatMoney(b.fareBreakdown.totalPaise)} strong />
        </Card>

        {trackable && b.trip ? (
          <Button onPress={() => navigation.navigate('LiveTracking', { tripId: b.trip?.tripId ?? '', bookingId: b.bookingId })} fullWidth>
            Track my bus
          </Button>
        ) : null}
        {canCancel(b) ? (
          <Button variant="danger" onPress={() => navigation.navigate('Cancel', { bookingId: b.bookingId })} fullWidth>
            Cancel booking
          </Button>
        ) : null}
      </View>
    );
  };

  return (
    <ScreenContainer scroll padded={false}>
      <AppHeader title="Your ticket" onBackPress={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xl }}>{body()}</View>
    </ScreenContainer>
  );
};

export default TicketScreen;
