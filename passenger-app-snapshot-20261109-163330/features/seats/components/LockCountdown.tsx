import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useCleanTheme } from '../../../theme/passengerAdapter';

interface Props {
  expiresAt: string;
  onExpire: () => void;
}

export function LockCountdown({ expiresAt, onExpire }: Props) {
  const theme = useCleanTheme();
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    let fired = false;
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, ms));
      if (ms <= 0 && !fired) {
        fired = true;
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  const total = Math.floor(remaining / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');

  let color = theme.colors.textMuted;
  if (remaining < 60_000) color = theme.colors.warning;
  if (remaining < 30_000) color = theme.colors.danger;

  return (
    <Text style={[styles.text, { color }]} accessibilityLiveRegion="polite">
      ⏱ {mm}:{ss} to complete
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 13, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center' },
});