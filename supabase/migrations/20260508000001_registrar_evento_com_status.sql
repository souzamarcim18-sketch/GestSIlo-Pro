-- Registra um evento de rebanho e atualiza o status do animal atomicamente.
-- Parâmetros:
--   p_animal_id : UUID do animal
--   p_payload   : JSON com os campos do evento (tipo, data_evento, observacoes, ...)
-- Retorna: UUID do evento criado
CREATE OR REPLACE FUNCTION registrar_evento_com_status(
  p_animal_id uuid,
  p_payload   jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo          text;
  v_novo_status   text;
  v_evento_id     uuid;
  v_fazenda_id    uuid;
BEGIN
  v_tipo := p_payload->>'tipo';

  -- Resolve fazenda_id via função RLS existente (sem SELECT *)
  v_fazenda_id := get_minha_fazenda_id();

  -- Garante que o animal pertence à fazenda do usuário
  IF NOT EXISTS (
    SELECT 1 FROM animais
    WHERE id = p_animal_id
      AND fazenda_id = v_fazenda_id
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Animal não encontrado ou sem permissão';
  END IF;

  -- INSERT no evento; fazenda_id preenchido pelo trigger existente
  INSERT INTO eventos_rebanho (
    animal_id,
    fazenda_id,
    tipo,
    data_evento,
    observacoes,
    peso_kg,
    metodo,
    condicao_corporal,
    comprador,
    valor_venda,
    lote_id_destino,
    reprodutor_id,
    resultado,
    tipo_parto,
    usuario_id
  )
  VALUES (
    p_animal_id,
    v_fazenda_id,
    v_tipo,
    (p_payload->>'data_evento')::date,
    p_payload->>'observacoes',
    (p_payload->>'peso_kg')::numeric,
    p_payload->>'metodo',
    (p_payload->>'condicao_corporal')::integer,
    p_payload->>'comprador',
    (p_payload->>'valor_venda')::numeric,
    (p_payload->>'lote_id_destino')::uuid,
    (p_payload->>'reprodutor_id')::uuid,
    p_payload->>'resultado',
    p_payload->>'tipo_parto',
    auth.uid()
  )
  RETURNING id INTO v_evento_id;

  -- Determina novo status para eventos que encerram a vida ativa do animal
  v_novo_status := CASE v_tipo
    WHEN 'morte'    THEN 'Morto'
    WHEN 'venda'    THEN 'Vendido'
    WHEN 'descarte' THEN 'Descartado'
    ELSE NULL
  END;

  IF v_novo_status IS NOT NULL THEN
    UPDATE animais
    SET    status = v_novo_status
    WHERE  id = p_animal_id
      AND  fazenda_id = v_fazenda_id;
  END IF;

  RETURN v_evento_id;
END;
$$;

-- Revoga acesso direto; apenas roles autenticados via JWT podem chamar
REVOKE ALL ON FUNCTION registrar_evento_com_status(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_evento_com_status(uuid, jsonb) TO authenticated;
