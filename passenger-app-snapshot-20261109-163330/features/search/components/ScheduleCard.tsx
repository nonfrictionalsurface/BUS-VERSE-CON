import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../../theme';
import { Card, Badge, Button } from '../../../components/ui';
import { formatMoney } from '../../../lib/format/money';
import type { ScheduleSearchResultDTO } from '../../../types';

type Props = {
  schedule: ScheduleSearchResultDTO;
  originCityName: string;
  destinationCityName: string;
  onSelect: () => void;
};

const COACH_LABELS: Record<string, string> = {
  SEATER: 'Seater',
  AC_SEATER: 'AC Seater',
  SLEEPER: 'Sleeper',
  AC_SLEEPER: 'AC Sleeper',
  SEMI_SLEEPER: 'Semi-Sleeper',
};

function coachLabel(t: string): string {
  return COACH_LABELS[t] ?? t;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  const ist = new Date(d.getTime() + 5.5 * 3600 * 1000);
  return `${String(ist.getUTCHours()).padStart(2, '0')}:${String(ist.getUTCMinutes()).padStart(2, '0')}`;
}

function fmtDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m}m` : `${h}h ${String(m).padStart(2, '0')}m`;
}

export const ScheduleCard: React.FC<Props> = ({
  schedule,
  originCityName,
  destinationCityName,
  onSelect,
}) => {
  const { tokens, typography, spacing } = useTheme();
  const seatPct = Math.max(0.05, Math.min(1, schedule.availableSeats / 40));

  return (
    <Card elevation="elevated" padding={spacing.md}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          style={[typography.h4, { color: tokens.textBright, fontSize: 15, flex: 1 }]}
          numberOfLines={1}
        >
          {schedule.operatorName}
        </Text>
        <Badge variant="brand">{coachLabel(schedule.busType)}</Badge>
      </View>

      {/* Timeline */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 14,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: tokens.borderHairline,
        }}
      >
        <View style={{ alignItems: 'flex-start', minWidth: 56 }}>
          <Text style={[typography.monoData, { color: tokens.textBright, fontSize: 18 }]}>
            {fmtTime(schedule.departureTime)}
          </Text>
          <Text
            style={[typography.caption, { color: tokens.textMuted, marginTop: 2 }]}
            numberOfLines={1}
          >
            {originCityName}
          </Text>
        </View>

        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
          <Text style={[typography.caption, { color: tokens.textMuted }]}>
            {fmtDuration(schedule.durationMinutes)}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: 4,
              gap: 3,
              width: '100%',
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: tokens.borderStrong }} />
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: tokens.brandPrimary,
              }}
            />
            <View style={{ flex: 1, height: 1, backgroundColor: tokens.borderStrong }} />
          </View>
          <Text style={[typography.caption, { color: tokens.signalEmerald, fontWeight: '700' }]}>
            Direct
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', minWidth: 56 }}>
          <Text style={[typography.monoData, { color: tokens.textBright, fontSize: 18 }]}>
            {fmtTime(schedule.arrivalTime)}
          </Text>
          <Text
            style={[typography.caption, { color: tokens.textMuted, marginTop: 2 }]}
            numberOfLines={1}
          >
            {destinationCityName}
          </Text>
        </View>
      </View>

      {/* Fare + seats + CTA */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          marginTop: 14,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: tokens.borderHairline,
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[typography.h3, { color: tokens.textBright, fontSize: 22 }]}>
              {formatMoney(schedule.fare.amountPaise)}
            </Text>
            <Text style={[typography.caption, { color: tokens.textMuted, marginLeft: 4 }]}>
              / seat
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <View
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: tokens.surfaceSunken,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${seatPct * 100}%`,
                  height: '100%',
                  backgroundColor: tokens.signalEmerald,
                }}
              />
            </View>
            <Text
              style={[
                typography.caption,
                { color: tokens.signalEmerald, fontWeight: '700' },
              ]}
            >
              {schedule.availableSeats} left
            </Text>
          </View>
        </View>
        <Button size="sm" onPress={onSelect}>
          Select
        </Button>
      </View>
    </Card>
  );
};

export default ScheduleCard;