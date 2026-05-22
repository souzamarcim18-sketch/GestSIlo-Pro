import { describe, it, expect } from 'vitest';
import {
  calcularEstoqueTotal,
  calcularConsumoHistorico,
  calcularDemandaProjetada,
  calcularComparativo,
} from '@/lib/utils/balanco-forrageiro';
import type { MovimentacaoSiloRow, AnimalPorCategoriaRow } from '@/lib/utils/balanco-forrageiro';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dataRelativa(diasAtras: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().split('T')[0];
}

function makeSaida(overrides: Partial<MovimentacaoSiloRow> = {}): MovimentacaoSiloRow {
  return {
    silo_id: 's1',
    silo_nome: 'Silo 1',
    tipo: 'Saída',
    subtipo: 'Fornecimento',
    quantidade: 1, // 1 tonelada = 1000 kg
    data: dataRelativa(5),
    ...overrides,
  };
}

// ─── calcularEstoqueTotal ─────────────────────────────────────────────────────

describe('calcularEstoqueTotal', () => {
  it('retorna 0 para array vazio', () => {
    expect(calcularEstoqueTotal([])).toBe(0);
  });

  it('soma entradas e subtrai saídas, convertendo ton → kg', () => {
    const movs = [
      { tipo: 'Entrada' as const, quantidade: 10 },  // +10t = +10000kg
      { tipo: 'Saída' as const, quantidade: 3 },     // -3t  = -3000kg
      { tipo: 'Entrada' as const, quantidade: 5 },   // +5t  = +5000kg
    ];
    expect(calcularEstoqueTotal(movs)).toBe(12000);
  });

  it('pode retornar negativo (estoque inconsistente no banco)', () => {
    const movs = [
      { tipo: 'Saída' as const, quantidade: 5 },
    ];
    expect(calcularEstoqueTotal(movs)).toBe(-5000);
  });
});

// ─── calcularConsumoHistorico ─────────────────────────────────────────────────

describe('calcularConsumoHistorico', () => {
  it('retorna sem_dados:true quando não há saídas no período', () => {
    const resultado = calcularConsumoHistorico([], 30, 10000);
    expect(resultado.sem_dados).toBe(true);
    expect(resultado.consumo_medio_diario_kg).toBeNull();
    expect(resultado.autonomia_real_dias).toBeNull();
  });

  it('aplica corte temporal corretamente: exclui saída antiga (40 dias) do período de 30d', () => {
    const saidas: MovimentacaoSiloRow[] = [
      makeSaida({ data: dataRelativa(5), quantidade: 2 }),  // dentro dos 30d
      makeSaida({ data: dataRelativa(40), quantidade: 5 }), // fora dos 30d (mas dentro de 90d)
    ];
    const resultado = calcularConsumoHistorico(saidas, 30, 20000);
    // só a saída de 2 toneladas (2000 kg) deve entrar
    expect(resultado.consumo_total_kg).toBe(2000);
  });

  it('exclui saídas com subtipo Descarte', () => {
    const saidas: MovimentacaoSiloRow[] = [
      makeSaida({ quantidade: 3, subtipo: 'Descarte' }),
      makeSaida({ quantidade: 2, subtipo: 'Fornecimento' }),
    ];
    const resultado = calcularConsumoHistorico(saidas, 30, 10000);
    expect(resultado.consumo_total_kg).toBe(2000); // apenas 2t da saída válida
  });

  it('calcula consumo médio diário corretamente', () => {
    const saidas: MovimentacaoSiloRow[] = [
      makeSaida({ quantidade: 3 }), // 3000 kg
    ];
    const resultado = calcularConsumoHistorico(saidas, 30, 90000);
    expect(resultado.consumo_medio_diario_kg).toBeCloseTo(100, 1); // 3000/30
    expect(resultado.autonomia_real_dias).toBe(900); // floor(90000/100)
  });

  it('agrupa consumo por silo corretamente', () => {
    const saidas: MovimentacaoSiloRow[] = [
      makeSaida({ silo_id: 's1', silo_nome: 'Silo A', quantidade: 6 }),
      makeSaida({ silo_id: 's2', silo_nome: 'Silo B', quantidade: 4 }),
      makeSaida({ silo_id: 's1', silo_nome: 'Silo A', quantidade: 2 }),
    ];
    const resultado = calcularConsumoHistorico(saidas, 30, 50000);
    const siloA = resultado.por_silo.find((s) => s.silo_id === 's1');
    const siloB = resultado.por_silo.find((s) => s.silo_id === 's2');
    expect(siloA?.consumo_total_kg).toBe(8000); // (6+2) * 1000
    expect(siloB?.consumo_total_kg).toBe(4000); // 4 * 1000
    expect(siloA?.percentual).toBeCloseTo(66.67, 1);
    expect(siloB?.percentual).toBeCloseTo(33.33, 1);
  });
});

