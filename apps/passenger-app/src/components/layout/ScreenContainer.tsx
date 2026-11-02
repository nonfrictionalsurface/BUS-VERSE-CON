import React from 'react';
import { ScrollView, View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

type Props = {
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
};

export const ScreenContainer: React.FC<Props> = ({ scroll = false, padded = true, style, children }) => {
  const { tokens, spacing } = useTheme();
  const inner: ViewStyle = {
    paddingHorizontal: padded ? spacing.md : 0,
    paddingTop: padded ? spacing.md : 0,
    paddingBottom: padded ? spacing.xl : 0,
    ...(style ?? {}),
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.canvasBg }]} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView contentContainerStyle={inner} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
});

export default ScreenContainer;