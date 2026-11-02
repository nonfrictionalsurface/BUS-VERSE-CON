import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme/tokens';
import { useAuth } from '../lib/auth/AuthContext';

export function OtpScreen({ route }: any) {
  const { phone } = route.params;
  const [otp, setOtp] = useState('123456');
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const verify = async () => {
    setLoading(true);
    setError('');
    try { 
      await login(phone, otp); 
    } catch (e: any) { 
      setError(e.message);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <View style={s.root}>
      <Text style={s.title}>Enter OTP</Text>
      <Text style={s.sub}>Sent to {phone}</Text>
      
      <TextInput style={s.input} value={otp} onChangeText={setOtp} keyboardType="number-pad" />
      
      {error ? (
        <View style={{ backgroundColor: '#450a0a', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <Text style={{ color: theme.colors.danger, textAlign: 'center', fontWeight: 'bold' }}>{error}</Text>
        </View>
      ) : null}

      <Pressable style={s.btn} onPress={verify} disabled={loading}>
        <Text style={s.btnText}>{loading ? 'Verifying...' : 'Login'}</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center', padding: 24 },
  title: { color: theme.colors.primary, fontSize: 28, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  sub: { color: theme.colors.textMuted, textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: theme.colors.surface, color: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 16, textAlign: 'center', fontSize: 24, letterSpacing: 8 },
  btn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: '800' }
});