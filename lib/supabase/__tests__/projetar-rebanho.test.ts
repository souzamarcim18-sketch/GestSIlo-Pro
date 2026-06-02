import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  Animal,
  RebanhoProjetado,
  DeteccaoRebanho,
} from '@/lib/types/rebanho';

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

vi.mock('../server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { projetarRebanho, detectarRebanho } from '../rebanho';
import { createSupabaseServerClient } from '../server';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeAnimal(overrides: Partial<Animal> = {}): Animal {
  return {
    id: 'animal-1',
    fazenda_id: 'fazenda-1',
    brinco: '001',
    sexo: 'Fêmea',
    tipo_rebanho: 'leiteiro' as Animal['tipo_rebanho'],
    data_nascimento: '2024-01-01',
    categoria: 'Vaca em Lactação',
    status: 'Ativo',
    lote_id: null,
    peso_atual: 450.5,
    mae_id: null,
    pai_id: null,
    raca: 'Holandês',
    observacoes: null,
    deleted_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    status_reprodutivo: 'lactacao' as Animal['status_reprodutivo'],
    is_reprodutor: false,
    ...overrides,
  };
}

// ── Mock Builder ──────────────────────────────────────────────────────────────

function createMockQueryBuilder(
  dataFn: ((tipo?: string) => unknown) | unknown,
  error: unknown = null,
  status: number = 200
) {
  let requestedTipo: string | undefined;

  return {
    select: function () { return this; },
    eq: function (field?: string, value?: unknown) {
      if (field === 'tipo') requestedTipo = value as string;
      return this;
    },
    is: function () { return this; },
    gte: function () { return this; },
    lte: function () { return this; },
    limit: function () { return this; },
    order: function () { return this; },
    then: function (onFulfill?: (value: unknown) => unknown) {
      const data = typeof dataFn === 'function' ? dataFn(requestedTipo) : dataFn;
      const result = { data, error, status };
      return onFulfill ? Promise.resolve(result).then(onFulfill) : Promise.resolve(result);
    },
    catch: function (onReject?: (error: unknown) => unknown) {
      const data = typeof dataFn === 'function' ? dataFn(requestedTipo) : dataFn;
      const result = { data, error, status };
      return onReject ? Promise.resolve(result).catch(onReject) : Promise.resolve(result);
    },
  };
}

describe('projetarRebanho()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. dataAlvo no passado → deve lançar Error ───────────────────────────────

  it('1. dataAlvo no passado → lança Error', async () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    expect(() => projetarRebanho(ontem)).rejects.toThrow(
      'dataAlvo não pode estar no passado'
    );
  });

  // ── 2. dataAlvo = hoje → retorna rebanho atual sem partos previstos ─────────

  it('2. dataAlvo = hoje → retorna rebanho atual sem partos previstos', async () => {
    const hoje = new Date();

    const vaca = makeAnimal({
      id: 'vaca-1',
      sexo: 'Fêmea',
      data_nascimento: '2020-01-01',
      status_reprodutivo: 'lactacao' as Animal['status_reprodutivo'],
      is_reprodutor: false,
    });

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === 'animais') {
          return createMockQueryBuilder(() => [vaca]);
        }
        // eventos_rebanho queries
        return createMockQueryBuilder(() => []);
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const resultado = await projetarRebanho(hoje);

    expect(resultado.data_alvo).toEqual(hoje);
    expect(resultado.total_cabecas).toBeGreaterThanOrEqual(1);
  });

  // ── 3. Rebanho vazio → totalAnimais = 0, categorias = [] ────────────────────

  it('3. Rebanho vazio → totalAnimais = 0, categorias = []', async () => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);

    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder(() => [])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const resultado = await projetarRebanho(amanha);

    expect(resultado.total_cabecas).toBe(0);
    expect(resultado.categorias).toHaveLength(0);
  });

  // ── 4. Rebanho com múltiplas vacas calcula categorias corretamente ─────────

  it('4. Rebanho com 5 vacas → 5 cabeças com categorias corretas', async () => {
    const dataAlvo = new Date();
    dataAlvo.setMonth(dataAlvo.getMonth() + 1);

    const vacas: Animal[] = Array.from({ length: 5 }, (_, i) =>
      makeAnimal({
        id: `vaca-${i}`,
        brinco: `00${i}`,
        status_reprodutivo: 'lactacao' as Animal['status_reprodutivo'],
      })
    );

    let eventoQueryCount = 0;
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === 'animais') {
          return createMockQueryBuilder(() => vacas);
        }
        // eventos_rebanho — sem coberturas ou partos
        const queryNum = eventoQueryCount++;
        return createMockQueryBuilder(() => []);
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const resultado = await projetarRebanho(dataAlvo);

    expect(resultado.total_cabecas).toBe(5);
    expect(resultado.categorias.some((c) => c.nome.includes('Vaca'))).toBe(true);
  });

  // ── 5. Rebanho sem partos previstos mantém contagem base ─────────────────────

  it('5. Rebanho sem partos previstos mantém contagem base', async () => {
    const dataAlvo = new Date();
    dataAlvo.setMonth(dataAlvo.getMonth() + 1);

    const vaca = makeAnimal({
      id: 'vaca-1',
      status_reprodutivo: 'lactacao' as Animal['status_reprodutivo'],
    });

    let eventoQueryCount = 0;
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === 'animais') {
          return createMockQueryBuilder(() => [vaca]);
        }
        // eventos_rebanho — sem coberturas
        const queryNum = eventoQueryCount++;
        return createMockQueryBuilder(() => []);
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const resultado = await projetarRebanho(dataAlvo);

    expect(resultado.total_cabecas).toBe(1);
    expect(resultado.fatores_aplicados.partos_confirmados).toBe(0);
  });

  // ── 6. Cobertura que JÁ tem parto → NÃO adiciona bezerro ──────────────────

  it('6. Cobertura que já tem parto registrado → NÃO adiciona bezerro', async () => {
    // dataAlvo = hoje + 30 dias (futuro garantido)
    const dataAlvo = new Date();
    dataAlvo.setDate(dataAlvo.getDate() + 30);

    // Cobertura ~315 dias atrás → parto previsto ~30 dias atrás (já ocorreu)
    const coberturaDate = new Date();
    coberturaDate.setDate(coberturaDate.getDate() - 315);
    const partoDate = new Date();
    partoDate.setDate(partoDate.getDate() - 15);

    const vaca = makeAnimal({ id: 'vaca-1' });

    // Cobertura ~315 dias atrás → parto previsto ~30 dias atrás
    const cobertura = {
      animal_id: 'vaca-1',
      data_evento: coberturaDate.toISOString().split('T')[0],
      gemelar: false,
    };

    // Parto já registrado (evita contar como previsto)
    const parto = { animal_id: 'vaca-1', data_evento: partoDate.toISOString().split('T')[0] };

    let eventoQueryCount = 0;
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === 'animais') {
          return createMockQueryBuilder(() => [vaca]);
        }
        // eventos_rebanho — primeira query = coberturas, segunda = partos
        const queryNum = eventoQueryCount++;
        return createMockQueryBuilder(() => {
          return queryNum === 0 ? [cobertura] : [parto];
        });
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const resultado = await projetarRebanho(dataAlvo);

    // 1 vaca, 0 bezerros (parto já registrado)
    expect(resultado.total_cabecas).toBe(1);
    expect(resultado.composicao['Bezerro(a)']).toBeUndefined();
  });

  // ── 7. Bezerra que cruza idade limite → reclassificada como novilha ────────

  it('7. Bezerra que cruza idade limite entre hoje e dataAlvo → reclassificada como novilha', async () => {
    // Nascida há ~11 meses (será Bezerra/Bezerro hoje, mas Novilha/Novilho na dataAlvo)
    const nascimento = new Date();
    nascimento.setMonth(nascimento.getMonth() - 11);
    const nascimentoISO = nascimento.toISOString().split('T')[0];

    const dataAlvo = new Date();
    dataAlvo.setMonth(dataAlvo.getMonth() + 1); // Daqui a 1 mês, terá > 1 ano

    const bezerra = makeAnimal({
      id: 'bezerra-1',
      sexo: 'Fêmea',
      data_nascimento: nascimentoISO,
      categoria: 'Bezerra',
      status_reprodutivo: null,
    });

    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder(() => [bezerra])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const resultado = await projetarRebanho(dataAlvo);

    const categoriasNomes = resultado.categorias.map((c) => c.nome);
    expect(categoriasNomes).toContain('Novilha');
  });

  // ── 8. Verificar versao_algoritmo ──────────────────────────────────────────

  it('8. versao_algoritmo presente na snapshot', async () => {
    const dataAlvo = new Date();
    dataAlvo.setMonth(dataAlvo.getMonth() + 1);

    const vaca = makeAnimal({ id: 'vaca-1' });

    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder(() => [vaca])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const resultado = await projetarRebanho(dataAlvo);
    const snapshot = resultado.toSnapshot();

    expect(snapshot.versao_algoritmo).toBeDefined();
    expect(typeof snapshot.versao_algoritmo).toBe('string');
  });
});

