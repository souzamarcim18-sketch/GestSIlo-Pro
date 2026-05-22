-- =============================================================================
-- Migration: Módulo de Pastagens
-- Data: 2026-05-21
-- Depende: fazendas, lotes, animais, pesos_animal, insumos, maquinas
-- Funções RLS pré-existentes usadas:
--   get_minha_fazenda_id(), sou_admin(), sou_gerente_ou_admin()
--   sou_admin_ou_visualizador() (criada em 20260519000001)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Função utilitária updated_at (não existe no banco — criar aqui)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1. Tabela: pastagens
-- -----------------------------------------------------------------------------

CREATE TABLE pastagens (
  id               uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id       uuid        NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome             text        NOT NULL,
  especie_forrageira text      NULL,
  area_total_ha    numeric     NOT NULL CHECK (area_total_ha > 0),
  sistema_pastejo  text        NOT NULL DEFAULT 'rotacionado'
                               CHECK (sistema_pastejo IN ('rotacionado', 'continuo', 'semi_intensivo')),
  observacoes      text        NULL,
  ativo            boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NULL DEFAULT now(),
  updated_at       timestamptz NULL DEFAULT now()
);

COMMENT ON COLUMN pastagens.fazenda_id IS 'Preenchido pelo trigger trg_pastagens_fazenda_id via get_minha_fazenda_id()';
COMMENT ON COLUMN pastagens.area_total_ha IS 'Valor informativo; área real é a soma dos piquetes filhos';
COMMENT ON COLUMN pastagens.ativo IS 'Soft-delete: false = pastagem arquivada, piquetes filhos preservados no histórico';

-- Trigger: preenche fazenda_id via get_minha_fazenda_id()
CREATE OR REPLACE FUNCTION fn_pastagens_set_fazenda_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.fazenda_id := get_minha_fazenda_id();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pastagens_fazenda_id
  BEFORE INSERT ON pastagens
  FOR EACH ROW
  EXECUTE FUNCTION fn_pastagens_set_fazenda_id();

CREATE TRIGGER trg_pastagens_updated_at
  BEFORE UPDATE ON pastagens
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

-- RLS
ALTER TABLE pastagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY pastagens_select_mesma_fazenda
  ON pastagens FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY pastagens_insert_admin
  ON pastagens FOR INSERT
  WITH CHECK (sou_gerente_ou_admin());

CREATE POLICY pastagens_update_admin
  ON pastagens FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin());

CREATE POLICY pastagens_delete_admin
  ON pastagens FOR DELETE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

-- -----------------------------------------------------------------------------
-- 2. Tabela: piquetes
-- -----------------------------------------------------------------------------

CREATE TABLE piquetes (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id            uuid        NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  pastagem_id           uuid        NOT NULL REFERENCES pastagens(id) ON DELETE CASCADE,
  nome                  text        NOT NULL,
  area_ha               numeric     NOT NULL CHECK (area_ha > 0),
  status                text        NOT NULL DEFAULT 'Descanso'
                                    CHECK (status IN ('Em pastejo', 'Descanso', 'Em reforma', 'Interditado')),
  ua_suportada          numeric     NULL CHECK (ua_suportada > 0),
  dias_descanso_ideal   integer     NULL CHECK (dias_descanso_ideal > 0),
  altura_entrada_cm     numeric     NULL CHECK (altura_entrada_cm > 0),
  altura_saida_cm       numeric     NULL CHECK (altura_saida_cm > 0),
  observacoes           text        NULL,
  created_at            timestamptz NULL DEFAULT now(),
  updated_at            timestamptz NULL DEFAULT now()
);

COMMENT ON COLUMN piquetes.fazenda_id IS 'Propagado pelo trigger trg_piquetes_fazenda_id via pastagem_id';
COMMENT ON COLUMN piquetes.status IS 'Gerenciado pelas Server Actions — não usar trigger para este campo';
COMMENT ON COLUMN piquetes.ua_suportada IS 'Capacidade de suporte em UA/ha configurada pelo gestor';
COMMENT ON COLUMN piquetes.dias_descanso_ideal IS 'Tempo de descanso esperado para a forrageira desta pastagem';
COMMENT ON COLUMN piquetes.altura_entrada_cm IS 'Altura de dossel de referência para entrada do lote';
COMMENT ON COLUMN piquetes.altura_saida_cm IS 'Altura de dossel de referência para saída do lote';

