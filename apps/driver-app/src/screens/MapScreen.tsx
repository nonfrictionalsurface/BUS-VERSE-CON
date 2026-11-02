import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { theme } from '../theme/tokens';
import { TripMap } from '../components/TripMap';
import { getPublicSchedule, getTrip } from '../lib/api/trips.api';

export function MapScreen({ route, navigation }: any) {
  const { tripId, scheduleId } = route.params;
  const [fix, setFix] = useState<any>(null);

  const { data: schedule } = useQuery({ queryKey: ['schedule', scheduleId], queryFn: () => getPublicSchedule(scheduleId) });
  const { data: trip } = useQuery({ queryKey: ['trip', tripId], queryFn: () => getTrip(tripId) });

  const { data: osrm } = useQuery({
    queryKey: ['osrm', scheduleId],
    queryFn: async () => {
      const stands = schedule?.route?.stands || [];
      if (stands.length < 2) return null;
      const coords = stands.map((s: any) => `${s.stand.lng},${s.stand.lat}`).join(';');
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
      return (await res.json()).routes[0].geometry;
    },
    enabled: !!schedule
  });

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(res => {
      if (res.status === 'granted') {
        Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10 }, loc => {
          setFix({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        });
      }
    });
  }, []);

  const stands = schedule?.route?.stands || [];
  const markers = stands.map((s: any) => ({ lat: s.stand.lat, lng: s.stand.lng, label: s.stand.name }));

  return (
    <View style={s.root}>
      <Pressable onPress={() => navigation.goBack()}><Text style={{ color: theme.colors.primary, fontSize: 24 }}>←</Text></Pressable>
      <Text style={s.title}>Live Map</Text>
      <View style={{ flex: 1, marginTop: 24 }}>
        <TripMap 
          lat={fix?.lat || 28.6139} 
          lng={fix?.lng || 77.2090} 
          markers={markers} 
          routeGeometry={osrm} 
          height="100%" 
        />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg, padding: 24, paddingTop: 60 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '800', marginTop: 24 }
});