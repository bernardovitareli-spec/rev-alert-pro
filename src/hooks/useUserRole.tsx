import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'apontador' | 'user';

interface UserRoleResult {
  role: AppRole | null;
  isAdmin: boolean;
  isApontador: boolean;
  isLoading: boolean;
}

export function useUserRole(): UserRoleResult {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['user_role', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AppRole | null> => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id);
      if (error) throw error;
      const roles = (data ?? []).map((r) => r.role as AppRole);
      if (roles.includes('admin')) return 'admin';
      if (roles.includes('apontador')) return 'apontador';
      if (roles.includes('user')) return 'user';
      return null;
    },
  });

  const role = data ?? null;
  return {
    role,
    isAdmin: role === 'admin',
    isApontador: role === 'apontador',
    isLoading: !!user?.id && isLoading,
  };
}
