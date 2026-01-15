"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MEMBERS, ANALYSIS_GROUPS } from '@/lib/data';
import { X, ChevronRight, DollarSign, Wallet } from 'lucide-react';
import styles from './AnalysisDashboard.module.css';

export default function AnalysisDashboard() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState(null);

    // Fetch expenses
    useEffect(() => {
        fetchExpenses();
        let channel;
        if (supabase) {
            channel = supabase
                .channel('analysis_updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchExpenses())
                .subscribe();
        }
        return () => { if (channel) supabase.removeChannel(channel); };
    }, []);

    const fetchExpenses = async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase.from('expenses').select('*');
            if (error) throw error;
            setExpenses(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate stats for each group
    const groupStats = ANALYSIS_GROUPS.map(group => {
        let totalShare = 0;

        expenses.forEach(exp => {
            const amt = Number(exp.amount) || 0;
            const beneficiaries = exp.beneficiaries || [];
            if (beneficiaries.length > 0) {
                const perPerson = amt / beneficiaries.length;
                // Check how many members of this group are in the beneficiary list
                group.members.forEach(m => {
                    if (beneficiaries.includes(m)) {
                        totalShare += perPerson;
                    }
                });
            }
        });
        return { ...group, totalShare };
    });

    const openModal = (group) => {
        setSelectedGroup(group);
    };

    const closeModal = () => {
        setSelectedGroup(null);
    };

    // Filter expenses for selected group details
    const getGroupExpenses = (group) => {
        if (!group) return [];
        const relevant = [];
        expenses.forEach(exp => {
            const beneficiaries = exp.beneficiaries || [];
            // Find how many members of this group are involved
            const involvedMembers = group.members.filter(m => beneficiaries.includes(m));

            if (involvedMembers.length > 0) {
                const amt = Number(exp.amount) || 0;
                const perPerson = amt / beneficiaries.length;
                const groupCost = perPerson * involvedMembers.length;

                relevant.push({
                    ...exp,
                    groupCost,
                    involvedCount: involvedMembers.length,
                    involvedNames: involvedMembers.map(id => MEMBERS[id]?.name).join(', ')
                });
            }
        });
        return relevant.sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.grid}>
                {groupStats.map(stat => (
                    <div key={stat.id} className={styles.card} onClick={() => openModal(stat)}>
                        <div className={styles.cardHeader} style={{ borderLeftColor: stat.color }}>
                            <span className={styles.groupName}>{stat.name}</span>
                            <ChevronRight size={16} className={styles.arrow} />
                        </div>
                        <div className={styles.amountRow}>
                            <span className={styles.currency}>$</span>
                            <span className={styles.amount}>{Math.round(stat.totalShare).toLocaleString()}</span>
                        </div>
                        <div className={styles.subtext}>目前支出金額</div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {selectedGroup && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>{selectedGroup.name} 消費細節</h3>
                            <button onClick={closeModal}><X size={24} /></button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.summaryBox}>
                                <p>累計支出總額</p>
                                <h2>${Math.round(selectedGroup.totalShare).toLocaleString()}</h2>
                            </div>

                            <div className={styles.list}>
                                {getGroupExpenses(selectedGroup).map((item, idx) => (
                                    <div key={idx} className={styles.listItem}>
                                        <div className={styles.itemTop}>
                                            <span className={styles.itemTitle}>{item.title}</span>
                                            <span className={styles.itemCost}>-${Math.round(item.groupCost).toLocaleString()}</span>
                                        </div>
                                        <div className={styles.itemMeta}>
                                            {new Date(item.date).toLocaleDateString()} • 先付: {MEMBERS[item.payer_id]?.name || item.payer_id}
                                        </div>
                                        <div className={styles.itemInvolved}>
                                            分攤成員: {item.involvedNames} ({item.involvedCount}人)
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
