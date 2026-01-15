"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Check, Trash2, Users, User, Briefcase, Shirt, Plug, FileText, CheckSquare, Smile, Edit2, X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MEMBERS, FAMILIES, ANALYSIS_GROUPS } from '@/lib/data';
import styles from './page.module.css';

const CATEGORIES = [
    { id: 'todo', name: '待辦事項', icon: CheckSquare },
    { id: 'clothes', name: '衣物行李', icon: Shirt },
    { id: 'toiletries', name: '日常/盥洗', icon: Smile },
    { id: 'electronics', name: '電子產品', icon: Plug },
    { id: 'documents', name: '證件/其他', icon: FileText },
];

const DEFAULT_ITEMS = {
    shared: [
        { text: '訂機票', category: 'todo' },
        { text: '訂住宿', category: 'todo' },
        { text: '租車預約', category: 'todo' },
        { text: '預訂 Orca 水中觀光船', category: 'todo' },
        { text: '入境卡填寫 (Visit Japan Web)', category: 'todo' },
    ],
    individual: [
        { text: '襪子', category: 'clothes' },
        { text: 'T-shirts', category: 'clothes' },
        { text: '牛仔褲/外褲', category: 'clothes' },
        { text: '牙刷牙膏', category: 'toiletries' },
        { text: '體香劑/止汗劑', category: 'toiletries' },
        { text: '防曬乳', category: 'toiletries' },
        { text: '充電器 (手機/像機)', category: 'electronics' },
        { text: '行動電源', category: 'electronics' },
    ]
};

export default function ChecklistPage() {
    return (
        <Suspense fallback={<div className="container">載入中...</div>}>
            <ChecklistContent />
        </Suspense>
    );
}

