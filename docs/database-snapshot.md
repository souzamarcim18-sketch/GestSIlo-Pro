Database Snapshot — GestSilo Pro

> **Documento gerado em:** _27/04/2026  
> **Banco:** Supabase PostgreSQL (schema `public`)  
> **Versão do snapshot:** 1.0  
> **Documento complementar:** `ARCHITECTURE_REVIEW.md`

---

## 🎯 INSTRUÇÕES PARA O CLAUDE CODE

> **⚠️ LEIA ESTA SEÇÃO ANTES DE QUALQUER ANÁLISE.**

Este documento é um **raio-X fiel do banco de dados em produção** e deve ser usado como **fonte de verdade** ao auditar o código do projeto.

### Sua missão ao analisar este projeto:

Ao receber qualquer pedido de auditoria, refatoração ou implementação de feature, você deve **cruzar o código** com este documento e identificar inconsistências nas seguintes 8 dimensões:

#### ✅ Checklist de validação Front ↔ Back

1. **🔍 Tipos TypeScript ↔ Colunas reais**
   - Verifica se interfaces em `lib/supabase.ts` e `types/` batem com a Seção 3 (Estrutura de Tabelas)
   - Aponta colunas que existem no banco mas não estão tipadas (e vice-versa)
   - Confere se `nullable: YES` no banco está como `| null` no TS

2. **📐 Schemas Zod ↔ CHECK constraints**
   - Cruza schemas em `validators/` com a Seção 9 (CHECK Constraints)
   - Garante que regras de domínio (ex: `valor > 0`) estão **duplicadas** no Zod (validação UX) E no banco (segurança)

3. **🎯 Queries `.select()` ↔ Colunas existentes**
   - Procura `.select('campo1, campo2, ...')` no código
   - Valida que cada campo existe na Seção 3
   - Aponta `select('*')` como anti-pattern (recomenda explicitar colunas)

4. **🤖 Inserções manuais vs Triggers automáticos**
   - Consulta a Seção 5 (Triggers) — colunas preenchidas por trigger **não devem** ser enviadas pelo frontend
   - Caso típico: `fazenda_id`, `created_at`, `updated_at` — alertar se aparecerem em `.insert({...})`

5. **🛡️ RLS PT-BR ↔ Helpers no código**
   - Confere a Seção 4 (Policies RLS) — todas devem estar em PT-BR
   - Procura no código por chamadas a helpers **legados**:
     - ❌ `get_my_fazenda_id` (antigo) → deve ser ✅ `get_minha_fazenda_id`
     - ❌ `is_admin_or_manager` → deve ser ✅ `sou_gerente_ou_admin`
   - Alerta sobre `.rpc('nome_legado')` no código

6. **📋 TODOs do `ARCHITECTURE_REVIEW.md` resolvidos?**
   - Bromatologia: tabela `avaliacoes_bromatologicas` tem RLS? Frontend grava nela?
   - PSPS: tabela `avaliacoes_psps` tem RLS? Frontend grava nela?
   - Insumos: integração com `financeiro` ao registrar despesa?
   - Cruzar com Seção 7 (Volume de Dados) — se `registros_estimados = 0`, TODO ainda aberto

7. **🚫 Operações de DELETE alinhadas com policies**
   - Para cada `.delete()` no código, conferir Seção 4:
     - Se policy é `*_delete_admin_gerente`, o botão de delete só pode aparecer pra admin/gerente no UI
     - Procurar componentes que chamam delete sem checar `profile.role`
   - Apontar inconsistências (ex: operador vendo botão "Excluir" que sempre falha)

8. **⚡ Performance — queries usam colunas indexadas?**
   - Cruzar `.eq('coluna', valor)` e `.order('coluna')` com a Seção 6 (Índices)
   - Apontar filtros frequentes em colunas **sem índice**
   - Sugerir criação de índice quando justificável

### 🎨 Formato esperado das suas respostas

Quando encontrar inconsistências, responda **sempre** assim:

```
INCONSISTÊNCIA #N — [Título curto]
Arquivo: caminho/do/arquivo.ts:linha
Banco diz: [referência à seção do snapshot]
Código diz: [trecho problemático]
Risco: [alto/médio/baixo + impacto]
Sugestão: [correção concreta]
```

### ⚠️ Regras invioláveis

- ❌ **NÃO altere policies, triggers ou funções** sem pedido explícito
- ❌ **NÃO sugira refatorar nomes em PT-BR** (foi decisão arquitetural consciente)
- ❌ **NÃO crie tabelas novas** sem antes confirmar com o usuário
- ✅ **SEMPRE consulte este documento** antes de afirmar algo sobre o schema
- ✅ **SEMPRE valide** que a coluna/tabela mencionada existe na Seção 3

---

## 📋 SEÇÃO 1 — METADADOS DO PROJETO

| Item | Valor |
|---|---|
| Stack | Next.js 15 + React 19 + Supabase + TypeScript 5.9 |
| Banco | PostgreSQL (Supabase Cloud — Tier Gratuito) |
| Total de tabelas | 23 |
| Total de policies RLS | 90 |
| Idioma das policies | 🇧🇷 PT-BR (padronizado) |
| Hardening RLS concluído em | Abril/2026 |
| Multitenancy | Por `fazenda_id` (RLS) |
| Helpers ativos | `get_minha_fazenda_id()`, `sou_gerente_ou_admin()` |

---

## 🏗️ SEÇÃO 2 — CONVENÇÕES DO SCHEMA

### Padrão de nomenclatura de policies
```
{tabela}_{operacao}_{escopo}

operacao: select | insert | update | delete
escopo:   todos | admin_gerente | proprios | self | publico
```

### Tabelas globais (catálogo público)
- `categorias_insumo` → leitura pública, escrita só via `service_role`
- `tipos_insumo` → leitura pública, escrita só via `service_role`

### Roles do sistema
- `admin` — acesso total
- `gerente` — acesso total exceto configurações críticas
- `operador` — leitura ampla + insert/update; **sem DELETE** na maioria das tabelas
- `visualizador` — apenas leitura

---

## 📊 SEÇÃO 3 — ESTRUTURA DE TABELAS E COLUNAS

> **Fonte:** Query 1 do snapshot SQL  
> **Use isto como referência canônica de tipos e colunas existentes.**

<-- 1. ESTRUTURA DE TABELAS E COLUNAS
SELECT 
  c.table_name AS tabela,
  c.column_name AS coluna,
  c.data_type AS tipo,
  c.is_nullable AS nullable,
  c.column_default AS default_value,
  CASE 
    WHEN pk.column_name IS NOT NULL THEN 'PK'
    WHEN fk.column_name IS NOT NULL THEN 'FK → ' || fk.foreign_table || '.' || fk.foreign_column
    ELSE ''
  END AS chave
FROM information_schema.columns c
LEFT JOIN (
  SELECT kcu.table_name, kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
) pk ON pk.table_name = c.table_name AND pk.column_name = c.column_name
LEFT JOIN (
  SELECT 
    kcu.table_name, kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
) fk ON fk.table_name = c.table_name AND fk.column_name = c.column_name
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;
>

