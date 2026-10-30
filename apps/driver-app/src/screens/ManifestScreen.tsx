import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { ManifestEntry } from '../types';

interface ManifestScreenProps {
  manifest: ManifestEntry[];
  onToggleStatus: (seatLabel: string) => void;
}

export function ManifestScreen({ manifest, onToggleStatus }: ManifestScreenProps) {
  const [filter, setFilter] = useState<'ALL' | 'WAITING' | 'BOARDED'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = manifest.filter((item) => {
    const matchesFilter = filter === 'ALL' || item.status === filter;
    const matchesSearch =
      item.seatLabel.toLowerCase().includes(search.toLowerCase()) ||
      item.passengerName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const boardedCount = manifest.filter((m) => m.status === 'BOARDED').length;

  return (
    <View style={styles.container}>
      {/* Counters Strip */}
      <View style={styles.statsStrip}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>BOARDED</Text>
          <Text style={styles.statNumEmerald}>{boardedCount}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>PENDING</Text>
          <Text style={styles.statNumAmber}>{manifest.length - boardedCount}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>CAPACITY</Text>
          <Text style={styles.statNumWhite}>{manifest.length}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {(['ALL', 'WAITING', 'BOARDED'] as const).map((tabKey) => (
          <TouchableOpacity
            key={tabKey}
            style={[styles.tabPill, filter === tabKey && styles.tabPillActive]}
            onPress={() => setFilter(tabKey)}
          >
            <Text
              style={[
                styles.tabPillText,
                filter === tabKey && styles.tabPillTextActive,
              ]}
            >
              {tabKey}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder="Filter by seat code or passenger name..."
          placeholderTextColor="#4B7B70"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Manifest Entries List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.seatLabel}
        contentContainerStyle={styles.listWrap}
        renderItem={({ item }) => {
          const isBoarded = item.status === 'BOARDED';
          return (
            <View style={styles.rosterCard}>
              <View style={styles.cardLeft}>
                <View
                  style={[
                    styles.seatBadge,
                    isBoarded && styles.seatBadgeBoarded,
                    item.isFemaleOnly && styles.seatBadgeFemale,
                  ]}
                >
                  <Text style={styles.seatBadgeText}>{item.seatLabel}</Text>
                </View>

                <View>
                  <View style={styles.nameRow}>
                    <Text style={styles.passengerName}>{item.passengerName}</Text>
                    {item.isFemaleOnly && (
                      <Text style={styles.femaleTag}>♀ FEMALE</Text>
                    )}
                  </View>
                  <Text style={styles.boardingPoint}>{item.boardingPoint}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.actionToggle, isBoarded && styles.actionToggleBoarded]}
                onPress={() => onToggleStatus(item.seatLabel)}
              >
                <Text
                  style={[
                    styles.actionToggleText,
                    isBoarded && styles.actionToggleTextBoarded,
                  ]}
                >
                  {isBoarded ? '✓ BOARDED' : 'CHECK IN'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#040907' },
  statsStrip: { flexDirection: 'row', padding: 16, gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: '#0A1612',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#173024',
    alignItems: 'center',
  },
  statLabel: { color: '#4B7B70', fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' },
  statNumEmerald: { color: '#10B981', fontSize: 18, fontWeight: '900', fontFamily: 'monospace', marginTop: 2 },
  statNumAmber: { color: '#F59E0B', fontSize: 18, fontWeight: '900', fontFamily: 'monospace', marginTop: 2 },
  statNumWhite: { color: '#F0FDF4', fontSize: 18, fontWeight: '900', fontFamily: 'monospace', marginTop: 2 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0A1612',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#173024',
  },
  tabPillActive: { backgroundColor: '#10B981' },
  tabPillText: { color: '#86EFAC', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' },
  tabPillTextActive: { color: '#040907' },
  searchContainer: { paddingHorizontal: 16, marginBottom: 12 },
  searchBar: {
    backgroundColor: '#0A1612',
    color: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#173024',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  listWrap: { paddingHorizontal: 16, paddingBottom: 30, gap: 8 },
  rosterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A1612',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#173024',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  seatBadge: {
    backgroundColor: '#050D0B',
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#173024',
  },
  seatBadgeBoarded: { backgroundColor: '#10B981', borderColor: '#10B981' },
  seatBadgeFemale: { borderColor: '#F472B6' },
  seatBadgeText: { color: '#F0FDF4', fontWeight: '900', fontFamily: 'monospace', fontSize: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  passengerName: { color: '#F0FDF4', fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace' },
  femaleTag: { color: '#F472B6', fontSize: 8, fontWeight: 'bold', fontFamily: 'monospace' },
  boardingPoint: { color: '#4B7B70', fontSize: 10, fontFamily: 'monospace', marginTop: 1 },
  actionToggle: {
    backgroundColor: '#050D0B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#173024',
  },
  actionToggleBoarded: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  actionToggleText: { color: '#86EFAC', fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' },
  actionToggleTextBoarded: { color: '#10B981' },
});