# PRD — Módulo de Assessoria Agronômica

**Status**: Pesquisa Concluída
**Data**: 2026-05-20
**Última atualização**: 2026-05-20

---

## 1. Estado Atual

### O que Existe
- ✅ **Página de "Coming Soon"** (`app/dashboard/assessoria/page.tsx`)
  - Apresentação visual completa do módulo (mockup com design polido)
  - Banner `ComingSoonBanner` no topo indicando "Será lançada em breve no Plano Max"
  - Card premium com ícone lock mostrando acesso exclusivo para Plano Max
  - Preview visual de 2 funcionalidades principais
  - Fluxo de uso em 4 etapas documentado
  - Placeholder desabilitado para "Minhas Anotações"
- ✅ **Menu Sidebar** (seção "Sistema")
  - Item "Assessoria agronômica" com ícone `GraduationCap`
  - Badge "Em breve" visível
  - Posicionado em `sistemaRoutes` junto com Configurações e Suporte

### O que NÃO Existe
- ❌ **Tabelas no banco de dados**
  - Nenhuma tabela de anotações/notas
  - Nenhuma tabela de agendamentos
  - Nenhuma tabela de histórico de atendimentos
  - Não há tipos TypeScript gerados em `types/supabase.ts`
- ❌ **Queries Supabase** (`lib/supabase/assessoria.ts`)
- ❌ **Validações Zod** (`lib/validations/assessoria.ts`)
- ❌ **Types TypeScript** (`lib/types/assessoria.ts`)
- ❌ **Server Actions** (`app/dashboard/assessoria/actions.ts`)
- ❌ **Componentes Funcionais**
  - Sem modal/form para criar/editar anotações
  - Sem modal/form para agendar
  - Sem lista/tabela de anotações
  - Sem lista/tabela de agendamentos
  - Sem componentes de visualização de histórico
- ❌ **Autenticação/Autorização**
  - Sem proteção de acesso via RLS no banco
  - Sem validação de "Plano Max" no frontend
  - Sem verificação de perfil (Admin-only, Operador, Visualizador)

---

## 2. Visão Geral Técnica

### Conceito
O módulo deve permitir que produtores:
1. Registrem dúvidas e observações ao longo da semana em um **Bloco de Notas**
2. Agendem sessões/visitas com assessores em uma **Agenda com o Assessor**
3. Consultem histórico de atendimentos anteriores
4. Mantenham rastreabilidade das orientações recebidas

### Características
- **Sem integração com outros módulos** (silos, rebanho, insumos, financeiro, etc.)
- **Multi-tenant via `fazenda_id`** (padrão do projeto)
- **RLS obrigatório** em todas as tabelas autenticadas
- **Acesso restrito**: futuramente validar se usuário está no "Plano Max" (por enquanto, qualquer Administrador acessa)
- **Histórico completo**: soft-delete para anotações e agendamentos

---

## 3. Estrutura de Dados (Banco de Dados)

### Tabela: `anotacoes_assessoria`

```sql
CREATE TABLE anotacoes_assessoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  categoria VARCHAR(100), -- 'duvida', 'observacao_campo', 'sugestao', 'outro'
  prioridade VARCHAR(50) DEFAULT 'normal', -- 'baixa', 'normal', 'alta', 'urgente'
  resolvida BOOLEAN DEFAULT FALSE,
  data_resolvida TIMESTAMP NULL,
  assessor_resposta TEXT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- RLS: usuários só veem anotações da própria fazenda
ALTER TABLE anotacoes_assessoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem anotações da própria fazenda"
  ON anotacoes_assessoria
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY "Admins criam/atualizam anotações da própria fazenda"
  ON anotacoes_assessoria
  FOR INSERT
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "Admins atualizam anotações da própria fazenda"
  ON anotacoes_assessoria
  FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "Admins deletam (soft) anotações da própria fazenda"
  ON anotacoes_assessoria
  FOR DELETE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

-- Índices
CREATE INDEX idx_anotacoes_assessoria_fazenda_id ON anotacoes_assessoria(fazenda_id);
CREATE INDEX idx_anotacoes_assessoria_created_at ON anotacoes_assessoria(created_at DESC);
CREATE INDEX idx_anotacoes_assessoria_resolvida ON anotacoes_assessoria(resolvida);
```