| tabela                    | coluna                       | tipo                        | nullable | default_value                  | chave                     |
| ------------------------- | ---------------------------- | --------------------------- | -------- | ------------------------------ | ------------------------- |
| abastecimentos            | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| abastecimentos            | maquina_id                   | uuid                        | YES      | null                           | FK → maquinas.id          |
| abastecimentos            | data                         | date                        | NO       | CURRENT_DATE                   |                           |
| abastecimentos            | combustivel                  | text                        | YES      | null                           |                           |
| abastecimentos            | litros                       | numeric                     | YES      | null                           |                           |
| abastecimentos            | valor                        | numeric                     | YES      | null                           |                           |
| abastecimentos            | hodometro                    | numeric                     | YES      | null                           |                           |
| abastecimentos            | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| abastecimentos            | fazenda_id                   | uuid                        | NO       | null                           | FK → fazendas.id          |
| abastecimentos            | fazenda_id                   | uuid                        | NO       | null                           | FK → fazendas.id          |
| abastecimentos            | preco_litro                  | numeric                     | YES      | null                           |                           |
| abastecimentos            | fornecedor                   | text                        | YES      | null                           |                           |
| abastecimentos            | horimetro                    | numeric                     | YES      | null                           |                           |
| abastecimentos            | created_by                   | uuid                        | YES      | auth.uid()                     |                           |
| atividades_campo          | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| atividades_campo          | ciclo_id                     | uuid                        | NO       | null                           | FK → ciclos_agricolas.id  |
| atividades_campo          | talhao_id                    | uuid                        | NO       | null                           | FK → talhoes.id           |
| atividades_campo          | tipo_operacao                | character varying           | NO       | null                           |                           |
| atividades_campo          | data                         | date                        | NO       | null                           |                           |
| atividades_campo          | maquina_id                   | uuid                        | YES      | null                           | FK → maquinas.id          |
| atividades_campo          | horas_maquina                | numeric                     | YES      | null                           |                           |
| atividades_campo          | observacoes                  | text                        | YES      | null                           |                           |
| atividades_campo          | custo_total                  | numeric                     | NO       | 0                              |                           |
| atividades_campo          | custo_manual                 | numeric                     | YES      | null                           |                           |
| atividades_campo          | tipo_operacao_solo           | character varying           | YES      | null                           |                           |
| atividades_campo          | insumo_id                    | uuid                        | YES      | null                           | FK → insumos.id           |
| atividades_campo          | dose_ton_ha                  | numeric                     | YES      | null                           |                           |
| atividades_campo          | semente_id                   | uuid                        | YES      | null                           | FK → insumos.id           |
| atividades_campo          | populacao_plantas_ha         | numeric                     | YES      | null                           |                           |
| atividades_campo          | sacos_ha                     | numeric                     | YES      | null                           |                           |
| atividades_campo          | espacamento_entre_linhas_cm  | numeric                     | YES      | null                           |                           |
| atividades_campo          | categoria_pulverizacao       | character varying           | YES      | null                           |                           |
| atividades_campo          | dose_valor                   | numeric                     | YES      | null                           |                           |
| atividades_campo          | dose_unidade                 | character varying           | YES      | null                           |                           |
| atividades_campo          | volume_calda_l_ha            | numeric                     | YES      | null                           |                           |
| atividades_campo          | produtividade_ton_ha         | numeric                     | YES      | null                           |                           |
| atividades_campo          | maquina_colheita_id          | uuid                        | YES      | null                           | FK → maquinas.id          |
| atividades_campo          | horas_colheita               | numeric                     | YES      | null                           |                           |
| atividades_campo          | maquina_transporte_id        | uuid                        | YES      | null                           | FK → maquinas.id          |
| atividades_campo          | horas_transporte             | numeric                     | YES      | null                           |                           |
| atividades_campo          | maquina_compactacao_id       | uuid                        | YES      | null                           | FK → maquinas.id          |
| atividades_campo          | horas_compactacao            | numeric                     | YES      | null                           |                           |
| atividades_campo          | valor_terceirizacao_r        | numeric                     | YES      | null                           |                           |
| atividades_campo          | custo_amostra_r              | numeric                     | YES      | null                           |                           |
| atividades_campo          | metodo_entrada               | character varying           | YES      | null                           |                           |
| atividades_campo          | url_pdf_analise              | character varying           | YES      | null                           |                           |
| atividades_campo          | ph_cacl2                     | numeric                     | YES      | null                           |                           |
| atividades_campo          | mo_g_dm3                     | numeric                     | YES      | null                           |                           |
| atividades_campo          | p_mg_dm3                     | numeric                     | YES      | null                           |                           |
| atividades_campo          | k_mmolc_dm3                  | numeric                     | YES      | null                           |                           |
| atividades_campo          | ca_mmolc_dm3                 | numeric                     | YES      | null                           |                           |
| atividades_campo          | mg_mmolc_dm3                 | numeric                     | YES      | null                           |                           |
| atividades_campo          | al_mmolc_dm3                 | numeric                     | YES      | null                           |                           |
| atividades_campo          | h_al_mmolc_dm3               | numeric                     | YES      | null                           |                           |
| atividades_campo          | s_mg_dm3                     | numeric                     | YES      | null                           |                           |
| atividades_campo          | b_mg_dm3                     | numeric                     | YES      | null                           |                           |
| atividades_campo          | cu_mg_dm3                    | numeric                     | YES      | null                           |                           |
| atividades_campo          | fe_mg_dm3                    | numeric                     | YES      | null                           |                           |
| atividades_campo          | mn_mg_dm3                    | numeric                     | YES      | null                           |                           |
| atividades_campo          | zn_mg_dm3                    | numeric                     | YES      | null                           |                           |
| atividades_campo          | sb_mmolc_dm3                 | numeric                     | YES      | null                           |                           |
| atividades_campo          | ctc_mmolc_dm3                | numeric                     | YES      | null                           |                           |
| atividades_campo          | v_percent                    | numeric                     | YES      | null                           |                           |
| atividades_campo          | lamina_mm                    | numeric                     | YES      | null                           |                           |
| atividades_campo          | horas_irrigacao              | numeric                     | YES      | null                           |                           |
| atividades_campo          | custo_por_hora_r             | numeric                     | YES      | null                           |                           |
| atividades_campo          | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| atividades_campo          | updated_at                   | timestamp with time zone    | YES      | now()                          |                           |
| atividades_campo          | fazenda_id                   | uuid                        | NO       | null                           | FK → fazendas.id          |
| atividades_campo          | permite_rebrota              | boolean                     | YES      | false                          |                           |
| atividades_campo          | created_by                   | uuid                        | YES      | null                           |                           |
| avaliacoes_bromatologicas | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| avaliacoes_bromatologicas | silo_id                      | uuid                        | NO       | null                           | FK → silos.id             |
| avaliacoes_bromatologicas | data                         | date                        | NO       | null                           |                           |
| avaliacoes_bromatologicas | momento                      | character varying           | NO       | null                           |                           |
| avaliacoes_bromatologicas | ms                           | numeric                     | YES      | null                           |                           |
| avaliacoes_bromatologicas | pb                           | numeric                     | YES      | null                           |                           |
| avaliacoes_bromatologicas | fdn                          | numeric                     | YES      | null                           |                           |
| avaliacoes_bromatologicas | fda                          | numeric                     | YES      | null                           |                           |
| avaliacoes_bromatologicas | amido                        | numeric                     | YES      | null                           |                           |
| avaliacoes_bromatologicas | ndt                          | numeric                     | YES      | null                           |                           |
| avaliacoes_bromatologicas | ph                           | numeric                     | YES      | null                           |                           |
| avaliacoes_bromatologicas | avaliador                    | character varying           | YES      | null                           |                           |
| avaliacoes_bromatologicas | created_at                   | timestamp without time zone | YES      | now()                          |                           |
| avaliacoes_bromatologicas | updated_at                   | timestamp without time zone | YES      | now()                          |                           |
| avaliacoes_bromatologicas | fazenda_id                   | uuid                        | NO       | null                           | FK → fazendas.id          |
| avaliacoes_psps           | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| avaliacoes_psps           | silo_id                      | uuid                        | NO       | null                           | FK → silos.id             |
| avaliacoes_psps           | data                         | date                        | NO       | null                           |                           |
| avaliacoes_psps           | momento                      | character varying           | NO       | null                           |                           |
| avaliacoes_psps           | peneira_19mm                 | numeric                     | NO       | null                           |                           |
| avaliacoes_psps           | peneira_8_19mm               | numeric                     | NO       | null                           |                           |
| avaliacoes_psps           | peneira_4_8mm                | numeric                     | NO       | null                           |                           |
| avaliacoes_psps           | peneira_fundo_4mm            | numeric                     | NO       | null                           |                           |
| avaliacoes_psps           | tamanho_teorico_corte_mm     | numeric                     | YES      | null                           |                           |
| avaliacoes_psps           | kernel_processor             | boolean                     | YES      | false                          |                           |
| avaliacoes_psps           | avaliador                    | character varying           | YES      | null                           |                           |
| avaliacoes_psps           | created_at                   | timestamp without time zone | YES      | now()                          |                           |
| avaliacoes_psps           | updated_at                   | timestamp without time zone | YES      | now()                          |                           |
| avaliacoes_psps           | tmp_mm                       | numeric                     | YES      | null                           |                           |
| avaliacoes_psps           | fazenda_id                   | uuid                        | NO       | null                           | FK → fazendas.id          |
| avaliacoes_psps           | created_by                   | uuid                        | YES      | null                           |                           |
| categorias_insumo         | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| categorias_insumo         | nome                         | character varying           | NO       | null                           |                           |
| categorias_insumo         | descricao                    | text                        | YES      | null                           |                           |
| categorias_insumo         | ativo                        | boolean                     | YES      | true                           |                           |
| categorias_insumo         | criado_em                    | timestamp with time zone    | YES      | now()                          |                           |
| categorias_rebanho        | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| categorias_rebanho        | fazenda_id                   | uuid                        | NO       | null                           | FK → fazendas.id          |
| categorias_rebanho        | nome                         | text                        | NO       | null                           |                           |
| categorias_rebanho        | quantidade_cabecas           | integer                     | NO       | 0                              |                           |
| categorias_rebanho        | consumo_ms_kg_cab_dia        | numeric                     | NO       | null                           |                           |
| categorias_rebanho        | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| ciclos_agricolas          | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| ciclos_agricolas          | talhao_id                    | uuid                        | NO       | null                           | FK → talhoes.id           |
| ciclos_agricolas          | cultura                      | character varying           | NO       | null                           |                           |
| ciclos_agricolas          | data_plantio                 | date                        | NO       | null                           |                           |
| ciclos_agricolas          | data_colheita_prevista       | date                        | NO       | null                           |                           |
| ciclos_agricolas          | data_colheita_real           | date                        | YES      | null                           |                           |
| ciclos_agricolas          | produtividade_ton_ha         | numeric                     | YES      | null                           |                           |
| ciclos_agricolas          | custo_total_estimado         | numeric                     | YES      | null                           |                           |
| ciclos_agricolas          | permite_rebrota              | boolean                     | YES      | false                          |                           |
| ciclos_agricolas          | ativo                        | boolean                     | YES      | true                           |                           |
| ciclos_agricolas          | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| ciclos_agricolas          | updated_at                   | timestamp with time zone    | YES      | now()                          |                           |
| ciclos_agricolas          | fazenda_id                   | uuid                        | NO       | null                           | FK → fazendas.id          |
| eventos_dap               | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| eventos_dap               | ciclo_id                     | uuid                        | NO       | null                           | FK → ciclos_agricolas.id  |
| eventos_dap               | talhao_id                    | uuid                        | NO       | null                           | FK → talhoes.id           |
| eventos_dap               | cultura                      | character varying           | NO       | null                           |                           |
| eventos_dap               | tipo_operacao                | character varying           | NO       | null                           |                           |
| eventos_dap               | dias_apos_plantio            | integer                     | NO       | null                           |                           |
| eventos_dap               | dias_apos_plantio_final      | integer                     | YES      | null                           |                           |
| eventos_dap               | data_esperada                | date                        | YES      | null                           |                           |
| eventos_dap               | data_realizada               | date                        | YES      | null                           |                           |
| eventos_dap               | status                       | character varying           | YES      | 'Planejado'::character varying |                           |
| eventos_dap               | atividade_campo_id           | uuid                        | YES      | null                           | FK → atividades_campo.id  |
| eventos_dap               | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| eventos_dap               | updated_at                   | timestamp with time zone    | YES      | now()                          |                           |
| eventos_dap               | fazenda_id                   | uuid                        | NO       | null                           | FK → fazendas.id          |
| fazendas                  | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| fazendas                  | nome                         | text                        | NO       | null                           |                           |
| fazendas                  | localizacao                  | text                        | YES      | null                           |                           |
| fazendas                  | area_total                   | numeric                     | YES      | null                           |                           |
| fazendas                  | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| fazendas                  | owner_id                     | uuid                        | NO       | auth.uid()                     |                           |
| fazendas                  | latitude                     | double precision            | YES      | null                           |                           |
| fazendas                  | longitude                    | double precision            | YES      | null                           |                           |
| financeiro                | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| financeiro                | tipo                         | text                        | NO       | null                           |                           |
| financeiro                | descricao                    | text                        | NO       | null                           |                           |
| financeiro                | categoria                    | text                        | NO       | null                           |                           |
| financeiro                | valor                        | numeric                     | NO       | null                           |                           |
| financeiro                | data                         | date                        | NO       | CURRENT_DATE                   |                           |
| financeiro                | forma_pagamento              | text                        | YES      | null                           |                           |
| financeiro                | referencia_id                | uuid                        | YES      | null                           |                           |
| financeiro                | referencia_tipo              | text                        | YES      | null                           |                           |
| financeiro                | fazenda_id                   | uuid                        | YES      | null                           | FK → fazendas.id          |
| financeiro                | created_at                   | timestamp with time zone    | YES      | CURRENT_TIMESTAMP              |                           |
| insumos                   | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| insumos                   | nome                         | text                        | NO       | null                           |                           |
| insumos                   | unidade                      | text                        | NO       | null                           |                           |
| insumos                   | estoque_minimo               | numeric                     | YES      | 0                              |                           |
| insumos                   | estoque_atual                | numeric                     | YES      | 0                              |                           |
| insumos                   | fazenda_id                   | uuid                        | YES      | null                           | FK → fazendas.id          |
| insumos                   | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| insumos                   | teor_n_percent               | numeric                     | YES      | 0                              |                           |
| insumos                   | teor_p_percent               | numeric                     | YES      | 0                              |                           |
| insumos                   | teor_k_percent               | numeric                     | YES      | 0                              |                           |
| insumos                   | preco_unitario               | numeric                     | YES      | null                           |                           |
| insumos                   | categoria_id                 | uuid                        | YES      | null                           | FK → categorias_insumo.id |
| insumos                   | tipo_id                      | uuid                        | YES      | null                           | FK → tipos_insumo.id      |
| insumos                   | custo_medio                  | numeric                     | YES      | 0                              |                           |
| insumos                   | fornecedor                   | character varying           | YES      | null                           |                           |
| insumos                   | local_armazen                | character varying           | YES      | null                           |                           |
| insumos                   | observacoes                  | text                        | YES      | null                           |                           |
| insumos                   | ativo                        | boolean                     | YES      | true                           |                           |
| insumos                   | criado_por                   | uuid                        | YES      | null                           |                           |
| insumos                   | atualizado_por               | uuid                        | YES      | null                           |                           |
| insumos                   | atualizado_em                | timestamp with time zone    | NO       | now()                          |                           |
| insumos                   | data_cadastro                | date                        | YES      | CURRENT_DATE                   |                           |
| manutencoes               | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| manutencoes               | maquina_id                   | uuid                        | YES      | null                           | FK → maquinas.id          |
| manutencoes               | data                         | date                        | NO       | null                           |                           |
| manutencoes               | tipo                         | text                        | NO       | null                           |                           |
| manutencoes               | descricao                    | text                        | YES      | null                           |                           |
| manutencoes               | custo                        | numeric                     | YES      | null                           |                           |
| manutencoes               | proxima_manutencao           | date                        | YES      | null                           |                           |
| manutencoes               | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| manutencoes               | fazenda_id                   | uuid                        | YES      | null                           | FK → fazendas.id          |
| manutencoes               | status                       | text                        | YES      | 'aberta'::text                 |                           |
| manutencoes               | data_prevista                | date                        | YES      | null                           |                           |
| manutencoes               | data_realizada               | date                        | YES      | null                           |                           |
| manutencoes               | horimetro                    | numeric                     | YES      | null                           |                           |
| manutencoes               | proxima_manutencao_horimetro | numeric                     | YES      | null                           |                           |
| manutencoes               | responsavel                  | text                        | YES      | null                           |                           |
| manutencoes               | mao_de_obra_tipo             | text                        | YES      | null                           |                           |
| manutencoes               | mao_de_obra_valor            | numeric                     | YES      | null                           |                           |
| manutencoes               | pecas                        | jsonb                       | YES      | '[]'::jsonb                    |                           |
| manutencoes               | created_by                   | uuid                        | YES      | null                           |                           |
| maquinas                  | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| maquinas                  | nome                         | text                        | NO       | null                           |                           |
| maquinas                  | tipo                         | text                        | NO       | null                           |                           |
| maquinas                  | marca                        | text                        | YES      | null                           |                           |
| maquinas                  | modelo                       | text                        | YES      | null                           |                           |
| maquinas                  | ano                          | integer                     | YES      | null                           |                           |
| maquinas                  | identificacao                | text                        | YES      | null                           |                           |
| maquinas                  | fazenda_id                   | uuid                        | YES      | null                           | FK → fazendas.id          |
| maquinas                  | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| maquinas                  | consumo_medio_lh             | numeric                     | YES      | null                           |                           |
| maquinas                  | valor_aquisicao              | numeric                     | YES      | null                           |                           |
| maquinas                  | data_aquisicao               | date                        | YES      | null                           |                           |
| maquinas                  | vida_util_anos               | integer                     | YES      | 10                             |                           |
| maquinas                  | custo_hora                   | numeric                     | YES      | null                           |                           |
| maquinas                  | status                       | text                        | YES      | null                           |                           |
| maquinas                  | numero_serie                 | text                        | YES      | null                           |                           |
| maquinas                  | placa                        | text                        | YES      | null                           |                           |
| maquinas                  | potencia_cv                  | numeric                     | YES      | null                           |                           |
| maquinas                  | horimetro_atual              | numeric                     | YES      | null                           |                           |
| maquinas                  | valor_residual               | numeric                     | YES      | null                           |                           |
| maquinas                  | vida_util_horas              | numeric                     | YES      | null                           |                           |
| maquinas                  | largura_trabalho_metros      | numeric                     | YES      | null                           |                           |
| maquinas                  | tratores_compativeis         | ARRAY                       | YES      | null                           |                           |
| movimentacoes_insumo      | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| movimentacoes_insumo      | insumo_id                    | uuid                        | YES      | null                           | FK → insumos.id           |
| movimentacoes_insumo      | tipo                         | text                        | NO       | null                           |                           |
| movimentacoes_insumo      | quantidade                   | numeric                     | NO       | null                           |                           |
| movimentacoes_insumo      | data                         | date                        | NO       | CURRENT_DATE                   |                           |
| movimentacoes_insumo      | responsavel                  | text                        | YES      | null                           |                           |
| movimentacoes_insumo      | valor_unitario               | numeric                     | YES      | null                           |                           |
| movimentacoes_insumo      | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| movimentacoes_insumo      | tipo_saida                   | character varying           | YES      | null                           |                           |
| movimentacoes_insumo      | destino_tipo                 | character varying           | YES      | null                           |                           |
| movimentacoes_insumo      | destino_id                   | uuid                        | YES      | null                           |                           |
| movimentacoes_insumo      | observacoes                  | text                        | YES      | null                           |                           |
| movimentacoes_insumo      | origem                       | character varying           | YES      | 'manual'::character varying    |                           |
| movimentacoes_insumo      | sinal_ajuste                 | smallint                    | YES      | null                           |                           |
| movimentacoes_insumo      | despesa_id                   | uuid                        | YES      | null                           | FK → financeiro.id        |
| movimentacoes_insumo      | criado_por                   | uuid                        | YES      | null                           |                           |
| movimentacoes_silo        | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| movimentacoes_silo        | silo_id                      | uuid                        | YES      | null                           | FK → silos.id             |
| movimentacoes_silo        | tipo                         | text                        | NO       | null                           |                           |
| movimentacoes_silo        | quantidade                   | numeric                     | NO       | null                           |                           |
| movimentacoes_silo        | data                         | date                        | NO       | CURRENT_DATE                   |                           |
| movimentacoes_silo        | talhao_id                    | uuid                        | YES      | null                           |                           |
| movimentacoes_silo        | responsavel                  | text                        | YES      | null                           |                           |
| movimentacoes_silo        | observacao                   | text                        | YES      | null                           |                           |
| movimentacoes_silo        | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| movimentacoes_silo        | subtipo                      | character varying           | YES      | null                           |                           |
| movimentacoes_silo        | fazenda_id                   | uuid                        | NO       | null                           | FK → fazendas.id          |
| movimentacoes_silo        | created_by                   | uuid                        | YES      | null                           |                           |
| periodos_confinamento     | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| periodos_confinamento     | fazenda_id                   | uuid                        | NO       | null                           | FK → fazendas.id          |
| periodos_confinamento     | nome                         | text                        | NO       | null                           |                           |
| periodos_confinamento     | data_inicio                  | date                        | NO       | null                           |                           |
| periodos_confinamento     | data_fim                     | date                        | NO       | null                           |                           |
| periodos_confinamento     | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| planejamentos_silagem     | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| planejamentos_silagem     | fazenda_id                   | uuid                        | NO       | null                           | FK → fazendas.id          |
| planejamentos_silagem     | nome                         | text                        | NO       | null                           |                           |
| planejamentos_silagem     | sistema                      | jsonb                       | NO       | null                           |                           |
| planejamentos_silagem     | rebanho                      | jsonb                       | NO       | null                           |                           |
| planejamentos_silagem     | parametros                   | jsonb                       | NO       | null                           |                           |
| planejamentos_silagem     | resultados                   | jsonb                       | NO       | null                           |                           |
| planejamentos_silagem     | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| planejamentos_silagem     | updated_at                   | timestamp with time zone    | YES      | now()                          |                           |
| planos_manutencao         | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| planos_manutencao         | maquina_id                   | uuid                        | NO       | null                           | FK → maquinas.id          |
| planos_manutencao         | descricao                    | text                        | NO       | null                           |                           |
| planos_manutencao         | intervalo_horas              | integer                     | YES      | null                           |                           |
| planos_manutencao         | intervalo_dias               | integer                     | YES      | null                           |                           |
| planos_manutencao         | horimetro_base               | numeric                     | YES      | null                           |                           |
| planos_manutencao         | data_base                    | date                        | YES      | null                           |                           |
| planos_manutencao         | ativo                        | boolean                     | NO       | true                           |                           |
| planos_manutencao         | fazenda_id                   | uuid                        | NO       | null                           | FK → fazendas.id          |
| planos_manutencao         | created_at                   | timestamp with time zone    | NO       | now()                          |                           |
| profiles                  | id                           | uuid                        | NO       | null                           | PK                        |
| profiles                  | nome                         | text                        | NO       | null                           |                           |
| profiles                  | email                        | text                        | NO       | null                           |                           |
| profiles                  | perfil                       | text                        | NO       | 'Operador'::text               |                           |
| profiles                  | fazenda_id                   | uuid                        | YES      | null                           | FK → fazendas.id          |
| profiles                  | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| silos                     | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| silos                     | nome                         | text                        | NO       | null                           |                           |
| silos                     | tipo                         | text                        | NO       | null                           |                           |
| silos                     | fazenda_id                   | uuid                        | YES      | null                           | FK → fazendas.id          |
| silos                     | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| silos                     | materia_seca_percent         | numeric                     | YES      | null                           |                           |
| silos                     | insumo_lona_id               | uuid                        | YES      | null                           | FK → insumos.id           |
| silos                     | insumo_inoculante_id         | uuid                        | YES      | null                           | FK → insumos.id           |
| silos                     | estoque_atual                | numeric                     | YES      | 0                              |                           |
| silos                     | talhao_id                    | uuid                        | YES      | null                           | FK → talhoes.id           |
| silos                     | cultura_ensilada             | character varying           | YES      | null                           |                           |
| silos                     | data_fechamento              | date                        | YES      | null                           |                           |
| silos                     | data_abertura_prevista       | date                        | YES      | null                           |                           |
| silos                     | data_abertura_real           | date                        | YES      | null                           |                           |
| silos                     | volume_ensilado_ton_mv       | numeric                     | YES      | null                           |                           |
| silos                     | comprimento_m                | numeric                     | YES      | null                           |                           |
| silos                     | largura_m                    | numeric                     | YES      | null                           |                           |
| silos                     | altura_m                     | numeric                     | YES      | null                           |                           |
| silos                     | observacoes_gerais           | text                        | YES      | null                           |                           |
| silos                     | custo_producao               | numeric                     | YES      | 0                              |                           |
| silos                     | custo_aquisicao_rs_ton       | numeric                     | YES      | null                           |                           |
| talhoes                   | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| talhoes                   | fazenda_id                   | uuid                        | NO       | null                           | FK → fazendas.id          |
| talhoes                   | nome                         | character varying           | NO       | null                           |                           |
| talhoes                   | area_ha                      | numeric                     | NO       | null                           |                           |
| talhoes                   | tipo_solo                    | character varying           | NO       | null                           |                           |
| talhoes                   | status                       | character varying           | NO       | 'Em pousio'::character varying |                           |
| talhoes                   | observacoes                  | text                        | YES      | null                           |                           |
| talhoes                   | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| talhoes                   | updated_at                   | timestamp with time zone    | YES      | now()                          |                           |
| talhoes                   | custo_producao               | numeric                     | YES      | 0                              |                           |
| tipos_insumo              | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| tipos_insumo              | categoria_id                 | uuid                        | NO       | null                           | FK → categorias_insumo.id |
| tipos_insumo              | nome                         | character varying           | NO       | null                           |                           |
| tipos_insumo              | descricao                    | text                        | YES      | null                           |                           |
| tipos_insumo              | ativo                        | boolean                     | YES      | true                           |                           |
| tipos_insumo              | criado_em                    | timestamp with time zone    | YES      | now()                          |                           |
| uso_maquinas              | id                           | uuid                        | NO       | gen_random_uuid()              | PK                        |
| uso_maquinas              | maquina_id                   | uuid                        | YES      | null                           | FK → maquinas.id          |
| uso_maquinas              | data                         | date                        | NO       | CURRENT_DATE                   |                           |
| uso_maquinas              | horas                        | numeric                     | YES      | null                           |                           |
| uso_maquinas              | km                           | numeric                     | YES      | null                           |                           |
| uso_maquinas              | created_at                   | timestamp with time zone    | YES      | now()                          |                           |
| uso_maquinas              | fazenda_id                   | uuid                        | NO       | null                           | FK → fazendas.id          |
| uso_maquinas              | fazenda_id                   | uuid                        | NO       | null                           | FK → fazendas.id          |
| uso_maquinas              | horimetro_inicio             | numeric                     | YES      | null                           |                           |
| uso_maquinas              | horimetro_fim                | numeric                     | YES      | null                           |                           |
| uso_maquinas              | implemento_id                | uuid                        | YES      | null                           | FK → maquinas.id          |
| uso_maquinas              | talhao_id                    | uuid                        | YES      | null                           | FK → talhoes.id           |
| uso_maquinas              | tipo_operacao                | text                        | YES      | null                           |                           |
| uso_maquinas              | area_ha                      | numeric                     | YES      | null                           |                           |
| uso_maquinas              | origem                       | text                        | YES      | 'manual'::text                 |                           |
| uso_maquinas              | created_by                   | uuid                        | YES      | auth.uid()                     |                           |```
```

