import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { MainStack } from './MainStack';
import { useAuth } from '../lib/auth/AuthContext';
import { BootScreen } from '../screens/BootScreen';

export function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return <BootScreen />;
  return (
    <NavigationContainer theme={DarkTheme}>
      <MainStack isAuth={!!user} />
    </NavigationContainer>
  );
}
