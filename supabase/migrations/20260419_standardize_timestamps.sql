-- =====================================================
-- Migration: Padronizar timestamps para DEFAULT NOW()
-- Data: 2026-04-19
-- Objetivo: Consistência em toda a base de dados
-- =====================================================

-- Função auxiliar para fazer replace seguro em DEFAULT
-- Tabelas que usam DEFAULT CURRENT_DATE precisam virar DEFAULT CURRENT_TIMESTAMP
-- Tabelas que usam DEFAULT now() já estão corretas

-- 1. financeiro: substituir CURRENT_DATE por CURRENT_TIMESTAMP
ALTER TABLE financeiro
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

-- 2. movimentacoes_silo: substituir CURRENT_DATE por NOW()
ALTER TABLE movimentacoes_silo
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 3. movimentacoes_insumo: substituir CURRENT_DATE por NOW()
ALTER TABLE movimentacoes_insumo
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 4. insumos: substituir CURRENT_DATE por NOW()
ALTER TABLE insumos
  ALTER COLUMN data_cadastro SET DEFAULT CURRENT_DATE; -- Esta mantém como DATE

-- 5. maquinas: já usa implícito, adicionar explícito se não tiver
ALTER TABLE maquinas
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 6. manutencoes: já usa NOW()
ALTER TABLE manutencoes
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 7. abastecimentos: já usa NOW()
ALTER TABLE abastecimentos
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 8. uso_maquinas: já usa NOW()
ALTER TABLE uso_maquinas
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 9. silos: já usa NOW()
ALTER TABLE silos
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 10. talhoes: já usa NOW()
ALTER TABLE talhoes
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 11. ciclos_agricolas: já usa NOW()
ALTER TABLE ciclos_agricolas
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 12. atividades_campo: já usa NOW()
ALTER TABLE atividades_campo
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 13. eventos_dap: já usa NOW()
ALTER TABLE eventos_dap
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 14. categorias_insumo: usar NOW() ao invés de CURRENT_TIMESTAMP
ALTER TABLE categorias_insumo
  ALTER COLUMN criado_em SET DEFAULT NOW();

-- 15. tipos_insumo: usar NOW() ao invés de CURRENT_TIMESTAMP
ALTER TABLE tipos_insumo
  ALTER COLUMN criado_em SET DEFAULT NOW();

-- 16. categorias_rebanho: já usa NOW()
ALTER TABLE categorias_rebanho
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 17. periodos_confinamento: já usa NOW()
ALTER TABLE periodos_confinamento
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 18. planejamentos_silagem: já usa NOW()
ALTER TABLE planejamentos_silagem
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 19. profiles: já usa NOW()
ALTER TABLE profiles
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 20. fazendas: já usa NOW()
ALTER TABLE fazendas
  ALTER COLUMN created_at SET DEFAULT NOW();

COMMENT ON TABLE financeiro IS 'Timestamps padronizados para NOW()';
COMMENT ON TABLE movimentacoes_silo IS 'Timestamps padronizados para NOW()';
COMMENT ON TABLE movimentacoes_insumo IS 'Timestamps padronizados para NOW()';
