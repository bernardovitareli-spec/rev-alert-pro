import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LogOut, KeyRound, UserCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

const ROLE_INFO: Record<AppRole, { label: string; color: string; description: string }> = {
  admin: {
    label: 'Admin',
    color: 'bg-red-500/15 text-red-400 border-red-500/30',
    description: 'Acesso total ao sistema: cadastros, importação, relatórios, usuários e configurações.',
  },
  apontador: {
    label: 'Apontador',
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    description: 'Pode atualizar apenas Km/Hr, Última Atualização e Retorno ao Pátio dos veículos.',
  },
  user: {
    label: 'Usuário',
    color: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
    description: 'Usuário padrão com acesso à frota e relatórios, sem permissões administrativas.',
  },
};

export default function MeuPerfil() {
  const { user, signOut } = useAuth();
  const { role, isLoading } = useUserRole();
  const navigate = useNavigate();
  const [sendingReset, setSendingReset] = useState(false);

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('E-mail enviado', {
        description: 'Verifique sua caixa de entrada para definir uma nova senha.',
      });
    } catch (err) {
      toast.error('Falha ao enviar e-mail', { description: (err as Error).message });
    } finally {
      setSendingReset(false);
    }
  };

  const info = role ? ROLE_INFO[role] : null;
  const nome = (user?.user_metadata as { nome?: string } | undefined)?.nome ?? '—';

  return (
    <AppLayout title="Meu Perfil">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle className="h-5 w-5 text-primary" /> Dados da conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <p className="text-sm font-medium">{nome}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">E-mail</Label>
                <p className="text-sm font-medium break-all">{user?.email}</p>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Papel</Label>
              <div className="mt-1">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : info ? (
                  <Badge variant="outline" className={info.color}>
                    {info.label}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
              {info && (
                <p className="text-xs text-muted-foreground mt-2">{info.description}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={handleResetPassword} disabled={sendingReset} variant="outline">
              {sendingReset ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4 mr-2" />
              )}
              Alterar senha
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
            >
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
