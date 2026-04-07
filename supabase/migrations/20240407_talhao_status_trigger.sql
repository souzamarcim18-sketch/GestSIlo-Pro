-- Migration para o item 4.2 - Status Dinâmico dos Talhões
-- Trigger para atualizar o status do talhão automaticamente baseado nos ciclos agrícolas

CREATE OR REPLACE FUNCTION atualizar_status_talhao()
RETURNS TRIGGER AS $$
BEGIN
  -- Se uma data de colheita real for inserida, o talhão volta para 'Colhido'
  IF NEW.data_colheita_real IS NOT NULL THEN
    UPDATE talhoes SET status = 'Colhido' WHERE id = NEW.talhao_id;
  -- Se houver data de plantio mas não de colheita, o talhão está 'Plantado'
  ELSIF NEW.data_plantio IS NOT NULL AND NEW.data_colheita_real IS NULL THEN
    UPDATE talhoes SET status = 'Plantado' WHERE id = NEW.talhao_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger se já existir para evitar erros em re-execução
DROP TRIGGER IF EXISTS trigger_status_talhao ON ciclos_agricolas;

CREATE TRIGGER trigger_status_talhao
AFTER INSERT OR UPDATE ON ciclos_agricolas
FOR EACH ROW EXECUTE FUNCTION atualizar_status_talhao();

-- Comentário para documentação
COMMENT ON FUNCTION atualizar_status_talhao() IS 'Atualiza automaticamente o status da tabela talhoes baseado nas datas de plantio e colheita em ciclos_agricolas';
