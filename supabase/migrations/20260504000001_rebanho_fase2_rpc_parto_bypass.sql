-- Migration: Estende rpc_lancar_parto com suporte a bypass_justificativa
-- Data: 2026-05-04
-- Motivo: Permitir que admin registre parto sem prenhez confirmada (animal comprado prenhe,
--         perda de histórico, etc.) com justificativa auditável.
-- Compatibilidade: parâmetro novo é opcional com DEFAULT NULL (chamadas antigas continuam funcionando).

CREATE OR REPLACE FUNCTION public.rpc_lancar_parto(
  p_animal_id UUID,
  p_data_evento DATE,
  p_tipo_parto TEXT,
  p_usuario_id UUID,
  p_gemelar BOOLEAN DEFAULT FALSE,
  p_natimorto BOOLEAN DEFAULT FALSE,
  p_observacoes TEXT DEFAULT NULL,
  p_crias JSONB DEFAULT '[]'::JSONB,
  p_bypass_justificativa TEXT DEFAULT NULL
)
RETURNS TABLE (
  evento_id UUID,
  bezerros_criados INT
) AS $$
DECLARE
  v_evento_id UUID;
  v_fazenda_id UUID;
  v_cria JSONB;
  v_contador INT := 0;
BEGIN
  -- Obter fazenda_id do animal
  SELECT fazenda_id INTO v_fazenda_id
  FROM public.animais
  WHERE id = p_animal_id AND deleted_at IS NULL;

  IF v_fazenda_id IS NULL THEN
    RAISE EXCEPTION 'Animal não encontrado ou deletado.';
  END IF;

  -- Inserir evento em eventos_rebanho (com bypass_justificativa se fornecido)
  INSERT INTO public.eventos_rebanho (
    fazenda_id,
    animal_id,
    tipo,
    data_evento,
    tipo_parto,
    gemelar,
    natimorto,
    observacoes,
    bypass_justificativa,
    usuario_id
  ) VALUES (
    v_fazenda_id,
    p_animal_id,
    'parto',
    p_data_evento,
    p_tipo_parto,
    p_gemelar,
    p_natimorto,
    p_observacoes,
    p_bypass_justificativa,
    p_usuario_id
  ) RETURNING id INTO v_evento_id;

  -- Inserir crias em eventos_parto_crias (antes do trigger ler)
  FOR v_cria IN SELECT * FROM jsonb_array_elements(p_crias)
  LOOP
    INSERT INTO public.eventos_parto_crias (
      evento_id,
      fazenda_id,
      sexo,
      peso_kg,
      vivo
    ) VALUES (
      v_evento_id,
      v_fazenda_id,
      v_cria->>'sexo',
      CASE WHEN v_cria->>'peso_kg' IS NOT NULL THEN (v_cria->>'peso_kg')::NUMERIC ELSE NULL END,
      COALESCE((v_cria->>'vivo')::BOOLEAN, TRUE)
    );

    v_contador := v_contador + 1;
  END LOOP;

  -- Se não houver crias fornecidas, usar defaults (1 cria fêmea viva)
  IF v_contador = 0 THEN
    INSERT INTO public.eventos_parto_crias (
      evento_id,
      fazenda_id,
      sexo,
      peso_kg,
      vivo
    ) VALUES (
      v_evento_id,
      v_fazenda_id,
      'Fêmea',
      NULL,
      TRUE
    );
    v_contador := 1;
  END IF;

  -- Retornar resultado
  RETURN QUERY SELECT v_evento_id, v_contador;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
