-- Add ordem_servico column to revisoes table
ALTER TABLE public.revisoes 
ADD COLUMN ordem_servico TEXT;

-- Add nota_fiscal_url column to revisoes table for storing file reference
ALTER TABLE public.revisoes 
ADD COLUMN nota_fiscal_url TEXT;

-- Create storage bucket for invoices/attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('notas-fiscais', 'notas-fiscais', false);

-- Create storage policies for notas-fiscais bucket
CREATE POLICY "Authenticated users can view notas fiscais"
ON storage.objects
FOR SELECT
USING (bucket_id = 'notas-fiscais' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload notas fiscais"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'notas-fiscais' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update notas fiscais"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'notas-fiscais' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete notas fiscais"
ON storage.objects
FOR DELETE
USING (bucket_id = 'notas-fiscais' AND auth.role() = 'authenticated');