---

## 🛡️ SEÇÃO 4 — POLICIES RLS COMPLETAS

> **Fonte:** Query 2 do snapshot SQL  
> **Use isto para validar permissões de leitura/escrita por role.**

-- 2. POLICIES RLS COMPLETAS
SELECT 
  tablename AS tabela,
  policyname AS policy,
  cmd AS operacao,
  roles AS roles,
  qual AS using_clause,
  with_check AS check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;


```
| tabela                    | policy                                         | operacao | roles           | using_clause                                                                                                                                           | check_clause                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| abastecimentos            | abastecimentos_delete_admin_gerente            | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | null                                                                                                                                                                                                                                                                                                                                                                               |
| abastecimentos            | abastecimentos_insert_todos                    | INSERT   | {authenticated} | null                                                                                                                                                   | ((fazenda_id = get_minha_fazenda_id()) AND (sou_gerente_ou_admin() OR (created_by = auth.uid())))                                                                                                                                                                                                                                                                                  |
| abastecimentos            | abastecimentos_select_todos                    | SELECT   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | null                                                                                                                                                                                                                                                                                                                                                                               |
| abastecimentos            | abastecimentos_update_admin_gerente            | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                 |
| atividades_campo          | atividades_campo_delete_admin_gerente          | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | null                                                                                                                                                                                                                                                                                                                                                                               |
| atividades_campo          | atividades_campo_insert_todos                  | INSERT   | {authenticated} | null                                                                                                                                                   | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| atividades_campo          | atividades_campo_select_todos                  | SELECT   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | null                                                                                                                                                                                                                                                                                                                                                                               |
| atividades_campo          | atividades_campo_update_operador_recente       | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND (created_by = auth.uid()) AND (created_at > (now() - '24:00:00'::interval)))                                | ((fazenda_id = get_minha_fazenda_id()) AND (created_by = auth.uid()))                                                                                                                                                                                                                                                                                                              |
| atividades_campo          | atividades_campo_update_admin_gerente          | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| avaliacoes_bromatologicas | avaliacoes_bromatologicas_delete_admin_gerente | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | null                                                                                                                                                                                                                                                                                                                                                                               |
| avaliacoes_bromatologicas | avaliacoes_bromatologicas_insert_admin_gerente | INSERT   | {authenticated} | null                                                                                                                                                   | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                 |
| avaliacoes_bromatologicas | avaliacoes_bromatologicas_select_todos         | SELECT   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | null                                                                                                                                                                                                                                                                                                                                                                               |
| avaliacoes_bromatologicas | avaliacoes_bromatologicas_update_admin_gerente | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| avaliacoes_psps           | avaliacoes_psps_delete_admin_gerente           | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | null                                                                                                                                                                                                                                                                                                                                                                               |
| avaliacoes_psps           | avaliacoes_psps_insert_todos                   | INSERT   | {authenticated} | null                                                                                                                                                   | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| avaliacoes_psps           | avaliacoes_psps_select_todos                   | SELECT   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | null                                                                                                                                                                                                                                                                                                                                                                               |
| avaliacoes_psps           | avaliacoes_psps_update_admin_gerente           | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| avaliacoes_psps           | avaliacoes_psps_update_operador_recente        | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND (created_by = auth.uid()) AND (created_at > ((now())::timestamp without time zone - '24:00:00'::interval))) | ((fazenda_id = get_minha_fazenda_id()) AND (created_by = auth.uid()))                                                                                                                                                                                                                                                                                                              |
| categorias_insumo         | categorias_insumo_select_publico               | SELECT   | {authenticated} | true                                                                                                                                                   | null                                                                                                                                                                                                                                                                                                                                                                               |
| categorias_rebanho        | categorias_rebanho_delete_admin_gerente        | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | null                                                                                                                                                                                                                                                                                                                                                                               |
| categorias_rebanho        | categorias_rebanho_insert_admin_gerente        | INSERT   | {authenticated} | null                                                                                                                                                   | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                 |
| categorias_rebanho        | categorias_rebanho_select_todos                | SELECT   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | null                                                                                                                                                                                                                                                                                                                                                                               |
| categorias_rebanho        | categorias_rebanho_update_admin_gerente        | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| ciclos_agricolas          | ciclos_agricolas_delete_admin_gerente          | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | null                                                                                                                                                                                                                                                                                                                                                                               |
| ciclos_agricolas          | ciclos_agricolas_insert_admin_gerente          | INSERT   | {authenticated} | null                                                                                                                                                   | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                 |
| ciclos_agricolas          | ciclos_agricolas_select_todos                  | SELECT   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | null                                                                                                                                                                                                                                                                                                                                                                               |
| ciclos_agricolas          | ciclos_agricolas_update_admin_gerente          | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| eventos_dap               | eventos_dap_delete_admin_gerente               | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | null                                                                                                                                                                                                                                                                                                                                                                               |
| eventos_dap               | eventos_dap_insert_admin_gerente               | INSERT   | {authenticated} | null                                                                                                                                                   | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                 |
| eventos_dap               | eventos_dap_select_todos                       | SELECT   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | null                                                                                                                                                                                                                                                                                                                                                                               |
| eventos_dap               | eventos_dap_update_admin_gerente               | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| fazendas                  | fazendas_insert_permitido                      | INSERT   | {authenticated} | null                                                                                                                                                   | posso_criar_fazenda()                                                                                                                                                                                                                                                                                                                                                              |
| fazendas                  | fazendas_select_membros                        | SELECT   | {authenticated} | (id = get_minha_fazenda_id())                                                                                                                          | null                                                                                                                                                                                                                                                                                                                                                                               |
| fazendas                  | fazendas_update_admin_gerente                  | UPDATE   | {authenticated} | ((id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                             | ((id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                         |
| financeiro                | financeiro_delete_admin                        | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_admin())                                                                                                | null                                                                                                                                                                                                                                                                                                                                                                               |
| financeiro                | financeiro_insert_admin_gerente                | INSERT   | {authenticated} | null                                                                                                                                                   | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                 |
| financeiro                | financeiro_select_admin_gerente                | SELECT   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | null                                                                                                                                                                                                                                                                                                                                                                               |
| financeiro                | financeiro_update_admin_gerente                | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                 |
| insumos                   | insumos_delete_admin_gerente                   | DELETE   | {authenticated} | ((fazenda_id IS NOT NULL) AND (fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                        | null                                                                                                                                                                                                                                                                                                                                                                               |
| insumos                   | insumos_insert_admin_gerente                   | INSERT   | {authenticated} | null                                                                                                                                                   | ((fazenda_id IS NOT NULL) AND (fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                    |
| insumos                   | insumos_select_todos                           | SELECT   | {authenticated} | ((fazenda_id IS NOT NULL) AND (fazenda_id = get_minha_fazenda_id()))                                                                                   | null                                                                                                                                                                                                                                                                                                                                                                               |
| insumos                   | insumos_update_admin_gerente                   | UPDATE   | {authenticated} | ((fazenda_id IS NOT NULL) AND (fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                        | ((fazenda_id IS NOT NULL) AND (fazenda_id = get_minha_fazenda_id()))                                                                                                                                                                                                                                                                                                               |
| manutencoes               | manutencoes_delete_admin_gerente               | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | null                                                                                                                                                                                                                                                                                                                                                                               |
| manutencoes               | manutencoes_insert_todos                       | INSERT   | {authenticated} | null                                                                                                                                                   | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| manutencoes               | manutencoes_select_todos                       | SELECT   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | null                                                                                                                                                                                                                                                                                                                                                                               |
| manutencoes               | manutencoes_update_admin_gerente               | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| manutencoes               | manutencoes_update_operador_recente            | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND (created_by = auth.uid()) AND (created_at > (now() - '24:00:00'::interval)))                                | ((fazenda_id = get_minha_fazenda_id()) AND (created_by = auth.uid()))                                                                                                                                                                                                                                                                                                              |
| maquinas                  | maquinas_delete_admin                          | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_admin())                                                                                                | null                                                                                                                                                                                                                                                                                                                                                                               |
| maquinas                  | maquinas_insert_admin_gerente                  | INSERT   | {authenticated} | null                                                                                                                                                   | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                 |
| maquinas                  | maquinas_select_todos                          | SELECT   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | null                                                                                                                                                                                                                                                                                                                                                                               |
| maquinas                  | maquinas_update_admin_gerente                  | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                 |
| movimentacoes_insumo      | movimentacoes_insumo_delete_admin_gerente      | DELETE   | {authenticated} | (sou_gerente_ou_admin() AND (insumo_id IN ( SELECT insumos.id
   FROM insumos
  WHERE (insumos.fazenda_id = get_minha_fazenda_id()))))                 | null                                                                                                                                                                                                                                                                                                                                                                               |
| movimentacoes_insumo      | movimentacoes_insumo_insert_todos              | INSERT   | {authenticated} | null                                                                                                                                                   | (insumo_id IN ( SELECT insumos.id
   FROM insumos
  WHERE (insumos.fazenda_id = get_minha_fazenda_id())))                                                                                                                                                                                                                                                                          |
| movimentacoes_insumo      | movimentacoes_insumo_select_todos              | SELECT   | {authenticated} | (insumo_id IN ( SELECT insumos.id
   FROM insumos
  WHERE (insumos.fazenda_id = get_minha_fazenda_id())))                                              | null                                                                                                                                                                                                                                                                                                                                                                               |
| movimentacoes_insumo      | movimentacoes_insumo_update_todos              | UPDATE   | {authenticated} | (insumo_id IN ( SELECT insumos.id
   FROM insumos
  WHERE (insumos.fazenda_id = get_minha_fazenda_id())))                                              | (insumo_id IN ( SELECT insumos.id
   FROM insumos
  WHERE (insumos.fazenda_id = get_minha_fazenda_id())))                                                                                                                                                                                                                                                                          |
| movimentacoes_silo        | movimentacoes_silo_delete_admin_gerente        | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | null                                                                                                                                                                                                                                                                                                                                                                               |
| movimentacoes_silo        | movimentacoes_silo_insert_todos                | INSERT   | {authenticated} | null                                                                                                                                                   | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| movimentacoes_silo        | movimentacoes_silo_select_todos                | SELECT   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | null                                                                                                                                                                                                                                                                                                                                                                               |
| movimentacoes_silo        | movimentacoes_silo_update_admin_gerente        | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| movimentacoes_silo        | movimentacoes_silo_update_operador_recente     | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND (created_by = auth.uid()) AND (created_at > (now() - '24:00:00'::interval)))                                | ((fazenda_id = get_minha_fazenda_id()) AND (created_by = auth.uid()))                                                                                                                                                                                                                                                                                                              |
| periodos_confinamento     | periodos_confinamento_delete_admin_gerente     | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | null                                                                                                                                                                                                                                                                                                                                                                               |
| periodos_confinamento     | periodos_confinamento_insert_todos             | INSERT   | {authenticated} | null                                                                                                                                                   | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| periodos_confinamento     | periodos_confinamento_select_todos             | SELECT   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | null                                                                                                                                                                                                                                                                                                                                                                               |
| periodos_confinamento     | periodos_confinamento_update_todos             | UPDATE   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| planejamentos_silagem     | planejamentos_silagem_delete_admin_gerente     | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | null                                                                                                                                                                                                                                                                                                                                                                               |
| planejamentos_silagem     | planejamentos_silagem_insert_admin_gerente     | INSERT   | {authenticated} | null                                                                                                                                                   | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                 |
| planejamentos_silagem     | planejamentos_silagem_select_todos             | SELECT   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | null                                                                                                                                                                                                                                                                                                                                                                               |
| planejamentos_silagem     | planejamentos_silagem_update_admin_gerente     | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| planos_manutencao         | planos_manutencao_delete_admin_gerente         | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | null                                                                                                                                                                                                                                                                                                                                                                               |
| planos_manutencao         | planos_manutencao_insert_admin_gerente         | INSERT   | {authenticated} | null                                                                                                                                                   | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                 |
| planos_manutencao         | planos_manutencao_select_todos                 | SELECT   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | null                                                                                                                                                                                                                                                                                                                                                                               |
| planos_manutencao         | planos_manutencao_update_admin_gerente         | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| profiles                  | profiles_delete_admin_mesma_fazenda            | DELETE   | {authenticated} | (sou_admin() AND (fazenda_id = get_minha_fazenda_id()) AND (id <> auth.uid()))                                                                         | null                                                                                                                                                                                                                                                                                                                                                                               |
| profiles                  | profiles_select_mesma_fazenda                  | SELECT   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) OR (id = auth.uid()))                                                                                           | null                                                                                                                                                                                                                                                                                                                                                                               |
| profiles                  | profiles_update_proprio                        | UPDATE   | {authenticated} | (id = auth.uid())                                                                                                                                      | ((id = auth.uid()) AND (perfil = ( SELECT profiles_1.perfil
   FROM profiles profiles_1
  WHERE (profiles_1.id = auth.uid()))) AND (NOT (fazenda_id IS DISTINCT FROM ( SELECT profiles_1.fazenda_id
   FROM profiles profiles_1
  WHERE (profiles_1.id = auth.uid())))) AND (email = ( SELECT profiles_1.email
   FROM profiles profiles_1
  WHERE (profiles_1.id = auth.uid())))) |
| profiles                  | profiles_update_admin_mesma_fazenda            | UPDATE   | {authenticated} | (sou_admin() AND (fazenda_id = get_minha_fazenda_id()) AND (id <> auth.uid()))                                                                         | (sou_admin() AND (fazenda_id = get_minha_fazenda_id()) AND (id <> auth.uid()))                                                                                                                                                                                                                                                                                                     |
| silos                     | silos_delete_admin                             | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_admin())                                                                                                | null                                                                                                                                                                                                                                                                                                                                                                               |
| silos                     | silos_insert_admin_gerente                     | INSERT   | {authenticated} | null                                                                                                                                                   | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                 |
| silos                     | silos_select_membros                           | SELECT   | {authenticated} | ((fazenda_id IS NOT NULL) AND (fazenda_id = get_minha_fazenda_id()))                                                                                   | null                                                                                                                                                                                                                                                                                                                                                                               |
| silos                     | silos_update_membros                           | UPDATE   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | (fazenda_id = get_minha_fazenda_id())                                                                                                                                                                                                                                                                                                                                              |
| talhoes                   | talhoes_delete_admin                           | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_admin())                                                                                                | null                                                                                                                                                                                                                                                                                                                                                                               |
| talhoes                   | talhoes_insert_admin_gerente                   | INSERT   | {authenticated} | null                                                                                                                                                   | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                 |
| talhoes                   | talhoes_select_todos                           | SELECT   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | null                                                                                                                                                                                                                                                                                                                                                                               |
| talhoes                   | talhoes_update_admin_gerente                   | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                 |
| tipos_insumo              | tipos_insumo_select_publico                    | SELECT   | {authenticated} | true                                                                                                                                                   | null                                                                                                                                                                                                                                                                                                                                                                               |
| uso_maquinas              | uso_maquinas_delete_admin_gerente              | DELETE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | null                                                                                                                                                                                                                                                                                                                                                                               |
| uso_maquinas              | uso_maquinas_insert_todos                      | INSERT   | {authenticated} | null                                                                                                                                                   | ((fazenda_id = get_minha_fazenda_id()) AND (sou_gerente_ou_admin() OR (created_by = auth.uid())))                                                                                                                                                                                                                                                                                  |
| uso_maquinas              | uso_maquinas_select_todos                      | SELECT   | {authenticated} | (fazenda_id = get_minha_fazenda_id())                                                                                                                  | null                                                                                                                                                                                                                                                                                                                                                                               |
| uso_maquinas              | uso_maquinas_update_operador_recente           | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND (created_by = auth.uid()) AND (created_at >= (now() - '24:00:00'::interval)))                               | ((fazenda_id = get_minha_fazenda_id()) AND (created_by = auth.uid()) AND (created_at >= (now() - '24:00:00'::interval)))                                                                                                                                                                                                                                                           |
| uso_maquinas              | uso_maquinas_update_admin_gerente              | UPDATE   | {authenticated} | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                     | ((fazenda_id = get_minha_fazenda_id()) AND sou_gerente_ou_admin())                                                                                                                                                                                                                                                                                                                 |
```

