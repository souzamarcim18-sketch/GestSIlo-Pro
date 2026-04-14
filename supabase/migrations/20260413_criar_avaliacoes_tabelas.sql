-- FASE 0: Criação de tabelas de avaliações
-- Data: 2026-04-13
-- Dependência: Migration 20260413_silos_reformulacao.sql deve ter passado

-- ========================================
-- 1. CRIAÇÃO: AVALIACOES_BROMATOLOGICAS
-- ========================================

CREATE TABLE avaliacoes_bromatologicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  momento VARCHAR(20) NOT NULL,
  ms NUMERIC(5, 2),
  pb NUMERIC(5, 2),
  fdn NUMERIC(5, 2),
  fda NUMERIC(5, 2),
  ee NUMERIC(5, 2),
  mm NUMERIC(5, 2),
  amido NUMERIC(5, 2),
  ndt NUMERIC(5, 2),
  ph NUMERIC(4, 2),
  avaliador VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_avaliacoes_bromatologicas_silo_id ON avaliacoes_bromatologicas(silo_id);
CREATE INDEX idx_avaliacoes_bromatologicas_data ON avaliacoes_bromatologicas(data);

-- ========================================
-- 2. CRIAÇÃO: AVALIACOES_PSPS
-- ========================================

CREATE TABLE avaliacoes_psps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  momento VARCHAR(20) NOT NULL,
  peneira_19mm NUMERIC(5, 2) NOT NULL,
  peneira_8_19mm NUMERIC(5, 2) NOT NULL,
  peneira_4_8mm NUMERIC(5, 2) NOT NULL,
  peneira_fundo_4mm NUMERIC(5, 2) NOT NULL,
  tamanho_teorico_corte_mm NUMERIC(5, 2),
  kernel_processor BOOLEAN DEFAULT FALSE,
  avaliador VARCHAR(100),
  tmp_mm NUMERIC(5, 2) GENERATED ALWAYS AS (
    (peneira_19mm * 19 + peneira_8_19mm * 13.5 + peneira_4_8mm * 6 + peneira_fundo_4mm * 0) / 100
  ) STORED,
  status_peneira_19mm VARCHAR(10) GENERATED ALWAYS AS (
    CASE WHEN peneira_19mm >= 5 THEN 'ok' ELSE 'fora' END
  ) STORED,
  status_peneira_8_19mm VARCHAR(10) GENERATED ALWAYS AS (
    CASE WHEN peneira_8_19mm >= 45 THEN 'ok' ELSE 'fora' END
  ) STORED,
  status_peneira_4_8mm VARCHAR(10) GENERATED ALWAYS AS (
    CASE WHEN peneira_4_8mm >= 35 THEN 'ok' ELSE 'fora' END
  ) STORED,
  status_peneira_fundo_4mm VARCHAR(10) GENERATED ALWAYS AS (
    CASE WHEN peneira_fundo_4mm <= 15 THEN 'ok' ELSE 'fora' END
  ) STORED,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_avaliacoes_psps_silo_id ON avaliacoes_psps(silo_id);
CREATE INDEX idx_avaliacoes_psps_data ON avaliacoes_psps(data);
