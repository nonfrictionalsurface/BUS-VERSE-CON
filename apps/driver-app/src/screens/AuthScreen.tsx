import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DutyProfile } from '../types';
import { BusConLogo } from '../components/BusConBrand';

interface AuthScreenProps {
  onAuthSuccess: (duty: DutyProfile) => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [authMode, setAuthMode] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_IN');
  const [role, setRole] = useState<'PILOT' | 'CONDUCTOR'>('CONDUCTOR');
  const [badgeCode, setBadgeCode] = useState('CREW-409');
  const [securityPin, setSecurityPin] = useState('4310');
  const [busPlate, setBusPlate] = useState('UP-78-CT-9012');
  const [fullName, setFullName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [depotHub, setDepotHub] = useState('Kanpur Central Bay 4');
  const [newBusPlate, setNewBusPlate] = useState('UP-78-CT-9012');
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = () => {
    setError(null);
    if (!badgeCode.trim() || !securityPin.trim() || !busPlate.trim()) {
      setError('Please provide your Badge Code, PIN, and Coach Plate.');
      return;
    }

    onAuthSuccess({
      id: 'DUTY-01',
      role,
      staffName: role === 'PILOT' ? 'Senior Pilot R. Singh' : 'Conductor A. Sharma',
      badgeCode: badgeCode.trim().toUpperCase(),
      licenseNumber: 'UP-78-COMMERCIAL-DL',
      busPlate: busPlate.trim().toUpperCase(),
      model: 'Volvo 9600 B11R Multi-Axle',
      depotHub: 'Kanpur Central Bay 4',
      routeTitle: 'Kanpur Central ⇄ Lucknow Alambagh',
      departureTime: '14:00 IST',
      currentSpeedKmh: 74,
      totalSeats: 40,
    });
  };

  const handleSignUp = () => {
    setError(null);
    if (!fullName.trim() || !licenseNumber.trim() || !newBusPlate.trim()) {
      setError('Please fill in all registration fields.');
      return;
    }

    onAuthSuccess({
      id: 'DUTY-NEW',
      role,
      staffName: fullName.trim(),
      badgeCode: `${role === 'PILOT' ? 'PLT' : 'CND'}-${Math.floor(100 + Math.random() * 900)}`,
      licenseNumber: licenseNumber.trim().toUpperCase(),
      busPlate: newBusPlate.trim().toUpperCase(),
      model: 'Volvo 9600 B11R Multi-Axle',
      depotHub,
      routeTitle: 'Kanpur Central ⇄ Lucknow Alambagh',
      departureTime: '14:00 IST',
      currentSpeedKmh: 74,
      totalSeats: 40,
    });
  };

  const handleQuickDemo = (demoRole: 'PILOT' | 'CONDUCTOR') => {
    onAuthSuccess({
      id: 'DUTY-DEMO',
      role: demoRole,
      staffName: demoRole === 'PILOT' ? 'Senior Pilot Ramesh' : 'Conductor Deepak',
      badgeCode: demoRole === 'PILOT' ? 'PLT-702' : 'CREW-409',
      licenseNumber: 'UP-78-COMMERCIAL-DL',
      busPlate: 'UP-78-CT-9012',
      model: 'Volvo 9600 B11R Multi-Axle',
      depotHub: 'Kanpur Central Hub',
      routeTitle: 'Kanpur Central ⇄ Lucknow Alambagh',
      departureTime: '14:00 IST',
      currentSpeedKmh: 74,
      totalSeats: 40,
    });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <BusConLogo size={42} />
          <View style={styles.telemetryPill}>
            <View style={styles.activeDot} />
            <Text style={styles.telemetryPillText}>DISPATCH GATEWAY :4310 ACTIVE</Text>
          </View>
        </View>

        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.tabBtn, authMode === 'SIGN_IN' && styles.tabBtnActive]}
            onPress={() => setAuthMode('SIGN_IN')}
          >
            <Text style={[styles.tabBtnText, authMode === 'SIGN_IN' && styles.tabBtnTextActive]}>CREW SIGN IN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, authMode === 'SIGN_UP' && styles.tabBtnActive]}
            onPress={() => setAuthMode('SIGN_UP')}
          >
            <Text style={[styles.tabBtnText, authMode === 'SIGN_UP' && styles.tabBtnTextActive]}>NEW CREW SIGN UP</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.groupLabel}>OPERATIONAL CREW ROLE</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.rolePill, role === 'CONDUCTOR' && styles.rolePillActive]}
                onPress={() => setRole('CONDUCTOR')}
              >
                <Ionicons
                  name="ticket-outline"
                  size={15}
                  color={role === 'CONDUCTOR' ? '#020604' : '#86EFAC'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.rolePillText, role === 'CONDUCTOR' && styles.rolePillTextActive]}>
                  CONDUCTOR
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rolePill, role === 'PILOT' && styles.rolePillActive]}
                onPress={() => setRole('PILOT')}
              >
                <Ionicons
                  name="bus-outline"
                  size={15}
                  color={role === 'PILOT' ? '#020604' : '#86EFAC'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.rolePillText, role === 'PILOT' && styles.rolePillTextActive]}>
                  PILOT / DRIVER
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {authMode === 'SIGN_IN' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.groupLabel}>CREW BADGE IDENTIFIER</Text>
                <TextInput
                  style={styles.textInput}
                  value={badgeCode}
                  onChangeText={setBadgeCode}
                  placeholder="e.g. CREW-409"
                  placeholderTextColor="#2E5A47"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.groupLabel}>DUTY SECURITY PIN</Text>
                <TextInput
                  style={styles.textInput}
                  value={securityPin}
                  onChangeText={setSecurityPin}
                  placeholder="••••"
                  placeholderTextColor="#2E5A47"
                  secureTextEntry
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.groupLabel}>ASSIGNED COACH PLATE</Text>
                <TextInput
                  style={styles.textInput}
                  value={busPlate}
                  onChangeText={setBusPlate}
                  placeholder="UP-78-CT-9012"
                  placeholderTextColor="#2E5A47"
                  autoCapitalize="characters"
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSignIn} activeOpacity={0.85}>
                <Text style={styles.submitBtnText}>START SHIFT & CONNECT BUS</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.groupLabel}>FULL LEGAL NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. Ramesh Kumar Verma"
                  placeholderTextColor="#2E5A47"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.groupLabel}>COMMERCIAL LICENSE NUMBER</Text>
                <TextInput
                  style={styles.textInput}
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  placeholder="UP-78-2023-XXXXX"
                  placeholderTextColor="#2E5A47"
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.groupLabel}>ASSIGNED COACH PLATE</Text>
                <TextInput
                  style={styles.textInput}
                  value={newBusPlate}
                  onChangeText={setNewBusPlate}
                  placeholder="UP-78-BZ-9041"
                  placeholderTextColor="#2E5A47"
                  autoCapitalize="characters"
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSignUp} activeOpacity={0.85}>
                <Text style={styles.submitBtnText}>REGISTER CREW & BEGIN DUTY</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>QUICK 1-TAP DEMO BYPASS</Text>
            <View style={styles.demoRow}>
              <TouchableOpacity style={styles.demoBtn} onPress={() => handleQuickDemo('CONDUCTOR')}>
                <Ionicons name="flash-outline" size={14} color="#86EFAC" style={{ marginRight: 4 }} />
                <Text style={styles.demoBtnText}>Demo Conductor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.demoBtn} onPress={() => handleQuickDemo('PILOT')}>
                <Ionicons name="flash-outline" size={14} color="#86EFAC" style={{ marginRight: 4 }} />
                <Text style={styles.demoBtnText}>Demo Pilot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020604' },
  scrollContent: { padding: 20, paddingTop: 20, paddingBottom: 40, gap: 16 },
  headerBlock: { alignItems: 'center', gap: 12 },
  telemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#07160F',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#133522',
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  telemetryPillText: { color: '#10B981', fontSize: 9.5, fontFamily: 'monospace', fontWeight: '900' },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#06120C',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: '#133522',
    gap: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#10B981' },
  tabBtnText: { color: '#86EFAC', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' },
  tabBtnTextActive: { color: '#020604', fontWeight: '900' },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 11, fontFamily: 'monospace' },
  formCard: { backgroundColor: '#07160F', borderRadius: 24, padding: 22, borderWidth: 1.5, borderColor: '#133522', gap: 14 },
  inputGroup: { gap: 6 },
  groupLabel: { color: '#689F88', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' },
  roleRow: { flexDirection: 'row', gap: 8 },
  rolePill: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#030805',
    borderWidth: 1,
    borderColor: '#133522',
    alignItems: 'center',
  },
  rolePillActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  rolePillText: { color: '#86EFAC', fontSize: 10.5, fontFamily: 'monospace', fontWeight: 'bold' },
  rolePillTextActive: { color: '#020604', fontWeight: '900' },
  textInput: {
    backgroundColor: '#030805',
    color: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#133522',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  submitBtn: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 6, elevation: 6 },
  submitBtnText: { color: '#020604', fontSize: 13, fontWeight: '900', fontFamily: 'monospace' },
  demoSection: { marginTop: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#133522', gap: 8 },
  demoTitle: { color: '#689F88', fontSize: 9.5, fontFamily: 'monospace', fontWeight: 'bold', textAlign: 'center' },
  demoRow: { flexDirection: 'row', gap: 8 },
  demoBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', backgroundColor: '#030805', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#133522', alignItems: 'center' },
  demoBtnText: { color: '#86EFAC', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' },
});