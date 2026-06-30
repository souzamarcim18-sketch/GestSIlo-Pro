import { CATEGORIA } from '@/lib/constants/categorias-rebanho';

/**
 * Consumo de matéria seca por categoria animal (kg MS/cabeça/dia).
 * Chaves usam CATEGORIA (fonte única) para garantir que casam com animais.categoria.
 * ATENÇÃO (Fase 5 — P5.4): a chave 'Novilha (Prenha)' foi corrigida para CATEGORIA.NOVILHA_PRENHA
 * ('Novilha Prenha'). Animais desta categoria deixam de usar o fallback CONSUMO_MS_PADRAO (7.0)
 * e passam a usar o consumo correto (8.5). Esta é uma mudança intencional de comportamento.
 */
export const CONSUMO_MS_POR_CATEGORIA = new Map<string, number>([
  [CATEGORIA.VACA_LACTACAO,    14.0],
  [CATEGORIA.VACA_PRENHA,      10.0],
  [CATEGORIA.VACA_SECA,         8.0],
  [CATEGORIA.VACA_VAZIA,        8.0],
  [CATEGORIA.NOVILHA_PRENHA,    8.5],
  [CATEGORIA.NOVILHA,           7.0],
  [CATEGORIA.NOVILHO,           7.0],
  [CATEGORIA.BEZERRO,           2.5],
  [CATEGORIA.BEZERRA,           2.5],
  [CATEGORIA.TOURO,            10.0],
  [CATEGORIA.BOI,               9.0],
  [CATEGORIA.VACA_MATRIZ,       8.5],
  [CATEGORIA.BOI_DESCARTADO,    8.0],
  [CATEGORIA.FEMEA_DESCARTADA,  7.5],
]);

export const CONSUMO_MS_PADRAO = 7.0;

// ─── Sazonalidade ────────────────────────────────────────────────────────────
// Brasil: seca = mai–out, verão (chuvas) = nov–abr
export type EpocaAno = 'verao' | 'seca';

export function getEpocaAtual(mes?: number): EpocaAno {
  const m = mes ?? new Date().getMonth() + 1; // 1-12
  return m >= 5 && m <= 10 ? 'seca' : 'verao';
}

// ─── Oferta de Matéria Seca por espécie forrageira (kg MS / ha / dia) ────────
// Fontes: Embrapa, literatura zootécnica nacional (valores de referência).
// IMPORTANTE: são estimativas de referência, não medições de campo.
// verao = período das chuvas (nov-abr), seca = período seco (mai-out)
export type OfertaEspecie = { verao: number; seca: number };

export const OFERTA_MS_POR_ESPECIE = new Map<string, OfertaEspecie>([
  // Braquiárias
  ['Braquiária Marandu', { verao: 45, seca: 10 }],
  ['Braquiária Xaraés', { verao: 48, seca: 11 }],
  ['Braquiária Piatã', { verao: 44, seca: 10 }],
  ['Braquiária Paiaguás', { verao: 46, seca: 11 }],
  ['Braquiária Decumbens', { verao: 38, seca: 8 }],
  ['Braquiária Ruziziensis', { verao: 36, seca: 8 }],
  ['Braquiária BRS Ipyporã', { verao: 47, seca: 11 }],
  ['Braquiária Mulato II', { verao: 50, seca: 12 }],
  // Panicum
  ['Mombaça', { verao: 60, seca: 10 }],
  ['Tanzânia', { verao: 55, seca: 10 }],
  ['Massai', { verao: 42, seca: 9 }],
  ['Zuri / BRS Zuri', { verao: 62, seca: 11 }],
  ['Quênia / BRS Quênia', { verao: 58, seca: 10 }],
  ['Miyagi', { verao: 52, seca: 9 }],
  ['BRS Tamani', { verao: 46, seca: 9 }],
  // Cynodon
  ['Tifton 85', { verao: 55, seca: 12 }],
  ['Tifton 68', { verao: 50, seca: 11 }],
  ['Estrela Africana', { verao: 45, seca: 9 }],
  // Capim-elefante / corte (valores conservadores — forragem de corte)
  ['Capiaçu (BRS Capiaçu)', { verao: 90, seca: 15 }],
  ['BRS Kurumi', { verao: 75, seca: 12 }],
  // Andropogon
  ['Andropogon', { verao: 35, seca: 10 }],
  // Invernais (produção invertida: alta na seca/inverno)
  ['Aveia', { verao: 5, seca: 45 }],
  ['Azevém', { verao: 5, seca: 50 }],
  ['Aveia + Azevém', { verao: 5, seca: 48 }],
  ['Triticale', { verao: 5, seca: 40 }],
  // Leguminosas
  ['Amendoim Forrageiro', { verao: 35, seca: 8 }],
  ['Estilosantes', { verao: 40, seca: 10 }],
]);

