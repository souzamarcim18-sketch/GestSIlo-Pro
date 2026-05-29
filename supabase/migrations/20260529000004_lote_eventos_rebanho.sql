-- Migration: Lançamento em Lote de Eventos de Rebanho — novos tipos e colunas
-- Data: 2026-05-29
-- CRÍTICO: ALTER TYPE ADD VALUE não suporta transações. Os ALTER TYPE devem rodar isolados, sem BEGIN/COMMIT.

-- Novos valores do enum (fora de transação — comportamento obrigatório do PostgreSQL 13+)
ALTER TYPE public.tipo_evento_rebanho ADD VALUE IF NOT EXISTS 'aspiracao_opu';
ALTER TYPE public.tipo_evento_rebanho ADD VALUE IF NOT EXISTS 'protocolo_hormonal';
ALTER TYPE public.tipo_evento_rebanho ADD VALUE IF NOT EXISTS 'transferencia_embriao';

-- Colunas dedicadas para os novos tipos (Opção B — colunas concretas em vez de JSONB)
ALTER TABLE public.eventos_rebanho
  ADD COLUMN IF NOT EXISTS oocitos_coletados       INT NULL
    CHECK (oocitos_coletados IS NULL OR oocitos_coletados >= 0),
  ADD COLUMN IF NOT EXISTS oocitos_viaveis          INT NULL
    CHECK (oocitos_viaveis IS NULL OR oocitos_viaveis >= 0),
  ADD COLUMN IF NOT EXISTS grau_qualidade_opu       TEXT NULL
    CHECK (grau_qualidade_opu IS NULL OR grau_qualidade_opu IN ('I','II','III','IV')),
  ADD COLUMN IF NOT EXISTS produto_hormonal         TEXT NULL,
  ADD COLUMN IF NOT EXISTS dose_produto             TEXT NULL,
  ADD COLUMN IF NOT EXISTS via_aplicacao            TEXT NULL
    CHECK (via_aplicacao IS NULL OR via_aplicacao IN ('IM','IV','SC','SL')),
  ADD COLUMN IF NOT EXISTS finalidade_protocolo     TEXT NULL
    CHECK (finalidade_protocolo IS NULL OR finalidade_protocolo IN
      ('pre_iatf','pre_te','monta_natural','sincronizacao_receptoras')),
  ADD COLUMN IF NOT EXISTS grau_embriao             INT NULL
    CHECK (grau_embriao IS NULL OR grau_embriao BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS raca_embriao             TEXT NULL,
  ADD COLUMN IF NOT EXISTS resultado_te             TEXT NULL
    CHECK (resultado_te IS NULL OR resultado_te IN ('transferido','nao_transferido'));

-- Recriar a view para garantir que ela reflete a nova estrutura da tabela
-- (ALTER TABLE eventos_rebanho invalida o plano de execução da view)
CREATE OR REPLACE VIEW public.vw_animais_completos
WITH (security_invoker = true) AS
SELECT
  a.id,
  a.brinco,
  a.nome,
  a.sexo,
  a.raca,
  a.categoria,
  a.status,
  a.data_nascimento,
  a.fazenda_id,
  l.nome AS lote_nome,

  -- Pesagem: último peso
  ult_peso.peso_kg       AS ultimo_peso_kg,
  ult_peso.data_pesagem  AS data_ultimo_peso,

  -- GMD 90d: (ult_peso - peso_anterior_nos_últimos_90d) / dias
  gmd_calc.gmd_90d,

  -- Reprodução
  repr.ultima_cobertura,
  repr.data_parto_previsto,
  repr.iep_dias,
  repr.qtd_partos,
  repr.status_reprodutivo,

  -- Leiteira
  leit.producao_media_30d,
  leit.dias_lactacao,
  leit.total_lactacao,

  -- Sanidade
  san.ultima_vacinacao,
  san.proxima_vacinacao,
  san.ultima_vermifugacao,

  -- Corte
  corte.arroba_estimada,
  corte.projecao_abate

FROM animais a
LEFT JOIN lotes l ON a.lote_id = l.id

-- Último peso registrado
LEFT JOIN LATERAL (
  SELECT peso_kg, data_pesagem
  FROM pesos_animal
  WHERE animal_id = a.id
  ORDER BY data_pesagem DESC
  LIMIT 1
) ult_peso ON true

-- GMD 90d: compara último peso com o peso anterior mais recente nos últimos 90 dias
LEFT JOIN LATERAL (
  SELECT
    CASE
      WHEN ant.data_pesagem IS NOT NULL AND (ult_peso.data_pesagem - ant.data_pesagem) > 0
      THEN ROUND(
        (ult_peso.peso_kg - ant.peso_kg)::numeric
          / (ult_peso.data_pesagem - ant.data_pesagem),
        3
      )
      ELSE NULL
    END AS gmd_90d
  FROM pesos_animal ant
  WHERE ant.animal_id = a.id
    AND ant.data_pesagem >= (CURRENT_DATE - INTERVAL '90 days')
    AND ant.data_pesagem < ult_peso.data_pesagem
  ORDER BY ant.data_pesagem DESC
  LIMIT 1
) gmd_calc ON true

-- Reprodução: última cobertura, data parto previsto, IEP, qtd partos, status reprodutivo
LEFT JOIN LATERAL (
  SELECT
    MAX(CASE WHEN tipo = 'cobertura' THEN data_evento::date END)     AS ultima_cobertura,
    (MAX(CASE WHEN tipo = 'parto' THEN data_evento::date END) + INTERVAL '283 days')::date
                                                                      AS data_parto_previsto,
    COUNT(CASE WHEN tipo = 'parto' THEN 1 END)::int                  AS qtd_partos,
    (
      SELECT ROUND(AVG(intervalo_dias)::numeric, 0)::int
      FROM (
        SELECT
          (data_evento::date - LAG(data_evento::date) OVER (ORDER BY data_evento))::int AS intervalo_dias
        FROM eventos_rebanho er2
        WHERE er2.animal_id = a.id AND er2.tipo = 'parto'
      ) sub
      WHERE intervalo_dias IS NOT NULL AND intervalo_dias > 0
    )                                                                 AS iep_dias,
    CASE
      WHEN MAX(CASE WHEN tipo = 'parto'             THEN data_evento END) >=
           MAX(CASE WHEN tipo IN ('cobertura','diagnostico_prenhez','secagem') THEN data_evento END)
        THEN 'lactacao'
      WHEN MAX(CASE WHEN tipo = 'diagnostico_prenhez' THEN data_evento END) IS NOT NULL
        AND MAX(CASE WHEN tipo = 'diagnostico_prenhez' THEN data_evento END) >=
            COALESCE(MAX(CASE WHEN tipo = 'parto' THEN data_evento END), '1900-01-01'::timestamp)
        THEN 'prenha'
      WHEN MAX(CASE WHEN tipo = 'secagem' THEN data_evento END) IS NOT NULL
        AND MAX(CASE WHEN tipo = 'secagem' THEN data_evento END) >=
            COALESCE(MAX(CASE WHEN tipo = 'parto' THEN data_evento END), '1900-01-01'::timestamp)
        THEN 'seca'
      WHEN MAX(CASE WHEN tipo = 'cobertura' THEN data_evento END) IS NOT NULL
        AND MAX(CASE WHEN tipo = 'cobertura' THEN data_evento END) >=
            COALESCE(MAX(CASE WHEN tipo = 'parto' THEN data_evento END), '1900-01-01'::timestamp)
        THEN 'coberta'
      ELSE NULL
    END                                                               AS status_reprodutivo
  FROM eventos_rebanho
  WHERE animal_id = a.id
) repr ON true

-- Leiteira: produção média 30d, dias em lactação, total últimos 30d
LEFT JOIN LATERAL (
  SELECT
    ROUND(AVG(pl.volume_litros)::numeric, 2)                              AS producao_media_30d,
    (CURRENT_DATE - MAX(lac_ativa.data_inicio_parto)::date)               AS dias_lactacao,
    SUM(pl.volume_litros)                                                 AS total_lactacao
  FROM producoes_leiteiras pl
  LEFT JOIN LATERAL (
    SELECT data_inicio_parto
    FROM lactacoes
    WHERE animal_id = a.id
      AND data_fim_secagem IS NULL
      AND deleted_at IS NULL
    ORDER BY data_inicio_parto DESC
    LIMIT 1
  ) lac_ativa ON true
  WHERE pl.animal_id = a.id
    AND pl.data >= (CURRENT_DATE - INTERVAL '30 days')
) leit ON true

-- Sanidade
LEFT JOIN LATERAL (
  SELECT
    MAX(CASE WHEN tipo = 'vacinacao'     THEN data_evento END)::date AS ultima_vacinacao,
    MAX(CASE WHEN tipo = 'vacinacao'     THEN data_proxima_dose END)::date AS proxima_vacinacao,
    MAX(CASE WHEN tipo = 'vermifugacao'  THEN data_evento END)::date AS ultima_vermifugacao
  FROM eventos_sanitarios
  WHERE animal_id = a.id
) san ON true

-- Corte: arroba estimada + projeção de abate
LEFT JOIN LATERAL (
  SELECT
    CASE
      WHEN ult_peso.peso_kg IS NOT NULL
      THEN ROUND((ult_peso.peso_kg * 0.52 / 15.0)::numeric, 2)
      ELSE NULL
    END AS arroba_estimada,
    CASE
      WHEN ult_peso.peso_kg IS NOT NULL
        AND gmd_calc.gmd_90d IS NOT NULL
        AND gmd_calc.gmd_90d > 0
        AND ult_peso.peso_kg < 480
      THEN (CURRENT_DATE + CEIL((480 - ult_peso.peso_kg) / gmd_calc.gmd_90d) * INTERVAL '1 day')::date
      ELSE NULL
    END AS projecao_abate
  FROM (SELECT 1) dummy
) corte ON true;

COMMENT ON VIEW public.vw_animais_completos IS
  'Agrega todos os campos derivados por animal para o Construtor de Relatórios. '
  'Dependências: animais, lotes, pesos_animal, eventos_rebanho, producoes_leiteiras, lactacoes, eventos_sanitarios. '
  'Atualizada em 2026-05-29 após ADD COLUMN em eventos_rebanho (aspiracao_opu, protocolo_hormonal, transferencia_embriao). '
  'security_invoker=true respeita RLS das tabelas base.';

-- Recriar registrar_evento_com_status para incluir os novos campos das colunas adicionadas acima.
-- Mantém compatibilidade total com eventos anteriores (novos campos são NULL quando não fornecidos).
CREATE OR REPLACE FUNCTION public.registrar_evento_com_status(
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
    motivo_descarte,
    causa_aborto,
    idade_gestacional_dias,
    tipo_parto,
    -- Campos novos: aspiracao_opu
    oocitos_coletados,
    oocitos_viaveis,
    grau_qualidade_opu,
    -- Campos novos: protocolo_hormonal
    produto_hormonal,
    dose_produto,
    via_aplicacao,
    finalidade_protocolo,
    -- Campos novos: transferencia_embriao
    grau_embriao,
    raca_embriao,
    resultado_te,
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
    p_payload->>'motivo_descarte',
    p_payload->>'causa_aborto',
    (p_payload->>'idade_gestacional_dias')::integer,
    p_payload->>'tipo_parto',
    -- Campos novos: aspiracao_opu
    (p_payload->>'oocitos_coletados')::integer,
    (p_payload->>'oocitos_viaveis')::integer,
    p_payload->>'grau_qualidade_opu',
    -- Campos novos: protocolo_hormonal
    p_payload->>'produto_hormonal',
    p_payload->>'dose_produto',
    p_payload->>'via_aplicacao',
    p_payload->>'finalidade_protocolo',
    -- Campos novos: transferencia_embriao
    (p_payload->>'grau_embriao')::integer,
    p_payload->>'raca_embriao',
    p_payload->>'resultado_te',
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

REVOKE ALL ON FUNCTION public.registrar_evento_com_status(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_evento_com_status(uuid, jsonb) TO authenticated;
