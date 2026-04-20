# PRD v2.2 — Melhorias e Correções do Módulo de Gestão de Silos

**Data:** 19/04/2026  
**Status:** 📋 Análise de Problemas e Plano de Correção  
**Versão:** 2.2 (revisado com inspeção real do código e das migrations existentes)  
**Baseado em:** Feedback de usuário + PRD-silos.md + Spec-silos.md + leitura direta dos arquivos

---

## 1. DESCRIÇÃO DA FUNCIONALIDADE

### 1.1 Escopo Geral

O módulo **Gestão de Silos** gerencia silos de silagem em propriedades rurais, controlando:

- **Ciclo de vida do silo:** Enchimento → Fechamento → Fermentação → Abertura → Consumo/Vazio
- **Estoque e movimentações:** Entrada única (ensilagem) + saídas diárias (alimentação, descarte, transferência, venda)
- **Qualidade:** Análises bromatológicas e avaliações de tamanho de partícula (PSPS)
- **Rastreabilidade:** Vínculo opcional com talhão de origem, custo de produção ou custo de aquisição
- **Operação:** Tela simplificada para operadores de campo registrarem saídas diárias

### 1.2 Públicos

1. **Operadores (fazenda):** Registram saídas diárias via `/operador/` — tela mobile-first simplificada
2. **Gerentes/Proprietários:** Gerenciam cadastros, visualizam resumos, análises de custo, alertas
3. **Laboratórios/Consultores:** Registram avaliações de qualidade

---

## 2. CONTEXTO TÉCNICO

### 2.1 Stack Atual

```
Frontend: Next.js 15.4+ (App Router) + React 19 + TypeScript 5.9
UI: shadcn/ui + Tailwind CSS 4.1 + Lucide React
Forms: React Hook Form + Zod
Backend: Supabase (PostgreSQL)
Data Fetching: Padrão batch-loading em queries-audit.ts
```

### 2.2 Estrutura de Banco de Dados

#### Tabela `silos` (migração 20260413 aplicada)
```sql
id, nome, tipo, fazenda_id,
talhao_id (FK, NULLABLE, permanentemente nullable),
cultura_ensilada (TEXT, desnormalização),
data_fechamento, data_abertura_prevista, data_abertura_real,
volume_ensilado_ton_mv,
comprimento_m, largura_m, altura_m,
materia_seca_percent,
insumo_lona_id, insumo_inoculante_id,
observacoes_gerais,
created_at, updated_at
-- NOVO (a adicionar): custo_aquisicao_rs_ton NUMERIC(12,2)
```

#### Tabela `movimentacoes_silo` (subtipo ainda não criado)
```sql
id, silo_id, tipo (Entrada|Saída),
-- subtipo coluna ainda não existe no BD (pendente migration)
quantidade, data, talhao_id, responsavel, observacao
```

#### Tabelas ainda não criadas no BD
```sql
-- Nenhuma das tabelas abaixo existe no banco atualmente:
avaliacoes_bromatologicas (silo_id, data, momento, ms, pb, fdn, fda, amido, ndt, ph, avaliador)
avaliacoes_psps (silo_id, data, momento, peneira_19mm, peneira_8_19mm, peneira_4_8mm,
                 peneira_fundo_4mm, tamanho_teorico_corte_mm, kernel_processor, avaliador,
                 tmp_mm GENERATED, status_peneira_* GENERATED)
```

### 2.3 Estado Real dos Componentes (verificado em código)

Esta seção descreve o estado **real** de cada arquivo lido, não inferido.

---

#### `dialogs/SiloForm.tsx` — ⚠️ Parcialmente funcional, campos críticos ausentes

**O que funciona:**
- Salva via `q.silos.create()` e `q.silos.update()` corretamente
- Talhão é opcional (Select com opção "Nenhum") ✅
- Integração com insumos (saídas de lona/inoculante) ✅
- Campos presentes: Nome, Tipo, Volume, Dimensões, Cultura, MS, Talhão, Lona, Inoculante

**O que está faltando/errado:**
- ❌ Sem campo `data_fechamento` — está **hardcoded como `null`** no payload do submit
- ❌ Sem campo `data_abertura_prevista`
- ❌ Sem campo `observacoes_gerais`
- ❌ Sem cálculo automático de densidade ao preencher dimensões
- ❌ Sem auto-preenchimento de cultura ao selecionar talhão
- ❌ Sem adição de `custo_aquisicao_rs_ton` (campo novo, a criar)
- ❌ Schema local duplicado (não usa `lib/validations/silos.ts`)
- ❌ Volume ensilado não gera movimentação de entrada automaticamente no save

---

#### `dialogs/MovimentacaoDialog.tsx` — ⚠️ Salva mas incompleto

**O que funciona:**
- Salva via `q.movimentacoesSilo.create()` ✅
- Dropdown de silo (quando siloId não fornecido) ✅
- Campos: Silo, Tipo, Quantidade, Responsável, Observação

**O que está faltando/errado:**
- ❌ Sem campo `subtipo` (Uso na alimentação / Descarte / Transferência / Venda) — não existe no schema local nem no payload
- ❌ Campo `data` hardcoded como `new Date().toISOString()` no submit — usuário não pode escolher data
- ❌ Permite tipo "Entrada" sem nenhuma restrição — qualquer usuário pode criar nova entrada
- ❌ Sem validação de "entrada única" — segundo `create` com tipo='Entrada' é aceito silenciosamente
- ❌ Schema local duplicado (não usa `lib/validations/silos.ts`)

---

#### `dialogs/AvaliacaoBromatologicaDialog.tsx` — ❌ Não salva, campos errados

**O que funciona:**
- Abre o dialog ✅
- Validação Zod local (parcial)

