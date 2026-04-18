-- =====================================================
-- Script: Índices para performance + RLS habilitado
-- Data: 2026-04-17
-- Descrição: Cria índices para queries frequentes e garante
--            que RLS está habilitado em todas as tabelas de insumos
-- =====================================================

-- =====================================================
-- 1. HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE categorias_insumo ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_insumo ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_insumo ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice simples em fazenda_id (filtro frequente em insumos)
CREATE INDEX IF NOT EXISTS idx_insumos_fazenda_id
  ON insumos(fazenda_id);

-- Índice simples em categoria_id (filtro e FK)
CREATE INDEX IF NOT EXISTS idx_insumos_categoria_id
  ON insumos(categoria_id);

-- Índice simples em tipo_id (filtro e FK)
CREATE INDEX IF NOT EXISTS idx_insumos_tipo_id
  ON insumos(tipo_id);

-- Índice em ativo (filtro frequente)
CREATE INDEX IF NOT EXISTS idx_insumos_ativo
  ON insumos(ativo);

-- Índice composto: (fazenda_id, ativo) — muito frequente em queries
CREATE INDEX IF NOT EXISTS idx_insumos_fazenda_ativo
  ON insumos(fazenda_id, ativo);

-- Índice em nome para buscas ILIKE
CREATE INDEX IF NOT EXISTS idx_insumos_nome_trgm
  ON insumos USING GIN(nome gin_trgm_ops);

-- Índice em local_armazen para filtros
CREATE INDEX IF NOT EXISTS idx_insumos_local_armazen
  ON insumos(local_armazen);

-- =====================================================
-- 3. ÍNDICES EM RELACIONAMENTOS
-- =====================================================

-- Índice em tipos_insumo(categoria_id) — JOIN frequente
CREATE INDEX IF NOT EXISTS idx_tipos_categoria_id
  ON tipos_insumo(categoria_id);

-- Índice em movimentacoes_insumo(insumo_id)
CREATE INDEX IF NOT EXISTS idx_movimentacoes_insumo_id
  ON movimentacoes_insumo(insumo_id);

-- Índice em movimentacoes_insumo(data) — ordenação frequente
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data
  ON movimentacoes_insumo(data DESC);

-- Índice composto em movimentacoes: (insumo_id, data)
CREATE INDEX IF NOT EXISTS idx_movimentacoes_insumo_data
  ON movimentacoes_insumo(insumo_id, data DESC);

-- =====================================================
-- 4. NOTAS DE PERFORMANCE
-- =====================================================
/*
 * Índices criados priorizam:
 * 1. Isolamento por fazenda_id (RLS + queries)
 * 2. Filtros frequentes (categoria_id, tipo_id, ativo, local_armazen)
 * 3. Ordenação/joins (data, FK relationships)
 * 4. Busca por texto (nome com trigram GIN)
 *
 * Para habilitar trigram, execute antes:
 *   CREATE EXTENSION IF NOT EXISTS pg_trgm;
 */
