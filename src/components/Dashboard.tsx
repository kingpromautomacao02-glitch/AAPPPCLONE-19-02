import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Client, ServiceRecord, ExpenseRecord } from '../types';
import { TrendingUp, DollarSign, Bike, Wallet, Banknote, QrCode, CreditCard, CalendarDays, Calendar, Filter, Utensils, Fuel, Clock, Trophy, Package } from 'lucide-react';
import { getServices, getExpenses, getClients } from '../services/storageService';

interface DashboardProps {
    currentUser?: any;
}

type TimeFrame = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

// Função auxiliar segura para somar valores (evita erros como "100" + "20" = "10020")
const safeFloat = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    // Remove R$ e troca virgula por ponto
    return parseFloat(val.toString().replace('R$', '').replace('.', '').replace(',', '.')) || 0;
};

export const Dashboard: React.FC<DashboardProps> = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [services, setServices] = useState<ServiceRecord[]>([]);
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Estado do filtro de tempo
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('MONTHLY');
    const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
    const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

    // 1. CARREGAMENTO DOS DADOS (Busca TUDO e filtra na memória, igual ao Relatório)
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [allClients, allServices, allExpenses] = await Promise.all([
                    getClients(),
                    getServices(), // Traz tudo para garantir que não falta nada
                    getExpenses()
                ]);
                setClients(allClients || []);
                setServices(allServices || []);
                setExpenses(allExpenses || []);
            } catch (error) {
                console.error("Erro ao carregar dashboard:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // 2. DEFINIÇÃO DAS DATAS DE FILTRO
    const { startDate, endDate, label } = useMemo(() => {
        const now = new Date();
        // Ajuste simples para garantir fuso horário correto no Brasil
        now.setHours(now.getHours() - 3); 
        
        const todayStr = now.toISOString().split('T')[0];
        let start = todayStr;
        let end = todayStr;
        let txt = 'Hoje';

        if (timeFrame === 'DAILY') {
            start = todayStr;
            end = todayStr;
            txt = 'Hoje';
        } else if (timeFrame === 'WEEKLY') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 1; // Ajuste para segunda-feira
            const first = new Date(now.setDate(diff));
            const last = new Date(now.setDate(diff + 6));
            start = first.toISOString().split('T')[0];
            end = last.toISOString().split('T')[0];
            txt = 'Esta Semana';
        } else if (timeFrame === 'MONTHLY') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            start = firstDay.toISOString().split('T')[0];
            end = lastDay.toISOString().split('T')[0];
            txt = 'Este Mês';
        } else if (timeFrame === 'YEARLY') {
            start = `${now.getFullYear()}-01-01`;
            end = `${now.getFullYear()}-12-31`;
            txt = 'Este Ano';
        } else if (timeFrame === 'CUSTOM') {
            start = customStart;
            end = customEnd;
            txt = 'Período Personalizado';
        }

        return { startDate: start, endDate: end, label: txt };
    }, [timeFrame, customStart, customEnd]);

    // 3. PROCESSAMENTO E FILTRAGEM (O "Coração" do Dashboard)
    const stats = useMemo(() => {
        // Filtra pela data (String vs String simples para não ter erro)
        const filteredServices = services.filter(s => {
            if (!s.date) return false;
            const sDate = s.date.split('T')[0];
            return sDate >= startDate && sDate <= endDate && !s.deletedAt;
        });

        const filteredExpenses = expenses.filter(e => {
            if (!e.date) return false;
            const eDate = e.date.split('T')[0];
            return eDate >= startDate && eDate <= endDate;
        });

        // Cálculos
        let totalRevenue = 0;
        let totalPending = 0;
        let totalDriverPay = 0;
        const revenueByMethod: any = { PIX: 0, CASH: 0, CARD: 0 };

        filteredServices.forEach(service => {
            const cost = safeFloat(service.cost);
            const waiting = safeFloat(service.waitingTime);
            const driver = safeFloat(service.driverFee);
            const totalServiceValue = cost + waiting; // SOMA: Custo + Espera

            // Se for cancelado, ignora tudo
            if (service.status === 'Cancelado') return;

            // Se for Pendente e não pago, soma no "A Receber"
            if (service.status === 'Pendente' && !service.paid) {
                totalPending += totalServiceValue;
            } else {
                // Se for Concluído/Finalizado/Entregue OU estiver Pago, conta como Receita
                // Essa lógica garante que bata com o relatório que mostra tudo que foi feito
                totalRevenue += totalServiceValue;
                totalDriverPay += driver;

                // Soma por método de pagamento
                const method = service.paymentMethod || 'PIX';
                revenueByMethod[method] = (revenueByMethod[method] || 0) + totalServiceValue;
            }
        });

        // Despesas
        let totalOperationalExpenses = 0;
        const expensesByCat: any = {};
        filteredExpenses.forEach(exp => {
            const amount = safeFloat(exp.amount);
            totalOperationalExpenses += amount;
            expensesByCat[exp.category] = (expensesByCat[exp.category] || 0) + amount;
        });

        const netProfit = totalRevenue - totalDriverPay - totalOperationalExpenses;

        return {
            totalRevenue,
            totalPending,
            totalDriverPay,
            totalOperationalExpenses,
            netProfit,
            revenueByMethod,
            expensesByCat,
            filteredServices, // Guardamos para usar no gráfico e top clients
            filteredExpenses
        };
    }, [services, expenses, startDate, endDate]);

    // 4. DADOS DO GRÁFICO (Simplificado)
    const chartData = useMemo(() => {
        const data: any[] = [];
        // Agrupa por dia
        const daysMap = new Map();

        stats.filteredServices.forEach(s => {
            const day = s.date.split('T')[0].split('-').slice(1).reverse().join('/'); // DD/MM
            if (!daysMap.has(day)) daysMap.set(day, { name: day, revenue: 0, cost: 0, profit: 0 });
            
            const val = safeFloat(s.cost) + safeFloat(s.waitingTime);
            const driver = safeFloat(s.driverFee);
            
            const entry = daysMap.get(day);
            entry.revenue += val;
            entry.cost += driver;
            daysMap.set(day, entry);
        });

        stats.filteredExpenses.forEach(e => {
            const day = e.date.split('T')[0].split('-').slice(1).reverse().join('/');
            if (!daysMap.has(day)) daysMap.set(day, { name: day, revenue: 0, cost: 0, profit: 0 });
            const entry = daysMap.get(day);
            entry.cost += safeFloat(e.amount);
            daysMap.set(day, entry);
        });

        daysMap.forEach(v => {
            v.profit = v.revenue - v.cost;
            data.push(v);
        });

        return data.sort((a, b) => {
            // Ordenação simples por dia/mês
            const [d1, m1] = a.name.split('/').map(Number);
            const [d2, m2] = b.name.split('/').map(Number);
            return (m1 * 31 + d1) - (m2 * 31 + d2);
        });
    }, [stats]);

    // 5. TOP CLIENTES
    const topClients = useMemo(() => {
        const map = new Map();
        stats.filteredServices.forEach(s => {
            if (s.status === 'Cancelado') return;
            const val = safeFloat(s.cost) + safeFloat(s.waitingTime);
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
                        Exibindo dados de: <span className="font-bold text-slate-700 dark:text-slate-300">{label}</span>
                    </p>
                </div>

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