### 🧭 Como interpretar

- `_select_todos` → todos os usuários da fazenda leem
- `_insert_todos` → todos podem inserir (operador inclusive)
- `_update_todos` → todos podem atualizar
- `_delete_admin_gerente` → **só admin e gerente** podem deletar
- `_select_publico` → tabela global, leitura sem autenticação
- `_self` → usuário só acessa o próprio registro (ex: `profiles`)

---

## ⚙️ SEÇÃO 5 — FUNÇÕES E TRIGGERS

### 5.1 Funções customizadas

> **Fonte:** Query 3 do snapshot SQL

-- 3. FUNÇÕES PERSONALIZADAS (helpers, RPCs, lógica)
SELECT 
  p.proname AS funcao,
  pg_get_function_arguments(p.oid) AS argumentos,
  pg_get_function_result(p.oid) AS retorno,
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS seguranca,
  l.lanname AS linguagem
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;


```
| funcao                                 | argumentos                                                                                                                                                                                                              | retorno       | seguranca        | linguagem |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------- | --------- |
| atualizar_custo_medio_e_estoque        |                                                                                                                                                                                                                         | trigger       | SECURITY DEFINER | plpgsql   |
| atualizar_status_talhao                |                                                                                                                                                                                                                         | trigger       | SECURITY DEFINER | plpgsql   |
| calcular_analise_solo                  |                                                                                                                                                                                                                         | trigger       | SECURITY DEFINER | plpgsql   |
| create_fazenda_and_link                | p_nome text, p_localizacao text DEFAULT NULL::text, p_area_total numeric DEFAULT NULL::numeric, p_latitude double precision DEFAULT NULL::double precision, p_longitude double precision DEFAULT NULL::double precision | fazendas      | SECURITY DEFINER | plpgsql   |
| get_insumos_abaixo_minimo              | p_fazenda_id uuid                                                                                                                                                                                                       | SETOF insumos | SECURITY DEFINER | sql       |
| get_meu_perfil                         |                                                                                                                                                                                                                         | text          | SECURITY DEFINER | sql       |
| get_minha_fazenda_id                   |                                                                                                                                                                                                                         | uuid          | SECURITY DEFINER | sql       |
| get_my_fazenda_id                      |                                                                                                                                                                                                                         | uuid          | SECURITY DEFINER | sql       |
| get_my_perfil                          |                                                                                                                                                                                                                         | text          | SECURITY DEFINER | sql       |
| handle_new_user                        |                                                                                                                                                                                                                         | trigger       | SECURITY DEFINER | plpgsql   |
| is_admin                               |                                                                                                                                                                                                                         | boolean       | SECURITY DEFINER | sql       |
| is_gerente_or_admin                    |                                                                                                                                                                                                                         | boolean       | SECURITY DEFINER | sql       |
| is_operador                            |                                                                                                                                                                                                                         | boolean       | SECURITY DEFINER | sql       |
| posso_criar_fazenda                    |                                                                                                                                                                                                                         | boolean       | SECURITY DEFINER | sql       |
| preencher_created_by_atividade_campo   |                                                                                                                                                                                                                         | trigger       | SECURITY DEFINER | plpgsql   |
| preencher_created_by_avaliacao_psps    |                                                                                                                                                                                                                         | trigger       | SECURITY DEFINER | plpgsql   |
| preencher_created_by_manutencao        |                                                                                                                                                                                                                         | trigger       | SECURITY DEFINER | plpgsql   |
| preencher_created_by_movimentacao_silo |                                                                                                                                                                                                                         | trigger       | SECURITY DEFINER | plpgsql   |
| preencher_fazenda_id_via_manutencao    |                                                                                                                                                                                                                         | trigger       | SECURITY DEFINER | plpgsql   |
| preencher_fazenda_id_via_maquina       |                                                                                                                                                                                                                         | trigger       | SECURITY DEFINER | plpgsql   |
| preencher_fazenda_id_via_silo          |                                                                                                                                                                                                                         | trigger       | SECURITY DEFINER | plpgsql   |
| set_fazenda_id_from_talhao             |                                                                                                                                                                                                                         | trigger       | SECURITY INVOKER | plpgsql   |
| silos_proteger_campos_operador         |                                                                                                                                                                                                                         | trigger       | SECURITY DEFINER | plpgsql   |
| sou_admin                              |                                                                                                                                                                                                                         | boolean       | SECURITY DEFINER | sql       |
| sou_gerente_ou_admin                   |                                                                                                                                                                                                                         | boolean       | SECURITY DEFINER | sql       |
| update_insumos_atualizado_em           |                                                                                                                                                                                                                         | trigger       | SECURITY DEFINER | plpgsql   |
| update_updated_at_planejamentos        |                                                                                                                                                                                                                         | trigger       | SECURITY DEFINER | plpgsql   |
```

