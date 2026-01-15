"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wallet, Check, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FAMILIES, MEMBERS } from '@/lib/data';
import styles from './page.module.css';

export default function SettlementPage() {
    const router = useRouter();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

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
            members: f.id === 'individuals' ? members : []
        };
    });

    const creditors = []; // People who are owed money (net > 0)
    const debtors = [];   // People who owe money (net < 0)

    // Flat list for matching
    familyStats.forEach(fs => {
        if (fs.id === 'individuals') {
            fs.members.forEach(m => {
                const roundedNet = Math.round(m.net);
                if (roundedNet > 0) creditors.push({ id: m.id, name: m.name, amount: roundedNet });
                else if (roundedNet < 0) debtors.push({ id: m.id, name: m.name, amount: Math.abs(roundedNet) });
            });
        } else {
            const roundedNet = Math.round(fs.net);
            if (roundedNet > 0) creditors.push({ id: fs.id, name: fs.name, amount: roundedNet });
            else if (roundedNet < 0) debtors.push({ id: fs.id, name: fs.name, amount: Math.abs(roundedNet) });
        }
    });

    // Calculate P2P Repayments
    const suggestions = [];
    const tempCreditors = creditors.map(c => ({ ...c }));
    const tempDebtors = debtors.map(d => ({ ...d }));

    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < tempCreditors.length && dIdx < tempDebtors.length) {
        const creditor = tempCreditors[cIdx];
        const debtor = tempDebtors[dIdx];
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

        if (creditor.amount <= 0) cIdx++;
        if (debtor.amount <= 0) dIdx++;
    }

    const [expandedId, setExpandedId] = useState(null);

    const renderMemberAudit = (mid) => {
        const logs = memberLogs[mid];
        const stats = personBalances[mid];
        if (!logs || (logs.paidItems.length === 0 && logs.shareItems.length === 0)) return null;

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
                <div style={{ width: 24 }}></div>
            </header>

            <div className={styles.heroCard}>
                <Wallet className={styles.heroIcon} size={48} />
                <div className={styles.heroContent}>
                    <p>目前內部代墊總額</p>
                    <h2>${creditors.reduce((acc, c) => acc + c.amount, 0).toLocaleString()}</h2>
                </div>
            </div>

            {suggestions.length > 0 && (
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>建議還款方式</h4>
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

            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>應收 / 應付金額 (結算)</h4>
                <div className={styles.debtList}>
                    {familyStats.filter(f => Math.round(f.net) !== 0).map((fs, i) => {
                        const amount = Math.abs(Math.round(fs.net));
                        const isPlus = fs.net > 0;

                        if (fs.id === 'individuals') {
                            return fs.members.filter(m => Math.round(m.net) !== 0).map((m, j) => {
                                const mAmount = Math.abs(Math.round(m.net));
                                return (
                                    <div key={m.id} className={styles.debtItem}>
                                        <div className={styles.debtorInfo}>
                                            <div className={styles.avatar} style={{
                                                background: m.net > 0 ? '#e6fffa' : '#fff5f5',
                                                color: m.net > 0 ? '#2e8b99' : '#e53e3e'
                                            }}>
                                                {m.net > 0 ? '收' : '欠'}
                                            </div>
                                            <span>{m.name}</span>
                                        </div>
                                        <span className={m.net > 0 ? styles.plusAmount : styles.minusAmount}>
                                            {m.net > 0 ? '+' : '-'}${mAmount.toLocaleString()}
                                        </span>
                                    </div>
                                );
                            });
                        }

                        return (
                            <div key={fs.id} className={styles.debtItem}>
                                <div className={styles.debtorInfo}>
                                    <div className={styles.avatar} style={{
                                        background: isPlus ? '#e6fffa' : '#fff5f5',
                                        color: isPlus ? '#2e8b99' : '#e53e3e'
                                    }}>
                                        {isPlus ? '收' : '欠'}
                                    </div>
                                    <span>{fs.name}</span>
                                </div>
                                <span className={isPlus ? styles.plusAmount : styles.minusAmount}>
                                    {isPlus ? '+' : '-'}${amount.toLocaleString()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Audit Details Section */}
            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>查帳明細 (為什麼是這個數字?)</h4>

                <div className={styles.auditMenu}>
                    {FAMILIES.map(f => {
                        if (f.id !== 'individuals') {
                            const isExpanded = expandedId === f.id;
                            let famNet = 0;
                            f.members.forEach(mid => famNet += personBalances[mid].net);

                            return (
                                <div key={f.id} className={styles.auditAccordion}>
                                    <button
                                        className={`${styles.groupToggle} ${isExpanded ? styles.activeToggle : ''}`}
                                        onClick={() => setExpandedId(isExpanded ? null : f.id)}
                                        style={{ borderLeftColor: f.color }}
                                    >
                                        <div className={styles.groupInfo}>
                                            <span className={styles.groupName}>{f.name}</span>
                                            <span className={famNet >= 0 ? styles.positiveText : styles.negativeText}>
                                                結餘: {Math.round(famNet).toLocaleString()}
                                            </span>
                                        </div>
                                        <ChevronRight className={isExpanded ? styles.chevronOpen : ''} size={18} />
                                    </button>

                                    {isExpanded && (
                                        <div className={styles.auditContainer + ' fade-in'}>
                                            {f.members.map(mid => renderMemberAudit(mid))}
                                        </div>
                                    )}
                                </div>
                            );
                        } else {
                            // Individuals
                            return f.members.map(mid => {
                                const isExpanded = expandedId === mid;
                                const stats = personBalances[mid];
                                return (
                                    <div key={mid} className={styles.auditAccordion}>
                                        <button
                                            className={`${styles.groupToggle} ${isExpanded ? styles.activeToggle : ''}`}
                                            onClick={() => setExpandedId(isExpanded ? null : mid)}
                                        >
                                            <div className={styles.groupInfo}>
                                                <span className={styles.groupName}>{MEMBERS[mid].name} (個人)</span>
                                                <span className={stats.net >= 0 ? styles.positiveText : styles.negativeText}>
                                                    結餘: {Math.round(stats.net).toLocaleString()}
                                                </span>
                                            </div>
                                            <ChevronRight className={isExpanded ? styles.chevronOpen : ''} size={18} />
                                        </button>

                                        {isExpanded && (
                                            <div className={styles.auditContainer + ' fade-in'}>
                                                {renderMemberAudit(mid)}
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        }
                    })}
                </div>
            </div>

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
