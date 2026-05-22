# SPEC — Módulo de Pastagens
**Data:** 2026-05-21  
**Autor:** Claude Code  
**Status:** Pronto para execução  
**PRD de referência:** `PRD-pastagens.md`

---

## 1. Schema do Banco de Dados

### 1.1 Tabela `pastagens`

```sql
CREATE TABLE pastagens (
  id               uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id       uuid        NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome             text        NOT NULL,
  especie_forrageira text      NULL,
  area_total_ha    numeric     NOT NULL CHECK (area_total_ha > 0),
  sistema_pastejo  text        NOT NULL DEFAULT 'rotacionado'
                               CHECK (sistema_pastejo IN ('rotacionado', 'continuo', 'semi_intensivo')),
  observacoes      text        NULL,
  ativo            boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NULL DEFAULT now(),
  updated_at       timestamptz NULL DEFAULT now()
);

COMMENT ON COLUMN pastagens.fazenda_id IS 'Preenchido pelo trigger trg_pastagens_fazenda_id via get_minha_fazenda_id()';
COMMENT ON COLUMN pastagens.area_total_ha IS 'Valor informativo; área real é a soma dos piquetes filhos';
COMMENT ON COLUMN pastagens.ativo IS 'Soft-delete: false = pastagem arquivada, piquetes filhos preservados no histórico';
```

### 1.2 Tabela `piquetes`

```sql
CREATE TABLE piquetes (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id            uuid        NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  pastagem_id           uuid        NOT NULL REFERENCES pastagens(id) ON DELETE CASCADE,
  nome                  text        NOT NULL,
  area_ha               numeric     NOT NULL CHECK (area_ha > 0),
  status                text        NOT NULL DEFAULT 'Descanso'
                                    CHECK (status IN ('Em pastejo', 'Descanso', 'Em reforma', 'Interditado')),
  ua_suportada          numeric     NULL CHECK (ua_suportada > 0),
  dias_descanso_ideal   integer     NULL CHECK (dias_descanso_ideal > 0),
  altura_entrada_cm     numeric     NULL CHECK (altura_entrada_cm > 0),
  altura_saida_cm       numeric     NULL CHECK (altura_saida_cm > 0),
  observacoes           text        NULL,
  created_at            timestamptz NULL DEFAULT now(),
  updated_at            timestamptz NULL DEFAULT now()
);

COMMENT ON COLUMN piquetes.fazenda_id IS 'Propagado pelo trigger trg_piquetes_fazenda_id via pastagem_id';
COMMENT ON COLUMN piquetes.status IS 'Gerenciado pelas Server Actions — não usar trigger para este campo';
COMMENT ON COLUMN piquetes.ua_suportada IS 'Capacidade de suporte em UA/ha configurada pelo gestor';
COMMENT ON COLUMN piquetes.dias_descanso_ideal IS 'Tempo de descanso esperado para a forrageira desta pastagem';
COMMENT ON COLUMN piquetes.altura_entrada_cm IS 'Altura de dossel de referência para entrada do lote';
COMMENT ON COLUMN piquetes.altura_saida_cm IS 'Altura de dossel de referência para saída do lote';
```

### 1.3 Tabela `ocupacoes_piquete`

```sql
CREATE TABLE ocupacoes_piquete (
  id                        uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id                uuid        NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  piquete_id                uuid        NOT NULL REFERENCES piquetes(id) ON DELETE CASCADE,
  lote_id                   uuid        NOT NULL REFERENCES lotes(id),
  data_entrada              date        NOT NULL DEFAULT CURRENT_DATE,
  data_saida_prevista       date        NULL,
  data_saida_real           date        NULL,
  altura_dossel_entrada_cm  numeric     NULL CHECK (altura_dossel_entrada_cm > 0),
  altura_dossel_saida_cm    numeric     NULL CHECK (altura_dossel_saida_cm > 0),
  quantidade_animais        integer     NULL CHECK (quantidade_animais > 0),
  peso_medio_kg             numeric     NULL CHECK (peso_medio_kg > 0),
  ua_real                   numeric     NULL CHECK (ua_real >= 0),
  metodo_calculo_ua         text        NULL CHECK (metodo_calculo_ua IN ('peso_real', 'fator_categoria')),
  observacoes               text        NULL,
  created_by                uuid        NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at                timestamptz NULL DEFAULT now(),
  updated_at                timestamptz NULL DEFAULT now(),

  CONSTRAINT chk_datas_saida CHECK (
    data_saida_real IS NULL OR data_saida_prevista IS NULL OR data_saida_real >= data_entrada
  )
);

COMMENT ON COLUMN ocupacoes_piquete.fazenda_id IS 'Propagado pelo trigger trg_ocupacoes_piquete_fazenda_id via piquete_id';
COMMENT ON COLUMN ocupacoes_piquete.ua_real IS 'Snapshot calculado no momento do registro da ocupação';
COMMENT ON COLUMN ocupacoes_piquete.metodo_calculo_ua IS 'Indica se ua_real foi calculado por peso_real (pesos_animal últimos 90d) ou fator_categoria (estimativa fixa)';
COMMENT ON COLUMN ocupacoes_piquete.quantidade_animais IS 'Snapshot da quantidade de animais ativos no lote ao registrar';
COMMENT ON COLUMN ocupacoes_piquete.peso_medio_kg IS 'Snapshot do peso médio (real ou estimado por categoria) ao registrar';

-- Impede duas ocupações abertas simultâneas no mesmo piquete
CREATE UNIQUE INDEX idx_ocupacao_aberta_unica
  ON ocupacoes_piquete(piquete_id)
  WHERE data_saida_real IS NULL;
```

### 1.4 Tabela `eventos_manejo_pastagem`

```sql
CREATE TABLE eventos_manejo_pastagem (
  id                uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id        uuid        NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  piquete_id        uuid        NOT NULL REFERENCES piquetes(id) ON DELETE CASCADE,
  tipo              text        NOT NULL
                                CHECK (tipo IN (
                                  'adubacao_manutencao', 'calagem', 'reforma',
                                  'ressemeadura', 'irrigacao', 'interdicao',
                                  'rocagem', 'outro'
                                )),
  data              date        NOT NULL DEFAULT CURRENT_DATE,
  insumo_id         uuid        NULL REFERENCES insumos(id),
  quantidade_insumo numeric     NULL CHECK (quantidade_insumo > 0),
  unidade_insumo    text        NULL,
  dose_por_ha       numeric     NULL CHECK (dose_por_ha > 0),
  maquina_id        uuid        NULL REFERENCES maquinas(id),
  custo_estimado    numeric     NULL CHECK (custo_estimado >= 0),
  observacoes       text        NULL,
  created_by        uuid        NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at        timestamptz NULL DEFAULT now()
);

COMMENT ON COLUMN eventos_manejo_pastagem.fazenda_id IS 'Propagado pelo trigger trg_eventos_manejo_pastagem_fazenda_id via piquete_id';
COMMENT ON COLUMN eventos_manejo_pastagem.tipo IS 'Tipo de evento: reforma e interdicao disparam atualização de status do piquete na action';
COMMENT ON COLUMN eventos_manejo_pastagem.insumo_id IS 'Referência informativa — não cria saída automática em movimentacoes_insumo';
COMMENT ON COLUMN eventos_manejo_pastagem.maquina_id IS 'Referência informativa — não cria registro em uso_maquinas';
```

