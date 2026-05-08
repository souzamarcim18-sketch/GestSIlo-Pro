import { describe, it, expect } from 'vitest';
import {
  // Helpers
  isBezerro,
  isNovilha,
  isNovilho,
  isVaca,
  isTouro,
  isBoi,
  isDescarte,
  isVacaProdutiva,
  isVacaMatriz,
  // Constantes
  CATEGORIAS_BEZERROS,
  CATEGORIAS_NOVILHAS,
  CATEGORIAS_VACAS,
  CATEGORIAS_DESCARTE,
  // Composição
  calcularComposicaoRebanho,
  contarPorFaixaEtaria,
  // Taxas
  calcularTaxaNatalidade,
  calcularTaxaMortalidade,
  calcularTaxaMortalidadeBezerros,
  calcularTaxaDesfrute,
  calcularTaxaDescarte,
  // GMD
  calcularGMDAnimal,
  calcularGMDMedioRebanho,
  // Reprodutivos
  calcularIdadePrimeiroParto,
  calcularIntervaloEntrePartos,
} from '../indicadores-rebanho';
import type { Animal, EventoRebanho, PesoAnimal } from '@/lib/types/rebanho';

// ========== HELPERS DE CATEGORIA ==========

describe('Helpers de categoria', () => {
  it('isBezerro deve retornar true para Bezerro e Bezerra', () => {
    expect(isBezerro('Bezerro')).toBe(true);
    expect(isBezerro('Bezerra')).toBe(true);
    expect(isBezerro('Novilho')).toBe(false);
  });

  it('isNovilha deve retornar true para Novilha e Novilha Prenha', () => {
    expect(isNovilha('Novilha')).toBe(true);
    expect(isNovilha('Novilha Prenha')).toBe(true);
    expect(isNovilha('Vaca em Lactação')).toBe(false);
  });

  it('isNovilho deve retornar true apenas para Novilho', () => {
    expect(isNovilho('Novilho')).toBe(true);
    expect(isNovilho('Novilha')).toBe(false);
  });

  it('isVaca deve retornar true para todas as categorias de vaca', () => {
    expect(isVaca('Vaca em Lactação')).toBe(true);
    expect(isVaca('Vaca Seca')).toBe(true);
    expect(isVaca('Vaca Prenha')).toBe(true);
    expect(isVaca('Vaca Vazia')).toBe(true);
    expect(isVaca('Vaca Matriz')).toBe(true);
    expect(isVaca('Novilha')).toBe(false);
  });

  it('isTouro deve retornar true apenas para Touro', () => {
    expect(isTouro('Touro')).toBe(true);
    expect(isTouro('Boi')).toBe(false);
  });

  it('isBoi deve retornar true para Boi e Boi Descartado', () => {
    expect(isBoi('Boi')).toBe(true);
    expect(isBoi('Boi Descartado')).toBe(true);
    expect(isBoi('Touro')).toBe(false);
  });

  it('isDescarte deve retornar true para categorias descartadas', () => {
    expect(isDescarte('Boi Descartado')).toBe(true);
    expect(isDescarte('Fêmea Descartada')).toBe(true);
    expect(isDescarte('Boi')).toBe(false);
  });

  it('isVacaProdutiva deve retornar true para vacas leiteiras', () => {
    expect(isVacaProdutiva('Vaca em Lactação')).toBe(true);
    expect(isVacaProdutiva('Vaca Seca')).toBe(true);
    expect(isVacaProdutiva('Vaca Prenha')).toBe(true);
    expect(isVacaProdutiva('Vaca Vazia')).toBe(true);
    expect(isVacaProdutiva('Vaca Matriz')).toBe(false);
  });

  it('isVacaMatriz deve retornar true apenas para Vaca Matriz', () => {
    expect(isVacaMatriz('Vaca Matriz')).toBe(true);
    expect(isVacaMatriz('Vaca em Lactação')).toBe(false);
  });
});

// ========== CONSTANTES ==========

