import { createClient } from '@supabase/supabase-js';

// Tenta pegar variáveis de ambiente primeiro
const envUrl = import.meta.env?.VITE_SUPABASE_URL;
const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

// Se não encontrar, tenta pegar do armazenamento local do navegador
const localUrl = localStorage.getItem('hw_supa_url');
const localKey = localStorage.getItem('hw_supa_key');

// Define as credenciais finais
const supabaseUrl = envUrl || localUrl || '';
const supabaseKey = envKey || localKey || '';

// Exporta flag para saber se está configurado
export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

// Identifica a origem da configuração para mostrar na UI
export const configSource: 'env' | 'local' | 'none' = envUrl ? 'env' : (localUrl ? 'local' : 'none');

if (!isSupabaseConfigured) {
  console.warn('AVISO: Credenciais do Supabase não encontradas. O app funcionará em modo offline.');
}

// Helpers para gerenciar credenciais via UI
export const saveSupabaseConfig = (url: string, key: string) => {
  if (!url || !key) return;
  localStorage.setItem('hw_supa_url', url);
  localStorage.setItem('hw_supa_key', key);
  window.location.reload(); // Recarrega para aplicar
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('hw_supa_url');
  localStorage.removeItem('hw_supa_key');
  window.location.reload();
};

let supabaseInstance;

try {
    if (isSupabaseConfigured) {
        supabaseInstance = createClient(supabaseUrl, supabaseKey);
    } else {
        // Inicializa com valores dummy para não quebrar o runtime, mas as chamadas falharão
        // O App.tsx verifica isSupabaseConfigured antes de chamar
        // @ts-ignore
        supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder'); 
    }
} catch (error) {
    console.error('Erro ao inicializar cliente Supabase:', error);
    // @ts-ignore
    supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder');
}

export const supabase = supabaseInstance;