### Tabela: `agendamentos_assessor`

```sql
CREATE TABLE agendamentos_assessor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'visita_tecnica', 'reuniao_video', 'chamada_telefone', 'outro'
  descricao TEXT NULL,
  data_agendada TIMESTAMP NOT NULL,
  duracao_minutos INTEGER DEFAULT 60,
  local_endereco VARCHAR(500) NULL, -- para visitas presenciais
  link_reuniao VARCHAR(500) NULL, -- para reuniões remotas
  status VARCHAR(50) DEFAULT 'agendado', -- 'agendado', 'confirmado', 'realizado', 'cancelado', 'remarcado'
  observacoes TEXT NULL,
  anotacoes_relacionadas UUID[] DEFAULT '{}', -- array de IDs de anotacoes_assessoria
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- RLS
ALTER TABLE agendamentos_assessor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem agendamentos da própria fazenda"
  ON agendamentos_assessor
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY "Admins criam agendamentos da própria fazenda"
  ON agendamentos_assessor
  FOR INSERT
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "Admins atualizam agendamentos da própria fazenda"
  ON agendamentos_assessor
  FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "Admins deletam (soft) agendamentos da própria fazenda"
  ON agendamentos_assessor
  FOR DELETE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

-- Índices
CREATE INDEX idx_agendamentos_assessor_fazenda_id ON agendamentos_assessor(fazenda_id);
CREATE INDEX idx_agendamentos_assessor_data_agendada ON agendamentos_assessor(data_agendada);
CREATE INDEX idx_agendamentos_assessor_status ON agendamentos_assessor(status);
```

### Tabela: `historico_atendimentos`

```sql
CREATE TABLE historico_atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES agendamentos_assessor(id) ON DELETE SET NULL,
  titulo VARCHAR(255) NOT NULL,
  resumo TEXT NOT NULL,
  orientacoes_recebidas TEXT NULL,
  proximos_passos TEXT NULL,
  data_atendimento TIMESTAMP NOT NULL,
  assessor_nome VARCHAR(255) NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- RLS
ALTER TABLE historico_atendimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem histórico da própria fazenda"
  ON historico_atendimentos
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY "Admins criam histórico da própria fazenda"
  ON historico_atendimentos
  FOR INSERT
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "Admins atualizam histórico da própria fazenda"
  ON historico_atendimentos
  FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

-- Índices
CREATE INDEX idx_historico_atendimentos_fazenda_id ON historico_atendimentos(fazenda_id);
CREATE INDEX idx_historico_atendimentos_data_atendimento ON historico_atendimentos(data_atendimento DESC);
```

---

## 4. Permissões por Perfil

| Ação | Admin | Operador | Visualizador |
|---|---|---|---|
| **Anotações** — Visualizar | ✅ | ❌ | ✅ (somente leitura) |
| **Anotações** — Criar | ✅ | ❌ | ❌ |
| **Anotações** — Editar | ✅ | ❌ | ❌ |
| **Anotações** — Deletar | ✅ | ❌ | ❌ |
| **Anotações** — Marcar como Resolvida | ✅ | ❌ | ❌ |
| **Agendamentos** — Visualizar | ✅ | ❌ | ✅ (somente leitura) |
| **Agendamentos** — Criar | ✅ | ❌ | ❌ |
| **Agendamentos** — Editar | ✅ | ❌ | ❌ |
| **Agendamentos** — Cancelar | ✅ | ❌ | ❌ |
| **Histórico** — Visualizar | ✅ | ❌ | ✅ (somente leitura) |
| **Histórico** — Criar | ✅ | ❌ | ❌ |

---

## 5. Fluxo de Trabalho Esperado

