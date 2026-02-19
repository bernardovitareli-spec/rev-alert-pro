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
    const { error } = await signUp(email, password, nome);
    setIsLoading(false);
    if (error) {
      toast.error('Erro ao cadastrar', { description: error.message });
    } else {
      toast.success('Conta criada!', { description: 'Você já pode acessar o sistema.' });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo — Identidade de marca */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col items-center justify-between p-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(155deg, hsl(222 74% 15%), hsl(221 73% 32%), hsl(217 91% 48%))',
        }}
      >
        {/* Decoração geométrica de fundo */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, white 1px, transparent 1px),
              radial-gradient(circle at 80% 80%, white 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-5"
          style={{ background: 'white', transform: 'translate(-30%, 30%)' }} />

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
            <h2 className="text-2xl font-bold text-white mb-2">
              Gestão de Frota Inteligente
            </h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs mx-auto">
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
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-white/80" />
                </div>
                <span className="text-white/70 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <p className="relative z-10 text-white/30 text-xs">
          © {new Date().getFullYear()} MC Terraplenagem — Todos os direitos reservados
        </p>
      </div>

      {/* Lado direito — Formulário */}
      <div className="flex-1 flex items-center justify-center bg-background p-6">
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
          <Tabs defaultValue="login" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 h-10 bg-muted/60 p-1 rounded-lg">
              <TabsTrigger
                value="login"
                className="rounded-md text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-md text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground"
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
                    className="h-11 border-border/70 focus-visible:ring-primary/50 focus-visible:border-primary/50 bg-card"
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
                    className="h-11 border-border/70 focus-visible:ring-primary/50 focus-visible:border-primary/50 bg-card"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold text-sm rounded-lg shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, hsl(221 73% 48%), hsl(221 73% 38%))',
                  }}
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
                    className="h-11 border-border/70 focus-visible:ring-primary/50 focus-visible:border-primary/50 bg-card"
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
                    className="h-11 border-border/70 focus-visible:ring-primary/50 focus-visible:border-primary/50 bg-card"
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
                    className="h-11 border-border/70 focus-visible:ring-primary/50 focus-visible:border-primary/50 bg-card"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold text-sm rounded-lg shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, hsl(221 73% 48%), hsl(221 73% 38%))',
                  }}
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
