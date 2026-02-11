-- Create enum for revision unit type
CREATE TYPE public.revision_unit AS ENUM ('Km', 'Hr');

-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create table for contract companies
CREATE TABLE public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for revision types
CREATE TABLE public.tipos_revisao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    intervalo_padrao INTEGER,
    unidade_padrao revision_unit,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for vehicles
CREATE TABLE public.veiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placa_serie TEXT NOT NULL UNIQUE,
    tag_obra TEXT,
    km_atual INTEGER DEFAULT 0,
    hora_atual INTEGER DEFAULT 0,
    ultima_atualizacao DATE,
    retorno_patio DATE,
    empresa_id UUID REFERENCES public.empresas(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for revision records (each revision for each vehicle)
CREATE TABLE public.revisoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
    tipo_revisao_id UUID NOT NULL REFERENCES public.tipos_revisao(id) ON DELETE CASCADE,
    data_revisao DATE,
    km_revisao INTEGER,
    hora_revisao INTEGER,
    intervalo INTEGER NOT NULL,
    unidade revision_unit NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(veiculo_id, tipo_revisao_id)
);

-- Create user roles table for secure role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create import logs table
CREATE TABLE public.import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    filename TEXT NOT NULL,
    records_imported INTEGER DEFAULT 0,
    errors TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_revisao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revisoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- RLS Policies for empresas (all authenticated users can read, write)
CREATE POLICY "Authenticated users can view empresas"
ON public.empresas FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert empresas"
ON public.empresas FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update empresas"
ON public.empresas FOR UPDATE TO authenticated
USING (true);

-- RLS Policies for tipos_revisao
CREATE POLICY "Authenticated users can view tipos_revisao"
ON public.tipos_revisao FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert tipos_revisao"
ON public.tipos_revisao FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tipos_revisao"
ON public.tipos_revisao FOR UPDATE TO authenticated
USING (true);

-- RLS Policies for veiculos
CREATE POLICY "Authenticated users can view veiculos"
ON public.veiculos FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert veiculos"
ON public.veiculos FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update veiculos"
ON public.veiculos FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete veiculos"
ON public.veiculos FOR DELETE TO authenticated
USING (true);

-- RLS Policies for revisoes
CREATE POLICY "Authenticated users can view revisoes"
ON public.revisoes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert revisoes"
ON public.revisoes FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update revisoes"
ON public.revisoes FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete revisoes"
ON public.revisoes FOR DELETE TO authenticated
USING (true);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for import_logs
CREATE POLICY "Users can view import logs"
ON public.import_logs FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert import logs"
ON public.import_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_veiculos_updated_at
BEFORE UPDATE ON public.veiculos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_revisoes_updated_at
BEFORE UPDATE ON public.revisoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email)
    VALUES (NEW.id, NEW.email);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_veiculos_empresa ON public.veiculos(empresa_id);
CREATE INDEX idx_veiculos_placa ON public.veiculos(placa_serie);
CREATE INDEX idx_revisoes_veiculo ON public.revisoes(veiculo_id);
CREATE INDEX idx_revisoes_tipo ON public.revisoes(tipo_revisao_id);
CREATE INDEX idx_revisoes_data ON public.revisoes(data_revisao);