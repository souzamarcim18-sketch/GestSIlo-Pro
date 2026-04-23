-- =============================================================================
-- Rollback: 20260423_frota_expansao.sql
-- Data: 2026-04-23
--
-- ATENÇÃO: Este rollback remove colunas e a tabela planos_manutencao.
-- Dados inseridos nessas colunas serão PERDIDOS permanentemente.
-- Execute apenas em ambiente de staging ou após backup completo.
-- =============================================================================

-- 1. Remover tabela planos_manutencao (cascade remove RLS policies automaticamente)
DROP TABLE IF EXISTS public.planos_manutencao;

-- 2. Reverter constraints de maquinas
ALTER TABLE public.maquinas DROP CONSTRAINT IF EXISTS maquinas_status_check;
ALTER TABLE public.maquinas DROP CONSTRAINT IF EXISTS maquinas_tipo_check;

-- Restaurar constraint original de tipo (sem os 3 novos valores)
ALTER TABLE public.maquinas
  ADD CONSTRAINT maquinas_tipo_check
  CHECK (tipo IN ('Trator', 'Colheitadeira', 'Pulverizador', 'Caminhão', 'Outros'));

-- 3. Remover novos campos de maquinas
ALTER TABLE public.maquinas DROP COLUMN IF EXISTS status;
ALTER TABLE public.maquinas DROP COLUMN IF EXISTS numero_serie;
ALTER TABLE public.maquinas DROP COLUMN IF EXISTS placa;
ALTER TABLE public.maquinas DROP COLUMN IF EXISTS potencia_cv;
ALTER TABLE public.maquinas DROP COLUMN IF EXISTS horimetro_atual;
ALTER TABLE public.maquinas DROP COLUMN IF EXISTS valor_residual;
ALTER TABLE public.maquinas DROP COLUMN IF EXISTS vida_util_horas;
ALTER TABLE public.maquinas DROP COLUMN IF EXISTS largura_trabalho_metros;
ALTER TABLE public.maquinas DROP COLUMN IF EXISTS tratores_compativeis;

-- 4. Remover novos campos de uso_maquinas
ALTER TABLE public.uso_maquinas DROP COLUMN IF EXISTS horimetro_inicio;
ALTER TABLE public.uso_maquinas DROP COLUMN IF EXISTS horimetro_fim;
ALTER TABLE public.uso_maquinas DROP COLUMN IF EXISTS implemento_id;
ALTER TABLE public.uso_maquinas DROP COLUMN IF EXISTS talhao_id;
ALTER TABLE public.uso_maquinas DROP COLUMN IF EXISTS tipo_operacao;
ALTER TABLE public.uso_maquinas DROP COLUMN IF EXISTS area_ha;
ALTER TABLE public.uso_maquinas DROP COLUMN IF EXISTS origem;

-- 5. Remover novos campos de manutencoes
ALTER TABLE public.manutencoes DROP COLUMN IF EXISTS status;
ALTER TABLE public.manutencoes DROP COLUMN IF EXISTS data_prevista;
ALTER TABLE public.manutencoes DROP COLUMN IF EXISTS data_realizada;
ALTER TABLE public.manutencoes DROP COLUMN IF EXISTS horimetro;
ALTER TABLE public.manutencoes DROP COLUMN IF EXISTS proxima_manutencao_horimetro;
ALTER TABLE public.manutencoes DROP COLUMN IF EXISTS responsavel;
ALTER TABLE public.manutencoes DROP COLUMN IF EXISTS mao_de_obra_tipo;
ALTER TABLE public.manutencoes DROP COLUMN IF EXISTS mao_de_obra_valor;
ALTER TABLE public.manutencoes DROP COLUMN IF EXISTS pecas;

-- 6. Remover novos campos de abastecimentos
ALTER TABLE public.abastecimentos DROP COLUMN IF EXISTS preco_litro;
ALTER TABLE public.abastecimentos DROP COLUMN IF EXISTS fornecedor;
ALTER TABLE public.abastecimentos DROP COLUMN IF EXISTS horimetro;

-- =============================================================================
-- FIM DO ROLLBACK
-- =============================================================================
