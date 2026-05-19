# SPEC Técnica — Módulo Produtos (GestSilo Pro)

> **Status**: v1 — 2026-05-19
> **Baseado em**: PRD-produtos.md v2
> **Pré-requisito**: PRD aprovado (decisões P1–P6 e Cat. fechadas)

---

## 1. Migrations SQL

Ordem de execução obrigatória:

```
001_create_helper_sou_admin_ou_visualizador
002_create_categorias_produto
003_create_produtos
004_create_movimentacoes_produto
005_alter_movimentacoes_insumo_add_produto_origem
006_alter_movimentacoes_silo_venda
```

---

### 001_create_helper_sou_admin_ou_visualizador.sql

> `sou_admin_ou_visualizador()` **não existe** no banco (confirmado: zero ocorrências fora do PRD). Criar incondicionalmente.

```sql
-- Helper RLS: retorna true para Administrador ou Visualizador (bloqueia Operador)
CREATE OR REPLACE FUNCTION public.sou_admin_ou_visualizador()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT coalesce(
    auth.jwt() -> 'user_metadata' ->> 'perfil' IN ('Administrador', 'Visualizador'),
    false
  );
$$;
```

---

### 002_create_categorias_produto.sql

```sql
CREATE TABLE IF NOT EXISTS public.categorias_produto (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text        NOT NULL UNIQUE,
  unidade_padrao text        NOT NULL,
  icone          text        NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Seed das 9 categorias
INSERT INTO public.categorias_produto (nome, unidade_padrao, icone) VALUES
  ('Grãos',             'sacas',    'wheat'),
  ('Feno',              'fardos',   'package'),
  ('Pré-secado',        'kg',       'leaf'),
  ('Sementes',          'kg',       'sprout'),
  ('Leite',             'litros',   'droplets'),
  ('Arrobas',           '@',        'scale'),
  ('Animais',           'cabeças',  'beef'),
  ('Material Genético', 'doses',    'flask-conical'),
  ('Outros',            'unidade',  'box')
ON CONFLICT (nome) DO NOTHING;

-- RLS: SELECT para todos autenticados; escrita apenas service_role
ALTER TABLE public.categorias_produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_produto_select_autenticados"
  ON public.categorias_produto FOR SELECT
  TO authenticated
  USING (true);
-- INSERT/UPDATE/DELETE: sem policy → apenas service_role pode escrever
```

---

### 003_create_produtos.sql

```sql
-- Extensão trgm para busca por nome (verificar se já existe)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.produtos (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             text        NOT NULL,
  categoria_id     uuid        NOT NULL REFERENCES public.categorias_produto(id),
  unidade          text        NOT NULL,
  estoque_atual    numeric     NOT NULL DEFAULT 0,
  estoque_minimo   numeric     NOT NULL DEFAULT 0,
  custo_referencia numeric     NULL,
  local_armazen    varchar     NULL,
  observacoes      text        NULL,
  ativo            boolean     NOT NULL DEFAULT true,
  fazenda_id       uuid        NULL REFERENCES public.fazendas(id),
  criado_por       uuid        NULL REFERENCES auth.users(id),
  atualizado_por   uuid        NULL REFERENCES auth.users(id),
  atualizado_em    timestamptz NOT NULL DEFAULT now(),
  data_cadastro    date        NOT NULL DEFAULT CURRENT_DATE,
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_produtos_estoque_minimo_nonneg
    CHECK (estoque_minimo >= 0),
  CONSTRAINT chk_produtos_custo_referencia_nonneg
    CHECK (custo_referencia IS NULL OR custo_referencia >= 0)
);

-- Trigger: preencher fazenda_id automaticamente via get_minha_fazenda_id()
CREATE OR REPLACE FUNCTION public.trg_fn_produtos_set_fazenda_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.fazenda_id IS NULL THEN
    NEW.fazenda_id := public.get_minha_fazenda_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_produtos_set_fazenda_id
  BEFORE INSERT ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_produtos_set_fazenda_id();

-- Trigger: atualizar atualizado_em em UPDATE
CREATE OR REPLACE FUNCTION public.trg_fn_set_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

-- Reutilizar função genérica se já existir; criar trigger específico
CREATE TRIGGER trg_produtos_atualizado_em
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_atualizado_em();

-- Índices
CREATE INDEX idx_produtos_fazenda_id      ON public.produtos USING btree (fazenda_id);
CREATE INDEX idx_produtos_fazenda_ativo   ON public.produtos USING btree (fazenda_id, ativo);
CREATE INDEX idx_produtos_categoria_id    ON public.produtos USING btree (categoria_id);
CREATE INDEX idx_produtos_nome_trgm       ON public.produtos USING gin   (nome gin_trgm_ops);

-- RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produtos_select_admin_visualizador"
  ON public.produtos FOR SELECT
  TO authenticated
  USING (
    fazenda_id = public.get_minha_fazenda_id()
    AND public.sou_admin_ou_visualizador()
  );

CREATE POLICY "produtos_insert_admin"
  ON public.produtos FOR INSERT
  TO authenticated
  WITH CHECK (public.sou_admin());

CREATE POLICY "produtos_update_admin"
  ON public.produtos FOR UPDATE
  TO authenticated
  USING (
    fazenda_id = public.get_minha_fazenda_id()
    AND public.sou_admin()
  );

CREATE POLICY "produtos_delete_admin"
  ON public.produtos FOR DELETE
  TO authenticated
  USING (
    fazenda_id = public.get_minha_fazenda_id()
    AND public.sou_admin()
  );
```

