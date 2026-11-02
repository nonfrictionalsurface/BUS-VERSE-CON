import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../theme/tokens';
import { getManifest } from '../lib/api/trips.api';

export function ManifestScreen({ route, navigation }: any) {
  const { tripId } = route.params;
  const { data } = useQuery({ queryKey: ['manifest', tripId], queryFn: () => getManifest(tripId) });

  return (
    <View style={s.root}>
      <Pressable onPress={() => navigation.goBack()}><Text style={{ color: theme.colors.primary, fontSize: 24 }}>←</Text></Pressable>
      <Text style={s.title}>Manifest</Text>
      
      {!data?.byStand?.length ? (
        <Text style={s.sub}>No passengers yet.</Text>
      ) : (
        <ScrollView style={{ marginTop: 24 }}>
          {data.byStand.map((stand: any) => (
            <View key={stand.standId} style={s.card}>
              <Text style={s.stand}>{stand.standName} ({stand.passengers.length})</Text>
              {stand.passengers.map((p: any) => (
                <View key={p.bookingId} style={s.row}>
                  <Text style={{ color: '#FFF' }}>{p.passengerNames.join(', ')}</Text>
                  <Text style={{ color: theme.colors.primary }}>{p.boardingStatus}</Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg, padding: 24, paddingTop: 60 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '800', marginTop: 24 },
  sub: { color: theme.colors.textMuted, marginTop: 12 },
  card: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
  stand: { color: theme.colors.primary, fontWeight: '800', fontSize: 16, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.border }
});