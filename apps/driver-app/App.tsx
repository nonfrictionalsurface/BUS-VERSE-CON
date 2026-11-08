import './src/lib/qr/crypto-polyfill';
import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/lib/auth/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SplashScreen } from './src/screens/SplashScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { StatusBar } from 'expo-status-bar';

const qc = new QueryClient();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <StatusBar style="dark" />
          {showSplash ? <SplashScreen /> : <RootNavigator />}
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
