import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';
import { useCleanTheme } from '../theme/clean';
import { postScan } from '../lib/api/trips.api';
import { verifyQr } from '../lib/qr/verify';
import { fetchDriverConfig } from '../lib/api/auth.api';

export function ScanScreen({ route, navigation }: any) {
  const theme = useCleanTheme();
  const { tripId, scheduleId } = route.params;
  const qc = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState(Platform.OS === 'web');
  const [ref, setRef] = useState('');
  const [name, setName] = useState('');
  const [result, setResult] = useState<any>(null);

  const s = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: theme.colors.bg,
          padding: 24,
          paddingTop: 60,
          justifyContent: 'center',
        },
        title: { color: theme.colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 24 },
        sub: { color: theme.colors.textMuted, textAlign: 'center', marginBottom: 32 },
        input: {
          backgroundColor: theme.colors.surface,
          color: theme.colors.text,
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.border,
          marginBottom: 12,
        },
        btn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
        btnText: { color: theme.isDark ? '#000' : '#FFF', fontWeight: '800' },
      }),
    [theme],
  );

  const getCurrentLocation = async (): Promise<{ lat?: number; lng?: number }> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return {};
      const loc = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
      if (loc) return { lat: loc.coords.latitude, lng: loc.coords.longitude };
      const fresh = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { lat: fresh.coords.latitude, lng: fresh.coords.longitude };
    } catch {
      return {};
    }
  };

  const handleScan = async (data: string) => {
    if (result) return;
    console.log('[Scan] 🔍 QR detected, length:', data.length);
    try {
      const config = await fetchDriverConfig();
      await verifyQr(data, config.qrPublicKey);
      const loc = await getCurrentLocation();
      const payload: any = {
        qrPayload: data,
        scannedAt: new Date().toISOString(),
      };
      if (loc.lat != null && loc.lng != null) {
        payload.scannedLat = loc.lat;
        payload.scannedLng = loc.lng;
      }
      const res = await postScan(tripId, payload);
      console.log('[Scan] ✅ Server scan OK:', JSON.stringify(res));
      setResult(res);
      qc.invalidateQueries({ queryKey: ['manifest', tripId] });
    } catch (e: any) {
      console.log('[Scan] ❌ ERROR:', e?.message);
      setResult({ error: e?.message || 'Unknown error' });
    }
  };

  const handleManual = async () => {
    if (!ref.trim() || !name.trim()) {
      setResult({ error: 'Enter both booking reference and passenger name.' });
      return;
    }
    try {
      const loc = await getCurrentLocation();
      const payload: any = {
        manualEntry: true,
        bookingReference: ref.trim(),
        primaryPassengerName: name.trim(),
        scannedAt: new Date().toISOString(),
      };
      if (loc.lat != null && loc.lng != null) {
        payload.scannedLat = loc.lat;
        payload.scannedLng = loc.lng;
      }
      const res = await postScan(tripId, payload);
      setResult(res);
      qc.invalidateQueries({ queryKey: ['manifest', tripId] });
    } catch (e: any) {
      setResult({ error: e.message });
    }
  };

  if (result) {
    return (
      <View style={s.root}>
        <Text
          style={[
            s.title,
            { color: result.error ? theme.colors.danger : theme.colors.success },
          ]}
        >
          {result.error ? 'Failed' : 'Success'}
        </Text>
        <Text style={s.sub}>
          {result.error || `Boarded: ${result.primaryPassengerName ?? 'Passenger'}`}
        </Text>
        <Pressable style={s.btn} onPress={() => setResult(null)}>
          <Text style={s.btnText}>Next</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginTop: 24 }}
        >
          <Text style={{ color: theme.colors.textMuted }}>Back to Trip</Text>
        </Pressable>
      </View>
    );
  }

  if (manual) {
    return (
      <View style={s.root}>
        <Text style={s.title}>Manual Entry</Text>
        <TextInput
          style={s.input}
          value={ref}
          onChangeText={setRef}
          placeholder="BKG-XXXX"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="characters"
        />
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Passenger Name"
          placeholderTextColor={theme.colors.textMuted}
        />
        <Pressable style={s.btn} onPress={handleManual}>
          <Text style={s.btnText}>Submit</Text>
        </Pressable>
        <Pressable onPress={() => setManual(false)} style={{ marginTop: 24 }}>
          <Text style={{ color: theme.colors.primary }}>Use Camera</Text>
        </Pressable>
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={s.root}>
        <Text style={s.title}>Need Camera</Text>
        <Pressable style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>Allow Camera</Text>
        </Pressable>
        <Pressable onPress={() => setManual(true)} style={{ marginTop: 24 }}>
          <Text style={{ color: theme.colors.primary }}>Use Manual Entry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => handleScan(data)}
      />
      <Pressable
        style={[s.btn, { position: 'absolute', bottom: 40, left: 24, right: 24 }]}
        onPress={() => setManual(true)}
      >
        <Text style={s.btnText}>Switch to Manual</Text>
      </Pressable>
    </View>
  );
}