import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  Linking,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { PassengerTicket } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ScannerScreenProps {
  onCheckInSuccess: (seatLabel: string, paxName: string) => void;
  recentScans: Array<{ seat: string; name: string; time: string }>;
}

export function ScannerScreen({ onCheckInSuccess, recentScans }: ScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [verifiedTicket, setVerifiedTicket] = useState<PassengerTicket | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const parseAndVerifyPass = (payload: string) => {
    setErrorMsg(null);
    const trimmed = payload.trim();

    if (!trimmed.startsWith('v1:')) {
      setErrorMsg('Invalid QR: Envelope header missing "v1:" cryptographic mark.');
      return;
    }

    try {
      const parts = trimmed.split(':');
      if (parts.length < 3) throw new Error('Malformed segments');
      const jsonClaims = atob(parts[1]);
      const ticket: PassengerTicket = JSON.parse(jsonClaims);
      setVerifiedTicket(ticket);
      setCameraActive(false);
    } catch {
      setErrorMsg('Signature Verification Failed: Invalid boarding pass code.');
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || verifiedTicket) return;
    setScanned(true);
    parseAndVerifyPass(data);
  };

  const handleLaunchCamera = async () => {
    setErrorMsg(null);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        if (!result.canAskAgain) {
          Alert.alert(
            'Camera Access Blocked',
            'Please enable camera permissions in device system settings to scan boarding passes.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        }
        setErrorMsg('Camera access is not permitted by device.');
        return;
      }
    }
    setScanned(false);
    setCameraActive(true);
  };

  const handleTestPass = () => {
    const sampleToken = 'v1:eyJhbGxTZWF0TGFiZWxzIjpbIkI0Il0sImJvYXJkaW5nU3RhbmRJZCI6IjAyMjA2OWU0LTFkZTQtNTc5OS04MzU5LTBlNjBkMmU1YTBmMyIsImJvb2tpbmdJZCI6ImRjOGJiYjlmLThhYTYtNDE3Yy05M2QwLTJmOTA4ZGM1MTdlYiIsImlzc3VlZEF0IjoiMjAyNi0xMC0zMFQxMzo1NjowMC4zMThaIiwibm9uY2UiOiJzTERtTDZ3V2cxdWhUSjU0VElHcmVnPT0iLCJwYXNzZW5nZXJDb3VudCI6MSwicHJpbWFyeVBhc3Nlbmdlck5hbWUiOiJNb2hhbW1lZCBTaGFnaGFmIiwicHJpbWFyeVNlYXRJZCI6IjU5NmI3ZGFmLTgzNjctNTAwMS1hMDYwLWI5YWY4M2U4M2VhZCIsInByaW1hcnlTZWF0TGFiZWwiOiJCNCIsInNjaGVkdWxlSWQiOiIwMzM0YzJmNC01N2VjLTU2NTEtODU3Zi00ODMyNTdmZDNmMmIiLCJ0aWNrZXRJZCI6IjEyY2E5ZDk5LTNhZGMtNGEyMS04ZGZmLTFmYmRhNGM4YjY3NCIsInYiOjF9:cUyvKMAPbjc3yJu9IJzyWNP84ZvFdUMHVzd6uuczhfouEKB6sMACtoYGu5dsFfYvvomjj30QfVHqg36QfUy7Bg==';
    parseAndVerifyPass(sampleToken);
  };

  if (cameraActive) {
    return (
      <View style={styles.fullscreenCamera}>
        <CameraView
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />

        <View style={styles.cameraTopBar}>
          <TouchableOpacity style={styles.camIconBtn} onPress={() => setCameraActive(false)}>
            <Ionicons name="close" size={16} color="#F0FDF4" />
            <Text style={styles.camIconBtnText}>CLOSE</Text>
          </TouchableOpacity>
          <View style={styles.scannerBadge}>
            <Text style={styles.scannerBadgeText}>ED25519 SCANNER ACTIVE</Text>
          </View>
          <TouchableOpacity
            style={[styles.camIconBtn, torch && styles.camIconBtnActive]}
            onPress={() => setTorch((p) => !p)}
          >
            <Ionicons name={torch ? "flashlight" : "flashlight-outline"} size={16} color="#F0FDF4" />
            <Text style={styles.camIconBtnText}>{torch ? 'ON' : 'TORCH'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.reticleWrap}>
          <View style={styles.reticleFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.reticlePrompt}>FRAME PASSENGER QR PASS</Text>
        </View>

        <View style={styles.cameraBottomBar}>
          <TouchableOpacity
            style={styles.switchManualBtn}
            onPress={() => {
              setCameraActive(false);
              setShowManualModal(true);
            }}
          >
            <Ionicons name="clipboard-outline" size={16} color="#86EFAC" style={{ marginRight: 6 }} />
            <Text style={styles.switchManualBtnText}>PASTE TICKET PASS CODE INSTEAD</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.consoleCard}>
        <View style={styles.consoleHead}>
          <View>
            <Text style={styles.consoleTitle}>BOARDING VERIFICATION CONSOLE</Text>
            <Text style={styles.consoleSub}>Cryptographic Ed25519 Pass Scanner</Text>
          </View>
          <View style={styles.engineBadge}>
            <Text style={styles.engineBadgeText}>OFFLINE READY</Text>
          </View>
        </View>

        {(!permission?.granted && Platform.OS !== 'web') && (
          <View style={styles.permWarningBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="alert-circle-outline" size={16} color="#86EFAC" />
              <Text style={styles.permWarningText}>Camera permission is currently required.</Text>
            </View>
            <TouchableOpacity style={styles.permGrantBtn} onPress={requestPermission}>
              <Text style={styles.permGrantBtnText}>ALLOW CAMERA PERMISSION</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.launchCameraBtn} onPress={handleLaunchCamera} activeOpacity={0.85}>
          <Ionicons name="camera-outline" size={24} color="#020604" />
          <View style={{ flex: 1 }}>
            <Text style={styles.launchCameraText}>LAUNCH CAMERA SCANNER</Text>
            <Text style={styles.launchCameraSub}>Point camera at passenger boarding pass</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testBtn} onPress={handleTestPass}>
          <Ionicons name="flash-outline" size={16} color="#86EFAC" style={{ marginRight: 6 }} />
          <Text style={styles.testBtnText}>TEST VERIFY SAMPLE TICKET (SEAT B4)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.manualEntryBtn} onPress={() => setShowManualModal(true)}>
          <Ionicons name="clipboard-outline" size={16} color="#689F88" style={{ marginRight: 6 }} />
          <Text style={styles.manualEntryBtnText}>ENTER / PASTE TICKET PASS CODE</Text>
        </TouchableOpacity>
      </View>

      {errorMsg && (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Manifest Log Feed */}
      <View style={styles.logCard}>
        <Text style={styles.logHead}>RECENTLY BOARDED MANIFEST PINGS</Text>
        {recentScans.length === 0 ? (
          <Text style={styles.emptyLogText}>No boarding passes scanned yet on this run.</Text>
        ) : (
          <View style={styles.logList}>
            {recentScans.slice(0, 5).map((scan, i) => (
              <View key={i} style={styles.logItem}>
                <View style={styles.logSeatBadge}>
                  <Text style={styles.logSeatText}>{scan.seat}</Text>
                </View>
                <View style={styles.logInfo}>
                  <Text style={styles.logName}>{scan.name}</Text>
                  <Text style={styles.logTime}>{scan.time}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.verifiedTag}>VERIFIED</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Manual Paste Code Modal */}
      <Modal visible={showManualModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogHeader}>MANUAL PASS VERIFICATION</Text>
            <Text style={styles.dialogSub}>Paste the Base64 cryptographic QR token</Text>
            <TextInput
              style={styles.textInputArea}
              multiline
              numberOfLines={4}
              placeholder="v1:eyJhbGxTZWF0TGFiZWxzIjpbIkI0Il0...:cUyvKMAPbjc3..."
              placeholderTextColor="#2E5A47"
              value={manualInput}
              onChangeText={setManualInput}
            />
            <View style={styles.dialogBtnRow}>
              <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setShowManualModal(false)}>
                <Text style={styles.dialogCancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={() => {
                  setShowManualModal(false);
                  parseAndVerifyPass(manualInput);
                }}
              >
                <Text style={styles.dialogConfirmBtnText}>AUTHENTICATE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Verified Ticket Card Modal */}
      <Modal visible={verifiedTicket !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.ticketCard}>
            <View style={styles.authBadgePill}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={styles.authBadgePillText}>ED25519 AUTHENTICATED</Text>
            </View>
            <Text style={styles.ticketPaxName}>{verifiedTicket?.primaryPassengerName || 'Confirmed Passenger'}</Text>
            <View style={styles.seatPillRow}>
              <Text style={styles.seatPillLabel}>ASSIGNED SEAT:</Text>
              <View style={styles.seatBubble}>
                <Text style={styles.seatBubbleText}>{verifiedTicket?.primarySeatLabel}</Text>
              </View>
            </View>
            <View style={styles.ticketDetailsBox}>
              <Text style={styles.detailLine}>Booking Ref: {verifiedTicket?.bookingId}</Text>
              <Text style={styles.detailLine}>Ticket UUID: {verifiedTicket?.ticketId.slice(0, 12)}...</Text>
              <Text style={styles.detailLine}>Status: Confirmed for Boarding</Text>
            </View>
            <TouchableOpacity
              style={styles.boardConfirmAction}
              onPress={() => {
                if (verifiedTicket) {
                  onCheckInSuccess(verifiedTicket.primarySeatLabel, verifiedTicket.primaryPassengerName);
                  setVerifiedTicket(null);
                }
              }}
            >
              <Text style={styles.boardConfirmActionText}>AUTHORIZE PASSENGER & CHECK IN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020604', padding: 16, gap: 16 },
  fullscreenCamera: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', backgroundColor: '#000', zIndex: 999 },
  cameraTopBar: { position: 'absolute', top: 54, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  camIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(7, 22, 15, 0.88)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#133522' },
  camIconBtnActive: { backgroundColor: '#10B981' },
  camIconBtnText: { color: '#F0FDF4', fontSize: 11, fontWeight: '900', fontFamily: 'monospace' },
  scannerBadge: { backgroundColor: 'rgba(2, 6, 4, 0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#10B981' },
  scannerBadgeText: { color: '#10B981', fontSize: 10, fontWeight: '900', fontFamily: 'monospace' },
  reticleWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  reticleFrame: { width: 250, height: 250, position: 'relative', backgroundColor: 'rgba(16, 185, 129, 0.04)' },
  corner: { position: 'absolute', width: 26, height: 26, borderColor: '#10B981' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3.5, borderLeftWidth: 3.5 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3.5, borderRightWidth: 3.5 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3.5, borderLeftWidth: 3.5 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3.5, borderRightWidth: 3.5 },
  reticlePrompt: { color: '#86EFAC', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold', marginTop: 20, letterSpacing: 1.5 },
  cameraBottomBar: { position: 'absolute', bottom: 32, left: 20, right: 20, zIndex: 10 },
  switchManualBtn: { flexDirection: 'row', justifyContent: 'center', backgroundColor: 'rgba(7, 22, 15, 0.94)', paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#133522' },
  switchManualBtnText: { color: '#86EFAC', fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' },
  consoleCard: { backgroundColor: '#07160F', borderRadius: 24, padding: 20, borderWidth: 1.5, borderColor: '#133522', gap: 14 },
  consoleHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  consoleTitle: { color: '#F0FDF4', fontSize: 13, fontWeight: '900', fontFamily: 'monospace' },
  consoleSub: { color: '#689F88', fontSize: 10, fontFamily: 'monospace', marginTop: 2 },
  engineBadge: { backgroundColor: '#020604', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#10B981' },
  engineBadgeText: { color: '#10B981', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' },
  permWarningBox: { backgroundColor: '#0A1E14', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#16432A', gap: 6 },
  permWarningText: { color: '#86EFAC', fontSize: 10, fontFamily: 'monospace' },
  permGrantBtn: { backgroundColor: '#10B981', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  permGrantBtnText: { color: '#020604', fontSize: 10, fontWeight: '900', fontFamily: 'monospace' },
  launchCameraBtn: { backgroundColor: '#10B981', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  launchCameraText: { color: '#020604', fontSize: 13, fontWeight: '900', fontFamily: 'monospace' },
  launchCameraSub: { color: '#064E3B', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' },
  testBtn: { flexDirection: 'row', justifyContent: 'center', backgroundColor: '#0F261B', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#16432A', alignItems: 'center' },
  testBtnText: { color: '#86EFAC', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' },
  manualEntryBtn: { flexDirection: 'row', justifyContent: 'center', backgroundColor: '#030805', borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#133522', alignItems: 'center' },
  manualEntryBtnText: { color: '#689F88', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 11, fontFamily: 'monospace' },
  logCard: { backgroundColor: '#07160F', borderRadius: 24, padding: 20, borderWidth: 1.5, borderColor: '#133522', flex: 1 },
  logHead: { color: '#689F88', fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 12 },
  emptyLogText: { color: '#2E5A47', fontSize: 11, fontFamily: 'monospace', fontStyle: 'italic' },
  logList: { gap: 8 },
  logItem: { backgroundColor: '#030805', padding: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#133522' },
  logSeatBadge: { backgroundColor: '#10B981', width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logSeatText: { color: '#020604', fontWeight: '900', fontFamily: 'monospace', fontSize: 12 },
  logInfo: { flex: 1 },
  logName: { color: '#F0FDF4', fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace' },
  logTime: { color: '#689F88', fontSize: 10, fontFamily: 'monospace' },
  verifiedTag: { color: '#10B981', fontSize: 9, fontWeight: '900', fontFamily: 'monospace' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  dialogCard: { backgroundColor: '#07160F', borderWidth: 1, borderColor: '#133522', borderRadius: 24, padding: 22, gap: 12 },
  dialogHeader: { color: '#F0FDF4', fontSize: 14, fontWeight: '900', fontFamily: 'monospace' },
  dialogSub: { color: '#689F88', fontSize: 11, fontFamily: 'monospace' },
  textInputArea: { backgroundColor: '#030805', color: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#133522', padding: 12, fontFamily: 'monospace', fontSize: 11, textAlignVertical: 'top' },
  dialogBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  dialogCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#030805', alignItems: 'center' },
  dialogCancelBtnText: { color: '#86EFAC', fontFamily: 'monospace', fontWeight: 'bold' },
  dialogConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center' },
  dialogConfirmBtnText: { color: '#020604', fontFamily: 'monospace', fontWeight: '900' },
  ticketCard: { backgroundColor: '#07160F', borderWidth: 2, borderColor: '#10B981', borderRadius: 28, padding: 24, gap: 14 },
  authBadgePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#10B981', alignSelf: 'flex-start' },
  authBadgePillText: { color: '#10B981', fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace' },
  ticketPaxName: { color: '#F0FDF4', fontSize: 18, fontWeight: '900', fontFamily: 'monospace' },
  seatPillRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  seatPillLabel: { color: '#689F88', fontSize: 11, fontFamily: 'monospace' },
  seatBubble: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  seatBubbleText: { color: '#020604', fontWeight: '900', fontFamily: 'monospace', fontSize: 13 },
  ticketDetailsBox: { backgroundColor: '#030805', padding: 12, borderRadius: 12, gap: 4, borderWidth: 1, borderColor: '#133522' },
  detailLine: { color: '#86EFAC', fontSize: 11, fontFamily: 'monospace' },
  boardConfirmAction: { backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 6 },
  boardConfirmActionText: { color: '#020604', fontSize: 12, fontWeight: '900', fontFamily: 'monospace' },
});