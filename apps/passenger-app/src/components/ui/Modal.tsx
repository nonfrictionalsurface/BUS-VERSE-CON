import React, { useEffect, useState } from 'react';
import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

// Conditional module loading — RNModal only used on native, createPortal only on web.
let RNModal: React.ComponentType<any> | null = null;
let createPortal: ((children: React.ReactNode, container: Element) => React.ReactPortal) | null = null;

if (Platform.OS === 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    createPortal = require('react-dom').createPortal;
  } catch {
    createPortal = null;
  }
} else {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    RNModal = require('react-native').Modal;
  } catch {
    RNModal = null;
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

// Web needs position:fixed to cover the viewport regardless of scroll.
// Native uses absolute fill inside a full-screen modal.
const OVERLAY_STYLE: any =
  Platform.OS === 'web'
    ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }
    : { ...StyleSheet.absoluteFillObject, zIndex: 1000 };

const Content: React.FC<{
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => {
  const { tokens, typography, radius, spacing } = useTheme();
  return (
    <View style={OVERLAY_STYLE}>
      <Pressable
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
        onPress={onClose}
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { alignItems: 'center', justifyContent: 'center', padding: 20 },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={{
            width: '100%',
            maxWidth: 480,
            backgroundColor: tokens.surfaceCard,
            borderWidth: 1,
            borderColor: tokens.borderStrong,
            borderRadius: radius.lg,
            padding: spacing.lg,
          }}
        >
          {title && (
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.h4, { color: tokens.textBright }]}>{title}</Text>
            </View>
          )}
          {children}
        </View>
      </View>
    </View>
  );
};

export const Modal: React.FC<Props> = ({ open, onClose, title, children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open) return null;

  // Web: portal into document.body with fixed overlay (bypasses RNModal entirely)
  if (
    Platform.OS === 'web' &&
    mounted &&
    typeof document !== 'undefined' &&
    createPortal
  ) {
    return createPortal(
      <Content title={title} onClose={onClose}>
        {children}
      </Content>,
      document.body,
    );
  }

  // Native: standard RNModal
  if (RNModal) {
    return (
      <RNModal visible transparent animationType="fade" onRequestClose={onClose}>
        <Content title={title} onClose={onClose}>
          {children}
        </Content>
      </RNModal>
    );
  }

  // Fallback (should never happen)
  return (
    <Content title={title} onClose={onClose}>
      {children}
    </Content>
  );
};

export default Modal;