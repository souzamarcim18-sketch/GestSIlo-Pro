import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { verificarAlertaColheita } from '@/app/dashboard/talhoes/helpers';
import type { CicloAgricola } from '@/lib/types/talhoes';

// "Hoje" fixo para tornar os cálculos de dias determinísticos
const HOJE = '2026-06-20T10:00:00';

function ciclo(
  data_colheita_prevista: string,
  data_colheita_real: string | null = null,
): CicloAgricola {
  return {
    data_colheita_prevista,
    data_colheita_real,
  } as CicloAgricola;
}

describe('verificarAlertaColheita', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(HOJE));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna null quando a colheita já foi registrada', () => {
    expect(verificarAlertaColheita(ciclo('2026-06-25', '2026-06-19'))).toBeNull();
  });

  it('retorna null quando não há data de colheita prevista', () => {
    expect(verificarAlertaColheita(ciclo(''))).toBeNull();
  });

  it('retorna null quando a colheita está a mais de 7 dias no futuro', () => {
    expect(verificarAlertaColheita(ciclo('2026-07-15'))).toBeNull();
  });

  it('emite aviso quando a colheita se aproxima (≤ 7 dias)', () => {
    const r = verificarAlertaColheita(ciclo('2026-06-25'));
    expect(r).toEqual({ severidade: 'aviso', diasRestantes: 5, atrasado: false });
  });

  it('emite aviso quando a colheita é hoje', () => {
    const r = verificarAlertaColheita(ciclo('2026-06-20'));
    expect(r).toEqual({ severidade: 'aviso', diasRestantes: 0, atrasado: false });
  });

  it('emite urgente quando atrasada há até 7 dias', () => {
    const r = verificarAlertaColheita(ciclo('2026-06-15'));
    expect(r).toEqual({ severidade: 'urgente', diasRestantes: -5, atrasado: true });
  });

  it('emite crítico quando atrasada há mais de 7 dias (cenário do print)', () => {
    const r = verificarAlertaColheita(ciclo('2026-03-31'));
    expect(r?.severidade).toBe('critico');
    expect(r?.atrasado).toBe(true);
    expect(r?.diasRestantes).toBeLessThan(-7);
  });

  it('funciona para qualquer cultura (não apenas silagem)', () => {
    // verificarAlertaColheita não filtra por cultura — diferente de verificarAlertaSilagem
    const r = verificarAlertaColheita(ciclo('2026-06-10'));
    expect(r?.atrasado).toBe(true);
  });
});