> **Nota:** `rocagem` (sem cedilha) é o valor do CHECK constraint e do enum TypeScript. A label exibida na UI pode ser "Roçagem" com cedilha.

---

### 1.5 Triggers

#### Trigger 1 — Propagar `fazenda_id` de `pastagens` para `piquetes`

```sql
CREATE OR REPLACE FUNCTION fn_propagar_fazenda_id_via_pastagem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.fazenda_id := (
    SELECT fazenda_id FROM pastagens WHERE id = NEW.pastagem_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_piquetes_fazenda_id
  BEFORE INSERT ON piquetes
  FOR EACH ROW
  EXECUTE FUNCTION fn_propagar_fazenda_id_via_pastagem();
```

#### Trigger 2 — Propagar `fazenda_id` de `piquetes` para `ocupacoes_piquete`

```sql
CREATE OR REPLACE FUNCTION fn_propagar_fazenda_id_via_piquete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.fazenda_id := (
    SELECT fazenda_id FROM piquetes WHERE id = NEW.piquete_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ocupacoes_piquete_fazenda_id
  BEFORE INSERT ON ocupacoes_piquete
  FOR EACH ROW
  EXECUTE FUNCTION fn_propagar_fazenda_id_via_piquete();

CREATE TRIGGER trg_eventos_manejo_pastagem_fazenda_id
  BEFORE INSERT ON eventos_manejo_pastagem
  FOR EACH ROW
  EXECUTE FUNCTION fn_propagar_fazenda_id_via_piquete();
```

> A mesma função `fn_propagar_fazenda_id_via_piquete()` serve para ambos os triggers, pois ambos têm coluna `piquete_id`. Não criar função duplicada.

#### Trigger 3 — Atualizar `updated_at` em `pastagens` e `piquetes`

```sql
-- Reutilizar a função padrão do projeto se já existir (ex: fn_set_updated_at)
-- Caso não exista, criar:
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pastagens_updated_at
  BEFORE UPDATE ON pastagens
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_piquetes_updated_at
  BEFORE UPDATE ON piquetes
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_ocupacoes_piquete_updated_at
  BEFORE UPDATE ON ocupacoes_piquete
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();
```

> **Verificar antes da migration:** Se o projeto já tem uma função `fn_set_updated_at` ou equivalente, reutilizá-la diretamente. Não criar função duplicada.

#### Trigger 4 — `pastagens`: preencher `fazenda_id` via `get_minha_fazenda_id()`

```sql
CREATE OR REPLACE FUNCTION fn_pastagens_set_fazenda_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.fazenda_id := get_minha_fazenda_id();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pastagens_fazenda_id
  BEFORE INSERT ON pastagens
  FOR EACH ROW
  EXECUTE FUNCTION fn_pastagens_set_fazenda_id();
```

---

### 1.6 Índices

```sql
CREATE INDEX idx_pastagens_fazenda_id          ON pastagens(fazenda_id);
CREATE INDEX idx_piquetes_fazenda_id           ON piquetes(fazenda_id);
CREATE INDEX idx_piquetes_pastagem_id          ON piquetes(pastagem_id);
CREATE INDEX idx_ocupacoes_piquete_fazenda_id  ON ocupacoes_piquete(fazenda_id);
CREATE INDEX idx_ocupacoes_piquete_piquete_id  ON ocupacoes_piquete(piquete_id);
CREATE INDEX idx_ocupacoes_piquete_lote_id     ON ocupacoes_piquete(lote_id);
CREATE INDEX idx_eventos_manejo_piquete_id     ON eventos_manejo_pastagem(piquete_id);
CREATE INDEX idx_eventos_manejo_fazenda_id     ON eventos_manejo_pastagem(fazenda_id);
-- idx_ocupacao_aberta_unica já declarado na tabela (partial unique index)
```

---

## 2. Policies RLS

Todas as tabelas devem ter `ALTER TABLE <tabela> ENABLE ROW LEVEL SECURITY;` antes das policies.

### 2.1 `pastagens`

```sql
-- SELECT: qualquer usuário autenticado da mesma fazenda
CREATE POLICY pastagens_select_mesma_fazenda
  ON pastagens FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

-- INSERT: apenas Administrador (Gerente equivale a Admin na prática)
CREATE POLICY pastagens_insert_admin
  ON pastagens FOR INSERT
  WITH CHECK (sou_gerente_ou_admin());

-- UPDATE: apenas Administrador
CREATE POLICY pastagens_update_admin
  ON pastagens FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin());

-- DELETE: apenas Administrador
CREATE POLICY pastagens_delete_admin
  ON pastagens FOR DELETE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());
```

### 2.2 `piquetes`

```sql
CREATE POLICY piquetes_select_mesma_fazenda
  ON piquetes FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY piquetes_insert_admin
  ON piquetes FOR INSERT
  WITH CHECK (sou_gerente_ou_admin());

CREATE POLICY piquetes_update_admin
  ON piquetes FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin());

CREATE POLICY piquetes_delete_admin
  ON piquetes FOR DELETE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());
```

### 2.3 `ocupacoes_piquete`

```sql
CREATE POLICY ocupacoes_piquete_select_mesma_fazenda
  ON ocupacoes_piquete FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY ocupacoes_piquete_insert_admin
  ON ocupacoes_piquete FOR INSERT
  WITH CHECK (sou_gerente_ou_admin());

CREATE POLICY ocupacoes_piquete_update_admin
  ON ocupacoes_piquete FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin());

CREATE POLICY ocupacoes_piquete_delete_admin
  ON ocupacoes_piquete FOR DELETE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());
```

### 2.4 `eventos_manejo_pastagem`

```sql
CREATE POLICY eventos_manejo_pastagem_select_mesma_fazenda
  ON eventos_manejo_pastagem FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY eventos_manejo_pastagem_insert_admin
  ON eventos_manejo_pastagem FOR INSERT
  WITH CHECK (sou_gerente_ou_admin());

CREATE POLICY eventos_manejo_pastagem_update_admin
  ON eventos_manejo_pastagem FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin());

CREATE POLICY eventos_manejo_pastagem_delete_admin
  ON eventos_manejo_pastagem FOR DELETE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());
```

