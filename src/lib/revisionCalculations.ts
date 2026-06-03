import { Revisao, RevisaoComStatus, RevisionStatus, VeiculoComRevisoes, Veiculo } from '@/types/fleet';

const DIAS_ALERTA = 7; // Alert 7 days before
const MEDIA_KM_DIA = 150; // Average km per day for estimation
const MEDIA_HORAS_DIA = 8; // Average hours per day for estimation
const INTERVALO_PADRAO_DIAS = 180; // Default interval in days when using date fallback

export function calcularStatusRevisao(
  revisao: Revisao,
  kmAtual: number,
  horaAtual: number
): RevisaoComStatus {
  const { unidade, intervalo, km_revisao, hora_revisao, data_revisao } = revisao;
  
  // Check if we have KM/Hr data for calculation
  const hasKmHrData = unidade === 'Km' ? (km_revisao !== null && km_revisao > 0) : (hora_revisao !== null && hora_revisao > 0);
  
  let proximaRevisao: number;
  let kmOuHoraAtual: number;
  let faltam: number;
  let diasEstimados: number | null = null;
  let status: RevisionStatus;
  
  if (hasKmHrData) {
    // Primary calculation: based on KM/Hr
    if (unidade === 'Km') {
      proximaRevisao = (km_revisao || 0) + intervalo;
      kmOuHoraAtual = kmAtual;
    } else {
      proximaRevisao = (hora_revisao || 0) + intervalo;
      kmOuHoraAtual = horaAtual;
    }
    
    faltam = proximaRevisao - kmOuHoraAtual;
    
    // Calculate estimated days until revision
    const mediaDiaria = unidade === 'Km' ? MEDIA_KM_DIA : MEDIA_HORAS_DIA;
    diasEstimados = faltam > 0 ? Math.round(faltam / mediaDiaria) : 0;
    
    // Determine status based on remaining km/hours or days
    if (faltam <= 0) {
      status = 'critical';
    } else if (diasEstimados <= DIAS_ALERTA) {
      status = 'warning';
    } else {
      status = 'ok';
    }
  } else if (data_revisao) {
    // Fallback: use data_revisao when KM/Hr not available
    const dataRevisao = new Date(data_revisao);
    const hoje = new Date();
    const diasDesdeRevisao = Math.floor((hoje.getTime() - dataRevisao.getTime()) / (1000 * 60 * 60 * 24));
    
    // Estimate interval in days based on intervalo and unit
    const mediaDiaria = unidade === 'Km' ? MEDIA_KM_DIA : MEDIA_HORAS_DIA;
    const intervaloEmDias = intervalo > 0 ? Math.round(intervalo / mediaDiaria) : INTERVALO_PADRAO_DIAS;
    
    const diasRestantes = intervaloEmDias - diasDesdeRevisao;
    
    // Set values for display
    proximaRevisao = intervalo;
    kmOuHoraAtual = unidade === 'Km' ? kmAtual : horaAtual;
    faltam = diasRestantes * mediaDiaria; // Convert back to KM/Hr for display
    diasEstimados = diasRestantes > 0 ? diasRestantes : 0;
    
    if (diasRestantes <= 0) {
      status = 'critical';
    } else if (diasRestantes <= DIAS_ALERTA) {
      status = 'warning';
    } else {
      status = 'ok';
    }
  } else {
    // No data available - assume OK but mark for attention
    proximaRevisao = intervalo;
    kmOuHoraAtual = unidade === 'Km' ? kmAtual : horaAtual;
    faltam = intervalo;
    diasEstimados = null;
    status = 'ok';
  }
  
  // Se vencida (critical), forçar status_execucao para 'nao_realizada'
  // a menos que já esteja 'em_servico'
  let statusExecucao = revisao.status_execucao || 'nao_realizada';
  if (status === 'critical' && statusExecucao === 'realizada') {
    statusExecucao = 'nao_realizada';
  }

  return {
    ...revisao,
    status,
    status_execucao: statusExecucao,
    proximaRevisao,
    kmOuHoraAtual,
    faltam,
    diasEstimados: faltam > 0 ? diasEstimados : null,
  };
}

export function calcularStatusVeiculo(
  veiculo: Veiculo,
  revisoes: Revisao[]
): VeiculoComRevisoes {
  const revisoesComStatus = revisoes.map(revisao =>
    calcularStatusRevisao(revisao, veiculo.km_atual, veiculo.hora_atual)
  );
  
  const revisoesCriticas = revisoesComStatus.filter(r => r.status === 'critical').length;
  const revisoesAtencao = revisoesComStatus.filter(r => r.status === 'warning').length;
  const revisoesOk = revisoesComStatus.filter(r => r.status === 'ok').length;
  
  // Vehicle status is the worst status among all revisions
  let statusGeral: RevisionStatus = 'ok';
  if (revisoesCriticas > 0) {
    statusGeral = 'critical';
  } else if (revisoesAtencao > 0) {
    statusGeral = 'warning';
  }
  
  return {
    ...veiculo,
    revisoes: revisoesComStatus,
    statusGeral,
    revisoesCriticas,
    revisoesAtencao,
    revisoesOk,
  };
}

export function getStatusLabel(status: RevisionStatus): string {
  switch (status) {
    case 'critical':
      return 'Vencida';
    case 'warning':
      return 'Atenção';
    case 'ok':
      return 'Em dia';
  }
}

export function getStatusColor(status: RevisionStatus): string {
  switch (status) {
    case 'critical':
      return 'status-critical';
    case 'warning':
      return 'status-warning';
    case 'ok':
      return 'status-ok';
  }
}

export function formatarKmOuHora(valor: number, unidade: 'Km' | 'Hr'): string {
  if (unidade === 'Km') {
    return `${valor.toLocaleString('pt-BR')} km`;
  }
  return `${valor.toLocaleString('pt-BR')} h`;
}

export function ordenarPorUrgencia(
  veiculos: VeiculoComRevisoes[]
): VeiculoComRevisoes[] {
  return [...veiculos].sort((a, b) => {
    // First by status (critical > warning > ok)
    const statusOrder = { critical: 0, warning: 1, ok: 2 };
    const statusDiff = statusOrder[a.statusGeral] - statusOrder[b.statusGeral];
    if (statusDiff !== 0) return statusDiff;
    
    // Then by number of critical revisions
    const criticalDiff = b.revisoesCriticas - a.revisoesCriticas;
    if (criticalDiff !== 0) return criticalDiff;
    
    // Then by number of warning revisions
    return b.revisoesAtencao - a.revisoesAtencao;
  });
}
