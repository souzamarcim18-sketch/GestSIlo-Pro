-- Migration: assinaturas_e_solicitacoes
-- Contexto: infra de billing e controle de acesso à plataforma GestSilo
-- Cria: plano_atual em fazendas, assinaturas, solicitacoes_acesso, gestsilo_admins, recursos_arquivados_downgrade, get_plano_fazenda()

-- ==================== 1. COLUNA plano_atual em fazendas ====================

ALTER TABLE fazendas
  ADD COLUMN plano_atual text NOT NULL DEFAULT 'free'
  CHECK (plano_atual IN ('free', 'starter', 'pro', 'max'));

-- ==================== 2. TABELA assinaturas ====================

CREATE TABLE assinaturas (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id             uuid        NOT NULL REFERENCES fazendas(id),
  stripe_customer_id     text,
  stripe_subscription_id text,
  plano                  text        NOT NULL DEFAULT 'free'
                         CHECK (plano IN ('free', 'starter', 'pro', 'max')),
  status                 text        NOT NULL DEFAULT 'ativa'
                         CHECK (status IN ('ativa', 'inadimplente', 'cancelada', 'pendente')),
  periodo_inicio         timestamptz,
  periodo_fim            timestamptz,
  cancelada_em           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_assinaturas_fazenda_id             ON assinaturas (fazenda_id);
CREATE INDEX idx_assinaturas_stripe_subscription_id ON assinaturas (stripe_subscription_id);

CREATE TRIGGER assinaturas_updated_at
  BEFORE UPDATE ON assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;

-- Admin da própria fazenda pode ler a assinatura
CREATE POLICY "assinaturas_select_admin"
  ON assinaturas FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

-- INSERT e UPDATE exclusivos para service_role (webhook Stripe)
-- Nenhuma policy para INSERT/UPDATE de roles públicas = somente service_role passa

-- ==================== 3. TABELA solicitacoes_acesso ====================

CREATE TABLE solicitacoes_acesso (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             text        NOT NULL,
  email            text        NOT NULL,
  nome_fazenda     text        NOT NULL,
  whatsapp         text        NOT NULL,
  status           text        NOT NULL DEFAULT 'pendente'
                   CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
  plano_solicitado text        NOT NULL DEFAULT 'free'
                   CHECK (plano_solicitado IN ('free', 'starter', 'pro', 'max')),
  observacoes      text,
  aprovado_em      timestamptz,
  rejeitado_em     timestamptz,
  invite_enviado_em timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_solicitacoes_acesso_status ON solicitacoes_acesso (status);
CREATE INDEX idx_solicitacoes_acesso_email  ON solicitacoes_acesso (email);

CREATE TRIGGER solicitacoes_acesso_updated_at
  BEFORE UPDATE ON solicitacoes_acesso
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE solicitacoes_acesso ENABLE ROW LEVEL SECURITY;

-- anon pode inserir (formulário público de solicitação de acesso)
CREATE POLICY "solicitacoes_acesso_insert_anon"
  ON solicitacoes_acesso FOR INSERT
  TO anon
  WITH CHECK (true);

-- SELECT e UPDATE exclusivos para service_role (painel admin GestSilo)
-- Nenhuma policy para SELECT/UPDATE de roles públicas = somente service_role passa

-- ==================== 4. TABELA gestsilo_admins ====================

CREATE TABLE gestsilo_admins (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text        NOT NULL,
  email        text        NOT NULL UNIQUE,
  senha_hash   text        NOT NULL,
  ativo        boolean     NOT NULL DEFAULT true,
  ultimo_login timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gestsilo_admins_email ON gestsilo_admins (email);

CREATE TRIGGER gestsilo_admins_updated_at
  BEFORE UPDATE ON gestsilo_admins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE gestsilo_admins ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy para roles públicas — acesso exclusivo via service_role

-- ==================== 5. TABELA recursos_arquivados_downgrade ====================

CREATE TABLE recursos_arquivados_downgrade (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id     uuid        NOT NULL REFERENCES fazendas(id),
  tipo_recurso   text        NOT NULL,
  recurso_id     uuid        NOT NULL,
  dados_snapshot jsonb       NOT NULL,
  motivo         text        NOT NULL DEFAULT 'downgrade',
  plano_anterior text        NOT NULL,
  plano_novo     text        NOT NULL,
  restaurado_em  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recursos_arquivados_fazenda_id   ON recursos_arquivados_downgrade (fazenda_id);
CREATE INDEX idx_recursos_arquivados_tipo_recurso ON recursos_arquivados_downgrade (tipo_recurso);

ALTER TABLE recursos_arquivados_downgrade ENABLE ROW LEVEL SECURITY;

-- Admin da própria fazenda pode ler os recursos arquivados
CREATE POLICY "recursos_arquivados_select_admin"
  ON recursos_arquivados_downgrade FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

-- INSERT e UPDATE exclusivos para service_role
-- Nenhuma policy para INSERT/UPDATE de roles públicas = somente service_role passa

-- ==================== 6. FUNÇÃO get_plano_fazenda() ====================

CREATE OR REPLACE FUNCTION get_plano_fazenda()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT plano_atual FROM fazendas WHERE id = get_minha_fazenda_id();
$$;
