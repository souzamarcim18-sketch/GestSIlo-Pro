-- =====================================================
-- Fix: Corrigir constraint chk_sinal_ajuste
-- Data: 2026-04-19
-- Problema: Dados nulos em sinal_ajuste impedem validação
-- =====================================================

-- 1. Verificar quantos registros têm sinal_ajuste inválido
SELECT COUNT(*) as registros_invalidos
FROM movimentacoes_insumo
WHERE sinal_ajuste IS NOT NULL AND sinal_ajuste NOT IN (-1, 1);

-- 2. Corrigir dados inválidos: se há alguns com valor fora de -1, 1
UPDATE movimentacoes_insumo
SET sinal_ajuste =
  CASE
    WHEN tipo = 'Entrada' THEN 1
    WHEN tipo = 'Saída' THEN -1
    ELSE NULL
  END
WHERE sinal_ajuste IS NULL OR sinal_ajuste NOT IN (-1, 1);

-- 3. Validar constraint
ALTER TABLE movimentacoes_insumo VALIDATE CONSTRAINT chk_sinal_ajuste;

-- 4. Verificação final
SELECT COUNT(*) as total,
       COUNT(CASE WHEN sinal_ajuste IN (-1, 1) THEN 1 END) as validos,
       COUNT(CASE WHEN sinal_ajuste IS NULL THEN 1 END) as nulos,
       COUNT(CASE WHEN sinal_ajuste NOT IN (-1, 1) AND sinal_ajuste IS NOT NULL THEN 1 END) as invalidos
FROM movimentacoes_insumo;

COMMENT ON CONSTRAINT chk_sinal_ajuste ON movimentacoes_insumo IS 'Validado em 2026-04-19 — fixado dados inválidos';