describe('Constantes de categorias', () => {
  it('CATEGORIAS_BEZERROS deve conter exatamente 2 valores', () => {
    expect(CATEGORIAS_BEZERROS).toEqual(['Bezerro', 'Bezerra']);
  });

  it('CATEGORIAS_NOVILHAS deve conter exatamente 2 valores', () => {
    expect(CATEGORIAS_NOVILHAS).toEqual(['Novilha', 'Novilha Prenha']);
  });

  it('CATEGORIAS_VACAS deve incluir todas as vacas (leiteiras + corte)', () => {
    expect(CATEGORIAS_VACAS).toContain('Vaca em Lactação');
    expect(CATEGORIAS_VACAS).toContain('Vaca Matriz');
    expect(CATEGORIAS_VACAS.length).toBeGreaterThan(2);
  });

  it('CATEGORIAS_DESCARTE deve conter categorias descartadas', () => {
    expect(CATEGORIAS_DESCARTE).toContain('Boi Descartado');
    expect(CATEGORIAS_DESCARTE).toContain('Fêmea Descartada');
  });
});

// ========== COMPOSIÇÃO REBANHO ==========

describe('calcularComposicaoRebanho', () => {
  it('deve calcular corretamente com animais mistos', () => {
    const animais: Pick<Animal, 'categoria' | 'sexo' | 'tipo_rebanho'>[] = [
      { categoria: 'Bezerro', sexo: 'Macho', tipo_rebanho: 'leiteiro' },
      { categoria: 'Bezerra', sexo: 'Fêmea', tipo_rebanho: 'leiteiro' },
      { categoria: 'Vaca em Lactação', sexo: 'Fêmea', tipo_rebanho: 'leiteiro' },
      { categoria: 'Boi', sexo: 'Macho', tipo_rebanho: 'corte' },
    ];

    const resultado = calcularComposicaoRebanho(animais);

    expect(resultado.total).toBe(4);
    expect(resultado.por_categoria['Bezerro']).toBe(1);
    expect(resultado.por_categoria['Bezerra']).toBe(1);
    expect(resultado.por_categoria['Vaca em Lactação']).toBe(1);
    expect(resultado.por_categoria['Boi']).toBe(1);
    expect(resultado.por_sexo.Macho).toBe(2);
    expect(resultado.por_sexo.Fêmea).toBe(2);
    expect(resultado.por_vocacao.leiteiro).toBe(3);
    expect(resultado.por_vocacao.corte).toBe(1);
  });

  it('deve retornar zeros para rebanho vazio', () => {
    const resultado = calcularComposicaoRebanho([]);

    expect(resultado.total).toBe(0);
    expect(resultado.por_sexo.Macho).toBe(0);
    expect(resultado.por_sexo.Fêmea).toBe(0);
    expect(resultado.por_vocacao.leiteiro).toBe(0);
    expect(resultado.por_vocacao.corte).toBe(0);
  });

  it('deve agrupar corretamente múltiplos animais da mesma categoria', () => {
    const animais: Pick<Animal, 'categoria' | 'sexo' | 'tipo_rebanho'>[] = [
      { categoria: 'Vaca em Lactação', sexo: 'Fêmea', tipo_rebanho: 'leiteiro' },
      { categoria: 'Vaca em Lactação', sexo: 'Fêmea', tipo_rebanho: 'leiteiro' },
      { categoria: 'Vaca em Lactação', sexo: 'Fêmea', tipo_rebanho: 'leiteiro' },
    ];

    const resultado = calcularComposicaoRebanho(animais);

    expect(resultado.por_categoria['Vaca em Lactação']).toBe(3);
  });
});

// ========== CONTAGEM POR FAIXA ETÁRIA ==========

describe('contarPorFaixaEtaria', () => {
  it('deve contar corretamente por faixa etária', () => {
    const animais: Pick<Animal, 'categoria'>[] = [
      { categoria: 'Bezerro' },
      { categoria: 'Bezerra' },
      { categoria: 'Novilha' },
      { categoria: 'Vaca em Lactação' },
      { categoria: 'Boi' },
      { categoria: 'Boi Descartado' },
      { categoria: 'Touro' },
    ];

    const resultado = contarPorFaixaEtaria(animais);

    expect(resultado.bezerros).toBe(2);
    expect(resultado.novilhas).toBe(1);
    expect(resultado.vacas).toBe(1);
    expect(resultado.reprodutores).toBe(1);
    expect(resultado.engorda).toBe(1);
    expect(resultado.descarte).toBe(1);
  });

  it('deve retornar zeros para rebanho vazio', () => {
    const resultado = contarPorFaixaEtaria([]);

    expect(resultado.bezerros).toBe(0);
    expect(resultado.novilhas).toBe(0);
    expect(resultado.vacas).toBe(0);
    expect(resultado.reprodutores).toBe(0);
    expect(resultado.engorda).toBe(0);
    expect(resultado.descarte).toBe(0);
  });

  it('deve diferenciar entre engorda e descarte de bois', () => {
    const animais: Pick<Animal, 'categoria'>[] = [
      { categoria: 'Boi' }, // engorda
      { categoria: 'Boi Descartado' }, // descarte
    ];

    const resultado = contarPorFaixaEtaria(animais);

    expect(resultado.engorda).toBe(1);
    expect(resultado.descarte).toBe(1);
  });

  it('deve contar novilhos corretamente', () => {
    const animais: Pick<Animal, 'categoria'>[] = [
      { categoria: 'Novilho' },
      { categoria: 'Novilho' },
    ];

    const resultado = contarPorFaixaEtaria(animais);

    expect(resultado.novilhos).toBe(2);
    expect(resultado.bezerros).toBe(0);
  });
});

