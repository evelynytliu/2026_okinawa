"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const SecureImage = ({ path, alt = "Image", style = {}, className = "" }) => {
    const [src, setSrc] = useState(null);
    const [isZoomed, setIsZoomed] = useState(false);

    useEffect(() => {
        if (!path) return;
        // If it's a full URL (http) or a local blob (blob:), or data URI, use it directly
        if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) {
            setSrc(path);
            return;
        }

        // Otherwise treat as a storage path and get a signed URL
        const fetchSignedUrl = async () => {
            if (!supabase) return;
            const { data, error } = await supabase.storage
                .from('images')
                .createSignedUrl(path, 60 * 60); // 1 hour validity

            if (data?.signedUrl) {
                setSrc(data.signedUrl);
            }
        };
        fetchSignedUrl();
    }, [path]);

    if (!src) return <div style={{ width: '100%', height: '100%', minHeight: '150px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }} className={className}><Loader2 className="animate-spin" size={20} color="#ccc" /></div>;

    return (
        <>
            <img
                src={src}
                alt={alt}
                className={className}
                style={{ cursor: 'zoom-in', ...style }}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsZoomed(true);
                }}
            />
            {isZoomed && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.95)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'zoom-out',
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsZoomed(false);
                    }}
                >
                    <img
                        src={src}
                        alt={alt}
                        style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                    />
                </div>
            )}
        </>
    );
};

export default SecureImage;
