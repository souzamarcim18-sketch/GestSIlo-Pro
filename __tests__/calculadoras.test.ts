import { describe, it, expect } from 'vitest';
import { calcularCalagem, calcularNPK } from '@/lib/calculadoras';

// ---------------------------------------------------------------------------
// Calculadora de Calagem
// ---------------------------------------------------------------------------
describe('calcularCalagem', () => {
  const base = {
    al: '0', ca: '0', mg: '0',
    v1: '', ctc: '',
    prnt: '80', v2: '60', area: '',
    metodo: 'saturacao' as const,
  };

  it('retorna null quando area está vazia', () => {
    expect(calcularCalagem({ ...base, area: '' })).toBeNull();
  });

  it('retorna null quando prnt está vazio', () => {
    expect(calcularCalagem({ ...base, area: '10', prnt: '' })).toBeNull();
  });

  describe('método: saturação por bases (V%)', () => {
    it('calcula NC corretamente', () => {
      // NC = ((V2 - V1) * CTC) / (PRNT * 10)
      // NC = ((60 - 40) * 5) / (80 * 10) = 100 / 800 = 0.125 t/ha
      const result = calcularCalagem({
        ...base,
        v1: '40', v2: '60', ctc: '5',
        prnt: '80', area: '10',
        metodo: 'saturacao',
      });
      expect(result).not.toBeNull();
      expect(result!.nc).toBeCloseTo(0.125, 5);
      expect(result!.total).toBeCloseTo(1.25, 5);
    });

    it('retorna nc=0 quando V1 >= V2', () => {
      const result = calcularCalagem({
        ...base,
        v1: '70', v2: '60', ctc: '5',
        prnt: '80', area: '10',
        metodo: 'saturacao',
      });
      expect(result!.nc).toBe(0);
    });
  });

  describe('método: neutralização de alumínio (al_ca_mg)', () => {
    it('calcula NC corretamente com Al e deficiência de Ca+Mg', () => {
      // NC = (Al*2 + max(0, 2 - (Ca+Mg))) / (PRNT/100)
      // NC = (1*2 + max(0, 2 - (0.5+0.5))) / (80/100)
      // NC = (2 + 1) / 0.8 = 3.75 t/ha
      const result = calcularCalagem({
        ...base,
        al: '1', ca: '0.5', mg: '0.5',
        prnt: '80', area: '5',
        metodo: 'al_ca_mg',
      });
      expect(result!.nc).toBeCloseTo(3.75, 5);
      expect(result!.total).toBeCloseTo(18.75, 5);
    });

    it('não vai negativo quando Ca+Mg > 2', () => {
      // max(0, 2 - (1.5 + 1.5)) = max(0, -1) = 0
      const result = calcularCalagem({
        ...base,
        al: '0', ca: '1.5', mg: '1.5',
        prnt: '80', area: '10',
        metodo: 'al_ca_mg',
      });
      expect(result!.nc).toBe(0);
    });
  });

  describe('método: Mg Manual (alumínio + Ca+Mg)', () => {
    it('calcula NC corretamente', () => {
      // NC = max(0, 3*Al + (2 - (Ca+Mg))) / (PRNT/100)
      // NC = max(0, 3*1 + (2 - 1)) / 0.8 = 4 / 0.8 = 5
      const result = calcularCalagem({
        ...base,
        al: '1', ca: '0.5', mg: '0.5',
        prnt: '80', area: '4',
        metodo: 'mg_manual',
      });
      expect(result!.nc).toBeCloseTo(5, 5);
      expect(result!.total).toBeCloseTo(20, 5);
    });
  });
});

// ---------------------------------------------------------------------------
// Calculadora NPK
// ---------------------------------------------------------------------------
describe('calcularNPK', () => {
  const fert = {
    nome: 'MAP 12-52-0',
    teor_n_percent: 12,
    teor_p_percent: 52,
    teor_k_percent: 0,
  };

  const npkInput = {
    n_nec: '30', // 30 kg N/ha
    p_nec: '60', // 60 kg P/ha
    k_nec: '0',
    area: '10',
  };

  it('retorna null quando fertilizante é null', () => {
    expect(calcularNPK(npkInput, null)).toBeNull();
  });

  it('retorna null quando area está vazia', () => {
    expect(calcularNPK({ ...npkInput, area: '' }, fert)).toBeNull();
  });

  it('calcula dose baseada no nutriente limitante (P)', () => {
    // Dose N: 30 / (12/100) = 250 kg/ha
    // Dose P: 60 / (52/100) ≈ 115.38 kg/ha
    // Dose K: 0 (teor 0)
    // dosePorHa = max(250, 115.38, 0) = 250 kg/ha
    // total = (250 * 10) / 1000 = 2.5 t
    const result = calcularNPK(npkInput, fert);
    expect(result).not.toBeNull();
    expect(result!.dosePorHa).toBeCloseTo(250, 2);
    expect(result!.total).toBeCloseTo(2.5, 5);
    expect(result!.fertNome).toBe('MAP 12-52-0');
  });

  it('usa o nutriente com maior demanda de fertilizante como limitante', () => {
    const fert2 = { nome: 'Ureia', teor_n_percent: 45, teor_p_percent: 0, teor_k_percent: 0 };
    // Dose N: 90 / (45/100) = 200 kg/ha
    const result = calcularNPK({ ...npkInput, n_nec: '90', p_nec: '0' }, fert2);
    expect(result!.dosePorHa).toBeCloseTo(200, 2);
    expect(result!.total).toBeCloseTo(2.0, 5);
  });

  it('retorna dose zero quando todos os teores são zero', () => {
    const semTeor = { nome: 'Calcário', teor_n_percent: 0, teor_p_percent: 0, teor_k_percent: 0 };
    const result = calcularNPK(npkInput, semTeor);
    expect(result!.dosePorHa).toBe(0);
    expect(result!.total).toBe(0);
  });
});