**O que está faltando/errado:**
- ❌ `handleSubmit` tem `// TODO: Implementar salvamento em banco de dados` — **NUNCA SALVA**
- ❌ Schema local com campos incorretos: usa `fd`, `energia`, `umidade` em vez dos corretos
- ❌ Faltam os campos corretos: `ms`, `fdn`, `amido`, `ndt`, `ph`
- ❌ Campo `fd` deveria ser `fdn` (FDN — Fibra em Detergente Neutro)
- ❌ Campo `energia` (Mcal/kg) deve ser **removido**
- ❌ Campo `umidade` deve ser removido (deveria ser `ms` — Matéria Seca)
- ❌ Campo `momento` é input de texto livre (deveria ser select: Fechamento/Abertura/Monitoramento)
- ❌ Schema local duplicado (não usa `lib/validations/silos.ts`)

---

#### `dialogs/AvaliacaoPspsDialog.tsx` — ❌ Não salva, campos estruturalmente errados

**O que funciona:**
- Abre o dialog ✅
- Mostra soma de peneiras em tempo real ✅ (mas tolerância usada é ±0.1% em vez de ±0.5%)

**O que está faltando/errado:**
- ❌ `handleSubmit` tem `// TODO: Implementar salvamento em banco de dados` — **NUNCA SALVA**
- ❌ Campo `tmp` é input manual preenchido pelo usuário — deveria ser **calculado automaticamente** pelo BD (GENERATED)
- ❌ Campo `status` é seleção manual (Ideal/Bom/Ruim) — deveria ser calculado por peneira (ok/fora)
- ❌ Nomes das peneiras errados: "Peneira 3 (1.18 mm)" e "Fundo (<1.18 mm)" — deveriam ser "4-8mm" e "<4mm"
- ❌ Faltam campos: `momento`, `avaliador`, `tamanho_teorico_corte_mm`, `kernel_processor`
- ❌ Sem faixas ideais por peneira (indicadores visuais ok/fora)
- ❌ Schema local duplicado (não usa `lib/validations/silos.ts`)

---

#### `tabs/VisaoGeralTab.tsx` — ⚠️ Estrutura presente, dados incompletos

**O que funciona:**
- Exibe: Nome, Tipo, Volume, Cultura, MS Original, Custo de Produção (via prop), Densidade (via prop), Lona, Inoculante ✅
- Alerta visual se `talhao_id = null` ✅

**O que está faltando/errado:**
- ❌ Card "Datas Importantes": **todos os valores são hardcoded como `"-"`** — NÃO lê `silo.data_fechamento`, `silo.data_abertura_prevista`, `silo.data_abertura_real`
- ❌ Card "Observações": hardcoded "Nenhuma observação registrada" — **NÃO lê `silo.observacoes_gerais`**
- ❌ Dimensões (C × L × A) não exibidas
- ❌ Densidade exibida sem indicador 🟢/🟡/🔴
- ❌ "Rastreabilidade" exibe apenas Custo e Densidade — sem nome do talhão, ciclo agrícola, custo total
- ❌ Custo de aquisição (campo novo) não é exibido quando `talhao_id = null`

---

#### `tabs/EstoqueTab.tsx` — ⚠️ Funcional, mas com bugs de lógica

**O que funciona:**
- Cards de Entradas Totais, Saídas Totais, Estoque Atual, Dias Restantes ✅
- Tabela de histórico de movimentações ✅

**O que está faltando/errado:**
- ❌ "Distribuição de Saídas" agrupa por `m.observacao` em vez de `m.subtipo` — totalmente errado
- ❌ Tabela não exibe coluna `subtipo` — campo que ainda não existe no BD
- ❌ Botão "Atualizar" não tem `onClick` — não funciona
- ❌ Entradas somadas de movimentações; ignora `volume_ensilado_ton_mv` como entrada implícita

---

#### `tabs/QualidadeTab.tsx` — ⚠️ Estrutura presente, dados e tipos errados

**O que funciona:**
- Botões "Nova" para abrir dialogs ✅
- Renderiza avaliações se recebe props preenchidos ✅

**O que está faltando/errado:**
- ❌ Interface local `AvaliacaoBromatologica` com campos `pb`, `fd`, `fda`, `energia`, `umidade` — errados
- ❌ Exibe `fd` como "FD" — deveria ser "FDN"
- ❌ Exibe `energia` em "Mcal/kg" — deve ser **removido**
- ❌ NÃO exibe: MS, FDN, Amido, NDT, pH
- ❌ Para PSPS: TMP em "min" — deveria ser "mm" (TMP = Tamanho Médio de Partícula)
- ❌ PSPS: badge Ideal/Bom/Ruim por avaliação — deveria ser indicador ok/fora **por peneira individual**
- ❌ Faixas ideais por peneira não são exibidas

---

### 2.4 Padrões Adoptados

- **Batch Loading:** Fetch de silos + movimentações em 2-3 chamadas max (não N+1)
- **Cálculos em Memória:** Estoque, consumo, status calculados no TS, não no BD
- **Validação Zod:** Schemas centralizados em `lib/validations/silos.ts` (mas componentes usam schemas locais — divergência a corrigir)
- **RLS Security:** Todas as policies usam a função `public.get_my_fazenda_id()` — **nunca** `auth.jwt() ->> 'fazenda_id'`. Ver detalhe abaixo.
- **Dialogs Modais:** Formulários em dialogs, não em pages separadas

### 2.5 Padrão Real de RLS (crítico para a Migration 2)

Toda a segurança de isolamento por fazenda passa pela função auxiliar:

```sql
-- Definida em: supabase/migrations/20260407_rls_completo.sql
CREATE OR REPLACE FUNCTION public.get_my_fazenda_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT fazenda_id FROM public.profiles WHERE id = auth.uid();
$$;
```

**Regra:** `fazenda_id = get_my_fazenda_id()` (tabelas com fazenda_id direto) ou `silo_id IN (SELECT id FROM silos WHERE fazenda_id = get_my_fazenda_id())` (tabelas filhas de silos).

**Por que não `auth.jwt() ->> 'fazenda_id'`:**
- O projeto **não** inclui `fazenda_id` no JWT payload
- A migration `20260413_adicionar_subtipo_e_rls.sql` usou esse padrão errado — as policies geradas por ela **não funcionam** e precisam ser substituídas

