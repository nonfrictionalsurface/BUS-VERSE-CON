import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import type { PlanFixture } from '@busverse/seat-engine';
import { useTheme } from '../../../theme';

const SHORT: Record<string, string> = { DOOR: 'DR', DRIVER: '', CREW: 'CR', STAIRS: 'ST', WC: 'WC', LUGGAGE: 'LG', VOID: '' };

export const FixtureTile: React.FC<{ item: PlanFixture }> = ({ item }) => {
  const { tokens, typography, radius } = useTheme();
  if (item.fixture === 'VOID') return null;
  const walkable = item.fixture === 'DOOR' || item.fixture === 'STAIRS';
  const text = item.w >= 40 ? item.label : SHORT[item.fixture] ?? '';
  const color = walkable ? tokens.brandPrimary : tokens.textMuted;
  return (
    <View
      accessible
      accessibilityLabel={item.label || item.fixture}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.w,
        height: item.h,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: walkable ? tokens.brandPrimaryBorder : tokens.borderSubtle,
        backgroundColor: walkable ? tokens.brandPrimarySubtle : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {item.fixture === 'DRIVER' ? (
        <Svg width={Math.min(item.w, item.h) * 0.6} height={Math.min(item.w, item.h) * 0.6} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none" />
          <Circle cx="12" cy="12" r="2.5" fill={color} />
          <Line x1="12" y1="14.5" x2="12" y2="21" stroke={color} strokeWidth="2" />
          <Line x1="3.5" y1="10" x2="9.5" y2="11" stroke={color} strokeWidth="2" />
          <Line x1="20.5" y1="10" x2="14.5" y2="11" stroke={color} strokeWidth="2" />
        </Svg>
      ) : text ? (
        <Text numberOfLines={1} style={[typography.caption, { color, fontSize: 9, letterSpacing: 0.4 }]}>
          {text}
        </Text>
      ) : null}
    </View>
  );
};