> **Rationale:** SELECT aberto para todos da fazenda (Administrador + Visualizador + Operador via `get_minha_fazenda_id()`). O guard de módulo no `layout.tsx` bloqueia o Operador antes de qualquer query. A policy SELECT não usa `sou_admin_ou_visualizador()` pois o padrão `_select_mesma_fazenda` do projeto é mais permissivo — isolamento real é feito pelo layout guard.

---

## 3. Tipos TypeScript

### `lib/types/pastagens.ts`

```typescript
// ─── Enums ─────────────────────────────────────────────────────────────────

export type SistemaPastejo = 'rotacionado' | 'continuo' | 'semi_intensivo';

export type StatusPiquete = 'Em pastejo' | 'Descanso' | 'Em reforma' | 'Interditado';

export type TipoEventoManejo =
  | 'adubacao_manutencao'
  | 'calagem'
  | 'reforma'
  | 'ressemeadura'
  | 'irrigacao'
  | 'interdicao'
  | 'rocagem'
  | 'outro';

export type MetodoCalculoUA = 'peso_real' | 'fator_categoria';

// ─── Entidades base ─────────────────────────────────────────────────────────

export interface Pastagem {
  id: string;
  fazenda_id: string;
  nome: string;
  especie_forrageira: string | null;
  area_total_ha: number;
  sistema_pastejo: SistemaPastejo;
  observacoes: string | null;
  ativo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface Piquete {
  id: string;
  fazenda_id: string;
  pastagem_id: string;
  nome: string;
  area_ha: number;
  status: StatusPiquete;
  ua_suportada: number | null;
  dias_descanso_ideal: number | null;
  altura_entrada_cm: number | null;
  altura_saida_cm: number | null;
  observacoes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface OcupacaoPiquete {
  id: string;
  fazenda_id: string;
  piquete_id: string;
  lote_id: string;
  data_entrada: string;          // ISO date (YYYY-MM-DD)
  data_saida_prevista: string | null;
  data_saida_real: string | null;
  altura_dossel_entrada_cm: number | null;
  altura_dossel_saida_cm: number | null;
  quantidade_animais: number | null;
  peso_medio_kg: number | null;
  ua_real: number | null;
  metodo_calculo_ua: MetodoCalculoUA | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface EventoManejoPastagem {
  id: string;
  fazenda_id: string;
  piquete_id: string;
  tipo: TipoEventoManejo;
  data: string;                  // ISO date (YYYY-MM-DD)
  insumo_id: string | null;
  quantidade_insumo: number | null;
  unidade_insumo: string | null;
  dose_por_ha: number | null;
  maquina_id: string | null;
  custo_estimado: number | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string | null;
}

// ─── Tipos enriquecidos (com joins) ─────────────────────────────────────────

export interface PiqueteComOcupacaoAtual extends Piquete {
  ocupacao_atual: OcupacaoPiqueteComLote | null;
  dias_descanso_acumulado: number | null; // calculado em JS: hoje - data_saida_real
  alerta_pronto_entrada: boolean;         // dias_descanso_acumulado >= dias_descanso_ideal
  alerta_superlotacao: boolean;           // ua_real > ua_suportada
}

export interface OcupacaoPiqueteComLote extends OcupacaoPiquete {
  lotes: {
    nome: string;
    tipo_rebanho: string;
  };
}

export interface PastagemComResumo extends Pastagem {
  piquetes: PiqueteComOcupacaoAtual[];
  total_piquetes: number;
  em_pastejo: number;
  em_descanso: number;
  em_reforma: number;
  interditados: number;
}

export interface EventoManejoComJoins extends EventoManejoPastagem {
  insumos: { nome: string; unidade: string } | null;
  maquinas: { nome: string } | null;
}

// ─── Fatores de conversão UA ─────────────────────────────────────────────────

/**
 * Fatores fixos de conversão por categoria animal (valores zootécnicos padrão Brasil).
 * Usados como fallback quando não há pesagem nos últimos 90 dias.
 *
 * Fonte: Embrapa / literatura zootécnica nacional
 */
export const FATORES_UA_POR_CATEGORIA: Record<string, number> = {
  // Leiteiro / dupla aptidão
  'Bezerro':                   0.25,
  'Bezerra':                   0.25,
  'Novilha (Prenha)':          0.50,
  'Novilho':                   0.50,
  'Vaca em Lactação':          1.00,
  'Vaca Seca':                 1.00,
  'Vaca Prenha':               1.00,
  'Vaca Vazia':                1.00,
  'Touro':                     1.25,
  // Corte
  'Novilha':                   0.50,
  'Vaca Matriz':               1.00,
  'Boi':                       1.00,
  'Boi Descartado':            1.00,
  'Fêmea Descartada':          1.00,
} as const;

// UA de referência para categoria não mapeada
export const UA_FATOR_PADRAO = 1.00;

// ─── Resultado do cálculo de UA ──────────────────────────────────────────────

export interface ResultadoCalculoUA {
  ua_total: number;
  ua_por_ha: number | null;          // null quando area_ha não informada
  peso_medio_kg: number;
  quantidade_animais: number;
  metodo: MetodoCalculoUA;
  animais_sem_pesagem: number;       // quantos animais usaram fator fixo
}
```

---

## 4. Estrutura de Arquivos

```
app/dashboard/pastagens/
├── layout.tsx                       # Guard: Operador → /dashboard
├── page.tsx                         # RSC: lista pastagens + piquetes resumidos
├── PastagensClient.tsx              # Client: hub com cards de pastagens e alertas
├── actions.ts                       # Todas as Server Actions do módulo
└── components/
    ├── PastagemCard.tsx             # Card de pastagem com contadores de piquetes
    ├── PastagemForm.tsx             # Modal criar/editar pastagem
    ├── DeletePastagemDialog.tsx     # Confirm dialog exclusão de pastagem
    ├── PiqueteCard.tsx              # Card de piquete: status, UA/ha, dias descanso
    ├── PiqueteForm.tsx              # Modal criar/editar piquete
    ├── DeletePiqueteDialog.tsx      # Confirm dialog exclusão de piquete
    ├── OcupacaoForm.tsx             # Modal registrar entrada de lote (calcula UA)
    ├── FecharOcupacaoDialog.tsx     # Fechar ocupação: data real + dossel saída
    ├── HistoricoOcupacoes.tsx       # Tabela de histórico de ocupações por piquete
    ├── EventoManejoForm.tsx         # Modal registrar evento de manejo
    └── EventosManejoList.tsx        # Timeline de eventos de manejo por piquete

app/dashboard/pastagens/[id]/
├── page.tsx                         # RSC: detalhe da pastagem (piquetes + histórico + eventos)
└── PastagemDetailClient.tsx         # Client: abas Piquetes / Histórico / Eventos de Manejo

lib/
├── types/pastagens.ts               # (detalhado na Seção 3)
├── supabase/pastagens.ts            # Queries (detalhado na Seção 5)
└── validations/pastagens.ts         # Schemas Zod (detalhado na Seção 6)
```

