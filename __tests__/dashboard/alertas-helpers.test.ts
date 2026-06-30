import { describe, it, expect } from 'vitest';
import { daysBetween, derivarAlertasEtapa1, derivarAlertasPastagens } from '@/app/dashboard/alertas-helpers';
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
    const op = { ...opBase, status: 'Planejado' } satisfies ProximaOperacaoComBadge;
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

// ---------------------------------------------------------------------------
// derivarAlertasPastagens — alertas novos (ocupação vencida + necessita reforma)
// ---------------------------------------------------------------------------

function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

type PiqueteRow = Parameters<typeof derivarAlertasPastagens>[0][number];

const piqueteBase: PiqueteRow = {
  id: 'pq-1',
  nome: 'Piquete 1',
  status: 'Em pastejo',
  necessita_reforma: false,
  ua_suportada: null,
  dias_descanso_ideal: null,
  updated_at: null,
  pastagens: { id: 'past-1', nome: 'Pastagem A' },
  ocupacoes_piquete: [],
};

describe('derivarAlertasPastagens — ocupação vencida', () => {
  it('gera alerta urgente quando lote em pastejo passou da data de saída prevista', () => {
    const piquete: PiqueteRow = {
      ...piqueteBase,
      ocupacoes_piquete: [
        { ua_real: null, data_entrada: diasAtras(20), data_saida_prevista: diasAtras(4), data_saida_real: null },
      ],
    };
    const alertas = derivarAlertasPastagens([piquete]);
    const vencida = alertas.find((a) => a.tipo === 'piquete_ocupacao_vencida');
    expect(vencida).toBeDefined();
    expect(vencida!.severidade).toBe('urgente');
    expect(vencida!.id).toBe('piquete_ocupacao_vencida_pq-1');
    expect(vencida!.href).toBe('/dashboard/pastagens/past-1');
  });

  it('não gera alerta quando a saída prevista ainda não chegou', () => {
    const piquete: PiqueteRow = {
      ...piqueteBase,
      ocupacoes_piquete: [
        { ua_real: null, data_entrada: diasAtras(2), data_saida_prevista: diasAtras(-5), data_saida_real: null },
      ],
    };
    const alertas = derivarAlertasPastagens([piquete]);
    expect(alertas.find((a) => a.tipo === 'piquete_ocupacao_vencida')).toBeUndefined();
  });

  it('não gera alerta de vencida quando a ocupação já foi fechada', () => {
    const piquete: PiqueteRow = {
      ...piqueteBase,
      ocupacoes_piquete: [
        { ua_real: null, data_entrada: diasAtras(20), data_saida_prevista: diasAtras(4), data_saida_real: diasAtras(2) },
      ],
    };
    const alertas = derivarAlertasPastagens([piquete]);
    expect(alertas.find((a) => a.tipo === 'piquete_ocupacao_vencida')).toBeUndefined();
  });
});

describe('derivarAlertasPastagens — necessita reforma', () => {
  it('gera alerta aviso quando piquete está sinalizado para reforma', () => {
    const piquete: PiqueteRow = { ...piqueteBase, status: 'Descanso', necessita_reforma: true };
    const alertas = derivarAlertasPastagens([piquete]);
    const reforma = alertas.find((a) => a.tipo === 'piquete_necessita_reforma');
    expect(reforma).toBeDefined();
    expect(reforma!.severidade).toBe('aviso');
    expect(reforma!.id).toBe('piquete_necessita_reforma_pq-1');
  });

  it('não gera alerta quando o piquete não está sinalizado', () => {
    const alertas = derivarAlertasPastagens([{ ...piqueteBase, status: 'Descanso', necessita_reforma: false }]);
    expect(alertas.find((a) => a.tipo === 'piquete_necessita_reforma')).toBeUndefined();
  });
});
