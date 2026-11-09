import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

type Props = {
  elevation?: 'flat' | 'elevated';
  padding?: number;
  onPress?: () => void;
  style?: ViewStyle;
  children: React.ReactNode;
};

export const Card: React.FC<Props> = ({ elevation = 'flat', padding, onPress, style, children }) => {
  const { tokens, radius, spacing } = useTheme();
  const elevationStyle = elevation === 'elevated' ? tokens.shadowFloating : tokens.shadowAmbient;
  const baseStyle: ViewStyle = {
    backgroundColor: tokens.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: tokens.borderHairline,
    padding: padding ?? spacing.lg,
    ...elevationStyle,
    ...(style ?? {}),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          baseStyle,
          pressed ? { backgroundColor: tokens.surfaceHover } : null,
        ]}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }
  return <View style={baseStyle}>{children}</View>;
};

export default Card;