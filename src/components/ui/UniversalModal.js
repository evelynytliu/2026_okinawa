import React, { useState, useEffect } from 'react';
import { X, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import SecureImage from './SecureImage';

// A reusable Modal for editing content with Title, Content, and Multiple Images
export default function UniversalModal({
    isOpen,
    onClose,
    title,
    initialData = {},
    onSubmit,
    isSubmitting = false,
    onDelete,
    showDelete = false
}) {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        img_urls: []
    });

    // Store actual File objects for pending uploads: { "blob:url...": File }
    const [pendingFiles, setPendingFiles] = useState({});

    useEffect(() => {
        if (isOpen) {
            let images = [];
            if (initialData.img_urls && Array.isArray(initialData.img_urls)) {
                images = initialData.img_urls;
            } else if (initialData.img_url) {
                images = [initialData.img_url];
            }

            setFormData({
                title: initialData.title || '',
                content: initialData.content || '',
                img_urls: images
            });
            setPendingFiles({}); // Reset pending files
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const addFiles = (files) => {
        const newImages = [];
        const newPending = { ...pendingFiles };

        Array.from(files).forEach(file => {
            const blobUrl = URL.createObjectURL(file);
            newImages.push(blobUrl);
            newPending[blobUrl] = file;
        });

        setPendingFiles(newPending);
        setFormData(prev => ({
            ...prev,
            img_urls: [...prev.img_urls, ...newImages]
        }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(e.target.files);
        }
    };

    const handlePaste = (e) => {
        // Allow pasting text unless it's only images
        const items = e.clipboardData.items;
        const blobFiles = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                blobFiles.push(blob);
                e.preventDefault();
            }
        }
        if (blobFiles.length > 0) {
            addFiles(blobFiles);
        }
    };

    const removeImage = (index) => {
        const urlToRemove = formData.img_urls[index];

        // If it's a pending file, clean up the object URL and pending map
        if (urlToRemove.startsWith('blob:')) {
            URL.revokeObjectURL(urlToRemove);
            const newPending = { ...pendingFiles };
            delete newPending[urlToRemove];
            setPendingFiles(newPending);
        }

        setFormData(prev => ({
            ...prev,
            img_urls: prev.img_urls.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Pass both the form data and the pending files dictionary to the parent
        onSubmit(formData, pendingFiles);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999, // Ensure it's above everything including navbar
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.2s'
        }} onClick={onClose}>
            <div style={{
                background: 'white',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '85vh', // Restrict height to avoid overlap with browser bars
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                position: 'relative',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }} onClick={e => e.stopPropagation()} onPaste={handlePaste}>

                {/* Header */}
                <div style={{
                    padding: '1.25rem',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'white',
                    flexShrink: 0
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{title}</h3>
                    <button onClick={onClose} style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                        padding: '4px',
                        display: 'flex'
                    }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <form id="universal-modal-form" onSubmit={handleSubmit} style={{
                    padding: '1.5rem',
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    WebkitOverflowScrolling: 'touch'
                }}>
                    {/* Title */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>標題</label>
                        <input
                            style={{
                                padding: '0.75rem 1rem',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                width: '100%'
                            }}
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="輸入標題..."
                            required
                            autoFocus
                        />
                    </div>

                    {/* Content */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>內容</label>
                        <textarea
                            style={{
                                padding: '0.75rem 1rem',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                width: '100%',
                                minHeight: '150px',
                                resize: 'vertical',
                                lineHeight: 1.6
                            }}
                            value={formData.content}
                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                            placeholder="輸入內容..."
                        />
                    </div>

                    {/* Images */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>圖片 ({formData.img_urls.length})</label>
                        </div>

                        <label style={{
                            border: '2px dashed #e2e8f0',
                            borderRadius: '12px',
                            padding: '2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: '#f8fafc',
                            transition: 'all 0.2s',
                            display: 'block'
                        }}>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <ImageIcon size={32} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>點擊上傳或貼上 (Ctrl+V)</p>
                            </div>
                        </label>

                        {formData.img_urls.length > 0 && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                gap: '0.75rem',
                                marginTop: '1rem'
                            }}>
                                {formData.img_urls.map((path, idx) => (
                                    <div key={idx} style={{
                                        position: 'relative',
                                        aspectRatio: 1,
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        <SecureImage path={path} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button type="button" onClick={() => removeImage(idx)} style={{
                                            position: 'absolute',
                                            top: '4px',
                                            right: '4px',
                                            background: 'rgba(255, 255, 255, 0.9)',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '24px',
                                            height: '24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: '#ef4444',
                                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                        }}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer - Fixed at bottom of modal */}
                <div style={{
                    padding: '1.25rem',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                    flexShrink: 0,
                    marginBottom: 0 // Explicitly 0
                }}>
                    {showDelete ? (
                        <button type="button" onClick={onDelete} style={{
                            background: 'transparent',
                            color: '#ef4444',
                            border: '1px solid #fecaca',
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Trash2 size={18} /> 刪除
                        </button>
                    ) : <div />}

                    <button type="submit" form="universal-modal-form" disabled={isSubmitting} style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: (isSubmitting) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: (isSubmitting) ? 0.7 : 1
                    }}>
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
                        {isSubmitting ? '儲存中' : '儲存'}
                    </button>
                </div>
            </div>
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
