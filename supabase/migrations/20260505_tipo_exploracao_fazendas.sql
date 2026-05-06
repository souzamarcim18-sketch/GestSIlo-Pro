-- Migration: Fase 4 Rebanho — Tipo de Exploração em Fazendas
-- Data: 2026-05-05
-- Descrição: Adiciona coluna tipo_exploracao em fazendas para indicadores contextualizados
-- Decisão Confirmada: DEFAULT 'MISTO' para máxima compatibilidade (não força reorientação)

ALTER TABLE public.fazendas
ADD COLUMN tipo_exploracao TEXT CHECK (tipo_exploracao IN ('CORTE', 'LEITE', 'MISTO')) DEFAULT 'MISTO';

COMMENT ON COLUMN public.fazendas.tipo_exploracao IS
'Tipo de exploração: CORTE, LEITE ou MISTO. Define quais indicadores zootécnicos são exibidos no dashboard.
Padrão: MISTO (compatibilidade com fazendas em transição ou sistema anterior).';
