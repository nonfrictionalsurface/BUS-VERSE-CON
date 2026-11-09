import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useCleanTheme } from '../theme/clean';
import { getManifest } from '../lib/api/trips.api';

export function ManifestScreen({ route, navigation }: any) {
  const theme = useCleanTheme();
  const { tripId } = route.params;
  const { data } = useQuery({
    queryKey: ['manifest', tripId],
    queryFn: () => getManifest(tripId),
  });

  const s = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: theme.colors.bg, padding: 24, paddingTop: 60 },
        title: { color: theme.colors.text, fontSize: 24, fontWeight: '800', marginTop: 24 },
        sub: { color: theme.colors.textMuted, marginTop: 12 },
        card: {
          backgroundColor: theme.colors.surface,
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        stand: { color: theme.colors.primary, fontWeight: '800', fontSize: 16, marginBottom: 12 },
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: 8,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        },
        name: { color: theme.colors.text },
        status: { color: theme.colors.primary, fontWeight: '700' },
      }),
    [theme],
  );

  return (
    <View style={s.root}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={{ color: theme.colors.primary, fontSize: 24 }}>←</Text>
      </Pressable>
      <Text style={s.title}>Manifest</Text>

      {!data?.byStand?.length ? (
        <Text style={s.sub}>No passengers yet.</Text>
      ) : (
        <ScrollView style={{ marginTop: 24 }}>
          {data.byStand.map((stand: any) => (
            <View key={stand.standId} style={s.card}>
              <Text style={s.stand}>
                {stand.standName} ({stand.passengers.length})
              </Text>
              {stand.passengers.map((p: any) => (
                <View key={p.bookingId} style={s.row}>
                  <Text style={s.name}>{p.passengerNames.join(', ')}</Text>
                  <Text style={s.status}>{p.boardingStatus}</Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}