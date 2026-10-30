import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AuthScreen } from './src/screens/AuthScreen';
import { MapScreen } from './src/screens/MapScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { ManifestScreen } from './src/screens/ManifestScreen';
import { DutyProfile, ManifestEntry } from './src/types';
import { BusConLogo } from './src/components/BusConBrand';

// Dynamic notch clearance
const STATUSBAR_OFFSET = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) + 4 : 44;

export default function App() {
  const [dutySession, setDutySession] = useState<DutyProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'MAP' | 'SCAN' | 'MANIFEST'>('MAP');
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const [manifest, setManifest] = useState<ManifestEntry[]>([
    { seatLabel: 'A1', passengerName: 'Passenger #1', boardingPoint: 'Kanpur Central Bay 4', status: 'BOARDED', gender: 'M' },
    { seatLabel: 'A2', passengerName: 'Passenger #2', boardingPoint: 'Kanpur Central Bay 4', status: 'BOARDED', gender: 'F', isFemaleOnly: true },
    { seatLabel: 'B1', passengerName: 'Passenger #3', boardingPoint: 'Kanpur Central Bay 4', status: 'WAITING', gender: 'M' },
    { seatLabel: 'B2', passengerName: 'Passenger #4', boardingPoint: 'Kanpur Central Bay 4', status: 'WAITING', gender: 'F', isFemaleOnly: true },
    { seatLabel: 'B4', passengerName: 'Passenger #5', boardingPoint: 'Kanpur Central Bay 4', status: 'WAITING', gender: 'M' },
    { seatLabel: 'C1', passengerName: 'Passenger #6', boardingPoint: 'Unnao Bypass Hub', status: 'WAITING', gender: 'M' },
  ]);

  const [recentScans, setRecentScans] = useState([
    { seat: 'A1', name: 'Passenger #1', time: '13:52 IST' },
    { seat: 'A2', name: 'Passenger #2', time: '13:56 IST' },
  ]);

  const handleCheckInSuccess = (seatLabel: string, paxName: string) => {
    setManifest((prev) =>
      prev.map((m) =>
        m.seatLabel.toUpperCase() === seatLabel.toUpperCase()
          ? { ...m, status: 'BOARDED' }
          : m
      )
    );
    setRecentScans((prev) => [
      { seat: seatLabel, name: paxName || 'Confirmed Passenger', time: 'Just now' },
      ...prev,
    ]);
  };

  const handleToggleStatus = (seatLabel: string) => {
    setManifest((prev) =>
      prev.map((m) =>
        m.seatLabel === seatLabel
          ? { ...m, status: m.status === 'BOARDED' ? 'WAITING' : 'BOARDED' }
          : m
      )
    );
  };

  const handleSignOut = () => {
    setShowSignOutConfirm(false);
    setDutySession(null);
    setActiveTab('MAP');
  };

  if (!dutySession) {
    return (
      <View style={[styles.rootContainer, { paddingTop: STATUSBAR_OFFSET }]}>
        <StatusBar style="light" />
        <AuthScreen onAuthSuccess={(duty) => setDutySession(duty)} />
      </View>
    );
  }

  const boardedCount = manifest.filter((m) => m.status === 'BOARDED').length;

  return (
    <View style={[styles.rootContainer, { paddingTop: STATUSBAR_OFFSET }]}>
      <StatusBar style="light" />

      {/* Header with BusCon Vector Brand Lockup */}
      <View style={styles.header}>
        <BusConLogo size={32} />

        <View style={styles.headerRight}>
          <View style={styles.telemetryTag}>
            <View style={styles.activeDot} />
            <Text style={styles.telemetryTagText}>{dutySession.busPlate}</Text>
          </View>

          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() => setShowSignOutConfirm(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.signOutBtnText}>SIGN OUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Screen Stage */}
      <View style={styles.bodyStage}>
        {activeTab === 'MAP' && (
          <MapScreen
            duty={dutySession}
            boardedCount={boardedCount}
            totalSeats={dutySession.totalSeats}
          />
        )}
        {activeTab === 'SCAN' && (
          <ScannerScreen
            onCheckInSuccess={handleCheckInSuccess}
            recentScans={recentScans}
          />
        )}
        {activeTab === 'MANIFEST' && (
          <ManifestScreen
            manifest={manifest}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </View>

      {/* Bottom Navigation with System Bar Clearance */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navTab, activeTab === 'MAP' && styles.navTabActive]}
          onPress={() => setActiveTab('MAP')}
        >
          <Ionicons
            name={activeTab === 'MAP' ? 'map' : 'map-outline'}
            size={18}
            color={activeTab === 'MAP' ? '#020604' : '#86EFAC'}
          />
          <Text style={[styles.navLabel, activeTab === 'MAP' && styles.navLabelActive]}>
            ROUTE MAP
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, activeTab === 'SCAN' && styles.navTabActive]}
          onPress={() => setActiveTab('SCAN')}
        >
          <Ionicons
            name={activeTab === 'SCAN' ? 'qr-code' : 'qr-code-outline'}
            size={18}
            color={activeTab === 'SCAN' ? '#020604' : '#86EFAC'}
          />
          <Text style={[styles.navLabel, activeTab === 'SCAN' && styles.navLabelActive]}>
            SCANNER
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, activeTab === 'MANIFEST' && styles.navTabActive]}
          onPress={() => setActiveTab('MANIFEST')}
        >
          <Ionicons
            name={activeTab === 'MANIFEST' ? 'clipboard' : 'clipboard-outline'}
            size={18}
            color={activeTab === 'MANIFEST' ? '#020604' : '#86EFAC'}
          />
          <Text style={[styles.navLabel, activeTab === 'MANIFEST' && styles.navLabelActive]}>
            MANIFEST ({boardedCount}/{manifest.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out Modal */}
      <Modal visible={showSignOutConfirm} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>END SHIFT & SIGN OUT?</Text>
            <Text style={styles.confirmSub}>
              This will disconnect coach {dutySession.busPlate} from dispatch.
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowSignOutConfirm(false)}
              >
                <Text style={styles.cancelBtnText}>RESUME DUTY</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmLogoutBtn}
                onPress={handleSignOut}
              >
                <Text style={styles.confirmLogoutBtnText}>SIGN OUT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#020604' },
  header: {
    height: 56,
    backgroundColor: '#07160F',
    borderBottomWidth: 1,
    borderBottomColor: '#133522',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  telemetryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#020604',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  activeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' },
  telemetryTagText: { color: '#10B981', fontSize: 9, fontWeight: '900', fontFamily: 'monospace' },
  signOutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  signOutBtnText: { color: '#F87171', fontSize: 9.5, fontWeight: '900', fontFamily: 'monospace' },
  bodyStage: { flex: 1 },
  bottomNav: {
    height: Platform.OS === 'ios' ? 84 : 74,
    paddingBottom: Platform.OS === 'ios' ? 22 : 12,
    backgroundColor: '#07160F',
    borderTopWidth: 1,
    borderTopColor: '#133522',
    flexDirection: 'row',
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
  },
  navTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#030805',
    borderWidth: 1,
    borderColor: '#133522',
    gap: 3,
  },
  navTabActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  navLabel: { color: '#86EFAC', fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' },
  navLabelActive: { color: '#020604' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 },
  confirmCard: {
    backgroundColor: '#07160F',
    borderWidth: 1.5,
    borderColor: '#133522',
    borderRadius: 24,
    padding: 22,
    gap: 12,
  },
  confirmTitle: { color: '#F0FDF4', fontSize: 15, fontWeight: '900', fontFamily: 'monospace' },
  confirmSub: { color: '#689F88', fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  confirmBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#030805',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#133522',
  },
  cancelBtnText: { color: '#86EFAC', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 11 },
  confirmLogoutBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  confirmLogoutBtnText: { color: '#FFFFFF', fontFamily: 'monospace', fontWeight: '900', fontSize: 11 },
});