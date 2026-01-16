import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Client, ServiceRecord, ExpenseRecord } from '../types';
import { TrendingUp, DollarSign, Bike, Wallet, Banknote, QrCode, CreditCard, CalendarDays, Calendar, Filter, Clock, Trophy, Package } from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface DashboardProps {
    currentUser?: any;
}

type TimeFrame = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

import { safeParseFloat } from '../utils/numberUtils';

// --- FUNÇÃO DE CONVERSÃO SEGURA PARA NÚMEROS ---
// (Agora importada de ../utils/numberUtils)


// --- FUNÇÃO DE DATA SIMPLIFICADA ---
// Garante compatibilidade com o banco para os dados aparecerem
const getSaoPauloDateStr = (dateInput: Date | string) => {
    let d: Date;
    if (typeof dateInput === 'string') {
        d = dateInput.includes('T') ? new Date(dateInput) : new Date(dateInput + 'T12:00:00');
    } else {
        d = dateInput;
    }
    const spDate = new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const year = spDate.getFullYear();
    const month = String(spDate.getMonth() + 1).padStart(2, '0');
    const day = String(spDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const Dashboard: React.FC<DashboardProps> = () => {
    // Usa o DataContext em vez de carregar diretamente
    const { clients, services, expenses, loading: dataLoading, refreshData } = useData();

    // Estado local apenas para controle de primeiro carregamento
    const [initialLoading, setInitialLoading] = useState(true);

    const [timeFrame, setTimeFrame] = useState<TimeFrame>('MONTHLY');
    const [customStart, setCustomStart] = useState(getSaoPauloDateStr(new Date()));
    const [customEnd, setCustomEnd] = useState(getSaoPauloDateStr(new Date()));

    const { startDate, endDate, label } = useMemo(() => {
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let s = '';
        let e = '';
        let l = '';

        if (timeFrame === 'DAILY') {
            s = getSaoPauloDateStr(now);
            e = s;
            l = 'Hoje';
        } else if (timeFrame === 'WEEKLY') {
            const start = new Date(now);
            const day = start.getDay();
            const diff = start.getDate() - day;
            start.setDate(diff);
            s = getSaoPauloDateStr(start);

            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            e = getSaoPauloDateStr(end);
            l = 'Esta Semana';
        } else if (timeFrame === 'MONTHLY') {
            const start = new Date(currentYear, currentMonth, 1);
            const end = new Date(currentYear, currentMonth + 1, 0);
            s = getSaoPauloDateStr(start);
            e = getSaoPauloDateStr(end);
            l = 'Este Mês';
        } else if (timeFrame === 'YEARLY') {
            const start = new Date(currentYear, 0, 1);
            const end = new Date(currentYear, 11, 31);
            s = getSaoPauloDateStr(start);
            e = getSaoPauloDateStr(end);
            l = 'Este Ano';
        } else if (timeFrame === 'CUSTOM') {
            s = customStart;
            e = customEnd;
            l = 'Período Personalizado';
        }

        return { startDate: s, endDate: e, label: l };
    }, [timeFrame, customStart, customEnd]);

    // Carrega dados na montagem e quando não há dados
    useEffect(() => {
        const loadInitialData = async () => {
            // Se não há dados ainda, força um refresh
            if (clients.length === 0 && services.length === 0 && expenses.length === 0) {
                await refreshData();
            }
            setInitialLoading(false);
        };
        loadInitialData();
    }, [clients.length, services.length, expenses.length, refreshData]);

    // Determina estado de loading combinado
    const loading = initialLoading || dataLoading;

    const _processedData = useMemo(() => {
        // Garante que services seja um array antes de filtrar
        const safeServices = Array.isArray(services) ? services : [];
        const safeExpenses = Array.isArray(expenses) ? expenses : [];

        // Filtros Base
        const activeServices = safeServices.filter(s => !s.deletedAt && s.status !== 'CANCELLED');

        // Receita: Considera DONE, ou se tiver pago
        const revenueServices = activeServices.filter(s => {
            return s.status === 'DONE' || s.paid;
        });

        // Pendentes: Serviços ativos que não foram pagos
        const pendingServices = activeServices.filter(s => !s.paid);

        return {
            activeServices,
            revenueServices,
            pendingServices,
            allExpenses: safeExpenses
        };
    }, [services, expenses]);

    const stats = useMemo(() => {
        // Filtra serviços pela data e remove excluídos/cancelados
        const filteredServices = services.filter(s => {
            if (!s.date || s.deletedAt || s.status === 'CANCELLED') return false;
            const sDate = s.date.split('T')[0];
            return sDate >= startDate && sDate <= endDate;
        });

        const filteredExpenses = expenses.filter(e => {
            if (!e.date) return false;
            const eDate = e.date.split('T')[0];
            return eDate >= startDate && eDate <= endDate;
        });

        let totalRevenue = 0;
        let totalReceived = 0;
        let totalPending = 0;
        let totalDriverPay = 0;
        const revenueByMethod: any = { PIX: 0, CASH: 0, CARD: 0 };

        filteredServices.forEach(service => {
            const val = safeParseFloat(service.cost) + safeParseFloat(service.waitingTime);
            const driver = safeParseFloat(service.driverFee);

            totalRevenue += val;
            totalDriverPay += driver;

            if (service.paid) {
                totalReceived += val;
                const method = service.paymentMethod || 'PIX';
                revenueByMethod[method] = (revenueByMethod[method] || 0) + val;
            } else {
                totalPending += val;
            }
        });

        let totalOperationalExpenses = 0;
        const expensesByCat: any = {};
        filteredExpenses.forEach(exp => {
            const amount = safeParseFloat(exp.amount);
            totalOperationalExpenses += amount;
            expensesByCat[exp.category] = (expensesByCat[exp.category] || 0) + amount;
        });

        const netProfit = totalRevenue - totalDriverPay - totalOperationalExpenses;

        return {
            totalRevenue,
            totalReceived,
            totalPending,
            totalDriverPay,
            totalOperationalExpenses,
            netProfit,
            revenueByMethod,
            expensesByCat,
            filteredServices,
            filteredExpenses,
            totalCount: filteredServices.length
        };
    }, [services, expenses, startDate, endDate]);

    // Prepara dados do gráfico
    const chartData = useMemo(() => {
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

        stats.filteredServices.forEach(s =>
            addToMap(s.date, safeParseFloat(s.cost) + safeParseFloat(s.waitingTime), safeParseFloat(s.driverFee))
        );
        stats.filteredExpenses.forEach(e => addToMap(e.date, 0, safeParseFloat(e.amount)));

        return Array.from(dataMap.values())
            .map(e => ({ ...e, profit: e.revenue - e.cost }))
            .sort((a, b) => a.sortKey - b.sortKey);
    }, [stats, timeFrame]);

    const topClients = useMemo(() => {
        const map = new Map();
        stats.filteredServices.forEach(s => {
            const val = safeParseFloat(s.cost) + safeParseFloat(s.waitingTime);
            const name = clients.find(c => c.id === s.clientId)?.name || 'Cliente Removido';
            if (!map.has(s.clientId)) map.set(s.clientId, { name, revenue: 0, count: 0 });
            const entry = map.get(s.clientId);
            entry.revenue += val;
            entry.count += 1;
            map.set(s.clientId, entry);
        });
        const list = Array.from(map.values());
        return {
            byRevenue: [...list].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
            byCount: [...list].sort((a, b) => b.count - a.count).slice(0, 5)
        };
    }, [stats, clients]);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse p-4 md:p-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800"></div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-[400px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="h-[400px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header e Filtros */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        Visão Geral Financeira
                        {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 mt-1">
                        <Calendar size={14} />
                        Exibindo dados de: <span className="font-bold text-slate-700 dark:text-slate-300">{label}</span>
                        <span className="ml-2 text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500">
                            ({stats.totalCount} serviços encontrados)
                        </span>
                    </p >
                </div >
                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm self-start md:self-auto overflow-x-auto max-w-full items-center">
                    {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as TimeFrame[]).map(tf => (
                        <button key={tf} onClick={() => setTimeFrame(tf)} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all whitespace-nowrap ${timeFrame === tf ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            {tf === 'DAILY' ? 'Hoje' : tf === 'WEEKLY' ? 'Semana' : tf === 'MONTHLY' ? 'Mês' : 'Ano'}
                        </button>
                    ))}
                    <button onClick={() => setTimeFrame('CUSTOM')} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all whitespace-nowrap flex items-center gap-1 ${timeFrame === 'CUSTOM' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <Filter size={14} /> Personalizado
                    </button>
                    {timeFrame === 'CUSTOM' && (
                        <div className="flex items-center gap-2 ml-2 px-2 border-l border-slate-200 dark:border-slate-600">
                            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="p-1 text-xs border border-slate-300 rounded dark:bg-slate-800 dark:text-white" />
                            <span className="text-slate-400">-</span>
                            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="p-1 text-xs border border-slate-300 rounded dark:bg-slate-800 dark:text-white" />
                        </div>
                    )}
                </div>
            </div >

            {/* Cards Principais */}
            < div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6" >
                {
                    [
                        { title: 'Faturamento Total', value: stats.totalRevenue, icon: <DollarSign size={48} className="text-blue-600" />, color: 'text-blue-700', sub: 'Serviços Prestados' },
                        { title: 'A Receber', value: stats.totalPending, icon: <Clock size={48} className="text-amber-600" />, color: 'text-amber-600', border: 'border-l-4 border-l-amber-400', sub: 'Pendente' },
                        { title: 'Pago aos Motoboys', value: stats.totalDriverPay, icon: <Bike size={48} className="text-red-600" />, color: 'text-red-600', sub: 'Comissão' },
                        { title: 'Despesas', value: stats.totalOperationalExpenses, icon: <Wallet size={48} className="text-orange-600" />, color: 'text-orange-600', sub: 'Operacional' },
                        { title: 'Lucro Líquido', value: stats.netProfit, icon: <TrendingUp size={48} className="text-emerald-600" />, color: stats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600', sub: 'Resultado Final' }
                    ].map((card, idx) => (
                        <div key={idx} className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden ${card.border || ''}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10">{card.icon}</div>
                            <div className="flex flex-col">
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-1">{card.title}</p>
                                <h3 className={`text-2xl font-bold ${card.color} dark:${card.color.replace('700', '400')}`}>
                                    R$ {card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{card.sub}</p>
                            </div>
                        </div>
                    ))
                }
            </div >

            {/* Gráfico e Detalhes */}
            < div className="grid grid-cols-1 lg:grid-cols-3 gap-6" >
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
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Recebido por Método</h2>
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
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Trophy size={20} className="text-yellow-500" /> Top Clientes (Faturamento)</h2>
                        <div className="space-y-3">
                            {topClients.byRevenue.length === 0 ? <p className="text-slate-400 italic">Sem dados</p> :
                                topClients.byRevenue.map((c, i) => (
                                    <div key={i} className="flex justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded border border-slate-100 dark:border-slate-600">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-yellow-100 text-yellow-700 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold">{i + 1}</span>
                                            <span className="text-slate-800 dark:text-white font-medium truncate w-32 md:w-40">{c.name}</span>
                                        </div>
                                        <span className="text-slate-600 dark:text-slate-300 font-bold">R$ {c.revenue.toFixed(2)}</span>
                                    </div>
                                ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Package size={20} className="text-blue-500" /> Top Clientes (Volume)</h2>
                        <div className="space-y-3">
                            {topClients.byCount.length === 0 ? <p className="text-slate-400 italic">Sem dados</p> :
                                topClients.byCount.map((c, i) => (
                                    <div key={i} className="flex justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded border border-slate-100 dark:border-slate-600">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-blue-100 text-blue-700 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold">{i + 1}</span>
                                            <span className="text-slate-800 dark:text-white font-medium truncate w-32 md:w-40">{c.name}</span>
                                        </div>
                                        <span className="text-slate-600 dark:text-slate-300 font-bold">{c.count} serviços</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
};
