import React from 'react';
import Svg, { G, Path } from 'react-native-svg';
import { theme } from '../../theme/tokens';
import { STATIC_PATHS } from './paths';

export const StaticVectorMark: React.FC<{ size?: number }> = ({ size = 120 }) => {
  const primary = theme.colors.primary;
  const navy = theme.colors.text;

  return (
    <Svg width={size} height={size} viewBox="0 0 1254 1254">
      <Path d={STATIC_PATHS.road} fill={primary} fillRule="evenodd" />
      <Path d={STATIC_PATHS.busShadow} fill={navy} fillRule="evenodd" />
      <Path d={STATIC_PATHS.busDetail} fill={navy} fillRule="evenodd" />
      <Path d={STATIC_PATHS.pin} fill={primary} fillRule="evenodd" />
      <G transform="translate(121, 0)"><Path d={STATIC_PATHS.letterB} fill={navy} fillRule="evenodd" /></G>
      <G transform="translate(127, 0)"><Path d={STATIC_PATHS.letterU} fill={navy} fillRule="evenodd" /></G>
      <G transform="translate(144, 0)"><Path d={STATIC_PATHS.letterS} fill={navy} fillRule="evenodd" /></G>
      <Path d={STATIC_PATHS.letterC} fill={primary} fillRule="evenodd" />
      <Path d={STATIC_PATHS.letterO} fill={primary} fillRule="evenodd" />
      <Path d={STATIC_PATHS.letterN} fill={primary} fillRule="evenodd" />
    </Svg>
  );
};