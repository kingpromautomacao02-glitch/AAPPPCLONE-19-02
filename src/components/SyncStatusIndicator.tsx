import React from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { useSync } from '../contexts/SyncContext';

interface SyncStatusIndicatorProps {
    compact?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ compact = false }) => {
    const { isOnline, isSyncing, pendingCount } = useSync();

    if (compact) {
        // Compact version for sidebar
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                {isOnline ? (
                    <>
                        {isSyncing ? (
                            <RefreshCw size={14} className="text-blue-500 animate-spin" />
                        ) : pendingCount > 0 ? (
                            <Cloud size={14} className="text-amber-500" />
                        ) : (
                            <Wifi size={14} className="text-emerald-500" />
                        )}
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            {isSyncing ? 'Sincronizando...' : pendingCount > 0 ? `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}` : 'Sincronizado'}
                        </span>
                    </>
                ) : (
                    <>
                        <WifiOff size={14} className="text-red-500" />
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">
                            Offline {pendingCount > 0 && `(${pendingCount})`}
                        </span>
                    </>
                )}
            </div>
        );
    }

    // Full version
    return (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${isOnline
                ? isSyncing
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : pendingCount > 0
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
            <div className={`p-2 rounded-lg ${isOnline
                    ? isSyncing
                        ? 'bg-blue-100 dark:bg-blue-800/30'
                        : pendingCount > 0
                            ? 'bg-amber-100 dark:bg-amber-800/30'
                            : 'bg-emerald-100 dark:bg-emerald-800/30'
                    : 'bg-red-100 dark:bg-red-800/30'
                }`}>
                {isOnline ? (
                    isSyncing ? (
                        <RefreshCw size={18} className="text-blue-600 dark:text-blue-400 animate-spin" />
                    ) : pendingCount > 0 ? (
                        <Cloud size={18} className="text-amber-600 dark:text-amber-400" />
                    ) : (
                        <Wifi size={18} className="text-emerald-600 dark:text-emerald-400" />
                    )
                ) : (
                    <CloudOff size={18} className="text-red-600 dark:text-red-400" />
                )}
            </div>

            <div className="flex flex-col">
                <span className={`text-sm font-bold ${isOnline
                        ? isSyncing
                            ? 'text-blue-700 dark:text-blue-300'
                            : pendingCount > 0
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-emerald-700 dark:text-emerald-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                    {isOnline
                        ? isSyncing
                            ? 'Sincronizando...'
                            : pendingCount > 0
                                ? `${pendingCount} alteração${pendingCount > 1 ? 'ões' : ''} pendente${pendingCount > 1 ? 's' : ''}`
                                : 'Sincronizado'
                        : 'Modo Offline'
                    }
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                    {isOnline
                        ? pendingCount > 0
                            ? 'Será sincronizado automaticamente'
                            : 'Todos os dados estão atualizados'
                        : 'Alterações serão sincronizadas ao reconectar'
                    }
                </span>
            </div>
        </div>
    );
};
