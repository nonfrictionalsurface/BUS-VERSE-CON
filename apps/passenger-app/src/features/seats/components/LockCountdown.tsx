import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';
import { formatCountdown } from '../../../lib/format';

type Props = {
  expiresAt: number | null;
  onExpire?: () => void;
};

type CountdownState = 'normal' | 'warning' | 'critical' | 'expiring' | 'expired';

function computeState(remainingMs: number): CountdownState {
  if (remainingMs <= 0) return 'expired';
  if (remainingMs <= 10_000) return 'expiring';
  if (remainingMs <= 30_000) return 'critical';
  if (remainingMs <= 60_000) return 'warning';
  return 'normal';
}

export const LockCountdown: React.FC<Props> = ({ expiresAt, onExpire }) => {
  const { tokens, typography, radius } = useTheme();
  const [remainingMs, setRemainingMs] = useState(() =>
    expiresAt ? Math.max(0, expiresAt - Date.now()) : 0,
  );
  const [hasFiredExpiry, setHasFiredExpiry] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    setHasFiredExpiry(false);
    const tick = () => {
      const rem = Math.max(0, expiresAt - Date.now());
      setRemainingMs(rem);
      if (rem === 0 && !hasFiredExpiry) {
        setHasFiredExpiry(true);
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  if (!expiresAt) return null;

  const state = computeState(remainingMs);
  const color =
    state === 'normal'
      ? tokens.textPrimary
      : state === 'warning'
        ? tokens.warningAmber
        : tokens.dangerCrimson;
  const label =
    state === 'expired' ? 'Lock expired' : state === 'expiring' ? 'Hurry!' : 'Seat lock';

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: tokens.surfaceCard,
          borderColor: tokens.borderSubtle,
          borderRadius: radius.md,
        },
      ]}
      accessibilityRole="timer"
      accessibilityLiveRegion="polite"
    >
      <Text style={[typography.caption, { color: tokens.textMuted }]}>{label}</Text>
      <Text style={[typography.monoData, { color, fontSize: 18, marginTop: 2 }]}>
        {formatCountdown(remainingMs)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 120,
    marginVertical: 8,
  },
});

export default LockCountdown;