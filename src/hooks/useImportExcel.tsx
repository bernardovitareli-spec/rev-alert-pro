import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ImportedRow, RevisionUnit } from '@/types/fleet';

type XLSXModule = typeof import('xlsx');

interface ImportResult {
  success: number;
  errors: string[];
  total: number;
}

interface ImportPayload {
  rows: ImportedRow[];
  filename?: string;
}

const UPSERT_CHUNK = 500;

const COLUMN_MAP: Record<string, keyof ImportedRow> = {
  'Placa ou Serie': 'placa_serie',
  'Tag da Obra': 'tag_obra',
  'Última Atualização': 'ultima_atualizacao',
  'KM Atual': 'km_atual',
  'Hora Atual': 'hora_atual',
  'Retorno ao Pátio': 'retorno_patio',
  'Tipo de Revisão': 'tipo_revisao',
  'Data da Revisão': 'data_revisao',
  'KM da Revisão': 'km_revisao',
  'Hora da Revisão': 'hora_revisao',
  'Intervalo': 'intervalo',
  'Revisão Por': 'unidade',
  'Contrato': 'contrato',
  'Empresa': 'empresa',
};

function parseNumber(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number') return Math.round(value);
  const str = String(value).replace(/[,.]/g, '').replace(/[^\d-]/g, '');
  return parseInt(str, 10) || 0;
}

function parseExcelDate(value: unknown, XLSX: XLSXModule): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const americanMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (americanMatch) {
      const [, month, day, yearPart] = americanMatch;
      const year = yearPart.length === 2 ? (parseInt(yearPart) > 50 ? `19${yearPart}` : `20${yearPart}`) : yearPart;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      const [, day, month, year] = brMatch;
      return `${year}-${month}-${day}`;
    }
    return value;
  }
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  return undefined;
}

function normalizeUnit(value: string): RevisionUnit {
  const normalized = value?.toLowerCase().trim();
  if (normalized === 'hr' || normalized === 'hora' || normalized === 'horas' || normalized === 'h') {
    return 'Hr';
  }
  return 'Km';
}

