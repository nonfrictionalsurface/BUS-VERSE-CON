import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import type { RootStackParamList, ScheduleDetailDTO } from '../types';
import { useTheme } from '../theme';
import { useAuth } from '../lib/auth';
import { ApiError, EP, api } from '../lib/api';
import { formatDate, formatMoney, formatTime } from '../lib/format';
import { AppHeader, ScreenContainer } from '../components/layout';
import { Banner, Button, Card, Chip, Input, Select, Skeleton, useToast } from '../components/ui';
import { LockCountdown } from '../features/seats';
import { createBooking } from '../features/booking/api/booking.api';

type Props = NativeStackScreenProps<RootStackParamList, 'PassengerManifest'>;
type Gender = 'MALE' | 'FEMALE' | 'OTHER';
interface Row {
  name: string;
  age: string;
  gender: Gender | null;
}

const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];
const LOCK_CODES: ReadonlySet<string> = new Set(['LOCK_EXPIRED', 'LOCK_NOT_FOUND', 'SEAT_LOCKED', 'SEAT_ALREADY_BOOKED']);

function rowErrors(r: Row, femaleOnly: boolean): { name?: string; age?: string; gender?: string } {
  const out: { name?: string; age?: string; gender?: string } = {};
  if (r.name.trim().length === 0) out.name = 'Enter the passenger name';
  else if (r.name.trim().length > 100) out.name = 'Name is too long';
  if (r.age.length > 0) {
    const n = Number(r.age);
    if (!Number.isInteger(n) || n < 1 || n > 119) out.age = 'Enter an age between 1 and 119';
  }
  if (femaleOnly && r.gender !== null && r.gender !== 'FEMALE') out.gender = 'This seat is reserved for women';
  return out;
}

