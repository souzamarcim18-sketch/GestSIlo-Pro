/**
 * Tabela SMP (Soilmoisture Plant Index)
 * Correlaciona pH SMP com necessidade de calagem por textura de solo
 * Fonte: EMBRAPA (2013)
 */

export const tabelaSMP: Record<
  'arenosa' | 'media' | 'argilosa',
  Array<{ ph_smp: number; nc: number }>
> = {
  // Solos arenosos: menor CTC, menos calagem
  arenosa: [
    { ph_smp: 5.0, nc: 2.0 },
    { ph_smp: 5.2, nc: 1.8 },
    { ph_smp: 5.4, nc: 1.6 },
    { ph_smp: 5.6, nc: 1.4 },
    { ph_smp: 5.8, nc: 1.2 },
    { ph_smp: 6.0, nc: 0.8 },
    { ph_smp: 6.2, nc: 0.4 },
    { ph_smp: 6.4, nc: 0.0 },
  ],
  // Solos de textura média: valor intermediário
  media: [
    { ph_smp: 4.8, nc: 3.0 },
    { ph_smp: 5.0, nc: 2.8 },
    { ph_smp: 5.2, nc: 2.5 },
    { ph_smp: 5.4, nc: 2.2 },
    { ph_smp: 5.6, nc: 1.8 },
    { ph_smp: 5.8, nc: 1.4 },
    { ph_smp: 6.0, nc: 1.0 },
    { ph_smp: 6.2, nc: 0.5 },
    { ph_smp: 6.4, nc: 0.0 },
  ],
  // Solos argilosos: maior CTC, mais calagem
  argilosa: [
    { ph_smp: 4.6, nc: 4.5 },
    { ph_smp: 4.8, nc: 4.2 },
    { ph_smp: 5.0, nc: 3.8 },
    { ph_smp: 5.2, nc: 3.5 },
    { ph_smp: 5.4, nc: 3.0 },
    { ph_smp: 5.6, nc: 2.5 },
    { ph_smp: 5.8, nc: 1.8 },
    { ph_smp: 6.0, nc: 1.0 },
    { ph_smp: 6.2, nc: 0.5 },
    { ph_smp: 6.4, nc: 0.0 },
  ],
};

// ========== TABELA UFLA ==========
/**
 * Ca desejado (cmolc/dm³) por cultura
 * Fonte: UFLA - Universidade Federal de Lavras
 */
export const tabelaCaDesejadoUFLA: Record<string, number> = {
  milho: 5.0,
  soja: 4.0,
  trigo: 3.5,
  aveia: 3.5,
  arroz: 3.0,
  feijao: 4.5,
  batata: 5.5,
  tomate: 6.0,
  'cana-de-acucar': 4.0,
  algodao: 5.0,
  cafe: 6.0,
  pastagem: 4.0,
};

// ========== TABELA MG 5ª APROXIMAÇÃO (v2 — IMPLEMENTAÇÃO FUTURA) ==========
/**
 * Fatores X e Y para método Minas Gerais 5ª Aproximação
 * X = Ca + Mg + K desejado (cmolc/dm³)
 * Y = fator multiplicador para Al (varia com argila e cultura)
 *
 * ⚠️ NOTA: Esta tabela é mantida para implementação futura na v2.
 * Não é usada na v1.0 do sistema.
 */
export const tabelaMG5AproxFatores: Record<
  string, // faixa de argila
  Record<string, { X: number; Y: number }>
> = {
  '0-15': {
    // até 15% argila (solo arenoso)
    milho: { X: 1.0, Y: 2.0 },
    soja: { X: 1.0, Y: 2.0 },
    trigo: { X: 1.0, Y: 1.8 },
    feijao: { X: 1.5, Y: 2.0 },
  },
  '15-35': {
    // 15-35% argila (solo médio)
    milho: { X: 2.0, Y: 2.5 },
    soja: { X: 1.8, Y: 2.3 },
    trigo: { X: 1.5, Y: 2.0 },
    feijao: { X: 2.5, Y: 2.5 },
  },
  '35-60': {
    // 35-60% argila (solo argiloso)
    milho: { X: 3.5, Y: 3.0 },
    soja: { X: 3.0, Y: 2.8 },
    trigo: { X: 2.5, Y: 2.5 },
    feijao: { X: 4.0, Y: 3.0 },
  },
  '>60': {
    // >60% argila (solo muito argiloso)
    milho: { X: 5.0, Y: 3.5 },
    soja: { X: 4.5, Y: 3.3 },
    trigo: { X: 3.5, Y: 3.0 },
    feijao: { X: 5.5, Y: 3.5 },
  },
};