-- Trigger: propaga fazenda_id de pastagens para piquetes
CREATE OR REPLACE FUNCTION fn_propagar_fazenda_id_via_pastagem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.fazenda_id := (
    SELECT fazenda_id FROM pastagens WHERE id = NEW.pastagem_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_piquetes_fazenda_id
  BEFORE INSERT ON piquetes
  FOR EACH ROW
  EXECUTE FUNCTION fn_propagar_fazenda_id_via_pastagem();

CREATE TRIGGER trg_piquetes_updated_at
  BEFORE UPDATE ON piquetes
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

-- RLS
ALTER TABLE piquetes ENABLE ROW LEVEL SECURITY;

CREATE POLICY piquetes_select_mesma_fazenda
  ON piquetes FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY piquetes_insert_admin
  ON piquetes FOR INSERT
  WITH CHECK (sou_gerente_ou_admin());

CREATE POLICY piquetes_update_admin
  ON piquetes FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin());

CREATE POLICY piquetes_delete_admin
  ON piquetes FOR DELETE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

-- -----------------------------------------------------------------------------
-- 3. Tabela: ocupacoes_piquete
-- -----------------------------------------------------------------------------

CREATE TABLE ocupacoes_piquete (
  id                        uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id                uuid        NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  piquete_id                uuid        NOT NULL REFERENCES piquetes(id) ON DELETE CASCADE,
  lote_id                   uuid        NOT NULL REFERENCES lotes(id),
  data_entrada              date        NOT NULL DEFAULT CURRENT_DATE,
  data_saida_prevista       date        NULL,
  data_saida_real           date        NULL,
  altura_dossel_entrada_cm  numeric     NULL CHECK (altura_dossel_entrada_cm > 0),
  altura_dossel_saida_cm    numeric     NULL CHECK (altura_dossel_saida_cm > 0),
  quantidade_animais        integer     NULL CHECK (quantidade_animais > 0),
  peso_medio_kg             numeric     NULL CHECK (peso_medio_kg > 0),
  ua_real                   numeric     NULL CHECK (ua_real >= 0),
  metodo_calculo_ua         text        NULL CHECK (metodo_calculo_ua IN ('peso_real', 'fator_categoria')),
  observacoes               text        NULL,
  created_by                uuid        NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at                timestamptz NULL DEFAULT now(),
  updated_at                timestamptz NULL DEFAULT now(),

  CONSTRAINT chk_datas_saida CHECK (
    data_saida_real IS NULL OR data_saida_prevista IS NULL OR data_saida_real >= data_entrada
  )
);

COMMENT ON COLUMN ocupacoes_piquete.fazenda_id IS 'Propagado pelo trigger trg_ocupacoes_piquete_fazenda_id via piquete_id';
COMMENT ON COLUMN ocupacoes_piquete.ua_real IS 'Snapshot calculado no momento do registro da ocupação';
COMMENT ON COLUMN ocupacoes_piquete.metodo_calculo_ua IS 'Indica se ua_real foi calculado por peso_real (pesos_animal últimos 90d) ou fator_categoria (estimativa fixa)';
COMMENT ON COLUMN ocupacoes_piquete.quantidade_animais IS 'Snapshot da quantidade de animais ativos no lote ao registrar';
COMMENT ON COLUMN ocupacoes_piquete.peso_medio_kg IS 'Snapshot do peso médio (real ou estimado por categoria) ao registrar';

-- Partial unique index: impede duas ocupações abertas simultâneas no mesmo piquete
CREATE UNIQUE INDEX idx_ocupacao_aberta_unica
  ON ocupacoes_piquete(piquete_id)
  WHERE data_saida_real IS NULL;

-- Trigger: propaga fazenda_id de piquetes para ocupacoes_piquete (função compartilhada com eventos_manejo)
CREATE OR REPLACE FUNCTION fn_propagar_fazenda_id_via_piquete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.fazenda_id := (
    SELECT fazenda_id FROM piquetes WHERE id = NEW.piquete_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ocupacoes_piquete_fazenda_id
  BEFORE INSERT ON ocupacoes_piquete
  FOR EACH ROW
  EXECUTE FUNCTION fn_propagar_fazenda_id_via_piquete();

CREATE TRIGGER trg_ocupacoes_piquete_updated_at
  BEFORE UPDATE ON ocupacoes_piquete
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

-- RLS
ALTER TABLE ocupacoes_piquete ENABLE ROW LEVEL SECURITY;

CREATE POLICY ocupacoes_piquete_select_mesma_fazenda
  ON ocupacoes_piquete FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY ocupacoes_piquete_insert_admin
  ON ocupacoes_piquete FOR INSERT
  WITH CHECK (sou_gerente_ou_admin());

CREATE POLICY ocupacoes_piquete_update_admin
  ON ocupacoes_piquete FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin());

