-- =====================================================
-- Migration: Validar constraints NOT VALID
-- Data: 2026-04-19
-- Objetivo: Validar todas as constraints adicionadas com NOT VALID
-- =====================================================

-- Constraints que foram adicionadas com NOT VALID em migrações anteriores
-- precisam ser validadas aqui para garantir que todos os dados existentes
-- já estão em conformidade

-- 1. insumos: chk_custo_medio_nonneg
ALTER TABLE insumos VALIDATE CONSTRAINT chk_custo_medio_nonneg;

-- 2. insumos: chk_fornecedor_min
ALTER TABLE insumos VALIDATE CONSTRAINT chk_fornecedor_min;

-- 3. movimentacoes_insumo: chk_tipo_saida
ALTER TABLE movimentacoes_insumo VALIDATE CONSTRAINT chk_tipo_saida;

-- 4. movimentacoes_insumo: chk_origem
ALTER TABLE movimentacoes_insumo VALIDATE CONSTRAINT chk_origem;

-- 5. movimentacoes_insumo: chk_sinal_ajuste
ALTER TABLE movimentacoes_insumo VALIDATE CONSTRAINT chk_sinal_ajuste;

-- 6. talhoes: chk_custo_producao_talhoes
ALTER TABLE talhoes VALIDATE CONSTRAINT chk_custo_producao_talhoes;

-- 7. silos: chk_custo_producao_silos
ALTER TABLE silos VALIDATE CONSTRAINT chk_custo_producao_silos;

-- 8. atividades_campo: chk_horas_maquina (se existir)
-- ALTER TABLE atividades_campo VALIDATE CONSTRAINT chk_horas_maquina;

-- 9. ciclos_agricolas: chk_produtividade (se existir)
-- ALTER TABLE ciclos_agricolas VALIDATE CONSTRAINT chk_produtividade_ton_ha;

COMMENT ON CONSTRAINT chk_custo_medio_nonneg ON insumos IS 'Custo médio não pode ser negativo — validado em 2026-04-19';
COMMENT ON CONSTRAINT chk_fornecedor_min ON insumos IS 'Fornecedor não pode ser vazio se fornecido — validado em 2026-04-19';
COMMENT ON CONSTRAINT chk_tipo_saida ON movimentacoes_insumo IS 'Tipo de saída deve estar em lista enumerar — validado em 2026-04-19';
COMMENT ON CONSTRAINT chk_origem ON movimentacoes_insumo IS 'Origem deve estar em lista enumerar — validado em 2026-04-19';
COMMENT ON CONSTRAINT chk_sinal_ajuste ON movimentacoes_insumo IS 'Ajuste deve ser -1 ou 1 — validado em 2026-04-19';
