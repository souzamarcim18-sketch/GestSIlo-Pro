import { describe, it, expect } from 'vitest';
import {
  calcularDepreciacaoPorHora,
  calcularCustoCombustivelPorHora,
  calcularCustoManutencaoPorHora,
  calcularCustoTotalPorHora,
  calcularConsumoMedioReal,
  detectarAnomaliaConsumo,
  calcularRendimentoOperacional,
  verificarAlertaPlanoManutencao,
  filtrarManutencoesPorPeriodo,
  agruparCustosPorMaquina,
} from '../utils/frota';
import type { Maquina, UsoMaquina, Manutencao, Abastecimento, PlanoManutencao } from '../supabase';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeMaquina(overrides: Partial<Maquina> = {}): Maquina {
  return {
    id: 'maq-1',
    nome: 'Trator Teste',
    tipo: 'Trator',
    marca: 'John Deere',
    modelo: '5075E',
    ano: 2020,
    identificacao: null,
    fazenda_id: 'fazenda-1',
    consumo_medio_lh: 8,
    valor_aquisicao: 200000,
    data_aquisicao: '2020-01-01',
    vida_util_anos: 10,
    status: 'Ativo',
    numero_serie: null,
    placa: null,
    potencia_cv: 75,
    horimetro_atual: 1000,
    valor_residual: 50000,
    vida_util_horas: null,
    largura_trabalho_metros: null,
    tratores_compativeis: null,
    ...overrides,
  };
}

function makeUso(overrides: Partial<UsoMaquina> = {}): UsoMaquina {
  return {
    id: 'uso-1',
    maquina_id: 'maq-1',
    data: '2026-01-01',
    operador: 'Operador 1',
    atividade: 'Aração',
    horas: 8,
    km: null,
    horimetro_inicio: null,
    horimetro_fim: null,
    implemento_id: null,
    talhao_id: null,
    tipo_operacao: null,
    area_ha: null,
    origem: 'manual',
    ...overrides,
  };
}

function makeManutencao(overrides: Partial<Manutencao> = {}): Manutencao {
  return {
    id: 'man-1',
    maquina_id: 'maq-1',
    data: '2026-01-15',
    tipo: 'Preventiva',
    descricao: 'Troca de óleo',
    custo: 500,
    proxima_manutencao: null,
    status: 'concluída',
    data_prevista: '2026-01-15',
    data_realizada: '2026-01-15',
    horimetro: null,
    proxima_manutencao_horimetro: null,
    responsavel: null,
    mao_de_obra_tipo: null,
    mao_de_obra_valor: null,
    pecas: null,
    ...overrides,
  };
}

function makeAbastecimento(overrides: Partial<Abastecimento> = {}): Abastecimento {
  return {
    id: 'abs-1',
    maquina_id: 'maq-1',
    data: '2026-01-10',
    combustivel: 'Diesel',
    litros: 100,
    valor: 600,
    hodometro: null,
    preco_litro: 6.0,
    fornecedor: null,
    horimetro: null,
    ...overrides,
  };
}