---

### 004_create_movimentacoes_produto.sql

```sql
CREATE TABLE IF NOT EXISTS public.movimentacoes_produto (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id        uuid        NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo              text        NOT NULL,
  tipo_entrada      varchar     NULL,
  tipo_saida        varchar     NULL,
  quantidade        numeric     NOT NULL,
  valor_unitario    numeric     NULL,
  data              date        NOT NULL DEFAULT CURRENT_DATE,
  responsavel       text        NULL,
  observacoes       text        NULL,
  origem            varchar     NOT NULL DEFAULT 'manual',
  sinal_ajuste      smallint    NULL,
  receita_id        uuid        NULL REFERENCES public.financeiro(id) ON DELETE SET NULL,
  insumo_id_destino uuid        NULL REFERENCES public.insumos(id) ON DELETE SET NULL,
  criado_por        uuid        NULL REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_mov_produto_tipo
    CHECK (tipo = ANY (ARRAY['Entrada','Saída','Ajuste'])),
  CONSTRAINT chk_mov_produto_tipo_entrada
    CHECK (tipo_entrada IS NULL OR tipo_entrada = ANY (
      ARRAY['COLHEITA','COMPRA','TRANSFERENCIA_INSUMO','AJUSTE_INICIAL']
    )),
  CONSTRAINT chk_mov_produto_tipo_saida
    CHECK (tipo_saida IS NULL OR tipo_saida = ANY (
      ARRAY['VENDA','CONSUMO_PROPRIO','PERDA','DOACAO','TRANSFERENCIA_INSUMO','DESCARTE']
    )),
  CONSTRAINT chk_mov_produto_sinal_ajuste
    CHECK (sinal_ajuste IS NULL OR sinal_ajuste = ANY (ARRAY[-1,1])),
  CONSTRAINT chk_mov_produto_quantidade_pos
    CHECK (quantidade > 0),
  CONSTRAINT chk_mov_produto_origem
    CHECK (origem = ANY (ARRAY['manual','rebanho','talhao','silo']))
);

-- Trigger: atualizar produtos.estoque_atual após INSERT
CREATE OR REPLACE FUNCTION public.trg_fn_mov_produto_atualiza_estoque()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  delta numeric;
BEGIN
  IF NEW.tipo = 'Entrada' THEN
    delta := NEW.quantidade;
  ELSIF NEW.tipo = 'Saída' THEN
    delta := -NEW.quantidade;
  ELSIF NEW.tipo = 'Ajuste' THEN
    delta := NEW.quantidade * NEW.sinal_ajuste;
  ELSE
    RETURN NEW;
  END IF;

  UPDATE public.produtos
  SET estoque_atual = estoque_atual + delta
  WHERE id = NEW.produto_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mov_produto_atualiza_estoque
  AFTER INSERT ON public.movimentacoes_produto
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_mov_produto_atualiza_estoque();

-- Índices
CREATE INDEX idx_mov_produto_produto_id ON public.movimentacoes_produto USING btree (produto_id);
CREATE INDEX idx_mov_produto_data       ON public.movimentacoes_produto USING btree (data DESC);
CREATE INDEX idx_mov_produto_receita_id ON public.movimentacoes_produto USING btree (receita_id);

-- RLS
ALTER TABLE public.movimentacoes_produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mov_produto_select_admin_visualizador"
  ON public.movimentacoes_produto FOR SELECT
  TO authenticated
  USING (
    produto_id IN (
      SELECT id FROM public.produtos
      WHERE fazenda_id = public.get_minha_fazenda_id()
    )
    AND public.sou_admin_ou_visualizador()
  );

CREATE POLICY "mov_produto_insert_admin"
  ON public.movimentacoes_produto FOR INSERT
  TO authenticated
  WITH CHECK (
    produto_id IN (
      SELECT id FROM public.produtos
      WHERE fazenda_id = public.get_minha_fazenda_id()
    )
    AND public.sou_admin()
  );

CREATE POLICY "mov_produto_update_admin"
  ON public.movimentacoes_produto FOR UPDATE
  TO authenticated
  USING (public.sou_admin());

CREATE POLICY "mov_produto_delete_admin"
  ON public.movimentacoes_produto FOR DELETE
  TO authenticated
  USING (public.sou_admin());
```

