-- Migration: 20260524000001_calendario_indices
-- Objetivo: índices de data para as queries do Calendário Unificado
-- Não altera nenhuma tabela, policy ou função existente.

-- eventos_dap: data_esperada é o campo principal do calendário
CREATE INDEX IF NOT EXISTS idx_eventos_dap_data_esperada
  ON public.eventos_dap (fazenda_id, data_esperada)
  WHERE data_esperada IS NOT NULL;

-- manutencoes: dois campos de data alternados (data_prevista quando não realizada)
CREATE INDEX IF NOT EXISTS idx_manutencoes_data_prevista
  ON public.manutencoes (fazenda_id, data_prevista)
  WHERE data_prevista IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_manutencoes_data_realizada
  ON public.manutencoes (fazenda_id, data_realizada)
  WHERE data_realizada IS NOT NULL;

-- atividades_mao_obra: campo data
-- NOTA: idx_atividades_mao_obra_fazenda_data já existe (criado em 22/05/2026).
-- Este índice é complementar com nome diferente; IF NOT EXISTS garante idempotência.
CREATE INDEX IF NOT EXISTS idx_atividades_mao_obra_data
  ON public.atividades_mao_obra (fazenda_id, data);

-- eventos_manejo_pastagem: campo data (tabela criada em 2026-05-21)
CREATE INDEX IF NOT EXISTS idx_eventos_manejo_pastagem_data
  ON public.eventos_manejo_pastagem (fazenda_id, data);

-- ocupacoes_piquete: data_entrada e data_saida_prevista
CREATE INDEX IF NOT EXISTS idx_ocupacoes_piquete_data_entrada
  ON public.ocupacoes_piquete (fazenda_id, data_entrada);

CREATE INDEX IF NOT EXISTS idx_ocupacoes_piquete_data_saida_prevista
  ON public.ocupacoes_piquete (fazenda_id, data_saida_prevista)
  WHERE data_saida_prevista IS NOT NULL;

-- movimentacoes_silo: campo data
CREATE INDEX IF NOT EXISTS idx_movimentacoes_silo_data
  ON public.movimentacoes_silo (fazenda_id, data);
