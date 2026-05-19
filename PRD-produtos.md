# PRD — Módulo Produtos (GestSilo Pro)

> **Status**: v2 — 2026-05-19 (decisões fechadas; pronto para SPEC técnica)
> **Autor**: Claude Code (pesquisa + síntese)
> **Próximo passo**: gerar SPEC técnica + migrations

---

## Achados de Pesquisa (P2 e P5)

### P2 — `producoes_leiteiras` e a unidade Leite

**Estrutura atual da tabela** (`types/supabase.ts`):
- Campo de quantidade: **`volume_litros` (numeric, NOT NULL)**
- Unidade: **litros** — alinhada com a decisão tomada
- FKs existentes: `animal_id → animais.id`, `fazenda_id → fazendas.id`, `usuario_id → profiles.id`
- **Não existe nenhuma FK ou campo ligando `producoes_leiteiras` a `produtos`**

**Implicação para a SPEC**: A integração futura (v2) consistirá em, ao registrar uma produção leiteira, opcionalmente criar uma entrada de movimentação no produto "Leite" da fazenda. Isso exigirá adicionar `produto_id_origem uuid NULL FK → produtos.id` na tabela `producoes_leiteiras`. **Não fazer isso agora** — reservar apenas o campo `origem='rebanho'` em `movimentacoes_produto` para mapear esse caminho sem migration adicional na v1. Documentar na SPEC como ponto de extensão v2.

---

### P5 — Estado atual de "Venda de Silagem" no módulo Silos

**Classificação: Cenário B — Suporte parcial**

| Aspecto | Estado |
|---|---|
| CHECK `subtipo = 'Venda'` em `movimentacoes_silo` | ✅ Já existe |
| `'Venda'` em `SUBTIPOS_MOVIMENTACAO` (`lib/validations/silos.ts`) | ✅ Já existe |
| `'Venda'` disponível no dropdown de `MovimentacaoDialog.tsx` | ✅ Já existe |
| Colunas `valor_unitario`, `comprador` em `movimentacoes_silo` | ❌ Não existem |
| `receita_id` FK → financeiro em `movimentacoes_silo` | ❌ Não existe |
| Action que cria registro em `financeiro` para saída de silo | ❌ Não existe |
| UI com campos de preço/comprador ao selecionar subtipo 'Venda' | ❌ Não existe |

**Evidências**:
- `movimentacoes_silo.subtipo` CHECK: `'Ensilagem' | 'Uso na alimentação' | 'Descarte' | 'Transferência' | 'Venda'`
- `lib/supabase/queries-audit.ts` → `movimentacoesSilo.create()`: insere movimentação mas não toca `financeiro`
- `app/dashboard/silos/components/dialogs/MovimentacaoDialog.tsx`: exibe o dropdown de subtipos sem campos condicionais para venda
- `financeiro.referencia_tipo` não tem CHECK constraint — aceita `'Silo'` sem migration adicional

**Decisão**: **Tarefa paralela pequena na SPEC de Produtos (Cenário B)**. As alterações são cirúrgicas:
1. Migration: `ALTER TABLE movimentacoes_silo ADD COLUMN valor_unitario numeric NULL, ADD COLUMN comprador varchar NULL, ADD COLUMN receita_id uuid NULL REFERENCES financeiro(id) ON DELETE SET NULL`
2. `MovimentacaoDialog.tsx`: mostrar campos `valor_unitario` + `comprador` quando `subtipo === 'Venda'`
3. `movimentacoesSilo.create()` (em `queries-audit.ts`): após insert, se `subtipo === 'Venda'` e `valor_unitario != null`, criar registro em `financeiro` (`tipo='Receita'`, `categoria='Silagem'`, `referencia_tipo='Silo'`, `referencia_id=silo_id`)
4. Cleanup: `movimentacoesSilo.remove()` deve deletar `financeiro` se `receita_id` estiver preenchido

Essas alterações **entram na mesma SPEC** de Produtos, em seção separada "Tarefas paralelas — módulo Silos".

---

## 1. Visão Geral

O módulo **Produtos** é o complemento natural do módulo Insumos: enquanto `/dashboard/insumos` gerencia o que a propriedade **compra e consome**, `/dashboard/produtos` gerencia o que a propriedade **produz e vende**. O módulo centraliza o controle de estoque de saídas (grãos, leite, animais, forragens, material genético, etc.), registra movimentações de entrada (colheita/produção manual) e saída (venda, consumo próprio, perda), gera automaticamente lançamentos de receita no módulo Financeiro quando uma venda é registrada, e permite transferir um produto para o estoque de Insumos quando ele for reutilizado internamente — tudo sob um modelo de permissões restrito ao Administrador para escrita.