function makePlano(overrides: Partial<PlanoManutencao> = {}): PlanoManutencao {
  return {
    id: 'plano-1',
    maquina_id: 'maq-1',
    descricao: 'Troca de óleo a cada 250h',
    intervalo_horas: 250,
    intervalo_dias: null,
    horimetro_base: 1000,
    data_base: null,
    ativo: true,
    fazenda_id: 'fazenda-1',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── calcularDepreciacaoPorHora ────────────────────────────────────────────────

describe('calcularDepreciacaoPorHora', () => {
  it('calcula corretamente com dados completos', () => {
    const maquina = makeMaquina({ valor_aquisicao: 200000, valor_residual: 50000, vida_util_anos: 10 });
    // (200000 - 50000) / 10 / 2000 = 7.5
    expect(calcularDepreciacaoPorHora(maquina, 2000)).toBeCloseTo(7.5);
  });

  it('retorna 0 quando horasNoAno é 0', () => {
    const maquina = makeMaquina();
    expect(calcularDepreciacaoPorHora(maquina, 0)).toBe(0);
  });

  it('retorna 0 quando valor_aquisicao é null', () => {
    const maquina = makeMaquina({ valor_aquisicao: null });
    expect(calcularDepreciacaoPorHora(maquina, 2000)).toBe(0);
  });

  it('retorna 0 quando vida_util_anos é null', () => {
    const maquina = makeMaquina({ vida_util_anos: null });
    expect(calcularDepreciacaoPorHora(maquina, 2000)).toBe(0);
  });

  it('retorna 0 quando vida_util_anos é 0 (evita divisão por zero)', () => {
    const maquina = makeMaquina({ vida_util_anos: 0 });
    expect(calcularDepreciacaoPorHora(maquina, 2000)).toBe(0);
  });

  it('usa 0 como residual quando valor_residual é null', () => {
    const maquina = makeMaquina({ valor_aquisicao: 100000, valor_residual: null, vida_util_anos: 10 });
    // (100000 - 0) / 10 / 1000 = 10
    expect(calcularDepreciacaoPorHora(maquina, 1000)).toBeCloseTo(10);
  });
});

// ── calcularCustoCombustivelPorHora ──────────────────────────────────────────

describe('calcularCustoCombustivelPorHora', () => {
  it('calcula corretamente com dados completos', () => {
    const abastecimentos = [makeAbastecimento({ valor: 600 }), makeAbastecimento({ valor: 400 })];
    // (600 + 400) / 100 = 10
    expect(calcularCustoCombustivelPorHora(abastecimentos, 100)).toBeCloseTo(10);
  });

  it('retorna 0 quando horasTotais é 0', () => {
    const abastecimentos = [makeAbastecimento({ valor: 600 })];
    expect(calcularCustoCombustivelPorHora(abastecimentos, 0)).toBe(0);
  });

  it('retorna 0 com array vazio', () => {
    expect(calcularCustoCombustivelPorHora([], 100)).toBe(0);
  });

  it('trata valor null como 0', () => {
    const abastecimentos = [makeAbastecimento({ valor: null }), makeAbastecimento({ valor: 400 })];
    expect(calcularCustoCombustivelPorHora(abastecimentos, 100)).toBeCloseTo(4);
  });
});

// ── calcularCustoManutencaoPorHora ────────────────────────────────────────────

describe('calcularCustoManutencaoPorHora', () => {
  it('calcula corretamente com dados completos', () => {
    const manutencoes = [makeManutencao({ custo: 500 }), makeManutencao({ custo: 300 })];
    // (500 + 300) / 200 = 4
    expect(calcularCustoManutencaoPorHora(manutencoes, 200)).toBeCloseTo(4);
  });

  it('retorna 0 quando horasTotais é 0', () => {
    const manutencoes = [makeManutencao({ custo: 500 })];
    expect(calcularCustoManutencaoPorHora(manutencoes, 0)).toBe(0);
  });

  it('retorna 0 com array vazio', () => {
    expect(calcularCustoManutencaoPorHora([], 200)).toBe(0);
  });

  it('trata custo null como 0', () => {
    const manutencoes = [makeManutencao({ custo: null }), makeManutencao({ custo: 300 })];
    expect(calcularCustoManutencaoPorHora(manutencoes, 100)).toBeCloseTo(3);
  });
});

// ── calcularCustoTotalPorHora ────────────────────────────────────────────────

describe('calcularCustoTotalPorHora', () => {
  it('agrega corretamente os três componentes', () => {
    const maquina = makeMaquina({ valor_aquisicao: 100000, valor_residual: 0, vida_util_anos: 10 });
    const abastecimentos = [makeAbastecimento({ valor: 1000 })];
    const manutencoes = [makeManutencao({ custo: 500 })];
    const result = calcularCustoTotalPorHora({ maquina, abastecimentos, manutencoes, horasNoAno: 100 });
    // fixo: 100000 / 10 / 100 = 100
    // combustivel: 1000 / 100 = 10
    // manutencao: 500 / 100 = 5
    // total: 115
    expect(result.fixo).toBeCloseTo(100);
    expect(result.combustivel).toBeCloseTo(10);
    expect(result.manutencao).toBeCloseTo(5);
    expect(result.total).toBeCloseTo(115);
  });

  it('retorna zeros quando horasNoAno é 0', () => {
    const maquina = makeMaquina();
    const result = calcularCustoTotalPorHora({ maquina, abastecimentos: [], manutencoes: [], horasNoAno: 0 });
    expect(result.fixo).toBe(0);
    expect(result.combustivel).toBe(0);
    expect(result.manutencao).toBe(0);
    expect(result.total).toBe(0);
  });
});

// ── calcularConsumoMedioReal ─────────────────────────────────────────────────

describe('calcularConsumoMedioReal', () => {
  it('calcula consumo médio corretamente', () => {
    const abastecimentos = [makeAbastecimento({ litros: 80 }), makeAbastecimento({ litros: 120 })];
    const usos = [makeUso({ horas: 10 }), makeUso({ horas: 15 })];
    // (80 + 120) / (10 + 15) = 200 / 25 = 8
    expect(calcularConsumoMedioReal(abastecimentos, usos)).toBeCloseTo(8);
  });

  it('retorna null quando total de horas é 0', () => {
    const abastecimentos = [makeAbastecimento({ litros: 100 })];
    const usos = [makeUso({ horas: 0 })];
    expect(calcularConsumoMedioReal(abastecimentos, usos)).toBeNull();
  });

  it('retorna null com array de usos vazio', () => {
    const abastecimentos = [makeAbastecimento({ litros: 100 })];
    expect(calcularConsumoMedioReal(abastecimentos, [])).toBeNull();
  });

  it('retorna 0 com abastecimentos vazios mas horas positivas', () => {
    const usos = [makeUso({ horas: 10 })];
    expect(calcularConsumoMedioReal([], usos)).toBeCloseTo(0);
  });

  it('trata litros null como 0', () => {
    const abastecimentos = [makeAbastecimento({ litros: null }), makeAbastecimento({ litros: 50 })];
    const usos = [makeUso({ horas: 10 })];
    expect(calcularConsumoMedioReal(abastecimentos, usos)).toBeCloseTo(5);
  });
});

// ── detectarAnomaliaConsumo ──────────────────────────────────────────────────

describe('detectarAnomaliaConsumo', () => {
  it('retorna true quando consumo supera 30% da média', () => {
    expect(detectarAnomaliaConsumo(13.5, 10)).toBe(true);
  });

  it('retorna false quando consumo está dentro do limiar padrão', () => {
    expect(detectarAnomaliaConsumo(12.9, 10)).toBe(false);
  });

  it('retorna false quando mediaHistorica é 0', () => {
    expect(detectarAnomaliaConsumo(100, 0)).toBe(false);
  });

  it('retorna false quando mediaHistorica é negativa', () => {
    expect(detectarAnomaliaConsumo(5, -10)).toBe(false);
  });

  it('usa limiar customizado de 50%', () => {
    expect(detectarAnomaliaConsumo(14, 10, 0.5)).toBe(false);
    expect(detectarAnomaliaConsumo(16, 10, 0.5)).toBe(true);
  });

  it('usa limiar customizado de 10%', () => {
    // 10 * 1.1 = 11.0 — exatamente no limiar não é anomalia (operador >)
    expect(detectarAnomaliaConsumo(11, 10, 0.1)).toBe(false);
    // acima do limiar = anomalia
    expect(detectarAnomaliaConsumo(11.1, 10, 0.1)).toBe(true);
    expect(detectarAnomaliaConsumo(10.9, 10, 0.1)).toBe(false);
  });
});

// ── calcularRendimentoOperacional ────────────────────────────────────────────

describe('calcularRendimentoOperacional', () => {
  it('calcula corretamente com dados completos', () => {
    const uso = makeUso({ area_ha: 20, horas: 5 });
    expect(calcularRendimentoOperacional(uso)).toBeCloseTo(4);
  });

  it('retorna null quando horas é 0', () => {
    const uso = makeUso({ area_ha: 20, horas: 0 });
    expect(calcularRendimentoOperacional(uso)).toBeNull();
  });

  it('retorna null quando area_ha é null', () => {
    const uso = makeUso({ area_ha: null, horas: 5 });
    expect(calcularRendimentoOperacional(uso)).toBeNull();
  });

  it('retorna null quando horas é null', () => {
    const uso = makeUso({ area_ha: 20, horas: null });
    expect(calcularRendimentoOperacional(uso)).toBeNull();
  });
});

// ── verificarAlertaPlanoManutencao ───────────────────────────────────────────

describe('verificarAlertaPlanoManutencao', () => {
  it('retorna sem alerta quando longe da manutenção', () => {
    const plano = makePlano({ intervalo_horas: 250, horimetro_base: 1000 });
    // próxima = 1250, atual = 1050, restante = 200 (> 25h = 10%)
    const resultado = verificarAlertaPlanoManutencao(plano, 1050);
    expect(resultado.emAlerta).toBe(false);
    expect(resultado.urgente).toBe(false);
    expect(resultado.horasRestantes).toBeCloseTo(200);
  });

  it('retorna emAlerta quando dentro dos 10% do intervalo', () => {
    const plano = makePlano({ intervalo_horas: 250, horimetro_base: 1000 });
    // próxima = 1250, atual = 1230, restante = 20 (<= 25 = 10% de 250)
    const resultado = verificarAlertaPlanoManutencao(plano, 1230);
    expect(resultado.emAlerta).toBe(true);
    expect(resultado.urgente).toBe(false);
    expect(resultado.horasRestantes).toBeCloseTo(20);
  });

  it('retorna urgente quando manutenção está vencida', () => {
    const plano = makePlano({ intervalo_horas: 250, horimetro_base: 1000 });
    // próxima = 1250, atual = 1260, restante = -10
    const resultado = verificarAlertaPlanoManutencao(plano, 1260);
    expect(resultado.emAlerta).toBe(true);
    expect(resultado.urgente).toBe(true);
    expect(resultado.horasRestantes).toBeCloseTo(-10);
  });

  it('retorna null horasRestantes quando intervalo_horas é null', () => {
    const plano = makePlano({ intervalo_horas: null });
    const resultado = verificarAlertaPlanoManutencao(plano, 1100);
    expect(resultado.emAlerta).toBe(false);
    expect(resultado.urgente).toBe(false);
    expect(resultado.horasRestantes).toBeNull();
  });

  it('retorna null horasRestantes quando horimetro_base é null', () => {
    const plano = makePlano({ horimetro_base: null });
    const resultado = verificarAlertaPlanoManutencao(plano, 1100);
    expect(resultado.emAlerta).toBe(false);
    expect(resultado.urgente).toBe(false);
    expect(resultado.horasRestantes).toBeNull();
  });
});

// ── filtrarManutencoesPorPeriodo ─────────────────────────────────────────────

describe('filtrarManutencoesPorPeriodo', () => {
  const inicio = new Date('2026-01-01');
  const fim = new Date('2026-01-31');

  it('retorna manutenções com data_realizada no período', () => {
    const mants = [
      makeManutencao({ data_realizada: '2026-01-15', data_prevista: null }),
      makeManutencao({ id: 'man-2', data_realizada: '2026-02-10', data_prevista: null }),
    ];
    const resultado = filtrarManutencoesPorPeriodo(mants, inicio, fim);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('man-1');
  });

  it('usa data_prevista como fallback quando data_realizada é null', () => {
    const mants = [
      makeManutencao({ data_realizada: null, data_prevista: '2026-01-20' }),
      makeManutencao({ id: 'man-2', data_realizada: null, data_prevista: '2026-02-05' }),
    ];
    const resultado = filtrarManutencoesPorPeriodo(mants, inicio, fim);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('man-1');
  });

  it('retorna array vazio quando nenhuma manutenção está no período', () => {
    const mants = [makeManutencao({ data_realizada: '2025-12-01', data_prevista: null })];
    expect(filtrarManutencoesPorPeriodo(mants, inicio, fim)).toHaveLength(0);
  });

  it('retorna array vazio com entrada vazia', () => {
    expect(filtrarManutencoesPorPeriodo([], inicio, fim)).toHaveLength(0);
  });

  it('descarta manutenções sem datas', () => {
    const mants = [makeManutencao({ data_realizada: null, data_prevista: null })];
    expect(filtrarManutencoesPorPeriodo(mants, inicio, fim)).toHaveLength(0);
  });
});

// ── agruparCustosPorMaquina ──────────────────────────────────────────────────

describe('agruparCustosPorMaquina', () => {
  it('retorna uma linha por máquina com ranking correto', () => {
    const maq1 = makeMaquina({ id: 'maq-1', valor_aquisicao: 100000, vida_util_anos: 10, valor_residual: 0 });
    const maq2 = makeMaquina({ id: 'maq-2', nome: 'Colheitadeira', valor_aquisicao: 50000, vida_util_anos: 10, valor_residual: 0 });
    const abastecimentos = [makeAbastecimento({ maquina_id: 'maq-1', valor: 2000 })];
    const manutencoes = [makeManutencao({ maquina_id: 'maq-1', custo: 1000 })];
    const usos = [makeUso({ maquina_id: 'maq-1', horas: 100 }), makeUso({ id: 'uso-2', maquina_id: 'maq-2', horas: 50 })];

    const resultado = agruparCustosPorMaquina([maq1, maq2], abastecimentos, manutencoes, usos);
    expect(resultado).toHaveLength(2);
    expect(resultado[0].ranking).toBe(1);
    expect(resultado[1].ranking).toBe(2);
    expect(resultado[0].custoHora.total).toBeGreaterThan(resultado[1].custoHora.total);
  });

  it('retorna array vazio quando não há máquinas', () => {
    expect(agruparCustosPorMaquina([], [], [], [])).toHaveLength(0);
  });

  it('atribui horasTotais corretos por máquina', () => {
    const maq = makeMaquina();
    const usos = [makeUso({ horas: 40 }), makeUso({ id: 'uso-2', horas: 60 })];
    const resultado = agruparCustosPorMaquina([maq], [], [], usos);
    expect(resultado[0].horasTotais).toBeCloseTo(100);
  });

  it('trata horas null como 0 no total', () => {
    const maq = makeMaquina();
    const usos = [makeUso({ horas: null }), makeUso({ id: 'uso-2', horas: 50 })];
    const resultado = agruparCustosPorMaquina([maq], [], [], usos);
    expect(resultado[0].horasTotais).toBeCloseTo(50);
  });
});
