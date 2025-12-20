import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Car, 
  DollarSign, 
  TrendingUp, 
  Plus,
  ArrowRight
} from 'lucide-react';
import { db } from '../services/database/FirebaseAdapter'; // Ou seu adaptador correto
import { Client, Order } from '../types';
import NewOrder from './NewOrder';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalOrders: 0,
    totalRevenue: 0,
    monthlyRevenue: 0
  });
  
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Função para carregar os dados do dashboard
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [clients, orders] = await Promise.all([
        db.getClients(),
        db.getOrders()
      ]);

      const totalRevenue = orders.reduce((acc, order) => acc + order.price, 0);
      
      // Calcular receita do mês atual
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = orders
        .filter(order => {
          const orderDate = new Date(order.date);
          return orderDate.getMonth() === currentMonth && 
                 orderDate.getFullYear() === currentYear;
        })
        .reduce((acc, order) => acc + order.price, 0);

      setStats({
        totalClients: clients.length,
        totalOrders: orders.length,
        totalRevenue,
        monthlyRevenue
      });

      // Pegar as 5 últimas corridas ordenadas por data
      const sortedOrders = [...orders]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
      
      setRecentOrders(sortedOrders);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // CORREÇÃO AQUI: Implementação da função de salvar no Dashboard
  const handleSaveOrder = async (orderData: any) => {
    try {
      // Se o modal de Nova Corrida não passar o clientId, precisamos garantir que ele exista.
      // Assumindo que o componente NewOrder gerencia a seleção de cliente se não receber um clientId via prop.
      
      await db.addOrder({
        ...orderData,
        createdAt: new Date().toISOString(),
        status: 'pending' // Status inicial padrão
      });

      // Fecha o modal e recarrega os dados para mostrar a nova corrida e atualizar valores
      setIsNewOrderModalOpen(false);
      await loadDashboardData();
      
    } catch (error) {
      console.error('Erro ao salvar nova corrida:', error);
      alert('Erro ao salvar a corrida. Verifique os dados e tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <button
          onClick={() => setIsNewOrderModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Nova Corrida
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total de Clientes</p>
              <h3 className="text-2xl font-bold text-gray-800">{stats.totalClients}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total de Corridas</p>
              <h3 className="text-2xl font-bold text-gray-800">{stats.totalOrders}</h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <Car size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Receita Total</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalRevenue)}
              </h3>
            </div>
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Receita Mensal</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.monthlyRevenue)}
              </h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Corridas Recentes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Corridas Recentes</h2>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
            Ver todas <ArrowRight size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Origem</th>
                <th className="px-6 py-4">Destino</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma corrida registrada recentemente.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {new Date(order.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">{order.origin}</td>
                    <td className="px-6 py-4">{order.destination}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.price)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${order.status === 'completed' ? 'bg-green-100 text-green-700' : 
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-gray-100 text-gray-700'}`}>
                        {order.status === 'completed' ? 'Concluída' : 
                         order.status === 'pending' ? 'Pendente' : 'Cancelada'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Nova Corrida */}
      <NewOrder
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onSave={handleSaveOrder}
        // Nota: Se o modal precisar de um clientId e estiver no dashboard,
        // ele deve exibir um campo "Select Client" internamente.
      />
    </div>
  );
}
