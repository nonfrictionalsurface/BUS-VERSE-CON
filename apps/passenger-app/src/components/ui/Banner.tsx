import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

export type BannerType = 'info' | 'success' | 'warning' | 'error';

type Props = {
  type?: BannerType;
  message: string;
  action?: { label: string; onPress: () => void };
  onDismiss?: () => void;
};

export const Banner: React.FC<Props> = ({ type = 'info', message, action, onDismiss }) => {
  const { tokens, typography, radius } = useTheme();
  const palette: Record<BannerType, { bg: string; fg: string; icon: string }> = {
    info:    { bg: tokens.telemetryCyanSubtle, fg: tokens.telemetryCyan, icon: 'i' },
    success: { bg: tokens.signalEmeraldSubtle, fg: tokens.signalEmerald, icon: 'v' },
    warning: { bg: tokens.warningAmberSubtle, fg: tokens.warningAmber, icon: '!' },
    error:   { bg: tokens.dangerCrimsonSubtle, fg: tokens.dangerCrimson, icon: 'x' },
  };
  const p = palette[type];
  return (
    <View
      style={[styles.wrap, { backgroundColor: p.bg, borderRadius: radius.md }]}
      accessibilityRole="alert"
    >
      <View style={[styles.iconCircle, { backgroundColor: p.fg }]}>
        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>{p.icon}</Text>
      </View>
      <Text
        style={[
          typography.body,
          { color: tokens.textPrimary, flex: 1, fontSize: 13, marginLeft: 10 },
        ]}
      >
        {message}
      </Text>
      {action && (
        <Pressable onPress={action.onPress} style={{ paddingLeft: 12 }}>
          <Text style={[typography.label, { color: p.fg, fontSize: 12, fontWeight: '700' }]}>
            {action.label}
          </Text>
        </Pressable>
      )}
      {onDismiss && (
        <Pressable onPress={onDismiss} style={{ paddingLeft: 8 }}>
          <Text style={{ color: tokens.textMuted, fontSize: 16, fontWeight: '600' }}>
            {'x'}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Banner;