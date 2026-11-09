import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../../theme';

type Props = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

export const Chip: React.FC<Props> = ({ label, selected = false, disabled = false, onPress }) => {
  const { tokens, typography, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? tokens.brandPrimary : tokens.borderSubtle,
        backgroundColor: selected ? tokens.brandPrimarySubtle : tokens.surfaceCard,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={[typography.label, { color: selected ? tokens.brandPrimary : tokens.textSecondary }]}>{label}</Text>
    </Pressable>
  );
};
