-- Migration para o item 4.4 - Depreciação Automática de Máquinas

ALTER TABLE maquinas
  ADD COLUMN IF NOT EXISTS consumo_medio_lh    NUMERIC(6,2),  -- L/hora (para cálculo de diesel)
  ADD COLUMN IF NOT EXISTS valor_aquisicao     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS data_aquisicao      DATE,
  ADD COLUMN IF NOT EXISTS vida_util_anos      INTEGER DEFAULT 10;

-- Comentários para documentação
COMMENT ON COLUMN maquinas.consumo_medio_lh IS 'Consumo médio de combustível em litros por hora';
COMMENT ON COLUMN maquinas.valor_aquisicao IS 'Valor pago na compra da máquina';
COMMENT ON COLUMN maquinas.data_aquisicao IS 'Data em que a máquina foi adquirida';
COMMENT ON COLUMN maquinas.vida_util_anos IS 'Tempo estimado de vida útil em anos para cálculo de depreciação';
