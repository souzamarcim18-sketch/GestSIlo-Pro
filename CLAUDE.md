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

### Dashboard Principal
- **Cards de resumo**: Ocupação de silos, área em cultivo, frota em operação, saldo financeiro
- **Atividades recentes**: Log de movimentações principais
- **Alertas críticos**: Manutenções pendentes, problemas operacionais
- **Saudação dinâmica**: Mensagem personalizada com hora do dia

### Módulos de Gestão

#### 🌾 **Silos & Estoque** (Silagem)
- Cadastro e monitoramento de silos de **silagem** (forragem fermentada) por fazenda
- Controle de capacidade e estoque atual da silagem
- Movimentação de entrada/saída de silagem
- **Abas especializadas**: Visão geral, estoque detalhado, qualidade bromatológica
- Avaliação de qualidade: Análise bromatológica e PSPS (determinantes de valor nutritivo da silagem)

#### 🗺️ **Talhões**
- Gestão de áreas de cultivo (mapeamento)
- Histórico de plantio e produtividade
- Registro de culturas por talhão

#### 🚜 **Frota & Maquinário**
- Cadastro de máquinas e equipamentos
- Controle de manutenções (preventiva e corretiva)
- Agendamento de manutenções
- Rastreamento de horas trabalhadas

#### 📊 **Financeiro**
- Registro de receitas e despesas
- DRE (Demonstração de Resultado do Exercício)
- Fluxo de caixa mensal
- Formatação em BRL com cálculos automáticos

#### 🐄 **Rebanho**
- Cadastro e gestão do rebanho (estrutura implementada)

#### 🧪 **Insumos**
- Gestão de insumos agrícolas (estrutura implementada)

#### 📈 **Relatórios**
- Geração de relatórios consolidados por período
- Export de dados

#### 🔢 **Calculadoras**
- Ferramentas de cálculo agrícola (estrutura implementada)

#### ⚙️ **Simulador**
- Simulações de cenários agrícolas (estrutura implementada)

#### 🎯 **Configurações**
- Perfil do usuário
- Preferências da fazenda
- Temas e notificações

### Onboarding
- Fluxo guiado para novos usuários
- Setup inicial de fazenda e silos

### Autenticação & Autorização
- Sistema de roles: Admin, Operador
- Login com email/password (Supabase Auth)
- Recuperação de senha
- Persistência de sessão (SSR-safe)
- Redirect automático baseado em perfil

## Padrões & Convenções

### Autenticação
- Hook `useAuth()` centraliza lógica de autenticação
- Componentes protegidos com redirect automático
- Context de User via Supabase

### Banco de Dados
- Tabelas principais: `silos`, `talhoes`, `maquinas`, `financeiro`, `profiles`, `fazendas`
- Foreign keys para relações 1:N
- Queries otimizadas com `.select()` específico (não `select('*')`)
- RLS (Row Level Security) aplicado para isolamento de dados por fazenda

### UI/UX
- Design system com tokens de cor (verde #00A651, olive #6B8E23)
- Cards com hover states e animações sutis
- Skeleton loaders para dados assíncronos
- Toast notifications (Sonner) para feedback
- Navegação por breadcrumbs onde aplicável

## Foco desta Análise
- Qualidade geral do código
- Bugs e comportamentos inesperados
- Boas práticas Next.js, React 19 e Typescript
- Segurança nas chamadas ao Supabase (RLS, queries)
- Performance (cache, otimização de queries)

## Regras — Nunca Faça
- ❌ Altere arquivos `.env` ou `.env.local`
- ❌ Altere `next.config.js`
- ❌ Reescreva componentes inteiros sem ser pedido
- ❌ Remova espaços em branco ou refatore sem contexto
- ❌ Adicione features não requisitadas

## Comandos do Projeto
- Rodar local: `npm run dev` (acesso em `http://localhost:3000`)
- Build: `npm run build`
- Lint: `npm run lint`
- Testes: `npm run test` ou `npm run test:watch`
- Limpar cache: `npm run clean`
