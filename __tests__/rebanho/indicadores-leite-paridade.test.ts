import { describe, it, expect } from 'vitest';
import { calcularKpisLeiteiros } from '@/lib/calculos/indicadores-rebanho';
import { StatusAnimal, type Animal } from '@/lib/types/rebanho';

// Paridade dos KPIs leiteiros (Fase 4, P4.1 — SPEC-rebanho345 §7.9).
//
// `calcularKpisLeiteiros` substitui a aritmética que vivia inline em
// `app/dashboard/rebanho/leiteira/page.tsx`. Este teste reimplementa a fórmula
// ANTIGA (cópia literal do inline removido) e confirma que o serviço produz os
// MESMOS números (R-4.1). Se um número mudar, este teste falha.

type AnimalKpi = Pick<Animal, 'status_reprodutivo' | 'status'>;

/** Reprodução EXATA do cálculo inline antigo (não importar — é o oráculo). */
function calcularInlineAntigo(input: {
  animais: AnimalKpi[];
  producoes: Array<{ data: string; volume_litros: number }>;
  totalLitrosPeriodo: number;
  delMedioDias: number | null;
  dataInicio: string;
  dataFim: string;
}) {
  const { animais, producoes, totalLitrosPeriodo, delMedioDias, dataInicio, dataFim } = input;

  const animalEmLactacao = animais.filter((a) => a.status_reprodutivo === 'lactacao');

  const producaoHoje = producoes
    .filter((p) => p.data === dataFim)
    .reduce((acc, p) => acc + p.volume_litros, 0);

  const totalProducao = totalLitrosPeriodo;
  const diasPeriodo = Math.max(
    1,
    Math.floor((new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
  const producaoMediaDiaria = totalProducao / diasPeriodo;
  const producaoMediaPorVaca =
    animalEmLactacao.length > 0 ? totalProducao / diasPeriodo / animalEmLactacao.length : 0;

  const animalEmSeco = animais.filter((a) => a.status_reprodutivo === 'seca');
  const animaisVazias = animais.filter((a) => a.status_reprodutivo === 'vazia' && a.status === 'Ativo');
  const totalFemeasAdultas = animalEmLactacao.length + animalEmSeco.length + animaisVazias.length;
  const taxaEficiencia =
    totalFemeasAdultas > 0 ? Math.round((animalEmLactacao.length / totalFemeasAdultas) * 100) : null;

  return {
    producaoHojeLitros: producaoHoje,
    producaoMediaDiariaLitros: producaoMediaDiaria,
    producaoMediaPorVacaLitros: producaoMediaPorVaca,
    delMedioDias,
    vacasEmLactacao: animalEmLactacao.length,
    vacasEmSeco: animalEmSeco.length,
    taxaEficienciaPct: taxaEficiencia,
  };
}

function animal(over: Partial<AnimalKpi>): AnimalKpi {
  return {
    status_reprodutivo: over.status_reprodutivo ?? null,
    status: over.status ?? StatusAnimal.ATIVO,
  };
}

const CENARIOS = [
  {
    nome: 'rebanho típico com produção',
    animais: [
      animal({ status_reprodutivo: 'lactacao' }),
      animal({ status_reprodutivo: 'lactacao' }),
      animal({ status_reprodutivo: 'lactacao' }),
      animal({ status_reprodutivo: 'seca' }),
      animal({ status_reprodutivo: 'vazia', status: StatusAnimal.ATIVO }),
      animal({ status_reprodutivo: 'vazia', status: StatusAnimal.VENDIDO }), // não conta (não Ativo)
    ],
    producoes: [
      { data: '2026-06-30', volume_litros: 25.5 },
      { data: '2026-06-30', volume_litros: 30.0 },
      { data: '2026-06-29', volume_litros: 28.0 },
    ],
    totalLitrosPeriodo: 1500,
    delMedioDias: 120,
    dataInicio: '2026-06-01',
    dataFim: '2026-06-30',
  },
  {
    nome: 'sem vacas em lactação (divisão evitada)',
    animais: [animal({ status_reprodutivo: 'seca' }), animal({ status_reprodutivo: 'vazia' })],
    producoes: [],
    totalLitrosPeriodo: 0,
    delMedioDias: null,
    dataInicio: '2026-06-01',
    dataFim: '2026-06-30',
  },
  {
    nome: 'sem fêmeas adultas (eficiência null)',
    animais: [animal({ status_reprodutivo: null })],
    producoes: [{ data: '2026-06-30', volume_litros: 10 }],
    totalLitrosPeriodo: 10,
    delMedioDias: 5,
    dataInicio: '2026-06-30',
    dataFim: '2026-06-30',
  },
  {
    nome: 'período de 1 dia (diasPeriodo mínimo)',
    animais: [animal({ status_reprodutivo: 'lactacao' })],
    producoes: [{ data: '2026-06-30', volume_litros: 22 }],
    totalLitrosPeriodo: 22,
    delMedioDias: 60,
    dataInicio: '2026-06-30',
    dataFim: '2026-06-30',
  },
];

describe('calcularKpisLeiteiros — paridade com o inline antigo', () => {
  for (const c of CENARIOS) {
    it(c.nome, () => {
      const esperado = calcularInlineAntigo(c);
      const obtido = calcularKpisLeiteiros(c);
      expect(obtido).toEqual(esperado);
    });
  }

  it('produção hoje soma apenas as produções de dataFim', () => {
    const r = calcularKpisLeiteiros(CENARIOS[0]);
    expect(r.producaoHojeLitros).toBeCloseTo(55.5, 5);
  });

  it('taxa de eficiência é inteiro arredondado', () => {
    const r = calcularKpisLeiteiros(CENARIOS[0]);
    // 3 lactação / (3 lactação + 1 seca + 1 vazia ativa) = 3/5 = 60%
    expect(r.taxaEficienciaPct).toBe(60);
  });
});
