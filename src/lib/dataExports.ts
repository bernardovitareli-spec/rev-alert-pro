import { supabase } from '@/integrations/supabase/client';
import type { OrdensServicoFilters } from '@/hooks/useOrdensServico';

export const MAX_EXPORT_ROWS = 5000;

function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('pt-BR');
}

function diffDays(later: string | Date | null, earlier: string | null): string {
  if (!earlier) return '';
  const end = later ? new Date(later) : new Date();
  const start = new Date(earlier);
  const ms = end.getTime() - start.getTime();
  if (isNaN(ms)) return '';
  return String(Math.floor(ms / 86400000));
}

export function todayStamp(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

export function downloadCsv(filename: string, headers: string[], rows: any[][]) {
  const lines = [headers.map(csvEscape).join(';')];
  for (const r of rows) lines.push(r.map(csvEscape).join(';'));
  const csv = '\ufeff' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadXlsx(filename: string, sheetName: string, headers: string[], rows: any[][]) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

// ============= ORDENS =============

export const ORDENS_HEADERS = [
  'Placa', 'Tag da Obra', 'Empresa', 'Tipo de Manutenção',
  'Subcategoria Corretiva', 'Tipo de Revisão Preventiva', 'Detalhamento',
  'Data de Entrada', 'KM de Entrada', 'Horímetro de Entrada',
  'Tem Avarias', 'Descrição das Avarias',
  'Previsão de Saída', 'Data de Saída', 'KM de Saída', 'Horímetro de Saída',
  'Avarias Resolvidas', 'Observações de Saída', 'Status',
  'Dias em Oficina', 'Dias de Atraso na Previsão', 'Qtd. Fotos de Avaria',
];

export async function fetchOrdensRows(filters: OrdensServicoFilters = {}): Promise<{ rows: any[][]; truncated: boolean }> {
  let q = supabase
    .from('ordens_servico')
    .select(`*,
      veiculo:veiculos(placa_serie, tag_obra, empresa:empresas(nome)),
      tipo_revisao:tipos_revisao(nome),
      avarias_fotos(count)
    `)
    .order('data_entrada', { ascending: false })
    .limit(MAX_EXPORT_ROWS + 1);

  if (filters.veiculoId && filters.veiculoId !== 'all') q = q.eq('veiculo_id', filters.veiculoId);
  if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
  if (filters.tipo && filters.tipo !== 'all') q = q.eq('tipo_manutencao', filters.tipo);
  if (filters.dataInicio) q = q.gte('data_entrada', filters.dataInicio);
  if (filters.dataFim) q = q.lte('data_entrada', filters.dataFim);

  const { data, error } = await q;
  if (error) throw error;

  const truncated = (data?.length ?? 0) > MAX_EXPORT_ROWS;
  const items = (data ?? []).slice(0, MAX_EXPORT_ROWS);

  const rows = items.map((r: any) => {
    const fotos = Array.isArray(r.avarias_fotos) && r.avarias_fotos.length > 0
      ? (r.avarias_fotos[0]?.count ?? 0) : 0;
    const diasOf = diffDays(r.data_saida ?? null, r.data_entrada);
    const diasAtr = r.data_saida && r.previsao_saida ? diffDays(r.data_saida, r.previsao_saida) : '';
    return [
      r.veiculo?.placa_serie ?? '',
      r.veiculo?.tag_obra ?? '',
      r.veiculo?.empresa?.nome ?? '',
      (r.tipo_manutencao ?? '').toString().toLowerCase(),
      r.subcategoria_corretiva ?? '',
      r.tipo_revisao?.nome ?? '',
      r.detalhamento ?? '',
      fmtDate(r.data_entrada),
      r.km_entrada ?? '',
      r.horimetro_entrada ?? '',
      r.tem_avarias ? 'Sim' : 'Não',
      r.descricao_avarias ?? '',
      fmtDate(r.previsao_saida),
      fmtDate(r.data_saida),
      r.km_saida ?? '',
      r.horimetro_saida ?? '',
      r.avarias_resolvidas == null ? '' : (r.avarias_resolvidas ? 'Sim' : 'Não'),
      r.observacoes_saida ?? '',
      (r.status ?? '').toString().toLowerCase(),
      diasOf,
      diasAtr,
      fotos,
    ];
  });

  return { rows, truncated };
}

// ============= VEÍCULOS =============

export const VEICULOS_HEADERS = [
  'Placa', 'Tag da Obra', 'Empresa', 'KM Atual', 'Horímetro Atual',
  'Última Atualização', 'Retorno ao Pátio',
];

export async function fetchVeiculosRows(): Promise<{ rows: any[][]; truncated: boolean }> {
  const { data, error } = await supabase
    .from('veiculos')
    .select('placa_serie, tag_obra, km_atual, hora_atual, ultima_atualizacao, retorno_patio, empresa:empresas(nome)')
    .order('placa_serie')
    .limit(MAX_EXPORT_ROWS + 1);
  if (error) throw error;
  const truncated = (data?.length ?? 0) > MAX_EXPORT_ROWS;
  const rows = (data ?? []).slice(0, MAX_EXPORT_ROWS).map((v: any) => [
    v.placa_serie ?? '', v.tag_obra ?? '', v.empresa?.nome ?? '',
    v.km_atual ?? '', v.hora_atual ?? '',
    fmtDate(v.ultima_atualizacao), fmtDate(v.retorno_patio),
  ]);
  return { rows, truncated };
}

// ============= REVISÕES PROGRAMADAS =============

export const REVISOES_HEADERS = [
  'Placa', 'Tipo de Revisão', 'Unidade', 'Intervalo',
  'KM Revisão', 'Hora Revisão', 'Data Revisão',
  'Status Execução', 'Previsão Entrega', 'Oficina', 'Valor', 'OS', 'Observações',
];

export async function fetchRevisoesRows(): Promise<{ rows: any[][]; truncated: boolean }> {
  const { data, error } = await supabase
    .from('revisoes')
    .select(`unidade, intervalo, km_revisao, hora_revisao, data_revisao,
      status_execucao, previsao_entrega, valor, ordem_servico, observacoes,
      veiculo:veiculos(placa_serie),
      tipo_revisao:tipos_revisao(nome),
      oficina:oficinas(nome)`)
    .order('data_revisao', { ascending: false, nullsFirst: false })
    .limit(MAX_EXPORT_ROWS + 1);
  if (error) throw error;
  const truncated = (data?.length ?? 0) > MAX_EXPORT_ROWS;
  const rows = (data ?? []).slice(0, MAX_EXPORT_ROWS).map((r: any) => [
    r.veiculo?.placa_serie ?? '', r.tipo_revisao?.nome ?? '',
    r.unidade ?? '', r.intervalo ?? '',
    r.km_revisao ?? '', r.hora_revisao ?? '', fmtDate(r.data_revisao),
    r.status_execucao ?? '', fmtDate(r.previsao_entrega),
    r.oficina?.nome ?? '', r.valor ?? '', r.ordem_servico ?? '', r.observacoes ?? '',
  ]);
  return { rows, truncated };
}

// ============= HISTÓRICO =============

export const HISTORICO_HEADERS = [
  'Placa', 'Tipo de Revisão', 'Oficina', 'Data Realização',
  'KM Realização', 'Hora Realização', 'Valor', 'Tempo Serviço (dias)',
  'OS', 'Observações',
];

export async function fetchHistoricoRows(): Promise<{ rows: any[][]; truncated: boolean }> {
  const { data, error } = await supabase
    .from('historico_revisoes')
    .select(`data_realizacao, km_realizacao, hora_realizacao, valor, tempo_servico_dias,
      ordem_servico, observacoes,
      veiculo:veiculos(placa_serie),
      tipo_revisao:tipos_revisao(nome),
      oficina:oficinas(nome)`)
    .order('data_realizacao', { ascending: false })
    .limit(MAX_EXPORT_ROWS + 1);
  if (error) throw error;
  const truncated = (data?.length ?? 0) > MAX_EXPORT_ROWS;
  const rows = (data ?? []).slice(0, MAX_EXPORT_ROWS).map((h: any) => [
    h.veiculo?.placa_serie ?? '', h.tipo_revisao?.nome ?? '', h.oficina?.nome ?? '',
    fmtDate(h.data_realizacao), h.km_realizacao ?? '', h.hora_realizacao ?? '',
    h.valor ?? '', h.tempo_servico_dias ?? '', h.ordem_servico ?? '', h.observacoes ?? '',
  ]);
  return { rows, truncated };
}
