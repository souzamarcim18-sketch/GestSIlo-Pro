-- Migration: Rebanho Fase 2 — Extensão de Enums
-- Data: 2026-05-02
-- Descrição: Estender enum tipo_evento_rebanho com 6 novos tipos reprodutivos
-- CRÍTICO: ALTER TYPE ADD VALUE não suporta transações. Este arquivo DEVE rodar isolado.

-- Fase 2: Estender enum com 6 novos tipos de evento reprodutivo
-- ⚠️ NÃO colocar dentro de BEGIN/COMMIT
ALTER TYPE public.tipo_evento_rebanho ADD VALUE 'cobertura';
ALTER TYPE public.tipo_evento_rebanho ADD VALUE 'diagnostico_prenhez';
ALTER TYPE public.tipo_evento_rebanho ADD VALUE 'parto';
ALTER TYPE public.tipo_evento_rebanho ADD VALUE 'secagem';
ALTER TYPE public.tipo_evento_rebanho ADD VALUE 'aborto';
ALTER TYPE public.tipo_evento_rebanho ADD VALUE 'descarte';

-- Ordem: ADD VALUE sem posição = append ao final (preserva IDs antigos)
-- Resultado final: nascimento, pesagem, morte, venda, transferencia_lote,
--                   cobertura, diagnostico_prenhez, parto, secagem, aborto, descarte
