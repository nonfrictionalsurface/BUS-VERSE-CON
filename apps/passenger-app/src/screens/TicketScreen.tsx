import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  Modal as RNModal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import type { RootStackParamList } from '../types';
import { useTheme } from '../theme';
import { useAuth } from '../lib/auth';
import { formatBookingReference, formatDate, formatMoney, formatTime } from '../lib/format';
import { AppHeader, ScreenContainer } from '../components/layout';
import { Badge, Banner, Button, PageLoader } from '../components/ui';
import { SignInRequired } from '../features/auth';
import { useBooking, useTicket } from '../features/booking/hooks/useBookings';
import { canCancel, statusMeta } from '../features/booking/status';
import { fetchScheduleDetail } from '../features/booking/api/booking.api';

type Props = NativeStackScreenProps<RootStackParamList, 'Ticket'>;

const COACH_LABELS: Record<string, string> = {
  SEATER: 'Seater',
  AC_SEATER: 'AC Seater',
  NON_AC_SEATER: 'Non-AC Seater',
  SLEEPER: 'Sleeper',
  AC_SLEEPER: 'AC Sleeper',
  NON_AC_SLEEPER: 'Non-AC Sleeper',
  SEMI_SLEEPER: 'Semi-Sleeper',
  AC_SEMI_SLEEPER: 'AC Semi-Sleeper',
};

