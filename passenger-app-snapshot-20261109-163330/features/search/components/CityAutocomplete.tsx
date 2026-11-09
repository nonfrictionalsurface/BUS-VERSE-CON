import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';
import { CityPickerModal } from './CityPickerModal';
import type { CityDTO } from '../../../types';

type Props = {
  label: string;
  placeholder: string;
  value: CityDTO | null;
  onChange: (city: CityDTO) => void;
};

export const CityAutocomplete: React.FC<Props> = ({ label, placeholder, value, onChange }) => {
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
        accessibilityLabel={`${label}: ${value?.name ?? placeholder}`}
      >
        <Text
          style={[
            typography.body,
            { color: value ? tokens.textPrimary : tokens.textMuted, flex: 1 },
          ]}
          numberOfLines={1}
        >
          {value?.name ?? placeholder}
        </Text>
        <Text style={{ color: tokens.textMuted }}>▾</Text>
      </Pressable>
      <CityPickerModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(city) => {
          onChange(city);
          setOpen(false);
        }}
        title={label}
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

export default CityAutocomplete;