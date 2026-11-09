import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

type Props = { size?: 'sm' | 'md' | 'lg'; color?: string };

const SIZES = { sm: 'small', md: 'small', lg: 'large' } as const;
const DIM = { sm: 16, md: 24, lg: 32 } as const;

export const Spinner: React.FC<Props> = ({ size = 'md', color }) => {
  const { tokens } = useTheme();
  return (
    <View style={[styles.wrap, { width: DIM[size], height: DIM[size] }]}>
      <ActivityIndicator size={SIZES[size]} color={color ?? tokens.brandPrimary} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});

export default Spinner;