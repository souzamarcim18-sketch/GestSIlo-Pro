# SPEC — Módulo de Mão de Obra

**Baseado em**: PRD-mao-de-obra.md  
**Data**: 2026-05-22  
**Status**: Pronto para execução

---

## 1. Schema do Banco de Dados

### 1.1 Ordem das migrations (dependências de FK)

```
1. colaboradores          (depende de: fazendas)
2. atividades_mao_obra    (depende de: fazendas, talhoes, silos, maquinas, financeiro)
3. atividades_mao_obra_colaboradores  (depende de: fazendas, atividades_mao_obra, colaboradores)
4. RLS policies nas 3 tabelas
5. Triggers nas 3 tabelas
```

> `financeiro` já existe. O campo `despesa_id` em `atividades_mao_obra` usa `ON DELETE SET NULL` para não perder o registro de atividade se a despesa for removida manualmente do módulo Financeiro.

---

### 1.2 Tabela `colaboradores`

```sql
CREATE TABLE colaboradores (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id  uuid        NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome        text        NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 100),
  funcao      text        NOT NULL CHECK (funcao IN (
                            'Vaqueiro', 'Tratorista', 'Auxiliar', 'Gerente', 'Outros'
                          )),
  vinculo     text        NOT NULL CHECK (vinculo IN (
                            'CLT', 'Diarista', 'Empreiteiro', 'Familiar'
                          )),
  tipo_valor  text        NOT NULL CHECK (tipo_valor IN ('diaria', 'hora')),
  valor_ref   numeric(10,2) NOT NULL CHECK (valor_ref >= 0),
  ativo       boolean     NOT NULL DEFAULT true,
  observacoes text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_colaboradores_fazenda_id
  ON colaboradores(fazenda_id);

CREATE INDEX idx_colaboradores_fazenda_ativo
  ON colaboradores(fazenda_id, ativo);
```

**Regras de negócio**:
- `fazenda_id` **nunca** entra no payload de INSERT — preenchido pelo trigger `set_fazenda_id`.
- `tipo_valor = 'diaria'`: valor de referência representa 1 dia (8h convencionais).
- `tipo_valor = 'hora'`: valor de referência representa 1 hora.
- Soft-delete (`ativo = false`) quando colaborador possui atividades registradas; hard-delete quando não possui.
- Editar `valor_ref` **não** recalcula custo de atividades passadas.

---

### 1.3 Tabela `atividades_mao_obra`

```sql
CREATE TABLE atividades_mao_obra (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id       uuid          NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  data             date          NOT NULL,
  tipo_atividade   text          NOT NULL CHECK (tipo_atividade IN (
                                   'Trato/alimentação do rebanho',
                                   'Ordenha',
                                   'Aplicação de defensivo',
                                   'Adubação',
                                   'Silagem (colheita/compactação/cobertura)',
                                   'Manutenção de cerca',
                                   'Manutenção de equipamento',
                                   'Limpeza de instalações',
                                   'Manejo sanitário',
                                   'Irrigação',
                                   'Roçagem',
                                   'Transporte interno',
                                   'Outros'
                                 )),
  duracao_tipo     text          NOT NULL CHECK (duracao_tipo IN ('horas', 'dias')),
  duracao_valor    numeric(8,2)  NOT NULL CHECK (duracao_valor > 0),
  custo_calculado  numeric(10,2) NOT NULL DEFAULT 0,
  custo_manual     numeric(10,2) CHECK (custo_manual IS NULL OR custo_manual >= 0),

  -- GENERATED ALWAYS AS: nunca enviar custo_final em payload de INSERT ou UPDATE.
  -- O banco recalcula automaticamente como: custo_manual ?? custo_calculado.
  -- Usar apenas para leitura (SELECT) e para o INSERT em `financeiro`.
  custo_final      numeric(10,2) GENERATED ALWAYS AS (
                     COALESCE(custo_manual, custo_calculado)
                   ) STORED,

  talhao_id        uuid REFERENCES talhoes(id) ON DELETE SET NULL,
  silo_id          uuid REFERENCES silos(id) ON DELETE SET NULL,
  maquina_id       uuid REFERENCES maquinas(id) ON DELETE SET NULL,

  -- piquete_id: reservado para integração futura com módulo Pastagens.
  -- Adicionar via migration quando a integração for implementada:
  --   ALTER TABLE atividades_mao_obra
  --     ADD COLUMN piquete_id uuid REFERENCES piquetes(id) ON DELETE SET NULL;
  -- Não criar agora — evita campo morto no schema.

  observacoes      text,
  despesa_id       uuid REFERENCES financeiro(id) ON DELETE SET NULL,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_atividades_mao_obra_fazenda_id
  ON atividades_mao_obra(fazenda_id);

CREATE INDEX idx_atividades_mao_obra_fazenda_data
  ON atividades_mao_obra(fazenda_id, data DESC);
```

**Invariantes críticas**:
- `custo_final` é `GENERATED ALWAYS AS` — **jamais** incluir no payload de INSERT ou UPDATE. O TypeScript deve usar `Omit<..., 'custo_final'>` em todos os tipos de payload.
- No máximo um vínculo por atividade: `talhao_id`, `silo_id`, `maquina_id` — validado pelo Zod no servidor.
- `despesa_id` aponta para `financeiro.id`; preenchido pela Server Action após INSERT no financeiro.

