# GestSilo Pro — Plataforma de Gestão Agrícola

## Sobre a Aplicação
**GestSilo Pro** é uma plataforma SaaS de gestão agrícola completa para pequenos e médios produtores brasileiros, com foco especializado em **gestão de silos de silagem**. Oferece visão integrada da propriedade rural através de módulos especializados (silos, talhões, frota, financeiro, etc.), funcionando tanto via web (Vercel) quanto como PWA (offline-ready).

## Stack Técnico
- **Frontend**: Next.js 15.4+ com App Router, React 19+
- **Banco de Dados**: Supabase (PostgreSQL)
- **Deploy**: Vercel (production)
- **Linguagem**: TypeScript 5.9
- **UI**: shadcn/ui + Tailwind CSS 4.1 + Lucide React
- **Recursos Avançados**: PWA, Temas escuro/claro, Gráficos (Recharts), Formulários (React Hook Form + Zod)

## Estrutura Principal
- `app/` → páginas e rotas (App Router)
  - `dashboard/` → módulos autenticados (silos, talhões, frota, financeiro, etc.)
  - `login/`, `register/`, `forgot-password/` → autenticação
  - `operador/` → role específico para operadores
  - `page.tsx` → landing page pública
- `components/` → UI reutilizáveis (Header, Sidebar, Cards, Dialogs, etc.)
- `lib/` → utilitários, config Supabase, hooks (useAuth)
- `types/` → tipagens TypeScript
- `public/` → assets estáticos

## Funcionalidades para Usuários

### 🏠 **Dashboard Principal**
- **Cards de resumo**: Ocupação de silos, área em cultivo, frota em operação, saldo financeiro
- **Próximas operações**: Timeline de atividades agrícolas por talhão
- **Janelas de colheita**: Alertas visuais de períodos ótimos de colheita
- **Widget de clima**: Integração em tempo real com previsão do tempo
- **Atividades recentes**: Log de movimentações principais
- **Alertas críticos**: Manutenções pendentes, problemas operacionais
- **Saudação dinâmica**: Mensagem personalizada com hora do dia

### 📱 **Módulos de Gestão**

#### 🌾 **Silos & Estoque** (Core)
- Cadastro e monitoramento de silos de **silagem** (forragem fermentada) por fazenda
- Controle de capacidade e estoque atual com percentuais visuais
- Movimentação de entrada/saída de silagem com rastreamento de datas
- **Abas especializadas**:
  - Visão geral com cards de resumo
  - Estoque detalhado com histórico
  - Qualidade bromatológica (análise de PSPS)
  - Operações e movimentações
- Avaliação de qualidade: Análise bromatológica e PSPS (determinantes de valor nutritivo)
- Faixas de qualidade personalizáveis por silo

#### 🗺️ **Talhões**
- Gestão de áreas de cultivo com mapa de talhões
- Ciclo agrícola completo: planejamento → plantio → desenvolvimento → colheita
- **Histórico de culturas**: Registro de cultivos anteriores por talhão
- **Eventos DAP** (Dias Após Plantio): Rastreamento de fases de desenvolvimento
- **Janelas de colheita**: Cálculo automático de períodos ótimos
- Produtividade e análise de rendimento por período
- **Abas especializadas**: Visão geral, ciclos agrícolas, eventos e alertas

#### 🚜 **Frota & Maquinário** (Completo)
- Cadastro de máquinas e equipamentos com tipologia
- Controle de horas trabalhadas e manutenções
- **Plano de Manutenção**: Preventiva e corretiva com agendamento
- **Diário de Bordo**: Registro de operações diárias
- **Abastecimento**: Controle de combustível e custos
- **Custos**: Análise de despesas por máquina e período
- **Relatórios**: Produtividade de frota e análise comparativa
- Alertas de manutenções vencidas ou próximas

#### 🧪 **Insumos** (Completo)
- Cadastro de insumos agrícolas por categoria
- Controle de estoque com níveis mínimos configuráveis
- Movimentações: Entrada, saída e ajuste de inventário
- **Alertas críticos**: Insumos abaixo do estoque mínimo
- **Histórico de movimentações**: Entrada e saída com rastreamento
- Filtros por categoria, tipo e status
- Integração com ações de gestão (Server Actions)

