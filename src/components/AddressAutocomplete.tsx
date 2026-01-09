import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { searchAddresses, AddressSuggestion, isMapboxConfigured } from '../services/distanceService';

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    iconColor?: 'blue' | 'emerald';
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
    value,
    onChange,
    placeholder = 'Digite o endereço',
    className = '',
    iconColor = 'blue'
}) => {
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    // Sincroniza o valor externo
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Fecha dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue);

        // Limpa debounce anterior
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Busca sugestões após 300ms
        if (newValue.length >= 3 && isMapboxConfigured()) {
            debounceRef.current = setTimeout(async () => {
                setIsLoading(true);
                try {
                    const results = await searchAddresses(newValue);
                    setSuggestions(results);
                    setShowSuggestions(results.length > 0);
                } catch (error) {
                    console.error('Erro ao buscar sugestões:', error);
                } finally {
                    setIsLoading(false);
                }
            }, 300);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
        setInputValue(suggestion.placeName);
        onChange(suggestion.placeName);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    const handleClear = () => {
        setInputValue('');
        onChange('');
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const iconColorClass = iconColor === 'blue' ? 'text-blue-500' : 'text-emerald-500';
    const borderColorClass = iconColor === 'blue' ? 'focus:border-blue-500' : 'focus:border-emerald-500';

    return (
        <div ref={wrapperRef} className="relative w-full">
            <MapPin size={16} className={`absolute left-3 top-3 ${iconColorClass}`} />
            <input
                type="text"
                className={`w-full pl-9 pr-10 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm ${borderColorClass} outline-none ${className}`}
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder={placeholder}
                autoComplete="off"
            />

            {/* Loader ou botão de limpar */}
            <div className="absolute right-3 top-2.5">
                {isLoading ? (
                    <Loader2 size={16} className="animate-spin text-slate-400" />
                ) : inputValue && (
                    <button type="button" onClick={handleClear} className="text-slate-400 hover:text-slate-600">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Dropdown de sugestões */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.id || index}
                            type="button"
                            onClick={() => handleSelectSuggestion(suggestion)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-start gap-3 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                        >
                            <MapPin size={16} className={`${iconColorClass} mt-0.5 flex-shrink-0`} />
                            <span className="text-sm text-slate-700 dark:text-slate-200 leading-tight">
                                {suggestion.placeName}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