---

## 2. Objetivos e Não-Objetivos

### Objetivos (v1)
- Centralizar o estoque de tudo que a propriedade produz (9 categorias — ver seção 4)
- Registrar movimentações de entrada (produção manual) e saída com rastreabilidade
- Integrar saídas tipo "Venda" com o módulo Financeiro (lançamento de Receita automático)
- Permitir transferência de produto para Insumo com rastreabilidade bidirecional
- Alertas de estoque mínimo (mesmo padrão do módulo Insumos)
- Histórico completo, filtros, busca e exportação
- Permissões granulares: Administrador (CRUD), Operador (sem acesso), Visualizador (somente leitura)
- Completar suporte a "Venda de Silagem" no módulo Silos (tarefa paralela — Cenário B)

### Não-Objetivos (explícitos)
- **Silagem NÃO entra neste módulo.** Silagem continua em `/dashboard/silos`. O caminho de exceção para venda de silagem é tratado como tarefa paralela no módulo Silos (seção 7)
- Rastreabilidade automática custo→margem (adiada para v2; apenas campo `custo_referencia` manual)
- Integração automática com colheita de Talhões (campo `origem='talhao'` reservado no schema, sem UI)
- Integração automática com partos/produção do módulo Rebanho (campo `origem='rebanho'` reservado, sem UI; ponto de extensão v2 documentado na seção P2 acima)
- Código de barras / leitor QR
- Controle de lotes com validade ou rastreabilidade sanitária
- Previsão de estoque ou análise de sazonalidade

---

## 3. Personas e Permissões

| Perfil | Acesso ao módulo | Cadastrar produto | Registrar entrada/saída | Ajuste de inventário | Excluir produto/movimentação |
|---|---|---|---|---|---|
| **Administrador** | ✅ Completo | ✅ | ✅ | ✅ | ✅ |
| **Operador** | ❌ Sem acesso — oculto no Sidebar; rota redireciona para `/dashboard` | ❌ | ❌ | ❌ | ❌ |
| **Visualizador** | ✅ Somente leitura | ❌ | ❌ | ❌ | ❌ |

**Implementação**:
- `components/Sidebar.tsx`: item "Produtos" condicionado a `profile?.perfil !== 'Operador'`; remover `badge: 'comingSoon'`
- `app/dashboard/produtos/layout.tsx` (ou `page.tsx`): guard que verifica `profile?.perfil`. Se `'Operador'`, redireciona para `/dashboard` com toast Sonner "Acesso negado"
- RLS no banco bloqueia qualquer tentativa direta via API (segunda linha de defesa)
- **Nota sobre helper RLS**: verificar se `sou_admin_ou_visualizador()` existe no banco antes da SPEC. Se não existir, a migration deve criá-la. Não assumir existência.

---

## 4. Categorias de Produto

Catálogo final — 9 categorias, inseridas via migration em `categorias_produto`:

| # | Nome | unidade_padrao | Campos específicos no produto | Observações |
|---|---|---|---|---|
| 1 | Grãos | sacas | `umidade_percent` numeric opcional | Milho, soja, sorgo, trigo, etc. Unidade alterável no cadastro |
| 2 | Feno | fardos | `tipo_forrageira` text opcional | Coast-cross, tifton, etc. |
| 3 | Pré-secado | kg | `tipo_forrageira` text opcional | Forragem com 40–55% MS |
| 4 | Sementes | kg | `variedade` text opcional; `safra_origem` text opcional | Text livre, sem constraint de formato (ex: "Safra 24/25") |
| 5 | Leite | litros | — | `valor_unitario` = R$/litro. Integração com `producoes_leiteiras` adiada para v2 |
| 6 | Arrobas | @ | — | Commodity de peso para abate. Categoria separada de Animais |
| 7 | Animais | cabeças | — | Venda técnica, genética, descarte não-abate, bezerros/crias desmamados. Sem subdivisão no MVP |
| 8 | Material Genético | doses | `touro_origem` text opcional; `raca` text opcional | Sêmen, embrião, oócito — produção própria para venda |
| 9 | Outros | unidade | — | Categoria livre para casos não cobertos |

