-- supabase/migrations/20260416090000_create_categorias_tipos_insumo.sql
-- Criar tabelas de categorias e tipos de insumos

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS categorias_insumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_nome_not_empty CHECK(nome != ''),
  CONSTRAINT chk_nome_length CHECK(LENGTH(nome) >= 2)
);

CREATE INDEX idx_categorias_insumo_ativo ON categorias_insumo(ativo);

-- Tabela de Tipos (Sub-categorias)
CREATE TABLE IF NOT EXISTS tipos_insumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES categorias_insumo(id) ON DELETE RESTRICT,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_categoria_tipo UNIQUE(categoria_id, nome),
  CONSTRAINT chk_nome_not_empty_tipo CHECK(nome != ''),
  CONSTRAINT chk_nome_length_tipo CHECK(LENGTH(nome) >= 2)
);

CREATE INDEX idx_tipos_insumo_categoria_id ON tipos_insumo(categoria_id);
CREATE INDEX idx_tipos_insumo_ativo ON tipos_insumo(ativo);

-- RLS (será adicionado em migration separada)
ALTER TABLE categorias_insumo ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_insumo ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE categorias_insumo IS 'Categorias de insumos agrícolas (ex: Fertilizantes, Defensivos)';
COMMENT ON TABLE tipos_insumo IS 'Sub-tipos dentro de cada categoria (ex: Nitrogenado dentro de Fertilizantes)';
