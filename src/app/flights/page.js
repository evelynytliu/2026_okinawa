
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, Plane, Loader2, Pencil, X, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTrip } from '@/context/TripContext';
import UniversalModal from '@/components/ui/UniversalModal';
import SecureImage from '@/components/ui/SecureImage';
import styles from './page.module.css';

// Utility: Convert URLs in text to clickable links
const linkifyText = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#3b82f6', textDecoration: 'underline', wordBreak: 'break-all' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
};

export default function FlightsPage() {
    const router = useRouter();
    const { members, families } = useTrip();
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedGroupIds, setSelectedGroupIds] = useState([]); // For editing
    const [viewingFlight, setViewingFlight] = useState(null);

    // Filter state
    const [filterGroupIds, setFilterGroupIds] = useState([]); // Empty = show all
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    // Form
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        img_urls: [],
        group_ids: []
    });

    // Construct groups from families
    const analysisGroups = useMemo(() => {
        let groups = [
            {
                id: '_general',
                name: '共用',
                members: [],
                color: '#6366f1'
            }
        ];
        families.forEach(f => {
            if (f.id === 'individuals') {
                f.members.forEach(mid => {
                    const mName = members[mid]?.name || mid;
                    groups.push({
                        id: 'g_' + mid,
                        name: mName,
                        members: [mid],
                        color: f.color
                    });
                });
            } else {
                groups.push({
                    id: f.id,
                    name: f.name,
                    members: f.members,
                    color: f.color
                });
            }
        });
        return groups;
    }, [families, members]);

    // Helper: Get group info by id
    const getGroupById = (id) => analysisGroups.find(g => g.id === id);

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
        } finally {
            setLoading(false);
        }
    };

    // Filter flights based on selected filter tags
    const filteredFlights = useMemo(() => {
        if (filterGroupIds.length === 0) return flights; // No filter = show all

        return flights.filter(f => {
            const gids = f.group_ids || (f.group_id ? [f.group_id] : []);
            // Show if any of the filter tags match
            return filterGroupIds.some(fid => gids.includes(fid));
        });
    }, [flights, filterGroupIds]);

    // --- Image Handling Helpers ---
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

    const handleModalSubmit = async (data, pendingFiles) => {
        if (!data.title) return;
        setIsSubmitting(true);

        try {
            const finalImgUrls = [];

            for (const url of data.img_urls) {
                if (url.startsWith('blob:')) {
                    const file = pendingFiles && pendingFiles[url];
                    if (file) {
                        const compressedBlob = await compressImage(file);
                        const fileName = `flight_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                        const { error } = await supabase.storage
                            .from('images')
                            .upload(fileName, compressedBlob);

                        if (error) throw error;
                        finalImgUrls.push(fileName);
                    }
                } else {
                    finalImgUrls.push(url);
                }
            }

            if (editingId) {
                const originalItem = flights.find(f => f.id === editingId);
                if (originalItem) {
                    const oldUrls = originalItem.img_urls || (originalItem.img_url ? [originalItem.img_url] : []);
                    const imagesToDelete = oldUrls.filter(url => !finalImgUrls.includes(url));

                    if (imagesToDelete.length > 0) {
                        await supabase.storage.from('images').remove(imagesToDelete);
                    }
                }
            }

            const payload = {
                title: data.title,
                content: data.content,
                img_urls: finalImgUrls,
                img_url: finalImgUrls.length > 0 ? finalImgUrls[0] : null,
                group_ids: selectedGroupIds || []
            };

            if (editingId) {
                const { error } = await supabase
                    .from('flight_info')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('flight_info')
                    .insert(payload);
                if (error) throw error;
            }

            handleCloseModal();
            fetchFlights();
        } catch (err) {
            alert(editingId ? "更新失敗: " + err.message : "新增失敗: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleView = (item) => {
        setViewingFlight(item);
    };

    const handleEdit = (item = null) => {
        if (item) {
            setEditingId(item.id);
            const gids = item.group_ids || (item.group_id ? [item.group_id] : []);
            setSelectedGroupIds(gids);

            let images = [];
            if (item.img_urls && Array.isArray(item.img_urls)) {
                images = item.img_urls;
            } else if (item.img_url) {
                images = [item.img_url];
            }

            setFormData({
                title: item.title,
                content: item.content || '',
                img_urls: images,
                group_ids: gids
            });
            setIsModalOpen(true);
        } else {
            setEditingId(null);
            setSelectedGroupIds([]);
            setFormData({ title: '', content: '', img_urls: [], group_ids: [] });
            setIsModalOpen(true);
        }
        if (viewingFlight) setViewingFlight(null);
    };

    const handleDeleteClick = async (item) => {
        if (confirm("確定要刪除這筆資料嗎？")) {
            try {
                const urlsToDelete = item.img_urls || (item.img_url ? [item.img_url] : []);
                if (urlsToDelete.length > 0) {
                    await supabase.storage.from('images').remove(urlsToDelete);
                }

                await supabase.from('flight_info').delete().eq('id', item.id);
                if (viewingFlight?.id === item.id) setViewingFlight(null);
                fetchFlights();
            } catch (err) {
                alert("刪除失敗");
            }
        }
    };

    const handleDelete = async (id = null) => {
        const targetId = id || editingId;
        if (!targetId) return;
        const item = flights.find(f => f.id === targetId);
        if (item) await handleDeleteClick(item);
        handleCloseModal();
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setSelectedGroupIds([]);
        setFormData({ title: '', content: '', img_urls: [], group_ids: [] });
    };

    // Toggle filter tag
    const toggleFilter = (groupId) => {
        if (filterGroupIds.includes(groupId)) {
            setFilterGroupIds(filterGroupIds.filter(id => id !== groupId));
        } else {
            setFilterGroupIds([...filterGroupIds, groupId]);
        }
    };

    // Clear all filters
    const clearFilters = () => {
        setFilterGroupIds([]);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => router.push('/')} className={styles.backBtn}>
                    <ArrowLeft size={24} />
                </button>
                <h2><Plane size={24} className="fly-icon" /> 班機/交通資訊</h2>
            </header>

            {/* Filter Bar */}
            <div style={{
                padding: '0.75rem 1rem',
                background: 'white',
                borderBottom: '1px solid #e2e8f0',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setShowFilterPanel(!showFilterPanel)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            border: filterGroupIds.length > 0 ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                            background: filterGroupIds.length > 0 ? '#eff6ff' : 'white',
                            color: filterGroupIds.length > 0 ? '#3b82f6' : '#64748b',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            cursor: 'pointer'
                        }}
                    >
                        <Filter size={16} />
                        篩選
                        {filterGroupIds.length > 0 && (
                            <span style={{
                                background: '#3b82f6',
                                color: 'white',
                                borderRadius: '10px',
                                padding: '0 6px',
                                fontSize: '0.75rem',
                                marginLeft: '4px'
                            }}>{filterGroupIds.length}</span>
                        )}
                    </button>

                    {/* Show active filter tags */}
                    {filterGroupIds.map(fid => {
                        const g = getGroupById(fid);
                        if (!g) return null;
                        return (
                            <span
                                key={fid}
                                onClick={() => toggleFilter(fid)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '0.35rem 0.6rem',
                                    borderRadius: '14px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    background: `${g.color}20`,
                                    color: g.color,
                                    border: `1px solid ${g.color}`,
                                    cursor: 'pointer'
                                }}
                            >
                                {g.name}
                                <X size={14} />
                            </span>
                        );
                    })}

                    {filterGroupIds.length > 0 && (
                        <button
                            onClick={clearFilters}
                            style={{
                                fontSize: '0.8rem',
                                color: '#94a3b8',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            清除全部
                        </button>
                    )}
                </div>

                {/* Filter Panel (expandable) */}
                {showFilterPanel && (
                    <div style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                    }}>
                        {analysisGroups.map(g => {
                            const isActive = filterGroupIds.includes(g.id);
                            return (
                                <button
                                    key={g.id}
                                    onClick={() => toggleFilter(g.id)}
                                    style={{
                                        padding: '0.4rem 0.75rem',
                                        borderRadius: '16px',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        border: isActive ? `2px solid ${g.color}` : '2px solid #e2e8f0',
                                        background: isActive ? `${g.color}20` : 'white',
                                        color: isActive ? g.color : '#64748b'
                                    }}
                                >
                                    {g.name}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}><Loader2 className="spin" /> 載入中...</div>
            ) : (
                <div style={{ padding: '1rem' }}>
                    {filteredFlights.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            color: '#94a3b8',
                            padding: '3rem 1rem',
                            background: 'white',
                            borderRadius: '16px'
                        }}>
                            {filterGroupIds.length > 0 ? (
                                <>找不到符合篩選條件的資料</>
                            ) : (
                                <>目前沒有資料。<br />請按右下角 <b>+</b> 新增！</>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filteredFlights.map(item => {
                                const gids = item.group_ids || (item.group_id ? [item.group_id] : []);
                                let coverImage = null;
                                if (item.img_urls && item.img_urls.length > 0) coverImage = item.img_urls[0];
                                else if (item.img_url) coverImage = item.img_url;

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleView(item)}
                                        style={{
                                            background: 'white',
                                            borderRadius: '16px',
                                            overflow: 'hidden',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s, box-shadow 0.2s'
                                        }}
                                    >
                                        {/* Card Header with Tags */}
                                        <div style={{
                                            padding: '1rem',
                                            borderBottom: coverImage ? '1px solid #f1f5f9' : 'none'
                                        }}>
                                            {/* Group Tags */}
                                            {gids.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                                                    {gids.map(gid => {
                                                        const g = getGroupById(gid);
                                                        if (!g) return null;
                                                        return (
                                                            <span
                                                                key={gid}
                                                                style={{
                                                                    padding: '0.2rem 0.5rem',
                                                                    borderRadius: '10px',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 600,
                                                                    background: `${g.color}15`,
                                                                    color: g.color,
                                                                    border: `1px solid ${g.color}40`
                                                                }}
                                                            >
                                                                {g.name}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Title */}
                                            <h3 style={{
                                                margin: 0,
                                                fontSize: '1.1rem',
                                                fontWeight: 700,
                                                color: '#1e293b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <Plane size={18} style={{ color: '#3b82f6' }} />
                                                {item.title}
                                            </h3>

                                            {/* Content Preview */}
                                            {item.content && (
                                                <p style={{
                                                    margin: '0.5rem 0 0',
                                                    fontSize: '0.9rem',
                                                    color: '#64748b',
                                                    lineHeight: 1.5,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical'
                                                }}>
                                                    {item.content}
                                                </p>
                                            )}
                                        </div>

                                        {/* Cover Image */}
                                        {coverImage && (
                                            <div style={{ position: 'relative', height: '160px', background: '#f1f5f9' }}>
                                                <SecureImage
                                                    path={coverImage}
                                                    alt={item.title}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                                                />
                                                {item.img_urls && item.img_urls.length > 1 && (
                                                    <span style={{
                                                        position: 'absolute',
                                                        bottom: '8px',
                                                        right: '8px',
                                                        background: 'rgba(0,0,0,0.6)',
                                                        color: 'white',
                                                        padding: '2px 8px',
                                                        borderRadius: '10px',
                                                        fontSize: '0.75rem'
                                                    }}>
                                                        +{item.img_urls.length - 1}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* FAB */}
            <button className={styles.fab} onClick={() => handleEdit(null)}>
                <Plus size={32} />
            </button>

            {/* View Modal */}
            {viewingFlight && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s'
                }} onClick={() => setViewingFlight(null)}>
                    <div style={{
                        background: 'white', width: '100%', maxWidth: '600px', maxHeight: '85vh',
                        borderRadius: '20px', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative'
                    }} onClick={e => e.stopPropagation()}>

                        {/* Top Actions */}
                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', zIndex: 20 }}>
                            <button onClick={() => handleEdit(viewingFlight)} title="編輯" style={{
                                background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '36px', height: '36px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: '#475569', backdropFilter: 'blur(4px)'
                            }}>
                                <Pencil size={20} />
                            </button>
                            <button onClick={() => handleDeleteClick(viewingFlight)} title="刪除" style={{
                                background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '36px', height: '36px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: '#475569', backdropFilter: 'blur(4px)'
                            }}>
                                <Trash2 size={20} />
                            </button>
                            <button onClick={() => setViewingFlight(null)} title="關閉" style={{
                                background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '36px', height: '36px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: '#475569', backdropFilter: 'blur(4px)'
                            }}>
                                <X size={24} />
                            </button>
                        </div>

                        {/* Images */}
                        {(() => {
                            let displayImages = [];
                            if (viewingFlight.img_urls && viewingFlight.img_urls.length > 0) displayImages = viewingFlight.img_urls;
                            else if (viewingFlight.img_url) displayImages = [viewingFlight.img_url];

                            if (displayImages.length > 0) {
                                return (
                                    <div style={{ width: '100%', background: '#f1f5f9', position: 'relative' }}>
                                        {displayImages.length === 1 ? (
                                            <div style={{ width: '100%', height: '300px', background: '#000' }}>
                                                <SecureImage path={displayImages[0]} alt="Image" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            </div>
                                        ) : (
                                            <div style={{
                                                display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
                                                WebkitOverflowScrolling: 'touch', gap: '2px'
                                            }}>
                                                {displayImages.map((url, idx) => (
                                                    <div key={idx} style={{
                                                        flexShrink: 0, width: '100%', height: '300px',
                                                        scrollSnapAlign: 'center', background: '#000'
                                                    }}>
                                                        <SecureImage path={url} alt={`Image ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    </div>
                                                ))}
                                                <div style={{
                                                    position: 'absolute', bottom: '0.5rem', right: '0.5rem',
                                                    background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px',
                                                    borderRadius: '12px', fontSize: '0.75rem'
                                                }}>{displayImages.length} 張照片</div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* Content */}
                        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                            {/* Tags in View Modal */}
                            {(() => {
                                const gids = viewingFlight.group_ids || (viewingFlight.group_id ? [viewingFlight.group_id] : []);
                                if (gids.length > 0) {
                                    return (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                            {gids.map(gid => {
                                                const g = getGroupById(gid);
                                                if (!g) return null;
                                                return (
                                                    <span
                                                        key={gid}
                                                        style={{
                                                            padding: '0.25rem 0.6rem',
                                                            borderRadius: '12px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            background: `${g.color}15`,
                                                            color: g.color,
                                                            border: `1px solid ${g.color}40`
                                                        }}
                                                    >
                                                        {g.name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            <h3 style={{
                                fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b'
                            }}>{viewingFlight.title}</h3>
                            <div style={{
                                fontSize: '1rem', lineHeight: '1.8', color: '#334155', whiteSpace: 'pre-wrap'
                            }}>
                                {linkifyText(viewingFlight.content)}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            <UniversalModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingId ? '編輯資訊' : '新增資訊'}
                initialData={formData}
                onSubmit={handleModalSubmit}
                isSubmitting={isSubmitting}
                showDelete={!!editingId}
                onDelete={() => handleDelete(editingId)}
                groupOptions={analysisGroups}
                selectedGroupId={selectedGroupIds}
                onGroupChange={setSelectedGroupIds}
            />
        </div>
    );
}
