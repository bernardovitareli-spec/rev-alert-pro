import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, Lock, User, Bell } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  getNotificationsEnabled,
  setNotificationsEnabled,
} from "@/hooks/useNotifications";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Mínimo 8 caracteres"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

const nameSchema = z.object({
  nome: z.string().trim().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
});

type PasswordForm = z.infer<typeof passwordSchema>;
type NameForm = z.infer<typeof nameSchema>;

export default function Configuracoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [notifEnabled, setNotifEnabled] = useState(getNotificationsEnabled);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const nameForm = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: { nome: "" },
  });

  useEffect(() => {
    if (profile?.nome) nameForm.reset({ nome: profile.nome });
  }, [profile?.nome, nameForm]);

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmitName = async (values: NameForm) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ nome: values.nome })
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Erro ao salvar nome", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Nome atualizado", description: "Suas informações foram salvas." });
    queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
  };

  const onSubmitPassword = async (values: PasswordForm) => {
    const { error } = await supabase.auth.updateUser({ password: values.newPassword });
    if (error) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Senha alterada", description: "Use a nova senha no próximo login." });
    passwordForm.reset();
  };

  const handleNotifToggle = (checked: boolean) => {
    setNotifEnabled(checked);
    setNotificationsEnabled(checked);
  };

  const themeOptions: { value: "light" | "dark" | "system"; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ];

  return (
    <AppLayout title="Configurações">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" aria-hidden="true" />
              Perfil
            </CardTitle>
            <CardDescription>Atualize suas informações de exibição.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={nameForm.handleSubmit(onSubmitName)}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  autoComplete="name"
                  {...nameForm.register("nome")}
                  aria-invalid={!!nameForm.formState.errors.nome}
                />
                {nameForm.formState.errors.nome && (
                  <p className="text-xs text-destructive">
                    {nameForm.formState.errors.nome.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={nameForm.formState.isSubmitting}>
                Salvar nome
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Senha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
              Alterar senha
            </CardTitle>
            <CardDescription>Use uma senha forte com pelo menos 8 caracteres.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register("newPassword")}
                  aria-invalid={!!passwordForm.formState.errors.newPassword}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...passwordForm.register("confirmPassword")}
                  aria-invalid={!!passwordForm.formState.errors.confirmPassword}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                Alterar senha
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-primary" aria-hidden="true" />
              Aparência
            </CardTitle>
            <CardDescription>Escolha o tema da interface.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40 hover:bg-accent/30 text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
              Notificações
            </CardTitle>
            <CardDescription>
              Alertas de revisões críticas e em atenção no topo da tela.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Notificações in-app
                </p>
                <p className="text-xs text-muted-foreground">
                  Mostra o sino com a contagem de alertas pendentes.
                </p>
              </div>
              <Switch
                checked={notifEnabled}
                onCheckedChange={handleNotifToggle}
                aria-label="Ativar notificações in-app"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
