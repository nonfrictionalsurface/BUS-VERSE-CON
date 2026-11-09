import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../../theme';
import { Badge, Card } from '../../../components/ui';
import { formatBookingReference, formatDate, formatMoney, formatTime } from '../../../lib/format';
import type { BookingSummaryDTO } from '../../../types';
import { statusMeta } from '../status';

type Props = { booking: BookingSummaryDTO; onPress: () => void };

export const BookingCard: React.FC<Props> = ({ booking, onPress }) => {
  const { tokens, typography, spacing } = useTheme();
  const meta = statusMeta(booking.status);
  const seats = booking.passengers.map((p) => p.seatLabel).join(', ');
  return (
    <Card elevation="elevated" padding={spacing.md} onPress={onPress}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[typography.monoSmall, { color: tokens.textMuted }]}>{formatBookingReference(booking.bookingReference)}</Text>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </View>
      <Text style={[typography.h4, { color: tokens.textBright, marginTop: 8 }]}>
        {`${booking.routeSummary.originCity} \u2192 ${booking.routeSummary.destinationCity}`}
      </Text>
      <Text style={[typography.body, { color: tokens.textSecondary, marginTop: 2 }]}>
        {`${formatDate(booking.departureTime, 'short')}, ${formatTime(booking.departureTime)}`}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        <Text style={[typography.caption, { color: tokens.textMuted }]}>{`Seats ${seats}`}</Text>
        <Text style={[typography.monoData, { color: tokens.textBright }]}>{formatMoney(booking.totalFarePaise)}</Text>
      </View>
    </Card>
  );
};