#### 🌧️ **Previsão do Tempo** (Integrado)
- Widget com clima atual e previsão de 7 dias
- Geolocalização automática pela fazenda
- **Dicas agrícolas dinâmicas** baseadas no clima:
  - Alertas de chuva para aplicação de defensivos
  - Recomendações para transplante de mudas
  - Alertas de vento para pulverizações
  - Monitoramento de estruturas (silos) com vento forte
  - Recomendações de hidratação em temperaturas altas
  - Alertas de geada em temperaturas baixas

#### 📅 **Calendário Agrícola**
- Visão integrada de operações por talhão
- **Eventos DAP**: Rastreamento de fases agrícolas (plantio, desenvolvimento, colheita)
- **Status visual**: Realizado, Planejado, Atrasado
- **Três visualizações**:
  - Mensal: Visão em grid de mês completo
  - Semanal: Detalhes semanais
  - Lista: Ordenação por data com filtros
- Filtro por talhão
- Sincronização com ciclos de talhões

#### 🧮 **Calculadoras Agronômicas**
- **Calagem**: Cálculo de calcário necessário (saturação de Al, pH, SMP)
  - Tabelas de SMP (Solanums Make Paste) por cultura
  - Resultados indicativos com recomendação de consultar agrônomo
- **Adubação NPK**: Cálculo de fertilizantes
  - Inputs por cultura e condição do solo
  - Export em PDF dos resultados
- Ambiente seguro para experimentação agrícola

#### 🎯 **Planejamento de Silagem** (Novo)
- **Wizard em 4 etapas**:
  1. **Sistema**: Definição do sistema de silagem (tipo de forragem, método)
  2. **Rebanho**: Caracterização do rebanho (cabeças, peso, consumo)
  3. **Parâmetros**: Fatores de ajuste (padrão, perdas, uso)
  4. **Resultados**: Demanda calculada e dimensionamento de silos
- **Alertas dinâmicos**: Validação em tempo real
- **Histórico**: Registro de simulações anteriores
- **Export PDF**: Relatório com recomendações

#### 📊 **Financeiro** (Completo)
- **DRE** (Demonstração de Resultado do Exercício): Receitas vs Despesas
- Registro de receitas e despesas por categoria
- **Fluxo de caixa mensal**: Visualização de entradas e saídas
- Formatação em BRL com cálculos automáticos
- Gráficos comparativos por período
- Análise de lucratividade

#### 📈 **Relatórios**
- Geração de relatórios consolidados por período
- Análise de dados de silos, talhões, frota
- Export de dados em formato padronizado

#### 🧑‍🎓 **Assessoria Agronômica** (Em desenvolvimento)
- Bloco de notas para dúvidas técnicas
- Agenda com assessor para visitas técnicas
- Histórico de atendimentos
- **Status**: Disponível no Plano Max (em breve)

#### 📦 **Produtos** (Em desenvolvimento)
- Gestão de grãos e cereais
- Produtos de origem animal (leite, ovos, mel)
- Forragens e pastagens (feno, palha)
- Relatórios de produção
- **Status**: Módulo estruturado para futura expansão

#### 🎯 **Configurações**
- Perfil do usuário
- Dados e preferências da fazenda
- Localização (latitude/longitude para integração com clima)
- Temas claro/escuro
- Notificações

#### 💬 **Suporte**
- FAQ com perguntas frequentes
- Canais de contato:
  - E-mail: resposta em até 24h
  - WhatsApp: atendimento rápido (seg–sex, 8h–18h)
  - Telefone: suporte para situações críticas (seg–sex, 8h–18h)
- Guia de funcionalidades principais

### 🎬 **Onboarding**
- Fluxo guiado para novos usuários
- Setup inicial de fazenda
- Cadastro de primeiro silo
- Apresentação dos módulos principais

### Autenticação & Autorização
- **Roles**: Admin, Operador
- **Login**: Email/password via Supabase Auth
- **Recuperação de senha**: Fluxo completo implementado
- **Persistência de sessão**: SSR-safe com cookies
- **Redirect automático**: Baseado em role após login
- **RLS em tabelas**: Isolamento por `user_id` ou `fazenda_id`
- **Operador**: Acesso restrito a certos módulos (sem financeiro, por exemplo)

## Padrões & Convenções

### Autenticação
- Hook `useAuth()` centraliza lógica de autenticação
- Componentes protegidos com redirect automático para login
- Context de User via Supabase Auth
- Persistência SSR-safe de sessão

