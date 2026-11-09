import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import type { PaymentDTO, RootStackParamList } from '../types';
import { useTheme } from '../theme';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import { useWsEvent, useWsTopic } from '../lib/ws';
import { formatBookingReference, formatMoney } from '../lib/format';
import { AppHeader, ScreenContainer } from '../components/layout';
import { Banner, Button, Card, PageLoader, useToast } from '../components/ui';
import { LockCountdown } from '../features/seats';
import { bookingKeys, useBooking } from '../features/booking/hooks/useBookings';
import { initiatePayment, mockConfirmPayment } from '../features/payment/api/payment.api';
import {
  RazorpayCheckout,
  type CheckoutMessage,
} from '../features/payment/components/RazorpayCheckout';

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;
type Phase = 'starting' | 'ready' | 'checkout' | 'confirming' | 'failed';

export const PaymentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId, amountPaise, reference, expiresAt } = route.params;
  const { tokens, typography, spacing } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const [payment, setPayment] = useState<PaymentDTO | null>(null);
  const [phase, setPhase] = useState<Phase>('starting');
  const [message, setMessage] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);

  const waiting = phase === 'ready' || phase === 'checkout' || phase === 'confirming';
  const booking = useBooking(bookingId, waiting ? 3000 : false);
  const status = booking.data?.status;

  const start = useCallback(async () => {
    setPhase('starting');
    setMessage(null);
    try {
      setPayment(await initiatePayment(bookingId));
      setPhase('ready');
    } catch (err) {
      setMessage(
        err instanceof ApiError ? err.message : 'Could not start the payment. Please try again.',
      );
      setPhase('failed');
    }
  }, [bookingId]);

  useEffect(() => {
    void start();
  }, [start]);

  useWsTopic(`booking:${bookingId}`);

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
  }, [qc, bookingId]);

  useWsEvent('booking:confirmed', refresh);
  useWsEvent('booking:expired', refresh);
  useWsEvent('booking:cancelled', refresh);

  useEffect(() => {
    if (status === 'CONFIRMED' || status === 'CHECKED_IN') {
      navigation.reset({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'Ticket', params: { bookingId } }],
      });
    } else if (status === 'EXPIRED' || status === 'FAILED' || status === 'CANCELLED') {
      setPhase('failed');
      setMessage(
        status === 'EXPIRED'
          ? 'The payment time ran out and your seats were released.'
          : 'This booking can no longer be paid.',
      );
    }
  }, [status, bookingId, navigation]);

  useEffect(() => {
    if (phase !== 'confirming') {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 45_000);
    return () => clearTimeout(t);
  }, [phase]);

  const onCheckout = (m: CheckoutMessage): void => {
    if (m.type === 'success') {
      setPhase('confirming');
      refresh();
    } else if (m.type === 'dismiss') {
      setPhase('ready');
    } else {
      toast.show(m.description ?? 'The payment did not go through. You can try again.', 'error');
      setPhase('ready');
    }
  };

  const simulate = async (): Promise<void> => {
    if (!payment) return;
    setPhase('confirming');
    try {
      await mockConfirmPayment(payment.paymentId);
      refresh();
    } catch (err) {
      toast.show(
        err instanceof ApiError ? err.message : 'Could not confirm the test payment.',
        'error',
      );
      setPhase('ready');
    }
  };

  const leave = (): void => {
    if (phase === 'confirming') {
      navigation.navigate('MyTickets');
      return;
    }
    Alert.alert(
      'Leave payment?',
      'Your seats stay held until the timer ends. You can finish paying from My tickets.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', onPress: () => navigation.navigate('MyTickets') },
      ],
    );
  };

  // Razorpay hosted checkout full-screen (real gateway only)
  if (phase === 'checkout' && payment?.gateway && !payment.gateway.mock) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.canvasBg }}>
        <AppHeader title="Secure payment" onBackPress={() => setPhase('ready')} />
        <RazorpayCheckout
          keyId={payment.gateway.keyId}
          orderId={payment.gateway.orderId}
          amountPaise={payment.amountPaise}
          description={`Booking ${formatBookingReference(reference)}`}
          {...(user?.phone ? { contact: user.phone } : {})}
          email={user?.email ?? null}
          onMessage={onCheckout}
        />
      </View>
    );
  }

  return (
    <ScreenContainer scroll padded={false}>
      <AppHeader title="Payment" onBackPress={leave} />
      <View style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xl, gap: spacing.sm }}>
        <Card elevation="elevated" padding={spacing.lg}>
          <Text style={[typography.caption, { color: tokens.textMuted }]}>
            {`Booking ${formatBookingReference(reference)}`}
          </Text>
          <Text style={[typography.hero, { color: tokens.textBright, marginTop: 4 }]}>
            {formatMoney(payment?.amountPaise ?? amountPaise)}
          </Text>
        </Card>

        {waiting ? (
          <LockCountdown expiresAt={new Date(expiresAt).getTime()} onExpire={refresh} />
        ) : null}

        {phase === 'starting' ? (
          <PageLoader message="PREPARING PAYMENT" minHeight={280} />
        ) : null}

        {phase === 'ready' && payment ? (
          payment.gateway?.mock ? (
            <>
              <Banner type="warning" message="Development mode: no real money is taken." />
              <Button onPress={() => void simulate()} fullWidth>
                Simulate successful payment
              </Button>
            </>
          ) : payment.gateway ? (
            <Button onPress={() => setPhase('checkout')} fullWidth>
              {`Pay ${formatMoney(payment.amountPaise)}`}
            </Button>
          ) : (
            <Banner
              type="error"
              message="Payments are not available right now. Please try again shortly."
              action={{ label: 'Retry', onPress: () => void start() }}
            />
          )
        ) : null}

        {phase === 'confirming' ? (
          <View>
            <PageLoader message="CONFIRMING PAYMENT" width={220} minHeight={240} />
            {slow ? (
              <View style={{ gap: 12, marginTop: 8 }}>
                <Text
                  style={[
                    typography.caption,
                    { color: tokens.textMuted, textAlign: 'center' },
                  ]}
                >
                  This is taking longer than usual. If money was deducted, your ticket will
                  appear in My tickets shortly.
                </Text>
                <Button variant="secondary" onPress={() => navigation.navigate('MyTickets')}>
                  Go to My tickets
                </Button>
              </View>
            ) : null}
          </View>
        ) : null}

        {phase === 'failed' ? (
          <>
            <Banner type="error" message={message ?? 'Something went wrong.'} />
            {status === 'PENDING' || status === undefined ? (
              <Button onPress={() => void start()} fullWidth>
                Try again
              </Button>
            ) : (
              <Button onPress={() => navigation.navigate('Home')} fullWidth>
                Back to home
              </Button>
            )}
          </>
        ) : null}
      </View>
    </ScreenContainer>
  );
};

export default PaymentScreen;