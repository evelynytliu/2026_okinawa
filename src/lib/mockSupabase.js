
import { INITIAL_EXPENSES } from './data';

const STORAGE_KEY = 'demo_db_mario_v3'; // Bump version

class MockQueryBuilder {
    constructor(data, onUpdate, fullDb) {
        this.dataSource = data || [];
        this.onUpdate = onUpdate;
        this.fullDb = fullDb; // Access to other tables for joins
        this.currentData = [...this.dataSource];
        this.filtersApplied = [];
        this.selectColumns = null;
        this.isSingle = false;
    }

    select(columns) {
        this.selectColumns = columns;
        return this;
    }

    eq(column, value) {
        this.filtersApplied.push({ column, value });
        this.currentData = this.currentData.filter(row => row[column] == value);
        return this;
    }

    single() {
        this.isSingle = true;
        return this;
    }

    order(column, { ascending = true } = {}) {
        this.currentData.sort((a, b) => {
            const valA = a[column];
            const valB = b[column];
            if (valA < valB) return ascending ? -1 : 1;
            if (valA > valB) return ascending ? 1 : -1;
            return 0;
        });
        return this;
    }

    limit(count) {
        this.currentData = this.currentData.slice(0, count);
        return this;
    }

    // --- Actions ---

    async insert(row) {
        const rows = Array.isArray(row) ? row : [row];
        const newRows = rows.map(r => ({
            ...r,
            id: r.id || Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString()
        }));
        const newData = [...this.dataSource, ...newRows];
        if (this.onUpdate) this.onUpdate(newData);
        return { data: newRows, error: null };
    }

    async upsert(row) {
        const inputRows = Array.isArray(row) ? row : [row];
        let newData = [...this.dataSource];
        inputRows.forEach(inputRow => {
            const id = inputRow.id;
            const key = inputRow.key;
            let existingIndex = -1;
            if (id) {
                existingIndex = newData.findIndex(r => r.id === id);
            } else if (key) {
                existingIndex = newData.findIndex(r => r.key === key);
            }
            if (existingIndex >= 0) {
                newData[existingIndex] = { ...newData[existingIndex], ...inputRow };
            } else {
                newData.push({
                    ...inputRow,
                    id: inputRow.id || (inputRow.key ? undefined : Math.random().toString(36).substr(2, 9)),
                    created_at: new Date().toISOString()
                });
            }
        });
        if (this.onUpdate) this.onUpdate(newData);
        return { data: inputRows, error: null };
    }

    async update(updates) {
        const newData = this.dataSource.map(row => {
            const matches = this.filtersApplied.every(f => row[f.column] == f.value);
            if (matches) return { ...row, ...updates };
            return row;
        });
        if (this.onUpdate) this.onUpdate(newData);
        return { data: null, error: null };
    }

    async delete() {
        const newData = this.dataSource.filter(row => {
            const matches = this.filtersApplied.every(f => row[f.column] == f.value);
            return !matches;
        });
        if (this.onUpdate) this.onUpdate(newData);
        return { error: null };
    }

    then(resolve, reject) {
        // --- CUSTOM JOIN LOGIC FOR ITINERARY ---
        // Simulating: .select(`..., itinerary_items ( ..., location:locations (...) )`)
        if (this.selectColumns && this.selectColumns.includes('itinerary_items') && this.fullDb) {

            this.currentData = this.currentData.map(day => {
                // Join items
                let items = (this.fullDb.itinerary_items || [])
                    .filter(item => item.day_number === day.day_number);

                // Join Locations into items
                items = items.map(item => {
                    const loc = (this.fullDb.locations || []).find(l => l.id === item.location_id);
                    return {
                        ...item,
                        location: loc || null
                    };
                });

                // Sort items by sort_order
                items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

                return {
                    ...day,
                    itinerary_items: items
                };
            });
        }

        // --- CUSTOM JOIN LOGIC FOR WISHES (Locations + Itinerary Check) ---
        // Simulating: location filtering based on itinerary.
        // But wishes page does parallel queries, so no complex join needed there usually.

        if (this.isSingle) {
            resolve({ data: this.currentData.length > 0 ? this.currentData[0] : null, error: null });
        } else {
            resolve({ data: this.currentData, error: null });
        }
    }
}

class MockSupabaseClient {
    constructor() {
        this.db = null;
    }

