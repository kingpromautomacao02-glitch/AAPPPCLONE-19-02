import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { Client, ServiceRecord, ExpenseRecord } from '../types';
import { useAuth } from './AuthContext';
import {
    getClients,
    getServices,
    getExpenses,
    saveClient as saveClientService,
    deleteClient as deleteClientService,
    restoreClient as restoreClientService,
    saveService as saveServiceService,
    updateService as updateServiceService,
    deleteService as deleteServiceService,
    restoreService as restoreServiceService,
    saveExpense as saveExpenseService,
    deleteExpense as deleteExpenseService,
} from '../services/storageService';

// --- Types ---
interface DataContextType {
    clients: Client[];
    services: ServiceRecord[];
    expenses: ExpenseRecord[];
    loading: boolean;
    isSyncing: boolean;
    refreshData: () => Promise<void>;
    // Client operations
    saveClient: (client: Client) => Promise<void>;
    deleteClient: (id: string) => Promise<void>;
    restoreClient: (id: string) => Promise<void>;
    // Service operations
    saveService: (service: ServiceRecord) => Promise<void>;
    updateService: (service: ServiceRecord) => Promise<void>;
    deleteService: (id: string) => Promise<void>;
    restoreService: (id: string) => Promise<void>;
    // Expense operations
    saveExpense: (expense: ExpenseRecord) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// --- Provider Component ---
interface DataProviderProps {
    children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
    const { user } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [services, setServices] = useState<ServiceRecord[]>([]);
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

    // Ref para evitar múltiplas chamadas simultâneas de refresh
    const isRefreshing = useRef(false);

    // --- Refresh all data ---
    const refreshData = useCallback(async () => {
        if (!user) {
            setClients([]);
            setServices([]);
            setExpenses([]);
            return;
        }

        // Evita múltiplas chamadas simultâneas
        if (isRefreshing.current) {
            console.log('DataContext: Refresh já em andamento, ignorando...');
            return;
        }

        isRefreshing.current = true;
        setLoading(true);

        try {
            const [c, s, e] = await Promise.all([
                getClients(),
                getServices(),
                getExpenses(),
            ]);
            setClients(c);
            setServices(s);
            setExpenses(e);
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setLoading(false);
            isRefreshing.current = false;
        }
    }, [user]);

    // Carrega dados automaticamente quando o usuário muda
    useEffect(() => {
        if (user && !hasLoadedInitialData) {
            refreshData().then(() => {
                setHasLoadedInitialData(true);
            });
        } else if (!user) {
            setClients([]);
            setServices([]);
            setExpenses([]);
            setHasLoadedInitialData(false);
        }
    }, [user, hasLoadedInitialData, refreshData]);

    // --- Client Operations com Optimistic Updates ---
    const saveClient = async (client: Client) => {
        // 1. Optimistic Update: Atualiza estado local imediatamente
        setClients(prev => {
            const index = prev.findIndex(c => c.id === client.id);
            if (index >= 0) {
                const updated = [...prev];
                updated[index] = client;
                return updated;
            }
            return [...prev, client];
        });

        // 2. Salva no banco em background (sem aguardar)
        setIsSyncing(true);
        try {
            await saveClientService(client);
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            // Em caso de erro, faz refresh para sincronizar estado
            await refreshData();
        } finally {
            setIsSyncing(false);
        }
    };

    const deleteClient = async (id: string) => {
        // Optimistic: marca como deletado localmente
        setClients(prev => prev.map(c =>
            c.id === id ? { ...c, deletedAt: new Date().toISOString() } : c
        ));

        setIsSyncing(true);
        try {
            await deleteClientService(id);
        } catch (error) {
            console.error('Erro ao deletar cliente:', error);
            await refreshData();
        } finally {
            setIsSyncing(false);
        }
    };

    const restoreClient = async (id: string) => {
        // Optimistic: remove deletedAt localmente
        setClients(prev => prev.map(c =>
            c.id === id ? { ...c, deletedAt: undefined } : c
        ));

        setIsSyncing(true);
        try {
            await restoreClientService(id);
        } catch (error) {
            console.error('Erro ao restaurar cliente:', error);
            await refreshData();
        } finally {
            setIsSyncing(false);
        }
    };

    // --- Service Operations com Optimistic Updates ---
    const saveService = async (service: ServiceRecord) => {
        // Optimistic Update
        setServices(prev => {
            const index = prev.findIndex(s => s.id === service.id);
            if (index >= 0) {
                const updated = [...prev];
                updated[index] = service;
                return updated;
            }
            return [...prev, service];
        });

        setIsSyncing(true);
        try {
            await saveServiceService(service);
        } catch (error) {
            console.error('Erro ao salvar serviço:', error);
            await refreshData();
        } finally {
            setIsSyncing(false);
        }
    };

    const updateService = async (service: ServiceRecord) => {
        // Optimistic Update
        setServices(prev => prev.map(s => s.id === service.id ? service : s));

        setIsSyncing(true);
        try {
            await updateServiceService(service);
        } catch (error) {
            console.error('Erro ao atualizar serviço:', error);
            await refreshData();
        } finally {
            setIsSyncing(false);
        }
    };

    const deleteService = async (id: string) => {
        // Optimistic: marca como deletado
        setServices(prev => prev.map(s =>
            s.id === id ? { ...s, deletedAt: new Date().toISOString() } : s
        ));

        setIsSyncing(true);
        try {
            await deleteServiceService(id);
        } catch (error) {
            console.error('Erro ao deletar serviço:', error);
            await refreshData();
        } finally {
            setIsSyncing(false);
        }
    };

    const restoreService = async (id: string) => {
        // Optimistic: remove deletedAt
        setServices(prev => prev.map(s =>
            s.id === id ? { ...s, deletedAt: undefined } : s
        ));

        setIsSyncing(true);
        try {
            await restoreServiceService(id);
        } catch (error) {
            console.error('Erro ao restaurar serviço:', error);
            await refreshData();
        } finally {
            setIsSyncing(false);
        }
    };

    // --- Expense Operations com Optimistic Updates ---
    const saveExpense = async (expense: ExpenseRecord) => {
        // Optimistic Update
        setExpenses(prev => {
            const index = prev.findIndex(e => e.id === expense.id);
            if (index >= 0) {
                const updated = [...prev];
                updated[index] = expense;
                return updated;
            }
            return [...prev, expense];
        });

        setIsSyncing(true);
        try {
            await saveExpenseService(expense);
        } catch (error) {
            console.error('Erro ao salvar despesa:', error);
            await refreshData();
        } finally {
            setIsSyncing(false);
        }
    };

    const deleteExpense = async (id: string) => {
        // Optimistic: remove da lista
        setExpenses(prev => prev.filter(e => e.id !== id));

        setIsSyncing(true);
        try {
            await deleteExpenseService(id);
        } catch (error) {
            console.error('Erro ao deletar despesa:', error);
            await refreshData();
        } finally {
            setIsSyncing(false);
        }
    };

    const value: DataContextType = {
        clients,
        services,
        expenses,
        loading,
        isSyncing,
        refreshData,
        saveClient,
        deleteClient,
        restoreClient,
        saveService,
        updateService,
        deleteService,
        restoreService,
        saveExpense,
        deleteExpense,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// --- Hook ---
export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
