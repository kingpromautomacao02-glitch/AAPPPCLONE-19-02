import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
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

    // --- Refresh all data ---
    const refreshData = useCallback(async () => {
        if (!user) {
            setClients([]);
            setServices([]);
            setExpenses([]);
            return;
        }

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
        }
    }, [user]);

    // --- Client Operations ---
    const saveClient = async (client: Client) => {
        await saveClientService(client);
        await refreshData();
    };

    const deleteClient = async (id: string) => {
        await deleteClientService(id);
        await refreshData();
    };

    const restoreClient = async (id: string) => {
        await restoreClientService(id);
        await refreshData();
    };

    // --- Service Operations ---
    const saveService = async (service: ServiceRecord) => {
        await saveServiceService(service);
        await refreshData();
    };

    const updateService = async (service: ServiceRecord) => {
        await updateServiceService(service);
        await refreshData();
    };

    const deleteService = async (id: string) => {
        await deleteServiceService(id);
        await refreshData();
    };

    const restoreService = async (id: string) => {
        await restoreServiceService(id);
        await refreshData();
    };

    // --- Expense Operations ---
    const saveExpense = async (expense: ExpenseRecord) => {
        await saveExpenseService(expense);
        await refreshData();
    };

    const deleteExpense = async (id: string) => {
        await deleteExpenseService(id);
        await refreshData();
    };

    const value: DataContextType = {
        clients,
        services,
        expenses,
        loading,
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
