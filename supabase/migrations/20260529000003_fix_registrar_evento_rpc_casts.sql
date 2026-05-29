-- Recria registrar_evento_com_status com casts corretos:
-- 1. v_tipo::tipo_evento_rebanho — coluna tipo é enum, não text
-- 2. v_novo_status::status_animal — coluna status é enum, não text
-- Requer que 20260529000002 (ADD VALUE 'desmame') já tenha sido aplicado.

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

  v_fazenda_id := get_minha_fazenda_id();

  IF NOT EXISTS (
    SELECT 1 FROM animais
    WHERE id = p_animal_id
      AND fazenda_id = v_fazenda_id
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Animal não encontrado ou sem permissão';
  END IF;

  INSERT INTO eventos_rebanho (
    animal_id,
    fazenda_id,
    tipo,
    data_evento,
    observacoes,
    peso_kg,
    escore_condicao_corporal,
    comprador,
    valor_venda,
    lote_id_destino,
    reprodutor_id,
    tipo_cobertura,
    resultado_prenhez,
    metodo_diagnostico,
    tipo_parto,
    usuario_id
  )
  VALUES (
    p_animal_id,
    v_fazenda_id,
    v_tipo::tipo_evento_rebanho,
    (p_payload->>'data_evento')::date,
    p_payload->>'observacoes',
    (p_payload->>'peso_kg')::numeric,
    (p_payload->>'escore_condicao_corporal')::numeric,
    p_payload->>'comprador',
    (p_payload->>'valor_venda')::numeric,
    (p_payload->>'lote_id_destino')::uuid,
    (p_payload->>'reprodutor_id')::uuid,
    p_payload->>'tipo_cobertura',
    p_payload->>'resultado_prenhez',
    p_payload->>'metodo_diagnostico',
    p_payload->>'tipo_parto',
    auth.uid()
  )
  RETURNING id INTO v_evento_id;

  v_novo_status := CASE v_tipo
    WHEN 'morte'    THEN 'Morto'
    WHEN 'venda'    THEN 'Vendido'
    WHEN 'descarte' THEN 'Descartado'
    ELSE NULL
  END;

  IF v_novo_status IS NOT NULL THEN
    UPDATE animais
    SET    status = v_novo_status::status_animal
    WHERE  id = p_animal_id
      AND  fazenda_id = v_fazenda_id;
  END IF;

  RETURN v_evento_id;
END;
$$;

REVOKE ALL ON FUNCTION registrar_evento_com_status(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_evento_com_status(uuid, jsonb) TO authenticated;
