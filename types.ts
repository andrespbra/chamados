
export interface SubjectOption {
  code: string;
  label: string;
}

export const SUBJECT_OPTIONS: SubjectOption[] = [
  { code: "1100", label: "1100 - Código" },
  { code: "1101", label: "1101 - Código de peças" },
  { code: "1102", label: "1102 - Código de mídias" },
  { code: "1200", label: "1200 - Dúvida técnica" },
  { code: "1201", label: "1201 - Interpretação defeito" },
  { code: "1202", label: "1202 - Testes em periféricos" },
  { code: "1203", label: "1203 - Sistema de ensinamento" },
  { code: "1204", label: "1204 - Status dos sensores" },
  { code: "1205", label: "1205 - Diag não carrega" },
  { code: "1206", label: "1206 - Erro de HW" },
  { code: "1207", label: "1207 - Dúvidas configuração" },
];

export type SicOption = 'Saques' | 'Depositos' | 'Sensores' | 'SmartPower';

export interface SupportRecord {
  id: string;
  recordType: 'GENERAL' | 'VALIDATION' | 'ESCALATION'; // To distinguish origin tab
  startTime: string;
  endTime: string;
  subject: string;
  task: string;
  sr: string;
  analystName: string;
  locationName: string;
  isEscalated: 'Sim' | 'Não';
  bankAnalystName: string;
  problemDescription: string;
  actionTaken: string;
  validCall: 'Sim' | 'Não';
  trainingProvided: 'Sim' | 'Não';
  usedAcfs: 'Sim' | 'Não';
  
  // Escala / Validation Fields
  customerComplaint: string;
  isValidated: 'Sim' | 'Não' | '';
  isActionPlanEffective: 'Sim' | 'Não';
  wasPartChanged: 'Sim' | 'Não';
  partChangedDescription: string;
  usedDiagValidation: 'Sim' | 'Não';
  usedTestCard: 'Sim' | 'Não';
  sicOptions: SicOption[];
  customerName: string;
  customerBadge: string;

  // Chamado / Escalado Fields
  escalationDate: string;
  technicianName: string;

  // Dashboard Specific Fields
  status: 'Aberto' | 'Fechado';
  escalationValidation: 'Sim' | 'Não';
}

export const INITIAL_STATE: Omit<SupportRecord, 'id'> = {
  recordType: 'GENERAL',
  startTime: '',
  endTime: '',
  subject: '',
  task: '',
  sr: '',
  analystName: '',
  locationName: '',
  isEscalated: 'Não',
  bankAnalystName: '',
  problemDescription: '',
  actionTaken: '',
  validCall: 'Sim',
  trainingProvided: 'Não',
  usedAcfs: 'Não',
  
  // Escala Init
  customerComplaint: '',
  isValidated: '',
  isActionPlanEffective: 'Sim',
  wasPartChanged: 'Não',
  partChangedDescription: '',
  usedDiagValidation: 'Sim',
  usedTestCard: 'Não',
  sicOptions: [],
  customerName: '',
  customerBadge: '',

  // Chamado / Escalado Init
  escalationDate: '',
  technicianName: '',

  // Dashboard Init
  status: 'Aberto',
  escalationValidation: 'Não',
};
