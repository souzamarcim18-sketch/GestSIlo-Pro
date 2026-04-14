-- FASE 0: Reformulação completa da tabela silos
-- Data: 2026-04-13
-- Escopo: Alterações em silos table apenas
-- Tabelas de avaliações e RLS policies serão criadas em migrations separadas

-- ========================================
-- 1. UPDATE TIPO SILO VALUES
-- ========================================

-- Remover constraint antiga se existir
ALTER TABLE silos DROP CONSTRAINT IF EXISTS silos_tipo_check;

-- Migrar dados: Bolsa→Bag, Bunker→Trincheira, Convencional→Superfície
UPDATE silos
SET tipo = CASE
  WHEN tipo = 'Bolsa' THEN 'Bag'
  WHEN tipo = 'Bunker' THEN 'Trincheira'
  WHEN tipo = 'Convencional' THEN 'Superfície'
  ELSE 'Outros'
END
WHERE tipo IN ('Bolsa', 'Bunker', 'Convencional');

-- Recriar constraint com novos valores permitidos
ALTER TABLE silos
ADD CONSTRAINT silos_tipo_check CHECK (tipo IN ('Superfície', 'Trincheira', 'Bag', 'Outros'));

-- ========================================
-- 2. ADICIONAR NOVAS COLUNAS EM SILOS
-- ========================================

ALTER TABLE silos
  ADD COLUMN talhao_id UUID,
  ADD COLUMN cultura_ensilada VARCHAR(100),
  ADD COLUMN data_fechamento DATE,
  ADD COLUMN data_abertura_prevista DATE,
  ADD COLUMN data_abertura_real DATE,
  ADD COLUMN volume_ensilado_ton_mv NUMERIC(10, 2),
  ADD COLUMN comprimento_m NUMERIC(8, 2),
  ADD COLUMN largura_m NUMERIC(8, 2),
  ADD COLUMN altura_m NUMERIC(8, 2),
  ADD COLUMN observacoes_gerais TEXT;

-- ========================================
-- 3. REMOVER COLUNAS ANTIGAS EM SILOS
-- ========================================

ALTER TABLE silos
  DROP COLUMN IF EXISTS capacidade,
  DROP COLUMN IF EXISTS localizacao,
  DROP COLUMN IF EXISTS consumo_medio_diario_ton;

-- ========================================
-- PRÓXIMAS MIGRATIONS
-- ========================================
--
-- 1. Criar tabelas de avaliações:
--    - avaliacoes_bromatologicas
--    - avaliacoes_psps
--
-- 2. Adicionar coluna subtipo a movimentacoes_silo
--
-- 3. Criar RLS policies para:
--    - avaliacoes_bromatologicas
--    - avaliacoes_psps
--
-- 4. Adicionar FK constraint:
--    - silos.talhao_id → talhoes(id) [se tabela talhoes existir]
