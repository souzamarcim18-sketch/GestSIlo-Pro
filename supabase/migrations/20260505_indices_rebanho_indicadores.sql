-- Migration: Fase 4 Rebanho — Índices de Performance para Indicadores
-- Data: 2026-05-05
-- Descrição: Cria índices para otimizar cálculo de indicadores zootécnicos
-- Esperado: GMD <100ms, Taxa Natalidade <200ms em rebanho 1000 animais

-- ==================== ÍNDICE: Pesagens por Animal e Data ====================
-- Pesagens: velocidade crítica para cálculo de GMD (Ganho Médio Diário)
-- SEM WHERE deleted_at IS NULL: pesos_animal NÃO tem coluna deleted_at
CREATE INDEX IF NOT EXISTS idx_pesos_animal_animal_id_data_pesagem
  ON public.pesos_animal(animal_id, data_pesagem DESC);

-- ==================== ÍNDICE: Eventos por Tipo, Data e Animal ====================
-- Eventos: filtro por tipo + data (natalidade, mortalidade, partos) + animal_id para JOIN
CREATE INDEX IF NOT EXISTS idx_eventos_rebanho_tipo_data_evento_animal_id
  ON public.eventos_rebanho(tipo, data_evento DESC, animal_id)
  WHERE deleted_at IS NULL;

-- ==================== ÍNDICE: Animais por Status, Categoria e Fazenda ====================
-- Animais: composição por categoria + status (Ativo vs. Morto vs. Vendido)
CREATE INDEX IF NOT EXISTS idx_animais_status_categoria_fazenda_id
  ON public.animais(status, categoria, fazenda_id)
  WHERE deleted_at IS NULL;
