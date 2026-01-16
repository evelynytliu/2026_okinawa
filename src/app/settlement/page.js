"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wallet, Check, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTrip } from '@/context/TripContext';
import styles from './page.module.css';

export default function SettlementPage() {
    const router = useRouter();
    const { members: MEMBERS, families: FAMILIES } = useTrip();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [includeUnpaid, setIncludeUnpaid] = useState(false);

    useEffect(() => {
        fetchExpenses();
        let channel;
        if (supabase) {
            channel = supabase
                .channel('settlement_updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchExpenses())
                .subscribe();
        }
        return () => { if (channel) supabase.removeChannel(channel); };
    }, []);

    const fetchExpenses = async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select('*');
            if (error) throw error;
            setExpenses(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // 1. Calculate Per-Person Balance & Collect Logs
    let personBalances = {};
    let memberLogs = {}; // To show "Why this number?"

    Object.keys(MEMBERS).forEach(mid => {
        personBalances[mid] = { paid: 0, share: 0, net: 0 };
        memberLogs[mid] = { paidItems: [], shareItems: [] };
    });

    expenses.forEach(exp => {
        const amt = Number(exp.amount) || 0;
        const payer = exp.payer_id;
        const beneficiaries = exp.beneficiaries || [];
        const isRepayment = exp.category === 'repayment';

        // Fix: Skip expenses that have no payer (unpaid items) to maintain zero-sum balance
        // Unless toggle is ON
        if (!includeUnpaid && (!payer || payer === 'none')) return;

        if (isRepayment) {
            if (personBalances[payer]) {
                personBalances[payer].paid += amt;
                memberLogs[payer].paidItems.push({ title: '還款/轉帳', amount: amt, date: exp.date });
            }
            beneficiaries.forEach(bid => {
                if (personBalances[bid]) {
                    personBalances[bid].paid -= amt;
                    memberLogs[bid].paidItems.push({ title: '收到還款', amount: -amt, date: exp.date });
                }
            });
        } else {
            if (personBalances[payer] && payer !== 'none') {
                personBalances[payer].paid += amt;
                memberLogs[payer].paidItems.push({ title: exp.title, amount: amt, date: exp.date });
            }
            if (beneficiaries.length > 0) {
                const splitAmt = amt / beneficiaries.length;
                beneficiaries.forEach(bid => {
                    if (personBalances[bid]) {
                        personBalances[bid].share += splitAmt;
                        memberLogs[bid].shareItems.push({ title: exp.title, amount: splitAmt, date: exp.date });
                    }
                });
            }
        }
    });

    Object.keys(personBalances).forEach(mid => {
        personBalances[mid].net = personBalances[mid].paid - personBalances[mid].share;
    });

    // 2. Aggregate by Family
    const familyStats = FAMILIES.map(f => {
        let famNet = 0;
        let members = [];
        f.members.forEach(mid => {
            const net = personBalances[mid]?.net || 0;
            famNet += net;
            if (f.id === 'individuals') {
                members.push({ id: mid, name: MEMBERS[mid].name, net });
            }
        });
        return {
            id: f.id,
            name: f.name,
            color: f.color,
            net: famNet,
            // Fix: Always return member IDs so we can iterate them in the UI
            members: f.members // Return the raw ID list from original data is safer/easier for the UI loop
        };
    });

    const creditors = []; // People who are owed money (net > 0)
    const debtors = [];   // People who owe money (net < 0)

    // Flat list for matching
    familyStats.forEach(fs => {
        if (fs.id === 'individuals') {
            fs.members.forEach(mid => {
                const stats = personBalances[mid];
                const net = stats?.net || 0;
                const roundedNet = Math.round(net);
                const name = MEMBERS[mid]?.name || mid;

                if (roundedNet > 0) creditors.push({ id: mid, name: name, amount: roundedNet });
                else if (roundedNet < 0) debtors.push({ id: mid, name: name, amount: Math.abs(roundedNet) });
            });
        } else {
            const roundedNet = Math.round(fs.net);
            if (roundedNet > 0) creditors.push({ id: fs.id, name: fs.name, amount: roundedNet });
            else if (roundedNet < 0) debtors.push({ id: fs.id, name: fs.name, amount: Math.abs(roundedNet) });
        }
    });

    // Calculate P2P Repayments - Prioritized Banker Algorithm
    const suggestions = [];

    // Sort debtors by amount descending (clear big debts first)
    const tempDebtors = debtors.map(d => ({ ...d })).sort((a, b) => b.amount - a.amount);

    // Split Creditors into "Main Bankers" (Ting/Lin or Family Names) and Others
    // Ideally use IDs, but names work if they are consistent. 
    // Data: 'Ting Family' -> '婷家', 'Lin Family' -> '琳家', 'Ting' -> '婷', 'Lin' -> '琳'
    // Let's use flexible matching.
    const isBanker = (c) => {
        const n = c.name;
        return n.includes('婷') || n.includes('琳');
    };

    const mainBankers = creditors.filter(c => isBanker(c)).map(c => ({ ...c })).sort((a, b) => b.amount - a.amount);
    const otherCreditors = creditors.filter(c => !isBanker(c)).map(c => ({ ...c })).sort((a, b) => b.amount - a.amount);

    // Combine them back, ensuring Bankers are processed FIRST
    const tempCreditors = [...mainBankers, ...otherCreditors];

    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < tempCreditors.length && dIdx < tempDebtors.length) {
        const creditor = tempCreditors[cIdx];
        const debtor = tempDebtors[dIdx];

        // Skip tiny remaining amounts to avoid dust transactions (e.g. $1)
        if (creditor.amount < 1) { cIdx++; continue; }
        if (debtor.amount < 1) { dIdx++; continue; }

        const amount = Math.min(creditor.amount, debtor.amount);

        if (amount > 0) {
            suggestions.push({
                from: debtor.name,
                to: creditor.name,
                amount: amount
            });
        }

        creditor.amount -= amount;
        debtor.amount -= amount;

        if (creditor.amount < 1) cIdx++;
        if (debtor.amount < 1) dIdx++;
    }

    const [expandedId, setExpandedId] = useState(null);

    const renderMemberAudit = (mid) => {
        const logs = memberLogs[mid];
        const stats = personBalances[mid];
        // Only hide if absolutely no activity AND no balance (clean slate)
        const hasActivity = logs && (logs.paidItems.length > 0 || logs.shareItems.length > 0);
        const hasBalance = Math.round(stats.net) !== 0;

        if (!hasActivity && !hasBalance) return null;

        return (
            <div key={mid} className={styles.auditGroup}>
                <div className={styles.auditHeader}>
                    <h5>{MEMBERS[mid].name}</h5>
                    <span className={stats.net >= 0 ? styles.positiveText : styles.negativeText}>
                        個人結餘: {Math.round(stats.net).toLocaleString()}
                    </span>
                </div>

                {logs.paidItems.length > 0 && (
                    <div className={styles.auditSub}>
                        <h6>我墊付的 (+)</h6>
                        {logs.paidItems.map((item, idx) => (
                            <div key={idx} className={styles.auditRow}>
                                <span>{item.title}</span>
                                <span>+${Math.round(item.amount).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                )}

                {logs.shareItems.length > 0 && (
                    <div className={styles.auditSub}>
                        <h6>我應付的分攤 (-)</h6>
                        {logs.shareItems.map((item, idx) => (
                            <div key={idx} className={styles.auditRow}>
                                <span>{item.title}</span>
                                <span>-${Math.round(item.amount).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="container" style={{ paddingBottom: '6rem' }}>
            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.backBtn}>
                    <ArrowLeft size={24} />
                </button>
                <h3>待結清款 (內部債務)</h3>
                <button
                    onClick={() => setIncludeUnpaid(!includeUnpaid)}
                    className={`${styles.toggleBtn} ${includeUnpaid ? styles.toggleBtnActive : ''}`}
                >
                    {includeUnpaid ? '含預估支出' : '僅已付'}
                </button>
            </header>

            <div className={styles.heroCard}>
                <Wallet className={styles.heroIcon} size={48} />
                <div className={styles.heroContent}>
                    <p>目前內部代墊總額</p>
                    <h2>${creditors.reduce((acc, c) => acc + c.amount, 0).toLocaleString()}</h2>
                </div>
            </div>

            {/* Combined Debt Summary & Audit Section */}
            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>應收 / 應付金額明細 ({includeUnpaid ? '預估總額' : '目前結算'})</h4>

                <div className={styles.auditMenu}>
                    {familyStats.filter(f => Math.round(f.net) !== 0 || f.id !== 'individuals').map((fs) => {
                        // Logic for individual handling inside the main loop to keep order or separated?
                        // The original code separated Families and Individuals (Individuals group had multiple people).
                        // The Debt List flattened them.
                        // To integrate, we should iterate over familyStats.

                        if (fs.id === 'individuals') {
                            // Render each individual separately
                            // fs.members is now a list of IDs (e.g. ['peng', 'mei'])
                            return fs.members.map(mid => {
                                const stats = personBalances[mid];
                                const net = stats?.net || 0;
                                if (Math.round(net) === 0) return null; // Skip zero balance

                                const isExpanded = expandedId === mid;
                                const amount = Math.abs(Math.round(net));
                                const isPlus = net > 0;
                                const name = MEMBERS[mid]?.name || mid;

                                return (
                                    <div key={mid} className={styles.auditAccordion}>
                                        <button
                                            className={`${styles.debtItem} ${styles.groupToggle} ${isExpanded ? styles.activeToggle : ''}`}
                                            onClick={() => setExpandedId(isExpanded ? null : mid)}
                                            style={{ width: '100%', border: 'none', background: 'white', borderBottom: '1px solid #f1f5f9' }}
                                        >
                                            <div className={styles.debtorInfo}>
                                                <div className={styles.avatar} style={{
                                                    background: isPlus ? '#e6fffa' : '#fff5f5',
                                                    color: isPlus ? '#2e8b99' : '#e53e3e'
                                                }}>
                                                    {isPlus ? '收' : '欠'}
                                                </div>
                                                <span className={styles.groupName}>{name}</span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span className={isPlus ? styles.plusAmount : styles.minusAmount}>
                                                    {isPlus ? '+' : '-'}${amount.toLocaleString()}
                                                </span>
                                                <ChevronRight className={isExpanded ? styles.chevronOpen : ''} size={18} color="#ccc" />
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className={styles.auditContainer + ' fade-in'} style={{ padding: '0 1rem 1rem 1rem', background: '#fafafa', borderBottom: '1px solid #eee' }}>
                                                {renderMemberAudit(mid)}
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        } else {
                            // Family Row
                            if (Math.round(fs.net) === 0) return null; // Skip zero balance families in summary

                            const isExpanded = expandedId === fs.id;
                            const amount = Math.abs(Math.round(fs.net));
                            const isPlus = fs.net > 0;

                            return (
                                <div key={fs.id} className={styles.auditAccordion}>
                                    <button
                                        className={`${styles.debtItem} ${styles.groupToggle} ${isExpanded ? styles.activeToggle : ''}`}
                                        onClick={() => setExpandedId(isExpanded ? null : fs.id)}
                                        style={{ width: '100%', border: 'none', background: 'white', borderBottom: '1px solid #f1f5f9', borderLeft: `4px solid ${fs.color}` }}
                                    >
                                        <div className={styles.debtorInfo}>
                                            <div className={styles.avatar} style={{
                                                background: isPlus ? '#e6fffa' : '#fff5f5',
                                                color: isPlus ? '#2e8b99' : '#e53e3e'
                                            }}>
                                                {isPlus ? '收' : '欠'}
                                            </div>
                                            <span className={styles.groupName}>{fs.name}</span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span className={isPlus ? styles.plusAmount : styles.minusAmount}>
                                                {isPlus ? '+' : '-'}${amount.toLocaleString()}
                                            </span>
                                            <ChevronRight className={isExpanded ? styles.chevronOpen : ''} size={18} color="#ccc" />
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className={styles.auditContainer + ' fade-in'} style={{ padding: '0 1rem 1rem 1rem', background: '#fafafa', borderBottom: '1px solid #eee' }}>
                                            {fs.members.map(mid => renderMemberAudit(mid))}
                                        </div>
                                    )}
                                </div>
                            );
                        }
                    })}
                </div>
            </div>

            {/* Only show P2P suggestions when strictly balanced (Only Paid) */}
            {!includeUnpaid && suggestions.length > 0 && (
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>建議還款方式 (已墊付部分)</h4>
                    <div className={styles.suggestionList}>
                        {suggestions.map((s, i) => (
                            <div key={i} className={styles.suggestionItem}>
                                <div className={styles.sPerson}>
                                    <span className={styles.sName}>{s.from}</span>
                                    <span className={styles.sLabel}>應給予</span>
                                    <span className={styles.sName} style={{ color: 'var(--primary)' }}>{s.to}</span>
                                </div>
                                <div className={styles.sAmount}>
                                    ${Math.round(s.amount).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {includeUnpaid && (
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>⚠️ 包含預估支出模式</h4>
                    <div className={styles.empty} style={{ background: '#fff3cd', color: '#856404', borderRadius: '8px' }}>
                        此模式顯示「預計總花費欠款」，因部分款項尚未實際付款，故無法計算互相還款金額。<br />
                        若要結清內部代墊款，請切換至「僅已付」模式。
                    </div>
                </div>
            )}

            <div className={styles.footerNote}>
                <p>* 結餘 = (我墊付的總額) - (我應出的總額)。</p>
                <p>* 結清後，請使用「轉帳/還款」分類記帳來歸零金額。</p>
            </div>

            <Link href="/expenses/add?cat=repayment" className={styles.repayFab}>
                <Check size={20} />
                <span>去還錢</span>
            </Link>
        </div>
    );
}
