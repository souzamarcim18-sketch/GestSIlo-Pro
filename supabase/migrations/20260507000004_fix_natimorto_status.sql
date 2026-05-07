-- Migration D: Corrigir bug no trigger parto_criar_bezerros
-- Bug: usa 'Natimorto' como status, mas o enum só tem Ativo/Morto/Vendido/Descartado
-- Fix: natimortos nascem com status 'Morto'; campo vivo=FALSE em eventos_parto_crias documenta o fato

BEGIN;

CREATE OR REPLACE FUNCTION public.parto_criar_bezerros()
RETURNS TRIGGER AS $$
DECLARE
  v_num_bezerros INT;
  v_reprodutor_id UUID;
  v_i INT := 0;
  v_novo_animal_id UUID;
  v_brinco_base TEXT;
  v_brinco_novo TEXT;
  v_contador INT := 0;
  v_sexo_cria TEXT;
  v_vivo_cria BOOLEAN;
  v_peso_cria NUMERIC;
BEGIN
  IF NEW.tipo = 'parto' THEN
    v_num_bezerros := CASE WHEN NEW.gemelar THEN 2 ELSE 1 END;

    SELECT r.reprodutor_id
    INTO v_reprodutor_id
    FROM public.eventos_rebanho r
    INNER JOIN public.eventos_rebanho d ON r.animal_id = d.animal_id
    WHERE r.animal_id = NEW.animal_id
      AND r.tipo = 'cobertura'
      AND d.tipo = 'diagnostico_prenhez'
      AND d.resultado_prenhez = 'positivo'
      AND d.data_evento > r.data_evento
      AND r.data_evento >= NEW.data_evento - INTERVAL '295 days'
      AND r.data_evento <= NEW.data_evento - INTERVAL '240 days'
    ORDER BY r.data_evento DESC
    LIMIT 1;

    WHILE v_i < v_num_bezerros LOOP
      v_i := v_i + 1;

      WITH cria_data AS (
        SELECT
          COALESCE(sexo, 'Fêmea') as sexo,
          COALESCE(vivo, TRUE) as vivo,
          peso_kg
        FROM public.eventos_parto_crias
        WHERE evento_id = NEW.id
        LIMIT 1 OFFSET (v_i - 1)
      )
      SELECT INTO v_sexo_cria, v_vivo_cria, v_peso_cria
        c.sexo, c.vivo, c.peso_kg
      FROM cria_data c;

      v_sexo_cria := COALESCE(v_sexo_cria, 'Fêmea');
      v_vivo_cria := COALESCE(v_vivo_cria, TRUE);

      SELECT brinco INTO v_brinco_base FROM public.animais WHERE id = NEW.animal_id;
      v_brinco_novo := v_brinco_base || '-' || CHR(64 + v_i);

      v_contador := 0;
      WHILE EXISTS (
        SELECT 1 FROM public.animais
        WHERE fazenda_id = NEW.fazenda_id
          AND brinco = v_brinco_novo
          AND deleted_at IS NULL
      ) LOOP
        v_contador := v_contador + 1;
        v_brinco_novo := v_brinco_base || '-' || CHR(64 + v_i) || v_contador;
      END LOOP;

      INSERT INTO public.animais (
        fazenda_id, brinco, sexo, tipo_rebanho, data_nascimento,
        status, status_reprodutivo, mae_id, pai_id, raca, created_at, updated_at
      ) VALUES (
        NEW.fazenda_id,
        v_brinco_novo,
        v_sexo_cria,
        (SELECT tipo_rebanho FROM public.animais WHERE id = NEW.animal_id),
        NEW.data_evento,
        -- FIX: usar 'Morto' para natimortos (enum válido), não 'Natimorto'
        CASE WHEN NOT v_vivo_cria THEN 'Morto'::"public"."status_animal" ELSE 'Ativo'::"public"."status_animal" END,
        'vazia',
        NEW.animal_id,
        v_reprodutor_id,
        (SELECT raca FROM public.animais WHERE id = NEW.animal_id),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) RETURNING id INTO v_novo_animal_id;

      UPDATE public.eventos_parto_crias
      SET animal_criado_id = v_novo_animal_id
      WHERE id = (
        SELECT id FROM public.eventos_parto_crias
        WHERE evento_id = NEW.id AND animal_criado_id IS NULL
        ORDER BY created_at, id
        LIMIT 1
      );
    END LOOP;

    UPDATE public.animais
    SET status_reprodutivo = 'lactacao'
    WHERE id = NEW.animal_id;

    INSERT INTO public.lactacoes (
      fazenda_id, animal_id, data_inicio_parto, created_at, updated_at
    ) VALUES (
      NEW.fazenda_id, NEW.animal_id, NEW.data_evento,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
