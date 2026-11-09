import React, { useState } from 'react';
import { Text } from 'react-native';
import { useTheme } from '../../../theme';
import { Button, Card } from '../../../components/ui';
import { AuthModal } from './AuthModal';

type Props = { title?: string; message: string; onSuccess?: () => void };

/** Shown by any screen that needs a signed-in passenger. Opens the OTP sheet in place. */
export const SignInRequired: React.FC<Props> = ({ title = 'Sign in to continue', message, onSuccess }) => {
  const { tokens, typography, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card elevation="elevated" padding={spacing.lg}>
        <Text style={[typography.h4, { color: tokens.textBright }]}>{title}</Text>
        <Text style={[typography.body, { color: tokens.textSecondary, marginTop: 4, marginBottom: spacing.md }]}>{message}</Text>
        <Button onPress={() => setOpen(true)} fullWidth>
          Sign in with phone
        </Button>
      </Card>
      <AuthModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          onSuccess?.();
        }}
      />
    </>
  );
};
