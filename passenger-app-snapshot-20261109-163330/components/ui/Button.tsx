import React from 'react';
import { Pressable, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type Props = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress?: () => void;
  children: React.ReactNode;
};

const HEIGHTS: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 };
const PADDING: Record<ButtonSize, number> = { sm: 14, md: 20, lg: 24 };
const FONT_SIZES: Record<ButtonSize, number> = { sm: 12, md: 14, lg: 15 };

export const Button: React.FC<Props> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  onPress,
  children,
}) => {
  const { tokens, typography, radius } = useTheme();
  const isDisabled = disabled || loading;

  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string; pressBg: string }> = {
    primary:   { bg: tokens.brandPrimary, fg: '#FFFFFF', border: tokens.brandPrimary, pressBg: tokens.brandPrimaryHover },
    secondary: { bg: tokens.surfaceCard, fg: tokens.textPrimary, border: tokens.borderSubtle, pressBg: tokens.surfaceHover },
    ghost:     { bg: 'transparent', fg: tokens.textPrimary, border: 'transparent', pressBg: tokens.surfaceHover },
    danger:    { bg: tokens.dangerCrimson, fg: '#FFFFFF', border: tokens.dangerCrimson, pressBg: tokens.dangerCrimson },
  };
  const c = palette[variant];

  const style: ViewStyle = {
    height: HEIGHTS[size],
    paddingHorizontal: PADDING[size],
    backgroundColor: c.bg,
    borderColor: c.border,
    borderWidth: variant === 'secondary' ? 1 : 0,
    borderRadius: radius.md,
    opacity: isDisabled ? 0.5 : 1,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        style,
        pressed && !isDisabled ? { backgroundColor: c.pressBg } : null,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} color={c.fg} />
      ) : (
        <>
          {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
          <Text style={[typography.label, { color: c.fg, fontSize: FONT_SIZES[size], fontWeight: '700' }]}>
            {children}
          </Text>
          {rightIcon && <View style={styles.icon}>{rightIcon}</View>}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: { marginHorizontal: 2 },
});

export default Button;