**Tabelas filhas de `silos` (sem `fazenda_id` próprio) — padrão correto:**
```sql
-- SELECT / INSERT / UPDATE / DELETE
USING (silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id()))
```

---

## 3. REQUISITOS FUNCIONAIS E NÃO FUNCIONAIS

### 3.1 Tabela de Problemas Identificados

| # | Problema | Causa raiz (código) | Prioridade |
|---|----------|---------------------|-----------|
| 1 | Data de fechamento não aparece no cadastro | `SiloForm.tsx`: campo não existe no form, `data_fechamento: null` hardcoded no submit | 🔴 CRÍTICA |
| 2 | TMP não salva e deve ser automático | `AvaliacaoPspsDialog.tsx`: TODO no submit, TMP é campo manual | 🔴 CRÍTICA |
| 3 | Volume ensilado não vira estoque | Lógica ausente: ao criar silo, nenhuma movimentação de entrada é criada | 🔴 CRÍTICA |
| 4 | Análise bromatológica não salva | `AvaliacaoBromatologicaDialog.tsx`: TODO no submit, sem conexão com banco | 🔴 CRÍTICA |
| 5 | Total de entrada zerado, status vazio | Estoque calculado apenas por movimentações; volume_ensilado_ton_mv ignorado | 🔴 CRÍTICA |
| 6 | Visão geral incompleta | `VisaoGeralTab.tsx`: datas e observações hardcoded; dimensões ausentes | 🟡 ALTA |
| 7 | Campos bromatológicos errados | FD em vez de FDN, Energia e Umidade no lugar de MS/FDN/Amido/NDT/pH | 🔴 CRÍTICA |
| 8 | Design das abas ruim | Botões grandes, layout sem hierarquia visual clara | 🟡 ALTA |
| 9 | Movimentação sem subtipo | `MovimentacaoDialog.tsx`: campo subtipo inexistente no form | 🔴 CRÍTICA |
| 10 | Segunda entrada não bloqueada | `MovimentacaoDialog.tsx`: sem validação de entrada única | 🔴 CRÍTICA |
| 11 | Usuário sem talhão não tem custo | Sem campo `custo_aquisicao_rs_ton` quando `talhao_id = null` | 🟡 ALTA |
| 12 | Talhão obrigatório (anterior) | ✅ Já resolvido: `SiloForm.tsx` tem talhão como opcional | ✅ OK |

---

### 3.2 Requisitos Funcionais (RF)

#### RF-1: Cadastro Completo de Silo (`SiloForm.tsx`)

**Seção A — Dados Gerais:**
- Nome do silo (obrigatório)
- Tipo de estrutura: Superfície | Trincheira | Bag | Outros (obrigatório)
- Talhão de origem (opcional, permanentemente nullable)
- Cultura ensilada:
  - Se talhão selecionado: preenchida automaticamente (read-only), buscando cultura do talhão
  - Se sem talhão: campo livre, preenchimento manual
- **Data de fechamento** (obrigatório) — ✨ ADICIONAR
- Data de abertura prevista (pré-preenchida: data_fechamento + 60 dias, editável) — ✨ ADICIONAR
- Observações gerais (texto livre, opcional) — ✨ ADICIONAR

**Seção B — Dados Quantitativos:**
- Volume ensilado (ton MV, obrigatório)
- Matéria seca original (%, obrigatório)
- Comprimento (m, obrigatório)
- Largura (m, obrigatório)
- Altura (m, obrigatório)
- Densidade aparente (kg/m³, calculada ao sair do campo Altura, com indicador 🟢/🟡/🔴)

**Seção C — Insumos:**
- Lona utilizada (FK, opcional, era obrigatório no PRD original)
- Inoculante (FK, opcional)

**Seção D — Custo (condicional, exibida apenas quando talhao_id = null):**
- Custo de aquisição (R$/ton) — ✨ NOVO: campo `custo_aquisicao_rs_ton`

**Ao salvar:**
- Criar uma movimentação de entrada (tipo='Entrada', subtipo='Ensilagem') com `quantidade = volume_ensilado_ton_mv`
- ✅ Isso resolve o problema do estoque zerado

---

#### RF-2: Estoque e Movimentações — Regra de Entrada Única

**Regra de negócio central:**
> A silagem tem **uma única entrada**, que ocorre no momento da ensilagem. Após o cadastro do silo, **apenas saídas são permitidas** pelas movimentações regulares.

**Detalhamento:**
- **Entrada (Ensilagem):** Criada automaticamente ao cadastrar o silo, com `quantidade = volume_ensilado_ton_mv`
  - Não é criada pelo `MovimentacaoDialog` — é uma operação do sistema ao salvar `SiloForm`
  - `subtipo = 'Ensilagem'` (entrada de sistema, não editável)
  - Não pode ser criada novamente

- **Saídas (via MovimentacaoDialog):** Únicas movimentações que o usuário cria após o cadastro
  - `subtipo` obrigatório: Uso na alimentação | Descarte | Transferência | Venda
  - Campo `data` selecionável (não hardcoded)
  - Quantidade não pode exceder estoque atual

- **Validação de bloqueio:** O `MovimentacaoDialog` deve ocultar ou desabilitar a opção "Entrada" de tipo
  - Se o silo já tem movimentação de entrada, bloquear nova entrada com mensagem: "Este silo já possui uma entrada registrada. Registre apenas saídas."

**Cálculos dinâmicos:**
- Estoque atual = volume_ensilado_ton_mv − Σ Saídas
- Consumo diário = Σ Saídas(Uso na alimentação) / dias desde data_abertura_real
- Dias de estoque = Estoque / Consumo diário
- Status = função de datas + estoque (Enchendo | Fechado | Aberto | Atenção | Vazio)

---

#### RF-3: Avaliações Bromatológicas

**Campos do formulário `AvaliacaoBromatologicaDialog.tsx`:**

