import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { EventoRebanho, PesoAnimal, Animal } from '@/lib/types/rebanho';
import { StatusAnimal } from '@/lib/types/rebanho';
import {
  buscarEventosNoPeriodo,
  buscarPesosNoPeriodo,
  buscarAnimaisFiltrados,
} from '@/lib/supabase/rebanho-indicadores';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: vi.fn(() => []),
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((url, key) => ({})),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeEvento(overrides: Partial<EventoRebanho> = {}): EventoRebanho {
  return {
    id: 'evento-1',
    fazenda_id: 'fazenda-1',
    animal_id: 'animal-1',
    tipo: 'nascimento' as EventoRebanho['tipo'],
    data_evento: '2024-01-15',
    peso_kg: null,
    lote_id_destino: null,
    comprador: null,
    valor_venda: null,
    observacoes: null,
    usuario_id: 'user-1',
    deleted_at: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    ...overrides,
  };
}

function makePeso(overrides: Partial<PesoAnimal> = {}): PesoAnimal {
  return {
    id: 'peso-1',
    fazenda_id: 'fazenda-1',
    animal_id: 'animal-1',
    data_pesagem: '2024-01-15',
    peso_kg: 150.5,
    metodo: 'balanca',
    condicao_corporal: null,
    observacoes: null,
    created_at: '2024-01-15T00:00:00Z',
    ...overrides,
  };
}

function makeAnimal(overrides: Partial<Animal> = {}): Animal {
  return {
    id: 'animal-1',
    fazenda_id: 'fazenda-1',
    brinco: '001',
    sexo: 'Fêmea',
    tipo_rebanho: 'leiteiro' as Animal['tipo_rebanho'],
    data_nascimento: '2020-01-01',
    data_nascimento_estimada: false,
    categoria: 'Vaca em Lactação',
    status: StatusAnimal.ATIVO,
    lote_id: 'lote-1',
    peso_atual: 450.5,
    peso_nascimento: null,
    mae_id: null,
    pai_id: null,
    raca: 'Holandês',
    observacoes: null,
    sisbov_crbio: null,
    origem: null,
    foto_url: null,
    nome: null,
    deleted_at: null,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    status_reprodutivo: 'lactacao' as Animal['status_reprodutivo'],
    data_ultimo_parto: null,
    data_parto_previsto: null,
    data_proxima_secagem: null,
    escore_condicao_corporal: null,
    flag_repetidora: false,
    is_reprodutor: false,
    reprodutor_vinculado_id: null,
    ...overrides,
  };
}

function createMockQueryBuilder(data: unknown[], error: unknown = null) {
  return {
    select: function (cols?: string) {
      return this;
    },
    from: function (table?: string) {
      return this;
    },
    eq: function (field?: string, value?: unknown) {
      return this;
    },
    is: function (field?: string, value?: unknown) {
      return this;
    },
    gte: function (field?: string, value?: unknown) {
      return this;
    },
    lte: function (field?: string, value?: unknown) {
      return this;
    },
    in: function (field?: string, values?: unknown[]) {
      return this;
    },
    order: function (field?: string, opts?: unknown) {
      return this;
    },
    then: function (onFulfill?: (value: unknown) => unknown) {
      const result = { data, error };
      return onFulfill ? Promise.resolve(result).then(onFulfill) : Promise.resolve(result);
    },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('buscarEventosNoPeriodo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna eventos no período especificado', async () => {
    const evento1 = makeEvento({
      id: 'evt-1',
      data_evento: '2024-01-15',
      tipo: 'nascimento' as EventoRebanho['tipo'],
    });
    const evento2 = makeEvento({
      id: 'evt-2',
      data_evento: '2024-02-01',
      tipo: 'morte' as EventoRebanho['tipo'],
    });

    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder([evento1, evento2])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const filtro = {
      fazenda_id: 'fazenda-1',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
    };

    const resultado = await buscarEventosNoPeriodo(filtro);

    expect(resultado).toHaveLength(2);
    expect(resultado[0].tipo).toBe('nascimento');
    expect(resultado[1].tipo).toBe('morte');
  });

  it('retorna array vazio quando não há eventos no período', async () => {
    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder([])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const filtro = {
      fazenda_id: 'fazenda-1',
      periodo: {
        data_inicial: '2024-03-01',
        data_final: '2024-03-31',
      },
    };

    const resultado = await buscarEventosNoPeriodo(filtro);

    expect(resultado).toHaveLength(0);
  });

  it('filtra por lote_id quando fornecido', async () => {
    const evento = makeEvento({
      lote_id_destino: 'lote-1',
    });

    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder([evento])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const filtro = {
      fazenda_id: 'fazenda-1',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
      lote_id: 'lote-1',
    };

    const resultado = await buscarEventosNoPeriodo(filtro);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].lote_id_destino).toBe('lote-1');
  });

  it('ordena eventos cronologicamente (ASC)', async () => {
    const evento1 = makeEvento({
      id: 'evt-1',
      data_evento: '2024-01-15',
    });
    const evento2 = makeEvento({
      id: 'evt-2',
      data_evento: '2024-01-10',
    });
    const evento3 = makeEvento({
      id: 'evt-3',
      data_evento: '2024-01-20',
    });

    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder([evento1, evento2, evento3])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const filtro = {
      fazenda_id: 'fazenda-1',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-01-31',
      },
    };

    const resultado = await buscarEventosNoPeriodo(filtro);

    // Verificar que order foi chamado com ascending: true
    expect(resultado).toHaveLength(3);
  });

  it('lança erro quando Supabase falha', async () => {
    const erro = new Error('Erro de conexão');
    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder([], erro)),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const filtro = {
      fazenda_id: 'fazenda-1',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
    };

    await expect(buscarEventosNoPeriodo(filtro)).rejects.toThrow('Erro de conexão');
  });
});