---

### 005_alter_movimentacoes_insumo_add_produto_origem.sql

```sql
-- Adicionar coluna de rastreabilidade bidirecional Produto → Insumo
ALTER TABLE public.movimentacoes_insumo
  ADD COLUMN IF NOT EXISTS produto_id_origem uuid NULL
    REFERENCES public.produtos(id) ON DELETE SET NULL;

-- Atualizar CHECK chk_origem para incluir 'produto'
-- Verificar nome exato do constraint antes de rodar:
--   SELECT conname FROM pg_constraint WHERE conrelid='movimentacoes_insumo'::regclass AND contype='c' AND conname LIKE '%origem%';
ALTER TABLE public.movimentacoes_insumo
  DROP CONSTRAINT IF EXISTS chk_origem;

ALTER TABLE public.movimentacoes_insumo
  ADD CONSTRAINT chk_origem CHECK (
    origem = ANY (ARRAY[
      'manual','talhao','frota','silo','financeiro','produto'
    ]::varchar[])
  );
```

---

### 006_alter_movimentacoes_silo_venda.sql

```sql
-- Suporte completo a venda de silagem (Cenário B — ver PRD §5.4 e §6.7)
ALTER TABLE public.movimentacoes_silo
  ADD COLUMN IF NOT EXISTS valor_unitario numeric NULL,
  ADD COLUMN IF NOT EXISTS comprador      varchar NULL,
  ADD COLUMN IF NOT EXISTS receita_id     uuid    NULL
    REFERENCES public.financeiro(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mov_silo_receita_id
  ON public.movimentacoes_silo USING btree (receita_id);
```

---

## 2. Estrutura de Arquivos

### Arquivos novos a criar

```
app/dashboard/produtos/
├── layout.tsx                    # Guard: redireciona Operador → /dashboard
├── page.tsx                      # Página principal (estado, hooks, composição)
├── actions.ts                    # Server Actions (criar, entrada, saída, ajuste, deletar)
└── components/
    ├── ProdutoForm.tsx            # Modal criar/editar produto
    ├── EntradaForm.tsx            # Modal registrar entrada
    ├── SaidaForm.tsx              # Modal registrar saída (+ campos condicionais por tipo_saida)
    ├── TransferenciaInsumoForm.tsx # Modal saída tipo TRANSFERENCIA_INSUMO
    ├── AjusteInventario.tsx       # Modal ajuste de estoque
    ├── AlertsSection.tsx          # Faixa de alertas estoque abaixo do mínimo
    ├── ProdutosList.tsx           # Tabela de produtos com ações inline
    ├── ProdutosFilters.tsx        # Busca + filtros categoria/status
    ├── UltimasMovimentacoes.tsx   # Card com 10 movimentações mais recentes
    ├── DeleteProdutoDialog.tsx    # Confirm dialog exclusão
    └── ProdutoAutocomplete.tsx    # Combobox assíncrono (usado em TransferenciaInsumoForm)

lib/validations/produtos.ts       # 4 schemas Zod (seção 3 desta SPEC)
lib/supabase/produtos.ts          # Bloco de queries do módulo Produtos (*)
```

