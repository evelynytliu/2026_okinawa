"use client";
import dynamic from 'next/dynamic';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Plane, Calendar, CreditCard, PlusCircle, PieChart, Hotel, Wallet, Sparkles, ClipboardList, MapPin, X, Utensils, Heart } from 'lucide-react';
import { TRIP_DETAILS, LOCATION_DETAILS } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

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
  const [daysLeft, setDaysLeft] = useState(0);
  const [featuredSpot, setFeaturedSpot] = useState(null);
  const [selectedRest, setSelectedRest] = useState(null);
  const scrollRefs = useRef({});

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
        <div className={styles.flightBadge}>
          <Plane size={24} style={{ transform: 'rotate(-45deg)' }} />
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
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Delicious Finds</h2>
          <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, letterSpacing: '0.05em' }}>沖繩必吃</span>
        </div>

        {/* Map Integration */}
        <div style={{ marginBottom: '1.5rem', padding: '0 0.5rem' }}>
          <RestaurantMap restaurants={RECOMMENDED_RESTAURANTS} onMarkerClick={handleMarkerClick} />
        </div>

        <div className={styles.scrollContainer}>
          {RECOMMENDED_RESTAURANTS.map(rest => (
            <div
              key={rest.id}
              className={styles.restCard}
              onClick={() => setSelectedRest(rest)}
              ref={el => scrollRefs.current[rest.id] = el}
            >
              <img src={rest.img_url} alt={rest.name} className={styles.restImage} />
              <div className={styles.restContent}>
                <h3 className={styles.restName}>{rest.name}</h3>
                <p className={styles.restIntro}>{rest.intro}</p>
                <div className={styles.restActions}>
                  <button className={styles.btnDetail}>查看詳情</button>
                  <button className={styles.btnWish} onClick={(e) => handleAddWish(e, rest)} title="加入許願池">
                    <Heart size={18} fill="white" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.bentoGrid}>
        {/* Primary Action: Add Expense (Tall - spans 2 rows in CSS if supported, or just distinct style) */}
        <Link href="/expenses/add" className={`${styles.bentoCard} ${styles.cardPrimary}`}>
          <div className={styles.cardIcon}>
            <PlusCircle size={40} color="white" />
          </div>
          <span className={styles.cardLabel}>記一筆</span>
        </Link>

        {/* Secondary Action: Itinerary (Dark) */}
        <Link href="/itinerary" className={`${styles.bentoCard} ${styles.cardAccent}`}>
          <div className={styles.cardIcon}>
            <Calendar size={32} color="var(--color-ink)" />
          </div>
          <span className={styles.cardLabel}>查看行程</span>
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

      {/* Restaurant Modal */}
      {selectedRest && (
        <div className={styles.modalOverlay} onClick={() => setSelectedRest(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedRest(null)}>
              <X size={20} color="#333" />
            </button>
            <img src={selectedRest.img_url} className={styles.modalImage} alt={selectedRest.name} />
            <div className={styles.modalBody}>
              <h3 className={styles.modalTitle}>{selectedRest.name}</h3>

              <div className={styles.modalSection}>
                <span className={styles.sectionLabel}>簡介</span>
                <p className={styles.modalText}>{selectedRest.intro}</p>
              </div>

              <div className={styles.modalSection}>
                <span className={styles.sectionLabel}>推薦餐點</span>
                <p className={styles.modalText} style={{ color: 'var(--color-coral)', fontWeight: 'bold' }}>
                  <Utensils size={14} style={{ display: 'inline', marginRight: 5 }} />
                  {selectedRest.dishes}
                </p>
              </div>

              <div className={styles.modalSection}>
                <span className={styles.sectionLabel}>地址</span>
                <p className={styles.modalText} style={{ fontSize: '0.9rem', color: '#666' }}>
                  {selectedRest.address}
                </p>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <a href={selectedRest.mapUrl} target="_blank" rel="noreferrer" className={styles.btnMap}>
                <MapPin size={16} /> 導航
              </a>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <Link href="/expenses/add" className={styles.fab}>
        <PlusCircle size={32} />
      </Link>
    </div>
  );
}