---

### 1.4 Tabela `atividades_mao_obra_colaboradores`

```sql
CREATE TABLE atividades_mao_obra_colaboradores (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id         uuid          NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  atividade_id       uuid          NOT NULL REFERENCES atividades_mao_obra(id) ON DELETE CASCADE,
  colaborador_id     uuid          NOT NULL REFERENCES colaboradores(id) ON DELETE RESTRICT,
  custo_colaborador  numeric(10,2) NOT NULL DEFAULT 0,
  UNIQUE (atividade_id, colaborador_id)
);

CREATE INDEX idx_atv_mao_obra_colab_atividade_id
  ON atividades_mao_obra_colaboradores(atividade_id);

CREATE INDEX idx_atv_mao_obra_colab_colaborador_id
  ON atividades_mao_obra_colaboradores(colaborador_id);
```

**Regras**:
- `ON DELETE RESTRICT` em `colaborador_id`: impede exclusão de colaborador com registros nesta tabela.
- `fazenda_id` preenchido pelo trigger `set_fazenda_id` — nunca enviar no payload.
- `custo_colaborador` calculado pela Server Action antes do INSERT (lógica descrita na seção 6.3).

---

### 1.5 Triggers

#### Trigger `set_fazenda_id` (padrão do projeto — aplicar nas 3 tabelas)

```sql
-- Função já existe no banco (padrão do projeto via get_minha_fazenda_id()).
-- Criar trigger nas 3 novas tabelas:

CREATE TRIGGER trg_colaboradores_fazenda_id
  BEFORE INSERT ON colaboradores
  FOR EACH ROW EXECUTE FUNCTION set_fazenda_id();

CREATE TRIGGER trg_atividades_mao_obra_fazenda_id
  BEFORE INSERT ON atividades_mao_obra
  FOR EACH ROW EXECUTE FUNCTION set_fazenda_id();

CREATE TRIGGER trg_ativ_mao_obra_colab_fazenda_id
  BEFORE INSERT ON atividades_mao_obra_colaboradores
  FOR EACH ROW EXECUTE FUNCTION set_fazenda_id();
```

> Confirmar o nome exato da função (`set_fazenda_id` ou similar) consultando `database-snapshot.md` antes de executar a migration.

#### Trigger `updated_at` (padrão do projeto)

```sql
CREATE TRIGGER trg_colaboradores_updated_at
  BEFORE UPDATE ON colaboradores
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER trg_atividades_mao_obra_updated_at
  BEFORE UPDATE ON atividades_mao_obra
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

> `atividades_mao_obra_colaboradores` não tem `updated_at` — sem trigger.

#### Sincronização com financeiro

Não usar trigger de banco para sincronizar com `financeiro`. A sincronização é feita **exclusivamente na Server Action** (padrão já adotado em Insumos, Produtos e Silos). Triggers de banco que escrevem em outra tabela dificultam rollback atômico no lado da aplicação.

---

### 1.6 RLS Policies

```sql
-- ─── colaboradores ────────────────────────────────────────────────────────────

ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colaboradores: leitura admin e visualizador"
  ON colaboradores FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin_ou_visualizador());

CREATE POLICY "colaboradores: inserção somente admin"
  ON colaboradores FOR INSERT
  WITH CHECK (sou_admin());

CREATE POLICY "colaboradores: atualização somente admin"
  ON colaboradores FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "colaboradores: exclusão somente admin"
  ON colaboradores FOR DELETE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());


-- ─── atividades_mao_obra ──────────────────────────────────────────────────────

ALTER TABLE atividades_mao_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atividades_mao_obra: leitura admin e visualizador"
  ON atividades_mao_obra FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin_ou_visualizador());

CREATE POLICY "atividades_mao_obra: inserção somente admin"
  ON atividades_mao_obra FOR INSERT
  WITH CHECK (sou_admin());

CREATE POLICY "atividades_mao_obra: atualização somente admin"
  ON atividades_mao_obra FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "atividades_mao_obra: exclusão somente admin"
  ON atividades_mao_obra FOR DELETE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());


-- ─── atividades_mao_obra_colaboradores ───────────────────────────────────────

ALTER TABLE atividades_mao_obra_colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atv_mao_obra_colab: leitura admin e visualizador"
  ON atividades_mao_obra_colaboradores FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin_ou_visualizador());

CREATE POLICY "atv_mao_obra_colab: inserção somente admin"
  ON atividades_mao_obra_colaboradores FOR INSERT
  WITH CHECK (sou_admin());

CREATE POLICY "atv_mao_obra_colab: atualização somente admin"
  ON atividades_mao_obra_colaboradores FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "atv_mao_obra_colab: exclusão somente admin"
  ON atividades_mao_obra_colaboradores FOR DELETE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());
```

---

## 2. Tipos TypeScript — `lib/types/mao-de-obra.ts`

```typescript
// ─── Enums ────────────────────────────────────────────────────────────────────

export type FuncaoColaborador =
  | 'Vaqueiro'
  | 'Tratorista'
  | 'Auxiliar'
  | 'Gerente'
  | 'Outros';

