import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StaticVectorMark } from './StaticVectorMark';
export const BusConLogoReveal: React.FC<{ size?: number }> = ({ size = 260 }) => (
  <View style={styles.container}><StaticVectorMark size={size} /></View>
);
const styles = StyleSheet.create({ container: { alignItems: 'center', justifyContent: 'center' } });