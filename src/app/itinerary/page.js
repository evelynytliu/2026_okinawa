"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapPin, Edit2, Copy, Map, X, Info, Trash2, Plus, Settings, GripVertical, Loader2, FileText, ExternalLink, Upload } from 'lucide-react';
import { useTrip } from '@/context/TripContext';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

// DND Kit Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    TouchSensor,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Sub-component for Sortable Item ---
function SortableLocationItem({ loc, isEditMode, styles, openModal, handleRename, handleDelete }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: loc.item_id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 999 : 1,
        touchAction: 'none', // Important for mobile drag
        listStyle: 'none',   // Ensure list style is removed 
    };

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={styles.locationItem}
            onClick={() => openModal(loc)}
        >
            {/* Edit Mode: Drag Handle (Left) */}
            {isEditMode && (
                <div
                    className={styles.reorderControls}
                    {...attributes}
                    {...listeners}
                    style={{ cursor: 'grab', display: 'flex', alignItems: 'center', padding: '0 8px 0 0' }}
                >
                    <GripVertical size={20} color="#aaa" />
                </div>
            )}

            <div className={styles.locMain}>
                <div className={styles.locTitleRow}>
                    <MapPin size={16} className={styles.icon} />
                    <span className={styles.locName}>{loc.name}</span>
                    {(loc.img_url || loc.imgUrl || loc.details) && <Info size={14} className={styles.infoIcon} />}

                    {/* Edit Mode: Rename & Delete (Right) */}
                    {isEditMode && (
                        <div className={styles.editActions}>
                            <button
                                className={styles.editItemBtn}
                                onClick={(e) => handleRename(e, loc)}
                                title="修改名稱"
                            >
                                <Edit2 size={12} />
                            </button>
                            <button
                                className={styles.deleteItemBtn}
                                onClick={(e) => handleDelete(e, loc.item_id)}
                                title="刪除"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    )}
                </div>
                {loc.note && (
                    <span
                        className={styles.locNote}
                        onClick={async (e) => {
                            if (isEditMode) {
                                e.stopPropagation();
                                const newNote = prompt('修改備註:', loc.note);
                                if (newNote !== null) {
                                    await supabase.from('itinerary_items').update({ note: newNote }).eq('id', loc.item_id);
                                }
                            }
                        }}
                        style={isEditMode ? { cursor: 'pointer', border: '1px dashed #ccc' } : {}}
                    >
                        {loc.note} {isEditMode && <Edit2 size={10} style={{ marginLeft: 4, display: 'inline' }} />}
                    </span>
                )}
            </div>
        </li>
    );
}

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

                const MAX_WIDTH = 1280;
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

const getWeekday = (dateStr) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        // Correcting for potential timezone issues by appending time if needed, 
        // but normally YYYY-MM-DD in JS defaults to UTC. 
        // We just want to map that date to a weekday.
        const dayIndex = date.getUTCDay(); // Use UTCDay because YYYY-MM-DD is parsed as UTC midnight
        const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        return days[dayIndex];
    } catch (e) {
        return '';
    }
};

