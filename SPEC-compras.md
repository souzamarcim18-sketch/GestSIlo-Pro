# SPEC-compras.md — Spec Técnica: Módulo de Planejamento de Compras de Insumos

**Versão:** 1.1  
**Data:** 2026-05-19  
**Fase:** 2 — Spec Técnica  
**Status:** Pronto para revisão antes da Fase 3 (Build)

---

## 1. Resumo Técnico

Duas novas tabelas (`planejamentos_atividade` e `planejamento_insumos`) são adicionadas ao banco existente. O relatório consolidado de compras é calculado em runtime via query Supabase com JOIN e GROUP BY — sem colunas denormalizadas de progresso. A ação "Marcar como comprado" cria uma entrada em `movimentacoes_insumo`; o trigger `atualizar_custo_medio_e_estoque` existente cuida da atualização de `insumos.estoque_atual` automaticamente. Toda lógica de servidor usa Server Actions (padrão dominante no projeto). O status de compra ("pendente", "comprado parcialmente", "comprado") é derivado em runtime a partir de `insumos.estoque_atual` versus `SUM(planejamento_insumos.quantidade)`. Permissões: apenas Administrador escreve; Visualizador lê; Operador não tem acesso ao módulo (item oculto no Sidebar, redirect no layout).

---

## 2. Schema do Banco

### Decisão técnica: `fazenda_id` nas novas tabelas

`planejamentos_atividade` tem `talhao_id` como FK. O padrão do banco é usar um trigger `set_fazenda_id_from_talhao()` para propagar `fazenda_id` via `talhao_id` (já usado em `atividades_campo`, `ciclos_agricolas`, `eventos_dap`). Seguiremos esse mesmo padrão: o `fazenda_id` é preenchido automaticamente pelo trigger no INSERT — **nunca enviar manualmente**.

Para `planejamento_insumos`, a tabela é filha de `planejamentos_atividade`. O `fazenda_id` será preenchido por um novo trigger que busca via `planejamento_id → planejamentos_atividade.fazenda_id`. Isso mantém isolamento RLS direto sem subquery em cada policy.

---

### 2.1 DDL — `planejamentos_atividade`

```sql
CREATE TABLE public.planejamentos_atividade (
  id              uuid            NOT NULL DEFAULT gen_random_uuid(),
  talhao_id       uuid            NOT NULL REFERENCES public.talhoes(id) ON DELETE RESTRICT,
  ciclo_id        uuid            NULL     REFERENCES public.ciclos_agricolas(id) ON DELETE SET NULL,
  tipo_operacao   varchar         NOT NULL,
  data_prevista   date            NOT NULL,
  status          varchar         NOT NULL DEFAULT 'planejada',
  observacoes     text            NULL,
  fazenda_id      uuid            NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  created_by      uuid            NULL     DEFAULT auth.uid(),
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT planejamentos_atividade_pkey PRIMARY KEY (id),
  CONSTRAINT planejamentos_atividade_tipo_check CHECK (
    tipo_operacao IN ('Plantio', 'Adubação de base', 'Adubação de cobertura', 'Pulverização', 'Calagem', 'Outro')
  ),
  CONSTRAINT planejamentos_atividade_status_check CHECK (
    status IN ('planejada', 'executada', 'cancelada')
  )
);
```

**ON DELETE RESTRICT em `talhao_id`:** impede excluir talhão que tenha planejamentos ativos — proteção de integridade histórica.  
**ON DELETE SET NULL em `ciclo_id`:** ciclo é vínculo opcional; se for excluído, o planejamento não é perdido.  
**ON DELETE CASCADE em `fazenda_id`:** se a fazenda for removida, todos os planejamentos vão junto (padrão do projeto).

---

### 2.2 DDL — `planejamento_insumos`

```sql
CREATE TABLE public.planejamento_insumos (
  id                   uuid        NOT NULL DEFAULT gen_random_uuid(),
  planejamento_id      uuid        NOT NULL REFERENCES public.planejamentos_atividade(id) ON DELETE CASCADE,
  insumo_id            uuid        NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
  quantidade           numeric     NOT NULL,
  fazenda_id           uuid        NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  created_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planejamento_insumos_pkey PRIMARY KEY (id),
  CONSTRAINT planejamento_insumos_unique_insumo_por_atividade UNIQUE (planejamento_id, insumo_id),
  CONSTRAINT planejamento_insumos_quantidade_positiva CHECK (quantidade > 0)
);
```

**ON DELETE CASCADE em `planejamento_id`:** ao excluir uma atividade planejada, todos os vínculos de insumos são removidos.  
**ON DELETE RESTRICT em `insumo_id`:** impede excluir insumo que esteja vinculado a um planejamento (protege integridade).  
**UNIQUE (planejamento_id, insumo_id):** garante a regra de negócio #3 (mesmo insumo não pode aparecer duas vezes na mesma atividade) no nível do banco.

---

### 2.3 Índices

```sql
-- Para listar planejamentos por fazenda (query principal da listagem)
CREATE INDEX idx_planejamentos_atividade_fazenda_id
  ON public.planejamentos_atividade(fazenda_id);

-- Para filtrar por talhão no relatório
CREATE INDEX idx_planejamentos_atividade_talhao_id
  ON public.planejamentos_atividade(talhao_id);

-- Para filtrar por data_prevista (filtro de período no relatório)
CREATE INDEX idx_planejamentos_atividade_data_prevista
  ON public.planejamentos_atividade(fazenda_id, data_prevista);

-- Para a query consolidada do relatório (agrupa por insumo_id)
CREATE INDEX idx_planejamento_insumos_insumo_id
  ON public.planejamento_insumos(insumo_id);

-- Para lookup dos insumos de um planejamento (tela de edição)
CREATE INDEX idx_planejamento_insumos_planejamento_id
  ON public.planejamento_insumos(planejamento_id);
```

