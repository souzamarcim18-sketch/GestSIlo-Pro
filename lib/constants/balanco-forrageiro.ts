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
// Fontes: Embrapa, literatura zootécnica nacional (valores conservadores)
// verao = período das chuvas (nov-abr), seca = período seco (mai-out)
export type OfertaEspecie = { verao: number; seca: number };

export const OFERTA_MS_POR_ESPECIE = new Map<string, OfertaEspecie>([
  // Braquiárias / Urochloa
  ['Braquiária', { verao: 50, seca: 12 }],
  ['Urochloa', { verao: 50, seca: 12 }],
  ['Urochloa brizantha', { verao: 55, seca: 13 }],
  ['Urochloa decumbens', { verao: 45, seca: 10 }],
  ['Urochloa ruziziensis', { verao: 48, seca: 11 }],
  // Panicum / Megathyrsus
  ['Tanzânia', { verao: 80, seca: 10 }],
  ['Mombaça', { verao: 85, seca: 10 }],
  ['Aruana', { verao: 65, seca: 9 }],
  ['Massai', { verao: 60, seca: 12 }],
  ['Panicum maximum', { verao: 75, seca: 10 }],
  // Cynodon
  ['Tifton 85', { verao: 70, seca: 15 }],
  ['Tifton 68', { verao: 65, seca: 13 }],
  ['Estrela Africana', { verao: 60, seca: 10 }],
  ['Bermuda', { verao: 55, seca: 10 }],
  // Cenchrus / Pennisetum
  ['Napier', { verao: 90, seca: 8 }],
  ['Elefante', { verao: 90, seca: 8 }],
  ['Cameroon', { verao: 85, seca: 8 }],
  // Invernais (produção invertida: alta na seca/inverno)
  ['Aveia', { verao: 5, seca: 45 }],
  ['Azevém', { verao: 5, seca: 50 }],
  ['Aveia + Azevém', { verao: 5, seca: 48 }],
  ['Triticale', { verao: 5, seca: 40 }],
  // Leguminosas
  ['Amendoim Forrageiro', { verao: 35, seca: 8 }],
  ['Estilosantes', { verao: 40, seca: 10 }],
  // Outras
  ['Capim Colonião', { verao: 55, seca: 9 }],
  ['Capim Jaraguá', { verao: 45, seca: 8 }],
  ['Sorgo Forrageiro', { verao: 70, seca: 5 }],
]);

// Usado quando a espécie não está mapeada — valor conservador
export const OFERTA_MS_PADRAO: OfertaEspecie = { verao: 40, seca: 8 };

// Cobertura mínima do pasto sobre a demanda total para não emitir alerta (20%)
export const COBERTURA_PASTO_MINIMA_PERC = 0.20;