> A unidade padrão é sugerida no cadastro mas pode ser alterada livremente pelo usuário.

---

## 5. Modelo de Dados (proposta)

### 5.1 Tabela `categorias_produto` (catálogo público)

Análoga a `categorias_insumo`. Pré-populada com as 9 categorias acima. Compartilhada entre todas as fazendas (sem `fazenda_id`).

```
categorias_produto
  id             uuid         PK  gen_random_uuid()
  nome           text         NOT NULL  UNIQUE
  unidade_padrao text         NOT NULL
  icone          text         NULL      -- nome do ícone Lucide (opcional)
  created_at     timestamptz  DEFAULT now()
```

RLS: SELECT para todos os autenticados; INSERT/UPDATE/DELETE apenas via service_role (catálogo gerenciado por migration).

---

### 5.2 Tabela `produtos`

Espelha `insumos`. `fazenda_id` **nunca enviado no INSERT** — trigger `set_fazenda_id` (via `get_minha_fazenda_id()`) preenche automaticamente.

```
produtos
  id                uuid        PK  gen_random_uuid()
  nome              text        NOT NULL
  categoria_id      uuid        NOT NULL  FK → categorias_produto.id
  unidade           text        NOT NULL
  estoque_atual     numeric     DEFAULT 0
  estoque_minimo    numeric     DEFAULT 0
  custo_referencia  numeric     NULL          -- input manual; sem cálculo automático (v1)
  local_armazen     varchar     NULL
  observacoes       text        NULL
  ativo             boolean     DEFAULT true
  fazenda_id        uuid        NULL  FK → fazendas.id  -- preenchido por trigger
  criado_por        uuid        NULL  FK → auth.users.id
  atualizado_por    uuid        NULL  FK → auth.users.id
  atualizado_em     timestamptz NOT NULL  DEFAULT now()
  data_cadastro     date        DEFAULT CURRENT_DATE
  created_at        timestamptz DEFAULT now()
```

**CHECK constraints**:
- `chk_produtos_estoque_minimo_nonneg`: `estoque_minimo >= 0`
- `chk_produtos_custo_referencia_nonneg`: `custo_referencia IS NULL OR custo_referencia >= 0`

**Triggers**:
- `trg_produtos_atualizado_em` (BEFORE UPDATE): atualiza `atualizado_em`
- `trg_mov_produto_atualiza_estoque` (AFTER INSERT em `movimentacoes_produto`): incrementa/decrementa `produtos.estoque_atual` com base em `tipo` + `sinal_ajuste`

**Índices**:
- `idx_produtos_fazenda_id` btree(fazenda_id)
- `idx_produtos_fazenda_ativo` btree(fazenda_id, ativo)
- `idx_produtos_categoria_id` btree(categoria_id)
- `idx_produtos_nome_trgm` GIN com `gin_trgm_ops`

**RLS** (Operador sem acesso de leitura — diferente do padrão de insumos que usa `sou_gerente_ou_admin()`):
- SELECT: `fazenda_id = get_minha_fazenda_id()` AND perfil ∈ {Administrador, Visualizador}
  - Implementar via novo helper `sou_admin_ou_visualizador()` se não existir, ou via policy inline
- INSERT: `sou_admin()`
- UPDATE: `sou_admin()`
- DELETE: `sou_admin()`

---

### 5.3 Tabela `movimentacoes_produto`

Espelha `movimentacoes_insumo`. Campo `receita_id` (FK → financeiro) para rastreabilidade bidirecional (análogo ao `despesa_id` de insumos).

```
movimentacoes_produto
  id                  uuid        PK  gen_random_uuid()
  produto_id          uuid        NOT NULL  FK → produtos.id
  tipo                text        NOT NULL  -- 'Entrada' | 'Saída' | 'Ajuste'
  tipo_entrada        varchar     NULL      -- 'COLHEITA' | 'COMPRA' | 'TRANSFERENCIA_INSUMO' | 'AJUSTE_INICIAL'
  tipo_saida          varchar     NULL      -- 'VENDA' | 'CONSUMO_PROPRIO' | 'PERDA' | 'DOACAO' | 'TRANSFERENCIA_INSUMO' | 'DESCARTE'
  quantidade          numeric     NOT NULL
  valor_unitario      numeric     NULL
  data                date        NOT NULL  DEFAULT CURRENT_DATE
  responsavel         text        NULL
  observacoes         text        NULL
  origem              varchar     DEFAULT 'manual'  -- 'manual' | 'rebanho' | 'talhao' | 'silo' (extensão v2)
  sinal_ajuste        smallint    NULL      -- -1 ou 1 (apenas para tipo='Ajuste')
  receita_id          uuid        NULL      FK → financeiro.id ON DELETE SET NULL
  insumo_id_destino   uuid        NULL      FK → insumos.id ON DELETE SET NULL
  criado_por          uuid        NULL      FK → auth.users.id
  created_at          timestamptz DEFAULT now()
```

