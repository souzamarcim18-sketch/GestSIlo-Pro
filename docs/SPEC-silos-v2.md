# SPEC-silos-v2.md — Especificação Técnica de Implementação

**Baseado em:** PRD-silos-v2.2 (19/04/2026)  
**Status:** Pronto para implementação  
**Autor:** Gerado por Claude Code

---

## Visão Geral

Este documento detalha **todos os arquivos** a criar ou modificar para implementar o PRD v2.2 do módulo de silos. A sequência é imperativa: cada fase depende da anterior.

---

## FASE 0 — Migrations de Banco de Dados

### CRIAR: `supabase/migrations/20260419_silos_v2_ajustes.sql`

**Propósito:** Corrigir divergências nas tabelas existentes (não recriar do zero). Aplicar junto com o código no mesmo deploy.

**Blocos a incluir (nesta ordem):**

1. **PARTE 1 — silos:** `ALTER TABLE public.silos ADD COLUMN IF NOT EXISTS custo_aquisicao_rs_ton NUMERIC(12,2)`

2. **PARTE 2 — movimentacoes_silo (em 3 sub-etapas ordenadas):**

   **2a — CHECK constraint de subtipo:**
   ```sql
   ALTER TABLE public.movimentacoes_silo
     ADD CONSTRAINT movimentacoes_silo_subtipo_check
     CHECK (subtipo IS NULL OR subtipo IN ('Ensilagem', 'Uso na alimentação', 'Descarte', 'Transferência', 'Venda'));
   ```

   **2b — Sanity check: abortar se já existem silos com múltiplas entradas:**
   ```sql
   DO $$
   DECLARE
     v_count INTEGER;
   BEGIN
     SELECT COUNT(*) INTO v_count
     FROM (
       SELECT silo_id
       FROM public.movimentacoes_silo
       WHERE tipo = 'Entrada'
       GROUP BY silo_id
       HAVING COUNT(*) > 1
     ) duplicates;

     IF v_count > 0 THEN
       RAISE EXCEPTION
         'Migration abortada: % silo(s) com múltiplas entradas detectado(s). '
         'Corrija os dados manualmente antes de reaplicar esta migration.',
         v_count;
     END IF;
   END $$;
   ```
   Este bloco deve vir **antes** do UNIQUE INDEX para evitar falha silenciosa. Se a exception for lançada, a migration inteira faz rollback (PostgreSQL transacional).

   **2c — UNIQUE INDEX parcial (segunda linha de defesa após sanity check):**
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS movimentacoes_silo_uma_entrada_por_silo
     ON public.movimentacoes_silo (silo_id)
     WHERE tipo = 'Entrada';
   ```

3. **PARTE 3 — avaliacoes_bromatologicas:**
   - `DROP COLUMN IF EXISTS ee` e `DROP COLUMN IF EXISTS mm` — fora do escopo RF-3
   - `ADD CONSTRAINT avaliacoes_brom_momento_check CHECK (momento IN ('Fechamento', 'Abertura', 'Monitoramento'))`
   - `ADD CONSTRAINT avaliacoes_brom_unique_silo_data_momento UNIQUE (silo_id, data, momento)`

4. **PARTE 4 — avaliacoes_psps:**
   - `DROP COLUMN IF EXISTS status_peneira_19mm, status_peneira_8_19mm, status_peneira_4_8mm, status_peneira_fundo_4mm` — serão calculados no TypeScript
   - `DROP COLUMN IF EXISTS tmp_mm` + `ADD COLUMN tmp_mm GENERATED ALWAYS AS ((peneira_19mm / 100.0 * 26.9) + (peneira_8_19mm / 100.0 * 13.5) + (peneira_4_8mm / 100.0 * 6.0) + (peneira_fundo_4mm / 100.0 * 1.18)) STORED` — fórmula corrigida
   - `ADD CONSTRAINT avaliacoes_psps_momento_check CHECK (momento IN ('Fechamento', 'Abertura', 'Monitoramento'))`
   - `ADD CONSTRAINT avaliacoes_psps_unique_silo_data_momento UNIQUE (silo_id, data, momento)`

5. **PARTE 5 — RLS:**
   - `DROP POLICY` para todas as 8 policies das tabelas de avaliações (criadas com padrão errado `auth.jwt() ->> 'fazenda_id'`)
   - `ENABLE ROW LEVEL SECURITY` em ambas as tabelas
   - Recriar 4 policies por tabela (SELECT/INSERT/UPDATE/DELETE) usando `silo_id IN (SELECT id FROM public.silos WHERE fazenda_id = get_my_fazenda_id())`

6. **PARTE 6 — Backfill (com sanity check prévio):**

   **Sanity check antes do INSERT:** Abortar se existirem silos com `volume_ensilado_ton_mv > 0` mas sem `data_fechamento` E sem `created_at` (situação impossível na prática, mas defensivo):
   ```sql
   DO $$
   BEGIN
     IF EXISTS (
       SELECT 1 FROM public.silos
       WHERE volume_ensilado_ton_mv > 0
         AND data_fechamento IS NULL
         AND created_at IS NULL
     ) THEN
       RAISE EXCEPTION 'Migration abortada: silos sem data_fechamento e sem created_at encontrados. Verifique os dados.';
     END IF;
   END $$;
   ```

   **INSERT de backfill:** Para silos com `volume_ensilado_ton_mv > 0` ainda sem entrada. Idempotente via `NOT EXISTS`. Usa `COALESCE(data_fechamento, created_at::date)` como data da entrada retroativa.

---

## FASE 1 — Tipos TypeScript e Schemas Zod

### MODIFICAR: `lib/supabase.ts`

**O que alterar:**

1. **Tipo `Silo`** — adicionar campo faltante:
   ```
   custo_aquisicao_rs_ton: number | null;
   ```

2. **Tipo `MovimentacaoSilo`** — o campo `subtipo` existe no banco mas está ausente do tipo TypeScript:
   ```
   subtipo: 'Ensilagem' | 'Uso na alimentação' | 'Descarte' | 'Transferência' | 'Venda' | null;
   ```

3. **Tipo `AvaliacaoBromatologica`** — refletir schema correto (remover `fd`, `energia`, `umidade`; adicionar `fdn`, `amido`, `ndt`, `ph`, `pb`, `fda`, `ms`, `momento`, `avaliador`):
   ```typescript
   type AvaliacaoBromatologica = {
     id: string;
     silo_id: string;
     data: string;
     momento: 'Fechamento' | 'Abertura' | 'Monitoramento';
     ms: number | null;
     pb: number | null;
     fdn: number | null;
     fda: number | null;
     amido: number | null;
     ndt: number | null;
     ph: number | null;
     avaliador: string | null;
     created_at: string;
   };
   ```

4. **Tipo `AvaliacaoPSPS`** — refletir schema correto (remover `status_peneira_*`, `tmp` manual; adicionar `tmp_mm` readonly, `momento`, `avaliador`, `kernel_processor`, `tamanho_teorico_corte_mm`):
   ```typescript
   type AvaliacaoPSPS = {
     id: string;
     silo_id: string;
     data: string;
     momento: 'Fechamento' | 'Abertura' | 'Monitoramento';
     peneira_19mm: number;
     peneira_8_19mm: number;
     peneira_4_8mm: number;
     peneira_fundo_4mm: number;
     tmp_mm: number | null;          // GENERATED pelo BD, readonly
     tamanho_teorico_corte_mm: number | null;
     kernel_processor: boolean;
     avaliador: string | null;
     created_at: string;
   };
   ```

---

### MODIFICAR: `lib/validations/silos.ts`

**O que alterar:**

**Nota sobre formato de datas:** Todos os campos de data nos schemas abaixo recebem strings no formato `YYYY-MM-DD` oriundas de `<Input type="date" />`. Validar com `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')`. Alternativa equivalente: `z.coerce.date()` seguido de `.transform(d => d.toISOString().slice(0, 10))` se preferir normalizar no schema. Aplicar consistentemente em: `data_fechamento`, `data_abertura_prevista`, campo `data` de movimentações e campo `data` de avaliações.

