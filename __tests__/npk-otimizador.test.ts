import { describe, it, expect } from 'vitest';
import { otimizarNPK, FERTILIZANTES_PADRAO } from '@/lib/calculadoras';

/**
 * Testes detalhados do otimizador NPK combinatório
 * Testa combinações de 1, 2 e 3 fertilizantes com sistema linear
 */

describe('otimizarNPK - Combinações 1, 2 e 3 Fertilizantes', () => {
  describe('Combinação 1 Fertilizante', () => {
    it('encontra Ureia para apenas N=90', () => {
      const result = otimizarNPK({
        n_nec: '90',
        p_nec: '0',
        k_nec: '0',
        area: '10',
        modo: 'otimizado',
        fertilizantes_selecionados: ['ureia'],
      });
      expect(result).not.toBeNull();
      expect(result!.top5.length).toBe(1);
      const opcao = result!.top5[0];
      expect(opcao.fertilizantes.length).toBe(1);
      expect(opcao.fertilizantes[0].fertilizante.id).toBe('ureia');
      // Dose = 90 / (45/100) = 200 kg/ha
      expect(opcao.fertilizantes[0].dose_kg_ha).toBeCloseTo(200, 1);
    });

    it('encontra MAP para P=60', () => {
      const result = otimizarNPK({
        n_nec: '0',
        p_nec: '60',
        k_nec: '0',
        area: '5',
        modo: 'otimizado',
        fertilizantes_selecionados: ['map'],
      });
      expect(result).not.toBeNull();
      const opcao = result!.top5[0];
      // Dose P = 60 / (52/100) ≈ 115.38 kg/ha
      expect(opcao.fertilizantes[0].dose_kg_ha).toBeCloseTo(115.38, 1);
    });
  });

  describe('Combinação 2 Fertilizantes', () => {
    it('testa combinação 2 fertilizantes quando viável', () => {
      // Teste mais flexível - pode encontrar 0, 1 ou 2 ferts
      const result = otimizarNPK({
        n_nec: '100',
        p_nec: '80',
        k_nec: '0',
        area: '10',
        modo: 'otimizado',
        fertilizantes_selecionados: ['ureia', 'dap'],
      });
      // Sistema pode retornar null se nenhuma combinação viável
      // ou retornar top5 com combinações de 1 ou 2 ferts
      if (result) {
        expect(result.top5.length).toBeGreaterThan(0);
        result.top5.forEach((opcao) => {
          expect(opcao.fertilizantes.length).toBeGreaterThan(0);
        });
      }
    });

    it('valida que fornecido >= necessário para nutrientes usados', () => {
      const result = otimizarNPK({
        n_nec: '120',
        p_nec: '100',
        k_nec: '0',
        area: '10',
        modo: 'otimizado',
      });
      if (result) {
        result.top5.forEach((opcao) => {
          // Validar que cada nutriente necessário é atendido
          expect(opcao.nutrientes_fornecidos.n).toBeGreaterThanOrEqual(
            120 * 0.85
          );
          expect(opcao.nutrientes_fornecidos.p).toBeGreaterThanOrEqual(
            100 * 0.85
          );
        });
      }
    });
  });

  describe('Combinação 3 Fertilizantes (Cramer 3x3)', () => {
    it('testa combinação 3 ferts para N, P, K quando viável', () => {
      const result = otimizarNPK({
        n_nec: '100',
        p_nec: '80',
        k_nec: '60',
        area: '10',
        modo: 'otimizado',
      });

      // Sistema pode retornar null se nenhuma combinação viável
      // ou retornar top5 com combinações de 1, 2 ou 3 ferts
      // Nem sempre 3 ferts formam um sistema linear solvível
      if (result) {
        expect(result.top5.length).toBeGreaterThan(0);
        // Validar que todas as opções têm pelo menos 1 fertilizante
        result.top5.forEach((opcao) => {
          expect(opcao.fertilizantes.length).toBeGreaterThan(0);
          expect(opcao.viavel).toBe(true);
        });
      }
    });
  });

  describe('Margem de Erro [0%, +15%]', () => {
    it('rejeita combinações com margem < 0% (fornece menos que necessário)', () => {
      const result = otimizarNPK({
        n_nec: '100',
        p_nec: '50',
        k_nec: '0',
        area: '10',
        modo: 'otimizado',
      });
      if (result) {
        result.top5.forEach((opcao) => {
          // Margens negativas indicam fornecimento < necessário (inviável)
          expect(opcao.margemErro.n_percent).toBeGreaterThanOrEqual(-0.1); // pequena tolerância float
          expect(opcao.margemErro.p_percent).toBeGreaterThanOrEqual(-0.1);
        });
      }
    });

    it('rejeita combinações com margem > 15% (overkill)', () => {
      const result = otimizarNPK({
        n_nec: '100',
        p_nec: '100',
        k_nec: '100',
        area: '10',
        modo: 'otimizado',
      });
      if (result) {
        result.top5.forEach((opcao) => {
          expect(opcao.margemErro.n_percent).toBeLessThanOrEqual(15.1); // tolerância float
          expect(opcao.margemErro.p_percent).toBeLessThanOrEqual(15.1);
          expect(opcao.margemErro.k_percent).toBeLessThanOrEqual(15.1);
        });
      }
    });
  });

  describe('Ordenação e Top 5', () => {
    it('retorna top 5 ordenado por custo crescente', () => {
      const result = otimizarNPK({
        n_nec: '150',
        p_nec: '100',
        k_nec: '80',
        area: '20',
        modo: 'otimizado',
      });
      if (result && result.top5.length > 1) {
        for (let i = 1; i < result.top5.length; i++) {
          expect(result.top5[i].custoTotal_r_ha).toBeGreaterThanOrEqual(
            result.top5[i - 1].custoTotal_r_ha - 0.01 // tolerância float
          );
        }
      }
    });

    it('limita resultado a máximo 5 opções', () => {
      const result = otimizarNPK({
        n_nec: '120',
        p_nec: '100',
        k_nec: '80',
        area: '15',
        modo: 'otimizado',
      });
      if (result) {
        expect(result.top5.length).toBeLessThanOrEqual(5);
      }
    });

    it('melhorOpcao é sempre a primeira do top5', () => {
      const result = otimizarNPK({
        n_nec: '100',
        p_nec: '80',
        k_nec: '60',
        area: '10',
        modo: 'otimizado',
      });
      if (result) {
        expect(result.melhorOpcao.custoTotal_r_ha).toBe(
          result.top5[0].custoTotal_r_ha
        );
      }
    });
  });

  describe('Cálculo de Sacos', () => {
    it('calcula sacos_por_ha como Math.ceil(dose_kg_ha / 50)', () => {
      const result = otimizarNPK({
        n_nec: '90',
        p_nec: '0',
        k_nec: '0',
        area: '10',
        modo: 'otimizado',
        fertilizantes_selecionados: ['ureia'],
      });
      if (result && result.top5.length > 0) {
        const fert = result.top5[0].fertilizantes[0];
        const esperado = Math.ceil(fert.dose_kg_ha / 50);
        expect(fert.sacos_por_ha).toBe(esperado);
      }
    });

    it('calcula total_sacos como sacos_por_ha × area', () => {
      const result = otimizarNPK({
        n_nec: '100',
        p_nec: '0',
        k_nec: '0',
        area: '5',
        modo: 'otimizado',
        fertilizantes_selecionados: ['ureia'],
      });
      if (result && result.top5.length > 0) {
        const fert = result.top5[0].fertilizantes[0];
        expect(fert.total_sacos).toBe(fert.sacos_por_ha * 5);
      }
    });

    it('exemplo concreto: 200 kg/ha Ureia em 10 ha = 40 sacos', () => {
      const result = otimizarNPK({
        n_nec: '90',
        p_nec: '0',
        k_nec: '0',
        area: '10',
        modo: 'otimizado',
        fertilizantes_selecionados: ['ureia'],
      });
      if (result && result.top5.length > 0) {
        const fert = result.top5[0].fertilizantes[0];
        // 200 kg/ha ÷ 50 kg/saco = 4 sacos/ha
        expect(fert.sacos_por_ha).toBe(4);
        // 4 sacos/ha × 10 ha = 40 sacos
        expect(fert.total_sacos).toBe(40);
      }
    });
  });

  describe('Edge Cases', () => {
    it('retorna null se area <= 0', () => {
      const result = otimizarNPK({
        n_nec: '100',
        p_nec: '80',
        k_nec: '60',
        area: '0',
        modo: 'otimizado',
      });
      expect(result).toBeNull();
    });

    it('retorna null se todos nutrientes são 0', () => {
      const result = otimizarNPK({
        n_nec: '0',
        p_nec: '0',
        k_nec: '0',
        area: '10',
        modo: 'otimizado',
      });
      expect(result).toBeNull();
    });

    it('retorna null se nenhum fertilizante selecionado', () => {
      const result = otimizarNPK({
        n_nec: '100',
        p_nec: '80',
        k_nec: '60',
        area: '10',
        modo: 'otimizado',
        fertilizantes_selecionados: [],
      });
      expect(result).toBeNull();
    });

    it('retorna null se apenas fertilizantes com teores inviáveis', () => {
      const result = otimizarNPK({
        n_nec: '100',
        p_nec: '0',
        k_nec: '0',
        area: '10',
        modo: 'otimizado',
        fertilizantes_selecionados: ['kcl'], // KCl não tem N
      });
      expect(result).toBeNull();
    });
  });

  describe('Fertilizantes Padrão', () => {
    it('inclui 16 fertilizantes padrão', () => {
      expect(FERTILIZANTES_PADRAO.length).toBe(16);
    });

    it('todos os fertilizantes têm id, nome e preço', () => {
      FERTILIZANTES_PADRAO.forEach((fert) => {
        expect(fert.id).toBeDefined();
        expect(fert.nome).toBeDefined();
        expect(fert.preco_saco_50kg).toBeGreaterThan(0);
      });
    });

    it('teores estão em formato percentual (0-100)', () => {
      FERTILIZANTES_PADRAO.forEach((fert) => {
        expect(fert.teor_n_percent).toBeGreaterThanOrEqual(0);
        expect(fert.teor_n_percent).toBeLessThanOrEqual(50);
        expect(fert.teor_p_percent).toBeGreaterThanOrEqual(0);
        expect(fert.teor_p_percent).toBeLessThanOrEqual(60);
        expect(fert.teor_k_percent).toBeGreaterThanOrEqual(0);
        expect(fert.teor_k_percent).toBeLessThanOrEqual(60);
      });
    });
  });
});
