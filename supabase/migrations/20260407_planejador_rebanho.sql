-- Migration: Criar tabelas para o Planejador de Necessidade de Silagem (Item 4.7)
-- Data: 2026-04-07

-- 1. Tabela de Categorias do Rebanho (Consumo de Silagem)
CREATE TABLE IF NOT EXISTS categorias_rebanho (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id              UUID NOT NULL REFERENCES fazendas(id),
  nome                    TEXT NOT NULL,  -- ex: "Vacas em lactação"
  quantidade_cabecas      INTEGER NOT NULL DEFAULT 0,
  consumo_ms_kg_cab_dia   NUMERIC(6,2) NOT NULL,  -- kg MS/cabeça/dia
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Períodos de Trato (Planejamento Sazonal)
CREATE TABLE IF NOT EXISTS periodos_confinamento (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id  UUID NOT NULL REFERENCES fazendas(id),
  nome        TEXT NOT NULL,  -- ex: "Seca 2025"
  data_inicio DATE NOT NULL,
  data_fim    DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar Segurança (Row Level Security)
ALTER TABLE categorias_rebanho ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodos_confinamento ENABLE ROW LEVEL SECURITY;

-- 4. Criar Políticas de Acesso (Filtro por Fazenda do Usuário Logado)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'acesso_fazenda_categorias') THEN
        CREATE POLICY "acesso_fazenda_categorias" ON categorias_rebanho
          FOR ALL USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'acesso_fazenda_periodos') THEN
        CREATE POLICY "acesso_fazenda_periodos" ON periodos_confinamento
          FOR ALL USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));
    END IF;
END $$;

-- 5. Comentários para Documentação
COMMENT ON TABLE categorias_rebanho IS 'Categorias de animais e seu consumo diário de Matéria Seca (MS)';
COMMENT ON TABLE periodos_confinamento IS 'Períodos de trato planejado (ex: período seco ou confinamento)';
