import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { useAuth } from '../lib/auth';
import { ScreenContainer, AppHeader } from '../components/layout';
import { Button, Card, Badge, Banner } from '../components/ui';
import { AuthModal } from '../features/auth';
import { ProfileMenuModal } from '../features/auth';
import { formatPhone } from '../lib/format';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const TRUST_ITEMS = ['Verified operators', 'Live bus tracking', 'Instant refunds'];

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { tokens, typography, theme, toggleTheme, spacing } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSearchBuses = () => {
    navigation.navigate('Search');
  };

  return (
    <ScreenContainer padded={false} scroll>
      <AppHeader
        showLogo
        userName={user?.name ?? null}
        onAvatarPress={isAuthenticated ? () => setProfileOpen(true) : undefined}
        rightSlot={
          <Pressable
            onPress={toggleTheme}
            style={[
              styles.themePill,
              { borderColor: tokens.borderSubtle, backgroundColor: tokens.surfaceCard },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Theme: ${theme}. Tap to toggle.`}
          >
            <View
              style={[
                styles.themeDot,
                theme === 'dark'
                  ? { backgroundColor: tokens.textPrimary }
                  : {
                      borderColor: tokens.textPrimary,
                      borderWidth: 1,
                      backgroundColor: 'transparent',
                    },
              ]}
            />
            <Text
              style={[
                typography.monoSmall,
                { color: tokens.textSecondary, fontSize: 10, marginLeft: 6 },
              ]}
            >
              {theme === 'dark' ? 'DARK' : 'LIGHT'}
            </Text>
          </Pressable>
        }
      />

      <View style={{ padding: spacing.md, gap: spacing.md }}>
        <View style={{ marginTop: spacing.md }}>
          <Badge variant="brand">INTERCITY TRANSIT</Badge>
          <Text
            style={[
              typography.hero,
              { color: tokens.textBright, marginTop: 12, fontSize: 40 },
            ]}
          >
            {'Every bus.\nOne platform.'}
          </Text>
          <Text style={[typography.body, { color: tokens.textSecondary, marginTop: 12 }]}>
            Search 3,000+ verified operators across India. Live tracking, instant
            refunds, cryptographically verified tickets.
          </Text>
        </View>

        {isAuthenticated && user ? (
          <Card elevation="elevated" padding={spacing.lg}>
            <Text style={[typography.caption, { color: tokens.textMuted }]}>
              Welcome back
            </Text>
            <Text
              style={[typography.h4, { color: tokens.textBright, marginTop: 2 }]}
            >
              {user.name ?? formatPhone(user.phone)}
            </Text>
            <Text
              style={[typography.body, { color: tokens.textSecondary, marginTop: 6 }]}
            >
              Pick a route and see live availability.
            </Text>
            <View style={{ marginTop: spacing.md }}>
              <Button onPress={handleSearchBuses} fullWidth>
                Search buses
              </Button>
            </View>
            <View style={{ marginTop: spacing.sm }}>
              <Button variant="secondary" onPress={() => navigation.navigate('MyTickets')} fullWidth>
                My tickets
              </Button>
            </View>
            <View style={{ marginTop: spacing.sm }}>
              <Button variant="ghost" onPress={() => navigation.navigate('Profile')} fullWidth>
                Account
              </Button>
            </View>
          </Card>
        ) : (
          <Card elevation="elevated" padding={spacing.lg}>
            <Text style={[typography.h4, { color: tokens.textBright }]}>
              Start your journey
            </Text>
            <Text
              style={[
                typography.body,
                { color: tokens.textSecondary, marginTop: 4, marginBottom: spacing.md },
              ]}
            >
              Sign in with your phone to book seats. No password needed.
            </Text>
            <Button onPress={() => setAuthOpen(true)} fullWidth>
              Sign in with phone
            </Button>
            <View style={{ marginTop: spacing.sm }}>
              <Button variant="ghost" onPress={handleSearchBuses} fullWidth>
                Browse buses without login
              </Button>
            </View>
          </Card>
        )}

        <Banner
          type="info"
          message="Signed-in state persists across reloads via secure refresh token."
        />

        <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
          {TRUST_ITEMS.map((label) => (
            <View key={label} style={styles.trustRow}>
              <View
                style={[
                  styles.trustDot,
                  {
                    backgroundColor: tokens.signalEmeraldSubtle,
                    borderColor: tokens.signalEmerald,
                    borderWidth: 1,
                  },
                ]}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: tokens.signalEmerald,
                  }}
                />
              </View>
              <Text style={[typography.body, { color: tokens.textSecondary, fontSize: 13 }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        <Text
          style={[
            typography.caption,
            { color: tokens.textMuted, textAlign: 'center', marginTop: spacing.md },
          ]}
        >
          BusVerse | v1.0.0 | M2
        </Text>
      </View>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          // Home rerenders automatically because AuthContext user changed
        }}
      />
      <ProfileMenuModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  themePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeDot: { width: 8, height: 8, borderRadius: 4 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trustDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;