### Banco de Dados
- **Tabelas principais**: `silos`, `talhoes`, `maquinas`, `financeiro`, `profiles`, `fazendas`
- Foreign keys para relações 1:N com cascata apropriada
- Queries otimizadas com `.select()` específico (nunca `select('*')`)
- RLS (Row Level Security) aplicado para isolamento de dados por fazenda
- Tipagens TypeScript para todas as entidades em `lib/types/`

### Hooks & Data Fetching
- **Custom Hooks**: `useAuth()`, `useFazendaCoordinates()`, `useInsumos()`, `useMovimentacoes()`, `useCategorias()`, `useDestinos()`
- **Padrão**: Hooks retornam `{ data, isLoading, error }` (TanStack Query)
- **Server Services**: `lib/supabase/` contém funções para queries complexas
- **Server Actions**: `app/dashboard/*/actions.ts` para operações que precisam de validação no servidor

### Estrutura de Componentes
- **Page components**: `page.tsx` com estado de aplicação (Client Components)
- **Sub-components**: Componentes especializados em pastas `components/`
- **Dialogs**: Formulários modais em `components/dialogs/`
- **Tabs**: Navegação tabulada em `components/tabs/`
- **Padrão**: Props bem tipadas com TypeScript, sem any

### UI/UX
- Design system com **tokens de cor**:
  - Verde primário: `#00A651` (ações positivas)
  - Olive secundário: `#6B8E23` (contexto agrícola)
- **Componentes**: Card, Button, Dialog, Tabs, Badge, Skeleton
- **Animações**: Hover states sutis, transitions suaves
- **Feedback**: Toast notifications (Sonner) para ações
- **Navegação**: Breadcrumbs em páginas detalhadas
- **Responsividade**: Mobile-first com Tailwind CSS 4.1
- **Temas**: Suporte completo a dark/light mode

### PDF & Export
- Geração de PDF via `lib/pdf-export.ts` e específicos por módulo
- Tabelas exportáveis com formatação preservada
- Relatórios com branding consistente

### Integração com APIs Externas
- **Clima**: API de previsão integrada em `app/api/weather/route.ts`
- **Geocoding**: Geolocalização em `app/api/geocoding/route.ts`
- **Widgets**: Componentes reutilizáveis em `components/widgets/`

## Estrutura de Pastas

```
app/
├── api/                          # Rotas de API
│   ├── weather/                  # Previsão do tempo
│   └── geocoding/                # Geolocalização
├── dashboard/                    # Rotas autenticadas (protegidas)
│   ├── page.tsx                  # Dashboard principal
│   ├── layout.tsx                # Layout com Sidebar + Header
│   ├── silos/                    # Módulo de Silos
│   ├── talhoes/                  # Módulo de Talhões
│   ├── frota/                    # Módulo de Frota
│   ├── insumos/                  # Módulo de Insumos
│   ├── calculadoras/             # Calculadoras agronômicas
│   ├── planejamento-silagem/     # Planejamento de silagem
│   ├── calendario/               # Calendário agrícola
│   ├── previsao-tempo/           # Previsão do tempo
│   ├── financeiro/               # Módulo Financeiro
│   ├── relatorios/               # Relatórios
│   ├── assessoria/               # Assessoria (em breve)
│   ├── produtos/                 # Produtos (em breve)
│   ├── suporte/                  # Suporte e FAQ
│   ├── configuracoes/            # Configurações
│   └── onboarding/               # Onboarding
├── login/                        # Autenticação
├── register/
├── forgot-password/
└── page.tsx                      # Landing page pública

components/
├── ui/                           # shadcn/ui components
├── widgets/                      # Widgets reutilizáveis (Weather, etc)
├── Header.tsx                    # Cabeçalho com user menu
├── Sidebar.tsx                   # Menu lateral de navegação
├── Breadcrumbs.tsx               # Navegação por abas
└── CityAutocomplete.tsx          # Autocomplete de cidades

lib/
├── supabase/                     # Query builders e serviços Supabase
│   ├── silos.ts                  # Queries de silos
│   ├── talhoes.ts                # Queries de talhões
│   ├── maquinas.ts               # Queries de máquinas
│   ├── financeiro.ts             # Queries de financeiro
│   ├── fazenda.ts                # Queries de fazenda
│   ├── configuracoes.ts          # Queries de config
│   └── ...
├── calculadoras/                 # Lógica de calculadoras
│   ├── calagem.ts
│   ├── npk.ts
│   ├── fertilizantes.ts
│   └── smp-tabela.ts
├── pdf/                          # Geração de PDFs
├── hooks/                        # Custom hooks
│   ├── useAuth.ts                # Autenticação
│   ├── useInsumos.ts             # Insumos
│   ├── useMovimentacoes.ts       # Movimentações
│   └── ...
├── types/                        # Tipagens TypeScript
├── services/                     # Serviços (planejamento-silagem, etc)
├── db/                           # Sync local (PWA)
│   ├── localDb.ts
│   └── syncQueue.ts
├── auth/                         # Utilitários de auth
├── constants/                    # Constantes globais
├── utils.ts                      # Utilidades gerais
├── supabase.ts                   # Config Supabase
└── ...

types/
├── silos.ts                      # Tipos de Silos
├── talhoes.ts                    # Tipos de Talhões
├── maquinas.ts                   # Tipos de Máquinas
├── financeiro.ts                 # Tipos de Financeiro
└── ...
```

