import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';
import { CalendarPickerModal } from './CalendarPickerModal';

type Props = {
  label: string;
  value: string;
  onChange: (iso: string) => void;
};

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDisplay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return `${WEEKDAYS_SHORT[d.getUTCDay()]}, ${match[3]} ${MONTHS_SHORT[Number(match[2]) - 1]} ${match[1]}`;
}

export const DateField: React.FC<Props> = ({ label, value, onChange }) => {
  const { tokens, typography, radius } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Text style={[typography.label, { color: tokens.textSecondary, marginBottom: 6 }]}>
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          {
            borderColor: pressed ? tokens.borderFocus : tokens.borderSubtle,
            borderWidth: 1,
            borderRadius: radius.sm,
            backgroundColor: tokens.surfaceCard,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDisplay(value)}`}
      >
        <Text style={[typography.body, { color: tokens.textPrimary, flex: 1 }]}>
          {formatDisplay(value)}
        </Text>
        <Text style={[typography.caption, { color: tokens.brandPrimary, fontWeight: '600' }]}>
          Change
        </Text>
      </Pressable>
      <CalendarPickerModal
        open={open}
        onClose={() => setOpen(false)}
        value={value}
        onSelect={onChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default DateField;