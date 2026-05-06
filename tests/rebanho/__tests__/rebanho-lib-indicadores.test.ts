/**
 * Testes para lib/calculos/indicadores-rebanho.ts — T47
 * ~24 testes: 14 happy path + 10 edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  calcularComposicaoRebanho,
  calcularGMDMedioRebanho,
  calcularTaxaNatalidade,
  calcularTaxaMortalidadeGeral,
  calcularTaxaMortalidadeBezerros,
  calcularTaxaDescarte,
  calcularTaxaPrenhez,
  calcularIntervaloEntrePartos,
  calcularIdadePrimeiroParto,
  isBezerro,
  isVaca,
  isDescarte,
} from '@/lib/calculos/indicadores-rebanho';
import {
  ANIMAIS_FIXTURE,
  PESAGENS_FIXTURE,
  EVENTOS_FIXTURE,
  RESULTADOS_ESPERADOS,
} from '@/tests/fixtures/rebanho-indicadores';
import type { Animal, PesoAnimal, EventoRebanho } from '@/lib/types/rebanho';
import { TipoRebanho } from '@/lib/types/rebanho';

// ========== HAPPY PATH: 14 TESTES (1 POR INDICADOR) ==========

describe('Indicadores Rebanho — Happy Path (Fixture Dataset)', () => {
  describe('Composição Rebanho', () => {
    it('calcula composição corretamente para 10 animais variados', () => {
      const resultado = calcularComposicaoRebanho(ANIMAIS_FIXTURE);

      expect(resultado.total).toBe(10);
      expect(resultado.por_sexo.machos).toBe(5);
      expect(resultado.por_sexo.femeas).toBe(5);
      expect(resultado.por_vocacao.leiteiro).toBe(7);
      expect(resultado.por_vocacao.corte).toBe(3);
      expect(resultado.por_categoria['Vaca em Lactação']).toBe(1);
      expect(resultado.por_categoria['Bezerro']).toBe(1);
      expect(resultado.por_categoria['Touro']).toBe(1);
    });
  });

  describe('GMD Médio', () => {
    it('calcula GMD médio com ±10% margem (10 animais, 30 pesagens)', () => {
      const resultado = calcularGMDMedioRebanho(PESAGENS_FIXTURE, ANIMAIS_FIXTURE);

      // Esperado: ~0.86 kg/d (calculado manualmente na fixture)
      expect(resultado).toBeGreaterThan(0.76); // -10%
      expect(resultado).toBeLessThan(0.96); // +10%
    });
  });

  describe('Taxa Natalidade', () => {
    it('calcula taxa de natalidade para período (3 partos, 5 fêmeas aptas)', () => {
      // Período: 2025-12-15 a 2026-02-14
      // Partos: 3 (parto-001, parto-002, parto-005)
      // Fêmeas aptas: 5
      const resultado = calcularTaxaNatalidade(
        EVENTOS_FIXTURE,
        ANIMAIS_FIXTURE,
        '2025-12-15',
        '2026-02-14'
      );

      expect(resultado).toBe(60); // (3 / 5) * 100
    });
  });

  describe('Taxa Mortalidade Geral', () => {
    it('calcula taxa de mortalidade geral (2 óbitos, 10 animais)', () => {
      // Óbitos no período: 2
      // Efetivo: 10
      const resultado = calcularTaxaMortalidadeGeral(
        EVENTOS_FIXTURE,
        ANIMAIS_FIXTURE,
        '2025-12-15',
        '2026-02-14'
      );

      expect(resultado).toBe(20); // (2 / 10) * 100
    });
  });

  describe('Taxa Mortalidade Bezerros', () => {
    it('calcula taxa de mortalidade bezerros <6 meses (1 óbito, 3 nascidos)', () => {
      // Bezerros nascidos: 3
      // Óbitos bezerros: 1 (obito-001 em 2026-01-20, Bezerro de 3 meses)
      const resultado = calcularTaxaMortalidadeBezerros(
        EVENTOS_FIXTURE,
        ANIMAIS_FIXTURE,
        '2025-12-15',
        '2026-02-14'
      );

      expect(resultado).toBeGreaterThan(31.3); // (1/3)*100 - 2%
      expect(resultado).toBeLessThan(35.3); // +2%
    });
  });

  describe('Taxa Descarte', () => {
    it('calcula taxa de descarte (3 descartados, 10 iniciais)', () => {
      const resultado = calcularTaxaDescarte(
        EVENTOS_FIXTURE,
        ANIMAIS_FIXTURE,
        '2025-12-15',
        '2026-02-14'
      );

      expect(resultado).toBe(30); // (3 / 10) * 100
    });
  });

  describe('Taxa Prenhez', () => {
    it('calcula taxa de prenhez (1 prenha, 5 fêmeas aptas)', () => {
      // Fêmeas aptas (Vaca Lactação, Seca, Prenha, Novilha, Vaca Matriz): 5
      // Fêmeas prenhas (categoria 'Vaca Prenha' ou evento DIAGNOSTICO_PRENHEZ): 1
      const resultado = calcularTaxaPrenhez(ANIMAIS_FIXTURE);

      expect(resultado).toBe(20); // (1 / 5) * 100
    });
  });

  describe('Intervalo Entre Partos (IEP)', () => {
    it('retorna null quando < 2 partos históricos (dados insuficientes)', () => {
      const resultado = calcularIntervaloEntrePartos(
        EVENTOS_FIXTURE,
        '2025-12-15',
        '2026-02-14'
      );

      // Cada animal tem máximo 1 parto no período → insuficiente
      expect(resultado).toBeNull();
    });
  });

  describe('Idade Primeiro Parto (IPP)', () => {
    it('calcula IPP para novilha (33 meses)', () => {
      // Novilha Animal 004: nasceu 2023-05-01, parto em 2026-02-01
      // IPP = 33 meses (aproximadamente)
      const resultado = calcularIdadePrimeiroParto(
        EVENTOS_FIXTURE,
        ANIMAIS_FIXTURE,
        '2025-12-15',
        '2026-02-14'
      );

      // Esperado: ~33 meses ±2
      expect(resultado).toBeGreaterThan(31);
      expect(resultado).toBeLessThan(35);
    });
  });

  // ========== EDGE CASES: 10 TESTES ==========

  describe('Edge Case: Rebanho Vazio', () => {
    it('composição retorna 0 para rebanho vazio', () => {
      const resultado = calcularComposicaoRebanho([]);

      expect(resultado.total).toBe(0);
      expect(resultado.por_sexo.machos).toBe(0);
      expect(resultado.por_sexo.femeas).toBe(0);
    });

    it('GMD retorna 0 ou null para rebanho sem pesagens', () => {
      const resultado = calcularGMDMedioRebanho([], ANIMAIS_FIXTURE);

      expect(resultado).toBe(0); // ou null, dependendo implementação
    });

    it('taxa natalidade retorna 0 quando sem partos', () => {
      const resultado = calcularTaxaNatalidade(
        [], // Sem eventos
        ANIMAIS_FIXTURE,
        '2025-12-15',
        '2026-02-14'
      );

      expect(resultado).toBe(0);
    });

    it('taxa mortalidade retorna 0 quando sem óbitos', () => {
      const resultado = calcularTaxaMortalidadeGeral(
        [], // Sem eventos
        ANIMAIS_FIXTURE,
        '2025-12-15',
        '2026-02-14'
      );

      expect(resultado).toBe(0);
    });
  });

  describe('Edge Case: Sem Fêmeas Aptas', () => {
    it('taxa natalidade retorna 0 quando fêmeas aptas = 0', () => {
      // Criar dataset só com machos
      const animaisMachosApenasS: Animal[] = ANIMAIS_FIXTURE.filter(
        (a) => a.sexo === 'Macho'
      );

      const resultado = calcularTaxaNatalidade(
        EVENTOS_FIXTURE,
        animaisMachosApenasS,
        '2025-12-15',
        '2026-02-14'
      );

      expect(resultado).toBe(0); // Sem fêmeas aptas
    });

    it('taxa prenhez retorna 0 quando fêmeas aptas = 0', () => {
      const animaisMachosApenasS: Animal[] = ANIMAIS_FIXTURE.filter(
        (a) => a.sexo === 'Macho'
      );

      const resultado = calcularTaxaPrenhez(animaisMachosApenasS);

      expect(resultado).toBe(0);
    });
  });

  describe('Edge Case: Pesagens com < 2 registros por animal', () => {
    it('GMD ignora animal com 1 pesagem (requer ≥2)', () => {
      const pesagensPoucas: PesoAnimal[] = [PESAGENS_FIXTURE[0]]; // Apenas 1

      const resultado = calcularGMDMedioRebanho(pesagensPoucas, ANIMAIS_FIXTURE);

      // 1 animal com 1 pesagem → GMD = 0 (nenhum animal com ≥2)
      expect(resultado).toBe(0);
    });

    it('GMD calcula apenas para animais com ≥2 pesagens', () => {
      // Pegar 2 pesagens do Animal 001 (suficiente) + 1 do Animal 002 (insuficiente)
      const pesagensHibridas: PesoAnimal[] = [
        PESAGENS_FIXTURE[0], // Animal 001, peso 1
        PESAGENS_FIXTURE[1], // Animal 001, peso 2
        PESAGENS_FIXTURE[3], // Animal 002, peso 1 (insuficiente sozinho)
      ];

      const resultado = calcularGMDMedioRebanho(pesagensHibridas, ANIMAIS_FIXTURE);

      // Apenas Animal 001 tem dados suficientes
      expect(resultado).toBeGreaterThan(0);
    });
  });

  describe('Edge Case: Datas Inválidas', () => {
    it('taxa natalidade retorna 0 quando período vazio (data_inicial > data_final)', () => {
      const resultado = calcularTaxaNatalidade(
        EVENTOS_FIXTURE,
        ANIMAIS_FIXTURE,
        '2026-02-14', // Invertido
        '2025-12-15'
      );

      expect(resultado).toBe(0); // Período vazio
    });

    it('IEP retorna null quando período < 30 dias', () => {
      const resultado = calcularIntervaloEntrePartos(
        EVENTOS_FIXTURE,
        '2026-01-10',
        '2026-01-15' // 5 dias
      );

      expect(resultado).toBeNull(); // Período muito curto
    });
  });

  describe('Edge Case: Filtragem por Tipo Exploração', () => {
    it('composição filtra corretamente por tipo_rebanho = leiteiro', () => {
      const animaisLeiteiros = ANIMAIS_FIXTURE.filter(
        (a) => a.tipo_rebanho === TipoRebanho.LEITEIRO
      );

      const resultado = calcularComposicaoRebanho(animaisLeiteiros);

      expect(resultado.total).toBe(7);
      expect(resultado.por_vocacao.leiteiro).toBe(7);
      expect(resultado.por_vocacao.corte).toBe(0);
    });

    it('composição filtra corretamente por tipo_rebanho = corte', () => {
      const animaisCorte = ANIMAIS_FIXTURE.filter(
        (a) => a.tipo_rebanho === TipoRebanho.CORTE
      );

      const resultado = calcularComposicaoRebanho(animaisCorte);

      expect(resultado.total).toBe(3);
      expect(resultado.por_vocacao.corte).toBe(3);
      expect(resultado.por_vocacao.leiteiro).toBe(0);
    });
  });

  describe('Helpers de Categoria', () => {
    it('isBezerro identifica corretamente', () => {
      expect(isBezerro('Bezerro')).toBe(true);
      expect(isBezerro('Bezerra')).toBe(true);
      expect(isBezerro('Vaca em Lactação')).toBe(false);
    });

    it('isVaca identifica corretamente', () => {
      expect(isVaca('Vaca em Lactação')).toBe(true);
      expect(isVaca('Vaca Seca')).toBe(true);
      expect(isVaca('Vaca Prenha')).toBe(true);
      expect(isVaca('Vaca Matriz')).toBe(true);
      expect(isVaca('Novilha')).toBe(false);
    });

    it('isDescarte identifica corretamente', () => {
      expect(isDescarte('Boi Descartado')).toBe(true);
      expect(isDescarte('Fêmea Descartada')).toBe(true);
      expect(isDescarte('Vaca em Lactação')).toBe(false);
    });
  });
});

// ========== SMOKE TEST: FIXTURE INTEIRA ==========

describe('Smoke Test: Fixture Completa', () => {
  it('fixture contém exatamente 10 animais', () => {
    expect(ANIMAIS_FIXTURE.length).toBe(10);
  });

  it('fixture contém exatamente 30 pesagens', () => {
    expect(PESAGENS_FIXTURE.length).toBe(30);
  });

  it('fixture contém 5 partos, 2 mortes, 3 descartes (10 eventos)', () => {
    const partos = EVENTOS_FIXTURE.filter((e) => e.tipo === 'parto');
    const mortes = EVENTOS_FIXTURE.filter((e) => e.tipo === 'obito');
    const descartes = EVENTOS_FIXTURE.filter((e) => e.tipo === 'descarte');

    expect(partos.length).toBe(5);
    expect(mortes.length).toBe(2);
    expect(descartes.length).toBe(3);
    expect(EVENTOS_FIXTURE.length).toBe(10);
  });

  it('resultados esperados estão documentados', () => {
    expect(RESULTADOS_ESPERADOS.composicao.total).toBe(10);
    expect(RESULTADOS_ESPERADOS.gmd_medio).toBeCloseTo(0.86, 1);
    expect(RESULTADOS_ESPERADOS.taxa_natalidade).toBe(60);
  });
});