| Campo | Nome completo | Unidade | Obrigatório | Observação |
|-------|---------------|---------|:-----------:|-----------|
| `data` | Data da análise | date | **Sim** | |
| `momento` | Momento | Fechamento / Abertura / Monitoramento | **Sim** | Select enum, não input livre |
| `ms` | Matéria Seca | % | Não | |
| `pb` | Proteína Bruta | % | Não | |
| `fdn` | Fibra em Detergente Neutro | % | Não | |
| `fda` | Fibra em Detergente Ácido | % | Não | |
| `amido` | Amido | % | Não | |
| `ndt` | Nutrientes Digestíveis Totais | % | Não | |
| `ph` | pH | — | Não | min 0, max 14 |
| `avaliador` | Avaliador / Laboratório | texto | Não | |

**Regra de obrigatoriedade confirmada:** `data` e `momento` são os únicos campos obrigatórios. Todos os campos numéricos (`ms`, `pb`, `fdn`, `fda`, `amido`, `ndt`, `ph`) são opcionais — o usuário preenche apenas o que tem disponível do laudo laboratorial. Isso é intencional: laudos parciais são comuns no campo.

**Campos REMOVIDOS em relação ao código atual:**
- ❌ `fd` — bug de nomenclatura; substituído por `fdn` (FDN = Fibra em Detergente Neutro)
- ❌ `energia` (Energia em Mcal/kg) — **removido permanentemente**
- ❌ `umidade` — conceito substituído por `ms` (Matéria Seca, que é complemento da umidade)
- ❌ `ee` (Extrato Etéreo) e `mm` (Matéria Mineral) — presentes na migration existente mas **fora do escopo**

**Comportamento:**
- Todos os campos numéricos são opcionais (usuário preenche apenas o que tem)
- Salvar em tabela `avaliacoes_bromatologicas` via `q.avaliacoesBromatologicas.create()`
- Listar em `QualidadeTab.tsx` com mais recente primeiro

---

#### RF-4: Avaliações PSPS (Tamanho de Partícula)

**Campos do formulário `AvaliacaoPspsDialog.tsx`:**

| Campo | Nome | Obrigatório | Observação |
|-------|------|:-----------:|-----------|
| `data` | Data | Sim | |
| `momento` | Momento | Sim | Fechamento / Abertura / Monitoramento |
| `peneira_19mm` | Peneira >19mm (%) | Sim | Faixa ideal: 3–8% |
| `peneira_8_19mm` | Peneira 8–19mm (%) | Sim | Faixa ideal: 45–65% |
| `peneira_4_8mm` | Peneira 4–8mm (%) | Sim | Faixa ideal: 20–30% |
| `peneira_fundo_4mm` | Fundo <4mm (%) | Sim | Faixa ideal: 0–10% |
| `tamanho_teorico_corte_mm` | Tamanho teórico de corte (mm) | Não | |
| `kernel_processor` | Kernel Processor | Sim | Sim/Não |
| `avaliador` | Avaliador | Não | |

**Campos calculados — divisão BD vs. TypeScript:**

`tmp_mm` é o único campo GENERATED no BD:
```sql
tmp_mm GENERATED ALWAYS AS (
  (peneira_19mm / 100.0 * 26.9) + (peneira_8_19mm / 100.0 * 13.5) +
  (peneira_4_8mm / 100.0 * 6.0) + (peneira_fundo_4mm / 100.0 * 1.18)
) STORED
```

Os campos `status_peneira_*` **não são GENERATED no BD** — são calculados no TypeScript ao renderizar os resultados. O motivo é que as faixas ideais variam conforme `kernel_processor`:

| Peneira | Sem KP (kernel_processor = false) | Com KP (kernel_processor = true) |
|---------|----------------------------------|----------------------------------|
| >19mm | 3–8% | 3–8% (igual) |
| 8–19mm | 45–65% | 45–65% (igual) |
| 4–8mm | 20–30% | 20–30% (igual) |
| <4mm | 0–10% | 0–10% (igual) |
| TMP ideal | 8–12mm | 6–10mm |

As faixas por peneira são iguais; a diferença de KP impacta principalmente a interpretação do TMP. O cálculo de status é simples e sem risco de divergência BD/frontend por ser pura comparação.

**Remoção necessária na migration:** A migration `20260413_criar_avaliacoes_tabelas.sql` já criou `avaliacoes_psps` com `status_peneira_*` como GENERATED (com faixas diferentes das corretas). Esses campos precisam ser removidos via `ALTER TABLE ... DROP COLUMN` antes de recriar a tabela ou via migration de ajuste.

**Validação:**
- Soma das 4 peneiras deve ser 100% (±0.5%)
- Botão "Salvar" desabilitado enquanto soma for inválida
- Erro em vermelho exibido em tempo real

**Comportamento:**
- Salvar em tabela `avaliacoes_psps` via `q.avaliacoesPsps.create()`
- Listar em `QualidadeTab.tsx` com indicadores por peneira (ok ✅ / fora ⚠️)

---

#### RF-5: Visão Geral — Aba 1 (`VisaoGeralTab.tsx`)

A aba deve exibir **todas** as informações do silo, lendo do objeto `silo` prop:

**Card "Dados do Silo":**
- Nome, Tipo, Cultura ensilada
- Dimensões: C × L × A (m)
- Volume ensilado (ton MV)
- Matéria Seca original (%)
- Densidade aparente (kg/m³) com indicador 🟢 ≥650 / 🟡 550–649 / 🔴 <550

**Card "Rastreabilidade & Custo":**
- *Se talhao_id não-nulo:* Nome do talhão, Ciclo agrícola, Custo/ton via `getCustoProducaoSilagem()`, Custo total (volume × custo/ton)
- *Se talhao_id = null:* Custo de aquisição (R$/ton) via `silo.custo_aquisicao_rs_ton`, Custo total estimado

**Card "Datas":**
- Data de fechamento: `silo.data_fechamento` (atualmente hardcoded como "-")
- Data de abertura prevista: `silo.data_abertura_prevista` (atualmente hardcoded como "-")
- Data de abertura real: `silo.data_abertura_real` (atualmente hardcoded como "-")
- Dias de fermentação: calculado (abertura_real − fechamento)