function ItineraryContent() {
    const { isEditMode } = useTrip();
    const searchParams = useSearchParams();
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLoc, setSelectedLoc] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Add Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addDayNum, setAddDayNum] = useState(null);
    const [dbLocations, setDbLocations] = useState([]);
    const [addMode, setAddMode] = useState('new'); // 'new' or 'db'
    const [searchTerm, setSearchTerm] = useState('');

    // Sensors for DND
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Prevent accidental drags
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250, // Slight delay for touch to differentiate from scroll
                tolerance: 5,
            },
        })
    );

    // Data fetching & Subscription
    useEffect(() => {
        fetchSchedule();

        let channel;
        if (supabase) {
            channel = supabase
                .channel('itinerary_updates')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'itinerary_items' },
                    () => {
                        console.log('Itinerary item changed, refreshing...');
                        fetchSchedule();
                    }
                )
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'locations' },
                    (payload) => {
                        console.log('Location updated, refreshing...', payload);
                        fetchSchedule();
                    }
                )
                .subscribe();
        }

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    // Sync selectedLoc with schedule updates & Check for deep link
    useEffect(() => {
        // 1. If a location is currently selected, update it with fresh data from schedule
        if (selectedLoc) {
            for (const day of schedule) {
                const found = day.locations?.find(l => l.item_id === selectedLoc.item_id);
                if (found) {
                    setSelectedLoc(found);
                    break;
                }
            }
        }

        // 2. Deep link handling (only on initial load or URL change)
        const locId = searchParams.get('loc');
        if (locId && schedule.length > 0 && !selectedLoc) { // Only if not already selected
            for (const day of schedule) {
                const found = day.locations?.find(l => l.id === locId); // Note: check id vs item_id based on URL param intent
                if (found) {
                    setSelectedLoc(found);
                    break;
                }
            }
        }
    }, [schedule, searchParams]);

    const fetchSchedule = async () => {
        if (!supabase) {
            setLoading(false);
            return;
        }
        try {
            const { data: daysData, error: daysError } = await supabase
                .from('itinerary_days')
                .select(`
                    day_number,
                    date_display,
                    title,
                    itinerary_items (
                        id,
                        sort_order,
                        note,
                        location_id,
                        location:locations (
                            id,
                            name,
                            address,
                            img_url,
                            gallery,
                            details,
                            attachments,
                            type,
                            hotel_id
                        )
                    )
                `)
                .order('day_number', { ascending: true });

            if (daysError) throw daysError;

            const transformed = daysData.map(day => {
                const sortedItems = (day.itinerary_items || [])
                    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                    .map(item => {
                        const loc = item.location || {};
                        // Use img_url from DB if available, otherwise check gallery
                        const dbImgUrl = loc.img_url;
                        const galleryImg = (Array.isArray(loc.gallery) && loc.gallery.length > 0) ? loc.gallery[0] : null;

                        return {
                            ...loc,
                            img_url: dbImgUrl || galleryImg, // Explicitly use DB value first
                            note: item.note,
                            item_id: item.id,
                            location_id: item.location_id,
                            sort_order: item.sort_order
                        };
                    });

                return {
                    id: day.day_number,
                    day_number: day.day_number,
                    date_display: day.date_display,
                    title: day.title,
                    locations: sortedItems
                };
            });

            setSchedule(transformed);
        } catch (err) {
            console.error('Error fetching itinerary:', err);
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    const handleCopy = (e, text) => {
        e.stopPropagation();
        if (!text) return;
        navigator.clipboard.writeText(text);
        alert(`已複製地址: ${text}`);
    };

    const handleOpenMap = (e, loc) => {
        e.stopPropagation();
        const query = loc.address || loc.name;
        const url = loc.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
        window.open(url, '_blank');
    };

    const openModal = (loc) => setSelectedLoc(loc);
    const closeModal = () => setSelectedLoc(null);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (selectedLoc || isAddModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto'; // or 'unset'
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [selectedLoc, isAddModalOpen]);

    const handleRename = async (e, loc) => {
        e.stopPropagation();
        const newName = prompt("修改景點名稱:", loc.name);
        if (newName && newName !== loc.name) {
            await supabase
                .from('locations')
                .update({ name: newName })
                .eq('id', loc.location_id);
        }
    };

    const handleDelete = async (e, itemId) => {
        e.stopPropagation();
        if (!confirm("確定要刪除這個行程嗎？")) return;
        await supabase.from('itinerary_items').delete().eq('id', itemId);
    };

    // NEW: Open Add Modal
    const openAddModal = async (dayNum) => {
        setAddDayNum(dayNum);
        setIsAddModalOpen(true);
        setAddMode('new');
        if (supabase) {
            const { data } = await supabase.from('locations').select('*').order('name');
            setDbLocations(data || []);
        }
    };

    // NEW: Confirm Add (Create new or link existing)
    const handleConfirmAdd = async (locIdOrName, isExisting = false) => {
        if (!addDayNum) return;

        let targetLocId = locIdOrName;

        if (!isExisting) {
            const name = locIdOrName;
            if (!name) return;

            // Create New Location
            const locRes = await supabase
                .from('locations')
                .insert({ id: crypto.randomUUID(), name: name })
                .select()
                .single();

            if (locRes.error) {
                alert("建立地點失敗");
                return;
            }
            targetLocId = locRes.data.id;
        }

        const day = schedule.find(d => d.day_number === addDayNum);
        const nextOrder = (day.locations.length > 0 ? Math.max(...day.locations.map(l => l.sort_order || 0)) : 0) + 1;

        await supabase
            .from('itinerary_items')
            .insert({
                day_number: addDayNum,
                location_id: targetLocId,
                sort_order: nextOrder
            });

        setIsAddModalOpen(false);
        fetchSchedule();
    };

    // NEW: Handle Image Upload from Modal
    const handleModalImageUpload = async (e, loc) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        try {
            // 1. Compress
            const compressedFile = await compressImage(files[0]);

            // 2. Upload to 'images' bucket (as requested)
            const fileExt = compressedFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, compressedFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);

            // 3. Update Gallery in DB
            const currentGallery = loc.gallery || [];
            // Use set to ensure unique, also if img_url was there, add it to gallery logic if needed, but for now just append
            // Note: If no img_url set, this new one becomes it potentially by logic in fetchSchedule, 
            // but explicitly:
            let newGallery = [...currentGallery, publicUrl];

            // Should we also set img_url if it's null? 
            // The fetchSchedule logic prefers img_url then gallery[0].
            // Let's just update gallery.

            // Also if img_url is empty, maybe set it? 
            // For now, let's just append to gallery which is safer.

            const { error: dbError } = await supabase
                .from('locations')
                .update({
                    gallery: newGallery,
                    // If no main image, set this as main image
                    ...(!loc.img_url ? { img_url: publicUrl } : {})
                })
                .eq('id', loc.location_id);

            if (dbError) throw dbError;

            // 4. Optimistic or full refresh handled by real-time subscription usually, 
            // but let's call fetchSchedule to be sure or rely on the Realtime subscription we set up.
            // (Realtime is active in useEffect)

        } catch (err) {
            console.error('Upload failed:', err);
            alert('上傳失敗: ' + (err.message || '未知錯誤'));
        } finally {
            setUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    // --- Drag and Drop Handler ---
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        // Find relevant days
        const activeDay = schedule.find(day => day.locations.find(l => l.item_id === active.id));
        const overDay = schedule.find(day => day.locations.find(l => l.item_id === over.id));

        if (!activeDay || !overDay) return;

        // Only allow reordering within the same day for simplicity
        if (activeDay.id !== overDay.id) return;

        const oldIndex = activeDay.locations.findIndex(l => l.item_id === active.id);
        const newIndex = overDay.locations.findIndex(l => l.item_id === over.id);

        const newLocations = arrayMove(activeDay.locations, oldIndex, newIndex);

        // Optimistic UI Update
        setSchedule(prev => prev.map(day => {
            if (day.id === activeDay.id) {
                return { ...day, locations: newLocations };
            }
            return day;
        }));

        // DB Update
        const updates = newLocations.map((loc, index) => ({
            id: loc.item_id,
            sort_order: index + 1
        }));

        // Send updates
        for (const update of updates) {
            await supabase.from('itinerary_items').update({ sort_order: update.sort_order }).eq('id', update.id);
        }
    };


    if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '2rem' }}><Loader2 className="spin" /> 載入中...</div>;

    return (
        <div className="container">
            <header className={styles.header}>
                <h2>行程總覽</h2>
                <p className="text-muted text-sm">2026.02.04 - 02.10</p>
            </header>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className={styles.timeline}>
                    {!supabase && (
                        <div style={{ textAlign: 'center', padding: '2rem', background: '#ffebee', borderRadius: '8px', border: '1px solid #ffcdd2', color: '#c62828' }}>
                            <p style={{ fontWeight: 'bold' }}>⚠️ 資料庫連結失敗</p>
                            <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                                請檢查 Vercel 環境變數設定。
                                <br />
                                若要使用範例模式，請設定 <code>NEXT_PUBLIC_DEMO_MODE=true</code>。
                                <br />
                                若要連結真實資料，請設定 <code>NEXT_PUBLIC_SUPABASE_URL</code> 與 Key。
                            </p>
                        </div>
                    )}
                    {supabase && schedule.length === 0 && <p style={{ textAlign: 'center' }}>暫無資料，請至「設定」匯入預設行程。</p>}

                    {schedule.map((dayItem, index) => (
                        <div key={dayItem.id} className={`${styles.dayBlock} fade-in`} style={{ animationDelay: `${index * 0.1}s` }}>
                            <div className={styles.dateColumn}>
                                <span className={styles.dateLabel}>{dayItem.date_display?.slice(5).replace('-', '/')}</span>
                                <span className={styles.weekdayLabel}>{getWeekday(dayItem.date_display)}</span>
                                <span className={styles.dayLabel}>第 {dayItem.day_number} 天</span>
                            </div>

                            <div className={styles.contentColumn}>
                                <div className={styles.cardHeader}>
                                    <h3>{dayItem.title}</h3>
                                    {isEditMode && (
                                        <button
                                            className={styles.editBtn}
                                            onClick={async () => {
                                                const newTitle = prompt('修改標題:', dayItem.title);
                                                if (newTitle && newTitle !== dayItem.title) {
                                                    await supabase.from('itinerary_days').update({ title: newTitle }).eq('day_number', dayItem.day_number);
                                                }
                                            }}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    )}
                                </div>

                                <SortableContext
                                    items={dayItem.locations.map(l => l.item_id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <ul className={styles.locationList}>
                                        {dayItem.locations.map((loc) => (
                                            <SortableLocationItem
                                                key={loc.item_id}
                                                loc={loc}
                                                isEditMode={isEditMode}
                                                styles={styles}
                                                openModal={openModal}
                                                handleRename={handleRename}
                                                handleDelete={handleDelete}
                                            />
                                        ))}
                                    </ul>
                                </SortableContext>

                                {isEditMode && (
                                    <button className={styles.addBtn} onClick={() => openAddModal(dayItem.day_number)}>
                                        <Plus size={16} /> 增加景點
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </DndContext>

            {/* Detail Modal (Existing) */}
            {selectedLoc && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>

                        {/* Top Actions: Close & Edit */}
                        <div className={styles.topActions}>
                            <button
                                onClick={() => window.location.href = `/itinerary/edit/${selectedLoc.item_id}`}
                                className={styles.iconBtn}
                                title="編輯詳細資料"
                            >
                                <Edit2 size={20} />
                            </button>
                            <button className={styles.iconBtn} onClick={closeModal}>
                                <X size={24} />
                            </button>
                        </div>

                        {(selectedLoc.img_url || (selectedLoc.gallery && selectedLoc.gallery.length > 0)) && (
                            <div className={styles.modalImage}>
                                {/* Prepare all images */}
                                {(() => {
                                    const allImages = [];
                                    if (selectedLoc.img_url) allImages.push(selectedLoc.img_url);
                                    if (selectedLoc.gallery && Array.isArray(selectedLoc.gallery)) {
                                        selectedLoc.gallery.forEach(url => {
                                            if (url && url !== selectedLoc.img_url) allImages.push(url);
                                        });
                                    }

                                    // Remove duplicates just in case
                                    const uniqueImages = [...new Set(allImages)];

                                    if (uniqueImages.length === 0) return null;

                                    return (
                                        <div className={styles.imageScrollContainer}>
                                            {uniqueImages.map((url, idx) => (
                                                <img
                                                    key={idx}
                                                    src={url}
                                                    alt={`${selectedLoc.name} - ${idx + 1}`}
                                                    className={styles.scrollImage}
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                            ))}
                                            {uniqueImages.length > 1 && (
                                                <div className={styles.scrollBadge}>{uniqueImages.length} 張照片</div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        <div className={styles.modalBody}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <h3>{selectedLoc.name}</h3>
                                {selectedLoc.type && selectedLoc.type !== 'spot' && (
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        backgroundColor: '#e0e0e0',
                                        color: '#555',
                                        fontWeight: 'bold'
                                    }}>
                                        {{
                                            food: '食',
                                            stay: '住',
                                            fun: '樂',
                                            shop: '買',
                                            transport: '行'
                                        }[selectedLoc.type] || selectedLoc.type}
                                    </span>
                                )}
                            </div>

                            {selectedLoc.note && (
                                <div className={styles.modalNote}>
                                    <strong>重點：</strong> {selectedLoc.note}
                                </div>
                            )}

                            {selectedLoc.details && (
                                <div className={styles.modalDesc}>
                                    <p>{(() => {
                                        const text = selectedLoc.details;
                                        if (!text) return null;
                                        // Regex to find URLs (http/https or www)
                                        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
                                        return text.split(urlRegex).map((part, index) => {
                                            if (part.match(urlRegex)) {
                                                const href = part.startsWith('www.') ? `http://${part}` : part;
                                                return (
                                                    <a
                                                        key={index}
                                                        href={href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: 'var(--primary)', textDecoration: 'underline', wordBreak: 'break-all' }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {part}
                                                    </a>
                                                );
                                            }
                                            return part;
                                        });
                                    })()}</p>
                                </div>
                            )}

                            {selectedLoc.address && (
                                <div className={styles.modalAddress}>
                                    <MapPin size={16} />
                                    <span>{selectedLoc.address}</span>
                                </div>
                            )}

                            {/* Attachments Display */}
                            {selectedLoc.attachments && selectedLoc.attachments.length > 0 && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.5rem', fontWeight: 'bold' }}>相關文件</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {selectedLoc.attachments.map((file, idx) => (
                                            <a
                                                key={idx}
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.attachmentBtn}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '0.8rem',
                                                    backgroundColor: '#f8f9fa',
                                                    borderRadius: '8px',
                                                    textDecoration: 'none',
                                                    color: '#333',
                                                    border: '1px solid #eee',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <FileText size={18} color="var(--primary, #0070f3)" style={{ marginRight: '8px' }} />
                                                <span style={{ fontWeight: '500', flex: 1 }}>{file.name}</span>
                                                <ExternalLink size={14} color="#aaa" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className={styles.modalActions}>
                                {selectedLoc.address && (
                                    <>
                                        <button onClick={(e) => handleCopy(e, selectedLoc.address)} className={styles.actionBtn}>
                                            <Copy size={16} /> 複製地址
                                        </button>
                                        <button onClick={(e) => handleOpenMap(e, selectedLoc)} className={styles.actionBtn}>
                                            <Map size={16} /> 地圖
                                        </button>
                                    </>
                                )}
                                {/* Room Link Button */}
                                {selectedLoc.type === 'stay' && selectedLoc.hotel_id && (
                                    <button
                                        onClick={() => window.location.href = `/accommodation#${selectedLoc.hotel_id}`}
                                        className={styles.actionBtn}
                                        style={{ backgroundColor: '#E6B422', color: 'white' }}
                                    >
                                        <ExternalLink size={16} /> 房間分配
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW ADD MODAL */}
            {isAddModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>增加行程到第 {addDayNum} 天</h3>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #eee' }}>
                            <button
                                onClick={() => setAddMode('new')}
                                style={{
                                    flex: 1, padding: '0.5rem', background: 'none', border: 'none',
                                    borderBottom: addMode === 'new' ? '2px solid var(--primary)' : 'none',
                                    fontWeight: addMode === 'new' ? 'bold' : 'normal',
                                    color: addMode === 'new' ? 'var(--primary)' : '#666',
                                    cursor: 'pointer'
                                }}
                            >
                                直接建立
                            </button>
                            <button
                                onClick={() => setAddMode('db')}
                                style={{
                                    flex: 1, padding: '0.5rem', background: 'none', border: 'none',
                                    borderBottom: addMode === 'db' ? '2px solid var(--primary)' : 'none',
                                    fontWeight: addMode === 'db' ? 'bold' : 'normal',
                                    color: addMode === 'db' ? 'var(--primary)' : '#666',
                                    cursor: 'pointer'
                                }}
                            >
                                從許願池/資料庫選擇
                            </button>
                        </div>

                        {addMode === 'new' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <input
                                    id="newSpotInput"
                                    className="input"
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                    placeholder="輸入新景點名稱..."
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleConfirmAdd(e.target.value, false);
                                    }}
                                />
                                <button
                                    className={styles.primaryActionBtn}
                                    style={{ background: 'var(--primary)', color: 'white', padding: '0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                                    onClick={() => {
                                        const val = document.getElementById('newSpotInput').value;
                                        handleConfirmAdd(val, false);
                                    }}
                                >
                                    確認新增
                                </button>
                            </div>
                        ) : (
                            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <input
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '0.5rem' }}
                                    placeholder="搜尋現有地點..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
                                    {dbLocations
                                        .filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(l => {
                                            return (
                                                <div
                                                    key={l.id}
                                                    onClick={() => handleConfirmAdd(l.id, true)}
                                                    style={{ padding: '0.8rem', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                >
                                                    <span style={{ fontWeight: '500' }}>{l.name}</span>
                                                    {l.details && <span style={{ fontSize: '0.8rem', color: '#aaa', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.details}</span>}
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            style={{ marginTop: '1rem', padding: '0.5rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer', alignSelf: 'center' }}
                        >
                            取消
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ItineraryPage() {
    return (
        <Suspense fallback={<div className="container" style={{ textAlign: 'center', marginTop: '2rem' }}><Loader2 className="spin" /> 載入中...</div>}>
            <ItineraryContent />
        </Suspense>
    );
}
