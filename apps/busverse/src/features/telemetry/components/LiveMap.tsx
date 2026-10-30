'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { LiveGpsTelemetry, StopEta } from '@/features/tickets/types';

// Fix for missing default marker icons in Next.js (Webpack doesn't bundle Leaflet's images)
const customIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:var(--brand-primary);width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(0, 85, 237, 0.8);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Component to handle smooth panning when GPS updates
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

interface LiveMapProps {
  gps?: LiveGpsTelemetry;
  stops: StopEta[];
}

export function LiveMap({ gps, stops }: LiveMapProps) {
  // Default to center of India if no GPS
  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const center: [number, number] = gps ? [gps.lat, gps.lng] : defaultCenter;

  return (
    <div className="h-[400px] w-full rounded-2xl overflow-hidden border-2 border-border-hairline relative z-0 my-6 shadow-inner">
      <MapContainer center={center} zoom={gps ? 13 : 5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {gps && (
          <>
            <MapUpdater center={[gps.lat, gps.lng]} />
            <Marker position={[gps.lat, gps.lng]} icon={customIcon}>
              <Popup>
                <div className="text-xs font-sans">
                  <strong className="block text-sm mb-1">Live Vehicle</strong>
                  Speed: {gps.speedKmh} km/h<br/>
                  Updated: {new Date(gps.recordedAt).toLocaleTimeString()}
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
      
      {!gps && (
        <div className="absolute inset-0 bg-black/40 z-[1000] flex items-center justify-center pointer-events-none">
          <span className="bg-surface-card px-4 py-2 rounded-lg text-sm font-bold text-ink-bright shadow-floating">
            Waiting for GPS Signal...
          </span>
        </div>
      )}
    </div>
  );
}