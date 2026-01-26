"use client";
import { useState } from 'react';
import { MapPin, Loader2, Navigation, CreditCard, Banknote, Store, ArrowLeft, Sparkles, ExternalLink, Star, Car, Footprints, Search, MapPinned } from 'lucide-react';
import Link from 'next/link';
import { callGemini } from '@/lib/gemini';
import styles from './page.module.css';

// 預設沖繩熱門地點
const PRESET_LOCATIONS = [
    { name: '那霸國際通', lat: 26.2154, lng: 127.6847 },
    { name: '美國村', lat: 26.3231, lng: 127.7585 },
    { name: '萬座毛', lat: 26.5044, lng: 127.8518 },
    { name: '名護市區', lat: 26.5918, lng: 127.9773 },
    { name: '恩納村', lat: 26.4975, lng: 127.8530 },
    { name: '瀨長島', lat: 26.1778, lng: 127.6514 },
    { name: '首里城公園', lat: 26.2170, lng: 127.7195 },
    { name: '古宇利島', lat: 26.6941, lng: 128.0265 },
];

export default function NearbyPage() {
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [location, setLocation] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [error, setError] = useState(null);
    const [transportMode, setTransportMode] = useState('walking'); // 'walking' or 'driving'
    const [locationMode, setLocationMode] = useState('gps'); // 'gps' or 'custom'
    const [customInput, setCustomInput] = useState('');
    const [showPresets, setShowPresets] = useState(false);

    const getLocation = () => {
        if (!navigator.geolocation) {
            setError("您的瀏覽器不支援定位功能");
            return;
        }

        setLocating(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    name: '目前位置'
                });
                setLocating(false);
            },
            (err) => {
                setError("無法取得位置：" + err.message);
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const selectPresetLocation = (preset) => {
        setLocation({
            lat: preset.lat,
            lng: preset.lng,
            name: preset.name
        });
        setShowPresets(false);
        setCustomInput(preset.name);
    };

    const handleCustomSearch = async () => {
        if (!customInput.trim()) {
            setError("請輸入地點名稱或座標");
            return;
        }

        // Check if input is coordinates (e.g., "26.2154, 127.6847")
        const coordMatch = customInput.match(/^([\d.]+)\s*[,，]\s*([\d.]+)$/);
        if (coordMatch) {
            const lat = parseFloat(coordMatch[1]);
            const lng = parseFloat(coordMatch[2]);
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                setLocation({ lat, lng, name: `座標 (${lat.toFixed(4)}, ${lng.toFixed(4)})` });
                setError(null);
                return;
            }
        }

        // Use Gemini to get coordinates for the location name
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            setError("請先到設定頁面輸入 Gemini API Key");
            return;
        }

        setLocating(true);
        setError(null);

        try {
            const prompt = `請提供「${customInput}」這個地點的經緯度座標。如果是沖繩的地點，請提供精確座標。回覆格式必須是純 JSON（不要 Markdown）：{"lat": 26.xxxx, "lng": 127.xxxx, "name": "地點名稱"}`;

            const result = await callGemini(prompt, apiKey);

            if (result.error) throw new Error(result.error);

            const jsonMatch = result.text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                setLocation({
                    lat: parsed.lat,
                    lng: parsed.lng,
                    name: parsed.name || customInput
                });
            } else {
                throw new Error("無法解析地點座標");
            }
        } catch (err) {
            setError("查詢地點失敗：" + err.message);
        } finally {
            setLocating(false);
        }
    };

    const fetchRecommendations = async () => {
        if (!location) {
            setError("請先取得或選擇位置");
            return;
        }

        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            setError("請先到設定頁面輸入 Gemini API Key");
            return;
        }

        setLoading(true);
        setError(null);
        setRecommendations([]);

        const distanceHint = transportMode === 'walking'
            ? '步行可達範圍內（約1公里以內）的餐廳'
            : '開車15分鐘內可達範圍的餐廳';

        const prompt = `
你是沖繩當地的美食顧問。使用者目前位於沖繩附近 (緯度: ${location.lat}, 經度: ${location.lng})。

請推薦 5 間${distanceHint}，適合 16 人家庭聚餐（包含 5~60 歲成員）的餐廳。

回傳格式必須是純 JSON 陣列 (不要有任何 Markdown 標記)：
[
  {
    "name": "餐廳名稱 (日文/中文皆可)",
    "type": "類型 (如: 日式料理、燒肉、沖繩料理等)",
    "distance": "距離估計 (如: 約500m 或 約2km)",
    "google_rating": 4.2,
    "accepts_card": true/false,
    "avg_price": "人均消費 (如: ¥1500~2500 或 TWD 400~600)",
    "description": "30字以內簡短描述，包含特色或推薦原因",
    "map_query": "Google Maps 搜尋關鍵字"
  }
]

注意：
1. google_rating 欄位請填入該餐廳在 Google Maps 上的預估評分 (1.0~5.0 之間的數字，如 4.3)
2. 優先推薦適合多人的餐廳（有包廂、座位多）
3. 包含至少一間可刷卡的選項
4. 價位要有高中低的選擇
5. ${transportMode === 'walking' ? '只推薦步行距離內的餐廳' : '可推薦需要開車前往的餐廳'}
6. 如果該座標不在沖繩，請推薦沖繩本島熱門餐廳並標註
        `;

        try {
            const result = await callGemini(prompt, apiKey);

            if (result.error) {
                throw new Error(result.error);
            }

            // Parse JSON from response
            const jsonMatch = result.text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                setRecommendations(parsed);
                console.log(`✨ 使用模型: ${result.modelUsed}`);
            } else {
                throw new Error("AI 回應格式錯誤");
            }
        } catch (err) {
            console.error(err);
            setError("取得推薦失敗：" + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn}>
                    <ArrowLeft size={20} />
                </Link>
                <h1 className={styles.title}>附近推薦</h1>
            </header>

            {/* Location Mode Toggle */}
            <div className={styles.modeToggle}>
                <button
                    className={`${styles.modeBtn} ${locationMode === 'gps' ? styles.modeActive : ''}`}
                    onClick={() => setLocationMode('gps')}
                >
                    <Navigation size={16} />
                    目前位置
                </button>
                <button
                    className={`${styles.modeBtn} ${locationMode === 'custom' ? styles.modeActive : ''}`}
                    onClick={() => setLocationMode('custom')}
                >
                    <MapPinned size={16} />
                    自訂地點
                </button>
            </div>

            {/* GPS Location Section */}
            {locationMode === 'gps' && (
                <div className={styles.locationCard}>
                    <div className={styles.locationInfo}>
                        <MapPin size={24} color="var(--color-coral)" />
                        {location && location.name === '目前位置' ? (
                            <div>
                                <p className={styles.locationLabel}>目前位置</p>
                                <p className={styles.locationCoords}>{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
                            </div>
                        ) : (
                            <p className={styles.locationLabel}>尚未取得 GPS 位置</p>
                        )}
                    </div>
                    <button onClick={getLocation} disabled={locating} className={styles.locateBtn}>
                        {locating ? <Loader2 className="animate-spin" size={18} /> : <Navigation size={18} />}
                        {locating ? '定位中...' : '取得位置'}
                    </button>
                </div>
            )}

            {/* Custom Location Section */}
            {locationMode === 'custom' && (
                <div className={styles.customLocationCard}>
                    <div className={styles.customInputRow}>
                        <input
                            type="text"
                            className={styles.customInput}
                            placeholder="輸入地點名稱或座標 (如: 美國村 或 26.32, 127.75)"
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
                        />
                        <button onClick={handleCustomSearch} disabled={locating} className={styles.searchLocationBtn}>
                            {locating ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                        </button>
                    </div>

                    {/* Preset Locations */}
                    <div className={styles.presetSection}>
                        <button
                            className={styles.presetToggle}
                            onClick={() => setShowPresets(!showPresets)}
                        >
                            📍 快速選擇沖繩熱門地點 {showPresets ? '▲' : '▼'}
                        </button>
                        {showPresets && (
                            <div className={styles.presetGrid}>
                                {PRESET_LOCATIONS.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        className={styles.presetBtn}
                                        onClick={() => selectPresetLocation(preset)}
                                    >
                                        {preset.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Show selected location */}
                    {location && location.name !== '目前位置' && (
                        <div className={styles.selectedLocation}>
                            <MapPin size={16} color="var(--color-sea-blue)" />
                            <span>{location.name}</span>
                            <span className={styles.locationCoords}>({location.lat.toFixed(4)}, {location.lng.toFixed(4)})</span>
                        </div>
                    )}
                </div>
            )}

            {/* Transport Mode Selector */}
            <div className={styles.transportToggle}>
                <button
                    className={`${styles.transportBtn} ${transportMode === 'walking' ? styles.transportActive : ''}`}
                    onClick={() => setTransportMode('walking')}
                >
                    <Footprints size={18} />
                    走路可到
                </button>
                <button
                    className={`${styles.transportBtn} ${transportMode === 'driving' ? styles.transportActive : ''}`}
                    onClick={() => setTransportMode('driving')}
                >
                    <Car size={18} />
                    開車可到
                </button>
            </div>

            {/* Action Button */}
            <button
                onClick={fetchRecommendations}
                disabled={loading || !location}
                className={styles.searchBtn}
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                {loading ? 'AI 搜尋中...' : `智能推薦${transportMode === 'walking' ? '步行範圍' : '開車範圍'}餐廳`}
            </button>

            {/* Error Display */}
            {error && (
                <div className={styles.errorBox}>
                    {error}
                </div>
            )}

            {/* Results */}
            <div className={styles.results}>
                {recommendations.map((rec, idx) => (
                    <div key={idx} className={styles.recCard}>
                        <div className={styles.recHeader}>
                            <Store size={20} color="var(--color-gold)" />
                            <div className={styles.recHeaderInfo}>
                                <h3 className={styles.recName}>{rec.name}</h3>
                                <div className={styles.recSubHeader}>
                                    <span className={styles.recType}>{rec.type}</span>
                                    {rec.google_rating && (
                                        <span className={styles.ratingBadge}>
                                            <Star size={12} fill="#facc15" color="#facc15" />
                                            {rec.google_rating.toFixed(1)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <p className={styles.recDesc}>{rec.description}</p>

                        <div className={styles.recMeta}>
                            <span className={styles.metaItem}>
                                <MapPin size={14} /> {rec.distance}
                            </span>
                            <span className={`${styles.metaItem} ${rec.accepts_card ? styles.cardYes : styles.cardNo}`}>
                                <CreditCard size={14} /> {rec.accepts_card ? '可刷卡' : '僅現金'}
                            </span>
                            <span className={styles.metaItem}>
                                <Banknote size={14} /> {rec.avg_price}
                            </span>
                        </div>

                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rec.map_query || rec.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.mapLink}
                        >
                            <ExternalLink size={14} /> 在 Google Maps 開啟
                        </a>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {!loading && recommendations.length === 0 && !error && (
                <div className={styles.emptyState}>
                    <MapPin size={48} color="#ddd" />
                    <p>按下「智能推薦」，AI 會根據您的位置推薦適合的餐廳</p>
                </div>
            )}
        </div>
    );
}
