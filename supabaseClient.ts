import { createClient } from '@supabase/supabase-js';

// No Vite, usamos import.meta.env. 
// ATENÇÃO: Renomeie as variáveis no Vercel para começar com VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);