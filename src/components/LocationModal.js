'use client';
import { useRouter } from 'next/navigation';
import { X, Edit2, Copy, Map, MapPin, Heart, Utensils, ExternalLink } from 'lucide-react';
import styles from './LocationModal.module.css';

/**
 * LocationModal - A reusable modal component for displaying location/restaurant details
 * 
 * Props:
 * @param {Object} location - The location/restaurant data object
 * @param {Function} onClose - Callback when modal is closed
 * @param {Function} onAddWish - Optional callback for adding to wishlist
 * @param {boolean} showEditButton - Whether to show the edit button (default: true if location.id exists)
 * @param {string} editPath - Custom edit path (default: /itinerary/edit/[id])
 */
export default function LocationModal({
    location,
    onClose,
    onAddWish,
    showEditButton = true,
    editPath
}) {
    const router = useRouter();

    if (!location) return null;

    // Determine type badge
    const getTypeBadge = () => {
        const type = location.type || 'food';
        const typeLabels = {
            food: { label: '食', className: styles.typeBadgeFood },
            restaurant: { label: '食', className: styles.typeBadgeFood },
            cafe: { label: '食', className: styles.typeBadgeFood },
            bar: { label: '食', className: styles.typeBadgeFood },
            dessert: { label: '食', className: styles.typeBadgeFood },
            stay: { label: '住', className: styles.typeBadgeStay },
            spot: { label: '遊', className: styles.typeBadgeSpot },
            fun: { label: '樂', className: styles.typeBadgeFun },
            shop: { label: '買', className: styles.typeBadgeShop },
        };
        return typeLabels[type] || { label: type, className: styles.typeBadgeSpot };
    };

    // Handle copy address
    const handleCopyAddress = async (e) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(location.address);
            alert('地址已複製！');
        } catch {
            alert('複製失敗');
        }
    };

    // Handle open map
    const handleOpenMap = (e) => {
        e.stopPropagation();
        let url;
        if (location.lat && location.lng) {
            url = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
        } else if (location.address) {
            url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`;
        } else {
            url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.name)}`;
        }
        window.open(url, '_blank');
    };

    // Handle edit
    const handleEdit = () => {
        const path = editPath || `/itinerary/edit/${location.id || location.item_id}`;
        router.push(path);
    };

    // Get all images
    const getImages = () => {
        const images = [];
        if (location.img_url) images.push(location.img_url);
        if (location.gallery && Array.isArray(location.gallery)) {
            location.gallery.forEach(url => {
                if (url && url !== location.img_url) images.push(url);
            });
        }
        return [...new Set(images)];
    };

    const typeBadge = getTypeBadge();
    const images = getImages();
    const canEdit = showEditButton && (location.id || location.item_id || location.isCustom);

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                {/* Top Action Buttons */}
                <div className={styles.topActions}>
                    {canEdit && (
                        <button onClick={handleEdit} className={styles.iconBtn} title="編輯">
                            <Edit2 size={20} />
                        </button>
                    )}
                    <button className={styles.iconBtn} onClick={onClose} title="關閉">
                        <X size={24} />
                    </button>
                </div>

                {/* Image Section */}
                {images.length > 0 && (
                    <div className={styles.imageSection}>
                        {images.length === 1 ? (
                            <img src={images[0]} alt={location.name} className={styles.modalImage} />
                        ) : (
                            <div className={styles.imageScrollContainer}>
                                {images.map((url, idx) => (
                                    <img key={idx} src={url} alt={location.name} className={styles.scrollImage} />
                                ))}
                                <div className={styles.scrollBadge}>{images.length} 張照片</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className={styles.modalBody}>
                    {/* Title Row */}
                    <div className={styles.titleRow}>
                        <h3 className={styles.modalTitle}>{location.name}</h3>
                        <span className={`${styles.typeBadge} ${typeBadge.className}`}>
                            {typeBadge.label}
                        </span>
                    </div>

                    {/* Note (if exists) */}
                    {location.note && (
                        <div className={styles.section}>
                            <span className={styles.sectionLabel}>重點</span>
                            <p className={styles.noteText}>{location.note}</p>
                        </div>
                    )}

                    {/* Intro/Details */}
                    {(location.intro || location.details) && (
                        <div className={styles.section}>
                            <span className={styles.sectionLabel}>簡介</span>
                            <p className={styles.sectionText}>{location.intro || location.details}</p>
                        </div>
                    )}

                    {/* Dishes (for restaurants) */}
                    {location.dishes && (
                        <div className={styles.section}>
                            <span className={styles.sectionLabel}>推薦餐點</span>
                            <p className={styles.dishesText}>
                                <Utensils size={14} />
                                {location.dishes}
                            </p>
                        </div>
                    )}

                    {/* Address */}
                    {location.address && (
                        <div className={styles.section}>
                            <span className={styles.sectionLabel}>地址</span>
                            <div className={styles.addressRow}>
                                <MapPin size={16} className={styles.addressIcon} />
                                <span>{location.address}</span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className={styles.actions}>
                        {location.address && (
                            <>
                                <button onClick={handleCopyAddress} className={styles.actionBtn}>
                                    <Copy size={16} /> 複製地址
                                </button>
                                <button onClick={handleOpenMap} className={styles.actionBtn}>
                                    <Map size={16} /> 地圖
                                </button>
                            </>
                        )}

                        {/* Add to Wishlist (only for non-custom items) */}
                        {onAddWish && !location.isCustom && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddWish(e, location); onClose(); }}
                                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                            >
                                <Heart size={16} /> 加入許願池
                            </button>
                        )}

                        {/* Hotel Link (for stay type) */}
                        {location.type === 'stay' && location.hotel_id && (
                            <button
                                onClick={() => router.push(`/accommodation#${location.hotel_id}`)}
                                className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                            >
                                <ExternalLink size={16} /> 房間分配
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
