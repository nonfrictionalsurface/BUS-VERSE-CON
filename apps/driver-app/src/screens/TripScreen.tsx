import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { ActiveDuty } from '../types';

interface TripScreenProps {
  duty: ActiveDuty;
}

export function TripScreen({ duty }: TripScreenProps) {
  const [tripState, setTripState] = useState<'SCHEDULED' | 'DEPARTED' | 'ARRIVED'>('SCHEDULED');

  return (
    <View style={styles.container}>
      {/* Route Header Card */}
      <View style={styles.dutyCard}>
        <Text style={styles.corridorTag}>INTERCITY CORRIDOR</Text>
        <Text style={styles.routeHeader}>
          {duty.origin} → {duty.destination}
        </Text>
        <Text style={styles.busModel}>
          {duty.busPlate} • {duty.model}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Dep: {duty.departureTime}</Text>
          <Text style={styles.metaText}>Capacity: {duty.totalSeats} Seats</Text>
        </View>
      </View>

      {/* Telemetry Switch State */}
      <View style={styles.stateWrapper}>
        <Text style={styles.stateLabel}>TRIP DISPATCH STATUS</Text>
        <View style={styles.stateBadge}>
          <View style={styles.livePulse} />
          <Text style={styles.stateBadgeText}>{tripState}</Text>
        </View>
      </View>

      {/* Action Controls */}
      <View style={styles.actionWrap}>
        {tripState === 'SCHEDULED' && (
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => setTripState('DEPARTED')}
          >
            <Text style={styles.primaryActionText}>START JOURNEY & DEPART</Text>
          </TouchableOpacity>
        )}

        {tripState === 'DEPARTED' && (
          <TouchableOpacity
            style={styles.arriveAction}
            onPress={() => setTripState('ARRIVED')}
          >
            <Text style={styles.arriveActionText}>MARK ARRIVAL AT DESTINATION</Text>
          </TouchableOpacity>
        )}

        {tripState === 'ARRIVED' && (
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => setTripState('SCHEDULED')}
          >
            <Text style={styles.secondaryActionText}>RESET TRIP DUTY</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050D0B', padding: 16 },
  dutyCard: {
    backgroundColor: '#0D1E1A',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#16332C',
  },
  corridorTag: {
    color: '#10B981',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  routeHeader: {
    color: '#F0FDF4',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 6,
  },
  busModel: {
    color: '#86EFAC',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#16332C',
  },
  metaText: { color: '#4B7B70', fontSize: 11, fontFamily: 'monospace' },
  stateWrapper: {
    backgroundColor: '#0D1E1A',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#16332C',
    alignItems: 'center',
  },
  stateLabel: { color: '#4B7B70', fontSize: 11, fontFamily: 'monospace' },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  stateBadgeText: {
    color: '#10B981',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  actionWrap: { marginTop: 'auto', marginBottom: 20 },
  primaryAction: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryActionText: { color: '#050D0B', fontWeight: 'bold', fontFamily: 'monospace' },
  arriveAction: {
    backgroundColor: '#06B6D4',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  arriveActionText: { color: '#050D0B', fontWeight: 'bold', fontFamily: 'monospace' },
  secondaryAction: {
    backgroundColor: '#132A25',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryActionText: { color: '#D1FAE5', fontWeight: 'bold', fontFamily: 'monospace' },
});