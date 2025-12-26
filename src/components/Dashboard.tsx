import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Client, ServiceRecord, ExpenseRecord } from '../types';
import { TrendingUp, DollarSign, Bike, Wallet, Banknote, QrCode, CreditCard, CalendarDays, Calendar, Filter, Utensils, Fuel, Trophy, Package, Clock } from 'lucide-react';
import { getServices, getExpenses, getClients } from '../services/storageService';

interface DashboardProps {
    currentUser?: any;
}

type TimeFrame = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

// --- FUNÇÃO DE DATA (Sem date-fns para evitar erros de build) ---
const getSaoPauloDateStr = (dateInput: Date | string, isEndOfDay: boolean = false) => {
    let d: Date;
    if (typeof dateInput === 'string') {
        d = dateInput.includes('T') ? new Date(dateInput) : new Date(dateInput + 'T12:00:00');
    } else {
        d = dateInput;
    }

    // Converte para SP
    const spDate = new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const year = spDate.getFullYear();
    const month = String(spDate.getMonth() + 1).padStart(2, '0');
    const day = String(spDate.getDate()).padStart(2, '0');
    
    // Se for final do dia, adiciona o horário limite
    if (isEndOfDay) {
        return `${year}-${month}-${day}T23:59:59`;
    }
    return `${year}-${month}-${day}`;
};

