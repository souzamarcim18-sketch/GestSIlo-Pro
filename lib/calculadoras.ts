/**
 * Funções puras de cálculo agronômico.
 * Extraídas da UI para permitir testes unitários independentes.
 */

// ---------------------------------------------------------------------------
// Calculadora de Calagem
// ---------------------------------------------------------------------------

export interface CalagemInput {
  al: string;
  ca: string;
  mg: string;
  v1: string;
  ctc: string;
  prnt: string;
  v2: string;
  area: string;
  metodo: 'saturacao' | 'al_ca_mg' | 'mg_manual';
}

export interface CalagemResult {
  nc: number;   // Necessidade de Calagem em t/ha
  total: number; // Total para a área em toneladas
}

export function calcularCalagem(data: CalagemInput): CalagemResult | null {
  const { al, ca, mg, v1, ctc, prnt, v2, area, metodo } = data;
  if (!prnt || !area) return null;

  const valAl   = parseFloat(al)   || 0;
  const valCa   = parseFloat(ca)   || 0;
  const valMg   = parseFloat(mg)   || 0;
  const valV1   = parseFloat(v1)   || 0;
  const valCTC  = parseFloat(ctc)  || 0;
  const valPRNT = parseFloat(prnt) || 80;
  const valV2   = parseFloat(v2)   || 60;
  const valArea = parseFloat(area) || 0;

  let nc = 0;

  if (metodo === 'saturacao') {
    nc = ((valV2 - valV1) * valCTC) / (valPRNT * 10);
  } else if (metodo === 'al_ca_mg') {
    nc = (valAl * 2 + Math.max(0, 2 - (valCa + valMg))) / (valPRNT / 100);
  } else if (metodo === 'mg_manual') {
    nc = Math.max(0, (3 * valAl) + (2 - (valCa + valMg))) / (valPRNT / 100);
  }

  nc = Math.max(0, nc);
  const total = nc * valArea;

  return { nc, total };
}

// ---------------------------------------------------------------------------
// Calculadora NPK
// ---------------------------------------------------------------------------

export interface NPKInput {
  n_nec: string;
  p_nec: string;
  k_nec: string;
  area: string;
}

export interface FertilizanteInfo {
  nome: string;
  teor_n_percent?: number | null;
  teor_p_percent?: number | null;
  teor_k_percent?: number | null;
}

export interface NPKResult {
  dosePorHa: number; // kg/ha
  total: number;     // toneladas totais
  fertNome: string;
}

export function calcularNPK(
  data: NPKInput,
  fert: FertilizanteInfo | null
): NPKResult | null {
  if (!fert || !data.area) return null;

  const valN    = parseFloat(data.n_nec) || 0;
  const valP    = parseFloat(data.p_nec) || 0;
  const valK    = parseFloat(data.k_nec) || 0;
  const valArea = parseFloat(data.area)  || 0;

  const teorN = fert.teor_n_percent || 0;
  const teorP = fert.teor_p_percent || 0;
  const teorK = fert.teor_k_percent || 0;

  // Dose baseada no nutriente limitante
  const doses = [
    teorN > 0 ? valN / (teorN / 100) : 0,
    teorP > 0 ? valP / (teorP / 100) : 0,
    teorK > 0 ? valK / (teorK / 100) : 0,
  ];

  const dosePorHa = Math.max(...doses); // kg/ha
  const total     = (dosePorHa * valArea) / 1000; // toneladas

  return { dosePorHa, total, fertNome: fert.nome };
}