1. **`siloSchema`** — adicionar campos ausentes:
   - `data_fechamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` (obrigatório no create, permitir null no edit via `.nullable()`)
   - `data_abertura_prevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()`
   - `observacoes_gerais: z.string().max(1000).nullable().optional()`
   - `custo_aquisicao_rs_ton: z.number().min(0).nullable().optional()`

2. **`movimentacaoSiloSchema`** — corrigir campos:
   - `tipo: z.enum(['Entrada', 'Saída'])` — manter
   - `subtipo: z.enum(['Ensilagem', 'Uso na alimentação', 'Descarte', 'Transferência', 'Venda']).nullable().optional()` — `nullable` porque entrada de sistema não precisa de subtipo do usuário, mas saídas exigem
   - `data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` — obrigatório; era ignorado no submit

3. **`avaliacaoBromatologicaSchema`** — reescrever campos:
   - Remover: `fd`, `energia`, `umidade`
   - Manter: `data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` (obrigatório), `momento` (obrigatório, enum), `pb`, `fda`, `avaliador`
   - Adicionar: `ms: z.number().min(0).max(100).nullable().optional()`, `fdn: z.number().min(0).max(100).nullable().optional()`, `amido: z.number().min(0).max(100).nullable().optional()`, `ndt: z.number().min(0).max(100).nullable().optional()`, `ph: z.number().min(0).max(14).nullable().optional()`

