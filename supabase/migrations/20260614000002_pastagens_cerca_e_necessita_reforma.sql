-- =============================================================================
-- Migration: Pastagens — manutenção de cerca + flag "necessita reforma"
-- Data: 2026-06-14
-- Depende: pastagens, piquetes, eventos_manejo_pastagem (20260521000001)
-- Objetivo:
--   1. Adicionar tipo de evento 'manutencao_cerca' ao CHECK de
--      eventos_manejo_pastagem.tipo, com colunas próprias do serviço de cerca.
--   2. Adicionar flag booleana 'necessita_reforma' em pastagens e piquetes —
--      sinalizador de planejamento (NÃO altera status operacional do piquete;
--      o status 'Em reforma' continua sendo o que tira o piquete de operação).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Evento de manutenção de cerca
-- -----------------------------------------------------------------------------

ALTER TABLE eventos_manejo_pastagem
  DROP CONSTRAINT IF EXISTS eventos_manejo_pastagem_tipo_check;

ALTER TABLE eventos_manejo_pastagem
  ADD CONSTRAINT eventos_manejo_pastagem_tipo_check
  CHECK (tipo IN (
    'adubacao_manutencao', 'calagem', 'reforma',
    'ressemeadura', 'irrigacao', 'interdicao',
    'rocagem', 'manutencao_cerca', 'outro'
  ));

-- Campos específicos do serviço de cerca (todos NULL para os demais tipos)
ALTER TABLE eventos_manejo_pastagem
  ADD COLUMN tipo_servico_cerca text NULL
    CONSTRAINT eventos_manejo_pastagem_tipo_servico_cerca_check
    CHECK (tipo_servico_cerca IS NULL OR tipo_servico_cerca IN ('reparo', 'substituicao', 'nova')),
  ADD COLUMN metragem_cerca_m numeric NULL CHECK (metragem_cerca_m IS NULL OR metragem_cerca_m > 0),
  ADD COLUMN material_cerca text NULL;

COMMENT ON COLUMN eventos_manejo_pastagem.tipo_servico_cerca IS
  'Apenas para tipo=manutencao_cerca: reparo | substituicao | nova';
COMMENT ON COLUMN eventos_manejo_pastagem.metragem_cerca_m IS
  'Apenas para tipo=manutencao_cerca: metros lineares de cerca trabalhados';
COMMENT ON COLUMN eventos_manejo_pastagem.material_cerca IS
  'Apenas para tipo=manutencao_cerca: descrição livre do material (mourão, arame liso/farpado, isoladores, etc.)';

-- -----------------------------------------------------------------------------
-- 2. Flag "necessita reforma" — planejamento, não muda status operacional
-- -----------------------------------------------------------------------------

ALTER TABLE pastagens
  ADD COLUMN necessita_reforma boolean NOT NULL DEFAULT false;

ALTER TABLE piquetes
  ADD COLUMN necessita_reforma boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN pastagens.necessita_reforma IS
  'Sinalizador de planejamento: pastagem marcada como candidata a reforma. Gera alerta. Não altera o status operacional dos piquetes.';
COMMENT ON COLUMN piquetes.necessita_reforma IS
  'Sinalizador de planejamento: piquete marcado como candidato a reforma. Gera alerta. Diferente do status "Em reforma" (que retira o piquete de operação).';
