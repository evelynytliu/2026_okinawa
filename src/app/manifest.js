export default function manifest() {
    return {
        name: 'Okinawa 2026',
        short_name: 'Okinawa',
        description: 'Trip Dashboard for Okinawa 2026',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#4DD0E1',
        icons: [
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'maskable'
            },
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml'
            }
        ],
    }
}
