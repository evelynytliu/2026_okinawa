'use client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState, useMemo } from 'react';

// Fix Leaflet Default Icon
const fixIcon = () => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
};

function MapContent({ restaurants, onMarkerClick }) {
    const [userPos, setUserPos] = useState(null);
    const map = useMap();

    useEffect(() => {
        fixIcon();

        // Fit bounds to restaurants initially
        if (restaurants.length > 0) {
            try {
                const group = new L.featureGroup(restaurants.map(r => L.marker([r.lat, r.lng])));
                const bounds = group.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            } catch (e) {
                console.error("Map bounds error:", e);
            }
        }

        map.locate().on("locationfound", function (e) {
            setUserPos(e.latlng);
        });
    }, [map, restaurants]);

    return (
        <>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
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
                        <span style={{ color: '#666', fontSize: '0.9em' }}>點擊跳轉</span>
                    </Popup>
                </Marker>
            ))}
        </>
    );
}

export default function RestaurantMap({ restaurants, onMarkerClick }) {
    // Unique key to force re-mount only if strictly necessary, usually not needed if controlled well
    // But here to prevent reuse error, we ensure a clean key or useMemo for containers is tricky.
    // The error "Map container is being reused by another instance" means the DOM node isn't clean.
    // We add a key to MapContainer based on mounting to ensure fresh instance.

    // Actually, just ensuring it's not conditional rendering too fast might help.
    // Let's use a unique ID for the container element key.

    return (
        <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', zIndex: 0 }}>
            <MapContainer
                center={[26.26, 127.7]}
                zoom={10}
                style={{ height: '100%', width: '100%' }}
                key="map-container-v1"
            >
                <MapContent restaurants={restaurants} onMarkerClick={onMarkerClick} />
            </MapContainer>
        </div>
    );
}
