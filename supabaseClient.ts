import { createClient } from '@supabase/supabase-js';

// No Vite, usamos import.meta.env.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas. O App pode não funcionar corretamente.');
}

// Criamos o cliente apenas se houver URL, caso contrário criamos um cliente dummy ou lançamos erro controlado
// Para evitar o crash total da tela branca, passamos strings vazias mas logamos o erro acima.
// O createClient lança erro se a URL não for válida, então tratamos isso.

let supabaseInstance;

try {
    if (supabaseUrl && supabaseKey) {
        supabaseInstance = createClient(supabaseUrl, supabaseKey);
    } else {
        // Fallback temporário para evitar crash da UI se as chaves faltarem
        console.warn('Usando cliente Supabase nulo. Verifique suas variáveis de ambiente no Vercel.');
        // @ts-ignore
        supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder'); 
    }
} catch (error) {
    console.error('Erro ao inicializar Supabase:', error);
    // @ts-ignore
    supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder');
}

export const supabase = supabaseInstance;