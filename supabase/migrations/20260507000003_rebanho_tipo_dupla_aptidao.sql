-- Migration C: Suporte a 'dupla_aptidao' em tipo_rebanho
-- ⚠️ EXECUTAR ISOLADO — fora de transação
-- Descoberta: tipo_rebanho é um ENUM categoria_animal, não TEXT!

-- Adicionar 'dupla_aptidao' ao ENUM categoria_animal
-- (ALTER TYPE ADD VALUE não suporta transações)
ALTER TYPE public.categoria_animal ADD VALUE 'dupla_aptidao';
