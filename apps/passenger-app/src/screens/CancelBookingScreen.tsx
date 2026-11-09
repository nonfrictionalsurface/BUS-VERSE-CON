import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import type { CancelBookingResultDTO, RefundTier, RootStackParamList } from '../types';
import { useTheme } from '../theme';
import { ApiError } from '../lib/api';
import { formatDate, formatMoney, formatTime } from '../lib/format';
import { AppHeader, ScreenContainer } from '../components/layout';
import { Banner, Button, Card, PageLoader, useToast } from '../components/ui';
import { bookingKeys, useRefundPreview } from '../features/booking/hooks/useBookings';
import { cancelBooking } from '../features/booking/api/booking.api';

type Props = NativeStackScreenProps<RootStackParamList, 'Cancel'>;

const TIER_TEXT: Record<RefundTier, string> = {
  TIER_FULL: 'Full refund',
  TIER_75: '75% refund',
  TIER_50: '50% refund',
  TIER_ZERO: 'No refund',
  TIER_NOT_ELIGIBLE: 'This booking can no longer be cancelled',
};

export const CancelBookingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;
  const { tokens, typography, spacing } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const preview = useRefundPreview(bookingId);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<CancelBookingResultDTO | null>(null);

  const doCancel = async (): Promise<void> => {
    setBusy(true);
    try {
      setDone(await cancelBooking(bookingId));
      void qc.invalidateQueries({ queryKey: bookingKeys.list });
      void qc.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Could not cancel the booking. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirm = (): void => {
    Alert.alert('Cancel this booking?', 'This cannot be undone.', [
      { text: 'Keep booking', style: 'cancel' },
      { text: 'Cancel booking', style: 'destructive', onPress: () => void doCancel() },
    ]);
  };

  const Line: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong = false }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={[typography.body, { color: tokens.textSecondary }]}>{label}</Text>
      <Text style={[strong ? typography.monoData : typography.body, { color: tokens.textBright }]}>{value}</Text>
    </View>
  );

  const body = (): React.ReactNode => {
    if (done) {
      return (
        <View style={{ gap: spacing.sm }}>
          <Banner type="success" message="Your booking is cancelled." />
          <Card padding={spacing.md}>
            <Line label="Refund" value={TIER_TEXT[done.refund.tier]} />
            <Line label="Refund amount" value={formatMoney(done.refund.amountPaise)} strong />
          </Card>
          <Button onPress={() => navigation.navigate('MyTickets')} fullWidth>
            Back to my tickets
          </Button>
        </View>
      );
    }
    if (preview.isError) {
      return <Banner type="error" message="Could not work out your refund." action={{ label: 'Retry', onPress: () => void preview.refetch() }} />;
    }
    const p = preview.data;
    if (!p) return <PageLoader message="CALCULATING REFUND" minHeight={240} />;
    const eligible = p.tier !== 'TIER_NOT_ELIGIBLE';
    return (
      <View style={{ gap: spacing.sm }}>
        <Card elevation="elevated" padding={spacing.lg}>
          <Text style={[typography.h4, { color: tokens.textBright }]}>{TIER_TEXT[p.tier]}</Text>
          {p.cancellationDeadlineAt ? (
            <Text style={[typography.caption, { color: tokens.textMuted, marginTop: 4 }]}>
              {`Free changes end ${formatDate(p.cancellationDeadlineAt, 'short')}, ${formatTime(p.cancellationDeadlineAt)}`}
            </Text>
          ) : null}
        </Card>
        {eligible ? (
          <Card padding={spacing.md}>
            <Line label="You paid" value={formatMoney(p.totalPaidPaise)} />
            <Line label="Fare refund" value={formatMoney(p.fareRefundPaise)} />
            <Line label="Tax refund" value={formatMoney(p.taxRefundPaise)} />
            <Line label="Fee refund" value={formatMoney(p.feeRefundPaise)} />
            <Line label="Total refund" value={formatMoney(p.totalRefundPaise)} strong />
            <Text style={[typography.caption, { color: tokens.textMuted, marginTop: 8 }]}>
              {`Back to ${p.paymentMethod ?? 'your payment method'}${p.paymentMethodLast4 ? ` ending ${p.paymentMethodLast4}` : ''} in ${p.expectedRefundDays.min} to ${p.expectedRefundDays.max} days.`}
            </Text>
          </Card>
        ) : null}
        <Button variant="danger" onPress={confirm} loading={busy} disabled={busy || !eligible} fullWidth>
          Cancel booking
        </Button>
        <Button variant="ghost" onPress={() => navigation.goBack()} fullWidth>
          Keep my booking
        </Button>
      </View>
    );
  };

  return (
    <ScreenContainer scroll padded={false}>
      <AppHeader title="Cancel booking" onBackPress={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xl }}>{body()}</View>
    </ScreenContainer>
  );
};

export default CancelBookingScreen;
