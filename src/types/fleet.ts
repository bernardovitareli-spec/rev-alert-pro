export type RevisionUnit = 'Km' | 'Hr';

export type RevisionStatus = 'critical' | 'warning' | 'ok';

export type ExecutionStatus = 'nao_realizada' | 'em_servico' | 'realizada';

export type TipoDocumentoVeiculo = 'crlv' | 'tacografo' | 'documento';

export interface Oficina {
  id: string;
  nome: string;
  endereco: string | null;
  telefone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Empresa {
  id: string;
  nome: string;
  created_at: string;
}

export interface TipoRevisao {
  id: string;
  nome: string;
  intervalo_padrao: number | null;
  unidade_padrao: RevisionUnit | null;
  created_at: string;
}

export interface Veiculo {
  id: string;
  placa_serie: string;
  tag_obra: string | null;
  contrato: string | null;
  km_atual: number;
  hora_atual: number;
  ultima_atualizacao: string | null;
  retorno_patio: string | null;
  empresa_id: string | null;
  crlv_url: string | null;
  tacografo_url: string | null;
  documento_url: string | null;
  crlv_validade: string | null;
  tacografo_validade: string | null;
  created_at: string;
  updated_at: string;
  empresa?: Empresa | null;
}

export interface Revisao {
  id: string;
  veiculo_id: string;
  tipo_revisao_id: string;
  data_revisao: string | null;
  km_revisao: number | null;
  hora_revisao: number | null;
  intervalo: number;
  unidade: RevisionUnit;
  status_execucao: ExecutionStatus;
  previsao_entrega: string | null;
  oficina_id: string | null;
  ordem_servico: string | null;
  nota_fiscal_url: string | null;
  valor: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  veiculo?: Veiculo;
  tipo_revisao?: TipoRevisao;
  oficina?: Oficina;
}

export interface RevisaoComStatus extends Revisao {
  status: RevisionStatus;
  proximaRevisao: number;
  kmOuHoraAtual: number;
  faltam: number;
  diasEstimados: number | null;
}

export interface VeiculoComRevisoes extends Veiculo {
  revisoes: RevisaoComStatus[];
  statusGeral: RevisionStatus;
  revisoesCriticas: number;
  revisoesAtencao: number;
  revisoesOk: number;
}

export interface ImportedRow {
  placa_serie: string;
  tag_obra?: string;
  ultima_atualizacao?: string;
  km_atual?: number;
  hora_atual?: number;
  retorno_patio?: string;
  tipo_revisao?: string;
  data_revisao?: string;
  km_revisao?: number;
  hora_revisao?: number;
  intervalo?: number;
  unidade?: RevisionUnit;
  contrato?: string;
  empresa?: string;
}

export interface DashboardStats {
  totalVeiculos: number;
  veiculosCriticos: number;
  veiculosAtencao: number;
  veiculosOk: number;
  revisoesCriticas: number;
  revisoesAtencao: number;
  revisoesOk: number;
}

export interface FilterOptions {
  search: string;
  status: RevisionStatus | 'all';
  statusExecucao: ExecutionStatus | 'all';
  empresaId: string | 'all';
  tipoRevisaoId: string | 'all';
  periodo: 'hoje' | 'amanha' | 'semana' | 'proxima_semana' | 'mes' | 'proximo_mes' | 'all';
}

export type PeriodType = 'vencidas' | 'hoje' | 'amanha' | 'essaSemana' | 'proximaSemana' | 'esseMes' | 'emServico';

export interface RevisionDrilldownItem {
  revisaoId: string;
  veiculoId: string;
  veiculoPlaca: string;
  veiculoTag: string | null;
  empresaNome: string | null;
  tipoRevisaoNome: string;
  status: RevisionStatus;
  statusExecucao: ExecutionStatus;
  previsaoEntrega: string | null;
  oficinaId: string | null;
  valor: number | null;
  diasEstimados: number | null;
  faltam: number;
  unidade: RevisionUnit;
  kmAtual: number;
  horaAtual: number;
}

export interface PeriodDates {
  hoje: Date;
  amanha: Date;
  essaSemana: { inicio: Date; fim: Date };
  proximaSemana: { inicio: Date; fim: Date };
  esseMes: { inicio: Date; fim: Date };
}

export interface RevisionPeriodStats {
  vencidas: RevisionDrilldownItem[];
  hoje: RevisionDrilldownItem[];
  amanha: RevisionDrilldownItem[];
  essaSemana: RevisionDrilldownItem[];
  proximaSemana: RevisionDrilldownItem[];
  esseMes: RevisionDrilldownItem[];
  emServico: RevisionDrilldownItem[];
  datas: PeriodDates;
}

// ===== HISTÓRICO DE REVISÕES =====
export interface HistoricoRevisao {
  id: string;
  revisao_id: string | null;
  veiculo_id: string;
  tipo_revisao_id: string;
  oficina_id: string | null;
  data_realizacao: string;
  km_realizacao: number | null;
  hora_realizacao: number | null;
  valor: number | null;
  ordem_servico: string | null;
  nota_fiscal_url: string | null;
  observacoes: string | null;
  tempo_servico_dias: number | null;
  created_at: string;
  // Relacionamentos expandidos
  veiculo?: Veiculo;
  tipo_revisao?: TipoRevisao;
  oficina?: Oficina;
}

// ===== STATUS DE DOCUMENTOS =====
export type DocumentStatus = 'vencido' | 'atencao' | 'ok' | 'indefinido';

export interface DocumentoStatusInfo {
  status: DocumentStatus;
  diasRestantes: number | null;
  label: string;
  validade: string | null;
}

export interface VeiculoDocumentosStatus {
  veiculoId: string;
  veiculoPlaca: string;
  empresaNome: string | null;
  crlv: DocumentoStatusInfo;
  tacografo: DocumentoStatusInfo;
}

// ===== ANALYTICS E KPIs =====
export interface GastoPorVeiculo {
  veiculoId: string;
  veiculoPlaca: string;
  empresaNome: string | null;
  totalGasto: number;
  qtdRevisoes: number;
}

export interface GastoPorOficina {
  oficinaId: string;
  oficinaNome: string;
  totalGasto: number;
  qtdServicos: number;
  tempoMedioDias: number;
}

export interface GastoPorTipo {
  tipoId: string;
  tipoNome: string;
  totalGasto: number;
  qtdRevisoes: number;
}

export interface OficinaStats {
  id: string;
  nome: string;
  endereco: string | null;
  telefone: string | null;
  totalServicos: number;
  totalGasto: number;
  tempoMedioDias: number;
  taxaAtraso: number;
}

export interface FleetKPIs {
  totalGasto: number;
  gastoMesAtual: number;
  gastoMesAnterior: number;
  tendenciaGasto: 'up' | 'down' | 'stable';
  tempoMedioEntrega: number;
  percentualVeiculosCriticos: number;
  percentualDocumentosVencidos: number;
  percentualDocumentosAtencao: number;
  totalRevisoesRealizadas: number;
  mediaGastoPorRevisao: number;
}

export interface FiltrosRelatorio {
  dataInicio: string | null;
  dataFim: string | null;
  empresaId: string | 'all';
  oficinaId: string | 'all';
  tipoRevisaoId: string | 'all';
}