// ========== TAXAS ==========

describe('calcularTaxaNatalidade', () => {
  it('deve calcular taxa de natalidade corretamente', () => {
    const eventos: Pick<EventoRebanho, 'tipo'>[] = [
      { tipo: 'nascimento' },
      { tipo: 'nascimento' },
      { tipo: 'pesagem' },
    ];

    const resultado = calcularTaxaNatalidade(eventos, 10);

    expect(resultado.numerador).toBe(2);
    expect(resultado.denominador).toBe(10);
    expect(resultado.taxa_percentual).toBe(20);
  });

  it('deve retornar 0% quando denominador é zero', () => {
    const eventos: Pick<EventoRebanho, 'tipo'>[] = [{ tipo: 'nascimento' }];

    const resultado = calcularTaxaNatalidade(eventos, 0);

    expect(resultado.taxa_percentual).toBe(0);
  });

  it('deve ignorar eventos que não são nascimento', () => {
    const eventos: Pick<EventoRebanho, 'tipo'>[] = [
      { tipo: 'morte' },
      { tipo: 'venda' },
      { tipo: 'pesagem' },
    ];

    const resultado = calcularTaxaNatalidade(eventos, 10);

    expect(resultado.numerador).toBe(0);
    expect(resultado.taxa_percentual).toBe(0);
  });
});

describe('calcularTaxaMortalidade', () => {
  it('deve calcular taxa de mortalidade com rebanho médio', () => {
    const eventos: Pick<EventoRebanho, 'tipo'>[] = [
      { tipo: 'morte' },
      { tipo: 'morte' },
      { tipo: 'pesagem' },
    ];

    const resultado = calcularTaxaMortalidade(eventos, 100, 98);

    const rebanhoMedio = (100 + 98) / 2; // 99
    expect(resultado.numerador).toBe(2);
    expect(resultado.denominador).toBe(99);
    expect(resultado.taxa_percentual).toBeCloseTo((2 / 99) * 100, 1);
  });

  it('deve proteger contra divisão por zero', () => {
    const eventos: Pick<EventoRebanho, 'tipo'>[] = [];

    const resultado = calcularTaxaMortalidade(eventos, 0, 0);

    expect(resultado.taxa_percentual).toBe(0);
  });

  it('deve contar apenas eventos de morte', () => {
    const eventos: Pick<EventoRebanho, 'tipo'>[] = [
      { tipo: 'morte' },
      { tipo: 'venda' },
      { tipo: 'nascimento' },
    ];

    const resultado = calcularTaxaMortalidade(eventos, 100, 97);

    expect(resultado.numerador).toBe(1);
  });
});

describe('calcularTaxaMortalidadeBezerros', () => {
  it('deve calcular taxa de mortalidade de bezerros', () => {
    const eventos: Pick<EventoRebanho, 'tipo'>[] = [
      { tipo: 'nascimento' },
      { tipo: 'nascimento' },
      { tipo: 'nascimento' },
      { tipo: 'morte' },
    ];

    const resultado = calcularTaxaMortalidadeBezerros(eventos);

    expect(resultado.numerador).toBe(1);
    expect(resultado.denominador).toBe(3);
    expect(resultado.taxa_percentual).toBeCloseTo(33.33, 1);
  });

  it('deve retornar 0% quando não há nascimentos', () => {
    const eventos: Pick<EventoRebanho, 'tipo'>[] = [{ tipo: 'morte' }];

    const resultado = calcularTaxaMortalidadeBezerros(eventos);

    expect(resultado.taxa_percentual).toBe(0);
  });
});