4. **`avaliacaoPspsSchema`** — reescrever campos:
   - Remover: `tmp` (input manual), `status` (Ideal/Bom/Ruim)
   - `data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` — obrigatório
   - Manter peneiras corretas: `peneira_19mm`, `peneira_8_19mm`, `peneira_4_8mm`, `peneira_fundo_4mm`
   - Adicionar: `momento: z.enum(['Fechamento', 'Abertura', 'Monitoramento'])`, `kernel_processor: z.boolean()`, `tamanho_teorico_corte_mm: z.number().nullable().optional()`, `avaliador: z.string().nullable().optional()`
   - Adicionar `.refine()` para validar que soma das 4 peneiras é 100% (±0.5%)

5. **Exportar constantes** usadas pelos formulários:
   - `FAIXAS_PSPS: Record<string, { min: number; max: number }>` com faixas ideais por peneira (sem KP e com KP são iguais)
   - `TMP_IDEAL_SEM_KP = { min: 8, max: 12 }` e `TMP_IDEAL_COM_KP = { min: 6, max: 10 }`

---

## FASE 2 — Queries CRUD

### MODIFICAR: `lib/supabase/queries-audit.ts`

**O que alterar:**

1. **Namespace `q.silos`:**
   - `getById(id)`: incluir `custo_aquisicao_rs_ton` no `.select()`
   - `list()`: incluir `custo_aquisicao_rs_ton` no `.select()`
   - `create(payload)`: aceitar o novo campo no payload type
   - `update(id, payload)`: aceitar o novo campo no payload type

2. **Namespace `q.movimentacoesSilo`:**
   - `listBySilo(siloId)` e `listBySilos(siloIds)`: incluir `subtipo` no `.select()`
   - `create(payload)`: incluir `subtipo` e `data` no payload (não mais hardcoded)
   - Adicionar `hasEntrada(siloId): Promise<boolean>` — verifica se já existe movimentação tipo 'Entrada' para o silo (necessário para bloqueio no frontend)

3. **NOVO namespace `q.avaliacoesBromatologicas`:**
   ```typescript
   q.avaliacoesBromatologicas = {
     listBySilo(siloId: string): Promise<AvaliacaoBromatologica[]>
     // SELECT * FROM avaliacoes_bromatologicas WHERE silo_id = siloId ORDER BY data DESC
     
     create(payload: AvaliacaoBromatologicaInput): Promise<AvaliacaoBromatologica>
     // INSERT INTO avaliacoes_bromatologicas ... RETURNING *
     
     remove(id: string): Promise<void>
     // DELETE FROM avaliacoes_bromatologicas WHERE id = id
   }
   ```

4. **NOVO namespace `q.avaliacoesPsps`:**
   ```typescript
   q.avaliacoesPsps = {
     listBySilo(siloId: string): Promise<AvaliacaoPSPS[]>
     // SELECT * FROM avaliacoes_psps WHERE silo_id = siloId ORDER BY data DESC
     
     create(payload: AvaliacaoPspsInput): Promise<AvaliacaoPSPS>
     // INSERT INTO avaliacoes_psps ... RETURNING *
     // Nota: não enviar tmp_mm (é GENERATED pelo BD)
     
     remove(id: string): Promise<void>
     // DELETE FROM avaliacoes_psps WHERE id = id
   }
   ```

---

### MODIFICAR: `lib/supabase/silos.ts`

**O que alterar:**

1. **Adicionar `getCustoSilo(silo: Silo): Promise<{ custoPorTonelada: number; custoTotal: number } | null>`**
   - Se `silo.talhao_id` não-nulo → delegar para `getCustoProducaoSilagem(silo.id)` (existente). Se `getCustoProducaoSilagem()` retornar `null` (ex.: talhão sem custos cadastrados), **usar `custo_aquisicao_rs_ton` como fallback** se estiver preenchido.
   - Se `silo.talhao_id = null` e `silo.custo_aquisicao_rs_ton` não-nulo → retornar `{ custoPorTonelada: silo.custo_aquisicao_rs_ton, custoTotal: silo.volume_ensilado_ton_mv * silo.custo_aquisicao_rs_ton }`
   - Se ambos null (sem talhão e sem custo de aquisição, ou talhão sem custos e sem custo de aquisição) → retornar `null` (exibir "-" na UI)

2. **Adicionar `calcularStatusPeneira(peneira: keyof FAIXAS_PSPS, valor: number): 'ok' | 'fora'`**
   - Comparação simples com `FAIXAS_PSPS` exportado de `lib/validations/silos.ts`

3. **Adicionar `calcularStatusTmp(tmpMm: number, kernelProcessor: boolean): 'ok' | 'fora'`**
   - Usa `TMP_IDEAL_SEM_KP` ou `TMP_IDEAL_COM_KP` conforme `kernelProcessor`

