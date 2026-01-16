"use client";
import React, { useState, useEffect } from 'react';
import { useTrip } from '@/context/TripContext';
import { Lock, Unlock, User, Users, Database, RotateCcw, Loader2, Share2, Download, X } from 'lucide-react';
import styles from './page.module.css';
import { FAMILIES, MEMBERS, ITINERARY, INITIAL_EXPENSES, LOCATION_DETAILS, SCHEDULE_PLAN, EXPENSE_CATEGORIES } from '@/lib/data';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
    const { isEditMode, toggleEditMode, jpyRate, updateJpyRate } = useTrip();
    const [loading, setLoading] = useState(false);
    const [isSavingRate, setIsSavingRate] = useState(false);
    const [localRate, setLocalRate] = useState(jpyRate);

    // PWA Install Prompt State
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isChrome, setIsChrome] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    useEffect(() => {
        setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
        const userAgent = window.navigator.userAgent.toLowerCase();
        setIsIOS(/iphone|ipad|ipod/.test(userAgent));
        setIsChrome(/crios/.test(userAgent)); // Chrome on iOS
        setIsMobile(/android|iphone|ipad|ipod/.test(userAgent));

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    // Sync local rate with context rate when it loads
    useEffect(() => {
        setLocalRate(jpyRate);
    }, [jpyRate]);

    const handleSaveRate = async () => {
        setIsSavingRate(true);
        await updateJpyRate(Number(localRate));
        setIsSavingRate(false);
        alert('匯率已更新！');
    };

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else if (isIOS) {
            setShowIOSInstructions(!showIOSInstructions);
        }
    };

    const handleFullReset = async () => {
        if (!supabase) return alert("資料庫尚未連接");
        if (!confirm('【嚴重警告】這將刪除「所有」現有的記帳紀錄！\n\n確定要重置回預設狀態嗎？')) return;
        await performReset(true);
    };

    const handleUpdateMasterData = async () => {
        if (!supabase) return alert("資料庫尚未連接");
        // No confirmation needed? Maybe a gentle one.
        if (!confirm('確定要更新行程與地點資訊嗎？\n\n(您的記帳紀錄將會保留，不受影響)')) return;
        await performReset(false);
    };

    const performReset = async (includeExpenses) => {
        setLoading(true);
        try {
            // 1. Clear existing normalized tables
            await supabase.from('itinerary_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('itinerary_days').delete().neq('day_number', 0);
            await supabase.from('locations').delete().neq('id', '0');

            if (includeExpenses) {
                await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            }

            // 2. Insert Locations (Master Data)
            const locDetails = Object.keys(LOCATION_DETAILS).map(key => ({
                id: key,
                ...LOCATION_DETAILS[key]
            }));
            const { error: locError } = await supabase.from('locations').insert(locDetails);
            if (locError) throw locError;

            // 3. Insert Itinerary Days & Items
            const daysPayload = ITINERARY.map(day => ({
                day_number: day.day,
                date_display: day.date,
                title: day.title
            }));
            const { error: daysError } = await supabase.from('itinerary_days').insert(daysPayload);
            if (daysError) throw daysError;

            let itemsPayload = [];
            SCHEDULE_PLAN.forEach(day => {
                if (day.locations && day.locations.length > 0) {
                    day.locations.forEach((loc, index) => {
                        itemsPayload.push({
                            day_number: day.day,
                            location_id: loc.id,
                            note: loc.note || '',
                            sort_order: index + 1
                        });
                    });
                }
            });
            const { error: itemsError } = await supabase.from('itinerary_items').insert(itemsPayload);
            if (itemsError) throw itemsError;

            // 4. Insert Expenses (Only if requested)
            if (includeExpenses) {
                const expPayload = INITIAL_EXPENSES.map(exp => ({
                    ...exp,
                    amount: Number(exp.amount),
                    beneficiaries: exp.beneficiaries || ['all']
                }));
                const { error: expError } = await supabase.from('expenses').insert(expPayload);
                if (expError) throw expError;
                alert('系統重置成功！資料已回復至預設值。');
            } else {
                alert('行程與地點資料更新成功！(記帳紀錄已保留)');
            }

        } catch (error) {
            console.error(error);
            alert('操作失敗: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '6rem' }}>
            <h2 className={styles.pageTitle}>設定</h2>

            {/* Install App Section (Mobile Only) */}
            {isMobile && !isStandalone && (deferredPrompt || isIOS) && (
                <div className={styles.installSection}>
                    <div className={styles.installHeader}>
                        <div>
                            <div className={styles.installTitle}>安裝應用程式</div>
                            <div className={styles.installDesc}>將此網頁加到主畫面，享受全螢幕體驗</div>
                        </div>
                    </div>

                    <button className={styles.installBtn} onClick={handleInstallClick}>
                        <Download size={20} />
                        {isIOS ? (showIOSInstructions ? '隱藏教學' : '加到主畫面') : '加到主畫面'}
                    </button>

                    {showIOSInstructions && isIOS && (
                        <div className={styles.iosInstructions}>
                            <h5>{isChrome ? '加入主畫面 (Chrome)' : '加入主畫面 (Safari)'}</h5>
                            <ol>
                                {isChrome ? (
                                    <>
                                        <li>點擊右上角網址列的分享按鈕 <Share2 size={12} style={{ display: 'inline' }} /></li>
                                        <li>捲動或點選「更多(...)」</li>
                                        <li>點選「加入主畫面」</li>
                                    </>
                                ) : (
                                    <>
                                        <li>點擊瀏覽器下方的分享按鈕 <Share2 size={12} style={{ display: 'inline' }} /></li>
                                        <li>往下滑動選單</li>
                                        <li>點選「加入主畫面」</li>
                                    </>
                                )}
                            </ol>
                        </div>
                    )}
                </div>
            )}

            <div className="card">
                <div className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                        <h4>日幣匯率 (JPY to TWD)</h4>
                        <p>用於記帳時的自動換算</p>
                    </div>
                    <div className={styles.rateInputGroup}>
                        <input
                            type="number"
                            step="0.001"
                            value={localRate}
                            onChange={(e) => setLocalRate(e.target.value)}
                            className={styles.rateInput}
                        />
                        <button
                            className={styles.saveBtn}
                            onClick={handleSaveRate}
                            disabled={isSavingRate}
                        >
                            {isSavingRate ? <Loader2 className={styles.spin} size={16} /> : '儲存'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                        <h4>編輯模式</h4>
                        <p>開啟後可修改行程與備註</p>
                    </div>
                    <button
                        className={`${styles.toggleBtn} ${isEditMode ? styles.active : ''}`}
                        onClick={toggleEditMode}
                    >
                        {isEditMode ? <Unlock size={18} /> : <Lock size={18} />}
                        <span>{isEditMode ? '已開啟' : '已鎖定'}</span>
                    </button>
                </div>
            </div>

            {/* <div className="card">
                <div className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                        <h4>資料庫初始化與更新</h4>
                        <p>更新行程或重置所有資料</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <button
                            className={styles.actionBtn}
                            onClick={handleUpdateMasterData}
                            disabled={loading}
                            style={{ background: '#2E8B99', color: 'white', border: 'none' }}
                        >
                            {loading ? <Loader2 className={styles.spin} size={18} /> : <Database size={18} />}
                            <span>僅更新行程 (保留記帳)</span>
                        </button>

                        <button
                            className={styles.actionBtn}
                            onClick={handleFullReset}
                            disabled={loading}
                            style={{ borderColor: '#ef4444', color: '#ef4444' }}
                        >
                            {loading ? <Loader2 className={styles.spin} size={18} /> : <RotateCcw size={18} />}
                            <span>重置所有 (含刪除記帳)</span>
                        </button>
                    </div>
                </div>
            </div> */}

            <div className="card">
                <h3>成員名單</h3>
                <div className={styles.familyList}>
                    {FAMILIES.map(family => (
                        <div key={family.id} className={styles.familyGroup}>
                            <div className={styles.familyHeader} style={{ borderColor: family.color }}>
                                <Users size={16} color={family.color} />
                                <span>{family.name}</span>
                            </div>
                            <div className={styles.members}>
                                {family.members.map(memberId => (
                                    <span key={memberId} className={styles.memberTag}>{MEMBERS[memberId]?.name || memberId}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.footer}>
                <p>App Version 1.2.0 (Full Data)</p>
            </div>
        </div>
    );
}