---

## 5. Queries — `lib/supabase/pastagens.ts`

Todas as funções usam `createSupabaseServerClient()` quando chamadas de RSC, ou o cliente browser quando chamadas de Client Component. Nenhuma usa `select('*')`.

### 5.1 `listPastagens(supabase)`
```
SELECT pastagens: id, fazenda_id, nome, especie_forrageira, area_total_ha,
                  sistema_pastejo, observacoes, ativo, created_at, updated_at
WHERE ativo = true
ORDER BY nome ASC
```
Retorna `Pastagem[]`.

### 5.2 `getPastagemComResumo(supabase, pastagemId)`
```
SELECT pastagem (todos os campos) +
  piquetes: id, nome, area_ha, status, ua_suportada, dias_descanso_ideal,
            altura_entrada_cm, altura_saida_cm, observacoes, updated_at +
    ocupacoes_piquete[WHERE data_saida_real IS NULL]:
      id, lote_id, data_entrada, data_saida_prevista, ua_real,
      metodo_calculo_ua, quantidade_animais, peso_medio_kg,
      lotes(nome, tipo_rebanho)
```
Enriquece em JS: `dias_descanso_acumulado`, `alerta_pronto_entrada`, `alerta_superlotacao`.  
Retorna `PastagemComResumo`.

### 5.3 `listPiquetesDaPastagem(supabase, pastagemId)`
```
SELECT piquetes (todos os campos não-redundantes)
WHERE pastagem_id = pastagemId
ORDER BY nome ASC
```
Retorna `Piquete[]`.

### 5.4 `listOcupacoesDoPiquete(supabase, piqueteId, { incluirFechadas: boolean })`
```
SELECT ocupacoes_piquete: id, piquete_id, lote_id, data_entrada, data_saida_prevista,
       data_saida_real, altura_dossel_entrada_cm, altura_dossel_saida_cm,
       quantidade_animais, peso_medio_kg, ua_real, metodo_calculo_ua,
       observacoes, created_at +
  lotes(nome, tipo_rebanho)
WHERE piquete_id = piqueteId
  AND (incluirFechadas ? TRUE : data_saida_real IS NULL)
ORDER BY data_entrada DESC
```
Retorna `OcupacaoPiqueteComLote[]`.

### 5.5 `listEventosManejoDoPiquete(supabase, piqueteId)`
```
SELECT eventos_manejo_pastagem: id, piquete_id, tipo, data, insumo_id,
       quantidade_insumo, unidade_insumo, dose_por_ha, maquina_id,
       custo_estimado, observacoes, created_at +
  insumos(nome, unidade) +
  maquinas(nome)
WHERE piquete_id = piqueteId
ORDER BY data DESC
```
Retorna `EventoManejoComJoins[]`.

### 5.6 `calcularUADoLote(supabase, loteId, areaHa)` — função utilitária
Calcula UA/ha para o lote, com lógica em duas camadas:

```
1. Buscar animais ativos do lote:
   SELECT animais: id, categoria, status
   WHERE lote_id = loteId AND status = 'Ativo'

2. Para cada animal, buscar última pesagem nos últimos 90 dias:
   SELECT pesos_animal: peso_kg, data_pesagem
   WHERE animal_id = animal.id
     AND data_pesagem >= (CURRENT_DATE - 90 dias)
   ORDER BY data_pesagem DESC
   LIMIT 1

3. Calcular UA de cada animal:
   - Se tem pesagem: ua_animal = peso_kg / 450   → metodo = 'peso_real'
   - Se não tem:     ua_animal = FATORES_UA_POR_CATEGORIA[animal.categoria] ?? UA_FATOR_PADRAO
                                                   → metodo = 'fator_categoria'

4. ua_total = soma de ua_animal de todos os animais
   ua_por_ha = ua_total / areaHa
   peso_medio_kg = (soma dos pesos ou estimados) / quantidade_animais
   metodo final = 'peso_real' se TODOS os animais têm pesagem; 'fator_categoria' se qualquer um usou fator fixo

5. Retorna ResultadoCalculoUA
```

> **Nota de performance:** As queries individuais de pesagem por animal podem ser agrupadas em uma única query com `IN (lista_de_animal_ids)` + `DISTINCT ON (animal_id)` para evitar N+1. Detalhe de implementação para a fase de execução.

### 5.7 `listPastagensParaAlertas(supabase)` — usada pelo Dashboard
```
SELECT pastagens(id, nome) +
  piquetes: id, nome, area_ha, status, ua_suportada, dias_descanso_ideal, updated_at +
    ocupacoes_piquete[WHERE data_saida_real IS NULL]:
      ua_real, data_entrada +
    ocupacoes_piquete[WHERE data_saida_real IS NOT NULL, ORDER BY data_saida_real DESC, LIMIT 1]:
      data_saida_real
WHERE pastagens.ativo = true
```
Retorna dados suficientes para gerar os 3 alertas proativos no Dashboard sem queries adicionais.

---

## 6. Schemas Zod — `lib/validations/pastagens.ts`

```typescript
import { z } from 'zod';

export const pastagemFormSchema = z.object({
  nome:               z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  especie_forrageira: z.string().max(150).optional().nullable(),
  area_total_ha:      z.number({ invalid_type_error: 'Área obrigatória' })
                       .positive('Área deve ser maior que zero'),
  sistema_pastejo:    z.enum(['rotacionado', 'continuo', 'semi_intensivo']),
  observacoes:        z.string().max(500).optional().nullable(),
});

export const piqueteFormSchema = z.object({
  pastagem_id:          z.string().uuid(),
  nome:                 z.string().min(1, 'Nome obrigatório').max(50),
  area_ha:              z.number({ invalid_type_error: 'Área obrigatória' })
                         .positive('Área deve ser maior que zero'),
  ua_suportada:         z.number().positive().optional().nullable(),
  dias_descanso_ideal:  z.number().int().positive().optional().nullable(),
  altura_entrada_cm:    z.number().positive().optional().nullable(),
  altura_saida_cm:      z.number().positive().optional().nullable(),
  observacoes:          z.string().max(500).optional().nullable(),
});

export const ocupacaoFormSchema = z.object({
  piquete_id:               z.string().uuid(),
  lote_id:                  z.string().uuid(),
  data_entrada:             z.string().date(),
  data_saida_prevista:      z.string().date().optional().nullable(),
  altura_dossel_entrada_cm: z.number().positive().optional().nullable(),
  observacoes:              z.string().max(500).optional().nullable(),
  // Campos de snapshot (calculados antes de enviar — não editáveis pelo usuário)
  quantidade_animais:       z.number().int().positive().optional().nullable(),
  peso_medio_kg:            z.number().positive().optional().nullable(),
  ua_real:                  z.number().nonnegative().optional().nullable(),
  metodo_calculo_ua:        z.enum(['peso_real', 'fator_categoria']).optional().nullable(),
});

export const fecharOcupacaoSchema = z.object({
  data_saida_real:         z.string().date(),
  altura_dossel_saida_cm:  z.number().positive().optional().nullable(),
  observacoes:             z.string().max(500).optional().nullable(),
});

export const atualizarStatusPiqueteSchema = z.object({
  status: z.enum(['Em pastejo', 'Descanso', 'Em reforma', 'Interditado']),
});

export const eventoManejoFormSchema = z.object({
  piquete_id:       z.string().uuid(),
  tipo:             z.enum([
                      'adubacao_manutencao', 'calagem', 'reforma',
                      'ressemeadura', 'irrigacao', 'interdicao',
                      'rocagem', 'outro',
                    ]),
  data:             z.string().date(),
  insumo_id:        z.string().uuid().optional().nullable(),
  quantidade_insumo: z.number().positive().optional().nullable(),
  unidade_insumo:   z.string().max(20).optional().nullable(),
  dose_por_ha:      z.number().positive().optional().nullable(),
  maquina_id:       z.string().uuid().optional().nullable(),
  custo_estimado:   z.number().nonnegative().optional().nullable(),
  observacoes:      z.string().max(500).optional().nullable(),
});

// Tipos inferidos
export type PastagemFormData     = z.infer<typeof pastagemFormSchema>;
export type PiqueteFormData      = z.infer<typeof piqueteFormSchema>;
export type OcupacaoFormData     = z.infer<typeof ocupacaoFormSchema>;
export type FecharOcupacaoData   = z.infer<typeof fecharOcupacaoSchema>;
export type EventoManejoFormData = z.infer<typeof eventoManejoFormSchema>;
```

