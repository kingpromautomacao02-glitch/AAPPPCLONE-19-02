import React, { useState, useEffect } from 'react';
import { ServiceRecord, ServiceLog } from '../../types';
import { getServiceLogs } from '../../services/storageService';
import { X, History, Loader2 } from 'lucide-react';

interface ServiceHistoryModalProps {
    service: ServiceRecord;
    onClose: () => void;
}

export const ServiceHistoryModal: React.FC<ServiceHistoryModalProps> = ({ service, onClose }) => {
    const [logs, setLogs] = useState<ServiceLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getServiceLogs(service.id).then(data => {
            setLogs(data);
            setLoading(false);
        });
    }, [service.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-slide-up">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <History size={20} className="text-blue-600" />
                        Histórico de Alterações
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                        <div className="text-center p-8 text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" /> Carregando...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center p-8 text-slate-500">Nenhum registro de alteração encontrado.</div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className="relative pl-6 pb-2 border-l-2 border-slate-200 dark:border-slate-700 last:border-0">
                                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${log.action === 'CRIACAO' ? 'bg-emerald-500' :
                                    log.action === 'EXCLUSAO' ? 'bg-red-500' :
                                        log.action === 'RESTAURACAO' ? 'bg-blue-500' :
                                            'bg-amber-500'
                                    }`}></div>

                                <div className="text-xs text-slate-400 mb-1">
                                    {new Date(log.createdAt).toLocaleString()} por <strong>{log.userName}</strong>
                                </div>
                                <div className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                                    {log.action === 'CRIACAO' ? 'Serviço Criado' :
                                        log.action === 'EXCLUSAO' ? 'Serviço Excluído' :
                                            log.action === 'RESTAURACAO' ? 'Serviço Restaurado' :
                                                'Alteração Realizada'}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
