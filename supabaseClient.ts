
import { createClient, Session, User } from '@supabase/supabase-js';

// Tenta pegar variáveis de ambiente primeiro
const envUrl = import.meta.env?.VITE_SUPABASE_URL;
const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

// Se não encontrar, tenta pegar do armazenamento local do navegador
const localUrl = localStorage.getItem('hw_supa_url');
const localKey = localStorage.getItem('hw_supa_key');

// Define as credenciais finais com Trim para segurança
const realUrl = (envUrl || localUrl || '').trim();
const realKey = (envKey || localKey || '').trim();

// Flag de configuração.
// Sempre true pois temos o Mock como fallback.
export const isSupabaseConfigured = true;

export const configSource: 'env' | 'local' | 'mock' = (realUrl && realKey) ? (envUrl ? 'env' : 'local') : 'mock';

// --- MOCK IMPLEMENTATION ---
// Simula o backend para quando não houver credenciais
const MOCK_USERS = [
  { id: 'admin-id', email: 'admin@sistema.local', password: '123' },
  { id: 'tech-id', email: 'tecnico@sistema.local', password: '123' }
];

let mockSession: Session | null = null;
let mockRecords: any[] = [];
const authListeners: Array<(event: string, session: Session | null) => void> = [];

const notifyListeners = (event: string, session: Session | null) => {
  authListeners.forEach(l => l(event, session));
};

const mockClient = {
  auth: {
    getSession: async () => ({ data: { session: mockSession }, error: null }),
    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
      authListeners.push(callback);
      // Dispara imediatamente o estado atual
      setTimeout(() => callback(mockSession ? 'SIGNED_IN' : 'SIGNED_OUT', mockSession), 0);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithPassword: async ({ email, password }: any) => {
      // Simula delay de rede
      await new Promise(r => setTimeout(r, 500));
      
      const user = MOCK_USERS.find(u => u.email === email && u.password === password);
      
      if (user) {
        const now = Math.floor(Date.now() / 1000);
        mockSession = { 
            access_token: 'mock-token-' + Date.now(), 
            refresh_token: 'mock-refresh-' + Date.now(), 
            expires_in: 3600, 
            expires_at: now + 3600,
            token_type: 'bearer', 
            user: { 
              id: user.id, 
              email: user.email, 
              app_metadata: {}, 
              user_metadata: {}, 
              aud: 'authenticated', 
              created_at: new Date().toISOString() 
            } as User
        };
        notifyListeners('SIGNED_IN', mockSession);
        return { data: { session: mockSession, user: mockSession.user }, error: null };
      }
      return { data: { session: null }, error: { message: 'Usuário ou senha inválidos (Mock)' } };
    },
    signUp: async ({ email, password }: any) => {
        await new Promise(r => setTimeout(r, 500));
        
        const existing = MOCK_USERS.find(u => u.email === email);
        if (existing) {
             return { data: { user: { id: existing.id, email: existing.email } }, error: null };
        }
        const newUser = { id: Math.random().toString(), email, password };
        MOCK_USERS.push(newUser);
        
        // Auto login
        const now = Math.floor(Date.now() / 1000);
        mockSession = { 
            access_token: 'mock-token-' + Date.now(), 
            refresh_token: 'mock-refresh-' + Date.now(), 
            expires_in: 3600, 
            expires_at: now + 3600,
            token_type: 'bearer', 
            user: { 
              id: newUser.id, 
              email: newUser.email, 
              app_metadata: {}, 
              user_metadata: {}, 
              aud: 'authenticated', 
              created_at: new Date().toISOString() 
            } as User
        };
        notifyListeners('SIGNED_IN', mockSession);
        
        return { data: { user: mockSession.user, session: mockSession }, error: null };
    },
    signOut: async () => {
      mockSession = null;
      notifyListeners('SIGNED_OUT', null);
      return { error: null };
    }
  },
  from: (table: string) => {
    return {
      select: (columns: string) => ({
        order: (col: string, { ascending }: any = {}) => {
          const sorted = [...mockRecords].sort((a, b) => {
             if (a[col] < b[col]) return ascending ? -1 : 1;
             if (a[col] > b[col]) return ascending ? 1 : -1;
             return 0;
          });
          return Promise.resolve({ data: sorted, error: null });
        }
      }),
      insert: (data: any[]) => {
         const newRows = data.map(d => ({ ...d, id: Math.random().toString(), created_at: new Date().toISOString() }));
         mockRecords = [...newRows, ...mockRecords];
         return {
           select: () => Promise.resolve({ data: newRows, error: null })
         };
      },
      update: (data: any) => ({
        eq: (col: string, val: any) => {
          mockRecords = mockRecords.map(r => r[col] === val ? { ...r, ...data } : r);
          return Promise.resolve({ data: null, error: null });
        }
      }),
      delete: () => ({
        eq: (col: string, val: any) => {
           mockRecords = mockRecords.filter(r => r[col] !== val);
           return Promise.resolve({ data: null, error: null });
        }
      })
    };
  }
};

let supabaseInstance: any;

if (realUrl && realKey) {
  try {
    supabaseInstance = createClient(realUrl, realKey);
    console.log('Cliente Supabase Online Iniciado.');
  } catch (e) {
    console.error('Erro ao iniciar Supabase real (URL inválida?), usando Mock.', e);
    supabaseInstance = mockClient;
  }
} else {
  console.log('Ambiente Supabase não configurado. Utilizando Mock Client em memória.');
  supabaseInstance = mockClient;
}

export const supabase = supabaseInstance;
