import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { updateUserProfile } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';
import { Save, Building2, User as UserIcon, Mail, Phone, MapPin, CheckCircle, Lock, Shield } from 'lucide-react';

interface SettingsProps {
  currentUser: User;
  onUpdateUser: (user: User) => void;
}

export const Settings: React.FC<SettingsProps> = ({ currentUser, onUpdateUser }) => {
  const { updatePassword } = useAuth();
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone);

  // Company Fields
  const [companyName, setCompanyName] = useState(currentUser.companyName || '');
  const [companyCnpj, setCompanyCnpj] = useState(currentUser.companyCnpj || '');
  const [companyAddress, setCompanyAddress] = useState(currentUser.companyAddress || '');

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);

  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    const updatedUser: User = {
      ...currentUser,
      name,
      phone,
      companyName,
      companyCnpj,
      companyAddress
    };

    await updateUserProfile(updatedUser);
    onUpdateUser(updatedUser);
    setSuccess(true);

    // Auto hide success message
    setTimeout(() => setSuccess(false), 3000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      return;
    }

    setLoadingPassword(true);
    const result = await updatePassword(newPassword);
    setLoadingPassword(false);

    if (result.success) {
      setPasswordSuccess('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } else {
      setPasswordError(result.message || 'Erro ao alterar senha.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações da Conta</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie seus dados pessoais e informações da empresa.</p>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 animate-slide-down">
          <CheckCircle size={24} />
          <div>
            <p className="font-bold">Sucesso!</p>
            <p className="text-sm">Suas informações foram atualizadas.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">

        {/* Personal Info Section */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <UserIcon size={20} className="text-blue-600 dark:text-blue-400" />
            Informações Pessoais
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nome Completo</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  className="w-full pl-9 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Email (Não editável)</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  disabled
                  className="w-full pl-9 p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  value={currentUser.email}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Telefone / WhatsApp</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  className="w-full pl-9 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Company Info Section */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Building2 size={20} className="text-indigo-600 dark:text-indigo-400" />
            Dados da Empresa (Para Relatórios)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-2xl">
            Estas informações aparecerão no cabeçalho dos documentos e relatórios gerados pelo sistema.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nome da Empresa</label>
              <input
                type="text"
                placeholder="Sua Empresa Ltda"
                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">CNPJ (Opcional)</label>
              <input
                type="text"
                placeholder="00.000.000/0001-00"
                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                value={companyCnpj}
                onChange={e => setCompanyCnpj(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Endereço Completo</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rua Exemplo, 123 - Cidade - UF"
                  className="w-full pl-9 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  value={companyAddress}
                  onChange={e => setCompanyAddress(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Shield size={20} className="text-emerald-600 dark:text-emerald-400" />
            Segurança
          </h2>

          <div className="max-w-md">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nova Senha</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Repita a nova senha"
                    className="w-full pl-9 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {passwordError && (
                <p className="text-red-500 text-sm font-medium">{passwordError}</p>
              )}

              {passwordSuccess && (
                <p className="text-emerald-500 text-sm font-medium flex items-center gap-1">
                  <CheckCircle size={14} /> {passwordSuccess}
                </p>
              )}

              <button
                type="button"
                onClick={handlePasswordChange}
                disabled={!newPassword || loadingPassword}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                {loadingPassword ? 'Alterando...' : 'Atualizar Senha'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
          >
            <Save size={20} />
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
};