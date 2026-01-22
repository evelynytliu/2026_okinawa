
import { INITIAL_EXPENSES } from './data';

const STORAGE_KEY = 'demo_db_v2'; // Bump version to clear old single-table data

class MockQueryBuilder {
    constructor(data, onUpdate) {
        this.dataSource = data || [];
        this.onUpdate = onUpdate;
        this.currentData = [...this.dataSource];
        this.filtersApplied = [];
    }

    select(columns) {
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

        // Append to original source, ignoring previous filters
        const newData = [...this.dataSource, ...newRows];
        if (this.onUpdate) this.onUpdate(newData);

        return { data: newRows, error: null };
    }

    async upsert(row) {
        // Upsert = Insert or Update based on ID (or primary key)
        // Detailed logic: For each row in input, check if id exists. 
        // If yes, update. If no, insert.
        const inputRows = Array.isArray(row) ? row : [row];

        let newData = [...this.dataSource];

        inputRows.forEach(inputRow => {
            // Assume 'id' or 'key' is the unique identifier
            // app_settings uses 'key', others use 'id'.
            const id = inputRow.id;
            const key = inputRow.key;

            let existingIndex = -1;

            if (id) {
                existingIndex = newData.findIndex(r => r.id === id);
            } else if (key) {
                existingIndex = newData.findIndex(r => r.key === key);
            }

            if (existingIndex >= 0) {
                // Update
                newData[existingIndex] = { ...newData[existingIndex], ...inputRow };
            } else {
                // Insert
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
            if (matches) {
                return { ...row, ...updates };
            }
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
        if (this.isSingle) {
            resolve({ data: this.currentData.length > 0 ? this.currentData[0] : null, error: null });
        } else {
            resolve({ data: this.currentData, error: null });
        }
    }
}

class MockSupabaseClient {
    constructor() {
        this.db = null; // { expenses: [], accommodations: [], ... }
    }

    _loadDb() {
        // Return safe default if server-side
        const defaultDb = { expenses: [...INITIAL_EXPENSES] };

        if (typeof window === 'undefined') return defaultDb;

        if (!this.db) {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    this.db = JSON.parse(stored);
                    // Merge initial expenses if not present (simple check)
                    if (!this.db.expenses || this.db.expenses.length === 0) {
                        // Optional: Force re-seed expenses if empty? 
                        // Better: if key is missing entirely.
                        if (!Object.prototype.hasOwnProperty.call(this.db, 'expenses')) {
                            this.db.expenses = [...INITIAL_EXPENSES];
                        }
                    }
                } else {
                    this.db = defaultDb;
                }
            } catch (e) {
                console.error("Failed to load mock DB", e);
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
        // Ensure DB is loaded
        const db = this._loadDb();

        // Ensure table array exists
        if (!db[table]) {
            db[table] = [];
            // No save here yet, wait for modification
        }

        return new MockQueryBuilder(db[table], (newData) => {
            // On update, reload DB state to be safe (though this is synchronous)
            const currentDb = this._loadDb();
            currentDb[table] = newData;
            this._saveDb(currentDb);
        });
    }

    channel(name) {
        return {
            on: () => ({ subscribe: () => { } }),
            subscribe: () => { }
        };
    }

    removeChannel() { }
}

export const mockSupabase = new MockSupabaseClient();
