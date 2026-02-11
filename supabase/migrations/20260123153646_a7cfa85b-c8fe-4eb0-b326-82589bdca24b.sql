-- Criar tabela de oficinas
CREATE TABLE public.oficinas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna oficina_id na tabela revisoes
ALTER TABLE public.revisoes 
ADD COLUMN oficina_id UUID REFERENCES public.oficinas(id);

-- Enable RLS
ALTER TABLE public.oficinas ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view oficinas" 
ON public.oficinas 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert oficinas" 
ON public.oficinas 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update oficinas" 
ON public.oficinas 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete oficinas" 
ON public.oficinas 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_oficinas_updated_at
BEFORE UPDATE ON public.oficinas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial workshops
INSERT INTO public.oficinas (nome) VALUES 
  ('Oficina do Joãozinho'),
  ('Oficina Paraupebas'),
  ('Oficina do Pará'),
  ('Oficina Paraense');