export const Dashboard: React.FC<DashboardProps> = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [services, setServices] = useState<ServiceRecord[]>([]);
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const [timeFrame, setTimeFrame] = useState<TimeFrame>('MONTHLY');
    const [customStart, setCustomStart] = useState(getSaoPauloDateStr(new Date()));
    const [customEnd, setCustomEnd] = useState(getSaoPauloDateStr(new Date()));

    const { startStr, endStr, dateLabel } = useMemo(() => {
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let s = '';
        let e = '';
        let l = '';

        if (timeFrame === 'DAILY') {
            s = getSaoPauloDateStr(now);
            e = getSaoPauloDateStr(now, true);
            l = 'Hoje';
        } else if (timeFrame === 'WEEKLY') {
            const start = new Date(now);
            const day = start.getDay(); 
            const diff = start.getDate() - day; 
            start.setDate(diff);
            s = getSaoPauloDateStr(start);

            const end = new Date(start);
            end.setDate(start.getDate() + 6); 
            e = getSaoPauloDateStr(end, true);
            l = 'Esta Semana';
        } else if (timeFrame === 'MONTHLY') {
            const start = new Date(currentYear, currentMonth, 1);
            const end = new Date(currentYear, currentMonth + 1, 0);
            s = getSaoPauloDateStr(start);
            e = getSaoPauloDateStr(end, true);
            l = 'Este Mês';
        } else if (timeFrame === 'YEARLY') {
            const start = new Date(currentYear, 0, 1);
            const end = new Date(currentYear, 11, 31);
            s = getSaoPauloDateStr(start);
            e = getSaoPauloDateStr(end, true);
            l = 'Este Ano';
        } else if (timeFrame === 'CUSTOM') {
            s = customStart;
            e = customEnd.includes('T') ? customEnd : `${customEnd}T23:59:59`;
            l = 'Período Personalizado';
        }
        return { startStr: s, endStr: e, dateLabel: l };
    }, [timeFrame, customStart, customEnd]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Previne crash se a API falhar
                const [clientsData, servicesData, expensesData] = await Promise.all([
                    getClients().catch(() => []),
                    getServices(startStr, endStr).catch(() => []),
                    getExpenses(startStr, endStr).catch(() => [])
                ]);
                
                setClients(clientsData || []);
                setServices(servicesData || []);
                setExpenses(expensesData || []);
            } catch (error) {
                console.error("Erro crítico ao carregar dashboard:", error);
            } finally {
                setLoading(false);
            }
        };
        if (startStr && endStr) {
            loadData();
        }
    }, [startStr, endStr]);

    // --- CORREÇÃO DO TRAVAMENTO AQUI ---
    const processedData = useMemo(() => {
        // Separa os dados corretamente em um objeto único
        return {
            // Serviços Concluídos (para Receita)
            completedServices: services.filter(s => !s.deletedAt && s.status === 'Concluído'),
            
            // Serviços Pendentes de Pagamento (Concluídos mas não pagos)
            pendingServices: services.filter(s => !s.deletedAt && !s.paid && s.status === 'Concluído'),
            
            // Todas as despesas
            allExpenses: expenses
        };
    }, [services, expenses]);

    const stats = useMemo(() => {
        const { completedServices, pendingServices, allExpenses } = processedData;

        // 1. Receita Total: Custo + Espera (SEM Taxa Extra)
        const totalRevenue = completedServices.reduce((sum, s) => 
            sum + Number(s.cost || 0) + Number(s.waitingTime || 0), 0);
        
        const totalDriverPay = completedServices.reduce((sum, s) => 
            sum + Number(s.driverFee || 0), 0);

        // 2. A Receber: Custo + Espera (SEM Taxa Extra)
        const totalPending = pendingServices.reduce((sum, s) => 
            sum + Number(s.cost || 0) + Number(s.waitingTime || 0), 0);

        const expensesByCat = allExpenses.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount || 0);
            return acc;
        }, {} as Record<string, number>);

        const revenueByMethod = completedServices.reduce((acc, curr) => {
            const method = curr.paymentMethod || 'PIX';
            acc[method] = (acc[method] || 0) + Number(curr.cost || 0) + Number(curr.waitingTime || 0);
            return acc;
        }, { PIX: 0, CASH: 0, CARD: 0 } as Record<string, number>);

        const totalOperationalExpenses = allExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const netProfit = totalRevenue - totalDriverPay - totalOperationalExpenses;

        return {
            totalRevenue,
            totalPending,
            totalDriverPay,
            totalOperationalExpenses,
            netProfit,
            expensesByCat,
            revenueByMethod
        };
    }, [processedData]);

    const chartData = useMemo(() => {
        const { completedServices, allExpenses } = processedData;
        const dataMap = new Map<string, { name: string, revenue: number, cost: number, profit: number, sortKey: number }>();

        const addToMap = (rawDateStr: string, revenue: number, cost: number) => {
            if (!rawDateStr) return;
            const spDateStr = getSaoPauloDateStr(rawDateStr);
            const [yearStr, monthStr, dayStr] = spDateStr.split('-');
            
            let key = '';
            let label = '';
            let order = 0;

            if (timeFrame === 'YEARLY') {
                key = `${yearStr}-${monthStr}`;
                const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
                const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'short' });
                label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                order = parseInt(monthStr);
            } else {
                key = spDateStr;
                label = `${dayStr}/${monthStr}`;
                order = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr)).getTime();
            }

            const entry = dataMap.get(key) || { name: label, revenue: 0, cost: 0, profit: 0, sortKey: order };
            entry.revenue += revenue;
            entry.cost += cost;
            dataMap.set(key, entry);
        };

        completedServices.forEach(s => 
            addToMap(s.date, Number(s.cost || 0) + Number(s.waitingTime || 0), Number(s.driverFee || 0))
        );
        allExpenses.forEach(e => addToMap(e.date, 0, Number(e.amount || 0)));

        return Array.from(dataMap.values())
            .map(e => ({ ...e, profit: e.revenue - e.cost }))
            .sort((a, b) => a.sortKey - b.sortKey);
    }, [processedData, timeFrame]);

    const topClients = useMemo(() => {
        const { completedServices } = processedData;
        const clientStats = new Map<string, { name: string, count: number, revenue: number }>();

        completedServices.forEach(s => {
            const client = clients.find(c => c.id === s.clientId);
            const name = client ? client.name : 'Desconhecido';
            const id = s.clientId;

            const entry = clientStats.get(id) || { name, count: 0, revenue: 0 };
            entry.count += 1;
            entry.revenue += Number(s.cost || 0) + Number(s.waitingTime || 0);
            clientStats.set(id, entry);
        });

        const sortedByRevenue = Array.from(clientStats.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        const sortedByCount = Array.from(clientStats.values()).sort((a, b) => b.count - a.count).slice(0, 5);

        return { byRevenue: sortedByRevenue, byCount: sortedByCount };
    }, [processedData, clients]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        Visão Geral Financeira
                        {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 mt-1">
                        <Calendar size={14} />
                        Exibindo dados de: <span className="font-bold text-slate-700 dark:text-slate-300">{dateLabel}</span>
                    </p>
                </div>

                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm self-start md:self-auto overflow-x-auto max-w-full items-center">
                    {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as TimeFrame[]).map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeFrame(tf)}
                            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all whitespace-nowrap ${timeFrame === tf ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                            {tf === 'DAILY' ? 'Hoje' : tf === 'WEEKLY' ? 'Semana' : tf === 'MONTHLY' ? 'Mês' : 'Ano'}
                        </button>
                    ))}
                    <button
                        onClick={() => setTimeFrame('CUSTOM')}
                        className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all whitespace-nowrap flex items-center gap-1 ${timeFrame === 'CUSTOM' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        <Filter size={14} /> Personalizado
                    </button>

                    {timeFrame === 'CUSTOM' && (
                        <div className="flex items-center gap-2 ml-2 px-2 border-l border-slate-200 dark:border-slate-600">
                            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="p-1 text-xs border border-slate-300 rounded dark:bg-slate-800 dark:text-white" />
                            <span className="text-slate-400">-</span>
                            <input type="date" value={customEnd.split('T')[0]} onChange={(e) => setCustomEnd(e.target.value)} className="p-1 text-xs border border-slate-300 rounded dark:bg-slate-800 dark:text-white" />
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {[
                    { title: 'Faturamento', value: stats.totalRevenue, icon: <DollarSign size={48} className="text-blue-600" />, color: 'text-blue-700' },
                    { title: 'A Receber', value: stats.totalPending, icon: <Clock size={48} className="text-amber-600" />, color: 'text-amber-600', border: 'border-l-4 border-l-amber-400' },
                    { title: 'Pago aos Motoboys', value: stats.totalDriverPay, icon: <Bike size={48} className="text-red-600" />, color: 'text-red-600' },
                    { title: 'Despesas', value: stats.totalOperationalExpenses, icon: <Wallet size={48} className="text-orange-600" />, color: 'text-orange-600' },
                    { title: 'Lucro Líquido', value: stats.netProfit, icon: <TrendingUp size={48} className="text-emerald-600" />, color: stats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600' }
                ].map((card, idx) => (
                    <div key={idx} className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden ${card.border || ''}`}>
                        <div className="absolute top-0 right-0 p-4 opacity-10">{card.icon}</div>
                        <div className="flex flex-col">
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">{card.title}</p>
                            <h3 className={`text-2xl font-bold ${card.color} dark:${card.color.replace('700', '400')}`}>
                                R$ {card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                        <TrendingUp className="text-slate-500" size={20} /> Evolução Financeira
                    </h2>
                    <div className="h-80 w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                                    <Legend />
                                    <Bar dataKey="revenue" name="Faturamento" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="cost" name="Custos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="profit" name="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 flex-col gap-2">
                                <CalendarDays size={32} className="opacity-20" /> Sem dados neste período
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Receitas por Método</h2>
                        <div className="space-y-4">
                            {[
                                { label: 'Dinheiro', val: stats.revenueByMethod['CASH'], icon: <Banknote size={18} />, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                                { label: 'Pix', val: stats.revenueByMethod['PIX'], icon: <QrCode size={18} />, color: 'text-blue-700', bg: 'bg-slate-50' },
                                { label: 'Cartão', val: stats.revenueByMethod['CARD'], icon: <CreditCard size={18} />, color: 'text-purple-700', bg: 'bg-slate-50' }
                            ].map((m, i) => (
                                <div key={i} className={`flex justify-between p-3 ${m.bg} dark:bg-slate-700 rounded-lg`}>
                                    <div className="flex items-center gap-3"><span className="p-2 bg-white dark:bg-slate-800 rounded shadow-sm">{m.icon}</span> <span className="font-medium text-slate-700 dark:text-slate-300">{m.label}</span></div>
                                    <span className={`font-bold ${m.color} dark:text-white`}>R$ {m.val.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Trophy size={20} className="text-yellow-500"/> Top Clientes</h2>
                        <div className="space-y-3">
                            {topClients.byRevenue.length === 0 ? <p className="text-slate-400 italic">Sem dados</p> : 
                            topClients.byRevenue.map((c, i) => (
                                <div key={i} className="flex justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded border border-slate-100 dark:border-slate-600">
                                    <span className="text-slate-800 dark:text-white font-medium truncate w-32">{c.name}</span>
                                    <span className="text-slate-600 dark:text-slate-300 font-bold">R$ {c.revenue.toFixed(0)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