CREATE POLICY ocupacoes_piquete_delete_admin
  ON ocupacoes_piquete FOR DELETE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

-- -----------------------------------------------------------------------------
-- 4. Tabela: eventos_manejo_pastagem
-- -----------------------------------------------------------------------------

CREATE TABLE eventos_manejo_pastagem (
  id                uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fazenda_id        uuid        NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  piquete_id        uuid        NOT NULL REFERENCES piquetes(id) ON DELETE CASCADE,
  tipo              text        NOT NULL
                                CHECK (tipo IN (
                                  'adubacao_manutencao', 'calagem', 'reforma',
                                  'ressemeadura', 'irrigacao', 'interdicao',
                                  'rocagem', 'outro'
                                )),
  data              date        NOT NULL DEFAULT CURRENT_DATE,
  insumo_id         uuid        NULL REFERENCES insumos(id),
  quantidade_insumo numeric     NULL CHECK (quantidade_insumo > 0),
  unidade_insumo    text        NULL,
  dose_por_ha       numeric     NULL CHECK (dose_por_ha > 0),
  maquina_id        uuid        NULL REFERENCES maquinas(id),
  custo_estimado    numeric     NULL CHECK (custo_estimado >= 0),
  observacoes       text        NULL,
  created_by        uuid        NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at        timestamptz NULL DEFAULT now()
);

COMMENT ON COLUMN eventos_manejo_pastagem.fazenda_id IS 'Propagado pelo trigger trg_eventos_manejo_pastagem_fazenda_id via piquete_id';
COMMENT ON COLUMN eventos_manejo_pastagem.tipo IS 'Tipo de evento: reforma e interdicao disparam atualização de status do piquete na action';
COMMENT ON COLUMN eventos_manejo_pastagem.insumo_id IS 'Referência informativa — não cria saída automática em movimentacoes_insumo';
COMMENT ON COLUMN eventos_manejo_pastagem.maquina_id IS 'Referência informativa — não cria registro em uso_maquinas';

-- Trigger: reutiliza fn_propagar_fazenda_id_via_piquete (já criada acima)
CREATE TRIGGER trg_eventos_manejo_pastagem_fazenda_id
  BEFORE INSERT ON eventos_manejo_pastagem
  FOR EACH ROW
  EXECUTE FUNCTION fn_propagar_fazenda_id_via_piquete();

-- RLS
ALTER TABLE eventos_manejo_pastagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY eventos_manejo_pastagem_select_mesma_fazenda
  ON eventos_manejo_pastagem FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

CREATE POLICY eventos_manejo_pastagem_insert_admin
  ON eventos_manejo_pastagem FOR INSERT
  WITH CHECK (sou_gerente_ou_admin());

CREATE POLICY eventos_manejo_pastagem_update_admin
  ON eventos_manejo_pastagem FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id())
  WITH CHECK (sou_gerente_ou_admin());

CREATE POLICY eventos_manejo_pastagem_delete_admin
  ON eventos_manejo_pastagem FOR DELETE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

-- -----------------------------------------------------------------------------
-- 5. Índices de performance
-- -----------------------------------------------------------------------------

CREATE INDEX idx_pastagens_fazenda_id         ON pastagens(fazenda_id);
CREATE INDEX idx_piquetes_fazenda_id          ON piquetes(fazenda_id);
CREATE INDEX idx_piquetes_pastagem_id         ON piquetes(pastagem_id);
CREATE INDEX idx_ocupacoes_piquete_fazenda_id ON ocupacoes_piquete(fazenda_id);
CREATE INDEX idx_ocupacoes_piquete_piquete_id ON ocupacoes_piquete(piquete_id);
CREATE INDEX idx_ocupacoes_piquete_lote_id    ON ocupacoes_piquete(lote_id);
CREATE INDEX idx_eventos_manejo_piquete_id    ON eventos_manejo_pastagem(piquete_id);
CREATE INDEX idx_eventos_manejo_fazenda_id    ON eventos_manejo_pastagem(fazenda_id);
-- idx_ocupacao_aberta_unica já declarado na seção 3 (partial unique index)
