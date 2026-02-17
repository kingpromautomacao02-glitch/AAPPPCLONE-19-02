import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
    // Timeout de segurança para evitar travamentos
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Profile fetch timeout')), 3000);
    });

    const fetchPromise = supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
    const { data, error } = result;

    if (error) {
      console.warn("Erro ao buscar perfil:", error.message);

      // Fallback básico se não encontrar no banco (mas autenticado no Supabase)
      return {
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
        email: authUser.email || '',
        phone: authUser.phone || '',
        role: 'USER',
        status: 'ACTIVE',
      } as User;
    }

    if (!data) {
      // Nenhum perfil encontrado - retorna usuário básico
      console.warn("Perfil não encontrado para usuário autenticado");
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
    console.error("Erro inesperado em fetchUserProfile:", err);
    // Retorna fallback básico em caso de qualquer erro
    return {
      id: authUser.id,
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
      email: authUser.email || '',
      phone: authUser.phone || '',
      role: 'USER',
      status: 'ACTIVE',
    } as User;
  }
};

// --- Provider Component ---
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Ref para rastrear o ID atual e evitar dependências no useEffect
  const userIdRef = useRef<string | null>(null);

  // Mantém a ref sincronizada
  useEffect(() => {
    userIdRef.current = user?.id || null;
  }, [user]);

  // Inicializa o estado de auth ao montar (RODA APENAS UMA VEZ)
  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const initAuth = async () => {
      console.log("Iniciando initAuth...");

      // Timeout de segurança: força o fim do loading após 5 segundos
      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn("AuthContext: Timeout de inicialização. Forçando fim do loading.");
          setLoading(false);
        }
      }, 5000);

      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutSessionPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('getSession timeout')), 3000);
        });

        const result = await Promise.race([sessionPromise, timeoutSessionPromise]) as any;
        const { data: { session }, error } = result;

        if (error) {
          console.error("Erro ao pegar sessão:", error);
        }

        if (session?.user && isMounted) {
          console.log("Sessão inicial encontrada:", session.user.email);
          setSession(session);
          setSupabaseUser(session.user);

          try {
            const profile = await fetchUserProfile(session.user);
            if (isMounted) {
              setUser(profile);
            }
          } catch (profileError) {
            console.error("Erro ao carregar perfil:", profileError);
          }
        } else {
          console.log("Nenhuma sessão inicial.");
        }
      } catch (err) {
        console.error("Erro fatal em initAuth:", err);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    // Ouve por mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Ignora eventos de refresh de token se já temos uma sessão
      if (event === 'TOKEN_REFRESHED' && session?.user?.id === newSession?.user?.id) {
        return;
      }

      setSession(newSession);
      setSupabaseUser(newSession?.user ?? null);

      if (newSession?.user) {
        const currentId = userIdRef.current;
        if (!currentId || currentId !== newSession.user.id) {
          const profile = await fetchUserProfile(newSession.user);
          setUser(profile);
        }
      } else {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
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
      // 1. Cria usuário de autenticação
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

      // 2. Cria o perfil na tabela 'users'
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: 'USER',
        status: 'PENDING', // AGUARDA APROVAÇÃO
      });

      if (profileError) {
        console.error('Erro ao criar perfil:', profileError.message);
        if (profileError.code === '23505') {
            return { success: false, message: 'Este email já está registrado no sistema.' };
        }
      }

      // NÃO loga automaticamente. Exige aprovação.
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
      console.error('Erro ao atualizar perfil:', error.message);
      throw error;
    }

    // Atualiza o estado global de forma segura
    setUser(prev => prev ? { ...prev, ...updates } : null);
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
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export { supabase };
