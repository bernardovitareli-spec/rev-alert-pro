import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
      (_event, session) => {
        if (!isMounted) return;
        window.clearTimeout(fallbackTimeout);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
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
            email,
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
