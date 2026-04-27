1. ESTRUTURA GERAL DO BANCO
-- ============================================

-- 1.1 Lista todas as tabelas e contagem de colunas
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = t.table_name AND table_schema = 'public') AS qtd_colunas
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

| table_name                | qtd_colunas |
| ------------------------- | ----------- |
| abastecimentos            | 12          |
| atividades_campo          | 56          |
| avaliacoes_bromatologicas | 15          |
| avaliacoes_psps           | 15          |
| categorias_insumo         | 5           |
| categorias_rebanho        | 6           |
| ciclos_agricolas          | 13          |
| eventos_dap               | 14          |
| fazendas                  | 8           |
| financeiro                | 11          |
| insumos                   | 22          |
| manutencoes               | 18          |
| maquinas                  | 23          |
| movimentacoes_insumo      | 16          |
| movimentacoes_silo        | 11          |
| periodos_confinamento     | 6           |
| planejamentos_silagem     | 9           |
| planos_manutencao         | 10          |
| profiles                  | 6           |
| silos                     | 21          |
| talhoes                   | 10          |
| tipos_insumo              | 6           |
| uso_maquinas              | 14          |


-- 1.2 Mapeia todas as Foreign Keys e regras de DELETE
SELECT
    tc.table_name AS tabela_origem,
    kcu.column_name AS coluna_origem,
    ccu.table_name AS tabela_destino,
    ccu.column_name AS coluna_destino,
    rc.delete_rule AS on_delete
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tabela_origem, coluna_origem;

| tabela_origem             | coluna_origem          | tabela_destino    | coluna_destino | on_delete |
| ------------------------- | ---------------------- | ----------------- | -------------- | --------- |
| abastecimentos            | fazenda_id             | fazendas          | id             | CASCADE   |
| abastecimentos            | fazenda_id             | fazendas          | id             | CASCADE   |
| abastecimentos            | maquina_id             | maquinas          | id             | CASCADE   |
| atividades_campo          | ciclo_id               | ciclos_agricolas  | id             | CASCADE   |
| atividades_campo          | fazenda_id             | fazendas          | id             | NO ACTION |
| atividades_campo          | insumo_id              | insumos           | id             | SET NULL  |
| atividades_campo          | maquina_colheita_id    | maquinas          | id             | SET NULL  |
| atividades_campo          | maquina_compactacao_id | maquinas          | id             | SET NULL  |
| atividades_campo          | maquina_id             | maquinas          | id             | NO ACTION |
| atividades_campo          | maquina_transporte_id  | maquinas          | id             | SET NULL  |
| atividades_campo          | semente_id             | insumos           | id             | SET NULL  |
| atividades_campo          | talhao_id              | talhoes           | id             | CASCADE   |
| avaliacoes_bromatologicas | fazenda_id             | fazendas          | id             | CASCADE   |
| avaliacoes_bromatologicas | silo_id                | silos             | id             | CASCADE   |
| avaliacoes_psps           | fazenda_id             | fazendas          | id             | CASCADE   |
| avaliacoes_psps           | silo_id                | silos             | id             | CASCADE   |
| categorias_rebanho        | fazenda_id             | fazendas          | id             | CASCADE   |
| ciclos_agricolas          | fazenda_id             | fazendas          | id             | CASCADE   |
| ciclos_agricolas          | talhao_id              | talhoes           | id             | CASCADE   |
| eventos_dap               | atividade_campo_id     | atividades_campo  | id             | SET NULL  |
| eventos_dap               | ciclo_id               | ciclos_agricolas  | id             | CASCADE   |
| eventos_dap               | fazenda_id             | fazendas          | id             | CASCADE   |
| eventos_dap               | talhao_id              | talhoes           | id             | CASCADE   |
| financeiro                | fazenda_id             | fazendas          | id             | CASCADE   |
| insumos                   | categoria_id           | categorias_insumo | id             | SET NULL  |
| insumos                   | fazenda_id             | fazendas          | id             | CASCADE   |
| insumos                   | tipo_id                | tipos_insumo      | id             | SET NULL  |
| manutencoes               | fazenda_id             | fazendas          | id             | CASCADE   |
| manutencoes               | maquina_id             | maquinas          | id             | CASCADE   |
| maquinas                  | fazenda_id             | fazendas          | id             | CASCADE   |
| movimentacoes_insumo      | despesa_id             | financeiro        | id             | SET NULL  |
| movimentacoes_insumo      | insumo_id              | insumos           | id             | CASCADE   |
| movimentacoes_silo        | fazenda_id             | fazendas          | id             | CASCADE   |
| movimentacoes_silo        | silo_id                | silos             | id             | CASCADE   |
| periodos_confinamento     | fazenda_id             | fazendas          | id             | CASCADE   |
| planejamentos_silagem     | fazenda_id             | fazendas          | id             | CASCADE   |
| planos_manutencao         | fazenda_id             | fazendas          | id             | NO ACTION |
| planos_manutencao         | maquina_id             | maquinas          | id             | CASCADE   |
| profiles                  | fazenda_id             | fazendas          | id             | NO ACTION |
| silos                     | fazenda_id             | fazendas          | id             | CASCADE   |
| silos                     | insumo_inoculante_id   | insumos           | id             | SET NULL  |
| silos                     | insumo_lona_id         | insumos           | id             | SET NULL  |
| silos                     | talhao_id              | talhoes           | id             | SET NULL  |
| talhoes                   | fazenda_id             | fazendas          | id             | CASCADE   |
| tipos_insumo              | categoria_id           | categorias_insumo | id             | RESTRICT  |
| uso_maquinas              | fazenda_id             | fazendas          | id             | CASCADE   |
| uso_maquinas              | fazenda_id             | fazendas          | id             | CASCADE   |
| uso_maquinas              | implemento_id          | maquinas          | id             | SET NULL  |
| uso_maquinas              | maquina_id             | maquinas          | id             | CASCADE   |
| uso_maquinas              | talhao_id              | talhoes           | id             | SET NULL  |


