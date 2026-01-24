"use client";
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, PlusCircle, Coffee, Car, Home, ShoppingBag, Ticket, MoreHorizontal, ChevronDown, ChevronUp, X, User, Edit2, Check, PieChart, Wallet, Calendar, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

import { useTrip } from '@/context/TripContext';
import styles from './page.module.css';

const ICON_MAP = {
    accommodation: Home,
    transport: Car,
    tickets: Ticket,
    food: Coffee,
    shopping: ShoppingBag,
    other: MoreHorizontal
};

function ExpensesPageContent() {
    const router = useRouter();
    const { members: MEMBERS, families: FAMILIES } = useTrip();
    const searchParams = useSearchParams();
    const filterType = searchParams.get('filter'); // 'unpaid' or null

    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedExpense, setSelectedExpense] = useState(null);

    useEffect(() => {
        fetchExpenses();
        let channel;
        if (supabase) {
            channel = supabase
                .channel('expenses_updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchExpenses())
                .subscribe();
        }
        return () => { if (channel) supabase.removeChannel(channel); };
    }, []);

    const fetchExpenses = async () => {
        if (!supabase) {
            setLoading(false);
            return;
        }
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false });
            if (error) throw error;
            setExpenses(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const totalSpent = expenses
        .filter(e => e.category !== 'repayment') // Exclude repayments from total trip cost
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    // Calculate Per-Person Balance
    let personBalances = {};
    Object.keys(MEMBERS).forEach(mid => {
        personBalances[mid] = { paid: 0, share: 0, net: 0 };
    });

    expenses.forEach(exp => {
        const amt = Number(exp.amount) || 0;
        const payer = exp.payer_id;
        const beneficiaries = exp.beneficiaries || [];
        const isRepayment = exp.category === 'repayment';

        if (isRepayment) {
            // Repayment Logic:
            // Payer (Transfer Sender): Paid increases (Net increases)
            // Beneficiary (Transfer Receiver): Paid decreases (Net decreases, as they got money back)
            if (personBalances[payer]) {
                personBalances[payer].paid += amt;
            }
            beneficiaries.forEach(bid => {
                if (personBalances[bid]) {
                    personBalances[bid].paid -= amt;
                }
            });
        } else {
            // Standard Expense Logic
            if (personBalances[payer]) {
                personBalances[payer].paid += amt;
            }
            if (beneficiaries.length > 0) {
                const splitAmt = amt / beneficiaries.length;
                beneficiaries.forEach(bid => {
                    if (personBalances[bid]) {
                        personBalances[bid].share += splitAmt;
                    }
                });
            }
        }
    });

    Object.keys(personBalances).forEach(mid => {
        personBalances[mid].net = personBalances[mid].paid - personBalances[mid].share;
    });

    // Filtering Logic
    const isFiltered = filterType === 'unpaid';
    const displayedExpenses = isFiltered
        ? expenses.filter(e => e.is_paid === false)
        : expenses;

    return (
        <div className="container" style={{ paddingBottom: '5rem' }}>
            <header className={styles.header}>
                <div>
                    <h2>{isFiltered ? '待結清帳目' : '消費明細'}</h2>
                    {isFiltered && <p className={styles.filterHint}>僅顯示「預估/未付」項目</p>}
                </div>
                <div className={styles.totalCard}>
                    <span className={styles.label}>總支出 (TWD)</span>
                    <span className={styles.amount}>${totalSpent.toLocaleString()}</span>
                </div>
            </header>

            <div className={styles.shortcutRow}>
                <Link href="/analysis" className={styles.shortcutBtn}>
                    <PieChart size={16} />
                    <span>家庭/個人支出</span>
                </Link>
                <Link href="/settlement" className={styles.shortcutBtn}>
                    <Wallet size={16} />
                    <span>待結清款</span>
                </Link>
            </div>

            {loading ? (
                <p className="text-center text-muted">載入中...</p>
            ) : !supabase ? (
                <div style={{ textAlign: 'center', padding: '2rem', background: '#ffebee', borderRadius: '8px', border: '1px solid #ffcdd2', color: '#c62828' }}>
                    <p style={{ fontWeight: 'bold' }}>⚠️ 資料庫連結失敗</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>Missing Environment Variables</p>
                </div>
            ) : expenses.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>尚未有消費紀錄</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {displayedExpenses.map((expense) => {
                        const isRepayment = expense.category === 'repayment';
                        const CatIcon = ICON_MAP[expense.category] || MoreHorizontal;
                        const dateStr = new Date(expense.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
                        const payerName = MEMBERS[expense.payer_id]?.name || expense.payer_id;

                        // Handle Repayment Display
                        if (isRepayment) {
                            const receiverId = expense.beneficiaries?.[0];
                            const receiverName = MEMBERS[receiverId]?.name || receiverId;

                            return (
                                <div key={expense.id} className={`${styles.expenseItem} ${styles.repaymentItem}`} onClick={() => setSelectedExpense(expense)}>
                                    <div className={styles.iconBox} style={{ background: '#E6FFFA', color: '#2E8B99' }}>
                                        <Check size={20} />
                                    </div>
                                    <div className={styles.details}>
                                        <p className={styles.title} style={{ color: '#2E8B99' }}>還款 / 轉帳</p>
                                        <p className={styles.meta}>
                                            {dateStr} • <span className={styles.payerTag}>{payerName}</span> 給 <span className={styles.payerTag}>{receiverName}</span>
                                        </p>
                                        {expense.note && <p className={styles.noteText}>{expense.note}</p>}
                                    </div>
                                    <div className={styles.price} style={{ color: '#2E8B99' }}>
                                        ${Number(expense.amount).toLocaleString()}
                                    </div>
                                </div>
                            );
                        }

                        // Normal Expense Display
                        const benCount = expense.beneficiaries ? expense.beneficiaries.length : 0;
                        const splitAmt = benCount > 0 ? Math.round(Number(expense.amount) / benCount) : 0;
                        const isExternalPaid = expense.is_paid !== false; // Default true if null

                        return (
                            <div key={expense.id} className={styles.expenseItem} onClick={() => setSelectedExpense(expense)}>
                                <div className={styles.iconBox}>
                                    <CatIcon size={20} />
                                </div>
                                <div className={styles.details}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <p className={styles.title}>{expense.title}</p>
                                    </div>
                                    <div className={styles.metaRow}>
                                        <div className={styles.metaItem} title="日期">
                                            <Calendar size={10} /> {dateStr}
                                        </div>
                                        <div className={styles.metaItem} title="分攤人數">
                                            <Users size={10} /> {benCount}人
                                        </div>
                                        <div className={styles.metaItem} title="每人應付">
                                            均攤 ${splitAmt.toLocaleString()}
                                        </div>
                                    </div>
                                    {expense.note && <p className={styles.noteText}>{expense.note}</p>}
                                </div>
                                <div className={styles.amountBox}>
                                    <div className={styles.price}>
                                        ${Number(expense.amount).toLocaleString()}
                                    </div>
                                    <div className={styles.statusRow}>
                                        <div className={`${styles.statusBadge} ${isExternalPaid ? styles.statusPaid : styles.statusEst}`}>
                                            {isExternalPaid ? `${payerName} 已付` : '未付'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detail Modal */}
            {selectedExpense && (
                <div className={styles.modalOverlay} onClick={() => setSelectedExpense(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>{selectedExpense.category === 'repayment' ? '還款詳情' : '消費詳情'}</h3>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <Link href={`/expenses/edit/${selectedExpense.id}`}>
                                    <button className={styles.editBtn}>
                                        <Edit2 size={20} />
                                    </button>
                                </Link>
                                <button onClick={() => setSelectedExpense(null)}><X size={24} /></button>
                            </div>
                        </div>
                        <div className={styles.modalBody}>
                            {/* Repayment Specific Modal View or General View */}
                            {selectedExpense.category === 'repayment' ? (
                                <>
                                    <div className={styles.detailRow}>
                                        <span className={styles.detailLabel}>付款人 (還錢)</span>
                                        <span className={styles.detailValue}>{MEMBERS[selectedExpense.payer_id]?.name}</span>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <span className={styles.detailLabel}>收款人 (收錢)</span>
                                        <span className={styles.detailValue}>{MEMBERS[selectedExpense.beneficiaries?.[0]]?.name}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={styles.detailRow}>
                                        <span className={styles.detailLabel}>付款狀態</span>
                                        <span className={styles.detailValue} style={{ color: selectedExpense.is_paid !== false ? 'green' : 'red', fontWeight: 'bold' }}>
                                            {selectedExpense.is_paid !== false ? '已付給店家' : '尚未付給店家'}
                                        </span>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <span className={styles.detailLabel}>項目</span>
                                        <span className={styles.detailValue}>{selectedExpense.title}</span>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <span className={styles.detailLabel}>付款人</span>
                                        <span className={styles.detailValue}>
                                            {selectedExpense.payer_id === 'none' ? '尚未支付 (預估)' : (MEMBERS[selectedExpense.payer_id]?.name || selectedExpense.payer_id)}
                                        </span>
                                    </div>
                                    <div className={styles.detailRow} style={{ marginTop: 10 }}>
                                        <span className={styles.detailLabel}>分攤成員</span>
                                        <div className={styles.beneficiaryList} style={{ justifyContent: 'flex-end', marginTop: 0 }}>
                                            {selectedExpense.beneficiaries?.map(mid => (
                                                <div key={mid} className={styles.benTag}>
                                                    <User size={12} />
                                                    {MEMBERS[mid]?.name || mid}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>金額</span>
                                <span className={`${styles.detailValue} ${styles.highlight}`}>${Number(selectedExpense.amount).toLocaleString()}</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>日期</span>
                                <span className={styles.detailValue}>{new Date(selectedExpense.date).toLocaleDateString()}</span>
                            </div>

                            {selectedExpense.note && (
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>備註</span>
                                    <span className={styles.detailValue}>{selectedExpense.note}</span>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            <Link href="/expenses/add" className={styles.fab}>
                <PlusCircle size={32} />
            </Link>
        </div>
    );
}

export default function ExpensesPage() {
    return (
        <Suspense fallback={<div className="container">載入中...</div>}>
            <ExpensesPageContent />
        </Suspense>
    );
}
