"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Wallet, Settings } from 'lucide-react';
import styles from './Navbar.module.css';

export default function Navbar() {
    const pathname = usePathname();

    const isActive = (path) => pathname === path;

    return (
        <nav className={styles.navbar}>
            <Link href="/" className={`${styles.navItem} ${isActive('/') ? styles.active : ''}`}>
                <Home size={24} />
                <span className={styles.label}>首頁</span>
            </Link>
            <Link href="/itinerary" className={`${styles.navItem} ${isActive('/itinerary') ? styles.active : ''}`}>
                <Calendar size={24} />
                <span className={styles.label}>行程</span>
            </Link>
            <Link href="/expenses" className={`${styles.navItem} ${isActive('/expenses') ? styles.active : ''}`}>
                <Wallet size={24} />
                <span className={styles.label}>記帳</span>
            </Link>
            <Link href="/settings" className={`${styles.navItem} ${isActive('/settings') ? styles.active : ''}`}>
                <Settings size={24} />
                <span className={styles.label}>設定</span>
            </Link>
        </nav>
    );
}
