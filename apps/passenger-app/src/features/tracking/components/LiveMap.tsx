import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../../theme';

type Stand = { standId: string; standName: string; lat: number; lng: number; sequence: number };

type Props = {
  stands: Stand[];
  position: { lat: number; lng: number } | null;
  nextStandId: string | null;
};

/**
 * Live map for a trip, rendered as a Leaflet document inside a WebView.
 *
 * Why not react-native-maps: it calls `codegenNativeComponent`, which does not exist
 * in react-native-web, so importing it fails at module-evaluation time on the browser
 * (fatal boot error for the whole navigator). react-native-webview works on both
 * native and web, and this is the same pattern as apps/driver-app/src/components/TripMap.
 *
 * Position updates are pushed into the already-loaded map via postMessage — the HTML
 * is only rebuilt when the route or the theme changes, so the iframe never reloads
 * while the bus is moving.
 */
export const LiveMap: React.FC<Props> = ({ stands, position, nextStandId }) => {
  const { tokens, theme } = useTheme();
  const webViewRef = useRef<WebView>(null);

  const ordered = useMemo(() => [...stands].sort((a, b) => a.sequence - b.sequence), [stands]);

  // Centre on the first stand, fall back to India centre if route is empty.
  const centerLat = ordered[0]?.lat ?? 20.5937;
  const centerLng = ordered[0]?.lng ?? 78.9629;

  const html = useMemo(() => {
    const isDark = theme === 'dark';
    const bg = isDark ? '#060A12' : '#F4F7FB';
    const busColor = tokens.brandPrimary;
    const standColor = tokens.textMuted;
    const nextStandColor = tokens.warningAmber;
    const lineColor = tokens.brandPrimary;
    const attrBg = isDark ? 'rgba(6,10,18,0.9)' : 'rgba(255,255,255,0.9)';

    const standsJs = ordered
      .map((s) => {
        // JSON.stringify gives us a safe, correctly-quoted JS string literal.
        const popupLiteral = JSON.stringify(s.standName || '');
        const isNext = s.standId === nextStandId;
        const color = isNext ? nextStandColor : standColor;
        const radius = isNext ? 8 : 6;
        return (
          `L.circleMarker([${s.lat}, ${s.lng}], {` +
          ` radius: ${radius}, color: '${color}', fillColor: '${color}',` +
          ` fillOpacity: 1, weight: 2 }).addTo(map).bindPopup(${popupLiteral});`
        );
      })
      .join('\n');

    const polylineJs =
      ordered.length > 1
        ? `L.polyline([${ordered.map((s) => `[${s.lat}, ${s.lng}]`).join(',')}], { color: '${lineColor}', weight: 4, opacity: 0.7 }).addTo(map);`
        : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${bg}; }
    .leaflet-control-attribution { background: ${attrBg} !important; color: ${standColor} !important; font-size: 9px !important; }
    .leaflet-control-attribution a { color: ${lineColor} !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${centerLat}, ${centerLng}], 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map);

    var busIcon = L.divIcon({
      html: '<div style="width:22px;height:22px;border-radius:11px;background:${busColor};border:3px solid #fff;box-shadow:0 0 14px ${busColor},0 2px 6px rgba(0,0,0,0.4);"></div>',
      iconSize: [22, 22],
      className: 'bus-marker'
    });
    var busMarker = null;

    ${polylineJs}
    ${standsJs}

    window.addEventListener('message', function (e) {
      try {
        var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
          if (busMarker) {
            busMarker.setLatLng([data.lat, data.lng]);
          } else {
            busMarker = L.marker([data.lat, data.lng], { icon: busIcon }).addTo(map);
            map.panTo([data.lat, data.lng]);
          }
        }
      } catch (err) { /* ignore malformed messages */ }
    });
  </script>
</body>
</html>`;
  }, [ordered, nextStandId, tokens, theme, centerLat, centerLng]);

  // Push position updates into the live map without reloading the iframe.
  useEffect(() => {
    if (!position || !webViewRef.current) return;
    try {
      webViewRef.current.postMessage(
        JSON.stringify({ lat: position.lat, lng: position.lng }),
      );
    } catch {
      /* webView not ready; next render will retry */
    }
  }, [position]);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.canvasBg }}>
      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: 'https://tile.openstreetmap.org' }}
        style={{ flex: 1, backgroundColor: tokens.canvasBg }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
      />
    </View>
  );
};

export default LiveMap;