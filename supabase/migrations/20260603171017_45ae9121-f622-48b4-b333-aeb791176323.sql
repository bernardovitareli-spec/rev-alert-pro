
-- Índices para acelerar filtros frequentes
CREATE INDEX IF NOT EXISTS idx_revisoes_status_execucao ON public.revisoes(status_execucao);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status ON public.ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_veiculo_id ON public.ordens_servico(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_crlv_validade ON public.veiculos(crlv_validade);
CREATE INDEX IF NOT EXISTS idx_veiculos_tacografo_validade ON public.veiculos(tacografo_validade);
CREATE INDEX IF NOT EXISTS idx_veiculos_art_validade ON public.veiculos(art_validade);
CREATE INDEX IF NOT EXISTS idx_historico_veiculo_data ON public.historico_revisoes(veiculo_id, data_realizacao);

-- RPC de agregação para KPIs da frota
CREATE OR REPLACE FUNCTION public.get_fleet_kpis(p_empresa_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hoje date := current_date;
  v_inicio_mes_atual date := date_trunc('month', v_hoje)::date;
  v_fim_mes_atual date := (date_trunc('month', v_hoje) + interval '1 month - 1 day')::date;
  v_inicio_mes_anterior date := (date_trunc('month', v_hoje) - interval '1 month')::date;
  v_fim_mes_anterior date := (date_trunc('month', v_hoje) - interval '1 day')::date;
  v_dias_atencao int := 30;

  v_total_gasto numeric := 0;
  v_gasto_mes_atual numeric := 0;
  v_gasto_mes_anterior numeric := 0;
  v_tempo_medio numeric := 0;
  v_total_revisoes int := 0;
  v_media_por_revisao numeric := 0;
  v_tendencia text := 'stable';

  v_total_docs int := 0;
  v_docs_vencidos int := 0;
  v_docs_atencao int := 0;
  v_perc_doc_venc numeric := 0;
  v_perc_doc_aten numeric := 0;
BEGIN
  -- Agregações sobre histórico de revisões (com filtro opcional por empresa)
  SELECT
    COALESCE(SUM(h.valor), 0),
    COUNT(*),
    COALESCE(SUM(h.valor) FILTER (WHERE h.data_realizacao BETWEEN v_inicio_mes_atual AND v_fim_mes_atual), 0),
    COALESCE(SUM(h.valor) FILTER (WHERE h.data_realizacao BETWEEN v_inicio_mes_anterior AND v_fim_mes_anterior), 0),
    COALESCE(AVG(h.tempo_servico_dias) FILTER (WHERE h.tempo_servico_dias IS NOT NULL), 0)
  INTO
    v_total_gasto, v_total_revisoes, v_gasto_mes_atual, v_gasto_mes_anterior, v_tempo_medio
  FROM public.historico_revisoes h
  LEFT JOIN public.veiculos v ON v.id = h.veiculo_id
  WHERE p_empresa_id IS NULL OR v.empresa_id = p_empresa_id;

  IF v_total_revisoes > 0 THEN
    v_media_por_revisao := v_total_gasto / v_total_revisoes;
  END IF;

  IF v_gasto_mes_anterior > 0 THEN
    IF ((v_gasto_mes_atual - v_gasto_mes_anterior) / v_gasto_mes_anterior) * 100 > 5 THEN
      v_tendencia := 'up';
    ELSIF ((v_gasto_mes_atual - v_gasto_mes_anterior) / v_gasto_mes_anterior) * 100 < -5 THEN
      v_tendencia := 'down';
    END IF;
  END IF;

  -- Agregação de documentos (CRLV + tacógrafo)
  WITH docs AS (
    SELECT crlv_validade AS validade FROM public.veiculos
      WHERE crlv_validade IS NOT NULL AND (p_empresa_id IS NULL OR empresa_id = p_empresa_id)
    UNION ALL
    SELECT tacografo_validade FROM public.veiculos
      WHERE tacografo_validade IS NOT NULL AND (p_empresa_id IS NULL OR empresa_id = p_empresa_id)
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE validade < v_hoje),
    COUNT(*) FILTER (WHERE validade >= v_hoje AND validade <= v_hoje + v_dias_atencao)
  INTO v_total_docs, v_docs_vencidos, v_docs_atencao
  FROM docs;

  IF v_total_docs > 0 THEN
    v_perc_doc_venc := (v_docs_vencidos::numeric / v_total_docs) * 100;
    v_perc_doc_aten := (v_docs_atencao::numeric / v_total_docs) * 100;
  END IF;

  RETURN jsonb_build_object(
    'totalGasto', v_total_gasto,
    'gastoMesAtual', v_gasto_mes_atual,
    'gastoMesAnterior', v_gasto_mes_anterior,
    'tendenciaGasto', v_tendencia,
    'tempoMedioEntrega', ROUND(v_tempo_medio::numeric, 1),
    'percentualVeiculosCriticos', 0,
    'percentualDocumentosVencidos', v_perc_doc_venc,
    'percentualDocumentosAtencao', v_perc_doc_aten,
    'totalRevisoesRealizadas', v_total_revisoes,
    'mediaGastoPorRevisao', v_media_por_revisao
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_fleet_kpis(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fleet_kpis(uuid) TO service_role;