> (*) Criar `lib/supabase/produtos.ts` separado de `queries-audit.ts`. Justificativa: `queries-audit.ts` já tem ~600+ linhas; manter um arquivo por domínio segue o padrão de `rebanho.ts`, `rebanho-leiteira.ts`, etc. Importar e re-exportar via `q` em `queries-audit.ts` se necessário para acesso unificado.

### Arquivos existentes a modificar

```
components/Sidebar.tsx
  → Remover badge 'comingSoon' do item Produtos
  → Adicionar condicional: ocultar se profile?.perfil === 'Operador'

app/dashboard/silos/components/dialogs/MovimentacaoDialog.tsx
  → Campos condicionais valor_unitario + comprador quando subtipo === 'Venda'
  → Atualizar schema Zod local para incluir os novos campos opcionais

lib/supabase/queries-audit.ts  (bloco movimentacoesSilo)
  → movimentacoesSilo.create(): integração financeiro quando subtipo === 'Venda'
  → movimentacoesSilo.remove(): cleanup financeiro se receita_id preenchido
  → Atualizar .select() de listBySilo/listBySilos para incluir valor_unitario, comprador, receita_id
```

---

## 3. Schemas Zod

**`lib/validations/produtos.ts`** — pronto para colar:

```typescript
import { z } from 'zod';

export const produtoFormSchema = z.object({
  nome:               z.string().min(2, 'Mínimo 2 caracteres').max(100),
  categoria_id:       z.string().uuid('Categoria inválida'),
  unidade:            z.string().min(1, 'Unidade obrigatória').max(20),
  quantidade_entrada: z.number().nonnegative('Não pode ser negativo').default(0),
  valor_unitario:     z.number().positive('Deve ser > 0').optional(),
  estoque_minimo:     z.number().nonnegative('Não pode ser negativo').default(0),
  custo_referencia:   z.number().positive('Deve ser > 0').optional(),
  local_armazen:      z.string().max(100).optional(),
  observacoes:        z.string().max(500).optional(),
});

export type ProdutoFormData = z.infer<typeof produtoFormSchema>;

export const entradaFormSchema = z.object({
  produto_id:     z.string().uuid('Produto inválido'),
  tipo_entrada:   z.enum(['COLHEITA', 'COMPRA', 'AJUSTE_INICIAL']),
  quantidade:     z.number().positive('Deve ser > 0'),
  valor_unitario: z.number().positive('Deve ser > 0').optional(),
  data:           z.string().min(1, 'Data obrigatória'),
  responsavel:    z.string().max(100).optional(),
  observacoes:    z.string().max(500).optional(),
});

export type EntradaFormData = z.infer<typeof entradaFormSchema>;

export const saidaFormSchema = z.object({
  produto_id:           z.string().uuid('Produto inválido'),
  tipo_saida:           z.enum([
    'VENDA', 'CONSUMO_PROPRIO', 'PERDA', 'DOACAO', 'TRANSFERENCIA_INSUMO', 'DESCARTE',
  ]),
  quantidade:           z.number().positive('Deve ser > 0'),
  valor_unitario:       z.number().positive('Deve ser > 0').optional(),
  registrar_como_receita: z.boolean().default(false),
  insumo_id_destino:    z.string().uuid().optional(),
  data:                 z.string().min(1, 'Data obrigatória'),
  responsavel:          z.string().max(100).optional(),
  observacoes:          z.string().max(500).optional(),
})
  .refine(
    (d) => d.tipo_saida !== 'VENDA' || !!d.valor_unitario,
    { message: 'Valor unitário obrigatório para venda', path: ['valor_unitario'] }
  )
  .refine(
    (d) => d.tipo_saida !== 'TRANSFERENCIA_INSUMO' || !!d.insumo_id_destino,
    { message: 'Insumo de destino obrigatório para transferência', path: ['insumo_id_destino'] }
  );

export type SaidaFormData = z.infer<typeof saidaFormSchema>;

export const ajusteInventarioSchema = z.object({
  produto_id:   z.string().uuid('Produto inválido'),
  estoque_real: z.number().nonnegative('Não pode ser negativo'),
  motivo:       z.string().min(5, 'Mínimo 5 caracteres'),
});

export type AjusteInventarioData = z.infer<typeof ajusteInventarioSchema>;
```

