import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import logoMC from '@/assets/logo-mc-20anos.jpg';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Also check if we already have a session with recovery type in hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
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
          <Button onClick={() => navigate('/login')} className="w-full">
            Voltar ao login
          </Button>
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
          <p className="text-sm text-muted-foreground">
            Você será redirecionado para o login em instantes...
          </p>
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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Redefinir senha
          </h1>
          <p className="text-sm text-muted-foreground">
            Digite sua nova senha abaixo
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-sm font-medium">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 bg-secondary border-border/60 focus-visible:ring-primary/50 focus-visible:border-primary/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-sm font-medium">Confirmar senha</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 bg-secondary border-border/60 focus-visible:ring-primary/50 focus-visible:border-primary/50"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11 font-semibold text-sm rounded-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Salvar nova senha'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