**CHECK constraints**:
- `chk_mov_produto_tipo`: `tipo = ANY (ARRAY['Entrada','Saída','Ajuste'])`
- `chk_mov_produto_tipo_entrada`: `tipo_entrada IS NULL OR tipo_entrada = ANY (ARRAY['COLHEITA','COMPRA','TRANSFERENCIA_INSUMO','AJUSTE_INICIAL'])`
- `chk_mov_produto_tipo_saida`: `tipo_saida IS NULL OR tipo_saida = ANY (ARRAY['VENDA','CONSUMO_PROPRIO','PERDA','DOACAO','TRANSFERENCIA_INSUMO','DESCARTE'])`
- `chk_mov_produto_sinal_ajuste`: `sinal_ajuste IS NULL OR sinal_ajuste = ANY (ARRAY[-1,1])`
- `chk_mov_produto_quantidade_pos`: `quantidade > 0`
- `chk_mov_produto_origem`: `origem = ANY (ARRAY['manual','rebanho','talhao','silo'])`

**Índices**:
- `idx_mov_produto_produto_id` btree(produto_id)
- `idx_mov_produto_data` btree(data DESC)
- `idx_mov_produto_receita_id` btree(receita_id)

**RLS** (mesma restrição de `produtos` — Operador bloqueado):
- SELECT: produto_id IN (SELECT id FROM produtos WHERE fazenda_id = get_minha_fazenda_id()) AND perfil ∈ {Administrador, Visualizador}
- INSERT/UPDATE/DELETE: `sou_admin()`

---

### 5.4 Alterações em tabelas existentes

#### `movimentacoes_insumo` (rastreabilidade bidirecional Produto → Insumo)

```sql
ALTER TABLE movimentacoes_insumo
  ADD COLUMN produto_id_origem uuid NULL
    REFERENCES produtos(id) ON DELETE SET NULL;
```

Preenchido apenas quando `origem = 'produto'`. Requer adicionar `'produto'` ao CHECK `chk_origem` existente:

```sql
ALTER TABLE movimentacoes_insumo
  DROP CONSTRAINT chk_origem;
ALTER TABLE movimentacoes_insumo
  ADD CONSTRAINT chk_origem CHECK (
    origem = ANY (ARRAY[
      'manual','talhao','frota','silo','financeiro','produto'
    ]::varchar[])
  );
```

#### `movimentacoes_silo` (suporte completo a venda de silagem — Cenário B)

```sql
ALTER TABLE movimentacoes_silo
  ADD COLUMN valor_unitario numeric NULL,
  ADD COLUMN comprador      varchar NULL,
  ADD COLUMN receita_id     uuid    NULL
    REFERENCES financeiro(id) ON DELETE SET NULL;
```

> Ambas as alterações requerem migration versionada e `npm run db:types` após aplicação.

---

## 6. Fluxos Principais

### 6.1 Cadastrar produto + entrada inicial
O usuário abre o formulário "Novo Produto", informa nome, categoria, unidade, estoque mínimo e opcionalmente custo_referência e local de armazenamento. Se informar quantidade inicial > 0, a action cria simultaneamente o registro em `produtos` e uma movimentação `tipo='Entrada'`, `tipo_entrada='AJUSTE_INICIAL'`. Sem quantidade, produto entra com `estoque_atual = 0`. Padrão idêntico ao `criarInsumoAction` em [app/dashboard/insumos/actions.ts](app/dashboard/insumos/actions.ts).

### 6.2 Registrar entrada (produção/colheita)
Usuário seleciona produto via autocomplete, informa quantidade, data e `tipo_entrada` (`COLHEITA` ou `COMPRA`). A action insere em `movimentacoes_produto`; o trigger incrementa `produtos.estoque_atual`. Sem lançamento financeiro (entrada = custo, rastreabilidade de custo é v2).

