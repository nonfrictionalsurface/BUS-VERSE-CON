import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { BusVerseLogo } from '../../brand';
import { Avatar } from '../ui/Avatar';

type Props = {
  title?: string;
  showLogo?: boolean;
  userName?: string | null;
  onAvatarPress?: () => void;
  onBackPress?: () => void;
  rightSlot?: React.ReactNode;
};

export const AppHeader: React.FC<Props> = ({
  title,
  showLogo = true,
  userName,
  onAvatarPress,
  onBackPress,
  rightSlot,
}) => {
  const { tokens, typography } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: tokens.canvasSubtle,
          borderBottomColor: tokens.borderSubtle,
          borderBottomWidth: 1,
        },
      ]}
    >
      <View style={styles.left}>
        {onBackPress ? (
          <Pressable
            onPress={onBackPress}
            style={styles.iconBtn}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <Text style={{ color: tokens.textPrimary, fontSize: 20, fontWeight: '300' }}>
              {'<'}
            </Text>
          </Pressable>
        ) : showLogo ? (
          <BusVerseLogo size={28} variant="icon" />
        ) : null}
        {title && (
          <Text
            style={[
              typography.h4,
              {
                color: tokens.textBright,
                marginLeft: showLogo && !onBackPress ? 10 : 8,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        {rightSlot}
        {onAvatarPress && (
          <Pressable
            onPress={onAvatarPress}
            style={{ marginLeft: 8 }}
            accessibilityLabel="Account"
            accessibilityRole="button"
          >
            <Avatar name={userName} size={32} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});

export default AppHeader;