-- ============================================
-- 2. SEGURANÇA E MULTITENANCY (RLS)
-- ============================================

-- 2.1 Tabelas que possuem fazenda_id
SELECT table_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name = 'fazenda_id'
ORDER BY table_name;

| table_name                |
| ------------------------- |
| _deprecated_user_profiles |
| abastecimentos            |
| atividades_campo          |
| avaliacoes_bromatologicas |
| avaliacoes_psps           |
| categorias_rebanho        |
| ciclos_agricolas          |
| eventos_dap               |
| financeiro                |
| insumos                   |
| manutencoes               |
| maquinas                  |
| movimentacoes_silo        |
| periodos_confinamento     |
| planejamentos_silagem     |
| planos_manutencao         |
| profiles                  |
| silos                     |
| talhoes                   |
| uso_maquinas              |


-- 2.2 RLS ativado em cada tabela (versão corrigida)
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_ativado
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity DESC, tablename;

| schemaname | tablename                 | rls_ativado |
| ---------- | ------------------------- | ----------- |
| public     | abastecimentos            | true        |
| public     | atividades_campo          | true        |
| public     | avaliacoes_bromatologicas | true        |
| public     | avaliacoes_psps           | true        |
| public     | categorias_insumo         | true        |
| public     | categorias_rebanho        | true        |
| public     | ciclos_agricolas          | true        |
| public     | eventos_dap               | true        |
| public     | fazendas                  | true        |
| public     | financeiro                | true        |
| public     | insumos                   | true        |
| public     | manutencoes               | true        |
| public     | maquinas                  | true        |
| public     | movimentacoes_insumo      | true        |
| public     | movimentacoes_silo        | true        |
| public     | periodos_confinamento     | true        |
| public     | planejamentos_silagem     | true        |
| public     | planos_manutencao         | true        |
| public     | profiles                  | true        |
| public     | silos                     | true        |
| public     | talhoes                   | true        |
| public     | tipos_insumo              | true        |
| public     | uso_maquinas              | true        |

-- 2.3 Lista TODAS as políticas RLS existentes
SELECT 
    tablename,
    policyname,
    cmd AS operacao,
    roles,
    qual AS condicao_using,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

