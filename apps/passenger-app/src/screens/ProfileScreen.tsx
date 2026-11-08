import React from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useTheme, type ThemePreference } from '../theme';
import { useAuth } from '../lib/auth';
import { formatPhone } from '../lib/format';
import { AppHeader, ScreenContainer } from '../components/layout';
import { Avatar, Button, Card, Chip } from '../components/ui';
import { SignInRequired } from '../features/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const THEMES: Array<{ id: ThemePreference; label: string }> = [
  { id: 'system', label: 'Match device' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { tokens, typography, spacing, preference, setPreference } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();

  const signOut = async (): Promise<void> => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  return (
    <ScreenContainer scroll padded={false}>
      <AppHeader title="Account" onBackPress={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xl, gap: spacing.sm }}>
        {!isAuthenticated || !user ? (
          <SignInRequired message="Sign in to manage your account." />
        ) : (
          <>
            <Card elevation="elevated" padding={spacing.lg}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Avatar name={user.name ?? user.phone} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.h4, { color: tokens.textBright }]}>{user.name ?? formatPhone(user.phone)}</Text>
                  <Text style={[typography.body, { color: tokens.textSecondary }]}>{formatPhone(user.phone)}</Text>
                  {user.email ? <Text style={[typography.caption, { color: tokens.textMuted }]}>{user.email}</Text> : null}
                </View>
              </View>
            </Card>
            <Button variant="secondary" onPress={() => navigation.navigate('MyTickets')} fullWidth>
              My tickets
            </Button>
            <Card padding={spacing.md}>
              <Text style={[typography.label, { color: tokens.textSecondary, marginBottom: 8 }]}>Appearance</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {THEMES.map((t) => (
                  <Chip key={t.id} label={t.label} selected={preference === t.id} onPress={() => setPreference(t.id)} />
                ))}
              </View>
            </Card>
            <Button variant="danger" onPress={() => void signOut()} fullWidth>
              Sign out
            </Button>
          </>
        )}
      </View>
    </ScreenContainer>
  );
};

export default ProfileScreen;
