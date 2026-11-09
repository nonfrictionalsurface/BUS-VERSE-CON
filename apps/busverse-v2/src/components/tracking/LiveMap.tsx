'use client';

import { useMemo } from 'react';

interface Stop {
  lat: number;
  lng: number;
  name: string;
}

interface LiveMapProps {
  lat: number;
  lng: number;
  stops?: Stop[];
  height?: number;
}

export function LiveMap({ lat, lng, stops = [], height = 400 }: LiveMapProps) {
  const html = useMemo(() => {
    const stopsJs = stops
      .map((s) => {
        const safe = (s.name || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
        return `L.circleMarker([${s.lat}, ${s.lng}], { radius: 6, color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 1, weight: 2 }).addTo(map).bindPopup('${safe}');`;
      })
      .join('\n');

    return `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        body,html,#map{height:100%;margin:0;background:#0A0F18}
        .leaflet-control-attribution{background:rgba(6,10,18,0.9)!important;color:#94A3B8!important;font-size:9px!important}
        .leaflet-control-attribution a{color:#3B82F6!important}
      </style>
    </head><body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], 11);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map);

        var busIcon = L.divIcon({
          html: '<div style="width:22px;height:22px;border-radius:11px;background:#10B981;border:3px solid #fff;box-shadow:0 0 14px #10B981,0 2px 6px rgba(0,0,0,0.4);"></div>',
          iconSize: [22, 22],
          className: 'bus-marker'
        });
        L.marker([${lat}, ${lng}], { icon: busIcon }).addTo(map);

        ${stopsJs}

        // Enable map interactions on mobile
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        map.scrollWheelZoom.enable();
      </script>
    </body></html>`;
  }, [lat, lng, stops]);

  return (
    <div style={{ height, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-strong)' }}>
      <iframe
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Live bus tracking map"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}