**Card "Insumos":**
- Lona, Inoculante (já funcional)

**Card "Observações":**
- `silo.observacoes_gerais` (atualmente hardcoded)

---

#### RF-6: Fluxo do Operador — Saídas Diárias via `/operador/`

**Contexto:** Operadores de campo não devem acessar o dashboard completo. Eles precisam de uma tela simples, rápida e funcional em celular para registrar diariamente a saída de silagem do silo.

**Rota:** `/operador/silos` (já existe role de operador em `/operador/`)

**Design:** Mobile-first, componentes grandes e tocáveis, sem navegação complexa

**Campos do formulário de saída:**

| Campo | Tipo | Obrigatório | Observação |
|-------|------|:-----------:|-----------|
| Silo | Select | Sim | Dropdown com silos ativos (status ≠ Vazio) |
| Quantidade (ton) | Número | Sim | Apenas positivo, com teclado numérico |
| Subtipo | Select | Sim | Uso na alimentação / Descarte / Transferência / Venda |
| Data | Date | Sim | Default: hoje |

**Campos omitidos (simplificação):**
- Responsável (preenchido automaticamente pelo usuário logado)
- Observação (opcional, pode ser adicionado em v3)

**Comportamento:**
- Após submit: toast de sucesso + reset do formulário para próximo registro
- Exibir estoque atual do silo selecionado em tempo real (ao selecionar silo)
- Bloquear submit se quantidade > estoque atual
- Interface sem sidebar, sem header complexo — só o essencial

**Integração:**
- Usa `q.movimentacoesSilo.create()` com `tipo='Saída'`
- Responsável preenchido automaticamente com nome do usuário logado

---

#### RF-7: Custo de Aquisição para Silos sem Talhão

**Contexto:** Quando `talhao_id = null` (usuário comprou lavoura ou não tem talhão cadastrado), o módulo financeiro não consegue calcular custo via `getCustoProducaoSilagem()`. Para manter a rastreabilidade de custos, o usuário deve poder informar manualmente o custo de aquisição.

**Campo novo no BD:** `custo_aquisicao_rs_ton NUMERIC(12,2)` — a adicionar em migration

**Onde aparece no frontend:**
1. **SiloForm.tsx — Seção D (condicional):** Exibida apenas quando talhão = "Nenhum"
   - Label: "Custo de aquisição da silagem (R$/ton)"
   - Placeholder: "Ex: 180.00"
   - Opcional, mas recomendado para relatórios

2. **VisaoGeralTab.tsx — Card "Rastreabilidade & Custo":**
   - Quando `talhao_id = null`: exibir `custo_aquisicao_rs_ton` se preenchido
   - Calcular custo total = `volume_ensilado_ton_mv × custo_aquisicao_rs_ton`

**Lógica de custo unificada no helper `lib/supabase/silos.ts`:**
```
getCustoSilo(siloId):
  Se talhao_id não-nulo → getCustoProducaoSilagem() (existente)
  Se talhao_id = null   → { custoPorTonelada: custo_aquisicao_rs_ton, custoTotal: vol × custo }
  Se ambos null         → null (exibir "-")
```

---

#### RF-8: Design e UX das Abas Internas

**Problema:** Botões das abas internas da funcionalidade estão grandes e inadequados.

**Requisitos:**
- TabsList com variante pequena e compacta, posicionada no topo da tela detalhada
- Botões de ação (Nova Avaliação, Registrar Movimentação) devem ter `size="sm"` e serem colocados no header do card, não flutuando
- Layout interno com cards bem delimitados, sem excesso de espaçamento vertical
- Em mobile: abas devem ser scrolláveis horizontalmente (não quebrar linha)

---

### 3.3 Requisitos Não-Funcionais (RNF)

| Requisito | Detalhe |
|-----------|---------|
| **Performance** | Batch-loading: max 3 chamadas Supabase por tela. Cálculos em memória (<100ms). |
| **Segurança** | RLS válido. Usuários não veem silos de outras fazendas. Operadores só acessam saídas. |
| **Integridade** | Ao deletar silo, deletar movimentações e avaliações (CASCADE). Entrada única por silo. |
| **Compatibilidade** | Silos legado (talhao_id = NULL, sem custo_aquisicao) devem continuar funcionando. |
| **Mobile** | Tela do operador deve funcionar bem em viewport 375px (iPhone SE). |
| **Validação Zod** | Todos os formulários devem usar schemas de `lib/validations/silos.ts` — sem schemas locais duplicados. |

---

## 4. RESTRIÇÕES E DEPENDÊNCIAS IDENTIFICADAS

### 4.1 Restrições Técnicas

1. **Migration 20260413 incompleta:**
   - ✅ Adiciona campos em `silos` (data_fechamento, volume_ensilado_ton_mv, etc.)
   - ❌ Não cria tabelas `avaliacoes_bromatologicas` e `avaliacoes_psps`
   - ❌ Não cria coluna `subtipo` em `movimentacoes_silo`
   - ❌ Não cria coluna `custo_aquisicao_rs_ton` em `silos`
   - ❌ Não cria RLS policies para avaliações

2. **`talhao_id` é permanentemente NULLABLE:**
   - Decisão definitiva: não será `NOT NULL` nunca
   - Sem migration futura de conversão

3. **Schemas Zod duplicados:**
   - `lib/validations/silos.ts` tem schemas corretos mas nenhum componente os usa
   - Todos os dialogs têm schemas locais com campos diferentes
   - Deve-se migrar todos para usar o schema central

4. **Tabela `avaliacoes_bromatologicas` não existe:**
   - Queries CRUD em `queries-audit.ts` para estas tabelas ainda precisam ser criadas

### 4.2 Dependências Externas

| Módulo | Função | Status |
|--------|--------|--------|
| **Talhões** | Obter lista e cultura do talhão | ✅ Existe (`q.talhoes.list()`) |
| **Insumos** | Filtrar lonas e inoculantes | ✅ Existe (`q.insumos.list()`) |
| **Financeiro** | Custo via `getCustoProducaoSilagem()` | ✅ Existe (`lib/supabase/silos.ts`) |
| **Autenticação** | `getFazendaId()`, RLS, nome do usuário | ✅ Existe |
| **Role Operador** | Acesso restrito a `/operador/` | ✅ Existe (rota já existe) |

