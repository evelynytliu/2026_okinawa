'use client';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function RestaurantMap({ restaurants, onMarkerClick }) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersLayerRef = useRef(null);

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Cleanup if exists (Strict Mode safety)
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        // Fix Icons globally
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        const map = L.map(mapContainerRef.current, {
            center: [26.26, 127.7],
            zoom: 10,
            scrollWheelZoom: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // User Location
        map.locate().on("locationfound", function (e) {
            const userIcon = new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
            L.marker(e.latlng, { icon: userIcon }).addTo(map).bindPopup("You are here");
        });

        // Initialize Layer Group for Markers
        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;
        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Update Markers
    useEffect(() => {
        const map = mapInstanceRef.current;
        const layer = markersLayerRef.current;
        if (!map || !layer) return;

        layer.clearLayers();

        if (restaurants.length > 0) {
            const points = [];
            restaurants.forEach(rest => {
                const icon = new L.Icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                const marker = L.marker([rest.lat, rest.lng], { icon })
                    .bindPopup(`
                        <div style="text-align:center">
                            <strong style="font-size:1.1em">${rest.name}</strong><br/>
                            <span style="color:#666;font-size:0.9em;cursor:pointer">點擊查看</span>
                        </div>
                    `);

                marker.on('click', () => onMarkerClick(rest.id));
                marker.addTo(layer);
                points.push([rest.lat, rest.lng]);
            });

            // Fit Bounds safely
            try {
                if (points.length > 0) {
                    const bounds = new L.LatLngBounds(points);
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
                    }
                }
            } catch (e) {
                console.warn("Bounds error", e);
            }
        }
    }, [restaurants, onMarkerClick]);

    return (
        <div
            ref={mapContainerRef}
            style={{ height: '300px', width: '100%', borderRadius: '12px', zIndex: 0 }}
        />
    );
}