### 5.2 Triggers ativos

> **Fonte:** Query 4 do snapshot SQL  
> ⚠️ **ATENÇÃO:** colunas preenchidas por triggers **NÃO devem ser enviadas pelo frontend** em INSERTs.

-- 4. TRIGGERS
SELECT 
  event_object_table AS tabela,
  trigger_name AS trigger,
  action_timing AS quando,
  string_agg(event_manipulation, ', ' ORDER BY event_manipulation) AS eventos,
  action_statement AS acao
FROM information_schema.triggers
WHERE trigger_schema = 'public'
GROUP BY event_object_table, trigger_name, action_timing, action_statement
ORDER BY event_object_table, trigger_name;


```
| tabela                    | trigger                                  | quando | eventos        | acao                                                      |
| ------------------------- | ---------------------------------------- | ------ | -------------- | --------------------------------------------------------- |
| abastecimentos            | trg_abastecimentos_fazenda_id            | BEFORE | INSERT         | EXECUTE FUNCTION preencher_fazenda_id_via_maquina()       |
| atividades_campo          | trg_atividades_campo_created_by          | BEFORE | INSERT         | EXECUTE FUNCTION preencher_created_by_atividade_campo()   |
| atividades_campo          | trg_calcular_analise_solo                | BEFORE | INSERT, UPDATE | EXECUTE FUNCTION calcular_analise_solo()                  |
| atividades_campo          | trg_set_fazenda_id                       | BEFORE | INSERT, UPDATE | EXECUTE FUNCTION set_fazenda_id_from_talhao()             |
| avaliacoes_bromatologicas | trg_avaliacoes_bromatologicas_fazenda_id | BEFORE | INSERT         | EXECUTE FUNCTION preencher_fazenda_id_via_silo()          |
| avaliacoes_psps           | trg_avaliacoes_psps_created_by           | BEFORE | INSERT         | EXECUTE FUNCTION preencher_created_by_avaliacao_psps()    |
| avaliacoes_psps           | trg_avaliacoes_psps_fazenda_id           | BEFORE | INSERT         | EXECUTE FUNCTION preencher_fazenda_id_via_silo()          |
| ciclos_agricolas          | trg_set_fazenda_id                       | BEFORE | INSERT, UPDATE | EXECUTE FUNCTION set_fazenda_id_from_talhao()             |
| eventos_dap               | trg_set_fazenda_id                       | BEFORE | INSERT, UPDATE | EXECUTE FUNCTION set_fazenda_id_from_talhao()             |
| insumos                   | trg_insumos_atualizado_em                | BEFORE | UPDATE         | EXECUTE FUNCTION update_insumos_atualizado_em()           |
| manutencoes               | trg_manutencoes_created_by               | BEFORE | INSERT         | EXECUTE FUNCTION preencher_created_by_manutencao()        |
| manutencoes               | trg_manutencoes_fazenda_id               | BEFORE | INSERT         | EXECUTE FUNCTION preencher_fazenda_id_via_manutencao()    |
| movimentacoes_insumo      | mov_insumo_atualizar_estoque_cmp         | AFTER  | INSERT         | EXECUTE FUNCTION atualizar_custo_medio_e_estoque()        |
| movimentacoes_silo        | trg_movimentacoes_silo_created_by        | BEFORE | INSERT         | EXECUTE FUNCTION preencher_created_by_movimentacao_silo() |
| movimentacoes_silo        | trg_movimentacoes_silo_fazenda_id        | BEFORE | INSERT         | EXECUTE FUNCTION preencher_fazenda_id_via_silo()          |
| planejamentos_silagem     | trigger_updated_at_planejamentos         | BEFORE | UPDATE         | EXECUTE FUNCTION update_updated_at_planejamentos()        |
| silos                     | trg_silos_proteger_campos_operador       | BEFORE | UPDATE         | EXECUTE FUNCTION silos_proteger_campos_operador()         |
| uso_maquinas              | trg_uso_maquinas_fazenda_id              | BEFORE | INSERT         | EXECUTE FUNCTION preencher_fazenda_id_via_maquina()       |
```

### 🚨 Lista de colunas auto-preenchidas (NÃO enviar pelo front)

> ⚠️ **REGRA DE OURO:** Colunas listadas abaixo são preenchidas **automaticamente por triggers ou defaults** do banco.  
> O frontend **NÃO deve** incluí-las em `.insert({...})` ou `.update({...})` — o banco rejeita ou sobrescreve.  
> **Exceção:** campos protegidos por `silos_proteger_campos_operador` (ver final desta seção).

---

#### 🔹 `fazenda_id` — propagação automática via entidade pai

O sistema possui **3 funções de propagação** que preenchem `fazenda_id` automaticamente no INSERT, derivando da entidade pai:

| Função do banco | Tabelas que usam | Origem do `fazenda_id` |
|---|---|---|
| `preencher_fazenda_id_via_silo()` | `avaliacoes_bromatologicas`, `avaliacoes_psps`, `movimentacoes_silo` | Lookup via `silo_id` → `silos.fazenda_id` |
| `preencher_fazenda_id_via_maquina()` | `abastecimentos`, `uso_maquinas` | Lookup via `maquina_id` → `maquinas.fazenda_id` |
| `preencher_fazenda_id_via_manutencao()` | `manutencoes` | Lookup via `maquina_id` → `maquinas.fazenda_id` |
| `set_fazenda_id_from_talhao()` | `atividades_campo`, `ciclos_agricolas`, `eventos_dap` | Lookup via `talhao_id` → `talhoes.fazenda_id` |

**Tabelas onde `fazenda_id` é auto-preenchido (NUNCA enviar pelo front):**

- [ ] `abastecimentos` → trigger `trg_abastecimentos_fazenda_id` (BEFORE INSERT)
- [ ] `atividades_campo` → trigger `trg_set_fazenda_id` (BEFORE INSERT/UPDATE)
- [ ] `avaliacoes_bromatologicas` → trigger `trg_avaliacoes_bromatologicas_fazenda_id` (BEFORE INSERT)
- [ ] `avaliacoes_psps` → trigger `trg_avaliacoes_psps_fazenda_id` (BEFORE INSERT)
- [ ] `ciclos_agricolas` → trigger `trg_set_fazenda_id` (BEFORE INSERT/UPDATE)
- [ ] `eventos_dap` → trigger `trg_set_fazenda_id` (BEFORE INSERT/UPDATE)
- [ ] `manutencoes` → trigger `trg_manutencoes_fazenda_id` (BEFORE INSERT)
- [ ] `movimentacoes_silo` → trigger `trg_movimentacoes_silo_fazenda_id` (BEFORE INSERT)
- [ ] `uso_maquinas` → trigger `trg_uso_maquinas_fazenda_id` (BEFORE INSERT)

> 💡 **Para tabelas-raiz** (`silos`, `talhoes`, `maquinas`, `insumos`, `financeiro`, etc.) que **não aparecem na lista acima**, o `fazenda_id` precisa ser **enviado explicitamente pelo front** (vindo de `useAuth().profile.fazenda_id`), pois não há entidade pai pra derivar.

---

#### 🔹 `created_by` — preenchido automaticamente com o usuário autenticado

Funções que populam `created_by` com `auth.uid()`:

- [ ] `atividades_campo` → trigger `trg_atividades_campo_created_by` (BEFORE INSERT)
- [ ] `avaliacoes_psps` → trigger `trg_avaliacoes_psps_created_by` (BEFORE INSERT)
- [ ] `manutencoes` → trigger `trg_manutencoes_created_by` (BEFORE INSERT)
- [ ] `movimentacoes_silo` → trigger `trg_movimentacoes_silo_created_by` (BEFORE INSERT)

> ⚠️ **Não enviar `created_by` no `.insert()`** — o trigger sobrescreve com o UUID do usuário logado.

---

#### 🔹 `updated_at` / `atualizado_em` — atualização automática

- [ ] `insumos` → trigger `trg_insumos_atualizado_em` (BEFORE UPDATE) — campo `atualizado_em`
- [ ] `planejamentos_silagem` → trigger `trigger_updated_at_planejamentos` (BEFORE UPDATE) — campo `updated_at`

> 💡 **Atenção à inconsistência de nomenclatura:** `insumos` usa `atualizado_em` (PT-BR), enquanto `planejamentos_silagem` usa `updated_at` (EN). Verificar nas demais tabelas (Seção 3) qual padrão cada uma adota antes de tipar no TS.

---

#### 🔹 Cálculos automáticos (lógica de negócio no banco)

