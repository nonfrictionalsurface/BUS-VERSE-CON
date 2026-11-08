import React, { useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string, minutes: number, notes?: string) => Promise<void>;
};

const REASONS = [
  { id: 'TRAFFIC', label: 'Heavy traffic' },
  { id: 'WEATHER', label: 'Weather' },
  { id: 'BREAKDOWN', label: 'Vehicle breakdown' },
  { id: 'ACCIDENT', label: 'Accident' },
  { id: 'ROAD_CLOSURE', label: 'Road closure' },
  { id: 'OTHER', label: 'Other' },
];

export function DelayModal({ visible, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState('TRAFFIC');
  const [minutes, setMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins <= 0 || mins > 180) {
      setError('Enter a valid delay between 1 and 180 minutes.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSubmit(reason, mins, notes.trim() || undefined);
      setMinutes('');
      setNotes('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.backdrop}>
        <View style={s.container}>
          <Text style={s.title}>Report Delay</Text>
          
          <Text style={s.label}>Reason</Text>
          <View style={s.reasonGrid}>
            {REASONS.map((r) => (
              <Pressable
                key={r.id}
                style={[s.reasonBtn, reason === r.id && s.reasonBtnActive]}
                onPress={() => setReason(r.id)}
              >
                <Text style={[s.reasonText, reason === r.id && s.reasonTextActive]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>Delay (minutes)</Text>
          <TextInput
            style={s.input}
            keyboardType="number-pad"
            value={minutes}
            onChangeText={setMinutes}
            placeholder="e.g. 15"
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={s.label}>Notes (optional)</Text>
          <TextInput
            style={s.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional details..."
            placeholderTextColor={theme.colors.textMuted}
          />

          {error ? <Text style={s.error}>{error}</Text> : null}

          <View style={s.actions}>
            <Pressable style={s.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
              <Text style={s.submitText}>{loading ? 'Sending...' : 'Submit'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  container: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  title: { color: theme.colors.text, fontSize: 22, fontWeight: '800', marginBottom: 20 },
  label: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.bg },
  reasonBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  reasonText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  reasonTextActive: { color: theme.colors.text },
  input: { backgroundColor: theme.colors.bg, color: theme.colors.text, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, fontSize: 16 },
  error: { color: theme.colors.danger, fontSize: 14, marginTop: 16, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  cancelText: { color: theme.colors.text, fontWeight: '700', fontSize: 16 },
  submitBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: theme.colors.primary },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
