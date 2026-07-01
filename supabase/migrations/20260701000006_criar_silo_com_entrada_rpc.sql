-- Migration: RPC atômica para criar silo + movimentação de Entrada (ensilagem)
-- Contexto: hoje o cadastro cria o silo e, em seguida, a Entrada obrigatória em
-- duas chamadas separadas do browser. Se a segunda falha e o rollback (delete do
-- silo) também falha, sobra um silo órfão sem entrada. Esta RPC faz as duas
-- operações numa única transação no banco — ou ambas persistem, ou nenhuma.
--
-- SECURITY DEFINER + resolução de fazenda_id via get_minha_fazenda_id() para
-- respeitar o multi-tenant. A RPC valida que o usuário é Admin/Gerente (mesma
-- regra da policy silos_insert_admin_gerente) antes de inserir.

CREATE OR REPLACE FUNCTION public.criar_silo_com_entrada(
  p_nome                  text,
  p_tipo                  text,
  p_volume_ensilado_ton   numeric,
  p_data_fechamento       date,
  p_data_abertura_prevista date DEFAULT NULL,
  p_talhao_id             uuid DEFAULT NULL,
  p_cultura_ensilada      text DEFAULT NULL,
  p_materia_seca_percent  numeric DEFAULT NULL,
  p_comprimento_m         numeric DEFAULT NULL,
  p_largura_m             numeric DEFAULT NULL,
  p_altura_m              numeric DEFAULT NULL,
  p_observacoes_gerais    text DEFAULT NULL,
  p_custo_aquisicao_rs_ton numeric DEFAULT NULL,
  p_insumo_lona_id        uuid DEFAULT NULL,
  p_insumo_lona2_id       uuid DEFAULT NULL,
  p_insumo_inoculante_id  uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fazenda_id uuid;
  v_silo_id    uuid;
BEGIN
  v_fazenda_id := get_minha_fazenda_id();
  IF v_fazenda_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem fazenda vinculada';
  END IF;

  IF NOT sou_gerente_ou_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem cadastrar silos';
  END IF;

  IF p_volume_ensilado_ton IS NULL OR p_volume_ensilado_ton <= 0 THEN
    RAISE EXCEPTION 'Volume ensilado deve ser maior que zero';
  END IF;

  INSERT INTO silos (
    nome, tipo, fazenda_id, talhao_id, cultura_ensilada,
    data_fechamento, data_abertura_prevista, volume_ensilado_ton_mv,
    materia_seca_percent, comprimento_m, largura_m, altura_m,
    observacoes_gerais, custo_aquisicao_rs_ton,
    insumo_lona_id, insumo_lona2_id, insumo_inoculante_id
  ) VALUES (
    p_nome, p_tipo, v_fazenda_id, p_talhao_id, p_cultura_ensilada,
    p_data_fechamento, p_data_abertura_prevista, p_volume_ensilado_ton,
    p_materia_seca_percent, p_comprimento_m, p_largura_m, p_altura_m,
    p_observacoes_gerais, p_custo_aquisicao_rs_ton,
    p_insumo_lona_id, p_insumo_lona2_id, p_insumo_inoculante_id
  )
  RETURNING id INTO v_silo_id;

  -- Entrada obrigatória de ensilagem. O trigger preenche fazenda_id via silo_id.
  INSERT INTO movimentacoes_silo (
    silo_id, tipo, subtipo, quantidade, data, responsavel, observacao
  ) VALUES (
    v_silo_id, 'Entrada', 'Ensilagem', p_volume_ensilado_ton,
    p_data_fechamento, 'Sistema',
    'Entrada gerada automaticamente no cadastro do silo'
  );

  RETURN v_silo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_silo_com_entrada(
  text, text, numeric, date, date, uuid, text, numeric,
  numeric, numeric, numeric, text, numeric, uuid, uuid, uuid
) TO authenticated;


-- ---------------------------------------------------------------------------
-- Trigger: abertura automática do silo na primeira SAÍDA de abertura
-- ---------------------------------------------------------------------------
-- Antes, a lógica de preencher data_abertura_real vivia só no cliente
-- (q.movimentacoesSilo.create). O Modo Operador insere direto em
-- movimentacoes_silo (retirada/descarte) e NÃO passava por essa lógica — então
-- retiradas do operador nunca "abriam" o silo. Mover para trigger cobre TODOS
-- os caminhos de INSERT (operador, dialog admin, sync offline) de forma uniforme.
--
-- Regra de abertura: primeira saída que NÃO seja Descarte. Um descarte de
-- topo/efluente antes da 1ª retirada não abre o silo (o silo pode perder
-- material ainda fechado, sem começar a ser consumido).

CREATE OR REPLACE FUNCTION public.abrir_silo_na_primeira_saida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só nos interessam saídas de abertura (exclui Descarte).
  IF NEW.tipo <> 'Saída' OR NEW.subtipo = 'Descarte' THEN
    RETURN NEW;
  END IF;

  -- Abre o silo apenas se ainda não estava aberto.
  UPDATE silos
  SET data_abertura_real = NEW.data
  WHERE id = NEW.silo_id
    AND data_abertura_real IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_abrir_silo_na_primeira_saida ON movimentacoes_silo;
CREATE TRIGGER trg_abrir_silo_na_primeira_saida
  AFTER INSERT ON movimentacoes_silo
  FOR EACH ROW
  EXECUTE FUNCTION public.abrir_silo_na_primeira_saida();