Triggers que **modificam outras colunas** ou **outras tabelas** após operações:

| Tabela | Trigger | Quando | O que faz |
|---|---|---|---|
| `atividades_campo` | `trg_calcular_analise_solo` | BEFORE INSERT/UPDATE | Recalcula campos derivados de análise de solo (V%, SMP, etc.) |
| `movimentacoes_insumo` | `mov_insumo_atualizar_estoque_cmp` | AFTER INSERT | Atualiza estoque e custo médio ponderado em `insumos` |

> ⚠️ **Implicação para o front:**
> - Em `atividades_campo`, o front **pode enviar** os campos de análise de solo, mas o trigger pode **recalcular/sobrescrever** valores derivados. Não confiar que o que foi enviado é o que ficou salvo — sempre **fazer SELECT** após INSERT.
> - Em `movimentacoes_insumo`, ao registrar uma movimentação, o front **NÃO deve** atualizar manualmente `insumos.estoque_atual` ou `insumos.custo_medio` — o trigger faz isso. Atualização manual causa inconsistência.

---

#### 🔹 Proteção de campos por role (caso especial)

| Tabela | Trigger | Quando | O que faz |
|---|---|---|---|
| `silos` | `trg_silos_proteger_campos_operador` | BEFORE UPDATE | Bloqueia operador de alterar campos sensíveis (capacidade, dimensões, etc.) |

> ⚠️ **Implicação para o front:**
> - No formulário de edição de silo, **esconder/desabilitar** os campos protegidos quando `profile.role === 'operador'`.
> - Caso contrário, o operador edita o campo na UI, clica salvar, e o banco **silenciosamente reverte** o valor — gerando confusão.
> - 🔍 **Ação recomendada:** consultar a função `silos_proteger_campos_operador()` (Seção 5.1) para listar exatamente quais colunas são protegidas e replicar essa lógica no componente `SiloForm.tsx`.

---

#### 📋 Resumo executivo — checklist para Claude Code

Ao auditar qualquer `.insert()` ou `.update()` no código:

1. ✅ Se a tabela está na lista de **`fazenda_id` auto-preenchido** → **REMOVER** `fazenda_id` do payload
2. ✅ Se a tabela tem trigger **`created_by`** → **REMOVER** `created_by` do payload
3. ✅ Se a tabela tem trigger **`updated_at`/`atualizado_em`** → **REMOVER** do payload de UPDATE
4. ✅ Se for `movimentacoes_insumo` → **NÃO atualizar** `insumos.estoque_atual` ou `custo_medio` manualmente
5. ✅ Se for `silos` UPDATE com role `operador` → **validar campos permitidos** antes do submit
6. ✅ Se for `atividades_campo` → fazer **SELECT após INSERT** para pegar valores recalculados

---

#### 🛠️ Padrão recomendado para INSERTs (TypeScript)

```typescript
// ❌ ERRADO — envia campos que triggers preenchem
await supabase.from('movimentacoes_silo').insert({
  silo_id: '...',
  fazenda_id: profile.fazenda_id,  // ❌ trigger preenche
  created_by: user.id,              // ❌ trigger preenche
  tipo: 'entrada',
  quantidade: 1000,
});

// ✅ CORRETO — envia só o necessário
await supabase.from('movimentacoes_silo').insert({
  silo_id: '...',
  tipo: 'entrada',
  quantidade: 1000,
});
```


## 📊 SEÇÃO 6 — ÍNDICES

> **Fonte:** Query 5 do snapshot SQL  
> **Use isto para validar performance de queries com `.eq()` e `.order()`.**

-- 5. ÍNDICES
SELECT 
  tablename AS tabela,
  indexname AS indice,
  indexdef AS definicao
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


```
| tabela                    | indice                                      | definicao                                                                                                                                     |
| ------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| abastecimentos            | abastecimentos_pkey                         | CREATE UNIQUE INDEX abastecimentos_pkey ON public.abastecimentos USING btree (id)                                                             |
| abastecimentos            | idx_abastecimentos_created_by               | CREATE INDEX idx_abastecimentos_created_by ON public.abastecimentos USING btree (created_by)                                                  |
| abastecimentos            | idx_abastecimentos_fazenda_id               | CREATE INDEX idx_abastecimentos_fazenda_id ON public.abastecimentos USING btree (fazenda_id)                                                  |
| abastecimentos            | idx_abastecimentos_maquina_id               | CREATE INDEX idx_abastecimentos_maquina_id ON public.abastecimentos USING btree (maquina_id)                                                  |
| atividades_campo          | atividades_campo_pkey                       | CREATE UNIQUE INDEX atividades_campo_pkey ON public.atividades_campo USING btree (id)                                                         |
| atividades_campo          | idx_atividades_campo_ciclo_id               | CREATE INDEX idx_atividades_campo_ciclo_id ON public.atividades_campo USING btree (ciclo_id)                                                  |
| atividades_campo          | idx_atividades_campo_fazenda_id             | CREATE INDEX idx_atividades_campo_fazenda_id ON public.atividades_campo USING btree (fazenda_id)                                              |
| atividades_campo          | idx_atividades_campo_insumo_id              | CREATE INDEX idx_atividades_campo_insumo_id ON public.atividades_campo USING btree (insumo_id)                                                |
| atividades_campo          | idx_atividades_campo_maquina_colheita_id    | CREATE INDEX idx_atividades_campo_maquina_colheita_id ON public.atividades_campo USING btree (maquina_colheita_id)                            |
| atividades_campo          | idx_atividades_campo_maquina_compactacao_id | CREATE INDEX idx_atividades_campo_maquina_compactacao_id ON public.atividades_campo USING btree (maquina_compactacao_id)                      |
| atividades_campo          | idx_atividades_campo_maquina_id             | CREATE INDEX idx_atividades_campo_maquina_id ON public.atividades_campo USING btree (maquina_id)                                              |
| atividades_campo          | idx_atividades_campo_maquina_transporte_id  | CREATE INDEX idx_atividades_campo_maquina_transporte_id ON public.atividades_campo USING btree (maquina_transporte_id)                        |
| atividades_campo          | idx_atividades_campo_semente_id             | CREATE INDEX idx_atividades_campo_semente_id ON public.atividades_campo USING btree (semente_id)                                              |
| atividades_campo          | idx_atividades_campo_talhao_id              | CREATE INDEX idx_atividades_campo_talhao_id ON public.atividades_campo USING btree (talhao_id)                                                |
| avaliacoes_bromatologicas | avaliacoes_brom_unique_silo_data_momento    | CREATE UNIQUE INDEX avaliacoes_brom_unique_silo_data_momento ON public.avaliacoes_bromatologicas USING btree (silo_id, data, momento)         |
| avaliacoes_bromatologicas | avaliacoes_bromatologicas_pkey              | CREATE UNIQUE INDEX avaliacoes_bromatologicas_pkey ON public.avaliacoes_bromatologicas USING btree (id)                                       |
| avaliacoes_bromatologicas | idx_avaliacoes_bromatologicas_fazenda_id    | CREATE INDEX idx_avaliacoes_bromatologicas_fazenda_id ON public.avaliacoes_bromatologicas USING btree (fazenda_id)                            |
| avaliacoes_bromatologicas | idx_avaliacoes_bromatologicas_silo_id       | CREATE INDEX idx_avaliacoes_bromatologicas_silo_id ON public.avaliacoes_bromatologicas USING btree (silo_id)                                  |
| avaliacoes_psps           | avaliacoes_psps_pkey                        | CREATE UNIQUE INDEX avaliacoes_psps_pkey ON public.avaliacoes_psps USING btree (id)                                                           |
| avaliacoes_psps           | avaliacoes_psps_unique_silo_data_momento    | CREATE UNIQUE INDEX avaliacoes_psps_unique_silo_data_momento ON public.avaliacoes_psps USING btree (silo_id, data, momento)                   |
| avaliacoes_psps           | idx_avaliacoes_psps_fazenda_id              | CREATE INDEX idx_avaliacoes_psps_fazenda_id ON public.avaliacoes_psps USING btree (fazenda_id)                                                |
| avaliacoes_psps           | idx_avaliacoes_psps_silo_id                 | CREATE INDEX idx_avaliacoes_psps_silo_id ON public.avaliacoes_psps USING btree (silo_id)                                                      |
| categorias_insumo         | categorias_insumo_nome_key                  | CREATE UNIQUE INDEX categorias_insumo_nome_key ON public.categorias_insumo USING btree (nome)                                                 |
| categorias_insumo         | categorias_insumo_pkey                      | CREATE UNIQUE INDEX categorias_insumo_pkey ON public.categorias_insumo USING btree (id)                                                       |
| categorias_rebanho        | categorias_rebanho_pkey                     | CREATE UNIQUE INDEX categorias_rebanho_pkey ON public.categorias_rebanho USING btree (id)                                                     |
| categorias_rebanho        | idx_categorias_rebanho_fazenda_id           | CREATE INDEX idx_categorias_rebanho_fazenda_id ON public.categorias_rebanho USING btree (fazenda_id)                                          |
| ciclos_agricolas          | ciclos_agricolas_pkey                       | CREATE UNIQUE INDEX ciclos_agricolas_pkey ON public.ciclos_agricolas USING btree (id)                                                         |
| ciclos_agricolas          | idx_ciclos_agricolas_fazenda_id             | CREATE INDEX idx_ciclos_agricolas_fazenda_id ON public.ciclos_agricolas USING btree (fazenda_id)                                              |
| ciclos_agricolas          | idx_ciclos_agricolas_talhao_id              | CREATE INDEX idx_ciclos_agricolas_talhao_id ON public.ciclos_agricolas USING btree (talhao_id)                                                |
| eventos_dap               | eventos_dap_pkey                            | CREATE UNIQUE INDEX eventos_dap_pkey ON public.eventos_dap USING btree (id)                                                                   |
| eventos_dap               | idx_eventos_dap_atividade_campo_id          | CREATE INDEX idx_eventos_dap_atividade_campo_id ON public.eventos_dap USING btree (atividade_campo_id)                                        |
| eventos_dap               | idx_eventos_dap_ciclo_id                    | CREATE INDEX idx_eventos_dap_ciclo_id ON public.eventos_dap USING btree (ciclo_id)                                                            |
| eventos_dap               | idx_eventos_dap_fazenda_id                  | CREATE INDEX idx_eventos_dap_fazenda_id ON public.eventos_dap USING btree (fazenda_id)                                                        |
| eventos_dap               | idx_eventos_dap_talhao_id                   | CREATE INDEX idx_eventos_dap_talhao_id ON public.eventos_dap USING btree (talhao_id)                                                          |
| fazendas                  | fazendas_pkey                               | CREATE UNIQUE INDEX fazendas_pkey ON public.fazendas USING btree (id)                                                                         |
| financeiro                | financeiro_pkey                             | CREATE UNIQUE INDEX financeiro_pkey ON public.financeiro USING btree (id)                                                                     |
| financeiro                | idx_financeiro_fazenda_id                   | CREATE INDEX idx_financeiro_fazenda_id ON public.financeiro USING btree (fazenda_id)                                                          |
| insumos                   | idx_insumos_categoria_id                    | CREATE INDEX idx_insumos_categoria_id ON public.insumos USING btree (categoria_id)                                                            |
| insumos                   | idx_insumos_fazenda_ativo                   | CREATE INDEX idx_insumos_fazenda_ativo ON public.insumos USING btree (fazenda_id, ativo)                                                      |
| insumos                   | idx_insumos_fazenda_id                      | CREATE INDEX idx_insumos_fazenda_id ON public.insumos USING btree (fazenda_id)                                                                |
| insumos                   | idx_insumos_nome_trgm                       | CREATE INDEX idx_insumos_nome_trgm ON public.insumos USING gin (nome gin_trgm_ops)                                                            |
| insumos                   | idx_insumos_tipo_id                         | CREATE INDEX idx_insumos_tipo_id ON public.insumos USING btree (tipo_id)                                                                      |
| insumos                   | insumos_pkey                                | CREATE UNIQUE INDEX insumos_pkey ON public.insumos USING btree (id)                                                                           |
| manutencoes               | idx_manutencoes_fazenda_id                  | CREATE INDEX idx_manutencoes_fazenda_id ON public.manutencoes USING btree (fazenda_id)                                                        |
| manutencoes               | idx_manutencoes_maquina_id                  | CREATE INDEX idx_manutencoes_maquina_id ON public.manutencoes USING btree (maquina_id)                                                        |
| manutencoes               | manutencoes_pkey                            | CREATE UNIQUE INDEX manutencoes_pkey ON public.manutencoes USING btree (id)                                                                   |
| maquinas                  | idx_maquinas_fazenda_id                     | CREATE INDEX idx_maquinas_fazenda_id ON public.maquinas USING btree (fazenda_id)                                                              |
| maquinas                  | maquinas_pkey                               | CREATE UNIQUE INDEX maquinas_pkey ON public.maquinas USING btree (id)                                                                         |
| movimentacoes_insumo      | idx_movimentacoes_data                      | CREATE INDEX idx_movimentacoes_data ON public.movimentacoes_insumo USING btree (data DESC)                                                    |
| movimentacoes_insumo      | idx_movimentacoes_insumo_despesa_id         | CREATE INDEX idx_movimentacoes_insumo_despesa_id ON public.movimentacoes_insumo USING btree (despesa_id)                                      |
| movimentacoes_insumo      | idx_movimentacoes_insumo_insumo_id          | CREATE INDEX idx_movimentacoes_insumo_insumo_id ON public.movimentacoes_insumo USING btree (insumo_id)                                        |
| movimentacoes_insumo      | movimentacoes_insumo_pkey                   | CREATE UNIQUE INDEX movimentacoes_insumo_pkey ON public.movimentacoes_insumo USING btree (id)                                                 |
| movimentacoes_silo        | idx_movimentacoes_silo_fazenda_id           | CREATE INDEX idx_movimentacoes_silo_fazenda_id ON public.movimentacoes_silo USING btree (fazenda_id)                                          |
| movimentacoes_silo        | idx_movimentacoes_silo_silo_id              | CREATE INDEX idx_movimentacoes_silo_silo_id ON public.movimentacoes_silo USING btree (silo_id)                                                |
| movimentacoes_silo        | movimentacoes_silo_pkey                     | CREATE UNIQUE INDEX movimentacoes_silo_pkey ON public.movimentacoes_silo USING btree (id)                                                     |
| movimentacoes_silo        | movimentacoes_silo_uma_entrada_por_silo     | CREATE UNIQUE INDEX movimentacoes_silo_uma_entrada_por_silo ON public.movimentacoes_silo USING btree (silo_id) WHERE (tipo = 'Entrada'::text) |
| periodos_confinamento     | idx_periodos_confinamento_fazenda_id        | CREATE INDEX idx_periodos_confinamento_fazenda_id ON public.periodos_confinamento USING btree (fazenda_id)                                    |
| periodos_confinamento     | periodos_confinamento_pkey                  | CREATE UNIQUE INDEX periodos_confinamento_pkey ON public.periodos_confinamento USING btree (id)                                               |
| planejamentos_silagem     | idx_planejamentos_silagem_fazenda_id        | CREATE INDEX idx_planejamentos_silagem_fazenda_id ON public.planejamentos_silagem USING btree (fazenda_id)                                    |
| planejamentos_silagem     | planejamentos_silagem_pkey                  | CREATE UNIQUE INDEX planejamentos_silagem_pkey ON public.planejamentos_silagem USING btree (id)                                               |
| planos_manutencao         | planos_manutencao_pkey                      | CREATE UNIQUE INDEX planos_manutencao_pkey ON public.planos_manutencao USING btree (id)                                                       |
| profiles                  | idx_profiles_fazenda_id                     | CREATE INDEX idx_profiles_fazenda_id ON public.profiles USING btree (fazenda_id)                                                              |
| profiles                  | profiles_pkey                               | CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)                                                                         |
| silos                     | idx_silos_fazenda_id                        | CREATE INDEX idx_silos_fazenda_id ON public.silos USING btree (fazenda_id)                                                                    |
| silos                     | idx_silos_insumo_inoculante_id              | CREATE INDEX idx_silos_insumo_inoculante_id ON public.silos USING btree (insumo_inoculante_id)                                                |
| silos                     | idx_silos_insumo_lona_id                    | CREATE INDEX idx_silos_insumo_lona_id ON public.silos USING btree (insumo_lona_id)                                                            |
| silos                     | silos_pkey                                  | CREATE UNIQUE INDEX silos_pkey ON public.silos USING btree (id)                                                                               |
| talhoes                   | idx_talhoes_fazenda_id                      | CREATE INDEX idx_talhoes_fazenda_id ON public.talhoes USING btree (fazenda_id)                                                                |
| talhoes                   | talhoes_pkey                                | CREATE UNIQUE INDEX talhoes_pkey ON public.talhoes USING btree (id)                                                                           |
| tipos_insumo              | idx_tipos_insumo_categoria_id               | CREATE INDEX idx_tipos_insumo_categoria_id ON public.tipos_insumo USING btree (categoria_id)                                                  |
| tipos_insumo              | tipos_insumo_pkey                           | CREATE UNIQUE INDEX tipos_insumo_pkey ON public.tipos_insumo USING btree (id)                                                                 |
| tipos_insumo              | unique_categoria_tipo                       | CREATE UNIQUE INDEX unique_categoria_tipo ON public.tipos_insumo USING btree (categoria_id, nome)                                             |
| uso_maquinas              | idx_uso_maquinas_created_by                 | CREATE INDEX idx_uso_maquinas_created_by ON public.uso_maquinas USING btree (created_by)                                                      |
| uso_maquinas              | idx_uso_maquinas_fazenda_id                 | CREATE INDEX idx_uso_maquinas_fazenda_id ON public.uso_maquinas USING btree (fazenda_id)                                                      |
| uso_maquinas              | idx_uso_maquinas_maquina_id                 | CREATE INDEX idx_uso_maquinas_maquina_id ON public.uso_maquinas USING btree (maquina_id)                                                      |
| uso_maquinas              | uso_maquinas_pkey                           | CREATE UNIQUE INDEX uso_maquinas_pkey ON public.uso_maquinas USING btree (id)                                                                 |
```