---

## FASE 3 — Dialogs Corrigidos

### MODIFICAR: `app/dashboard/silos/components/dialogs/SiloForm.tsx`

**O que alterar:**

1. **Remover schema Zod local** — importar e usar `siloSchema` e `SiloInput` de `lib/validations/silos.ts`

2. **Adicionar campos ao formulário (Seção A — Dados Gerais):**
   - `data_fechamento`: `<Input type="date" />`, obrigatório
   - `data_abertura_prevista`: `<Input type="date" />`, opcional, com `useEffect` que pré-preenche com `data_fechamento + 60 dias` quando `data_fechamento` muda e `data_abertura_prevista` ainda está vazia
   - `observacoes_gerais`: `<Textarea />`, opcional, max 1000 chars

3. **Auto-preenchimento de cultura:** Ao selecionar talhão no `Select`, usar `useEffect` para buscar `talhao.cultura` da lista `talhoes` e setar `setValue('cultura_ensilada', talhao.cultura)` com campo read-only. Quando talhão = "Nenhum", liberar campo para edição livre.

4. **Indicador de densidade:** Após o campo `altura_m`, adicionar bloco que reage ao `watch(['comprimento_m', 'largura_m', 'altura_m', 'volume_ensilado_ton_mv'])` e exibe densidade calculada com badge colorido: `🟢 ≥650 / 🟡 550–649 / 🔴 <550 kg/m³`

5. **Seção D — Custo (condicional):** Renderizar `<Input type="number" step="0.01" />` para `custo_aquisicao_rs_ton` **somente quando** `watch('talhao_id')` for `null` ou `""`. Label: "Custo de aquisição da silagem (R$/ton)".

6. **`handleSubmit` — criação atômica (silo + entrada):**
   - Criar silo via `q.silos.create(payload)` → obtém `novoSilo`
   - Criar movimentação de entrada via `q.movimentacoesSilo.create({ silo_id: novoSilo.id, tipo: 'Entrada', subtipo: 'Ensilagem', quantidade: data.volume_ensilado_ton_mv, data: data.data_fechamento, responsavel: 'Sistema', observacao: 'Entrada gerada automaticamente no cadastro do silo' })`
   - **Em caso de falha ao criar a movimentação de entrada:** chamar `q.silos.remove(novoSilo.id)` para reverter o silo recém-criado, exibir `toast.error('Erro ao criar silo. Tente novamente.')`, e retornar o controle ao formulário sem fechar o dialog. Isso evita silos órfãos com estoque zerado que quebrariam os cálculos de estoque.
   - Somente após ambas as operações bem-sucedidas: chamar `toast.success()` + `onSuccess()` + fechar dialog.

---

### MODIFICAR: `app/dashboard/silos/components/dialogs/MovimentacaoDialog.tsx`

**O que alterar:**

1. **Remover schema Zod local** — importar e usar `movimentacaoSiloSchema` e `MovimentacaoSiloInput` de `lib/validations/silos.ts`

2. **Adicionar campo `data`:** `<Input type="date" />` com `defaultValue` = hoje. O submit deve usar o valor do campo, não `new Date().toISOString()`.

3. **Campo `subtipo` (condicional):** Mostrar `<Select>` de subtipo com opções `SUBTIPOS_MOVIMENTACAO` apenas quando `tipo === 'Saída'`. Campo obrigatório para saídas.

4. **Bloquear tipo "Entrada" na UI:**
   - `useEffect` que chama `q.movimentacoesSilo.hasEntrada(siloId)` ao abrir o dialog (quando `siloId` está definido)
   - Se retornar `true`: remover "Entrada" das opções do Select de tipo, exibir alerta `<Alert variant="warning">Este silo já possui uma entrada registrada. Registre apenas saídas.</Alert>`
   - Se `siloId` não definido (dropdown de silo), verificar ao selecionar o silo

5. **Payload no submit:** incluir `subtipo` e `data` do formulário.

---

### MODIFICAR: `app/dashboard/silos/components/dialogs/AvaliacaoBromatologicaDialog.tsx`

**O que alterar:**

1. **Remover schema Zod local** — importar `avaliacaoBromatologicaSchema` e `AvaliacaoBromatologicaInput` de `lib/validations/silos.ts`

2. **Corrigir campos do formulário:**
   - Remover: `fd` (era FD, bug), `energia` (Mcal/kg), `umidade`
   - `momento`: mudar de `<Input>` para `<Select>` com opções `MOMENTOS_AVALIACAO` = `['Fechamento', 'Abertura', 'Monitoramento']`
   - Adicionar: `ms` (%), `fdn` (FDN — %), `amido` (%), `ndt` (%), `ph` (0–14)
   - Manter: `data`, `pb`, `fda`, `avaliador`
   - Todos os campos numéricos são opcionais — `<Input type="number" step="0.01" />`