---

## 7. Server Actions — `app/dashboard/pastagens/actions.ts`

Todas as actions devem:
1. Validar com Zod antes de qualquer operação no banco
2. Retornar `{ success: true }` ou `{ success: false, error: string }`
3. Chamar `revalidatePath('/dashboard/pastagens')` ao final de operações de mutação
4. **Nunca enviar `fazenda_id` no payload de INSERT** — trigger cuida disso

---

### 7.1 `criarPastagemAction(data: PastagemFormData)`

**Operação:** `INSERT pastagens`  
**Validação:** `pastagemFormSchema`  
**Pré-condições:** nenhuma  
**Efeito colateral:** nenhum  
**Status de piquete:** não afeta

---

### 7.2 `atualizarPastagemAction(id: string, data: PastagemFormData)`

**Operação:** `UPDATE pastagens WHERE id = id`  
**Validação:** `pastagemFormSchema`  
**Pré-condições:** pastagem pertence à fazenda do usuário (garantido por RLS)  
**Efeito colateral:** nenhum  
**Status de piquete:** não afeta

---

### 7.3 `deletarPastagemAction(id: string)`

**Operação:** `DELETE pastagens WHERE id = id`  
**Validação:** nenhum schema (apenas `id` uuid)  
**Pré-condições:**
- Verificar se há `piquetes` com `ocupacoes_piquete` com `data_saida_real IS NULL` (ocupação aberta). Se sim, retornar erro: "Não é possível excluir pastagem com piquetes em pastejo."
- Piquetes sem ocupação aberta são deletados em cascata pelo `ON DELETE CASCADE`

**Efeito colateral:** `ON DELETE CASCADE` deleta todos os piquetes filhos → deleta todas as ocupações e eventos de manejo em cascata  
**Status de piquete:** todos os filhos são deletados

> **Guard na UI:** botão "Excluir Pastagem" visível apenas para `perfil === 'Administrador'`.

---

### 7.4 `criarPiqueteAction(data: PiqueteFormData)`

**Operação:** `INSERT piquetes`  
**Validação:** `piqueteFormSchema`  
**Pré-condições:** `pastagem_id` pertence à fazenda do usuário  
**Status inicial:** `'Descanso'` (DEFAULT do banco)  
**Efeito colateral:** nenhum

---

### 7.5 `atualizarPiqueteAction(id: string, data: PiqueteFormData)`

**Operação:** `UPDATE piquetes WHERE id = id`  
**Validação:** `piqueteFormSchema`  
**Pré-condições:** piquete pertence à fazenda (RLS)  
**Nota:** não altera `status` — status só muda via actions específicas  
**Efeito colateral:** nenhum

---

### 7.6 `deletarPiqueteAction(id: string)`

**Operação:** `DELETE piquetes WHERE id = id`  
**Validação:** nenhum schema  
**Pré-condições:**
- Verificar se há ocupação aberta (`data_saida_real IS NULL`). Se sim, retornar erro: "Não é possível excluir piquete em pastejo. Feche a ocupação primeiro."
- Histórico de ocupações fechadas e eventos de manejo são deletados em cascata

**Status de piquete:** piquete é deletado; não há transição

> **Guard na UI:** botão "Excluir Piquete" visível apenas para `perfil === 'Administrador'`.

---

### 7.7 `registrarEntradaLoteAction(data: OcupacaoFormData)`

**Operações (sequenciais, sem transação explícita — erro na segunda não desfaz a primeira, mas é idempotente)**:
1. Verificar pré-condições (ver abaixo)
2. `INSERT ocupacoes_piquete` com dados calculados de UA
3. `UPDATE piquetes SET status = 'Em pastejo' WHERE id = data.piquete_id`

**Validação:** `ocupacaoFormSchema`

**Pré-condições obrigatórias:**
- Piquete **não** pode ter `status = 'Em reforma'` → erro: "Piquete em reforma não pode receber lote."
- Piquete **não** pode ter `status = 'Interditado'` → erro: "Piquete interditado não pode receber lote."
- Piquete **não** pode ter ocupação aberta (o UNIQUE partial index do banco também garante) → erro: "Piquete já está em pastejo."
- `data_entrada` não pode ser futura → erro: "Data de entrada não pode ser futura."

**Cálculo de UA antes do INSERT (via `calcularUADoLote`):**
- Chamar a função utilitária para obter `quantidade_animais`, `peso_medio_kg`, `ua_real`, `metodo_calculo_ua`
- Incluir esses valores no payload do INSERT como snapshot
- Exibir na UI qual método foi usado (`peso_real` = "Peso real" / `fator_categoria` = "Estimativa por categoria")

**Transição de status:** `Qualquer status válido` → `'Em pastejo'`

---

### 7.8 `fecharOcupacaoAction(ocupacaoId: string, data: FecharOcupacaoData)`

**Operações (sequenciais)**:
1. Buscar a ocupação para obter `piquete_id`
2. Verificar pré-condições
3. `UPDATE ocupacoes_piquete SET data_saida_real, altura_dossel_saida_cm, observacoes WHERE id = ocupacaoId`
4. `UPDATE piquetes SET status = 'Descanso' WHERE id = piquete_id`

**Validação:** `fecharOcupacaoSchema`

