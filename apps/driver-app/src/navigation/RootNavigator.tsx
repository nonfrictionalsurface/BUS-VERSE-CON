import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { MainStack } from './MainStack';
import { useAuth } from '../lib/auth/AuthContext';

export function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <NavigationContainer theme={DarkTheme}>
      <MainStack isAuth={!!user} />
    </NavigationContainer>
  );
}