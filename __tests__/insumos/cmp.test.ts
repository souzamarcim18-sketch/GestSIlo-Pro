import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Implementação de Cálculo CMP (Para Testes)
// ---------------------------------------------------------------------------

interface EstoqueState {
  quantidade: number;
  custo_medio: number;
}

/**
 * Calcula novo CMP após entrada de insumo.
 * CMP = (estoque_atual * custo_medio + quantidade_entrada * valor_entrada) / (estoque_atual + quantidade_entrada)
 */
function calcularCMPEntrada(
  estoque: EstoqueState,
  quantidade_entrada: number,
  valor_unitario: number
): { novo_cmp: number; novo_estoque: number } {
  const novo_estoque = estoque.quantidade + quantidade_entrada;

  if (novo_estoque === 0) {
    return { novo_cmp: 0, novo_estoque: 0 };
  }

  const novo_cmp =
    (estoque.quantidade * estoque.custo_medio + quantidade_entrada * valor_unitario) /
    novo_estoque;

  return { novo_cmp, novo_estoque };
}

/**
 * Calcula novo estoque após saída (CMP não muda).
 */
function calcularSaida(
  estoque: EstoqueState,
  quantidade_saida: number
): { novo_estoque: number; cmp_mantido: number } {
  const novo_estoque = Math.max(0, estoque.quantidade - quantidade_saida);

  return { novo_estoque, cmp_mantido: estoque.custo_medio };
}

/**
 * Calcula novo estoque após ajuste (CMP não muda).
 */
function calcularAjuste(
  estoque: EstoqueState,
  diferenca: number
): { novo_estoque: number; cmp_mantido: number } {
  const novo_estoque = Math.max(0, estoque.quantidade + diferenca);

  return { novo_estoque, cmp_mantido: estoque.custo_medio };
}

// ---------------------------------------------------------------------------
// TESTES: CENÁRIOS DE CMP
// ---------------------------------------------------------------------------