### 🎯 Colunas que **devem** ter índice (verificar após colar)

- [ ] `fazenda_id` em **todas** as 23 tabelas (RLS depende disso)
- [ ] FKs principais (`silo_id`, `talhao_id`, `maquina_id`, etc.)
- [ ] Colunas de filtro frequente (`data`, `created_at`)
- [ ] `email` em `profiles` (login)

---

## 🔗 SEÇÃO 7 — FOREIGN KEYS E REGRAS DE INTEGRIDADE

> **Fonte:** Query 6 do snapshot SQL  
> **Crítico para LGPD: `fazenda_id` deve estar com `ON DELETE CASCADE`.**

-- 6. FOREIGN KEYS DETALHADAS
SELECT 
  tc.table_name AS tabela_origem,
  kcu.column_name AS coluna_origem,
  ccu.table_name AS tabela_destino,
  ccu.column_name AS coluna_destino,
  rc.delete_rule AS on_delete,
  rc.update_rule AS on_update
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc 
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;


```
| tabela_origem             | coluna_origem          | tabela_destino    | coluna_destino | on_delete | on_update |
| ------------------------- | ---------------------- | ----------------- | -------------- | --------- | --------- |
| abastecimentos            | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| abastecimentos            | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| abastecimentos            | maquina_id             | maquinas          | id             | CASCADE   | NO ACTION |
| atividades_campo          | ciclo_id               | ciclos_agricolas  | id             | CASCADE   | NO ACTION |
| atividades_campo          | fazenda_id             | fazendas          | id             | NO ACTION | NO ACTION |
| atividades_campo          | insumo_id              | insumos           | id             | SET NULL  | NO ACTION |
| atividades_campo          | maquina_colheita_id    | maquinas          | id             | SET NULL  | NO ACTION |
| atividades_campo          | maquina_compactacao_id | maquinas          | id             | SET NULL  | NO ACTION |
| atividades_campo          | maquina_id             | maquinas          | id             | NO ACTION | NO ACTION |
| atividades_campo          | maquina_transporte_id  | maquinas          | id             | SET NULL  | NO ACTION |
| atividades_campo          | semente_id             | insumos           | id             | SET NULL  | NO ACTION |
| atividades_campo          | talhao_id              | talhoes           | id             | CASCADE   | NO ACTION |
| avaliacoes_bromatologicas | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| avaliacoes_bromatologicas | silo_id                | silos             | id             | CASCADE   | NO ACTION |
| avaliacoes_psps           | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| avaliacoes_psps           | silo_id                | silos             | id             | CASCADE   | NO ACTION |
| categorias_rebanho        | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| ciclos_agricolas          | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| ciclos_agricolas          | talhao_id              | talhoes           | id             | CASCADE   | NO ACTION |
| eventos_dap               | atividade_campo_id     | atividades_campo  | id             | SET NULL  | NO ACTION |
| eventos_dap               | ciclo_id               | ciclos_agricolas  | id             | CASCADE   | NO ACTION |
| eventos_dap               | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| eventos_dap               | talhao_id              | talhoes           | id             | CASCADE   | NO ACTION |
| financeiro                | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| insumos                   | categoria_id           | categorias_insumo | id             | SET NULL  | NO ACTION |
| insumos                   | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| insumos                   | tipo_id                | tipos_insumo      | id             | SET NULL  | NO ACTION |
| manutencoes               | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| manutencoes               | maquina_id             | maquinas          | id             | CASCADE   | NO ACTION |
| maquinas                  | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| movimentacoes_insumo      | despesa_id             | financeiro        | id             | SET NULL  | NO ACTION |
| movimentacoes_insumo      | insumo_id              | insumos           | id             | CASCADE   | NO ACTION |
| movimentacoes_silo        | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| movimentacoes_silo        | silo_id                | silos             | id             | CASCADE   | NO ACTION |
| periodos_confinamento     | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| planejamentos_silagem     | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| planos_manutencao         | fazenda_id             | fazendas          | id             | NO ACTION | NO ACTION |
| planos_manutencao         | maquina_id             | maquinas          | id             | CASCADE   | NO ACTION |
| profiles                  | fazenda_id             | fazendas          | id             | NO ACTION | NO ACTION |
| silos                     | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| silos                     | insumo_inoculante_id   | insumos           | id             | SET NULL  | NO ACTION |
| silos                     | insumo_lona_id         | insumos           | id             | SET NULL  | NO ACTION |
| silos                     | talhao_id              | talhoes           | id             | SET NULL  | NO ACTION |
| talhoes                   | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| tipos_insumo              | categoria_id           | categorias_insumo | id             | RESTRICT  | NO ACTION |
| uso_maquinas              | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| uso_maquinas              | fazenda_id             | fazendas          | id             | CASCADE   | NO ACTION |
| uso_maquinas              | implemento_id          | maquinas          | id             | SET NULL  | NO ACTION |
| uso_maquinas              | maquina_id             | maquinas          | id             | CASCADE   | NO ACTION |
| uso_maquinas              | talhao_id              | talhoes           | id             | SET NULL  | NO ACTION |
```

### 🧭 Regras de delete esperadas

| Coluna | Regra esperada | Motivo |
|---|---|---|
| `fazenda_id` | `CASCADE` | Direito ao Esquecimento (LGPD) |
| `silo_id` em `movimentacoes_silo` | `CASCADE` | Movimentações sem silo são órfãs |
| `talhao_id` em `ciclos_agricolas` | `CASCADE` | Ciclos pertencem ao talhão |
| `maquina_id` em `manutencoes` | `CASCADE` | Histórico junto da máquina |
| FKs para `auth.users` | `CASCADE` ou `SET NULL` | Conforme política de privacidade |

---

## 📈 SEÇÃO 8 — VOLUME DE DADOS E STATUS RLS

> **Fonte:** Query 7 do snapshot SQL  
> **Use isto para identificar tabelas vazias (TODOs abertos) ou sem RLS (risco crítico).**

-- 7. ESTATÍSTICAS DE VOLUME E STATUS RLS
SELECT 
  c.relname AS tabela,
  c.relrowsecurity AS rls_ativo,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS tamanho,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = c.relname) AS qtd_policies,
  s.n_live_tup AS registros_estimados
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relname = c.relname AND s.schemaname = 'public'
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;


```
| tabela                    | rls_ativo | tamanho | qtd_policies | registros_estimados |
| ------------------------- | --------- | ------- | ------------ | ------------------- |
| abastecimentos            | true      | 40 kB   | 4            | 0                   |
| atividades_campo          | true      | 176 kB  | 5            | 1                   |
| avaliacoes_bromatologicas | true      | 64 kB   | 4            | 0                   |
| avaliacoes_psps           | true      | 64 kB   | 5            | 0                   |
| categorias_insumo         | true      | 48 kB   | 1            | 9                   |
| categorias_rebanho        | true      | 48 kB   | 4            | 1                   |
| ciclos_agricolas          | true      | 56 kB   | 4            | 1                   |
| eventos_dap               | true      | 40 kB   | 4            | 0                   |
| fazendas                  | true      | 32 kB   | 3            | 1                   |
| financeiro                | true      | 48 kB   | 4            | 0                   |
| insumos                   | true      | 120 kB  | 4            | 0                   |
| manutencoes               | true      | 32 kB   | 5            | 0                   |
| maquinas                  | true      | 48 kB   | 4            | 1                   |
| movimentacoes_insumo      | true      | 80 kB   | 4            | 0                   |
| movimentacoes_silo        | true      | 80 kB   | 5            | 1                   |
| periodos_confinamento     | true      | 48 kB   | 4            | 1                   |
| planejamentos_silagem     | true      | 24 kB   | 4            | 0                   |
| planos_manutencao         | true      | 16 kB   | 4            | 0                   |
| profiles                  | true      | 48 kB   | 4            | 1                   |
| silos                     | true      | 80 kB   | 4            | 1                   |
| talhoes                   | true      | 48 kB   | 4            | 1                   |
| tipos_insumo              | true      | 64 kB   | 1            | 23                  |
| uso_maquinas              | true      | 40 kB   | 5            | 0                   |
```

