"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Upload, MapPin, Loader2, X, Link as LinkIcon } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Sortable Item Component ---
function SortableImage({ url, id, index, onRemove }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        position: 'relative',
        aspectRatio: '1',
        borderRadius: '12px',
        backgroundColor: 'white',
        boxShadow: isDragging ? '0 8px 20px rgba(0,0,0,0.2)' : '0 2px 5px rgba(0,0,0,0.05)',
        border: index === 0 ? '3px solid var(--primary, #0070f3)' : '1px solid #eee',
        zIndex: isDragging ? 999 : 1,
        opacity: isDragging ? 0.8 : 1,
        touchAction: 'none'
    };

    const isValidUrl = url && typeof url === 'string' && (url.startsWith('http') || url.startsWith('/'));

    return (
        <div ref={setNodeRef} style={style}>
            {/* DRAGGABLE AREA: Only the image part has listeners */}
            <div
                {...attributes}
                {...listeners}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    cursor: 'grab'
                }}
            >
                {isValidUrl ? (
                    <img
                        src={url}
                        alt={`Gallery ${index}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentNode.style.backgroundColor = '#f0f0f0';
                        }}
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', color: '#ccc' }}>
                        Invalid
                    </div>
                )}
            </div>

            {/* NON-DRAGGABLE AREA: Buttons & Labels */}

            {/* Cover Label */}
            {index === 0 && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    background: 'var(--primary, #0070f3)',
                    color: 'white',
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderBottomRightRadius: '10px',
                    fontWeight: 'bold',
                    zIndex: 10,
                    pointerEvents: 'none'
                }}>
                    封面
                </div>
            )}

            {/* Remove Button - Totally independent DOM element */}
            <button
                type="button" // Important: accidental form submission prevention
                onClick={(e) => {
                    // Stop any propagation immediately
                    e.stopPropagation();
                    e.preventDefault();
                    onRemove(index);
                }}
                onPointerDown={(e) => e.stopPropagation()} // Prevent DnD start
                style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#ff4d4f',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    border: '1px solid #ffccc7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 20, // Higher than image
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    padding: 0
                }}
                title="移除照片"
            >
                <X size={16} strokeWidth={2.5} />
            </button>
        </div>
    );
}

// --- Main Page Component ---
export default function EditLocationPage() {
    const router = useRouter();
    const params = useParams();
    const itemId = params?.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Data state
    const [itemData, setItemData] = useState(null);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [details, setDetails] = useState('');
    const [note, setNote] = useState('');

    const [images, setImages] = useState([]);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8
            }
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (itemId) fetchItemDetails();
    }, [itemId]);

    const fetchItemDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('itinerary_items')
                .select(`
                    id,
                    note,
                    location_id,
                    location:locations (
                        id,
                        name,
                        address,
                        details,
                        img_url,
                        gallery
                    )
                `)
                .eq('id', itemId)
                .single();

            if (error) throw error;
            if (data) {
                setItemData(data);
                setNote(data.note || '');
                setName(data.location.name || '');
                setAddress(data.location.address || '');
                setDetails(data.location.details || '');

                const rawList = [];
                if (data.location.img_url) rawList.push(data.location.img_url);
                if (data.location.gallery && Array.isArray(data.location.gallery)) {
                    rawList.push(...data.location.gallery);
                }

                // Filter
                const uniqueValidImages = [...new Set(rawList)].filter(url =>
                    url &&
                    typeof url === 'string' &&
                    url.trim().length > 0 &&
                    (url.startsWith('http') || url.startsWith('/'))
                );

                setImages(uniqueValidImages);
            }
        } catch (err) {
            console.error('Error fetching details:', err);
            alert('無法載入資料');
        } finally {
            setLoading(false);
        }
    };

    const uploadFileToSupabase = async (file) => {
        const fileExt = file.name.split('.').pop();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileName = `${Date.now()}_${randomStr}.${fileExt}`;

        let bucketName = null;
        let { error: uploadError } = await supabase.storage
            .from('locations')
            .upload(fileName, file);

        if (!uploadError) {
            bucketName = 'locations';
        } else {
            console.warn('Upload to locations failed:', uploadError.message);
            const { error: error2 } = await supabase.storage
                .from('images')
                .upload(fileName, file);

            if (!error2) {
                bucketName = 'images';
            } else {
                console.error('All upload attempts failed.');
                throw error2;
            }
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        return publicUrl;
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        try {
            const newUrls = await Promise.all(files.map(file => uploadFileToSupabase(file)));
            setImages(prev => [...prev, ...newUrls]);
        } catch (err) {
            console.error('Upload failed:', err);
            alert('上傳失敗。請確認網路連線或稍後再試。');
        } finally {
            setUploading(false);
        }
    };

    const handleAddUrl = () => {
        const url = prompt("請輸入圖片網址 (URL):");
        if (url && url.startsWith('http')) {
            setImages(prev => [...prev, url]);
        }
    };

    // Remove function
    const removeImage = (indexToRemove) => {
        if (confirm('確定要移除這張照片嗎？')) {
            setImages(prev => prev.filter((_, index) => index !== indexToRemove));
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setImages((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const finalImgUrl = images.length > 0 ? images[0] : null;
            const finalGallery = images;

            const { error: locError } = await supabase
                .from('locations')
                .update({
                    name: name,
                    address: address,
                    details: details,
                    img_url: finalImgUrl,
                    gallery: finalGallery
                })
                .eq('id', itemData.location_id);

            if (locError) throw locError;

            const { error: itemError } = await supabase
                .from('itinerary_items')
                .update({ note: note })
                .eq('id', itemId);

            if (itemError) throw itemError;

            router.back();
        } catch (err) {
            console.error('Save failed:', err);
            if (err.message?.includes('gallery')) {
                alert('資料庫欄位錯誤: 請確認 locations 表格已有 gallery 欄位。');
            } else {
                alert('儲存失敗');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem', paddingBottom: '6rem' }}>
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>編輯景點資訊</h1>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Unified Image Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <label style={{ fontWeight: '600', color: '#555', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>圖片庫 (第 1 張為封面)</span>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>{images.length} 張</span>
                    </label>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={images}
                            strategy={rectSortingStrategy}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
                                {images.map((url, index) => (
                                    <SortableImage
                                        key={url}
                                        id={url}
                                        url={url}
                                        index={index}
                                        onRemove={removeImage}
                                    />
                                ))}

                                {/* Add Upload Button */}
                                <label style={{
                                    aspectRatio: '1',
                                    borderRadius: '12px',
                                    border: '2px dashed #adb5bd',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    background: 'white',
                                    color: 'var(--primary, #0070f3)',
                                    transition: 'all 0.2s',
                                    textAlign: 'center',
                                    padding: '4px'
                                }}>
                                    {uploading ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                                    <span style={{ fontSize: '0.75rem', marginTop: '6px', fontWeight: '500' }}>
                                        {uploading ? '上傳中' : '上傳'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                    />
                                </label>

                                {/* Add URL Button */}
                                <div
                                    onClick={handleAddUrl}
                                    style={{
                                        aspectRatio: '1',
                                        borderRadius: '12px',
                                        border: '2px dashed #adb5bd',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        background: 'white',
                                        color: '#666',
                                        transition: 'all 0.2s',
                                        textAlign: 'center',
                                        padding: '4px'
                                    }}
                                >
                                    <LinkIcon size={24} />
                                    <span style={{ fontSize: '0.75rem', marginTop: '6px' }}>網址</span>
                                </div>
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Name */}
                <div className="form-group">
                    <label style={labelStyle}>名稱</label>
                    <input
                        style={inputStyle}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="景點名稱"
                    />
                </div>

                {/* Note */}
                <div className="form-group">
                    <label style={labelStyle}>行程備註 (顯示在列表)</label>
                    <input
                        style={inputStyle}
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="例如：記得帶泳衣"
                    />
                </div>

                {/* Address */}
                <div className="form-group">
                    <label style={labelStyle}>地址</label>
                    <div style={{ position: 'relative' }}>
                        <MapPin size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                        <input
                            style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            placeholder="輸入地址或 MapCode"
                        />
                    </div>
                </div>

                {/* Details */}
                <div className="form-group">
                    <label style={labelStyle}>詳細資訊</label>
                    <textarea
                        style={{ ...inputStyle, minHeight: '150px', resize: 'vertical', lineHeight: '1.6' }}
                        value={details}
                        onChange={e => setDetails(e.target.value)}
                        placeholder="輸入詳細介紹、電話、注意事項..."
                    />
                </div>

            </div>

            {/* Sticky Save Button */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '1rem',
                background: 'white',
                borderTop: '1px solid #eee',
                display: 'flex',
                justifyContent: 'center',
                zIndex: 100
            }}>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        width: '100%',
                        maxWidth: '600px',
                        padding: '1rem',
                        backgroundColor: 'var(--primary, #0070f3)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        opacity: saving ? 0.7 : 1,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    {saving ? <Loader2 className="animate-spin" /> : <Save />}
                    {saving ? '儲存中...' : '儲存變更'}
                </button>
            </div>

            <style jsx global>{`
                .form-group input:focus, .form-group textarea:focus {
                    outline: 2px solid var(--primary, #0070f3);
                    border-color: transparent;
                }
            `}</style>
        </div>
    );
}

const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    color: '#333'
};

const inputStyle = {
    width: '100%',
    padding: '0.8rem',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    backgroundColor: '#fff',
    transition: 'border-color 0.2s',
};
