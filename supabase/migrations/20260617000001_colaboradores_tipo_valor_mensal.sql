-- Mão de Obra: permitir tipo_valor = 'mensal' para colaboradores CLT.
-- A coluna colaboradores.tipo_valor é texto livre, mas pode ter um CHECK
-- constraint restringindo a ('diaria','hora') no banco. Esta migration garante,
-- de forma idempotente, que 'mensal' seja aceito.

DO $$
BEGIN
  -- Remove qualquer CHECK existente sobre tipo_valor (nome pode variar).
  IF EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.table_constraints tc
      ON tc.constraint_name = ccu.constraint_name
     AND tc.constraint_schema = ccu.constraint_schema
    WHERE ccu.table_name = 'colaboradores'
      AND ccu.column_name = 'tipo_valor'
      AND tc.constraint_type = 'CHECK'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.colaboradores DROP CONSTRAINT ' || quote_ident(tc.constraint_name)
      FROM information_schema.constraint_column_usage ccu
      JOIN information_schema.table_constraints tc
        ON tc.constraint_name = ccu.constraint_name
       AND tc.constraint_schema = ccu.constraint_schema
      WHERE ccu.table_name = 'colaboradores'
        AND ccu.column_name = 'tipo_valor'
        AND tc.constraint_type = 'CHECK'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE public.colaboradores
  ADD CONSTRAINT colaboradores_tipo_valor_check
  CHECK (tipo_valor IN ('diaria', 'hora', 'mensal'));
