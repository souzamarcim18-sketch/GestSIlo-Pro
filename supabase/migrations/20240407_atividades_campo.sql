-- Migration para o item 4.3 - Registro Detalhado de Atividades de Campo

CREATE TABLE IF NOT EXISTS atividades_campo (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id     UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  talhao_id      UUID NOT NULL REFERENCES talhoes(id) ON DELETE CASCADE,
  ciclo_id       UUID REFERENCES ciclos_agricolas(id) ON DELETE SET NULL,
  tipo_atividade TEXT NOT NULL CHECK (tipo_atividade IN (
    'Preparo de Solo', 'Calagem', 'Gessagem', 'Plantio',
    'Pulverização', 'Colheita', 'Análise de Solo', 'Irrigação'
  )),
  data_atividade DATE NOT NULL DEFAULT CURRENT_DATE,
  custo_total    NUMERIC(12,2),
  observacoes    TEXT,
  dados_json     JSONB,  -- Armazena dados específicos de cada tipo de atividade
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE atividades_campo ENABLE ROW LEVEL SECURITY;

-- Política de acesso por fazenda
CREATE POLICY "acesso_atividades_por_fazenda" ON atividades_campo
  FOR ALL USING (
    fazenda_id IN (
      SELECT fazenda_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Comentários para documentação
COMMENT ON TABLE atividades_campo IS 'Registro detalhado de operações realizadas nos talhões';
COMMENT ON COLUMN atividades_campo.dados_json IS 'Dados técnicos específicos (ex: doses, máquinas, profundidade) em formato JSON';