## Foco desta Análise
- Qualidade geral do código
- Bugs e comportamentos inesperados
- Boas práticas Next.js 15, React 19 e TypeScript 5.9
- Segurança nas chamadas ao Supabase (RLS, queries, validação)
- Performance (cache, otimização de queries, SSR vs Client)
- Padrões de integração com PWA e sincronização offline

## Padrões de Código

### Componentes React
- Sempre `'use client'` em componentes com estado ou efeitos colaterais
- Componentes de UI puros (shadcn/ui) podem ser RSC quando apropriado
- Tipagem: `React.FC` é opcional, prefira Props interface explícita
- Custom hooks devem retornar `{ data, isLoading, error }` quando async

### Query & Mutations
- Use TanStack Query (`@tanstack/react-query`) para estado async
- Server Actions para operações sensíveis (criação, atualização, deleção)
- Sempre validar dados no servidor antes de persistir
- Erros: Toast notification com Sonner para feedback ao usuário

### Formatação & Tipos
- **Moeda BRL**: `formatBRL(value)` helper em `lib/utils.ts`
- **Datas**: ISO string no banco, formatado no UI com `formatDate()`
- **Booleanos**: `__YES__` / `__NO__` para Supabase checkbox properties

### Validação
- Usar Zod para schemas de formulários (React Hook Form)
- Validação no cliente (UX) + validação no servidor (segurança)
- Mensagens de erro claras e em português

### Segurança
- RLS obrigatório em todas as tabelas autenticadas
- Queries devem filtrar por `fazenda_id` do usuário (multi-tenancy)
- Nunca fazer `select('*')` — listar colunas explicitamente
- Sanitizar entrada do usuário em APIs externas

## Regras — Nunca Faça
- ❌ Altere arquivos `.env` ou `.env.local`
- ❌ Altere `next.config.js`
- ❌ Altere `turbo.json` ou configurações de build
- ❌ Reescreva componentes inteiros sem ser pedido
- ❌ Remova espaços em branco ou refatore sem contexto
- ❌ Adicione features não requisitadas
- ❌ Delete dados em produção sem confirmação explícita
- ❌ Use `select('*')` em queries Supabase
- ❌ Ignore avisos de TypeScript ou ESLint

## Recursos Avançados

### PWA (Progressive Web App)
- **Offline-ready**: Sync local com `lib/db/localDb.ts`
- **Service Worker**: Suporte a modo offline para operações críticas
- **Sync Queue**: `lib/db/syncQueue.ts` para sincronização quando online
- Instável em Wi-Fi? Funciona em modo offline com dados em cache

### Temas & Aparência
- Dark mode / Light mode com `next-themes`
- Preferências persistidas no localStorage
- Configurável em Configurações

### Integrações
- **Weather API**: Previsão do tempo em tempo real
- **Geocoding**: Resolução de endereço → coordenadas (latitude/longitude)
- **PDF Export**: Relatórios com branding GestSilo

### Monitoramento & Logs
- `lib/auth/logger.ts`: Logging estruturado de eventos de auth
- Auditoria de operações críticas em `lib/supabase/queries-audit.ts`

## Comandos do Projeto
- **Dev**: `npm run dev` (acesso em `http://localhost:3000`)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Testes**: `npm run test` ou `npm run test:watch`
- **Limpar cache**: `npm run clean`
- **Type check**: `npm run type-check` (se disponível)
