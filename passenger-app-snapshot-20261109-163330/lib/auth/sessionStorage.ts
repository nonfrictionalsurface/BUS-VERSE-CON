import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// On native: use expo-secure-store (encrypted, hardware-backed).
// On web: expo-secure-store is unavailable — fall back to AsyncStorage
//         (localStorage under the hood). Acceptable for dev / demo.

const KEY_REFRESH = '@busverse/refresh_token';

type NativeSecureStore = {
  getItemAsync: (k: string) => Promise<string | null>;
  setItemAsync: (k: string, v: string) => Promise<void>;
  deleteItemAsync: (k: string) => Promise<void>;
};

let SecureStore: NativeSecureStore | null = null;
if (Platform.OS !== 'web') {
  // Lazy require so web bundling doesn't try to load the native module
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('expo-secure-store');
  SecureStore = {
    getItemAsync: mod.getItemAsync,
    setItemAsync: mod.setItemAsync,
    deleteItemAsync: mod.deleteItemAsync,
  };
}

export const sessionStorage = {
  async getRefreshToken(): Promise<string | null> {
    if (SecureStore) return SecureStore.getItemAsync(KEY_REFRESH);
    return AsyncStorage.getItem(KEY_REFRESH);
  },

  async setRefreshToken(token: string): Promise<void> {
    if (SecureStore) {
      await SecureStore.setItemAsync(KEY_REFRESH, token);
      return;
    }
    await AsyncStorage.setItem(KEY_REFRESH, token);
  },

  async clearRefreshToken(): Promise<void> {
    if (SecureStore) {
      await SecureStore.deleteItemAsync(KEY_REFRESH);
      return;
    }
    await AsyncStorage.removeItem(KEY_REFRESH);
  },
};