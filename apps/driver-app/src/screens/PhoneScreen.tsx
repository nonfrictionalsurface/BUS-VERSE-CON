import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme/tokens';
import * as authApi from '../lib/api/auth.api';
import { StaticVectorMark } from '../components/brand/StaticVectorMark';

export function PhoneScreen({ navigation }: any) {
  const [phone, setPhone] = useState('+911122334455');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    setLoading(true);
    try {
      await authApi.requestOtp(phone);
      navigation.navigate('Otp', { phone });
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  return (
    <View style={s.root}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <StaticVectorMark size={100} />
      </View>
      <Text style={s.title}>BusCon Driver</Text>
      <Text style={s.sub}>Enter your phone number</Text>
      <TextInput 
        style={s.input} 
        value={phone} 
        onChangeText={setPhone} 
        keyboardType="phone-pad" 
        placeholderTextColor={theme.colors.textMuted}
      />
      <Pressable style={s.btn} onPress={send} disabled={loading}>
        <Text style={s.btnText}>{loading ? 'Wait...' : 'Continue'}</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center', padding: 24 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  sub: { color: theme.colors.textMuted, textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 16 },
  btn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: theme.colors.text, fontWeight: '800' }
});
