-- supabase/migrations/20260416090100_alter_insumos_add_columns.sql
-- Expandir tabela insumos com novos campos

ALTER TABLE insumos ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias_insumo(id);
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS tipo_id UUID REFERENCES tipos_insumo(id);
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS custo_medio NUMERIC(12,4) DEFAULT 0;
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS fornecedor VARCHAR(255);
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS local_armazen VARCHAR(255);
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Soft-delete (já deve existir, mas garantir)
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- Auditoria (já deve existir, mas garantir)
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES auth.users(id);
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS atualizado_por UUID REFERENCES auth.users(id);

-- Constraints
ALTER TABLE insumos ADD CONSTRAINT chk_custo_medio_nonneg CHECK(custo_medio >= 0) NOT VALID;
ALTER TABLE insumos ADD CONSTRAINT chk_fornecedor_min CHECK(fornecedor IS NULL OR LENGTH(TRIM(fornecedor)) > 0) NOT VALID;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_insumos_categoria_id ON insumos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_insumos_tipo_id ON insumos(tipo_id);
CREATE INDEX IF NOT EXISTS idx_insumos_fazenda_ativo ON insumos(fazenda_id, ativo);
CREATE INDEX IF NOT EXISTS idx_insumos_local_armazen ON insumos(local_armazen);

COMMENT ON COLUMN insumos.categoria_id IS 'FK: Categoria do insumo (ex: Fertilizantes)';
COMMENT ON COLUMN insumos.tipo_id IS 'FK: Tipo dentro da categoria (NULL se categoria sem subtipos)';
COMMENT ON COLUMN insumos.custo_medio IS 'Custo Médio Ponderado (CMP) — recalculado em cada entrada';
COMMENT ON COLUMN insumos.fornecedor IS 'Fornecedor principal deste insumo';
COMMENT ON COLUMN insumos.local_armazen IS 'Local de armazenamento (ex: Galpão 1, Hangar A)';
