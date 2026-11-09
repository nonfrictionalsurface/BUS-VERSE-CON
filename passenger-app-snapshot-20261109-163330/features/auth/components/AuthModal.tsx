import React, { useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';
import { Modal, Button, Input, Spinner } from '../../../components/ui';
import { formatPhone } from '../../../lib/format';
import { useOtpFlow } from '../hooks/useOtpFlow';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const OtpField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
}> = ({ value, onChange, error }) => {
  const { tokens, typography, radius } = useTheme();
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        style={{
          fontSize: 28,
          fontWeight: '700',
          letterSpacing: 16,
          textAlign: 'center',
          fontFamily: 'monospace',
          color: tokens.textPrimary,
          backgroundColor: tokens.surfaceCard,
          borderWidth: error ? 2 : 1,
          borderColor: error ? tokens.dangerCrimson : tokens.borderSubtle,
          borderRadius: radius.sm,
          paddingVertical: 14,
          paddingHorizontal: 8,
        }}
        placeholder="------"
        placeholderTextColor={tokens.textMuted}
        accessibilityLabel="6-digit verification code"
      />
      {error && (
        <Text
          style={[typography.caption, { color: tokens.dangerCrimson, marginTop: 4 }]}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
    </View>
  );
};

export const AuthModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const { tokens, typography, spacing } = useTheme();
  const flow = useOtpFlow();

  // On success, close after brief delay
  useEffect(() => {
    if (flow.step === 'success') {
      const timer = setTimeout(() => {
        onSuccess?.();
        onClose();
        flow.reset();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [flow.step, onSuccess, onClose, flow]);

  // Reset when closed from non-phone step
  useEffect(() => {
    if (!open && flow.step !== 'phone') {
      flow.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const title = flow.step === 'otp' ? 'Enter your code' : 'Sign in';

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {flow.step === 'phone' && (
        <View style={{ gap: spacing.md }}>
          <Text style={[typography.body, { color: tokens.textSecondary }]}>
            We will text you a 6-digit code to verify your number.
          </Text>
          <Input
            label="Phone number"
            value={flow.phone}
            onChangeText={flow.setPhone}
            placeholder="98765 43210"
            keyboardType="phone-pad"
            maxLength={10}
            error={flow.error ?? undefined}
            hint="Indian mobile number, 10 digits"
          />
          <Button
            onPress={() => {
              void flow.requestCode();
            }}
            loading={flow.loading}
            disabled={flow.loading || flow.phone.length !== 10}
            fullWidth
          >
            Send code
          </Button>
        </View>
      )}

      {flow.step === 'otp' && (
        <View style={{ gap: spacing.md }}>
          <Text style={[typography.body, { color: tokens.textSecondary }]}>
            Enter the 6-digit code sent to {formatPhone(flow.phone)}
          </Text>
          <OtpField value={flow.otp} onChange={flow.setOtp} error={flow.error} />
          <Button
            onPress={() => {
              void flow.verify();
            }}
            loading={flow.loading}
            disabled={flow.loading || flow.otp.length !== 6}
            fullWidth
          >
            Verify
          </Button>
          <Button
            variant="ghost"
            onPress={() => {
              void flow.resend();
            }}
            disabled={flow.resendIn > 0 || flow.loading}
            fullWidth
          >
            {flow.resendIn > 0 ? `Resend in ${flow.resendIn}s` : 'Resend code'}
          </Button>
          <Button variant="ghost" onPress={flow.reset} fullWidth>
            Change number
          </Button>
          {process.env.EXPO_PUBLIC_DEV_MODE === 'true' && (
            <Text
              style={[typography.caption, { color: tokens.textMuted, textAlign: 'center' }]}
            >
              Dev: if MOCK_OTP=true on API server, use 123456
            </Text>
          )}
        </View>
      )}

      {flow.step === 'success' && (
        <View style={{ paddingVertical: spacing.lg, alignItems: 'center', gap: spacing.md }}>
          <Spinner size="lg" />
          <Text style={[typography.body, { color: tokens.textSecondary }]}>
            Signing you in...
          </Text>
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({});

export default AuthModal;