export type VinculoColaborador =
  | 'CLT'
  | 'Diarista'
  | 'Empreiteiro'
  | 'Familiar';

export type TipoValorColaborador = 'diaria' | 'hora';

export type TipoAtividade =
  | 'Trato/alimentação do rebanho'
  | 'Ordenha'
  | 'Aplicação de defensivo'
  | 'Adubação'
  | 'Silagem (colheita/compactação/cobertura)'
  | 'Manutenção de cerca'
  | 'Manutenção de equipamento'
  | 'Limpeza de instalações'
  | 'Manejo sanitário'
  | 'Irrigação'
  | 'Roçagem'
  | 'Transporte interno'
  | 'Outros';

export type DuracaoTipo = 'horas' | 'dias';

// ─── Constantes ───────────────────────────────────────────────────────────────

export const HORAS_POR_DIA = 8;

export const FUNCOES_COLABORADOR: FuncaoColaborador[] = [
  'Vaqueiro', 'Tratorista', 'Auxiliar', 'Gerente', 'Outros',
];

export const VINCULOS_COLABORADOR: VinculoColaborador[] = [
  'CLT', 'Diarista', 'Empreiteiro', 'Familiar',
];

export const TIPOS_ATIVIDADE: TipoAtividade[] = [
  'Trato/alimentação do rebanho',
  'Ordenha',
  'Aplicação de defensivo',
  'Adubação',
  'Silagem (colheita/compactação/cobertura)',
  'Manutenção de cerca',
  'Manutenção de equipamento',
  'Limpeza de instalações',
  'Manejo sanitário',
  'Irrigação',
  'Roçagem',
  'Transporte interno',
  'Outros',
];

// ─── Entidades base ───────────────────────────────────────────────────────────

