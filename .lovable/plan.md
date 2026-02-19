
## Redesign Visual Completo — MC Terraplenagem

### Visão Geral da Transformação

O sistema passará de uma aparência genérica e apagada para uma identidade visual profissional com:
- Sidebar em Azul Royal Escuro (identidade de marca forte)
- Cards com profundidade, sombras e hierarquia clara
- Paleta de cores sólidas e funcionais
- Tela de Login moderna em layout split-screen
- Header renovado com mais personalidade
- Tipografia e espaçamentos refinados

---

### Nova Paleta de Cores

```text
AZUL ROYAL ESCURO (Sidebar):    #0F2462
AZUL ROYAL PRINCIPAL (Primary): #1D4ED8
AZUL VIVO (Accent):             #3B82F6
AZUL CLARO (Hover):             #EFF6FF

BRANCO (Cards):                 #FFFFFF
FUNDO GERAL:                    #F0F4F9

CRÍTICO (Vermelho sólido):      #DC2626
ALERTA  (Âmbar sólido):        #D97706
OK      (Verde sólido):         #16A34A
EM SERVIÇO (Violeta):           #7C3AED

TEXTO PRINCIPAL:                #0F172A
TEXTO SECUNDÁRIO:               #475569
```

---

### Arquivos que serão alterados

#### 1. `src/index.css` — Sistema de cores redesenhado

Todas as variáveis CSS serão substituídas pela nova paleta:
- `--background`: `#F0F4F9` (cinza-azulado suave, não o cinza genérico)
- `--primary`: Azul Royal vivo `#1D4ED8`
- `--sidebar-background`: Azul Royal Escuro `#0F2462`
- Status colors: tons sólidos contrastantes para crítico, alerta, ok
- Novos utilitários CSS para scrollbar personalizada e animações de hover

#### 2. `src/components/layout/AppSidebar.tsx` — Sidebar com identidade de marca

- Fundo: Azul Royal Escuro com ícones e texto brancos
- Logo mantida no topo com área bem delimitada
- Item ativo: realce com barra lateral esquerda azul viva + fundo branco translúcido
- Grupo "Configurações" com separador e label mais sutil
- Footer com usuário e botão de sair com melhor contraste
- Badges de alerta mais vibrantes e legíveis no fundo escuro

#### 3. `src/components/layout/AppLayout.tsx` — Header profissional

- Header com fundo branco e sombra sutil `shadow-sm`
- Título da página com tipografia mais expressiva (peso 700, ligeiro gradiente)
- Breadcrumb implícito e linha de separação mais limpa

#### 4. `src/pages/Login.tsx` — Tela de login split-screen

- **Lado esquerdo** (40%): fundo Azul Royal com gradiente, logo centralizada, tagline e decoração geométrica sutil
- **Lado direito** (60%): formulário sobre fundo branco puro, campos com bordas definidas e botão com gradiente azul
- Tabs de Login/Cadastrar com visual mais limpo
- Mobile-first: empilhamento vertical no mobile

#### 5. `src/components/dashboard/StatusCard.tsx` — Cards KPI renovados

- Fundo sólido com leve gradiente direcional (não mais flat)
- Ícone em círculo com fundo semitransparente branco
- Número grande mais destacado (text-5xl)
- Sombra colorida combinando com o status (ex: `shadow-red-200` para crítico)
- Borda superior colorida como indicador visual adicional

#### 6. `src/components/ui/card.tsx` — Card base com mais profundidade

- Sombra padrão levemente mais pronunciada: `shadow-sm` → `shadow-md`
- Borda mais sutil (`border-slate-200/60`)
- Hover com elevação suave para cards interativos

---

### Sem alteração em dados ou lógica

Nenhuma mudança em banco de dados, hooks, roteamento ou regras de negócio. 100% visual/CSS/JSX.

---

### Reversão

Caso não goste do resultado, o histórico de versões da ferramenta permite reverter com um clique ao estado anterior.
