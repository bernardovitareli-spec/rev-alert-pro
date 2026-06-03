import { differenceInDays, parseISO } from 'date-fns';
import { DocumentStatus, DocumentoStatusInfo } from '@/types/fleet';

const DIAS_ATENCAO = 30; // Alertar quando faltar 30 dias para vencer

export function calcularStatusDocumento(validadeStr: string | null): DocumentoStatusInfo {
  if (!validadeStr) {
    return {
      status: 'indefinido',
      diasRestantes: null,
      label: 'Sem data',
      validade: null,
    };
  }

  const validade = parseISO(validadeStr);
  const hoje = new Date();
  const diasRestantes = differenceInDays(validade, hoje);

  if (diasRestantes < 0) {
    return {
      status: 'vencido',
      diasRestantes,
      label: `Vencido há ${Math.abs(diasRestantes)} dias`,
      validade: validadeStr,
    };
  }

  if (diasRestantes <= DIAS_ATENCAO) {
    return {
      status: 'atencao',
      diasRestantes,
      label: diasRestantes === 0 ? 'Vence hoje' : `Vence em ${diasRestantes} dias`,
      validade: validadeStr,
    };
  }

  return {
    status: 'ok',
    diasRestantes,
    label: `Vence em ${diasRestantes} dias`,
    validade: validadeStr,
  };
}

export function getDocumentStatusColor(status: DocumentStatus): string {
  switch (status) {
    case 'vencido':
      return 'text-status-critical';
    case 'atencao':
      return 'text-status-warning';
    case 'ok':
      return 'text-status-ok';
    case 'indefinido':
      return 'text-muted-foreground';
  }
}

export function getDocumentStatusBadgeClass(status: DocumentStatus): string {
  switch (status) {
    case 'vencido':
      return 'bg-status-critical text-white';
    case 'atencao':
      return 'bg-status-warning text-black';
    case 'ok':
      return 'bg-status-ok text-white';
    case 'indefinido':
      return 'bg-muted text-muted-foreground';
  }
}

export function getDocumentStatusIcon(status: DocumentStatus): 'critical' | 'warning' | 'ok' | 'indefinido' {
  return status === 'vencido' ? 'critical' : status === 'atencao' ? 'warning' : status === 'ok' ? 'ok' : 'indefinido';
}
