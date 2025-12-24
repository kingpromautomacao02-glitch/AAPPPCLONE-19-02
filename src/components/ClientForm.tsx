import React, { useState, useEffect } from 'react';
import { Plus, X, Users } from 'lucide-react';
import { Client } from '../types';

interface ClientFormProps {
    initialData?: Client;
    onSave: (clientData: Partial<Client>) => void;
    onCancel: () => void;
}

// --- MÁSCARAS ---
const formatPhone = (value: string) => {
    const v = value.replace(/\D/g, "");
    return v.replace(/^(\d\d)(\d)/g, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 15);
};

const formatCnpjCpf = (value: string) => {
    const v = value.replace(/\D/g, "");
    if (v.length <= 11) {
        return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
        return v.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2").slice(0, 18);
    }
};

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Client>>({
        name: '', email: '', phone: '', category: 'Avulso', address: '', contactPerson: '', cnpj: ''
    });

    const [requestersList, setRequestersList] = useState<string[]>([]);
    const [tempRequester, setTempRequester] = useState('');

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            if (initialData.requesters) {
                setRequestersList(initialData.requesters);
            }
        }
    }, [initialData]);

    const handleInputChange = (field: keyof Client, value: string) => {
        let formattedValue = value;
        if (field === 'phone') formattedValue = formatPhone(value);
        else if (field === 'cnpj') formattedValue = formatCnpjCpf(value);
        setFormData({ ...formData, [field]: formattedValue });
    };

    const addRequesterToForm = (e?: React.MouseEvent) => {
        e?.preventDefault();
        if (tempRequester.trim()) {
            setRequestersList([...requestersList, tempRequester.trim()]);
            setTempRequester('');
        }
    };

    const removeRequesterFromForm = (index: number) => {
        setRequestersList(requestersList.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let finalRequesters = [...requestersList];
        if (tempRequester.trim()) {
            finalRequesters.push(tempRequester.trim());
        }

        if (finalRequesters.length === 0 && formData.contactPerson) {
            finalRequesters.push(formData.contactPerson);
        }

        onSave({ ...formData, requesters: finalRequesters });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-xl shadow-2xl p-6 relative animate-slide-up my-auto">
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <Plus className="text-blue-600" />
                    {initialData ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Empresa / Cliente</label>
                        <input
                            required
                            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                            value={formData.name || ''}
                            onChange={e => handleInputChange('name', e.target.value)}
                            placeholder="Ex: Logística LTDA"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Responsável</label>
                            <input
                                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                                value={formData.contactPerson || ''}
                                onChange={e => handleInputChange('contactPerson', e.target.value)}
                                placeholder="Nome do contato principal"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
                            <input
                                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                                value={formData.phone || ''}
                                onChange={e => handleInputChange('phone', e.target.value)}
                                placeholder="(11) 99999-9999"
                                maxLength={15}
                            />
                        </div>
                    </div>

                    {/* --- CAMPO NOVO: SOLICITANTES AUTORIZADOS --- */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                            <Users size={12} /> Solicitantes Autorizados (Opcional)
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input
                                className="flex-1 p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                                placeholder="Adicionar nome..."
                                value={tempRequester}
                                onChange={e => setTempRequester(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addRequesterToForm(e as any)}
                            />
                            <button
                                type="button"
                                onClick={(e) => addRequesterToForm(e)}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.contactPerson && (
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-bold border border-blue-200 dark:border-blue-800">
                                    {formData.contactPerson} (Resp.)
                                </span>
                            )}
                            {requestersList.map((req, index) => (
                                <span key={index} className="bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 px-2 py-1 rounded text-xs font-medium border border-slate-200 dark:border-slate-500 flex items-center gap-1">
                                    {req}
                                    <button type="button" onClick={() => removeRequesterFromForm(index)} className="text-slate-400 hover:text-red-500"><X size={12} /></button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">CPF ou CNPJ</label>
                        <input
                            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                            value={formData.cnpj || ''}
                            onChange={e => handleInputChange('cnpj', e.target.value)}
                            placeholder="000.000.000-00"
                            maxLength={18}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Endereço Completo</label>
                        <input
                            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                            value={formData.address || ''}
                            onChange={e => handleInputChange('address', e.target.value)}
                            placeholder="Rua, Número, Bairro, Cidade"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                            <select
                                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                                value={formData.category || 'Avulso'}
                                onChange={e => handleInputChange('category', e.target.value)}
                            >
                                <option value="Avulso">Avulso</option>
                                <option value="Mensalista">Mensalista</option>
                                <option value="Parceiro">Parceiro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                            <input
                                type="email"
                                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                                value={formData.email || ''}
                                onChange={e => handleInputChange('email', e.target.value)}
                                placeholder="email@empresa.com"
                            />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg mt-2 transition-colors">
                        Salvar Cliente
                    </button>
                </form>
            </div>
        </div>
    );
};