---

## 4. Server Actions — Pseudocódigo

**`app/dashboard/produtos/actions.ts`**

### 4.1 `criarProdutoAction(formData: unknown)`
```
- Zod parse: produtoFormSchema
- qServer.produtos.create({ nome, categoria_id, unidade, estoque_minimo, custo_referencia, ... })
  → produto criado com fazenda_id preenchido pelo trigger
- SE quantidade_entrada > 0:
  - qServer.movimentacoesProduto.create({ produto_id: produto.id, tipo: 'Entrada',
      tipo_entrada: 'AJUSTE_INICIAL', quantidade, valor_unitario, data: hoje, origem: 'manual' })
  → trigger incrementa produtos.estoque_atual automaticamente
- revalidatePath('/dashboard/produtos')
- return { success: true, produto }
```

### 4.2 `atualizarProdutoAction(id: string, formData: unknown)`
```
- Zod parse: produtoFormSchema (sem quantidade_entrada)
- qServer.produtos.update(id, { nome, categoria_id, unidade, estoque_minimo, custo_referencia, ... })
- revalidatePath('/dashboard/produtos')
- return { success: true }
```

### 4.3 `deletarProdutoAction(id: string)`
```
- produto = qServer.produtos.getById(id)
- count = qServer.movimentacoesProduto.countByProduto(id)
- SE count > 0: soft-delete → qServer.produtos.update(id, { ativo: false })
- SENÃO: qServer.produtos.remove(id)  ← hard-delete
- revalidatePath('/dashboard/produtos')
- return { success: true }
```

### 4.4 `criarEntradaAction(formData: unknown)`
```
- Zod parse: entradaFormSchema
- qServer.movimentacoesProduto.create({ produto_id, tipo: 'Entrada', tipo_entrada,
    quantidade, valor_unitario, data, responsavel, observacoes, origem: 'manual' })
  → trigger incrementa estoque
- revalidatePath('/dashboard/produtos')
- return { success: true }
```

### 4.5 `criarSaidaProdutoAction(formData: unknown)`
```
- Zod parse: saidaFormSchema
- produto = qServer.produtos.getById(produto_id)
- SE produto.estoque_atual < quantidade: throw 'Estoque insuficiente'
- mov = qServer.movimentacoesProduto.create({ produto_id, tipo: 'Saída', tipo_saida,
    quantidade, valor_unitario, data, responsavel, observacoes,
    insumo_id_destino: tipo_saida === 'TRANSFERENCIA_INSUMO' ? insumo_id_destino : null,
    origem: 'manual' })
  → trigger decrementa estoque
- SE tipo_saida === 'TRANSFERENCIA_INSUMO':
  - qServer.movimentacoesInsumo.create({ insumo_id: insumo_id_destino, tipo: 'Entrada',
      quantidade, origem: 'produto', produto_id_origem: produto_id, data })
    → trigger incrementa estoque do insumo
- SE tipo_saida === 'VENDA' E registrar_como_receita:
  - TRY:
    - receita = qServer.financeiro.create({ tipo: 'Receita', categoria: 'Produtos',
        descricao: `Venda: ${produto.nome}`, valor: quantidade * valor_unitario,
        data, referencia_id: mov.id, referencia_tipo: 'movimentacoes_produto' })
    - supabaseServer.from('movimentacoes_produto').update({ receita_id: receita.id }).eq('id', mov.id)
  - CATCH: reverter mov; throw 'Falha ao registrar receita'
- revalidatePath('/dashboard/produtos')
- return { success: true }
```

### 4.6 `criarAjusteProdutoAction(formData: unknown)`
```
- Zod parse: ajusteInventarioSchema
- produto = qServer.produtos.getById(produto_id)
- delta = estoque_real - produto.estoque_atual
- SE delta === 0: return { success: true }  ← sem movimentação
- sinal = delta > 0 ? 1 : -1
- qServer.movimentacoesProduto.create({ produto_id, tipo: 'Ajuste',
    quantidade: Math.abs(delta), sinal_ajuste: sinal,
    observacoes: motivo, data: hoje, origem: 'manual' })
  → trigger aplica delta
- revalidatePath('/dashboard/produtos')
- return { success: true }
```

