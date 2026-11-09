import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardTypeOptions } from 'react-native';
import { useTheme } from '../../theme';

type Props = {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  maxLength?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export const Input: React.FC<Props> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  disabled = false,
  keyboardType,
  autoCapitalize = 'sentences',
  secureTextEntry,
  maxLength,
  leftIcon,
  rightIcon,
}) => {
  const { tokens, typography, radius } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? tokens.dangerCrimson
    : focused
    ? tokens.borderFocus
    : tokens.borderSubtle;

  return (
    <View style={styles.wrap}>
      {label && (
        <Text style={[typography.label, { color: tokens.textSecondary, marginBottom: 6 }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.field,
          {
            borderColor,
            borderWidth: focused ? 2 : 1,
            backgroundColor: disabled ? tokens.surfaceSunken : tokens.surfaceCard,
            borderRadius: radius.sm,
          },
        ]}
      >
        {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.textMuted}
          editable={!disabled}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            typography.body,
            {
              flex: 1,
              color: tokens.textPrimary,
              paddingVertical: 10,
              paddingHorizontal: 12,
              outlineWidth: 0,
            },
          ]}
          accessibilityLabel={label}
        />
        {rightIcon && <View style={styles.icon}>{rightIcon}</View>}
      </View>
      {(error || hint) && (
        <Text
          style={[
            typography.caption,
            {
              color: error ? tokens.dangerCrimson : tokens.textMuted,
              marginTop: 4,
            },
          ]}
          accessibilityLiveRegion="polite"
        >
          {error ?? hint}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  icon: { paddingHorizontal: 10 },
});

export default Input;