3. **Implementar `handleSubmit`:** Substituir o `TODO` por chamada real a `q.avaliacoesBromatologicas.create({ silo_id: siloId, ...data })`. Em caso de sucesso: `toast.success()` + `onSuccess()` + fechar dialog. Em caso de erro: `toast.error()`.

---

### MODIFICAR: `app/dashboard/silos/components/dialogs/AvaliacaoPspsDialog.tsx`

**O que alterar:**

1. **Remover schema Zod local** — importar `avaliacaoPspsSchema`, `AvaliacaoPspsInput`, `FAIXAS_PSPS`, `TMP_IDEAL_SEM_KP`, `TMP_IDEAL_COM_KP` de `lib/validations/silos.ts`

2. **Corrigir campos do formulário:**
   - Remover: `tmp` (input manual), `status` (Ideal/Bom/Ruim)
   - Corrigir nomes das peneiras: `peneira_19mm` (>19mm), `peneira_8_19mm` (8–19mm), `peneira_4_8mm` (4–8mm), `peneira_fundo_4mm` (<4mm)
   - `momento`: `<Select>` com `MOMENTOS_AVALIACAO`
   - Adicionar: `kernel_processor` (`<Switch>` ou `<Checkbox>` Sim/Não), `tamanho_teorico_corte_mm` (opcional), `avaliador` (texto opcional)

3. **Validação em tempo real da soma (tolerância correta):**
   - `watch` nos 4 campos de peneira
   - Exibir soma calculada; mostrar erro em vermelho se soma < 99.5 ou > 100.5
   - `<Button type="submit">` com `disabled` enquanto soma inválida

4. **Remover exibição de `tmp_mm` no formulário** — o campo é GENERATED pelo BD; não enviar no payload. O TMP aparece apenas na listagem após salvar.

5. **Implementar `handleSubmit`:** Substituir o `TODO` por chamada a `q.avaliacoesPsps.create({ silo_id: siloId, ...data })` sem `tmp_mm` no payload. Em caso de sucesso: `toast.success()` + `onSuccess()` + fechar dialog.

---

## FASE 4 — Tabs Corrigidas

### MODIFICAR: `app/dashboard/silos/components/tabs/VisaoGeralTab.tsx`

**O que alterar:**

1. **Atualizar `VisaoGeralTabProps`:**
   - Adicionar `custo: { custoPorTonelada: number; custoTotal: number } | null` (ou alterar prop `custo` de `number | null` para este objeto)
   - Manter demais props

2. **Card "Datas Importantes" — remover hardcode:**
   - Ler `silo.data_fechamento`, `silo.data_abertura_prevista`, `silo.data_abertura_real` do prop `silo`
   - Exibir com `formatDate()` helper ou `new Date().toLocaleDateString('pt-BR')`
   - Calcular "Dias de fermentação" = `data_abertura_real − data_fechamento` (em dias), exibir apenas se ambas as datas existirem

3. **Card "Observações" — remover hardcode:**
   - Exibir `silo.observacoes_gerais ?? "Nenhuma observação registrada"`

4. **Card "Dados do Silo" — adicionar:**
   - Dimensões: `{silo.comprimento_m} m × {silo.largura_m} m × {silo.altura_m} m` (exibir apenas se todos preenchidos)
   - Densidade com indicador colorido: calcular `calcularDensidade()` importando de `lib/supabase/silos.ts`; badge `🟢 ≥650 / 🟡 550–649 / 🔴 <550`

5. **Card "Rastreabilidade & Custo" — lógica condicional:**
   - Se `silo.talhao_id` não-nulo: exibir nome do talhão (via prop `talhao`), custo de produção, custo total
   - Se `silo.talhao_id = null`: exibir custo de aquisição `silo.custo_aquisicao_rs_ton` (se preenchido), custo total estimado = `volume × custo_aquisicao`
   - Usar `getCustoSilo()` de `lib/supabase/silos.ts` para unificar a lógica no page, e passar resultado como prop `custo`

---

### MODIFICAR: `app/dashboard/silos/components/tabs/EstoqueTab.tsx`

**O que alterar:**

1. **Seção "Distribuição de Saídas":**
   - Alterar agrupamento de `m.observacao` para `m.subtipo` (era totalmente errado)
   - Agrupar por `subtipo`: "Uso na alimentação", "Descarte", "Transferência", "Venda"
   - Ignorar movimentações com `tipo === 'Entrada'` nesta seção

2. **Tabela de movimentações:**
   - Adicionar coluna `Subtipo` na tabela (após coluna `Tipo`)
   - Exibir badge com subtipo se preenchido; exibir "-" se null (caso da entrada de sistema)