**Justificativas:**  
- `fazenda_id` em `planejamentos_atividade`: todo SELECT filtra por fazenda — índice obrigatório.  
- `talhao_id`: filtro de relatório por talhão.  
- `(fazenda_id, data_prevista)`: índice composto para o filtro de período (WHERE fazenda_id = X AND data_prevista BETWEEN A AND B).  
- `insumo_id` em `planejamento_insumos`: GROUP BY insumo no relatório consolidado percorre esta coluna.  
- `planejamento_id` em `planejamento_insumos`: JOIN ao carregar detalhes de uma atividade.

---

### 2.4 Triggers

#### Trigger de `fazenda_id` em `planejamentos_atividade`
Reutilizar `set_fazenda_id_from_talhao()` — já existe no banco e faz exatamente o que precisamos (deriva `fazenda_id` via `talhao_id`).

```sql
CREATE TRIGGER trg_planejamentos_atividade_fazenda_id
  BEFORE INSERT OR UPDATE ON public.planejamentos_atividade
  FOR EACH ROW
  EXECUTE FUNCTION set_fazenda_id_from_talhao();
```

#### Trigger de `fazenda_id` em `planejamento_insumos`
Precisamos de uma nova função que deriva `fazenda_id` via `planejamento_id`:

```sql
CREATE OR REPLACE FUNCTION public.preencher_fazenda_id_via_planejamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.fazenda_id := (
    SELECT fazenda_id FROM public.planejamentos_atividade WHERE id = NEW.planejamento_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_planejamento_insumos_fazenda_id
  BEFORE INSERT ON public.planejamento_insumos
  FOR EACH ROW
  EXECUTE FUNCTION preencher_fazenda_id_via_planejamento();
```

#### Trigger de `updated_at` em `planejamentos_atividade`
Reutilizar `update_updated_at_planejamentos()` — já existe e serve o propósito:

```sql
CREATE TRIGGER trg_planejamentos_atividade_updated_at
  BEFORE UPDATE ON public.planejamentos_atividade
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_planejamentos();
```

#### Atualização de `insumos.estoque_atual` ao marcar como comprado
**Decisão:** usar o trigger existente `atualizar_custo_medio_e_estoque()` que já dispara em `AFTER INSERT` em `movimentacoes_insumo`. Ao inserir a movimentação com `tipo = 'Entrada'` e `origem = 'planejamento'`, o trigger cuida de tudo automaticamente. **Não criar nova lógica na aplicação para atualizar estoque.**

---

### 2.5 Migration SQL completa

```sql
-- ============================================================
-- Migration: planejamento_compras
-- Data: 2026-05-19
-- ============================================================

-- 1. Tabela principal de atividades planejadas
CREATE TABLE public.planejamentos_atividade (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  talhao_id       uuid        NOT NULL REFERENCES public.talhoes(id) ON DELETE RESTRICT,
  ciclo_id        uuid        NULL     REFERENCES public.ciclos_agricolas(id) ON DELETE SET NULL,
  tipo_operacao   varchar     NOT NULL,
  data_prevista   date        NOT NULL,
  status          varchar     NOT NULL DEFAULT 'planejada',
  observacoes     text        NULL,
  fazenda_id      uuid        NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  created_by      uuid        NULL     DEFAULT auth.uid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planejamentos_atividade_pkey PRIMARY KEY (id),
  CONSTRAINT planejamentos_atividade_tipo_check CHECK (
    tipo_operacao IN ('Plantio', 'Adubação de base', 'Adubação de cobertura', 'Pulverização', 'Calagem', 'Outro')
  ),
  CONSTRAINT planejamentos_atividade_status_check CHECK (
    status IN ('planejada', 'executada', 'cancelada')
  )
);

-- 2. Tabela de ligação: insumos vinculados ao planejamento
CREATE TABLE public.planejamento_insumos (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  planejamento_id     uuid        NOT NULL REFERENCES public.planejamentos_atividade(id) ON DELETE CASCADE,
  insumo_id           uuid        NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
  quantidade          numeric     NOT NULL,
  fazenda_id          uuid        NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planejamento_insumos_pkey PRIMARY KEY (id),
  CONSTRAINT planejamento_insumos_unique_insumo_por_atividade UNIQUE (planejamento_id, insumo_id),
  CONSTRAINT planejamento_insumos_quantidade_positiva CHECK (quantidade > 0)
);

-- 3. Índices
CREATE INDEX idx_planejamentos_atividade_fazenda_id    ON public.planejamentos_atividade(fazenda_id);
CREATE INDEX idx_planejamentos_atividade_talhao_id     ON public.planejamentos_atividade(talhao_id);
CREATE INDEX idx_planejamentos_atividade_data_prevista ON public.planejamentos_atividade(fazenda_id, data_prevista);
CREATE INDEX idx_planejamento_insumos_insumo_id        ON public.planejamento_insumos(insumo_id);
CREATE INDEX idx_planejamento_insumos_planejamento_id  ON public.planejamento_insumos(planejamento_id);

-- 4. Função de propagação de fazenda_id via planejamento_id
CREATE OR REPLACE FUNCTION public.preencher_fazenda_id_via_planejamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.fazenda_id := (
    SELECT fazenda_id FROM public.planejamentos_atividade WHERE id = NEW.planejamento_id
  );
  RETURN NEW;
END;
$$;

-- 5. Triggers
CREATE TRIGGER trg_planejamentos_atividade_fazenda_id
  BEFORE INSERT OR UPDATE ON public.planejamentos_atividade
  FOR EACH ROW EXECUTE FUNCTION set_fazenda_id_from_talhao();

CREATE TRIGGER trg_planejamentos_atividade_updated_at
  BEFORE UPDATE ON public.planejamentos_atividade
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_planejamentos();

CREATE TRIGGER trg_planejamento_insumos_fazenda_id
  BEFORE INSERT ON public.planejamento_insumos
  FOR EACH ROW EXECUTE FUNCTION preencher_fazenda_id_via_planejamento();

-- 6. RLS habilitado
ALTER TABLE public.planejamentos_atividade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planejamento_insumos    ENABLE ROW LEVEL SECURITY;
```

