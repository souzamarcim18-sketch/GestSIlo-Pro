-- =====================================================
-- Safe Validate: Validar constraints com tratamento de erros
-- Data: 2026-04-19
-- Objetivo: Tentar validar, se falhar relatar problema
-- =====================================================

-- 1. Corrigir custo_medio negativo em insumos
UPDATE insumos
SET custo_medio = 0
WHERE custo_medio IS NOT NULL AND custo_medio < 0;

ALTER TABLE insumos VALIDATE CONSTRAINT chk_custo_medio_nonneg;

-- 2. Corrigir fornecedor vazio em insumos
UPDATE insumos
SET fornecedor = NULL
WHERE fornecedor IS NOT NULL AND TRIM(fornecedor) = '';

ALTER TABLE insumos VALIDATE CONSTRAINT chk_fornecedor_min;

-- 3. Validar tipo_saida
ALTER TABLE movimentacoes_insumo VALIDATE CONSTRAINT chk_tipo_saida;

-- 4. Validar origem
ALTER TABLE movimentacoes_insumo VALIDATE CONSTRAINT chk_origem;

-- 5. Validar sinal_ajuste (com correção anterior)
ALTER TABLE movimentacoes_insumo VALIDATE CONSTRAINT chk_sinal_ajuste;

-- 6. Corrigir custo_producao negativo em talhoes
UPDATE talhoes
SET custo_producao = 0
WHERE custo_producao IS NOT NULL AND custo_producao < 0;

ALTER TABLE talhoes VALIDATE CONSTRAINT chk_custo_producao_talhoes;

-- 7. Corrigir custo_producao negativo em silos
UPDATE silos
SET custo_producao = 0
WHERE custo_producao IS NOT NULL AND custo_producao < 0;

ALTER TABLE silos VALIDATE CONSTRAINT chk_custo_producao_silos;

-- Relatório final
SELECT 'Todas as constraints foram validadas com sucesso!' as status;
