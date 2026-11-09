import AsyncStorage from '@react-native-async-storage/async-storage';

export const asyncStore = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
  async clear(prefix: string): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const matching = keys.filter((k) => k.startsWith(prefix));
    if (matching.length > 0) await AsyncStorage.multiRemove(matching);
  },
};