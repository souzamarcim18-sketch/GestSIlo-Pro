-- supabase/migrations/20260416_planejamento_silagem.sql
-- Migração: Criar tabela de planejamentos de silagem (Fase 1)

CREATE TABLE IF NOT EXISTS planejamentos_silagem (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id                  UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome                        TEXT NOT NULL,
  sistema                     JSONB NOT NULL,
  rebanho                     JSONB NOT NULL,
  parametros                  JSONB NOT NULL,
  resultados                  JSONB NOT NULL,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE planejamentos_silagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso_fazenda_planejamentos" ON planejamentos_silagem
  FOR ALL USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

-- Index
CREATE INDEX idx_planejamentos_fazenda ON planejamentos_silagem(fazenda_id);

-- NOTA: Se no futuro for implementada edição de planejamentos,
-- adicionar trigger para atualizar updated_at automaticamente:
--
-- CREATE OR REPLACE FUNCTION update_updated_at_planejamentos()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = NOW();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER trigger_updated_at_planejamentos
--   BEFORE UPDATE ON planejamentos_silagem
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_planejamentos();
