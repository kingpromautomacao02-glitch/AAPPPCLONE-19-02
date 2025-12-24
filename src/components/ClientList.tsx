import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trash2, 
  ChevronRight, 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  User, 
  Briefcase, 
  RotateCcw, 
  Phone, 
  MapPin 
} from 'lucide-react';
import { toast } from 'sonner';
import { Client, ServiceRecord, User as UserType } from '../types';
import { saveClient, deleteClient, restoreClient } from '../services/storageService';
import { ClientForm } from './ClientForm';

interface ClientListProps {
    clients: Client[];
    services: ServiceRecord[];
    currentUser: UserType;
    onRefresh: () => void;
}

export const ClientList: React.FC<ClientListProps> = ({ clients, services, currentUser, onRefresh }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showTrash, setShowTrash] = useState(false);

    const filteredClients = useMemo(() => {
        return clients.filter(c => {
            const isDeleted = !!c.deletedAt;
            if (showTrash && !isDeleted) return false;
            if (!showTrash && isDeleted) return false;

            return (
                (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (c.contactPerson && c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (c.cnpj && c.cnpj.includes(searchTerm))
            );
        });
    }, [clients, searchTerm, showTrash]);

    const handleSaveClient = async (clientData: Partial<Client>) => {
        // Validation
        if (!clientData.name) {
            toast.error("O nome da empresa é obrigatório.");
            return;
        }

        const clientToSave: Client = {
            id: clientData.id || crypto.randomUUID(), // Usa ID existente se for edição, ou cria novo
            ownerId: currentUser.id,
            name: clientData.name,
            email: clientData.email || '',
            phone: clientData.phone || '',
            category: clientData.category || 'Avulso',
            address: clientData.address || '',
            contactPerson: clientData.contactPerson || '',
            requesters: clientData.requesters || [],
            cnpj: clientData.cnpj || '',
            createdAt: clientData.createdAt || new Date().toISOString(),
            deletedAt: undefined 
        };

        try {
            await saveClient(clientToSave);
            toast.success('Cliente salvo com sucesso!');
            setShowModal(false);
            onRefresh();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar cliente.");
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Tem certeza que deseja mover este cliente para a lixeira?")) {
            try {
                await deleteClient(id);
                toast.success("Cliente movido para lixeira");
                onRefresh();
            } catch (error) {
                toast.error("Erro ao excluir cliente.");
            }
        }
    };

    const handleRestore = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Deseja restaurar este cliente?")) {
            try {
                await restoreClient(id);
                toast.success("Cliente restaurado");
                onRefresh();
            } catch (error) {
                toast.error("Erro ao restaurar cliente.");
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header e Controles */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            {showTrash ? <Trash2 className="text-red-500" /> : null}
                            {showTrash ? 'Lixeira de Clientes' : 'Meus Clientes'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {showTrash ? 'Gerencie clientes excluídos' : 'Gerencie sua carteira de clientes'}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        {currentUser.role === 'ADMIN' && (
                            <button
                                onClick={() => setShowTrash(!showTrash)}
                                className={`px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors border ${showTrash
                                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white border-slate-300 dark:border-slate-600'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                    }`}
                                title={showTrash ? "Voltar para ativos" : "Ver lixeira"}
                            >
                                {showTrash ? <ChevronRight size={20} /> : <Trash2 size={20} />}
                                <span className="hidden sm:inline">{showTrash ? 'Voltar' : 'Lixeira'}</span>
                            </button>
                        )}

                        {!showTrash && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Plus size={20} />
                                <span className="hidden sm:inline">Novo Cliente</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1 relative">
                        <Search className="absolute left-5 top-3.5 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, empresa ou responsável..."
                            className="w-full pl-10 p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            title="Visualização em Grade"
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            title="Visualização em Lista"
                        >
                            <List size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Conteúdo: Lista ou Grid */}
            {filteredClients.length === 0 ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center">
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-3">
                        {showTrash ? <Trash2 size={32} /> : <User size={32} />}
                    </div>
                    <p>{showTrash ? 'A lixeira está vazia.' : 'Nenhum cliente encontrado.'}</p>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredClients.map(client => (
                                <div
                                    key={client.id}
                                    onClick={() => !showTrash && navigate(`/clients/${client.id}`)}
                                    className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all group relative overflow-hidden ${!showTrash ? 'hover:shadow-md cursor-pointer' : 'opacity-80'}`}
                                >
                                    <div className={`absolute top-0 left-0 w-1 h-full ${showTrash ? 'bg-red-500' : 'bg-blue-500 opacity-0 group-hover:opacity-100'} transition-opacity`}></div>

                                    <div className="flex justify-between items-start mb-3">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                            <Briefcase size={20} />
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-600">
                                                {client.category}
                                            </span>
                                            {showTrash && currentUser.role === 'ADMIN' && (
                                                <button
                                                    onClick={(e) => handleRestore(e, client.id)}
                                                    className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                                                    title="Restaurar"
                                                >
                                                    <RotateCcw size={16} />
                                                </button>
                                            )}
                                            {!showTrash && currentUser.role === 'ADMIN' && (
                                                <button
                                                    onClick={(e) => handleDelete(e, client.id)}
                                                    className="p-1 hover:bg-red-100 hover:text-red-600 rounded text-slate-400 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1 truncate pr-4">{client.name}</h3>

                                    <div className="space-y-2 mt-4">
                                        {client.contactPerson && (
                                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                <User size={14} />
                                                {client.contactPerson}
                                            </div>
                                        )}
                                        {client.phone && (
                                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                <Phone size={14} />
                                                {client.phone}
                                            </div>
                                        )}
                                        {client.address && (
                                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 truncate">
                                                <MapPin size={14} className="shrink-0" />
                                                <span className="truncate">{client.address}</span>
                                            </div>
                                        )}
                                    </div>

                                    {!showTrash && (
                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline">Ver detalhes</span>
                                            <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {viewMode === 'list' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="p-4 font-bold">Cliente</th>
                                        <th className="p-4 font-bold">Responsável</th>
                                        <th className="p-4 font-bold">Contato</th>
                                        <th className="p-4 font-bold">Categoria</th>
                                        <th className="p-4 font-bold text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {filteredClients.map(client => (
                                        <tr
                                            key={client.id}
                                            onClick={() => !showTrash && navigate(`/clients/${client.id}`)}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!showTrash ? 'cursor-pointer' : ''}`}
                                        >
                                            <td className="p-4 font-medium text-slate-800 dark:text-white">
                                                {client.name}
                                                {client.cnpj && <div className="text-xs text-slate-400 font-normal">{client.cnpj}</div>}
                                            </td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">
                                                {client.contactPerson || '-'}
                                            </td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">
                                                {client.phone || '-'}
                                            </td>
                                            <td className="p-4">
                                                <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-600">
                                                    {client.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                    {showTrash ? (
                                                        <button
                                                            onClick={(e) => handleRestore(e, client.id)}
                                                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                                                            title="Restaurar"
                                                        >
                                                            <RotateCcw size={16} />
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => navigate(`/clients/${client.id}`)}
                                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600"
                                                            >
                                                                <ChevronRight size={16} />
                                                            </button>
                                                            {currentUser.role === 'ADMIN' && (
                                                                <button
                                                                    onClick={(e) => handleDelete(e, client.id)}
                                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-600"
                                                                    title="Excluir"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Modal com ClientForm */}
            {showModal && (
                <ClientForm
                    onSave={handleSaveClient}
                    onCancel={() => setShowModal(false)}
                />
            )}
        </div>
    );
};
