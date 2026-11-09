import React from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TripStatus } from '../types';
import { useTheme } from '../theme';
import { ApiError } from '../lib/api';
import { formatDuration, formatTime } from '../lib/format';
import { AppHeader } from '../components/layout';
import { Badge, Banner, Card, PageLoader } from '../components/ui';
import { LiveMap } from '../features/tracking/components/LiveMap';
import { useLiveTrip } from '../features/tracking/hooks/useLiveTrip';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveTracking'>;

const STATUS_TEXT: Record<TripStatus, string> = {
  SCHEDULED: 'Not started yet',
  IN_PROGRESS: 'On the way',
  COMPLETED: 'Trip completed',
  CANCELLED: 'Trip cancelled',
};

export const LiveTrackingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { tripId } = route.params;
  const { tokens, typography, spacing } = useTheme();
  const { live, map } = useLiveTrip(tripId);

  const failed = map.error ?? live.error;
  const header = <AppHeader title="Track your bus" onBackPress={() => navigation.goBack()} />;

  if (failed) {
    const denied = failed instanceof ApiError && (failed.status === 403 || failed.status === 404);
    return (
      <View style={{ flex: 1, backgroundColor: tokens.canvasBg }}>
        {header}
        <View style={{ padding: spacing.sm }}>
          <Banner
            type={denied ? 'info' : 'error'}
            message={denied ? 'Tracking is available for confirmed bookings once the trip exists.' : 'Could not load the live position.'}
            action={denied ? undefined : { label: 'Retry', onPress: () => { void live.refetch(); void map.refetch(); } }}
          />
        </View>
      </View>
    );
  }
  if (!map.data || !live.data) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.canvasBg }}>
        {header}
        <PageLoader message="LOADING TRIP" />
      </View>
    );
  }

  const l = live.data;
  const next = l.eta.slice(0, 3);
  const started = l.status === 'IN_PROGRESS';
  return (
    <View style={{ flex: 1, backgroundColor: tokens.canvasBg }}>
      {header}
      <View style={{ flex: 1 }}>
        <LiveMap
          stands={map.data.route.stands}
          position={l.currentPosition ? { lat: l.currentPosition.lat, lng: l.currentPosition.lng } : null}
          nextStandId={l.nextStandId}
        />
        <View style={{ position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: spacing.sm }}>
          <Card elevation="elevated" padding={spacing.md}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[typography.h4, { color: tokens.textBright }]}>{STATUS_TEXT[l.status]}</Text>
              <Badge variant={started ? (l.isStale ? 'amber' : 'emerald') : 'slate'}>{started ? (l.isStale ? 'Signal weak' : 'Live') : l.status.toLowerCase()}</Badge>
            </View>
            {started && l.lastUpdatedAt ? (
              <Text style={[typography.caption, { color: tokens.textMuted, marginTop: 4 }]}>
                {`Updated ${formatTime(l.lastUpdatedAt)}${l.speedKmh !== null ? `, ${Math.round(l.speedKmh)} km/h` : ''}`}
              </Text>
            ) : null}
            {!started && l.status === 'SCHEDULED' ? (
              <Text style={[typography.caption, { color: tokens.textMuted, marginTop: 4 }]}>The map updates here as soon as the driver starts the trip.</Text>
            ) : null}
            {started && next.length > 0 ? (
              <View style={{ marginTop: spacing.xs }}>
                {next.map((e) => (
                  <View key={e.standId} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                    <Text style={[typography.body, { color: tokens.textSecondary }]}>{e.standName}</Text>
                    <Text style={[typography.monoData, { color: tokens.textBright }]}>{formatDuration(e.etaMinutes)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        </View>
      </View>
    </View>
  );
};

export default LiveTrackingScreen;
