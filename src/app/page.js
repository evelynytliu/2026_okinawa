"use client";
import dynamic from 'next/dynamic';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plane, Car, Calendar, CreditCard, Plus, PieChart, Hotel, Wallet, Sparkles, ClipboardList, MapPin, X, Utensils, Heart, Trash2, Edit, Loader2, Search } from 'lucide-react';
import { TRIP_DETAILS, LOCATION_DETAILS } from '@/lib/data';
import { fetchPlaceDetails } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';
import LocationModal from '@/components/LocationModal';


const RestaurantMap = dynamic(() => import('@/components/RestaurantMap'), { ssr: false, loading: () => <div style={{ height: 300, background: '#f0f0f0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>地圖載入中...</div> });

const RECOMMENDED_RESTAURANTS = [
  {
    id: 'rec_steak88',
    name: 'Steakhouse 88 (國際通)',
    intro: '【適合多人】沖繩經典老牌牛排館，擁有寬敞座位區，非常適合大家族聚餐。提供多樣化的牛排選擇與無限量沙拉吧，美式復古氛圍讓大人小孩都放鬆。',
    dishes: '特選沙朗牛排、菲力牛排、自助沙拉吧',
    address: '那覇市牧志3-1-6 勉強堂ビル2F',
    mapUrl: 'https://maps.google.com/?q=Steakhouse+88+Kokusai+Dori',
    img_url: '/images/steak_dinner.png',
    lat: 26.2154,
    lng: 127.6845,
    tag: '晚餐推薦'
  },
  {
    id: 'rec_mikado',
    name: 'Mikado (三笠松山店)',
    intro: '【24小時營業】在地人最愛的家庭式食堂，離那霸住宿點近。菜色豐富均一價且份量大，有苦瓜炒蛋、強棒飯等，非常適合隨時肚子餓的長輩與小孩。',
    dishes: '強棒飯 (Chanpon)、苦瓜炒蛋定食',
    address: '那覇市松山1-3-18',
    mapUrl: 'https://maps.google.com/?q=Mikado+Okinawa',
    img_url: '/images/okinawa_soba.png',
    lat: 26.2185,
    lng: 127.6805,
    tag: '宵夜/早餐'
  },
  {
    id: 'rec_agu_shabu',
    name: 'Agu Pork Shabu (溫野菜/其它)',
    intro: '【多人包廂】來到沖繩一定要吃阿古豬！涮涮鍋清淡健康，適合長輩口味；吃到飽模式則能讓年輕人滿足。建議預訂有包廂的店家。',
    dishes: '阿古豬涮涮鍋、島豆腐、海葡萄',
    address: '那覇/美國村周邊 (建議預約)',
    mapUrl: 'https://maps.google.com/?q=Okinawa+Shabu+Shabu',
    img_url: '/images/agu_pork.png',
    lat: 26.2120,
    lng: 127.6780,
    tag: '晚餐推薦'
  },
  {
    id: 'rec_yunangi',
    name: 'Yunangi (ゆうなんぎい)',
    intro: '【鄉土料理】國際通巷弄內的排隊名店，正宗且溫馨的沖繩家庭料理。推薦品嚐道地的苦瓜炒蛋與入口即化的紅燒肉，很有在當地人家吃飯的感覺。',
    dishes: '苦瓜炒蛋、沖繩紅燒肉 (Rafute)、墨魚汁湯',
    address: '那覇市松山1-3-18 (附近)', // Using generic or keep original address
    // Re-using original address: 那覇市久茂地3-3-3
    address: '那覇市久茂地3-3-3',
    mapUrl: 'https://maps.google.com/?q=Yunangi+Okinawa',
    img_url: '/images/okinawa_soba.png',
    lat: 26.2144,
    lng: 127.6811,
    tag: '晚餐推薦'
  },
  {
    id: 'rec_kijimuna',
    name: 'Taco Rice Cafe Kijimuna',
    intro: '【親子友善】美國村午餐首選。滑嫩歐姆蛋鋪在塔可飯上，口味溫和，小朋友也能開心享用。位於美國村中心，方便逛街前後用餐。',
    dishes: '歐姆蛋塔可飯 (Omutaco)、甘口兒童餐',
    address: '北谷町美浜9-1 Depot Island Building C 2F',
    mapUrl: 'https://maps.google.com/?q=Taco+Rice+Cafe+Kijimunaa',
    img_url: '/images/taco_rice.png',
    lat: 26.3170,
    lng: 127.7570,
    tag: '午餐推薦'
  },
  {
    id: 'rec_yakiniku',
    name: 'Yakiniku King (燒肉王)',
    intro: '【吃到飽首選】日本連鎖高品質燒肉吃到飽，座位寬敞，有點餐平板(多語言)。種類多樣含熟食與甜點，絕對能滿足5~60歲的所有胃口。',
    dishes: '牛五花、橫膈膜、石鍋拌飯',
    address: '宜野灣/北谷/那霸皆有分店',
    mapUrl: 'https://maps.google.com/?q=Yakiniku+King+Okinawa',
    img_url: '/images/yakiniku.png',
    lat: 26.2750,
    lng: 127.7350,
    tag: '晚餐推薦'
  },
  {
    id: 'rec_posillipo',
    name: 'POSILLIPO (瀨長島)',
    intro: '【海景餐廳】位於瀨長島制高點的義大利餐廳，擁有絕美海景露台。提供現烤披薩與義大利麵，空間寬敞舒適，是欣賞飛機起降與夕陽的最佳位置，非常適合團體用餐。',
    dishes: '瑪格麗特披薩、海鮮義大利麵',
    address: '豊見城市瀬長174-5',
    mapUrl: 'https://maps.google.com/?q=POSILLIPO+cucina+meridionale',
    img_url: '/images/posillipo.png',
    lat: 26.1761,
    lng: 127.6432,
    tag: '景觀餐廳'
  },
  {
    id: 'rec_pizzain',
    name: 'Pizza In (美式披薩)',
    intro: '【美式吃到飽】位於中部（近知花住宿）的美式披薩自助餐。充滿濃濃美國風情，提供多種口味披薩、義大利麵、沙拉吧與飲料喝到飽，CP值高且氣氛歡樂。',
    dishes: '美式披薩、塔可飯、自助沙拉',
    address: '沖縄県北谷町砂辺368 (或各分店)',
    mapUrl: 'https://maps.google.com/?q=Pizza+In+Okinawa',
    img_url: '/images/pizzain.png',
    lat: 26.3280,
    lng: 127.7440,
    tag: '住宿周邊'
  },
  {
    id: 'rec_blueseal',
    name: 'Blue Seal Ice Cream',
    intro: '【甜點時刻】沖繩必吃冰淇淋！推薦在美國村或國際通逛累了來一支。清爽的甘蔗口味或濃郁的紅芋口味，是老少咸宜的休息站。',
    dishes: '紅芋冰淇淋、鹽金楚糕冰淇淋',
    address: '沖繩各地',
    mapUrl: 'https://maps.google.com/?q=Blue+Seal+Ice+Cream',
    img_url: '/images/blue_seal.png',
    lat: 26.2647,
    lng: 127.7028,
    tag: '點心推薦'
  }
];

export default function Dashboard() {
  const router = useRouter();
  const [daysLeft, setDaysLeft] = useState(0);
  const [featuredSpot, setFeaturedSpot] = useState(null);
  const [selectedRest, setSelectedRest] = useState(null);
  const scrollRefs = useRef({});

  // --- NEW: Restaurant Management ---
  const [dbRestaurants, setDbRestaurants] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRestName, setNewRestName] = useState('');
  const [adding, setAdding] = useState(false);
  const [hiddenRecIds, setHiddenRecIds] = useState([]);

  useEffect(() => {
    // Load hidden recommendation IDs from localStorage
    const saved = localStorage.getItem('hidden_recommendations');
    if (saved) setHiddenRecIds(JSON.parse(saved));
    fetchDbRestaurants();
  }, []);

  const fetchDbRestaurants = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('locations')
        .select('*')
        .in('type', ['food', 'restaurant', 'cafe', 'bar', 'dessert']);

      if (data) {
        const mapped = data.map(d => ({
          id: d.id,
          name: d.name,
          intro: d.details || '暫無介紹',
          dishes: '',
          address: d.address || '',
          mapUrl: `https://maps.google.com/?q=${encodeURIComponent(d.name)}`,
          img_url: d.img_url || '/images/food_placeholder.jpg',
          lat: d.lat || 26.2124,
          lng: d.lng || 127.6809,
          tag: '我的收藏',
          isDb: true
        }));
        setDbRestaurants(mapped);
      }
    } catch (e) { console.error("Fetch restaurants error", e); }
  };

  useEffect(() => { fetchDbRestaurants(); }, []);

  const allRestaurants = [
    ...RECOMMENDED_RESTAURANTS.filter(r => !hiddenRecIds.includes(r.id)),
    ...dbRestaurants
  ];

  const handleEditRestaurant = async (e, rest) => {
    e.stopPropagation();
    if (!rest.isDb) {
      // Migrate to DB before editing
      if (!confirm(`要開始編輯「${rest.name}」嗎？這會將其轉為您的自訂地點。`)) return;
      try {
        const { error } = await supabase.from('locations').upsert({
          id: rest.id, // Keep the same ID or generate new? Use same for rec_
          name: rest.name,
          address: rest.address,
          details: rest.intro,
          img_url: rest.img_url,
          type: 'food',
          lat: rest.lat,
          lng: rest.lng
        });
        if (error) throw error;
        // After migrating, hide the static version
        const newHidden = [...hiddenRecIds, rest.id];
        setHiddenRecIds(newHidden);
        localStorage.setItem('hidden_recommendations', JSON.stringify(newHidden));
        fetchDbRestaurants(); // Reload DB list
        router.push(`/itinerary/edit/${rest.id}`);
      } catch (err) {
        alert("初始化編輯失敗：" + err.message);
      }
    } else {
      router.push(`/itinerary/edit/${rest.id}`);
    }
  };

  const handleAddRestaurant = async () => {
    if (!newRestName.trim()) return alert("請輸入餐廳名稱");

    setAdding(true);
    try {
      const key = localStorage.getItem('gemini_api_key');
      const aiData = await fetchPlaceDetails(newRestName, key);

      if (aiData?.error) throw new Error(aiData.error);

      let insertData = {
        id: crypto.randomUUID(),
        name: newRestName,
        type: 'food',
        details: aiData?.details || '',
        address: aiData?.address || '',
        lat: aiData?.lat || null,
        lng: aiData?.lng || null,
        img_url: aiData?.image_url || null
      };
      if (aiData?.found) {
        // Use AI details
      }

      const { error } = await supabase.from('locations').insert([insertData]);
      if (error) {
        // Fallback: if lat/lng missing column error, try without
        if (error.message.includes('lat')) {
          delete insertData.lat;
          delete insertData.lng;
          const { error: err2 } = await supabase.from('locations').insert([insertData]);
          if (err2) throw err2;
        } else {
          throw error;
        }
      }

      alert("餐廳已新增！");
      setShowAddModal(false);
      setNewRestName('');
      fetchDbRestaurants();
    } catch (e) {
      console.error(e);
      alert("新增失敗: " + e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteRestaurant = async (e, id) => {
    e.stopPropagation();
    if (!confirm("確定要刪除此餐廳嗎？無法復原。")) return;

    if (id.startsWith('rec_')) {
      // It's a static recommendation, just hide it
      const newHidden = [...hiddenRecIds, id];
      setHiddenRecIds(newHidden);
      localStorage.setItem('hidden_recommendations', JSON.stringify(newHidden));
      alert("已移除推薦餐廳。您可以隨時重新整理回復原始狀態。");
    } else {
      try {
        const { error } = await supabase.from('locations').delete().eq('id', id);
        if (error) throw error;
        fetchDbRestaurants();
      } catch (e) {
        alert("刪除失敗: " + e.message);
      }
    }
  };

  useEffect(() => {
    // 1. Calculate Days Left
    const today = new Date();
    const start = new Date(TRIP_DETAILS.dates.start);
    const diffTime = start - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysLeft(diffDays > 0 ? diffDays : 0);

    // 2. Randomly select a featured spot (DB -> Static Fallback)
    const fetchFeatured = async () => {
      let found = false;

      // Try DB first (Supports Demo Mode & Real DB updates)
      if (supabase) {
        try {
          const { data } = await supabase.from('locations').select('*');
          if (data && data.length > 0) {
            const valid = data.filter(s => s.img_url);
            if (valid.length > 0) {
              const random = valid[Math.floor(Math.random() * valid.length)];
              setFeaturedSpot(random);
              found = true;
            }
          }
        } catch (e) {
          console.error("Featured fetch failed", e);
        }
      }

      // Fallback to static data if no DB result
      if (!found) {
        const spots = Object.entries(LOCATION_DETAILS).filter(([key, s]) => s.img_url);
        if (spots.length > 0) {
          const [id, data] = spots[Math.floor(Math.random() * spots.length)];
          setFeaturedSpot({ ...data, id });
        }
      }
    };
    fetchFeatured();
  }, []);

  const handleAddWish = async (e, rest) => {
    e.stopPropagation();
    if (!confirm(`想把「${rest.name}」加入心願清單嗎？`)) return;

    if (!supabase) {
      alert("展示模式無法儲存");
      return;
    }

    try {
      const { error } = await supabase
        .from('locations')
        .insert({
          id: crypto.randomUUID(),
          name: rest.name,
          details: `[推薦餐廳]\n${rest.intro}\n\n必點：${rest.dishes}\n\n地址：${rest.address}\n地圖：${rest.mapUrl}`,
          address: rest.address,
          img_url: rest.img_url // Also save the image!
        });
      if (error) throw error;
      alert("已加入許願池！");
    } catch (err) {
      alert("加入失敗：" + err.message);
    }
  };

  const handleMarkerClick = (id) => {
    const el = scrollRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      // Highlight effect?
      el.classList.add(styles.highlightCard);
      setTimeout(() => el.classList.remove(styles.highlightCard), 2000);
    }
  };

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={`${styles.titleMain} fade-in`}>
          {String(process.env.NEXT_PUBLIC_DEMO_MODE).toLowerCase() === 'true' ? "Mushroom" : "Okinawa"}
        </h1>
        <span className={`${styles.titleYear} fade-in`}>
          {String(process.env.NEXT_PUBLIC_DEMO_MODE).toLowerCase() === 'true' ? "Kingdom" : "2026"}
        </span>
        <p className={`${styles.subtitle} fade-in`}>
          {String(process.env.NEXT_PUBLIC_DEMO_MODE).toLowerCase() === 'true'
            ? "Super Mario Trip • 2026.02.04"
            : `Family Trip • ${TRIP_DETAILS.dates.start.replace(/-/g, '.')}`}
        </p>
      </header>

      <Link href="/flights" className={`${styles.heroCard} fade-in`}>
        <div className={styles.countdownBlock}>
          <span className={styles.daysBig}>{daysLeft}</span>
          <span className={styles.daysLabel}>DAYS TO GO</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
          <div className={styles.flightBadge}>
            <Plane size={20} style={{ transform: 'rotate(-45deg)' }} />
            <Car size={20} />
          </div>
          <span style={{
            fontSize: '0.7rem',
            color: '#64748b',
            fontWeight: 600,
            letterSpacing: '0.5px'
          }}>交通資訊</span>
        </div>
      </Link>

      {featuredSpot && (
        <Link href={`/itinerary?loc=${featuredSpot.id}`} className={styles.featuredLink}>
          <div
            className={`${styles.featuredCard} fade-in`}
            style={{ backgroundImage: `url(${featuredSpot.img_url})` }}
          >
            <div className={styles.featuredOverlay} />
            <div className={styles.featuredContent}>
              <span className={styles.spotlightTag}>Spotlight</span>
              <h3 className={styles.featuredTitle}>{featuredSpot.name}</h3>
              <p className={styles.featuredDetail}>{featuredSpot.details}</p>
            </div>
          </div>
        </Link>
      )}



      {/* Recommended Restaurants Section */}
      <section className={`${styles.restaurantSection} fade-in`}>
        {/* Section Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0 0.5rem'
        }}>
          {/* Title - Left */}
          <div style={{ position: 'relative', paddingLeft: '0.5rem' }}>
            {/* Decorative colored bar */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: '5px',
              bottom: '5px',
              width: '4px',
              background: 'linear-gradient(to bottom, var(--color-gold), var(--color-orange))',
              borderRadius: '2px'
            }} />

            <h2 style={{
              margin: 0,
              fontSize: '1.8rem',
              fontWeight: 800,
              color: 'var(--color-ink, #1a1a2e)',
              fontFamily: 'var(--font-serif)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              Delicious
              <span style={{ color: 'var(--color-coral)', fontStyle: 'italic' }}>Finds</span>
            </h2>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '4px'
            }}>
              <span style={{
                fontSize: '0.75rem',
                color: 'white',
                background: '#444',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}>MUST EAT</span>
              <span style={{
                fontSize: '0.85rem',
                color: '#666',
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}>沖繩在地美食選</span>
            </div>
          </div>

          {/* Buttons - Right */}
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            <Link
              href="/nearby"
              style={{
                background: 'var(--color-sea-blue, #006994)',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 8px rgba(0, 105, 148, 0.3)',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
            >
              <MapPin size={15} /> 附近
            </Link>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                background: 'var(--color-orange, #f97316)',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              <Plus size={15} /> 新增
            </button>
          </div>
        </div>

        {/* Map Integration */}
        <div style={{ marginBottom: '1.5rem', padding: '0 0.5rem' }}>
          <RestaurantMap restaurants={allRestaurants} onMarkerClick={handleMarkerClick} />
        </div>

        <div className={styles.scrollContainer}>
          {allRestaurants.map(rest => (
            <div
              key={rest.id}
              className={styles.restCard}
              onClick={() => setSelectedRest(rest)}
              ref={el => scrollRefs.current[rest.id] = el}
              style={rest.isDb ? { border: '2px solid var(--color-orange, #f97316)' } : {}}
            >
              <img src={rest.img_url || '/images/taco_rice.png'} alt={rest.name} className={styles.restImage}
                onError={(e) => e.target.src = '/images/taco_rice.png'} />
              <div className={styles.restContent}>
                <h3 className={styles.restName}>
                  {rest.name}
                  {rest.isDb && <span style={{ fontSize: '0.6rem', background: '#ffe0b2', color: '#e65100', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>自訂</span>}
                </h3>
                <p className={styles.restIntro}>{rest.intro}</p>
                <div className={styles.restActions}>
                  <button className={styles.btnDetail}>查看</button>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={(e) => handleEditRestaurant(e, rest)} style={{ background: 'none', border: 'none', color: '#666', padding: '4px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <Edit size={18} />
                    </button>
                    <button onClick={(e) => handleDeleteRestaurant(e, rest.id)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={18} />
                    </button>
                    <button className={styles.btnWish} onClick={(e) => handleAddWish(e, rest)} title="加入許願池">
                      <Heart size={18} fill="white" stroke="white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Add Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '350px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className={styles.modalTitle} style={{ margin: 0 }}>新增餐廳</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ margin: '1rem 0' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#555' }}>餐廳名稱</label>
              <input
                value={newRestName}
                onChange={e => setNewRestName(e.target.value)}
                placeholder="例如：暖暮拉麵"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                autoFocus
              />
            </div>
            <button
              onClick={handleAddRestaurant}
              disabled={adding}
              style={{
                width: '100%', padding: '0.8rem', background: 'var(--color-orange, #f97316)',
                color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold',
                opacity: adding ? 0.7 : 1, cursor: adding ? 'not-allowed' : 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                marginTop: '1.5rem', boxShadow: '0 4px 10px rgba(249, 115, 22, 0.3)'
              }}
            >
              {adding ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
              {adding ? 'AI 分析生成中...' : '使用 AI 自動新增'}
            </button>
          </div>
        </div>
      )}

      <div className={styles.bentoGrid}>
        {/* Secondary Action: Itinerary (Dark) - Promoted to first position */}
        <Link href="/itinerary" className={`${styles.bentoCard} ${styles.cardAccent}`}>
          <div className={styles.cardIcon}>
            <Calendar size={32} color="var(--color-ink)" />
          </div>
          <span className={styles.cardLabel}>查看行程</span>
        </Link>

        <Link href="/notes" className={styles.bentoCard}>
          <ClipboardList size={28} className={styles.cardIcon} color="#3b82f6" />
          <span className={styles.cardLabel}>圖文筆記</span>
        </Link>

        <Link href="/expenses" className={styles.bentoCard}>
          <CreditCard size={28} className={styles.cardIcon} color="var(--color-gold)" />
          <span className={styles.cardLabel}>消費明細</span>
        </Link>

        <Link href="/analysis" className={styles.bentoCard}>
          <PieChart size={28} className={styles.cardIcon} color="var(--color-teal)" />
          <span className={styles.cardLabel}>支出統計</span>
        </Link>

        <Link href="/settlement" className={styles.bentoCard}>
          <Wallet size={28} className={styles.cardIcon} color="var(--color-gold)" />
          <span className={styles.cardLabel}>待結清款</span>
        </Link>

        <Link href="/accommodation" className={styles.bentoCard}>
          <Hotel size={28} className={styles.cardIcon} color="var(--color-gold)" />
          <span className={styles.cardLabel}>房間分配</span>
        </Link>

        <Link href="/checklist" className={styles.bentoCard}>
          <ClipboardList size={28} className={styles.cardIcon} color="#6366f1" />
          <span className={styles.cardLabel}>待辦與行李</span>
        </Link>

        <Link href="/wishes" className={styles.bentoCard}>
          <Sparkles size={28} className={styles.cardIcon} color="#ec4899" />
          <span className={styles.cardLabel}>許願池</span>
        </Link>
      </div>

      {/* Restaurant Modal - Using Reusable Component */}
      {selectedRest && (
        <LocationModal
          location={selectedRest}
          onClose={() => setSelectedRest(null)}
          onAddWish={handleAddWish}
          showEditButton={selectedRest.isCustom}
        />
      )}

      {/* FAB */}
      <Link href="/expenses/add" className={styles.fab} style={{
        bottom: '130px',
        zIndex: selectedRest ? 900 : 2147483647,
        width: '68px',
        height: '68px',
        borderRadius: '50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        gap: '0px'
      }}>
        <Plus size={32} strokeWidth={2.5} />
        <span style={{ fontSize: '11px', lineHeight: 1 }}>記帳</span>
      </Link>
    </div>
  );
}
