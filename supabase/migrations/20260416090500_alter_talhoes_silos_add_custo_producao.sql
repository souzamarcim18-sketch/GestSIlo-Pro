-- supabase/migrations/20260416090500_alter_talhoes_silos_add_custo_producao.sql
-- Preparar integração: adicionar coluna custo_producao

ALTER TABLE talhoes ADD COLUMN IF NOT EXISTS custo_producao NUMERIC(12,2) DEFAULT 0;
ALTER TABLE silos ADD COLUMN IF NOT EXISTS custo_producao NUMERIC(12,2) DEFAULT 0;

-- Constraints
ALTER TABLE talhoes ADD CONSTRAINT chk_custo_producao_talhoes CHECK(custo_producao >= 0) NOT VALID;
ALTER TABLE silos ADD CONSTRAINT chk_custo_producao_silos CHECK(custo_producao >= 0) NOT VALID;

COMMENT ON COLUMN talhoes.custo_producao IS 'Custo agregado de insumos + mão de obra aplicados neste talhão';
COMMENT ON COLUMN silos.custo_producao IS 'Custo agregado de insumos (inoculante, lona) usados neste silo';