---

## 3. RLS Policies

### 3.1 `planejamentos_atividade`

```sql
-- SELECT: apenas Administrador e Visualizador leem (Operador bloqueado)
-- sou_admin_ou_visualizador() já existe no banco (criado pelo módulo Produtos)
CREATE POLICY planejamentos_atividade_select_todos
  ON public.planejamentos_atividade FOR SELECT TO authenticated
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin_ou_visualizador());

-- INSERT: somente Administrador cria
CREATE POLICY planejamentos_atividade_insert_admin
  ON public.planejamentos_atividade FOR INSERT TO authenticated
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

-- UPDATE: somente Administrador edita
CREATE POLICY planejamentos_atividade_update_admin
  ON public.planejamentos_atividade FOR UPDATE TO authenticated
  USING  (fazenda_id = get_minha_fazenda_id() AND sou_admin())
  WITH CHECK (fazenda_id = get_minha_fazenda_id());

-- DELETE: somente Administrador exclui
CREATE POLICY planejamentos_atividade_delete_admin
  ON public.planejamentos_atividade FOR DELETE TO authenticated
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());
```

**Justificativas:**  
- `_select_todos`: usa `sou_admin_ou_visualizador()` — função já existente no banco (criada para o módulo Produtos). Bloqueia Operador na camada de banco.  
- `_insert_admin`: apenas Administrador cria planejamentos. Operador não tem escrita neste módulo.  
- `_update_admin`: apenas Administrador edita. Sem policy de Operador.  
- `_delete_admin`: exclusão restrita ao Administrador.

---

### 3.2 `planejamento_insumos`

```sql
-- SELECT: apenas Administrador e Visualizador leem (Operador bloqueado)
CREATE POLICY planejamento_insumos_select_todos
  ON public.planejamento_insumos FOR SELECT TO authenticated
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin_ou_visualizador());

-- INSERT: somente Administrador vincula insumos
CREATE POLICY planejamento_insumos_insert_admin
  ON public.planejamento_insumos FOR INSERT TO authenticated
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

-- UPDATE: somente Administrador edita quantidade
CREATE POLICY planejamento_insumos_update_admin
  ON public.planejamento_insumos FOR UPDATE TO authenticated
  USING  (fazenda_id = get_minha_fazenda_id() AND sou_admin())
  WITH CHECK (fazenda_id = get_minha_fazenda_id());

-- DELETE: somente Administrador remove vínculos de insumos
CREATE POLICY planejamento_insumos_delete_admin
  ON public.planejamento_insumos FOR DELETE TO authenticated
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());
```

**Justificativas:**  
- `_select_todos`: mesma regra da tabela pai — `sou_admin_ou_visualizador()` bloqueia Operador.  
- `_insert_admin`, `_update_admin`, `_delete_admin`: toda escrita restrita ao Administrador, alinhado com a nova matriz de permissões do módulo.

---

## 4. Tipos TypeScript

### 4.1 Arquivo: `lib/types/planejamento-compras.ts`

```typescript
// Enums
export const TIPOS_OPERACAO = [
  'Plantio',
  'Adubação de base',
  'Adubação de cobertura',
  'Pulverização',
  'Calagem',
  'Outro',
] as const;

export type TipoOperacao = (typeof TIPOS_OPERACAO)[number];

export const STATUS_PLANEJAMENTO = ['planejada', 'executada', 'cancelada'] as const;
export type StatusPlanejamento = (typeof STATUS_PLANEJAMENTO)[number];

export const STATUS_COMPRA = ['pendente', 'comprado_parcialmente', 'estoque_suficiente'] as const;
export type StatusCompra = (typeof STATUS_COMPRA)[number];

// Entidades do banco (espelham as tabelas)
export interface PlanejamentoAtividade {
  id: string;
  talhao_id: string;
  ciclo_id: string | null;
  tipo_operacao: TipoOperacao;
  data_prevista: string; // date ISO
  status: StatusPlanejamento;
  observacoes: string | null;
  fazenda_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanejamentoInsumo {
  id: string;
  planejamento_id: string;
  insumo_id: string;
  quantidade: number;
  fazenda_id: string;
  created_at: string;
}

// DTOs de leitura enriquecida
export interface PlanejamentoAtividadeComDetalhes extends PlanejamentoAtividade {
  talhao: { id: string; nome: string; area_ha: number | null };
  ciclo: { id: string; cultura: string } | null;
  insumos: PlanejamentoInsumoComInsumo[];
}

export interface PlanejamentoInsumoComInsumo extends PlanejamentoInsumo {
  insumo: {
    id: string;
    nome: string;
    unidade: string;
    estoque_atual: number;
    preco_unitario: number | null;
    ativo: boolean;
  };
}

// DTO do relatório consolidado (uma linha por insumo)
export interface LinhaRelatorioCompras {
  insumo_id: string;
  insumo_nome: string;
  unidade: string;
  total_planejado: number;
  estoque_atual: number;
  quantidade_a_comprar: number; // MAX(0, total_planejado - estoque_atual)
  preco_unitario: number | null;
  valor_estimado: number | null; // null se preco_unitario for null
  status_compra: StatusCompra;
  planejamentos_ids: string[]; // IDs das atividades que originaram a demanda
}

// Filtros do relatório
export interface FiltrosRelatorio {
  data_inicio?: string;
  data_fim?: string;
  talhao_id?: string;
  status_atividade?: StatusPlanejamento;
  apenas_com_necessidade?: boolean; // toggle "ocultar estoque suficiente"
}
```

---

### 4.2 Schemas Zod — `lib/validations/planejamento-compras.ts`

