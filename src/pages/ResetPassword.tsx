import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import logoMC from '@/assets/logo-mc-20anos.jpg';

const resetSchema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres').max(128, 'Senha muito longa'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
    });
    if (window.location.hash.includes('type=recovery')) setIsRecovery(true);
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (values: ResetForm) => {
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setIsLoading(false);

    if (error) {
      toast.error('Erro ao redefinir senha', { description: error.message });
    } else {
      setSuccess(true);
      toast.success('Senha redefinida com sucesso!');
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  if (!isRecovery && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={logoMC} alt="MC Terraplenagem" className="w-48 h-auto object-contain mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Link inválido ou expirado</h1>
          <p className="text-sm text-muted-foreground">
            Este link de redefinição de senha não é válido. Solicite um novo link na tela de login.
          </p>
          <Button onClick={() => navigate('/login')} className="w-full">Voltar ao login</Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Senha redefinida!</h1>
          <p className="text-sm text-muted-foreground">Você será redirecionado para o login em instantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <img src={logoMC} alt="MC Terraplenagem" className="w-48 h-auto object-contain" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Redefinir senha</h1>
          <p className="text-sm text-muted-foreground">Digite sua nova senha abaixo</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-sm font-medium">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              aria-invalid={!!errors.password}
              {...register('password')}
              className="h-11 bg-secondary border-border/60 focus-visible:ring-primary/50 focus-visible:border-primary/50"
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-sm font-medium">Confirmar senha</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Repita a nova senha"
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
              className="h-11 bg-secondary border-border/60 focus-visible:ring-primary/50 focus-visible:border-primary/50"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full h-11 font-semibold text-sm rounded-lg" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar nova senha'}
          </Button>
        </form>
      </div>
    </div>
  );
}