// ── detectarRebanho() Tests ──────────────────────────────────────────────────

describe('detectarRebanho()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 9. Sucesso vazio → { rebanho_detectado: false, razao: 'vazio' } ────────

  it('9. Rebanho vazio → { rebanho_detectado: false, razao: "vazio" }', async () => {
    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder(() => [])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const resultado = await detectarRebanho();

    expect(resultado.rebanho_detectado).toBe(false);
    expect(resultado.razao).toBe('vazio');
  });

  // ── 10. Erro 403 (RLS bloqueado) → { rebanho_detectado: false, razao: 'sem_acesso' } ──

  it('10. Erro 403 → { rebanho_detectado: false, razao: "sem_acesso" }', async () => {
    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder(null, new Error('RLS'), 403)),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const resultado = await detectarRebanho();

    expect(resultado.rebanho_detectado).toBe(false);
    expect(resultado.razao).toBe('sem_acesso');
  });

  // ── 11. Sucesso com dados → { rebanho_detectado: true } ─────────────────────

  it('11. Sucesso com dados → { rebanho_detectado: true }', async () => {
    const animal = makeAnimal({ id: 'animal-1' });

    const mockClient = {
      from: vi.fn(() => createMockQueryBuilder(() => [animal])),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const resultado = await detectarRebanho();

    expect(resultado.rebanho_detectado).toBe(true);
    expect(resultado.data_ultimo_animal).toBeDefined();
  });
});
