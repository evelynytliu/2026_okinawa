
"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const TripContext = createContext();

export const TripProvider = ({ children }) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [jpyRate, setJpyRate] = useState(0.211); // Fallback default

    useEffect(() => {
        fetchSettings();

        let channel;
        if (supabase) {
            channel = supabase
                .channel('settings_updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => fetchSettings())
                .subscribe();
        }
        return () => { if (channel) supabase.removeChannel(channel); };
    }, []);

    const fetchSettings = async () => {
        if (!supabase) return;
        const { data, error } = await supabase
            .from('app_settings')
            .select('*')
            .eq('key', 'jpy_rate')
            .single();

        if (data && data.value) {
            setJpyRate(Number(data.value));
        }
    };

    const updateJpyRate = async (newRate) => {
        setJpyRate(newRate);
        if (!supabase) return;

        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'jpy_rate', value: newRate });

        if (error) console.error('Error updating JPY rate:', error);
    };

    // Toggle for Edit Mode (to prevent accidental touches)
    const toggleEditMode = () => setIsEditMode(prev => !prev);

    return (
        <TripContext.Provider value={{ isEditMode, toggleEditMode, jpyRate, updateJpyRate }}>
            {children}
        </TripContext.Provider>
    );
};

export const useTrip = () => useContext(TripContext);
