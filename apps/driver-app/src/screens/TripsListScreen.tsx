import React, { useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useCleanTheme } from '../theme/clean';
import { useTheme } from '../theme/ThemeContext';
import { listTrips } from '../lib/api/trips.api';
import { useAuth } from '../lib/auth/AuthContext';
import { StaticVectorMark } from '../components/brand/StaticVectorMark';

export function TripsListScreen({ navigation }: any) {
  const theme = useCleanTheme();
  const { mode, cycleMode } = useTheme();
  const { user, logout } = useAuth();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trips'],
    queryFn: () => listTrips(),
  });

  const s = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: theme.colors.bg },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 24,
          paddingTop: 60,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        title: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        card: {
          backgroundColor: theme.colors.surface,
          padding: 16,
          borderRadius: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        route: { color: theme.colors.primary, fontSize: 18, fontWeight: '800' },
        sub: { color: theme.colors.textMuted, marginTop: 6, fontSize: 13 },
        themeBtn: {
          padding: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        logoutText: { color: theme.colors.danger, fontWeight: '700' },
      }),
    [theme],
  );

  const themeIcon: 'sunny' | 'moon' | 'contrast' =
    mode === 'light' ? 'sunny' : mode === 'dark' ? 'moon' : 'contrast';
  const themeLabel =
    mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'Auto';

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={{
            color: theme.colors.primary,
            marginTop: 12,
            fontWeight: '800',
            letterSpacing: 2,
          }}
        >
          LOADING TRIPS
        </Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <StaticVectorMark size={32} />
          <Text style={s.title}>Hi, {user?.name || 'Driver'}</Text>
        </View>
        <View style={s.headerRight}>
          <Pressable
            onPress={cycleMode}
            style={s.themeBtn}
            accessibilityLabel={`Theme: ${themeLabel}. Tap to change.`}
            hitSlop={8}
          >
            <Ionicons name={themeIcon} size={20} color={theme.colors.text} />
          </Pressable>
          <Pressable onPress={logout} style={{ padding: 8 }}>
            <Text style={s.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={data || []}
        keyExtractor={(i: any) => i.tripId}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }: any) => (
          <Pressable
            style={s.card}
            onPress={() =>
              navigation.navigate('TripDetail', {
                tripId: item.tripId,
                scheduleId: item.scheduleId,
              })
            }
          >
            <Text style={s.route}>
              {item.route.originCity} → {item.route.destinationCity}
            </Text>
            <Text style={s.sub}>
              {item.bus.registrationNumber} · {item.status}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text
            style={{
              color: theme.colors.textMuted,
              textAlign: 'center',
              marginTop: 24,
            }}
          >
            No trips today.
          </Text>
        }
        onRefresh={refetch}
        refreshing={false}
      />
    </View>
  );
}