3. **Botão "Atualizar":**
   - Adicionar `onClick={onRefresh}` — necessário adicionar `onRefresh: () => void` nas props do componente
   - Propagar callback a partir de `[id]/page.tsx`

4. **Lógica de entradas:** O cálculo de `Entradas Totais` já usa `movimentacoes` (inclui a entrada de sistema criada pelo `SiloForm`). Verificar que `calcularEstoque()` em `helpers.ts` soma corretamente todas as entradas e subtrai todas as saídas.

---

### MODIFICAR: `app/dashboard/silos/components/tabs/QualidadeTab.tsx`

**O que alterar:**

1. **Atualizar `QualidadeTabProps`:**
   - `avaliacoesBromatologicas: AvaliacaoBromatologica[]` — usar o tipo atualizado de `lib/supabase.ts`
   - `avaliacoesPsps: AvaliacaoPSPS[]` — usar o tipo atualizado de `lib/supabase.ts`

2. **Seção bromatológica — corrigir campos exibidos:**
   - Remover: `fd` (exibia como "FD"), `energia` (Mcal/kg)
   - Adicionar: `ms` (MS %), `fdn` (FDN %), `amido` (Amido %), `ndt` (NDT %), `ph` (pH)
   - Manter: `pb`, `fda`, `avaliador`, `momento`, `data`
   - Exibir `-` para campos opcionais não preenchidos

3. **Seção PSPS — corrigir campos exibidos:**
   - Corrigir rótulos das peneiras: ">19mm", "8–19mm", "4–8mm", "<4mm"
   - TMP: exibir `avaliacao.tmp_mm` (calculado pelo BD) com unidade "mm" (não "min")
   - Remover badge único (Ideal/Bom/Ruim) — substituir por **indicador por peneira**:
     - Para cada peneira: chamar `calcularStatusPeneira(peneira, valor)` de `lib/supabase/silos.ts`
     - Exibir `✅` se 'ok', `⚠️` se 'fora', com a faixa ideal ao lado (ex: "45–65%")
   - Para TMP: chamar `calcularStatusTmp(avaliacao.tmp_mm, avaliacao.kernel_processor)` e exibir indicador
   - Exibir `kernel_processor`: badge "Com KP" ou "Sem KP"

---

## FASE 5 — Tela do Operador

### CRIAR: `app/operador/silos/page.tsx`

**Propósito:** Tela mobile-first para operadores de campo registrarem saídas diárias de silagem, sem acesso ao dashboard completo.

**Estrutura do componente `OperadorSilosPage`:**

```
- Estado: silos (lista de silos ativos), siloSelecionado, estoque do silo selecionado, loading, submitting
- Sem Sidebar, sem Header complexo — layout minimalista com fundo verde escuro
```

**Funções internas:**

- `fetchSilos()`: chama `q.silos.list()` e filtra `status !== 'Vazio'` (usando `calcularStatusSilo()` do `helpers.ts`)
- `fetchEstoqueSilo(siloId: string)`: chama `q.movimentacoesSilo.listBySilo(siloId)`, calcula estoque via `calcularEstoque()` do `helpers.ts`
- `handleSiloChange(siloId)`: seta `siloSelecionado`, chama `fetchEstoqueSilo(siloId)`
- `handleSubmit(data: OperadorSaidaInput)`: valida `data.quantidade <= estoque`, chama `q.movimentacoesSilo.create({ tipo: 'Saída', subtipo: data.subtipo, quantidade: data.quantidade, data: data.data, silo_id: data.silo_id, responsavel: nomeDoUsuario })`, exibe toast de sucesso e reseta formulário

**Schema Zod local `operadorSaidaSchema`** (simples, sem reutilizar o schema completo):
```
silo_id: z.string().uuid()
quantidade: z.number().positive()
subtipo: z.enum(['Uso na alimentação', 'Descarte', 'Transferência', 'Venda'])
data: z.string()  // date
```

**Layout (mobile-first, viewport 375px):**
- Header simples: logo + botão "Sair"
- Card único centralizado com:
  - `<Select>` grande para silo (label com estoque atual exibido abaixo ao selecionar)
  - `<Input type="number" inputMode="decimal">` grande para quantidade (em ton)
  - `<Select>` grande para subtipo
  - `<Input type="date">` com default = hoje
  - `<Button size="lg" className="w-full">` Registrar Saída
- Bloco de alerta se `quantidade > estoque` (substituir botão de submit por mensagem)
- Histórico das últimas 5 saídas do silo selecionado (opcional, pode ficar para v3)

**Autorização:** Verificar via `useAuth()` que o usuário tem role `'operador'` **ou** `'admin'`. Qualquer outro role ou usuário não autenticado é redirecionado para `/login`. Motivo: admin deve poder acessar a tela para testar e validar o fluxo do operador sem precisar de uma conta separada — especialmente útil durante implantação no campo.

