import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

const forgotSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: ForgotForm) => {
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);

    if (error) {
      toast.error('Erro ao enviar e-mail', { description: error.message });
    } else {
      setSubmittedEmail(email);
      setSent(true);
    }
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setSent(false);
      setSubmittedEmail('');
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
        >
          Esqueci minha senha
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperar senha</DialogTitle>
          <DialogDescription>
            {sent
              ? 'Verifique sua caixa de entrada para redefinir sua senha.'
              : 'Informe seu e-mail para receber o link de redefinição.'}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Enviamos um link de redefinição para <strong>{submittedEmail}</strong>. Verifique também a pasta de spam.
            </p>
            <Button variant="outline" onClick={() => handleOpenChange(false)} className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="recovery-email" className="text-sm font-medium">Email</Label>
              <Input
                id="recovery-email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                aria-invalid={!!errors.email}
                {...register('email')}
                className="h-11 bg-secondary border-border/60 focus-visible:ring-primary/50 focus-visible:border-primary/50"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-11 font-semibold text-sm rounded-lg"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar link de redefinição'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
