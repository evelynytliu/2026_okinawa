"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, X, Image as ImageIcon, Loader2, StickyNote, Trash2, Pencil } from 'lucide-react';
import SecureImage from '@/components/ui/SecureImage';
import styles from './NotesDashboard.module.css';

export default function NotesDashboard() {
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
        img_url: ''
    });

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        if (!supabase) return;
        try {
            // Assuming 'notes' table exists with similar structure to flight_info:
            // id, title, content, img_url, created_at
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // If table doesn't exist, we might get an error.
                // For now, suppress distinct error and just show empty if 404/400
                console.warn("Notes fetch error (table might not exist yet):", error.message);
                setNotes([]);
            } else {
                setNotes(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (note = null) => {
        if (note) {
            setEditingNote(note);
            setFormData({
                title: note.title,
                content: note.content || '',
                img_url: note.img_url || ''
            });
        } else {
            setEditingNote(null);
            setFormData({ title: '', content: '', img_url: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingNote(null);
        setFormData({ title: '', content: '', img_url: '' });
    };

    // --- Image Handling (Copied/Refined from Flights) ---
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
            setFormData(prev => ({ ...prev, img_url: fileName }));
        } catch (err) {
            alert("圖片上傳失敗: " + err.message);
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
                e.preventDefault();
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title) return;
        setIsSubmitting(true);

        try {
            if (editingNote) {
                // Update
                const { error } = await supabase
                    .from('notes')
                    .update({
                        title: formData.title,
                        content: formData.content,
                        img_url: formData.img_url
                    })
                    .eq('id', editingNote.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('notes')
                    .insert({
                        title: formData.title,
                        content: formData.content,
                        img_url: formData.img_url
                    });
                if (error) throw error;
            }
            handleCloseModal();
            fetchNotes();
        } catch (err) {
            // If table doesn't exist, this will fail
            if (err.message && err.message.includes('relation "notes" does not exist')) {
                alert("錯誤：資料庫中沒有 'notes' 表格。請先建立表格。");
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
        <section className={styles.dashboardSection}>
            {/* Header */}
            <div className={styles.headerRow}>
                <div className={styles.titleContainer}>
                    <div className={styles.decorationBar} />
                    <h2 className={styles.titleMain}>
                        My <span className={styles.titleAccent}>Notes</span>
                    </h2>
                    <div className={styles.subtitleRow}>
                        <span className={styles.badge}>MEMO</span>
                        <span className={styles.subtitle}>圖文筆記</span>
                    </div>
                </div>
                <button className={styles.addBtn} onClick={() => handleOpenModal(null)}>
                    <Plus size={16} /> 新增
                </button>
            </div>

            {/* Content */}
            <div className={styles.scrollContainer}>
                {loading ? (
                    <div style={{ padding: '2rem', color: '#999', width: '100%', textAlign: 'center' }}>載入中...</div>
                ) : notes.length === 0 ? (
                    <div className={styles.emptyState} onClick={() => handleOpenModal(null)} style={{ cursor: 'pointer' }}>
                        <StickyNote size={40} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                        <p>尚無筆記，點擊新增</p>
                    </div>
                ) : (
                    notes.map(note => (
                        <div key={note.id} className={styles.noteCard} onClick={() => handleOpenModal(note)}>
                            <div className={styles.cardImage}>
                                {note.img_url ? (
                                    <SecureImage path={note.img_url} alt={note.title} style={{ pointerEvents: 'none' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', color: '#ddd' }}>
                                        <ImageIcon size={40} />
                                    </div>
                                )}
                            </div>
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>{note.title}</h3>
                                <p className={styles.cardText}>{note.content || "無內容"}</p>
                                <div className={styles.cardDate}>
                                    {new Date(note.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal - Reuse Flight Info Style */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()} onPaste={handlePaste}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                {editingNote ? '編輯筆記' : '新增筆記'}
                            </h3>
                            <button className={styles.closeBtn} onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.modalForm}>
                            <div className={styles.inputGroup}>
                                <label>標題</label>
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
                                <label>內容</label>
                                <textarea
                                    className={styles.textarea}
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="輸入內容..."
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label>圖片</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    style={{ fontSize: '0.9rem' }}
                                    disabled={uploading}
                                />
                                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>
                                    {uploading ? '上傳中...' : '可貼上截圖 (Ctrl+V)'}
                                </p>

                                {formData.img_url && (
                                    <div className={styles.imagePreview}>
                                        <SecureImage path={formData.img_url} alt="Preview" />
                                    </div>
                                )}
                            </div>

                            {editingNote && (
                                <div className={styles.actionRow}>
                                    <button type="button" className={styles.btnDelete} onClick={handleDelete}>
                                        <Trash2 size={16} /> 刪除筆記
                                    </button>
                                </div>
                            )}
                        </form>

                        <div className={styles.modalFooter}>
                            <button type="button" className={styles.btnCancel} onClick={handleCloseModal}>
                                取消
                            </button>
                            <button type="button" className={styles.btnSubmit} onClick={handleSubmit} disabled={isSubmitting || uploading}>
                                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
                                {isSubmitting ? '儲存中...' : '儲存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