describe('calcularTaxaDesfrute', () => {
  it('deve calcular vendas + mortes / rebanho médio', () => {
    const eventos: Pick<EventoRebanho, 'tipo'>[] = [
      { tipo: 'venda' },
      { tipo: 'venda' },
      { tipo: 'morte' },
      { tipo: 'pesagem' },
    ];

    const resultado = calcularTaxaDesfrute(eventos, 100, 95);

    const rebanhoMedio = (100 + 95) / 2; // 97.5
    expect(resultado.numerador).toBe(3); // 2 vendas + 1 morte
    expect(resultado.taxa_percentual).toBeCloseTo((3 / rebanhoMedio) * 100, 1);
  });

  it('deve proteger contra denominador zero', () => {
    const eventos: Pick<EventoRebanho, 'tipo'>[] = [{ tipo: 'venda' }];

    const resultado = calcularTaxaDesfrute(eventos, 0, 0);

    expect(resultado.taxa_percentual).toBe(0);
  });
});

describe('calcularTaxaDescarte', () => {
  it('deve calcular descartados / total', () => {
    const animais: Pick<Animal, 'categoria'>[] = [
      { categoria: 'Boi Descartado' },
      { categoria: 'Fêmea Descartada' },
      { categoria: 'Boi' },
      { categoria: 'Vaca em Lactação' },
    ];

    const resultado = calcularTaxaDescarte(animais);

    expect(resultado.numerador).toBe(2);
    expect(resultado.denominador).toBe(4);
    expect(resultado.taxa_percentual).toBe(50);
  });

  it('deve retornar 0% em rebanho vazio', () => {
    const resultado = calcularTaxaDescarte([]);

    expect(resultado.taxa_percentual).toBe(0);
  });

  it('deve considerar apenas categorias exatas de descarte', () => {
    const animais: Pick<Animal, 'categoria'>[] = [
      { categoria: 'Boi' }, // engorda, não descarte
      { categoria: 'Boi Descartado' }, // descarte
    ];

    const resultado = calcularTaxaDescarte(animais);

    expect(resultado.numerador).toBe(1);
  });
});

// ========== GMD ==========

describe('calcularGMDAnimal', () => {
  it('deve calcular GMD corretamente com 2 pesagens', () => {
    const pesagens: Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[] = [
      { data_pesagem: '2026-05-01', peso_kg: 100 },
      { data_pesagem: '2026-05-11', peso_kg: 110 }, // 10 dias depois
    ];

    const gmd = calcularGMDAnimal(pesagens, {
      dataInicio: '2026-05-01',
      dataFim: '2026-05-11',
    });

    expect(gmd).toBeCloseTo(1.0, 1); // (110 - 100) / 10 = 1.0 kg/dia
  });

  it('deve retornar null se menos de 2 pesagens no período', () => {
    const pesagens: Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[] = [
      { data_pesagem: '2026-05-01', peso_kg: 100 },
    ];

    const gmd = calcularGMDAnimal(pesagens, {
      dataInicio: '2026-05-01',
      dataFim: '2026-05-11',
    });

    expect(gmd).toBeNull();
  });

  it('deve filtrar pesagens fora do período', () => {
    const pesagens: Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[] = [
      { data_pesagem: '2026-04-30', peso_kg: 90 }, // antes do período
      { data_pesagem: '2026-05-05', peso_kg: 100 },
      { data_pesagem: '2026-05-15', peso_kg: 110 },
      { data_pesagem: '2026-05-25', peso_kg: 120 }, // depois do período
    ];

    const gmd = calcularGMDAnimal(pesagens, {
      dataInicio: '2026-05-01',
      dataFim: '2026-05-20',
    });

    // Deve usar apenas 100-110 (5 a 15 de maio) = (110-100)/(10 dias) = 1.0
    expect(gmd).not.toBeNull();
    expect(gmd).toBeCloseTo(1.0, 1);
  });

  it('deve ordenar pesagens por data automaticamente', () => {
    const pesagens: Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[] = [
      { data_pesagem: '2026-05-11', peso_kg: 110 },
      { data_pesagem: '2026-05-01', peso_kg: 100 }, // desordenado
    ];

    const gmd = calcularGMDAnimal(pesagens, {
      dataInicio: '2026-05-01',
      dataFim: '2026-05-11',
    });

    expect(gmd).toBeCloseTo(1.0, 1);
  });

  it('deve retornar null se período não tiver pesagens', () => {
    const pesagens: Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[] = [
      { data_pesagem: '2026-04-01', peso_kg: 100 },
      { data_pesagem: '2026-04-11', peso_kg: 110 },
    ];

    const gmd = calcularGMDAnimal(pesagens, {
      dataInicio: '2026-05-01',
      dataFim: '2026-05-11',
    });

    expect(gmd).toBeNull();
  });
});

