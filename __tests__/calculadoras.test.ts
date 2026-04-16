import { describe, it, expect } from 'vitest';
import {
  calcularCalagem,
  calcularNPK,
  otimizarNPK,
  interpolarTabelaSMP,
  FERTILIZANTES_PADRAO,
} from '@/lib/calculadoras';

// ---------------------------------------------------------------------------
// Calculadora de Calagem
// ---------------------------------------------------------------------------
describe('calcularCalagem', () => {
  const base = {
    al: '0',
    ca: '0',
    mg: '0',
    v1: '',
    ctc: '',
    prnt: '80',
    v2: '60',
    area: '',
    metodo: 'saturacao' as const,
  };

  it('retorna null quando area está vazia', () => {
    expect(calcularCalagem({ ...base, area: '' })).toBeNull();
  });

  it('retorna null quando prnt está vazio', () => {
    expect(calcularCalagem({ ...base, area: '10', prnt: '' })).toBeNull();
  });

  describe('método: saturação por bases (V%) [fórmula corrigida v1.1]', () => {
    it('calcula NC corretamente: V1=40, V2=60, CTC=5, PRNT=80', () => {
      // NC = (CTC × (V2 - V1) / 100) / (PRNT / 100)
      // NC = (5 × 20 / 100) / 0.8 = 1.0 / 0.8 = 1.25 t/ha
      const result = calcularCalagem({
        ...base,
        v1: '40',
        v2: '60',
        ctc: '5',
        prnt: '80',
        area: '10',
        metodo: 'saturacao',
      });
      expect(result).not.toBeNull();
      expect(result!.nc).toBeCloseTo(1.25, 2);
      expect(result!.total).toBeCloseTo(12.5, 1);
    });

    it('retorna nc=0 quando V1 >= V2', () => {
      const result = calcularCalagem({
        ...base,
        v1: '70',
        v2: '60',
        ctc: '5',
        prnt: '80',
        area: '10',
        metodo: 'saturacao',
      });
      expect(result!.nc).toBe(0);
    });
  });

  describe('método: neutralização de alumínio (al_ca_mg)', () => {
    it('calcula NC corretamente com Al e deficiência de Ca+Mg', () => {
      // NC = (Al × 2 + max(0, 2 - (Ca + Mg))) / (PRNT / 100)
      // NC = (1 × 2 + max(0, 2 - 1)) / 0.8
      // NC = (2 + 1) / 0.8 = 3.75 t/ha
      const result = calcularCalagem({
        ...base,
        al: '1',
        ca: '0.5',
        mg: '0.5',
        prnt: '80',
        area: '5',
        metodo: 'al_ca_mg',
      });
      expect(result!.nc).toBeCloseTo(3.75, 2);
      expect(result!.total).toBeCloseTo(18.75, 1);
    });

    it('não vai negativo quando Ca+Mg > 2', () => {
      // max(0, 2 - (1.5 + 1.5)) = max(0, -1) = 0
      const result = calcularCalagem({
        ...base,
        al: '0',
        ca: '1.5',
        mg: '1.5',
        prnt: '80',
        area: '10',
        metodo: 'al_ca_mg',
      });
      expect(result!.nc).toBe(0);
    });
  });

  describe('método: Mg Manual (alumínio + Ca+Mg)', () => {
    it('calcula NC corretamente', () => {
      // NC = max(0, 3×Al + (2 - (Ca+Mg))) / (PRNT / 100)
      // NC = max(0, 3×1 + (2 - 1)) / 0.8 = 4 / 0.8 = 5
      const result = calcularCalagem({
        ...base,
        al: '1',
        ca: '0.5',
        mg: '0.5',
        prnt: '80',
        area: '4',
        metodo: 'mg_manual',
      });
      expect(result!.nc).toBeCloseTo(5, 1);
      expect(result!.total).toBeCloseTo(20, 1);
    });
  });

  describe('método: SMP (Índice SMP) [novo v1.1]', () => {
    it('interpola corretamente para pH SMP=5.5, textura=media', () => {
      // Entre 5.4 (nc=2.2) e 5.6 (nc=1.8)
      // Interpolação: 2.2 + (5.5-5.4)*(1.8-2.2)/(5.6-5.4) = 2.2 - 0.2 = 2.0
      const result = calcularCalagem({
        metodo: 'smp',
        ph_smp: '5.5',
        textura: 'media',
        prnt: '100',
        area: '1',
      });
      expect(result!.nc).toBeCloseTo(2.0, 1);
    });

    it('retorna primeiro valor para pH fora da tabela (abaixo)', () => {
      const result = calcularCalagem({
        metodo: 'smp',
        ph_smp: '4.0',
        textura: 'argilosa',
        prnt: '100',
        area: '1',
      });
      // Primeiro valor da tabela argilosa: 4.6 → 4.5
      expect(result!.nc).toBe(4.5);
    });

    it('retorna último valor para pH fora da tabela (acima)', () => {
      const result = calcularCalagem({
        metodo: 'smp',
        ph_smp: '7.0',
        textura: 'arenosa',
        prnt: '100',
        area: '1',
      });
      // Último valor tabela arenosa: 6.4 → 0.0
      expect(result!.nc).toBe(0);
    });
  });

  describe('método: UFLA (Teor de Cálcio Desejado) [novo v1.1]', () => {
    it('calcula NC para milho com Ca=2.0', () => {
      // Ca_desejado (milho) = 5.0 cmolc/dm³
      // NC = (5.0 - 2.0) / (80/100) = 3.0 / 0.8 = 3.75 t/ha
      const result = calcularCalagem({
        metodo: 'ufla',
        ca: '2.0',
        cultura: 'milho',
        prnt: '80',
        area: '10',
      });
      expect(result!.nc).toBeCloseTo(3.75, 2);
      expect(result!.total).toBeCloseTo(37.5, 1);
    });

    it('retorna 0 quando Ca atual >= Ca desejado', () => {
      const result = calcularCalagem({
        metodo: 'ufla',
        ca: '6.0',
        cultura: 'milho',
        prnt: '80',
        area: '10',
      });
      expect(result!.nc).toBe(0);
    });

    it('usa default milho se cultura não especificada', () => {
      const result = calcularCalagem({
        metodo: 'ufla',
        ca: '2.0',
        prnt: '100',
        area: '1',
      });
      // Ca_desejado default = 5.0, Ca_atual = 2.0
      // NC = 3.0 / 1.0 = 3.0
      expect(result!.nc).toBeCloseTo(3.0, 1);
    });
  });
});

