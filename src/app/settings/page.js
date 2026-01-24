"use client";
import React, { useState, useEffect } from 'react';
import { useTrip } from '@/context/TripContext';
import { Lock, Unlock, User, Users, Database, RotateCcw, Loader2, Share2, Download, X } from 'lucide-react';
import styles from './page.module.css';
import { ITINERARY, INITIAL_EXPENSES, LOCATION_DETAILS, SCHEDULE_PLAN, EXPENSE_CATEGORIES } from '@/lib/data';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
    const { isEditMode, toggleEditMode, jpyRate, updateJpyRate, members, families, updateMembersConfig } = useTrip();
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

    // Gemini API State
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        const key = localStorage.getItem('gemini_api_key');
        if (key) setApiKey(key);
    }, []);

    const handleSaveKey = () => {
        if (!apiKey.trim()) {
            localStorage.removeItem('gemini_api_key');
            alert('API Key 已清除');
            return;
        }
        localStorage.setItem('gemini_api_key', apiKey.trim());
        alert('API Key 已儲存！現在您可以嘗試新增餐廳了。');
    };

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

    // State for Member Editing Modal
    const [editingMember, setEditingMember] = useState(null); // { id, name, familyId }

    // Open Modal (Centered)
    const handleMemberClick = (mid, e) => {
        const m = members[mid];

        setEditingMember({
            ...m,
            id: mid,
            popoverStyle: {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '320px',
                maxWidth: '85%',
                zIndex: 1000,
                background: 'white',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                borderRadius: '16px',
                padding: '24px',
            }
        });
    };

    const handleSaveMember = () => {
        if (!editingMember || !editingMember.name) return;

        const { id, name, familyId } = editingMember;

        // CASE 1: ADD NEW MEMBER
        if (id === 'new') {
            const newId = 'm_' + Date.now();
            const newMemberObj = { id: newId, name, familyId };

            const newMembers = { ...members, [newId]: newMemberObj };
            const newFamilies = families.map(f => {
                if (f.id === familyId) {
                    return { ...f, members: [...f.members, newId] };
                }
                return f;
            });

            updateMembersConfig(newMembers, newFamilies);
        }
        // CASE 2: EDIT EXISTING MEMBER
        else {
            const oldFamilyId = members[id]?.familyId;
            const newMembers = {
                ...members,
                [id]: { ...members[id], name, familyId }
            };

            let newFamilies = [...families];
            if (oldFamilyId && oldFamilyId !== familyId) {
                newFamilies = newFamilies.map(f => {
                    if (f.id === oldFamilyId) { // Remove from old
                        return { ...f, members: f.members.filter(m => m !== id) };
                    }
                    if (f.id === familyId) { // Add to new
                        return { ...f, members: [...f.members, id] };
                    }
                    return f;
                });
            }
            updateMembersConfig(newMembers, newFamilies);
        }

        setEditingMember(null);
    };

    const handleAddMember = (familyId) => {
        // Open Modal for New Member
        setEditingMember({
            id: 'new',
            name: '',
            familyId: familyId,
            popoverStyle: {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '320px',
                maxWidth: '85%',
                zIndex: 1000,
                background: 'white',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                borderRadius: '16px',
                padding: '24px',
            }
        });
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
                // Warning: INITIAL_EXPENSES uses static beneficiary IDs. 
                // If dynamic members changed IDs, this might break. 
                // But reset usually implies full reset.
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
                        <h4>AI 智慧助理設定</h4>
                        <p>輸入 Gemini API Key 以啟用餐廳自動搜尋功能</p>
                    </div>
                </div>
                <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type={showKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="請在此貼上您的 API Key"
                            className={styles.input}
                            style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                        <button
                            onClick={() => setShowKey(!showKey)}
                            style={{ padding: '0 1rem', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            {showKey ? '隱藏' : '顯示'}
                        </button>
                    </div>
                    <button
                        onClick={handleSaveKey}
                        className={styles.saveBtn}
                        style={{ marginTop: '0.8rem', width: '100%' }}
                    >
                        儲存金鑰
                    </button>
                    <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem' }}>
                        * 金鑰將儲存於您的瀏覽器中，不會上傳至其他伺服器。
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--color-teal)', marginLeft: '4px', textDecoration: 'underline' }}>
                            取得 Key
                        </a>
                    </p>
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

            <div className="card">
                <div className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                        <h3>成員名單管理</h3>
                        <p>點擊成員名稱可修改，點擊群組右上角可新增</p>
                    </div>
                </div>

                <div className={styles.familyList}>
                    {families.map(family => (
                        <div key={family.id} className={styles.familyGroup}>
                            <div className={styles.familyHeader} style={{ borderColor: family.color, displayName: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {family.id === 'individuals' ? (
                                        <User size={16} color={family.color} />
                                    ) : (
                                        <Users size={16} color={family.color} />
                                    )}
                                    <span>
                                        {family.name}
                                        {family.id === 'individuals' && <span style={{ fontSize: '0.8em', color: '#999', fontWeight: 'normal', marginLeft: 4 }}>(多位單獨成員)</span>}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleAddMember(family.id)}
                                    style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '12px', border: '1px solid #ddd', background: 'white', color: '#666' }}
                                >
                                    + 新增
                                </button>
                            </div>
                            <div className={styles.members}>
                                {family.members.map(memberId => (
                                    <button
                                        key={memberId}
                                        className={styles.memberTag}
                                        onClick={(e) => handleMemberClick(memberId, e)}
                                        style={{ border: 'none', cursor: 'pointer' }}
                                    >
                                        {members[memberId]?.name || memberId}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>


            {/* Modal Overlay */}
            {editingMember && (
                <div
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 990, background: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setEditingMember(null)}
                />
            )}

            {/* Popover for Editing Member */}
            {editingMember && (
                <div
                    style={editingMember.popoverStyle}
                    onClick={e => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0 }}>{editingMember.id === 'new' ? '新增成員' : '編輯成員'}</h3>
                        <button onClick={() => setEditingMember(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                    </div>

                    <div className={styles.inputGroup}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>名稱</label>
                        <input
                            value={editingMember.name}
                            onChange={e => setEditingMember(prev => ({ ...prev, name: e.target.value }))}
                            className={styles.input}
                            autoFocus
                        />
                    </div>

                    <div className={styles.inputGroup} style={{ marginTop: 16 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>所屬家庭</label>
                        <select
                            value={editingMember.familyId}
                            onChange={e => setEditingMember(prev => ({ ...prev, familyId: e.target.value }))}
                            className={styles.select}
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                fontSize: '1rem'
                            }}
                        >
                            {families.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => setEditingMember(null)}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSaveMember}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0070f3', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            {editingMember.id === 'new' ? '新增' : '儲存'}
                        </button>
                    </div>
                </div>

            )
            }

            <div className={styles.footer}>
                <p>App Version 1.3.0 (Members Management)</p>
            </div>
        </div >
    );
}