export const TicketScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;
  const { tokens, typography, spacing } = useTheme();
  const { isAuthenticated } = useAuth();
  const { width: windowWidth } = useWindowDimensions();

  const [poll, setPoll] = useState<number | false>(false);
  const [qrFullscreen, setQrFullscreen] = useState(false);

  const booking = useBooking(bookingId, poll);
  const b = booking.data;

  useEffect(() => {
    setPoll(b?.status === 'PENDING' ? 4000 : false);
  }, [b?.status]);

  const live = b?.status === 'CONFIRMED' || b?.status === 'CHECKED_IN' || b?.status === 'COMPLETED';
  const ticket = useTicket(bookingId, live && !!b?.ticket);
  const qrVisible =
    !!ticket.data && (ticket.data.status === 'ISSUED' || ticket.data.status === 'ACTIVE');

  const schedule = useQuery({
    queryKey: ['schedule', b?.scheduleId ?? 'none'],
    queryFn: () => fetchScheduleDetail(b?.scheduleId ?? ''),
    enabled: !!b?.scheduleId,
    staleTime: 5 * 60_000,
  });

  // Fullscreen QR sizing — fits within window with margin.
  const fullQrSize = Math.min(windowWidth * 0.8, 440);

  const body = (): React.ReactNode => {
    if (!isAuthenticated) return <SignInRequired message="Sign in to see your tickets." />;
    if (booking.isError) {
      return (
        <Banner
          type="error"
          message="Could not load this ticket."
          action={{ label: 'Retry', onPress: () => void booking.refetch() }}
        />
      );
    }
    if (!b) return <PageLoader message="LOADING TICKET" minHeight={420} />;

    const meta = statusMeta(b.status);
    const trackable =
      !!b.trip &&
      (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') &&
      (b.trip.status === 'SCHEDULED' || b.trip.status === 'IN_PROGRESS');
    const firstSeat = b.passengers[0]?.seatLabel ?? '—';
    const busClass = schedule.data?.busType
      ? COACH_LABELS[schedule.data.busType] ?? schedule.data.busType
      : 'Coach';

    const openQr = (): void => {
      if (qrVisible) setQrFullscreen(true);
    };

    return (
      <View style={{ gap: spacing.sm }}>
        {/* ── Ticket stub (Design_guide §7) ── */}
        <View
          style={[
            styles.stub,
            { backgroundColor: tokens.surfaceCard, borderColor: tokens.borderStrong },
          ]}
        >
          {/* Top half */}
          <View style={[styles.stubTop, { borderBottomColor: tokens.borderStrong }]}>
            <View style={styles.cityRow}>
              <Text style={[styles.cityHero, { color: tokens.textBright }]} numberOfLines={1}>
                {b.routeSummary.originCity.toUpperCase()}
              </Text>
              <Text style={[styles.arrow, { color: tokens.telemetryCyan }]}>→</Text>
              <Text style={[styles.cityHero, { color: tokens.textBright }]} numberOfLines={1}>
                {b.routeSummary.destinationCity.toUpperCase()}
              </Text>
            </View>
            <Text style={[typography.caption, { color: tokens.textMuted, marginTop: 4 }]}>
              {`${b.boardingStand.name} → ${b.droppingStand.name}`}
            </Text>

            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Text style={[styles.monoLabel, { color: tokens.textMuted }]}>DEPARTURE</Text>
                <Text style={[typography.label, { color: tokens.textBright, marginTop: 2 }]}>
                  {formatTime(b.departureTime)}
                </Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.monoLabel, { color: tokens.textMuted }]}>SEAT</Text>
                <Text style={[typography.h4, { color: tokens.brandPrimary, marginTop: 2 }]}>
                  {firstSeat}
                </Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.monoLabel, { color: tokens.textMuted }]}>BUS CLASS</Text>
                <Text
                  style={[typography.label, { color: tokens.textBright, marginTop: 2 }]}
                  numberOfLines={1}
                >
                  {busClass}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.notch,
                styles.notchLeft,
                { backgroundColor: tokens.canvasBg, borderColor: tokens.borderStrong },
              ]}
            />
            <View
              style={[
                styles.notch,
                styles.notchRight,
                { backgroundColor: tokens.canvasBg, borderColor: tokens.borderStrong },
              ]}
            />
          </View>

          {/* Bottom half */}
          <View style={[styles.stubBottom, { backgroundColor: tokens.surfaceHover }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[typography.body, { color: tokens.textBright, fontWeight: '700' }]}>
                {b.passengers[0]?.name ?? 'Passenger'}
              </Text>
              <Text style={[styles.monoSmall, { color: tokens.textMuted, marginTop: 4 }]}>
                {`PNR: ${formatBookingReference(b.bookingReference)}`}
              </Text>
              {b.status === 'CONFIRMED' || b.status === 'CHECKED_IN' ? (
                <View style={styles.verifiedRow}>
                  <View style={[styles.verifiedDot, { backgroundColor: tokens.signalEmerald }]} />
                  <Text
                    style={[
                      typography.caption,
                      { color: tokens.signalEmerald, marginLeft: 4, fontSize: 11 },
                    ]}
                  >
                    Cryptographically Verified
                  </Text>
                </View>
              ) : null}
            </View>

            {/* QR zone — tap to open fullscreen */}
            <View style={{ alignItems: 'center' }}>
              <Pressable
                onPress={openQr}
                disabled={!qrVisible}
                accessibilityRole="button"
                accessibilityLabel={qrVisible ? 'QR code, tap to enlarge' : 'QR code not yet available'}
                hitSlop={6}
                style={styles.qrBox}
              >
                {qrVisible && ticket.data ? (
                  <QRCode
                    value={ticket.data.qrPayload}
                    size={78}
                    color="#0B1830"
                    backgroundColor="#FFFFFF"
                  />
                ) : b.status === 'PENDING' ? (
                  <Text style={styles.qrPlaceholder}>Pay to get QR</Text>
                ) : live && b.ticket && ticket.isLoading ? (
                  <Text style={styles.qrPlaceholder}>Loading…</Text>
                ) : (
                  <Text style={styles.qrPlaceholder}>No QR</Text>
                )}
              </Pressable>
              {qrVisible ? (
                <Pressable onPress={openQr} hitSlop={6}>
                  <Text style={[typography.caption, { color: tokens.brandPrimary, marginTop: 6, fontSize: 11, fontWeight: '600' }]}>
                    Tap to enlarge
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {/* Status + date */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <Text style={[typography.caption, { color: tokens.textMuted }]}>
            {formatDate(b.departureTime, 'full')}
          </Text>
        </View>

        {/* Pending banner */}
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

        {/* Passengers */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: tokens.surfaceCard, borderColor: tokens.borderHairline },
          ]}
        >
          <Text style={[typography.label, { color: tokens.textSecondary, marginBottom: 8 }]}>
            Passengers
          </Text>
          {b.passengers.map((p) => (
            <View key={p.seatId} style={styles.rowLine}>
              <Text style={[typography.body, { color: tokens.textPrimary }]}>
                {`${p.name}${p.age ? `, ${p.age}` : ''}`}
              </Text>
              <Text style={[typography.monoData, { color: tokens.textBright }]}>
                Seat {p.seatLabel}
              </Text>
            </View>
          ))}
        </View>

        {/* Fare */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: tokens.surfaceCard, borderColor: tokens.borderHairline },
          ]}
        >
          <Text style={[typography.label, { color: tokens.textSecondary, marginBottom: 8 }]}>
            Fare
          </Text>
          <View style={styles.rowLine}>
            <Text style={[typography.body, { color: tokens.textSecondary }]}>Base fare</Text>
            <Text style={[typography.body, { color: tokens.textBright }]}>
              {formatMoney(b.fareBreakdown.baseFarePaise)}
            </Text>
          </View>
          <View style={styles.rowLine}>
            <Text style={[typography.body, { color: tokens.textSecondary }]}>Taxes</Text>
            <Text style={[typography.body, { color: tokens.textBright }]}>
              {formatMoney(b.fareBreakdown.taxPaise)}
            </Text>
          </View>
          <View style={styles.rowLine}>
            <Text style={[typography.body, { color: tokens.textSecondary }]}>Convenience fee</Text>
            <Text style={[typography.body, { color: tokens.textBright }]}>
              {formatMoney(b.fareBreakdown.convenienceFeePaise)}
            </Text>
          </View>
          <View
            style={[
              styles.rowLine,
              {
                borderTopWidth: 1,
                borderTopColor: tokens.borderHairline,
                paddingTop: 8,
                marginTop: 4,
              },
            ]}
          >
            <Text style={[typography.label, { color: tokens.textBright }]}>Total</Text>
            <Text style={[typography.monoData, { color: tokens.textBright }]}>
              {formatMoney(b.fareBreakdown.totalPaise)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {trackable && b.trip ? (
          <Button
            onPress={() =>
              navigation.navigate('LiveTracking', {
                tripId: b.trip!.tripId,
                bookingId: b.bookingId,
              })
            }
            fullWidth
          >
            Track my bus
          </Button>
        ) : null}
        {canCancel(b) ? (
          <Button
            variant="danger"
            onPress={() => navigation.navigate('Cancel', { bookingId: b.bookingId })}
            fullWidth
          >
            Cancel booking
          </Button>
        ) : null}
      </View>
    );
  };

  return (
    <>
      <ScreenContainer scroll padded={false}>
        <AppHeader title="Your ticket" onBackPress={() => navigation.goBack()} />
        <View style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xl }}>{body()}</View>
      </ScreenContainer>

      {/* ── Fullscreen QR modal ── */}
      <RNModal
        visible={qrFullscreen && qrVisible && !!ticket.data}
        transparent
        animationType="fade"
        onRequestClose={() => setQrFullscreen(false)}
      >
        <View style={fsStyles.overlay}>
          {/* Full-bleed backdrop that closes on tap */}
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setQrFullscreen(false)}
            accessibilityLabel="Close QR"
          />

          <SafeAreaView
            style={fsStyles.content}
            pointerEvents="box-none"
            edges={['top', 'bottom']}
          >
            {/* Close button */}
            <View style={fsStyles.closeWrap} pointerEvents="box-none">
              <Pressable
                onPress={() => setQrFullscreen(false)}
                style={fsStyles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close QR code"
                hitSlop={8}
              >
                <Text style={fsStyles.closeText}>✕</Text>
              </Pressable>
            </View>

            {/* QR card — pure white background for reliable scanning */}
            <View style={fsStyles.qrCard} pointerEvents="none">
              <QRCode
                value={ticket.data?.qrPayload ?? ''}
                size={fullQrSize}
                color="#000000"
                backgroundColor="#FFFFFF"
                quietZone={8}
              />
            </View>

            {/* Context under QR */}
            {b ? (
              <View style={fsStyles.meta} pointerEvents="none">
                <Text style={fsStyles.metaRef}>
                  {formatBookingReference(b.bookingReference)}
                </Text>
                <Text style={fsStyles.metaSeat}>
                  {`${b.passengers.length} passenger${b.passengers.length > 1 ? 's' : ''} · Seat${b.passengers.length > 1 ? 's' : ''} ${b.passengers.map((p) => p.seatLabel).join(', ')}`}
                </Text>
              </View>
            ) : null}

            <Text style={fsStyles.hint} pointerEvents="none">
              Tap anywhere to close
            </Text>
          </SafeAreaView>
        </View>
      </RNModal>
    </>
  );
};

