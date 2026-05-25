# SPEC — Módulo de Assessoria Agronômica (v2)
## Especificação Técnica de Implementação — Fluxo de Agenda Compartilhada

**Data**: 2026-05-20 (Atualizado)  
**Status**: Pronto para Implementação  
**Baseado em**: PRD-assessoria.md + Refinamento de Requisitos  

---

## 📋 Visão Geral

**Novo Fluxo de Agendamento com Link Mágico**:
1. **Usuário (Admin da fazenda)** visualiza agenda e escolhe 1 horário disponível
2. **Sistema cria solicitação** e envia email para `gestsilo.app@gmail.com`
3. **Email contém link mágico** (JWT com validade 24h) para:
   - ✅ Confirmar agendamento
   - ❌ Recusar com motivo
   - 🔄 Sugerir remarcação
4. **Consultor clica link** → acessa página pública (sem login) e confirma/recusa
5. **Usuário vê status atualizado** em tempo real

**Características**:
- ✅ Consultor sem login (link mágico por email)
- ✅ Horários pré-configurados pelo admin (tabela pública)
- ✅ Notificações por email para ambos
- ✅ Soft-delete em todas as tabelas
- ✅ RLS simples (sem perfil "Consultor")

---

## 🗄️ FASE 1: BANCO DE DADOS (Supabase)

### ⚠️ Decisões de Arquitetura

**Tabelas necessárias** (3 totais):
1. `anotacoes_assessoria` — Bloco de Notas (sem mudanças vs. PRD)
2. `horarios_disponiveis_consultor` — Agenda do Consultor (NOVA)
3. `agendamentos_usuario` — Solicitação de Agendamento (renomeado de `agendamentos_assessor`)

**Gerenciamento de Horários do Consultor** (TODO futura):
- Por enquanto: consultores configuram via SQL ou painel admin (a ser criado)
- Futuro: formulário no painel "Meus Horários" no module Assessoria

---

### 1.1 Migration SQL

**Arquivo**: `supabase/migrations/[TIMESTAMP]_create_assessoria_tables.sql`

```sql
-- ============================================================
-- TABELA: anotacoes_assessoria
-- ============================================================
CREATE TABLE IF NOT EXISTS anotacoes_assessoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  categoria VARCHAR(100) DEFAULT 'outro',
  prioridade VARCHAR(50) DEFAULT 'normal',
  resolvida BOOLEAN DEFAULT FALSE,
  data_resolvida TIMESTAMP NULL,
  assessor_resposta TEXT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT chk_anotacao_categoria CHECK (categoria IN ('duvida', 'observacao_campo', 'sugestao', 'outro')),
  CONSTRAINT chk_anotacao_prioridade CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente'))
);

ALTER TABLE anotacoes_assessoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem anotações da própria fazenda"
  ON anotacoes_assessoria
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id() AND deleted_at IS NULL);

CREATE POLICY "Admins criam anotações da própria fazenda"
  ON anotacoes_assessoria
  FOR INSERT
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "Admins atualizam anotações da própria fazenda"
  ON anotacoes_assessoria
  FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin())
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "Admins deletam anotações da própria fazenda"
  ON anotacoes_assessoria
  FOR DELETE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE INDEX idx_anotacoes_assessoria_fazenda_id ON anotacoes_assessoria(fazenda_id);
CREATE INDEX idx_anotacoes_assessoria_created_at ON anotacoes_assessoria(created_at DESC);
CREATE INDEX idx_anotacoes_assessoria_resolvida ON anotacoes_assessoria(resolvida);
CREATE INDEX idx_anotacoes_assessoria_deleted_at ON anotacoes_assessoria(deleted_at);

-- ============================================================
-- TABELA: horarios_disponiveis_consultor
-- ============================================================
-- Compartilhada entre todos os consultores
-- Cada linha = 1 slot de 1 hora disponível
CREATE TABLE IF NOT EXISTS horarios_disponiveis_consultor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_hora TIMESTAMP NOT NULL,
  duracao_minutos INTEGER DEFAULT 60,
  disponivel BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(consultor_id, data_hora)
);

ALTER TABLE horarios_disponiveis_consultor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer usuário vê horários disponíveis"
  ON horarios_disponiveis_consultor
  FOR SELECT
  USING (disponivel = TRUE);

CREATE POLICY "Apenas consultores criam seus horários"
  ON horarios_disponiveis_consultor
  FOR INSERT
  WITH CHECK (consultor_id = auth.uid());

CREATE POLICY "Apenas consultores atualizam seus horários"
  ON horarios_disponiveis_consultor
  FOR UPDATE
  USING (consultor_id = auth.uid())
  WITH CHECK (consultor_id = auth.uid());

CREATE INDEX idx_horarios_consultor_id ON horarios_disponiveis_consultor(consultor_id);
CREATE INDEX idx_horarios_data_hora ON horarios_disponiveis_consultor(data_hora);
CREATE INDEX idx_horarios_disponivel ON horarios_disponiveis_consultor(disponivel);

-- ============================================================
-- TABELA: agendamentos_usuario
-- ============================================================
-- Fluxo: usuário escolhe horário → cria solicitação → consultor confirma
CREATE TABLE IF NOT EXISTS agendamentos_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  consultor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horario_disponivel_id UUID NOT NULL REFERENCES horarios_disponiveis_consultor(id) ON DELETE CASCADE,
  
  tipo VARCHAR(50) NOT NULL,
  data_agendada TIMESTAMP NOT NULL,
  duracao_minutos INTEGER DEFAULT 60,
  
  link_reuniao VARCHAR(500) NULL,
  observacoes TEXT NULL,
  
  status VARCHAR(50) DEFAULT 'solicitado',
  motivo_recusa TEXT NULL,
  sugestao_nova_data TIMESTAMP NULL,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT chk_agendamento_tipo CHECK (tipo IN ('reuniao_video', 'chamada_telefone')),
  CONSTRAINT chk_agendamento_status CHECK (status IN ('solicitado', 'confirmado', 'recusado', 'remarcado', 'cancelado', 'concluido')),
  CONSTRAINT chk_futuro CHECK (data_agendada > NOW())
);

ALTER TABLE agendamentos_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem seus agendamentos"
  ON agendamentos_usuario
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id() AND deleted_at IS NULL);

CREATE POLICY "Consultores veem agendamentos solicitados para eles"
  ON agendamentos_usuario
  FOR SELECT
  USING (consultor_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Admins criam solicitações"
  ON agendamentos_usuario
  FOR INSERT
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "Admins atualizam sua solicitação"
  ON agendamentos_usuario
  FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin())
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "Consultores atualizam status"
  ON agendamentos_usuario
  FOR UPDATE
  USING (consultor_id = auth.uid())
  WITH CHECK (consultor_id = auth.uid());

CREATE INDEX idx_agendamentos_usuario_fazenda_id ON agendamentos_usuario(fazenda_id);
CREATE INDEX idx_agendamentos_usuario_consultor_id ON agendamentos_usuario(consultor_id);
CREATE INDEX idx_agendamentos_usuario_data_agendada ON agendamentos_usuario(data_agendada);
CREATE INDEX idx_agendamentos_usuario_status ON agendamentos_usuario(status);
CREATE INDEX idx_agendamentos_usuario_deleted_at ON agendamentos_usuario(deleted_at);

-- ============================================================
-- TABELA: historico_atendimentos
-- ============================================================
CREATE TABLE IF NOT EXISTS historico_atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES agendamentos_usuario(id) ON DELETE SET NULL,
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

ALTER TABLE historico_atendimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem histórico da própria fazenda"
  ON historico_atendimentos
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id() AND deleted_at IS NULL);

CREATE POLICY "Admins criam histórico"
  ON historico_atendimentos
  FOR INSERT
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "Admins atualizam histórico"
  ON historico_atendimentos
  FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin())
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE INDEX idx_historico_atendimentos_fazenda_id ON historico_atendimentos(fazenda_id);
CREATE INDEX idx_historico_atendimentos_data_atendimento ON historico_atendimentos(data_atendimento DESC);
CREATE INDEX idx_historico_atendimentos_deleted_at ON historico_atendimentos(deleted_at);
```