### 6.3 Registrar saída tipo "Venda"
Usuário seleciona produto, quantidade, valor unitário, data, e marca `registrar_como_receita = true`. A action:
1. Valida `estoque_atual >= quantidade`
2. Insere em `movimentacoes_produto` com `tipo='Saída'`, `tipo_saida='VENDA'`
3. Insere em `financeiro`: `tipo='Receita'`, `categoria='Produtos'`, `descricao='Venda: {produto.nome}'`, `valor = quantidade × valor_unitario`, `referencia_id = movimentacao.id`, `referencia_tipo = 'movimentacoes_produto'`
4. Atualiza `movimentacoes_produto.receita_id` com o id do registro criado
5. Trigger decrementa `produtos.estoque_atual`

Cleanup ao deletar: se `receita_id` preenchido, excluir o registro de `financeiro` correspondente (espelha `movimentacoesInsumo.remove()` em [lib/supabase/queries-audit.ts](lib/supabase/queries-audit.ts)).

### 6.4 Registrar saída tipo "Transferência para Insumos"
Usuário seleciona produto de origem, quantidade e insumo de destino (autocomplete). A action:
1. Valida `estoque_atual >= quantidade`
2. Insere em `movimentacoes_produto` com `tipo_saida='TRANSFERENCIA_INSUMO'`, `insumo_id_destino = insumo.id`
3. Insere em `movimentacoes_insumo` com `tipo='Entrada'`, `origem='produto'`, `produto_id_origem = produto.id`
4. Triggers atualizam ambos os estoques

Sem lançamento financeiro (transferência interna).

### 6.5 Registrar saída tipo "Consumo Próprio" / "Perda" / "Doação" / "Descarte"
Fluxo simples: produto, quantidade, tipo_saida, data, observação opcional. Action insere em `movimentacoes_produto`; trigger decrementa estoque. Sem integração financeira.

### 6.6 Ajuste de inventário
Usuário informa estoque real contado. Action calcula diferença (`estoque_real − estoque_atual`), insere movimentação `tipo='Ajuste'` com `sinal_ajuste = +1` ou `-1`; trigger aplica o delta. Padrão idêntico a `criarAjusteAction` em insumos.

### 6.7 Caminho de exceção: venda de silagem (tarefa paralela Cenário B)
Silagem NÃO entra na tabela `produtos`. Produtores que vendem silagem registram no módulo Silos. Com as alterações descritas na seção 5.4:
- `MovimentacaoDialog.tsx` exibirá campos `valor_unitario` + `comprador` condicionalmente quando `subtipo === 'Venda'`
- `movimentacoesSilo.create()` criará registro em `financeiro` (`tipo='Receita'`, `categoria='Silagem'`, `referencia_tipo='Silo'`, `referencia_id=silo_id`) quando `subtipo === 'Venda'` e `valor_unitario != null`
- `movimentacoesSilo.remove()` fará cleanup do `financeiro` se `receita_id` preenchido

---

## 7. Integrações

### Financeiro
- Saída tipo "Venda" com `registrar_como_receita = true` → cria `financeiro` (`tipo='Receita'`, `categoria='Produtos'`)
- Rastreabilidade: `movimentacoes_produto.receita_id ↔ financeiro.id`
- Cleanup automático na exclusão da movimentação
- **Referência**: [app/dashboard/insumos/actions.ts](app/dashboard/insumos/actions.ts) — função `criarSaidaAction` (padrão `despesa_id`)

### Insumos
- Saída tipo "Transferência para Insumos" → entrada em `movimentacoes_insumo` com `origem='produto'`
- Rastreabilidade bidirecional via `insumo_id_destino` ↔ `produto_id_origem` (nova coluna)
- Sem lançamento financeiro

### Silos (caminho de exceção — Cenário B)
- Alterações cirúrgicas em `movimentacoes_silo` + `MovimentacaoDialog.tsx` + `movimentacoesSilo.create/remove()`
- Detalhes na seção 5.4 e 6.7
- Incluir como seção separada "Tarefas paralelas — módulo Silos" na SPEC

### Rebanho (v2 — reservado)
- Campo `origem='rebanho'` em `movimentacoes_produto` reservado para integração futura com `producoes_leiteiras`
- Ponto de extensão v2: adicionar `produto_id_origem uuid NULL FK → produtos.id` em `producoes_leiteiras`
- **Não implementar na v1**

