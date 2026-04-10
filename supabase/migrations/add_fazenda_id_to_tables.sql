-- Migration: Add fazenda_id to tables that need it for RLS and queries
-- This allows filtering by fazenda_id directly without complex joins

-- Add fazenda_id to manutencoes (denormalization for performance)
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS fazenda_id UUID;
-- Update existing records based on maquina_id relationship
UPDATE manutencoes SET fazenda_id = (
  SELECT fazenda_id FROM maquinas WHERE maquinas.id = manutencoes.maquina_id
) WHERE fazenda_id IS NULL;
-- Add foreign key constraint
ALTER TABLE manutencoes
  ADD CONSTRAINT manutencoes_fazenda_id_fk FOREIGN KEY (fazenda_id) REFERENCES fazendas(id) ON DELETE CASCADE;

-- Add fazenda_id to abastecimentos (denormalization for performance)
ALTER TABLE abastecimentos ADD COLUMN IF NOT EXISTS fazenda_id UUID;
-- Update existing records
UPDATE abastecimentos SET fazenda_id = (
  SELECT fazenda_id FROM maquinas WHERE maquinas.id = abastecimentos.maquina_id
) WHERE fazenda_id IS NULL;
-- Add foreign key constraint
ALTER TABLE abastecimentos
  ADD CONSTRAINT abastecimentos_fazenda_id_fk FOREIGN KEY (fazenda_id) REFERENCES fazendas(id) ON DELETE CASCADE;

-- Add fazenda_id to uso_maquinas (denormalization for performance)
ALTER TABLE uso_maquinas ADD COLUMN IF NOT EXISTS fazenda_id UUID;
-- Update existing records
UPDATE uso_maquinas SET fazenda_id = (
  SELECT fazenda_id FROM maquinas WHERE maquinas.id = uso_maquinas.maquina_id
) WHERE fazenda_id IS NULL;
-- Add foreign key constraint
ALTER TABLE uso_maquinas
  ADD CONSTRAINT uso_maquinas_fazenda_id_fk FOREIGN KEY (fazenda_id) REFERENCES fazendas(id) ON DELETE CASCADE;