---

## FASE 6 — Design e Polish

### MODIFICAR: `app/dashboard/silos/[id]/page.tsx`

**O que alterar:**

1. **Carregar avaliações:** Adicionar `q.avaliacoesBromatologicas.listBySilo(id)` e `q.avaliacoesPsps.listBySilo(id)` no `fetchData()` do `useEffect`. Passar resultados para `QualidadeTab`.

2. **Callback `onRefresh` para `EstoqueTab`:** Passar `fetchData` como `onRefresh` prop para o componente `EstoqueTab`.

3. **Custo unificado:** Chamar `getCustoSilo(silo)` de `lib/supabase/silos.ts` e passar resultado como prop `custo` para `VisaoGeralTab` em vez da lógica inline atual.

4. **TabsList compacto:**
   - Aplicar classe `className="h-9 text-sm"` no `<TabsList>` para reduzir tamanho visual
   - Adicionar `overflow-x-auto` para scroll horizontal em mobile

5. **Botões de ação:** Mover botões "Nova Avaliação" e "Registrar Movimentação" para o header dos respectivos `<CardHeader>` com `size="sm"`.

---

### MODIFICAR: `app/dashboard/silos/components/SiloCard.tsx`

**O que alterar (menor prioridade):**

- Leitura de `silo.custo_aquisicao_rs_ton` para silos sem talhão (exibir no card se preenchido, como alternativa ao custo de produção)

---

## FASE 7 — Validação

Após aplicar migration + código no mesmo deploy, executar os seguintes checks antes de marcar o ciclo como concluído.

### (a) Smoke tests do PRD (seção 7)

Executar manualmente todos os cenários da seção 7 do PRD v2.2:

- **Cadastro e Estoque:** criar silo com data de fechamento → verificar entrada automática criada; tentar criar segunda entrada → deve ser bloqueado; registrar saída com subtipo → estoque decrementado corretamente
- **Bromatológica:** abrir dialog → confirmar presença de MS, PB, FDN, FDA, Amido, NDT, pH; confirmar ausência de Energia, FD, Umidade; salvar → registro aparece no banco
- **PSPS:** peneiras com nomes corretos (>19mm, 8–19mm, 4–8mm, <4mm); soma ≠ 100% → botão desabilitado; TMP não é campo editável; após salvar → TMP em mm na listagem; indicadores por peneira (✅/⚠️)
- **Visão Geral:** datas não são mais hardcoded "-"; observações do silo aparecem; custo correto conforme talhão/sem talhão
- **Operador:** `/operador/silos` carrega silos ativos; selecionar silo mostra estoque; submeter → movimentação criada

### (b) Verificar RLS ativo

Rodar no SQL Editor do Supabase:

```sql
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename LIKE 'avaliacoes%'
ORDER BY tablename, cmd;
```

Confirmar que:
- Existem 4 policies (SELECT, INSERT, UPDATE, DELETE) para `avaliacoes_bromatologicas`
- Existem 4 policies (SELECT, INSERT, UPDATE, DELETE) para `avaliacoes_psps`
- Nenhuma policy usa `auth.jwt() ->> 'fazenda_id'` — todas devem usar `get_my_fazenda_id()`

### (c) Testar tela do operador em viewport 375px

No Chrome DevTools (ou dispositivo físico):
- Definir viewport para 375×667 (iPhone SE)
- Confirmar que `<Select>`, `<Input>` e `<Button>` têm altura mínima de 44px (touch target)
- Confirmar que o formulário não tem scroll horizontal
- Confirmar que a tab list da tela de detalhe do silo é scrollável horizontalmente sem quebrar layout

---

## ARQUIVO A REMOVER

### REMOVER: `app/dashboard/silos/components/SiloForm.tsx`

**Propósito:** Arquivo duplicado (19KB) que co-existe com a versão em `dialogs/SiloForm.tsx` (15KB). A versão em `dialogs/` é a usada pelo código. O arquivo raiz em `components/` é legado e pode confundir. Verificar se há algum `import` apontando para ele antes de remover.

---

## Ordem de Implementação

