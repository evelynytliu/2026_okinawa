'use client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState, useRef } from 'react';

// Fix Leaflet Default Icon
const fixIcon = () => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
};

function MapController({ restaurants }) {
    const map = useMap();
    const isMounted = useRef(false);

    useEffect(() => {
        if (!isMounted.current) {
            fixIcon();
            isMounted.current = true;
        }

        if (restaurants.length > 0) {
            try {
                // Use a small timeout to ensure map render cycle is complete
                const timer = setTimeout(() => {
                    if (!map) return;
                    const points = restaurants.map(r => [r.lat, r.lng]);
                    const bounds = new L.LatLngBounds(points);
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
                    }
                }, 100);
                return () => clearTimeout(timer);
            } catch (e) {
                console.warn("Map bounds error:", e);
            }
        }
    }, [map, restaurants]);

    return null;
}

function UserLocationMarker() {
    const [position, setPosition] = useState(null);
    const map = useMap();

    useEffect(() => {
        map.locate().on("locationfound", function (e) {
            setPosition(e.latlng);
        });
    }, [map]);

    if (!position) return null;

    return (
        <Marker position={position} icon={new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })}>
            <Popup>Here you are!</Popup>
        </Marker>
    );
}

export default function RestaurantMap({ restaurants, onMarkerClick }) {
    // Generate a stable key just once per mount to avoid re-initialization contentions
    const [mountKey] = useState(() => `map-${Date.now()}`);

    return (
        <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', zIndex: 0 }}>
            <MapContainer
                key={mountKey}
                center={[26.26, 127.7]}
                zoom={10}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController restaurants={restaurants} />
                <UserLocationMarker />

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
                            <div style={{ textAlign: 'center' }}>
                                <strong style={{ fontSize: '1.1em' }}>{rest.name}</strong><br />
                                <span style={{ color: '#666', fontSize: '0.9em', cursor: 'pointer' }}>點擊查看</span>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