export const PassengerManifestScreen: React.FC<Props> = ({ navigation, route }) => {
  const { scheduleId, farePaise, seats, lockExpiresAt } = route.params;
  const { tokens, typography, spacing } = useTheme();
  const { user } = useAuth();
  const toast = useToast();

  const detail = useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: () => api.get<ScheduleDetailDTO>(EP.scheduleDetail(scheduleId)),
    staleTime: 5 * 60_000,
  });
  const stands = useMemo(() => [...(detail.data?.route.stands ?? [])].sort((a, b) => a.sequence - b.sequence), [detail.data]);

  const [boarding, setBoarding] = useState<string | null>(null);
  const [dropping, setDropping] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>(() =>
    seats.map((s, i) => ({ name: i === 0 ? user?.name ?? '' : '', age: '', gender: s.femaleOnly ? 'FEMALE' : null })),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const first = stands[0];
    const last = stands[stands.length - 1];
    if (stands.length >= 2 && first && last && !boarding && !dropping) {
      setBoarding(first.stand.id);
      setDropping(last.stand.id);
    }
  }, [stands, boarding, dropping]);

  const seqOf = (id: string | null): number => stands.find((s) => s.stand.id === id)?.sequence ?? -1;
  const boardingOptions = stands.slice(0, -1).map((s) => ({ value: s.stand.id, label: s.stand.name }));
  const droppingOptions = stands.filter((s) => s.sequence > seqOf(boarding)).map((s) => ({ value: s.stand.id, label: s.stand.name }));

  const pickBoarding = (id: string): void => {
    setBoarding(id);
    if (seqOf(dropping) <= seqOf(id)) setDropping(stands[stands.length - 1]?.stand.id ?? null);
  };
  const update = (i: number, patch: Partial<Row>): void => setRows((prev) => prev.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const errors = rows.map((r, i) => rowErrors(r, seats[i]?.femaleOnly ?? false));
  const invalid = errors.some((e) => e.name || e.age || e.gender) || !boarding || !dropping;

  const submit = async (): Promise<void> => {
    setShowErrors(true);
    const first = seats[0];
    if (invalid || !first || !boarding || !dropping) return;
    setBusy(true);
    try {
      const res = await createBooking({
        lockId: first.lockId,
        boardingStandId: boarding,
        droppingStandId: dropping,
        passengers: rows.map((r, i) => ({
          seatId: seats[i]?.seatId ?? '',
          name: r.name.trim(),
          ...(r.age ? { age: Number(r.age) } : {}),
          ...(r.gender ? { gender: r.gender } : {}),
        })),
      });
      navigation.replace('Payment', {
        bookingId: res.bookingId,
        amountPaise: res.totalFarePaise,
        reference: res.bookingReference,
        expiresAt: res.expiresAt,
      });
    } catch (err) {
      if (err instanceof ApiError && LOCK_CODES.has(err.code)) setLost(true);
      else toast.show(err instanceof ApiError ? err.message : 'Could not create the booking. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const subtotal = seats.length * farePaise;

  return (
    <ScreenContainer scroll padded={false}>
      <AppHeader title="Passenger details" onBackPress={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xl, gap: spacing.sm }}>
        {lost ? (
          <Banner
            type="error"
            message="Your seats are no longer held. Please choose them again."
            action={{ label: 'Choose seats', onPress: () => navigation.goBack() }}
          />
        ) : (
          <LockCountdown expiresAt={new Date(lockExpiresAt).getTime()} onExpire={() => setLost(true)} />
        )}

        {detail.data ? (
          <Card padding={spacing.md}>
            <Text style={[typography.h4, { color: tokens.textBright }]}>
              {`${detail.data.route.originCity.name} \u2192 ${detail.data.route.destinationCity.name}`}
            </Text>
            <Text style={[typography.body, { color: tokens.textSecondary, marginTop: 2 }]}>
              {`${formatDate(detail.data.departureTime, 'short')}, ${formatTime(detail.data.departureTime)} - ${detail.data.operatorName}`}
            </Text>
            <Text style={[typography.caption, { color: tokens.textMuted, marginTop: 6 }]}>
              {`Seats ${seats.map((s) => s.label).join(', ')}`}
            </Text>
          </Card>
        ) : detail.isError ? (
          <Banner type="error" message="Could not load the route." action={{ label: 'Retry', onPress: () => void detail.refetch() }} />
        ) : (
          <Skeleton height={88} borderRadius={12} />
        )}

        {stands.length >= 2 ? (
          <Card padding={spacing.md}>
            <Text style={[typography.label, { color: tokens.textSecondary, marginBottom: 8 }]}>Boarding and dropping</Text>
            <View style={{ gap: spacing.xs }}>
              <Select label="Boarding point" value={boarding} onChange={pickBoarding} options={boardingOptions} placeholder="Choose where you board" />
              <Select label="Dropping point" value={dropping} onChange={setDropping} options={droppingOptions} placeholder="Choose where you get off" />
            </View>
          </Card>
        ) : null}

        {rows.map((r, i) => {
          const seat = seats[i];
          const e = showErrors ? errors[i] : undefined;
          return (
            <Card key={seat?.seatId ?? i} padding={spacing.md}>
              <Text style={[typography.label, { color: tokens.textBright, marginBottom: 8 }]}>
                {`Seat ${seat?.label ?? ''}${seat?.femaleOnly ? ' (women only)' : ''}`}
              </Text>
              <View style={{ gap: spacing.xs }}>
                <Input label="Full name" value={r.name} onChangeText={(v) => update(i, { name: v })} autoCapitalize="words" maxLength={100} placeholder="As on ID" {...(e?.name ? { error: e.name } : {})} />
                <Input label="Age (optional)" value={r.age} onChangeText={(v) => update(i, { age: v.replace(/\D/g, '').slice(0, 3) })} keyboardType="number-pad" maxLength={3} {...(e?.age ? { error: e.age } : {})} />
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {GENDERS.map((g) => (
                    <Chip
                      key={g.value}
                      label={g.label}
                      selected={r.gender === g.value}
                      disabled={(seat?.femaleOnly ?? false) && g.value !== 'FEMALE'}
                      onPress={() => update(i, { gender: r.gender === g.value ? null : g.value })}
                    />
                  ))}
                </View>
                {e?.gender ? <Text style={[typography.caption, { color: tokens.dangerCrimson }]}>{e.gender}</Text> : null}
              </View>
            </Card>
          );
        })}

        <Card padding={spacing.md}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[typography.body, { color: tokens.textSecondary }]}>{`${seats.length} seat${seats.length > 1 ? 's' : ''} x ${formatMoney(farePaise)}`}</Text>
            <Text style={[typography.monoData, { color: tokens.textBright }]}>{formatMoney(subtotal)}</Text>
          </View>
          <Text style={[typography.caption, { color: tokens.textMuted, marginTop: 6 }]}>Taxes and fees are added on the next step.</Text>
        </Card>

        <Button onPress={() => void submit()} loading={busy} disabled={busy || lost} fullWidth>
          Continue to payment
        </Button>
      </View>
    </ScreenContainer>
  );
};

export default PassengerManifestScreen;