```
┌─────────────────────────────────────────────────────┐
│ BLOCO DE NOTAS (Anotações Assessoria)               │
│─────────────────────────────────────────────────────│
│ 1. Usuário registra dúvida/observação ao longo      │
│    da semana (campo livre + categoria + prioridade) │
│ 2. Botões: Criar, Editar, Deletar, Marcar como     │
│    Resolvida                                        │
│ 3. Lista com filtros por categoria/prioridade/      │
│    status resolvida                                 │
│ 4. Campo "Resposta do Assessor" preenchido na      │
│    próxima visita técnica                          │
└─────────────────────────────────────────────────────┘
             ↓↓↓
┌─────────────────────────────────────────────────────┐
│ AGENDA COM O ASSESSOR (Agendamentos)                │
│─────────────────────────────────────────────────────│
│ 1. Usuário clica em "Agendar Sessão"               │
│ 2. Modal com:                                       │
│    - Tipo: visita técnica / reunião vídeo /        │
│      chamada telefone / outro                      │
│    - Data/Hora (calendar picker + time input)      │
│    - Local (para visitas) OU Link (para remotas)   │
│    - Vincular anotações (multiselect checkbox)     │
│ 3. Confirmação + lembrete automático               │
│ 4. Após atendimento: criar registro em             │
│    "Histórico de Atendimentos"                     │
└─────────────────────────────────────────────────────┘
             ↓↓↓
┌─────────────────────────────────────────────────────┐
│ HISTÓRICO DE ATENDIMENTOS                           │
│─────────────────────────────────────────────────────│
│ 1. Card com data, tipo, título, resumo             │
│ 2. Seção expansível com orientações recebidas      │
│ 3. Próximos passos sugeridos                       │
│ 4. Exportar resumo em PDF (futuro)                 │
└─────────────────────────────────────────────────────┘
```

---

## 6. Componentes a Implementar

### Estrutura de Diretório
```
app/dashboard/assessoria/
├── page.tsx                    # Página principal (composição)
├── layout.tsx                  # Guard: apenas Admin acessa
├── actions.ts                  # 8-10 Server Actions
└── components/
    ├── BlocoNotasSection.tsx   # Seção principal de anotações
    ├── AnotacaoForm.tsx        # Modal criar/editar anotação
    ├── AnotacoesList.tsx       # Tabela de anotações
    ├── AnotacoesFilters.tsx    # Filtros categoria/prioridade/status
    ├── AgendaSection.tsx       # Seção de agendamentos
    ├── AgendamentoForm.tsx     # Modal criar/editar agendamento
    ├── AgendamentosList.tsx    # Tabela/Calendario de agendamentos
    ├── HistoricoAtendimentos.tsx # Card list histórico
    ├── DeleteAnotacaoDialog.tsx  # Confirm delete
    └── DeleteAgendamentoDialog.tsx # Confirm delete
```

### Componentes Detalhados

#### **BlocoNotasSection.tsx**
- Card container com aba "Minhas Anotações"
- Botão "Nova Anotação" → abre `AnotacaoForm.tsx`
- Componente `AnotacoesFilters.tsx` (categoria, prioridade, status)
- Componente `AnotacoesList.tsx` (tabela responsiva)
- Coluna de ações: Editar, Deletar, Marcar Resolvida

#### **AnotacaoForm.tsx**
- Modal (create + edit mode)
- Campos:
  - `titulo` (text input, required)
  - `conteudo` (textarea, required)
  - `categoria` (select: dúvida, observação campo, sugestão, outro)
  - `prioridade` (radio: baixa, normal, alta, urgente)
- Validação com Zod
- Toast de sucesso/erro

#### **AnotacoesList.tsx**
- Tabela com colunas: Data, Título, Categoria, Prioridade, Status, Ações
- Paginação ou scroll infinito (máx 10 por página)
- Linha para anotação resolvida: cor muted + strikethrough
- Click na linha → abre detalhe ou expande resposta do assessor

#### **AgendaSection.tsx**
- 2 abas: "Agenda Mês" (calendar view) + "Próximos Agendamentos" (lista)
- Botão "Agendar Sessão" → abre `AgendamentoForm.tsx`
- Exibe agendamentos por status (agendado, confirmado, realizado, cancelado)

