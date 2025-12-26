import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseAdapter } from './types';
import { Client, ServiceRecord, ExpenseRecord, User, ServiceLog } from '../../types';

export class SupabaseAdapter implements DatabaseAdapter {
    private supabase: SupabaseClient;

    constructor(url: string, key: string) {
        this.supabase = createClient(url, key);
    }

    async initialize() {
        console.log('Supabase Adapter Conectado');
    }

    // --- USERS (CORREÇÃO DE MAPEAMENTO APLICADA AQUI) ---
    async getUsers(): Promise<User[]> {
        const { data, error } = await this.supabase.from('users').select('*');
        
        if (error) {
            console.error("Erro ao buscar usuários:", error.message);
            return [];
        }

        // AQUI ESTÁ A MÁGICA: Converte o que vem do banco para o que o app entende
        return data.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            password: u.password,
            phone: u.phone,
            role: u.role,
            status: u.status,
            // Campos críticos que estavam faltando mapeamento:
            companyName: u.company_name,       
            companyAddress: u.company_address, 
            companyCnpj: u.company_cnpj
        })) as User[];
    }

    async saveUser(user: User): Promise<void> {
        const payload = {
            id: user.id,
            name: user.name,
            email: user.email,
            password: user.password,
            phone: user.phone,
            role: user.role,
            status: user.status,
            company_name: user.companyName,     // Mapeia de volta para salvar
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

        if (!error && user.password) {
            try { await this.supabase.auth.updateUser({ password: user.password }); } catch (e) {}
        }
    }

    async deleteUser(id: string): Promise<void> {
        await this.supabase.from('users').delete().eq('id', id);
    }

    async login(email: string, pass: string): Promise<User | null> {
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', pass)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            password: data.password,
            phone: data.phone,
            role: data.role,
            status: data.status,
            companyName: data.company_name,
            companyAddress: data.company_address,
            companyCnpj: data.company_cnpj
        } as User;
    }

    // --- CLIENTS ---
    async getClients(ownerId: string): Promise<Client[]> {
        const { data, error } = await this.supabase.from('clients').select('*').eq('owner_id', ownerId);
        if (error) return [];
        return data.map((d: any) => ({
            ...d,
            ownerId: d.owner_id,
            createdAt: d.created_at,
            contactPerson: d.contact_person,
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
            cnpj: client.cnpj,
            created_at: client.createdAt,
            deleted_at: client.deletedAt || null
        };
        await this.supabase.from('clients').upsert(payload);
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
        if (error) return [];

        return data.map((d: any) => ({
            ...d,
            ownerId: d.owner_id,
            clientId: d.client_id,
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
            deletedAt: d.deleted_at
        })) as ServiceRecord[];
    }

    async saveService(service: ServiceRecord, user?: User): Promise<void> {
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
            deleted_at: service.deletedAt || null
        };
        await this.supabase.from('services').upsert(payload);
    }

    async updateService(service: ServiceRecord, user?: User): Promise<void> {
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
            deleted_at: service.deletedAt || null
        };
        await this.supabase.from('services').update(payload).eq('id', service.id);
    }

    async deleteService(id: string, user?: User): Promise<void> {
        await this.supabase.from('services').delete().eq('id', id);
    }

    // --- EXPENSES ---
    async getExpenses(ownerId?: string, start?: string, end?: string): Promise<ExpenseRecord[]> {
        let query = this.supabase.from('expenses').select('*');
        if (ownerId) query = query.eq('owner_id', ownerId);
        if (start && end) query = query.gte('date', start).lte('date', end);
        
        const { data } = await query;
        return (data || []).map((d: any) => ({ ...d, ownerId: d.owner_id })) as ExpenseRecord[];
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

    async getServiceLogs(serviceId: string): Promise<ServiceLog[]> { return []; }
    async requestPasswordReset(email: string) { return { success: true }; }
    async completePasswordReset(email: string, code: string, newPass: string) { return { success: true }; }
}