const styles = StyleSheet.create({
  stub: {
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stubTop: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderStyle: 'dashed',
    position: 'relative',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityHero: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    flex: 1,
  },
  arrow: { fontSize: 18, fontWeight: '700', marginHorizontal: 8 },
  infoGrid: { flexDirection: 'row', marginTop: 16, gap: 12 },
  infoCol: { flex: 1 },
  monoLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  stubBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  qrBox: {
    width: 90,
    height: 90,
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholder: { fontSize: 10, color: '#666', textAlign: 'center', paddingHorizontal: 4 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  verifiedDot: { width: 6, height: 6, borderRadius: 3 },
  monoSmall: { fontFamily: 'JetBrainsMono_700Bold', fontSize: 11 },
  notch: {
    position: 'absolute',
    bottom: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  notchLeft: { left: -15 },
  notchRight: { right: -15 },
  infoCard: { padding: 16, borderRadius: 12, borderWidth: 1 },
  rowLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
});

const fsStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 10, 18, 0.97)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  closeWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  meta: {
    marginTop: 24,
    alignItems: 'center',
    gap: 4,
  },
  metaRef: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'JetBrainsMono_700Bold',
    letterSpacing: 0.5,
  },
  metaSeat: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
  },
  hint: {
    position: 'absolute',
    bottom: 32,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    letterSpacing: 0.4,
  },
});

export default TicketScreen;