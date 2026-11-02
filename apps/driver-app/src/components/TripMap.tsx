import React, { useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export interface TripMapRef {
  recenter: () => void;
}

interface Props {
  lat: number;
  lng: number;
  zoom?: number;
  height?: number;
  markers?: any[];
  routeGeometry?: any;
  onReady?: (ref: TripMapRef) => void;
}

export function TripMap({ lat, lng, zoom = 12, height = 250, markers = [], routeGeometry = null, onReady }: Props) {
  const webViewRef = useRef<WebView>(null);

  const html = useMemo(() => {
    const markersJs = markers.map((m: any) => 
      `L.circleMarker([${m.lat}, ${m.lng}], { radius: 6, color: '#7FA890', fillColor: '#7FA890', fillOpacity: 1 }).addTo(map).bindPopup('${m.label}');`
    ).join('\n');
    
    const routeJs = routeGeometry ? `L.geoJSON(${JSON.stringify(routeGeometry)}, { style: { color: '#4ADE80', weight: 5, opacity: 0.8 } }).addTo(map);` : '';

    return `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        body,html,#map{height:100%;margin:0;background:#0A1410}
        .leaflet-control-attribution{background:rgba(5,12,8,0.92)!important;color:#7FA890!important;font-size:9px!important}
        .leaflet-control-attribution a{color:#4ADE80!important}
      </style>
    </head><body><div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], ${zoom});
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OSM' }).addTo(map);
        var busIcon = L.divIcon({ html: '<div style="width:16px;height:16px;border-radius:8px;background:#4ADE80;border:2px solid #000;box-shadow:0 0 10px #4ADE80;"></div>', iconSize:[16,16] });
        L.marker([${lat}, ${lng}], {icon: busIcon}).addTo(map);
        ${routeJs}
        ${markersJs}
        
        // Function called from React Native to recenter
        window.recenterMap = function() {
          map.setView([${lat}, ${lng}], ${zoom}, { animate: true });
        };
      </script></body></html>`;
  }, [lat, lng, zoom, markers, routeGeometry]);

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView 
        ref={webViewRef}
        source={{ html }} 
        style={{ backgroundColor: '#0A1410' }} 
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
  wrap: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#15452D' },
});