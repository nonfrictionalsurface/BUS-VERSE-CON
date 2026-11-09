import './src/lib/qr/crypto-polyfill';
import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/lib/auth/AuthContext';
import { ThemeProvider } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SplashScreen } from './src/screens/SplashScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { StatusBar } from 'expo-status-bar';

const qc = new QueryClient();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <AuthProvider>
            <StatusBar style="auto" />
            {showSplash ? <SplashScreen /> : <RootNavigator />}
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}