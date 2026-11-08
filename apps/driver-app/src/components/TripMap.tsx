import React, { useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { theme } from '../theme/tokens';

export interface TripMapRef {
  recenter: () => void;
}

interface Props {
  lat: number;
  lng: number;
  zoom?: number;
  height?: number | string;
  markers?: any[];
  routeGeometry?: any;
  onReady?: (ref: TripMapRef) => void;
}

export function TripMap({ lat, lng, zoom = 12, height = 250, markers = [], routeGeometry = null, onReady }: Props) {
  const webViewRef = useRef<WebView>(null);

  const html = useMemo(() => {
    // Safely escape single quotes in marker labels
    const markersJs = markers.map((m: any) => {
      const safeLabel = (m.label || '').replace(/'/g, "\\'");
      return `L.circleMarker([${m.lat}, ${m.lng}], { radius: 6, color: '${theme.colors.textMuted}', fillColor: '${theme.colors.textMuted}', fillOpacity: 1 }).addTo(map).bindPopup('${safeLabel}');`;
    }).join('\n');
    
    const routeJs = routeGeometry ? `L.geoJSON(${JSON.stringify(routeGeometry)}, { style: { color: '${theme.colors.primary}', weight: 5, opacity: 0.8 } }).addTo(map);` : '';

    return `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        body,html,#map{height:100%;margin:0;background:${theme.colors.bg}}
        /* This CSS filter makes standard OSM tiles look soft, light, and pastel */
        .leaflet-layer {
          filter: grayscale(100%) brightness(1.05) contrast(0.85) opacity(0.85);
        }
        .leaflet-control-attribution{background:rgba(255,255,255,0.92)!important;color:${theme.colors.textMuted}!important;font-size:9px!important}
        .leaflet-control-attribution a{color:${theme.colors.primary}!important}
      </style>
    </head><body><div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], ${zoom});
        
        // Standard OpenStreetMap tiles (100% reliable, no API key needed)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map);
        
        var busIcon = L.divIcon({ html: '<div style="width:16px;height:16px;border-radius:8px;background:${theme.colors.primary};border:2px solid ${theme.colors.surface};box-shadow:0 0 10px rgba(196,135,135,0.6);"></div>', iconSize:[16,16] });
        L.marker([${lat}, ${lng}], {icon: busIcon}).addTo(map);
        
        ${routeJs}
        ${markersJs}
        
        window.recenterMap = function() {
          map.setView([${lat}, ${lng}], ${zoom}, { animate: true });
        };
      </script></body></html>`;
  }, [lat, lng, zoom, markers, routeGeometry]);

  return (
    <View style={[styles.wrap, { height, borderColor: theme.colors.border }]}>
      <WebView 
        ref={webViewRef}
        source={{ html }} 
        style={{ backgroundColor: theme.colors.bg }} 
        javaScriptEnabled 
        domStorageEnabled 
        onLoad={() => {
          if (onReady) {
            onReady({
              recenter: () => {
                webViewRef.current?.injectJavaScript('window.recenterMap(); true;');
              }
            });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
});