```typescript
import { z } from 'zod';
import { TIPOS_OPERACAO, STATUS_PLANEJAMENTO } from '../types/planejamento-compras';

export const planejamentoAtividadeSchema = z.object({
  talhao_id: z.string().uuid('Selecione um talhão'),
  ciclo_id: z.string().uuid().nullable().optional(),
  tipo_operacao: z.enum(TIPOS_OPERACAO, { required_error: 'Selecione o tipo de operação' }),
  data_prevista: z.string().min(1, 'Data prevista é obrigatória'),
  observacoes: z.string().max(500).nullable().optional(),
});

export const atualizarStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUS_PLANEJAMENTO),
});

export const planejamentoInsumoSchema = z.object({
  planejamento_id: z.string().uuid(),
  insumo_id: z.string().uuid('Selecione um insumo'),
  quantidade: z.number({ invalid_type_error: 'Informe a quantidade' }).positive('Quantidade deve ser maior que zero'),
});

export const atualizarQuantidadeInsumoSchema = z.object({
  id: z.string().uuid(),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
});

export const marcarComoCompradoSchema = z.object({
  insumo_id: z.string().uuid(),
  quantidade_comprada: z.number().positive('Quantidade deve ser maior que zero'),
  valor_unitario_pago: z.number().positive().nullable().optional(),
  data_compra: z.string().min(1, 'Informe a data de compra'),
  // IDs das atividades cujos planejamentos serão marcados como origem
  planejamentos_ids: z.array(z.string().uuid()).min(1),
});

export const filtrosRelatorioSchema = z.object({
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  talhao_id: z.string().uuid().optional(),
  status_atividade: z.enum(STATUS_PLANEJAMENTO).optional(),
  apenas_com_necessidade: z.boolean().optional(),
});

export type PlanejamentoAtividadeInput = z.infer<typeof planejamentoAtividadeSchema>;
export type PlanejamentoInsumoInput = z.infer<typeof planejamentoInsumoSchema>;
export type MarcarComoCompradoInput = z.infer<typeof marcarComoCompradoSchema>;
export type FiltrosRelatorioInput = z.infer<typeof filtrosRelatorioSchema>;
```

---

## 5. Estrutura de Arquivos

```
app/
└── dashboard/
    └── planejamento-compras/
        ├── layout.tsx                     # Guard: Visualizador vê em leitura; sem restrição de acesso total
        ├── page.tsx                       # Página principal: 2 abas — "Atividades" e "Lista de Compras"
        ├── actions.ts                     # Server Actions (criar, atualizar, cancelar, excluir, insumos, comprar)
        └── [id]/
            └── page.tsx                   # Detalhe/edição de atividade planejada

components/
└── planejamento-compras/
    ├── PlanejamentoForm.tsx               # Modal criar/editar atividade planejada
    ├── PlanejamentosList.tsx              # Tabela de atividades planejadas com filtros e ações inline
    ├── InsumoVinculadoForm.tsx            # Sub-form inline para adicionar insumo à atividade
    ├── InsumosList.tsx                    # Lista de insumos vinculados a uma atividade (edição inline)
    ├── RelatorioCompras.tsx               # Tabela do relatório consolidado (agrupa por insumo)
    ├── FiltrosRelatorio.tsx               # Filtros: período, talhão, status, toggle necessidade
    ├── MarcarComoCompradoModal.tsx        # Modal: quantidade comprada, valor pago, data
    ├── StatusCompraBadge.tsx              # Badge colorido: pendente / parcialmente / suficiente
    ├── DeletePlanejamentoDialog.tsx       # Confirm dialog exclusão (Admin only)
    └── InsumoAutocomplete.tsx             # Combobox insumos ativos (reutilizar padrão de ProdutoAutocomplete)

lib/
└── supabase/
    ├── planejamento-compras.ts            # Queries: listar, obter por id, relatório consolidado
    └── planejamento-compras-actions.ts    # Helpers internos para as Server Actions

lib/
└── validations/
    └── planejamento-compras.ts            # Schemas Zod (seção 4.2)

lib/
└── types/
    └── planejamento-compras.ts            # Interfaces e tipos (seção 4.1)
```

---

## 6. Server Actions & Queries

Todas as Server Actions ficam em `app/dashboard/planejamento-compras/actions.ts`. Padrão de retorno: `{ data, error }` ou `{ success, error }`.

---

### 6.1 `criarPlanejamentoAction`

```
Input:  PlanejamentoAtividadeInput (schema Zod)
Output: { data: PlanejamentoAtividade } | { error: string }

Validações:
  - Zod parse (tipo_operacao, data_prevista, talhao_id obrigatórios)
  - if (profile.perfil !== 'Administrador') return { error: 'Apenas administradores podem executar esta ação' }
  - talhao_id: confirmar que pertence à fazenda do usuário via SELECT id FROM talhoes WHERE id = X

Query:
  supabase
    .from('planejamentos_atividade')
    .insert({ talhao_id, ciclo_id, tipo_operacao, data_prevista, observacoes })
    // NÃO enviar fazenda_id — trigger preenche via set_fazenda_id_from_talhao()
    .select('id, talhao_id, tipo_operacao, data_prevista, status, observacoes, fazenda_id, created_at')
    .single()

Revalidação: revalidatePath('/dashboard/planejamento-compras')
```

---

### 6.2 `atualizarPlanejamentoAction`

```
Input:  { id: string } & PlanejamentoAtividadeInput
Output: { success: boolean } | { error: string }

Validações:
  - Zod parse
  - if (profile.perfil !== 'Administrador') return { error: 'Apenas administradores podem executar esta ação' }

Query:
  supabase
    .from('planejamentos_atividade')
    .update({ talhao_id, ciclo_id, tipo_operacao, data_prevista, observacoes })
    .eq('id', id)
    .select('id').single()

Revalidação: revalidatePath('/dashboard/planejamento-compras')
             revalidatePath(`/dashboard/planejamento-compras/${id}`)
```

---

### 6.3 `cancelarPlanejamentoAction`

