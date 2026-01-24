'use client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';

// Fix Leaflet Default Icon
const fixIcon = () => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
};

function LocationMarker({ setUserPos }) {
    const map = useMap();

    useEffect(() => {
        map.locate().on("locationfound", function (e) {
            setUserPos(e.latlng);
            // Don't auto fly to user if we want to show restaurants, or maybe fly to bounds?
            // Let's keep it simple: center on user if found, user can pan.
            // Or better: fit bounds of user + restaurants.
        });
    }, [map, setUserPos]);

    return null;
}

export default function RestaurantMap({ restaurants, onMarkerClick }) {
    const [userPos, setUserPos] = useState(null);
    const defaultCenter = [26.26, 127.7]; // Central area between Naha and American Village

    useEffect(() => {
        fixIcon();
    }, []);

    return (
        <MapContainer center={defaultCenter} zoom={10} style={{ height: '300px', width: '100%', borderRadius: '12px', zIndex: 0 }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker setUserPos={setUserPos} />

            {userPos && (
                <Marker position={userPos} icon={new L.Icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })}>
                    <Popup>You are here</Popup>
                </Marker>
            )}

            {restaurants.map(rest => (
                <Marker
                    key={rest.id}
                    position={[rest.lat, rest.lng]}
                    eventHandlers={{
                        click: () => onMarkerClick(rest.id),
                    }}
                    icon={new L.Icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })}
                >
                    <Popup>
                        <strong style={{ fontSize: '1.1em' }}>{rest.name}</strong><br />
                        <span style={{ color: '#666', fontSize: '0.9em' }}>點擊查看詳情</span>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