**Passo-a-passo**:
1. Abrir Supabase Dashboard → SQL Editor
2. Criar nova query
3. Copiar SQL acima
4. Executar
5. Confirmar 4 tabelas criadas
6. Rodar `npm run db:types`

---

## 🔄 Fluxo Detalhado de Agendamento com Link Mágico

```
┌──────────────────────────────────────────────────────┐
│ PASSO 1: Admin Configura Horários do Consultor     │
│──────────────────────────────────────────────────────│
│ Método: SQL ou painel admin (Futuro)               │
│ Tabela: horarios_disponiveis_consultor             │
│ Exemplo: 2026-05-25 09:00, 10:00, 14:00, etc.     │
│ Quem vê: Público (disponivel = TRUE)               │
└──────────────────────────────────────────────────────┘
               ↓↓↓
┌──────────────────────────────────────────────────────┐
│ PASSO 2: Usuário Visualiza Agenda e Escolhe Slot   │
│──────────────────────────────────────────────────────│
│ Page: /dashboard/assessoria                        │
│ Componente: CalendarioAgendamento.tsx              │
│ Exibe: Horários públicos em grid                   │
│ Ações: Clica → abre AgendamentoForm                │
└──────────────────────────────────────────────────────┘
               ↓↓↓
┌──────────────────────────────────────────────────────┐
│ PASSO 3: Usuário Cria Solicitação + Tipo           │
│──────────────────────────────────────────────────────│
│ Form: tipo (vídeo/telefone), observações           │
│ Action: criarAgendamentoAction()                   │
│ Resultado: INSERT agendamentos_usuario             │
│ Status: 'solicitado'                               │
└──────────────────────────────────────────────────────┘
               ↓↓↓
┌──────────────────────────────────────────────────────┐
│ PASSO 4: Sistema Gera Link Mágico + Envia Email   │
│──────────────────────────────────────────────────────│
│ Acionador: criarAgendamentoAction() → enviarEmail()│
│ Link: /assessor/confirmar/[TOKEN]?agendamento=[id]│
│       (JWT válido por 24h)                         │
│ Email para: gestsilo.app@gmail.com                │
│ Conteúdo:                                          │
│   - Data/Hora: 2026-05-25 09:00                   │
│   - Fazenda: [nome da fazenda]                    │
│   - Tipo: Reunião por Vídeo                       │
│   - Botão "✅ Confirmar" (link)                    │
│   - Botão "❌ Recusar" (link)                      │
│   - Link "🔄 Sugerir Nova Data" (link)            │
└──────────────────────────────────────────────────────┘
               ↓↓↓
┌──────────────────────────────────────────────────────┐
│ PASSO 5: Consultor Clica Link no Email            │
│──────────────────────────────────────────────────────│
│ URL: /assessor/confirmar/[TOKEN]?agendamento=[id]│
│ Página: Pública (sem login)                        │
│ Validação: Verifica TOKEN (JWT) e agendamento_id  │
│ Se válido → mostra form para confirmar/recusar    │
│ Se inválido → "Link expirado"                     │
└──────────────────────────────────────────────────────┘
               ↓↓↓
┌──────────────────────────────────────────────────────┐
│ PASSO 6: Consultor Confirma/Recusa/Remarca       │
│──────────────────────────────────────────────────────│
│ Opção A: "Confirmar" → atualizaStatusAction()      │
│          Status: 'confirmado'                      │
│          disponivel = FALSE (slot ocupado)         │
│          Email: "Confirmado! Você está na agenda" │
│                                                    │
│ Opção B: "Recusar" → atualizaStatusAction()        │
│          Status: 'recusado'                        │
│          motivo_recusa: '[texto digitado]'         │
│          disponivel = TRUE (slot liberado)         │
│          Email: "Recusado. Motivo: ..."            │
│                                                    │
│ Opção C: "Remarcar" → atualizaStatusAction()       │
│          Status: 'remarcado'                       │
│          sugestao_nova_data: [TIMESTAMP]           │
│          disponivel = TRUE (libera slot original)  │
│          Email: "Remarcado para: 2026-05-26 14:00"│
└──────────────────────────────────────────────────────┘
               ↓↓↓
┌──────────────────────────────────────────────────────┐
│ PASSO 7: Usuário Vê Status Atualizado (Real-time)│
│──────────────────────────────────────────────────────│
│ Page: /dashboard/assessoria                        │
│ Componente: AgendamentosConfirmadosSection         │
│ Exibe: Status com ícone (✅/❌/🔄)                 │
│ Auto-refresh: Polling ou WebSocket (futuro)       │
│ Ações: Se remarcado → novo form para escolher slot│
└──────────────────────────────────────────────────────┘
```

**Email para Consultor** (exemplo):

```
Subject: Solicitação de Agendamento - Fazenda XYZ

Olá!

Uma fazenda solicitou uma reunião com você.

📅 Data/Hora: 25 de maio de 2026, 09:00
🏠 Fazenda: Fazenda XYZ
👤 Responsável: João da Silva
📹 Tipo: Reunião por Vídeo
📝 Observações: Gostaria de discutir adubação de silos

AÇÕES:
[✅ Confirmar](https://gestsilo.com/assessor/confirmar/TOKEN?id=...)
[❌ Recusar](https://gestsilo.com/assessor/confirmar/TOKEN?id=...&action=refuse)
[🔄 Remarcar](https://gestsilo.com/assessor/confirmar/TOKEN?id=...&action=reschedule)

Obrigado!
GestSilo Team
```

