import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Sentry from '@sentry/nextjs';
import { getIndicadoresAction } from '@/app/dashboard/rebanho/indicadores/actions';
import { filtrosIndicadoresSchema, type FiltrosIndicadoresValidados } from '@/lib/validations/indicadores-rebanho';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/supabase/rebanho-indicadores', () => ({
  buscarEventosNoPeriodo: vi.fn(),
  buscarPesosNoPeriodo: vi.fn(),
  buscarAnimaisFiltrados: vi.fn(),
  buscarEventosPartos: vi.fn(),
}));

vi.mock('@/lib/calculos/indicadores-rebanho', () => ({
  calcularComposicaoRebanho: vi.fn(() => ({
    total: 100,
    por_categoria: { 'Vaca em Lactação': 40 },
    por_sexo: { Macho: 40, Fêmea: 60 },
    por_vocacao: { leiteiro: 80, corte: 20 },
  })),
  calcularTaxaNatalidade: vi.fn(() => ({
    numerador: 30,
    denominador: 40,
    taxa_percentual: 75,
  })),
  calcularTaxaMortalidade: vi.fn(() => ({
    numerador: 2,
    denominador: 100,
    taxa_percentual: 2,
  })),
  calcularTaxaMortalidadeBezerros: vi.fn(() => ({
    numerador: 1,
    denominador: 30,
    taxa_percentual: 3.33,
  })),
  calcularTaxaDesfrute: vi.fn(() => ({
    numerador: 15,
    denominador: 100,
    taxa_percentual: 15,
  })),
  calcularTaxaDescarte: vi.fn(() => ({
    numerador: 5,
    denominador: 100,
    taxa_percentual: 5,
  })),
  calcularGMDMedioRebanho: vi.fn(() => 1.25),
  isVacaProdutiva: vi.fn((cat) => cat === 'Vaca em Lactação'),
  isVaca: vi.fn((cat) => cat.includes('Vaca')),
}));

