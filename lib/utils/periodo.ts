import { startOfDay, endOfDay } from 'date-fns';

// Offset fixo de Brasília: UTC-3 = 3 horas = 180 minutos
// Brasília não observa DST desde 2019 (Decreto nº 9.772/2019)
const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;

function toBrasiliaDate(date: Date): Date {
  // Converte uma Date para um objeto Date que, quando lido como UTC, representa o horário de Brasília
  const utcMs = date.getTime();
  return new Date(utcMs - BRASILIA_OFFSET_MS);
}

function fromBrasiliaToUtc(date: Date): Date {
  return new Date(date.getTime() + BRASILIA_OFFSET_MS);
}

export function toUtcRangeFromLocal(from: Date, to: Date): { gte: string; lte: string } {
  // Interpretar from/to como datas locais (sem hora) e calcular o range UTC correspondente
  // cobrindo 00:00:00 até 23:59:59.999 no fuso America/Sao_Paulo (UTC-3)
  const fromBr = toBrasiliaDate(from);
  const toBr = toBrasiliaDate(to);

  const fromStart = startOfDay(fromBr);
  const toEnd = endOfDay(toBr);

  return {
    gte: fromBrasiliaToUtc(fromStart).toISOString(),
    lte: fromBrasiliaToUtc(toEnd).toISOString(),
  };
}
