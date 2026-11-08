import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';
import { Button } from '../../../components/ui';
import { formatMoney } from '../../../lib/format/money';
import type { AvailabilitySeatDTO } from '../../../types';

type Props = {
  seats: AvailabilitySeatDTO[];
  farePaise: number;
  onRemove: (seatId: string) => void;
  onContinue: () => void;
  disabled?: boolean;
};

export const SelectedSeatsSummary: React.FC<Props> = ({
  seats,
  farePaise,
  onRemove,
  onContinue,
  disabled,
}) => {
  const { tokens, typography, radius } = useTheme();
  if (seats.length === 0) return null;

  const total = seats.length * farePaise;
  const scrollable = seats.length > 6;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: tokens.surfaceCard,
          borderColor: tokens.borderSubtle,
          borderRadius: radius.lg,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[typography.label, { color: tokens.textSecondary }]}>
          {seats.length} seat{seats.length > 1 ? 's' : ''} selected
        </Text>
        <Text style={[typography.monoData, { color: tokens.textBright, fontSize: 16 }]}>
          {formatMoney(total)}
        </Text>
      </View>

      <ScrollView
        style={{ maxHeight: scrollable ? 200 : undefined }}
        nestedScrollEnabled
        showsVerticalScrollIndicator={scrollable}
      >
        {seats.map((s) => (
          <View
            key={s.id}
            style={[
              styles.row,
              { borderColor: tokens.borderHairline, borderRadius: radius.sm },
            ]}
          >
            <View>
              <Text style={[typography.label, { color: tokens.textBright }]}>
                Seat {s.label}
                {s.isFemaleOnly ? ' · Female' : ''}
              </Text>
              <Text style={[typography.caption, { color: tokens.textMuted, marginTop: 2 }]}>
                {formatMoney(farePaise)}
              </Text>
            </View>
            <Pressable
              onPress={() => onRemove(s.id)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Remove seat ${s.label}`}
            >
              <Text style={[typography.label, { color: tokens.dangerCrimson }]}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <View style={{ marginTop: 8 }}>
        <Button onPress={onContinue} disabled={disabled} fullWidth>
          Continue to booking
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { padding: 16, borderWidth: 1, marginTop: 16, marginBottom: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
});

export default SelectedSeatsSummary;