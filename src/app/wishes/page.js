
"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function WishesPage() {
    const router = useRouter();
    const [wishes, setWishes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        details: '', // store link or note here
        url: ''      // store optional separate url or merge? keeping simple, let's allow separate URL input for convenience
    });

    useEffect(() => {
        fetchWishes();

        let channel;
        if (supabase) {
            channel = supabase
                .channel('wishes_page_updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => fetchWishes())
                .subscribe();
        }
        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    const fetchWishes = async () => {
        if (!supabase) return;
        try {
            // 1. Get all locations
            const { data: allLocs, error: locError } = await supabase
                .from('locations')
                .select('*')
                .order('id', { ascending: false }); // Latest first (if UUID allows, or just random)

            if (locError) throw locError;

            // 2. Get all Used Location IDs
            const { data: usedItems, error: itemsError } = await supabase
                .from('itinerary_items')
                .select('location_id');

            if (itemsError) throw itemsError;

            const usedIds = new Set(usedItems.map(i => i.location_id));

            // 3. Filter: Only unused locations are "Wishes"
            // Note: This logic assumes that ANY unused location is a wish. 
            // This is a fair assumption for this simple app.
            const wishList = allLocs.filter(l => !usedIds.has(l.id));

            setWishes(wishList);
        } catch (err) {
            console.error("Fetch wishes error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddWish = async (e) => {
        e.preventDefault();
        if (!formData.name) return;
        setIsSubmitting(true);

        try {
            // Append URL to details if provided, for simplicity in single 'details' field display
            let finalDetails = formData.details;
            if (formData.url) {
                finalDetails = (finalDetails ? finalDetails + '\n\n' : '') + `相關連結: ${formData.url}`;
            }

            const { error } = await supabase
                .from('locations')
                .insert({
                    id: crypto.randomUUID(),
                    name: formData.name,
                    details: finalDetails,
                    address: '' // Empty for now, can be filled later
                });

            if (error) throw error;

            setIsModalOpen(false);
            setFormData({ name: '', details: '', url: '' });
            alert("許願成功！");
        } catch (err) {
            alert("新增失敗: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("確定要刪除這個願望嗎？")) return;
        await supabase.from('locations').delete().eq('id', id);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', position: 'absolute', left: '1rem', top: '1.5rem', cursor: 'pointer' }}>
                    <ArrowLeft size={24} />
                </button>
                <h2><Sparkles size={20} style={{ display: 'inline', marginRight: 5 }} /> 許願池</h2>
                <p>想去哪裡？先丟進來！</p>
            </header>

            <div className={styles.intro}>
                💡 這裡是大家的許願清單。只要填寫想去的地方，之後在安排行程時，就可以直接從這裡挑選加入喔！
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="spin" /> 載入中...</div>
            ) : (
                <div className={styles.wishList}>
                    {wishes.length === 0 ? (
                        <div className={styles.emptyState}>
                            目前還沒有願望...<br />快按右下角 + 新增吧！
                        </div>
                    ) : (
                        wishes.map(wish => (
                            <div key={wish.id} className={styles.wishCard}>
                                <div className={styles.cardTop}>
                                    <div className={styles.cardTitle}>
                                        {wish.name}
                                    </div>
                                    <button className={styles.deleteBtn} onClick={() => handleDelete(wish.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {wish.details && (
                                    <div className={styles.note}>
                                        {wish.details.split('\n').map((line, i) => (
                                            <React.Fragment key={i}>
                                                {line}
                                                <br />
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* FAB */}
            <button className={styles.fab} onClick={() => setIsModalOpen(true)}>
                <Plus size={32} />
            </button>

            {/* Add Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>許個願望 ✨</h3>
                        <form onSubmit={handleAddWish}>
                            <div className={styles.inputGroup}>
                                <label>地點名稱 *</label>
                                <input
                                    className={styles.input}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="例如: 某某甜點店"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>連結 (Google Map 或 IG)</label>
                                <input
                                    className={styles.input}
                                    value={formData.url}
                                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>備註 (為什麼想去?)</label>
                                <textarea
                                    className={styles.textarea}
                                    value={formData.details}
                                    onChange={e => setFormData({ ...formData, details: e.target.value })}
                                    placeholder="聽說很好吃，一定要去！"
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>取消</button>
                                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                                    {isSubmitting ? '儲存中...' : '丟進許願池'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