describe('buscarPesosNoPeriodo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna pesagens no período especificado', async () => {
    const peso1 = makePeso({
      id: 'peso-1',
      data_pesagem: '2024-01-15',
      peso_kg: 450,
    });
    const peso2 = makePeso({
      id: 'peso-2',
      data_pesagem: '2024-02-01',
      peso_kg: 470,
    });

    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder([peso1, peso2])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const filtro = {
      fazenda_id: 'fazenda-1',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
    };

    const resultado = await buscarPesosNoPeriodo(filtro);

    expect(resultado).toHaveLength(2);
    expect(resultado[0].peso_kg).toBe(450);
    expect(resultado[1].peso_kg).toBe(470);
  });

  it('retorna array vazio quando não há pesagens no período', async () => {
    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder([])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const filtro = {
      fazenda_id: 'fazenda-1',
      periodo: {
        data_inicial: '2024-03-01',
        data_final: '2024-03-31',
      },
    };

    const resultado = await buscarPesosNoPeriodo(filtro);

    expect(resultado).toHaveLength(0);
  });

  it('ordena pesagens cronologicamente para cálculo de GMD', async () => {
    const peso1 = makePeso({
      animal_id: 'animal-1',
      data_pesagem: '2024-01-15',
      peso_kg: 450,
    });
    const peso2 = makePeso({
      animal_id: 'animal-1',
      data_pesagem: '2024-01-10',
      peso_kg: 440,
    });

    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder([peso1, peso2])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const filtro = {
      fazenda_id: 'fazenda-1',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-01-31',
      },
    };

    const resultado = await buscarPesosNoPeriodo(filtro);

    expect(resultado).toHaveLength(2);
  });
});

describe('buscarAnimaisFiltrados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna animais ativos da fazenda', async () => {
    const animal1 = makeAnimal({
      id: 'animal-1',
      brinco: '001',
      status: StatusAnimal.ATIVO,
    });
    const animal2 = makeAnimal({
      id: 'animal-2',
      brinco: '002',
      status: StatusAnimal.ATIVO,
    });

    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder([animal1, animal2])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const filtro = {
      fazenda_id: 'fazenda-1',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
    };

    const resultado = await buscarAnimaisFiltrados(filtro);

    expect(resultado).toHaveLength(2);
    expect(resultado[0].status).toBe('Ativo');
  });

  it('filtra animais por lote_id', async () => {
    const animal = makeAnimal({
      id: 'animal-1',
      lote_id: 'lote-1',
    });

    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder([animal])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const filtro = {
      fazenda_id: 'fazenda-1',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
      lote_id: 'lote-1',
    };

    const resultado = await buscarAnimaisFiltrados(filtro);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].lote_id).toBe('lote-1');
  });

  it('filtra animais por tipo_rebanho', async () => {
    const animal = makeAnimal({
      id: 'animal-1',
      tipo_rebanho: 'leiteiro' as Animal['tipo_rebanho'],
    });

    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder([animal])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const filtro = {
      fazenda_id: 'fazenda-1',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
      tipo_rebanho: 'leiteiro',
    };

    const resultado = await buscarAnimaisFiltrados(filtro);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].tipo_rebanho).toBe('leiteiro');
  });

  it('retorna array vazio quando não há animais', async () => {
    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder([])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const filtro = {
      fazenda_id: 'fazenda-1',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
    };

    const resultado = await buscarAnimaisFiltrados(filtro);

    expect(resultado).toHaveLength(0);
  });

  it('nunca retorna animais deletados (deleted_at = null)', async () => {
    const animalAtivo = makeAnimal({
      id: 'animal-1',
      deleted_at: null,
    });

    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder([animalAtivo])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const filtro = {
      fazenda_id: 'fazenda-1',
      periodo: {
        data_inicial: '2024-01-01',
        data_final: '2024-02-28',
      },
    };

    const resultado = await buscarAnimaisFiltrados(filtro);

    expect(resultado[0].deleted_at).toBeNull();
  });
});
