import React from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useSync } from '../contexts/SyncContext';

export const OfflineBanner: React.FC = () => {
    const { isOnline, pendingCount } = useSync();

    if (isOnline) return null;

    return (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 px-4 z-50 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                        <WifiOff size={16} />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="font-bold text-sm">Você está offline</span>
                        <span className="text-xs text-white/80 hidden sm:inline">•</span>
                        <span className="text-xs text-white/90">
                            {pendingCount > 0
                                ? `${pendingCount} alteração${pendingCount > 1 ? 'ões' : ''} será${pendingCount > 1 ? 'ão' : ''} sincronizada${pendingCount > 1 ? 's' : ''} quando a conexão voltar`
                                : 'Suas alterações serão salvas localmente'
                            }
                        </span>
                    </div>
                </div>

                {pendingCount > 0 && (
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                        <AlertTriangle size={12} />
                        <span className="text-xs font-bold">{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
