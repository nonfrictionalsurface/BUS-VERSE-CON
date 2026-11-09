import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { TransitLoader } from '../../brand';

type Props = {
  message?: string;
  width?: number;
  /** Minimum height. Use 0 to fill parent, or ~200+ for inline contexts. */
  minHeight?: number;
  backgroundColor?: string;
};

/**
 * App-wide loading surface — the animated BusVerse bus (same asset App.tsx
 * uses for font loading). Use for every full-screen or inline loading state.
 *
 * Small inline loading inside buttons keeps its Spinner (that's not a "page"
 * loading state — it's a button indicator).
 */
export const PageLoader: React.FC<Props> = ({
  message = 'LOADING',
  width = 280,
  minHeight,
  backgroundColor,
}) => {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minHeight,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: backgroundColor ?? tokens.canvasBg,
        paddingVertical: 40,
        paddingHorizontal: 20,
      }}
    >
      <TransitLoader width={width} message={message} showMessage />
    </View>
  );
};

export default PageLoader;