### 4.7 `deletarMovimentacaoProdutoAction(id: string)`
```
- mov = qServer.movimentacoesProduto.getById(id)
- SE mov.receita_id: qServer.financeiro.remove(mov.receita_id)
- qServer.movimentacoesProduto.remove(id)
  → ATENÇÃO: o trigger de estoque NÃO reverte automaticamente em DELETE
  → Criar função de compensação ou recalcular estoque manualmente
  → Opção preferida: UPDATE produtos SET estoque_atual = estoque_atual - (delta) antes de DELETE
- revalidatePath('/dashboard/produtos')
- return { success: true }
```

> ⚠️ **Nota sobre compensação de estoque em DELETE**: o trigger de `movimentacoes_produto` só atua em `AFTER INSERT`. Ao deletar uma movimentação, o `estoque_atual` deve ser compensado manualmente na action (ou via trigger `AFTER DELETE` adicional). Decidir na implementação qual abordagem usar; a action de compensação manual é mais simples e auditável.

---

## 5. Tarefas Paralelas — Módulo Silos (Cenário B)

### Migration
Ver §1 — `006_alter_movimentacoes_silo_venda.sql`.

### MovimentacaoDialog.tsx — mudanças descritivas

1. Adicionar ao schema Zod local do formulário:
   ```typescript
   valor_unitario: z.number().positive().optional(),
   comprador: z.string().max(150).optional(),
   ```
2. Abaixo do campo `quantidade`, renderizar condicionalmente quando `watch('subtipo') === 'Venda'`:
   - `<Input>` para `valor_unitario` (label "Valor unitário (R$)")
   - `<Input>` para `comprador` (label "Comprador")
3. Passar os novos campos no payload enviado para a action.

### `movimentacoesSilo.create()` — extensão

```
// Após o INSERT existente retornar mov:
SE payload.subtipo === 'Venda' E payload.valor_unitario != null:
  - receita = qServer.financeiro.create({
      tipo: 'Receita', categoria: 'Silagem',
      descricao: `Venda de silagem — Silo: ${silo.nome}`,
      valor: payload.quantidade * payload.valor_unitario,
      data: payload.data, referencia_tipo: 'Silo', referencia_id: payload.silo_id
    })
  - supabaseServer.from('movimentacoes_silo')
      .update({ receita_id: receita.id })
      .eq('id', mov.id)
```

### `movimentacoesSilo.remove()` — extensão

```
// Antes do DELETE existente:
mov = SELECT id, receita_id FROM movimentacoes_silo WHERE id = id
SE mov.receita_id:
  DELETE FROM financeiro WHERE id = mov.receita_id
```

### `movimentacoesSilo.listBySilo()` / `listBySilos()` — extensão

Adicionar `valor_unitario, comprador, receita_id` ao `.select()` para exibição na UI.

---

## 6. Plano de Testes

### Testes unitários — schemas Zod (`lib/validations/produtos.ts`)

| # | Schema | Caso |
|---|---|---|
| T01 | `produtoFormSchema` | nome com 1 char → erro |
| T02 | `produtoFormSchema` | categoria_id inválido → erro |
| T03 | `produtoFormSchema` | quantidade_entrada negativa → erro |
| T04 | `entradaFormSchema` | tipo_entrada fora do enum → erro |
| T05 | `entradaFormSchema` | quantidade = 0 → erro |
| T06 | `saidaFormSchema` | VENDA sem valor_unitario → erro refine |
| T07 | `saidaFormSchema` | TRANSFERENCIA_INSUMO sem insumo_id_destino → erro refine |
| T08 | `saidaFormSchema` | CONSUMO_PROPRIO sem valor → válido |
| T09 | `ajusteInventarioSchema` | motivo com 4 chars → erro |
| T10 | `ajusteInventarioSchema` | estoque_real negativo → erro |

### Testes de integração (Supabase real — padrão dos testes de RLS existentes)

| # | Fluxo |
|---|---|
| T11 | Criar produto + entrada inicial → estoque_atual correto |
| T12 | Venda com receita_id → registro em `financeiro` criado |
| T13 | Deletar movimentação de venda → registro em `financeiro` removido |
| T14 | Transferência para insumo → `movimentacoes_insumo` criada com `produto_id_origem` |
| T15 | Saída > estoque → throw 'Estoque insuficiente' |
| T16 | Ajuste inventário (delta positivo) → estoque corrigido |
| T17 | Ajuste inventário (delta zero) → nenhuma movimentação criada |
| T18 | Soft-delete produto com movimentações → `ativo = false` |
| T19 | Hard-delete produto sem movimentações → linha removida |
| T20 | Venda de silagem → `financeiro` com categoria 'Silagem' criado |
| T21 | Deletar movimentação silo com receita_id → `financeiro` removido |

