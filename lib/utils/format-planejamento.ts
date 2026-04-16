// lib/utils/format-planejamento.ts

/**
 * Formata número em toneladas (1 casa decimal, vírgula decimal, ponto milhar)
 * Exemplo: 454.5 → "454,5"  |  2346.0 → "2.346,0"
 */
export function formatTon(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Formata número em hectares (1 casa decimal, vírgula decimal, ponto milhar)
 * Exemplo: 9.1 → "9,1"  |  56.3 → "56,3"
 */
export function formatHa(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Formata número em metros quadrados (1 casa decimal, vírgula decimal, ponto milhar)
 * Exemplo: 8.4 → "8,4"  |  25.7 → "25,7"
 */
export function formatM2(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Formata número em kg/dia (sem decimais, ponto milhar)
 * Exemplo: 2104 → "2.104"  |  6427 → "6.427"
 */
export function formatKgDia(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formata número em percentual (1 casa decimal, vírgula decimal, sem ponto milhar)
 * Exemplo: 40.4 → "40,4%"  |  0.8 → "0,8%"
 */
export function formatPercent(value: number): string {
  return (
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value) + '%'
  );
}
