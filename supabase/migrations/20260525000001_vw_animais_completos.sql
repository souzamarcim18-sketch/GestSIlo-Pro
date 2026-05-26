-- View vw_animais_completos: agrega todos os campos derivados por animal para o Construtor de Relatórios.
-- security_invoker = true garante que a view respeita RLS das tabelas base.
-- Dependências: animais, lotes, pesos_animal, eventos_rebanho, producoes_leiteiras, lactacoes,
--               eventos_sanitarios.
-- ATENÇÃO: qualquer migration que altere essas tabelas deve recriar esta view.

CREATE OR REPLACE VIEW vw_animais_completos
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
  a.data_entrada,
  a.data_desmame,
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
-- IEP via window function: média do intervalo entre partos consecutivos do mesmo animal
LEFT JOIN LATERAL (
  SELECT
    MAX(CASE WHEN tipo = 'cobertura' THEN data_evento::date END)     AS ultima_cobertura,
    (MAX(CASE WHEN tipo = 'parto' THEN data_evento::date END) + INTERVAL '283 days')::date
                                                                      AS data_parto_previsto,
    COUNT(CASE WHEN tipo = 'parto' THEN 1 END)::int                  AS qtd_partos,
    -- IEP: média dos intervalos entre partos consecutivos (calculado via subquery com lag)
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
    -- status_reprodutivo: derivado do evento mais recente de reprodução
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

-- Leiteira: produção média 30d, dias em lactação (via lactacao ativa), total últimos 30d
-- producoes_leiteiras vincula ao animal diretamente via animal_id + data + volume_litros
-- lactacoes usa data_inicio_parto e data_fim_secagem (sem lactacao_id em producoes_leiteiras)
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

-- Corte: arroba estimada (52% rendimento / 15 kg) + projeção de abate
LEFT JOIN LATERAL (
  SELECT
    CASE
      WHEN ult_peso.peso_kg IS NOT NULL
      THEN ROUND((ult_peso.peso_kg * 0.52 / 15.0)::numeric, 2)
      ELSE NULL
    END AS arroba_estimada,
    -- projecao_abate: data estimada para atingir 480 kg (padrão corte)
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

-- Comentário de manutenção: esta view deve ser recriada se qualquer das tabelas base for alterada.
COMMENT ON VIEW vw_animais_completos IS
  'Agrega todos os campos derivados por animal para o Construtor de Relatórios. '
  'Dependências: animais, lotes, pesos_animal, eventos_rebanho, producoes_leiteiras, lactacoes, eventos_sanitarios. '
  'Criada em 2026-05-25. security_invoker=true respeita RLS das tabelas base.';
