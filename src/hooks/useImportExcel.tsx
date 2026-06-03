import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ImportedRow, RevisionUnit } from '@/types/fleet';
import * as XLSX from 'xlsx';

interface ImportResult {
  success: number;
  errors: string[];
  total: number;
}

// Column mapping from spreadsheet to our system
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

// Parse numbers with comma as thousands separator (e.g., "5,930" -> 5930)
function parseNumber(value: any): number {
  if (!value) return 0;
  if (typeof value === 'number') return Math.round(value);
  const str = String(value).replace(/[,.]/g, '').replace(/[^\d-]/g, '');
  return parseInt(str, 10) || 0;
}

function parseExcelDate(value: any): string | undefined {
  if (!value) return undefined;
  
  // If it's already a string in date format
  if (typeof value === 'string') {
    // Try American format M/D/YY or MM/DD/YY
    const americanMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (americanMatch) {
      const [, month, day, yearPart] = americanMatch;
      const year = yearPart.length === 2 ? (parseInt(yearPart) > 50 ? `19${yearPart}` : `20${yearPart}`) : yearPart;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try DD/MM/YYYY format (Brazilian)
    const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      const [, day, month, year] = brMatch;
      return `${year}-${month}-${day}`;
    }
    
    return value;
  }
  
  // If it's an Excel date number
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

// Standardize placa_serie: uppercase, trim, remove extra spaces
function standardizePlaca(placa: string): string {
  return placa.toUpperCase().trim().replace(/\s+/g, ' ');
}

export function useImportExcel() {
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const processFile = async (file: File): Promise<ImportedRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true });
          
          const mappedData: ImportedRow[] = jsonData.map((row: any) => {
            const mappedRow: Partial<ImportedRow> = {};
            
            Object.entries(row).forEach(([key, value]) => {
              const mappedKey = COLUMN_MAP[key];
              if (mappedKey) {
                if (mappedKey === 'ultima_atualizacao' || mappedKey === 'retorno_patio' || mappedKey === 'data_revisao') {
                  (mappedRow as any)[mappedKey] = parseExcelDate(value);
                } else if (mappedKey === 'km_atual' || mappedKey === 'hora_atual' || mappedKey === 'km_revisao' || mappedKey === 'hora_revisao' || mappedKey === 'intervalo') {
                  (mappedRow as any)[mappedKey] = parseNumber(value);
                } else if (mappedKey === 'unidade') {
                  (mappedRow as any)[mappedKey] = normalizeUnit(String(value));
                } else if (mappedKey === 'placa_serie') {
                  (mappedRow as any)[mappedKey] = standardizePlaca(String(value || ''));
                } else if (mappedKey === 'empresa') {
                  const empresaValue = String(value || '').trim();
                  // Ignore "-" as empresa
                  (mappedRow as any)[mappedKey] = empresaValue === '-' ? undefined : empresaValue;
                } else {
                  (mappedRow as any)[mappedKey] = String(value || '').trim();
                }
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
    mutationFn: async (rows: ImportedRow[]): Promise<ImportResult> => {
      setIsProcessing(true);
      setProgress(0);
      
      const errors: string[] = [];
      let success = 0;
      const total = rows.length;
      
      // Group rows by vehicle to avoid duplicates
      const vehicleGroups = new Map<string, ImportedRow[]>();
      rows.forEach(row => {
        if (!row.placa_serie) return;
        const placa = standardizePlaca(row.placa_serie);
        const existing = vehicleGroups.get(placa) || [];
        existing.push({ ...row, placa_serie: placa });
        vehicleGroups.set(placa, existing);
      });

      let processed = 0;
      
      for (const [placa, vehicleRows] of vehicleGroups) {
        try {
          const firstRow = vehicleRows[0];
          
          // 1. Upsert empresa if exists and not "-"
          let empresaId: string | null = null;
          if (firstRow.empresa && firstRow.empresa !== '-') {
            const { data: empresaData, error: empresaError } = await supabase
              .from('empresas')
              .upsert({ nome: firstRow.empresa }, { onConflict: 'nome' })
              .select('id')
              .single();
            
            if (empresaError) throw empresaError;
            empresaId = empresaData.id;
          }
          
          // 2. Upsert veiculo
          const { data: veiculoData, error: veiculoError } = await supabase
            .from('veiculos')
            .upsert({
              placa_serie: placa,
              tag_obra: firstRow.tag_obra || null,
              km_atual: firstRow.km_atual || 0,
              hora_atual: firstRow.hora_atual || 0,
              ultima_atualizacao: firstRow.ultima_atualizacao || null,
              retorno_patio: firstRow.retorno_patio || null,
              empresa_id: empresaId,
              contrato: firstRow.contrato || null,
            }, { onConflict: 'placa_serie' })
            .select('id')
            .single();
          
          if (veiculoError) throw veiculoError;
          const veiculoId = veiculoData.id;
          
          // 3. Process each revision for this vehicle
          for (const row of vehicleRows) {
            if (!row.tipo_revisao) continue;
            
            // Upsert tipo_revisao
            const { data: tipoData, error: tipoError } = await supabase
              .from('tipos_revisao')
              .upsert({
                nome: row.tipo_revisao,
                intervalo_padrao: row.intervalo || null,
                unidade_padrao: row.unidade || null,
              }, { onConflict: 'nome' })
              .select('id')
              .single();
            
            if (tipoError) throw tipoError;
            
            // Upsert revisao
            const { error: revisaoError } = await supabase
              .from('revisoes')
              .upsert({
                veiculo_id: veiculoId,
                tipo_revisao_id: tipoData.id,
                data_revisao: row.data_revisao || null,
                km_revisao: row.km_revisao || null,
                hora_revisao: row.hora_revisao || null,
                intervalo: row.intervalo || 0,
                unidade: row.unidade || 'Km',
              }, { 
                onConflict: 'veiculo_id,tipo_revisao_id',
              });
            
            if (revisaoError) throw revisaoError;
          }
          
          success++;
        } catch (error: any) {
          errors.push(`Veículo ${placa}: ${error.message}`);
        }
        
        processed++;
        setProgress(Math.round((processed / vehicleGroups.size) * 100));
      }
      
      setIsProcessing(false);
      return { success, errors, total };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      queryClient.invalidateQueries({ queryKey: ['revisoes'] });
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      queryClient.invalidateQueries({ queryKey: ['tipos_revisao'] });
    },
  });

  return {
    processFile,
    importData: importMutation.mutateAsync,
    isProcessing,
    progress,
    isImporting: importMutation.isPending,
    error: importMutation.error,
  };
}
