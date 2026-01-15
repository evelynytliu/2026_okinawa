
"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, Plane, Image as ImageIcon, Loader2, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
        img_url: ''
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
            // Ignore error for now if table missing, simply show empty
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!formData.title) return;
        setIsSubmitting(true);

        try {
            if (editingId) {
                // Update
                const { error } = await supabase
                    .from('flight_info')
                    .update({
                        title: formData.title,
                        content: formData.content,
                        img_url: formData.img_url
                    })
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('flight_info')
                    .insert({
                        title: formData.title,
                        content: formData.content,
                        img_url: formData.img_url
                    });
                if (error) throw error;
            }

            handleCloseModal();
            fetchFlights();
        } catch (err) {
            alert(editingId ? "更新失敗: " : "新增失敗: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setFormData({
            title: item.title,
            content: item.content || '',
            img_url: item.img_url || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("確定要刪除這筆資料嗎？")) return;
        await supabase.from('flight_info').delete().eq('id', id);
        fetchFlights();
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ title: '', content: '', img_url: '' });
    };

    // --- Image Handling ---

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
                    }, 'image/jpeg', 0.7); // Compress to 70% quality JPEG
                };
            };
        });
    };

    const uploadImage = async (file) => {
        try {
            setUploading(true);
            const compressedBlob = await compressImage(file);
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

            const { data, error } = await supabase.storage
                .from('images') // Assumes bucket 'images' exists
                .upload(fileName, compressedBlob);

            if (error) throw error;

            // Set formData.img_url to the fileName (path)
            setFormData(prev => ({ ...prev, img_url: fileName }));
        } catch (err) {
            alert("圖片上傳失敗 (請確認 Supabase StorageBucket 'images' 已建立並開啟公開寫入): " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            uploadImage(e.target.files[0]);
        }
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                uploadImage(blob);
                e.preventDefault(); // Prevent default paste behavior if image
            }
        }
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
                        flights.map(item => (
                            <div key={item.id} className={styles.card}>
                                <div className={styles.cardTop}>
                                    <div className={styles.cardTitle}>
                                        <Plane size={18} />
                                        {item.title}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className={styles.editBtn} onClick={() => handleEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
                                            <Pencil size={16} />
                                        </button>
                                        <button className={styles.deleteBtn} onClick={() => handleDelete(item.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {item.content && (
                                    <div className={styles.cardContent}>
                                        {item.content}
                                    </div>
                                )}

                                {item.img_url && (
                                    <div className={styles.cardImage}>
                                        <SecureImage path={item.img_url} alt="Flight Info" />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            <button className={styles.fab} onClick={() => { setEditingId(null); setFormData({ title: '', content: '', img_url: '' }); setIsModalOpen(true); }}>
                <Plus size={32} />
            </button>

            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div
                        className={styles.modalContent}
                        onClick={e => e.stopPropagation()}
                        onPaste={handlePaste} // Enable paste on the whole modal
                    >
                        <h3 className={styles.modalTitle}>{editingId ? '編輯機票/航班資訊' : '新增機票/航班資訊'}</h3>
                        <form onSubmit={handleAdd} className={styles.modalForm}>
                            <div className={styles.scrollableContent}>
                                <div className={styles.inputGroup}>
                                    <label>標題</label>
                                    <input
                                        className={styles.input}
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="例如: 去程航班 IT232"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>詳細內容</label>
                                    <textarea
                                        className={styles.textarea}
                                        value={formData.content}
                                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                                        placeholder="可以直接貼上航班資訊文字..."
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>圖片 (截圖/照片)</label>

                                    {/* Image Upload Area */}
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ fontSize: '0.9rem' }}
                                            disabled={uploading}
                                        />
                                        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                            💡 手機可直接拍照上傳，電腦可直接 Ctrl+V 貼上截圖。
                                        </p>
                                    </div>

                                    {/* URL Input (Manual or Auto-filled) - Hidden unless has value */}
                                    {formData.img_url && (
                                        <input
                                            className={styles.input}
                                            value={formData.img_url}
                                            onChange={e => setFormData({ ...formData, img_url: e.target.value })}
                                            placeholder="圖片 ID..."
                                            readOnly={true}
                                            style={{ fontSize: '0.8rem', color: '#666', background: '#f5f5f5', marginBottom: '0.5rem' }}
                                        />
                                    )}
                                    {uploading && <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '4px' }}>正在壓縮並上傳中...</div>}

                                    {formData.img_url && !uploading && (
                                        <div style={{ marginTop: '0.5rem', height: '150px', borderRadius: '4px', overflow: 'hidden' }}>
                                            <SecureImage path={formData.img_url} alt="Preview" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelBtn} onClick={handleCloseModal}>取消</button>
                                <button type="submit" className={styles.submitBtn} disabled={isSubmitting || uploading}>
                                    {isSubmitting ? '儲存中...' : '儲存'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