### 4.3 Sequência de Implementação

```
FASE 0: Migrations (ajuste tabelas existentes + RLS correto)
    ↓
FASE 1: Tipos TS + Schemas Zod (centralizar, remover schemas locais)
    ↓
FASE 2: Queries CRUD (avaliacoesBromatologicas, avaliacoesPsps + helpers)
    ↓
FASE 3: Dialogs corrigidos (SiloForm + MovimentacaoDialog + Avaliações)
    ↓
FASE 4: Tabs corrigidas (VisaoGeralTab + EstoqueTab + QualidadeTab)
    ↓
FASE 5: Tela Operador (/operador/silos)
    ↓
FASE 6: Design e polish (tamanho abas, indicadores visuais)
```

> **⚠️ REGRA DE DEPLOY:** Migration e código vão juntos no mesmo push para produção, **nunca separados**. Aplicar a migration sem o código deixa o banco em estado inconsistente (novas constraints quebram inserts do código antigo). Aplicar o código sem a migration gera erros de colunas inexistentes. O par migration + código é atômico do ponto de vista de deploy.

### 4.4 Estado Real das Migrations e o que a "Migration 2" deve fazer

#### Migrations já aplicadas (diagnóstico)

| Migration | Status | Problema |
|-----------|--------|---------|
| `20260413_silos_reformulacao.sql` | ✅ Aplicada | OK — campos corretos em `silos` |
| `20260413_criar_avaliacoes_tabelas.sql` | ✅ Aplicada | Tabelas existem, mas com problemas: `ee`/`mm` presentes em brom; `status_peneira_*` GENERATED em psps com fórmulas erradas; sem UNIQUE; sem CHECK em `momento` |
| `20260413_adicionar_subtipo_e_rls.sql` | ✅ Aplicada | `subtipo` coluna existe em `movimentacoes_silo`; mas RLS usa `auth.jwt() ->> 'fazenda_id'` — **padrão errado, policies não funcionam** |

#### Migration 2 — Ajustes e Correções (a criar)

O objetivo é **corrigir divergências** nas tabelas já existentes, não recriar do zero.