#### **AgendamentoForm.tsx**
- Modal (create + edit mode)
- Campos:
  - `titulo` (text input, required)
  - `tipo` (select: visita técnica, reunião vídeo, chamada telefone, outro)
  - `data_agendada` (date + time picker, required)
  - `duracao_minutos` (number input, default 60)
  - `local_endereco` (text input, visible se tipo = "visita_tecnica")
  - `link_reuniao` (text input, visible se tipo = "reuniao_video")
  - `anotacoes_relacionadas` (multiselect checkboxes — lista anotações abertas)
  - `descricao` (textarea, optional)
- Validação com Zod
- Toast de sucesso/erro

#### **AgendamentosList.tsx**
- Tabela com colunas: Data/Hora, Tipo, Status, Ações
- Filtro por status (botões: Todos, Agendado, Confirmado, Realizado, Cancelado)
- Click na linha → modal detalhe com opções: Editar, Cancelar, Marcar como Realizado
- Badge de status colorida

#### **HistoricoAtendimentos.tsx**
- Timeline/Card list de atendimentos passados
- Cada card exibe:
  - Data do atendimento
  - Tipo de sessão
  - Título/Resumo
  - Orientações recebidas (collapsible)
  - Próximos passos
  - Assessor (nome, opcional)
- Botão "Detalhes" → página detalhe ou modal
- Botão "Exportar PDF" (futuro)

---

## 7. Server Actions (`actions.ts`)

1. **`criarAnotacaoAction`** → INSERT
2. **`atualizarAnotacaoAction`** → UPDATE
3. **`deletarAnotacaoAction`** → UPDATE (deleted_at = NOW)
4. **`marcarAnotacaoResolvidaAction`** → UPDATE (resolvida, data_resolvida)
5. **`criarAgendamentoAction`** → INSERT
6. **`atualizarAgendamentoAction`** → UPDATE
7. **`deletarAgendamentoAction`** → UPDATE (deleted_at = NOW)
8. **`criarHistoricoAtendimentoAction`** → INSERT (geralmente pelo assessor)
9. **`atualizarAgendamentoStatusAction`** → UPDATE (status: realizado, cancelado, confirmado)

---

## 8. Sidebar — Mudança de Posição

**Antes (Sistema)**:
```
Sistema
├── Configurações
├── Suporte
└── Assessoria agronômica (Em breve) ← AQUI
```

**Depois (Ferramentas)**:
```
Ferramentas
├── Plan. Silagem
├── Calculadoras
└── Assessoria agronômica (Em breve) ← AQUI
```

**Mudança no código** (`components/Sidebar.tsx`):
- Remover de `sistemaRoutes`
- Adicionar a `ferramentasRoutes`

---

## 9. Validações Zod (`lib/validations/assessoria.ts`)

```typescript
// Anotação
export const anotacaoFormSchema = z.object({
  titulo: z.string().min(5, 'Mínimo 5 caracteres').max(255),
  conteudo: z.string().min(10, 'Mínimo 10 caracteres'),
  categoria: z.enum(['duvida', 'observacao_campo', 'sugestao', 'outro']),
  prioridade: z.enum(['baixa', 'normal', 'alta', 'urgente']).default('normal'),
});

// Agendamento
export const agendamentoFormSchema = z.object({
  titulo: z.string().min(5).max(255),
  tipo: z.enum(['visita_tecnica', 'reuniao_video', 'chamada_telefone', 'outro']),
  data_agendada: z.coerce.date(),
  duracao_minutos: z.number().min(15).max(480).default(60),
  local_endereco: z.string().optional(),
  link_reuniao: z.string().url().optional(),
  descricao: z.string().optional(),
  anotacoes_relacionadas: z.array(z.string()).optional(),
}).refine(
  (data) => {
    if (data.tipo === 'visita_tecnica') return !!data.local_endereco;
    if (data.tipo === 'reuniao_video') return !!data.link_reuniao;
    return true;
  },
  { message: 'Preenchimento obrigatório conforme o tipo' }
);

// Histórico
export const historicoAtendimentoSchema = z.object({
  titulo: z.string().min(5).max(255),
  resumo: z.string().min(10),
  orientacoes_recebidas: z.string().optional(),
  proximos_passos: z.string().optional(),
  assessor_nome: z.string().optional(),
  data_atendimento: z.coerce.date(),
});
```

