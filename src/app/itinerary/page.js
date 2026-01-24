"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapPin, Edit2, Copy, Map, X, Info, Trash2, Plus, GripVertical, Loader2, FileText, ExternalLink, CloudRain } from 'lucide-react';
import { useTrip } from '@/context/TripContext';
import { supabase } from '@/lib/supabase';
import { ITINERARY } from '@/lib/data';
import styles from './page.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import WeatherBadge from '@/components/WeatherBadge';
import { fetchOkinawaWeather } from '@/lib/weather';
import { fetchPlaceDetails } from '@/lib/gemini';

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
function SortableLocationItem({ loc, isEditMode, openModal, handleRename, handleDelete }) {
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
        // Remove touchAction: 'none' here to allow scrolling on the item body
        listStyle: 'none',
    };

    return (
        <motion.li
            ref={setNodeRef}
            style={style}
            className={styles.locationItem}
            onClick={() => openModal(loc)}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
        >
            {isEditMode && (
                <div
                    className={styles.reorderControls}
                    {...attributes}
                    {...listeners}
                    style={{ cursor: 'grab', display: 'flex', alignItems: 'center', padding: '0 8px 0 0', touchAction: 'none' }}
                >
                    <GripVertical size={20} color="#aaa" />
                </div>
            )}

            <div className={styles.itemContent}>
                {loc.img_url && (
                    <div className={styles.thumbnailWrapper}>
                        <img src={loc.img_url} alt={loc.name} className={styles.listThumbnail} />
                    </div>
                )}

                <div className={styles.locMain}>
                    <div className={styles.locTitleRow}>
                        {!loc.img_url && <MapPin size={18} className={styles.icon} />}
                        <span className={styles.locName}>{loc.name}</span>
                        {/* Remove Info Icon as image implies detail */}

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
            </div>
        </motion.li>
    );
}

const getWeekday = (dateStr) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        const dayIndex = date.getUTCDay();
        const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        return days[dayIndex];
    } catch (e) {
        return '';
    }
};


const linkifyText = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
        if (part.match(urlRegex)) {
            return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>{part}</a>;
        }
        return part;
    });
};