---

## 📦 FASE 2: BACKEND

### 2.1 Criar `lib/types/assessoria.ts`

```typescript
/**
 * Tipos para o módulo de Assessoria Agronômica (v2)
 */

export type CategoriaAnotacao = 'duvida' | 'observacao_campo' | 'sugestao' | 'outro';
export type PrioridadeAnotacao = 'baixa' | 'normal' | 'alta' | 'urgente';
export type TipoAgendamento = 'reuniao_video' | 'chamada_telefone';
export type StatusAgendamento = 'solicitado' | 'confirmado' | 'recusado' | 'remarcado' | 'cancelado' | 'concluido';

// Anotações
export interface AnotacaoAssessoria {
  id: string;
  fazenda_id: string;
  titulo: string;
  conteudo: string;
  categoria: CategoriaAnotacao;
  prioridade: PrioridadeAnotacao;
  resolvida: boolean;
  data_resolvida: string | null;
  assessor_resposta: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Horários Disponíveis do Consultor
export interface HorarioDisponivel {
  id: string;
  consultor_id: string;
  data_hora: string;
  duracao_minutos: number;
  disponivel: boolean;
  created_at: string;
  updated_at: string;
}

// Agendamento do Usuário (Solicitação)
export interface AgendamentoUsuario {
  id: string;
  fazenda_id: string;
  consultor_id: string;
  horario_disponivel_id: string;
  tipo: TipoAgendamento;
  data_agendada: string;
  duracao_minutos: number;
  link_reuniao: string | null;
  observacoes: string | null;
  status: StatusAgendamento;
  motivo_recusa: string | null;
  sugestao_nova_data: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Histórico de Atendimentos
export interface HistoricoAtendimento {
  id: string;
  fazenda_id: string;
  agendamento_id: string | null;
  titulo: string;
  resumo: string;
  orientacoes_recebidas: string | null;
  proximos_passos: string | null;
  data_atendimento: string;
  assessor_nome: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
```

### 2.2 Criar `lib/validations/assessoria.ts`

```typescript
import { z } from 'zod';

// Anotação
export const anotacaoFormSchema = z.object({
  titulo: z.string()
    .min(5, 'Título deve ter no mínimo 5 caracteres')
    .max(255),
  conteudo: z.string()
    .min(10, 'Mínimo 10 caracteres')
    .max(5000),
  categoria: z.enum(['duvida', 'observacao_campo', 'sugestao', 'outro']).default('outro'),
  prioridade: z.enum(['baixa', 'normal', 'alta', 'urgente']).default('normal'),
});

export type AnotacaoFormInput = z.infer<typeof anotacaoFormSchema>;

// Marcar Anotação como Resolvida
export const marcarAnotacaoResolvidaSchema = z.object({
  resolvida: z.boolean(),
  assessor_resposta: z.string().optional(),
});

export type MarcarAnotacaoResolvidaInput = z.infer<typeof marcarAnotacaoResolvidaSchema>;

// Criar Agendamento (usuário escolhe horário)
export const criarAgendamentoSchema = z.object({
  horario_disponivel_id: z.string().uuid('ID de horário inválido'),
  consultor_id: z.string().uuid('ID do consultor inválido'),
  tipo: z.enum(['reuniao_video', 'chamada_telefone']),
  observacoes: z.string().max(2000).optional(),
  link_reuniao: z.string().url().optional(),
});

export type CriarAgendamentoInput = z.infer<typeof criarAgendamentoSchema>;

// Atualizar Status de Agendamento (consultor confirma/recusa)
export const atualizarStatusAgendamentoSchema = z.object({
  status: z.enum(['confirmado', 'recusado', 'remarcado', 'cancelado', 'concluido']),
  motivo_recusa: z.string().optional(),
  sugestao_nova_data: z.coerce.date().optional(),
  link_reuniao: z.string().url().optional(),
});

export type AtualizarStatusAgendamentoInput = z.infer<typeof atualizarStatusAgendamentoSchema>;

// Histórico
export const historicoAtendimentoSchema = z.object({
  titulo: z.string().min(5).max(255),
  resumo: z.string().min(10).max(2000),
  orientacoes_recebidas: z.string().max(5000).optional(),
  proximos_passos: z.string().max(5000).optional(),
  assessor_nome: z.string().max(255).optional(),
  data_atendimento: z.coerce.date(),
  agendamento_id: z.string().uuid().optional(),
});

export type HistoricoAtendimentoInput = z.infer<typeof historicoAtendimentoSchema>;
```

### 2.3 Criar `lib/supabase/assessoria.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  AnotacaoAssessoria,
  HorarioDisponivel,
  AgendamentoUsuario,
  HistoricoAtendimento,
} from '@/lib/types/assessoria';
import {
  AnotacaoFormInput,
  CriarAgendamentoInput,
  AtualizarStatusAgendamentoInput,
  HistoricoAtendimentoInput,
} from '@/lib/validations/assessoria';

const getClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
};

// ============================================================
// ANOTAÇÕES
// ============================================================

