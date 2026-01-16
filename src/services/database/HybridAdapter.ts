import { DatabaseAdapter } from './types';
import { Client, ServiceRecord, ExpenseRecord, User, ServiceLog } from '../../types';
import { SupabaseAdapter } from './SupabaseAdapter';
import { offlineStorage, syncQueue, connectionService } from '../offline';

/**
 * HybridAdapter - Combines Supabase with local offline storage
 * 
 * When ONLINE: Uses Supabase as primary, updates local cache
 * When OFFLINE: Uses local cache, queues changes for sync
 */
export class HybridAdapter implements DatabaseAdapter {
    private supabase: SupabaseAdapter;
    private initialized = false;

    constructor(url?: string, key?: string) {
        this.supabase = new SupabaseAdapter(url, key);
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        // Initialize all services
        await Promise.all([
            this.supabase.initialize(),
            offlineStorage.initialize(),
            syncQueue.initialize()
        ]);

        // Initialize connection service with Supabase URL for ping
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        connectionService.initialize(supabaseUrl);

        // Subscribe to connection changes for auto-sync
        connectionService.onChange((isOnline) => {
            if (isOnline) {
                this.processQueueAndSync();
            }
        });

        this.initialized = true;
        console.log('HybridAdapter: Initialized');
    }

    private get isOnline(): boolean {
        return connectionService.isOnline;
    }

    // --- Process Queue when back online ---
    private async processQueueAndSync(): Promise<void> {
        console.log('HybridAdapter: Processing sync queue...');

        await syncQueue.processQueue(async (item) => {
            try {
                switch (item.entity) {
                    case 'clients':
                        if (item.operation === 'CREATE' || item.operation === 'UPDATE') {
                            await this.supabase.saveClient(item.data);
                        } else if (item.operation === 'DELETE') {
                            await this.supabase.deleteClient(item.data.id);
                        }
                        break;

                    case 'services':
                        if (item.operation === 'CREATE') {
                            await this.supabase.saveService(item.data);
                        } else if (item.operation === 'UPDATE') {
                            await this.supabase.updateService(item.data);
                        } else if (item.operation === 'DELETE') {
                            await this.supabase.deleteService(item.data.id);
                        }
                        break;

                    case 'expenses':
                        if (item.operation === 'CREATE' || item.operation === 'UPDATE') {
                            await this.supabase.saveExpense(item.data);
                        } else if (item.operation === 'DELETE') {
                            await this.supabase.deleteExpense(item.data.id);
                        }
                        break;
                }
                return true;
            } catch (error) {
                console.error('HybridAdapter: Sync error for', item, error);
                return false;
            }
        });
    }

    // --- USERS ---
    async getUsers(): Promise<User[]> {
        if (this.isOnline) {
            return this.supabase.getUsers();
        }
        // Users are not cached locally for security
        return [];
    }

    async getUserProfile(userId: string): Promise<User | null> {
        if (this.isOnline) {
            return this.supabase.getUserProfile?.(userId) || null;
        }
        return null;
    }

    async saveUser(user: User): Promise<void> {
        if (this.isOnline) {
            await this.supabase.saveUser(user);
        }
    }

    async updateUser(user: User): Promise<void> {
        if (this.isOnline) {
            await this.supabase.updateUser(user);
        }
    }

    async deleteUser(id: string): Promise<void> {
        if (this.isOnline) {
            await this.supabase.deleteUser(id);
        }
    }

    // --- CLIENTS ---
    async getClients(ownerId?: string): Promise<Client[]> {
        if (!ownerId) return [];

        if (this.isOnline) {
            try {
                // Fetch from Supabase and update cache
                const clients = await this.supabase.getClients(ownerId);
                await offlineStorage.saveClients(clients);
                return clients;
            } catch (error) {
                console.warn('HybridAdapter: Supabase error, falling back to cache', error);
                return offlineStorage.getClients(ownerId);
            }
        }

        // Offline: return from cache
        return offlineStorage.getClients(ownerId);
    }

    async saveClient(client: Client): Promise<void> {
        // Always save to local cache first
        await offlineStorage.saveClient(client);

        if (this.isOnline) {
            try {
                await this.supabase.saveClient(client);
            } catch (error) {
                console.warn('HybridAdapter: Failed to save to Supabase, queuing...', error);
                await syncQueue.enqueue('clients', 'CREATE', client);
            }
        } else {
            // Queue for later sync
            await syncQueue.enqueue('clients', 'CREATE', client);
        }
    }

    async deleteClient(id: string): Promise<void> {
        // Get client data before deleting (for queue)
        const clients = await offlineStorage.getClients('');
        const client = clients.find(c => c.id === id);

        await offlineStorage.deleteClient(id);

        if (this.isOnline) {
            try {
                await this.supabase.deleteClient(id);
            } catch (error) {
                console.warn('HybridAdapter: Failed to delete from Supabase, queuing...', error);
                await syncQueue.enqueue('clients', 'DELETE', { id });
            }
        } else {
            await syncQueue.enqueue('clients', 'DELETE', { id });
        }
    }

