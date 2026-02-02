"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, Image as ImageIcon, Loader2, X, StickyNote, Images } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SecureImage from '@/components/ui/SecureImage';
import styles from './page.module.css';

export default function NotesPage() {
    const router = useRouter();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingNote, setEditingNote] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        img_urls: [] // Changed to array for multiple images
    });

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.warn("Notes fetch error:", error.message);
                // If error is about missing column 'img_urls', user might need migration
                // We will handle it defensively in the UI
            }
            setNotes(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (note = null) => {
        if (note) {
            setEditingNote(note);
            // Handle legacy single image (img_url) vs new multiple images (img_urls)
            let images = [];
            if (note.img_urls && Array.isArray(note.img_urls)) {
                images = note.img_urls;
            } else if (note.img_url) {
                images = [note.img_url];
            }

            setFormData({
                title: note.title,
                content: note.content || '',
                img_urls: images
            });
        } else {
            setEditingNote(null);
            setFormData({ title: '', content: '', img_urls: [] });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingNote(null);
        setFormData({ title: '', content: '', img_urls: [] });
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
                    }, 'image/jpeg', 0.7);
                };
            };
        });
    };

    const uploadImage = async (file) => {
        try {
            setUploading(true);
            const compressedBlob = await compressImage(file);
            const fileName = `note_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

            const { data, error } = await supabase.storage
                .from('images')
                .upload(fileName, compressedBlob);

            if (error) throw error;

            // Append to existing images
            setFormData(prev => ({
                ...prev,
                img_urls: [...prev.img_urls, fileName]
            }));
        } catch (err) {
            alert("圖片上傳失敗: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            // Upload sequentially to avoid state race conditions or heavy load
            const files = Array.from(e.target.files);
            const uploadFiles = async () => {
                for (const file of files) {
                    await uploadImage(file);
                }
            };
            uploadFiles();
        }
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                uploadImage(blob);
                e.preventDefault();
            }
        }
    };

    const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            img_urls: prev.img_urls.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title) return;
        setIsSubmitting(true);

        try {
            // Prepare data - check if user DB has 'img_urls' column yet
            // If not, we might need to fallback? 
            // Actually, we'll assume the migration script will be run.
            // But to be safe with legacy row, we sync img_url (first image) for backward compat slightly?
            // No, let's just use img_urls if possible.

            const payload = {
                title: formData.title,
                content: formData.content,
                // We will try to save to 'img_urls'. 
                // If the table schema is old (only 'img_url'), we save the first image there.
                // But we actually need to update the Schema first.
                img_urls: formData.img_urls,
                img_url: formData.img_urls.length > 0 ? formData.img_urls[0] : null // Backward compat
            };

            if (editingNote) {
                const { error } = await supabase
                    .from('notes')
                    .update(payload)
                    .eq('id', editingNote.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('notes')
                    .insert(payload);
                if (error) throw error;
            }
            handleCloseModal();
            fetchNotes();
        } catch (err) {
            if (err.message?.includes('img_urls')) {
                alert("儲存失敗：資料庫尚未更新支援多張圖片。請執行更新腳本。");
            } else {
                alert("儲存失敗: " + err.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!editingNote) return;
        if (!confirm("確定要刪除此筆記嗎？")) return;
        try {
            await supabase.from('notes').delete().eq('id', editingNote.id);
            handleCloseModal();
            fetchNotes();
        } catch (err) {
            alert("刪除失敗");
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => router.push('/')} className={styles.backBtn}>
                    <ArrowLeft size={24} />
                </button>
                <h2><StickyNote size={24} color="#3b82f6" /> 圖文筆記</h2>
            </header>

            <div className={styles.grid}>
                {loading ? (
                    <div className={styles.emptyState}>
                        <Loader2 className="animate-spin" size={32} />
                        <span>載入中...</span>
                    </div>
                ) : notes.length === 0 ? (
                    <div className={styles.emptyState}>
                        <StickyNote size={48} style={{ opacity: 0.3 }} />
                        <p>還沒有筆記，點擊右下角按鈕新增！</p>
                    </div>
                ) : (
                    notes.map(note => {
                        // Determine images to show
                        let coverImage = note.img_url; // fallback
                        let count = 0;
                        if (note.img_urls && Array.isArray(note.img_urls) && note.img_urls.length > 0) {
                            coverImage = note.img_urls[0];
                            count = note.img_urls.length;
                        } else if (note.img_url) {
                            count = 1;
                        }

                        return (
                            <div key={note.id} className={styles.noteCard} onClick={() => handleOpenModal(note)}>
                                <div className={styles.cardImage}>
                                    {coverImage ? (
                                        <SecureImage path={coverImage} alt={note.title} style={{ pointerEvents: 'none', width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#cbd5e1' }}>
                                            <ImageIcon size={32} />
                                        </div>
                                    )}
                                    {count > 1 && (
                                        <div className={styles.cardImagesBadge}>
                                            <Images size={12} /> {count}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.cardContent}>
                                    <h3 className={styles.cardTitle}>{note.title}</h3>
                                    <p className={styles.cardPreview}>{note.content || "無內容"}</p>
                                </div>
                                <div className={styles.cardFooter}>
                                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <button className={styles.fab} onClick={() => handleOpenModal(null)}>
                <Plus size={28} />
            </button>

            {/* Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()} onPaste={handlePaste}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                {editingNote ? '編輯筆記' : '新增筆記'}
                            </h3>
                            <button className={styles.closeBtn} onClick={handleCloseModal}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.modalBody}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>標題</label>
                                <input
                                    className={styles.input}
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="輸入標題..."
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>內容</label>
                                <textarea
                                    className={styles.textarea}
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="輸入筆記內容..."
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label className={styles.label}>圖片 ({formData.img_urls.length})</label>
                                    {uploading && <span style={{ fontSize: '0.8rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}><Loader2 size={12} className="animate-spin" /> 上傳中...</span>}
                                </div>

                                <label className={styles.imageUploadArea}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                        disabled={uploading}
                                    />
                                    <ImageIcon size={32} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>點擊上傳或直接貼上 (Ctrl+V)</p>
                                </label>

                                {formData.img_urls.length > 0 && (
                                    <div className={styles.previewGrid}>
                                        {formData.img_urls.map((path, idx) => (
                                            <div key={idx} className={styles.previewItem}>
                                                <SecureImage path={path} className={styles.previewImage} />
                                                <button type="button" className={styles.removeImageBtn} onClick={() => removeImage(idx)}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </form>

                        <div className={styles.modalFooter}>
                            {editingNote ? (
                                <button type="button" className={styles.deleteBtn} onClick={handleDelete}>
                                    <Trash2 size={18} /> 刪除
                                </button>
                            ) : <div />}

                            <button type="button" className={styles.submitBtn} onClick={handleSubmit} disabled={isSubmitting || uploading}>
                                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
                                {isSubmitting ? '儲存中' : '儲存筆記'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