| tablename                 | policyname                                | operacao | roles           | condicao_using                                                                                         | with_check                                                                                                                                           |
| ------------------------- | ----------------------------------------- | -------- | --------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| abastecimentos            | abastecimentos_delete                     | DELETE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| abastecimentos            | abastecimentos_insert                     | INSERT   | {public}        | null                                                                                                   | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| abastecimentos            | abastecimentos_select                     | SELECT   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| abastecimentos            | abastecimentos_update                     | UPDATE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| atividades_campo          | atividades_campo_delete                   | DELETE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| atividades_campo          | atividades_campo_insert                   | INSERT   | {public}        | null                                                                                                   | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| atividades_campo          | atividades_campo_select                   | SELECT   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| atividades_campo          | atividades_campo_update                   | UPDATE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| avaliacoes_bromatologicas | aval_brom_delete                          | DELETE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| avaliacoes_bromatologicas | aval_brom_insert                          | INSERT   | {public}        | null                                                                                                   | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| avaliacoes_bromatologicas | aval_brom_select                          | SELECT   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| avaliacoes_bromatologicas | aval_brom_update                          | UPDATE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| avaliacoes_psps           | aval_psps_delete                          | DELETE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| avaliacoes_psps           | aval_psps_insert                          | INSERT   | {public}        | null                                                                                                   | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| avaliacoes_psps           | aval_psps_select                          | SELECT   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| avaliacoes_psps           | aval_psps_update                          | UPDATE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| categorias_insumo         | categorias_select_public                  | SELECT   | {public}        | true                                                                                                   | null                                                                                                                                                 |
| categorias_rebanho        | categorias_rebanho_isolado_por_fazenda    | ALL      | {authenticated} | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| ciclos_agricolas          | ciclos_agricolas_delete                   | DELETE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| ciclos_agricolas          | ciclos_agricolas_insert                   | INSERT   | {public}        | null                                                                                                   | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| ciclos_agricolas          | ciclos_agricolas_select                   | SELECT   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| ciclos_agricolas          | ciclos_agricolas_update                   | UPDATE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| eventos_dap               | eventos_dap_delete                        | DELETE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| eventos_dap               | eventos_dap_insert                        | INSERT   | {public}        | null                                                                                                   | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| eventos_dap               | eventos_dap_select                        | SELECT   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| eventos_dap               | eventos_dap_update                        | UPDATE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| fazendas                  | fazendas_delete                           | DELETE   | {authenticated} | (id IN ( SELECT profiles.fazenda_id
   FROM profiles
  WHERE (profiles.id = auth.uid())))              | null                                                                                                                                                 |
| fazendas                  | fazendas_insert                           | INSERT   | {authenticated} | null                                                                                                   | ((owner_id = auth.uid()) AND (NOT (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.fazenda_id IS NOT NULL)))))) |
| fazendas                  | fazendas_select                           | SELECT   | {authenticated} | (id IN ( SELECT profiles.fazenda_id
   FROM profiles
  WHERE (profiles.id = auth.uid())))              | null                                                                                                                                                 |
| fazendas                  | fazendas_update                           | UPDATE   | {authenticated} | (id IN ( SELECT profiles.fazenda_id
   FROM profiles
  WHERE (profiles.id = auth.uid())))              | (id IN ( SELECT profiles.fazenda_id
   FROM profiles
  WHERE (profiles.id = auth.uid())))                                                            |
| financeiro                | financeiro_isolado_por_fazenda            | ALL      | {authenticated} | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| insumos                   | insumos_isolado_por_fazenda               | ALL      | {authenticated} | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| manutencoes               | manutencoes_isolado_por_fazenda           | ALL      | {authenticated} | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| maquinas                  | maquinas_isolado_por_fazenda              | ALL      | {authenticated} | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| movimentacoes_insumo      | movimentacoes_insumo_isolado_por_fazenda  | ALL      | {authenticated} | (insumo_id IN ( SELECT insumos.id
   FROM insumos
  WHERE (insumos.fazenda_id = get_my_fazenda_id()))) | (insumo_id IN ( SELECT insumos.id
   FROM insumos
  WHERE (insumos.fazenda_id = get_my_fazenda_id())))                                               |
