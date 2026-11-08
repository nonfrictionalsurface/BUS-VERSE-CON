import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { theme } from '../theme/tokens';

export type TripSummaryParams = {
  tripId: string;
  tripReference: string;
  endedAt: string;
  durationMinutes: number;
  distanceKm: number | null;
  boardedCount: number;
  totalPassengers: number;
  routeSummary: string;
  busModel: string;
  busRegistration: string;
  departureTime: string;
  arrivalTime: string;
  delayReason?: string;
  delayMinutes?: number;
};

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return '—';
  }
}

export function TripSummaryScreen({ route, navigation }: any) {
  const p: TripSummaryParams = route.params;

  const backToToday = () => {
    navigation.reset({ index: 0, routes: [{ name: 'TripsList' }] });
  };

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
    >
      <View style={s.header}>
        <Text style={s.checkmark}>✓</Text>
        <Text style={s.title}>Trip completed</Text>
        <Text style={s.subtitle}>{p.tripReference}</Text>
      </View>

      <View style={s.card}>
        <Text style={s.route}>{p.routeSummary}</Text>
        <Text style={s.meta}>{p.busModel} · {p.busRegistration}</Text>
        <Text style={s.meta}>
          {formatTime(p.departureTime)} → {formatTime(p.arrivalTime)} IST
        </Text>
      </View>

      <View style={s.statsGrid}>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Boarded</Text>
          <Text style={s.statValue}>
            {p.boardedCount} / {p.totalPassengers}
          </Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Duration</Text>
          <Text style={s.statValue}>{formatDuration(p.durationMinutes)}</Text>
        </View>
      </View>

      {p.distanceKm != null && (
        <View style={s.card}>
          <Text style={s.meta}>Distance</Text>
          <Text style={s.statValue}>{Math.round(p.distanceKm)} km</Text>
        </View>
      )}

      {p.delayReason ? (
        <View style={[s.card, { borderColor: theme.colors.warning }]}>
          <Text style={s.meta}>Delay reported</Text>
          <Text style={[s.meta, { color: theme.colors.text }]}>
            {p.delayReason} · {p.delayMinutes ?? 0} min
          </Text>
        </View>
      ) : null}

      <View style={s.footer}>
        <Text style={s.doneText}>All done for today.</Text>
        <Pressable style={s.primaryBtn} onPress={backToToday}>
          <Text style={s.primaryBtnText}>Back to today</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 40,
  },
  header: { alignItems: 'center', marginBottom: 24 },
  checkmark: {
    color: theme.colors.primary,
    fontSize: 56,
    fontWeight: '700',
    marginBottom: 8,
  },
  title: { color: theme.colors.text, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '500' },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  route: { color: theme.colors.text, fontSize: 18, fontWeight: '600', marginBottom: 6 },
  meta: { color: theme.colors.textMuted, fontSize: 14, marginTop: 2 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
  },
  statLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  statValue: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
  footer: { marginTop: 24 },
  doneText: { color: theme.colors.textMuted, fontSize: 14, marginBottom: 16, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
});