---

## 8. UI/UX

### Design System
- Seguir rigorosamente `app/globals.css` e `DESIGN-SYSTEM.md`
- **Tipografia**: `text-sm` (14px) para labels, tabelas e corpo; `text-xs` apenas para badges uppercase; `text-2xl` para título de página; `text-3xl` para valores KPI
- **Cores**: CSS custom props (`var(--text-muted)`, `var(--card)`) ou classes Tailwind — **nunca** `text-[#...]` ou `bg-[#...]` hardcoded
- Temas claro/escuro via variáveis do globals.css

### Estrutura proposta da página `/dashboard/produtos`

```
┌──────────────────────────────────────────────────────┐
│  Header: "Produtos"            [+ Novo Produto]      │
├──────────────────────────────────────────────────────┤
│  AlertsSection — produtos abaixo do estoque mínimo  │
│  (badge amarelo, mesmo padrão de insumos)            │
├──────────────────────────────────────────────────────┤
│  KPI strip: Total produtos | Abaixo do mínimo |      │
│             Valor total estimado (via custo_ref)     │
├──────────────────────────────────────────────────────┤
│  Últimas Movimentações (5–10 mais recentes)          │
├──────────────────────────────────────────────────────┤
│  Filtros: [Busca] [Categoria ▾] [Status estoque ▾]  │
├──────────────────────────────────────────────────────┤
│  Tabela: nome | categoria | unidade | estoque_atual  │
│    | estoque_mínimo | status | [Entrada][Saída][···] │
└──────────────────────────────────────────────────────┘
```

### Componentes previstos

| Componente | Analogia em Insumos |
|---|---|
| `ProdutoForm.tsx` | `InsumoForm.tsx` |
| `EntradaForm.tsx` | parte de `SaidaForm.tsx` (sentido inverso) |
| `SaidaForm.tsx` | `SaidaForm.tsx` |
| `TransferenciaInsumoForm.tsx` | sem equivalente direto |
| `AjusteInventario.tsx` | `AjusteInventario.tsx` |
| `AlertsSection.tsx` | `AlertsSection.tsx` |
| `ProdutosList.tsx` | `InsumosList.tsx` |
| `ProdutosFilters.tsx` | `InsumosFilters.tsx` |
| `UltimasMovimentacoes.tsx` | `UltimasMovimentacoes.tsx` |
| `DeleteProdutoDialog.tsx` | `DeleteInsumoDialog.tsx` |
| `ProdutoAutocomplete.tsx` | `InsumoAutocomplete.tsx` |

Todos os formulários como `<Dialog>` / `<Sheet>` (shadcn/ui), sem rotas separadas.

---

## 9. Regras de Negócio

### Validações Zod previstas (`lib/validations/produtos.ts`)

**`produtoFormSchema`**
- `nome`: string, min 2, max 100
- `categoria_id`: uuid obrigatório
- `unidade`: string, min 1, max 20
- `quantidade_entrada`: number, nonnegative, opcional (0 = sem entrada inicial)
- `valor_unitario`: number, positive, opcional
- `estoque_minimo`: number, nonnegative, default 0
- `custo_referencia`: number, positive, opcional
- `local_armazen`: string, max 100, opcional
- `observacoes`: string, max 500, opcional

**`entradaFormSchema`**
- `produto_id`: uuid obrigatório
- `tipo_entrada`: enum `['COLHEITA', 'COMPRA', 'AJUSTE_INICIAL']`
- `quantidade`: number, positive
- `valor_unitario`: number, positive, opcional
- `data`: date ISO, obrigatório
- `responsavel`: string, max 100, opcional
- `observacoes`: string, max 500, opcional

**`saidaFormSchema`**
- `produto_id`: uuid obrigatório
- `tipo_saida`: enum `['VENDA', 'CONSUMO_PROPRIO', 'PERDA', 'DOACAO', 'TRANSFERENCIA_INSUMO', 'DESCARTE']`
- `quantidade`: number, positive
- `valor_unitario`: number, positive — obrigatório se `tipo_saida === 'VENDA'` (via `.refine()`)
- `registrar_como_receita`: boolean, default false — visível apenas se `tipo_saida === 'VENDA'`
- `insumo_id_destino`: uuid — obrigatório se `tipo_saida === 'TRANSFERENCIA_INSUMO'` (via `.refine()`)
- `data`: date ISO, obrigatório
- `responsavel`: string, max 100, opcional
- `observacoes`: string, max 500, opcional

