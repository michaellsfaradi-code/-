import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default leaflet icons not loading
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const getDeviceIcon = (deviceType: string = '') => {
    const icons: Record<string, string> = {
        'camera': '📷',
        'server': '🖥️',
        'printer': '🖨️',
    };
    return L.divIcon({
        html: `<div style="font-size: 24px; text-shadow: 0 0 3px white;">${icons[deviceType.toLowerCase()] || '📍'}</div>`,
        className: 'custom-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
    });
};

export const NetlasMap: React.FC<{ matches: any[], onSelectMatchForReport: (match: any) => void }> = ({ matches, onSelectMatchForReport }) => {
  // Center on the first match
  const center: [number, number] = matches.length > 0 ? [matches[0].location.latitude, matches[0].location.longitude] : [31.7683, 35.2137];

  return (
    <MapContainer center={center} zoom={10} style={{width: '100%', height: '400px'}}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {matches.filter(m => m.location?.latitude && m.location?.longitude).map((m, i) => (
        <Marker 
            key={i} 
            position={[m.location.latitude, m.location.longitude]}
            icon={getDeviceIcon(m.device_type)}
        >
          <Popup>
            <div className="text-xs text-black">
              <p className="font-bold">{m.ip_str}</p>
              <p>{m.org}</p>
              <p className="text-[10px] text-slate-500">סוג: {m.device_type || 'לא ידוע'}</p>
              <button 
                  onClick={() => onSelectMatchForReport(m)}
                  className="mt-2 bg-rose-600 text-white p-1 rounded text-[10px]"
              >
                  בקש דוח מקיף
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
