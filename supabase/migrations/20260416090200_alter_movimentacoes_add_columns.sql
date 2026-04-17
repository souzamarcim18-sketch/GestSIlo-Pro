-- supabase/migrations/20260416090200_alter_movimentacoes_add_columns.sql
-- Expandir movimentacoes_insumo com novos campos

ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS tipo_saida VARCHAR(50);
ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS destino_tipo VARCHAR(50);
ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS destino_id UUID;
ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS origem VARCHAR(50) DEFAULT 'manual';
ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS sinal_ajuste SMALLINT;
ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS despesa_id UUID REFERENCES financeiro(id) ON DELETE SET NULL;

-- Auditoria (já deve existir, mas garantir)
ALTER TABLE movimentacoes_insumo ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES auth.users(id);

-- Constraints
ALTER TABLE movimentacoes_insumo ADD CONSTRAINT chk_tipo_saida CHECK(
  tipo_saida IS NULL OR tipo_saida IN ('USO_INTERNO', 'TRANSFERENCIA', 'VENDA', 'DEVOLUCAO', 'DESCARTE', 'TROCA')
) NOT VALID;

ALTER TABLE movimentacoes_insumo ADD CONSTRAINT chk_origem CHECK(
  origem IN ('manual', 'talhao', 'frota', 'silo', 'financeiro')
) NOT VALID;

ALTER TABLE movimentacoes_insumo ADD CONSTRAINT chk_sinal_ajuste CHECK(
  sinal_ajuste IS NULL OR sinal_ajuste IN (-1, 1)
) NOT VALID;

-- Índices
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo_saida ON movimentacoes_insumo(tipo_saida);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_origem ON movimentacoes_insumo(origem);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_despesa_id ON movimentacoes_insumo(despesa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data_desc ON movimentacoes_insumo(data DESC);

COMMENT ON COLUMN movimentacoes_insumo.tipo_saida IS 'Tipo de saída (NULL para Entrada/Ajuste). Ex: USO_INTERNO, VENDA, DEVOLUCAO';
COMMENT ON COLUMN movimentacoes_insumo.sinal_ajuste IS 'Sinal de ajuste: +1 (ganho) ou -1 (perda). NULL para Entrada/Saída';
COMMENT ON COLUMN movimentacoes_insumo.despesa_id IS 'FK: Despesa financeira associada (1:1). Preenchida se registrar_como_despesa=true';
COMMENT ON COLUMN movimentacoes_insumo.origem IS 'Origem da movimentação: manual, talhao, frota, silo, financeiro';
