import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Supabase Client Singleton ---
// Este client é compartilhado por toda a aplicação para garantir
// que a sessão de autenticação seja a mesma em todas as requisições.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key not configured. Check your .env file.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
