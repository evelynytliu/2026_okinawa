
"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MEMBERS as DEFAULT_MEMBERS, FAMILIES as DEFAULT_FAMILIES } from '@/lib/data';

const TripContext = createContext();

export const TripProvider = ({ children }) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [jpyRate, setJpyRate] = useState(0.211);

    // Dynamic Members Logic
    const [members, setMembers] = useState(DEFAULT_MEMBERS);
    const [families, setFamilies] = useState(DEFAULT_FAMILIES);

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

        // Fetch all settings at once
        const { data, error } = await supabase
            .from('app_settings')
            .select('*');

        if (data) {
            const rate = data.find(r => r.key === 'jpy_rate');
            if (rate && rate.value) setJpyRate(Number(rate.value));

            const memConfig = data.find(r => r.key === 'members_config');
            if (memConfig && memConfig.value) {
                try {
                    // Expect value to be JSON string or object depending on column type
                    // If it's stored as text, parse it. If JSONB, it's already object.
                    // Assuming 'value' column is text based on previous usage (jpy_rate was number but likely stored as text)
                    const config = typeof memConfig.value === 'string' ? JSON.parse(memConfig.value) : memConfig.value;
                    if (config.members) setMembers(config.members);
                    if (config.families) setFamilies(config.families);
                } catch (e) {
                    console.error('Failed to parse members config', e);
                }
            }
        }
    };

    const updateJpyRate = async (newRate) => {
        setJpyRate(newRate);
        if (!supabase) return;
        const { error } = await supabase.from('app_settings').upsert({ key: 'jpy_rate', value: String(newRate) });
        if (error) console.error('Error updating JPY rate:', error);
    };

    const updateMembersConfig = async (newMembers, newFamilies) => {
        // Optimistic update
        setMembers(newMembers);
        setFamilies(newFamilies);

        if (!supabase) return;
        const configPayload = JSON.stringify({ members: newMembers, families: newFamilies });
        const { error } = await supabase.from('app_settings').upsert({ key: 'members_config', value: configPayload });

        if (error) {
            console.error('Error saving members config:', error);
            alert('儲存失敗，請重試');
            // Revert? simpler to just alert for now
        } else {
            alert('成員設定已儲存！');
        }
    };

    // Toggle for Edit Mode (to prevent accidental touches)
    const toggleEditMode = () => setIsEditMode(prev => !prev);

    return (
        <TripContext.Provider value={{ isEditMode, toggleEditMode, jpyRate, updateJpyRate, members, families, updateMembersConfig }}>
            {children}
        </TripContext.Provider>
    );
};

export const useTrip = () => useContext(TripContext);
