
"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plane, Calendar, CreditCard, PlusCircle, PieChart, Hotel, Wallet, Sparkles, ClipboardList } from 'lucide-react';
import { TRIP_DETAILS, LOCATION_DETAILS } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

export default function Dashboard() {
  const [daysLeft, setDaysLeft] = useState(0);
  const [featuredSpot, setFeaturedSpot] = useState(null);

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
    </div>
  );
}
