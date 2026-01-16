import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { connectionService, syncQueue } from '../services/offline';

// --- Types ---
interface SyncContextType {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    lastSyncTime: string | null;
    forceSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

// --- Provider Component ---
interface SyncProviderProps {
    children: ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

    // Update pending count
    const updatePendingCount = useCallback(async () => {
        try {
            const count = await syncQueue.getPendingCount();
            setPendingCount(count);
        } catch (error) {
            console.error('SyncContext: Error getting pending count', error);
        }
    }, []);

    // Subscribe to connection changes
    useEffect(() => {
        const unsubscribe = connectionService.onChange((online) => {
            setIsOnline(online);
            if (online) {
                // Update last sync time when we come back online
                setLastSyncTime(new Date().toISOString());
            }
        });

        return () => unsubscribe();
    }, []);

    // Subscribe to queue changes
    useEffect(() => {
        const unsubscribe = syncQueue.onQueueChange(() => {
            updatePendingCount();
            setIsSyncing(syncQueue.processing);
        });

        // Initial count
        updatePendingCount();

        return () => unsubscribe();
    }, [updatePendingCount]);

    // Force sync function
    const forceSync = useCallback(async () => {
        if (!isOnline) {
            console.warn('SyncContext: Cannot force sync while offline');
            return;
        }

        setIsSyncing(true);
        try {
            // Trigger queue processing
            await syncQueue.processQueue(async (item) => {
                // The actual sync logic is in HybridAdapter
                // This is just for manual trigger
                console.log('Processing item:', item);
                return true;
            });
            setLastSyncTime(new Date().toISOString());
        } catch (error) {
            console.error('SyncContext: Force sync error', error);
        } finally {
            setIsSyncing(false);
            await updatePendingCount();
        }
    }, [isOnline, updatePendingCount]);

    const value: SyncContextType = {
        isOnline,
        isSyncing,
        pendingCount,
        lastSyncTime,
        forceSync,
    };

    return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

// --- Hook ---
export const useSync = (): SyncContextType => {
    const context = useContext(SyncContext);
    if (context === undefined) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
};