**`ajusteInventarioSchema`**
- `produto_id`: uuid obrigatório
- `estoque_real`: number, nonnegative
- `motivo`: string, min 5 chars

### Regras no servidor (Server Actions)
- Saída não pode deixar `estoque_atual < 0`: validar antes de inserir
- `fazenda_id` nunca no payload de INSERT (trigger)
- Colunas explícitas em todas as queries (nunca `select('*')`)
- `valor = quantidade × valor_unitario` calculado na action
- Produto com movimentações: soft-delete (`ativo = false`); sem histórico: hard-delete

---

## 10. Métricas de Sucesso

- **Adoção**: ≥ 50% dos produtores ativos registram ao menos 1 entrada por mês (3 meses pós-lançamento)
- **Integração financeira**: ≥ 30% das saídas tipo "Venda" marcam `registrar_como_receita = true`
- **Qualidade de dados**: < 5% dos produtos com `estoque_atual < 0`
- **Alertas úteis**: < 20% dos alertas de estoque mínimo ignorados sem ação
- **Transferência para Insumos**: ≥ 10 transferências registradas nos primeiros 30 dias em fazendas com reuso de produção

---

## 11. Fora de Escopo (v1)

- Rastreabilidade automática custo→margem (apenas `custo_referencia` manual)
- Integração automática com colheita de Talhões
- Integração automática com `producoes_leiteiras` do módulo Rebanho (ponto de extensão v2)
- Código de barras / leitor QR
- Controle de lotes com validade ou número de série
- Gestão de contratos de venda ou pedidos
- Integração com notas fiscais (NF-e)
- Previsão de estoque / análise de sazonalidade
- Multi-unidade simultânea (ex: kg e sacas ao mesmo tempo)
- Dashboard comparativo por categoria

---

## 12. Decisões Fechadas

| # | Decisão |
|---|---|
| P1 | Arrobas e Animais são **categorias separadas**. Arrobas = unidade `@`, Animais = unidade `cabeças`. Bezerro/cria entra em Animais sem subdivisão no MVP. |
| P2 | Leite: unidade padrão = **litros**. `valor_unitario` = R$/litro. Integração com `producoes_leiteiras` adiada para v2. |
| P3 | Sementes: campo `safra_origem` é **text livre**, sem constraint de formato, com placeholder sugestivo no form. |
| P4 | Soft-delete quando há movimentações; hard-delete quando sem histórico. |
| P5 | Venda de silagem: **Cenário B** — tarefa paralela pequena incluída na SPEC de Produtos (ver seção 5.4 e 6.7). |
| P6 | Operador: **sem acesso** ao módulo (nem leitura). Oculto no Sidebar. Rota redireciona. RLS bloqueia no banco. |
| Cat. | Categoria 8 renomeada para **"Material Genético"** (unidade: doses). |

---

## Arquivos de Referência Arquitetural

| Arquivo | Uso como template |
|---|---|
| [app/dashboard/insumos/page.tsx](app/dashboard/insumos/page.tsx) | Estrutura da página (estado, hooks, subcomponentes) |
| [app/dashboard/insumos/actions.ts](app/dashboard/insumos/actions.ts) | Padrão de Server Actions (criar, saída, ajuste, financeiro) |
| [app/dashboard/insumos/components/](app/dashboard/insumos/components/) | 9 subcomponentes a espelhar |
| [lib/validations/insumos.ts](lib/validations/insumos.ts) | Schemas Zod |
| [lib/supabase/queries-audit.ts](lib/supabase/queries-audit.ts) | Blocos `insumos` e `movimentacoesInsumo` |
| [components/Sidebar.tsx](components/Sidebar.tsx) | Remover `comingSoon`; adicionar condicional `perfil !== 'Operador'` |
| [providers/AuthProvider.tsx](providers/AuthProvider.tsx) | `profile.perfil` para gating de UI |
| [app/dashboard/silos/components/dialogs/MovimentacaoDialog.tsx](app/dashboard/silos/components/dialogs/MovimentacaoDialog.tsx) | Extensão para campos de venda (Cenário B) |
| [lib/supabase/queries-audit.ts](lib/supabase/queries-audit.ts) | Bloco `movimentacoesSilo` (extensão create/remove) |
