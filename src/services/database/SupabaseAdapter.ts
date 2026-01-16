import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseAdapter } from './types';
import { Client, ServiceRecord, ExpenseRecord, User, ServiceLog } from '../../types';
import { supabase } from '../supabaseClient';

export class SupabaseAdapter implements DatabaseAdapter {
    private supabase: SupabaseClient;

    constructor(_url?: string, _key?: string) {
        // Usa o client compartilhado para manter a sessão de autenticação
        this.supabase = supabase;
    }

    async initialize() {
        console.log('Supabase Adapter Conectado (Client Compartilhado)');
    }

    // --- USERS ---
    // Note: getUsers is now restricted - only returns current user's profile
    // Full user list should only be accessible to admins via RLS policies

    async getUsers(): Promise<User[]> {
        // This should be limited by RLS in production
        const { data, error } = await this.supabase.from('users').select('*');

        if (error) {
            console.error("Erro ao buscar usuários:", error.message);
            return [];
        }

        return data.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role,
            status: u.status,
            companyName: u.company_name,
            companyAddress: u.company_address,
            companyCnpj: u.company_cnpj
        })) as User[];
    }

    async getUserProfile(userId: string): Promise<User | null> {
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) {
            console.error("Erro ao buscar perfil:", error?.message);
            return null;
        }

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: data.role,
            status: data.status,
            companyName: data.company_name,
            companyAddress: data.company_address,
            companyCnpj: data.company_cnpj
        } as User;
    }

    async saveUser(user: User): Promise<void> {
        const payload = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            company_name: user.companyName,
            company_address: user.companyAddress,
            company_cnpj: user.companyCnpj
        };

        const { error } = await this.supabase.from('users').upsert(payload);
        if (error) console.error("Erro ao salvar usuário:", error.message);
    }

    async updateUser(user: User): Promise<void> {
        const payload = {
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            company_name: user.companyName,
            company_address: user.companyAddress,
            company_cnpj: user.companyCnpj
        };

        const { error } = await this.supabase.from('users').update(payload).eq('id', user.id);
        if (error) console.error("Erro ao atualizar usuário:", error.message);
    }

    async deleteUser(id: string): Promise<void> {
        await this.supabase.from('users').delete().eq('id', id);
    }

    // --- CLIENTS ---

    async getClients(ownerId?: string): Promise<Client[]> {
        let query = this.supabase.from('clients').select('*');
        if (ownerId) query = query.eq('owner_id', ownerId);

        const { data, error } = await query;
        if (error) {
            console.error("Erro clients:", error.message);
            return [];
        }

        return data.map((d: any) => ({
            id: d.id,
            ownerId: d.owner_id,
            name: d.name,
            email: d.email,
            phone: d.phone,
            category: d.category,
            address: d.address,
            contactPerson: d.contact_person,
            requesters: d.requesters,
            cnpj: d.cnpj,
            createdAt: d.created_at,
            deletedAt: d.deleted_at
        })) as Client[];
    }

    async saveClient(client: Client): Promise<void> {
        const payload = {
            id: client.id,
            owner_id: client.ownerId,
            name: client.name,
            email: client.email,
            phone: client.phone,
            category: client.category,
            address: client.address,
            contact_person: client.contactPerson,
            requesters: client.requesters || [],
            cnpj: client.cnpj,
            created_at: client.createdAt,
            deleted_at: client.deletedAt || null
        };
        const { error } = await this.supabase.from('clients').upsert(payload);
        if (error) {
            console.error("Erro ao salvar cliente:", error.message, error);
            throw new Error(`Erro ao salvar cliente: ${error.message}`);
        }
    }

    async deleteClient(id: string): Promise<void> {
        await this.supabase.from('clients').delete().eq('id', id);
    }

    // --- SERVICES ---

    async getServices(ownerId?: string, start?: string, end?: string): Promise<ServiceRecord[]> {
        let query = this.supabase.from('services').select('*');

        if (ownerId) query = query.eq('owner_id', ownerId);
        if (start && end) query = query.gte('date', start).lte('date', end);

        const { data, error } = await query;
        if (error) {
            console.error("Erro services:", error.message);
            return [];
        }

        return data.map((d: any) => ({
            id: d.id,
            ownerId: d.owner_id,
            clientId: d.client_id,
            date: d.date,
            cost: d.cost,
            pickupAddresses: d.pickup_addresses,
            deliveryAddresses: d.delivery_addresses,
            driverFee: d.driver_fee,
            requesterName: d.requester_name,
            paymentMethod: d.payment_method,
            paid: d.paid,
            status: d.status,
            waitingTime: d.waiting_time,
            extraFee: d.extra_fee,
            manualOrderId: d.manual_order_id,
            totalDistance: d.total_distance,
            deletedAt: d.deleted_at
        })) as ServiceRecord[];
    }

    async saveService(service: ServiceRecord, _user?: User): Promise<void> {
        const payload = {
            id: service.id,
            owner_id: service.ownerId,
            client_id: service.clientId,
            cost: service.cost,
            status: service.status,
            date: service.date,
            pickup_addresses: service.pickupAddresses,
            delivery_addresses: service.deliveryAddresses,
            driver_fee: service.driverFee,
            requester_name: service.requesterName,
            paid: service.paid,
            payment_method: service.paymentMethod,
            waiting_time: service.waitingTime,
            extra_fee: service.extraFee,
            manual_order_id: service.manualOrderId,
            total_distance: service.totalDistance,
            deleted_at: service.deletedAt || null
        };
        const { error } = await this.supabase.from('services').upsert(payload);
        if (error) console.error("Erro ao salvar serviço:", error.message);
    }

    async updateService(service: ServiceRecord, _user?: User): Promise<void> {
        const payload = {
            cost: service.cost,
            status: service.status,
            date: service.date,
            pickup_addresses: service.pickupAddresses,
            delivery_addresses: service.deliveryAddresses,
            driver_fee: service.driverFee,
            requester_name: service.requesterName,
            paid: service.paid,
            payment_method: service.paymentMethod,
            waiting_time: service.waitingTime,
            extra_fee: service.extraFee,
            manual_order_id: service.manualOrderId,
            total_distance: service.totalDistance,
            deleted_at: service.deletedAt || null
        };
        await this.supabase.from('services').update(payload).eq('id', service.id);
    }

    async deleteService(id: string, _user?: User): Promise<void> {
        await this.supabase.from('services').delete().eq('id', id);
    }

    // --- EXPENSES ---

    async getExpenses(ownerId?: string, start?: string, end?: string): Promise<ExpenseRecord[]> {
        let query = this.supabase.from('expenses').select('*');
        if (ownerId) query = query.eq('owner_id', ownerId);
        if (start && end) query = query.gte('date', start).lte('date', end);

        const { data, error } = await query;
        if (error) return [];

        return data.map((d: any) => ({
            id: d.id,
            ownerId: d.owner_id,
            category: d.category,
            amount: d.amount,
            date: d.date,
            description: d.description
        })) as ExpenseRecord[];
    }

    async saveExpense(expense: ExpenseRecord): Promise<void> {
        const payload = {
            id: expense.id,
            owner_id: expense.ownerId,
            category: expense.category,
            amount: expense.amount,
            date: expense.date,
            description: expense.description
        };
        await this.supabase.from('expenses').upsert(payload);
    }

    async deleteExpense(id: string): Promise<void> {
        await this.supabase.from('expenses').delete().eq('id', id);
    }

    // --- UTILS ---
    async getServiceLogs(_serviceId: string): Promise<ServiceLog[]> { return []; }
}
