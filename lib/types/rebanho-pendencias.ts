// Tipos da camada "Operação do dia" (Fase 3 — SPEC-rebanho345 §6.3.3).
//
// IMPORTANTE: esta superfície é APENAS apresentação derivada de alertas já
// existentes. Não há fonte de verdade nova, nem estado de tarefa persistido
// (sem concluir/snooze/atribuição). Os tipos abaixo descrevem o shape agregado
// que o serviço puro `montarPendencias` produz a partir dos alertas crus.

/** Subdomínio operacional da pendência (classificação obrigatória — §6 ordem B). */
export type SubdominioPendencia =
  | 'reproducao'
  | 'sanidade'
  | 'desempenho'
  | 'manejo';

/** Criticidade operacional, alinhada à severidade dos alertas do dashboard. */
export type CriticidadePendencia = 'critico' | 'urgente' | 'aviso';

/** Identificador estável da lista acionável a que a pendência pertence (§6 ordem D). */
export type TipoPendencia =
  | 'vacinacao_vencida'
  | 'vacinacao_proxima'
  | 'parto_proximo'
  | 'vaca_a_secar'
  | 'pesagem_atrasada';

/** Uma pendência individual, com contexto suficiente para decisão (§6 ordem F). */
export interface Pendencia {
  /** Chave única estável (tipo + animal) para keys de lista. */
  id: string;
  tipo: TipoPendencia;
  subdominio: SubdominioPendencia;
  criticidade: CriticidadePendencia;
  /** Animal alvo (sempre presente — todas as pendências atuais são por animal). */
  animal_id: string;
  animal_brinco: string;
  animal_nome: string | null;
  categoria: string | null;
  lote_id: string | null;
  /** Frase curta explicando o porquê da pendência (motivo). */
  motivo: string;
  /** Ação sugerida em linguagem do produtor. */
  acaoSugerida: string;
  /** Link direto para executar a ação (entrypoint da Operação). */
  href: string;
  /**
   * Dias até o vencimento (negativo = vencido). Usado para ordenação dentro
   * de uma mesma criticidade. `null` quando a pendência não tem prazo.
   */
  diasParaVencimento: number | null;
}

/** Lista acionável agrupada por tipo (§6 ordem D). */
export interface GrupoPendencia {
  tipo: TipoPendencia;
  titulo: string;
  subdominio: SubdominioPendencia;
  itens: Pendencia[];
}

/** Contagem de pendências por categoria animal crítica (§6 ordem C). */
export interface ResumoPorCategoria {
  categoria: string;
  total: number;
}

/** Resultado completo consumido pela UI da "Operação do dia". */
export interface ResumoOperacaoDia {
  /** Todas as pendências, já priorizadas (criticidade → prazo). */
  pendencias: Pendencia[];
  /** Pendências agrupadas em listas acionáveis. */
  grupos: GrupoPendencia[];
  /** Contagem por subdomínio (reprodução/sanidade/desempenho/manejo). */
  totaisPorSubdominio: Record<SubdominioPendencia, number>;
  /** Contagem por categoria animal (para leitura por categoria crítica). */
  totaisPorCategoria: ResumoPorCategoria[];
  /** Total geral. */
  total: number;
}
