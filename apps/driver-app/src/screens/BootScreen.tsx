import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TransitLoopLoader } from '../components/brand/TransitLoopLoader';
import { theme } from '../theme/tokens';

export function BootScreen() {
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <TransitLoopLoader size={280} label="VERIFYING SESSION" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
