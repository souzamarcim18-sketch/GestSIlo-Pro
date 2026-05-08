-- Migration B: Adicionar 'Descartado' ao enum status_animal
-- ⚠️ EXECUTAR ISOLADO — fora de transação

ALTER TYPE public.status_animal ADD VALUE 'Descartado';

-- Resultado final do enum: 'Ativo', 'Morto', 'Vendido', 'Descartado'