// ---------------------------------------------------------------------------
// Calculadora NPK
// ---------------------------------------------------------------------------
describe('calcularNPK (modo simples)', () => {
  const fert = {
    id: 'map',
    nome: 'MAP 11-52-00',
    teor_n_percent: 11,
    teor_p_percent: 52,
    teor_k_percent: 0,
    preco_saco_50kg: 225,
    customizado: false,
  };

  const npkInput = {
    n_nec: '30',
    p_nec: '60',
    k_nec: '0',
    area: '10',
    modo: 'simples' as const,
  };

  it('retorna null quando fertilizante é null', () => {
    expect(calcularNPK(npkInput, null)).toBeNull();
  });

  it('retorna null quando area está vazia', () => {
    expect(calcularNPK({ ...npkInput, area: '' }, fert)).toBeNull();
  });

  it('calcula dose baseada no nutriente limitante', () => {
    // Dose N: 30 / (11/100) ≈ 272.73 kg/ha
    // Dose P: 60 / (52/100) ≈ 115.38 kg/ha
    // dosePorHa = max(272.73, 115.38) = 272.73 kg/ha
    // total = (272.73 * 10) / 1000 ≈ 2.73 t
    const result = calcularNPK(npkInput, fert);
    expect(result).not.toBeNull();
    expect(result!.dosePorHa).toBeCloseTo(272.73, 0);
    expect(result!.total).toBeCloseTo(2.73, 1);
    expect(result!.fertNome).toBe('MAP 11-52-00');
  });
});

