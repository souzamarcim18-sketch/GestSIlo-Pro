import { describe, it, expect } from 'vitest';
import {
  periodoAnaliseSchema,
  filtroIndicadoresSchema,
  indicadorTaxaSchema,
  indicadorGMDSchema,
  composicaoRebanhoSchema,
  gmdMedioSchema,
  respostaIndicadoresSchema,
} from '@/lib/validations/indicadores-rebanho';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const validDate = '2024-01-15';
const futureDate = '2099-12-31';
const pastDate = '2023-01-01';
const invalidDate = '2024-13-45'; // Mês/dia inválido
const invalidDateFormat = '2024/01/15'; // Formato incorreto

describe('Validações Indicadores Rebanho — periodoAnaliseSchema', () => {
  describe('Casos válidos', () => {
    it('período válido: data inicial anterior à final', () => {
      const result = periodoAnaliseSchema.safeParse({
        data_inicial: pastDate,
        data_final: validDate,
      });
      expect(result.success).toBe(true);
    });

    it('período válido: datas iguais', () => {
      const result = periodoAnaliseSchema.safeParse({
        data_inicial: validDate,
        data_final: validDate,
      });
      expect(result.success).toBe(true);
    });

    it('período válido: máximo de 5 anos', () => {
      const result = periodoAnaliseSchema.safeParse({
        data_inicial: '2019-01-01',
        data_final: '2023-12-31',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Casos inválidos', () => {
    it('data final anterior à inicial', () => {
      const result = periodoAnaliseSchema.safeParse({
        data_inicial: validDate,
        data_final: pastDate,
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('Data final deve ser igual ou posterior');
    });

    it('período superior a 5 anos', () => {
      const result = periodoAnaliseSchema.safeParse({
        data_inicial: '2019-01-01',
        data_final: '2024-02-01',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('Período máximo');
    });

    it('formato de data inválido (/ em vez de -)', () => {
      const result = periodoAnaliseSchema.safeParse({
        data_inicial: '2024/01/15',
        data_final: '2024/02/15',
      });
      expect(result.success).toBe(false);
    });

    it('data inicial faltando', () => {
      const result = periodoAnaliseSchema.safeParse({
        data_final: validDate,
      });
      expect(result.success).toBe(false);
    });

    it('data final faltando', () => {
      const result = periodoAnaliseSchema.safeParse({
        data_inicial: validDate,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Validações Indicadores Rebanho — filtroIndicadoresSchema', () => {
  describe('Casos válidos', () => {
    it('filtro válido com todos os campos obrigatórios', () => {
      const result = filtroIndicadoresSchema.safeParse({
        fazenda_id: validUUID,
        periodo: {
          data_inicial: pastDate,
          data_final: validDate,
        },
      });
      expect(result.success).toBe(true);
    });

    it('filtro válido com tipo_rebanho', () => {
      const result = filtroIndicadoresSchema.safeParse({
        fazenda_id: validUUID,
        periodo: {
          data_inicial: pastDate,
          data_final: validDate,
        },
        tipo_rebanho: 'leiteiro',
      });
      expect(result.success).toBe(true);
    });

    it('filtro válido com tipo_rebanho corte', () => {
      const result = filtroIndicadoresSchema.safeParse({
        fazenda_id: validUUID,
        periodo: {
          data_inicial: pastDate,
          data_final: validDate,
        },
        tipo_rebanho: 'corte',
      });
      expect(result.success).toBe(true);
    });

    it('filtro válido com lote_id', () => {
      const result = filtroIndicadoresSchema.safeParse({
        fazenda_id: validUUID,
        periodo: {
          data_inicial: pastDate,
          data_final: validDate,
        },
        lote_id: validUUID,
      });
      expect(result.success).toBe(true);
    });

    it('filtro válido com todos os campos opcionais', () => {
      const result = filtroIndicadoresSchema.safeParse({
        fazenda_id: validUUID,
        periodo: {
          data_inicial: pastDate,
          data_final: validDate,
        },
        tipo_rebanho: 'leiteiro',
        lote_id: validUUID,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Casos inválidos', () => {
    it('fazenda_id inválido (não UUID)', () => {
      const result = filtroIndicadoresSchema.safeParse({
        fazenda_id: 'not-a-uuid',
        periodo: {
          data_inicial: pastDate,
          data_final: validDate,
        },
      });
      expect(result.success).toBe(false);
    });

    it('tipo_rebanho inválido', () => {
      const result = filtroIndicadoresSchema.safeParse({
        fazenda_id: validUUID,
        periodo: {
          data_inicial: pastDate,
          data_final: validDate,
        },
        tipo_rebanho: 'outro',
      });
      expect(result.success).toBe(false);
    });

    it('lote_id inválido (não UUID)', () => {
      const result = filtroIndicadoresSchema.safeParse({
        fazenda_id: validUUID,
        periodo: {
          data_inicial: pastDate,
          data_final: validDate,
        },
        lote_id: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('período inválido', () => {
      const result = filtroIndicadoresSchema.safeParse({
        fazenda_id: validUUID,
        periodo: {
          data_inicial: validDate,
          data_final: pastDate,
        },
      });
      expect(result.success).toBe(false);
    });

    it('fazenda_id faltando', () => {
      const result = filtroIndicadoresSchema.safeParse({
        periodo: {
          data_inicial: pastDate,
          data_final: validDate,
        },
      });
      expect(result.success).toBe(false);
    });

    it('período faltando', () => {
      const result = filtroIndicadoresSchema.safeParse({
        fazenda_id: validUUID,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Validações Indicadores Rebanho — indicadorTaxaSchema', () => {
  describe('Casos válidos', () => {
    it('taxa válida com valores positivos', () => {
      const result = indicadorTaxaSchema.safeParse({
        numerador: 10,
        denominador: 100,
        taxa_percentual: 10,
      });
      expect(result.success).toBe(true);
    });

    it('taxa válida com valores zero', () => {
      const result = indicadorTaxaSchema.safeParse({
        numerador: 0,
        denominador: 100,
        taxa_percentual: 0,
      });
      expect(result.success).toBe(true);
    });

    it('taxa válida com taxa percentual > 100', () => {
      const result = indicadorTaxaSchema.safeParse({
        numerador: 150,
        denominador: 100,
        taxa_percentual: 150,
      });
      expect(result.success).toBe(true);
    });

    it('taxa válida com denominador zero e taxa zero', () => {
      const result = indicadorTaxaSchema.safeParse({
        numerador: 0,
        denominador: 0,
        taxa_percentual: 0,
      });
      expect(result.success).toBe(true);
    });

    it('taxa válida com valores decimais', () => {
      const result = indicadorTaxaSchema.safeParse({
        numerador: 5.5,
        denominador: 100.5,
        taxa_percentual: 5.47,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Casos inválidos', () => {
    it('numerador negativo', () => {
      const result = indicadorTaxaSchema.safeParse({
        numerador: -10,
        denominador: 100,
        taxa_percentual: -10,
      });
      expect(result.success).toBe(false);
    });

    it('denominador negativo', () => {
      const result = indicadorTaxaSchema.safeParse({
        numerador: 10,
        denominador: -100,
        taxa_percentual: -10,
      });
      expect(result.success).toBe(false);
    });

    it('taxa percentual negativa', () => {
      const result = indicadorTaxaSchema.safeParse({
        numerador: 10,
        denominador: 100,
        taxa_percentual: -50,
      });
      expect(result.success).toBe(false);
    });

    it('numerador não é número', () => {
      const result = indicadorTaxaSchema.safeParse({
        numerador: 'abc',
        denominador: 100,
        taxa_percentual: 10,
      });
      expect(result.success).toBe(false);
    });

    it('campo faltando: numerador', () => {
      const result = indicadorTaxaSchema.safeParse({
        denominador: 100,
        taxa_percentual: 10,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Validações Indicadores Rebanho — indicadorGMDSchema', () => {
  describe('Casos válidos', () => {
    it('GMD válido com valores positivos', () => {
      const result = indicadorGMDSchema.safeParse({
        animal_id: validUUID,
        peso_inicial: 250,
        peso_final: 280,
        data_inicial: pastDate,
        data_final: validDate,
        dias: 30,
        ganho_total_kg: 30,
        gmd_kg_dia: 1.0,
      });
      expect(result.success).toBe(true);
    });

    it('GMD válido com perda de peso (negativo)', () => {
      const result = indicadorGMDSchema.safeParse({
        animal_id: validUUID,
        peso_inicial: 300,
        peso_final: 250,
        data_inicial: pastDate,
        data_final: validDate,
        dias: 30,
        ganho_total_kg: -50,
        gmd_kg_dia: -1.67,
      });
      expect(result.success).toBe(true);
    });

    it('GMD válido com 1 dia', () => {
      const result = indicadorGMDSchema.safeParse({
        animal_id: validUUID,
        peso_inicial: 200,
        peso_final: 201,
        data_inicial: validDate,
        data_final: validDate,
        dias: 1,
        ganho_total_kg: 1,
        gmd_kg_dia: 1,
      });
      expect(result.success).toBe(true);
    });

    it('GMD válido com valores decimais', () => {
      const result = indicadorGMDSchema.safeParse({
        animal_id: validUUID,
        peso_inicial: 250.5,
        peso_final: 280.75,
        data_inicial: pastDate,
        data_final: validDate,
        dias: 30,
        ganho_total_kg: 30.25,
        gmd_kg_dia: 1.008,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Casos inválidos', () => {
    it('animal_id inválido (não UUID)', () => {
      const result = indicadorGMDSchema.safeParse({
        animal_id: 'invalid-uuid',
        peso_inicial: 250,
        peso_final: 280,
        data_inicial: pastDate,
        data_final: validDate,
        dias: 30,
        ganho_total_kg: 30,
        gmd_kg_dia: 1.0,
      });
      expect(result.success).toBe(false);
    });

    it('peso_inicial <= 0', () => {
      const result = indicadorGMDSchema.safeParse({
        animal_id: validUUID,
        peso_inicial: 0,
        peso_final: 280,
        data_inicial: pastDate,
        data_final: validDate,
        dias: 30,
        ganho_total_kg: 30,
        gmd_kg_dia: 1.0,
      });
      expect(result.success).toBe(false);
    });

    it('peso_final <= 0', () => {
      const result = indicadorGMDSchema.safeParse({
        animal_id: validUUID,
        peso_inicial: 250,
        peso_final: -50,
        data_inicial: pastDate,
        data_final: validDate,
        dias: 30,
        ganho_total_kg: 30,
        gmd_kg_dia: 1.0,
      });
      expect(result.success).toBe(false);
    });

    it('dias não é inteiro', () => {
      const result = indicadorGMDSchema.safeParse({
        animal_id: validUUID,
        peso_inicial: 250,
        peso_final: 280,
        data_inicial: pastDate,
        data_final: validDate,
        dias: 30.5,
        ganho_total_kg: 30,
        gmd_kg_dia: 1.0,
      });
      expect(result.success).toBe(false);
    });

    it('dias <= 0', () => {
      const result = indicadorGMDSchema.safeParse({
        animal_id: validUUID,
        peso_inicial: 250,
        peso_final: 280,
        data_inicial: pastDate,
        data_final: validDate,
        dias: 0,
        ganho_total_kg: 30,
        gmd_kg_dia: 1.0,
      });
      expect(result.success).toBe(false);
    });

    it('data_inicial inválida', () => {
      const result = indicadorGMDSchema.safeParse({
        animal_id: validUUID,
        peso_inicial: 250,
        peso_final: 280,
        data_inicial: 'invalid-date',
        data_final: validDate,
        dias: 30,
        ganho_total_kg: 30,
        gmd_kg_dia: 1.0,
      });
      expect(result.success).toBe(false);
    });

    it('campo faltando: animal_id', () => {
      const result = indicadorGMDSchema.safeParse({
        peso_inicial: 250,
        peso_final: 280,
        data_inicial: pastDate,
        data_final: validDate,
        dias: 30,
        ganho_total_kg: 30,
        gmd_kg_dia: 1.0,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Validações Indicadores Rebanho — composicaoRebanhoSchema', () => {
  describe('Casos válidos', () => {
    it('composição válida com estrutura completa', () => {
      const result = composicaoRebanhoSchema.safeParse({
        total: 100,
        por_categoria: {
          'Vaca em Lactação': 40,
          'Bezerro': 30,
          'Novilha': 20,
          'Touro': 10,
        },
        por_sexo: {
          machos: 40,
          femeas: 60,
        },
        por_vocacao: {
          leiteiro: 80,
          corte: 20,
        },
      });
      expect(result.success).toBe(true);
    });

    it('composição válida com rebanho vazio', () => {
      const result = composicaoRebanhoSchema.safeParse({
        total: 0,
        por_categoria: {},
        por_sexo: {
          machos: 0,
          femeas: 0,
        },
        por_vocacao: {
          leiteiro: 0,
          corte: 0,
        },
      });
      expect(result.success).toBe(true);
    });

    it('composição válida com categorias adicionais', () => {
      const result = composicaoRebanhoSchema.safeParse({
        total: 200,
        por_categoria: {
          'Vaca em Lactação': 50,
          'Vaca Seca': 30,
          'Vaca Prenha': 20,
          'Bezerro': 40,
          'Bezerra': 30,
          'Novilha': 20,
          'Novilho': 10,
        },
        por_sexo: {
          machos: 90,
          femeas: 110,
        },
        por_vocacao: {
          leiteiro: 150,
          corte: 50,
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Casos inválidos', () => {
    it('valor em por_categoria negativo', () => {
      const result = composicaoRebanhoSchema.safeParse({
        total: 100,
        por_categoria: {
          'Vaca em Lactação': -10,
        },
        por_sexo: {
          machos: 40,
          femeas: 60,
        },
        por_vocacao: {
          leiteiro: 80,
          corte: 20,
        },
      });
      expect(result.success).toBe(false);
    });

    it('machos negativo', () => {
      const result = composicaoRebanhoSchema.safeParse({
        total: 100,
        por_categoria: {
          'Vaca em Lactação': 40,
        },
        por_sexo: {
          machos: -10,
          femeas: 60,
        },
        por_vocacao: {
          leiteiro: 80,
          corte: 20,
        },
      });
      expect(result.success).toBe(false);
    });

    it('femeas negativo', () => {
      const result = composicaoRebanhoSchema.safeParse({
        total: 100,
        por_categoria: {
          'Vaca em Lactação': 40,
        },
        por_sexo: {
          machos: 40,
          femeas: -60,
        },
        por_vocacao: {
          leiteiro: 80,
          corte: 20,
        },
      });
      expect(result.success).toBe(false);
    });

    it('leiteiro negativo', () => {
      const result = composicaoRebanhoSchema.safeParse({
        total: 100,
        por_categoria: {
          'Vaca em Lactação': 40,
        },
        por_sexo: {
          machos: 40,
          femeas: 60,
        },
        por_vocacao: {
          leiteiro: -80,
          corte: 20,
        },
      });
      expect(result.success).toBe(false);
    });

    it('valor em por_categoria não inteiro', () => {
      const result = composicaoRebanhoSchema.safeParse({
        total: 100,
        por_categoria: {
          'Vaca em Lactação': 40.5,
        },
        por_sexo: {
          machos: 40,
          femeas: 60,
        },
        por_vocacao: {
          leiteiro: 80,
          corte: 20,
        },
      });
      expect(result.success).toBe(false);
    });

    it('campo faltando: por_sexo', () => {
      const result = composicaoRebanhoSchema.safeParse({
        total: 100,
        por_categoria: {
          'Vaca em Lactação': 40,
        },
        por_vocacao: {
          leiteiro: 80,
          corte: 20,
        },
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Validações Indicadores Rebanho — gmdMedioSchema', () => {
  describe('Casos válidos', () => {
    it('GMD médio válido com gmd_medio', () => {
      const result = gmdMedioSchema.safeParse({
        gmd_medio: 1.25,
        animais_com_gmd: 50,
        animais_sem_dados: 10,
      });
      expect(result.success).toBe(true);
    });

    it('GMD médio válido com gmd_medio nulo', () => {
      const result = gmdMedioSchema.safeParse({
        gmd_medio: null,
        animais_com_gmd: 0,
        animais_sem_dados: 100,
      });
      expect(result.success).toBe(true);
    });

    it('GMD médio válido com valores zero', () => {
      const result = gmdMedioSchema.safeParse({
        gmd_medio: 0,
        animais_com_gmd: 0,
        animais_sem_dados: 0,
      });
      expect(result.success).toBe(true);
    });

    it('GMD médio válido com gmd_medio negativo (perda)', () => {
      const result = gmdMedioSchema.safeParse({
        gmd_medio: -0.5,
        animais_com_gmd: 30,
        animais_sem_dados: 20,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Casos inválidos', () => {
    it('animais_com_gmd negativo', () => {
      const result = gmdMedioSchema.safeParse({
        gmd_medio: 1.25,
        animais_com_gmd: -10,
        animais_sem_dados: 10,
      });
      expect(result.success).toBe(false);
    });

    it('animais_sem_dados negativo', () => {
      const result = gmdMedioSchema.safeParse({
        gmd_medio: 1.25,
        animais_com_gmd: 50,
        animais_sem_dados: -5,
      });
      expect(result.success).toBe(false);
    });

    it('animais_com_gmd não é inteiro', () => {
      const result = gmdMedioSchema.safeParse({
        gmd_medio: 1.25,
        animais_com_gmd: 50.5,
        animais_sem_dados: 10,
      });
      expect(result.success).toBe(false);
    });

    it('campo faltando: gmd_medio', () => {
      const result = gmdMedioSchema.safeParse({
        animais_com_gmd: 50,
        animais_sem_dados: 10,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Validações Indicadores Rebanho — respostaIndicadoresSchema', () => {
  const validResponse = {
    composicao: {
      total: 100,
      por_categoria: {
        'Vaca em Lactação': 40,
        'Bezerro': 30,
        'Novilha': 20,
        'Touro': 10,
      },
      por_sexo: {
        machos: 40,
        femeas: 60,
      },
      por_vocacao: {
        leiteiro: 80,
        corte: 20,
      },
    },
    taxa_natalidade: {
      numerador: 30,
      denominador: 40,
      taxa_percentual: 75,
    },
    taxa_mortalidade: {
      numerador: 2,
      denominador: 100,
      taxa_percentual: 2,
    },
    taxa_mortalidade_bezerros: {
      numerador: 1,
      denominador: 30,
      taxa_percentual: 3.33,
    },
    taxa_desfrute: {
      numerador: 15,
      denominador: 100,
      taxa_percentual: 15,
    },
    taxa_descarte: {
      numerador: 5,
      denominador: 100,
      taxa_percentual: 5,
    },
    gmd_medio: {
      gmd_medio: 1.25,
      animais_com_gmd: 50,
      animais_sem_dados: 10,
    },
    periodo: {
      data_inicial: pastDate,
      data_final: validDate,
    },
    gerado_em: new Date().toISOString(),
  };

  describe('Casos válidos', () => {
    it('resposta válida com todos os campos', () => {
      const result = respostaIndicadoresSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('resposta válida com gmd_medio nulo', () => {
      const response = {
        ...validResponse,
        gmd_medio: {
          gmd_medio: null,
          animais_com_gmd: 0,
          animais_sem_dados: 100,
        },
      };
      const result = respostaIndicadoresSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('Casos inválidos', () => {
    it('período inválido (data final anterior à inicial)', () => {
      const response = {
        ...validResponse,
        periodo: {
          data_inicial: validDate,
          data_final: pastDate,
        },
      };
      const result = respostaIndicadoresSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('taxa_natalidade com valores negativos', () => {
      const response = {
        ...validResponse,
        taxa_natalidade: {
          numerador: -10,
          denominador: 40,
          taxa_percentual: -25,
        },
      };
      const result = respostaIndicadoresSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('gerado_em com formato inválido', () => {
      const response = {
        ...validResponse,
        gerado_em: 'not-a-datetime',
      };
      const result = respostaIndicadoresSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('campo faltando: composicao', () => {
      const response = { ...validResponse };
      delete response.composicao;
      const result = respostaIndicadoresSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('campo faltando: taxa_natalidade', () => {
      const response = { ...validResponse };
      delete response.taxa_natalidade;
      const result = respostaIndicadoresSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('campo faltando: gerado_em', () => {
      const response = { ...validResponse };
      delete response.gerado_em;
      const result = respostaIndicadoresSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });
});
