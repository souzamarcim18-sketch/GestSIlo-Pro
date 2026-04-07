-- Migration para o item 4.1 - Dados Adicionais no Silo
ALTER TABLE silos
  ADD COLUMN IF NOT EXISTS materia_seca_percent   NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS consumo_medio_diario_ton NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS insumo_lona_id         UUID REFERENCES insumos(id),
  ADD COLUMN IF NOT EXISTS insumo_inoculante_id   UUID REFERENCES insumos(id);

-- Comentários para documentação
COMMENT ON COLUMN silos.materia_seca_percent IS 'Porcentagem de Matéria Seca (MS) da silagem ensilada';
COMMENT ON COLUMN silos.consumo_medio_diario_ton IS 'Consumo médio retirado por dia em toneladas';
COMMENT ON COLUMN silos.insumo_lona_id IS 'Referência ao insumo do tipo lona utilizado';
COMMENT ON COLUMN silos.insumo_inoculante_id IS 'Referência ao insumo do tipo inoculante utilizado';