// ---------------------------------------------------------------------------
// Otimizador NPK
// ---------------------------------------------------------------------------
describe('otimizarNPK (modo otimizado)', () => {
  it('encontra combinação 1 fertilizante para N=90, P=0, K=0 (Ureia)', () => {
    const result = otimizarNPK({
      n_nec: '90',
      p_nec: '0',
      k_nec: '0',
      area: '10',
      modo: 'otimizado',
    });
    expect(result).not.toBeNull();
    expect(result!.top5.length).toBeGreaterThan(0);
    // Deve incluir Ureia como opção
    const temUreia = result!.top5.some((opt) =>
      opt.fertilizantes.some((f) => f.fertilizante.id === 'ureia')
    );
    expect(temUreia).toBe(true);
  });

  it('retorna top5 ordenado por custo crescente', () => {
    const result = otimizarNPK({
      n_nec: '100',
      p_nec: '80',
      k_nec: '60',
      area: '10',
      modo: 'otimizado',
    });
    if (result && result.top5.length > 1) {
      for (let i = 1; i < result.top5.length; i++) {
        expect(result.top5[i].custoTotal_r_ha).toBeGreaterThanOrEqual(
          result.top5[i - 1].custoTotal_r_ha
        );
      }
    }
  });

  it('valida margem de erro >= 0% (nunca fornece menos que necessário)', () => {
    const result = otimizarNPK({
      n_nec: '80',
      p_nec: '60',
      k_nec: '40',
      area: '5',
      modo: 'otimizado',
    });
    if (result) {
      result.top5.forEach((opcao) => {
        if (parseFloat('80') > 0)
          expect(opcao.margemErro.n_percent).toBeGreaterThanOrEqual(0);
        if (parseFloat('60') > 0)
          expect(opcao.margemErro.p_percent).toBeGreaterThanOrEqual(0);
        if (parseFloat('40') > 0)
          expect(opcao.margemErro.k_percent).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it('calcula sacos corretamente', () => {
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
      expect(fert.sacos_por_ha).toBe(Math.ceil(fert.dose_kg_ha / 50));
      expect(fert.total_sacos).toBe(fert.sacos_por_ha * 10);
    }
  });

  it('retorna null se nenhum fertilizante selecionado', () => {
    const result = otimizarNPK({
      n_nec: '90',
      p_nec: '60',
      k_nec: '40',
      area: '10',
      modo: 'otimizado',
      fertilizantes_selecionados: [],
    });
    expect(result).toBeNull();
  });

  it('retorna null se necessidade é zero', () => {
    const result = otimizarNPK({
      n_nec: '0',
      p_nec: '0',
      k_nec: '0',
      area: '10',
      modo: 'otimizado',
    });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
describe('interpolarTabelaSMP', () => {
  it('interpola linearmente entre dois pontos', () => {
    // Entre pH 5.4 (nc=1.6) e 5.6 (nc=1.4) na tabela arenosa
    // pH 5.5 → nc = 1.6 + (5.5-5.4) * (1.4-1.6) / (5.6-5.4) = 1.6 - 0.1 = 1.5
    const result = interpolarTabelaSMP(5.5, 'arenosa');
    expect(result).toBeCloseTo(1.5, 1);
  });
});

// ---------------------------------------------------------------------------
// Edge Cases (Fase 4 - Polimento)
// ---------------------------------------------------------------------------
describe('Edge Cases - Calagem', () => {
  it('PRNT=100% não causa divisão por zero', () => {
    const result = calcularCalagem({
      metodo: 'saturacao',
      v1: '40',
      v2: '60',
      ctc: '5',
      prnt: '100',
      area: '10',
    });
    expect(result).not.toBeNull();
    expect(result!.nc).toBeCloseTo(1.0, 2);
    expect(Number.isFinite(result!.nc)).toBe(true);
  });

  it('Área fracionária 0.5 ha é calculada corretamente', () => {
    const result = calcularCalagem({
      metodo: 'saturacao',
      v1: '40',
      v2: '60',
      ctc: '5',
      prnt: '80',
      area: '0.5',
    });
    expect(result).not.toBeNull();
    expect(result!.total).toBeCloseTo(0.625, 3);
  });

  it('Método al_ca_mg com PRNT=100%', () => {
    const result = calcularCalagem({
      metodo: 'al_ca_mg',
      al: '1',
      ca: '0.5',
      mg: '0.5',
      prnt: '100',
      area: '5',
    });
    expect(result).not.toBeNull();
    expect(result!.nc).toBeCloseTo(3.0, 2);
  });

  it('Método mg_manual com todos nutrientes comuns', () => {
    const result = calcularCalagem({
      metodo: 'mg_manual',
      al: '0.5',
      ca: '2',
      mg: '1',
      prnt: '100',
      area: '20',
    });
    expect(result).not.toBeNull();
    expect(result!.total).toBeGreaterThan(0);
  });
});

describe('Edge Cases - NPK', () => {
  it('NPK otimizado com Área=0.5 ha', () => {
    const result = otimizarNPK({
      n_nec: '45',
      p_nec: '30',
      k_nec: '30',
      area: '0.5',
      modo: 'otimizado',
    });
    expect(result).not.toBeNull();
    if (result) {
      expect(result.top5.length).toBeGreaterThan(0);
      const firstOpt = result.top5[0];
      expect(Number.isFinite(firstOpt.custoTotal_r_ha)).toBe(true);
    }
  });

  it('Sacos calculados com Math.ceil (sempre arredonda pra cima)', () => {
    const result = otimizarNPK({
      n_nec: '100',
      p_nec: '0',
      k_nec: '0',
      area: '2',
      modo: 'otimizado',
      fertilizantes_selecionados: ['ureia'],
    });
    if (result && result.top5.length > 0) {
      const fert = result.top5[0].fertilizantes[0];
      const expectedSacos = Math.ceil(fert.dose_kg_ha / 50);
      expect(fert.sacos_por_ha).toBe(expectedSacos);
      // Verificar que nunca arredonda para baixo
      expect(fert.sacos_por_ha * 50).toBeGreaterThanOrEqual(fert.dose_kg_ha);
    }
  });

  it('Custos são sempre positivos ou zero', () => {
    const result = otimizarNPK({
      n_nec: '80',
      p_nec: '60',
      k_nec: '40',
      area: '5',
      modo: 'otimizado',
    });
    if (result) {
      result.top5.forEach((opcao) => {
        expect(opcao.custoTotal_r_ha).toBeGreaterThanOrEqual(0);
        opcao.fertilizantes.forEach((f) => {
          expect(f.custo_por_ha).toBeGreaterThanOrEqual(0);
        });
      });
    }
  });

  it('Margem de erro nunca vai abaixo de 0% (validação crítica)', () => {
    const result = otimizarNPK({
      n_nec: '100',
      p_nec: '80',
      k_nec: '60',
      area: '10',
      modo: 'otimizado',
    });
    if (result) {
      result.top5.forEach((opcao) => {
        expect(opcao.margemErro.n_percent).toBeGreaterThanOrEqual(0);
        expect(opcao.margemErro.p_percent).toBeGreaterThanOrEqual(0);
        expect(opcao.margemErro.k_percent).toBeGreaterThanOrEqual(0);
      });
    }
  });
});
