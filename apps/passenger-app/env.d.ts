declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_BASE: string | undefined;
      EXPO_PUBLIC_WS_URL: string | undefined;
      EXPO_PUBLIC_DEV_MODE: string | undefined;
      [key: string]: string | undefined;
    }
  }
}
export {};