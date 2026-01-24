export const fetchOkinawaWeather = async () => {
    try {
        // Okinawa Naha Coordinates
        const lat = 26.2124;
        const lon = 127.6809;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo&forecast_days=16`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.daily) return null;

        // Map data to a more usable format: { "2026-02-04": { code, max, min }, ... }
        const weatherMap = {};
        data.daily.time.forEach((date, index) => {
            weatherMap[date] = {
                code: data.daily.weather_code[index],
                max: Math.round(data.daily.temperature_2m_max[index]),
                min: Math.round(data.daily.temperature_2m_min[index])
            };
        });

        return weatherMap;
    } catch (error) {
        console.error('Failed to fetch weather:', error);
        return null;
    }
};
