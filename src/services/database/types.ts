export type UserRole = 'ADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'BLOCKED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  companyName?: string;
  companyAddress?: string;
  companyCnpj?: string;
}

export interface Client {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  createdAt: string;
  address?: string;
  contactPerson?: string;
  cnpj?: string;
  deletedAt?: string; // Soft Delete
}

export type PaymentMethod = 'PIX' | 'CASH' | 'CARD';
export type ServiceStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface ServiceRecord {
  id: string;
  ownerId: string;
  clientId: string;
  pickupAddresses: string[];
  deliveryAddresses: string[];
  cost: number;
  driverFee: number;
  requesterName: string;
  date: string;
  notes?: string;
  imageUrl?: string;
  paid: boolean;
  paymentMethod?: PaymentMethod;
  status: ServiceStatus;
  manualOrderId?: string;
  waitingTime?: number;
  extraFee?: number;
  deletedAt?: string; // Soft Delete
}

// --- NOVO: Interface para o Log de Auditoria ---
export interface ServiceLog {
  id: string;
  serviceId: string;
  userName: string;
  action: 'CRIACAO' | 'EDICAO' | 'EXCLUSAO' | 'RESTAURACAO';
  changes: Record<string, { old: any, new: any }>; // Armazena o "De -> Para"
  createdAt: string;
}

export type ExpenseCategory = 'GAS' | 'LUNCH' | 'OTHER';

export interface ExpenseRecord {
  id: string;
  ownerId: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description?: string;
}

export enum AppView {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  CLIENTS = 'CLIENTS',
  CLIENT_DETAILS = 'CLIENT_DETAILS',
  EXPENSES = 'EXPENSES',
  REPORTS = 'REPORTS',
  NEW_ORDER = 'NEW_ORDER',
  ADMIN_PANEL = 'ADMIN_PANEL',
  SETTINGS = 'SETTINGS',
}

export interface NavState {
  view: AppView;
  clientId?: string;
}

export type DbProvider = 'FIREBASE' | 'SUPABASE' | 'MONGODB' | 'WEBHOOK' | 'GOOGLE_DRIVE';

export interface DatabaseConnection {
  id: string;
  provider: DbProvider;
  name: string;
  isActive: boolean;
  endpointUrl: string;
  apiKey?: string;
  lastBackupStatus: 'SUCCESS' | 'ERROR' | 'PENDING' | 'NEVER';
  lastBackupTime?: string;
}

export interface DatabaseAdapter {
  initialize(): Promise<void>;

  // Users
  getUsers(): Promise<User[]>;
  saveUser(user: User): Promise<void>;
  updateUser(user: User): Promise<void>;
  deleteUser(id: string): Promise<void>;


  // Clients
  getClients(ownerId: string): Promise<Client[]>;
  saveClient(client: Client): Promise<void>;
  deleteClient(id: string): Promise<void>;

  // Services
  getServices(ownerId: string, start?: string, end?: string, clientId?: string): Promise<ServiceRecord[]>;
  saveService(service: ServiceRecord, user?: User): Promise<void>;
  updateService?(service: ServiceRecord, user?: User): Promise<void>;
  deleteService(id: string, user?: User): Promise<void>;
  getServiceLogs?(serviceId: string): Promise<ServiceLog[]>;

  // Expenses
  getExpenses(ownerId: string, start?: string, end?: string): Promise<ExpenseRecord[]>;
  saveExpense(expense: ExpenseRecord): Promise<void>;
  deleteExpense(id: string): Promise<void>;
}
