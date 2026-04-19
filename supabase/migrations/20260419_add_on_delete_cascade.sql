-- =====================================================
-- Migration: Adicionar ON DELETE CASCADE a todas as Foreign Keys
-- Data: 2026-04-19
-- Objetivo: Garantir integridade referencial e evitar dados órfãos
-- =====================================================

-- 1. movimentacoes_silo -> silos
ALTER TABLE movimentacoes_silo
  DROP CONSTRAINT movimentacoes_silo_silo_id_fkey,
  ADD CONSTRAINT movimentacoes_silo_silo_id_fkey
    FOREIGN KEY (silo_id) REFERENCES silos(id) ON DELETE CASCADE;

-- 2. ciclos_agricolas -> talhoes
ALTER TABLE ciclos_agricolas
  DROP CONSTRAINT ciclos_agricolas_talhao_id_fkey,
  ADD CONSTRAINT ciclos_agricolas_talhao_id_fkey
    FOREIGN KEY (talhao_id) REFERENCES talhoes(id) ON DELETE CASCADE;

-- 3. eventos_dap -> ciclos_agricolas
ALTER TABLE eventos_dap
  DROP CONSTRAINT eventos_dap_ciclo_id_fkey,
  ADD CONSTRAINT eventos_dap_ciclo_id_fkey
    FOREIGN KEY (ciclo_id) REFERENCES ciclos_agricolas(id) ON DELETE CASCADE;

-- 4. eventos_dap -> talhoes
ALTER TABLE eventos_dap
  DROP CONSTRAINT eventos_dap_talhao_id_fkey,
  ADD CONSTRAINT eventos_dap_talhao_id_fkey
    FOREIGN KEY (talhao_id) REFERENCES talhoes(id) ON DELETE CASCADE;

-- 5. atividades_campo -> ciclos_agricolas
ALTER TABLE atividades_campo
  DROP CONSTRAINT atividades_campo_ciclo_id_fkey,
  ADD CONSTRAINT atividades_campo_ciclo_id_fkey
    FOREIGN KEY (ciclo_id) REFERENCES ciclos_agricolas(id) ON DELETE CASCADE;

-- 6. atividades_campo -> talhoes
ALTER TABLE atividades_campo
  DROP CONSTRAINT atividades_campo_talhao_id_fkey,
  ADD CONSTRAINT atividades_campo_talhao_id_fkey
    FOREIGN KEY (talhao_id) REFERENCES talhoes(id) ON DELETE CASCADE;

-- 7. atividades_campo -> maquinas (colheita)
ALTER TABLE atividades_campo
  DROP CONSTRAINT atividades_campo_maquina_colheita_id_fkey,
  ADD CONSTRAINT atividades_campo_maquina_colheita_id_fkey
    FOREIGN KEY (maquina_colheita_id) REFERENCES maquinas(id) ON DELETE SET NULL;

-- 8. atividades_campo -> maquinas (transporte)
ALTER TABLE atividades_campo
  DROP CONSTRAINT atividades_campo_maquina_transporte_id_fkey,
  ADD CONSTRAINT atividades_campo_maquina_transporte_id_fkey
    FOREIGN KEY (maquina_transporte_id) REFERENCES maquinas(id) ON DELETE SET NULL;

-- 9. atividades_campo -> maquinas (compactação)
ALTER TABLE atividades_campo
  DROP CONSTRAINT atividades_campo_maquina_compactacao_id_fkey,
  ADD CONSTRAINT atividades_campo_maquina_compactacao_id_fkey
    FOREIGN KEY (maquina_compactacao_id) REFERENCES maquinas(id) ON DELETE SET NULL;

-- 10. uso_maquinas -> maquinas
ALTER TABLE uso_maquinas
  DROP CONSTRAINT uso_maquinas_maquina_id_fkey,
  ADD CONSTRAINT uso_maquinas_maquina_id_fkey
    FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE CASCADE;

-- 11. manutencoes -> maquinas
ALTER TABLE manutencoes
  DROP CONSTRAINT manutencoes_maquina_id_fkey,
  ADD CONSTRAINT manutencoes_maquina_id_fkey
    FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE CASCADE;

-- 12. abastecimentos -> maquinas
ALTER TABLE abastecimentos
  DROP CONSTRAINT abastecimentos_maquina_id_fkey,
  ADD CONSTRAINT abastecimentos_maquina_id_fkey
    FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE CASCADE;

-- 13. insumos -> categorias_insumo
ALTER TABLE insumos
  DROP CONSTRAINT insumos_categoria_id_fkey,
  ADD CONSTRAINT insumos_categoria_id_fkey
    FOREIGN KEY (categoria_id) REFERENCES categorias_insumo(id) ON DELETE SET NULL;