function standardizePlaca(placa: string): string {
  return placa.toUpperCase().trim().replace(/\s+/g, ' ');
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function useImportExcel() {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'idle' | 'empresas' | 'tipos' | 'veiculos' | 'revisoes' | 'finalizando'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const processFile = async (file: File): Promise<ImportedRow[]> => {
    const XLSX = await import('xlsx');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true });

          const mappedData: ImportedRow[] = (jsonData as Record<string, unknown>[]).map((row) => {
            const mappedRow: Partial<ImportedRow> = {};
            Object.entries(row).forEach(([key, value]) => {
              const mappedKey = COLUMN_MAP[key];
              if (!mappedKey) return;
              if (mappedKey === 'ultima_atualizacao' || mappedKey === 'retorno_patio' || mappedKey === 'data_revisao') {
                (mappedRow as Record<string, unknown>)[mappedKey] = parseExcelDate(value, XLSX);
              } else if (mappedKey === 'km_atual' || mappedKey === 'hora_atual' || mappedKey === 'km_revisao' || mappedKey === 'hora_revisao' || mappedKey === 'intervalo') {
                (mappedRow as Record<string, unknown>)[mappedKey] = parseNumber(value);
              } else if (mappedKey === 'unidade') {
                (mappedRow as Record<string, unknown>)[mappedKey] = normalizeUnit(String(value));
              } else if (mappedKey === 'placa_serie') {
                (mappedRow as Record<string, unknown>)[mappedKey] = standardizePlaca(String(value ?? ''));
              } else if (mappedKey === 'empresa') {
                const empresaValue = String(value ?? '').trim();
                (mappedRow as Record<string, unknown>)[mappedKey] = empresaValue === '-' ? undefined : empresaValue;
              } else {
                (mappedRow as Record<string, unknown>)[mappedKey] = String(value ?? '').trim();
              }
            });
            return mappedRow as ImportedRow;
          });

          resolve(mappedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  const importMutation = useMutation({
    mutationFn: async (payload: ImportPayload | ImportedRow[]): Promise<ImportResult> => {
      // Backward compat: accept either array or { rows, filename }
      const rows = Array.isArray(payload) ? payload : payload.rows;
      const filename = Array.isArray(payload) ? undefined : payload.filename;

      setIsProcessing(true);
      setProgress(0);
      setStage('empresas');

      const errors: string[] = [];
      const total = rows.length;

      // ============ Empresa padrão ============
      const { data: mcEmpresa, error: mcError } = await supabase
        .from('empresas')
        .select('id')
        .eq('nome', 'MC Terraplenagem')
        .maybeSingle();
      if (mcError) throw mcError;
      const defaultEmpresaId = mcEmpresa?.id ?? null;

      // ============ STAGE 1: Empresas ============
      const empresaNames = Array.from(
        new Set(
          rows
            .map((r) => (r.empresa ?? '').trim())
            .filter((n) => n && n !== '-'),
        ),
      );

      const empresaIdByName = new Map<string, string>();

      if (empresaNames.length > 0) {
        const empresaPayload = empresaNames.map((nome) => ({ nome }));
        for (const part of chunk(empresaPayload, UPSERT_CHUNK)) {
          const { error } = await supabase
            .from('empresas')
            .upsert(part, { onConflict: 'nome', ignoreDuplicates: false });
          if (error) throw error;
        }
        const { data: empresaRows, error: selErr } = await supabase
          .from('empresas')
          .select('id, nome')
          .in('nome', empresaNames);
        if (selErr) throw selErr;
        empresaRows?.forEach((e) => empresaIdByName.set(e.nome, e.id));
      }
      setProgress(25);

      // ============ STAGE 2: Tipos de revisão ============
      setStage('tipos');
      const tiposMap = new Map<string, { nome: string; intervalo_padrao: number | null; unidade_padrao: RevisionUnit | null }>();
      rows.forEach((r) => {
        if (!r.tipo_revisao) return;

        const nome = r.tipo_revisao.trim();
        if (!nome || tiposMap.has(nome)) return;
        tiposMap.set(nome, {
          nome,
          intervalo_padrao: r.intervalo || null,
          unidade_padrao: r.unidade || null,
        });
      });

      const tipoIdByName = new Map<string, string>();
      if (tiposMap.size > 0) {
        const tiposPayload = Array.from(tiposMap.values());
        for (const part of chunk(tiposPayload, UPSERT_CHUNK)) {
          const { error } = await supabase
            .from('tipos_revisao')
            .upsert(part, { onConflict: 'nome', ignoreDuplicates: false });
          if (error) throw error;
        }
        const { data: tipoRows, error: selErr } = await supabase
          .from('tipos_revisao')
          .select('id, nome')
          .in('nome', Array.from(tiposMap.keys()));
        if (selErr) throw selErr;
        tipoRows?.forEach((t) => tipoIdByName.set(t.nome, t.id));
      }
      setProgress(50);

      // ============ STAGE 3: Veículos ============
      setStage('veiculos');
      const vehicleGroups = new Map<string, ImportedRow[]>();
      rows.forEach((row) => {
        if (!row.placa_serie) return;
        const placa = standardizePlaca(row.placa_serie);
        const list = vehicleGroups.get(placa) ?? [];
        list.push({ ...row, placa_serie: placa });
        vehicleGroups.set(placa, list);
      });

      type VeiculoUpsert = {
        placa_serie: string;
        tag_obra: string | null;
        km_atual: number;
        hora_atual: number;
        ultima_atualizacao: string | null;
        retorno_patio: string | null;
        empresa_id: string;
        contrato: string | null;
      };
      const veiculoPayload: VeiculoUpsert[] = [];


      for (const [placa, vehicleRows] of vehicleGroups) {
        const firstRow = vehicleRows[0];
        let empresaId: string | null = defaultEmpresaId;
        if (firstRow.empresa && firstRow.empresa !== '-') {
          empresaId = empresaIdByName.get(firstRow.empresa.trim()) ?? defaultEmpresaId;
        }
        if (!empresaId) {
          placasSemEmpresa.push(placa);
          continue;
        }
        veiculoPayload.push({
          placa_serie: placa,
          tag_obra: firstRow.tag_obra || null,
          km_atual: firstRow.km_atual || 0,
          hora_atual: firstRow.hora_atual || 0,
          ultima_atualizacao: firstRow.ultima_atualizacao || null,
          retorno_patio: firstRow.retorno_patio || null,
          empresa_id: empresaId,
          contrato: firstRow.contrato || null,
        });
      }

      if (placasSemEmpresa.length > 0) {
        errors.push(
          `Empresa não definida e MC Terraplenagem ausente do banco para ${placasSemEmpresa.length} veículo(s): ${placasSemEmpresa.slice(0, 5).join(', ')}${placasSemEmpresa.length > 5 ? '…' : ''}`,
        );
      }

      const veiculoIdByPlaca = new Map<string, string>();
      if (veiculoPayload.length > 0) {
        const chunks = chunk(veiculoPayload, UPSERT_CHUNK);
        for (let i = 0; i < chunks.length; i++) {
          const { error } = await supabase
            .from('veiculos')
            .upsert(chunks[i], { onConflict: 'placa_serie', ignoreDuplicates: false });
          if (error) throw error;
          setProgress(50 + Math.round(((i + 1) / chunks.length) * 25));
        }
        // Buscar ids dos veículos processados
        const placas = veiculoPayload.map((v) => v.placa_serie as string);
        for (const part of chunk(placas, 1000)) {
          const { data: vRows, error: selErr } = await supabase
            .from('veiculos')
            .select('id, placa_serie')
            .in('placa_serie', part);
          if (selErr) throw selErr;
          vRows?.forEach((v) => veiculoIdByPlaca.set(v.placa_serie, v.id));
        }
      }
      setProgress(75);

      // ============ STAGE 4: Revisões ============
      setStage('revisoes');
      const revisaoMap = new Map<string, Record<string, unknown>>();
      let revisaoLinhasIgnoradas = 0;

      for (const row of rows) {
        if (!row.placa_serie || !row.tipo_revisao) continue;
        const placa = standardizePlaca(row.placa_serie);
        const veiculoId = veiculoIdByPlaca.get(placa);
        const tipoId = tipoIdByName.get(row.tipo_revisao.trim());
        if (!veiculoId || !tipoId) {
          revisaoLinhasIgnoradas++;
          continue;
        }
        // Dedup por (veiculo_id, tipo_revisao_id) — última linha vence
        revisaoMap.set(`${veiculoId}::${tipoId}`, {
          veiculo_id: veiculoId,
          tipo_revisao_id: tipoId,
          data_revisao: row.data_revisao || null,
          km_revisao: row.km_revisao || null,
          hora_revisao: row.hora_revisao || null,
          intervalo: row.intervalo || 0,
          unidade: row.unidade || 'Km',
        });
      }

      const revisoesPayload = Array.from(revisaoMap.values());
      if (revisoesPayload.length > 0) {
        const chunks = chunk(revisoesPayload, UPSERT_CHUNK);
        for (let i = 0; i < chunks.length; i++) {
          const { error } = await supabase
            .from('revisoes')
            .upsert(chunks[i], { onConflict: 'veiculo_id,tipo_revisao_id', ignoreDuplicates: false });
          if (error) throw error;
          setProgress(75 + Math.round(((i + 1) / chunks.length) * 25));
        }
      }

      if (revisaoLinhasIgnoradas > 0) {
        errors.push(`${revisaoLinhasIgnoradas} linha(s) de revisão ignorada(s) por veículo/tipo ausente.`);
      }

      // ============ Log ============
      setStage('finalizando');
      const success = veiculoIdByPlaca.size;
      try {
        const { data: userData } = await supabase.auth.getUser();
        await supabase.from('import_logs').insert({
          user_id: userData.user?.id ?? null,
          filename: filename ?? 'planilha.xlsx',
          records_imported: success,
          errors,
        });
      } catch (logErr) {
        // Log failure should not break the import
        console.warn('Falha ao gravar import_logs:', logErr);
      }

      setProgress(100);
      setIsProcessing(false);
      setStage('idle');
      return { success, errors, total };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      queryClient.invalidateQueries({ queryKey: ['revisoes'] });
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      queryClient.invalidateQueries({ queryKey: ['tipos_revisao'] });
    },
    onError: () => {
      setIsProcessing(false);
      setStage('idle');
    },
  });

  return {
    processFile,
    importData: importMutation.mutateAsync,
    isProcessing,
    progress,
    stage,
    isImporting: importMutation.isPending,
    error: importMutation.error,
  };
}