**Pré-condições:**
- Ocupação deve estar aberta (`data_saida_real IS NULL`) → erro: "Ocupação já foi fechada."
- `data_saida_real >= data_entrada` da ocupação → erro: "Data de saída não pode ser anterior à data de entrada."

**Transição de status:** `'Em pastejo'` → `'Descanso'`

---

### 7.9 `registrarEventoManejoAction(data: EventoManejoFormData)`

**Operações (sequenciais)**:
1. `INSERT eventos_manejo_pastagem`
2. Se `tipo === 'reforma'`:  
   `UPDATE piquetes SET status = 'Em reforma' WHERE id = data.piquete_id`
3. Se `tipo === 'interdicao'`:  
   `UPDATE piquetes SET status = 'Interditado' WHERE id = data.piquete_id`

**Validação:** `eventoManejoFormSchema`

**Pré-condições para tipos que alteram status:**
- `reforma`: não pode ser aplicada em piquete com ocupação aberta → erro: "Feche a ocupação antes de iniciar reforma."
- `interdicao`: não pode ser aplicada em piquete com ocupação aberta → erro: "Feche a ocupação antes de interditar o piquete."

**Transições de status:**
- `reforma` → `'Em reforma'` (independente do status anterior, exceto se `'Em pastejo'`)
- `interdicao` → `'Interditado'` (independente do status anterior, exceto se `'Em pastejo'`)
- Demais tipos (`adubacao_manutencao`, `calagem`, etc.) → sem transição de status

---

### 7.10 `deletarEventoManejoAction(id: string)`

**Operação:** `DELETE eventos_manejo_pastagem WHERE id = id`  
**Validação:** nenhum schema  
**Pré-condições:** nenhuma (RLS garante pertencimento à fazenda)  
**Efeito colateral:** **não** reverte o status do piquete automaticamente — o usuário deve ajustar manualmente  
**Nota UI:** exibir aviso ao deletar evento de `reforma` ou `interdicao`: "O status do piquete não será alterado automaticamente."

> **Guard na UI:** botão "Excluir Evento" visível apenas para `perfil === 'Administrador'`.

---

### 7.11 `atualizarStatusPiqueteAction(id: string, status: StatusPiquete)` *(manual)*

**Operação:** `UPDATE piquetes SET status = status WHERE id = id`  
**Validação:** `atualizarStatusPiqueteSchema`  
**Uso:** permite ao Admin corrigir o status manualmente (ex: após deletar um evento de reforma)

**Pré-condições:**
- Não pode setar `'Em pastejo'` manualmente sem ter ocupação aberta → erro: "Use 'Registrar Entrada de Lote' para colocar o piquete em pastejo."

---

## 8. Regras de Transição de Status — Tabela Resumo

| Status Atual | Ação/Action | Status Resultante | Pré-condições |
|---|---|---|---|
| Qualquer (exceto Em pastejo) | `registrarEntradaLoteAction` | `Em pastejo` | Sem ocupação aberta; não Em reforma; não Interditado |
| `Em pastejo` | `fecharOcupacaoAction` | `Descanso` | Ocupação aberta existe |
| Qualquer (exceto Em pastejo) | `registrarEventoManejoAction` (tipo=`reforma`) | `Em reforma` | Sem ocupação aberta |
| Qualquer (exceto Em pastejo) | `registrarEventoManejoAction` (tipo=`interdicao`) | `Interditado` | Sem ocupação aberta |
| Qualquer | `atualizarStatusPiqueteAction` (manual Admin) | Qualquer | Não pode setar `Em pastejo` sem ocupação |

---

## 9. Cálculo de UA/ha — Especificação Detalhada

### 9.1 Algoritmo em duas camadas

```
Entrada: lote_id, area_ha (do piquete)

PASSO 1 — Buscar animais ativos do lote
  animais = SELECT id, categoria FROM animais
             WHERE lote_id = :lote_id AND status = 'Ativo'

PASSO 2 — Buscar pesagens recentes (batch, evitar N+1)
  pesagens = SELECT DISTINCT ON (animal_id) animal_id, peso_kg, data_pesagem
              FROM pesos_animal
              WHERE animal_id IN (:lista_de_ids)
                AND data_pesagem >= CURRENT_DATE - INTERVAL '90 days'
              ORDER BY animal_id, data_pesagem DESC

PASSO 3 — Calcular UA por animal
  Para cada animal em animais:
    pesagem = pesagens.find(p => p.animal_id === animal.id)

    SE pesagem existe:
      ua_animal   = pesagem.peso_kg / 450
      peso_animal = pesagem.peso_kg
      metodo_animal = 'peso_real'
    SENÃO:
      fator = FATORES_UA_POR_CATEGORIA[animal.categoria] ?? UA_FATOR_PADRAO
      ua_animal   = fator
      peso_animal = fator * 450  // equivalente em kg para snapshot
      metodo_animal = 'fator_categoria'

PASSO 4 — Agregar
  ua_total            = soma(ua_animal para todos os animais)
  ua_por_ha           = area_ha > 0 ? ua_total / area_ha : null
  peso_medio_kg       = soma(peso_animal) / quantidade_animais
  quantidade_animais  = animais.length
  animais_sem_pesagem = count(metodo_animal === 'fator_categoria')
  metodo_final        = animais_sem_pesagem === 0 ? 'peso_real' : 'fator_categoria'

RETORNA ResultadoCalculoUA
```

### 9.2 Tabela de fatores fixos

| Categoria | Fator UA | Peso equivalente (kg) |
|---|---|---|
| Bezerro / Bezerra (até ~1 ano) | 0.25 | 112.5 |
| Novilha / Novilho (1–2 anos) / Novilha (Prenha) | 0.50 | 225.0 |
| Vaca em Lactação / Seca / Prenha / Vazia | 1.00 | 450.0 |
| Boi / Boi Descartado / Vaca Matriz / Fêmea Descartada | 1.00 | 450.0 |
| Touro | 1.25 | 562.5 |
| Categoria não mapeada (fallback) | 1.00 | 450.0 |

### 9.3 Indicação do método na UI

No card de piquete (`PiqueteCard.tsx`) e no modal `OcupacaoForm.tsx`, exibir:

- `metodo_calculo_ua === 'peso_real'` → badge verde: **"Peso real"** (tooltip: "Calculado com base em pesagens dos últimos 90 dias")
- `metodo_calculo_ua === 'fator_categoria'` → badge amarelo: **"Estimativa"** (tooltip: "Um ou mais animais sem pesagem recente — usando fator fixo por categoria")

No `HistoricoOcupacoes.tsx`, exibir o método registrado no snapshot para rastreabilidade.

### 9.4 Quando o cálculo é executado

