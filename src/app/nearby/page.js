"use client";
import { useState } from 'react';
import { MapPin, Loader2, Navigation, CreditCard, Banknote, Store, ArrowLeft, Sparkles, ExternalLink, Star, Car, Footprints } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

export default function NearbyPage() {
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [location, setLocation] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [error, setError] = useState(null);
    const [transportMode, setTransportMode] = useState('walking'); // 'walking' or 'driving'

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
                    lng: position.coords.longitude
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

    const fetchRecommendations = async () => {
        if (!location) {
            setError("請先取得您的位置");
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
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || `API Error ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Parse JSON from response
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                setRecommendations(parsed);
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

            {/* Location Section */}
            <div className={styles.locationCard}>
                <div className={styles.locationInfo}>
                    <MapPin size={24} color="var(--color-coral)" />
                    {location ? (
                        <div>
                            <p className={styles.locationLabel}>目前位置</p>
                            <p className={styles.locationCoords}>{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
                        </div>
                    ) : (
                        <p className={styles.locationLabel}>尚未取得位置</p>
                    )}
                </div>
                <button onClick={getLocation} disabled={locating} className={styles.locateBtn}>
                    {locating ? <Loader2 className="animate-spin" size={18} /> : <Navigation size={18} />}
                    {locating ? '定位中...' : '取得位置'}
                </button>
            </div>

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
