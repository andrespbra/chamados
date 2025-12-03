
import { createClient } from '@supabase/supabase-js';

// Estas variáveis serão configuradas no Vercel (Environment Variables)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
