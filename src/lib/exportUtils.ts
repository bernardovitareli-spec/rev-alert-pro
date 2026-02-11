import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  format?: (value: any) => string;
}

export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
) {
  // Prepare header row
  const headers = columns.map(col => col.header);
  
  // Prepare data rows
  const rows = data.map(item => 
    columns.map(col => {
      const value = item[col.key];
      if (col.format) {
        return col.format(value);
      }
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'number') {
        return value;
      }
      return String(value);
    })
  );

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  const colWidths = columns.map(col => ({ wch: col.width || 15 }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  
  // Generate and download file
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
}

export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Common export configurations
export const exportConfigs = {
  historicoRevisoes: [
    { header: 'Data', key: 'data_realizacao', width: 12, format: formatDate },
    { header: 'Veículo', key: 'veiculoPlaca', width: 15 },
    { header: 'Tipo Revisão', key: 'tipoRevisaoNome', width: 20 },
    { header: 'Oficina', key: 'oficinaNome', width: 20 },
    { header: 'Valor', key: 'valor', width: 12, format: formatCurrency },
    { header: 'OS', key: 'ordem_servico', width: 15 },
    { header: 'Km/Hr', key: 'kmHoraRealizacao', width: 12 },
    { header: 'Tempo (dias)', key: 'tempo_servico_dias', width: 12 },
    { header: 'Observações', key: 'observacoes', width: 30 },
  ],
  gastosPorVeiculo: [
    { header: 'Veículo', key: 'veiculoPlaca', width: 15 },
    { header: 'Empresa', key: 'empresaNome', width: 20 },
    { header: 'Total Gasto', key: 'totalGasto', width: 15, format: formatCurrency },
    { header: 'Qtd. Revisões', key: 'qtdRevisoes', width: 12 },
  ],
  gastosPorOficina: [
    { header: 'Oficina', key: 'oficinaNome', width: 25 },
    { header: 'Total Gasto', key: 'totalGasto', width: 15, format: formatCurrency },
    { header: 'Qtd. Serviços', key: 'qtdServicos', width: 12 },
    { header: 'Tempo Médio (dias)', key: 'tempoMedioDias', width: 15 },
  ],
  gastosPorTipo: [
    { header: 'Tipo de Revisão', key: 'tipoNome', width: 25 },
    { header: 'Total Gasto', key: 'totalGasto', width: 15, format: formatCurrency },
    { header: 'Qtd. Revisões', key: 'qtdRevisoes', width: 12 },
  ],
  documentosVencidos: [
    { header: 'Veículo', key: 'veiculoPlaca', width: 15 },
    { header: 'Empresa', key: 'empresaNome', width: 20 },
    { header: 'Documento', key: 'tipoDocumento', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Validade', key: 'validade', width: 12, format: formatDate },
    { header: 'Dias', key: 'diasRestantes', width: 10 },
  ],
};
