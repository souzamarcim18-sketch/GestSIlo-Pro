import { CATEGORIA } from '@/lib/constants/categorias-rebanho';

// ─── Enums ─────────────────────────────────────────────────────────────────

export type SistemaPastejo = 'rotacionado' | 'continuo' | 'semi_intensivo';

export type StatusPiquete = 'Em pastejo' | 'Descanso' | 'Em reforma' | 'Interditado';

export type TipoEventoManejo =
  | 'adubacao_manutencao'
  | 'calagem'
  | 'reforma'
  | 'ressemeadura'
  | 'irrigacao'
  | 'interdicao'
  | 'rocagem'
  | 'manutencao_cerca'
  | 'outro';

export type TipoServicoCerca = 'reparo' | 'substituicao' | 'nova';

export type MetodoCalculoUA = 'peso_real' | 'fator_categoria';

export type NivelTecnologia = 'baixo' | 'medio' | 'alto';

// ─── Entidades base ─────────────────────────────────────────────────────────

export interface Pastagem {
  id: string;
  fazenda_id: string;
  nome: string;
  especie_forrageira: string | null;
  area_total_ha: number;
  sistema_pastejo: SistemaPastejo;
  nivel_tecnologia: NivelTecnologia;
  necessita_reforma: boolean;
  observacoes: string | null;
  ativo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface Piquete {
  id: string;
  fazenda_id: string;
  pastagem_id: string;
  nome: string;
  area_ha: number;
  status: StatusPiquete;
  necessita_reforma: boolean;
  ua_suportada: number | null;
  dias_descanso_ideal: number | null;
  altura_entrada_cm: number | null;
  altura_saida_cm: number | null;
  observacoes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface OcupacaoPiquete {
  id: string;
  fazenda_id: string;
  piquete_id: string;
  lote_id: string;
  data_entrada: string;
  data_saida_prevista: string | null;
  data_saida_real: string | null;
  altura_dossel_entrada_cm: number | null;
  altura_dossel_saida_cm: number | null;
  quantidade_animais: number | null;
  peso_medio_kg: number | null;
  ua_real: number | null;
  metodo_calculo_ua: MetodoCalculoUA | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface EventoManejoPastagem {
  id: string;
  fazenda_id: string;
  piquete_id: string;
  tipo: TipoEventoManejo;
  data: string;
  insumo_id: string | null;
  quantidade_insumo: number | null;
  unidade_insumo: string | null;
  dose_por_ha: number | null;
  maquina_id: string | null;
  custo_estimado: number | null;
  tipo_servico_cerca: TipoServicoCerca | null;
  metragem_cerca_m: number | null;
  material_cerca: string | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string | null;
}

// ─── Tipos enriquecidos (com joins) ─────────────────────────────────────────

export interface OcupacaoPiqueteComLote extends OcupacaoPiquete {
  lotes: {
    nome: string;
    tipo_rebanho: string;
  };
}

export interface PiqueteComOcupacaoAtual extends Piquete {
  ocupacao_atual: OcupacaoPiqueteComLote | null;
  dias_descanso_acumulado: number | null;
  alerta_pronto_entrada: boolean;
  alerta_superlotacao: boolean;
  alerta_ocupacao_vencida: boolean;
  dias_ocupacao_vencida: number | null;
}

export interface PastagemComResumo extends Pastagem {
  piquetes: PiqueteComOcupacaoAtual[];
  total_piquetes: number;
  em_pastejo: number;
  em_descanso: number;
  em_reforma: number;
  interditados: number;
  necessita_reforma_count: number;
}

export interface EventoManejoComJoins extends EventoManejoPastagem {
  insumos: { nome: string; unidade: string } | null;
  maquinas: { nome: string } | null;
}

// ─── Fatores de conversão UA ─────────────────────────────────────────────────

/**
 * Fatores fixos de conversão por categoria animal (valores zootécnicos padrão Brasil).
 * Usados como fallback quando não há pesagem nos últimos 90 dias.
 * Fonte: Embrapa / literatura zootécnica nacional
 */
/**
 * Fatores fixos de conversão por categoria animal (valores zootécnicos padrão Brasil).
 * Chaves usam CATEGORIA (fonte única — lib/constants/categorias-rebanho.ts) para garantir
 * que casam com o que o trigger SQL grava em animais.categoria.
 * ATENÇÃO (Fase 5 — P5.4): a chave 'Novilha (Prenha)' foi corrigida para CATEGORIA.NOVILHA_PRENHA
 * ('Novilha Prenha'). Animais desta categoria deixam de cair no fallback UA_FATOR_PADRAO (1.00)
 * e passam a usar o fator correto (0.50). Esta é uma mudança intencional de comportamento.
 */
export const FATORES_UA_POR_CATEGORIA: Record<string, number> = {
  // Leiteiro / dupla aptidão
  [CATEGORIA.BEZERRO]:        0.25,
  [CATEGORIA.BEZERRA]:        0.25,
  [CATEGORIA.NOVILHA_PRENHA]: 0.50,
  [CATEGORIA.NOVILHO]:        0.50,
  [CATEGORIA.VACA_LACTACAO]:  1.00,
  [CATEGORIA.VACA_SECA]:      1.00,
  [CATEGORIA.VACA_PRENHA]:    1.00,
  [CATEGORIA.VACA_VAZIA]:     1.00,
  [CATEGORIA.TOURO]:          1.25,
  // Corte
  [CATEGORIA.NOVILHA]:        0.50,
  [CATEGORIA.VACA_MATRIZ]:    1.00,
  [CATEGORIA.BOI]:            1.00,
  [CATEGORIA.BOI_DESCARTADO]: 1.00,
  [CATEGORIA.FEMEA_DESCARTADA]: 1.00,
};

export const UA_FATOR_PADRAO = 1.00;

// ─── Resultado do cálculo de UA ──────────────────────────────────────────────

export interface ResultadoCalculoUA {
  ua_total: number;
  ua_por_ha: number | null;
  peso_medio_kg: number;
  quantidade_animais: number;
  metodo: MetodoCalculoUA;
  animais_sem_pesagem: number;
}