| movimentacoes_silo        | mov_silo_delete                           | DELETE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| movimentacoes_silo        | mov_silo_insert                           | INSERT   | {public}        | null                                                                                                   | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| movimentacoes_silo        | mov_silo_select                           | SELECT   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| movimentacoes_silo        | mov_silo_update                           | UPDATE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| periodos_confinamento     | periodos_confinamento_isolado_por_fazenda | ALL      | {authenticated} | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| planejamentos_silagem     | planejamentos_silagem_isolado_por_fazenda | ALL      | {authenticated} | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| planos_manutencao         | planos_manutencao_isolado_por_fazenda     | ALL      | {authenticated} | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| profiles                  | profiles_insert                           | INSERT   | {public}        | null                                                                                                   | (id = ( SELECT auth.uid() AS uid))                                                                                                                   |
| profiles                  | profiles_select                           | SELECT   | {public}        | (id = ( SELECT auth.uid() AS uid))                                                                     | null                                                                                                                                                 |
| profiles                  | profiles_update                           | UPDATE   | {public}        | (id = ( SELECT auth.uid() AS uid))                                                                     | null                                                                                                                                                 |
| silos                     | silos_isolado_por_fazenda                 | ALL      | {authenticated} | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| talhoes                   | talhoes_isolado_por_fazenda               | ALL      | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| tipos_insumo              | tipos_select_public                       | SELECT   | {public}        | true                                                                                                   | null                                                                                                                                                 |
| uso_maquinas              | uso_maquinas_delete                       | DELETE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| uso_maquinas              | uso_maquinas_insert                       | INSERT   | {public}        | null                                                                                                   | (fazenda_id = get_my_fazenda_id())                                                                                                                   |
| uso_maquinas              | uso_maquinas_select                       | SELECT   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | null                                                                                                                                                 |
| uso_maquinas              | uso_maquinas_update                       | UPDATE   | {public}        | (fazenda_id = get_my_fazenda_id())                                                                     | (fazenda_id = get_my_fazenda_id())                                                                                                                   |

-- 2.4 Estrutura da tabela profiles (perfis de acesso)
SELECT column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles';

| column_name | data_type                | udt_name    | is_nullable |
| ----------- | ------------------------ | ----------- | ----------- |
| id          | uuid                     | uuid        | NO          |
| nome        | text                     | text        | NO          |
| email       | text                     | text        | NO          |
| perfil      | text                     | text        | YES         |
| fazenda_id  | uuid                     | uuid        | YES         |
| created_at  | timestamp with time zone | timestamptz | YES         |

-- ============================================
-- 3. PERFORMANCE E ÍNDICES
-- ============================================

-- 3.1 Lista todos os índices customizados
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;

