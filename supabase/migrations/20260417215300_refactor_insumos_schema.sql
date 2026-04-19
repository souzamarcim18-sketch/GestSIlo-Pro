-- =====================================================
-- Refactor: Normalização da tabela insumos
-- Data: 2026-04-17
-- Descrição: Remove colunas legadas (categoria, tipo, destino),
--            adiciona atualizado_em com trigger automática
-- =====================================================

-- 1. Remover colunas legadas (já substituídas por categoria_id e tipo_id)
ALTER TABLE insumos 
  DROP COLUMN IF EXISTS categoria,
  DROP COLUMN IF EXISTS tipo,
  DROP COLUMN IF EXISTS destino;

-- 2. Adicionar coluna atualizado_em
ALTER TABLE insumos 
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_insumos_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = extensions, public;

-- 4. Trigger que dispara a função em cada UPDATE
DROP TRIGGER IF EXISTS trg_insumos_atualizado_em ON insumos;

CREATE TRIGGER trg_insumos_atualizado_em
  BEFORE UPDATE ON insumos
  FOR EACH ROW 
  EXECUTE FUNCTION update_insumos_atualizado_em();
