/**
 * Tipos para o módulo de Assessoria Agronômica (v2)
 */

export type CategoriaAnotacao = 'duvida' | 'observacao_campo' | 'sugestao' | 'outro';
export type PrioridadeAnotacao = 'baixa' | 'normal' | 'alta' | 'urgente';
export type TipoAgendamento = 'reuniao_video' | 'chamada_telefone';
export type StatusAgendamento = 'solicitado' | 'confirmado' | 'recusado' | 'remarcado' | 'cancelado' | 'concluido';

// Anotações
export interface AnotacaoAssessoria {
  id: string;
  fazenda_id: string;
  titulo: string;
  conteudo: string;
  categoria: CategoriaAnotacao;
  prioridade: PrioridadeAnotacao;
  resolvida: boolean;
  data_resolvida: string | null;
  assessor_resposta: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Horários Disponíveis do Consultor
export interface HorarioDisponivel {
  id: string;
  consultor_id: string;
  data_hora: string;
  duracao_minutos: number;
  disponivel: boolean;
  created_at: string;
  updated_at: string;
}

// Agendamento do Usuário (Solicitação)
export interface AgendamentoUsuario {
  id: string;
  fazenda_id: string;
  consultor_id: string;
  horario_disponivel_id: string;
  tipo: TipoAgendamento;
  data_agendada: string;
  duracao_minutos: number;
  link_reuniao: string | null;
  observacoes: string | null;
  status: StatusAgendamento;
  motivo_recusa: string | null;
  sugestao_nova_data: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Histórico de Atendimentos
export interface HistoricoAtendimento {
  id: string;
  fazenda_id: string;
  agendamento_id: string | null;
  titulo: string;
  resumo: string;
  orientacoes_recebidas: string | null;
  proximos_passos: string | null;
  data_atendimento: string;
  assessor_nome: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
