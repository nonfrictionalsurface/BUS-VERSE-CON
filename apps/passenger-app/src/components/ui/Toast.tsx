import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useTheme } from '../../theme';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

type ToastEntry = { id: number; message: string; type: ToastType; durationMs: number };

type ToastContextValue = {
  show: (message: string, type?: ToastType, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
let nextId = 1;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const { tokens, typography, radius, spacing } = useTheme();

  const show = useCallback(
    (message: string, type: ToastType = 'info', durationMs = 4000) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-2), { id, message, type, durationMs }]);
    },
    [],
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const timers = toasts.map((t) => setTimeout(() => dismiss(t.id), t.durationMs));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  const palettes: Record<ToastType, { bg: string; fg: string; icon: string }> = {
    info:    { bg: tokens.telemetryCyanSubtle, fg: tokens.telemetryCyan, icon: 'i' },
    success: { bg: tokens.signalEmeraldSubtle, fg: tokens.signalEmerald, icon: 'v' },
    warning: { bg: tokens.warningAmberSubtle, fg: tokens.warningAmber, icon: '!' },
    error:   { bg: tokens.dangerCrimsonSubtle, fg: tokens.dangerCrimson, icon: 'x' },
  };

  return (
    <ToastContext.Provider value={{ show }}>
      <View style={{ flex: 1 }}>
        {children}
        <View pointerEvents="box-none" style={styles.host}>
          {toasts.map((t) => {
            const p = palettes[t.type];
            return (
              <Animated.View
                key={t.id}
                entering={FadeInDown.duration(200)}
                exiting={FadeOutUp.duration(150)}
                style={[
                  styles.toast,
                  {
                    backgroundColor: tokens.surfaceCard,
                    borderColor: p.fg,
                    borderRadius: radius.md,
                    marginBottom: spacing.xs,
                  },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: p.fg }]}>
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                    {p.icon}
                  </Text>
                </View>
                <Text
                  style={[
                    typography.body,
                    {
                      color: tokens.textPrimary,
                      flex: 1,
                      fontSize: 13,
                      marginLeft: 10,
                    },
                  ]}
                >
                  {t.message}
                </Text>
                <Pressable onPress={() => dismiss(t.id)} style={{ paddingLeft: 8 }}>
                  <Text style={{ color: tokens.textMuted, fontSize: 16, fontWeight: '600' }}>
                    {'x'}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    maxWidth: 480,
    width: '100%',
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ToastProvider;