| tablename                 | indexname                                   | indexdef                                                                                                                                      |
| ------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| abastecimentos            | idx_abastecimentos_fazenda_id               | CREATE INDEX idx_abastecimentos_fazenda_id ON public.abastecimentos USING btree (fazenda_id)                                                  |
| abastecimentos            | idx_abastecimentos_maquina_id               | CREATE INDEX idx_abastecimentos_maquina_id ON public.abastecimentos USING btree (maquina_id)                                                  |
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
| avaliacoes_bromatologicas | idx_avaliacoes_bromatologicas_fazenda_id    | CREATE INDEX idx_avaliacoes_bromatologicas_fazenda_id ON public.avaliacoes_bromatologicas USING btree (fazenda_id)                            |
| avaliacoes_bromatologicas | idx_avaliacoes_bromatologicas_silo_id       | CREATE INDEX idx_avaliacoes_bromatologicas_silo_id ON public.avaliacoes_bromatologicas USING btree (silo_id)                                  |
| avaliacoes_psps           | avaliacoes_psps_unique_silo_data_momento    | CREATE UNIQUE INDEX avaliacoes_psps_unique_silo_data_momento ON public.avaliacoes_psps USING btree (silo_id, data, momento)                   |
| avaliacoes_psps           | idx_avaliacoes_psps_fazenda_id              | CREATE INDEX idx_avaliacoes_psps_fazenda_id ON public.avaliacoes_psps USING btree (fazenda_id)                                                |
| avaliacoes_psps           | idx_avaliacoes_psps_silo_id                 | CREATE INDEX idx_avaliacoes_psps_silo_id ON public.avaliacoes_psps USING btree (silo_id)                                                      |
| categorias_insumo         | categorias_insumo_nome_key                  | CREATE UNIQUE INDEX categorias_insumo_nome_key ON public.categorias_insumo USING btree (nome)                                                 |
| categorias_rebanho        | idx_categorias_rebanho_fazenda_id           | CREATE INDEX idx_categorias_rebanho_fazenda_id ON public.categorias_rebanho USING btree (fazenda_id)                                          |
| ciclos_agricolas          | idx_ciclos_agricolas_fazenda_id             | CREATE INDEX idx_ciclos_agricolas_fazenda_id ON public.ciclos_agricolas USING btree (fazenda_id)                                              |
| ciclos_agricolas          | idx_ciclos_agricolas_talhao_id              | CREATE INDEX idx_ciclos_agricolas_talhao_id ON public.ciclos_agricolas USING btree (talhao_id)                                                |
| eventos_dap               | idx_eventos_dap_atividade_campo_id          | CREATE INDEX idx_eventos_dap_atividade_campo_id ON public.eventos_dap USING btree (atividade_campo_id)                                        |
| eventos_dap               | idx_eventos_dap_ciclo_id                    | CREATE INDEX idx_eventos_dap_ciclo_id ON public.eventos_dap USING btree (ciclo_id)                                                            |
| eventos_dap               | idx_eventos_dap_fazenda_id                  | CREATE INDEX idx_eventos_dap_fazenda_id ON public.eventos_dap USING btree (fazenda_id)                                                        |
| eventos_dap               | idx_eventos_dap_talhao_id                   | CREATE INDEX idx_eventos_dap_talhao_id ON public.eventos_dap USING btree (talhao_id)                                                          |
| financeiro                | idx_financeiro_fazenda_id                   | CREATE INDEX idx_financeiro_fazenda_id ON public.financeiro USING btree (fazenda_id)                                                          |
| insumos                   | idx_insumos_categoria_id                    | CREATE INDEX idx_insumos_categoria_id ON public.insumos USING btree (categoria_id)                                                            |
| insumos                   | idx_insumos_fazenda_ativo                   | CREATE INDEX idx_insumos_fazenda_ativo ON public.insumos USING btree (fazenda_id, ativo)                                                      |
| insumos                   | idx_insumos_fazenda_id                      | CREATE INDEX idx_insumos_fazenda_id ON public.insumos USING btree (fazenda_id)                                                                |
| insumos                   | idx_insumos_nome_trgm                       | CREATE INDEX idx_insumos_nome_trgm ON public.insumos USING gin (nome gin_trgm_ops)                                                            |
| insumos                   | idx_insumos_tipo_id                         | CREATE INDEX idx_insumos_tipo_id ON public.insumos USING btree (tipo_id)                                                                      |
| manutencoes               | idx_manutencoes_fazenda_id                  | CREATE INDEX idx_manutencoes_fazenda_id ON public.manutencoes USING btree (fazenda_id)                                                        |
| manutencoes               | idx_manutencoes_maquina_id                  | CREATE INDEX idx_manutencoes_maquina_id ON public.manutencoes USING btree (maquina_id)                                                        |
| maquinas                  | idx_maquinas_fazenda_id                     | CREATE INDEX idx_maquinas_fazenda_id ON public.maquinas USING btree (fazenda_id)                                                              |
| movimentacoes_insumo      | idx_movimentacoes_data                      | CREATE INDEX idx_movimentacoes_data ON public.movimentacoes_insumo USING btree (data DESC)                                                    |
| movimentacoes_insumo      | idx_movimentacoes_insumo_despesa_id         | CREATE INDEX idx_movimentacoes_insumo_despesa_id ON public.movimentacoes_insumo USING btree (despesa_id)                                      |
| movimentacoes_insumo      | idx_movimentacoes_insumo_insumo_id          | CREATE INDEX idx_movimentacoes_insumo_insumo_id ON public.movimentacoes_insumo USING btree (insumo_id)                                        |
| movimentacoes_silo        | idx_movimentacoes_silo_fazenda_id           | CREATE INDEX idx_movimentacoes_silo_fazenda_id ON public.movimentacoes_silo USING btree (fazenda_id)                                          |
| movimentacoes_silo        | idx_movimentacoes_silo_silo_id              | CREATE INDEX idx_movimentacoes_silo_silo_id ON public.movimentacoes_silo USING btree (silo_id)                                                |
| movimentacoes_silo        | movimentacoes_silo_uma_entrada_por_silo     | CREATE UNIQUE INDEX movimentacoes_silo_uma_entrada_por_silo ON public.movimentacoes_silo USING btree (silo_id) WHERE (tipo = 'Entrada'::text) |
| periodos_confinamento     | idx_periodos_confinamento_fazenda_id        | CREATE INDEX idx_periodos_confinamento_fazenda_id ON public.periodos_confinamento USING btree (fazenda_id)                                    |
| planejamentos_silagem     | idx_planejamentos_silagem_fazenda_id        | CREATE INDEX idx_planejamentos_silagem_fazenda_id ON public.planejamentos_silagem USING btree (fazenda_id)                                    |
| profiles                  | idx_profiles_fazenda_id                     | CREATE INDEX idx_profiles_fazenda_id ON public.profiles USING btree (fazenda_id)                                                              |
| silos                     | idx_silos_fazenda_id                        | CREATE INDEX idx_silos_fazenda_id ON public.silos USING btree (fazenda_id)                                                                    |
| silos                     | idx_silos_insumo_inoculante_id              | CREATE INDEX idx_silos_insumo_inoculante_id ON public.silos USING btree (insumo_inoculante_id)                                                |
| silos                     | idx_silos_insumo_lona_id                    | CREATE INDEX idx_silos_insumo_lona_id ON public.silos USING btree (insumo_lona_id)                                                            |
| talhoes                   | idx_talhoes_fazenda_id                      | CREATE INDEX idx_talhoes_fazenda_id ON public.talhoes USING btree (fazenda_id)                                                                |
| tipos_insumo              | idx_tipos_insumo_categoria_id               | CREATE INDEX idx_tipos_insumo_categoria_id ON public.tipos_insumo USING btree (categoria_id)                                                  |
| tipos_insumo              | unique_categoria_tipo                       | CREATE UNIQUE INDEX unique_categoria_tipo ON public.tipos_insumo USING btree (categoria_id, nome)                                             |
| uso_maquinas              | idx_uso_maquinas_fazenda_id                 | CREATE INDEX idx_uso_maquinas_fazenda_id ON public.uso_maquinas USING btree (fazenda_id)                                                      |
| uso_maquinas              | idx_uso_maquinas_maquina_id                 | CREATE INDEX idx_uso_maquinas_maquina_id ON public.uso_maquinas USING btree (maquina_id)                                                      |


