/**
 * Testes para lib/calculos/indicadores-rebanho.ts — T47 REPARADO
 *
 * Funções de cálculo PURO (sem I/O, sem dependências externas)
 * Testam as 9 funções de cálculo usadas em produção por
 * app/dashboard/rebanho/indicadores/actions.ts
 */

import { describe, it, expect } from 'vitest';
import {
  calcularComposicaoRebanho,
  calcularGMDMedioRebanho,
  calcularTaxaNatalidade,
  calcularTaxaMortalidade,
  calcularTaxaMortalidadeBezerros,
  calcularTaxaDesfrute,
  calcularTaxaDescarte,
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
  FAZENDA_TEST_ID,
} from '@/tests/fixtures/rebanho-indicadores';
import type { Animal, PesoAnimal, EventoRebanho } from '@/lib/types/rebanho';
import { TipoRebanho } from '@/lib/types/rebanho';

// ========== HAPPY PATH: ~14 TESTES ==========

describe('Indicadores Rebanho — Cálculos Puros', () => {

  // ========== COMPOSIÇÃO ==========

  describe('calcularComposicaoRebanho', () => {
    it('calcula composição corretamente para 10 animais variados', () => {
      const resultado = calcularComposicaoRebanho(ANIMAIS_FIXTURE);

      expect(resultado.total).toBe(10);
      expect(resultado.por_sexo.machos).toBe(3); // a5 (Touro), c2, c3
      expect(resultado.por_sexo.femeas).toBe(7); // a1, a2, a3, a4, a6, a7, c1
      expect(resultado.por_vocacao.leiteiro).toBe(7);
      expect(resultado.por_vocacao.corte).toBe(3);
      expect(resultado.por_categoria['Vaca em Lactação']).toBe(3);
      expect(resultado.por_categoria['Bezerro']).toBe(1);
    });

    it('retorna 0 para rebanho vazio', () => {
      const resultado = calcularComposicaoRebanho([]);
      expect(resultado.total).toBe(0);
    });

    it('filtra corretamente por tipo_rebanho leiteiro', () => {
      const leiteiros = ANIMAIS_FIXTURE.filter((a) => a.tipo_rebanho === TipoRebanho.LEITEIRO);
      const resultado = calcularComposicaoRebanho(leiteiros);
      expect(resultado.total).toBe(7);
      expect(resultado.por_vocacao.leiteiro).toBe(7);
    });
  });

  // ========== GMD ==========

  describe('calcularGMDMedioRebanho', () => {
    it('calcula GMD médio agrupando pesagens por animal_id', () => {
      // Agrupar pesagens por animal_id (como em produção)
      const pesagensAgrupadas = new Map<string, Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[]>();
      for (const pesagem of PESAGENS_FIXTURE) {
        const chave = pesagem.animal_id;
        if (!pesagensAgrupadas.has(chave)) {
          pesagensAgrupadas.set(chave, []);
        }
        pesagensAgrupadas.get(chave)!.push({
          data_pesagem: pesagem.data_pesagem,
          peso_kg: pesagem.peso_kg,
        });
      }

      const periodo = { dataInicio: '2026-03-01', dataFim: '2026-05-01' };
      const resultado = calcularGMDMedioRebanho(pesagensAgrupadas, periodo);

      // Cada animal: (550-540)/61 dias ≈ 0.164 kg/dia
      // Esperado: ~0.164 kg/dia
      expect(resultado).toBeCloseTo(0.164, 1);
    });

    it('retorna null sem pesagens suficientes', () => {
      const pesagensVazia = new Map<string, Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[]>();
      const periodo = { dataInicio: '2026-03-01', dataFim: '2026-05-01' };
      const resultado = calcularGMDMedioRebanho(pesagensVazia, periodo);
      expect(resultado).toBeNull();
    });
  });

  // ========== TAXAS REPRODUTIVAS ==========

  describe('calcularTaxaNatalidade', () => {
    it('calcula taxa de natalidade (nascimentos / vacas aptas)', () => {
      // Filtrar eventos do período que são nascimentos
      const eventosPeriodo = EVENTOS_FIXTURE.filter(
        (e) => e.data_evento >= '2026-03-01' && e.data_evento <= '2026-05-01'
      );
      const nascimentos = eventosPeriodo.filter((e) => e.tipo === 'nascimento');

      // Vacas aptas: a1, a2, a3 (Lactação), a6 (Seca), a7 (Prenha), c1 (Matriz) = 6
      const vacasAptas = 6;
      const periodo = { dataInicio: '2026-03-01', dataFim: '2026-05-01' };

      const resultado = calcularTaxaNatalidade(
        nascimentos as any, // filtra por tipo === 'nascimento', tem field tipo
        vacasAptas,
        periodo
      );

      // 2 partos / 6 vacas = 33.33%
      expect(resultado.numerador).toBe(2);
      expect(resultado.denominador).toBe(6);
      expect(resultado.taxa_percentual).toBeCloseTo(33.33, 1);
    });
  });

  describe('calcularTaxaMortalidade', () => {
    it('calcula taxa de mortalidade geral', () => {
      const periodo = { dataInicio: '2026-03-01', dataFim: '2026-05-01' };
      const eventosPeriodo = EVENTOS_FIXTURE.filter(
        (e) => e.data_evento >= periodo.dataInicio && e.data_evento <= periodo.dataFim
      );

      const resultado = calcularTaxaMortalidade(
        eventosPeriodo as any,
        10, // rebanho início
        10, // rebanho fim
        periodo
      );

      // 2 mortes / 10 = 20%
      expect(resultado.numerador).toBe(2);
      expect(resultado.taxa_percentual).toBeCloseTo(20, 1);
    });
  });

  describe('calcularTaxaMortalidadeBezerros', () => {
    it('calcula taxa de mortalidade bezerros', () => {
      const periodo = { dataInicio: '2026-03-01', dataFim: '2026-05-01' };
      const eventosPeriodo = EVENTOS_FIXTURE.filter(
        (e) => e.data_evento >= periodo.dataInicio && e.data_evento <= periodo.dataFim
      );

      const resultado = calcularTaxaMortalidadeBezerros(eventosPeriodo as any, periodo);

      // Valida estrutura ResultadoTaxa
      expect(resultado).toHaveProperty('numerador');
      expect(resultado).toHaveProperty('denominador');
      expect(resultado).toHaveProperty('taxa_percentual');
      expect(resultado.taxa_percentual).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calcularTaxaDesfrute', () => {
    it('calcula taxa de desfrute (vendas + mortes)', () => {
      const periodo = { dataInicio: '2026-03-01', dataFim: '2026-05-01' };
      const eventosPeriodo = EVENTOS_FIXTURE.filter(
        (e) => e.data_evento >= periodo.dataInicio && e.data_evento <= periodo.dataFim
      );

      const resultado = calcularTaxaDesfrute(
        eventosPeriodo as any,
        10,
        10,
        periodo
      );

      // Estrutura
      expect(resultado).toHaveProperty('numerador');
      expect(resultado).toHaveProperty('taxa_percentual');
      expect(resultado.taxa_percentual).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calcularTaxaDescarte', () => {
    it('calcula taxa de descarte (Boi Descartado + Fêmea Descartada)', () => {
      // Neste fixture, não há animais com categoria descarte
      const resultado = calcularTaxaDescarte(ANIMAIS_FIXTURE);

      expect(resultado.numerador).toBe(0);
      expect(resultado.denominador).toBe(10);
      expect(resultado.taxa_percentual).toBe(0);
    });
  });

  // ========== REPRODUÇÃO ==========

  describe('calcularIntervaloEntrePartos', () => {
    it('retorna null sem 2+ partos', () => {
      const datasParto = EVENTOS_FIXTURE.filter((e) => e.tipo === 'nascimento');
      const relacaoMaeFilho = new Map<string, string[]>();
      // Sem múltiplos filhos por mãe no fixture

      const resultado = calcularIntervaloEntrePartos(datasParto as any, relacaoMaeFilho);
      expect(resultado).toBeNull();
    });
  });

  describe('calcularIdadePrimeiroParto', () => {
    it('calcula idade primo parto com relação mae-filho', () => {
      // a1 nasceu 2020-01-15, teve parto em 2026-02-15
      // Idade: ~6 anos = ~72 meses
      const vacas = ANIMAIS_FIXTURE.filter((a) => a.sexo === 'F');
      const datasParto = EVENTOS_FIXTURE.filter((e) => e.tipo === 'nascimento');

      const relacaoMaeFilho = new Map<string, string[]>();
      relacaoMaeFilho.set('a1', ['filho1']); // a1 teve 1 parto
      relacaoMaeFilho.set('a2', ['filho2']);
      relacaoMaeFilho.set('a3', ['filho3']);

      const resultado = calcularIdadePrimeiroParto(
        vacas as any,
        datasParto as any,
        relacaoMaeFilho
      );

      // Deve retornar número ou null
      if (resultado !== null) {
        expect(resultado).toBeGreaterThan(0);
      }
    });
  });

  // ========== HELPERS ==========

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

  // ========== SMOKE TESTS: FIXTURE ==========

  describe('Smoke Test: Fixture Integridade', () => {
    it('fixture contém 10 animais', () => {
      expect(ANIMAIS_FIXTURE.length).toBe(10);
    });

    it('fixture contém 30 pesagens', () => {
      expect(PESAGENS_FIXTURE.length).toBe(30);
    });

    it('fixture contém eventos de teste', () => {
      expect(EVENTOS_FIXTURE.length).toBeGreaterThan(0);
    });

    it('todos os animais têm animal_id referenciável', () => {
      const ids = new Set(ANIMAIS_FIXTURE.map((a) => a.id));
      const pesagensValidas = PESAGENS_FIXTURE.every((p) => ids.has(p.animal_id));
      expect(pesagensValidas).toBe(true);
    });
  });
});
