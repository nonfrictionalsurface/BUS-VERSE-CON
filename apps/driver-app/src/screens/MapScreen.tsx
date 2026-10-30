import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { DutyProfile } from '../types';

interface MapScreenProps {
  duty: DutyProfile;
  boardedCount: number;
  totalSeats: number;
}

export function MapScreen({ duty, boardedCount, totalSeats }: MapScreenProps) {
  const [speed, setSpeed] = useState(duty.currentSpeedKmh || 74);
  const [gpsPingSec, setGpsPingSec] = useState(1);
  const [activeLayer, setActiveLayer] = useState<'DARK' | 'STANDARD' | 'TOPO'>('DARK');
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSpeed((prev) => Math.max(62, Math.min(88, prev + (Math.floor(Math.random() * 5) - 2))));
      setGpsPingSec((prev) => (prev % 3) + 1);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const waypoints = [
    { title: 'Kanpur Central Bay 4', eta: 'Departed 14:00' },
    { title: 'Unnao Bypass Flyover', eta: '14:38 IST (~12 min)' },
    { title: 'Nawabganj Toll Plaza', eta: '15:10 IST' },
    { title: 'Lucknow Alambagh ISBT', eta: '15:55 IST' },
  ];

  // Pure OpenStreetMap GIS Engine
  const mapHtml = useMemo(() => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100vw; height: 100vh; background: #020604; overflow: hidden; }
    .leaflet-control-attribution { display: none !important; }

    /* Tactical Dark Radar Filter for OpenStreetMap */
    .dark-osm img {
      filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(92%) !important;
    }

    .bus-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -50%);
    }
    .pulse-ring {
      position: absolute;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.4);
      border: 2px solid #10B981;
      animation: radarPulse 2s infinite ease-out;
    }
    .bus-badge {
      width: 36px;
      height: 36px;
      border-radius: 18px;
      background: #10B981;
      border: 2.5px solid #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.95);
      z-index: 5;
    }
    .bus-badge svg {
      width: 20px;
      height: 20px;
      fill: #020604;
    }
    .bus-pill {
      margin-top: 4px;
      background: rgba(2, 6, 4, 0.96);
      color: #86EFAC;
      font-family: monospace;
      font-size: 10px;
      font-weight: 900;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1.5px solid #10B981;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0,0,0,0.9);
      z-index: 6;
    }
    @keyframes radarPulse {
      0% { transform: scale(0.4); opacity: 1; }
      100% { transform: scale(1.8); opacity: 0; }
    }

    .stop-marker {
      width: 16px;
      height: 16px;
      border-radius: 8px;
      background: #020604;
      border: 3px solid #86EFAC;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.8);
    }
    .stop-dest { border-color: #38BDF8; background: #082F49; }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([26.5820, 80.5340], 11);

    // 1. OpenStreetMap Dark Mode
    const osmDark = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, className: 'dark-osm' });

    // 2. OpenStreetMap Standard Roads
    const osmStandard = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });

    // 3. OpenTopoMap Topographic Terrain
    const osmTopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17 });

    let currentLayer = osmDark;
    currentLayer.addTo(map);

    window.switchOsmLayer = function(layerName) {
      map.removeLayer(currentLayer);
      if (layerName === 'STANDARD') currentLayer = osmStandard;
      else if (layerName === 'TOPO') currentLayer = osmTopo;
      else currentLayer = osmDark;
      currentLayer.addTo(map);
    };

    // NH-27 Corridor Polyline (Kanpur Central to Lucknow ISBT)
    const highwayCoords = [
      [26.4539, 80.3508], [26.4468, 80.3752], [26.4410, 80.4021], [26.4682, 80.4285],
      [26.5458, 80.4912], [26.6120, 80.5750], [26.6542, 80.6521], [26.7011, 80.7250],
      [26.7321, 80.7932], [26.7680, 80.8450], [26.8156, 80.9022]
    ];
    L.polyline(highwayCoords, { color: '#064E3B', weight: 10, opacity: 0.8 }).addTo(map);
    L.polyline(highwayCoords, { color: '#10B981', weight: 4.5, opacity: 0.95, dashArray: '10, 6' }).addTo(map);

    const stops = [
      { name: "Kanpur Central", lat: 26.4539, lng: 80.3508, dest: false },
      { name: "Unnao Bypass", lat: 26.5458, lng: 80.4912, dest: false },
      { name: "Nawabganj Toll", lat: 26.6542, lng: 80.6521, dest: false },
      { name: "Lucknow Alambagh", lat: 26.8156, lng: 80.9022, dest: true }
    ];
    stops.forEach(s => {
      const icon = L.divIcon({
        className: 'custom-stop',
        html: '<div class="stop-marker ' + (s.dest ? 'stop-dest' : '') + '"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      L.marker([s.lat, s.lng], { icon: icon }).addTo(map);
    });

    // Vector SVG Bus Icon
    let busPos = [26.5820, 80.5340];
    const busSvgHtml = '<div class="pulse-ring"></div><div class="bus-badge"><svg viewBox="0 0 24 24"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg></div><div class="bus-pill">${duty.busPlate}</div>';

    const busIcon = L.divIcon({
      className: 'bus-marker',
      html: busSvgHtml,
      iconSize: [54, 54],
      iconAnchor: [27, 27]
    });
    const busMarker = L.marker(busPos, { icon: busIcon }).addTo(map);

    let step = 0;
    setInterval(() => {
      step = (step + 1) % 100;
      const lat = 26.5458 + (step / 100) * (26.6542 - 26.5458);
      const lng = 80.4912 + (step / 100) * (80.6521 - 80.4912);
      busPos = [lat, lng];
      busMarker.setLatLng(busPos);
    }, 2400);

    window.recenterBus = function() {
      map.setView(busPos, 12, { animate: true });
    };
  </script>
</body>
</html>
    `;
  }, [duty.busPlate]);

  const handleSelectLayer = (layerKey: 'DARK' | 'STANDARD' | 'TOPO') => {
    setActiveLayer(layerKey);
    const js = `if (typeof window.switchOsmLayer === 'function') { window.switchOsmLayer('${layerKey}'); } true;`;
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(js);
    }
  };

  const handleRecenter = () => {
    const js = `if (typeof window.recenterBus === 'function') { window.recenterBus(); } true;`;
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(js);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapViewport}>
        {Platform.OS === 'web' ? (
          <iframe
            srcDoc={mapHtml}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            title="OpenStreetMap Corridor"
          />
        ) : (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            style={styles.webView}
            scrollEnabled={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        )}

        {/* Floating Top Telemetry Gauge - Elevated Clear of Punch-Hole Camera */}
        <View style={styles.floatingTopHud}>
          <View style={styles.hudLeft}>
            <View style={styles.beaconPill}>
              <View style={styles.beaconDot} />
              <Text style={styles.beaconText}>AIS-140 GPS : {gpsPingSec}s PING</Text>
            </View>
            <Text style={styles.corridorTitle}>NH-27 INTERCITY CORRIDOR</Text>
            <Text style={styles.coachMeta}>{duty.busPlate} • {duty.model}</Text>
          </View>

          <View style={styles.speedBox}>
            <Text style={styles.speedNumber}>{speed}</Text>
            <Text style={styles.speedUnit}>KM/H</Text>
          </View>
        </View>

        {/* Floating OpenStreetMap Layer Switcher */}
        <View style={styles.tileBar}>
          {(['DARK', 'STANDARD', 'TOPO'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tilePill, activeLayer === t && styles.tilePillActive]}
              onPress={() => handleSelectLayer(t)}
            >
              <Text style={[styles.tilePillText, activeLayer === t && styles.tilePillTextActive]}>
                {t === 'DARK' ? 'OSM DARK' : t === 'STANDARD' ? 'OSM STREETS' : 'OSM TOPO'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recenter Button with Vector Locate Icon */}
        <TouchableOpacity style={styles.recenterBtn} onPress={handleRecenter}>
          <Ionicons name="locate" size={20} color="#10B981" />
        </TouchableOpacity>

        {/* Floating Bottom Milestone Drawer - Lifted Clean Above Bottom Navigation */}
        <View style={styles.floatingDrawer}>
          <View style={styles.drawerHead}>
            <View>
              <Text style={styles.nextWaypointTag}>APPROACHING WAYPOINT</Text>
              <Text style={styles.nextWaypointTitle}>{waypoints[1].title}</Text>
            </View>
            <View style={styles.etaBadge}>
              <Text style={styles.etaBadgeText}>~12 MIN (14:38 IST)</Text>
            </View>
          </View>

          <View style={styles.drawerStatsGrid}>
            <View style={styles.statCell}>
              <Text style={styles.cellLabel}>PASSENGERS</Text>
              <Text style={styles.cellValEmerald}>{boardedCount} / {totalSeats} Onboard</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.cellLabel}>GPS FIX</Text>
              <Text style={styles.cellValWhite}>HDOP 0.8 (LOCK)</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.cellLabel}>MAP ENGINE</Text>
              <Text style={styles.cellValEmerald}>OPENSTREETMAP</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020604' },
  mapViewport: { flex: 1, width: '100%', height: '100%', position: 'relative' },
  webView: { flex: 1, backgroundColor: '#020604' },
  floatingTopHud: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(7, 22, 15, 0.94)',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#133522',
    elevation: 8,
  },
  hudLeft: { flex: 1 },
  beaconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#020604',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  beaconDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' },
  beaconText: { color: '#10B981', fontSize: 8.5, fontFamily: 'monospace', fontWeight: '900' },
  corridorTitle: { color: '#F0FDF4', fontSize: 13, fontWeight: '900', fontFamily: 'monospace' },
  coachMeta: { color: '#86EFAC', fontSize: 10, fontFamily: 'monospace', marginTop: 2 },
  speedBox: {
    backgroundColor: '#020604',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#133522',
  },
  speedNumber: { color: '#10B981', fontSize: 24, fontWeight: '900', fontFamily: 'monospace' },
  speedUnit: { color: '#689F88', fontSize: 8.5, fontFamily: 'monospace', fontWeight: 'bold' },
  tileBar: {
    position: 'absolute',
    top: 106,
    left: 14,
    flexDirection: 'row',
    backgroundColor: 'rgba(7, 22, 15, 0.92)',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#133522',
    gap: 4,
  },
  tilePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tilePillActive: { backgroundColor: '#10B981' },
  tilePillText: { color: '#86EFAC', fontSize: 9.5, fontFamily: 'monospace', fontWeight: 'bold' },
  tilePillTextActive: { color: '#020604', fontWeight: '900' },
  recenterBtn: {
    position: 'absolute',
    right: 16,
    bottom: 146,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#07160F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#10B981',
    elevation: 8,
  },
  floatingDrawer: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(7, 22, 15, 0.96)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#133522',
    gap: 12,
    elevation: 8,
  },
  drawerHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#133522',
    paddingBottom: 10,
  },
  nextWaypointTag: { color: '#10B981', fontSize: 9, fontWeight: '900', fontFamily: 'monospace' },
  nextWaypointTitle: { color: '#F0FDF4', fontSize: 13, fontWeight: 'bold', fontFamily: 'monospace', marginTop: 2 },
  etaBadge: {
    backgroundColor: '#020604',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  etaBadgeText: { color: '#86EFAC', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' },
  drawerStatsGrid: { flexDirection: 'row', gap: 8 },
  statCell: {
    flex: 1,
    backgroundColor: '#020604',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#133522',
  },
  cellLabel: { color: '#689F88', fontSize: 8, fontFamily: 'monospace', fontWeight: 'bold' },
  cellValEmerald: { color: '#10B981', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold', marginTop: 2 },
  cellValWhite: { color: '#F0FDF4', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold', marginTop: 2 },
});