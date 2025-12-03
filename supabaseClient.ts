import { createClient } from '@supabase/supabase-js';

// Safe access to environment variables using optional chaining
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

// Export a flag so the App knows if it can use the DB or should work in offline mode
export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  console.warn('AVISO: Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ausentes. O app funcionará em modo offline (sem persistência).');
}

let supabaseInstance;

try {
    if (isSupabaseConfigured) {
        supabaseInstance = createClient(supabaseUrl, supabaseKey);
    } else {
        // Initialize with dummy values to prevent runtime crashes when calling supabase.from()
        // The App.tsx should check isSupabaseConfigured before calling actual methods
        // @ts-ignore
        supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder'); 
    }
} catch (error) {
    console.error('Erro ao inicializar cliente Supabase:', error);
    // @ts-ignore
    supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder');
}

export const supabase = supabaseInstance;