---

## 10. Queries Supabase (`lib/supabase/assessoria.ts`)

```typescript
// Anotações
export const queryAnotacoes = {
  list: (fazendaId: string) => { /* ... */ },
  getById: (id: string) => { /* ... */ },
  create: (payload) => { /* ... */ },
  update: (id: string, payload) => { /* ... */ },
  delete: (id: string) => { /* ... */ },
};

// Agendamentos
export const queryAgendamentos = {
  list: (fazendaId: string) => { /* ... */ },
  getById: (id: string) => { /* ... */ },
  create: (payload) => { /* ... */ },
  update: (id: string, payload) => { /* ... */ },
  delete: (id: string) => { /* ... */ },
};

// Histórico
export const queryHistoricoAtendimentos = {
  list: (fazendaId: string) => { /* ... */ },
  getById: (id: string) => { /* ... */ },
  create: (payload) => { /* ... */ },
};
```

---

## 11. Layout Guard (`app/dashboard/assessoria/layout.tsx`)

```typescript
// Redireciona se não for Admin (por enquanto)
// Futuramente: verificar se usuario está no Plano Max
if (profile?.perfil !== 'Administrador') {
  redirect('/dashboard');
}
```

---

## 12. Checklist de Implementação

### Fase 1: Banco de Dados
- [ ] Criar 3 tabelas (`anotacoes_assessoria`, `agendamentos_assessor`, `historico_atendimentos`)
- [ ] Adicionar RLS + policies
- [ ] Adicionar índices
- [ ] Gerar types: `npm run db:types`

### Fase 2: Backend (Queries + Validações)
- [ ] Criar `lib/validations/assessoria.ts` com 3 schemas
- [ ] Criar `lib/types/assessoria.ts` com tipos das tabelas
- [ ] Criar `lib/supabase/assessoria.ts` com queries CRUD
- [ ] Criar `app/dashboard/assessoria/actions.ts` com 9 Server Actions

### Fase 3: UI (Componentes + Page)
- [ ] Remover de `sistemaRoutes`, adicionar a `ferramentasRoutes` em Sidebar
- [ ] Criar `app/dashboard/assessoria/layout.tsx` (guard)
- [ ] Criar 10 componentes em `app/dashboard/assessoria/components/`
- [ ] Atualizar `app/dashboard/assessoria/page.tsx` (remover Coming Soon, implementar interface funcional)

### Fase 4: Testes
- [ ] Testes unitários validações Zod
- [ ] Testes de queries RLS
- [ ] Testes e2e fluxos principais (criar anotação → agendar → marcar resolvido)

---

## 13. Observações Importantes

1. **Sem integração**: Este módulo é autossuficiente; não cria entrada em `financeiro`, `insumos`, `rebanho`, etc.

2. **Acesso futuro**: Hoje qualquer Admin acessa. Quando Plano Max for implementado, adicionar verificação no layout/page.

3. **Soft-delete**: Ambas as tabelas usam `deleted_at` para manter histórico.

4. **Assessor nome**: Campo `assessor_nome` é apenas textual (não há tabela de assessores/usuários no banco ainda).

5. **Reminders**: Funcionalidade de lembretes (1 dia antes do agendamento) é futura — será implementada via Cron Jobs do Supabase ou integração com e-mail/SMS.

6. **Sidebar**: Modificação mínima — mover apenas a linha de Assessoria da seção "Sistema" para "Ferramentas".

---

## 14. Próximas Etapas

1. **Validação desta PRD** com o time/product
2. **Criação das tabelas no banco** (migration Supabase)
3. **Implementação em ordem**: Banco → Queries → Componentes → Tests
4. **Deploy**: via Vercel + GitHub Actions (backup automático já configurado)

