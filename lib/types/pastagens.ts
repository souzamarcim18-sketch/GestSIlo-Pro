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
  | 'outro';

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
}

export interface PastagemComResumo extends Pastagem {
  piquetes: PiqueteComOcupacaoAtual[];
  total_piquetes: number;
  em_pastejo: number;
  em_descanso: number;
  em_reforma: number;
  interditados: number;
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
export const FATORES_UA_POR_CATEGORIA: Record<string, number> = {
  // Leiteiro / dupla aptidão
  'Bezerro':                0.25,
  'Bezerra':                0.25,
  'Novilha (Prenha)':       0.50,
  'Novilho':                0.50,
  'Vaca em Lactação':       1.00,
  'Vaca Seca':              1.00,
  'Vaca Prenha':            1.00,
  'Vaca Vazia':             1.00,
  'Touro':                  1.25,
  // Corte
  'Novilha':                0.50,
  'Vaca Matriz':            1.00,
  'Boi':                    1.00,
  'Boi Descartado':         1.00,
  'Fêmea Descartada':       1.00,
} as const;

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
