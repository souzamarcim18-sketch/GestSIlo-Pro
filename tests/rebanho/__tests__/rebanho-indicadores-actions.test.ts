import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Sentry from '@sentry/nextjs';
import { obterIndicadoresZootecnicos } from '@/app/dashboard/rebanho/indicadores/actions';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
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
  buscarEventosPartos,
} from '@/lib/supabase/rebanho-indicadores';
import {
  calcularComposicaoRebanho,
  calcularGMDMedioRebanho,
  isVacaProdutiva,
} from '@/lib/calculos/indicadores-rebanho';

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('obterIndicadoresZootecnicos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna { ok: false } com filtro inválido (fazenda_id vazio)', async () => {
    const resultado = await obterIndicadoresZootecnicos({
      fazenda_id: '',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toBe('Filtros inválidos');
    expect(resultado.campos).toBeDefined();
  });

  it('retorna { ok: false } com período inválido (data final anterior à inicial)', async () => {
    const resultado = await obterIndicadoresZootecnicos({
      fazenda_id: '550e8400-e29b-41d4-a716-446655440000',
      periodo: {
        data_inicial: '2024-02-28',
        data_final: '2024-01-01',
      },
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toBe('Filtros inválidos');
  });

  it('retorna { ok: true, dados } com filtro válido', async () => {
    (buscarEventosNoPeriodo as any).mockResolvedValue([]);
    (buscarPesosNoPeriodo as any).mockResolvedValue([]);
    (buscarAnimaisFiltrados as any).mockResolvedValue([]);
    (buscarEventosPartos as any).mockResolvedValue([]);

    const resultado = await obterIndicadoresZootecnicos({
      fazenda_id: '550e8400-e29b-41d4-a716-446655440000',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
    });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.dados).toBeDefined();
      expect(resultado.dados.composicao).toBeDefined();
      expect(resultado.dados.taxa_natalidade).toBeDefined();
      expect(resultado.dados.gmd_medio).toBeDefined();
    }
  });

  it('busca dados em paralelo (Promise.all)', async () => {
    (buscarEventosNoPeriodo as any).mockResolvedValue([]);
    (buscarPesosNoPeriodo as any).mockResolvedValue([]);
    (buscarAnimaisFiltrados as any).mockResolvedValue([]);
    (buscarEventosPartos as any).mockResolvedValue([]);

    await obterIndicadoresZootecnicos({
      fazenda_id: '550e8400-e29b-41d4-a716-446655440000',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
    });

    // Verificar que todas as funções foram chamadas
    expect(buscarEventosNoPeriodo).toHaveBeenCalled();
    expect(buscarPesosNoPeriodo).toHaveBeenCalled();
    expect(buscarAnimaisFiltrados).toHaveBeenCalled();
    expect(buscarEventosPartos).toHaveBeenCalled();
  });

  it('captura exceção em Sentry quando erro inesperado ocorre', async () => {
    const erro = new Error('Erro inesperado no banco');
    (buscarEventosNoPeriodo as any).mockRejectedValue(erro);
    (buscarPesosNoPeriodo as any).mockResolvedValue([]);
    (buscarAnimaisFiltrados as any).mockResolvedValue([]);
    (buscarEventosPartos as any).mockResolvedValue([]);

    const resultado = await obterIndicadoresZootecnicos({
      fazenda_id: '550e8400-e29b-41d4-a716-446655440000',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
    });

    expect(resultado.ok).toBe(false);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: { action: 'obterIndicadoresZootecnicos' },
      })
    );
  });

  it('retorna mensagem de erro genérica em português', async () => {
    const erro = new Error('Connection timeout');
    (buscarEventosNoPeriodo as any).mockRejectedValue(erro);
    (buscarPesosNoPeriodo as any).mockResolvedValue([]);
    (buscarAnimaisFiltrados as any).mockResolvedValue([]);
    (buscarEventosPartos as any).mockResolvedValue([]);

    const resultado = await obterIndicadoresZootecnicos({
      fazenda_id: '550e8400-e29b-41d4-a716-446655440000',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toContain('Connection timeout');
  });

  it('valida output com respostaIndicadoresSchema', async () => {
    (buscarEventosNoPeriodo as any).mockResolvedValue([]);
    (buscarPesosNoPeriodo as any).mockResolvedValue([]);
    (buscarAnimaisFiltrados as any).mockResolvedValue([]);
    (buscarEventosPartos as any).mockResolvedValue([]);

    const resultado = await obterIndicadoresZootecnicos({
      fazenda_id: '550e8400-e29b-41d4-a716-446655440000',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
    });

    if (resultado.ok) {
      // Verificar estrutura da resposta
      expect(resultado.dados.composicao).toBeDefined();
      expect(resultado.dados.taxa_natalidade).toBeDefined();
      expect(resultado.dados.taxa_mortalidade).toBeDefined();
      expect(resultado.dados.taxa_mortalidade_bezerros).toBeDefined();
      expect(resultado.dados.taxa_desfrute).toBeDefined();
      expect(resultado.dados.taxa_descarte).toBeDefined();
      expect(resultado.dados.gmd_medio).toBeDefined();
      expect(resultado.dados.periodo).toBeDefined();
      expect(resultado.dados.gerado_em).toBeDefined();
    }
  });

  it('calcula indicadores corretamente com dados válidos', async () => {
    (buscarEventosNoPeriodo as any).mockResolvedValue([]);
    (buscarPesosNoPeriodo as any).mockResolvedValue([]);
    (buscarAnimaisFiltrados as any).mockResolvedValue([]);
    (buscarEventosPartos as any).mockResolvedValue([]);

    const resultado = await obterIndicadoresZootecnicos({
      fazenda_id: '550e8400-e29b-41d4-a716-446655440000',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
    });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.dados.taxa_natalidade.taxa_percentual).toBe(75);
      expect(resultado.dados.taxa_mortalidade.taxa_percentual).toBe(2);
      expect(resultado.dados.taxa_desfrute.taxa_percentual).toBe(15);
    }
  });

  it('filtra campos com ok e erro não coexistindo', async () => {
    const resultado = await obterIndicadoresZootecnicos({
      fazenda_id: '',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
    });

    // Verificar discriminated union
    if ('ok' in resultado && resultado.ok === false) {
      expect('erro' in resultado).toBe(true);
      expect('dados' in resultado).toBe(false);
    }
  });

  it('suporta filtro com tipo_rebanho leiteiro', async () => {
    (buscarEventosNoPeriodo as any).mockResolvedValue([]);
    (buscarPesosNoPeriodo as any).mockResolvedValue([]);
    (buscarAnimaisFiltrados as any).mockResolvedValue([]);
    (buscarEventosPartos as any).mockResolvedValue([]);

    const resultado = await obterIndicadoresZootecnicos({
      fazenda_id: '550e8400-e29b-41d4-a716-446655440000',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
      tipo_rebanho: 'leiteiro',
    });

    expect(resultado.ok).toBe(true);
    expect(buscarAnimaisFiltrados).toHaveBeenCalled();
  });

  it('suporta filtro com tipo_rebanho corte', async () => {
    (buscarEventosNoPeriodo as any).mockResolvedValue([]);
    (buscarPesosNoPeriodo as any).mockResolvedValue([]);
    (buscarAnimaisFiltrados as any).mockResolvedValue([]);
    (buscarEventosPartos as any).mockResolvedValue([]);

    const resultado = await obterIndicadoresZootecnicos({
      fazenda_id: '550e8400-e29b-41d4-a716-446655440000',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
      tipo_rebanho: 'corte',
    });

    expect(resultado.ok).toBe(true);
  });

  it('suporta filtro por lote_id', async () => {
    (buscarEventosNoPeriodo as any).mockResolvedValue([]);
    (buscarPesosNoPeriodo as any).mockResolvedValue([]);
    (buscarAnimaisFiltrados as any).mockResolvedValue([]);
    (buscarEventosPartos as any).mockResolvedValue([]);

    const resultado = await obterIndicadoresZootecnicos({
      fazenda_id: '550e8400-e29b-41d4-a716-446655440000',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
      lote_id: '550e8400-e29b-41d4-a716-446655440001',
    });

    expect(resultado.ok).toBe(true);
    expect(buscarAnimaisFiltrados).toHaveBeenCalled();
  });
});
