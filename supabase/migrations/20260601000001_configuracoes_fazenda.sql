-- Migration: cria tabela configuracoes_fazenda para pesos de unidades de medida por fazenda
-- Contexto: operador pode registrar saída de silagem em conchas ou vagões; Admin configura os pesos

CREATE TABLE IF NOT EXISTS configuracoes_fazenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id uuid NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  peso_concha_ton numeric(10,4),
  peso_vagao_ton  numeric(10,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_configuracoes_fazenda UNIQUE (fazenda_id)
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_configuracoes_fazenda_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_configuracoes_fazenda_updated_at
  BEFORE UPDATE ON configuracoes_fazenda
  FOR EACH ROW EXECUTE FUNCTION update_configuracoes_fazenda_updated_at();

-- RLS
ALTER TABLE configuracoes_fazenda ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuário autenticado da própria fazenda (Admin, Visualizador e Operador precisam ler)
CREATE POLICY "configuracoes_fazenda_select"
  ON configuracoes_fazenda FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id());

-- INSERT: apenas Admin
CREATE POLICY "configuracoes_fazenda_insert"
  ON configuracoes_fazenda FOR INSERT
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

-- UPDATE: apenas Admin
CREATE POLICY "configuracoes_fazenda_update"
  ON configuracoes_fazenda FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin())
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());