```sql
-- =============================================================================
-- PARTE 1: SILOS — campo de custo para silos sem talhão
-- =============================================================================
ALTER TABLE public.silos
  ADD COLUMN IF NOT EXISTS custo_aquisicao_rs_ton NUMERIC(12, 2);

-- =============================================================================
-- PARTE 2: MOVIMENTACOES_SILO — CHECK constraint e índice único de entrada
-- =============================================================================

-- CHECK: valores permitidos em subtipo (subtipo = NULL é permitido para entradas)
ALTER TABLE public.movimentacoes_silo
  ADD CONSTRAINT movimentacoes_silo_subtipo_check
  CHECK (
    subtipo IS NULL
    OR subtipo IN ('Ensilagem', 'Uso na alimentação', 'Descarte', 'Transferência', 'Venda')
  );

-- UNIQUE INDEX parcial: garante no BD que cada silo tem no máximo 1 entrada
-- Essa é a segunda linha de defesa — o frontend também deve bloquear, mas o BD é definitivo
CREATE UNIQUE INDEX IF NOT EXISTS movimentacoes_silo_uma_entrada_por_silo
  ON public.movimentacoes_silo (silo_id)
  WHERE tipo = 'Entrada';

-- =============================================================================
-- PARTE 3: AVALIACOES_BROMATOLOGICAS — remover campos fora do escopo,
--           corrigir CHECK em momento, adicionar UNIQUE
-- =============================================================================

-- Remover EE e MM (fora do escopo — RF-3 define apenas MS, PB, FDN, FDA, Amido, NDT, pH)
ALTER TABLE public.avaliacoes_bromatologicas
  DROP COLUMN IF EXISTS ee,
  DROP COLUMN IF EXISTS mm;

-- CHECK constraint para momento (a migration original não incluía)
ALTER TABLE public.avaliacoes_bromatologicas
  ADD CONSTRAINT avaliacoes_brom_momento_check
  CHECK (momento IN ('Fechamento', 'Abertura', 'Monitoramento'));

-- UNIQUE: impede duplicata de avaliação para mesmo silo/data/momento
ALTER TABLE public.avaliacoes_bromatologicas
  ADD CONSTRAINT avaliacoes_brom_unique_silo_data_momento
  UNIQUE (silo_id, data, momento);

-- =============================================================================
-- PARTE 4: AVALIACOES_PSPS — remover status_peneira_* GENERATED (serão calculados no TS),
--           corrigir fórmula tmp_mm, adicionar CHECK e UNIQUE
-- =============================================================================

-- Remover colunas status_peneira_* (calculadas no TypeScript, não no BD)
-- Motivo: faixas ideais dependem de kernel_processor — lógica que não cabe em GENERATED
ALTER TABLE public.avaliacoes_psps
  DROP COLUMN IF EXISTS status_peneira_19mm,
  DROP COLUMN IF EXISTS status_peneira_8_19mm,
  DROP COLUMN IF EXISTS status_peneira_4_8mm,
  DROP COLUMN IF EXISTS status_peneira_fundo_4mm;

-- Recriar tmp_mm com a fórmula correta (pesos reais do PSPS por faixa de mm)
-- A migration original usava pesos: 19, 13.5, 6, 0 — incorretos
ALTER TABLE public.avaliacoes_psps DROP COLUMN IF EXISTS tmp_mm;
ALTER TABLE public.avaliacoes_psps
  ADD COLUMN tmp_mm NUMERIC(5, 2) GENERATED ALWAYS AS (
    (peneira_19mm    / 100.0 * 26.9) +
    (peneira_8_19mm  / 100.0 * 13.5) +
    (peneira_4_8mm   / 100.0 *  6.0) +
    (peneira_fundo_4mm / 100.0 *  1.18)
  ) STORED;

-- CHECK constraint para momento
ALTER TABLE public.avaliacoes_psps
  ADD CONSTRAINT avaliacoes_psps_momento_check
  CHECK (momento IN ('Fechamento', 'Abertura', 'Monitoramento'));

-- UNIQUE: impede duplicata de avaliação para mesmo silo/data/momento
ALTER TABLE public.avaliacoes_psps
  ADD CONSTRAINT avaliacoes_psps_unique_silo_data_momento
  UNIQUE (silo_id, data, momento);

-- =============================================================================
-- PARTE 5: RLS — substituir policies com padrão errado (auth.jwt)
--           pelo padrão correto (get_my_fazenda_id)
-- =============================================================================

-- Remover as policies criadas pela migration 20260413_adicionar_subtipo_e_rls.sql
-- que usavam auth.jwt() ->> 'fazenda_id' (não funciona pois fazenda_id não está no JWT)
DROP POLICY IF EXISTS "avaliacoes_bromatologicas_select_by_fazenda" ON public.avaliacoes_bromatologicas;
DROP POLICY IF EXISTS "avaliacoes_bromatologicas_insert_by_fazenda" ON public.avaliacoes_bromatologicas;
DROP POLICY IF EXISTS "avaliacoes_bromatologicas_update_by_fazenda" ON public.avaliacoes_bromatologicas;
DROP POLICY IF EXISTS "avaliacoes_bromatologicas_delete_by_fazenda" ON public.avaliacoes_bromatologicas;
DROP POLICY IF EXISTS "avaliacoes_psps_select_by_fazenda"           ON public.avaliacoes_psps;
DROP POLICY IF EXISTS "avaliacoes_psps_insert_by_fazenda"           ON public.avaliacoes_psps;
DROP POLICY IF EXISTS "avaliacoes_psps_update_by_fazenda"           ON public.avaliacoes_psps;
DROP POLICY IF EXISTS "avaliacoes_psps_delete_by_fazenda"           ON public.avaliacoes_psps;

-- Recriar com get_my_fazenda_id() — padrão do projeto (ver 20260407_rls_completo.sql)
ALTER TABLE public.avaliacoes_bromatologicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes_psps           ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aval_brom_select" ON public.avaliacoes_bromatologicas
  FOR SELECT USING (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );
CREATE POLICY "aval_brom_insert" ON public.avaliacoes_bromatologicas
  FOR INSERT WITH CHECK (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );
CREATE POLICY "aval_brom_update" ON public.avaliacoes_bromatologicas
  FOR UPDATE
  USING     (silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id()))
  WITH CHECK(silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id()));
CREATE POLICY "aval_brom_delete" ON public.avaliacoes_bromatologicas
  FOR DELETE USING (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );

CREATE POLICY "aval_psps_select" ON public.avaliacoes_psps
  FOR SELECT USING (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );
CREATE POLICY "aval_psps_insert" ON public.avaliacoes_psps
  FOR INSERT WITH CHECK (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );
CREATE POLICY "aval_psps_update" ON public.avaliacoes_psps
  FOR UPDATE
  USING     (silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id()))
  WITH CHECK(silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id()));
CREATE POLICY "aval_psps_delete" ON public.avaliacoes_psps
  FOR DELETE USING (
    silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())
  );

-- =============================================================================
-- PARTE 6: BACKFILL — criar movimentação de entrada para silos já cadastrados
--          que tenham volume_ensilado_ton_mv preenchido e ainda sem entrada
-- =============================================================================
INSERT INTO public.movimentacoes_silo (
  silo_id, tipo, subtipo, quantidade, data, talhao_id, responsavel, observacao
)
SELECT
  s.id                                                   AS silo_id,
  'Entrada'                                              AS tipo,
  'Ensilagem'                                            AS subtipo,
  COALESCE(s.volume_ensilado_ton_mv, 0)                  AS quantidade,
  COALESCE(s.data_fechamento, s.created_at::date)        AS data,
  s.talhao_id                                            AS talhao_id,
  'Sistema (backfill)'                                   AS responsavel,
  'Entrada retroativa gerada automaticamente na migração' AS observacao
FROM public.silos s
WHERE
  s.volume_ensilado_ton_mv IS NOT NULL
  AND s.volume_ensilado_ton_mv > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.movimentacoes_silo m
    WHERE m.silo_id = s.id AND m.tipo = 'Entrada'
  );
-- Nota: idempotente via NOT EXISTS — seguro rodar novamente se necessário
```

---

## 5. MUDANÇAS VS. PRD-SILOS.MD ORIGINAL E V2.0

| Item | PRD Original | v2.0 | v2.2 (atual) |
|------|-------------|------|--------------|
| `talhao_id` obrigatório | Sim | Não (opcional) | Não (permanentemente nullable, sem migration futura) |
| Campos bromatológicos | MS, PB, FDN, FDA, EE, MM, Amido, NDT, pH | Mesmos | **MS, PB, FDN, FDA, Amido, NDT, pH** — EE, MM e Energia removidos |
| FD vs FDN | FDN | FDN (nome correto) | FDN confirmado — `fd` no código é bug a corrigir |
| Energia Mcal/kg | Não existia | Não mencionado | Explicitamente **REMOVIDO** |
| Obrigatoriedade brom | Todos obrigatórios | Não definido | **Confirmado:** só `data` e `momento` obrigatórios; demais opcionais |
| Entrada única | Mencionado | Parcialmente descrito | **Regra formal:** entrada automática ao criar silo; UNIQUE INDEX no BD impede segunda |
| Fluxo operador | Não descrito | Não descrito | **RF-6: Nova tela `/operador/silos` mobile-first** |
| Custo sem talhão | Não descrito | Não descrito | **RF-7: Campo `custo_aquisicao_rs_ton`** |
| status_peneira_* | GENERATED no BD | GENERATED no BD | **Removidos do BD — calculados no TypeScript** (faixas dependem de kernel_processor) |
| RLS policies (avaliações) | `auth.jwt()` | `auth.jwt()` | **Corrigido para `get_my_fazenda_id()`** |
| CHECK constraint subtipo | Não existia | Não mencionado | **Adicionado na Migration 2** |
| UNIQUE índice entrada | Não existia | Não mencionado | **Adicionado na Migration 2** (partial index) |
| UNIQUE avaliações | Não existia | Não mencionado | **Adicionado em ambas as tabelas** (silo_id, data, momento) |
| Backfill silos existentes | Não mencionado | Não mencionado | **Adicionado na Migration 2** (INSERT com NOT EXISTS) |
| Migration 3 (NOT NULL) | `NOT NULL` futura | `NOT NULL` futura | **REMOVIDA** — talhao_id nullable permanentemente |
| Ordem de deploy | Não mencionado | Não mencionado | **Nota explícita:** migration + código no mesmo push |
| Estado dos componentes | Inferido | Inferido | **Verificado em código real** (seção 2.3) |

