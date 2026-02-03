
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, Plane, Car, Image as ImageIcon, Loader2, Pencil, X, ChevronRight, Users } from 'lucide-react';
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
    const [selectedGroupId, setSelectedGroupId] = useState(null); // For adding new entry to a group
    const [viewingFlight, setViewingFlight] = useState(null);
    const [expandedGroup, setExpandedGroup] = useState(null);

    // Form
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        img_urls: [],
        group_id: null
    });

    // Construct groups from families (same logic as AnalysisDashboard)
    const analysisGroups = useMemo(() => {
        let groups = [];
        families.forEach(f => {
            if (f.id === 'individuals') {
                // Break down individuals into single-person groups
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
                // Keep families as whole groups
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

    // Group flights by group_id
    const flightsByGroup = useMemo(() => {
        const grouped = {};
        analysisGroups.forEach(g => {
            grouped[g.id] = flights.filter(f => f.group_id === g.id);
        });
        // Also include ungrouped entries
        grouped['_ungrouped'] = flights.filter(f => !f.group_id);
        return grouped;
    }, [flights, analysisGroups]);

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

            // 1. Upload new blobs
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

            // 2. Identify and Delete Unused Images (only if editing)
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

            // 3. Save to DB
            const payload = {
                title: data.title,
                content: data.content,
                img_urls: finalImgUrls,
                img_url: finalImgUrls.length > 0 ? finalImgUrls[0] : null,
                group_id: selectedGroupId || null
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

    const handleEdit = (item = null, groupId = null) => {
        if (item) {
            setEditingId(item.id);
            setSelectedGroupId(item.group_id || null);

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
                group_id: item.group_id || null
            });
            setIsModalOpen(true);
        } else {
            // New entry
            setEditingId(null);
            setSelectedGroupId(groupId);
            setFormData({ title: '', content: '', img_urls: [], group_id: groupId });
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
        setSelectedGroupId(null);
        setFormData({ title: '', content: '', img_urls: [], group_id: null });
    };

    const toggleGroup = (groupId) => {
        setExpandedGroup(expandedGroup === groupId ? null : groupId);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => router.push('/')} className={styles.backBtn}>
                    <ArrowLeft size={24} />
                </button>
                <h2><Plane size={24} className="fly-icon" /> 班機/交通資訊</h2>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}><Loader2 className="spin" /> 載入中...</div>
            ) : (
                <div style={{ padding: '1rem' }}>
                    {/* Group Cards */}
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {analysisGroups.map(group => {
                            const groupFlights = flightsByGroup[group.id] || [];
                            const isExpanded = expandedGroup === group.id;

                            return (
                                <div key={group.id} style={{
                                    background: 'white',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                    border: `3px solid ${group.color}20`
                                }}>
                                    {/* Group Header */}
                                    <div
                                        onClick={() => toggleGroup(group.id)}
                                        style={{
                                            padding: '1rem',
                                            background: `linear-gradient(135deg, ${group.color}15, ${group.color}05)`,
                                            borderLeft: `4px solid ${group.color}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Users size={20} style={{ color: group.color }} />
                                            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>{group.name}</span>
                                            <span style={{
                                                background: group.color,
                                                color: 'white',
                                                fontSize: '0.75rem',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontWeight: 600
                                            }}>{groupFlights.length} 筆</span>
                                        </div>
                                        <ChevronRight
                                            size={20}
                                            style={{
                                                color: '#94a3b8',
                                                transition: 'transform 0.2s',
                                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                                            }}
                                        />
                                    </div>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div style={{ padding: '1rem', background: '#fafafa' }}>
                                            {groupFlights.length === 0 ? (
                                                <div style={{
                                                    textAlign: 'center',
                                                    color: '#94a3b8',
                                                    padding: '2rem',
                                                    fontSize: '0.9rem'
                                                }}>
                                                    尚無資料，點擊下方按鈕新增
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    {groupFlights.map(item => {
                                                        let coverImage = null;
                                                        if (item.img_urls && item.img_urls.length > 0) coverImage = item.img_urls[0];
                                                        else if (item.img_url) coverImage = item.img_url;

                                                        return (
                                                            <div
                                                                key={item.id}
                                                                onClick={() => handleView(item)}
                                                                style={{
                                                                    background: 'white',
                                                                    borderRadius: '12px',
                                                                    padding: '1rem',
                                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    gap: '1rem',
                                                                    alignItems: 'flex-start',
                                                                    transition: 'transform 0.2s'
                                                                }}
                                                            >
                                                                {coverImage && (
                                                                    <div style={{
                                                                        width: '80px',
                                                                        height: '80px',
                                                                        borderRadius: '8px',
                                                                        overflow: 'hidden',
                                                                        flexShrink: 0
                                                                    }}>
                                                                        <SecureImage path={coverImage} alt={item.title} style={{
                                                                            width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none'
                                                                        }} />
                                                                    </div>
                                                                )}
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{
                                                                        fontWeight: 600,
                                                                        fontSize: '1rem',
                                                                        color: '#1e293b',
                                                                        marginBottom: '0.25rem',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.5rem'
                                                                    }}>
                                                                        <Plane size={16} style={{ color: group.color }} />
                                                                        {item.title}
                                                                    </div>
                                                                    {item.content && (
                                                                        <div style={{
                                                                            fontSize: '0.85rem',
                                                                            color: '#64748b',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            display: '-webkit-box',
                                                                            WebkitLineClamp: 2,
                                                                            WebkitBoxOrient: 'vertical'
                                                                        }}>
                                                                            {item.content}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Add Button for this group */}
                                            <button
                                                onClick={() => handleEdit(null, group.id)}
                                                style={{
                                                    marginTop: '1rem',
                                                    width: '100%',
                                                    padding: '0.75rem',
                                                    background: `${group.color}15`,
                                                    border: `2px dashed ${group.color}50`,
                                                    borderRadius: '12px',
                                                    color: group.color,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <Plus size={18} />
                                                新增 {group.name} 的資訊
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Ungrouped entries (if any) */}
                        {flightsByGroup['_ungrouped']?.length > 0 && (
                            <div style={{
                                background: 'white',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                border: '3px solid #e2e8f020'
                            }}>
                                <div
                                    onClick={() => toggleGroup('_ungrouped')}
                                    style={{
                                        padding: '1rem',
                                        background: '#f8fafc',
                                        borderLeft: '4px solid #94a3b8',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Plane size={20} style={{ color: '#94a3b8' }} />
                                        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#64748b' }}>未分類</span>
                                        <span style={{
                                            background: '#94a3b8',
                                            color: 'white',
                                            fontSize: '0.75rem',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontWeight: 600
                                        }}>{flightsByGroup['_ungrouped'].length} 筆</span>
                                    </div>
                                    <ChevronRight
                                        size={20}
                                        style={{
                                            color: '#94a3b8',
                                            transition: 'transform 0.2s',
                                            transform: expandedGroup === '_ungrouped' ? 'rotate(90deg)' : 'rotate(0deg)'
                                        }}
                                    />
                                </div>

                                {expandedGroup === '_ungrouped' && (
                                    <div style={{ padding: '1rem', background: '#fafafa' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {flightsByGroup['_ungrouped'].map(item => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleView(item)}
                                                    style={{
                                                        background: 'white',
                                                        borderRadius: '12px',
                                                        padding: '1rem',
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.title}</div>
                                                    {item.content && (
                                                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                                                            {item.content.substring(0, 100)}...
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                                                <SecureImage path={displayImages[0]} alt="Flight Image" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                selectedGroupId={selectedGroupId}
                onGroupChange={setSelectedGroupId}
            />
        </div>
    );
}
