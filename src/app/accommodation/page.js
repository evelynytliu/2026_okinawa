"use client";
import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Hotel, MapPin, ExternalLink, Bed } from 'lucide-react';
import { ACCOMMODATION, MEMBERS } from '@/lib/data';
import styles from './page.module.css';

export default function AccommodationPage() {
    return (
        <div className="container">
            <header className={styles.header}>
                <Link href="/" className={styles.backBtn}>
                    <ChevronLeft size={24} />
                </Link>
                <h2>住宿與房型分配</h2>
            </header>

            <div className={styles.list}>
                {ACCOMMODATION.map(hotel => (
                    <div key={hotel.id} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.hotelInfo}>
                                <h3>{hotel.name}</h3>
                                <p className={styles.dates}>{hotel.dates} ({hotel.location})</p>
                                <p className={styles.address}>
                                    <MapPin size={14} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                                    {hotel.address}
                                </p>
                            </div>
                            <a href={hotel.mapUrl} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>
                                <ExternalLink size={18} />
                            </a>
                        </div>

                        {hotel.note && (
                            <div className={styles.noteBox}>
                                <strong>入住須知：</strong> {hotel.note}
                            </div>
                        )}

                        <div className={styles.roomList}>
                            {hotel.rooms.map((room, idx) => (
                                <div key={idx} className={styles.roomItem}>
                                    <div className={styles.roomName}>
                                        <Bed size={16} />
                                        <span>{room.name}</span>
                                    </div>
                                    <div className={styles.assignees}>
                                        {room.assign.map((person, pIdx) => {
                                            // Try to map ID to name if it's an exact ID, otherwise just show the text (e.g. "婷+澈")
                                            // The data currently stores text like "婷+澈", "蕾家" or IDs. 
                                            // Let's check data.js structure. It seems ACCOMMODATION uses mixed text strings.
                                            return (
                                                <span key={pIdx} className={styles.memberTag}>
                                                    {person}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