describe('CMP Calculation — 5 Cenários Principais', () => {
  describe('Cenário 1: Primeira Entrada (Estoque Vazio)', () => {
    it('calcula CMP = valor_unitario quando estoque inicial = 0', () => {
      const estoque: EstoqueState = { quantidade: 0, custo_medio: 0 };
      const entrada = { quantidade: 100, valor: 10 };

      const { novo_cmp, novo_estoque } = calcularCMPEntrada(
        estoque,
        entrada.quantidade,
        entrada.valor
      );

      // CMP deve ser igual ao valor da primeira entrada
      expect(novo_cmp).toBeCloseTo(10, 2);
      expect(novo_estoque).toBe(100);
    });

    it('cenário real: primeira compra de Ureia', () => {
      const estoque: EstoqueState = { quantidade: 0, custo_medio: 0 };

      const { novo_cmp, novo_estoque } = calcularCMPEntrada(
        estoque,
        500, // kg
        12.5 // R$/kg
      );

      expect(novo_cmp).toBeCloseTo(12.5, 2);
      expect(novo_estoque).toBe(500);
    });
  });

  describe('Cenário 2: Entrada Subsequente (Estoque Existente)', () => {
    it('recalcula CMP com nova entrada de custo diferente', () => {
      // Estoque: 100 kg a R$10/kg (CMP=10)
      const estoque: EstoqueState = { quantidade: 100, custo_medio: 10 };

      // Nova entrada: 50 kg a R$12/kg
      const { novo_cmp, novo_estoque } = calcularCMPEntrada(
        estoque,
        50,
        12
      );

      // CMP = (100*10 + 50*12) / (100+50) = (1000+600) / 150 = 1600/150 = 10.67
      expect(novo_cmp).toBeCloseTo(10.67, 2);
      expect(novo_estoque).toBe(150);
    });

    it('cenário real: 2ª compra de Ureia com preço maior', () => {
      const estoque: EstoqueState = { quantidade: 500, custo_medio: 12.5 };

      // 2ª compra: 300 kg a R$14/kg (mais caro)
      const { novo_cmp, novo_estoque } = calcularCMPEntrada(
        estoque,
        300,
        14
      );

      // CMP = (500*12.5 + 300*14) / 800 = (6250+4200) / 800 = 10450/800 = 13.06
      expect(novo_cmp).toBeCloseTo(13.06, 2);
      expect(novo_estoque).toBe(800);
    });

    it('múltiplas entradas sequenciais', () => {
      let estoque: EstoqueState = { quantidade: 0, custo_medio: 0 };

      // Entrada 1: 100 kg @ R$10
      let resultado = calcularCMPEntrada(estoque, 100, 10);
      estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.novo_cmp };
      expect(estoque.custo_medio).toBeCloseTo(10, 2);

      // Entrada 2: 50 kg @ R$12
      resultado = calcularCMPEntrada(estoque, 50, 12);
      estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.novo_cmp };
      expect(estoque.custo_medio).toBeCloseTo(10.67, 2);

      // Entrada 3: 25 kg @ R$8 (mais barato)
      resultado = calcularCMPEntrada(estoque, 25, 8);
      estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.novo_cmp };
      expect(estoque.custo_medio).toBeCloseTo(10.286, 2);
      expect(estoque.quantidade).toBe(175);
    });
  });

  describe('Cenário 3: Saída (CMP não muda)', () => {
    it('reduz estoque mas mantém CMP', () => {
      const estoque: EstoqueState = { quantidade: 100, custo_medio: 10 };

      const { novo_estoque, cmp_mantido } = calcularSaida(estoque, 30);

      expect(novo_estoque).toBe(70);
      expect(cmp_mantido).toBe(10); // CMP não muda
    });

    it('cenário real: saída para uso interno', () => {
      const estoque: EstoqueState = { quantidade: 800, custo_medio: 13.06 };

      // Saída: 200 kg para aplicação em talhão
      const { novo_estoque, cmp_mantido } = calcularSaida(estoque, 200);

      expect(novo_estoque).toBe(600);
      expect(cmp_mantido).toBeCloseTo(13.06, 2);
    });

    it('saída parcial não afeta CMP', () => {
      const estoque: EstoqueState = { quantidade: 500, custo_medio: 12.5 };

      // Múltiplas saídas
      let resultado = calcularSaida(estoque, 100);
      expect(resultado.novo_estoque).toBe(400);
      expect(resultado.cmp_mantido).toBeCloseTo(12.5, 2);

      resultado = calcularSaida(
        { quantidade: resultado.novo_estoque, custo_medio: resultado.cmp_mantido },
        50
      );
      expect(resultado.novo_estoque).toBe(350);
      expect(resultado.cmp_mantido).toBeCloseTo(12.5, 2);
    });

    it('bloqueia saída se estoque insuficiente', () => {
      const estoque: EstoqueState = { quantidade: 50, custo_medio: 10 };

      const { novo_estoque } = calcularSaida(estoque, 100);

      // Não pode ficar negativo, reduz para 0
      expect(novo_estoque).toBe(0);
    });
  });

  describe('Cenário 4: Ajuste Positivo (+)', () => {
    it('aumenta estoque sem alterar CMP', () => {
      const estoque: EstoqueState = { quantidade: 100, custo_medio: 10 };

      // Ajuste: descoberto 20 kg extras (sinal = +1)
      const { novo_estoque, cmp_mantido } = calcularAjuste(estoque, 20);

      expect(novo_estoque).toBe(120);
      expect(cmp_mantido).toBe(10); // CMP não muda
    });

    it('cenário real: ajuste de inventário encontrado excesso', () => {
      const estoque: EstoqueState = { quantidade: 600, custo_medio: 13.06 };

      // Inventário physical: encontrado 50 kg extras
      const { novo_estoque, cmp_mantido } = calcularAjuste(estoque, 50);

      expect(novo_estoque).toBe(650);
      expect(cmp_mantido).toBeCloseTo(13.06, 2);
    });
  });

  describe('Cenário 5: Ajuste Negativo (-)', () => {
    it('reduz estoque sem alterar CMP', () => {
      const estoque: EstoqueState = { quantidade: 100, custo_medio: 10 };

      // Ajuste: faltam 10 kg (sinal = -1)
      const { novo_estoque, cmp_mantido } = calcularAjuste(estoque, -10);

      expect(novo_estoque).toBe(90);
      expect(cmp_mantido).toBe(10); // CMP não muda
    });

    it('cenário real: ajuste de inventário encontrado falta', () => {
      const estoque: EstoqueState = { quantidade: 600, custo_medio: 13.06 };

      // Inventário physical: faltam 15 kg (possível vazamento)
      const { novo_estoque, cmp_mantido } = calcularAjuste(estoque, -15);

      expect(novo_estoque).toBe(585);
      expect(cmp_mantido).toBeCloseTo(13.06, 2);
    });

    it('bloqueia ajuste negativo se resultaria em negativo', () => {
      const estoque: EstoqueState = { quantidade: 50, custo_medio: 10 };

      // Ajuste muito grande
      const { novo_estoque } = calcularAjuste(estoque, -100);

      // Não pode ficar negativo
      expect(novo_estoque).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// TESTES: FLUXO REALISTA COMPLETO
// ---------------------------------------------------------------------------

describe('CMP — Fluxo Realista Completo', () => {
  it('simula gestão de Fertilizante NPK ao longo de 3 meses', () => {
    let estoque: EstoqueState = { quantidade: 0, custo_medio: 0 };

    // Mês 1: Compra 1000 kg @ R$25/kg
    let resultado = calcularCMPEntrada(estoque, 1000, 25);
    estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.novo_cmp };
    expect(estoque.custo_medio).toBeCloseTo(25, 2);
    expect(estoque.quantidade).toBe(1000);

    // Aplicação 1: 300 kg no talhão A
    resultado = calcularSaida(estoque, 300);
    estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.cmp_mantido };
    expect(estoque.quantidade).toBe(700);
    expect(estoque.custo_medio).toBeCloseTo(25, 2);

    // Mês 2: Compra 500 kg @ R$27/kg (mais caro)
    resultado = calcularCMPEntrada(estoque, 500, 27);
    estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.novo_cmp };
    expect(estoque.custo_medio).toBeCloseTo(25.833, 0);
    expect(estoque.quantidade).toBe(1200);

    // Aplicação 2: 250 kg no talhão B
    resultado = calcularSaida(estoque, 250);
    estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.cmp_mantido };
    expect(estoque.quantidade).toBe(950);

    // Ajuste de inventário: encontrado 20kg extras (possível medição imprecisa)
    resultado = calcularAjuste(estoque, 20);
    estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.cmp_mantido };
    expect(estoque.quantidade).toBe(970);
    expect(estoque.custo_medio).toBeCloseTo(25.833, 0);

    // Mês 3: Compra 600 kg @ R$24/kg (mais barato)
    resultado = calcularCMPEntrada(estoque, 600, 24);
    estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.novo_cmp };
    expect(estoque.quantidade).toBe(1570);
    expect(estoque.custo_medio).toBeCloseTo(25.18, 1); // (~25.18)

    // Aplicação final: 400 kg
    resultado = calcularSaida(estoque, 400);
    estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.cmp_mantido };
    expect(estoque.quantidade).toBe(1170);

    // Final: Ajuste negativo (perda detectada)
    resultado = calcularAjuste(estoque, -30);
    estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.cmp_mantido };
    expect(estoque.quantidade).toBe(1140);
  });

  it('simula gestão de Defensivo (volume menor, preços volatilidade maior)', () => {
    let estoque: EstoqueState = { quantidade: 0, custo_medio: 0 };

    // Compra inicial: 100 L @ R$150/L
    let resultado = calcularCMPEntrada(estoque, 100, 150);
    estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.novo_cmp };
    expect(estoque.custo_medio).toBeCloseTo(150, 2);

    // Aplicação 1: 25 L
    resultado = calcularSaida(estoque, 25);
    estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.cmp_mantido };
    expect(estoque.quantidade).toBe(75);

    // Compra 2: 50 L @ R$145/L (mais barato)
    resultado = calcularCMPEntrada(estoque, 50, 145);
    estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.novo_cmp };
    expect(estoque.custo_medio).toBeCloseTo(148, 0);
    expect(estoque.quantidade).toBe(125);

    // Aplicação 2: 30 L
    resultado = calcularSaida(estoque, 30);
    estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.cmp_mantido };
    expect(estoque.quantidade).toBe(95);

    // Compra 3: 80 L @ R$160/L (muito mais caro, possível escassez)
    resultado = calcularCMPEntrada(estoque, 80, 160);
    estoque = { quantidade: resultado.novo_estoque, custo_medio: resultado.novo_cmp };
    expect(estoque.quantidade).toBe(175);
    expect(estoque.custo_medio).toBeCloseTo(153.49, 0);
  });
});

