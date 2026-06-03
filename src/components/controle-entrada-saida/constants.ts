import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { StatusOrdemServico, SubcategoriaCorretiva } from '@/types/fleet';

export const PAGE_SIZE = 20;

export const SUBCATEGORIAS: { value: SubcategoriaCorretiva; label: string }[] = [
  { value: 'borracharia', label: 'Borracharia' },
  { value: 'mecanica', label: 'Mecânica' },
  { value: 'eletrica', label: 'Elétrica' },
  { value: 'ar_condicionado', label: 'Ar Condicionado' },
  { value: 'outros', label: 'Outros' },
];

export const STATUS_CONFIG: Record<
  StatusOrdemServico,
  { label: string; variant: 'destructive' | 'secondary' | 'default'; icon: typeof Clock }
> = {
  aberta: { label: 'Aberta', variant: 'destructive', icon: AlertTriangle },
  em_andamento: { label: 'Em Andamento', variant: 'secondary', icon: Clock },
  concluida: { label: 'Concluída', variant: 'default', icon: CheckCircle2 },
};

export const formatDateSafe = (dateValue?: string | null) => {
  if (!dateValue) return '-';
  const normalized = dateValue.includes('T') ? dateValue : `${dateValue}T12:00:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return '-';
  const d = parsed;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};
