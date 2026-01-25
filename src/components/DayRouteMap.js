'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * DayRouteMap - Shows the daily travel route with markers and polyline
 * 
 * Props:
 * @param {Array} locations - Array of locations with lat/lng
 * @param {string} dayLabel - Label for the day (e.g., "Day 1")
 */
export default function DayRouteMap({ locations, dayLabel }) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Filter locations with valid coordinates
        const validLocations = locations.filter(loc =>
            loc.lat && loc.lng &&
            !isNaN(parseFloat(loc.lat)) &&
            !isNaN(parseFloat(loc.lng))
        );

        if (validLocations.length === 0) return;

        // Cleanup previous map
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        // Fix Leaflet icons
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Calculate center
        const lats = validLocations.map(l => parseFloat(l.lat));
        const lngs = validLocations.map(l => parseFloat(l.lng));
        const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

        // Create map
        const map = L.map(mapContainerRef.current, {
            center: [centerLat, centerLng],
            zoom: 12,
            scrollWheelZoom: false,
            zoomControl: true,
        });

        // Add tile layer (use a nice style)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Custom numbered marker icon
        const createNumberedIcon = (number, isFirst, isLast) => {
            let bgColor = '#3b82f6'; // blue
            if (isFirst) bgColor = '#22c55e'; // green for start
            if (isLast) bgColor = '#ef4444'; // red for end

            return L.divIcon({
                className: 'custom-numbered-marker',
                html: `
                    <div style="
                        background: ${bgColor};
                        color: white;
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 12px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        border: 2px solid white;
                    ">${number}</div>
                `,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
                popupAnchor: [0, -14]
            });
        };

        // Add markers
        const points = [];
        validLocations.forEach((loc, index) => {
            const latLng = [parseFloat(loc.lat), parseFloat(loc.lng)];
            points.push(latLng);

            const isFirst = index === 0;
            const isLast = index === validLocations.length - 1;
            const icon = createNumberedIcon(index + 1, isFirst, isLast);

            L.marker(latLng, { icon })
                .bindPopup(`
                    <div style="text-align: center; min-width: 120px;">
                        <strong style="font-size: 14px;">${loc.name}</strong>
                        ${loc.note ? `<br><span style="font-size: 12px; color: #666;">${loc.note}</span>` : ''}
                    </div>
                `)
                .addTo(map);
        });

        // Draw route polyline
        if (points.length > 1) {
            L.polyline(points, {
                color: '#3b82f6',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 10',
                lineCap: 'round'
            }).addTo(map);
        }

        // Fit bounds
        if (points.length > 0) {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }

        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [locations]);

    // Check if we have any valid locations
    const hasValidLocations = locations.some(loc =>
        loc.lat && loc.lng &&
        !isNaN(parseFloat(loc.lat)) &&
        !isNaN(parseFloat(loc.lng))
    );

    if (!hasValidLocations) {
        return (
            <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#888',
                background: '#f9f9f9',
                borderRadius: '12px',
                fontSize: '0.9rem'
            }}>
                此日程尚無座標資料
            </div>
        );
    }

    return (
        <div
            ref={mapContainerRef}
            style={{
                height: '280px',
                width: '100%',
                borderRadius: '12px',
                overflow: 'hidden',
            }}
        />
    );
}