function ChecklistContent() {
    const router = useRouter();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('shared'); // 'shared' or 'individual'
    const [activeUser, setActiveUser] = useState('ting'); // Default user
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Add Item Form
    const [newItemText, setNewItemText] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('todo');
    const [editingId, setEditingId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [hideCompleted, setHideCompleted] = useState(false);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('checklists')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const startEditing = (item) => {
        setEditingId(item.id);
        setEditingText(item.text);
    };

    const saveEdit = async (id) => {
        if (!editingText.trim()) return;
        setItems(prev => prev.map(item => item.id === id ? { ...item, text: editingText } : item));
        setEditingId(null);
        try {
            const { error } = await supabase.from('checklists').update({ text: editingText }).eq('id', id);
            if (error) throw error;
        } catch (err) {
            console.error(err);
            fetchItems();
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const handleToggle = async (id, currentStatus) => {
        // Optimistic update
        setItems(prev => prev.map(item => item.id === id ? { ...item, is_completed: !currentStatus } : item));

        try {
            const { error } = await supabase
                .from('checklists')
                .update({ is_completed: !currentStatus })
                .eq('id', id);
            if (error) throw error;
        } catch (err) {
            console.error(err);
            fetchItems(); // Revert on error
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('確定要刪除此項目嗎？')) return;
        setItems(prev => prev.filter(item => item.id !== id));
        try {
            await supabase.from('checklists').delete().eq('id', id);
        } catch (err) {
            console.error(err);
            fetchItems();
        }
    };

    const handleImport = async () => {
        if (!confirm('確定要匯入預設清單嗎？')) return;
        setLoading(true);
        const ownerId = activeTab === 'shared' ? 'public' : activeUser;
        const source = activeTab === 'shared' ? DEFAULT_ITEMS.shared : DEFAULT_ITEMS.individual;

        const payload = source.map(item => ({
            text: item.text,
            category: item.category,
            owner_id: ownerId,
            is_completed: false
        }));

        try {
            const { error } = await supabase.from('checklists').insert(payload);
            if (error) throw error;
            fetchItems();
        } catch (err) {
            alert('匯入失敗: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newItemText.trim()) return;

        const ownerId = activeTab === 'shared' ? 'public' : activeUser;
        const tempId = Date.now(); // Temp ID

        const newItem = {
            id: tempId,
            text: newItemText,
            category: newItemCategory,
            is_completed: false,
            owner_id: ownerId,
            created_at: new Date().toISOString()
        };

        setItems(prev => [...prev, newItem]);
        setIsModalOpen(false);
        setNewItemText('');

        try {
            const { data, error } = await supabase
                .from('checklists')
                .insert([{
                    text: newItem.text,
                    category: newItem.category,
                    owner_id: newItem.owner_id,
                    is_completed: false
                }])
                .select()
                .single();

            if (error) throw error;
            // Replace temp item with real one
            setItems(prev => prev.map(i => i.id === tempId ? data : i));
        } catch (err) {
            alert('新增失敗: ' + err.message);
            setItems(prev => prev.filter(i => i.id !== tempId));
        }
    };

    // Filter Logic
    const displayedItems = items.filter(item => {
        if (hideCompleted && item.is_completed) return false;
        if (activeTab === 'shared') return item.owner_id === 'public';
        return item.owner_id === activeUser;
    });

    // Group items by category
    const groupedItems = CATEGORIES.reduce((acc, cat) => {
        const catItems = displayedItems.filter(i => i.category === cat.id);
        if (catItems.length > 0) {
            acc.push({ ...cat, items: catItems });
        }
        return acc;
    }, []);

    // Find items without valid category (or 'general')
    const otherItems = displayedItems.filter(i => !CATEGORIES.find(c => c.id === i.category));
    if (otherItems.length > 0) {
        groupedItems.push({ id: 'other', name: '其他', icon: Briefcase, items: otherItems });
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => router.push('/')} className={styles.backBtn}>
                    <ArrowLeft size={24} />
                </button>
                <h2 className={styles.title}>待辦與行李清單</h2>
                <button
                    onClick={() => setHideCompleted(!hideCompleted)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                    title={hideCompleted ? "顯示已完成" : "隱藏已完成"}
                >
                    {hideCompleted ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
            </header>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'shared' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('shared')}
                >
                    <Users size={18} /> 共用清單
                </button>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'individual' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('individual')}
                >
                    <User size={18} /> 個人清單
                </button>
            </div>

            {activeTab === 'individual' && (
                <div className={styles.userSelector}>
                    {ANALYSIS_GROUPS.map(g => (
                        <button
                            key={g.id}
                            className={`${styles.userBtn} ${activeUser === g.id ? styles.activeUser : ''}`}
                            onClick={() => setActiveUser(g.id)}
                            style={activeUser === g.id ? { backgroundColor: g.color, borderColor: g.color } : {}}
                        >
                            {g.name}
                        </button>
                    ))}
                </div>
            )}

            <div className={styles.listContent}>
                {loading ? (
                    <p className={styles.emptyState}>載入中...</p>
                ) : groupedItems.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>目前沒有項目</p>
                        <button
                            onClick={handleImport}
                            style={{ marginTop: '1rem', padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}
                        >
                            匯入範例清單
                        </button>
                        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#cbd5e1' }}>或按右下角 + 新增</p>
                    </div>
                ) : (
                    groupedItems.map(group => (
                        <div key={group.id} className={styles.categoryGroup}>
                            <div className={styles.catHeader}>
                                <group.icon size={20} className="text-secondary" />
                                {group.name}
                            </div>
                            {group.items.map(item => (
                                <div key={item.id} className={styles.todoItem}>
                                    {editingId === item.id ? (
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                value={editingText}
                                                onChange={e => setEditingText(e.target.value)}
                                                className={styles.input}
                                                style={{ padding: '4px 8px', fontSize: '1rem', flex: 1 }}
                                                autoFocus
                                            />
                                            <button onClick={() => saveEdit(item.id)} style={{ color: '#27ae60', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}><Check size={20} /></button>
                                            <button onClick={cancelEdit} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}><X size={20} /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={styles.checkboxWrapper} onClick={() => handleToggle(item.id, item.is_completed)}>
                                                <input
                                                    type="checkbox"
                                                    className={styles.checkbox}
                                                    checked={item.is_completed || false}
                                                    readOnly
                                                />
                                                <div className={styles.customCheckbox}>
                                                    <Check size={14} className={styles.checkIcon} />
                                                </div>
                                            </div>
                                            <span
                                                className={`${styles.itemText} ${item.is_completed ? styles.completedText : ''}`}
                                                onDoubleClick={() => startEditing(item)}
                                            >
                                                {item.text}
                                            </span>
                                            <div style={{ display: 'flex' }}>
                                                <button className={styles.deleteBtn} style={{ color: '#94a3b8' }} onClick={() => startEditing(item)}>
                                                    <Edit2 size={18} />
                                                </button>
                                                <button className={styles.deleteBtn} onClick={() => handleDelete(item.id)}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>

            <button className={styles.fab} onClick={() => setIsModalOpen(true)}>
                <Plus size={28} />
            </button>

            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '1rem' }}>
                            新增{activeTab === 'shared' ? '共用' : (ANALYSIS_GROUPS.find(g => g.id === activeUser)?.name + '的')}項目
                        </h3>
                        <form onSubmit={handleAdd}>
                            <div className={styles.inputGroup}>
                                <label>項目名稱</label>
                                <input
                                    className={styles.input}
                                    value={newItemText}
                                    onChange={e => setNewItemText(e.target.value)}
                                    placeholder="輸入待辦事項..."
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>分類</label>
                                <div className={styles.categoryTags}>
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            className={`${styles.catTag} ${newItemCategory === cat.id ? styles.activeCatTag : ''}`}
                                            onClick={() => setNewItemCategory(cat.id)}
                                        >
                                            <cat.icon size={14} style={{ marginBottom: -2, marginRight: 4 }} />
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className={styles.confirmBtn}>新增</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