```
Input:  { id: string }
Output: { success: boolean } | { error: string }

Validações:
  - if (profile.perfil !== 'Administrador') return { error: 'Apenas administradores podem executar esta ação' }
  - Não cancelar atividade já 'executada' (regra de negócio — warning no UI, bloqueio server-side)

Query:
  supabase
    .from('planejamentos_atividade')
    .update({ status: 'cancelada' })
    .eq('id', id)

Revalidação: revalidatePath('/dashboard/planejamento-compras')
```

---

### 6.4 `excluirPlanejamentoAction`

```
Input:  { id: string }
Output: { success: boolean } | { error: string }

Validações:
  - if (profile.perfil !== 'Administrador') return { error: 'Apenas administradores podem executar esta ação' }
  - ON DELETE CASCADE na FK remove planejamento_insumos automaticamente

Query:
  supabase
    .from('planejamentos_atividade')
    .delete()
    .eq('id', id)

Revalidação: revalidatePath('/dashboard/planejamento-compras')
```

---

### 6.5 `adicionarInsumoAoPlanejamentoAction`

```
Input:  PlanejamentoInsumoInput
Output: { data: PlanejamentoInsumoComInsumo } | { error: string }

Validações:
  - Zod parse
  - if (profile.perfil !== 'Administrador') return { error: 'Apenas administradores podem executar esta ação' }
  - insumo.ativo === true (verificar antes de inserir)
  - UNIQUE constraint no banco garante deduplica; tratar erro code '23505' com mensagem "Insumo já adicionado"

Query:
  supabase
    .from('planejamento_insumos')
    .insert({ planejamento_id, insumo_id, quantidade })
    // NÃO enviar fazenda_id — trigger preenche
    .select('id, planejamento_id, insumo_id, quantidade, insumo:insumos(id, nome, unidade, estoque_atual, preco_unitario, ativo)')
    .single()

Revalidação: revalidatePath(`/dashboard/planejamento-compras/${planejamento_id}`)
```

---

### 6.6 `removerInsumoDoPlanejamentoAction`

```
Input:  { id: string } // id do registro em planejamento_insumos
Output: { success: boolean } | { error: string }

Validações:
  - if (profile.perfil !== 'Administrador') return { error: 'Apenas administradores podem executar esta ação' }

Query:
  supabase
    .from('planejamento_insumos')
    .delete()
    .eq('id', id)

Revalidação: revalidatePath('/dashboard/planejamento-compras')
```

---

### 6.7 `atualizarQuantidadeInsumoAction`

```
Input:  { id: string; quantidade: number }
Output: { success: boolean } | { error: string }

Validações:
  - if (profile.perfil !== 'Administrador') return { error: 'Apenas administradores podem executar esta ação' }

Query:
  supabase
    .from('planejamento_insumos')
    .update({ quantidade })
    .eq('id', id)

Revalidação: revalidatePath('/dashboard/planejamento-compras')
```

---

### 6.8 `listarPlanejamentosQuery` (query, não action)

```
Input:  { fazendaId: string; filtros?: { status?, talhao_id?, data_inicio?, data_fim? } }
Output: PlanejamentoAtividadeComDetalhes[]

Validações:
  - if (profile.perfil === 'Operador') return [] (ou redirect — Operador não acessa o módulo)

Query:
  supabase
    .from('planejamentos_atividade')
    .select(`
      id, talhao_id, ciclo_id, tipo_operacao, data_prevista, status, observacoes, created_at, updated_at,
      talhao:talhoes(id, nome, area_ha),
      ciclo:ciclos_agricolas(id, cultura),
      insumos:planejamento_insumos(
        id, insumo_id, quantidade,
        insumo:insumos(id, nome, unidade, estoque_atual, preco_unitario, ativo)
      )
    `)
    .eq('fazenda_id', fazendaId)
    .in('status', filtros.status ? [filtros.status] : ['planejada', 'executada', 'cancelada'])
    .gte('data_prevista', filtros.data_inicio)   // se presente
    .lte('data_prevista', filtros.data_fim)       // se presente
    .eq('talhao_id', filtros.talhao_id)           // se presente
    .order('data_prevista', { ascending: true })
```

---

### 6.9 `obterListaConsolidadaComprasQuery` (query principal do relatório)

```
Input:  { fazendaId: string; filtros: FiltrosRelatorio }
Output: LinhaRelatorioCompras[]

Validações:
  - if (profile.perfil === 'Operador') return [] (ou redirect — Operador não acessa o módulo)

Estratégia: buscar dados brutos e calcular em JS (sem RPC) para manter transparência e simplicidade.

Passo 1 — Buscar vínculos de insumos de atividades planejadas dentro dos filtros:
  supabase
    .from('planejamento_insumos')
    .select(`
      insumo_id, quantidade,
      planejamento:planejamentos_atividade!inner(
        id, status, data_prevista, talhao_id
      ),
      insumo:insumos(id, nome, unidade, estoque_atual, preco_unitario, ativo)
    `)
    .eq('fazenda_id', fazendaId)
    .eq('planejamento.status', filtros.status_atividade ?? 'planejada')
    .gte('planejamento.data_prevista', filtros.data_inicio)
    .lte('planejamento.data_prevista', filtros.data_fim)
    .eq('planejamento.talhao_id', filtros.talhao_id) // se presente

Passo 2 — Agrupar por insumo_id em JS:
  Para cada grupo:
    total_planejado     = SUM(quantidade)
    estoque_atual       = insumo.estoque_atual  (lido uma vez, de qualquer linha do grupo)
    quantidade_a_comprar = MAX(0, total_planejado - estoque_atual)
    valor_estimado       = insumo.preco_unitario != null ? quantidade_a_comprar * preco_unitario : null
    status_compra:
      se quantidade_a_comprar === 0       → 'estoque_suficiente'
      se quantidade_a_comprar < total_planejado → 'comprado_parcialmente'  (estoque parcialmente cobre)
      se quantidade_a_comprar === total_planejado → 'pendente'

Passo 3 — Filtrar se apenas_com_necessidade === true:
  remover linhas com status_compra === 'estoque_suficiente'

Passo 4 — Ordenar por valor_estimado DESC (nulls por último), depois por insumo_nome ASC
```

