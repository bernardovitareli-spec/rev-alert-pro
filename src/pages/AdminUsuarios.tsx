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
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, UserPlus, Users, Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type Role = 'admin' | 'apontador' | 'user';

interface ProfileRow {
  user_id: string;
  nome: string | null;
  email: string | null;
  created_at: string;
}

interface UserRoleRow {
  user_id: string;
  role: Role;
}

const ROLE_BADGE: Record<Role, string> = {
  admin: 'bg-red-500/15 text-red-400 border-red-500/30',
  apontador: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  user: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
};

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  apontador: 'Apontador',
  user: 'Usuário',
};

function generatePassword(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let out = '';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

function pickRole(roles: Role[]): Role {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('apontador')) return 'apontador';
  return 'user';
}

export default function AdminUsuarios() {
  const { data: isAdmin, isLoading: loadingAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [password, setPassword] = useState(() => generatePassword());
  const [role, setRole] = useState<Role>('apontador');
  const [inviting, setInviting] = useState(false);

  // Dialog para alterar papel
  const [editing, setEditing] = useState<{ userId: string; email: string; currentRole: Role } | null>(null);
  const [newRole, setNewRole] = useState<Role>('user');
  const [savingRole, setSavingRole] = useState(false);
  const [syncing, setSyncing] = useState(false);

  interface Diagnostico {
    total_auth: number;
    total_profiles: number;
    total_roles: number;
    orfaos_encontrados?: { sem_profile: string[]; sem_role: string[] };
  }

  const { data: diagnostico, refetch: refetchDiag } = useQuery<Diagnostico | null>({
    queryKey: ['admin', 'sync-users', 'dry'],
    enabled: !!isAdmin,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-sync-users', {
        body: { dryRun: true },
      });
      if (error) return null;
      return {
        total_auth: data?.diagnostico?.total_auth ?? 0,
        total_profiles: data?.diagnostico?.total_profiles ?? 0,
        total_roles: data?.diagnostico?.total_roles ?? 0,
        orfaos_encontrados: data?.orfaos_encontrados,
      };
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-sync-users', {
        body: {},
      });
      if (error) {
        let serverMsg: string | null = null;
        try {
          const ctx = (error as unknown as { context?: Response }).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.clone().json();
            serverMsg = body?.error ?? null;
          }
        } catch { /* ignore */ }
        throw new Error(serverMsg ?? error.message);
      }
      if (data?.error) throw new Error(data.error);
      toast.success('Sincronização concluída', {
        description: data?.mensagem ?? 'Usuários sincronizados.',
      });
      await Promise.all([
        refetchDiag(),
        queryClient.invalidateQueries({ queryKey: ['admin', 'profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'user_roles'] }),
      ]);
    } catch (err) {
      toast.error('Falha ao sincronizar', { description: (err as Error).message });
    } finally {
      setSyncing(false);
    }
  };

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

  const { data: roleMap } = useQuery({
    queryKey: ['admin', 'user_roles'],
    enabled: !!isAdmin,
    queryFn: async (): Promise<Record<string, Role>> => {
      const { data, error } = await supabase.from('user_roles').select('user_id, role');
      if (error) throw error;
      const grouped: Record<string, Role[]> = {};
      (data as UserRoleRow[]).forEach((r) => {
        (grouped[r.user_id] ||= []).push(r.role);
      });
      const out: Record<string, Role> = {};
      for (const [uid, list] of Object.entries(grouped)) out[uid] = pickRole(list);
      return out;
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
        body: { email: email.trim(), nome: nome.trim() || undefined, password, role },
      });
      if (error) {
        let serverMsg: string | null = null;
        try {
          const ctx = (error as unknown as { context?: Response }).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.clone().json();
            serverMsg = body?.error ?? null;
          }
        } catch {
          // ignore
        }
        throw new Error(serverMsg ?? error.message);
      }
      if (data?.error) throw new Error(data.error);
      toast.success('Usuário criado', {
        description: data?.message ?? `${email} foi cadastrado como ${ROLE_LABEL[role]}.`,
        duration: 10000,
      });
      setEmail('');
      setNome('');
      setPassword(generatePassword());
      setRole('apontador');
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user_roles'] });
    } catch (err) {
      toast.error('Falha ao cadastrar usuário', { description: (err as Error).message });
    } finally {
      setInviting(false);
    }
  };

  const openEdit = (userId: string, userEmail: string, currentRole: Role) => {
    setEditing({ userId, email: userEmail, currentRole });
    setNewRole(currentRole);
  };

  const handleSaveRole = async () => {
    if (!editing) return;
    setSavingRole(true);
    try {
      // Remove papéis atuais e insere o novo
      const { error: delErr } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', editing.userId);
      if (delErr) throw delErr;

      const { error: insErr } = await supabase
        .from('user_roles')
        .insert({ user_id: editing.userId, role: newRole });
      if (insErr) throw insErr;

      toast.success('Papel atualizado', {
        description: `${editing.email} agora é ${ROLE_LABEL[newRole]}.`,
      });
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'user_roles'] });
    } catch (err) {
      toast.error('Falha ao atualizar papel', { description: (err as Error).message });
    } finally {
      setSavingRole(false);
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
            Cadastre novos usuários definindo papel, senha inicial e gerencie quem tem acesso ao sistema.
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
              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Papel</Label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="admin">Admin — Acesso total ao sistema</option>
                  <option value="apontador">Apontador — Apenas atualiza Km/Hr e retorno ao pátio</option>
                </select>
              </div>
              <div className="space-y-1.5">
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
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">
                  Compartilhe a senha com o usuário por um canal seguro. Ele poderá alterá-la depois em "Meu Perfil".
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

        {diagnostico && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Diagnóstico de cadastros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="px-3 py-2 rounded-md bg-secondary/40 border border-border/50">
                  Total auth: <span className="font-semibold">{diagnostico.total_auth}</span>
                </div>
                <div className="px-3 py-2 rounded-md bg-secondary/40 border border-border/50">
                  Com perfil: <span className="font-semibold">{diagnostico.total_profiles}</span>
                </div>
                <div className="px-3 py-2 rounded-md bg-secondary/40 border border-border/50">
                  Com papel: <span className="font-semibold">{diagnostico.total_roles}</span>
                </div>
              </div>
              {(diagnostico.total_auth !== diagnostico.total_profiles ||
                diagnostico.total_auth !== diagnostico.total_roles) && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 text-amber-300 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      Existem{' '}
                      <strong>
                        {Math.max(
                          diagnostico.total_auth - diagnostico.total_profiles,
                          diagnostico.total_auth - diagnostico.total_roles,
                        )}
                      </strong>{' '}
                      usuário(s) com cadastro incompleto.
                      {diagnostico.orfaos_encontrados && (
                        <div className="text-xs mt-1 text-amber-200/80">
                          {diagnostico.orfaos_encontrados.sem_profile.length > 0 && (
                            <div>Sem perfil: {diagnostico.orfaos_encontrados.sem_profile.join(', ')}</div>
                          )}
                          {diagnostico.orfaos_encontrados.sem_role.length > 0 && (
                            <div>Sem papel: {diagnostico.orfaos_encontrados.sem_role.join(', ')}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleSync}
                    disabled={syncing}
                    className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1.5" /> Sincronizar Agora
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Papel</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Cadastrado em</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => {
                      const r = (roleMap?.[p.user_id] ?? 'user') as Role;
                      return (
                        <tr key={p.user_id} className="border-t border-border/40">
                          <td className="px-4 py-2">{p.nome || '—'}</td>
                          <td className="px-4 py-2">{p.email || '—'}</td>
                          <td className="px-4 py-2">
                            <Badge variant="outline" className={ROLE_BADGE[r]}>
                              {ROLE_LABEL[r]}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(p.user_id, p.email || '', r)}
                            >
                              <Shield className="h-3.5 w-3.5 mr-1" /> Alterar Papel
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar papel do usuário</DialogTitle>
            <DialogDescription>
              {editing?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-role">Novo papel</Label>
            <select
              id="new-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="admin">Admin — Acesso total</option>
              <option value="apontador">Apontador — Apenas Km/Hr</option>
              <option value="user">Usuário — Padrão</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSaveRole} disabled={savingRole}>
              {savingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