-- 14. insumos -> tipos_insumo
ALTER TABLE insumos
  DROP CONSTRAINT insumos_tipo_id_fkey,
  ADD CONSTRAINT insumos_tipo_id_fkey
    FOREIGN KEY (tipo_id) REFERENCES tipos_insumo(id) ON DELETE SET NULL;

-- 15. movimentacoes_insumo -> insumos
ALTER TABLE movimentacoes_insumo
  DROP CONSTRAINT movimentacoes_insumo_insumo_id_fkey,
  ADD CONSTRAINT movimentacoes_insumo_insumo_id_fkey
    FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE CASCADE;

-- 16. movimentacoes_insumo -> financeiro
ALTER TABLE movimentacoes_insumo
  DROP CONSTRAINT movimentacoes_insumo_despesa_id_fkey,
  ADD CONSTRAINT movimentacoes_insumo_despesa_id_fkey
    FOREIGN KEY (despesa_id) REFERENCES financeiro(id) ON DELETE SET NULL;

-- 17. atividades_campo -> insumos (insumo principal)
ALTER TABLE atividades_campo
  DROP CONSTRAINT atividades_campo_insumo_id_fkey,
  ADD CONSTRAINT atividades_campo_insumo_id_fkey
    FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE SET NULL;

-- 18. atividades_campo -> insumos (sementes)
ALTER TABLE atividades_campo
  DROP CONSTRAINT atividades_campo_semente_id_fkey,
  ADD CONSTRAINT atividades_campo_semente_id_fkey
    FOREIGN KEY (semente_id) REFERENCES insumos(id) ON DELETE SET NULL;

-- 19. silos -> insumos (lona)
ALTER TABLE silos
  DROP CONSTRAINT silos_insumo_lona_id_fkey,
  ADD CONSTRAINT silos_insumo_lona_id_fkey
    FOREIGN KEY (insumo_lona_id) REFERENCES insumos(id) ON DELETE SET NULL;

-- 20. silos -> insumos (inoculante)
ALTER TABLE silos
  DROP CONSTRAINT silos_insumo_inoculante_id_fkey,
  ADD CONSTRAINT silos_insumo_inoculante_id_fkey
    FOREIGN KEY (insumo_inoculante_id) REFERENCES insumos(id) ON DELETE SET NULL;

-- 21. silos -> talhoes
ALTER TABLE silos
  ADD CONSTRAINT silos_talhao_id_fkey
    FOREIGN KEY (talhao_id) REFERENCES talhoes(id) ON DELETE SET NULL;

-- 22. avaliacoes_bromatologicas -> silos
ALTER TABLE avaliacoes_bromatologicas
  DROP CONSTRAINT avaliacoes_bromatologicas_silo_id_fkey,
  ADD CONSTRAINT avaliacoes_bromatologicas_silo_id_fkey
    FOREIGN KEY (silo_id) REFERENCES silos(id) ON DELETE CASCADE;

-- 23. avaliacoes_psps -> silos
ALTER TABLE avaliacoes_psps
  DROP CONSTRAINT avaliacoes_psps_silo_id_fkey,
  ADD CONSTRAINT avaliacoes_psps_silo_id_fkey
    FOREIGN KEY (silo_id) REFERENCES silos(id) ON DELETE CASCADE;

-- 24. categorias_rebanho -> fazendas
ALTER TABLE categorias_rebanho
  DROP CONSTRAINT categorias_rebanho_fazenda_id_fkey,
  ADD CONSTRAINT categorias_rebanho_fazenda_id_fkey
    FOREIGN KEY (fazenda_id) REFERENCES fazendas(id) ON DELETE CASCADE;

-- 25. periodos_confinamento -> fazendas
ALTER TABLE periodos_confinamento
  DROP CONSTRAINT periodos_confinamento_fazenda_id_fkey,
  ADD CONSTRAINT periodos_confinamento_fazenda_id_fkey
    FOREIGN KEY (fazenda_id) REFERENCES fazendas(id) ON DELETE CASCADE;

-- 26. planejamentos_silagem -> fazendas
ALTER TABLE planejamentos_silagem
  DROP CONSTRAINT planejamentos_silagem_fazenda_id_fkey,
  ADD CONSTRAINT planejamentos_silagem_fazenda_id_fkey
    FOREIGN KEY (fazenda_id) REFERENCES fazendas(id) ON DELETE CASCADE;

COMMENT ON TABLE movimentacoes_silo IS 'Deletado automaticamente quando silo é removido';
COMMENT ON TABLE ciclos_agricolas IS 'Deletado automaticamente quando talhão é removido';
COMMENT ON TABLE eventos_dap IS 'Deletado automaticamente quando ciclo ou talhão é removido';
COMMENT ON TABLE atividades_campo IS 'Deletado automaticamente quando ciclo ou talhão é removido';
