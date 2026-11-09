import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { MainStack } from './MainStack';
import { useAuth } from '../lib/auth/AuthContext';
import { BootScreen } from '../screens/BootScreen';
import { useTheme } from '../theme/ThemeContext';

export function RootNavigator() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) return <BootScreen />;

  const base = theme.isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: theme.colors.bg,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <MainStack isAuth={!!user} />
    </NavigationContainer>
  );
}