export interface Colaborador {
  id: string;
  fazenda_id: string;
  nome: string;
  funcao: FuncaoColaborador;
  vinculo: VinculoColaborador;
  tipo_valor: TipoValorColaborador;
  valor_ref: number;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

// custo_final omitido: GENERATED ALWAYS AS — nunca em payload de INSERT/UPDATE.
export interface AtividadeMaoObra {
  id: string;
  fazenda_id: string;
  data: string;          // ISO date 'YYYY-MM-DD'
  tipo_atividade: TipoAtividade;
  duracao_tipo: DuracaoTipo;
  duracao_valor: number;
  custo_calculado: number;
  custo_manual: number | null;
  custo_final: number;   // somente leitura — coluna gerada pelo banco
  talhao_id: string | null;
  silo_id: string | null;
  maquina_id: string | null;
  observacoes: string | null;
  despesa_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AtividadeMaoObraColaborador {
  id: string;
  fazenda_id: string;
  atividade_id: string;
  colaborador_id: string;
  custo_colaborador: number;
}

// ─── Tipos compostos ──────────────────────────────────────────────────────────

export interface ColaboradorResumido {
  id: string;
  nome: string;
  funcao: FuncaoColaborador;
  custo_colaborador: number;
}

export interface AtividadeComColaboradores extends AtividadeMaoObra {
  colaboradores: ColaboradorResumido[];
  // Joins opcionais para exibição
  talhao_nome: string | null;
  silo_nome: string | null;
  maquina_nome: string | null;
}

export interface ColaboradorComHistorico extends Colaborador {
  // Contagem de atividades — calculada via query agregada
  total_atividades: number;
  // Data da atividade mais recente
  ultima_atividade: string | null;
  // Custo total gerado pelo colaborador (mês corrente)
  custo_mes_atual: number;
}

// ─── Tipo de payload para formulário multi-colaborador ───────────────────────

export interface ColaboradorSelecionado {
  colaborador_id: string;
  nome: string;
  tipo_valor: TipoValorColaborador;
  valor_ref: number;
  custo_calculador: number;  // preview client-side antes de salvar
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export interface KpisMaoObra {
  custo_total_mes: number;
  qtd_atividades_mes: number;
  colaborador_destaque: {
    nome: string;
    qtd_atividades: number;
  } | null;
  top3_tipos: Array<{
    tipo: TipoAtividade;
    custo_total: number;
  }>;
}

// ─── Payloads de INSERT (sem custo_final, sem fazenda_id, sem id) ─────────────

export type ColaboradorInsert = Omit<
  Colaborador,
  'id' | 'fazenda_id' | 'created_at' | 'updated_at'
>;

export type ColaboradorUpdate = Partial<
  Omit<Colaborador, 'id' | 'fazenda_id' | 'created_at' | 'updated_at'>
>;

// custo_final explicitamente omitido — é GENERATED ALWAYS AS no banco.
export type AtividadeInsert = Omit<
  AtividadeMaoObra,
  'id' | 'fazenda_id' | 'custo_final' | 'despesa_id' | 'created_at' | 'updated_at'
>;

export type AtividadeUpdate = Partial<
  Omit<
    AtividadeMaoObra,
    'id' | 'fazenda_id' | 'custo_final' | 'created_at' | 'updated_at'
  >
>;
```

---

## 3. Schemas Zod — `lib/validations/mao-de-obra.ts`

### `colaboradorFormSchema`

```typescript
import { z } from 'zod';

export const colaboradorFormSchema = z.object({
  nome:        z.string().min(2, 'Nome deve ter pelo menos 2 caracteres')
                         .max(100, 'Nome deve ter no máximo 100 caracteres'),
  funcao:      z.enum(['Vaqueiro', 'Tratorista', 'Auxiliar', 'Gerente', 'Outros']),
  vinculo:     z.enum(['CLT', 'Diarista', 'Empreiteiro', 'Familiar']),
  tipo_valor:  z.enum(['diaria', 'hora']),
  valor_ref:   z.number({ required_error: 'Informe o valor de referência' })
                 .nonnegative('Valor não pode ser negativo'),
  observacoes: z.string().max(500).optional().nullable(),
});

export type ColaboradorFormData = z.infer<typeof colaboradorFormSchema>;
```

### `atividadeFormSchema`

```typescript
export const atividadeFormSchema = z.object({
  data:           z.string().min(1, 'Data é obrigatória'),
  tipo_atividade: z.enum([
    'Trato/alimentação do rebanho',
    'Ordenha',
    'Aplicação de defensivo',
    'Adubação',
    'Silagem (colheita/compactação/cobertura)',
    'Manutenção de cerca',
    'Manutenção de equipamento',
    'Limpeza de instalações',
    'Manejo sanitário',
    'Irrigação',
    'Roçagem',
    'Transporte interno',
    'Outros',
  ]),
  colaboradores:  z.array(z.string().uuid())
                   .min(1, 'Selecione ao menos 1 colaborador'),
  duracao_tipo:   z.enum(['horas', 'dias']),
  duracao_valor:  z.number({ required_error: 'Informe a duração' })
                   .positive('Duração deve ser maior que zero'),
  custo_manual:   z.number().nonnegative().optional().nullable(),
  talhao_id:      z.string().uuid().optional().nullable(),
  silo_id:        z.string().uuid().optional().nullable(),
  maquina_id:     z.string().uuid().optional().nullable(),
  observacoes:    z.string().max(500).optional().nullable(),
}).refine(
  (d) => [d.talhao_id, d.silo_id, d.maquina_id].filter(Boolean).length <= 1,
  {
    message: 'Associe a no máximo um: talhão, silo ou máquina',
    path: ['talhao_id'],
  }
);

export type AtividadeFormData = z.infer<typeof atividadeFormSchema>;
```

---

## 4. Queries — `lib/supabase/mao-de-obra.ts`

### Colunas explícitas (sem `select('*')`)

```
COLABORADOR_COLS =
  'id, fazenda_id, nome, funcao, vinculo, tipo_valor, valor_ref, ativo, observacoes, created_at, updated_at'

ATIVIDADE_COLS =
  'id, fazenda_id, data, tipo_atividade, duracao_tipo, duracao_valor,
   custo_calculado, custo_manual, custo_final,
   talhao_id, silo_id, maquina_id, observacoes, despesa_id, created_at, updated_at'

ATIVIDADE_COLAB_COLS =
  'id, atividade_id, colaborador_id, custo_colaborador'
```

### Interface das queries

```typescript
// listColaboradores(supabase, filtros?)
// Parâmetros opcionais: { ativo?: boolean, funcao?: FuncaoColaborador, vinculo?: VinculoColaborador }
// Ordenação: nome ASC
// Retorna: Colaborador[]

// getColaboradorComHistorico(supabase, colaboradorId)
// JOIN com atividades_mao_obra_colaboradores para contar atividades e somar custo
// Retorna: ColaboradorComHistorico | null

// listAtividades(supabase, filtros?)
// Parâmetros opcionais:
//   colaborador_id?: string     — filtra pela join table
//   tipo_atividade?: TipoAtividade
//   data_inicio?: string        — ISO date
//   data_fim?: string           — ISO date
//   vinculo?: 'talhao' | 'silo' | 'maquina' | 'nenhum'
// JOIN:
//   atividades_mao_obra_colaboradores → colaboradores(id, nome, funcao)
//   talhoes(nome), silos(nome), maquinas(nome) — LEFT JOIN
// Ordenação: data DESC, created_at DESC
// Retorna: AtividadeComColaboradores[]
//
// ATENÇÃO: joins many-to-one (talhao, silo, maquina) retornam objeto único,
// mas o SDK Supabase infere array. Usar `as unknown as TipoLocal` no resultado.

// getKpisMensais(supabase)
// Filtro: data >= primeiro dia do mês corrente (ISO: YYYY-MM-01)
// Retorna: KpisMaoObra
// Implementar como múltiplas queries simples — não usar RPC:
//   1. SUM(custo_final) + COUNT(*) em atividades_mao_obra
//   2. Agrupar por colaborador via join table (para colaborador_destaque)
//   3. Agrupar por tipo_atividade (para top3_tipos)

// hasAtividades(supabase, colaboradorId): boolean
// Usado para decidir entre soft-delete e hard-delete
// Query: SELECT id FROM atividades_mao_obra_colaboradores
//        WHERE colaborador_id = $1 LIMIT 1
```

---

## 5. Lógica de Cálculo de Custo — `lib/utils.ts` (adicionar função)

### `calcularCustoColaborador`

```typescript
// Centraliza a conversão hora↔dia para uso em AtividadeForm (preview)
// e em criarAtividadeAction / atualizarAtividadeAction (cálculo autoritativo).

// Assinatura:
function calcularCustoColaborador(
  duracaoTipo: 'horas' | 'dias',
  duracaoValor: number,
  tipoValor: 'hora' | 'diaria',
  valorRef: number,
): number

// Tabela de conversão:
// duracao_tipo | tipo_valor | fórmula
// 'horas'      | 'hora'     | duracaoValor * valorRef
// 'dias'       | 'diaria'   | duracaoValor * valorRef
// 'horas'      | 'diaria'   | (duracaoValor / 8) * valorRef
// 'dias'       | 'hora'     | (duracaoValor * 8) * valorRef
//
// HORAS_POR_DIA = 8 (constante em lib/types/mao-de-obra.ts)
```

> Colocar em `lib/utils.ts` (ou `lib/calculos/mao-de-obra.ts`) para ser importável tanto por Client Components (preview) quanto por Server Actions (cálculo final).

---

## 6. Server Actions — `app/dashboard/mao-de-obra/actions.ts`

Todas as actions são `'use server'` e seguem o padrão `ActionResult = { success: true } | { success: false; error: string }`.

### 6.1 `criarColaboradorAction(formData: unknown)`

**Pré-condições**: usuário autenticado e perfil `Administrador`.

```
1. Zod parse com colaboradorFormSchema
2. supabase.from('colaboradores').insert({ ...parsed })
   — NÃO incluir fazenda_id (trigger preenche)
3. revalidatePath('/dashboard/mao-de-obra')
4. return { success: true }
```

### 6.2 `atualizarColaboradorAction(id: string, formData: unknown)`

```
1. Zod parse com colaboradorFormSchema
2. supabase.from('colaboradores').update({ ...parsed }).eq('id', id)
3. revalidatePath('/dashboard/mao-de-obra')
```

### 6.3 `deletarColaboradorAction(id: string)`

**Pré-condição**: verificar `hasAtividades` antes de executar.

```
1. const temHistorico = await hasAtividades(supabase, id)
2. Se temHistorico:
     supabase.from('colaboradores').update({ ativo: false }).eq('id', id)
   Senão:
     supabase.from('colaboradores').delete().eq('id', id)
3. revalidatePath('/dashboard/mao-de-obra')
```

**Bloqueio de atividades futuras**: antes do soft-delete, verificar se existe alguma atividade com `data > today`. Se existir, retornar `{ success: false, error: 'Colaborador tem atividades agendadas. Cancele-as antes de desativar.' }`.

### 6.4 `criarAtividadeAction(formData: unknown)`

**Fluxo atômico — rollback se qualquer passo falhar**:

```
1. Zod parse com atividadeFormSchema

2. Para cada colaborador_id em formData.colaboradores:
   a. Buscar colaborador: { tipo_valor, valor_ref }
   b. custo_colab = calcularCustoColaborador(
        formData.duracao_tipo,
        formData.duracao_valor,
        colaborador.tipo_valor,
        colaborador.valor_ref
      )

3. custo_calculado = soma de todos os custo_colab

4. INSERT em atividades_mao_obra:
   {
     data, tipo_atividade, duracao_tipo, duracao_valor,
     custo_calculado,
     custo_manual: formData.custo_manual ?? null,
     -- custo_final: NÃO INCLUIR (GENERATED ALWAYS AS)
     talhao_id: formData.talhao_id ?? null,
     silo_id: formData.silo_id ?? null,
     maquina_id: formData.maquina_id ?? null,
     observacoes: formData.observacoes ?? null,
   }
   → salvar atividade.id

5. INSERT em atividades_mao_obra_colaboradores:
   Para cada colaborador: { atividade_id, colaborador_id, custo_colaborador }
   — fazenda_id preenchido pelo trigger

6. custo_final_efetivo = formData.custo_manual ?? custo_calculado

7. INSERT em financeiro:
   {
     tipo: 'Despesa',
     categoria: 'Mão de Obra',
     descricao: `${tipo_atividade} — ${nomes_colaboradores.join(', ')}`,
     valor: custo_final_efetivo,
     data: formData.data,
     forma_pagamento: null,
     referencia_id: atividade.id,
     referencia_tipo: 'Mão de Obra',
     natureza: 'variavel',
   }
   → salvar despesa.id