// Usado quando a espécie não está mapeada ("Outra") — valor conservador
export const OFERTA_MS_PADRAO: OfertaEspecie = { verao: 40, seca: 8 };

// ─── Catálogo agrupado para o dropdown de cadastro ───────────────────────────
// Fonte única: derivado das chaves de OFERTA_MS_POR_ESPECIE (zero duplicação).
export const VALOR_ESPECIE_OUTRA = 'Outra (não listada)';

export type GrupoEspecies = { grupo: string; especies: string[] };

export const CATALOGO_ESPECIES_FORRAGEIRAS: GrupoEspecies[] = [
  {
    grupo: 'Braquiárias',
    especies: [
      'Braquiária Marandu',
      'Braquiária Xaraés',
      'Braquiária Piatã',
      'Braquiária Paiaguás',
      'Braquiária Decumbens',
      'Braquiária Ruziziensis',
      'Braquiária BRS Ipyporã',
      'Braquiária Mulato II',
    ],
  },
  {
    grupo: 'Panicum',
    especies: [
      'Mombaça',
      'Tanzânia',
      'Massai',
      'Zuri / BRS Zuri',
      'Quênia / BRS Quênia',
      'Miyagi',
      'BRS Tamani',
    ],
  },
  {
    grupo: 'Cynodon',
    especies: ['Tifton 85', 'Tifton 68', 'Estrela Africana'],
  },
  {
    grupo: 'Capim-elefante / corte',
    especies: ['Capiaçu (BRS Capiaçu)', 'BRS Kurumi'],
  },
  {
    grupo: 'Andropogon',
    especies: ['Andropogon'],
  },
  {
    grupo: 'Invernais',
    especies: ['Aveia', 'Azevém', 'Aveia + Azevém', 'Triticale'],
  },
  {
    grupo: 'Leguminosas',
    especies: ['Amendoim Forrageiro', 'Estilosantes'],
  },
];

// Conjunto plano das espécies catalogadas (para validar se cai no texto livre)
export const ESPECIES_CATALOGADAS = new Set<string>(
  CATALOGO_ESPECIES_FORRAGEIRAS.flatMap((g) => g.especies)
);

// ─── Nível de tecnologia (multiplicador da produtividade-base) ───────────────
export type NivelTecnologia = 'baixo' | 'medio' | 'alto';

export const MULTIPLICADOR_TECNOLOGIA: Record<NivelTecnologia, number> = {
  baixo: 0.8,
  medio: 1.0,
  alto: 1.15,
};

export const NIVEL_TECNOLOGIA_PADRAO: NivelTecnologia = 'medio';

export const NIVEIS_TECNOLOGIA: { value: NivelTecnologia; label: string; descricao: string }[] = [
  { value: 'baixo', label: 'Baixo', descricao: 'Sem adubação regular, manejo extensivo' },
  { value: 'medio', label: 'Médio', descricao: 'Adubação de manutenção, manejo moderado' },
  { value: 'alto', label: 'Alto', descricao: 'Adubação intensiva, manejo tecnificado' },
];

// Cobertura mínima do pasto sobre a demanda total para não emitir alerta (20%)
export const COBERTURA_PASTO_MINIMA_PERC = 0.20;

// ─── Parâmetros de manejo de piquete por espécie (valores de referência) ─────
// Sugestões agronômicas para pré-preencher o cadastro de piquete a partir da
// espécie da pastagem. Fontes: Embrapa, literatura zootécnica nacional.
// IMPORTANTE: são estimativas de referência; o produtor pode ajustar conforme
// a realidade da fazenda.
export type ParametrosManejoPiquete = {
  ua_suportada: number; // UA/ha
  dias_descanso_ideal: number; // dias
  altura_entrada_cm: number; // cm
  altura_saida_cm: number; // cm
};

