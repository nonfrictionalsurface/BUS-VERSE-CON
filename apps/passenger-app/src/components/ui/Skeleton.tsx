import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

type Props = { width?: number | string; height?: number; borderRadius?: number };

export const Skeleton: React.FC<Props> = ({ width = '100%', height = 16, borderRadius }) => {
  const { tokens, radius } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0.35, 0.75, 0.35]);
    return { opacity };
  });

  return (
    <Animated.View
      style={[
        {
          width: width as number | string,
          height,
          backgroundColor: tokens.surfaceSunken,
          borderRadius: borderRadius ?? radius.sm,
        },
        animStyle,
      ]}
    />
  );
};

export default Skeleton;