describe('calcularGMDMedioRebanho', () => {
  it('deve calcular média de GMDs de múltiplos animais', () => {
    const pesagensMap = new Map([
      [
        'animal1',
        [
          { data_pesagem: '2026-05-01', peso_kg: 100 },
          { data_pesagem: '2026-05-11', peso_kg: 110 }, // GMD = 1.0
        ] as Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[],
      ],
      [
        'animal2',
        [
          { data_pesagem: '2026-05-01', peso_kg: 200 },
          { data_pesagem: '2026-05-11', peso_kg: 220 }, // GMD = 2.0
        ] as Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[],
      ],
    ]);

    const gmdMedio = calcularGMDMedioRebanho(pesagensMap, {
      dataInicio: '2026-05-01',
      dataFim: '2026-05-11',
    });

    expect(gmdMedio).toBeCloseTo(1.5, 1); // (1.0 + 2.0) / 2
  });

  it('deve retornar null se nenhum animal tem >= 2 pesagens', () => {
    const pesagensMap = new Map([
      [
        'animal1',
        [{ data_pesagem: '2026-05-01', peso_kg: 100 }] as Pick<
          PesoAnimal,
          'data_pesagem' | 'peso_kg'
        >[],
      ],
    ]);

    const gmdMedio = calcularGMDMedioRebanho(pesagensMap, {
      dataInicio: '2026-05-01',
      dataFim: '2026-05-11',
    });

    expect(gmdMedio).toBeNull();
  });

  it('deve ignorar animais com < 2 pesagens no cálculo da média', () => {
    const pesagensMap = new Map([
      [
        'animal1',
        [
          { data_pesagem: '2026-05-01', peso_kg: 100 },
          { data_pesagem: '2026-05-11', peso_kg: 110 }, // valid
        ] as Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[],
      ],
      [
        'animal2',
        [{ data_pesagem: '2026-05-01', peso_kg: 200 }], // ignored (< 2)
      ] as Pick<PesoAnimal, 'data_pesagem' | 'peso_kg'>[],
    ]);

    const gmdMedio = calcularGMDMedioRebanho(pesagensMap, {
      dataInicio: '2026-05-01',
      dataFim: '2026-05-11',
    });

    expect(gmdMedio).toBeCloseTo(1.0, 1); // only animal1: 1.0
  });
});

// ========== INDICADORES REPRODUTIVOS ==========

describe('calcularIdadePrimeiroParto', () => {
  it('deve retornar null se sem animais', () => {
    const resultado = calcularIdadePrimeiroParto([], [], new Map());

    expect(resultado).toBeNull();
  });

  it('deve retornar null se sem partos', () => {
    const animais: Pick<Animal, 'id' | 'data_nascimento'>[] = [
      { id: 'vaca1', data_nascimento: '2020-05-01' },
    ];

    const resultado = calcularIdadePrimeiroParto(animais, [], new Map());

    expect(resultado).toBeNull();
  });

  it('deve calcular idade do primeiro parto em meses', () => {
    // Vaca nascida em 2020-05-01
    // Primeiro parto em 2023-05-01 = 36 meses
    const animais: Pick<Animal, 'id' | 'data_nascimento'>[] = [
      { id: 'vaca1', data_nascimento: '2020-05-01' },
    ];

    const eventos: Pick<EventoRebanho, 'data_evento'>[] = [
      { data_evento: '2023-05-01' }, // primeiro parto
      { data_evento: '2024-05-01' }, // segundo parto
    ];

    const relacao = new Map([['vaca1', ['filho1', 'filho2']]]);

    const resultado = calcularIdadePrimeiroParto(animais, eventos, relacao);

    expect(resultado).toBe(36);
  });

  it('deve ignorar partos com idade negativa (parto antes de nascimento)', () => {
    const animais: Pick<Animal, 'id' | 'data_nascimento'>[] = [
      { id: 'vaca1', data_nascimento: '2023-05-01' },
      { id: 'vaca2', data_nascimento: '2021-05-01' },
    ];

    const eventos: Pick<EventoRebanho, 'data_evento'>[] = [
      { data_evento: '2022-05-01' }, // parto vaca2 (12 meses)
    ];

    const relacao = new Map([
      ['vaca1', ['invalido']],
      ['vaca2', ['filho1']],
    ]);

    const resultado = calcularIdadePrimeiroParto(animais, eventos, relacao);

    expect(resultado).toBe(12);
  });

  it('deve retornar média se múltiplas vacas têm partos', () => {
    const animais: Pick<Animal, 'id' | 'data_nascimento'>[] = [
      { id: 'vaca1', data_nascimento: '2020-01-01' },
      { id: 'vaca2', data_nascimento: '2020-07-01' }, // 6 meses depois
    ];

    const eventos: Pick<EventoRebanho, 'data_evento'>[] = [
      { data_evento: '2023-01-01' }, // 36 meses para vaca1
    ];

    const relacao = new Map([
      ['vaca1', ['filho1']],
      ['vaca2', ['filho2']],
    ]);

    const resultado = calcularIdadePrimeiroParto(animais, eventos, relacao);

    // Ambas usam o mesmo evento (2023-01-01), então:
    // vaca1: (2023-01-01) - (2020-01-01) = 36 meses
    // vaca2: (2023-01-01) - (2020-07-01) = 30 meses
    // Média: (36 + 30) / 2 = 33 meses
    expect(resultado).toBe(33);
  });
});

