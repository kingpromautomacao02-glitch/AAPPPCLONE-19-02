import { openDB, DBSchema, IDBPDatabase } from 'idb';

// --- Queue Item Types ---
export type EntityType = 'clients' | 'services' | 'expenses';
export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface QueueItem {
    id: string;
    entity: EntityType;
    operation: OperationType;
    data: any;
    timestamp: string;
    retries: number;
    status: 'pending' | 'processing' | 'failed';
    errorMessage?: string;
}

// --- Database Schema ---
interface SyncQueueDB extends DBSchema {
    queue: {
        key: string;
        value: QueueItem;
        indexes: { 'by-status': string; 'by-timestamp': string };
    };
}

const DB_NAME = 'logitrack-sync-queue';
const DB_VERSION = 1;
const MAX_RETRIES = 3;

class SyncQueueService {
    private db: IDBPDatabase<SyncQueueDB> | null = null;
    private initPromise: Promise<void> | null = null;
    private isProcessing = false;
    private onSyncCallbacks: Array<() => void> = [];

    async initialize(): Promise<void> {
        if (this.db) return;

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._initDB();
        return this.initPromise;
    }

    private async _initDB(): Promise<void> {
        this.db = await openDB<SyncQueueDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('queue')) {
                    const store = db.createObjectStore('queue', { keyPath: 'id' });
                    store.createIndex('by-status', 'status');
                    store.createIndex('by-timestamp', 'timestamp');
                }
            },
        });
        console.log('SyncQueueService: IndexedDB initialized');
    }

    private ensureDB(): IDBPDatabase<SyncQueueDB> {
        if (!this.db) {
            throw new Error('SyncQueueService not initialized. Call initialize() first.');
        }
        return this.db;
    }

    // --- Enqueue Operations ---
    async enqueue(
        entity: EntityType,
        operation: OperationType,
        data: any
    ): Promise<void> {
        const db = this.ensureDB();

        const item: QueueItem = {
            id: crypto.randomUUID(),
            entity,
            operation,
            data,
            timestamp: new Date().toISOString(),
            retries: 0,
            status: 'pending'
        };

        await db.add('queue', item);
        console.log(`SyncQueue: Enqueued ${operation} on ${entity}`, data.id || data);

        // Notify listeners
        this.notifyListeners();
    }

    // --- Get Queue Status ---
    async getPendingCount(): Promise<number> {
        const db = this.ensureDB();
        const pending = await db.getAllFromIndex('queue', 'by-status', 'pending');
        const processing = await db.getAllFromIndex('queue', 'by-status', 'processing');
        return pending.length + processing.length;
    }

    async getAllPending(): Promise<QueueItem[]> {
        const db = this.ensureDB();
        const all = await db.getAll('queue');
        return all
            .filter(item => item.status === 'pending' || item.status === 'processing')
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }

    async getFailedItems(): Promise<QueueItem[]> {
        const db = this.ensureDB();
        return db.getAllFromIndex('queue', 'by-status', 'failed');
    }

    // --- Process Queue ---
    async processQueue(
        processItem: (item: QueueItem) => Promise<boolean>
    ): Promise<{ processed: number; failed: number }> {
        if (this.isProcessing) {
            console.log('SyncQueue: Already processing, skipping...');
            return { processed: 0, failed: 0 };
        }

        this.isProcessing = true;
        let processed = 0;
        let failed = 0;

        try {
            const db = this.ensureDB();
            const pendingItems = await this.getAllPending();

            console.log(`SyncQueue: Processing ${pendingItems.length} items...`);

            for (const item of pendingItems) {
                // Mark as processing
                item.status = 'processing';
                await db.put('queue', item);

                try {
                    const success = await processItem(item);

                    if (success) {
                        // Remove from queue on success
                        await db.delete('queue', item.id);
                        processed++;
                        console.log(`SyncQueue: Successfully processed ${item.operation} on ${item.entity}`);
                    } else {
                        // Mark as failed after max retries
                        item.retries++;
                        if (item.retries >= MAX_RETRIES) {
                            item.status = 'failed';
                            item.errorMessage = 'Max retries exceeded';
                        } else {
                            item.status = 'pending';
                        }
                        await db.put('queue', item);
                        failed++;
                    }
                } catch (error: any) {
                    item.retries++;
                    item.errorMessage = error.message || 'Unknown error';

                    if (item.retries >= MAX_RETRIES) {
                        item.status = 'failed';
                    } else {
                        item.status = 'pending';
                    }

                    await db.put('queue', item);
                    failed++;
                    console.error(`SyncQueue: Error processing item`, error);
                }
            }

            console.log(`SyncQueue: Processed ${processed}, Failed ${failed}`);
        } finally {
            this.isProcessing = false;
            this.notifyListeners();
        }

        return { processed, failed };
    }

    // --- Clear Operations ---
    async clearCompleted(): Promise<void> {
        // Items are deleted on success, this clears failed items
        const db = this.ensureDB();
        const failed = await this.getFailedItems();
        const tx = db.transaction('queue', 'readwrite');
        await Promise.all([
            ...failed.map(item => tx.store.delete(item.id)),
            tx.done
        ]);
    }

    async clearAll(): Promise<void> {
        const db = this.ensureDB();
        await db.clear('queue');
        this.notifyListeners();
    }

    // --- Retry Failed ---
    async retryFailed(): Promise<void> {
        const db = this.ensureDB();
        const failed = await this.getFailedItems();

        for (const item of failed) {
            item.status = 'pending';
            item.retries = 0;
            item.errorMessage = undefined;
            await db.put('queue', item);
        }

        this.notifyListeners();
    }

    // --- Event Listeners ---
    onQueueChange(callback: () => void): () => void {
        this.onSyncCallbacks.push(callback);
        return () => {
            this.onSyncCallbacks = this.onSyncCallbacks.filter(cb => cb !== callback);
        };
    }

    private notifyListeners(): void {
        this.onSyncCallbacks.forEach(cb => cb());
    }

    // --- Check if processing ---
    get processing(): boolean {
        return this.isProcessing;
    }
}

// Singleton instance
export const syncQueue = new SyncQueueService();
