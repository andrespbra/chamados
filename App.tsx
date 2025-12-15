
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardCopy, 
  Trash2, 
  Save, 
  CheckCircle2, 
  History, 
  ServerCrash,
  FileText,
  ClipboardCheck,
  AlertTriangle,
  LayoutDashboard,
  Loader2,
  X,
  FileClock,
  Search,
  Eye,
  Download,
  FileSpreadsheet,
  ShieldAlert,
  Hammer,
  Settings,
  Database,
  Code2,
  Copy,
  RefreshCw,
  Activity,
  AlertCircle
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { SupportRecord, INITIAL_STATE, SUBJECT_OPTIONS, SicOption } from './types';
import { FormInput } from './components/FormInput';
import { FormSelect } from './components/FormSelect';
import { FormTextArea } from './components/FormTextArea';
import { RadioGroup } from './components/RadioGroup';
import { getFormattedDateTime, formatDisplayDate } from './utils';
import { supabase, isSupabaseConfigured, configSource } from './supabaseClient';

const App: React.FC = () => {
  // Auth State - Defaulted to Admin for "No Login" mode
  const [session, setSession] = useState<Session | null>({
    user: { email: 'admin@sistema.local' }
  } as unknown as Session);

  // Config Modal State
  const [showConfig, setShowConfig] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [configUrl, setConfigUrl] = useState(localStorage.getItem('hw_supa_url') || '');
  const [configKey, setConfigKey] = useState(localStorage.getItem('hw_supa_key') || '');

  // Role State - Default Admin
  const [userRole, setUserRole] = useState<'admin' | 'technician' | 'user'>('admin');

  // App State
  const [activeTab, setActiveTab] = useState<'geral' | 'escala' | 'chamadoEscalado' | 'dashboard' | 'registros'>('geral');
  const [formData, setFormData] = useState<Omit<SupportRecord, 'id'>>({
    ...INITIAL_STATE,
    startTime: getFormattedDateTime(),
    escalationDate: getFormattedDateTime()
  });
  const [history, setHistory] = useState<SupportRecord[]>([]);
  const [summary, setSummary] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Search & View State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<SupportRecord | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Helper to determine role based on email/username (kept for compatibility logic)
  const determineRole = (email?: string): 'admin' | 'technician' | 'user' => {
    if (!email) return 'user';
    if (email.startsWith('admin')) return 'admin';
    if (email.startsWith('tecnico')) return 'technician';
    return 'admin'; // Default fallback
  };

  // Auth Effect - Try to connect but don't block UI
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: fetchedSession } }) => {
      if (fetchedSession) {
        setSession(fetchedSession);
        setUserRole(determineRole(fetchedSession?.user?.email));
      }
    }).catch(err => {
      console.error("Session check failed:", err);
    });
  }, []);

  // Security Effect: Redirect Technician from restricted tabs (if role changes)
  useEffect(() => {
    if (userRole === 'technician' && ['chamadoEscalado', 'dashboard', 'registros'].includes(activeTab)) {
      setActiveTab('geral');
    }
  }, [userRole, activeTab]);

  // Toggle SIC options
  const toggleSicOption = (option: SicOption) => {
    setFormData(prev => {
      const current = prev.sicOptions;
      if (current.includes(option)) {
        return { ...prev, sicOptions: current.filter(o => o !== option) };
      } else {
        return { ...prev, sicOptions: [...current, option] };
      }
    });
  };

  // Carregar dados do Supabase ao iniciar
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const { data, error } = await supabase
        .from('support_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setHistory(data as unknown as SupportRecord[]);
      }
    } catch (error: any) {
      console.error('Erro ao buscar registros:', error);
      // Erro 42P01 significa tabela inexistente no Postgres
      if (error.code === '42P01') {
        setDbError('A tabela "support_records" não existe no seu Supabase. Vá em Configurações > Ver SQL e crie a tabela.');
        // setShowConfig(true); // Opcional: abrir config automaticamente
      } else {
        setDbError(error.message || 'Erro de conexão com o banco.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Generate Summary Text
  const generateSummary = useCallback(() => {
    const lines: string[] = [];

    // 1. SUMMARY FOR 'ESCALA' TAB (Validation)
    if (activeTab === 'escala') {
      let headerTag = '';
      if (formData.isValidated === 'Sim') headerTag = '#VLDD#';
      if (formData.isValidated === 'Não') headerTag = '#NVLDD#';

      lines.push(`${headerTag} === ESCALADA / VALIDAÇÃO ===`.trim());
      lines.push(`Analista: ${formData.analystName}`);
      lines.push(`Local: ${formData.locationName}`);
      lines.push(`Task: ${formData.task}`);
      lines.push(`----------------------------------------`);
      lines.push(`Defeito Reclamado (Cliente):`);
      lines.push(`${formData.customerComplaint}`);
      lines.push(`----------------------------------------`);
      lines.push(`>>> CHECKLIST <<<`);
      lines.push(`Validado? ${formData.isValidated}`);
      lines.push(`Plano de Ação Efetivo? ${formData.isActionPlanEffective}`);
      
      let partChangedText = `Peça Trocada? ${formData.wasPartChanged}`;
      if (formData.wasPartChanged === 'Sim') {
        partChangedText += ` (${formData.partChangedDescription})`;
      }
      lines.push(partChangedText);
      
      lines.push(`Diag Completo? ${formData.usedDiagValidation}`);
      lines.push(`Cartão Teste? ${formData.usedTestCard}`);
      lines.push(`SIC Verificado: ${formData.sicOptions.length > 0 ? formData.sicOptions.join(', ') : 'Nenhum'}`);
      lines.push(`Acompanhamento: ${formData.customerName} ${formData.customerBadge ? `(Mat: ${formData.customerBadge})` : ''}`);
      
      lines.push(`----------------------------------------`);
      lines.push(`Início: ${formatDisplayDate(formData.startTime)}`);
      lines.push(`Fim: ${formatDisplayDate(formData.endTime)}`);
    } 
    
    // 2. SUMMARY FOR 'CHAMADO ESCALADO' TAB
    else if (activeTab === 'chamadoEscalado') {
      lines.push(`=== CHAMADO / ESCALADO ===`);
      lines.push(`Data da Escalada: ${formatDisplayDate(formData.escalationDate)}`);
      lines.push(`Local: ${formData.locationName}`);
      lines.push(`Task / Chamado: ${formData.task}`);
      lines.push(`Técnico: ${formData.technicianName}`);
      lines.push(`----------------------------------------`);
      lines.push(`Defeito Reclamado (Cliente):`);
      lines.push(`${formData.customerComplaint}`);
      lines.push(`----------------------------------------`);
      lines.push(`Analista Responsável: ${formData.analystName}`);
    }

    // 3. SUMMARY FOR 'GERAL' TAB
    else if (activeTab === 'geral') {
      lines.push(`=== REGISTRO DE ATENDIMENTO HW ===`);
      lines.push(`Analista: ${formData.analystName}`);
      lines.push(`Local: ${formData.locationName}`);
      lines.push(`Task: ${formData.task}`);
      lines.push(`SR: ${formData.sr}`);
      lines.push(`Assunto: ${formData.subject}`);
      lines.push(`Chamado Escalado: ${formData.isEscalated}`);
      if (formData.isEscalated === 'Sim') {
        lines.push(`Analista do Banco: ${formData.bankAnalystName}`);
      }
      lines.push(`----------------------------------------`);
      lines.push(`Problema Relatado (Técnico):`);
      lines.push(`${formData.problemDescription}`);
      lines.push(`----------------------------------------`);
      lines.push(`Ação do Analista:`);
      lines.push(`${formData.actionTaken}`);
      lines.push(`----------------------------------------`);
      lines.push(`Início Suporte: ${formatDisplayDate(formData.startTime)}`);
      lines.push(`Fim Suporte: ${formatDisplayDate(formData.endTime)}`);
      lines.push(`Ligação Devida: ${formData.validCall}`);
      lines.push(`Houve Ensinamento: ${formData.trainingProvided}`);
      lines.push(`Utilizou ACFS: ${formData.usedAcfs}`);
    }

    return lines.filter(l => l !== '').join('\n');
  }, [formData, activeTab]);

  useEffect(() => {
    setSummary(generateSummary());
  }, [generateSummary]);

  const handleCleanCache = () => {
    if(window.confirm('Isso limpará as configurações locais e recarregará a página. Continuar?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const updateRecord = async (id: string, field: keyof SupportRecord, value: any) => {
    // Otimistic Update
    const originalHistory = [...history];
    setHistory(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));

    try {
      const { error } = await supabase
        .from('support_records')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error("Erro ao atualizar:", err);
      alert("Erro ao atualizar o registro.");
      setHistory(originalHistory); // Reverte em caso de erro
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Aberto' ? 'Fechado' : 'Aberto';
    await updateRecord(id, 'status', newStatus);
  };

  const handleRegister = async () => {
    if (!formData.analystName) {
      alert("Por favor, preencha o Nome do Analista.");
      return;
    }

    setIsLoading(true);

    // Determine Record Type based on active tab
    let recordType: 'GENERAL' | 'VALIDATION' | 'ESCALATION' = 'GENERAL';
    if (activeTab === 'escala') recordType = 'VALIDATION';
    if (activeTab === 'chamadoEscalado') recordType = 'ESCALATION';

    const newRecordPayload = {
      ...formData,
      recordType,
      endTime: formData.endTime || getFormattedDateTime(),
      status: 'Aberto' as const,
      escalationValidation: 'Não' as const,
    };

    try {
      let savedRecord: SupportRecord;

      // Inserir no Supabase (Online ou Mock)
      const { data, error } = await supabase
        .from('support_records')
        .insert([newRecordPayload])
        .select();

      if (error) throw error;
      
      savedRecord = data ? (data[0] as unknown as SupportRecord) : { id: 'temp-' + Date.now(), ...newRecordPayload };

      // Atualiza histórico localmente
      setHistory([savedRecord, ...history]);
      
      // Copiar resumo
      navigator.clipboard.writeText(generateSummary());
      
      // Reset fields
      setFormData({
        ...INITIAL_STATE,
        analystName: formData.analystName,
        startTime: getFormattedDateTime(),
        escalationDate: getFormattedDateTime()
      });

      setCopied(true);
      setTimeout(() => setCopied(false), 3000);

    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      if (err.message === 'Failed to fetch') {
        alert('Erro de conexão: Não foi possível salvar no banco de dados.');
      } else if (err.code === '42P01') {
        alert('Erro Crítico: A tabela "support_records" não existe no banco de dados. Vá em Configurações e copie o script SQL para criar a tabela.');
        setShowConfig(true);
        setShowSql(true);
      } else {
        alert(`Erro ao salvar: ${err.message || 'Verifique a conexão'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm("Tem certeza que deseja limpar todos os campos?")) {
      setFormData({
        ...INITIAL_STATE,
        startTime: getFormattedDateTime(),
        escalationDate: getFormattedDateTime()
      });
    }
  };

  const setEndNow = () => {
    setFormData(prev => ({ ...prev, endTime: getFormattedDateTime() }));
  };

  const handleDeleteRecord = async (id: string) => {
    // Permission Check
    if (userRole !== 'admin') {
      alert("Permissão negada. Apenas Administradores podem excluir registros.");
      return;
    }

    if (!window.confirm("Tem certeza que deseja excluir este registro permanentemente?")) {
      return;
    }

    setIsLoading(true);
    
    // Atualiza estado local imediatamente
    setHistory(prev => prev.filter(item => item.id !== id));
    if (selectedRecord?.id === id) setSelectedRecord(null);

    try {
      const { error } = await supabase
        .from('support_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      console.error("Erro ao excluir:", err);
      alert(`Erro ao excluir do banco de dados: ${err.message}`);
      fetchRecords(); // Recarrega para garantir sincronia
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = (type: 'ALL' | 'VLDD' | 'NVLDD' | 'ESCALATION') => {
    if (userRole !== 'admin') {
      alert("Permissão negada. Apenas Administradores podem extrair relatórios.");
      return;
    }

    let dataToExport = history;
    let filename = 'relatorio_geral.csv';

    switch (type) {
      case 'VLDD':
        dataToExport = history.filter(r => r.recordType === 'VALIDATION' && r.isValidated === 'Sim');
        filename = 'relatorio_validado_vldd.csv';
        break;
      case 'NVLDD':
        dataToExport = history.filter(r => r.recordType === 'VALIDATION' && r.isValidated === 'Não');
        filename = 'relatorio_nao_validado_nvldd.csv';
        break;
      case 'ESCALATION':
        dataToExport = history.filter(r => r.recordType === 'ESCALATION');
        filename = 'relatorio_escaladas.csv';
        break;
      default:
        filename = 'relatorio_completo_ura.csv';
    }

    if (dataToExport.length === 0) {
      alert("Não há dados para exportar com este filtro.");
      return;
    }

    const headers = [
      'Data/Hora',
      'Tipo',
      'Analista',
      'Local',
      'Task/SR',
      'Assunto',
      'Validado?',
      'Escalado Por',
      'Técnico',
      'Defeito Cliente'
    ];

    const csvRows = [
      headers.join(';'),
      ...dataToExport.map(row => {
        const typeLabel = row.recordType === 'VALIDATION' ? (row.isValidated === 'Sim' ? 'VLDD' : 'NVLDD') : row.recordType;
        const subjectClean = row.subject ? row.subject.replace(/;/g, ',') : '';
        const taskSr = `${row.task || ''} ${row.sr ? '/ ' + row.sr : ''}`;
        
        return [
          formatDisplayDate(row.startTime),
          typeLabel,
          row.analystName,
          row.locationName,
          taskSr,
          subjectClean,
          row.isValidated || '-',
          row.bankAnalystName || '-',
          row.technicianName || '-',
          (row.customerComplaint || '').replace(/;/g, ',').replace(/\n/g, ' ')
        ].map(field => `"${field}"`).join(';');
      })
    ];

    const csvContent = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  // Filter history for dashboard: Include explicit ESCALATION records OR GENERAL records with isEscalated 'Sim'
  const dashboardData = history.filter(item => 
    item.recordType === 'ESCALATION' || 
    (item.recordType === 'GENERAL' && item.isEscalated === 'Sim')
  );

  const stats = {
    total: dashboardData.length,
    open: dashboardData.filter(i => i.status === 'Aberto').length,
    closed: dashboardData.filter(i => i.status === 'Fechado').length
  };

  // Filter for records view
  const filteredRecords = history.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.task?.toLowerCase().includes(searchLower) ||
      item.sr?.toLowerCase().includes(searchLower) ||
      item.analystName?.toLowerCase().includes(searchLower) ||
      item.locationName?.toLowerCase().includes(searchLower)
    );
  });

  // Config Functions
  const handleSaveConfig = () => {
    const url = configUrl.trim();
    const key = configKey.trim();

    if (url && key) {
      if (!url.startsWith('http')) {
        alert("A URL deve começar com https://");
        return;
      }
      localStorage.setItem('hw_supa_url', url);
      localStorage.setItem('hw_supa_key', key);
      alert("Configuração salva! A página será recarregada para aplicar as mudanças.");
      window.location.reload();
    } else {
      alert("Por favor, preencha URL e Key.");
    }
  };

  const handleClearConfig = () => {
    if (window.confirm("Isso removerá a conexão com o banco real e voltará para o modo Mock (Offline/Memória). Deseja continuar?")) {
      localStorage.removeItem('hw_supa_url');
      localStorage.removeItem('hw_supa_key');
      setConfigUrl('');
      setConfigKey('');
      window.location.reload();
    }
  };

  const TABLE_SQL = `
-- Crie a tabela no SQL Editor do Supabase (Executar apenas se não existir):
create table if not exists support_records (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  "recordType" text,
  "startTime" text,
  "endTime" text,
  subject text,
  task text,
  sr text,
  "analystName" text,
  "locationName" text,
  "isEscalated" text,
  "bankAnalystName" text,
  "problemDescription" text,
  "actionTaken" text,
  "validCall" text,
  "trainingProvided" text,
  "usedAcfs" text,
  "customerComplaint" text,
  "isValidated" text,
  "isActionPlanEffective" text,
  "wasPartChanged" text,
  "partChangedDescription" text,
  "usedDiagValidation" text,
  "usedTestCard" text,
  "sicOptions" text[],
  "customerName" text,
  "customerBadge" text,
  "escalationDate" text,
  "technicianName" text,
  status text,
  "escalationValidation" text
);

-- Habilite RLS (Segurança) se necessário:
alter table support_records enable row level security;
create policy "Public Access" on support_records for all using (true);
`.trim();

  // --------------------------------------------------------------------------
  // MAIN APP RENDER
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen pb-12 bg-gray-50 relative">
      
      {/* DB Error Alert */}
      {dbError && (
        <div className="bg-red-600 text-white px-4 py-3 text-sm font-medium text-center relative z-40 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{dbError}</span>
            {dbError.includes('não existe') && (
              <button 
                onClick={() => { setShowConfig(true); setShowSql(true); }}
                className="underline hover:text-blue-200 ml-2"
              >
                Corrigir Agora
              </button>
            )}
          </div>
        </div>
      )}

      {/* Config Modal */}
        {showConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 shrink-0">
                   <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                     <Database className="w-5 h-5 text-blue-600" />
                     Configurar Conexão (Online)
                   </h3>
                   <button onClick={() => { setShowConfig(false); setShowSql(false); }}><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                <div className="overflow-y-auto pr-2">
                  {!showSql ? (
                    <>
                      <p className="text-sm text-gray-500 mb-4">
                        Insira as credenciais do seu projeto Supabase para conectar ao banco de dados real. Deixe em branco para usar o modo offline (Mock).
                      </p>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">SUPABASE URL</label>
                          <input 
                            type="text" 
                            value={configUrl} 
                            onChange={e => setConfigUrl(e.target.value)} 
                            placeholder="https://xyz.supabase.co"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">SUPABASE ANON KEY</label>
                          <input 
                            type="password" 
                            value={configKey} 
                            onChange={e => setConfigKey(e.target.value)} 
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-900 rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-400 uppercase font-bold">SQL Editor Script</span>
                        <button 
                          onClick={() => navigator.clipboard.writeText(TABLE_SQL)}
                          className="text-xs text-blue-300 hover:text-white flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copiar
                        </button>
                      </div>
                      <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap overflow-x-auto">
                        {TABLE_SQL}
                      </pre>
                      <p className="text-xs text-gray-500 mt-2">
                        Copie este código, vá no seu Painel Supabase &gt; SQL Editor &gt; Novo Query e execute.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2 shrink-0">
                   {!showSql ? (
                      <div className="flex gap-2">
                        <button onClick={handleSaveConfig} className="flex-1 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition text-sm">
                          Salvar e Recarregar
                        </button>
                        <button onClick={() => setShowSql(true)} className="px-3 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition text-sm flex items-center gap-1" title="Gerar Tabela">
                          <Code2 className="w-4 h-4" /> SQL
                        </button>
                        {configSource === 'local' && (
                          <button onClick={handleClearConfig} className="px-3 bg-red-100 text-red-600 rounded hover:bg-red-200 transition" title="Remover Configuração">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                   ) : (
                      <button onClick={() => setShowSql(false)} className="w-full bg-gray-200 text-gray-800 py-2 rounded font-medium hover:bg-gray-300 transition text-sm">
                        Voltar para Configuração
                      </button>
                   )}
                </div>
             </div>
          </div>
        )}
      
      {/* Detail View Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center shrink-0">
               <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    Detalhes do Atendimento
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    ID: {selectedRecord.id} | Tipo: {selectedRecord.recordType}
                  </p>
               </div>
              <button onClick={() => setSelectedRecord(null)} className="text-gray-400 hover:text-white transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
               {/* Common Header Fields */}
               <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase block">Data/Hora</span>
                    <span className="text-sm text-gray-800">{formatDisplayDate(selectedRecord.startTime)}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase block">Analista</span>
                    <span className="text-sm text-gray-800">{selectedRecord.analystName}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase block">Local</span>
                    <span className="text-sm text-gray-800">{selectedRecord.locationName}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase block">Task / SR</span>
                    <span className="text-sm text-gray-800">{selectedRecord.task} {selectedRecord.sr ? `/ ${selectedRecord.sr}` : ''}</span>
                  </div>
               </div>

               {/* TYPE: GENERAL */}
               {(selectedRecord.recordType === 'GENERAL' || !selectedRecord.recordType) && (
                 <div className="space-y-4">
                    <div>
                      <span className="text-xs font-bold text-gray-500 uppercase block">Assunto</span>
                      <p className="text-sm bg-blue-50 text-blue-800 px-2 py-1 rounded inline-block">{selectedRecord.subject}</p>
                    </div>
                    {selectedRecord.isEscalated === 'Sim' && (
                       <div className="bg-red-50 p-3 rounded border border-red-100">
                         <span className="text-xs font-bold text-red-800 uppercase block mb-1">Escalado Por</span>
                         <span className="text-sm text-red-700">{selectedRecord.bankAnalystName}</span>
                       </div>
                    )}
                    <div>
                       <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Problema Relatado</span>
                       <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                         {selectedRecord.problemDescription || 'N/A'}
                       </div>
                    </div>
                    <div>
                       <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Ação do Analista</span>
                       <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                         {selectedRecord.actionTaken || 'N/A'}
                       </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center pt-2">
                       <div className="bg-gray-100 p-2 rounded">
                          <span className="block text-xs text-gray-500">Ligação Devida?</span>
                          <span className="font-bold text-sm">{selectedRecord.validCall}</span>
                       </div>
                       <div className="bg-gray-100 p-2 rounded">
                          <span className="block text-xs text-gray-500">Ensinamento?</span>
                          <span className="font-bold text-sm">{selectedRecord.trainingProvided}</span>
                       </div>
                       <div className="bg-gray-100 p-2 rounded">
                          <span className="block text-xs text-gray-500">ACFS?</span>
                          <span className="font-bold text-sm">{selectedRecord.usedAcfs}</span>
                       </div>
                    </div>
                 </div>
               )}

               {/* TYPE: VALIDATION (ESCALADA) */}
               {selectedRecord.recordType === 'VALIDATION' && (
                 <div className="space-y-4">
                    <div>
                       <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Defeito Reclamado (Cliente)</span>
                       <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-700">
                         {selectedRecord.customerComplaint || 'N/A'}
                       </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4 mt-4">
                       <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase">Checklist de Validação</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div className={`p-3 rounded border ${selectedRecord.isValidated === 'Sim' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                             <span className="block text-xs text-gray-500">Validado?</span>
                             <span className={`font-bold ${selectedRecord.isValidated === 'Sim' ? 'text-green-700' : 'text-red-700'}`}>
                               {selectedRecord.isValidated} {selectedRecord.isValidated === 'Sim' ? '(#VLDD#)' : '(#NVLDD#)'}
                             </span>
                          </div>
                          <div className="p-3 rounded border bg-gray-50 border-gray-200">
                             <span className="block text-xs text-gray-500">Plano Efetivo?</span>
                             <span className="font-bold text-gray-800">{selectedRecord.isActionPlanEffective}</span>
                          </div>
                          <div className="col-span-2 p-3 rounded border bg-gray-50 border-gray-200">
                             <span className="block text-xs text-gray-500">Peça Trocada?</span>
                             <span className="font-bold text-gray-800">{selectedRecord.wasPartChanged}</span>
                             {selectedRecord.wasPartChanged === 'Sim' && (
                               <span className="block text-sm text-gray-600 mt-1 border-t border-gray-200 pt-1">
                                 {selectedRecord.partChangedDescription}
                               </span>
                             )}
                          </div>
                          <div className="p-3 rounded border bg-gray-50 border-gray-200">
                             <span className="block text-xs text-gray-500">Diag Completo?</span>
                             <span className="font-bold text-gray-800">{selectedRecord.usedDiagValidation}</span>
                          </div>
                          <div className="p-3 rounded border bg-gray-50 border-gray-200">
                             <span className="block text-xs text-gray-500">Cartão Teste?</span>
                             <span className="font-bold text-gray-800">{selectedRecord.usedTestCard}</span>
                          </div>
                       </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                       <span className="text-xs font-bold text-gray-500 uppercase block mb-2">SIC - Itens</span>
                       <div className="flex gap-2 flex-wrap">
                          {selectedRecord.sicOptions && selectedRecord.sicOptions.length > 0 ? (
                            selectedRecord.sicOptions.map(opt => (
                              <span key={opt} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                {opt}
                              </span>
                            ))
                          ) : <span className="text-sm text-gray-400">Nenhum item selecionado</span>}
                       </div>
                    </div>

                     <div className="border-t border-gray-200 pt-4">
                        <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Acompanhamento</span>
                        <p className="text-sm text-gray-800">
                           {selectedRecord.customerName} 
                           {selectedRecord.customerBadge && <span className="text-gray-500 ml-1">(Mat: {selectedRecord.customerBadge})</span>}
                        </p>
                     </div>
                 </div>
               )}

               {/* TYPE: ESCALATION (CHAMADO ESCALADO) */}
               {selectedRecord.recordType === 'ESCALATION' && (
                  <div className="space-y-4">
                     <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mb-4">
                        <span className="text-xs font-bold text-orange-800 uppercase block mb-1">Dados da Escalada</span>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                           <div>
                              <span className="block text-xs text-gray-500">Data Escalada</span>
                              <span className="font-medium text-gray-800">{formatDisplayDate(selectedRecord.escalationDate)}</span>
                           </div>
                           <div>
                              <span className="block text-xs text-gray-500">Técnico</span>
                              <span className="font-medium text-gray-800">{selectedRecord.technicianName}</span>
                           </div>
                        </div>
                     </div>
                     
                     <div>
                       <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Defeito Reclamado (Cliente)</span>
                       <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-700">
                         {selectedRecord.customerComplaint || 'N/A'}
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                       <div className="text-center p-3 bg-gray-50 rounded">
                          <span className="block text-xs text-gray-500 mb-1">Status Atual</span>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                             selectedRecord.status === 'Aberto' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                          }`}>
                             {selectedRecord.status}
                          </span>
                       </div>
                       <div className="text-center p-3 bg-gray-50 rounded">
                          <span className="block text-xs text-gray-500 mb-1">Validação Escalada</span>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                             selectedRecord.escalationValidation === 'Sim' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                             {selectedRecord.escalationValidation}
                          </span>
                       </div>
                    </div>
                  </div>
               )}
            </div>

            <div className="bg-gray-100 px-6 py-4 flex justify-end shrink-0">
               {userRole === 'admin' && (
                  <button 
                     onClick={() => handleDeleteRecord(selectedRecord.id)}
                     className="mr-auto px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-100 transition flex items-center gap-2"
                  >
                     <Trash2 className="w-4 h-4" /> Excluir
                  </button>
               )}
               <button 
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
               >
                  Fechar
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`${userRole === 'admin' ? 'bg-red-600' : 'bg-blue-600'} p-2 rounded-lg transition-colors duration-300`}>
              <ServerCrash className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Support<span className={`${userRole === 'admin' ? 'text-red-600' : 'text-blue-600'} transition-colors duration-300`}>Log</span> URA
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
             {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
             
             {/* Role Badge */}
             {userRole === 'admin' && (
                <div className="flex items-center bg-red-100 text-red-700 px-3 py-1.5 rounded-full border border-red-200" title="Perfil Administrador">
                   <ShieldAlert className="w-4 h-4 mr-1" />
                   <span className="text-xs font-bold">ADMIN</span>
                </div>
             )}
             {userRole === 'technician' && (
                <div className="flex items-center bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full border border-gray-200" title="Perfil Técnico">
                   <Hammer className="w-4 h-4 mr-1" />
                   <span className="text-xs font-bold">TÉCNICO</span>
                </div>
             )}

             <div 
               className="flex items-center text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 cursor-default"
               title={`Logado como ${session?.user?.email}`}
             >
               <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
               <span className="text-xs font-bold hidden sm:inline">
                 {session?.user?.email?.split('@')[0]}
               </span>
             </div>
             
             <div className="h-6 w-px bg-gray-200 mx-1"></div>

             {/* Config Button (Moved from Login) */}
             <button 
              onClick={() => setShowConfig(true)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Configurar Banco de Dados"
             >
               <Settings className="w-5 h-5" />
             </button>
             
             {/* Reset Cache Button */}
             <button 
              onClick={handleCleanCache}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Limpar Cache"
             >
               <RefreshCw className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-1 bg-gray-200 p-1 rounded-lg mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('geral')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === 'geral' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Atendimento Geral</span>
          </button>
          <button
            onClick={() => setActiveTab('escala')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === 'escala' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>ESCALADA / Validação</span>
          </button>

          {/* Admin Restricted Tabs */}
          {userRole === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('chamadoEscalado')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  activeTab === 'chamadoEscalado' 
                    ? 'bg-white text-orange-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Chamado / Escalado</span>
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  activeTab === 'dashboard' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab('registros')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  activeTab === 'registros' 
                    ? 'bg-white text-teal-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FileClock className="w-4 h-4" />
                <span>Registros</span>
              </button>
            </>
          )}
        </div>

        {activeTab === 'registros' && userRole === 'admin' ? (
          /* REGISTROS (ALL RECORDS) VIEW - ADMIN ONLY */
          <div className="animate-in fade-in duration-300">
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-teal-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                   <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                     <FileClock className="w-5 h-5 text-teal-600" />
                     Todos os Registros
                   </h2>
                   
                   <div className="flex gap-2 w-full md:w-auto flex-1 justify-end">
                     {/* Search Bar */}
                     <div className="relative w-full md:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition duration-150 ease-in-out"
                          placeholder="Consultar por Task ou SR..."
                        />
                     </div>

                     {/* Export Button - ADMIN ONLY */}
                     {userRole === 'admin' && (
                       <div className="relative">
                         <button
                           onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                           className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md shadow-sm hover:bg-teal-700 transition text-sm font-medium whitespace-nowrap"
                         >
                           <FileSpreadsheet className="w-4 h-4" />
                           Relatórios
                         </button>

                         {isExportMenuOpen && (
                           <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200 animate-in fade-in slide-in-from-top-2 duration-150">
                              <button onClick={() => handleExportReport('ALL')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                <Download className="w-3 h-3" /> Geral (Todos)
                              </button>
                              <button onClick={() => handleExportReport('ESCALATION')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3 text-orange-500" /> Apenas Escaladas
                              </button>
                              <button onClick={() => handleExportReport('VLDD')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3 text-green-500" /> Validadas (VLDD)
                              </button>
                              <button onClick={() => handleExportReport('NVLDD')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                <X className="w-3 h-3 text-red-500" /> Não Validadas (NVLDD)
                              </button>
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                </div>
                
                {filteredRecords.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                     {isLoading ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                          <p>Carregando histórico...</p>
                        </div>
                     ) : (
                       <>
                        <History className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <p>{searchTerm ? 'Nenhum registro encontrado para a busca.' : 'Nenhum atendimento registrado ainda.'}</p>
                       </>
                     )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Analista</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task / SR</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assunto</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatDisplayDate(record.startTime)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {record.analystName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {record.locationName || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                                {record.task} {record.sr ? `/ ${record.sr}` : ''}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {record.subject ? record.subject.split('-')[0] : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {record.recordType === 'VALIDATION' ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  #VLDD#
                                </span>
                              ) : record.recordType === 'ESCALATION' ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                                  Escalado
                                </span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  Geral
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => setSelectedRecord(record)}
                                  className="inline-flex items-center space-x-1 px-3 py-1 bg-white border border-gray-300 rounded-full text-xs font-medium text-gray-700 hover:bg-gray-100 transition shadow-sm"
                                  title="Ver Detalhes"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span className="hidden md:inline">Exibir</span>
                                </button>
                                {userRole === 'admin' && (
                                  <button
                                    onClick={() => handleDeleteRecord(record.id)}
                                    className="inline-flex items-center justify-center p-1.5 bg-red-50 border border-red-200 rounded-full text-red-600 hover:bg-red-100 transition shadow-sm"
                                    title="Excluir Registro"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
             </div>
          </div>
        ) : activeTab === 'dashboard' && userRole === 'admin' ? (
           /* DASHBOARD VIEW */
           <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                 <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <LayoutDashboard className="w-6 h-6 text-indigo-600" />
                    Painel de Escaladas
                 </h2>
                 <span className="text-sm text-gray-500">
                    Visão geral dos chamados escalados (internos ou diretos)
                 </span>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100 flex items-center justify-between">
                    <div>
                       <p className="text-sm font-medium text-gray-500 uppercase">Total Escalados</p>
                       <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.total}</p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-full">
                       <Activity className="w-6 h-6 text-indigo-600" />
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 flex items-center justify-between">
                    <div>
                       <p className="text-sm font-medium text-gray-500 uppercase">Pendentes (Abertos)</p>
                       <p className="text-3xl font-bold text-red-600 mt-1">{stats.open}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-full">
                       <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100 flex items-center justify-between">
                    <div>
                       <p className="text-sm font-medium text-gray-500 uppercase">Concluídos (Fechados)</p>
                       <p className="text-3xl font-bold text-green-600 mt-1">{stats.closed}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-full">
                       <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                 </div>
              </div>

              {/* Escalation Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-700 uppercase">Lista de Chamados Escalados</h3>
                 </div>
                 {dashboardData.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Nenhum chamado escalado encontrado.</div>
                 ) : (
                    <div className="overflow-x-auto">
                       <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                             <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task / Chamado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origem</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsável</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                             </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                             {dashboardData.map((record) => (
                                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                      {formatDisplayDate(record.recordType === 'ESCALATION' ? record.escalationDate : record.startTime)}
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {record.task}
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm">
                                      {record.recordType === 'ESCALATION' ? (
                                         <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-bold">Direto</span>
                                      ) : (
                                         <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-bold">Geral (Escalado)</span>
                                      )}
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                      {record.recordType === 'ESCALATION' ? record.technicianName : record.bankAnalystName}
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap text-center">
                                      <button 
                                         onClick={() => handleToggleStatus(record.id, record.status)}
                                         className={`px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${
                                            record.status === 'Aberto' 
                                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                         }`}
                                         title="Clique para alterar status"
                                      >
                                         {record.status || 'Aberto'}
                                      </button>
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap text-center">
                                      <button
                                         onClick={() => setSelectedRecord(record)}
                                         className="text-gray-400 hover:text-indigo-600 transition"
                                      >
                                         <Eye className="w-5 h-5" />
                                      </button>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 )}
              </div>
           </div>
        ) : (
          /* STANDARD FORM VIEWS */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Form */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {activeTab === 'geral' && 'Dados do Atendimento'}
                    {activeTab === 'escala' && 'Checklist de Escalada / Validação'}
                    {activeTab === 'chamadoEscalado' && 'Registro de Chamado Escalado'}
                  </h2>
                  <div className="flex gap-2">
                    {isLoading && <span className="text-xs text-blue-500 self-center">Salvando...</span>}
                    <button 
                      onClick={handleClear}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Limpar campos"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* TAB 1: GERAL */}
                {activeTab === 'geral' && (
                  <div className="animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <FormInput label="Nome do Analista" value={formData.analystName} onChange={(v) => setFormData({...formData, analystName: v})} placeholder="Seu nome" required />
                      <FormInput label="Início do Suporte" type="datetime-local" value={formData.startTime} onChange={(v) => setFormData({...formData, startTime: v})} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput label="Nome do Local" value={formData.locationName} onChange={(v) => setFormData({...formData, locationName: v})} placeholder="Nome da agência ou local" />
                      <FormInput label="Task / Chamado" value={formData.task} onChange={(v) => setFormData({...formData, task: v})} placeholder="Número da Task" />
                      <FormInput label="SR (Service Request)" value={formData.sr} onChange={(v) => setFormData({...formData, sr: v})} placeholder="ID da SR" />

                      <div className="md:col-span-1">
                        <FormSelect label="Assunto (Subject)" value={formData.subject} options={SUBJECT_OPTIONS} onChange={(v) => setFormData({...formData, subject: v})} required />
                      </div>

                      {/* Escalation Section */}
                      <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col md:flex-row gap-6">
                        <div className="flex-shrink-0">
                            <RadioGroup label="Chamado Escalado?" name="isEscalated" value={formData.isEscalated} onChange={(v) => setFormData({...formData, isEscalated: v})} />
                        </div>
                        {formData.isEscalated === 'Sim' && (
                          <div className="flex-grow animate-in fade-in slide-in-from-left-4 duration-300">
                              <FormInput label="Nome do Analista do Banco" value={formData.bankAnalystName} onChange={(v) => setFormData({...formData, bankAnalystName: v})} placeholder="Quem solicitou o escalonamento?" />
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <FormTextArea label="Problema Relatado (Técnico)" value={formData.problemDescription} onChange={(v) => setFormData({...formData, problemDescription: v})} placeholder="O que o técnico informou..." rows={3} />
                      </div>
                      <div className="md:col-span-2">
                        <FormTextArea label="Ação do Analista" value={formData.actionTaken} onChange={(v) => setFormData({...formData, actionTaken: v})} placeholder="Procedimentos realizados..." rows={4} />
                      </div>

                      <RadioGroup label="Ligação Devida?" name="validCall" value={formData.validCall} onChange={(v) => setFormData({...formData, validCall: v})} />
                      <RadioGroup label="Ocorreu Ensinamento?" name="trainingProvided" value={formData.trainingProvided} onChange={(v) => setFormData({...formData, trainingProvided: v})} />
                      <RadioGroup label="Utilizou ACFS?" name="usedAcfs" value={formData.usedAcfs} onChange={(v) => setFormData({...formData, usedAcfs: v})} />
                    </div>
                    {/* End Time Control */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                      <div className="flex flex-col justify-end">
                          <label className="text-sm font-medium text-gray-700 mb-1">Fim do Suporte</label>
                          <div className="flex gap-2">
                            <input type="datetime-local" className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} />
                            <button onClick={setEndNow} className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition">Agora</button>
                          </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: ESCALA / VALIDAÇÃO */}
                {activeTab === 'escala' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <FormInput label="Nome do Analista" value={formData.analystName} onChange={(v) => setFormData({...formData, analystName: v})} placeholder="Seu nome" required />
                      <FormInput label="Início do Suporte" type="datetime-local" value={formData.startTime} onChange={(v) => setFormData({...formData, startTime: v})} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput label="Nome do Local" value={formData.locationName} onChange={(v) => setFormData({...formData, locationName: v})} placeholder="Nome da agência ou local" />
                      <FormInput label="Task / Chamado" value={formData.task} onChange={(v) => setFormData({...formData, task: v})} placeholder="Número da Task" />
                      <div className="md:col-span-2">
                        <FormTextArea label="Defeito Reclamado pelo Cliente" value={formData.customerComplaint} onChange={(v) => setFormData({...formData, customerComplaint: v})} placeholder="Descrição do problema na visão do cliente..." rows={2} />
                      </div>
                    </div>

                    <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 space-y-6">
                      <h3 className="font-semibold text-purple-800 border-b border-purple-200 pb-2">Checklist de Validação</h3>
                      
                      <div className="flex flex-col">
                        <label className="text-base font-bold text-gray-800 mb-2">Validado? (Define tag #VLDD# / #NVLDD#)</label>
                        <div className="flex space-x-6">
                          <label className="inline-flex items-center cursor-pointer p-3 bg-white rounded-lg border border-gray-200 hover:border-green-400">
                            <input type="radio" name="isValidated" value="Sim" checked={formData.isValidated === 'Sim'} onChange={() => setFormData({...formData, isValidated: 'Sim'})} className="form-radio h-5 w-5 text-green-600" />
                            <span className="ml-2 font-medium text-gray-700">Sim (#VLDD#)</span>
                          </label>
                          <label className="inline-flex items-center cursor-pointer p-3 bg-white rounded-lg border border-gray-200 hover:border-red-400">
                            <input type="radio" name="isValidated" value="Não" checked={formData.isValidated === 'Não'} onChange={() => setFormData({...formData, isValidated: 'Não'})} className="form-radio h-5 w-5 text-red-600" />
                            <span className="ml-2 font-medium text-gray-700">Não (#NVLDD#)</span>
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <RadioGroup label="Plano de ação efetivo?" name="isActionPlanEffective" value={formData.isActionPlanEffective} onChange={(v) => setFormData({...formData, isActionPlanEffective: v})} />
                        <RadioGroup label="Utilizou Diag?" name="usedDiagValidation" value={formData.usedDiagValidation} onChange={(v) => setFormData({...formData, usedDiagValidation: v})} />
                        <RadioGroup label="Cartão de testes?" name="usedTestCard" value={formData.usedTestCard} onChange={(v) => setFormData({...formData, usedTestCard: v})} />
                      
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <RadioGroup label="Foi trocado alguma peça?" name="wasPartChanged" value={formData.wasPartChanged} onChange={(v) => setFormData({...formData, wasPartChanged: v})} />
                          {formData.wasPartChanged === 'Sim' && (
                            <div className="mt-3">
                              <input type="text" placeholder="Qual peça?" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={formData.partChangedDescription} onChange={(e) => setFormData({...formData, partChangedDescription: e.target.value})} />
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">SIC - Itens Verificados</label>
                        <div className="flex flex-wrap gap-4">
                          {(['Saques', 'Depositos', 'Sensores', 'SmartPower'] as SicOption[]).map((opt) => (
                            <label key={opt} className="inline-flex items-center cursor-pointer select-none">
                                <input type="checkbox" checked={formData.sicOptions.includes(opt)} onChange={() => toggleSicOption(opt)} className="h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                                <span className="ml-2 text-sm text-gray-700">{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-purple-200">
                        <FormInput label="Nome do Cliente (Acompanhamento)" value={formData.customerName} onChange={(v) => setFormData({...formData, customerName: v})} placeholder="Nome completo" />
                        <FormInput label="Matrícula" value={formData.customerBadge} onChange={(v) => setFormData({...formData, customerBadge: v})} placeholder="Matrícula / ID" />
                      </div>
                    </div>
                    {/* End Time Control */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                      <div className="flex flex-col justify-end">
                          <label className="text-sm font-medium text-gray-700 mb-1">Fim do Suporte</label>
                          <div className="flex gap-2">
                            <input type="datetime-local" className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} />
                            <button onClick={setEndNow} className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition">Agora</button>
                          </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: CHAMADO / ESCALADO */}
                {activeTab === 'chamadoEscalado' && userRole === 'admin' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput label="Nome do Analista (Você)" value={formData.analystName} onChange={(v) => setFormData({...formData, analystName: v})} placeholder="Seu nome" required />
                      <FormInput label="Data da Escalada" type="datetime-local" value={formData.escalationDate} onChange={(v) => setFormData({...formData, escalationDate: v})} />
                    </div>
                    
                    <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
                      <h3 className="font-semibold text-orange-800 border-b border-orange-200 pb-4 mb-4">Detalhes da Escalada</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput label="Nome do Local" value={formData.locationName} onChange={(v) => setFormData({...formData, locationName: v})} placeholder="Local da escalada" />
                        <FormInput label="Task / Chamado" value={formData.task} onChange={(v) => setFormData({...formData, task: v})} placeholder="ID do chamado" />
                        <div className="md:col-span-2">
                          <FormInput label="Técnico" value={formData.technicianName} onChange={(v) => setFormData({...formData, technicianName: v})} placeholder="Nome do técnico responsável" />
                        </div>
                        <div className="md:col-span-2">
                          <FormTextArea label="Defeito Reclamado pelo Cliente" value={formData.customerComplaint} onChange={(v) => setFormData({...formData, customerComplaint: v})} placeholder="Descrição do problema..." rows={3} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Right Column: Preview & Actions */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Action Card */}
              <div className="bg-white rounded-xl shadow-lg border border-blue-100 p-6 sticky top-24">
                <h3 className="text-sm uppercase tracking-wide text-gray-500 font-bold mb-4">Resumo e Ações</h3>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-xs text-gray-700 font-mono leading-relaxed">
                    {summary || <span className="text-gray-400 italic">Preencha o formulário para gerar o resumo...</span>}
                  </pre>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleCopy}
                    className={`w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                      copied 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <ClipboardCopy className="w-4 h-4" />
                        <span>Copiar Resumo</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleRegister}
                    disabled={isLoading}
                    className={`w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 text-white rounded-lg shadow-md font-medium transition-all duration-200 ${
                      isLoading ? 'opacity-75 cursor-not-allowed' : 'hover:bg-blue-700 active:bg-blue-800 hover:shadow-lg'
                    }`}
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>{isLoading ? 'Salvando...' : 'Registrar Atendimento'}</span>
                  </button>
                  <p className="text-xs text-center text-gray-400 mt-2">
                    {(isSupabaseConfigured)
                      ? "* Salva no banco de dados e copia para a área de transferência." 
                      : "* Apenas copia para a área de transferência (Offline)."}
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* History Section (Visible on General Tabs, hidden on Dashboard since Dashboard basically replaces it for Escalations) */}
        {activeTab !== 'dashboard' && activeTab !== 'registros' && history.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center space-x-2 mb-4">
              <History className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-800">Histórico de Atendimentos</h2>
              {(!isSupabaseConfigured) && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Sessão Local</span>}
            </div>
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assunto / Task</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDisplayDate(record.startTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {record.subject ? record.subject.split('-')[0] : record.task}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.locationName || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {record.recordType === 'VALIDATION' ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              #VLDD#
                            </span>
                          ) : record.recordType === 'ESCALATION' ? (
                             <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                              Escalado
                            </span>
                          ) : (
                             <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              Geral
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
