
"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, Plane, Image as ImageIcon, Loader2, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import UniversalModal from '@/components/ui/UniversalModal';
import styles from './page.module.css';


const SecureImage = ({ path, alt = "Image" }) => {
    const [src, setSrc] = useState(null);
    const [isZoomed, setIsZoomed] = useState(false);

    useEffect(() => {
        if (!path) return;
        // If it's a full URL (http) or a local blob (blob:), use it directly
        if (path.startsWith('http') || path.startsWith('blob:')) {
            setSrc(path);
            return;
        }

        // Otherwise treat as a storage path and get a signed URL
        const fetchSignedUrl = async () => {
            const { data, error } = await supabase.storage
                .from('images')
                .createSignedUrl(path, 60 * 60); // 1 hour validity

            if (data?.signedUrl) {
                setSrc(data.signedUrl);
            }
        };
        fetchSignedUrl();
    }, [path]);

    if (!src) return <div style={{ width: '100%', height: '150px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="spin" size={20} color="#ccc" /></div>;

    return (
        <>
            <img
                src={src}
                alt={alt}
                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                onClick={() => setIsZoomed(true)}
            />
            {isZoomed && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.9)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'zoom-out',
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsZoomed(false);
                    }}
                >
                    <img
                        src={src}
                        style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                    />
                </div>
            )}
        </>
    );
};

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

    const handleEdit = (item) => {
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
    };

    const handleDelete = async (id = null) => {
        const targetId = id || editingId;
        if (!targetId) return;
        if (!confirm("確定要刪除這筆資料嗎？")) return;

        try {
            // Find item to delete its images
            const item = flights.find(f => f.id === targetId);
            if (item) {
                const urlsToDelete = item.img_urls || (item.img_url ? [item.img_url] : []);
                if (urlsToDelete.length > 0) {
                    await supabase.storage.from('images').remove(urlsToDelete);
                }
            }

            await supabase.from('flight_info').delete().eq('id', targetId);
            if (editingId) handleCloseModal();
            fetchFlights();
        } catch (err) {
            alert("刪除失敗");
        }
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
                                <div key={item.id} className={styles.card} onClick={() => handleEdit(item)}>
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
                                            <SecureImage path={coverImage} alt="Flight Info" />
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

            <button className={styles.fab} onClick={() => { setEditingId(null); setFormData({ title: '', content: '', img_urls: [] }); setIsModalOpen(true); }}>
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