// ─── calcularDemandaProjetada ─────────────────────────────────────────────────

describe('calcularDemandaProjetada', () => {
  it('retorna autonomia_projetada_dias:null quando array vazio', () => {
    const resultado = calcularDemandaProjetada([], 10000);
    expect(resultado.autonomia_projetada_dias).toBeNull();
    expect(resultado.demanda_total_kg_ms_dia).toBe(0);
    expect(resultado.por_categoria).toHaveLength(0);
  });

  it('usa valor do Map para categoria mapeada', () => {
    const animais: AnimalPorCategoriaRow[] = [
      { categoria: 'Vaca em Lactação', quantidade: 10 },
    ];
    const resultado = calcularDemandaProjetada(animais, 100000);
    const linha = resultado.por_categoria[0];
    expect(linha.consumo_unitario_kg_ms_dia).toBe(14.0);
    expect(linha.estimado).toBe(false);
    expect(linha.consumo_total_kg_ms_dia).toBe(140); // 14 * 10
  });

  it('usa CONSUMO_MS_PADRAO (7.0) para categoria desconhecida e marca estimado:true', () => {
    const animais: AnimalPorCategoriaRow[] = [
      { categoria: 'CategoriaInexistente', quantidade: 5 },
    ];
    const resultado = calcularDemandaProjetada(animais, 10000);
    const linha = resultado.por_categoria[0];
    expect(linha.consumo_unitario_kg_ms_dia).toBe(7.0);
    expect(linha.estimado).toBe(true);
    expect(resultado.tem_categorias_estimadas).toBe(true);
  });

  it('calcula autonomia projetada corretamente', () => {
    const animais: AnimalPorCategoriaRow[] = [
      { categoria: 'Vaca Seca', quantidade: 10 }, // 8 kg/dia * 10 = 80 kg/dia
    ];
    const resultado = calcularDemandaProjetada(animais, 8000);
    expect(resultado.demanda_total_kg_ms_dia).toBe(80);
    expect(resultado.autonomia_projetada_dias).toBe(100); // floor(8000/80)
  });
});

// ─── calcularComparativo ──────────────────────────────────────────────────────

describe('calcularComparativo', () => {
  const consumoBase = (consumo_medio: number | null, autonomia: number | null) => ({
    periodo_dias: 30,
    consumo_total_kg: consumo_medio !== null ? consumo_medio * 30 : 0,
    consumo_medio_diario_kg: consumo_medio,
    autonomia_real_dias: autonomia,
    por_silo: [],
    sem_dados: consumo_medio === null,
  });

  const demandaBase = (demanda: number, autonomia: number | null) => ({
    por_categoria: [],
    demanda_total_kg_ms_dia: demanda,
    autonomia_projetada_dias: autonomia,
    tem_categorias_estimadas: false,
  });

  it('retorna equilibrado quando consumo é null', () => {
    const resultado = calcularComparativo(consumoBase(null, null), demandaBase(100, 50));
    expect(resultado.status).toBe('equilibrado');
    expect(resultado.diferenca_autonomia_dias).toBeNull();
  });

  it('retorna equilibrado quando demanda é 0', () => {
    const resultado = calcularComparativo(consumoBase(100, 50), demandaBase(0, null));
    expect(resultado.status).toBe('equilibrado');
  });

  it('retorna deficit quando consumo real > demanda + 5%', () => {
    // consumo=110, demanda=100 → saldo=10, desvio=10/110≈9.1% > 5%
    const resultado = calcularComparativo(consumoBase(110, 90), demandaBase(100, 100));
    expect(resultado.status).toBe('deficit');
    expect(resultado.saldo_diario_kg).toBeCloseTo(10);
  });

  it('retorna superavit quando demanda > consumo + 5%', () => {
    // consumo=90, demanda=100 → saldo=-10, desvio=10/100=10% > 5%
    const resultado = calcularComparativo(consumoBase(90, 110), demandaBase(100, 100));
    expect(resultado.status).toBe('superavit');
    expect(resultado.saldo_diario_kg).toBeCloseTo(-10);
  });

  it('retorna equilibrado quando desvio ≤ 5%', () => {
    // consumo=102, demanda=100 → saldo=2, desvio=2/102≈1.96% ≤ 5%
    const resultado = calcularComparativo(consumoBase(102, 98), demandaBase(100, 100));
    expect(resultado.status).toBe('equilibrado');
  });

  it('retorna null para diferenca_autonomia_dias quando autonomia real é null', () => {
    const resultado = calcularComparativo(consumoBase(110, null), demandaBase(100, 100));
    expect(resultado.diferenca_autonomia_dias).toBeNull();
  });

  it('calcula diferenca_autonomia_dias corretamente quando ambos disponíveis', () => {
    const resultado = calcularComparativo(consumoBase(110, 90), demandaBase(100, 100));
    expect(resultado.diferenca_autonomia_dias).toBe(-10); // 90 - 100
  });
});
