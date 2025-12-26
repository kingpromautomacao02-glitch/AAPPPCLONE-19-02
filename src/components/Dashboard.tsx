import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Calendar, 
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { getServices, getExpenses } from '../services/storageService';
import { ServiceRecord, ExpenseRecord } from '../types';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState<'7D' | '30D' | 'MONTH'>('30D');
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const servicesData = await getServices();
      const expensesData = await getExpenses();
      setServices(servicesData);
      setExpenses(expensesData);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    const today = new Date();
    let startDate = subDays(today, 30);
    let endDate = today;

    if (period === '7D') {
      startDate = subDays(today, 7);
    } else if (period === 'MONTH') {
      startDate = startOfMonth(today);
      endDate = endOfMonth(today);
    }

    const filteredServices = services.filter(s => {
      if (s.status !== 'Concluído') return false;
      return isWithinInterval(parseISO(s.date), { start: startDate, end: endDate });
    });

    const filteredExpenses = expenses.filter(e => 
      isWithinInterval(parseISO(e.date), { start: startDate, end: endDate })
    );

    return { services: filteredServices, expenses: filteredExpenses };
  }, [services, expenses, period]);

  const stats = useMemo(() => {
    // --- LÓGICA CORRIGIDA: Custo Base + Tempo de Espera (SEM Taxa Extra) ---
    const totalRevenue = filteredData.services.reduce((acc, curr) => {
      const baseCost = Number(curr.cost) || 0;
      const wait = Number(curr.waitingTime) || 0; 
      // Taxa Extra (extraFee) REMOVIDA do cálculo
      return acc + baseCost + wait;
    }, 0);

    const totalExpenses = filteredData.expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    
    const totalDeliveries = filteredData.services.length;
    const averageTicket = totalDeliveries > 0 ? totalRevenue / totalDeliveries : 0;

    const pendingPayments = services
      .filter(s => s.status === 'Concluído' && !s.paid)
      .reduce((acc, curr) => {
        // Cálculo de pendentes também sem Taxa Extra
        return acc + (Number(curr.cost) || 0) + (Number(curr.waitingTime) || 0);
      }, 0);

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      totalDeliveries,
      averageTicket,
      pendingPayments
    };
  }, [filteredData, services]);

  const chartData = useMemo(() => {
    const dataMap = new Map<string, { name: string; receita: number; despesa: number }>();

    filteredData.services.forEach(s => {
      const dateKey = format(parseISO(s.date), 'dd/MM', { locale: ptBR });
      const current = dataMap.get(dateKey) || { name: dateKey, receita: 0, despesa: 0 };
      
      // Gráfico também reflete apenas Custo + Espera
      const val = (Number(s.cost) || 0) + (Number(s.waitingTime) || 0);
      
      dataMap.set(dateKey, { 
        ...current, 
        receita: current.receita + val
      });
    });

    filteredData.expenses.forEach(e => {
      const dateKey = format(parseISO(e.date), 'dd/MM', { locale: ptBR });
      const current = dataMap.get(dateKey) || { name: dateKey, receita: 0, despesa: 0 };
      dataMap.set(dateKey, { 
        ...current, 
        despesa: current.despesa + (Number(e.amount) || 0)
      });
    });

    return Array.from(dataMap.values());
  }, [filteredData]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-blue-600" />
            Dashboard Financeiro
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Visão geral do seu negócio</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex">
          <button onClick={() => setPeriod('7D')} className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${period === '7D' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>7 Dias</button>
          <button onClick={() => setPeriod('30D')} className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${period === '30D' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>30 Dias</button>
          <button onClick={() => setPeriod('MONTH')} className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${period === 'MONTH' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Este Mês</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Receita Total</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(stats.totalRevenue)}</h3>
            <div className="flex items-center gap-1 text-emerald-500 text-xs mt-2 font-medium">
              <ArrowUpRight size={14} />
              <span>{period}</span>
            </div>
          </div>
          <div className="mt-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg inline-flex text-blue-600 dark:text-blue-400">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Despesas</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(stats.totalExpenses)}</h3>
            <div className="flex items-center gap-1 text-red-500 text-xs mt-2 font-medium">
              <ArrowDownRight size={14} />
              <span>{period}</span>
            </div>
          </div>
          <div className="mt-4 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg inline-flex text-red-600 dark:text-red-400">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Lucro Líquido</p>
            <h3 className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
              {formatCurrency(stats.netProfit)}
            </h3>
            <div className="flex items-center gap-1 text-slate-400 text-xs mt-2 font-medium">
              <span>(Sem Taxa Extra)</span>
            </div>
          </div>
          <div className="mt-4 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg inline-flex text-emerald-600 dark:text-emerald-400">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">A Receber</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(stats.pendingPayments)}</h3>
             <div className="flex items-center gap-1 text-amber-500 text-xs mt-2 font-medium">
              <Clock size={14} />
              <span>Pendentes totais</span>
            </div>
          </div>
          <div className="mt-4 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg inline-flex text-amber-600 dark:text-amber-400">
            <Calendar size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Fluxo de Caixa</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `R$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area type="monotone" dataKey="receita" stroke="#3b82f6" fillOpacity={1} fill="url(#colorReceita)" name="Receita" />
                <Area type="monotone" dataKey="despesa" stroke="#ef4444" fillOpacity={1} fill="url(#colorDespesa)" name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Entregas por Período</h3>
           <div className="h-64 flex items-center justify-center text-slate-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="receita" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Faturamento" />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
};
