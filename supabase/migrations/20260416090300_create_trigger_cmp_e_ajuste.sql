-- supabase/migrations/20260416090300_create_trigger_cmp_e_ajuste.sql
-- Triggers para CMP e Ajuste de Inventário

CREATE OR REPLACE FUNCTION atualizar_custo_medio_e_estoque()
RETURNS TRIGGER AS $$
DECLARE v_estoque_atual NUMERIC;
BEGIN
  IF NEW.tipo = 'Entrada' THEN
    -- Recalcular CMP e somar estoque
    UPDATE insumos
    SET
      custo_medio = CASE
        WHEN estoque_atual > 0 OR NEW.quantidade > 0 THEN
          (estoque_atual * COALESCE(custo_medio, 0) + NEW.quantidade * COALESCE(NEW.valor_unitario, 0)) /
          (estoque_atual + NEW.quantidade)
        ELSE 0
      END,
      estoque_atual = estoque_atual + NEW.quantidade,
      atualizado_em = CURRENT_TIMESTAMP
    WHERE id = NEW.insumo_id;

  ELSIF NEW.tipo = 'Saída' THEN
    -- Validação explícita de estoque suficiente
    SELECT estoque_atual INTO v_estoque_atual FROM insumos WHERE id = NEW.insumo_id;
    IF v_estoque_atual < NEW.quantidade THEN
      RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', v_estoque_atual, NEW.quantidade;
    END IF;
    -- Subtrair estoque
    UPDATE insumos
    SET
      estoque_atual = estoque_atual - NEW.quantidade,
      atualizado_em = CURRENT_TIMESTAMP
    WHERE id = NEW.insumo_id;

  ELSIF NEW.tipo = 'Ajuste' THEN
    -- Aplicar ajuste com sinal
    UPDATE insumos
    SET
      estoque_atual = GREATEST(0, estoque_atual + (NEW.quantidade * COALESCE(NEW.sinal_ajuste, 1))),
      atualizado_em = CURRENT_TIMESTAMP
    WHERE id = NEW.insumo_id;
    -- CMP NÃO é alterado em ajustes
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = extensions, public;

-- Criar trigger (ou recriar se já existe)
DROP TRIGGER IF EXISTS mov_insumo_atualizar_estoque_cmp ON movimentacoes_insumo;
CREATE TRIGGER mov_insumo_atualizar_estoque_cmp
AFTER INSERT ON movimentacoes_insumo
FOR EACH ROW EXECUTE FUNCTION atualizar_custo_medio_e_estoque();

COMMENT ON FUNCTION atualizar_custo_medio_e_estoque() IS
  'Trigger que atualiza CMP (Entrada), estoque (Saída) e ajuste (Ajuste) automáticamente após INSERT em movimentacoes_insumo';