- **No modal `OcupacaoForm.tsx`:** cálculo em tempo real ao selecionar o lote (Client Component chama query de animais + pesagens e exibe resultado antes de submeter)
- **Na `registrarEntradaLoteAction`:** recalcula no servidor antes do INSERT para garantir consistência (dados podem ter mudado entre a exibição do modal e o submit)
- **Não é recalculado em fechar ocupação:** `ua_real` do snapshot original é preservado como histórico

---

## 10. Componentes — Responsabilidades

### `layout.tsx`
```
Guard de perfil: redireciona Operador → /dashboard
Sem estado, sem hooks — apenas verificação de perfil via createSupabaseServerClient()
```

### `page.tsx` (RSC — hub)
```
Autentica usuário + busca perfil
Chama listPastagens() com piquetes resumidos via getPastagemComResumo()
Passa initialPastagens e isAdmin para PastagensClient
```

### `PastagensClient.tsx` (Client)
```
Estado: modalAberto (criar pastagem), pastagemSelecionada
Renderiza: cabeçalho + botão "Nova Pastagem" (só Admin) + grid de PastagemCard
Após mutação: router.refresh() para re-executar RSC
```

### `PastagemCard.tsx` (Client ou RSC puro se sem estado local)
```
Props: pastagem: PastagemComResumo, isAdmin: boolean
Exibe: nome, espécie, sistema de pastejo, contadores por status
Botões: "Ver detalhes" → /dashboard/pastagens/[id]; "Editar" (Admin); "Excluir" (Admin)
```

### `PastagemForm.tsx` (Client)
```
Props: pastagem? (edição), onSuccess
Formulário com React Hook Form + zodResolver(pastagemFormSchema)
Chama criarPastagemAction ou atualizarPastagemAction
```

### `DeletePastagemDialog.tsx` (Client)
```
Props: pastagemId, pastagemNome, onSuccess
Confirm dialog com chamada a deletarPastagemAction
Exibe mensagem de aviso sobre cascata nos piquetes
```

### `app/dashboard/pastagens/[id]/page.tsx` (RSC)
```
Busca pastagem completa com piquetes, ocupação atual e último evento
Passa dados e isAdmin para PastagemDetailClient
```

### `PastagemDetailClient.tsx` (Client)
```
Estado: abaAtiva ('piquetes' | 'historico' | 'eventos')
Renderiza abas com shadcn/ui Tabs
Aba Piquetes: grid de PiqueteCard + botão "Novo Piquete" (Admin)
Aba Histórico: HistoricoOcupacoes (filtro por lote/período)
Aba Eventos: EventosManejoList + botão "Registrar Evento" (Admin)
```

### `PiqueteCard.tsx` (Client)
```
Props: piquete: PiqueteComOcupacaoAtual, isAdmin: boolean
Exibe:
  - Nome + badge de status (cor por status: verde=pastejo, azul=descanso, laranja=reforma, vermelho=interditado)
  - UA/ha atual vs suportada (com barra de progresso)
  - Badge de método: "Peso real" (verde) ou "Estimativa" (amarelo)
  - Dias de descanso acumulado vs ideal (quando em Descanso)
  - Alertas: superlotação (urgente), pronto para entrada (aviso)
Botões (Admin):
  - "Entrada de Lote" (se Descanso)
  - "Fechar Ocupação" (se Em pastejo)
  - "Registrar Evento"
  - "Editar Piquete"
  - "Excluir Piquete"
```

### `PiqueteForm.tsx` (Client)
```
Props: pastagemId, piquete? (edição), onSuccess
Formulário com zodResolver(piqueteFormSchema)
Chama criarPiqueteAction ou atualizarPiqueteAction
```

### `OcupacaoForm.tsx` (Client)
```
Props: piqueteId, areaHa (do piquete), onSuccess
Selecionar lote via combobox (busca lotes da fazenda)
Ao selecionar lote: chama calcularUADoLote() client-side e exibe:
  - Quantidade de animais
  - Peso médio (com indicação do método)
  - UA/ha calculada vs suportada
  - Badge "Peso real" ou "Estimativa" com tooltip
Submete com snapshots já calculados
Validação: pré-condições de status exibidas antes de abrir o modal
```

### `FecharOcupacaoDialog.tsx` (Client)
```
Props: ocupacao: OcupacaoPiquete, onSuccess
Campos: data_saida_real (obrigatório), altura_dossel_saida_cm (opcional), observacoes
Validação: data_saida_real >= data_entrada
Chama fecharOcupacaoAction
```

### `HistoricoOcupacoes.tsx` (Client)
```
Props: piqueteId, initialOcupacoes: OcupacaoPiqueteComLote[]
Estado: filtros (lote, período)
Tabela: lote, entrada, saída, dias no piquete, UA/ha, método, dossel entrada/saída
Paginação: sem paginação no MVP (listar últimas 50)
```

### `EventoManejoForm.tsx` (Client)
```
Props: piqueteId, onSuccess
Seletor de tipo com ícone/descrição por tipo
Campos condicionais:
  - insumo_id + quantidade_insumo + unidade_insumo + dose_por_ha: exibidos se tipo IN ('adubacao_manutencao', 'calagem', 'ressemeadura')
  - maquina_id: exibido se tipo IN ('adubacao_manutencao', 'calagem', 'ressemeadura', 'rocagem')
  - custo_estimado: sempre visível
Aviso para tipos 'reforma' e 'interdicao': "O status do piquete será alterado para [Em reforma/Interditado]"
Chama registrarEventoManejoAction
```

### `EventosManejoList.tsx` (Client)
```
Props: piqueteId, initialEventos: EventoManejoComJoins[]
Timeline vertical com data, tipo, insumo/máquina, custo
Botão "Excluir" (Admin) com aviso sobre status
Botão "Registrar Evento" abre EventoManejoForm
```

---

## 11. Item de Navegação no Sidebar

### Localização no `Sidebar.tsx`
O item "Pastagens" deve ser inserido no array `gerencialRoutes`, após "Lavouras" e antes de "Rebanho":

```typescript
// Em components/Sidebar.tsx

// Adicionar import do ícone (Leaf já disponível no Lucide):
import { ..., Leaf, ... } from 'lucide-react';

// Array gerencialRoutes — posição atual:
const gerencialRoutes: RouteItem[] = [
  { label: 'Silos',       icon: Database,    href: '/dashboard/silos',      badge: null },
  { label: 'Lavouras',    icon: Sprout,      href: '/dashboard/talhoes',    badge: null },
  // INSERIR AQUI:
  { label: 'Pastagens',   icon: Leaf,        href: '/dashboard/pastagens',  badge: null },
  { label: 'Rebanho',     icon: CowIcon,     href: '/dashboard/rebanho',    badge: null },
  // ... restante
];
```

### Visibilidade por perfil
O Sidebar atual não filtra `gerencialRoutes` por perfil (`visibleGerencialRoutes = gerencialRoutes`). O ocultamento para Operador é feito pelo guard no `layout.tsx` do módulo — **não** adicionar lógica de filtro no Sidebar (mantém consistência com os outros módulos Produtos e Planejamento de Compras, que também usam layout guard).