**Nota:** O status "comprado parcialmente" aqui significa que o estoque atual cobre parte da demanda planejada. Ele é derivado em runtime — não é persistido. Isso evita inconsistência: se o usuário registrar uma entrada manual de insumo pelo módulo de Insumos, o relatório atualiza automaticamente na próxima consulta.

---

### 6.10 `marcarComoCompradoAction`

```
Input:  MarcarComoCompradoInput
Output: { success: boolean } | { error: string }

Validações:
  - Zod parse
  - if (profile.perfil !== 'Administrador') return { error: 'Apenas administradores podem executar esta ação' }
  - quantidade_comprada > 0 (Zod)
  - insumo_id pertence à fazenda do usuário

Passos:
  1. INSERT em movimentacoes_insumo:
     {
       insumo_id,
       tipo: 'Entrada',
       quantidade: quantidade_comprada,
       data: data_compra,
       valor_unitario: valor_unitario_pago,  // null se não informado
       origem: 'planejamento',
       observacoes: `Compra para planejamento de atividades`
     }
     // NÃO enviar fazenda_id — isolamento via RLS (insumo pertence à fazenda)
     // Trigger atualizar_custo_medio_e_estoque() dispara automaticamente após INSERT

  2. Se INSERT falhar: retornar erro com mensagem clara

  3. Sem necessidade de UPDATE manual em insumos.estoque_atual — trigger cuida

Revalidação: revalidatePath('/dashboard/planejamento-compras')
             revalidatePath('/dashboard/insumos')
```

---

## 7. Componentes UI

### 7.1 `app/dashboard/planejamento-compras/layout.tsx` e `page.tsx`
- `layout.tsx`: guard de acesso — se `profile.perfil === 'Operador'`, redirecionar para `/dashboard` (padrão igual ao módulo Produtos). Visualizador passa.
- `page.tsx`: Server Component (ou Client com `use client` apenas para estado das abas)
- 2 abas: **"Atividades Planejadas"** e **"Lista de Compras"**
- shadcn/ui: `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`
- Botões de escrita ("Nova Atividade", "Marcar como comprado" etc.) — visíveis apenas para `profile.perfil === 'Administrador'`

### 7.2 `PlanejamentosList.tsx`
- Tabela de atividades planejadas com colunas: Talhão, Tipo, Data Prevista, Status, Nº Insumos, Ações
- Ações inline: Editar, Cancelar, Excluir (Excluir visível apenas Admin)
- Filtros: busca por talhão, filtro de status
- shadcn/ui: `Table`, `Badge`, `Button`, `DropdownMenu`

### 7.3 `PlanejamentoForm.tsx`
- Modal criar/editar atividade
- Campos: talhão (autocomplete), tipo operação (Select), data prevista (DatePicker), ciclo (Select opcional), observações (Textarea)
- React Hook Form + Zod (`planejamentoAtividadeSchema`)
- shadcn/ui: `Dialog`, `Form`, `Select`, `Input`, `Textarea`, `Button`

### 7.4 `InsumoVinculadoForm.tsx`
- Sub-form inline na tela de detalhe da atividade
- Campos: insumo (InsumoAutocomplete), quantidade (Input numérico)
- Mostra unidade do insumo ao lado da quantidade
- Ao selecionar insumo inativo (pode ocorrer se já vinculado), exibe badge "Inativo"

### 7.5 `InsumosList.tsx`
- Lista de insumos vinculados à atividade
- Edição inline de quantidade (Input com debounce)
- Botão remover por linha
- shadcn/ui: `Table`, `Input`, `Button`

### 7.6 `RelatorioCompras.tsx`
- Tabela principal do relatório consolidado
- Colunas: Insumo, Unidade, Total Planejado, Estoque Atual, Qtd. a Comprar, Preço Unit., Valor Est., Status, Ação
- Linha de totais no rodapé (soma de valor estimado — apenas insumos com preço)
- Banner no topo se algum insumo não tem `preco_unitario` (sugere preencher)
- shadcn/ui: `Table`, `Badge`, `Button`

### 7.7 `FiltrosRelatorio.tsx`
- Filtros: DatePicker de/até, Select talhão, Select status atividade, Switch "apenas com necessidade"
- Acopla ao estado da página via `useState` ou `useSearchParams`
- shadcn/ui: `DatePicker`, `Select`, `Switch`, `Button`

### 7.8 `MarcarComoCompradoModal.tsx`
- Modal acionado pelo botão na linha do relatório
- Campos: quantidade comprada (padrão: `quantidade_a_comprar`), valor unitário pago (opcional), data de compra (padrão: hoje)
- Chama `marcarComoCompradoAction`
- Feedback: Toast Sonner ao sucesso/erro
- shadcn/ui: `Dialog`, `Form`, `Input`, `Button`

### 7.9 `StatusCompraBadge.tsx`
- Componente puro: recebe `StatusCompra` e renderiza badge colorido
  - `pendente` → vermelho (`destructive`)
  - `comprado_parcialmente` → amarelo (`warning` / cor alert gold do design system)
  - `estoque_suficiente` → verde (`success`)

### 7.10 `DeletePlanejamentoDialog.tsx`
- Confirm dialog de exclusão
- Renderizado apenas quando `profile.perfil === 'Administrador'`
- shadcn/ui: `AlertDialog`

### 7.11 `InsumoAutocomplete.tsx`
- Combobox assíncrono buscando insumos ativos da fazenda
- Filtra `ativo = true`
- Mostra nome + unidade na lista
- Padrão idêntico ao `ProdutoAutocomplete.tsx` do módulo Produtos
- shadcn/ui: `Popover`, `Command`, `CommandInput`, `CommandItem`

