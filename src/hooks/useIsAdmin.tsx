import { useUserRole } from './useUserRole';

/**
 * Alias mantido para compatibilidade. Use useUserRole() para acesso completo.
 */
export function useIsAdmin() {
  const { isAdmin, isLoading } = useUserRole();
  return {
    data: isAdmin,
    isLoading,
  };
}
