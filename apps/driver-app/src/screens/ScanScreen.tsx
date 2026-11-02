import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useQueryClient } from '@tanstack/react-query';
import { theme } from '../theme/tokens';
import { postScan, getTrip } from '../lib/api/trips.api';
import { verifyQr } from '../lib/qr/verify';
import { fetchDriverConfig } from '../lib/api/auth.api';

export function ScanScreen({ route, navigation }: any) {
  const { tripId, scheduleId } = route.params;
  const qc = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState(Platform.OS === 'web');
  const [ref, setRef] = useState('');
  const [name, setName] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleScan = async (data: string) => {
    if (result) return;
    try {
      const config = await fetchDriverConfig();
      await verifyQr(data, config.qrPublicKey);
      const res = await postScan(tripId, { qrPayload: data });
      setResult(res);
      qc.invalidateQueries({ queryKey: ['manifest', tripId] });
    } catch (e: any) { setResult({ error: e.message }); }
  };

  const handleManual = async () => {
    try {
      const res = await postScan(tripId, { manualEntry: true, bookingReference: ref, primaryPassengerName: name });
      setResult(res);
      qc.invalidateQueries({ queryKey: ['manifest', tripId] });
    } catch (e: any) { setResult({ error: e.message }); }
  };

  if (result) {
    return (
      <View style={s.root}>
        <Text style={[s.title, { color: result.error ? theme.colors.danger : theme.colors.primary }]}>
          {result.error ? 'Failed' : 'Success'}
        </Text>
        <Text style={s.sub}>{result.error || `Boarded: ${result.primaryPassengerName}`}</Text>
        <Pressable style={s.btn} onPress={() => setResult(null)}><Text style={s.btnText}>Next</Text></Pressable>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 24 }}><Text style={{ color: theme.colors.textMuted }}>Back to Trip</Text></Pressable>
      </View>
    );
  }

  if (manual) {
    return (
      <View style={s.root}>
        <Text style={s.title}>Manual Entry</Text>
        <TextInput style={s.input} value={ref} onChangeText={setRef} placeholder="BKG-XXXX" placeholderTextColor="#555" />
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Passenger Name" placeholderTextColor="#555" />
        <Pressable style={s.btn} onPress={handleManual}><Text style={s.btnText}>Submit</Text></Pressable>
        <Pressable onPress={() => setManual(false)} style={{ marginTop: 24 }}><Text style={{ color: theme.colors.primary }}>Use Camera</Text></Pressable>
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={s.root}>
        <Text style={s.title}>Need Camera</Text>
        <Pressable style={s.btn} onPress={requestPermission}><Text style={s.btnText}>Allow Camera</Text></Pressable>
        <Pressable onPress={() => setManual(true)} style={{ marginTop: 24 }}><Text style={{ color: theme.colors.primary }}>Use Manual Entry</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => handleScan(data)} />
      <Pressable style={[s.btn, { position: 'absolute', bottom: 40, left: 24, right: 24 }]} onPress={() => setManual(true)}>
        <Text style={s.btnText}>Switch to Manual</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg, padding: 24, paddingTop: 60, justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 24 },
  sub: { color: theme.colors.textMuted, textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: theme.colors.surface, color: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12 },
  btn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: '800' }
});