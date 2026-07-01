import { describe, it, expect } from 'vitest';
import {
  calcularTaxaDesmama,
  calcularTaxaPrenhezPorMetodo,
  calcularIdadeAoAbate,
  calcularProducaoLeitePorArea,
  calcularArrobasPorArea,
} from '@/lib/calculos/indicadores-rebanho';

// Testes das funções puras novas de indicadores por espécie (leite × corte),
// adicionadas na separação de Reprodução/Indicadores por painel.

describe('calcularTaxaDesmama', () => {
  it('calcula desmames / nascimentos * 100', () => {
    const eventos = [
      { tipo: 'nascimento' },
      { tipo: 'nascimento' },
      { tipo: 'nascimento' },
      { tipo: 'nascimento' },
      { tipo: 'desmame' },
      { tipo: 'desmame' },
      { tipo: 'desmame' },
      { tipo: 'pesagem' }, // ignorado
    ];
    const r = calcularTaxaDesmama(eventos);
    expect(r.numerador).toBe(3);
    expect(r.denominador).toBe(4);
    expect(r.taxa_percentual).toBe(75);
  });

  it('retorna 0% quando não há nascimentos (denominador zero)', () => {
    const r = calcularTaxaDesmama([{ tipo: 'desmame' }]);
    expect(r.denominador).toBe(0);
    expect(r.taxa_percentual).toBe(0);
  });
});

describe('calcularTaxaPrenhezPorMetodo', () => {
  it('segmenta coberturas e concepção por método', () => {
    const eventos = [
      { tipo: 'cobertura', tipo_cobertura: 'iatf' },
      { tipo: 'cobertura', tipo_cobertura: 'iatf' },
      { tipo: 'cobertura', tipo_cobertura: 'monta_natural' },
      { tipo: 'diagnostico_prenhez', tipo_cobertura: 'iatf', resultado_prenhez: 'positivo' },
      { tipo: 'diagnostico_prenhez', tipo_cobertura: 'iatf', resultado_prenhez: 'negativo' },
      { tipo: 'diagnostico_prenhez', tipo_cobertura: 'monta_natural', resultado_prenhez: 'positivo' },
    ];
    const linhas = calcularTaxaPrenhezPorMetodo(eventos);
    const iatf = linhas.find((l) => l.metodo === 'iatf')!;
    const natural = linhas.find((l) => l.metodo === 'monta_natural')!;
    const ia = linhas.find((l) => l.metodo === 'ia_convencional')!;

    expect(iatf.coberturas).toBe(2);
    expect(iatf.diagnosticosPositivos).toBe(1);
    expect(iatf.taxaConcepcaoPct).toBe(50);

    expect(natural.coberturas).toBe(1);
    expect(natural.diagnosticosPositivos).toBe(1);
    expect(natural.taxaConcepcaoPct).toBe(100);

    expect(ia.coberturas).toBe(0);
    expect(ia.taxaConcepcaoPct).toBe(0);
  });

  it('trata tipo_cobertura ausente/desconhecido sem quebrar', () => {
    const eventos = [
      { tipo: 'cobertura', tipo_cobertura: null },
      { tipo: 'cobertura' },
    ];
    const linhas = calcularTaxaPrenhezPorMetodo(eventos);
    expect(linhas).toHaveLength(3);
    expect(linhas.every((l) => l.coberturas === 0)).toBe(true);
  });
});

describe('calcularIdadeAoAbate', () => {
  it('calcula idade média em meses entre nascimento e venda', () => {
    const animais = [
      { id: 'a1', data_nascimento: '2022-01-15' },
      { id: 'a2', data_nascimento: '2022-07-10' },
    ];
    const eventos = [
      { animal_id: 'a1', tipo: 'venda', data_evento: '2024-01-15' }, // 24 meses
      { animal_id: 'a2', tipo: 'venda', data_evento: '2024-01-10' }, // 18 meses
      { animal_id: 'a1', tipo: 'pesagem', data_evento: '2023-01-01' }, // ignorado
    ];
    const idade = calcularIdadeAoAbate(animais, eventos);
    expect(idade).toBe(21); // (24 + 18) / 2
  });

  it('retorna null quando não há vendas casadas', () => {
    const idade = calcularIdadeAoAbate(
      [{ id: 'a1', data_nascimento: '2022-01-01' }],
      [{ animal_id: 'a1', tipo: 'pesagem', data_evento: '2023-01-01' }]
    );
    expect(idade).toBeNull();
  });
});

describe('calcularProducaoLeitePorArea', () => {
  it('divide litros/dia pela soma das áreas válidas', () => {
    const r = calcularProducaoLeitePorArea(600, [10, 20, null, 0, -5]);
    expect(r).toBe(20); // 600 / 30
  });

  it('retorna null quando nenhuma área cadastrada', () => {
    expect(calcularProducaoLeitePorArea(600, [null, 0])).toBeNull();
  });
});

describe('calcularArrobasPorArea', () => {
  it('divide arrobas totais pela soma das áreas válidas', () => {
    const r = calcularArrobasPorArea(300, [10, null, 5]);
    expect(r).toBe(20); // 300 / 15
  });

  it('retorna null quando nenhuma área cadastrada', () => {
    expect(calcularArrobasPorArea(300, [])).toBeNull();
  });
});
