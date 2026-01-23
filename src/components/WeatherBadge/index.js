import React from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, CloudDrizzle, CloudFog, CloudSun, Snowflake } from 'lucide-react';
import styles from './WeatherBadge.module.css';

const WeatherBadge = ({ code, maxTemp, minTemp }) => {
    const getWeatherIcon = (code) => {
        if (code === undefined || code === null) return <Cloud size={16} />;
        if (code === 0) return <Sun size={16} className={styles.sun} />;
        if (code >= 1 && code <= 3) return <CloudSun size={16} className={styles.cloudSun} />;
        if (code === 45 || code === 48) return <CloudFog size={16} className={styles.fog} />;
        if (code >= 51 && code <= 55) return <CloudDrizzle size={16} className={styles.rain} />;
        if (code >= 61 && code <= 65) return <CloudRain size={16} className={styles.rain} />;
        if (code >= 71 && code <= 75) return <Snowflake size={16} className={styles.snow} />;
        if (code >= 80 && code <= 82) return <CloudRain size={16} className={styles.rain} />;
        if (code >= 95) return <CloudLightning size={16} className={styles.lightning} />;
        return <Cloud size={16} />;
    };

    const getWeatherText = (code) => {
        if (code === 0) return '晴';
        if (code >= 1 && code <= 3) return '多雲';
        if (code >= 45 && code <= 48) return '霧';
        if (code >= 51 && code <= 55) return '毛毛雨';
        if (code >= 61 && code <= 65) return '雨';
        if (code >= 80 && code <= 82) return '陣雨';
        if (code >= 95) return '雷雨';
        return '陰';
    };

    return (
        <div className={styles.badge}>
            <div className={styles.iconWrapper}>
                {getWeatherIcon(code)}
            </div>
            <div className={styles.info}>
                <span className={styles.temp}>{maxTemp}° / {minTemp}°</span>
                <span className={styles.desc}>{getWeatherText(code)}</span>
            </div>
        </div>
    );
};

export default WeatherBadge;
