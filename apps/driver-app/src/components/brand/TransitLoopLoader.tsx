import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme/tokens';

// Safe fallback to prevent Android SVG crashes
export const TransitLoopLoader: React.FC<{ size?: number; label?: string }> = ({ size = 320, label = 'LOADING' }) => {
  return (
    <View style={[styles.container, { width: size }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.label, { color: theme.colors.primary }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 2, marginTop: 16 },
});