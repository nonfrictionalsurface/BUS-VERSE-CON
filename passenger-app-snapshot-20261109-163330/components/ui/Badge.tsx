import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

export type BadgeVariant = 'emerald' | 'amber' | 'red' | 'slate' | 'cyan' | 'brand';

type Props = { variant?: BadgeVariant; children: React.ReactNode };

export const Badge: React.FC<Props> = ({ variant = 'slate', children }) => {
  const { tokens, typography, radius } = useTheme();
  const palette: Record<BadgeVariant, { bg: string; fg: string }> = {
    emerald: { bg: tokens.signalEmeraldSubtle, fg: tokens.signalEmerald },
    amber:   { bg: tokens.warningAmberSubtle, fg: tokens.warningAmber },
    red:     { bg: tokens.dangerCrimsonSubtle, fg: tokens.dangerCrimson },
    slate:   { bg: tokens.surfaceSunken, fg: tokens.textSecondary },
    cyan:    { bg: tokens.telemetryCyanSubtle, fg: tokens.telemetryCyan },
    brand:   { bg: tokens.brandPrimarySubtle, fg: tokens.brandPrimary },
  };
  const c = palette[variant];
  return (
    <View style={[styles.wrap, { backgroundColor: c.bg, borderRadius: radius.sm }]}>
      <Text style={[typography.monoSmall, { color: c.fg, fontSize: 10, letterSpacing: 0.5 }]}>
        {typeof children === 'string' ? children.toUpperCase() : children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
});

export default Badge;