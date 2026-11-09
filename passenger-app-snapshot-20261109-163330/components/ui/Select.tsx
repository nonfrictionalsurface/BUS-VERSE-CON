import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme';
import { Modal } from './Modal';

export type SelectOption = { value: string; label: string };

type Props = {
  label?: string;
  value: string | null;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
};

export const Select: React.FC<Props> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled,
}) => {
  const { tokens, typography, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ width: '100%' }}>
      {label && (
        <Text style={[typography.label, { color: tokens.textSecondary, marginBottom: 6 }]}>
          {label}
        </Text>
      )}
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[
          styles.field,
          {
            borderColor: tokens.borderSubtle,
            borderWidth: 1,
            borderRadius: radius.sm,
            backgroundColor: disabled ? tokens.surfaceSunken : tokens.surfaceCard,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        accessibilityRole="button"
      >
        <Text
          style={[
            typography.body,
            {
              flex: 1,
              color: selected ? tokens.textPrimary : tokens.textMuted,
              paddingVertical: 10,
              paddingHorizontal: 12,
            },
          ]}
        >
          {selected?.label ?? placeholder}
        </Text>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 5,
            borderRightWidth: 5,
            borderTopWidth: 6,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: tokens.textMuted,
            marginRight: 12,
          }}
        />
      </Pressable>

      <Modal open={open} onClose={() => setOpen(false)} title={label}>
        <ScrollView style={{ maxHeight: 400 }}>
          {options.map((o) => {
            const isSelected = o.value === value;
            return (
              <Pressable
                key={o.value}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={[
                  styles.option,
                  {
                    backgroundColor: isSelected ? tokens.brandPrimarySubtle : 'transparent',
                    borderRadius: radius.sm,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.body,
                    { color: isSelected ? tokens.brandPrimary : tokens.textPrimary },
                  ]}
                >
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  option: { paddingVertical: 12, paddingHorizontal: 12 },
});

export default Select;