import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth } from 'date-fns';
import { calcularStatusDocumento } from '@/lib/documentCalculations';
import { calcularStatusRevisao } from '@/lib/revisionCalculations';
import type { Revisao } from '@/types/fleet';

export interface CompanyStats {
  id: string;
  nome: string;
  totalVeiculos: number;
  veiculosCriticos: number;
  veiculosAtencao: number;
  veiculosOk: number;
  gastoMesAtual: number;
  documentosVencidos: number;
  documentosTotal: number;
  percentualConformidade: number;
  emServico: number;
}

export function useCompanyStats() {
  return useQuery({
    queryKey: ['company_stats'],
    queryFn: async (): Promise<CompanyStats[]> => {
      const hoje = new Date();
      const inicioMes = startOfMonth(hoje);
      const fimMes = endOfMonth(hoje);

      const [
        { data: empresas },
        { data: veiculos },
        { data: revisoes },
        { data: historico }
      ] = await Promise.all([
        supabase.from('empresas').select('id, nome').order('nome'),
        supabase.from('veiculos').select('id, placa_serie, empresa_id, km_atual, hora_atual, crlv_validade, tacografo_validade'),
        supabase.from('revisoes').select('*'),
        supabase.from('historico_revisoes')
          .select('id, veiculo_id, valor')
          .gte('data_realizacao', inicioMes.toISOString().split('T')[0])
          .lte('data_realizacao', fimMes.toISOString().split('T')[0])
      ]);

      const empresasList = empresas || [];
      const veiculosList = veiculos || [];
      const revisoesList = (revisoes || []) as Revisao[];
      const historicoList = historico || [];

      // Criar mapa de gastos por veículo
      const gastosPorVeiculo = historicoList.reduce((acc, h) => {
        if (!acc[h.veiculo_id]) acc[h.veiculo_id] = 0;
        acc[h.veiculo_id] += h.valor || 0;
        return acc;
      }, {} as Record<string, number>);

      // Calcular stats por empresa
      const stats: CompanyStats[] = empresasList.map(empresa => {
        const veiculosEmpresa = veiculosList.filter(v => v.empresa_id === empresa.id);
        const veiculoIds = new Set(veiculosEmpresa.map(v => v.id));

        let criticos = 0;
        let atencao = 0;
        let ok = 0;
        let docsVencidos = 0;
        let emServico = 0;

        veiculosEmpresa.forEach(veiculo => {
          // Documentos
          const crlv = calcularStatusDocumento(veiculo.crlv_validade);
          const taco = calcularStatusDocumento(veiculo.tacografo_validade);
          if (crlv.status === 'vencido') docsVencidos++;
          if (taco.status === 'vencido') docsVencidos++;

          // Status das revisões do veículo
          const revisoesVeiculo = revisoesList.filter(r => r.veiculo_id === veiculo.id);
          let veiculoCritico = false;
          let veiculoAtencao = false;

          revisoesVeiculo.forEach(rev => {
            if (rev.status_execucao === 'em_servico') emServico++;

            const status = calcularStatusRevisao(rev, veiculo.km_atual || 0, veiculo.hora_atual || 0);
            if (status.status === 'critical') veiculoCritico = true;
            else if (status.status === 'warning') veiculoAtencao = true;
          });

          if (veiculoCritico) criticos++;
          else if (veiculoAtencao) atencao++;
          else ok++;
        });

        // Gastos da empresa
        const gastoMesAtual = veiculosEmpresa.reduce((sum, v) => sum + (gastosPorVeiculo[v.id] || 0), 0);
        const documentosTotal = veiculosEmpresa.length * 2;

        return {
          id: empresa.id,
          nome: empresa.nome,
          totalVeiculos: veiculosEmpresa.length,
          veiculosCriticos: criticos,
          veiculosAtencao: atencao,
          veiculosOk: ok,
          gastoMesAtual,
          documentosVencidos: docsVencidos,
          documentosTotal,
          percentualConformidade: documentosTotal > 0 ? ((documentosTotal - docsVencidos) / documentosTotal) * 100 : 100,
          emServico
        };
      });

      // Ordenar por veículos críticos (desc) e depois por gastos (desc)
      return stats.sort((a, b) => {
        if (b.veiculosCriticos !== a.veiculosCriticos) return b.veiculosCriticos - a.veiculosCriticos;
        return b.gastoMesAtual - a.gastoMesAtual;
      });
    },
    staleTime: 1000 * 60 * 5,
  });
}