### 7.12 Guards de permissão
| Ação | Verificação |
|------|------------|
| Acesso ao módulo (layout) | `profile.perfil === 'Administrador' \|\| profile.perfil === 'Visualizador'` — Operador é redirecionado para `/dashboard` |
| Botão "Nova Atividade" | `profile.perfil === 'Administrador'` |
| Botão "Editar Atividade" | `profile.perfil === 'Administrador'` |
| Botão "Cancelar Atividade" | `profile.perfil === 'Administrador'` |
| Botão "Excluir Atividade" | `profile.perfil === 'Administrador'` |
| Botão "Adicionar/Remover Insumo" | `profile.perfil === 'Administrador'` |
| Botão "Marcar como Comprado" | `profile.perfil === 'Administrador'` |
| Server Actions de escrita | `profile.perfil !== 'Administrador'` → return error no início da action |
| Visualizador | Acesso somente leitura ao relatório e detalhes (sem nenhum botão de escrita) |

---

## 8. Sidebar

**Arquivo a modificar:** `components/Sidebar.tsx`

**Localização:** o array `ferramentasRoutes` (linha ~59) é renderizado para todos os perfis. Como Operador não deve ver o item, a solução mais limpa é **não usar o array estático** para este item — em vez disso, renderizar condicionalmente dentro do bloco "Ferramentas" verificando `profile?.perfil`.

```typescript
// Opção A — array filtrado por perfil (padrão mais simples):
const ferramentasRoutes: RouteItem[] = [
  { label: 'Plan. Silagem', icon: NotebookPen, href: '/dashboard/planejamento-silagem' },
  // Plan. Compras é adicionado condicionalmente abaixo, fora do array
  { label: 'Calculadoras',  icon: Calculator,  href: '/dashboard/calculadoras' },
];

// No JSX, dentro do bloco Ferramentas, após o map do ferramentasRoutes:
{(profile?.perfil === 'Administrador' || profile?.perfil === 'Visualizador') && (
  <SidebarRouteItem
    route={{ label: 'Plan. Compras', icon: ShoppingCart, href: '/dashboard/planejamento-compras' }}
    // ... demais props
  />
)}

// Opção B — filtrar o array com base no perfil antes do map (se o Sidebar já suportar isso):
// Adicionar propriedade `allowedPerfis?: string[]` ao tipo RouteItem e filtrar no render.
```

**Ícone:** `ShoppingCart` do Lucide React — semântico (lista de compras), já disponível no pacote.

**Import necessário:** adicionar `ShoppingCart` ao import do Lucide no topo do `Sidebar.tsx`.

**Regra:** item visível apenas para `profile.perfil === 'Administrador' || profile.perfil === 'Visualizador'`. Operador não vê o item.

---

## 9. Cálculos & Query do Relatório

### Pseudo-SQL conceitual (executado em JS após fetch)

```sql
-- Passo 1: buscar dados brutos
SELECT
  pi.insumo_id,
  i.nome           AS insumo_nome,
  i.unidade,
  pi.quantidade,
  pa.id            AS planejamento_id,
  i.estoque_atual,
  i.preco_unitario
FROM planejamento_insumos pi
  INNER JOIN planejamentos_atividade pa ON pa.id = pi.planejamento_id
  INNER JOIN insumos i                  ON i.id  = pi.insumo_id
WHERE pi.fazenda_id = :fazenda_id
  AND pa.status     = 'planejada'                        -- filtro de status
  AND pa.data_prevista BETWEEN :data_inicio AND :data_fim -- filtro de período
  AND (:talhao_id IS NULL OR pa.talhao_id = :talhao_id)  -- filtro de talhão

-- Passo 2: agrupar em JS
GROUP BY insumo_id:
  total_planejado      = SUM(quantidade)
  estoque_atual        = i.estoque_atual         (constante por insumo)
  quantidade_a_comprar = MAX(0, total_planejado - estoque_atual)
  valor_estimado       = CASE
                           WHEN preco_unitario IS NOT NULL
                           THEN quantidade_a_comprar * preco_unitario
                           ELSE NULL
                         END
  status_compra        = CASE
                           WHEN quantidade_a_comprar = 0
                             THEN 'estoque_suficiente'
                           WHEN estoque_atual > 0 AND estoque_atual < total_planejado
                             THEN 'comprado_parcialmente'
                           ELSE 'pendente'
                         END

-- Passo 3: ORDER BY
ORDER BY valor_estimado DESC NULLS LAST, insumo_nome ASC
```

### Cálculo do total geral estimado

```
total_geral = SUM(valor_estimado) WHERE valor_estimado IS NOT NULL
```

Exibido no rodapé do relatório com `formatBRL(total_geral)`.

---

## 10. Plano de Testes

### 10.1 Testes unitários (Vitest)

| Caso | Arquivo sugerido |
|------|-----------------|
| `planejamentoAtividadeSchema` — validação de campos obrigatórios | `__tests__/validations/planejamento-compras.test.ts` |
| `planejamentoAtividadeSchema` — enum de tipo_operacao inválido | idem |
| `marcarComoCompradoSchema` — quantidade negativa bloqueada | idem |
| Cálculo de `quantidade_a_comprar = MAX(0, total - estoque)` | `__tests__/utils/planejamento-compras.test.ts` |
| Cálculo de `valor_estimado = null` quando `preco_unitario = null` | idem |
| Lógica de `status_compra` nos 3 cenários | idem |
| Agrupamento de linhas por `insumo_id` no relatório | idem |

### 10.2 Testes de integração (Server Actions com Supabase)

| Caso | Action |
|------|--------|
| Criar planejamento — trigger preenche `fazenda_id` | `criarPlanejamentoAction` |
| Adicionar insumo inativo — bloqueado | `adicionarInsumoAoPlanejamentoAction` |
| Adicionar mesmo insumo duas vezes — erro `23505` tratado | `adicionarInsumoAoPlanejamentoAction` |
| Marcar como comprado — `movimentacoes_insumo` criada com `origem = 'planejamento'` | `marcarComoCompradoAction` |
| Marcar como comprado — `insumos.estoque_atual` atualizado via trigger | `marcarComoCompradoAction` |
| Excluir atividade com Operador — bloqueado pelo RLS | `excluirPlanejamentoAction` |
| Excluir atividade com Admin — planejamento_insumos removido em cascade | `excluirPlanejamentoAction` |