   SE o INSERT em financeiro FALHAR:
     DELETE FROM atividades_mao_obra_colaboradores WHERE atividade_id = atividade.id
     DELETE FROM atividades_mao_obra WHERE id = atividade.id
     return { success: false, error: '...' }

8. UPDATE atividades_mao_obra SET despesa_id = despesa.id WHERE id = atividade.id

9. revalidatePath('/dashboard/mao-de-obra')
   revalidatePath('/dashboard/financeiro')
   revalidatePath('/dashboard')
```

### 6.5 `atualizarAtividadeAction(id: string, formData: unknown)`

```
1. Zod parse com atividadeFormSchema

2. Recalcular custo_calculado (mesmo algoritmo do passo 2–3 de criarAtividadeAction)

3. custo_final_novo = formData.custo_manual ?? custo_calculado

4. Buscar atividade atual para obter despesa_id

5. UPDATE atividades_mao_obra:
   { data, tipo_atividade, duracao_tipo, duracao_valor,
     custo_calculado, custo_manual: formData.custo_manual ?? null
     -- custo_final: NÃO INCLUIR }

6. DELETE FROM atividades_mao_obra_colaboradores WHERE atividade_id = id
   INSERT novo conjunto de colaboradores com custos recalculados

7. Se atividade.despesa_id:
     UPDATE financeiro SET valor = custo_final_novo,
       descricao = `${tipo_atividade} — ${nomes_colaboradores.join(', ')}`,
       data = formData.data
     WHERE id = atividade.despesa_id

8. revalidatePath('/dashboard/mao-de-obra')
   revalidatePath('/dashboard/financeiro')
   revalidatePath('/dashboard')
```

### 6.6 `deletarAtividadeAction(id: string)`

```
1. Buscar atividade para obter despesa_id

2. Se despesa_id:
     DELETE FROM financeiro WHERE id = despesa_id

3. DELETE FROM atividades_mao_obra_colaboradores WHERE atividade_id = id
   (CASCADE resolve no banco, mas limpar explicitamente segue o padrão do projeto)

4. DELETE FROM atividades_mao_obra WHERE id = id

5. revalidatePath('/dashboard/mao-de-obra')
   revalidatePath('/dashboard/financeiro')
   revalidatePath('/dashboard')
```

---

## 7. Estrutura de Arquivos

```
app/dashboard/mao-de-obra/
├── layout.tsx                      # Guard client-side: Operador → /dashboard
├── page.tsx                        # RSC: auth + Promise.all (colaboradores + atividades + kpis)
├── MaoDeObraClient.tsx             # Client hub: abas (Atividades | Colaboradores), KPIs, estado de modais
├── actions.ts                      # 6 Server Actions
└── components/
    ├── KpisSection.tsx             # Cards de KPIs (custo mensal, atividades, destaque, top 3)
    ├── ColaboradoresList.tsx       # Tabela: nome, função, vínculo, valor ref, status, ações
    ├── ColaboradorForm.tsx         # Modal criar/editar (Dialog + RHF + Zod)
    ├── DeleteColaboradorDialog.tsx # Confirm dialog exclusão/desativação
    ├── AtividadesList.tsx          # Tabela com filtros + rodapé de custo total
    ├── AtividadeForm.tsx           # Modal criar/editar (multi-select colaboradores, preview custo)
    └── DeleteAtividadeDialog.tsx   # Confirm dialog exclusão com aviso de remoção da despesa

lib/
├── types/mao-de-obra.ts            # Todos os tipos e constantes
├── validations/mao-de-obra.ts      # colaboradorFormSchema, atividadeFormSchema
└── supabase/mao-de-obra.ts         # listColaboradores, getColaboradorComHistorico,
                                    # listAtividades, getKpisMensais, hasAtividades
```

---

## 8. Componentes — Responsabilidades

### `layout.tsx`

Padrão idêntico ao `app/dashboard/pastagens/layout.tsx`:

```
- 'use client'
- useAuth() + useRouter()
- useEffect: se !loading && profile?.perfil === 'Operador' → toast.error + router.replace('/dashboard')
- if (loading) return null
- if (profile?.perfil === 'Operador') return null
- return <>{children}</>
```

### `page.tsx` (RSC)

```
- createSupabaseServerClient()
- supabase.auth.getUser() → redirect('/login') se erro
- Promise.all([
    supabase.from('profiles').select('perfil').eq('id', user.id).single(),
    listColaboradores(supabase),
    listAtividades(supabase),
    getKpisMensais(supabase),
  ])
- const isAdmin = profileRes.data?.perfil === 'Administrador'
- return <MaoDeObraClient
    initialColaboradores={...}
    initialAtividades={...}
    initialKpis={...}
    isAdmin={isAdmin}
  />
```

**Não** chamar `queries-audit.ts` aqui — usa cliente de browser.

### `MaoDeObraClient.tsx`

```
- 'use client'
- Props: initialColaboradores, initialAtividades, initialKpis, isAdmin
- Estado: aba ativa ('atividades' | 'colaboradores'), modais abertos, item em edição
- Não busca dados no mount — usa props iniciais do RSC
- Refetch via router.refresh() após mutations
- Composição de KpisSection + AtividadesList + ColaboradoresList
```

### `KpisSection.tsx`

```
- Props: kpis: KpisMaoObra
- 4 cards: custo total mês, qtd atividades, colaborador destaque, top 3 tipos
- Valores formatados com formatBRL()
- Texto em text-sm, KPI value em text-3xl (padrão design system)
```

### `AtividadeForm.tsx`

```
- Props: colaboradores (lista de ativos), talhoes, silos, maquinas, atividade? (edit mode), isOpen, onClose
- React Hook Form + atividadeFormSchema
- Multi-select colaboradores: Combobox com busca + chips dos selecionados
  (padrão similar ao ProdutoAutocomplete.tsx)
- Preview de custo em tempo real:
  - watch(['colaboradores', 'duracao_tipo', 'duracao_valor', 'custo_manual'])
  - Para cada colaborador selecionado: calcularCustoColaborador(...)
  - Exibir custo individual por colaborador e custo total
  - Se custo_manual preenchido: mostrar badge "Custo fixo (manual)" sobrescrevendo o calculado
- Vínculo: RadioGroup ('nenhum' | 'talhao' | 'silo' | 'maquina') + Select condicional
- Custo final calculado: campo read-only no rodapé do formulário
```

### `DeleteAtividadeDialog.tsx`

```
- Props: atividade: AtividadeComColaboradores, isOpen, onClose, onConfirm
- Texto: "Excluir atividade de [data] — [tipo] e a despesa correspondente em Financeiro?"
- Botão confirmar chama deletarAtividadeAction
```

### `DeleteColaboradorDialog.tsx`

```
- Props: colaborador: Colaborador, temHistorico: boolean, isOpen, onClose, onConfirm
- Se temHistorico: "Colaborador tem histórico. Será desativado (não deletado)."
- Se !temHistorico: "Colaborador será removido permanentemente."
```

### `AtividadesList.tsx`

```
- Props: atividades: AtividadeComColaboradores[], colaboradores: Colaborador[], isAdmin
- Filtros (estado local): data_inicio, data_fim, colaborador_id, tipo_atividade
- Tabela: data, tipo, colaboradores (chips), duração, custo_final (formatBRL), vínculo
- Rodapé: "Total no período: R$ X.XXX,XX"
- Ações inline (apenas Admin): editar, deletar
```

---

## 9. Sidebar — `components/Sidebar.tsx`

### Alteração necessária

**Arquivo**: `components/Sidebar.tsx`  
**Import a adicionar**: `Users` de `'lucide-react'`  
**Posição**: inserir em `gerencialRoutes` após `'Produtos'` (índice 5), antes de `'Frota'`

```typescript
// Antes:
{ label: 'Produtos',   icon: PackageOpen, href: '/dashboard/produtos',    badge: null },
{ label: 'Frota',      icon: Truck,       href: '/dashboard/frota',        badge: null },

// Depois:
{ label: 'Produtos',   icon: PackageOpen, href: '/dashboard/produtos',    badge: null },
{ label: 'Mão de Obra', icon: Users,      href: '/dashboard/mao-de-obra', badge: null },
{ label: 'Frota',      icon: Truck,       href: '/dashboard/frota',        badge: null },
```

**Visibilidade**: `visibleGerencialRoutes` atualmente usa `gerencialRoutes` sem filtro.  
Para ocultar "Mão de Obra" do Operador, alterar a linha:

```typescript
// Antes:
const visibleGerencialRoutes = gerencialRoutes;

// Depois:
const visibleGerencialRoutes = profile?.perfil === 'Operador'
  ? gerencialRoutes.filter(r => r.href !== '/dashboard/mao-de-obra')
  : gerencialRoutes;
```

> Este mesmo padrão deve ser aplicado para `Produtos` e `Pastagens` (atualmente visíveis para Operador no Sidebar, mas protegidos apenas pelo layout). Não alterar agora — escopo fora desta feature.

---

## 10. Pontos de Atenção para Execução

### P1 — `custo_final` nunca no payload
A coluna `custo_final` é `GENERATED ALWAYS AS STORED`. O PostgreSQL rejeita qualquer INSERT ou UPDATE que inclua essa coluna. Em TypeScript, garantir via `AtividadeInsert` (com `Omit<..., 'custo_final'>`). Verificar após `npm run db:types` se o tipo gerado reflete `Generated<'always'>`.

### P2 — Conversão hora↔dia centralizada
`calcularCustoColaborador` deve estar em `lib/utils.ts` ou `lib/calculos/mao-de-obra.ts` (não em componente). Ser importável por Server Action (Node.js) e por Client Component (browser) — sem dependência de `next/headers` ou `next/server`.

### P3 — Rollback atômico
Supabase JS v2 não tem transações nativas do lado cliente. O padrão do projeto é: INSERT → verificar erro → se erro antes do último passo, executar DELETE dos registros já inseridos. Seguir exatamente o padrão de `criarSaidaProdutoAction` em `app/dashboard/produtos/actions.ts`.

### P4 — Joins many-to-one no Supabase SDK
`talhoes(nome)`, `silos(nome)`, `maquinas(nome)` retornam objeto único, mas o SDK infere array. Usar:
```typescript
const row = data as unknown as (typeof data & {
  talhoes: { nome: string } | null;
  silos: { nome: string } | null;
  maquinas: { nome: string } | null;
});
```
Mesmo padrão já aplicado em `app/dashboard/page.tsx` para `maquinas(nome)`.

### P5 — Soft-delete + atividades futuras
`deletarColaboradorAction` deve verificar duas condições separadas:
1. `hasAtividades(supabase, id)` → decide soft vs hard delete
2. Atividades com `data > today` → bloquear soft-delete com mensagem

### P6 — `custo_calculado` vs `custo_final` no INSERT de financeiro
Ao inserir em `financeiro`, usar `custo_final_efetivo = custo_manual ?? custo_calculado` — calculado no lado da Server Action, **não** ler `custo_final` do banco (evitar round-trip desnecessário).

### P7 — Atualização de `despesa_id` após INSERT
O INSERT em `atividades_mao_obra` ocorre antes do INSERT em `financeiro` (necessário para ter o `atividade.id` para o `referencia_id`). O `despesa_id` é atualizado em `atividades_mao_obra` logo após o INSERT em `financeiro` com sucesso. Se o UPDATE do `despesa_id` falhar, a despesa existe mas sem rastreabilidade — logar via Sentry e retornar sucesso ao usuário (dado já persistido; a rastreabilidade pode ser recuperada pelo `referencia_id` no financeiro).

### P8 — Consultar `database-snapshot.md` antes da migration
Verificar o nome exato da função de trigger para `fazenda_id` e `updated_at` antes de escrever o SQL das migrations.

### P9 — Atualizar `database-snapshot.md` e `CLAUDE.md` após conclusão
Adicionar as 3 novas tabelas ao `database-snapshot.md`. Adicionar seção "Mão de Obra" ao `CLAUDE.md` (estrutura de arquivos, tabelas, regras de negócio, ações).

### P10 — Testes
Após implementação: `npm run build` (zero erros TypeScript) + `npm run test` (741+ testes passando). Escrever testes unitários para `calcularCustoColaborador` (todos os 4 cenários de conversão) antes de implementar a Server Action.

---

## 11. Integração Cross-Módulo

### Financeiro
- Categoria: `'Mão de Obra'` (string literal — verificar se já existe em `financeiro` ou se precisa ser adicionada ao CHECK constraint).
- `referencia_tipo = 'Mão de Obra'` — verificar se o campo `referencia_tipo` em `financeiro` tem CHECK constraint que precise ser atualizado.
- Rastreabilidade bidirecional: `atividades_mao_obra.despesa_id → financeiro.id` e `financeiro.referencia_id → atividades_mao_obra.id`.

### Talhões, Silos, Máquinas
- Leitura apenas (SELECT para popular selects no `AtividadeForm`).
- Queries simples: `supabase.from('talhoes').select('id, nome')`, sem impacto nas tabelas referenciadas.

### Pastagens (futuro)
- Quando a integração for planejada, a migration deve adicionar:
  ```sql
  ALTER TABLE atividades_mao_obra
    ADD COLUMN piquete_id uuid REFERENCES piquetes(id) ON DELETE SET NULL;
  CREATE INDEX idx_atividades_mao_obra_piquete_id
    ON atividades_mao_obra(piquete_id);
  ```
- O `AtividadeForm.tsx` deve incluir `piquete_id` como 4ª opção de vínculo no RadioGroup.
- Atualizar `atividadeFormSchema` para incluir `piquete_id`.
- Atualizar o `.refine` para checar no máximo 1 entre os 4 vínculos.

---

## 12. Checklist de Execução

### Banco de Dados
- [ ] Verificar nome exato das funções de trigger em `database-snapshot.md`
- [ ] Migration 1: CREATE TABLE `colaboradores` + índices + trigger fazenda_id + trigger updated_at
- [ ] Migration 2: CREATE TABLE `atividades_mao_obra` + índices + triggers
- [ ] Migration 3: CREATE TABLE `atividades_mao_obra_colaboradores` + índices + trigger fazenda_id
- [ ] Migration 4: RLS policies nas 3 tabelas
- [ ] Verificar se `categoria = 'Mão de Obra'` e `referencia_tipo = 'Mão de Obra'` precisam ser adicionados a CHECK constraints em `financeiro`
- [ ] `npm run db:types` para regenerar `types/supabase.ts`

### Lógica
- [ ] Função `calcularCustoColaborador` em `lib/utils.ts` (ou `lib/calculos/`)
- [ ] Testes unitários para `calcularCustoColaborador` (4 cenários)

### Backend
- [ ] `lib/types/mao-de-obra.ts`
- [ ] `lib/validations/mao-de-obra.ts`
- [ ] `lib/supabase/mao-de-obra.ts` (5 funções: listColaboradores, getColaboradorComHistorico, listAtividades, getKpisMensais, hasAtividades)
- [ ] `app/dashboard/mao-de-obra/actions.ts` (6 Server Actions)

### Frontend
- [ ] `app/dashboard/mao-de-obra/layout.tsx`
- [ ] `app/dashboard/mao-de-obra/page.tsx`
- [ ] `app/dashboard/mao-de-obra/MaoDeObraClient.tsx`
- [ ] `app/dashboard/mao-de-obra/components/KpisSection.tsx`
- [ ] `app/dashboard/mao-de-obra/components/ColaboradoresList.tsx`
- [ ] `app/dashboard/mao-de-obra/components/ColaboradorForm.tsx`
- [ ] `app/dashboard/mao-de-obra/components/DeleteColaboradorDialog.tsx`
- [ ] `app/dashboard/mao-de-obra/components/AtividadesList.tsx`
- [ ] `app/dashboard/mao-de-obra/components/AtividadeForm.tsx`
- [ ] `app/dashboard/mao-de-obra/components/DeleteAtividadeDialog.tsx`
- [ ] `components/Sidebar.tsx` — adicionar `Users` import + item + filtro Operador

### Validação
- [ ] `npm run build` sem erros TypeScript
- [ ] `npm run test` — 741+ testes passando
- [ ] Atualizar `database-snapshot.md` com as 3 novas tabelas
- [ ] Atualizar `CLAUDE.md` — seção "Mão de Obra" + tabelas em "Tabelas Principais"
