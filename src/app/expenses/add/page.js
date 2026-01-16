"use client";
import React, { useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Loader2, Users } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useTrip } from '@/context/TripContext';
import styles from './page.module.css';

export default function AddExpensePage() {
    return (
        <Suspense fallback={<div className="container">載入中...</div>}>
            <AddExpensePageContent />
        </Suspense>
    );
}

function AddExpensePageContent() {
    const router = useRouter();
    const { jpyRate, members: MEMBERS, families: FAMILIES } = useTrip();
    const amountRef = useRef(null);
    const searchParams = useSearchParams();
    const initialCat = searchParams.get('cat') || 'food';
    const [submitting, setSubmitting] = useState(false);
    const [currency, setCurrency] = useState('TWD'); // TWD or JPY
    const [displayAmount, setDisplayAmount] = useState(''); // Raw input

    const [formData, setFormData] = useState({
        title: '',
        category: initialCat,
        payer: 'ting', // Default to Ting
        receiver: 'lin', // For repayment
        note: '',
        splitType: 'all', // all, family, individual
        selectedBeneficiaries: [],
        is_paid: true, // External payment status
        date: new Date().toISOString().split('T')[0] // Default to today (YYYY-MM-DD)
    });

    const isRepayment = formData.category === 'repayment';
    const finalTwdAmount = currency === 'JPY'
        ? Math.round(Number(displayAmount) * jpyRate)
        : Number(displayAmount);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleBeneficiaryChange = (id) => {
        // ... (same as before)
        setFormData(prev => {
            const current = prev.selectedBeneficiaries;
            if (current.includes(id)) {
                return { ...prev, selectedBeneficiaries: current.filter(x => x !== id) };
            } else {
                return { ...prev, selectedBeneficiaries: [...current, id] };
            }
        });
    };

    const handleFamilySelect = (famMembers) => {
        // ... (same as before)
        const allIn = famMembers.every(m => formData.selectedBeneficiaries.includes(m));
        if (allIn) {
            setFormData(prev => ({
                ...prev,
                selectedBeneficiaries: prev.selectedBeneficiaries.filter(id => !famMembers.includes(id))
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                selectedBeneficiaries: [...new Set([...prev.selectedBeneficiaries, ...famMembers])]
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!displayAmount) return;

        setSubmitting(true);
        try {
            let beneficiaries = [];
            let title = formData.title;

            if (isRepayment) {
                beneficiaries = [formData.receiver];
                if (!title) title = '內部轉帳/還款';
            } else {
                // Normal Expense
                if (!formData.title) {
                    alert('請輸入項目名稱');
                    setSubmitting(false);
                    return;
                }
                if (formData.splitType === 'all') {
                    beneficiaries = Object.keys(MEMBERS);
                } else {
                    beneficiaries = formData.selectedBeneficiaries;
                }
                if (beneficiaries.length === 0) {
                    alert("請至少選擇一位分攤對象");
                    setSubmitting(false);
                    return;
                }
            }

            const payload = {
                title: title,
                amount: finalTwdAmount,
                category: formData.category,
                payer_id: formData.payer,
                beneficiaries: beneficiaries, // Store array of IDs
                note: formData.note + (currency === 'JPY' ? ` (JPY ${displayAmount})` : ''),
                date: new Date(formData.date).toISOString(),
                is_paid: isRepayment ? true : (formData.payer !== 'none') // Derived from payer
            };

            const { error } = await supabase.from('expenses').insert([payload]);
            if (error) throw error;

            router.back();
        } catch (err) {
            alert('儲存失敗: ' + err.message);
            setSubmitting(false);
        }
    };

    // Extended Categories for internal use
    const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, { id: 'repayment', name: '還款/轉帳' }];

    return (
        <div className="container">
            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.backBtn}>
                    <ArrowLeft size={24} />
                </button>
                <h3>{isRepayment ? '新增還款紀錄' : '新增消費'}</h3>
                <div style={{ width: 24 }}></div>
            </header>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <label style={{ marginBottom: 0 }}>金額 ({currency})</label>
                        <div className={styles.currencyToggle}>
                            <button
                                type="button"
                                className={`${styles.currBtn} ${currency === 'TWD' ? styles.activeCurr : ''}`}
                                onClick={() => { setCurrency('TWD'); amountRef.current?.focus(); }}
                            >
                                台幣
                            </button>
                            <button
                                type="button"
                                className={`${styles.currBtn} ${currency === 'JPY' ? styles.activeCurr : ''}`}
                                onClick={() => { setCurrency('JPY'); amountRef.current?.focus(); }}
                            >
                                日幣
                            </button>
                        </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input
                            ref={amountRef}
                            type="number"
                            placeholder="0"
                            value={displayAmount}
                            onChange={(e) => setDisplayAmount(e.target.value)}
                            className={styles.amountInput}
                            autoFocus
                            required
                        />
                        {currency === 'JPY' && displayAmount && (
                            <div className={styles.conversionPreview}>
                                ≈ <span>TWD ${finalTwdAmount.toLocaleString()}</span>
                                <small>(匯率: {jpyRate})</small>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label>分類</label>
                    <div className={styles.categoryGrid}>
                        {ALL_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                className={`${styles.catBtn} ${formData.category === cat.id ? styles.activeCat : ''}`}
                                onClick={() => setFormData(p => ({ ...p, category: cat.id }))}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label>日期</label>
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className={styles.input}
                        required
                    />
                </div>

                {/* Sender / Payer Selection */}
                <div className={styles.formGroup}>
                    <label>{isRepayment ? '誰轉出 (還錢)?' : '誰付錢 (Payer)?'}</label>
                    <select
                        name="payer"
                        value={formData.payer}
                        onChange={handleChange}
                        className={styles.select}
                    >
                        <option value="none">無 (尚未付款)</option>
                        {FAMILIES.map(f => (
                            <optgroup key={f.id} label={f.name}>
                                {f.members.map(mid => (
                                    <option key={mid} value={mid}>{MEMBERS[mid]?.name}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                {/* Receiver Selection (Only for Repayment) */}
                {isRepayment && (
                    <div className={styles.formGroup}>
                        <label>誰收到 (收錢)?</label>
                        <select
                            name="receiver"
                            value={formData.receiver}
                            onChange={handleChange}
                            className={styles.select}
                        >
                            {/* Filter out payer? No need to over engineer, just show all */}
                            {FAMILIES.map(f => (
                                <optgroup key={f.id} label={f.name}>
                                    {f.members.map(mid => (
                                        <option key={mid} value={mid}>{MEMBERS[mid]?.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                )}

                {!isRepayment && (
                    <>
                        <div className={styles.formGroup}>
                            <label>項目名稱</label>
                            <input
                                type="text"
                                name="title"
                                placeholder="例如: 午餐, 計程車"
                                value={formData.title}
                                onChange={handleChange}
                                className={styles.input}
                                required
                            />
                        </div>



                        <div className={styles.formGroup}>
                            <label>分攤對象</label>
                            <div className={styles.splitToggle}>
                                <button
                                    type="button"
                                    className={`${styles.splitBtn} ${formData.splitType === 'all' ? styles.activeSplit : ''}`}
                                    onClick={() => setFormData(p => ({ ...p, splitType: 'all' }))}
                                >
                                    全員 ({Object.keys(MEMBERS).length}人)
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.splitBtn} ${formData.splitType === 'custom' ? styles.activeSplit : ''}`}
                                    onClick={() => setFormData(p => ({ ...p, splitType: 'custom' }))}
                                >
                                    自訂成員
                                </button>
                            </div>

                            {formData.splitType === 'custom' && (
                                <div className={styles.memberSelector}>
                                    {FAMILIES.map(f => (
                                        <div key={f.id} className={styles.familySelGroup}>
                                            <div className={styles.famSelHeader} onClick={() => handleFamilySelect(f.members)}>
                                                <span style={{ color: f.color, fontWeight: 'bold' }}>{f.name}</span>
                                                <span className={styles.selAllHint}>全選</span>
                                            </div>
                                            <div className={styles.memberGrid}>
                                                {f.members.map(mid => {
                                                    const isSelected = formData.selectedBeneficiaries.includes(mid);
                                                    return (
                                                        <button
                                                            key={mid}
                                                            type="button"
                                                            className={`${styles.memberBtn} ${isSelected ? styles.selectedMem : ''}`}
                                                            onClick={() => handleBeneficiaryChange(mid)}
                                                            style={{ '--borderColor': f.color }}
                                                        >
                                                            {MEMBERS[mid]?.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                <div className={styles.formGroup}>
                    <label>備註 (選填)</label>
                    <textarea
                        name="note"
                        rows={3}
                        value={formData.note}
                        onChange={handleChange}
                        className={styles.textarea}
                    />
                </div>

                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                    {submitting ? <Loader2 className={styles.spin} size={20} /> : <Check size={20} />}
                    <span>{submitting ? '儲存中...' : '確認儲存'}</span>
                </button>
            </form>
        </div>
    );
}