---

## 6. PRIORIZAÇÃO DE CORREÇÕES

### 🔴 Fase Crítica (Bloqueia funcionamento básico)

1. **Migration 2** — tabelas + subtipo + custo_aquisicao + RLS
2. **Schemas Zod** — migrar dialogs para `lib/validations/silos.ts`; adicionar `fdn`, `amido`, `ndt`, `ph`; remover `fd`, `energia`, `umidade`
3. **AvaliacaoBromatologicaDialog** — implementar save, corrigir campos (FDN em vez de FD, remover Energia, adicionar MS/Amido/NDT/pH)
4. **AvaliacaoPspsDialog** — implementar save, remover `tmp` e `status` como inputs, corrigir peneiras, adicionar `momento`/`avaliador`/`kernel_processor`
5. **SiloForm** — adicionar `data_fechamento`, `data_abertura_prevista`, `observacoes_gerais`, `custo_aquisicao_rs_ton` (condicional); criar movimentação de entrada ao salvar
6. **MovimentacaoDialog** — adicionar `subtipo`, campo `data` selecionável, desabilitar opção "Entrada", validar entrada única

### 🟡 Fase Alta (Importante para UX e completude)

7. **VisaoGeralTab** — ler `silo.data_fechamento`, `silo.data_abertura_prevista`, `silo.data_abertura_real`, `silo.observacoes_gerais`; adicionar dimensões; densidade com indicador
8. **EstoqueTab** — corrigir agrupamento de saídas (usar `subtipo`), adicionar botão "Atualizar" funcional, exibir coluna `subtipo` na tabela
9. **QualidadeTab** — corrigir campos exibidos (FDN não FD, adicionar MS/Amido/NDT/pH, remover Energia), corrigir TMP para "mm", indicadores por peneira
10. **RF-6** — Tela do operador `/operador/silos` para saídas diárias

### 🟢 Fase Melhoria (Design e polish)

11. **RF-8** — Redesenhar abas: botões menores, layout compacto, tabs scrolláveis no mobile
12. **Densidade com indicador** — `🟢 ≥650 / 🟡 550–649 / 🔴 <550` no SiloForm e VisaoGeralTab
13. **queries-audit.ts** — adicionar namespaces `q.avaliacoesBromatologicas` e `q.avaliacoesPsps`

---

## 7. CASOS DE TESTE (SMOKE)

### Cadastro e Estoque
- [ ] Criar silo com data de fechamento → verificar que data é salva no BD
- [ ] Ao criar silo com volume X → verificar que movimentação de entrada (X ton) é criada automaticamente
- [ ] Total de entradas = X (não zerado); Status = Fechado (tem data_fechamento, sem abertura real)
- [ ] Tentar criar segunda entrada via dialog → deve ser bloqueado
- [ ] Registrar saída com subtipo "Uso na alimentação" → estoque = X − quantidade

### Bromatológica
- [ ] Abrir dialog bromatológica → deve mostrar: MS, PB, FDN, FDA, Amido, NDT, pH
- [ ] NÃO deve mostrar: Energia, FD, Umidade
- [ ] Salvar avaliação → aparece no banco (tabela `avaliacoes_bromatologicas`)
- [ ] Listar na aba Qualidade com campos corretos

### PSPS
- [ ] Abrir dialog PSPS → peneiras: >19mm, 8-19mm, 4-8mm, <4mm (nomes corretos)
- [ ] TMP não deve ser campo editável — deve aparecer apenas após salvar (calculado pelo BD)
- [ ] Soma ≠ 100% → botão Salvar desabilitado
- [ ] Soma = 100% → salva, TMP aparece em "mm" na listagem
- [ ] Indicadores por peneira: ✅ ok / ⚠️ fora (não badge único Ideal/Bom/Ruim)

### Visão Geral
- [ ] Data de fechamento aparece (não hardcoded "-")
- [ ] Observações do silo aparecem (não hardcoded)
- [ ] Com talhão: exibir custo de produção
- [ ] Sem talhão: exibir custo de aquisição (se preenchido)

### Operador
- [ ] `/operador/silos` carrega apenas silos ativos
- [ ] Selecionar silo mostra estoque atual
- [ ] Submeter saída → movimentação criada; estoque atualiza

---

## 8. REFERÊNCIAS

| Documento | Status | Localização |
|-----------|--------|-------------|
| PRD-silos.md | Original (v1) | `docs/PRD-silos.md` |
| Spec-silos.md | Especificação técnica | `docs/Spec-silos.md` |
| Migration 20260413 | Parcialmente aplicada | `supabase/migrations/` |
| Tipos Silo | `lib/supabase.ts` | `lib/supabase.ts` |
| Validações Zod | Centralizadas, mas não usadas pelos dialogs | `lib/validations/silos.ts` |
| Queries batch | Não tem CRUD de avaliações ainda | `lib/supabase/queries-audit.ts` |
| Helpers de cálculo | Funcionais | `lib/supabase/silos.ts` |

---

**Fim do PRD v2.2**  
Gerado em: 19/04/2026  
Revisado com: inspeção direta dos arquivos de código + migrations existentes
