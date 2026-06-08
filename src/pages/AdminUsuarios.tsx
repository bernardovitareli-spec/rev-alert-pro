import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileRow {
  user_id: string;
  nome: string | null;
  email: string | null;
  created_at: string;
}

function generatePassword(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let out = '';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

export default function AdminUsuarios() {
  const { data: isAdmin, isLoading: loadingAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [password, setPassword] = useState(() => generatePassword());
  const [inviting, setInviting] = useState(false);

  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ['admin', 'profiles'],
    enabled: !!isAdmin,
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, nome, email, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  if (loadingAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (password.length < 8) {
      toast.error('Senha muito curta', { description: 'Use no mínimo 8 caracteres.' });
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-invite-user', {
        body: { email: email.trim(), nome: nome.trim() || undefined, password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Usuário criado', {
        description: data?.message ?? `${email} foi cadastrado. Compartilhe a senha com o usuário de forma segura.`,
        duration: 10000,
      });
      setEmail('');
      setNome('');
      setPassword(generatePassword());
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiles'] });
    } catch (err) {
      toast.error('Falha ao cadastrar usuário', {
        description: (err as Error).message,
      });
    } finally {
      setInviting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Usuários
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastre novos usuários definindo uma senha inicial e gerencie quem tem acesso ao sistema.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-primary" /> Cadastrar novo usuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="grid gap-4 sm:grid-cols-2 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">E-mail</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="usuario@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-nome">Nome (opcional)</Label>
                <Input
                  id="invite-nome"
                  placeholder="Nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="invite-password">Senha inicial (mínimo 8 caracteres)</Label>
                <div className="flex gap-2">
                  <Input
                    id="invite-password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPassword(generatePassword())}
                    title="Gerar nova senha"
                  >
                    Gerar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(password);
                      toast.success('Senha copiada');
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Compartilhe a senha com o usuário por um canal seguro. Ele poderá alterá-la depois em "Esqueci minha senha".
                </p>
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={inviting} className="h-10 min-w-[160px]">
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cadastrar usuário'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuários cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProfiles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : !profiles || profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum usuário cadastrado.</p>
            ) : (
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Nome</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">E-mail</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Cadastrado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.user_id} className="border-t border-border/40">
                        <td className="px-4 py-2">{p.nome || '—'}</td>
                        <td className="px-4 py-2">{p.email || '—'}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