### Testes RLS

| # | Cenário |
|---|---|
| T22 | Operador: SELECT em `produtos` → 0 linhas |
| T23 | Operador: INSERT em `produtos` → RLS violation |
| T24 | Operador: SELECT em `movimentacoes_produto` → 0 linhas |
| T25 | Visualizador: SELECT em `produtos` → retorna linhas da fazenda |
| T26 | Visualizador: INSERT em `produtos` → RLS violation |
| T27 | Visualizador: SELECT em `categorias_produto` → retorna todas |

**Total estimado**: 27 testes (10 unitários + 11 integração + 6 RLS)

---

## 7. Checklist de Implementação Ordenado

```
[ ] 1.  Aplicar migration 001 (helper sou_admin_ou_visualizador)
[ ] 2.  Aplicar migration 002 (categorias_produto + seed)
[ ] 3.  Aplicar migration 003 (produtos)
[ ] 4.  Aplicar migration 004 (movimentacoes_produto)
[ ] 5.  Aplicar migration 005 (alter movimentacoes_insumo)
[ ] 6.  Aplicar migration 006 (alter movimentacoes_silo)
[ ] 7.  npm run db:types  ← gerar tipos atualizados antes de qualquer código TS

[ ] 8.  Criar lib/validations/produtos.ts  (Seção 3 desta SPEC — colar direto)
[ ] 9.  Criar lib/supabase/produtos.ts
        → list(), getById(), create(), update(), remove()
        → countByProduto()
        → movimentacoesProduto: create(), getById(), remove(), createAjuste(), listByProduto()
        → Importar e expor via qServer/q se necessário

[ ] 10. Criar app/dashboard/produtos/actions.ts
        → criarProdutoAction (§4.1)
        → atualizarProdutoAction (§4.2)
        → deletarProdutoAction (§4.3)
        → criarEntradaAction (§4.4)
        → criarSaidaProdutoAction (§4.5)
        → criarAjusteProdutoAction (§4.6)
        → deletarMovimentacaoProdutoAction (§4.7)

[ ] 11. Criar app/dashboard/produtos/layout.tsx
        → Guard: se perfil === 'Operador' → redirect('/dashboard') + toast

[ ] 12. Criar componentes UI (ordem de dependência):
        a. ProdutoAutocomplete.tsx
        b. AlertsSection.tsx + ProdutosFilters.tsx
        c. ProdutosList.tsx
        d. UltimasMovimentacoes.tsx
        e. ProdutoForm.tsx + DeleteProdutoDialog.tsx
        f. EntradaForm.tsx
        g. SaidaForm.tsx + TransferenciaInsumoForm.tsx
        h. AjusteInventario.tsx

[ ] 13. Criar app/dashboard/produtos/page.tsx
        → Composição dos componentes acima

[ ] 14. Atualizar components/Sidebar.tsx
        → Remover badge comingSoon de Produtos
        → Ocultar item se perfil === 'Operador'

[ ] 15. Atualizar MovimentacaoDialog.tsx (Cenário B)
        → Campos condicionais valor_unitario + comprador
        → Passar novos campos no payload

[ ] 16. Atualizar queries-audit.ts bloco movimentacoesSilo
        → create(): integração financeiro em venda
        → remove(): cleanup financeiro
        → list*(): incluir novos campos no .select()

[ ] 17. Escrever testes (T01–T27)

[ ] 18. npm run build  ← zero erros TypeScript
[ ] 19. npm run test   ← 646+ testes passando (+ 27 novos)
```

---

## Pontos de Extensão v2 (não implementar agora)

- `producoes_leiteiras.produto_id_origem uuid NULL FK → produtos.id` — integração rebanho → produto Leite
- Trigger `AFTER DELETE` em `movimentacoes_produto` para compensação automática de estoque
- `referencia_tipo = 'movimentacoes_produto'` já funciona em `financeiro` (sem constraint — confirmado no PRD §P5)