// ---------------------------------------------------------------------------
// TESTES: EDGE CASES E PRECISÃO
// ---------------------------------------------------------------------------

describe('CMP — Edge Cases', () => {
  it('lida com valores muito pequenos (decimais)', () => {
    const estoque: EstoqueState = { quantidade: 0.001, custo_medio: 1000 };

    const { novo_cmp } = calcularCMPEntrada(estoque, 0.001, 2000);

    // (0.001*1000 + 0.001*2000) / (0.001+0.001) = 3 / 0.002 = 1500
    expect(novo_cmp).toBeCloseTo(1500, 0);
  });

  it('lida com valores muito grandes', () => {
    const estoque: EstoqueState = { quantidade: 100000, custo_medio: 100 };

    const { novo_cmp, novo_estoque } = calcularCMPEntrada(
      estoque,
      1000000,
      110
    );

    // (100000*100 + 1000000*110) / 1100000 = 11000000 / 1100000 = 10
    expect(novo_cmp).toBeCloseTo(109.09, 1);
    expect(novo_estoque).toBe(1100000);
  });

  it('CMP = 0 quando entradas com valor_unitario = 0 (doações)', () => {
    const estoque: EstoqueState = { quantidade: 0, custo_medio: 0 };

    const { novo_cmp } = calcularCMPEntrada(estoque, 100, 0);

    expect(novo_cmp).toBeCloseTo(0, 2);
  });

  it('CMP aumenta se próxima entrada é mais cara', () => {
    const estoque: EstoqueState = { quantidade: 100, custo_medio: 10 };

    const { novo_cmp: cmp_antes } = calcularCMPEntrada(estoque, 100, 10);
    const { novo_cmp: cmp_depois } = calcularCMPEntrada(estoque, 100, 20);

    expect(cmp_depois).toBeGreaterThan(cmp_antes);
  });

  it('CMP diminui se próxima entrada é mais barata', () => {
    const estoque: EstoqueState = { quantidade: 100, custo_medio: 20 };

    const { novo_cmp: cmp_antes } = calcularCMPEntrada(estoque, 100, 20);
    const { novo_cmp: cmp_depois } = calcularCMPEntrada(estoque, 100, 10);

    expect(cmp_depois).toBeLessThan(cmp_antes);
  });
});
