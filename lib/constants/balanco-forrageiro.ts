export const CONSUMO_MS_POR_CATEGORIA = new Map<string, number>([
  ['Vaca em Lactação', 14.0],
  ['Vaca Prenha', 10.0],
  ['Vaca Seca', 8.0],
  ['Vaca Vazia', 8.0],
  ['Novilha (Prenha)', 8.5],
  ['Novilha', 7.0],
  ['Novilho', 7.0],
  ['Bezerro', 2.5],
  ['Bezerra', 2.5],
  ['Touro', 10.0],
  ['Boi', 9.0],
  ['Vaca Matriz', 8.5],
  ['Boi Descartado', 8.0],
  ['Fêmea Descartada', 7.5],
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
  ['Capim Mombaça', { verao: 60, seca: 10 }],
  ['Capim Tanzânia', { verao: 55, seca: 10 }],
  ['Capim Massai', { verao: 42, seca: 9 }],
  ['Capim Zuri / BRS Zuri', { verao: 62, seca: 11 }],
  ['Capim Quênia / BRS Quênia', { verao: 58, seca: 10 }],
  ['Capim Miyagi', { verao: 52, seca: 9 }],
  ['Capim BRS Tamani', { verao: 46, seca: 9 }],
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
      'Capim Mombaça',
      'Capim Tanzânia',
      'Capim Massai',
      'Capim Zuri / BRS Zuri',
      'Capim Quênia / BRS Quênia',
      'Capim Miyagi',
      'Capim BRS Tamani',
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
