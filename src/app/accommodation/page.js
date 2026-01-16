"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Hotel, MapPin, ExternalLink, Bed, Edit2, Save, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { ACCOMMODATION } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

export default function AccommodationPage() {
    const [hotels, setHotels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchAccommodations();

        // Real-time subscription
        const channel = supabase
            .channel('accommodations_updates')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'accommodations' },
                () => fetchAccommodations()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchAccommodations = async () => {
        try {
            const { data, error } = await supabase
                .from('accommodations')
                .select('*')
                .order('id');

            if (error) {
                // If table doesn't exist, we might get an error. Fallback to local data.
                console.error("Error fetching accommodations:", error);
                setHotels(ACCOMMODATION);
                return;
            }

            if (data && data.length > 0) {
                // Ensure room assign arrays exist
                const sanitized = data.map(h => ({
                    ...h,
                    rooms: (h.rooms || []).map(r => ({ ...r, assign: r.assign || [] }))
                }));
                setHotels(sanitized);
            } else {
                // Initial Seed
                await seedDatabase();
            }
        } catch (err) {
            console.error("Unexpected error:", err);
            setHotels(ACCOMMODATION);
        } finally {
            setLoading(false);
        }
    };

    const seedDatabase = async () => {
        const seedData = ACCOMMODATION.map(h => ({
            id: h.id,
            name: h.name,
            img_url: h.img_url,
            dates: h.dates,
            location: h.location,
            address: h.address,
            map_url: h.mapUrl,
            note: h.note,
            rooms: h.rooms
        }));

        const { data, error } = await supabase.from('accommodations').insert(seedData).select();
        if (!error && data) {
            setHotels(data);
        } else {
            console.warn("Seeding failed (table might be missing):", error);
            setHotels(ACCOMMODATION);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            for (const hotel of hotels) {
                const { error } = await supabase
                    .from('accommodations')
                    .upsert({
                        id: hotel.id,
                        name: hotel.name,
                        img_url: hotel.img_url,
                        dates: hotel.dates,
                        location: hotel.location,
                        address: hotel.address,
                        map_url: hotel.map_url || hotel.mapUrl,
                        note: hotel.note,
                        rooms: hotel.rooms
                    });
                if (error) throw error;
            }
            setIsEditMode(false);
            alert('儲存成功！');
        } catch (err) {
            console.error("Save failed:", err);
            alert('儲存失敗：請確認資料庫已建立 `accommodations` 表格。\n\n錯誤訊息: ' + (err.message || '未知錯誤'));
        } finally {
            setSaving(false);
        }
    };

    // --- Edit Handlers ---
    const updateHotel = (id, field, value) => {
        setHotels(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
    };

    const updateRoom = (hotelId, roomIdx, field, value) => {
        setHotels(prev => prev.map(h => {
            if (h.id !== hotelId) return h;
            const newRooms = [...h.rooms];
            newRooms[roomIdx] = { ...newRooms[roomIdx], [field]: value };
            return { ...h, rooms: newRooms };
        }));
    };

    const updateAssign = (hotelId, roomIdx, assignIdx, value) => {
        setHotels(prev => prev.map(h => {
            if (h.id !== hotelId) return h;
            const newRooms = [...h.rooms];
            const newAssign = [...newRooms[roomIdx].assign];
            newAssign[assignIdx] = value;
            newRooms[roomIdx] = { ...newRooms[roomIdx], assign: newAssign };
            return { ...h, rooms: newRooms };
        }));
    };

    const addAssignee = (hotelId, roomIdx) => {
        setHotels(prev => prev.map(h => {
            if (h.id !== hotelId) return h;
            const newRooms = [...h.rooms];
            newRooms[roomIdx] = { ...newRooms[roomIdx], assign: [...newRooms[roomIdx].assign, ""] };
            return { ...h, rooms: newRooms };
        }));
    };

    const removeAssignee = (hotelId, roomIdx, assignIdx) => {
        setHotels(prev => prev.map(h => {
            if (h.id !== hotelId) return h;
            const newRooms = [...h.rooms];
            const newAssign = newRooms[roomIdx].assign.filter((_, i) => i !== assignIdx);
            newRooms[roomIdx] = { ...newRooms[roomIdx], assign: newAssign };
            return { ...h, rooms: newRooms };
        }));
    };

    const addRoom = (hotelId) => {
        setHotels(prev => prev.map(h => {
            if (h.id !== hotelId) return h;
            return { ...h, rooms: [...h.rooms, { name: "新房間", assign: [] }] };
        }));
    };

    const removeRoom = (hotelId, roomIdx) => {
        if (!confirm('確定刪除此房間?')) return;
        setHotels(prev => prev.map(h => {
            if (h.id !== hotelId) return h;
            return { ...h, rooms: h.rooms.filter((_, i) => i !== roomIdx) };
        }));
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container">
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn}>
                    <ChevronLeft size={24} />
                </Link>
                <div style={{ flex: 1 }}>
                    <h2>住宿與房型分配</h2>
                </div>
                <button
                    onClick={() => isEditMode ? handleSave() : setIsEditMode(true)}
                    className={styles.editToggleBtn}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        backgroundColor: isEditMode ? 'var(--primary, #0070f3)' : '#f0f0f0',
                        color: isEditMode ? 'white' : '#333',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : (isEditMode ? <Save size={16} /> : <Edit2 size={16} />)}
                    {isEditMode ? '儲存' : '編輯'}
                </button>
            </header>

            <div className={styles.list}>
                {hotels.map(hotel => (
                    <div key={hotel.id} id={hotel.id} className={styles.card}>
                        {hotel.img_url && (
                            <img src={hotel.img_url} alt={hotel.name} className={styles.hotelImage} />
                        )}

                        <div className={styles.cardHeader}>
                            <div className={styles.hotelInfo} style={{ width: '100%' }}>
                                {isEditMode ? (
                                    <input
                                        className={styles.inputTitle}
                                        value={hotel.name}
                                        onChange={e => updateHotel(hotel.id, 'name', e.target.value)}
                                        style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '100%', marginBottom: '4px', padding: '4px' }}
                                    />
                                ) : (
                                    <h3>{hotel.name}</h3>
                                )}

                                {isEditMode ? (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            value={hotel.dates}
                                            onChange={e => updateHotel(hotel.id, 'dates', e.target.value)}
                                            style={{ flex: 1, padding: '4px' }}
                                        />
                                        <input
                                            value={hotel.location}
                                            onChange={e => updateHotel(hotel.id, 'location', e.target.value)}
                                            style={{ width: '80px', padding: '4px' }}
                                        />
                                    </div>
                                ) : (
                                    <p className={styles.dates}>{hotel.dates} ({hotel.location})</p>
                                )}

                                <p className={styles.address}>
                                    <MapPin size={14} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                                    {isEditMode ? (
                                        <input
                                            value={hotel.address}
                                            onChange={e => updateHotel(hotel.id, 'address', e.target.value)}
                                            style={{ width: '90%', padding: '2px' }}
                                        />
                                    ) : (
                                        hotel.address
                                    )}
                                </p>
                            </div>
                            {!isEditMode && (
                                <a href={hotel.map_url || hotel.mapUrl} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>
                                    <ExternalLink size={18} />
                                </a>
                            )}
                        </div>

                        <div className={styles.noteBox} style={{ background: isEditMode ? '#fff' : undefined }}>
                            {isEditMode ? (
                                <textarea
                                    value={hotel.note || ''}
                                    onChange={e => updateHotel(hotel.id, 'note', e.target.value)}
                                    placeholder="入住須知..."
                                    style={{ width: '100%', border: '1px solid #ddd', padding: '8px', borderRadius: '8px' }}
                                />
                            ) : (
                                hotel.note && (
                                    <div><strong>入住須知：</strong> {hotel.note}</div>
                                )
                            )}
                        </div>

                        <div className={styles.roomList}>
                            {hotel.rooms.map((room, idx) => (
                                <div key={idx} className={styles.roomItem}>
                                    <div className={styles.roomName} style={{ alignItems: 'center' }}>
                                        <Bed size={16} />
                                        {isEditMode ? (
                                            <input
                                                value={room.name}
                                                onChange={e => updateRoom(hotel.id, idx, 'name', e.target.value)}
                                                style={{ marginLeft: '6px', padding: '4px', width: '100%', border: '1px solid #eee', borderRadius: '4px' }}
                                            />
                                        ) : (
                                            <span>{room.name}</span>
                                        )}
                                        {isEditMode && (
                                            <button onClick={() => removeRoom(hotel.id, idx)} style={{ color: '#ff4d4f', border: 'none', background: 'none', marginLeft: 'auto', cursor: 'pointer' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <div className={styles.assignees} style={{ flexWrap: 'wrap' }}>
                                        {room.assign.map((person, pIdx) => (
                                            <div key={pIdx} style={{ position: 'relative' }}>
                                                {isEditMode ? (
                                                    <input
                                                        value={person}
                                                        onChange={e => updateAssign(hotel.id, idx, pIdx, e.target.value)}
                                                        style={{
                                                            width: '60px',
                                                            padding: '4px',
                                                            borderRadius: '12px',
                                                            border: '1px solid #ccc',
                                                            textAlign: 'center',
                                                            fontSize: '0.85rem'
                                                        }}
                                                    />
                                                ) : (
                                                    <span className={styles.memberTag}>
                                                        {person}
                                                    </span>
                                                )}
                                                {isEditMode && (
                                                    <button
                                                        onClick={() => removeAssignee(hotel.id, idx, pIdx)}
                                                        style={{
                                                            position: 'absolute',
                                                            top: -5,
                                                            right: -5,
                                                            background: '#ff4d4f',
                                                            color: 'white',
                                                            borderRadius: '50%',
                                                            width: '14px',
                                                            height: '14px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontSize: '10px'
                                                        }}
                                                    >
                                                        X
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {isEditMode && (
                                            <button
                                                onClick={() => addAssignee(hotel.id, idx)}
                                                style={{
                                                    background: '#f0f0f0',
                                                    border: '1px dashed #ccc',
                                                    borderRadius: '12px',
                                                    padding: '2px 8px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    color: '#666'
                                                }}
                                            >
                                                +
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isEditMode && (
                                <button
                                    onClick={() => addRoom(hotel.id)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '2px dashed #eee',
                                        borderRadius: '8px',
                                        background: 'none',
                                        color: '#888',
                                        cursor: 'pointer',
                                        marginTop: '8px'
                                    }}
                                >
                                    + 新增房間
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
