"use client";
import AnalysisDashboard from '@/components/AnalysisDashboard';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import styles from './page.module.css';

export default function AnalysisPage() {
    return (
        <div className="container">
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn}>
                    <ChevronLeft size={24} />
                </Link>
                <h2>家庭 / 個人支出分析</h2>
            </header>
            <AnalysisDashboard />
        </div>
    );
}