-- 3.2 Tabelas com fazenda_id SEM índice (gargalo de performance!)
SELECT c.table_name AS tabela_sem_indice_em_fazenda_id
FROM information_schema.columns c
WHERE c.table_schema = 'public' 
  AND c.column_name = 'fazenda_id'
  AND NOT EXISTS (
      SELECT 1 FROM pg_indexes i
      WHERE i.schemaname = 'public'
        AND i.tablename = c.table_name
        AND i.indexdef ILIKE '%fazenda_id%'
  );

| tabela_sem_indice_em_fazenda_id |
| ------------------------------- |
| planos_manutencao               |
| _deprecated_user_profiles       |

-- ============================================
-- 4. LÓGICA NO BANCO (Triggers e Funções)
-- ============================================

-- 4.1 Triggers ativos
SELECT 
    event_object_table AS tabela,
    trigger_name,
    event_manipulation AS evento,
    action_timing AS quando
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY tabela, trigger_name;

| tabela                    | trigger_name                             | evento | quando |
| ------------------------- | ---------------------------------------- | ------ | ------ |
| abastecimentos            | trg_abastecimentos_fazenda_id            | INSERT | BEFORE |
| atividades_campo          | trg_calcular_analise_solo                | UPDATE | BEFORE |
| atividades_campo          | trg_calcular_analise_solo                | INSERT | BEFORE |
| atividades_campo          | trg_set_fazenda_id                       | UPDATE | BEFORE |
| atividades_campo          | trg_set_fazenda_id                       | INSERT | BEFORE |
| avaliacoes_bromatologicas | trg_avaliacoes_bromatologicas_fazenda_id | INSERT | BEFORE |
| avaliacoes_psps           | trg_avaliacoes_psps_fazenda_id           | INSERT | BEFORE |
| ciclos_agricolas          | trg_set_fazenda_id                       | INSERT | BEFORE |
| ciclos_agricolas          | trg_set_fazenda_id                       | UPDATE | BEFORE |
| eventos_dap               | trg_set_fazenda_id                       | INSERT | BEFORE |
| eventos_dap               | trg_set_fazenda_id                       | UPDATE | BEFORE |
| insumos                   | trg_insumos_atualizado_em                | UPDATE | BEFORE |
| movimentacoes_insumo      | mov_insumo_atualizar_estoque_cmp         | INSERT | AFTER  |
| movimentacoes_silo        | trg_movimentacoes_silo_fazenda_id        | INSERT | BEFORE |
| planejamentos_silagem     | trigger_updated_at_planejamentos         | UPDATE | BEFORE |
| uso_maquinas              | trg_uso_maquinas_fazenda_id              | INSERT | BEFORE |

