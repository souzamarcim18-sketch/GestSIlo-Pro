import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Sentry from '@sentry/nextjs';
import { exportarIndicadoresCSVAction } from '@/app/dashboard/rebanho/indicadores/actions';
import type { FiltrosIndicadoresValidados } from '@/lib/validations/indicadores-rebanho';

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
  buscarPartosComMae: vi.fn().mockResolvedValue([]),
  buscarDiagnosticosPrenhez: vi.fn().mockResolvedValue([]),
  buscarAnimaisReprodutivos: vi.fn().mockResolvedValue([]),
  buscarLactacoesEncerradas: vi.fn().mockResolvedValue([]),
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
  calcularIntervaloEntrePartos: vi.fn(() => null),
  calcularIdadePrimeiroParto: vi.fn(() => null),
  montarSerieGMDPorAnimal: vi.fn(() => []),
  montarSerieNatalidadeMortalidade: vi.fn(() => []),
  montarComparativoLotes: vi.fn(() => []),
  isVacaProdutiva: vi.fn((cat) => cat === 'Vaca em Lactação'),
  isVaca: vi.fn((cat) => cat.includes('Vaca')),
}));

vi.mock('@/lib/csv/gerarCsvIndicadoresRebanho', () => ({
  gerarCsvIndicadoresRebanho: vi.fn(() => new Blob(['dummy,csv,data'], { type: 'text/csv;charset=utf-8' })),
}));

import {
  buscarEventosNoPeriodo,
  buscarPesosNoPeriodo,
  buscarAnimaisFiltrados,
} from '@/lib/supabase/rebanho-indicadores';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';
import { gerarCsvIndicadoresRebanho } from '@/lib/csv/gerarCsvIndicadoresRebanho';

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('exportarIndicadoresCSVAction', () => {
  const FAZENDA_TEST_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna Blob com tipo text/csv quando sucesso', async () => {
    vi.mocked(createSupabaseServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-001' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { nome: 'Fazenda Teste', tipo_exploracao: 'MISTO' },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createSupabaseServerClient>);

    vi.mocked(buscarEventosNoPeriodo).mockResolvedValue([]);
    vi.mocked(buscarPesosNoPeriodo).mockResolvedValue([]);
    vi.mocked(buscarAnimaisFiltrados).mockResolvedValue([]);

    const filtros: FiltrosIndicadoresValidados = {
      periodo: '30d',
    };

    const resultado = await exportarIndicadoresCSVAction(filtros);

    expect(resultado).toBeInstanceOf(Blob);
    expect(resultado.type).toContain('text/csv');
  });

  it('rejeita requisição sem autenticação (getUser null)', async () => {
    vi.mocked(createSupabaseServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Unauthorized'),
        }),
      },
    } as unknown as ReturnType<typeof createSupabaseServerClient>);

    const filtros: FiltrosIndicadoresValidados = {
      periodo: '30d',
    };

    await expect(exportarIndicadoresCSVAction(filtros)).rejects.toThrow('autenticado');
  });

  it('rejeita requisição se fazenda não encontrada', async () => {
    vi.mocked(createSupabaseServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-001' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Fazenda não encontrada' },
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createSupabaseServerClient>);

    const filtros: FiltrosIndicadoresValidados = {
      periodo: '30d',
    };

    await expect(exportarIndicadoresCSVAction(filtros)).rejects.toThrow('Fazenda não encontrada');
  });

  it('chama gerarCsvIndicadoresRebanho com indicadores calculados', async () => {
    vi.mocked(createSupabaseServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-001' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { nome: 'Fazenda Teste', tipo_exploracao: 'CORTE' },
            error: null,
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createSupabaseServerClient>);

    vi.mocked(buscarEventosNoPeriodo).mockResolvedValue([]);
    vi.mocked(buscarPesosNoPeriodo).mockResolvedValue([]);
    vi.mocked(buscarAnimaisFiltrados).mockResolvedValue([]);

    const filtros: FiltrosIndicadoresValidados = {
      periodo: '90d',
    };

    await exportarIndicadoresCSVAction(filtros);

    expect(gerarCsvIndicadoresRebanho).toHaveBeenCalledWith(
      expect.objectContaining({
        fazendaNome: 'Fazenda Teste',
        tipoExploracao: 'CORTE',
        indicadores: expect.objectContaining({
          gmd: expect.any(Object),
          taxaNatalidade: expect.any(Object),
        }),
      })
    );
  });
});
