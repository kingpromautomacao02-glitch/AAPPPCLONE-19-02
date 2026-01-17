import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';

// --- Types ---
interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, password: string, name: string, phone: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updatePassword: (password: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Helper: Fetch user profile from 'users' table ---
const fetchUserProfile = async (authUser: SupabaseUser): Promise<User | null> => {
  try {
    // 1. Tentar buscar pelo ID (padrão)
    // Timeout wrapper to prevent hanging
    const fetchPromise = supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    const timeoutPromise = new Promise<{ data: any, error: any }>((_, reject) =>
      setTimeout(() => reject(new Error("Database timeout")), 10000)
    );

    let { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (error) {
      console.warn("Erro ao buscar perfil primário:", error.message, error.code);
    }

    // 2. Se não achou pelo ID, tenta achar pelo EMAIL (caso legado ou erro de permissão)
    if (!data && authUser.email) {
      console.log("Perfil não encontrado pelo ID. Tentando buscar por email (Migração)...");

      const { data: legacyData, error: legacyError } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .single();

      if (legacyError) {
        console.warn("Erro ao buscar perfil legado:", legacyError.message);
      }

      if (legacyData) {
        console.log("Usuário legado encontrado por email. Atualizando ID para:", authUser.id);

        // Atualizar o registro antigo com o NOVO ID do Supabase Auth
        const { error: updateError } = await supabase
          .from('users')
          .update({ id: authUser.id })
          .eq('email', authUser.email);

        if (!updateError) {
          // Se atualizou com sucesso, usa os dados legados (agora com ID novo)
          data = { ...legacyData, id: authUser.id };
        } else {
          console.error("Erro ao migrar ID do usuário:", updateError.message);
          // Mesmo com erro de update, podemos usar os dados legados em memória temporariamente
          data = legacyData;
        }
      }
    }

    if (!data) {
      console.error('Perfil não encontrado no banco. Criando perfil temporário em memória.');
      // Fallback: criar perfil básico com dados do Auth para não bloquear login
      return {
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
        email: authUser.email || '',
        phone: authUser.phone || '',
        role: 'USER',
        status: 'ACTIVE',
      } as User;
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role || 'USER',
      status: data.status || 'ACTIVE',
      companyName: data.company_name,
      companyAddress: data.company_address,
      companyCnpj: data.company_cnpj,
    } as User;

  } catch (err) {
    console.error("CRITICAL ERROR in fetchUserProfile:", err);

    // Tentar recuperar role do metadata (se existir)
    const metadataRole = authUser.app_metadata?.role || authUser.user_metadata?.role || 'USER';
    const safeRole = metadataRole === 'ADMIN' ? 'ADMIN' : 'USER';

    // Fallback de segurança máxima
    return {
      id: authUser.id,
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
      email: authUser.email || '',
      role: safeRole,
      status: 'ACTIVE',
      companyName: authUser.user_metadata?.companyName || '',
    } as User;
  }
};

// --- Provider Component ---
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      console.log("Iniciando verificação de autenticação...");

      // Função para buscar sessão do Supabase
      const getSessionPromise = async () => {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
      };

      // Timeout de 6 segundos - se passar disso, mostra login
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('Auth timeout após 6s - mostrando tela de login');
          resolve(null);
        }, 6000);
      });

      try {
        // Race entre sessão e timeout
        const session = await Promise.race([getSessionPromise(), timeoutPromise]);

        if (!isMounted) return;

        if (session?.user) {
          console.log("Sessão encontrada para:", session.user.email);
          setSession(session);
          setSupabaseUser(session.user);

          try {
            const profile = await fetchUserProfile(session.user);
            if (isMounted) setUser(profile);
          } catch (profileError) {
            console.error("Erro não-crítico ao buscar perfil:", profileError);
          }
        } else {
          console.log("Nenhuma sessão ativa ou timeout.");
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
      } finally {
        if (isMounted) {
          console.log("Finalizando loading de auth.");
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setSupabaseUser(newSession?.user ?? null);

      if (newSession?.user) {
        const profile = await fetchUserProfile(newSession.user);
        setUser(profile);
      } else {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // --- Login ---
  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        const profile = await fetchUserProfile(data.user);

        if (profile?.status === 'BLOCKED') {
          await supabase.auth.signOut();
          return { success: false, message: 'Conta bloqueada. Contate o administrador.' };
        }

        if (profile?.status === 'PENDING') {
          await supabase.auth.signOut();
          return { success: false, message: 'Cadastro em análise. Aguarde aprovação do administrador.' };
        }

        setUser(profile);
        return { success: true };
      }

      return { success: false, message: 'Erro desconhecido.' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  // --- Register ---
  const register = async (
    email: string,
    password: string,
    name: string,
    phone: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (authError) {
        return { success: false, message: authError.message };
      }

      if (!authData.user) {
        return { success: false, message: 'Erro ao criar usuário.' };
      }

      // 2. Create or Update profile in 'users' table
      const { error: profileError } = await supabase.from('users').upsert({
        id: authData.user.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: 'USER',
        status: 'PENDING', // AGUARDA APROVAÇÃO
      });

      if (profileError) {
        // Se der erro de duplicate key (email já existe na tabela antiga), tentamos atualizar o ID
        if (profileError.code === '23505') { // Code for unique violation
          // Na verdade, se o email já existe, precisamos atualizar o registro desse email com o NOVO ID do Auth
          // Mas como o ID é a chave primária, pode ser complicado.
          // Estratégia: O Supabase Auth cria um novo ID.
          // Se o email já existe na tabela 'users' com outro ID (o antigo), precisamos:
          // 1. Achar o user antigo pelo email
          // 2. Atualizar o ID dele para o novo ID do Auth (se possível) ou...
          // O mais seguro para migração simples:
          // Deixar criar o novo user (upsert com ID novo).
          // SE o email na tabela users tem constraint unique, vai falhar se tentarmos inserir outro user com mesmo email.

          console.log("Usuário legado detectado. Tentando migrar dados...");

          // Buscar usuário antigo pelo email
          const { data: legacyUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.trim().toLowerCase())
            .single();

          if (legacyUser) {
            // Atualizar o registro antigo com o NOVO ID do Supabase Auth
            // Isso migra os dados para o novo login
            const { error: updateError } = await supabase
              .from('users')
              .update({ id: authData.user.id }) // Mudar o ID antigo para o novo ID seguro
              .eq('email', email.trim().toLowerCase());

            if (updateError) {
              console.error("Erro na migração:", updateError.message);
            } else {
              console.log("Migração de ID concluída com sucesso.");
            }
          }
        } else {
          console.error('Profile creation error:', profileError.message);
        }
      }

      // NÃO Logar automaticamente. Exigir aprovação.
      await supabase.auth.signOut();

      return { success: false, message: 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador para entrar.' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  // --- Logout ---
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
  };

  // --- Update Profile ---
  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    const payload: any = {};
    if (updates.name) payload.name = updates.name;
    if (updates.phone) payload.phone = updates.phone;
    if (updates.companyName) payload.company_name = updates.companyName;
    if (updates.companyAddress) payload.company_address = updates.companyAddress;
    if (updates.companyCnpj) payload.company_cnpj = updates.companyCnpj;

    const { error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', user.id);

    if (error) {
      console.error('Profile update error:', error.message);
      throw error;
    }

    setUser({ ...user, ...updates });
  };

  // --- Update Password ---
  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  // --- Reset Password ---
  const resetPassword = async (email: string) => {
    try {
      // Redirect to root, where auth state listener will pick up the session
      // and user can then go to settings to change password
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  const value: AuthContextType = {
    user,
    supabaseUser,
    session,
    loading,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Hook ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { supabase };
