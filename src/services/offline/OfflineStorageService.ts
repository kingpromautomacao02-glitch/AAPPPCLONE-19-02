import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Client, ServiceRecord, ExpenseRecord } from '../../types';

// --- Database Schema ---
interface OfflineDB extends DBSchema {
    clients: {
        key: string;
        value: Client;
        indexes: { 'by-owner': string };
    };
    services: {
        key: string;
        value: ServiceRecord;
        indexes: { 'by-owner': string; 'by-client': string };
    };
    expenses: {
        key: string;
        value: ExpenseRecord;
        indexes: { 'by-owner': string };
    };
    metadata: {
        key: string;
        value: {
            key: string;
            lastSync: string;
            userId: string;
        };
    };
}

const DB_NAME = 'logitrack-offline';
const DB_VERSION = 1;

class OfflineStorageService {
    private db: IDBPDatabase<OfflineDB> | null = null;
    private initPromise: Promise<void> | null = null;

    async initialize(): Promise<void> {
        if (this.db) return;

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._initDB();
        return this.initPromise;
    }

    private async _initDB(): Promise<void> {
        this.db = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Clients store
                if (!db.objectStoreNames.contains('clients')) {
                    const clientStore = db.createObjectStore('clients', { keyPath: 'id' });
                    clientStore.createIndex('by-owner', 'ownerId');
                }

                // Services store
                if (!db.objectStoreNames.contains('services')) {
                    const serviceStore = db.createObjectStore('services', { keyPath: 'id' });
                    serviceStore.createIndex('by-owner', 'ownerId');
                    serviceStore.createIndex('by-client', 'clientId');
                }

                // Expenses store
                if (!db.objectStoreNames.contains('expenses')) {
                    const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
                    expenseStore.createIndex('by-owner', 'ownerId');
                }

                // Metadata store (for sync timestamps)
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            },
        });
        console.log('OfflineStorageService: IndexedDB initialized');
    }

    private ensureDB(): IDBPDatabase<OfflineDB> {
        if (!this.db) {
            throw new Error('OfflineStorageService not initialized. Call initialize() first.');
        }
        return this.db;
    }

    // --- Clients ---
    async getClients(ownerId: string): Promise<Client[]> {
        const db = this.ensureDB();
        return db.getAllFromIndex('clients', 'by-owner', ownerId);
    }

    async saveClient(client: Client): Promise<void> {
        const db = this.ensureDB();
        await db.put('clients', client);
    }

    async saveClients(clients: Client[]): Promise<void> {
        const db = this.ensureDB();
        const tx = db.transaction('clients', 'readwrite');
        await Promise.all([
            ...clients.map(c => tx.store.put(c)),
            tx.done
        ]);
    }

    async deleteClient(id: string): Promise<void> {
        const db = this.ensureDB();
        await db.delete('clients', id);
    }

    async clearClients(ownerId: string): Promise<void> {
        const db = this.ensureDB();
        const clients = await this.getClients(ownerId);
        const tx = db.transaction('clients', 'readwrite');
        await Promise.all([
            ...clients.map(c => tx.store.delete(c.id)),
            tx.done
        ]);
    }

    // --- Services ---
    async getServices(ownerId: string): Promise<ServiceRecord[]> {
        const db = this.ensureDB();
        return db.getAllFromIndex('services', 'by-owner', ownerId);
    }

    async getServicesByClient(clientId: string): Promise<ServiceRecord[]> {
        const db = this.ensureDB();
        return db.getAllFromIndex('services', 'by-client', clientId);
    }

    async saveService(service: ServiceRecord): Promise<void> {
        const db = this.ensureDB();
        await db.put('services', service);
    }

    async saveServices(services: ServiceRecord[]): Promise<void> {
        const db = this.ensureDB();
        const tx = db.transaction('services', 'readwrite');
        await Promise.all([
            ...services.map(s => tx.store.put(s)),
            tx.done
        ]);
    }

    async deleteService(id: string): Promise<void> {
        const db = this.ensureDB();
        await db.delete('services', id);
    }

    async clearServices(ownerId: string): Promise<void> {
        const db = this.ensureDB();
        const services = await this.getServices(ownerId);
        const tx = db.transaction('services', 'readwrite');
        await Promise.all([
            ...services.map(s => tx.store.delete(s.id)),
            tx.done
        ]);
    }

    // --- Expenses ---
    async getExpenses(ownerId: string): Promise<ExpenseRecord[]> {
        const db = this.ensureDB();
        return db.getAllFromIndex('expenses', 'by-owner', ownerId);
    }

    async saveExpense(expense: ExpenseRecord): Promise<void> {
        const db = this.ensureDB();
        await db.put('expenses', expense);
    }

    async saveExpenses(expenses: ExpenseRecord[]): Promise<void> {
        const db = this.ensureDB();
        const tx = db.transaction('expenses', 'readwrite');
        await Promise.all([
            ...expenses.map(e => tx.store.put(e)),
            tx.done
        ]);
    }

    async deleteExpense(id: string): Promise<void> {
        const db = this.ensureDB();
        await db.delete('expenses', id);
    }

    async clearExpenses(ownerId: string): Promise<void> {
        const db = this.ensureDB();
        const expenses = await this.getExpenses(ownerId);
        const tx = db.transaction('expenses', 'readwrite');
        await Promise.all([
            ...expenses.map(e => tx.store.delete(e.id)),
            tx.done
        ]);
    }

    // --- Metadata ---
    async getLastSyncTime(entity: string, userId: string): Promise<string | null> {
        const db = this.ensureDB();
        const key = `${entity}-${userId}`;
        const meta = await db.get('metadata', key);
        return meta?.lastSync || null;
    }

    async setLastSyncTime(entity: string, userId: string): Promise<void> {
        const db = this.ensureDB();
        const key = `${entity}-${userId}`;
        await db.put('metadata', {
            key,
            lastSync: new Date().toISOString(),
            userId
        });
    }

    // --- Bulk Operations ---
    async syncFromServer(
        ownerId: string,
        clients: Client[],
        services: ServiceRecord[],
        expenses: ExpenseRecord[]
    ): Promise<void> {
        // Clear old data and save new data from server
        await Promise.all([
            this.clearClients(ownerId),
            this.clearServices(ownerId),
            this.clearExpenses(ownerId)
        ]);

        await Promise.all([
            this.saveClients(clients),
            this.saveServices(services),
            this.saveExpenses(expenses)
        ]);

        // Update sync timestamps
        await Promise.all([
            this.setLastSyncTime('clients', ownerId),
            this.setLastSyncTime('services', ownerId),
            this.setLastSyncTime('expenses', ownerId)
        ]);

        console.log('OfflineStorageService: Full sync completed');
    }
}

// Singleton instance
export const offlineStorage = new OfflineStorageService();
