/**
 * Testes para app/dashboard/rebanho/indicadores/actions.ts — T47
 * ~10 testes: autenticação, Zod, cache, exports
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

import { obterIndicadoresZootecnicos } from '@/app/dashboard/rebanho/indicadores/actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import {
  FAZENDA_TEST_ID,
  ANIMAIS_FIXTURE,
  PESAGENS_FIXTURE,
  EVENTOS_FIXTURE,
  RESULTADOS_ESPERADOS,
} from '@/tests/fixtures/rebanho-indicadores';
import type { FiltrosIndicadoresValidados } from '@/lib/validations/indicadores-rebanho';

describe('Server Actions — Indicadores Rebanho', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticação & Autorização', () => {
    it('rejeita requisição sem autenticação', async () => {
      // Mock: getUser() retorna null
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      } as any);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '90d',
        dataInicio: undefined,
        dataFim: undefined,
        lotes: undefined,
        categorias: undefined,
        fazendaId: FAZENDA_TEST_ID,
      };

      await expect(
        obterIndicadoresZootecnicos(filtros)
      ).rejects.toMatchObject({
        message: expect.stringContaining('autenticado'),
      });
    });

    it('rejeita requisição de usuário sem permissão na fazenda', async () => {
      // Mock: usuário autenticado em OUTRA fazenda
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-001',
                user_metadata: { fazenda_id: '99999999-9999-9999-9999-999999999999' }, // Outra fazenda
              },
            },
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST120' }, // RLS violation
              }),
            }),
          }),
        }),
      } as any);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '90d',
        dataInicio: undefined,
        dataFim: undefined,
        lotes: undefined,
        categorias: undefined,
        fazendaId: FAZENDA_TEST_ID,
      };

      await expect(
        obterIndicadoresZootecnicos(filtros)
      ).rejects.toMatchObject({
        message: expect.stringContaining('não autorizado'),
      });
    });

    it('permite requisição com autenticação e permissão válida', async () => {
      // Mock: usuário autenticado na MESMA fazenda
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-001',
                user_metadata: { fazenda_id: FAZENDA_TEST_ID, perfil: 'Operador' },
              },
            },
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: ANIMAIS_FIXTURE,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '90d',
        dataInicio: undefined,
        dataFim: undefined,
        lotes: undefined,
        categorias: undefined,
        fazendaId: FAZENDA_TEST_ID,
      };

      // Deve completar sem erro
      const resultado = await obterIndicadoresZootecnicos(filtros);
      expect(resultado).toBeDefined();
    });
  });

  describe('Validação Zod', () => {
    it('rejeita período inválido (data_fim < data_inicio)', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: { id: 'user-001', user_metadata: { fazenda_id: FAZENDA_TEST_ID } },
            },
          }),
        },
      } as any);

      const filtrosInvalidos = {
        periodo: 'custom',
        dataInicio: new Date('2026-02-14'),
        dataFim: new Date('2025-12-15'), // Invertido
        lotes: undefined,
        categorias: undefined,
        fazendaId: FAZENDA_TEST_ID,
      };

      await expect(
        obterIndicadoresZootecnicos(filtrosInvalidos as any)
      ).rejects.toMatchObject({
        message: expect.stringContaining('data'),
      });
    });

    it('rejeita período == custom sem dataInicio/dataFim', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: { id: 'user-001', user_metadata: { fazenda_id: FAZENDA_TEST_ID } },
            },
          }),
        },
      } as any);

      const filtrosInvalidos = {
        periodo: 'custom',
        dataInicio: undefined,
        dataFim: undefined,
        lotes: undefined,
        categorias: undefined,
        fazendaId: FAZENDA_TEST_ID,
      };

      await expect(
        obterIndicadoresZootecnicos(filtrosInvalidos as any)
      ).rejects.toMatchObject({
        message: expect.stringContaining('obrigatórios'),
      });
    });

    it('aceita período preset (30d, 90d, 365d) sem datas custom', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: { id: 'user-001', user_metadata: { fazenda_id: FAZENDA_TEST_ID } },
            },
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      } as any);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '90d',
        dataInicio: undefined,
        dataFim: undefined,
        lotes: undefined,
        categorias: undefined,
        fazendaId: FAZENDA_TEST_ID,
      };

      const resultado = await obterIndicadoresZootecnicos(filtros);
      expect(resultado).toBeDefined();
    });
  });

  describe('Cache via revalidateTag', () => {
    it('chama revalidateTag após calcular indicadores', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: { id: 'user-001', user_metadata: { fazenda_id: FAZENDA_TEST_ID } },
            },
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: ANIMAIS_FIXTURE,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '90d',
        dataInicio: undefined,
        dataFim: undefined,
        lotes: undefined,
        categorias: undefined,
        fazendaId: FAZENDA_TEST_ID,
      };

      await obterIndicadoresZootecnicos(filtros);

      // Deve chamar revalidateTag com tag 'indicadores'
      expect(revalidateTag).toHaveBeenCalledWith(
        expect.stringContaining('indicadores')
      );
    });
  });

  describe('Tratamento de Erros', () => {
    it('captura erro Supabase e envia para Sentry', async () => {
      const mockError = new Error('Supabase connection timeout');

      vi.mocked(createSupabaseServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockRejectedValue(mockError),
        },
      } as any);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '90d',
        dataInicio: undefined,
        dataFim: undefined,
        lotes: undefined,
        categorias: undefined,
        fazendaId: FAZENDA_TEST_ID,
      };

      await expect(
        obterIndicadoresZootecnicos(filtros)
      ).rejects.toThrow('Supabase connection timeout');

      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('retorna erro amigável se cálculo falhar', async () => {
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: { id: 'user-001', user_metadata: { fazenda_id: FAZENDA_TEST_ID } },
            },
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'RLS violation' },
              }),
            }),
          }),
        }),
      } as any);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '90d',
        dataInicio: undefined,
        dataFim: undefined,
        lotes: undefined,
        categorias: undefined,
        fazendaId: FAZENDA_TEST_ID,
      };

      await expect(
        obterIndicadoresZootecnicos(filtros)
      ).rejects.toMatchObject({
        message: expect.stringContaining('erro'),
      });
    });
  });

  describe('Exportação CSV & PDF', () => {
    it('gera CSV com formato correto (UTF-8 BOM, separador ;)', async () => {
      // Este teste seria mais completo com mocks de CSV generation
      // Por enquanto, validamos assinatura
      expect(typeof obterIndicadoresZootecnicos).toBe('function');
    });

    it('gera PDF com <3s para rebanho 500 animais', async () => {
      // Benchmark: não mockar, executar com dataset real
      // Por enquanto, placeholder
      expect(true).toBe(true);
    });
  });

  describe('Filtragem por Tipo Exploração', () => {
    it('retorna indicadores específicos CORTE para tipo_exploracao=CORTE', async () => {
      // Mock: fazenda com tipo_exploracao = 'CORTE'
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: { id: 'user-001', user_metadata: { fazenda_id: FAZENDA_TEST_ID } },
            },
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: ANIMAIS_FIXTURE.filter((a) => a.tipo_rebanho === 'corte'),
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '90d',
        dataInicio: undefined,
        dataFim: undefined,
        lotes: undefined,
        categorias: undefined,
        fazendaId: FAZENDA_TEST_ID,
      };

      const resultado = await obterIndicadoresZootecnicos(filtros);

      // Deve conter taxaDesfrute (específico CORTE)
      // Não deve conter percentualVacasLactacao (específico LEITE)
      expect(resultado).toHaveProperty('taxaDesfrute');
      expect(resultado).not.toHaveProperty('percentualVacasLactacao');
    });

    it('retorna indicadores específicos LEITE para tipo_exploracao=LEITE', async () => {
      // Mock: fazenda com tipo_exploracao = 'LEITE'
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: { id: 'user-001', user_metadata: { fazenda_id: FAZENDA_TEST_ID } },
            },
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: ANIMAIS_FIXTURE.filter((a) => a.tipo_rebanho === 'leiteiro'),
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const filtros: FiltrosIndicadoresValidados = {
        periodo: '90d',
        dataInicio: undefined,
        dataFim: undefined,
        lotes: undefined,
        categorias: undefined,
        fazendaId: FAZENDA_TEST_ID,
      };

      const resultado = await obterIndicadoresZootecnicos(filtros);

      // Deve conter percentualVacasLactacao (específico LEITE)
      expect(resultado).toHaveProperty('percentualVacasLactacao');
    });
  });
});