function ItineraryContent() {
    const { isEditMode } = useTrip();
    const searchParams = useSearchParams();
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLoc, setSelectedLoc] = useState(null);
    const [weatherData, setWeatherData] = useState({});
    const [activeDayIndex, setActiveDayIndex] = useState(0);
    const timelineRef = React.useRef(null);
    const dayRefs = React.useRef([]);
    const navContainerRef = React.useRef(null);

    // Auto-scroll Nav Bar to keep active day centered
    useEffect(() => {
        if (navContainerRef.current && typeof activeDayIndex === 'number') {
            const container = navContainerRef.current;
            const activeItem = container.children[activeDayIndex];

            if (activeItem) {
                // Use scrollIntoView with inline: 'center' for robust horizontal centering
                activeItem.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [activeDayIndex, schedule]);

    // Custom Draggable Scroll Implementation
    useEffect(() => {
        const slider = timelineRef.current;
        if (!slider) return;

        let isDown = false;
        let startX;
        let scrollLeft;
        let isDragging = false;

        const onMouseDown = (e) => {
            isDown = true;
            isDragging = false;
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
            slider.style.cursor = 'grabbing';
        };

        const onMouseLeave = () => {
            isDown = false;
            slider.style.cursor = 'grab';
        };

        const onMouseUp = () => {
            isDown = false;
            slider.style.cursor = 'grab';
            // Do NOT reset isDragging here. It must persist until the click event fires (or next mousedown).
        };

        const onMouseMove = (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX); // 1:1 movement feels more natural for direct manipulation

            // Only consider it a drag if moved more than 6 pixels
            if (Math.abs(walk) > 6) {
                isDragging = true;
                slider.scrollLeft = scrollLeft - walk * 1.5; // Slight multiplication for comfortable flick
            }
        };

        // Capture click to prevent it if we were dragging
        const onClickCapture = (e) => {
            if (isDragging) {
                e.preventDefault();
                e.stopPropagation();
                // Optional: reset isDragging here if we want, but resetting on mousedown is safer for edge cases
            }
        };

        slider.addEventListener('mousedown', onMouseDown);
        slider.addEventListener('mouseleave', onMouseLeave);
        slider.addEventListener('mouseup', onMouseUp);
        slider.addEventListener('mousemove', onMouseMove);
        slider.addEventListener('click', onClickCapture, true); // Capture phase

        slider.style.cursor = 'grab';

        return () => {
            slider.removeEventListener('mousedown', onMouseDown);
            slider.removeEventListener('mouseleave', onMouseLeave);
            slider.removeEventListener('mouseup', onMouseUp);
            slider.removeEventListener('mousemove', onMouseMove);
            slider.removeEventListener('click', onClickCapture, true);
        };
    }, [loading]); // Re-attach when loading finishes and ref is stable

    // Reset refs when schedule changes
    useEffect(() => {
        dayRefs.current = dayRefs.current.slice(0, schedule.length);
    }, [schedule]);

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
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    // Data fetching & Subscription
    useEffect(() => {
        fetchSchedule();
        loadWeather();

        let channel;
        if (supabase) {
            channel = supabase
                .channel('itinerary_updates')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'itinerary_items' },
                    () => fetchSchedule()
                )
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'locations' },
                    () => fetchSchedule()
                )
                .subscribe();
        }

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    const loadWeather = async () => {
        const weather = await fetchOkinawaWeather();
        if (weather) setWeatherData(weather);
    };

    // Sync selectedLoc with schedule updates & Check for deep link
    useEffect(() => {
        if (selectedLoc) {
            for (const day of schedule) {
                const found = day.locations?.find(l => l.item_id === selectedLoc.item_id);
                if (found) {
                    setSelectedLoc(found);
                    break;
                }
            }
        }

        const locId = searchParams.get('loc');
        if (locId && schedule.length > 0 && !selectedLoc) {
            for (const day of schedule) {
                const found = day.locations?.find(l => l.id === locId);
                if (found) {
                    setSelectedLoc(found);
                    break;
                }
            }
        }
    }, [schedule, searchParams]);

    // Updated scroll tracker using IntersectionObserver for accuracy
    useEffect(() => {
        if (loading || schedule.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries.filter(e => e.isIntersecting);
                if (visibleEntries.length > 0) {
                    // Find the entry that's most visible
                    const mostVisible = visibleEntries.reduce((prev, current) => {
                        return (prev.intersectionRatio > current.intersectionRatio) ? prev : current;
                    });
                    const index = parseInt(mostVisible.target.getAttribute('data-index'));
                    setActiveDayIndex(index);
                }
            },
            {
                root: timelineRef.current,
                threshold: 0.6, // Must be 60% visible to count
            }
        );

        dayRefs.current.forEach(ref => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, [loading, schedule]);

    const scrollToDay = (index) => {
        const target = dayRefs.current[index];
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest'
            });
        }
    };

    const fetchSchedule = async () => {
        if (!supabase) {
            setSchedule(ITINERARY.map(d => ({
                id: d.day,
                day_number: d.day,
                date_display: d.date,
                title: d.title,
                locations: d.locations.map((loc, i) => ({
                    ...loc,
                    item_id: `static-${d.day}-${i}`,
                    sort_order: i + 1
                }))
            })));
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
                        const dbImgUrl = loc.img_url;
                        const galleryImg = (Array.isArray(loc.gallery) && loc.gallery.length > 0) ? loc.gallery[0] : null;

                        return {
                            ...loc,
                            img_url: dbImgUrl || galleryImg,
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

    const handleCopy = (e, text) => {
        e.stopPropagation();
        if (!text) return;
        navigator.clipboard.writeText(text);
        alert(`已複製地址: ${text}`);
    };

    const handleOpenMap = (e, loc) => {
        e.stopPropagation();
        const query = loc.address || loc.name;
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
        window.open(url, '_blank');
    };

    const openModal = (loc) => setSelectedLoc(loc);
    const closeModal = () => setSelectedLoc(null);

    useEffect(() => {
        if (selectedLoc || isAddModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
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

    const openAddModal = async (dayNum) => {
        setAddDayNum(dayNum);
        setIsAddModalOpen(true);
        setAddMode('new');
        if (supabase) {
            const { data } = await supabase.from('locations').select('*').order('name');
            setDbLocations(data || []);
        }
    };

    const handleConfirmAdd = async (locIdOrName, isExisting = false) => {
        if (!addDayNum) return;
        let targetLocId = locIdOrName;
        if (!isExisting) {
            const name = locIdOrName;
            if (!name) return;

            // AI Auto-Fill
            const geminiKey = localStorage.getItem('gemini_api_key');
            let aiData = {};
            if (geminiKey) {
                try {
                    // Small user feedback (non-blocking but noticeable if fast)
                    const result = await fetchPlaceDetails(name, geminiKey);
                    if (result && result.found) {
                        aiData = {
                            address: result.address,
                            details: result.details,
                            note: result.note,
                            type: result.type || 'food'
                        };
                    }
                } catch (e) {
                    console.error("AI Auto-fill failed", e);
                }
            }

            const locRes = await supabase
                .from('locations')
                .insert({
                    id: crypto.randomUUID(),
                    name: name,
                    ...aiData
                })
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

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const activeDay = schedule.find(day => day.locations.find(l => l.item_id === active.id));
        const overDay = schedule.find(day => day.locations.find(l => l.item_id === over.id));
        if (!activeDay || !overDay || activeDay.id !== overDay.id) return;

        const oldIndex = activeDay.locations.findIndex(l => l.item_id === active.id);
        const newIndex = overDay.locations.findIndex(l => l.item_id === over.id);
        const newLocations = arrayMove(activeDay.locations, oldIndex, newIndex);

        setSchedule(prev => prev.map(day => {
            if (day.id === activeDay.id) return { ...day, locations: newLocations };
            return day;
        }));

        const updates = newLocations.map((loc, index) => ({
            id: loc.item_id,
            sort_order: index + 1
        }));
        for (const update of updates) {
            await supabase.from('itinerary_items').update({ sort_order: update.sort_order }).eq('id', update.id);
        }
    };

    if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}><Loader2 className="spin" size={32} color="var(--primary)" /> <p style={{ marginTop: '1rem', color: '#888' }}>精緻行程整理中...</p></div>;

    return (
        <div className={styles.pageWrapper}>


            {/* Horizontal Day Navigation */}
            <motion.div
                className={styles.dayNav}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
            >
                <div className={styles.navLabel}>Day</div>
                <motion.div
                    ref={navContainerRef}
                    className={styles.navContainer}
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: { staggerChildren: 0.03 }
                        }
                    }}
                >
                    {schedule.map((day, idx) => (
                        <motion.div
                            key={day.id}
                            variants={{
                                hidden: { opacity: 0, scale: 0.8, y: 10 },
                                visible: { opacity: 1, scale: 1, y: 0 }
                            }}
                            className={`${styles.navItem} ${activeDayIndex === idx ? styles.navItemActive : ''}`}
                            onClick={() => scrollToDay(idx)}
                            whileTap={{ scale: 0.9 }}
                        >
                            <span className={styles.navNumber} style={{ position: 'relative', zIndex: 10 }}>
                                {day.day_number}
                            </span>
                            {activeDayIndex === idx && (
                                <motion.div
                                    layoutId="navIndicator"
                                    className={styles.navIndicator}
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                />
                            )}
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div
                    className={styles.timeline}
                    ref={timelineRef}
                >
                    {!supabase && (
                        <div className="card" style={{ border: '1px solid #fee2e2', background: '#fff' }}>
                            <p style={{ fontWeight: 'bold', color: '#ef4444' }}>⚠️ 資料庫連結失敗</p>
                            <p className="text-sm text-muted">目前處於展示模式。</p>
                        </div>
                    )}

                    {schedule.map((dayItem, index) => (
                        <motion.div
                            key={dayItem.id}
                            ref={el => dayRefs.current[index] = el}
                            data-index={index}
                            className={styles.dayBlock}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true, margin: "0px" }}
                            transition={{ duration: 0.4 }}
                        >
                            <div className={styles.dateColumn}>
                                <div className={styles.dateCircle}>
                                    <span className={styles.dateLabel}>
                                        {dayItem.date_display?.slice(5, 10).replace('-', '.')}
                                    </span>
                                    <span className={styles.weekdayLabel}>{getWeekday(dayItem.date_display).slice(2)}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, justifyContent: 'center' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{dayItem.title}</h3>
                                </div>

                                <span className={styles.dayNumberLabel}>Day {dayItem.day_number}</span>

                                <div className={styles.weatherWrapper}>
                                    {(() => {
                                        const dateKey = dayItem.date_display?.replace(/\//g, '-');
                                        const weather = weatherData[dateKey];
                                        return weather ? (
                                            <WeatherBadge
                                                code={weather.code}
                                                maxTemp={weather.max}
                                                minTemp={weather.min}
                                            />
                                        ) : (
                                            <div className={styles.weatherPlaceholder} title="氣象預報僅提供未來 16 天內的資訊">
                                                <CloudRain size={12} />
                                                <span>待更新</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className={styles.contentColumn}>
                                {isEditMode && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
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
                                    </div>
                                )}

                                <SortableContext
                                    items={dayItem.locations.map(l => l.item_id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <ul className={styles.locationList}>
                                        <AnimatePresence mode='popLayout'>
                                            {dayItem.locations.map((loc) => (
                                                <SortableLocationItem
                                                    key={loc.item_id}
                                                    loc={loc}
                                                    isEditMode={isEditMode}
                                                    openModal={openModal}
                                                    handleRename={handleRename}
                                                    handleDelete={handleDelete}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </ul>
                                </SortableContext>

                                {isEditMode && (
                                    <button className={styles.addBtn} onClick={() => openAddModal(dayItem.day_number)}>
                                        <Plus size={16} /> 增加景點
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </DndContext>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedLoc && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeModal}
                    >
                        <motion.div
                            className={styles.modalContent}
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className={styles.topActions}>
                                <button
                                    onClick={() => window.location.href = `/itinerary/edit/${selectedLoc.item_id}`}
                                    className={styles.iconBtn}
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button className={styles.iconBtn} onClick={closeModal}>
                                    <X size={24} />
                                </button>
                            </div>

                            {(selectedLoc.img_url || (selectedLoc.gallery && selectedLoc.gallery.length > 0)) && (
                                <div className={styles.modalImage}>
                                    {(() => {
                                        const allImages = [];
                                        if (selectedLoc.img_url) allImages.push(selectedLoc.img_url);
                                        if (selectedLoc.gallery && Array.isArray(selectedLoc.gallery)) {
                                            selectedLoc.gallery.forEach(url => {
                                                if (url && url !== selectedLoc.img_url) allImages.push(url);
                                            });
                                        }
                                        const uniqueImages = [...new Set(allImages)];
                                        if (uniqueImages.length === 0) return null;
                                        return (
                                            <div className={styles.imageScrollContainer}>
                                                {uniqueImages.map((url, idx) => (
                                                    <img
                                                        key={idx}
                                                        src={url}
                                                        alt={`${selectedLoc.name}`}
                                                        className={styles.scrollImage}
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <h3>{selectedLoc.name}</h3>
                                    {selectedLoc.type && selectedLoc.type !== 'spot' && (
                                        <span className="text-xs" style={{ background: 'var(--color-sea-light)', padding: '2px 8px', borderRadius: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>
                                            {{ food: '食', stay: '住', fun: '樂', shop: '買', transport: '行' }[selectedLoc.type] || selectedLoc.type}
                                        </span>
                                    )}
                                </div>

                                {selectedLoc.note && <div className={styles.modalNote}><strong>重點：</strong> {linkifyText(selectedLoc.note)}</div>}
                                {selectedLoc.details && <div className={styles.modalDesc}><p>{linkifyText(selectedLoc.details)}</p></div>}
                                {selectedLoc.address && <div className={styles.modalAddress}><MapPin size={16} /> <span>{selectedLoc.address}</span></div>}

                                <div className={styles.modalActions}>
                                    {selectedLoc.address && (
                                        <>
                                            <button onClick={(e) => handleCopy(e, selectedLoc.address)} className={styles.actionBtn}><Copy size={16} /> 複製地址</button>
                                            <button onClick={(e) => handleOpenMap(e, selectedLoc)} className={styles.actionBtn}><Map size={16} /> 地圖</button>
                                        </>
                                    )}
                                    {selectedLoc.type === 'stay' && selectedLoc.hotel_id && (
                                        <button onClick={() => window.location.href = `/accommodation#${selectedLoc.hotel_id}`} className={styles.actionBtn} style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none' }}><ExternalLink size={16} /> 房間分配</button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isAddModalOpen && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsAddModalOpen(false)}
                    >
                        <motion.div
                            className={styles.modalContent}
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            style={{ padding: '2rem' }}
                        >
                            <h3 style={{ marginBottom: '1.5rem' }}>增加景點 (Day {addDayNum})</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <button
                                    onClick={() => setAddMode('new')}
                                    className={styles.actionBtn}
                                    style={addMode === 'new' ? { background: 'var(--primary)', color: 'white' } : {}}
                                >新增地點</button>
                                <button
                                    onClick={() => setAddMode('db')}
                                    className={styles.actionBtn}
                                    style={addMode === 'db' ? { background: 'var(--primary)', color: 'white' } : {}}
                                >現有地點</button>
                            </div>

                            {addMode === 'new' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <input
                                        type="text"
                                        placeholder="輸入景點名稱"
                                        className="card"
                                        id="newSpotInput"
                                        style={{ width: '100%', padding: '0.8rem', marginBottom: 0 }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleConfirmAdd(e.target.value, false)}
                                    />
                                    <button className="btn btn-primary" onClick={() => handleConfirmAdd(document.getElementById('newSpotInput').value, false)}>確認增加</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        placeholder="搜尋..."
                                        className="card"
                                        style={{ width: '100%', padding: '0.8rem', marginBottom: '0.5rem' }}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                        {dbLocations
                                            .filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map(l => (
                                                <div
                                                    key={l.id}
                                                    className={styles.locationItem}
                                                    onClick={() => handleConfirmAdd(l.id, true)}
                                                    style={{ marginBottom: '2px', padding: '0.5rem' }}
                                                >
                                                    {l.name}
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function ItineraryPage() {
    return (
        <Suspense fallback={<div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}><Loader2 className="spin" /> 載入中...</div>}>
            <ItineraryContent />
        </Suspense>
    );
}