export const PARAMETROS_MANEJO_POR_ESPECIE = new Map<string, ParametrosManejoPiquete>([
  // Braquiárias (manejo de altura — pastejo rotacionado)
  ['Braquiária Marandu', { ua_suportada: 2.5, dias_descanso_ideal: 30, altura_entrada_cm: 30, altura_saida_cm: 15 }],
  ['Braquiária Xaraés', { ua_suportada: 2.8, dias_descanso_ideal: 28, altura_entrada_cm: 30, altura_saida_cm: 15 }],
  ['Braquiária Piatã', { ua_suportada: 2.5, dias_descanso_ideal: 30, altura_entrada_cm: 30, altura_saida_cm: 15 }],
  ['Braquiária Paiaguás', { ua_suportada: 2.6, dias_descanso_ideal: 28, altura_entrada_cm: 30, altura_saida_cm: 15 }],
  ['Braquiária Decumbens', { ua_suportada: 2.0, dias_descanso_ideal: 35, altura_entrada_cm: 25, altura_saida_cm: 10 }],
  ['Braquiária Ruziziensis', { ua_suportada: 2.0, dias_descanso_ideal: 35, altura_entrada_cm: 25, altura_saida_cm: 10 }],
  ['Braquiária BRS Ipyporã', { ua_suportada: 2.7, dias_descanso_ideal: 28, altura_entrada_cm: 30, altura_saida_cm: 15 }],
  ['Braquiária Mulato II', { ua_suportada: 3.0, dias_descanso_ideal: 28, altura_entrada_cm: 30, altura_saida_cm: 15 }],
  // Panicum (porte alto — alturas maiores)
  ['Mombaça', { ua_suportada: 3.5, dias_descanso_ideal: 30, altura_entrada_cm: 90, altura_saida_cm: 40 }],
  ['Tanzânia', { ua_suportada: 3.2, dias_descanso_ideal: 30, altura_entrada_cm: 70, altura_saida_cm: 30 }],
  ['Massai', { ua_suportada: 2.8, dias_descanso_ideal: 28, altura_entrada_cm: 45, altura_saida_cm: 20 }],
  ['Zuri / BRS Zuri', { ua_suportada: 3.6, dias_descanso_ideal: 30, altura_entrada_cm: 90, altura_saida_cm: 40 }],
  ['Quênia / BRS Quênia', { ua_suportada: 3.4, dias_descanso_ideal: 30, altura_entrada_cm: 80, altura_saida_cm: 35 }],
  ['Miyagi', { ua_suportada: 3.0, dias_descanso_ideal: 30, altura_entrada_cm: 70, altura_saida_cm: 30 }],
  ['BRS Tamani', { ua_suportada: 2.8, dias_descanso_ideal: 28, altura_entrada_cm: 50, altura_saida_cm: 25 }],
  // Cynodon (porte baixo, denso)
  ['Tifton 85', { ua_suportada: 3.5, dias_descanso_ideal: 25, altura_entrada_cm: 25, altura_saida_cm: 10 }],
  ['Tifton 68', { ua_suportada: 3.2, dias_descanso_ideal: 25, altura_entrada_cm: 25, altura_saida_cm: 10 }],
  ['Estrela Africana', { ua_suportada: 2.8, dias_descanso_ideal: 28, altura_entrada_cm: 25, altura_saida_cm: 10 }],
  // Capim-elefante / corte (porte muito alto)
  ['Capiaçu (BRS Capiaçu)', { ua_suportada: 5.0, dias_descanso_ideal: 60, altura_entrada_cm: 200, altura_saida_cm: 50 }],
  ['BRS Kurumi', { ua_suportada: 4.0, dias_descanso_ideal: 30, altura_entrada_cm: 80, altura_saida_cm: 30 }],
  // Andropogon
  ['Andropogon', { ua_suportada: 1.8, dias_descanso_ideal: 35, altura_entrada_cm: 50, altura_saida_cm: 25 }],
  // Invernais (ciclo curto, manejo mais frequente)
  ['Aveia', { ua_suportada: 2.5, dias_descanso_ideal: 25, altura_entrada_cm: 25, altura_saida_cm: 10 }],
  ['Azevém', { ua_suportada: 2.8, dias_descanso_ideal: 25, altura_entrada_cm: 25, altura_saida_cm: 8 }],
  ['Aveia + Azevém', { ua_suportada: 2.8, dias_descanso_ideal: 25, altura_entrada_cm: 25, altura_saida_cm: 8 }],
  ['Triticale', { ua_suportada: 2.4, dias_descanso_ideal: 28, altura_entrada_cm: 30, altura_saida_cm: 12 }],
  // Leguminosas
  ['Amendoim Forrageiro', { ua_suportada: 2.0, dias_descanso_ideal: 35, altura_entrada_cm: 20, altura_saida_cm: 8 }],
  ['Estilosantes', { ua_suportada: 1.8, dias_descanso_ideal: 40, altura_entrada_cm: 30, altura_saida_cm: 15 }],
]);

export function getParametrosManejoPorEspecie(
  especie?: string | null
): ParametrosManejoPiquete | null {
  if (!especie) return null;
  return PARAMETROS_MANEJO_POR_ESPECIE.get(especie) ?? null;
}
