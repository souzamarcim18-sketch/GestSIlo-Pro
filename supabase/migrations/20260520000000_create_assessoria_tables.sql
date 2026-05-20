-- ============================================================
-- TABELA: anotacoes_assessoria
-- ============================================================
CREATE TABLE IF NOT EXISTS anotacoes_assessoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  categoria VARCHAR(100) DEFAULT 'outro',
  prioridade VARCHAR(50) DEFAULT 'normal',
  resolvida BOOLEAN DEFAULT FALSE,
  data_resolvida TIMESTAMP NULL,
  assessor_resposta TEXT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,

  CONSTRAINT chk_anotacao_categoria CHECK (categoria IN ('duvida', 'observacao_campo', 'sugestao', 'outro')),
  CONSTRAINT chk_anotacao_prioridade CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente'))
);

ALTER TABLE anotacoes_assessoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem anotações da própria fazenda"
  ON anotacoes_assessoria
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id() AND deleted_at IS NULL);

CREATE POLICY "Admins criam anotações da própria fazenda"
  ON anotacoes_assessoria
  FOR INSERT
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "Admins atualizam anotações da própria fazenda"
  ON anotacoes_assessoria
  FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin())
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "Admins deletam anotações da própria fazenda"
  ON anotacoes_assessoria
  FOR DELETE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE INDEX idx_anotacoes_assessoria_fazenda_id ON anotacoes_assessoria(fazenda_id);
CREATE INDEX idx_anotacoes_assessoria_created_at ON anotacoes_assessoria(created_at DESC);
CREATE INDEX idx_anotacoes_assessoria_resolvida ON anotacoes_assessoria(resolvida);
CREATE INDEX idx_anotacoes_assessoria_deleted_at ON anotacoes_assessoria(deleted_at);

-- ============================================================
-- TABELA: horarios_disponiveis_consultor
-- ============================================================
-- Compartilhada entre todos os consultores
-- Cada linha = 1 slot de 1 hora disponível
CREATE TABLE IF NOT EXISTS horarios_disponiveis_consultor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_hora TIMESTAMP NOT NULL,
  duracao_minutos INTEGER DEFAULT 60,
  disponivel BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(consultor_id, data_hora)
);

ALTER TABLE horarios_disponiveis_consultor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer usuário vê horários disponíveis"
  ON horarios_disponiveis_consultor
  FOR SELECT
  USING (disponivel = TRUE);

CREATE POLICY "Apenas consultores criam seus horários"
  ON horarios_disponiveis_consultor
  FOR INSERT
  WITH CHECK (consultor_id = auth.uid());

CREATE POLICY "Apenas consultores atualizam seus horários"
  ON horarios_disponiveis_consultor
  FOR UPDATE
  USING (consultor_id = auth.uid())
  WITH CHECK (consultor_id = auth.uid());

CREATE INDEX idx_horarios_consultor_id ON horarios_disponiveis_consultor(consultor_id);
CREATE INDEX idx_horarios_data_hora ON horarios_disponiveis_consultor(data_hora);
CREATE INDEX idx_horarios_disponivel ON horarios_disponiveis_consultor(disponivel);

-- ============================================================
-- TABELA: agendamentos_usuario
-- ============================================================
-- Fluxo: usuário escolhe horário → cria solicitação → consultor confirma
CREATE TABLE IF NOT EXISTS agendamentos_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  consultor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horario_disponivel_id UUID NOT NULL REFERENCES horarios_disponiveis_consultor(id) ON DELETE CASCADE,

  tipo VARCHAR(50) NOT NULL,
  data_agendada TIMESTAMP NOT NULL,
  duracao_minutos INTEGER DEFAULT 60,

  link_reuniao VARCHAR(500) NULL,
  observacoes TEXT NULL,

  status VARCHAR(50) DEFAULT 'solicitado',
  motivo_recusa TEXT NULL,
  sugestao_nova_data TIMESTAMP NULL,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,

  CONSTRAINT chk_agendamento_tipo CHECK (tipo IN ('reuniao_video', 'chamada_telefone')),
  CONSTRAINT chk_agendamento_status CHECK (status IN ('solicitado', 'confirmado', 'recusado', 'remarcado', 'cancelado', 'concluido')),
  CONSTRAINT chk_futuro CHECK (data_agendada > NOW())
);

ALTER TABLE agendamentos_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem seus agendamentos"
  ON agendamentos_usuario
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id() AND deleted_at IS NULL);

CREATE POLICY "Consultores veem agendamentos solicitados para eles"
  ON agendamentos_usuario
  FOR SELECT
  USING (consultor_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Admins criam solicitações"
  ON agendamentos_usuario
  FOR INSERT
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "Admins atualizam sua solicitação"
  ON agendamentos_usuario
  FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin())
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "Consultores atualizam status"
  ON agendamentos_usuario
  FOR UPDATE
  USING (consultor_id = auth.uid())
  WITH CHECK (consultor_id = auth.uid());

CREATE INDEX idx_agendamentos_usuario_fazenda_id ON agendamentos_usuario(fazenda_id);
CREATE INDEX idx_agendamentos_usuario_consultor_id ON agendamentos_usuario(consultor_id);
CREATE INDEX idx_agendamentos_usuario_data_agendada ON agendamentos_usuario(data_agendada);
CREATE INDEX idx_agendamentos_usuario_status ON agendamentos_usuario(status);
CREATE INDEX idx_agendamentos_usuario_deleted_at ON agendamentos_usuario(deleted_at);

-- ============================================================
-- TABELA: historico_atendimentos
-- ============================================================
CREATE TABLE IF NOT EXISTS historico_atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES agendamentos_usuario(id) ON DELETE SET NULL,
  titulo VARCHAR(255) NOT NULL,
  resumo TEXT NOT NULL,
  orientacoes_recebidas TEXT NULL,
  proximos_passos TEXT NULL,
  data_atendimento TIMESTAMP NOT NULL,
  assessor_nome VARCHAR(255) NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

ALTER TABLE historico_atendimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem histórico da própria fazenda"
  ON historico_atendimentos
  FOR SELECT
  USING (fazenda_id = get_minha_fazenda_id() AND deleted_at IS NULL);

CREATE POLICY "Admins criam histórico"
  ON historico_atendimentos
  FOR INSERT
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY "Admins atualizam histórico"
  ON historico_atendimentos
  FOR UPDATE
  USING (fazenda_id = get_minha_fazenda_id() AND sou_admin())
  WITH CHECK (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE INDEX idx_historico_atendimentos_fazenda_id ON historico_atendimentos(fazenda_id);
CREATE INDEX idx_historico_atendimentos_data_atendimento ON historico_atendimentos(data_atendimento DESC);
CREATE INDEX idx_historico_atendimentos_deleted_at ON historico_atendimentos(deleted_at);