```
FASE 0  — Migration SQL
  └─ supabase/migrations/20260419_silos_v2_ajustes.sql  [CRIAR]

FASE 1  — Tipos e Validações
  ├─ lib/supabase.ts                                     [MODIFICAR — tipos Silo, MovimentacaoSilo, AvaliacaoBromatologica, AvaliacaoPSPS]
  └─ lib/validations/silos.ts                            [MODIFICAR — schemas corretos, constantes FAIXAS_PSPS]

FASE 2  — Queries CRUD
  ├─ lib/supabase/queries-audit.ts                       [MODIFICAR — namespaces avaliações, hasEntrada, campos faltantes]
  └─ lib/supabase/silos.ts                               [MODIFICAR — getCustoSilo, calcularStatusPeneira, calcularStatusTmp]

FASE 3  — Dialogs
  ├─ .../dialogs/SiloForm.tsx                            [MODIFICAR — datas, custo, auto-preenchimento, criar entrada]
  ├─ .../dialogs/MovimentacaoDialog.tsx                  [MODIFICAR — subtipo, data, bloqueio de entrada]
  ├─ .../dialogs/AvaliacaoBromatologicaDialog.tsx        [MODIFICAR — campos corretos, implementar save]
  └─ .../dialogs/AvaliacaoPspsDialog.tsx                 [MODIFICAR — campos corretos, implementar save]

FASE 4  — Tabs
  ├─ .../tabs/VisaoGeralTab.tsx                          [MODIFICAR — datas, observações, dimensões, custo condicional]
  ├─ .../tabs/EstoqueTab.tsx                             [MODIFICAR — subtipo, refresh, distribuição correta]
  └─ .../tabs/QualidadeTab.tsx                           [MODIFICAR — campos corretos, indicadores por peneira]

FASE 5  — Tela Operador
  └─ app/operador/silos/page.tsx                         [CRIAR]

FASE 6  — Polish
  ├─ app/dashboard/silos/[id]/page.tsx                   [MODIFICAR — load avaliações, tabs compactas, custo unificado]
  ├─ .../components/SiloCard.tsx                         [MODIFICAR — custo_aquisicao para silos sem talhão]
  └─ .../components/SiloForm.tsx                         [REMOVER — duplicata legada]

FASE 7  — Validação
  ├─ (a) Smoke tests manuais (PRD seção 7)
  ├─ (b) SELECT pg_policies WHERE tablename LIKE 'avaliacoes%'
  └─ (c) Teste de viewport 375px na tela do operador
```

---

## Sumário de Arquivos

| Arquivo | Ação | Fase |
|---------|------|------|
| `supabase/migrations/20260419_silos_v2_ajustes.sql` | **CRIAR** | 0 |
| `lib/supabase.ts` | **MODIFICAR** — tipos Silo, MovimentacaoSilo, AvaliacaoBromatologica, AvaliacaoPSPS | 1 |
| `lib/validations/silos.ts` | **MODIFICAR** — schemas, constantes FAIXAS_PSPS, TMP_IDEAL | 1 |
| `lib/supabase/queries-audit.ts` | **MODIFICAR** — 2 novos namespaces, `hasEntrada`, campos subtipo/data | 2 |
| `lib/supabase/silos.ts` | **MODIFICAR** — `getCustoSilo`, `calcularStatusPeneira`, `calcularStatusTmp` | 2 |
| `app/dashboard/silos/components/dialogs/SiloForm.tsx` | **MODIFICAR** — datas, custo, auto-preenchimento, criar entrada no submit | 3 |
| `app/dashboard/silos/components/dialogs/MovimentacaoDialog.tsx` | **MODIFICAR** — subtipo, data selecionável, bloqueio de entrada | 3 |
| `app/dashboard/silos/components/dialogs/AvaliacaoBromatologicaDialog.tsx` | **MODIFICAR** — campos corretos (fdn/ms/amido/ndt/ph), implementar save | 3 |
| `app/dashboard/silos/components/dialogs/AvaliacaoPspsDialog.tsx` | **MODIFICAR** — peneiras corretas, momento, kernel_processor, implementar save | 3 |
| `app/dashboard/silos/components/tabs/VisaoGeralTab.tsx` | **MODIFICAR** — ler datas/observações do silo, densidade colorida, custo condicional | 4 |
| `app/dashboard/silos/components/tabs/EstoqueTab.tsx` | **MODIFICAR** — agrupar por subtipo, coluna subtipo na tabela, botão refresh | 4 |
| `app/dashboard/silos/components/tabs/QualidadeTab.tsx` | **MODIFICAR** — campos corretos, TMP em mm, indicadores por peneira | 4 |
| `app/operador/silos/page.tsx` | **CRIAR** | 5 |
| `app/dashboard/silos/[id]/page.tsx` | **MODIFICAR** — load avaliações, refresh prop, getCustoSilo, tabs compactas | 6 |
| `app/dashboard/silos/components/SiloCard.tsx` | **MODIFICAR** — exibir custo_aquisicao para silos sem talhão | 6 |
| `app/dashboard/silos/components/SiloForm.tsx` | **REMOVER** — duplicata legada, verificar imports antes | 6 |

**Total: 2 arquivos a criar, 13 a modificar, 1 a remover. + 1 fase de validação manual (FASE 7).**

---

**Fim da especificação técnica**  
Gerada em: 19/04/2026 — Revisada em: 20/04/2026
