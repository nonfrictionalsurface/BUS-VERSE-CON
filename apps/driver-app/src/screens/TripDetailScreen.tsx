import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useCleanTheme } from '../theme/clean';
import { getTrip, startTrip, endTrip, getPublicSchedule, postGps } from '../lib/api/trips.api';
import { TripMap, TripMapRef } from '../components/TripMap';

export function TripDetailScreen({ route, navigation }: any) {
  const theme = useCleanTheme();
  const { tripId, scheduleId } = route.params;
  const qc = useQueryClient();
  const mapRef = useRef<TripMapRef | null>(null);

  const [fix, setFix] = useState<any>(null);
  const [osrmRoute, setOsrmRoute] = useState<any>(null);

  const { data: trip, refetch: refetchTrip } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => getTrip(tripId),
  });
  const { data: schedule } = useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: () => getPublicSchedule(scheduleId),
  });

  const tripRef = useRef(trip);
  useEffect(() => {
    tripRef.current = trip;
  }, [trip]);

  useEffect(() => {
    if (!schedule?.route?.stands || schedule.route.stands.length < 2) return;
    const coords = schedule.route.stands
      .map((s: any) => `${s.stand.lng},${s.stand.lat}`)
      .join(';');
    fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
      .then((r) => r.json())
      .then((data) => {
        if (data.routes?.[0]?.geometry) setOsrmRoute(data.routes[0].geometry);
      })
      .catch((e) => console.log('[OSRM] failed:', e?.message));
  }, [schedule]);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let lastPostAt = 0;
    let cancelled = false;

    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') return;
        const s = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
          (loc) => {
            if (cancelled) return;
            const newFix = {
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              speedKmh: Math.max(0, (loc.coords.speed ?? 0) * 3.6),
              accuracyM: loc.coords.accuracy ?? 0,
              recordedAt: new Date().toISOString(),
            };
            setFix(newFix);
            const now = Date.now();
            if (tripRef.current?.status === 'IN_PROGRESS' && now - lastPostAt >= 5000) {
              lastPostAt = now;
              postGps(tripId, newFix).catch((err) =>
                console.log('[GPS] POST failed:', err?.message),
              );
            }
          },
        );
        if (cancelled) {
          s.remove();
          return;
        }
        sub = s;
      } catch (e: any) {
        console.log('[GPS] watch failed:', e?.message);
      }
    })();

    return () => {
      cancelled = true;
      try {
        sub?.remove();
      } catch {}
    };
  }, [tripId]);

  const handleStart = async () => {
    try {
      await startTrip(tripId);
      await refetchTrip();
      qc.invalidateQueries({ queryKey: ['trips'] });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEnd = async () => {
    try {
      const result: any = await endTrip(tripId);
      qc.invalidateQueries({ queryKey: ['trips'] });
      const depTime =
        (schedule as any)?.departureTime ??
        (trip as any)?.schedule?.departureTime ??
        new Date().toISOString();
      const arrTime =
        (schedule as any)?.arrivalTime ??
        (trip as any)?.schedule?.arrivalTime ??
        new Date().toISOString();
      navigation.replace('TripSummary', {
        tripId,
        tripReference:
          (trip as any)?.reference ??
          (trip as any)?.tripReference ??
          `TRP-${String(tripId).slice(0, 8).toUpperCase()}`,
        endedAt: result?.endedAt ?? new Date().toISOString(),
        durationMinutes: result?.durationMinutes ?? 0,
        distanceKm: result?.distanceKm ?? null,
        boardedCount: result?.boardedCount ?? 0,
        totalPassengers: result?.confirmedCount ?? 0,
        routeSummary: `${(trip as any)?.route?.originCity ?? '?'} → ${(trip as any)?.route?.destinationCity ?? '?'}`,
        busModel: (trip as any)?.bus?.model ?? 'Bus',
        busRegistration: (trip as any)?.bus?.registrationNumber ?? '—',
        departureTime: depTime,
        arrivalTime: arrTime,
        delayReason: (trip as any)?.delayReason,
        delayMinutes: (trip as any)?.delayMinutes,
      });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const s = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: theme.colors.bg },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 20,
          paddingTop: Platform.OS === 'ios' ? 60 : 40,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
        scroll: { padding: 20 },
        mapContainer: { position: 'relative', marginBottom: 20 },
        recenterBtn: {
          position: 'absolute',
          bottom: 12,
          right: 12,
          backgroundColor: theme.colors.primary,
          padding: 8,
          borderRadius: 8,
          elevation: 4,
        },
        infoCard: {
          backgroundColor: theme.colors.surface,
          padding: 20,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
          marginBottom: 24,
        },
        route: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
        busInfo: { color: theme.colors.textMuted, fontSize: 14, marginTop: 6 },
        badge: {
          alignSelf: 'flex-start',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 6,
          marginTop: 12,
        },
        badgeText: { fontWeight: '800', fontSize: 12 },
        actions: { gap: 12 },
        primaryBtn: {
          backgroundColor: theme.colors.primary,
          padding: 16,
          borderRadius: 12,
          alignItems: 'center',
        },
        primaryBtnText: {
          color: theme.isDark ? '#000' : '#FFF',
          fontWeight: '800',
          fontSize: 16,
        },
        secondaryBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: theme.colors.surface,
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.primary,
        },
        secondaryBtnText: {
          color: theme.colors.primary,
          fontWeight: '800',
          fontSize: 16,
        },
      }),
    [theme],
  );

  if (!trip) return null;

  const mapLat = fix?.lat || schedule?.route?.stands?.[0]?.stand?.lat || 28.6139;
  const mapLng = fix?.lng || schedule?.route?.stands?.[0]?.stand?.lng || 77.209;
  const markers =
    schedule?.route?.stands?.map((s: any) => ({
      lat: s.stand.lat,
      lng: s.stand.lng,
      label: s.stand.name,
    })) || [];
  const isInProgress = trip.status === 'IN_PROGRESS';

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </Pressable>
        <Text style={s.headerTitle}>Trip Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.mapContainer}>
          <TripMap
            lat={mapLat}
            lng={mapLng}
            markers={markers}
            routeGeometry={osrmRoute}
            height={220}
            onReady={(ref) => {
              mapRef.current = ref;
            }}
          />
          <Pressable style={s.recenterBtn} onPress={() => mapRef.current?.recenter()}>
            <Ionicons name="locate" size={20} color={theme.isDark ? '#000' : '#FFF'} />
          </Pressable>
        </View>

        <View style={s.infoCard}>
          <Text style={s.route}>
            {trip.route.originCity} → {trip.route.destinationCity}
          </Text>
          <Text style={s.busInfo}>
            {trip.bus.model} · {trip.bus.registrationNumber}
          </Text>
          <View
            style={[
              s.badge,
              {
                backgroundColor: isInProgress
                  ? theme.isDark
                    ? 'rgba(74,222,128,0.15)'
                    : 'rgba(76,175,80,0.12)'
                  : theme.isDark
                  ? 'rgba(127,168,144,0.15)'
                  : 'rgba(122,107,95,0.1)',
              },
            ]}
          >
            <Text
              style={[
                s.badgeText,
                { color: isInProgress ? theme.colors.success : theme.colors.textMuted },
              ]}
            >
              {trip.status}
            </Text>
          </View>
        </View>

        <View style={s.actions}>
          {trip.status === 'SCHEDULED' && (
            <Pressable style={s.primaryBtn} onPress={handleStart}>
              <Text style={s.primaryBtnText}>Start Trip</Text>
            </Pressable>
          )}

          {(trip.status === 'SCHEDULED' || trip.status === 'IN_PROGRESS') && (
            <>
              <Pressable
                style={s.secondaryBtn}
                onPress={() => navigation.navigate('Scan', { tripId, scheduleId })}
              >
                <Ionicons name="qr-code-outline" size={20} color={theme.colors.primary} />
                <Text style={s.secondaryBtnText}>Scan QR</Text>
              </Pressable>
              <Pressable
                style={s.secondaryBtn}
                onPress={() => navigation.navigate('Manifest', { tripId })}
              >
                <Ionicons name="list-outline" size={20} color={theme.colors.primary} />
                <Text style={s.secondaryBtnText}>Manifest</Text>
              </Pressable>
            </>
          )}

          {trip.status === 'IN_PROGRESS' && (
            <Pressable
              style={[s.primaryBtn, { backgroundColor: theme.colors.danger, marginTop: 12 }]}
              onPress={handleEnd}
            >
              <Text style={[s.primaryBtnText, { color: '#FFF' }]}>End Trip</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}