-- 4.2 Funções customizadas
SELECT 
    routine_name,
    routine_type,
    data_type AS retorno
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

| routine_name                     | routine_type | retorno      |
| -------------------------------- | ------------ | ------------ |
| atualizar_custo_medio_e_estoque  | FUNCTION     | trigger      |
| atualizar_status_talhao          | FUNCTION     | trigger      |
| calcular_analise_solo            | FUNCTION     | trigger      |
| create_fazenda_and_link          | FUNCTION     | USER-DEFINED |
| get_insumos_abaixo_minimo        | FUNCTION     | USER-DEFINED |
| get_my_fazenda_id                | FUNCTION     | uuid         |
| handle_new_user                  | FUNCTION     | trigger      |
| preencher_fazenda_id_via_maquina | FUNCTION     | trigger      |
| preencher_fazenda_id_via_silo    | FUNCTION     | trigger      |
| set_fazenda_id_from_talhao       | FUNCTION     | trigger      |
| update_insumos_atualizado_em     | FUNCTION     | trigger      |
| update_updated_at_planejamentos  | FUNCTION     | trigger      |

-- ============================================
-- 5. SAÚDE / TAMANHO DO BANCO (Tier Gratuito)
-- ============================================

-- 5.1 ALTERNATIVA: Tamanho detalhado (dados + índices)
SELECT 
    relname AS tabela,
    pg_size_pretty(pg_total_relation_size(relid)) AS tamanho_total,
    pg_size_pretty(pg_relation_size(relid)) AS tamanho_dados,
    pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS tamanho_indices,
    n_live_tup AS linhas
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;

| tabela                    | tamanho_total | tamanho_dados | tamanho_indices | linhas |
| ------------------------- | ------------- | ------------- | --------------- | ------ |
| atividades_campo          | 176 kB        | 8192 bytes    | 168 kB          | 1      |
| insumos                   | 120 kB        | 8192 bytes    | 112 kB          | 0      |
| silos                     | 80 kB         | 8192 bytes    | 72 kB           | 1      |
| movimentacoes_insumo      | 80 kB         | 8192 bytes    | 72 kB           | 0      |
| movimentacoes_silo        | 80 kB         | 8192 bytes    | 72 kB           | 1      |
| tipos_insumo              | 64 kB         | 8192 bytes    | 56 kB           | 23     |
| avaliacoes_bromatologicas | 64 kB         | 8192 bytes    | 56 kB           | 0      |
| avaliacoes_psps           | 64 kB         | 8192 bytes    | 56 kB           | 0      |
| ciclos_agricolas          | 56 kB         | 8192 bytes    | 48 kB           | 1      |
| talhoes                   | 48 kB         | 8192 bytes    | 40 kB           | 1      |
| periodos_confinamento     | 48 kB         | 8192 bytes    | 40 kB           | 1      |
| categorias_insumo         | 48 kB         | 8192 bytes    | 40 kB           | 9      |
| categorias_rebanho        | 48 kB         | 8192 bytes    | 40 kB           | 1      |
| maquinas                  | 48 kB         | 8192 bytes    | 40 kB           | 1      |
| profiles                  | 48 kB         | 8192 bytes    | 40 kB           | 1      |
| financeiro                | 48 kB         | 8192 bytes    | 40 kB           | 0      |
| eventos_dap               | 40 kB         | 0 bytes       | 40 kB           | 0      |
| fazendas                  | 32 kB         | 8192 bytes    | 24 kB           | 1      |
| uso_maquinas              | 32 kB         | 0 bytes       | 32 kB           | 0      |
| manutencoes               | 32 kB         | 0 bytes       | 32 kB           | 0      |
| abastecimentos            | 32 kB         | 0 bytes       | 32 kB           | 0      |
| planejamentos_silagem     | 24 kB         | 0 bytes       | 24 kB           | 0      |
| planos_manutencao         | 16 kB         | 0 bytes       | 16 kB           | 0      |

-- 5.2 Tamanho total do banco
SELECT pg_size_pretty(pg_database_size(current_database())) AS tamanho_db_total;

| tamanho_db_total |
| ---------------- |
| 13 MB            |

-- ============================================
-- 6. STORAGE (Buckets)
-- ============================================

-- 6.1 Buckets configurados
SELECT id, name, public, created_at, file_size_limit
FROM storage.buckets
ORDER BY created_at;

Success. No rows returned


