import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

type Props = { name?: string | null; size?: number };

function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar: React.FC<Props> = ({ name, size = 36 }) => {
  const { tokens, typography } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tokens.brandPrimarySubtle,
          borderColor: tokens.brandPrimaryBorder,
          borderWidth: 1,
        },
      ]}
    >
      <Text style={[typography.label, { color: tokens.brandPrimary, fontSize: size * 0.38, fontWeight: '700' }]}>
        {initials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});

export default Avatar;