    _loadDb() {
        const MARIO_MEMBERS = {
            mario: { id: "mario", name: "瑪利歐", familyId: "mario_fam" },
            luigi: { id: "luigi", name: "路易吉", familyId: "mario_fam" },
            peach: { id: "peach", name: "碧姬", familyId: "peach_fam" },
            toad: { id: "toad", name: "奇諾比奧", familyId: "peach_fam" },
            yoshi: { id: "yoshi", name: "耀西", familyId: "others" },
            bowser: { id: "bowser", name: "庫巴", familyId: "others" }
        };

        const MARIO_FAMILIES = [
            { id: "mario_fam", name: "瑪利歐家", members: ["mario", "luigi"], color: "#E52521" },
            { id: "peach_fam", name: "城堡組", members: ["peach", "toad"], color: "#F09CEA" },
            { id: "others", name: "其他夥伴", members: ["yoshi", "bowser"], color: "#45B32D" }
        ];

        const MARIO_EXPENSES = [
            { title: "蘑菇王國住宿", amount: 15000, category: "accommodation", payer_id: "peach", date: "2026-02-04", beneficiaries: ["mario", "luigi", "peach", "toad"], is_paid: true },
            { title: "卡丁車租賃", amount: 8000, category: "transport", payer_id: "mario", date: "2026-02-05", beneficiaries: ["mario", "luigi", "yoshi", "bowser"], is_paid: false },
            { title: "能量星星", amount: 5000, category: "shopping", payer_id: "mario", date: "2026-02-06", beneficiaries: ["mario"], is_paid: true },
            { title: "庫巴城堡門票", amount: 12000, category: "tickets", payer_id: "bowser", date: "2026-02-07", beneficiaries: Object.keys(MARIO_MEMBERS), is_paid: true },
        ];

        const MARIO_LOCATIONS = [
            { id: 'loc1', name: "碧姬公主城堡", type: 'visual', details: "蘑菇王國的中心，非常華麗。", img_url: "https://mario.wiki.gallery/images/thumb/7/75/PeachCastle_Odyssey.jpg/1200px-PeachCastle_Odyssey.jpg" },
            { id: 'loc2', name: "彩虹之路", type: 'fun', details: "一定要來挑戰的賽道，小心別掉下去！", img_url: "https://mario.wiki.gallery/images/thumb/3/3e/MK8_Rainbow_Road_Course_Icon.png/500px-MK8_Rainbow_Road_Course_Icon.png" },
            { id: 'loc3', name: "奇諾比奧咖啡", type: 'food', details: "這裡的蘑菇濃湯是必點招牌。", img_url: "https://mario.wiki.gallery/images/thumb/a/a2/Kinopio_Cafe_Osaka.jpeg/800px-Kinopio_Cafe_Osaka.jpeg" },
            { id: 'loc4', name: "庫巴城堡", type: 'visual', details: "氣氛比較陰森，但建築很壯觀。", img_url: "https://mario.wiki.gallery/images/thumb/4/4ee/Bowser_Castle_PMTOK.jpg/800px-Bowser_Castle_PMTOK.jpg" },
            { id: 'loc5', name: "星星商店", type: 'shop', details: "販賣無敵星星和各種道具。", img_url: "https://mario.wiki.gallery/images/thumb/6/65/Star_Rush_shop.png/500px-Star_Rush_shop.png" },
        ];

        const MARIO_DAYS = [
            { day_number: 1, date_display: "2026-02-04", title: "抵達王國" },
            { day_number: 2, date_display: "2026-02-05", title: "賽車與美食" },
            { day_number: 3, date_display: "2026-02-06", title: "大魔王觀光" },
        ];

        const MARIO_ITEMS = [
            { day_number: 1, location_id: 'loc1', sort_order: 1, note: "Check-in" },
            { day_number: 2, location_id: 'loc2', sort_order: 1, note: "早起練車" },
            { day_number: 2, location_id: 'loc3', sort_order: 2, note: "午餐" },
            { day_number: 3, location_id: 'loc4', sort_order: 1, note: "拍照" },
            { day_number: 3, location_id: 'loc5', sort_order: 2, note: "伴手禮" },
        ];

        const defaultDb = {
            expenses: MARIO_EXPENSES.map(e => ({ ...e, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() })),
            app_settings: [
                { key: 'members_config', value: { members: MARIO_MEMBERS, families: MARIO_FAMILIES } }
            ],
            itinerary_days: MARIO_DAYS,
            locations: MARIO_LOCATIONS,
            itinerary_items: MARIO_ITEMS.map(i => ({ ...i, id: Math.random().toString(36).substr(2, 9) }))
        };

        if (typeof window === 'undefined') return defaultDb;

        if (!this.db) {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    this.db = JSON.parse(stored);
                    if (!this.db.itinerary_days || this.db.itinerary_days.length === 0) {
                        // Force reload mario logic if old version data
                        this.db = defaultDb;
                        this._saveDb(defaultDb);
                    }
                } else {
                    this.db = defaultDb;
                    this._saveDb(defaultDb);
                }
            } catch (e) {
                this.db = defaultDb;
            }
        }
        return this.db;
    }

    _saveDb(newDb) {
        this.db = newDb;
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newDb));
        }
    }

    from(table) {
        const db = this._loadDb();
        if (!db[table]) db[table] = [];

        // Pass full db to query builder to allow joins
        return new MockQueryBuilder(db[table], (newData) => {
            const currentDb = this._loadDb();
            currentDb[table] = newData;
            this._saveDb(currentDb);
        }, db);
    }

    channel(name) {
        const mockChannel = {
            on: () => mockChannel,
            subscribe: () => mockChannel,
            unsubscribe: () => { }
        };
        // Fix: Make sure returning object matches what supabase.channel() returns
        return mockChannel;
    }

    removeChannel() { }

    get storage() {
        return {
            from: (bucket) => ({
                upload: async () => ({ error: null, data: { path: 'mock_path' } }),
                getPublicUrl: (path) => ({ data: { publicUrl: 'https://via.placeholder.com/300?text=Mock+Image' } })
            })
        };
    }
}

export const mockSupabase = new MockSupabaseClient();
