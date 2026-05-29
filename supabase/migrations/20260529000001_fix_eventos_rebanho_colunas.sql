-- Adiciona coluna escore_condicao_corporal que estava faltando em eventos_rebanho.
-- A RPC registrar_evento_com_status (20260528000001) já referencia essa coluna,
-- mas ela nunca foi criada via migration.
--
-- Também expande o CHECK constraint de tipo_parto para incluir os 6 valores
-- corretos: Normal, Distocico, Cesariana, Simples, Gemelar, Triplo.

ALTER TABLE public.eventos_rebanho
ADD COLUMN IF NOT EXISTS escore_condicao_corporal NUMERIC(2,1) NULL
  CHECK (escore_condicao_corporal IS NULL OR (escore_condicao_corporal >= 1.0 AND escore_condicao_corporal <= 5.0));

-- Expande constraint de tipo_parto para aceitar os 6 tipos
ALTER TABLE public.eventos_rebanho
DROP CONSTRAINT IF EXISTS eventos_rebanho_tipo_parto_check;

ALTER TABLE public.eventos_rebanho
ADD CONSTRAINT eventos_rebanho_tipo_parto_check
  CHECK (tipo_parto IS NULL OR tipo_parto IN ('normal', 'distocico', 'cesariana', 'simples', 'gemelar', 'triplo'));
