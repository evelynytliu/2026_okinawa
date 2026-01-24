"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { fetchPlaceDetails } from '@/lib/gemini';
import { ArrowLeft, Save, Upload, MapPin, Loader2, X, Link as LinkIcon, FileText, Trash2, Sparkles } from 'lucide-react';
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
import { ACCOMMODATION } from '@/lib/data';

// --- Helper: Image Compression ---
const compressImage = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const MAX_WIDTH = 1280; // Reasonable size for web
                const MAX_HEIGHT = 1280;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) return reject(new Error('Compression failed'));
                    resolve(new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    }));
                }, 'image/jpeg', 0.8);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

// --- Sortable Item Component ---
function SortableImage({ image, index, onRemove }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: image.id });

    const [loadError, setLoadError] = useState(false);

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

    const url = image.previewUrl || image.url; // Prefer previewUrl (blob) for new images
    const isValidUrl = url && typeof url === 'string' && (url.startsWith('http') || url.startsWith('/') || url.startsWith('blob:'));

    return (
        <div ref={setNodeRef} style={style}>
            {/* DRAGGABLE AREA */}
            <div
                {...attributes}
                {...listeners}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    cursor: 'grab',
                    backgroundColor: loadError ? '#f0f0f0' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {isValidUrl && !loadError ? (
                    <img
                        src={url}
                        alt={`Gallery ${index}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                        onError={() => setLoadError(true)}
                    />
                ) : (
                    <div style={{ padding: '0.5rem', textAlign: 'center', color: '#aaa', fontSize: '12px', pointerEvents: 'none' }}>
                        {loadError ? '無法載入' : '無效圖片'}
                    </div>
                )}

                {/* New Badge */}
                {image.file && !loadError && (
                    <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '10px', padding: '2px 4px', borderRadius: '4px' }}>
                        待上傳
                    </div>
                )}
            </div>

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

            {/* Remove Button */}
            <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove(image.id);
                }}
                style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: 'white',
                    color: '#ff4d4f',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    border: '1px solid #ffccc7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 20,
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

export default function EditLocationPage() {
    const router = useRouter();
    const params = useParams();
    const itemId = params?.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false); // Processing compression

    const [itemData, setItemData] = useState(null);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [details, setDetails] = useState('');
    const [note, setNote] = useState('');
    const [attachments, setAttachments] = useState([]);

    // AI Auto-Fill State
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [errorInfo, setErrorInfo] = useState(null);

    const handleAutoFill = async () => {
        if (!name) return setErrorInfo({ title: '缺少資料', message: '請先輸入景點名稱' });
        const key = localStorage.getItem('gemini_api_key');
        if (!key) return setErrorInfo({ title: '缺少金鑰', message: '請先至設定頁面輸入 Gemini API Key' });

        setIsAiLoading(true);
        try {
            const result = await fetchPlaceDetails(name, key);

            if (result && result.error) {
                setErrorInfo({ title: 'AI 分析錯誤', message: result.error });
                return;
            }

            if (result && result.found) {
                if (result.address) setAddress(result.address);
                if (result.details) setDetails(result.details);
                if (result.note) setNote(result.note);
                if (result.type) setType(result.type);
                if (result.lat) setLat(result.lat);
                if (result.lng) setLng(result.lng);
                alert('✨ AI 資料已自動填入！');
            } else {
                setErrorInfo({ title: '找不到相關資訊', message: '雖然成功連線，但 AI 回報找不到詳細資訊。請嘗試更換名稱。' });
            }
        } catch (e) {
            console.error(e);
            setErrorInfo({ title: '系統錯誤', message: e.message || String(e) });
        } finally {
            setIsAiLoading(false);
        }
    };

    // NEW FIELDS
    const [type, setType] = useState('spot'); // spot, food, stay, fun, shop, transport
    const [hotelId, setHotelId] = useState('');

    // Images: Array of objects
    // { id: string, url: string, file?: File, previewUrl?: string }
    // NEW: Lat/Lng for Map
    const [lat, setLat] = useState(null);
    const [lng, setLng] = useState(null);

    const [images, setImages] = useState([]);
    const [initialImages, setInitialImages] = useState([]); // Track for dehydration

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (itemId) fetchItemDetails();
    }, [itemId]);

    // Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
            images.forEach(img => {
                if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
            });
        };
    }, []);

    const [isLocationMode, setIsLocationMode] = useState(false);

    const fetchItemDetails = async () => {
        try {
            // Attempt 1: Try fetching as Itinerary Item
            let { data, error } = await supabase
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
                        gallery,
                        attachments,
                        type,
                        hotel_id
                    )
                `)
                .eq('id', itemId)
                .single();

            // Attempt 2: If not found, try fetching as direct Location
            if (error || !data) {
                const { data: locData, error: locError } = await supabase
                    .from('locations')
                    .select('*')
                    .eq('id', itemId)
                    .single();

                if (locData) {
                    // Structure matches what the UI expects
                    data = {
                        id: null, // No itinerary ID
                        note: '',
                        location_id: locData.id,
                        location: locData
                    };
                    error = null;
                    setIsLocationMode(true);
                } else if (error) {
                    throw error; // Throw original error if both failed
                }
            }

            if (error) throw error;
            if (data) {
                setItemData(data);
                setNote(data.note || '');
                setName(data.location.name || '');
                setAddress(data.location.address || '');
                setDetails(data.location.details || '');
                setAttachments(data.location.attachments || []);
                setLat(data.location.lat || null);
                setLng(data.location.lng || null);

                // Set Type and Hotel (handle missing columns if DB not updated yet)
                setType(data.location.type || 'spot');
                setHotelId(data.location.hotel_id || '');

                const rawList = [];
                if (data.location.img_url) rawList.push(data.location.img_url);
                if (data.location.gallery && Array.isArray(data.location.gallery)) {
                    rawList.push(...data.location.gallery);
                }

                const uniqueUrls = [...new Set(rawList)].filter(url =>
                    url && typeof url === 'string' && url.trim().length > 0
                );

                const imageObjects = uniqueUrls.map(url => ({
                    id: Math.random().toString(36).substr(2, 9),
                    url: url
                }));

                setImages(imageObjects);
                setInitialImages(imageObjects);
            }
        } catch (err) {
            console.error('Error fetching details:', err);
            // Don't alert here to avoid spamming if columns are missing temporarily
        } finally {
            setLoading(false);
        }
    };

    const handleAttachmentUpload = async (e) => {
        let file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            // Compress if image
            if (file.type.startsWith('image/')) {
                try {
                    file = await compressImage(file);
                } catch (err) {
                    console.warn('Compression failed, using original', err);
                }
            }

            const url = await uploadFileToSupabase(file);
            setAttachments(prev => [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                url: url
            }]);
        } catch (err) {
            console.error('Upload failed:', err);
            alert('文件上傳失敗');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const removeAttachment = (id) => {
        if (confirm('確定要移除此文件嗎？')) {
            setAttachments(prev => prev.filter(f => f.id !== id));
        }
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        try {
            // Compress all files first
            const compressedFiles = await Promise.all(
                files.map(async (file) => {
                    try {
                        return await compressImage(file);
                    } catch (err) {
                        console.warn('Compression failed, using original:', err);
                        return file;
                    }
                })
            );

            // Create preview objects (No upload yet)
            const newImageObjects = compressedFiles.map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                url: '', // No remote URL yet
                file: file,
                previewUrl: URL.createObjectURL(file)
            }));

            setImages(prev => [...prev, ...newImageObjects]);

        } catch (err) {
            console.error('File processing failed:', err);
            alert('照片處理失敗，請重試。');
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleAddUrl = () => {
        const url = prompt("請輸入圖片網址 (URL):");
        if (!url) return;

        if (url.startsWith('http') || url.startsWith('/')) {
            setImages(prev => [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                url: url
                // No file, no previewUrl
            }]);
        } else {
            alert("網址格式錯誤，請輸入完整的 URL (例如: https://...)");
        }
    };

    const removeImage = (idToRemove) => {
        setImages(prev => {
            const newList = prev.filter(img => img.id !== idToRemove);

            // If we remove a pending image, revoke its URL to free memory
            const removed = prev.find(img => img.id === idToRemove);
            if (removed && removed.previewUrl) {
                URL.revokeObjectURL(removed.previewUrl);
            }
            return newList;
        });
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setImages((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const uploadFileToSupabase = async (file) => {
        const fileExt = file.name.split('.').pop();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileName = `${Date.now()}_${randomStr}.${fileExt}`;

        let bucketName = null;
        let { error: uploadError } = await supabase.storage
            .from('locations') // Try 'locations' bucket
            .upload(fileName, file);

        if (!uploadError) {
            bucketName = 'locations';
        } else {
            // Fallback to 'images' bucket
            const { error: error2 } = await supabase.storage
                .from('images')
                .upload(fileName, file);
            if (!error2) bucketName = 'images';
            else throw error2;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        return publicUrl;
    };

    // --- Helpers for Cleaning Up ---
    const getFileNameFromUrl = (url) => {
        try {
            const parts = url.split('/');
            return parts[parts.length - 1];
        } catch (e) { return null; }
    };

    const getBucketFromUrl = (url) => {
        if (url.includes('/locations/')) return 'locations';
        if (url.includes('/images/')) return 'images';
        return null;
    };

    const deleteImageFromSupabase = async (url) => {
        const fileName = getFileNameFromUrl(url);
        const bucket = getBucketFromUrl(url);
        if (fileName && bucket) {
            await supabase.storage.from(bucket).remove([fileName]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Upload new files (Replace previewUrl with real URL)
            const finalImages = await Promise.all(images.map(async (img) => {
                if (img.file) {
                    const publicUrl = await uploadFileToSupabase(img.file);
                    return { ...img, url: publicUrl, file: undefined, previewUrl: undefined };
                }
                return img;
            }));

            // 2. Identify deleted images (Existed in initial but not in final)
            const finalUrls = new Set(finalImages.map(img => img.url));
            const deletedImages = initialImages.filter(img => !finalUrls.has(img.url));

            // 3. Delete from Storage (Async, don't block save)
            deletedImages.forEach(img => {
                // Only delete if it looks like a supabase storage URL
                if (img.url.includes('supabase')) {
                    console.log('Cleaning up deleted image:', img.url);
                    deleteImageFromSupabase(img.url).catch(err => console.error('Cleanup failed', err));
                }
            });

            // 4. Save to DB
            const dbUrls = finalImages.map(img => img.url);
            const finalImgUrl = dbUrls.length > 0 ? dbUrls[0] : null;

            const { error: locError } = await supabase
                .from('locations')
                .update({
                    name: name,
                    address: address,
                    details: details,
                    img_url: finalImgUrl,
                    gallery: dbUrls,
                    attachments: attachments,
                    type: type,
                    hotel_id: type === 'stay' ? hotelId : null,
                    lat: lat,
                    lng: lng
                })
                .eq('id', itemData.location_id); // Fixed: Use itemData

            if (locError) {
                // Fallback for missing columns or schema cache issues
                const isMissingColumn = locError.message?.includes('column "lat" does not exist') ||
                    locError.message?.includes("find the 'lat' column") ||
                    locError.message?.includes("schema cache");

                if (isMissingColumn) {
                    const { error: retryError } = await supabase
                        .from('locations')
                        .update({
                            name: name,
                            address: address,
                            details: details,
                            img_url: finalImgUrl,
                            gallery: dbUrls,
                            attachments: attachments,
                            type: type,
                            hotel_id: type === 'stay' ? hotelId : null
                        })
                        .eq('id', itemData.location_id);
                    if (retryError) throw retryError;
                } else {
                    throw locError;
                }
            }

            if (!isLocationMode) {
                const { error: itemError } = await supabase
                    .from('itinerary_items')
                    .update({ note: note })
                    .eq('id', itemId);

                if (itemError) throw itemError;
            }

            router.refresh(); // Refresh server state
            router.back();
        } catch (err) {
            console.error('Save failed:', err);
            alert('儲存失敗：' + (err.message || '未知錯誤'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem', paddingBottom: '140px' }}>
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>編輯景點資訊</h1>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* NEW: Type Selection */}
                <div className="form-group">
                    <label style={labelStyle}>類型</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {[
                            { id: 'spot', label: '景點', icon: '📍' },
                            { id: 'food', label: '食', icon: '🍜' },
                            { id: 'fun', label: '樂', icon: '🎡' },
                            { id: 'stay', label: '住', icon: '🏨' },
                            { id: 'shop', label: '買', icon: '🛍️' },
                            { id: 'transport', label: '行', icon: '🚗' },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setType(t.id)}
                                style={{
                                    padding: '0.6rem 1rem',
                                    borderRadius: '20px',
                                    border: type === t.id ? '2px solid var(--primary, #0070f3)' : '1px solid #ddd',
                                    backgroundColor: type === t.id ? 'var(--primary, #0070f3)' : '#fff',
                                    color: type === t.id ? '#fff' : '#555',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    flex: '1 0 auto',
                                    textAlign: 'center',
                                    transition: 'all 0.2s',
                                    fontSize: '0.9rem'
                                }}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* NEW: Hotel Selection (Visible only if type is 'stay') */}
                {type === 'stay' && (
                    <div className="form-group animate-in" style={{ animation: 'fadeIn 0.3s ease' }}>
                        <label style={labelStyle}>連結到房間分配頁面</label>
                        <select
                            style={inputStyle}
                            value={hotelId}
                            onChange={(e) => setHotelId(e.target.value)}
                        >
                            <option value="">-- 請選擇飯店 --</option>
                            {ACCOMMODATION.map(hotel => (
                                <option key={hotel.id} value={hotel.id}>
                                    {hotel.name}
                                </option>
                            ))}
                        </select>
                        <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.3rem' }}>
                            選擇後，行程詳情頁面將會顯示「查看房間分配」的連結按鈕。
                        </p>
                    </div>
                )}

                {/* Unified Image Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <label style={{ fontWeight: '600', color: '#555', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>圖片庫 (第 1 張為封面)</span>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>
                            {images.length} 張 {images.some(i => i.file) && '(有未儲存圖片)'}
                        </span>
                    </label>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={images.map(i => i.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
                                {images.map((image, index) => (
                                    <SortableImage
                                        key={image.id}
                                        image={image}
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
                                        {uploading ? '處理中' : '選擇照片'}
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
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAddUrl();
                                    }}
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
                                        padding: '4px',
                                        fontFamily: 'inherit'
                                    }}
                                >
                                    <LinkIcon size={24} />
                                    <span style={{ fontSize: '0.75rem', marginTop: '6px' }}>網址</span>
                                </button>
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Name */}
                <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>名稱</label>
                        <button
                            type="button"
                            onClick={handleAutoFill}
                            disabled={isAiLoading || !name}
                            style={{
                                fontSize: '0.8rem',
                                padding: '4px 10px',
                                background: isAiLoading ? '#ccc' : '#00b894',
                                color: 'white',
                                border: 'none',
                                borderRadius: '16px',
                                cursor: isAiLoading ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: '500',
                                transition: 'all 0.2s',
                                opacity: !name ? 0.5 : 1,
                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                            }}
                        >
                            {isAiLoading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                            {isAiLoading ? '分析中...' : 'AI 自動填寫'}
                        </button>
                    </div>
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

                {/* Attachments Section */}
                <div className="form-group">
                    <label style={labelStyle}>相關文件 (PDF/照片)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {attachments.map((file) => (
                            <div key={file.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.8rem',
                                background: '#f8f9fa',
                                borderRadius: '8px',
                                border: '1px solid #eee'
                            }}>
                                <FileText size={20} color="var(--primary, #0070f3)" />
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ flex: 1, marginLeft: '10px', textDecoration: 'none', color: '#333', fontWeight: '500' }}
                                >
                                    {file.name}
                                </a>
                                <button
                                    onClick={() => removeAttachment(file.id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        color: '#ff4d4f'
                                    }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}

                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem',
                            border: '2px dashed #ddd',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: '#666',
                            gap: '0.5rem',
                            transition: 'all 0.2s',
                            marginTop: '0.5rem'
                        }}>
                            {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                            <span>{uploading ? '上傳中...' : '上傳文件或照片'}</span>
                            <input
                                type="file"
                                accept=".pdf,image/*"
                                style={{ display: 'none' }}
                                onChange={handleAttachmentUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                </div>

            </div>

            {/* Sticky Save Button */}
            <div style={{
                position: 'fixed',
                bottom: '80px',
                left: 0,
                right: 0,
                padding: '1rem',
                background: 'linear-gradient(to top, rgba(255,255,255,1) 80%, rgba(255,255,255,0))',
                display: 'flex',
                justifyContent: 'center',
                zIndex: 100,
                pointerEvents: 'none'
            }}>
                <button
                    onClick={handleSave}
                    disabled={saving || uploading}
                    style={{
                        pointerEvents: 'auto',
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
                        opacity: (saving || uploading) ? 0.7 : 1,
                        cursor: (saving || uploading) ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                >
                    {saving ? <Loader2 className="animate-spin" /> : <Save />}
                    {saving ? '儲存中...' : (uploading ? '圖片處理中...' : '儲存變更')}
                </button>
            </div>

            {/* Error Logic Modal */}
            {errorInfo && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }} onClick={() => setErrorInfo(null)}>
                    <div style={{
                        background: 'white', padding: '1.5rem', borderRadius: '12px',
                        width: '100%', maxWidth: '400px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0, color: '#d32f2f', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            {errorInfo.title}
                        </h3>
                        <div style={{
                            background: '#f5f5f5', padding: '10px', borderRadius: '8px',
                            maxHeight: '200px', overflowY: 'auto', fontSize: '0.85rem',
                            fontFamily: 'monospace', whiteSpace: 'pre-wrap', marginBottom: '1.5rem',
                            border: '1px solid #ddd', color: '#333',
                            wordBreak: 'break-all'
                        }}>
                            {errorInfo.message}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => {
                                navigator.clipboard.writeText(errorInfo.message);
                                alert('已複製錯誤訊息');
                            }} style={{
                                padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd',
                                background: 'white', cursor: 'pointer', color: '#333'
                            }}>一鍵複製</button>
                            <button onClick={() => setErrorInfo(null)} style={{
                                padding: '8px 16px', borderRadius: '8px', border: 'none',
                                background: '#333', color: 'white', cursor: 'pointer'
                            }}>關閉</button>
                        </div>
                    </div>
                </div>
            )}

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