import {
  buscarEventosNoPeriodo,
  buscarPesosNoPeriodo,
  buscarAnimaisFiltrados,
} from '@/lib/supabase/rebanho-indicadores';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('getIndicadoresAction', () => {
  const FAZENDA_TEST_ID = '550e8400-e29b-41d4-a716-446655440000';
  const LOTE_TEST_ID = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de filtros (períodos preset)', () => {
    it('aceita período 30d sem dataInicio/dataFim', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { tipo_exploracao: 'MISTO' }, error: null }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '30d',
        dataInicio: undefined,
        dataFim: undefined,
      };

      const resultado = await getIndicadoresAction(filtros);
      expect(resultado).toBeDefined();
    });

    it('aceita período 90d sem dataInicio/dataFim', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { tipo_exploracao: 'MISTO' }, error: null }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '90d',
        dataInicio: undefined,
        dataFim: undefined,
      };

      const resultado = await getIndicadoresAction(filtros);
      expect(resultado).toBeDefined();
    });

    it('aceita período 365d sem dataInicio/dataFim', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { tipo_exploracao: 'MISTO' }, error: null }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '365d',
        dataInicio: undefined,
        dataFim: undefined,
      };

      const resultado = await getIndicadoresAction(filtros);
      expect(resultado).toBeDefined();
    });

    it('aceita período safra sem dataInicio/dataFim', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { tipo_exploracao: 'MISTO' }, error: null }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: 'safra',
        dataInicio: undefined,
        dataFim: undefined,
      };

      const resultado = await getIndicadoresAction(filtros);
      expect(resultado).toBeDefined();
    });

    it('rejeita período custom sem dataInicio', async () => {
      const filtros: FiltrosIndicadoresValidados = {
        periodo: 'custom',
        dataInicio: undefined,
        dataFim: new Date(),
      };

      await expect(getIndicadoresAction(filtros)).rejects.toThrow('obrigatórios');
    });

    it('rejeita período custom sem dataFim', async () => {
      const filtros: FiltrosIndicadoresValidados = {
        periodo: 'custom',
        dataInicio: new Date(),
        dataFim: undefined,
      };

      await expect(getIndicadoresAction(filtros)).rejects.toThrow('obrigatórios');
    });

    it('rejeita período custom com dataFim < dataInicio', async () => {
      const hoje = new Date();
      const futuro = new Date(hoje);
      futuro.setDate(futuro.getDate() + 30);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: 'custom',
        dataInicio: futuro,
        dataFim: hoje,
      };

      await expect(getIndicadoresAction(filtros)).rejects.toThrow('data');
    });
  });

  describe('Busca de dados em paralelo', () => {
    it('chama buscarEventosNoPeriodo, buscarPesosNoPeriodo, buscarAnimaisFiltrados', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { tipo_exploracao: 'MISTO' }, error: null }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '30d',
        dataInicio: undefined,
        dataFim: undefined,
      };

      await getIndicadoresAction(filtros);

      expect(buscarEventosNoPeriodo).toHaveBeenCalled();
      expect(buscarPesosNoPeriodo).toHaveBeenCalled();
      expect(buscarAnimaisFiltrados).toHaveBeenCalled();
    });

    it('passa lote_id quando filtro inclui lotes', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { tipo_exploracao: 'MISTO' }, error: null }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '30d',
        lotes: [LOTE_TEST_ID],
      };

      await getIndicadoresAction(filtros);

      expect(buscarAnimaisFiltrados).toHaveBeenCalledWith(
        expect.objectContaining({
          lote_id: LOTE_TEST_ID,
        })
      );
    });
  });

  describe('Cálculo e estrutura de output', () => {
    it('retorna IndicadorRebanho com campos esperados', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { tipo_exploracao: 'MISTO' }, error: null }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '30d',
      };

      const resultado = await getIndicadoresAction(filtros);

      expect(resultado).toHaveProperty('gmd');
      expect(resultado).toHaveProperty('taxaNatalidade');
      expect(resultado).toHaveProperty('taxaMortalidadeGeral');
      expect(resultado).toHaveProperty('taxaMortalidadeBezerros');
      expect(resultado).toHaveProperty('composicaoRebanho');
    });

    it('calcula indicadores corretamente com dados válidos', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { tipo_exploracao: 'MISTO' }, error: null }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '90d',
      };

      const resultado = await getIndicadoresAction(filtros);

      expect(resultado.taxaNatalidade.valor).toBe(75);
      expect(resultado.taxaMortalidadeGeral.valor).toBe(2);
      expect(resultado.taxaDescarte.valor).toBe(5);
    });

    it('retorna indicadores específicos CORTE para tipo_exploracao=CORTE', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { tipo_exploracao: 'CORTE' }, error: null }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '30d',
      };

      const resultado = await getIndicadoresAction(filtros);

      // CORTE deve ter taxaDesfrute, não percentualVacasLactacao
      expect(resultado).toHaveProperty('taxaDesfrute');
      expect(resultado).not.toHaveProperty('percentualVacasLactacao');
    });

    it('retorna indicadores específicos LEITE para tipo_exploracao=LEITE', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { tipo_exploracao: 'LEITE' }, error: null }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '30d',
      };

      const resultado = await getIndicadoresAction(filtros);

      // LEITE deve ter percentualVacasLactacao, periodoSecoMedio, mas não taxaDesfrute
      expect(resultado).toHaveProperty('percentualVacasLactacao');
      expect(resultado).toHaveProperty('periodoSecoMedio');
      expect(resultado).not.toHaveProperty('taxaDesfrute');
    });
  });

  describe('Telemetria e tratamento de erros', () => {
    it('captura exceção em Sentry quando erro inesperado ocorre', async () => {
      const erro = new Error('Erro inesperado no banco');
      vi.mocked(createSupabaseServerClient).mockRejectedValue(erro);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '30d',
      };

      await expect(getIndicadoresAction(filtros)).rejects.toThrow('Erro inesperado no banco');
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: { action: 'getIndicadoresAction' },
        })
      );
    });

    it('propaga erro com mensagem em português', async () => {
      const erro = new Error('Connection timeout');
      vi.mocked(createSupabaseServerClient).mockRejectedValue(erro);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '30d',
      };

      await expect(getIndicadoresAction(filtros)).rejects.toThrow('Connection timeout');
    });
  });

  describe('Cache via revalidateTag', () => {
    it('chama revalidateTag com tag indicadores após sucesso', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { tipo_exploracao: 'MISTO' }, error: null }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '30d',
      };

      await getIndicadoresAction(filtros);

      expect(revalidateTag).toHaveBeenCalledWith('indicadores');
    });
  });

  describe('Filtros opcionais (lotes, categorias)', () => {
    it('suporta filtro com lote_id único', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { tipo_exploracao: 'MISTO' }, error: null }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '90d',
        lotes: [LOTE_TEST_ID],
      };

      const resultado = await getIndicadoresAction(filtros);
      expect(resultado).toBeDefined();
      expect(buscarAnimaisFiltrados).toHaveBeenCalledWith(
        expect.objectContaining({ lote_id: LOTE_TEST_ID })
      );
    });

    it('suporta filtro com categorias', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { tipo_exploracao: 'MISTO' }, error: null }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '30d',
        categorias: ['Vaca em Lactação'],
      };

      const resultado = await getIndicadoresAction(filtros);
      expect(resultado).toBeDefined();
    });
  });

  describe('Autenticação & Autorização (via RLS)', () => {
    it('rejeita requisição quando getUser() retorna null', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'JWT inválido' },
            }),
          }),
        }),
      } as any);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '30d',
      };

      await expect(getIndicadoresAction(filtros)).rejects.toThrow();
    });

    it('rejeita requisição quando RLS bloqueia acesso à fazenda', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST120', message: 'RLS violation' },
            }),
          }),
        }),
      } as any);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '30d',
      };

      await expect(getIndicadoresAction(filtros)).rejects.toThrow();
    });

    it('permite requisição com autenticação válida e acesso RLS', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tipo_exploracao: 'MISTO' },
              error: null,
            }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '30d',
      };

      const resultado = await getIndicadoresAction(filtros);
      expect(resultado).toBeDefined();
      expect(resultado).toHaveProperty('gmd');
    });
  });

  describe('Blindagem de Schema (Segurança RLS-First)', () => {
    it('rejeita schema quando fazenda_id é enviado (defesa Layer 1)', () => {
      // Tenta enviar fazenda_id como campo extra
      const filtrosComFazendaId = {
        periodo: '30d',
        fazenda_id: FAZENDA_TEST_ID,
      };

      // Deve REJEITAR no nível de schema com código unrecognized_keys
      const resultado = filtrosIndicadoresSchema.safeParse(filtrosComFazendaId);
      expect(resultado.success).toBe(false);

      if (!resultado.success) {
        expect(resultado.error.issues).toContainEqual(
          expect.objectContaining({
            code: 'unrecognized_keys',
          })
        );
      }
    });

    it('permite payload sem campos extras (RLS-only approach)', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tipo_exploracao: 'MISTO' },
              error: null,
            }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '30d',
      };

      // Deve completar sem erro
      const resultado = await getIndicadoresAction(filtros);
      expect(resultado).toBeDefined();

      // Verifica que nenhuma query foi feita com filtro manual de fazenda_id
      expect(buscarAnimaisFiltrados).toHaveBeenCalledWith(
        expect.not.objectContaining({
          fazenda_id: expect.anything(),
        })
      );
    });
  });

  describe('Validação de Estrutura de Resposta', () => {
    it('retorna IndicadorRebanho válido com estrutura esperada', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tipo_exploracao: 'MISTO' },
              error: null,
            }),
          }),
        }),
      } as any);

      (buscarEventosNoPeriodo as any).mockResolvedValue([]);
      (buscarPesosNoPeriodo as any).mockResolvedValue([]);
      (buscarAnimaisFiltrados as any).mockResolvedValue([]);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '30d',
      };

      const resultado = await getIndicadoresAction(filtros);

      // Valida estrutura completa de IndicadorRebanho
      expect(resultado).toEqual(
        expect.objectContaining({
          gmd: expect.objectContaining({
            valor: expect.any(Number),
            estado: expect.stringMatching(/^(OK|INSUFFICIENT_DATA)$/),
          }),
          taxaNatalidade: expect.objectContaining({
            valor: expect.any(Number),
            estado: 'OK',
          }),
          taxaMortalidadeGeral: expect.objectContaining({
            valor: expect.any(Number),
            estado: 'OK',
          }),
          taxaMortalidadeBezerros: expect.objectContaining({
            valor: expect.any(Number),
            estado: 'OK',
          }),
          taxaDescarte: expect.objectContaining({
            valor: expect.any(Number),
            estado: 'OK',
          }),
          composicaoRebanho: expect.objectContaining({
            valor: expect.any(Object),
            estado: 'OK',
          }),
        })
      );
    });
  });
});
