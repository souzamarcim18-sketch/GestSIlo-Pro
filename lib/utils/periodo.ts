// Offset fixo de Brasília: UTC-3 = 3 horas
// Brasília não observa DST desde 2019 (Decreto nº 9.772/2019)
const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Dado um Date (qualquer representação), retorna o timestamp correspondente
 * ao início do dia (00:00:00.000) em Brasília, expresso em UTC.
 *
 * Estratégia: extrair a data calendário "como se fosse Brasília" via offset
 * fixo UTC-3, construir meia-noite nesse calendário e converter de volta para UTC.
 */
function startOfDayBrasilia(date: Date): Date {
  // Timestamp em "hora Brasília" (UTC - 3h)
  const tsBrasilia = date.getTime() - BRASILIA_OFFSET_MS;
  // Extrai componentes de data via métodos UTC (que agora representam hora Brasília)
  const tmp = new Date(tsBrasilia);
  const year = tmp.getUTCFullYear();
  const month = tmp.getUTCMonth();
  const day = tmp.getUTCDate();
  // Meia-noite de Brasília, em UTC
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) + BRASILIA_OFFSET_MS);
}

function endOfDayBrasilia(date: Date): Date {
  const tsBrasilia = date.getTime() - BRASILIA_OFFSET_MS;
  const tmp = new Date(tsBrasilia);
  const year = tmp.getUTCFullYear();
  const month = tmp.getUTCMonth();
  const day = tmp.getUTCDate();
  // 23:59:59.999 de Brasília, em UTC
  return new Date(Date.UTC(year, month, day, 23, 59, 59, 999) + BRASILIA_OFFSET_MS);
}

/**
 * Converte um range local (Date objects) para strings ISO UTC cobrindo
 * 00:00:00 até 23:59:59.999 no fuso America/Sao_Paulo (UTC-3 fixo).
 */
export function toUtcRangeFromLocal(from: Date, to: Date): { gte: string; lte: string } {
  return {
    gte: startOfDayBrasilia(from).toISOString(),
    lte: endOfDayBrasilia(to).toISOString(),
  };
}
