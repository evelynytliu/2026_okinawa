
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

    // 2. Randomly select a featured spot
    const spots = Object.entries(LOCATION_DETAILS).filter(([key, s]) => s.img_url);
    if (spots.length > 0) {
      const [id, data] = spots[Math.floor(Math.random() * spots.length)];
      setFeaturedSpot({ ...data, id });
    }
  }, []);

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className="fade-in">Okinawa <br /> 2026</h1>
        <p className={`${styles.subtitle} fade-in`}>Family Trip &bull; {TRIP_DETAILS.dates.start.replace(/-/g, '.')}</p>
      </header>

      <Link href="/flights" className={`${styles.countdown} card fade-in`}>
        <div className={styles.countdownText}>
          <span className={styles.days}>{daysLeft}</span>
          <span className={styles.label}>距離出發 (天)</span>
        </div>
        <div className={styles.flightInfo}>
          <Plane className={styles.planeIcon} size={40} />
          <span className={styles.flightText}>班機資訊</span>
        </div>
      </Link>

      {featuredSpot && (
        <Link href={`/itinerary?loc=${featuredSpot.id}`} className={styles.featuredLink}>
          <div
            className={`${styles.featuredCard} card fade-in`}
            style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.95) 100%), url(${featuredSpot.img_url})` }}
          >
            <div className={styles.featuredContent}>
              <span className={styles.featuredLabel}>景點搶先看</span>
              <h3>{featuredSpot.name}</h3>
              <p className={styles.featuredText}>{featuredSpot.details.substring(0, 40)}...</p>
            </div>
          </div>
        </Link>
      )}

      <div className={styles.actionGrid}>
        <Link href="/expenses/add" className={styles.actionCard}>
          <PlusCircle size={32} color="var(--color-coral)" />
          <span>記一筆</span>
        </Link>
        <Link href="/itinerary" className={styles.actionCard}>
          <Calendar size={32} color="var(--color-sea-blue)" />
          <span>查看行程</span>
        </Link>
        <Link href="/expenses" className={styles.actionCard}>
          <CreditCard size={32} color="var(--color-gold)" />
          <span>消費明細</span>
        </Link>
        <Link href="/analysis" className={styles.actionCard}>
          <PieChart size={32} color="#2E8B99" />
          <span>家庭/個人支出</span>
        </Link>
        <Link href="/settlement" className={styles.actionCard}>
          <Wallet size={32} color="#f59e0b" />
          <span>待結清款</span>
        </Link>
        <Link href="/accommodation" className={styles.actionCard}>
          <Hotel size={32} color="#E6B422" />
          <span>房間分配</span>
        </Link>
        <Link href="/checklist" className={styles.actionCard}>
          <ClipboardList size={32} color="#6366f1" />
          <span>待辦與行李</span>
        </Link>
        <Link href="/wishes" className={styles.actionCard}>
          <Sparkles size={32} color="#ec4899" />
          <span>許願池</span>
        </Link>
      </div>
    </div>
  );
}
