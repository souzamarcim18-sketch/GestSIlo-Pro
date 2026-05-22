import { describe, it, expect } from 'vitest';
import { daysBetween, derivarAlertasEtapa1 } from '@/app/dashboard/alertas-helpers';
import type { ProximaOperacaoComBadge } from '@/app/dashboard/dashboard-data';

// ---------------------------------------------------------------------------
// daysBetween
// ---------------------------------------------------------------------------
describe('daysBetween', () => {
  it('retorna valor positivo quando ate > de', () => {
    expect(daysBetween('2026-05-01', '2026-05-08')).toBe(7);
  });

  it('retorna zero quando as datas são iguais', () => {
    expect(daysBetween('2026-05-21', '2026-05-21')).toBe(0);
  });

  it('retorna valor negativo quando ate < de (vencido)', () => {
    expect(daysBetween('2026-05-21', '2026-05-15')).toBe(-6);
  });

  it('calcula corretamente datas distantes', () => {
    expect(daysBetween('2026-01-01', '2026-12-31')).toBe(364);
  });
});

// ---------------------------------------------------------------------------
// derivarAlertasEtapa1
// ---------------------------------------------------------------------------

const opBase: ProximaOperacaoComBadge = {
  id: 'op-1',
  data_esperada: '2026-05-10',
  data_realizada: null,
  tipo_operacao: 'Adubação',
  status: 'Atrasado',
  cultura: 'Milho',
  talhao_nome: 'Talhão Norte',
};

describe('derivarAlertasEtapa1', () => {
  it('gera alerta critico para operação atrasada', () => {
    const alertas = derivarAlertasEtapa1({
      proximasOperacoes: [opBase],
      autonomiaDiasNum: null,
      taxaPerdasNum: null,
    });

    expect(alertas).toHaveLength(1);
    expect(alertas[0].tipo).toBe('operacao_atrasada');
    expect(alertas[0].severidade).toBe('critico');
    expect(alertas[0].mensagem).toBe('Adubação — Talhão Norte');
    expect(alertas[0].id).toBe('operacao_atrasada_0');
    expect(alertas[0].href).toBe('/dashboard/talhoes');
  });

  it('não gera alerta para operação planejada', () => {
    const op = { ...opBase, status: 'Planejado' };
    const alertas = derivarAlertasEtapa1({
      proximasOperacoes: [op],
      autonomiaDiasNum: null,
      taxaPerdasNum: null,
    });
    expect(alertas).toHaveLength(0);
  });

  it('gera alerta critico quando autonomia < 10 dias', () => {
    const alertas = derivarAlertasEtapa1({
      proximasOperacoes: [],
      autonomiaDiasNum: 5,
      taxaPerdasNum: null,
    });

    expect(alertas).toHaveLength(1);
    expect(alertas[0].tipo).toBe('silagem_baixa_autonomia');
    expect(alertas[0].severidade).toBe('critico');
    expect(alertas[0].detalhe).toBe('Autonomia estimada: 5 dias');
  });

  it('gera alerta urgente quando autonomia entre 10 e 29 dias', () => {
    const alertas = derivarAlertasEtapa1({
      proximasOperacoes: [],
      autonomiaDiasNum: 20,
      taxaPerdasNum: null,
    });

    expect(alertas).toHaveLength(1);
    expect(alertas[0].severidade).toBe('urgente');
  });

  it('não gera alerta de autonomia quando >= 30 dias', () => {
    const alertas = derivarAlertasEtapa1({
      proximasOperacoes: [],
      autonomiaDiasNum: 30,
      taxaPerdasNum: null,
    });
    expect(alertas).toHaveLength(0);
  });

  it('não gera alerta de autonomia quando null', () => {
    const alertas = derivarAlertasEtapa1({
      proximasOperacoes: [],
      autonomiaDiasNum: null,
      taxaPerdasNum: null,
    });
    expect(alertas).toHaveLength(0);
  });

  it('gera alerta critico quando taxa de perdas > 20%', () => {
    const alertas = derivarAlertasEtapa1({
      proximasOperacoes: [],
      autonomiaDiasNum: null,
      taxaPerdasNum: 25,
    });

    expect(alertas).toHaveLength(1);
    expect(alertas[0].tipo).toBe('silagem_perdas_elevadas');
    expect(alertas[0].severidade).toBe('critico');
    expect(alertas[0].detalhe).toBe('25.0% dos últimos 30 dias');
  });

  it('gera alerta urgente quando taxa de perdas entre 10% e 20%', () => {
    const alertas = derivarAlertasEtapa1({
      proximasOperacoes: [],
      autonomiaDiasNum: null,
      taxaPerdasNum: 15,
    });

    expect(alertas).toHaveLength(1);
    expect(alertas[0].severidade).toBe('urgente');
  });

  it('não gera alerta de perdas quando taxa <= 10%', () => {
    const alertas = derivarAlertasEtapa1({
      proximasOperacoes: [],
      autonomiaDiasNum: null,
      taxaPerdasNum: 10,
    });
    expect(alertas).toHaveLength(0);
  });

  it('não gera alerta de perdas quando null', () => {
    const alertas = derivarAlertasEtapa1({
      proximasOperacoes: [],
      autonomiaDiasNum: null,
      taxaPerdasNum: null,
    });
    expect(alertas).toHaveLength(0);
  });

  it('acumula múltiplos alertas simultaneamente', () => {
    const op2 = { ...opBase, id: 'op-2', tipo_operacao: 'Plantio', talhao_nome: 'Talhão Sul' };
    const alertas = derivarAlertasEtapa1({
      proximasOperacoes: [opBase, op2],
      autonomiaDiasNum: 7,
      taxaPerdasNum: 22,
    });

    expect(alertas).toHaveLength(4);
    expect(alertas.map((a) => a.tipo)).toEqual([
      'operacao_atrasada',
      'operacao_atrasada',
      'silagem_baixa_autonomia',
      'silagem_perdas_elevadas',
    ]);
    expect(alertas[1].id).toBe('operacao_atrasada_1');
  });
});
