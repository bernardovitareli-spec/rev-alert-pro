
CREATE OR REPLACE FUNCTION public.sync_veiculo_from_ordem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  max_km numeric;
  max_hor numeric;
  latest_date date;
BEGIN
  v_id := COALESCE(NEW.veiculo_id, OLD.veiculo_id);
  IF v_id IS NULL THEN RETURN NEW; END IF;

  SELECT
    GREATEST(MAX(COALESCE(km_saida,0)), MAX(COALESCE(km_entrada,0))),
    GREATEST(MAX(COALESCE(horimetro_saida,0)), MAX(COALESCE(horimetro_entrada,0))),
    MAX(COALESCE(data_saida, data_entrada))
  INTO max_km, max_hor, latest_date
  FROM public.ordens_servico
  WHERE veiculo_id = v_id;

  UPDATE public.veiculos
  SET
    km_atual = GREATEST(COALESCE(km_atual,0), COALESCE(max_km,0)),
    hora_atual = GREATEST(COALESCE(hora_atual,0), COALESCE(max_hor,0)),
    ultima_atualizacao = GREATEST(COALESCE(ultima_atualizacao, '1900-01-01'::date), COALESCE(latest_date, ultima_atualizacao, '1900-01-01'::date))
  WHERE id = v_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_veiculo_from_ordem ON public.ordens_servico;
CREATE TRIGGER trg_sync_veiculo_from_ordem
AFTER INSERT OR UPDATE OF km_entrada, km_saida, horimetro_entrada, horimetro_saida, data_entrada, data_saida
ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.sync_veiculo_from_ordem();

-- Backfill todos os veículos a partir das ordens existentes
UPDATE public.veiculos v
SET
  km_atual = GREATEST(COALESCE(v.km_atual,0), COALESCE(s.max_km,0)),
  hora_atual = GREATEST(COALESCE(v.hora_atual,0), COALESCE(s.max_hor,0)),
  ultima_atualizacao = GREATEST(COALESCE(v.ultima_atualizacao,'1900-01-01'::date), COALESCE(s.latest_date, v.ultima_atualizacao, '1900-01-01'::date))
FROM (
  SELECT
    veiculo_id,
    GREATEST(MAX(COALESCE(km_saida,0)), MAX(COALESCE(km_entrada,0))) AS max_km,
    GREATEST(MAX(COALESCE(horimetro_saida,0)), MAX(COALESCE(horimetro_entrada,0))) AS max_hor,
    MAX(COALESCE(data_saida, data_entrada)) AS latest_date
  FROM public.ordens_servico
  GROUP BY veiculo_id
) s
WHERE v.id = s.veiculo_id;
