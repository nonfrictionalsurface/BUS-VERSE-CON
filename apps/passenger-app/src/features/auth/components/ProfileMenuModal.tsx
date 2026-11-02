import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../../theme';
import { Modal, Button, Avatar } from '../../../components/ui';
import { useAuth } from '../../../lib/auth';
import { formatPhone } from '../../../lib/format';

type Props = {
  open: boolean;
  onClose: () => void;
};

export const ProfileMenuModal: React.FC<Props> = ({ open, onClose }) => {
  const { tokens, typography, spacing } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Account">
      {user ? (
        <View style={{ gap: spacing.md }}>
          <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
            <Avatar name={user.name ?? user.phone} size={64} />
            <Text
              style={[
                typography.h4,
                { color: tokens.textBright, marginTop: spacing.sm },
              ]}
            >
              {user.name ?? 'Passenger'}
            </Text>
            <Text
              style={[typography.caption, { color: tokens.textMuted, marginTop: 2 }]}
            >
              {formatPhone(user.phone)}
            </Text>
            {user.email && (
              <Text style={[typography.caption, { color: tokens.textMuted }]}>
                {user.email}
              </Text>
            )}
          </View>
          <Button variant="danger" onPress={handleLogout} fullWidth>
            Log out
          </Button>
        </View>
      ) : (
        <Text style={[typography.body, { color: tokens.textSecondary }]}>
          Not signed in.
        </Text>
      )}
    </Modal>
  );
};

export default ProfileMenuModal;