### 🚨 Sinais de alerta

- 🔴 `rls_ativo = false` → **risco crítico de segurança**
- 🟡 `qtd_policies = 0` em tabela com RLS ativo → tabela "fechada" (ninguém acessa)
- 🟡 `registros_estimados = 0` em tabela esperada com dados → frontend pode não estar gravando

---

## 🔢 SEÇÃO 9 — CHECK CONSTRAINTS (REGRAS DE DOMÍNIO)

> **Fonte:** Query 8 do snapshot SQL  
> **Use isto para validar que schemas Zod refletem as regras do banco.**

-- 8. CHECK CONSTRAINTS (validações de domínio)
SELECT 
  tc.table_name AS tabela,
  tc.constraint_name AS constraint_nome,
  cc.check_clause AS regra
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK'
  AND tc.constraint_name NOT LIKE '%_not_null'
ORDER BY tc.table_name;


```
| tabela                    | constraint_nome                  | regra                                                                                                                                                                                                                                                               |
| ------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| atividades_campo          | horas_maquina_positive           | ((horas_maquina IS NULL) OR (horas_maquina > (0)::numeric))                                                                                                                                                                                                         |
| avaliacoes_bromatologicas | avaliacoes_brom_momento_check    | ((momento)::text = ANY ((ARRAY['Fechamento'::character varying, 'Abertura'::character varying, 'Monitoramento'::character varying])::text[]))                                                                                                                       |
| avaliacoes_psps           | avaliacoes_psps_momento_check    | ((momento)::text = ANY ((ARRAY['Fechamento'::character varying, 'Abertura'::character varying, 'Monitoramento'::character varying])::text[]))                                                                                                                       |
| categorias_insumo         | chk_nome_length                  | (length((nome)::text) >= 2)                                                                                                                                                                                                                                         |
| categorias_insumo         | chk_nome_not_empty               | ((nome)::text <> ''::text)                                                                                                                                                                                                                                          |
| ciclos_agricolas          | colheita_after_plantio           | (data_colheita_prevista > data_plantio)                                                                                                                                                                                                                             |
| ciclos_agricolas          | produtividade_positive           | ((produtividade_ton_ha IS NULL) OR (produtividade_ton_ha > (0)::numeric))                                                                                                                                                                                           |
| fazendas                  | longitude_range                  | ((longitude IS NULL) OR ((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision)))                                                                                                                                            |
| fazendas                  | latitude_range                   | ((latitude IS NULL) OR ((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)))                                                                                                                                                 |
| financeiro                | financeiro_tipo_check            | (tipo = ANY (ARRAY['Receita'::text, 'Despesa'::text]))                                                                                                                                                                                                              |
| insumos                   | chk_custo_medio_nonneg           | (custo_medio >= (0)::numeric)                                                                                                                                                                                                                                       |
| insumos                   | chk_fornecedor_min               | ((fornecedor IS NULL) OR (length(TRIM(BOTH FROM fornecedor)) > 0))                                                                                                                                                                                                  |
| manutencoes               | manutencoes_tipo_check           | (tipo = ANY (ARRAY['Preventiva'::text, 'Corretiva'::text]))                                                                                                                                                                                                         |
| maquinas                  | maquinas_status_check            | ((status IS NULL) OR (status = ANY (ARRAY['Ativo'::text, 'Em manutenção'::text, 'Parado'::text, 'Vendido'::text])))                                                                                                                                                 |
| maquinas                  | maquinas_tipo_check              | (tipo = ANY (ARRAY['Trator'::text, 'Ensiladeira'::text, 'Colheitadeira'::text, 'Pulverizador'::text, 'Plantadeira/Semeadora'::text, 'Implemento'::text, 'Caminhão'::text, 'Outros'::text]))                                                                         |
| movimentacoes_insumo      | chk_sinal_ajuste                 | ((sinal_ajuste IS NULL) OR (sinal_ajuste = ANY (ARRAY['-1'::integer, 1])))                                                                                                                                                                                          |
| movimentacoes_insumo      | chk_tipo_saida                   | ((tipo_saida IS NULL) OR ((tipo_saida)::text = ANY ((ARRAY['USO_INTERNO'::character varying, 'TRANSFERENCIA'::character varying, 'VENDA'::character varying, 'DEVOLUCAO'::character varying, 'DESCARTE'::character varying, 'TROCA'::character varying])::text[]))) |
| movimentacoes_insumo      | chk_origem                       | ((origem)::text = ANY ((ARRAY['manual'::character varying, 'talhao'::character varying, 'frota'::character varying, 'silo'::character varying, 'financeiro'::character varying])::text[]))                                                                          |
| movimentacoes_insumo      | movimentacoes_insumo_tipo_check  | (tipo = ANY (ARRAY['Entrada'::text, 'Saída'::text, 'Ajuste'::text]))                                                                                                                                                                                                |
| movimentacoes_silo        | movimentacoes_silo_subtipo_check | ((subtipo IS NULL) OR ((subtipo)::text = ANY ((ARRAY['Ensilagem'::character varying, 'Uso na alimentação'::character varying, 'Descarte'::character varying, 'Transferência'::character varying, 'Venda'::character varying])::text[])))                            |
| movimentacoes_silo        | movimentacoes_silo_tipo_check    | (tipo = ANY (ARRAY['Entrada'::text, 'Saída'::text]))                                                                                                                                                                                                                |
| profiles                  | profiles_perfil_check            | (perfil = ANY (ARRAY['Administrador'::text, 'Gerente'::text, 'Operador'::text]))                                                                                                                                                                                    |
| silos                     | silos_tipo_check                 | (tipo = ANY (ARRAY['Superfície'::text, 'Trincheira'::text, 'Bag'::text, 'Outros'::text]))                                                                                                                                                                           |
| silos                     | chk_custo_producao_silos         | (custo_producao >= (0)::numeric)                                                                                                                                                                                                                                    |
| talhoes                   | chk_custo_producao_talhoes       | (custo_producao >= (0)::numeric)                                                                                                                                                                                                                                    |
| talhoes                   | area_positive                    | (area_ha > (0)::numeric)                                                                                                                                                                                                                                            |
| tipos_insumo              | chk_nome_length_tipo             | (length((nome)::text) >= 2)                                                                                                                                                                                                                                         |
| tipos_insumo              | chk_nome_not_empty_tipo          | ((nome)::text <> ''::text)                                                                                                                                                                                                                                          |
```

### 🧭 Princípio: dupla validação

Toda regra de domínio crítica **deve** estar:
1. ✅ No banco (CHECK constraint) — segurança absoluta
2. ✅ No Zod (`validators/`) — UX (mensagem de erro antes de submit)

---

## 🗺️ SEÇÃO 10 — MAPA DE DOMÍNIO

### 10.1 Hierarquia multitenant

```
auth.users (Supabase Auth)
   └── profiles (1:1)
        └── fazendas (N:1 via fazenda_id)
             ├── silos
             │    ├── movimentacoes_silo
             │    ├── avaliacoes_bromatologicas
             │    ├── avaliacoes_psps
             │    └── planejamentos_silagem
             ├── talhoes
             │    ├── ciclos_agricolas
             │    ├── atividades_campo
             │    └── eventos_dap
             ├── maquinas
             │    ├── manutencoes
             │    ├── abastecimentos
             │    ├── uso_maquinas
             │    └── planos_manutencao
             ├── insumos
             │    └── movimentacoes_insumo
             ├── financeiro
             └── (rebanho)
                  ├── categorias_rebanho
                  └── periodos_confinamento
```

### 10.2 Tabelas globais (sem `fazenda_id`)

- `categorias_insumo` — catálogo público
- `tipos_insumo` — catálogo público

---

## 🎯 SEÇÃO 11 — MATRIZ DE PERMISSÕES POR ROLE

| Tabela | Admin | Gerente | Operador | Visualizador |
|---|:-:|:-:|:-:|:-:|
| `silos` | CRUD | CRUD | CRU | R |
| `talhoes` | CRUD | CRUD | CRU | R |
| `maquinas` | CRUD | CRUD | CRU | R |
| `manutencoes` | CRUD | CRUD | CRU | R |
| `abastecimentos` | CRUD | CRUD | CRU | R |
| `uso_maquinas` | CRUD | CRUD | CRU | R |
| `insumos` | CRUD | CRUD | CRU | R |
| `movimentacoes_insumo` | CRUD | CRUD | CRU | R |
| `movimentacoes_silo` | CRUD | CRUD | CRU | R |
| `avaliacoes_bromatologicas` | CRUD | CRUD | CRU | R |
| `avaliacoes_psps` | CRUD | CRUD | CRU | R |
| `financeiro` | CRUD | CRUD | ❌ | ❌ |
| `profiles` | RU (self) | RU (self) | RU (self) | R (self) |
| `fazendas` | CRUD | RU | R | R |
| `categorias_insumo` | R (público) | R (público) | R (público) | R (público) |
| `tipos_insumo` | R (público) | R (público) | R (público) | R (público) |

> **Legenda:** C=Create, R=Read, U=Update, D=Delete  
> **Validar contra Seção 4 (Policies RLS) — fonte de verdade absoluta.**

---

## 🚦 SEÇÃO 12 — DÍVIDAS TÉCNICAS CONHECIDAS

### Do `ARCHITECTURE_REVIEW.md` (25/04/2026)

- [ ] **TODO Bromatologia:** verificar se `AvaliacaoBromatologicaDialog.tsx` agora persiste no banco
- [ ] **TODO PSPS:** verificar se `AvaliacaoPspsDialog.tsx` agora persiste no banco
- [ ] **TODO Insumos:** integração `movimentacoes_insumo` → `financeiro` ao marcar `registrar_como_despesa`
- [ ] **Índice em `planos_manutencao(fazenda_id)`:** confirmar via Seção 6
- [ ] **Tipos manuais vs Zod:** unificar `lib/supabase.ts` com inferência de `validators/`
- [ ] **`eslint-disable-line react-hooks/exhaustive-deps`** em `SiloForm.tsx` e `MovimentacaoDialog.tsx`

### Rotas mockadas (sem persistência)

- `/dashboard/assessoria` — UI/Mock
- `/dashboard/produtos` — UI/Mock
- `/dashboard/configuracoes` — parcialmente UI/Mock

---

## 📚 SEÇÃO 13 — REFERÊNCIAS RÁPIDAS

### 🔍 Como buscar coisas neste documento

| Quero saber... | Vá para... |
|---|---|
| Qual o tipo de uma coluna? | Seção 3 |
| Quem pode deletar uma tabela? | Seção 4 + Seção 11 |
| Que coluna o trigger preenche? | Seção 5.2 |
| A query é otimizada? | Seção 6 |
| Apagar fazenda apaga os silos? | Seção 7 |
| A tabela tem dados? | Seção 8 |
| Que validação tem no banco? | Seção 9 |

### 🛠️ Comandos úteis

```bash
# Atualizar este snapshot (rodar as 8 queries no Supabase SQL Editor)
# e colar resultados nas seções correspondentes

# Buscar uso de helper legado no código
grep -r "get_my_fazenda_id" --include="*.ts" --include="*.tsx" .
grep -r "is_admin_or_manager" --include="*.ts" --include="*.tsx" .

# Buscar todos os .insert() pra checar campos enviados
grep -rn "\.insert(" --include="*.ts" --include="*.tsx" app/ components/ hooks/

# Buscar todos os .delete() pra checar consistência com policies
grep -rn "\.delete(" --include="*.ts" --include="*.tsx" app/ components/ hooks/
```

---

## 🔄 HISTÓRICO DE ATUALIZAÇÕES

| Data | Versão | Alteração |
|---|---|---|
| _(preencher)_ | 1.0 | Snapshot inicial pós-hardening RLS PT-BR |

---

## ✅ CHECKLIST DE GERAÇÃO DESTE DOCUMENTO

- [ ] Query 1 executada e colada na Seção 3
- [ ] Query 2 executada e colada na Seção 4
- [ ] Query 3 executada e colada na Seção 5.1
- [ ] Query 4 executada e colada na Seção 5.2
- [ ] Query 5 executada e colada na Seção 6
- [ ] Query 6 executada e colada na Seção 7
- [ ] Query 7 executada e colada na Seção 8
- [ ] Query 8 executada e colada na Seção 9
- [ ] Lista de colunas auto-preenchidas (Seção 5.2) atualizada
- [ ] Data e versão preenchidas no cabeçalho
- [ ] Histórico de atualizações preenchido
- [ ] Arquivo salvo em `docs/database-snapshot.md`