### 10.3 Testes E2E (Fluxos do PRD)

| Fluxo | Cenário |
|-------|---------|
| **Fluxo A** | Criar atividade → adicionar 2 insumos → verificar status `planejada` |
| **Fluxo B** | Acessar "Lista de Compras" → verificar agrupamento por insumo → aplicar filtro de período |
| **Fluxo C** | Marcar insumo como comprado (parcial) → verificar status `comprado_parcialmente` → completar compra → status `estoque_suficiente` |
| **Fluxo D** | Cancelar atividade → verificar que insumos não aparecem mais no relatório |

### 10.4 Testes de RLS (isolamento entre fazendas e perfis)

| Caso | Verificação |
|------|------------|
| Usuário fazenda A não lê planejamentos da fazenda B | SELECT retorna vazio |
| Usuário fazenda A não consegue inserir com `talhao_id` de fazenda B | INSERT falha (trigger preenche `fazenda_id` incorreto → RLS bloqueia) |
| Operador tenta SELECT em `planejamentos_atividade` diretamente | Retorna vazio — `sou_admin_ou_visualizador()` bloqueia no banco |
| Operador tenta INSERT em `planejamentos_atividade` diretamente | INSERT falha — policy `_insert_admin` exige `sou_admin()` |
| Visualizador faz SELECT | Recebe dados normalmente — `sou_admin_ou_visualizador()` permite |
| Visualizador tenta INSERT diretamente | INSERT falha — policy `_insert_admin` exige `sou_admin()` |
| Visualizador tenta `marcarComoComprado` via action | Server Action bloqueia antes do banco com mensagem de erro |
| Admin exclui atividade | CASCADE remove `planejamento_insumos` automaticamente |

---

## 11. Plano de Implementação (Fase 3)

1. Criar arquivo de migration SQL (`supabase/migrations/YYYYMMDDHHMMSS_planejamento_compras.sql`) com o DDL da seção 2.5
2. Aplicar migration no banco (`supabase db push`)
3. Gerar tipos TypeScript (`npm run db:types`)
4. Criar `lib/types/planejamento-compras.ts` (seção 4.1)
5. Criar `lib/validations/planejamento-compras.ts` (seção 4.2)
6. Criar `lib/supabase/planejamento-compras.ts` com queries (seção 6.8 e 6.9)
7. Criar `app/dashboard/planejamento-compras/actions.ts` com Server Actions (seções 6.1–6.10)
8. Criar `app/dashboard/planejamento-compras/layout.tsx` (guard de Visualizador)
9. Criar `app/dashboard/planejamento-compras/page.tsx` (estrutura com abas)
10. Criar `app/dashboard/planejamento-compras/[id]/page.tsx` (detalhe da atividade)
11. Criar componentes UI (seção 7) na ordem: `StatusCompraBadge` → `InsumoAutocomplete` → `PlanejamentoForm` → `PlanejamentosList` → `InsumoVinculadoForm` → `InsumosList` → `FiltrosRelatorio` → `RelatorioCompras` → `MarcarComoCompradoModal` → `DeletePlanejamentoDialog`
12. Adicionar item no Sidebar (seção 8)
13. Rodar `npm run build` e `npm run test` — confirmar 673+ testes passando

---

## 12. Pontos de Atenção & Riscos Técnicos

### Performance da query do relatório
A query do relatório faz INNER JOIN entre `planejamento_insumos`, `planejamentos_atividade` e `insumos`. Com os índices da seção 2.3, o plano de execução deve ser eficiente para o volume esperado (dezenas de atividades por fazenda). Se no futuro o volume crescer (centenas de atividades), considerar uma RPC SQL que execute o GROUP BY no banco em vez de em JS.

### Status "comprado parcialmente" calculado em runtime
Decisão intencional: não persistir este status. Vantagem: estoque sempre atualizado sem necessidade de sincronização. Desvantagem: se o produtor registrar uma entrada de insumo pelo módulo Insumos (sem usar "Marcar como comprado"), o relatório reflete automaticamente, o que é o comportamento correto. **Não há inconsistência possível.**

### `preco_unitario` não preenchido
O PRD estima média a alta incidência. Implementar banner no relatório sugerindo preencher preços — acionar quando há insumos com `preco_unitario = null` no resultado.

### Trigger `update_updated_at_planejamentos()` reutilizado
A função já existe (criada para `planejamentos_silagem`). Verificar na migration se o nome do trigger conflita com o da tabela `planejamentos_silagem` — triggers são nomeados por tabela, então não há conflito.

### Módulo restrito — Operador sem acesso
Apenas Administrador tem acesso de escrita; Visualizador tem leitura. Operador não tem acesso ao módulo: o `layout.tsx` redireciona para `/dashboard`, o item do Sidebar é oculto e as RLS policies bloqueiam qualquer acesso direto ao banco. Dupla camada de proteção (UI + banco).

### Insumos inativos já vinculados
Insumos podem ser desativados após já estarem vinculados a planejamentos. A query do relatório traz o insumo mesmo se `ativo = false` (pois o vínculo existe), e o componente `InsumosList.tsx` exibe badge "Inativo". Novos vínculos bloqueados via `InsumoAutocomplete` (filtra `ativo = true`) e validação na Server Action.

### `ciclo_id` como FK com `ON DELETE SET NULL`
Se o ciclo agrícola for excluído, o campo fica `null` no planejamento. A UI deve tratar `ciclo = null` sem quebrar (exibir "—" ou "Sem ciclo").

### Limite de colunas explícitas no `.select()`
Seguindo o padrão do projeto (`NUNCA select('*')`), todos os `.select()` listam colunas explicitamente. Manter essa disciplina em todas as queries do módulo.