### Ícone
`Leaf` do Lucide React — já importado em outros arquivos do projeto; verificar se já está no bundle antes de adicionar import no Sidebar. Alternativa: `Sprout` (já importado no Sidebar para Lavouras) — usar `Leaf` para diferenciar visualmente.

---

## 12. Alertas Proativos no Dashboard

Seguindo o padrão de `app/dashboard/alertas-helpers.ts` e `app/dashboard/page.tsx`:

### 12.1 Novos alertas a adicionar ao `Promise.all` do Dashboard

```typescript
// Em app/dashboard/page.tsx — adicionar ao Promise.all existente:
supabase
  .from('piquetes')
  .select(`
    id, nome, area_ha, status, ua_suportada, dias_descanso_ideal,
    pastagens!inner(nome),
    ocupacoes_piquete(ua_real, data_entrada, data_saida_real)
  `)
  .eq('pastagens.ativo', true)
  .eq('fazenda_id', fazendaId)
```

### 12.2 Condições e severidades

| Condição | Severidade | Tipo de alerta |
|---|---|---|
| `ua_real > ua_suportada` (ocupação aberta) | `urgente` | `piquete_superlotacao` |
| `dias_descanso_acumulado >= dias_descanso_ideal` | `aviso` | `piquete_pronto_entrada` |
| Piquete em `status = 'Em reforma'` há >90 dias (baseado em `updated_at`) | `aviso` | `piquete_reforma_longa` |

### 12.3 Mensagens

```typescript
// piquete_superlotacao
titulo: `Superlotação — ${piquete.nome}`,
descricao: `Piquete com ${uaReal.toFixed(1)} UA/ha (suportado: ${uaSuportada.toFixed(1)} UA/ha)`,
link: `/dashboard/pastagens/${pastagemId}`

// piquete_pronto_entrada
titulo: `Piquete pronto — ${piquete.nome}`,
descricao: `${diasDescanso} dias de descanso (ideal: ${diasIdeal} dias)`,
link: `/dashboard/pastagens/${pastagemId}`

// piquete_reforma_longa
titulo: `Reforma longa — ${piquete.nome}`,
descricao: `Em reforma há ${diasEmReforma} dias`,
link: `/dashboard/pastagens/${pastagemId}`
```

---

## 13. Integração com Tabelas Existentes — Verificações Antes da Migration

Antes de executar a migration, confirmar no banco:

1. **`lotes`**: confirmar colunas `id` (uuid PK), `fazenda_id`, `nome`, `tipo_rebanho` — FK de `ocupacoes_piquete.lote_id`
2. **`animais`**: confirmar colunas `id`, `lote_id`, `categoria`, `status` (enum `status_animal`) — usadas em `calcularUADoLote`
3. **`pesos_animal`**: confirmar colunas `id`, `animal_id`, `peso_kg`, `data_pesagem` — usadas no cálculo de UA por peso real
4. **`insumos`**: confirmar colunas `id`, `nome`, `unidade` — FK opcional de `eventos_manejo_pastagem`
5. **`maquinas`**: confirmar colunas `id`, `nome` — FK opcional de `eventos_manejo_pastagem`
6. **`sou_admin_ou_visualizador()`**: confirmar que existe no banco (criada em 2026-05-19 para módulo Produtos — não recriar)
7. **Função `fn_set_updated_at`** ou equivalente: verificar existência para não duplicar

---

## 14. Ordem de Execução das Migrations

```
1. CREATE TABLE pastagens          (depende: fazendas)
2. CREATE TRIGGER trg_pastagens_fazenda_id
3. CREATE TRIGGER trg_pastagens_updated_at
4. ALTER TABLE pastagens ENABLE ROW LEVEL SECURITY
5. CREATE POLICY pastagens_*

6. CREATE TABLE piquetes           (depende: pastagens, fazendas)
7. CREATE TRIGGER trg_piquetes_fazenda_id
8. CREATE TRIGGER trg_piquetes_updated_at
9. ALTER TABLE piquetes ENABLE ROW LEVEL SECURITY
10. CREATE POLICY piquetes_*

11. CREATE TABLE ocupacoes_piquete  (depende: piquetes, lotes, fazendas)
12. CREATE UNIQUE INDEX idx_ocupacao_aberta_unica
13. CREATE TRIGGER trg_ocupacoes_piquete_fazenda_id
14. CREATE TRIGGER trg_ocupacoes_piquete_updated_at
15. ALTER TABLE ocupacoes_piquete ENABLE ROW LEVEL SECURITY
16. CREATE POLICY ocupacoes_piquete_*

17. CREATE TABLE eventos_manejo_pastagem (depende: piquetes, insumos, maquinas, fazendas)
18. CREATE TRIGGER trg_eventos_manejo_pastagem_fazenda_id
19. ALTER TABLE eventos_manejo_pastagem ENABLE ROW LEVEL SECURITY
20. CREATE POLICY eventos_manejo_pastagem_*

21. CREATE INDEX (todos os índices não-unique não criados acima)
```

---

## 15. Pontos de Atenção para a Execução

1. **`fn_propagar_fazenda_id_via_piquete()`** é compartilhada entre dois triggers (`trg_ocupacoes_piquete_fazenda_id` e `trg_eventos_manejo_pastagem_fazenda_id`). Criar a função uma vez, criar dois triggers.

2. **`fn_set_updated_at()`** — antes de criar, fazer `SELECT proname FROM pg_proc WHERE proname = 'fn_set_updated_at'` para verificar se já existe.

3. **`DISTINCT ON` em pesos_animal** — syntax PostgreSQL válida no Supabase (Postgres 15+). O SDK do Supabase não suporta `DISTINCT ON` via `.select()`. Deve ser executado via `.rpc()` ou query raw no server. Alternativa: buscar todas as pesagens dos últimos 90 dias e filtrar em JS (aceitável para lotes de até ~500 animais).

4. **Joins com relação many-to-one no Supabase SDK** (`pastagens(nome)` em uma query de `piquetes`) requerem `as unknown as TipoLocal[]` no TypeScript, conforme padrão do CLAUDE.md.

5. **Soft-delete de pastagens**: queries de listagem devem sempre incluir `.eq('ativo', true)`. Pastagens arquivadas ainda aparecem no histórico de ocupações (via FK de `ocupacoes_piquete.piquete_id`).

6. **`rocagem` sem cedilha** no CHECK constraint e no enum TypeScript — label da UI é "Roçagem" com cedilha. O schema Zod usa `'rocagem'` (sem cedilha) para ser válido como identificador e valor de banco sem problemas de encoding.

7. **Revalidação de paths**: além de `/dashboard/pastagens`, revalidar `/dashboard` após mutações que afetam alertas (superlotação, pronto para entrada).
