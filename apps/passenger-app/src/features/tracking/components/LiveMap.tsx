import React, { useEffect, useRef } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useTheme } from '../../../theme';

type Stand = { standId: string; standName: string; lat: number; lng: number; sequence: number };

type Props = {
  stands: Stand[];
  position: { lat: number; lng: number } | null;
  nextStandId: string | null;
};

export const LiveMap: React.FC<Props> = ({ stands, position, nextStandId }) => {
  const { tokens } = useTheme();
  const ref = useRef<MapView | null>(null);
  const ordered = [...stands].sort((a, b) => a.sequence - b.sequence);
  const coords = ordered.map((s) => ({ latitude: s.lat, longitude: s.lng }));

  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || coords.length === 0) return;
    fitted.current = true;
    const all = position ? [...coords, { latitude: position.lat, longitude: position.lng }] : coords;
    ref.current?.fitToCoordinates(all, { edgePadding: { top: 80, right: 50, bottom: 80, left: 50 }, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.length]);

  const first = coords[0];
  return (
    <MapView
      ref={ref}
      style={{ flex: 1 }}
      initialRegion={first ? { latitude: first.latitude, longitude: first.longitude, latitudeDelta: 1.5, longitudeDelta: 1.5 } : undefined}
    >
      {coords.length > 1 ? <Polyline coordinates={coords} strokeColor={tokens.brandPrimary} strokeWidth={4} /> : null}
      {ordered.map((s) => (
        <Marker
          key={s.standId}
          coordinate={{ latitude: s.lat, longitude: s.lng }}
          title={s.standName}
          description={s.standId === nextStandId ? 'Next stop' : undefined}
          pinColor={s.standId === nextStandId ? tokens.warningAmber : tokens.textMuted}
        />
      ))}
      {position ? <Marker coordinate={{ latitude: position.lat, longitude: position.lng }} title="Your bus" pinColor={tokens.brandPrimary} /> : null}
    </MapView>
  );
};
