import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Truck, ShieldCheck, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import logoMC from '@/assets/logo-mc-20anos.jpg';

export default function Login() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast.error('Erro ao entrar', { description: error.message });
    } else {
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error, requiresEmailConfirmation } = await signUp(email, password, nome);
    setIsLoading(false);

    if (error) {
      toast.error('Erro ao cadastrar', { description: error.message });
    } else {
      if (requiresEmailConfirmation) {
        toast.success('Cadastro realizado!', {
          description: 'Enviamos um e-mail de confirmação. Após confirmar, faça login para acessar o sistema.',
        });
        setActiveTab('login');
        setPassword('');
        return;
      }

      toast.success('Conta criada!', { description: 'Você já pode acessar o sistema.' });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Lado esquerdo — Identidade de marca dark */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col items-center justify-between p-10 relative overflow-hidden border-r border-border/30"
        style={{
          background: 'linear-gradient(155deg, hsl(220 55% 5%), hsl(220 50% 9%), hsl(220 45% 12%))',
        }}
      >
        {/* Decoração geométrica teal */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, hsl(160 84% 39%) 1px, transparent 1px),
              radial-gradient(circle at 80% 80%, hsl(160 84% 39%) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'hsl(160 84% 39%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-3"
          style={{ background: 'hsl(160 84% 39%)', transform: 'translate(-30%, 30%)' }} />

        {/* Logo */}
        <div className="relative z-10 w-full max-w-[280px]">
          <img
            src={logoMC}
            alt="MC Terraplenagem"
            className="w-full h-auto object-contain drop-shadow-2xl"
          />
        </div>

        {/* Tagline e features */}
        <div className="relative z-10 text-center space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Gestão de Frota Inteligente
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
              Controle completo das revisões, documentos e manutenção da sua frota em um só lugar.
            </p>
          </div>

          <div className="grid gap-3 text-left">
            {[
              { icon: Truck, label: 'Controle de veículos e revisões' },
              { icon: ShieldCheck, label: 'Alertas de documentos vencidos' },
              { icon: BarChart3, label: 'Relatórios e análises em tempo real' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-muted-foreground text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <p className="relative z-10 text-muted-foreground/50 text-xs">
          © {new Date().getFullYear()} MC Terraplenagem — Todos os direitos reservados
        </p>
      </div>

      {/* Lado direito — Formulário */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center">
            <img src={logoMC} alt="MC Terraplenagem" className="w-48 h-auto object-contain" />
          </div>

          {/* Cabeçalho */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Bem-vindo de volta
            </h1>
            <p className="text-sm text-muted-foreground">
              Acesse o sistema de gestão de frota
            </p>
          </div>

          {/* Tabs de login/cadastro */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 h-10 bg-secondary p-1 rounded-lg">
              <TabsTrigger
                value="login"
                className="rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Cadastrar
              </TabsTrigger>
            </TabsList>

            {/* Login */}
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 bg-secondary border-border/60 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
                    'Entrar no sistema'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Cadastro */}
            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nome" className="text-sm font-medium">Nome completo</Label>
                  <Input
                    id="nome"
                    placeholder="Seu nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    className="h-11 bg-secondary border-border/60 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-reg" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email-reg"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 bg-secondary border-border/60 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-reg" className="text-sm font-medium">Senha</Label>
                  <Input
                    id="password-reg"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                    'Criar minha conta'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
