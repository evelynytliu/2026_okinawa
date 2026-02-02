"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, Image as ImageIcon, Loader2, X, StickyNote, Images } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SecureImage from '@/components/ui/SecureImage';
import UniversalModal from '@/components/ui/UniversalModal';
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

    // --- Image Handling Helpers (Still used for direct upload if needed, but Modal handles its own uploads usually) ---
    // Actually UniversalModal handles file selection, but we need to provide the onUpload handler.

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

    const handleUpload = async (files) => {
        setUploading(true);
        const newImages = [];
        try {
            for (const file of Array.from(files)) {
                const compressedBlob = await compressImage(file);
                const fileName = `note_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                const { error } = await supabase.storage
                    .from('images')
                    .upload(fileName, compressedBlob);
                if (error) throw error;
                newImages.push(fileName);
            }

            // Update local state for the modal to reflect new images
            setFormData(prev => ({
                ...prev,
                img_urls: [...prev.img_urls, ...newImages]
            }));
        } catch (err) {
            alert("圖片上傳失敗: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleModalSubmit = async (data, pendingFiles) => {
        // data contains { title, content, img_urls (mix of paths and blobs) }
        // pendingFiles contains { "blob:...": File }
        if (!data.title) return;
        setIsSubmitting(true);

        try {
            // 1. Upload new images (blob urls) and replace them with real paths
            const finalImgUrls = [];

            for (const url of data.img_urls) {
                if (url.startsWith('blob:')) {
                    const file = pendingFiles && pendingFiles[url];
                    if (file) {
                        const compressedBlob = await compressImage(file);
                        const fileName = `note_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                        const { error } = await supabase.storage
                            .from('images') // Assumes bucket 'images' exists
                            .upload(fileName, compressedBlob);

                        if (error) throw error;
                        finalImgUrls.push(fileName);
                    }
                } else {
                    finalImgUrls.push(url);
                }
            }

            // 2. Identify and Delete Unused Images (only if editing)
            if (editingNote) {
                const oldUrls = editingNote.img_urls || (editingNote.img_url ? [editingNote.img_url] : []);
                const imagesToDelete = oldUrls.filter(url => !finalImgUrls.includes(url));

                if (imagesToDelete.length > 0) {
                    await supabase.storage.from('images').remove(imagesToDelete);
                }
            }

            // 3. Save to DB
            const payload = {
                title: data.title,
                content: data.content,
                img_urls: finalImgUrls,
                img_url: finalImgUrls.length > 0 ? finalImgUrls[0] : null
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
            alert("儲存失敗: " + err.message);
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
                        let coverImage = note.img_url;
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

            <button className={styles.fab} onClick={() => handleOpenModal(null)} style={{
                bottom: '130px',
                zIndex: 200,
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                gap: '0px',
                background: '#3b82f6',
                color: 'white',
                position: 'fixed',
                right: '1.5rem',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                border: 'none',
                cursor: 'pointer'
            }}>
                <Plus size={32} strokeWidth={2.5} />
            </button>

            <UniversalModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingNote ? '編輯筆記' : '新增筆記'}
                initialData={formData}
                onSubmit={handleModalSubmit}
                isSubmitting={isSubmitting}
                showDelete={!!editingNote}
                onDelete={handleDelete}
            />
        </div>
    );
}
