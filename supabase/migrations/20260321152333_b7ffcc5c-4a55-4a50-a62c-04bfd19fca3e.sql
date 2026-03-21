
-- Enums
CREATE TYPE public.tipo_manutencao AS ENUM ('preventiva', 'corretiva');
CREATE TYPE public.subcategoria_corretiva AS ENUM ('borracharia', 'mecanica', 'eletrica', 'ar_condicionado', 'outros');
CREATE TYPE public.status_ordem_servico AS ENUM ('aberta', 'em_andamento', 'concluida');

-- Tabela ordens_servico
CREATE TABLE public.ordens_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE CASCADE NOT NULL,
  tipo_manutencao tipo_manutencao NOT NULL,
  subcategoria_corretiva subcategoria_corretiva,
  detalhamento text,
  tipo_revisao_id uuid REFERENCES public.tipos_revisao(id),
  data_entrada date NOT NULL DEFAULT CURRENT_DATE,
  km_entrada integer,
  horimetro_entrada integer,
  tem_avarias boolean NOT NULL DEFAULT false,
  descricao_avarias text,
  previsao_saida date,
  data_saida date,
  km_saida integer,
  horimetro_saida integer,
  avarias_resolvidas boolean,
  observacoes_saida text,
  status status_ordem_servico NOT NULL DEFAULT 'aberta',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ordens_servico" ON public.ordens_servico FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ordens_servico" ON public.ordens_servico FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ordens_servico" ON public.ordens_servico FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete ordens_servico" ON public.ordens_servico FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_ordens_servico_updated_at BEFORE UPDATE ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela avarias_fotos
CREATE TABLE public.avarias_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id uuid REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
  foto_url text NOT NULL,
  descricao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.avarias_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view avarias_fotos" ON public.avarias_fotos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert avarias_fotos" ON public.avarias_fotos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update avarias_fotos" ON public.avarias_fotos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete avarias_fotos" ON public.avarias_fotos FOR DELETE TO authenticated USING (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avarias-fotos', 'avarias-fotos', true);

CREATE POLICY "Authenticated users can upload avarias fotos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avarias-fotos');
CREATE POLICY "Anyone can view avarias fotos" ON storage.objects FOR SELECT USING (bucket_id = 'avarias-fotos');
CREATE POLICY "Authenticated users can delete avarias fotos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avarias-fotos');
