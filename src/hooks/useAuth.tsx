import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const sanitizeEmail = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '');

const isInvalidCredentialsError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const parsedError = error as { code?: string; message?: string };
  const message = parsedError.message?.toLowerCase() ?? '';
  return parsedError.code === 'invalid_credentials' || message.includes('invalid login credentials');
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{
    error: Error | null;
    session: Session | null;
    requiresEmailConfirmation: boolean;
  }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fallbackTimeout = window.setTimeout(() => {
      if (isMounted) {
        console.warn('[auth] Timeout de sessão, liberando loading');
        setLoading(false);
      }
    }, 8000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        window.clearTimeout(fallbackTimeout);

        // If the token refresh failed, don't immediately kick the user out
        // Just log the error — they'll be redirected on the next protected action
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('[auth] Token refresh retornou sessão nula, ignorando');
          return;
        }

        // Only clear user state on explicit sign-out
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          // If refresh token is invalid, clear state gracefully
          if (error.message?.includes('Refresh Token') || (error as any)?.code === 'refresh_token_not_found') {
            console.warn('[auth] Refresh token inválido, limpando sessão');
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            if (isMounted) {
              setSession(null);
              setUser(null);
              setLoading(false);
            }
            return;
          }
          throw error;
        }
        if (!isMounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      } catch (error) {
        console.error('[auth] Falha ao recuperar sessão', error);
      } finally {
        if (isMounted) {
          window.clearTimeout(fallbackTimeout);
          setLoading(false);
        }
      }
    };

    void loadSession();

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = sanitizeEmail(email);

    const attemptSignIn = (candidatePassword: string) =>
      supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: candidatePassword,
      });

    let { error } = await attemptSignIn(password);

    // Fallback para casos em que a senha foi colada com espaços no início/fim
    if (error && isInvalidCredentialsError(error) && password !== password.trim()) {
      const retryResult = await attemptSignIn(password.trim());
      error = retryResult.error;
    }

    return { error };
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const normalizedEmail = sanitizeEmail(email);

    const { error, data } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome },
      },
    });

    // Save profile data after signup without bloquear fluxo de autenticação
    if (!error && data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: data.user.id,
            nome,
            email: normalizedEmail,
          },
          { onConflict: 'user_id' }
        );

      if (profileError) {
        console.error('[auth] Falha ao salvar perfil no cadastro', profileError);
      }
    }

    const session = data.session ?? null;
    return {
      error,
      session,
      requiresEmailConfirmation: !session,
    };
  };

  const signOut = async () => {
    // Optimistic local cleanup so ProtectedRoute stops rendering immediately
    setSession(null);
    setUser(null);
    setLoading(false);

    try {
      // Prefer local scope to avoid waiting on network; still clears browser session
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignore – we'll still redirect
    } finally {
      window.location.assign('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
