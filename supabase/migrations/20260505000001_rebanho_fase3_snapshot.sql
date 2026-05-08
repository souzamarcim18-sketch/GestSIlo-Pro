-- Fase 3: Adicionar suporte a snapshot de projeção de rebanho em planejamentos_silagem

ALTER TABLE planejamentos_silagem
ADD COLUMN IF NOT EXISTS rebanho_snapshot JSONB DEFAULT NULL;

COMMENT ON COLUMN planejamentos_silagem.rebanho_snapshot IS
'Snapshot da projeção de rebanho no momento da criação da simulação.
Inclui data_calculo, data_projecao, composicao, modo, e auditoria.
NULL indica simulação anterior a Fase 3 (sem integração de rebanho).
Não é atualizado ao re-editar a simulação, preservando o contexto original.';

CREATE INDEX IF NOT EXISTS idx_planejamentos_silagem_rebanho_modo
ON planejamentos_silagem USING GIN (rebanho_snapshot)
WHERE rebanho_snapshot IS NOT NULL;
