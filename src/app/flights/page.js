
"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, Plane, Image as ImageIcon, Loader2, Pencil, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import UniversalModal from '@/components/ui/UniversalModal';
import SecureImage from '@/components/ui/SecureImage';
import styles from './page.module.css';

export default function FlightsPage() {
    const router = useRouter();
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        img_urls: []
    });

    useEffect(() => {
        fetchFlights();
    }, []);

    const fetchFlights = async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('flight_info')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFlights(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- Image Handling Helpers ---
    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const scaleSize = MAX_WIDTH / img.width;
                    const width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
                    const height = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', 0.7);
                };
            };
        });
    };

    const handleModalSubmit = async (data, pendingFiles) => {
        if (!data.title) return;
        setIsSubmitting(true);

        try {
            const finalImgUrls = [];

            // 1. Upload new blobs
            for (const url of data.img_urls) {
                if (url.startsWith('blob:')) {
                    const file = pendingFiles && pendingFiles[url];
                    if (file) {
                        const compressedBlob = await compressImage(file);
                        const fileName = `flight_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                        const { error } = await supabase.storage
                            .from('images')
                            .upload(fileName, compressedBlob);

                        if (error) throw error;
                        finalImgUrls.push(fileName);
                    }
                } else {
                    finalImgUrls.push(url);
                }
            }

            // 2. Identify and Delete Unused Images (only if editing)
            if (editingId) {
                // Find original object to compare
                const originalItem = flights.find(f => f.id === editingId);
                if (originalItem) {
                    const oldUrls = originalItem.img_urls || (originalItem.img_url ? [originalItem.img_url] : []);
                    const imagesToDelete = oldUrls.filter(url => !finalImgUrls.includes(url));

                    if (imagesToDelete.length > 0) {
                        await supabase.storage.from('images').remove(imagesToDelete);
                    }
                }
            }

            // 3. Save to DB
            const payload = {
                title: data.title,
                content: data.content,
                img_urls: finalImgUrls,
                img_url: finalImgUrls.length > 0 ? finalImgUrls[0] : null
            };

            if (editingId) {
                const { error } = await supabase
                    .from('flight_info')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('flight_info')
                    .insert(payload);
                if (error) throw error;
            }

            handleCloseModal();
            fetchFlights();
        } catch (err) {
            alert(editingId ? "更新失敗: " + err.message : "新增失敗: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const [viewingFlight, setViewingFlight] = useState(null);

    const handleView = (item) => {
        setViewingFlight(item);
    };

    const handleEdit = (item = null) => {
        if (item) {
            setEditingId(item.id);

            let images = [];
            if (item.img_urls && Array.isArray(item.img_urls)) {
                images = item.img_urls;
            } else if (item.img_url) {
                images = [item.img_url];
            }

            setFormData({
                title: item.title,
                content: item.content || '',
                img_urls: images
            });
            setIsModalOpen(true);
        } else {
            // New
            setEditingId(null);
            setFormData({ title: '', content: '', img_urls: [] });
            setIsModalOpen(true);
        }
        if (viewingFlight) setViewingFlight(null);
    };

    const handleDeleteClick = async (item) => {
        if (confirm("確定要刪除這筆資料嗎？")) {
            try {
                // Delete images first
                const urlsToDelete = item.img_urls || (item.img_url ? [item.img_url] : []);
                if (urlsToDelete.length > 0) {
                    await supabase.storage.from('images').remove(urlsToDelete);
                }

                await supabase.from('flight_info').delete().eq('id', item.id);
                if (viewingFlight?.id === item.id) setViewingFlight(null);
                fetchFlights();
            } catch (err) {
                alert("刪除失敗");
            }
        }
    };

    const handleDelete = async (id = null) => {
        // Keep for compatibility if called from UniversalModal
        const targetId = id || editingId;
        if (!targetId) return;
        const item = flights.find(f => f.id === targetId);
        if (item) await handleDeleteClick(item);
        handleCloseModal();
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ title: '', content: '', img_urls: [] });
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => router.push('/')} className={styles.backBtn}>
                    <ArrowLeft size={24} />
                </button>
                <h2><Plane size={24} className="fly-icon" /> 機票資訊</h2>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}><Loader2 className="spin" /> 載入中...</div>
            ) : (
                <div className={styles.infoCards}>
                    {flights.length === 0 ? (
                        <div className={styles.emptyState}>
                            目前沒有機票資料。<br />
                            請按右下角 <b>+</b> 新增，記錄航班時間，或直接貼上/上傳機票截圖！
                        </div>
                    ) : (
                        flights.map(item => {
                            // Display logic for images in card
                            let coverImage = null;
                            if (item.img_urls && item.img_urls.length > 0) coverImage = item.img_urls[0];
                            else if (item.img_url) coverImage = item.img_url;

                            return (
                                <div key={item.id} className={styles.card} onClick={() => handleView(item)}>
                                    <div className={styles.cardTop}>
                                        <div className={styles.cardTitle}>
                                            <Plane size={18} />
                                            {item.title}
                                        </div>
                                    </div>

                                    {item.content && (
                                        <div className={styles.cardContent}>
                                            {item.content}
                                        </div>
                                    )}

                                    {coverImage && (
                                        <div className={styles.cardImage}>
                                            <SecureImage path={coverImage} alt="Flight Info" style={{ pointerEvents: 'none', width: '100%', height: '100%', objectFit: 'cover' }} />
                                            {item.img_urls && item.img_urls.length > 1 && (
                                                <div style={{
                                                    position: 'absolute', bottom: 8, right: 8,
                                                    background: 'rgba(0,0,0,0.6)', color: 'white',
                                                    fontSize: '0.7rem', padding: '2px 6px',
                                                    borderRadius: '4px'
                                                }}>
                                                    +{item.img_urls.length - 1}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            <button className={styles.fab} onClick={() => handleEdit(null)}>
                <Plus size={32} />
            </button>

            {/* View Modal */}
            {viewingFlight && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s'
                }} onClick={() => setViewingFlight(null)}>
                    <div style={{
                        background: 'white', width: '100%', maxWidth: '600px', maxHeight: '85vh',
                        borderRadius: '20px', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative'
                    }} onClick={e => e.stopPropagation()}>

                        {/* Top Actions */}
                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', zIndex: 20 }}>
                            <button onClick={() => handleEdit(viewingFlight)} title="編輯" style={{
                                background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '36px', height: '36px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: '#475569', backdropFilter: 'blur(4px)'
                            }}>
                                <Pencil size={20} />
                            </button>
                            <button onClick={() => handleDeleteClick(viewingFlight)} title="刪除" style={{
                                background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '36px', height: '36px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: '#475569', backdropFilter: 'blur(4px)'
                            }}>
                                <Trash2 size={20} />
                            </button>
                            <button onClick={() => setViewingFlight(null)} title="關閉" style={{
                                background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '36px', height: '36px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: '#475569', backdropFilter: 'blur(4px)'
                            }}>
                                <X size={24} />
                            </button>
                        </div>

                        {/* Images */}
                        {(() => {
                            let displayImages = [];
                            if (viewingFlight.img_urls && viewingFlight.img_urls.length > 0) displayImages = viewingFlight.img_urls;
                            else if (viewingFlight.img_url) displayImages = [viewingFlight.img_url];

                            if (displayImages.length > 0) {
                                return (
                                    <div style={{ width: '100%', background: '#f1f5f9', position: 'relative' }}>
                                        {displayImages.length === 1 ? (
                                            <div style={{ width: '100%', height: '300px', background: '#000' }}>
                                                <SecureImage path={displayImages[0]} alt="Flight Image" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            </div>
                                        ) : (
                                            <div style={{
                                                display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
                                                WebkitOverflowScrolling: 'touch', gap: '2px'
                                            }}>
                                                {displayImages.map((url, idx) => (
                                                    <div key={idx} style={{
                                                        flexShrink: 0, width: '100%', height: '300px',
                                                        scrollSnapAlign: 'center', background: '#000'
                                                    }}>
                                                        <SecureImage path={url} alt={`Image ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    </div>
                                                ))}
                                                <div style={{
                                                    position: 'absolute', bottom: '0.5rem', right: '0.5rem',
                                                    background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px',
                                                    borderRadius: '12px', fontSize: '0.75rem'
                                                }}>{displayImages.length} 張照片</div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* Content */}
                        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                            <h3 style={{
                                fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b'
                            }}>{viewingFlight.title}</h3>
                            <div style={{
                                fontSize: '1rem', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap'
                            }}>
                                {viewingFlight.content}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            <button className={styles.fab} onClick={() => handleEdit(null)}>
                <Plus size={32} />
            </button>

            <UniversalModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingId ? '編輯機票/航班資訊' : '新增機票/航班資訊'}
                initialData={formData}
                onSubmit={handleModalSubmit}
                isSubmitting={isSubmitting}
                showDelete={!!editingId}
                onDelete={() => handleDelete(editingId)}
            />
        </div>
    );
}
