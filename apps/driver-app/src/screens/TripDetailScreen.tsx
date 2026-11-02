import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { theme } from '../theme/tokens';
import { getTrip, startTrip, endTrip, getPublicSchedule } from '../lib/api/trips.api';
import { TripMap, TripMapRef } from '../components/TripMap';
import { Ionicons } from '@expo/vector-icons';

export function TripDetailScreen({ route, navigation }: any) {
  const { tripId, scheduleId } = route.params;
  const qc = useQueryClient();
  const mapRef = useRef<TripMapRef | null>(null);

  const [fix, setFix] = useState<any>(null);
  const [osrmRoute, setOsrmRoute] = useState<any>(null);

  const { data: trip, refetch: refetchTrip } = useQuery({ 
    queryKey: ['trip', tripId], 
    queryFn: () => getTrip(tripId) 
  });

  const { data: schedule } = useQuery({ 
    queryKey: ['schedule', scheduleId], 
    queryFn: () => getPublicSchedule(scheduleId) 
  });

  // Fetch OSRM Route
  useEffect(() => {
    if (!schedule?.route?.stands || schedule.route.stands.length < 2) return;
    const coords = schedule.route.stands.map((s: any) => `${s.stand.lng},${s.stand.lat}`).join(';');
    fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
      .then(r => r.json())
      .then(data => { if (data.routes?.[0]?.geometry) setOsrmRoute(data.routes[0].geometry); })
      .catch(() => {});
  }, [schedule]);

  // Live GPS
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    Location.requestForegroundPermissionsAsync().then(res => {
      if (res.status === 'granted') {
        Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10 }, loc => {
          setFix({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }).then(s => { sub = s; });
      }
    });
    return () => { if (sub) sub.remove(); };
  }, []);

  const action = async (fn: any) => {
    try { await fn(tripId); await refetchTrip(); qc.invalidateQueries({ queryKey: ['trips'] }); } catch (e: any) { alert(e.message); }
  };

  if (!trip) return null;

  const mapLat = fix?.lat || (schedule?.route?.stands?.[0]?.stand?.lat) || 28.6139;
  const mapLng = fix?.lng || (schedule?.route?.stands?.[0]?.stand?.lng) || 77.2090;
  const markers = schedule?.route?.stands?.map((s: any) => ({ lat: s.stand.lat, lng: s.stand.lng, label: s.stand.name })) || [];

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </Pressable>
        <Text style={s.headerTitle}>Trip Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Map Card */}
        <View style={s.mapContainer}>
          <TripMap 
            lat={mapLat} 
            lng={mapLng} 
            markers={markers} 
            routeGeometry={osrmRoute} 
            height={220}
            onReady={(ref) => { mapRef.current = ref; }}
          />
          {/* Recenter Button */}
          <Pressable style={s.recenterBtn} onPress={() => mapRef.current?.recenter()}>
            <Ionicons name="locate" size={20} color="#000" />
          </Pressable>
        </View>

        {/* Trip Info Card */}
        <View style={s.infoCard}>
          <Text style={s.route}>{trip.route.originCity} → {trip.route.destinationCity}</Text>
          <Text style={s.busInfo}>{trip.bus.model} · {trip.bus.registrationNumber}</Text>
          
          <View style={[s.badge, { backgroundColor: trip.status === 'IN_PROGRESS' ? 'rgba(74,222,128,0.15)' : 'rgba(127,168,144,0.15)' }]}>
            <Text style={{ color: trip.status === 'IN_PROGRESS' ? theme.colors.primary : theme.colors.textMuted, fontWeight: '800', fontSize: 12 }}>
              {trip.status}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={s.actions}>
          {trip.status === 'SCHEDULED' && (
            <Pressable style={s.primaryBtn} onPress={() => action(startTrip)}>
              <Text style={s.primaryBtnText}>Start Trip</Text>
            </Pressable>
          )}

          {(trip.status === 'SCHEDULED' || trip.status === 'IN_PROGRESS') && (
            <>
              <Pressable style={s.secondaryBtn} onPress={() => navigation.navigate('Scan', { tripId, scheduleId })}>
                <Ionicons name="qr-code-outline" size={20} color={theme.colors.primary} />
                <Text style={s.secondaryBtnText}>Scan QR</Text>
              </Pressable>
              
              <Pressable style={s.secondaryBtn} onPress={() => navigation.navigate('Manifest', { tripId })}>
                <Ionicons name="list-outline" size={20} color={theme.colors.primary} />
                <Text style={s.secondaryBtnText}>Manifest</Text>
              </Pressable>
            </>
          )}

          {trip.status === 'IN_PROGRESS' && (
            <Pressable style={[s.primaryBtn, { backgroundColor: '#F87171', marginTop: 12 }]} onPress={() => action(endTrip)}>
              <Text style={[s.primaryBtnText, { color: '#FFF' }]}>End Trip</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  scroll: { padding: 20 },
  mapContainer: { position: 'relative', marginBottom: 20 },
  recenterBtn: { position: 'absolute', bottom: 12, right: 12, backgroundColor: theme.colors.primary, padding: 8, borderRadius: 8, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  infoCard: { backgroundColor: theme.colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 24 },
  route: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
  busInfo: { color: theme.colors.textMuted, fontSize: 14, marginTop: 6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 12 },
  actions: { gap: 12 },
  primaryBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary },
  secondaryBtnText: { color: theme.colors.primary, fontWeight: '800', fontSize: 16 },
});