    // --- SERVICES ---
    async getServices(ownerId?: string, start?: string, end?: string, clientId?: string): Promise<ServiceRecord[]> {
        if (!ownerId) return [];

        if (this.isOnline) {
            try {
                const services = await this.supabase.getServices(ownerId, start, end);
                // Only cache if no date filter (full sync)
                if (!start && !end) {
                    await offlineStorage.saveServices(services);
                }
                return clientId ? services.filter(s => s.clientId === clientId) : services;
            } catch (error) {
                console.warn('HybridAdapter: Supabase error, falling back to cache', error);
                let services = await offlineStorage.getServices(ownerId);

                // Apply filters locally
                if (start && end) {
                    services = services.filter(s => {
                        const date = s.date.split('T')[0];
                        return date >= start && date <= end;
                    });
                }
                if (clientId) {
                    services = services.filter(s => s.clientId === clientId);
                }
                return services;
            }
        }

        // Offline: return from cache with filters
        let services = await offlineStorage.getServices(ownerId);
        if (start && end) {
            services = services.filter(s => {
                const date = s.date.split('T')[0];
                return date >= start && date <= end;
            });
        }
        if (clientId) {
            services = services.filter(s => s.clientId === clientId);
        }
        return services;
    }

    async saveService(service: ServiceRecord, user?: User): Promise<void> {
        await offlineStorage.saveService(service);

        if (this.isOnline) {
            try {
                await this.supabase.saveService(service, user);
            } catch (error) {
                console.warn('HybridAdapter: Failed to save service to Supabase, queuing...', error);
                await syncQueue.enqueue('services', 'CREATE', service);
            }
        } else {
            await syncQueue.enqueue('services', 'CREATE', service);
        }
    }

    async updateService(service: ServiceRecord, user?: User): Promise<void> {
        await offlineStorage.saveService(service);

        if (this.isOnline) {
            try {
                await this.supabase.updateService(service, user);
            } catch (error) {
                console.warn('HybridAdapter: Failed to update service in Supabase, queuing...', error);
                await syncQueue.enqueue('services', 'UPDATE', service);
            }
        } else {
            await syncQueue.enqueue('services', 'UPDATE', service);
        }
    }

    async deleteService(id: string, user?: User): Promise<void> {
        await offlineStorage.deleteService(id);

        if (this.isOnline) {
            try {
                await this.supabase.deleteService(id, user);
            } catch (error) {
                console.warn('HybridAdapter: Failed to delete service from Supabase, queuing...', error);
                await syncQueue.enqueue('services', 'DELETE', { id });
            }
        } else {
            await syncQueue.enqueue('services', 'DELETE', { id });
        }
    }

    // --- EXPENSES ---
    async getExpenses(ownerId?: string, start?: string, end?: string): Promise<ExpenseRecord[]> {
        if (!ownerId) return [];

        if (this.isOnline) {
            try {
                const expenses = await this.supabase.getExpenses(ownerId, start, end);
                if (!start && !end) {
                    await offlineStorage.saveExpenses(expenses);
                }
                return expenses;
            } catch (error) {
                console.warn('HybridAdapter: Supabase error, falling back to cache', error);
                let expenses = await offlineStorage.getExpenses(ownerId);
                if (start && end) {
                    expenses = expenses.filter(e => {
                        const date = e.date.split('T')[0];
                        return date >= start && date <= end;
                    });
                }
                return expenses;
            }
        }

        let expenses = await offlineStorage.getExpenses(ownerId);
        if (start && end) {
            expenses = expenses.filter(e => {
                const date = e.date.split('T')[0];
                return date >= start && date <= end;
            });
        }
        return expenses;
    }

    async saveExpense(expense: ExpenseRecord): Promise<void> {
        await offlineStorage.saveExpense(expense);

        if (this.isOnline) {
            try {
                await this.supabase.saveExpense(expense);
            } catch (error) {
                console.warn('HybridAdapter: Failed to save expense to Supabase, queuing...', error);
                await syncQueue.enqueue('expenses', 'CREATE', expense);
            }
        } else {
            await syncQueue.enqueue('expenses', 'CREATE', expense);
        }
    }

    async deleteExpense(id: string): Promise<void> {
        await offlineStorage.deleteExpense(id);

        if (this.isOnline) {
            try {
                await this.supabase.deleteExpense(id);
            } catch (error) {
                console.warn('HybridAdapter: Failed to delete expense from Supabase, queuing...', error);
                await syncQueue.enqueue('expenses', 'DELETE', { id });
            }
        } else {
            await syncQueue.enqueue('expenses', 'DELETE', { id });
        }
    }

    // --- SERVICE LOGS ---
    async getServiceLogs(serviceId: string): Promise<ServiceLog[]> {
        if (this.isOnline && this.supabase.getServiceLogs) {
            return this.supabase.getServiceLogs(serviceId);
        }
        return [];
    }

    // --- MANUAL SYNC ---
    async forceSync(ownerId: string): Promise<void> {
        if (!this.isOnline) {
            throw new Error('Cannot sync while offline');
        }

        // Process pending queue first
        await this.processQueueAndSync();

        // Fetch fresh data from Supabase and update cache
        const [clients, services, expenses] = await Promise.all([
            this.supabase.getClients(ownerId),
            this.supabase.getServices(ownerId),
            this.supabase.getExpenses(ownerId)
        ]);

        await offlineStorage.syncFromServer(ownerId, clients, services, expenses);
        console.log('HybridAdapter: Force sync completed');
    }
}
