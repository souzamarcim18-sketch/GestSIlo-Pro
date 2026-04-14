-- FASE 0: Adicionar FK constraint para talhoes
-- Data: 2026-04-13
-- Dependência: 20260413_silos_reformulacao.sql
-- Nota: Esta migration é OPCIONAL e só funciona se a tabela talhoes existir

-- ========================================
-- 1. ADICIONAR FK CONSTRAINT PARA TALHOES
-- ========================================

-- Adicionar constraint apenas se talhoes table existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'talhoes') THEN
    ALTER TABLE silos
    ADD CONSTRAINT silos_talhao_id_fk
    FOREIGN KEY (talhao_id) REFERENCES talhoes(id) ON DELETE RESTRICT;
  ELSE
    RAISE NOTICE 'Tabela talhoes não encontrada. FK constraint não foi adicionada.';
  END IF;
END$$;