export const queryAnotacoes = {
  async list(fazendaId: string, filters?: any) {
    const client = await getClient();
    let query = client
      .from('anotacoes_assessoria')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters?.categoria) query = query.eq('categoria', filters.categoria);
    if (filters?.prioridade) query = query.eq('prioridade', filters.prioridade);
    if (filters?.resolvida !== undefined) query = query.eq('resolvida', filters.resolvida);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as AnotacaoAssessoria[];
  },

  async getById(id: string) {
    const client = await getClient();
    const { data, error } = await client
      .from('anotacoes_assessoria')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error) throw error;
    return data as AnotacaoAssessoria;
  },

  async create(fazendaId: string, payload: AnotacaoFormInput) {
    const client = await getClient();
    const { data, error } = await client
      .from('anotacoes_assessoria')
      .insert({ fazenda_id: fazendaId, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data as AnotacaoAssessoria;
  },

  async update(id: string, payload: Partial<AnotacaoFormInput>) {
    const client = await getClient();
    const { data, error } = await client
      .from('anotacoes_assessoria')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AnotacaoAssessoria;
  },

  async delete(id: string) {
    const client = await getClient();
    const { error } = await client
      .from('anotacoes_assessoria')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async marcarResolvida(id: string, payload: any) {
    const client = await getClient();
    const { data, error } = await client
      .from('anotacoes_assessoria')
      .update({
        resolvida: payload.resolvida,
        data_resolvida: payload.resolvida ? new Date().toISOString() : null,
        assessor_resposta: payload.assessor_resposta || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AnotacaoAssessoria;
  },
};

// ============================================================
// HORÁRIOS DISPONÍVEIS DO CONSULTOR
// ============================================================

export const queryHorarios = {
  async listDisponiveis(consultorId?: string) {
    const client = await getClient();
    let query = client
      .from('horarios_disponiveis_consultor')
      .select('*')
      .eq('disponivel', true)
      .gte('data_hora', new Date().toISOString())
      .order('data_hora', { ascending: true });

    if (consultorId) {
      query = query.eq('consultor_id', consultorId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as HorarioDisponivel[];
  },

  async create(consultorId: string, dataHora: string, duracaoMinutos: number = 60) {
    const client = await getClient();
    const { data, error } = await client
      .from('horarios_disponiveis_consultor')
      .insert({
        consultor_id: consultorId,
        data_hora: dataHora,
        duracao_minutos: duracaoMinutos,
      })
      .select()
      .single();
    if (error) throw error;
    return data as HorarioDisponivel;
  },

  async marcarIndisponivel(horarioId: string) {
    const client = await getClient();
    const { error } = await client
      .from('horarios_disponiveis_consultor')
      .update({ disponivel: false })
      .eq('id', horarioId);
    if (error) throw error;
  },

  async marcarDisponivel(horarioId: string) {
    const client = await getClient();
    const { error } = await client
      .from('horarios_disponiveis_consultor')
      .update({ disponivel: true })
      .eq('id', horarioId);
    if (error) throw error;
  },
};

// ============================================================
// AGENDAMENTOS DO USUÁRIO
// ============================================================

export const queryAgendamentos = {
  async list(fazendaId: string, filters?: any) {
    const client = await getClient();
    let query = client
      .from('agendamentos_usuario')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .order('data_agendada', { ascending: true });

    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as AgendamentoUsuario[];
  },

  async getById(id: string) {
    const client = await getClient();
    const { data, error } = await client
      .from('agendamentos_usuario')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error) throw error;
    return data as AgendamentoUsuario;
  },

  async create(fazendaId: string, consultorId: string, payload: CriarAgendamentoInput) {
    const client = await getClient();
    
    // Buscar horario_id para preencher data_agendada
    const { data: horaio } = await client
      .from('horarios_disponiveis_consultor')
      .select('data_hora')
      .eq('id', payload.horario_disponivel_id)
      .single();

    if (!horaio) throw new Error('Horário não encontrado');

    const { data, error } = await client
      .from('agendamentos_usuario')
      .insert({
        fazenda_id: fazendaId,
        consultor_id: consultorId,
        horario_disponivel_id: payload.horario_disponivel_id,
        tipo: payload.tipo,
        data_agendada: horaio.data_hora,
        observacoes: payload.observacoes,
        link_reuniao: payload.link_reuniao,
      })
      .select()
      .single();

    if (error) throw error;
    return data as AgendamentoUsuario;
  },

  async atualizarStatus(id: string, payload: AtualizarStatusAgendamentoInput) {
    const client = await getClient();
    const { data, error } = await client
      .from('agendamentos_usuario')
      .update({
        status: payload.status,
        motivo_recusa: payload.motivo_recusa || null,
        sugestao_nova_data: payload.sugestao_nova_data?.toISOString() || null,
        link_reuniao: payload.link_reuniao || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as AgendamentoUsuario;
  },

  async delete(id: string) {
    const client = await getClient();
    const { error } = await client
      .from('agendamentos_usuario')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================================
// HISTÓRICO DE ATENDIMENTOS
// ============================================================

export const queryHistoricoAtendimentos = {
  async list(fazendaId: string) {
    const client = await getClient();
    const { data, error } = await client
      .from('historico_atendimentos')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .order('data_atendimento', { ascending: false });
    if (error) throw error;
    return (data || []) as HistoricoAtendimento[];
  },

  async create(fazendaId: string, payload: HistoricoAtendimentoInput) {
    const client = await getClient();
    const { data, error } = await client
      .from('historico_atendimentos')
      .insert({ fazenda_id: fazendaId, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data as HistoricoAtendimento;
  },
};
```

### 2.4 Criar `lib/services/email.ts` (Suporte para Link Mágico)

```typescript
import jwt from 'jsonwebtoken';

/**
 * Gera JWT para link mágico do consultor
 * Válido por 24 horas
 */
export function gerarTokenConfirmacao(agendamentoId: string, tipo: 'confirmar' | 'recusar' | 'remarcar'): string {
  const payload = {
    agendamento_id: agendamentoId,
    tipo,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 horas
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'seu-secret-aqui');
}

/**
 * Verifica se token é válido
 */
export function verificarTokenConfirmacao(token: string): { agendamento_id: string; tipo: string } | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu-secret-aqui') as any;
    return {
      agendamento_id: decoded.agendamento_id,
      tipo: decoded.tipo,
    };
  } catch {
    return null;
  }
}

/**
 * Envia email com link mágico (Placeholder — usar Resend, SendGrid ou Edge Function)
 * IMPLEMENTAR: Integrar com seu serviço de email
 */
export async function enviarEmailSolicitacaoAgendamento(
  agendamento: any, // AgendamentoUsuario
  fazenda: any, // nome da fazenda
  usuario: any // { nome, email? }
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gestsilo.com';
  const tokenConfirmar = gerarTokenConfirmacao(agendamento.id, 'confirmar');
  const tokenRecusar = gerarTokenConfirmacao(agendamento.id, 'recusar');
  const tokenRemarcar = gerarTokenConfirmacao(agendamento.id, 'remarcar');

  const linkConfirmar = `${baseUrl}/assessor/confirmar?token=${tokenConfirmar}&agendamento=${agendamento.id}`;
  const linkRecusar = `${baseUrl}/assessor/confirmar?token=${tokenRecusar}&agendamento=${agendamento.id}`;
  const linkRemarcar = `${baseUrl}/assessor/confirmar?token=${tokenRemarcar}&agendamento=${agendamento.id}`;

  const dataFormatada = new Date(agendamento.data_agendada).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const tipoIcon = agendamento.tipo === 'reuniao_video' ? '📹' : '☎️';
  const tipoLabel = agendamento.tipo === 'reuniao_video' ? 'Reunião por Vídeo' : 'Chamada Telefônica';

  const emailHtml = `
    <h2>Solicitação de Agendamento</h2>
    <p><strong>Fazenda:</strong> ${fazenda.nome || 'N/A'}</p>
    <p><strong>Data/Hora:</strong> ${dataFormatada}</p>
    <p><strong>Tipo:</strong> ${tipoIcon} ${tipoLabel}</p>
    <p><strong>Responsável:</strong> ${usuario.nome || 'N/A'}</p>
    ${agendamento.observacoes ? `<p><strong>Observações:</strong> ${agendamento.observacoes}</p>` : ''}
    
    <h3>AÇÕES:</h3>
    <p>
      <a href="${linkConfirmar}" style="background:green;color:white;padding:10px 20px;text-decoration:none;margin-right:10px;">✅ Confirmar</a>
      <a href="${linkRecusar}" style="background:red;color:white;padding:10px 20px;text-decoration:none;margin-right:10px;">❌ Recusar</a>
      <a href="${linkRemarcar}" style="background:blue;color:white;padding:10px 20px;text-decoration:none;">🔄 Remarcar</a>
    </p>
    
    <p style="font-size:12px;color:#666;">Link válido por 24 horas.</p>
  `;

  // TODO: Implementar envio com Resend, SendGrid, Edge Function, etc.
  console.log('[EMAIL] Enviando para gestsilo.app@gmail.com', { linkConfirmar, linkRecusar, linkRemarcar });

  return { success: true };
}

/**
 * Envia confirmação para usuário
 */
export async function enviarEmailConfirmacaoAgendamento(
  agendamento: any,
  fazenda: any,
  status: 'confirmado' | 'recusado' | 'remarcado'
) {
  // TODO: Implementar
  console.log('[EMAIL] Enviando confirmação para usuário', { status });
}
```

### 2.5 Criar `app/dashboard/assessoria/actions.ts`

```typescript
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { queryAnotacoes, queryAgendamentos, queryHistoricoAtendimentos, queryHorarios } from '@/lib/supabase/assessoria';
import {
  anotacaoFormSchema,
  criarAgendamentoSchema,
  atualizarStatusAgendamentoSchema,
  historicoAtendimentoSchema,
} from '@/lib/validations/assessoria';
import { enviarEmailSolicitacaoAgendamento, enviarEmailConfirmacaoAgendamento } from '@/lib/services/email';

async function getMeuFazendaId(): Promise<string> {
  const cookieStore = await cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
  const { data } = await client.rpc('get_minha_fazenda_id');
  return data as string;
}

async function getMeuId(): Promise<string> {
  const cookieStore = await cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
  const { data: { user } } = await client.auth.getUser();
  return user?.id || '';
}

// ============================================================
// ANOTAÇÕES
// ============================================================

export async function criarAnotacaoAction(payload: unknown) {
  try {
    const validated = anotacaoFormSchema.parse(payload);
    const fazendaId = await getMeuFazendaId();
    const anotacao = await queryAnotacoes.create(fazendaId, validated);
    return { success: true, data: anotacao, message: 'Anotação criada com sucesso' };
  } catch (error) {
    console.error('[criarAnotacaoAction]', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro' };
  }
}

export async function atualizarAnotacaoAction(id: string, payload: unknown) {
  try {
    const validated = anotacaoFormSchema.parse(payload);
    const anotacao = await queryAnotacoes.update(id, validated);
    return { success: true, data: anotacao, message: 'Anotação atualizada' };
  } catch (error) {
    console.error('[atualizarAnotacaoAction]', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro' };
  }
}

export async function deletarAnotacaoAction(id: string) {
  try {
    await queryAnotacoes.delete(id);
    return { success: true, message: 'Anotação deletada com sucesso' };
  } catch (error) {
    console.error('[deletarAnotacaoAction]', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro' };
  }
}

export async function marcarAnotacaoResolvidaAction(id: string, payload: unknown) {
  try {
    const anotacao = await queryAnotacoes.marcarResolvida(id, payload);
    return { success: true, data: anotacao, message: 'Status atualizado' };
  } catch (error) {
    console.error('[marcarAnotacaoResolvidaAction]', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro' };
  }
}

// ============================================================
// AGENDAMENTOS
// ============================================================

export async function criarAgendamentoAction(payload: unknown) {
  try {
    const validated = criarAgendamentoSchema.parse(payload);
    const fazendaId = await getMeuFazendaId();
    
    const agendamento = await queryAgendamentos.create(
      fazendaId,
      validated.consultor_id,
      validated
    );

    // Buscar dados da fazenda e usuário para email
    const cookieStore = await cookies();
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: fazenda } = await client.from('fazendas').select('nome').eq('id', fazendaId).single();
    const { data: { user } } = await client.auth.getUser();

    // Enviar email com link mágico
    await enviarEmailSolicitacaoAgendamento(
      agendamento,
      fazenda || { nome: 'Fazenda' },
      { nome: user?.user_metadata?.nome || 'Usuário' }
    );

    return { success: true, data: agendamento, message: 'Agendamento solicitado! Email enviado para o consultor.' };
  } catch (error) {
    console.error('[criarAgendamentoAction]', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro ao criar agendamento' };
  }
}

export async function atualizarStatusAgendamentoAction(id: string, payload: unknown) {
  try {
    const validated = atualizarStatusAgendamentoSchema.parse(payload);
    const agendamento = await queryAgendamentos.atualizarStatus(id, validated);

    // Se confirmado, marcar horário como indisponível
    if (validated.status === 'confirmado') {
      await queryHorarios.marcarIndisponivel(agendamento.horario_disponivel_id);
    }

    // Se recusado ou remarcado, liberar horário
    if (validated.status === 'recusado' || validated.status === 'remarcado') {
      await queryHorarios.marcarDisponivel(agendamento.horario_disponivel_id);
    }

    // Enviar email de confirmação/recusa/remarcação
    await enviarEmailConfirmacaoAgendamento(agendamento, {}, validated.status);

    return { success: true, data: agendamento, message: 'Status atualizado com sucesso' };
  } catch (error) {
    console.error('[atualizarStatusAgendamentoAction]', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro' };
  }
}

export async function cancelarAgendamentoAction(id: string) {
  try {
    const agendamento = await queryAgendamentos.atualizarStatus(id, {
      status: 'cancelado',
    });
    return { success: true, message: 'Agendamento cancelado' };
  } catch (error) {
    console.error('[cancelarAgendamentoAction]', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro' };
  }
}

// ============================================================
// HISTÓRICO
// ============================================================

export async function criarHistoricoAtendimentoAction(payload: unknown) {
  try {
    const validated = historicoAtendimentoSchema.parse(payload);
    const fazendaId = await getMeuFazendaId();
    const historico = await queryHistoricoAtendimentos.create(fazendaId, validated);
    return { success: true, data: historico, message: 'Histórico criado com sucesso' };
  } catch (error) {
    console.error('[criarHistoricoAtendimentoAction]', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro' };
  }
}
```

---

## 🎨 FASE 3: INTERFACE (Componentes UI)

### 3.1 Modificar `components/Sidebar.tsx`

Remover de `sistemaRoutes`, adicionar a `ferramentasRoutes`:

```typescript
const ferramentasRoutes = [
  // ... existentes
  {
    label: 'Assessoria agronômica',
    href: '/dashboard/assessoria',
    icon: GraduationCap,
  },
];
```

### 3.2 Criar `app/dashboard/assessoria/layout.tsx`

```typescript
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/queries-audit';
import { queryProfileByUserId } from '@/lib/supabase/operador';

export default async function AssessoriaLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await queryProfileByUserId(user.id);
  if (!profile || profile.perfil !== 'Administrador') redirect('/dashboard');

  return <>{children}</>;
}
```

### 3.3 Componentes a Criar

#### **BlocoNotasSection.tsx** — (igual a SPEC v1)
#### **AnotacaoForm.tsx** — (igual a SPEC v1)
#### **AnotacoesFilters.tsx** — (igual a SPEC v1)
#### **AnotacoesList.tsx** — (igual a SPEC v1)
#### **DeleteAnotacaoDialog.tsx** — (igual a SPEC v1)
#### **MarcarResolvidaDialog.tsx** — (igual a SPEC v1)

#### **CalendarioAgendamento.tsx** (NOVO)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { queryHorarios } from '@/lib/supabase/assessoria';
import { HorarioDisponivel } from '@/lib/types/assessoria';
import { formatDate } from '@/lib/utils';
import AgendamentoForm from './AgendamentoForm';

interface CalendarioAgendamentoProps {
  consultorId: string;
}

export default function CalendarioAgendamento({ consultorId }: CalendarioAgendamentoProps) {
  const [horarios, setHorarios] = useState<HorarioDisponivel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHorario, setSelectedHorario] = useState<HorarioDisponivel | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    const loadHorarios = async () => {
      try {
        const data = await queryHorarios.listDisponiveis(consultorId);
        setHorarios(data);
      } catch (error) {
        console.error('Erro ao carregar horários:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadHorarios();
  }, [consultorId]);

  if (isLoading) return <div className="text-center py-4">Carregando horários...</div>;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agenda Disponível
          </CardTitle>
          <CardDescription>
            Escolha um horário para agendar uma reunião
          </CardDescription>
        </CardHeader>
        <CardContent>
          {horarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum horário disponível no momento
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {horarios.map((horario) => (
                <Button
                  key={horario.id}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                  onClick={() => {
                    setSelectedHorario(horario);
                    setIsFormOpen(true);
                  }}
                >
                  <div className="font-semibold">{formatDate(horario.data_hora)}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(horario.data_hora).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AgendamentoForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedHorario(null);
        }}
        horarioSelecionado={selectedHorario}
        consultorId={consultorId}
      />
    </>
  );
}
```

#### **AgendamentoForm.tsx** (NOVO)

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { criarAgendamentoSchema } from '@/lib/validations/assessoria';
import { criarAgendamentoAction } from '@/app/dashboard/assessoria/actions';
import { HorarioDisponivel } from '@/lib/types/assessoria';
import { formatDate } from '@/lib/utils';

interface AgendamentoFormProps {
  isOpen: boolean;
  onClose: () => void;
  horarioSelecionado: HorarioDisponivel | null;
  consultorId: string;
  onAfterSubmit?: () => Promise<void>;
}

export default function AgendamentoForm({
  isOpen,
  onClose,
  horarioSelecionado,
  consultorId,
  onAfterSubmit,
}: AgendamentoFormProps) {
  const form = useForm({
    resolver: zodResolver(criarAgendamentoSchema),
    defaultValues: {
      horario_disponivel_id: horarioSelecionado?.id || '',
      consultor_id: consultorId,
      tipo: 'reuniao_video' as const,
      observacoes: '',
      link_reuniao: '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const result = await criarAgendamentoAction(data);
      if (result.success) {
        toast.success('Solicitação enviada! O consultor confirmará em breve.');
        onClose();
        if (onAfterSubmit) await onAfterSubmit();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao criar agendamento');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agendar Reunião</DialogTitle>
          <DialogDescription>
            {horarioSelecionado
              ? `Horário: ${formatDate(horarioSelecionado.data_hora)}`
              : 'Selecione um horário'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Reunião *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="reuniao_video">Reunião por Vídeo</SelectItem>
                      <SelectItem value="chamada_telefone">Chamada Telefônica</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('tipo') === 'reuniao_video' && (
              <FormField
                control={form.control}
                name="link_reuniao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link da Reunião</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://meet.google.com/..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva os tópicos que gostaria de discutir..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Enviando...' : 'Solicitar Agendamento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

#### **AgendamentosConfirmadosSection.tsx** (NOVO)

```typescript
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { AgendamentoUsuario } from '@/lib/types/assessoria';
import { cancelarAgendamentoAction } from '@/app/dashboard/assessoria/actions';
import { toast } from 'sonner';
import { useState } from 'react';

interface AgendamentosConfirmadosProps {
  agendamentos: AgendamentoUsuario[];
  onRefresh: () => Promise<void>;
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  solicitado: { icon: AlertCircle, color: 'text-yellow-600', label: 'Aguardando Confirmação' },
  confirmado: { icon: CheckCircle2, color: 'text-green-600', label: 'Confirmado' },
  recusado: { icon: XCircle, color: 'text-red-600', label: 'Recusado' },
  remarcado: { icon: Calendar, color: 'text-blue-600', label: 'Remarcado' },
};

export default function AgendamentosConfirmadosSection({
  agendamentos,
  onRefresh,
}: AgendamentosConfirmadosProps) {
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    try {
      setCancelingId(id);
      const result = await cancelarAgendamentoAction(id);
      if (result.success) {
        toast.success(result.message);
        await onRefresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Meus Agendamentos
        </CardTitle>
        <CardDescription>
          Acompanhe o status de suas solicitações de reunião
        </CardDescription>
      </CardHeader>
      <CardContent>
        {agendamentos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum agendamento realizado
          </div>
        ) : (
          <div className="space-y-3">
            {agendamentos.map((ag) => {
              const config = statusConfig[ag.status];
              const Icon = config?.icon;

              return (
                <div
                  key={ag.id}
                  className="border rounded-lg p-4 flex justify-between items-start"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {Icon && <Icon className={`h-5 w-5 ${config.color}`} />}
                      <div>
                        <div className="font-semibold">
                          {ag.tipo === 'reuniao_video' ? '📹' : '☎️'} {formatDate(ag.data_agendada)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(ag.data_agendada).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    <Badge>{config.label}</Badge>
                    {ag.motivo_recusa && (
                      <div className="text-sm text-red-600">Motivo: {ag.motivo_recusa}</div>
                    )}
                    {ag.sugestao_nova_data && (
                      <div className="text-sm text-blue-600">
                        Sugestão: {formatDate(ag.sugestao_nova_data)}
                      </div>
                    )}
                  </div>
                  {ag.status === 'solicitado' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(ag.id)}
                      disabled={cancelingId === ag.id}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 3.4 Criar `app/assessor/confirmar/page.tsx` (Página Pública - Link Mágico)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { verificarTokenConfirmacao } from '@/lib/services/email';
import { queryAgendamentos } from '@/lib/supabase/assessoria';
import { atualizarStatusAgendamentoAction } from '@/app/dashboard/assessoria/actions';
import { toast } from 'sonner';

export default function ConfirmarAgendamentoPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const agendamentoId = searchParams.get('agendamento');

  const [agendamento, setAgendamento] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [statusFinal, setStatusFinal] = useState<'confirmado' | 'recusado' | 'remarcado' | null>(null);

  useEffect(() => {
    async function verificarToken() {
      try {
        setIsLoading(true);

        // Verificar token
        if (!token || !agendamentoId) {
          setErro('Link inválido ou expirado');
          return;
        }

        const decoded = verificarTokenConfirmacao(token);
        if (!decoded || decoded.agendamento_id !== agendamentoId) {
          setErro('Link expirado. Validade: 24 horas');
          return;
        }

        // Buscar agendamento
        const agendamento = await queryAgendamentos.getById(agendamentoId);
        if (!agendamento) {
          setErro('Agendamento não encontrado');
          return;
        }

        setAgendamento(agendamento);
      } catch (error) {
        setErro('Erro ao verificar link');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    verificarToken();
  }, [token, agendamentoId]);

  const handleConfirmar = async () => {
    try {
      setIsSubmitting(true);
      const result = await atualizarStatusAgendamentoAction(agendamentoId || '', {
        status: 'confirmado',
      });

      if (result.success) {
        setStatusFinal('confirmado');
        toast.success('Agendamento confirmado!');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao confirmar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecusar = async () => {
    if (!motivo.trim()) {
      toast.error('Por favor, indique o motivo da recusa');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await atualizarStatusAgendamentoAction(agendamentoId || '', {
        status: 'recusado',
        motivo_recusa: motivo,
      });

      if (result.success) {
        setStatusFinal('recusado');
        toast.success('Agendamento recusado');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao recusar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemarcar = async () => {
    if (!motivo.trim()) {
      toast.error('Por favor, sugira uma nova data');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await atualizarStatusAgendamentoAction(agendamentoId || '', {
        status: 'remarcado',
        sugestao_nova_data: new Date(motivo),
      });

      if (result.success) {
        setStatusFinal('remarcado');
        toast.success('Remarcação sugerida');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao remarcar');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{erro}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Se o problema persistir, entre em contato com a fazenda.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (statusFinal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {statusFinal === 'confirmado' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {statusFinal === 'recusado' && <XCircle className="h-5 w-5 text-red-600" />}
              {statusFinal === 'remarcado' && <AlertCircle className="h-5 w-5 text-blue-600" />}
              {statusFinal === 'confirmado' && 'Agendamento Confirmado'}
              {statusFinal === 'recusado' && 'Agendamento Recusado'}
              {statusFinal === 'remarcado' && 'Remarcação Sugerida'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {statusFinal === 'confirmado' && 'A fazenda foi notificada da confirmação. Aguarde o contato com o link da reunião.'}
              {statusFinal === 'recusado' && 'A fazenda foi notificada da recusa.'}
              {statusFinal === 'remarcado' && 'A fazenda foi notificada da sugestão de remarcação.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!agendamento) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Confirmar Agendamento</CardTitle>
          <CardDescription>
            Você está respondendo a uma solicitação de agendamento
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Detalhes do Agendamento */}
          <div className="bg-slate-100 p-4 rounded-lg space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Data/Hora</p>
              <p className="font-semibold text-lg">
                {new Date(agendamento.data_agendada).toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <p className="font-semibold">
                {agendamento.tipo === 'reuniao_video' ? '📹 Reunião por Vídeo' : '☎️ Chamada Telefônica'}
              </p>
            </div>
            {agendamento.observacoes && (
              <div>
                <p className="text-sm text-muted-foreground">Observações da Fazenda</p>
                <p>{agendamento.observacoes}</p>
              </div>
            )}
          </div>

          {/* Opção 1: Confirmar */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">✅ Confirmar Agendamento</h3>
            <p className="text-sm text-muted-foreground mb-4">
              A fazenda será notificada de que você confirmou o agendamento.
            </p>
            <Button
              onClick={handleConfirmar}
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Processando...' : 'Confirmar'}
            </Button>
          </div>

          {/* Opção 2: Recusar */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">❌ Recusar Agendamento</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Indique o motivo da recusa.
            </p>
            <Textarea
              placeholder="Ex: Indisponível nessa data, conflito de agenda, etc."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mb-3"
              disabled={isSubmitting}
            />
            <Button
              onClick={handleRecusar}
              disabled={isSubmitting || !motivo.trim()}
              variant="destructive"
              className="w-full"
            >
              {isSubmitting ? 'Processando...' : 'Recusar'}
            </Button>
          </div>

          {/* Opção 3: Remarcar */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">🔄 Sugerir Nova Data</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sugira uma nova data/hora para a reunião.
            </p>
            <input
              type="datetime-local"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full border rounded p-2 mb-3"
              disabled={isSubmitting}
            />
            <Button
              onClick={handleRemarcar}
              disabled={isSubmitting || !motivo.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Processando...' : 'Sugerir Nova Data'}
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Link válido por 24 horas. Após esse período, você receberá um novo link.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.5 Atualizar `app/dashboard/assessoria/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { queryAnotacoes, queryAgendamentos, queryHistoricoAtendimentos } from '@/lib/supabase/assessoria';
import { AnotacaoAssessoria, AgendamentoUsuario, HistoricoAtendimento } from '@/lib/types/assessoria';
import BlocoNotasSection from './components/BlocoNotasSection';
import CalendarioAgendamento from './components/CalendarioAgendamento';
import AgendamentosConfirmadosSection from './components/AgendamentosConfirmadosSection';
import { Skeleton } from '@/components/ui/skeleton';

const CONSULTOR_ID = process.env.NEXT_PUBLIC_CONSULTOR_ID || '';

export default function AssessoriaPage() {
  const { profile } = useAuth();
  const [anotacoes, setAnotacoes] = useState<AnotacaoAssessoria[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoUsuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!profile?.fazenda_id) return;
    try {
      setIsLoading(true);
      const [anotacoesData, agendamentosData] = await Promise.all([
        queryAnotacoes.list(profile.fazenda_id),
        queryAgendamentos.list(profile.fazenda_id),
      ]);
      setAnotacoes(anotacoesData);
      setAgendamentos(agendamentosData);
    } catch (error) {
      console.error('[AssessoriaPage]', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile?.fazenda_id]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <BlocoNotasSection anotacoes={anotacoes} onRefresh={loadData} />
      <CalendarioAgendamento consultorId={CONSULTOR_ID} />
      <AgendamentosConfirmadosSection agendamentos={agendamentos} onRefresh={loadData} />
    </div>
  );
}
```

---

## 🚀 PRÓXIMAS IMPLEMENTAÇÕES (Futuro)

### Email Notifications (IMPLEMENTAÇÃO NECESSÁRIA)

Hoje as funções em `lib/services/email.ts` são placeholders. Você precisa integrar com um serviço:

**Opção A: Resend (Recomendado — mais simples)**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function enviarEmailSolicitacaoAgendamento(...) {
  const { error } = await resend.emails.send({
    from: 'noreply@gestsilo.com',
    to: 'gestsilo.app@gmail.com',
    subject: 'Solicitação de Agendamento',
    html: emailHtml,
  });
}
```

**Opção B: Supabase Edge Functions**
```bash
supabase functions new send-email
```

**Opção C: Google SMTP (via nodemailer)**
```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});
```

### Painel Admin para Gerenciar Horários (Futuro)

```typescript
// app/dashboard/assessoria/admin/horarios/page.tsx
// - Visualizar horários do consultor
// - Adicionar novos slots
// - Bloquear períodos (feriados, férias)
// - Editar duração padrão
```

### Auto-refresh em Tempo Real (Futuro)

```typescript
// Ao invés de polling, usar Supabase Realtime
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

useEffect(() => {
  const subscription = supabase
    .from('agendamentos_usuario')
    .on('*', (payload) => {
      // Atualizar estado em tempo real
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

### Google Calendar Integration (Futuro)

```typescript
// lib/services/google-calendar.ts
// - OAuth com Google
// - Sincronizar horários disponíveis
// - Criar eventos automaticamente
// - Enviar convites de calendário
```

---

## ✅ CHECKLIST IMPLEMENTAÇÃO v3 (Link Mágico)

### Fase 1: Banco de Dados
- [ ] Executar migration SQL (4 tabelas)
- [ ] Confirmar RLS + policies
- [ ] Confirmar índices criados
- [ ] Rodar `npm run db:types`
- [ ] Testar RLS manualmente via Supabase SQL Editor

### Fase 2: Backend
- [ ] `lib/types/assessoria.ts`
- [ ] `lib/validations/assessoria.ts`
- [ ] `lib/supabase/assessoria.ts`
- [ ] `lib/services/email.ts` (com geração de JWT para link mágico)
- [ ] `app/dashboard/assessoria/actions.ts`
- [ ] **Instalar**: `npm install jsonwebtoken` (para JWT)
- [ ] Configurar variáveis de ambiente (JWT_SECRET, etc.)

### Fase 3: UI - Dashboard do Usuário
- [ ] Modificar `Sidebar.tsx` (mover Assessoria → Ferramentas)
- [ ] Criar `app/dashboard/assessoria/layout.tsx` (guard)
- [ ] Criar 6 componentes de anotações (BlocoNotasSection, AnotacaoForm, etc.)
- [ ] Criar 3 componentes de agendamento (CalendarioAgendamento, AgendamentoForm, AgendamentosConfirmadosSection)
- [ ] Criar `app/dashboard/assessoria/page.tsx`

### Fase 4: UI - Página Pública do Consultor
- [ ] Criar `app/assessor/confirmar/page.tsx` (link mágico)
- [ ] Implementar validação de JWT
- [ ] Implementar 3 ações: confirmar, recusar, remarcar
- [ ] Design responsivo (mobile-first)

### Fase 5: Email (Crítico)
- [ ] Escolher serviço de email (Resend recomendado)
- [ ] Implementar `enviarEmailSolicitacaoAgendamento()`
- [ ] Implementar `enviarEmailConfirmacaoAgendamento()`
- [ ] Testar emails em dev com Mailtrap ou similar
- [ ] Validar links mágicos

### Fase 6: Testes
- [ ] Testes Zod (validações)
- [ ] Testes RLS (segurança)
- [ ] Testes de geração de JWT
- [ ] Testes e2e fluxo completo:
  1. Usuário cria agendamento
  2. Email é enviado com link
  3. Consultor clica link
  4. Confirma/recusa/remarca
  5. Usuário vê status atualizado

### Fase 7: Deploy & Produção
- [ ] Configurar variáveis em Vercel
- [ ] Testar links mágicos em produção
- [ ] Testar emails reais para gestsilo.app@gmail.com
- [ ] Monitorar logs de erro (Sentry)

---

## ⚙️ Variáveis de Ambiente

Adicionar em `.env.local`:

```
# Link Mágico do Consultor
JWT_SECRET=<seu-secret-aleatorio-de-256-bits>
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email do Consultor (para receber solicitações)
NEXT_PUBLIC_CONSULTOR_EMAIL=gestsilo.app@gmail.com

# Serviço de Email (choose one)
# Opção 1: Resend
RESEND_API_KEY=<chave-resend>

# Opção 2: SendGrid
SENDGRID_API_KEY=<chave-sendgrid>

# Opção 3: SMTP customizado
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha
```

Em produção (Vercel):
```
JWT_SECRET=<mesmo-secret>
NEXT_PUBLIC_APP_URL=https://gestsilo.com
RESEND_API_KEY=<chave>
```

---

## 📊 Fluxo de Dados Resumido

```
┌──────────────────────────────────────────────────┐
│ Tabelas & Fluxo de Agendamento                   │
├──────────────────────────────────────────────────┤
│                                                  │
│ horarios_disponiveis_consultor                   │
│   ├─ consultor_id (quem oferece)                │
│   ├─ data_hora (quando)                         │
│   └─ disponivel = TRUE (público)                │
│        │                                         │
│        ↓ (usuário escolhe)                      │
│                                                  │
│ agendamentos_usuario                             │
│   ├─ fazenda_id (quem solicita)                 │
│   ├─ consultor_id (para quem)                   │
│   ├─ horario_disponivel_id (qual slot)          │
│   ├─ status: 'solicitado' → 'confirmado'        │
│   └─ link_reuniao (preenchido no form)          │
│        │                                         │
│        ↓ (consultor confirma)                   │
│                                                  │
│ horarios_disponiveis_consultor                   │
│   └─ disponivel = FALSE (slot ocupado)          │
│        │                                         │
│        ↓ (histórico após reunião)                │
│                                                  │
│ historico_atendimentos                           │
│   ├─ agendamento_id (qual reunião foi)          │
│   ├─ resumo, orientacoes_recebidas              │
│   └─ proximos_passos                            │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

**Status**: ✅ Pronto para Implementação Fase 1  
**Data**: 2026-05-20  
**Versão**: 2.0 (Fluxo de Agenda Compartilhada)