describe('calcularIntervaloEntrePartos', () => {
  it('deve retornar null se sem dados', () => {
    const resultado = calcularIntervaloEntrePartos([], new Map());

    expect(resultado).toBeNull();
  });

  it('deve retornar null se vaca tem < 2 partos', () => {
    const relacao = new Map([['vaca1', ['filho1']]]);

    const resultado = calcularIntervaloEntrePartos([], relacao);

    expect(resultado).toBeNull();
  });

  it('deve calcular intervalo entre partos em dias', () => {
    const eventos: Pick<EventoRebanho, 'data_evento'>[] = [
      { data_evento: '2023-01-01' },
      { data_evento: '2023-13-02' }, // 397 dias depois (errado, fevereiro não tem 13 dias)
      { data_evento: '2023-02-02' }, // Correto: 32 dias depois do primeiro parto
      { data_evento: '2023-03-05' }, // 31 dias depois do segundo parto
    ];

    const relacao = new Map([
      [
        'vaca1',
        [
          'filho1', // 2023-01-01
          'filho2', // 2023-02-02
          'filho3', // 2023-03-05
        ],
      ],
    ]);

    const resultado = calcularIntervaloEntrePartos(eventos, relacao);

    // Intervalos: 32 dias e 31 dias = média 31.5
    expect(resultado).toBe(32);
  });

  it('deve ignorar intervalos <= 0', () => {
    const eventos: Pick<EventoRebanho, 'data_evento'>[] = [
      { data_evento: '2023-01-01' },
      { data_evento: '2023-01-01' }, // mesmo dia (intervalo = 0)
      { data_evento: '2023-02-01' }, // 31 dias depois
    ];

    const relacao = new Map([['vaca1', ['filho1', 'filho2', 'filho3']]]);

    const resultado = calcularIntervaloEntrePartos(eventos, relacao);

    // Apenas 31 dias é válido
    expect(resultado).toBe(31);
  });

  it('deve calcular média de múltiplas vacas', () => {
    // Dados globais: 4 partos em jan/fev
    // Vaca 1: 2 filhos → usa primeiros 2 eventos ordenados (jan-01 e fev-01 = 31 dias)
    // Vaca 2: 2 filhos → usa primeiros 2 eventos ordenados (jan-01 e fev-01 = 31 dias)
    const eventos: Pick<EventoRebanho, 'data_evento'>[] = [
      { data_evento: '2023-01-01' },
      { data_evento: '2023-02-01' },
      { data_evento: '2023-02-02' },
      { data_evento: '2023-03-01' },
    ];

    const relacao = new Map([
      ['vaca1', ['filho1', 'filho2']], // usa 2023-01-01 a 2023-02-01 = 31 dias
      ['vaca2', ['filho3', 'filho4']], // usa 2023-01-01 a 2023-02-01 = 31 dias
    ]);

    const resultado = calcularIntervaloEntrePartos(eventos, relacao);

    // Ambas vacas usam 31 dias, média = 31
    expect(resultado).toBe(31);
  });
});
