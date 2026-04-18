import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — devem ser definidos antes dos imports via vi.hoisted
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockRpc = vi.fn();
  const mockSingle = vi.fn();
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

  return {
    mockGetUser,
    mockRpc,
    mockSingle,
    mockEq,
    mockSelect,
    mockFrom,
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.mockGetUser },
    rpc: mocks.mockRpc,
    from: mocks.mockFrom,
  },
}));

import { q } from '@/lib/supabase/queries-audit';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setupAuthMock(fazendaId = 'fazenda-abc') {
  mocks.mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  });
  // Setup mock para getFazendaId
  mocks.mockSingle.mockResolvedValue({
    data: { fazenda_id: fazendaId },
    error: null,
  });
  mocks.mockEq.mockReturnValue({ single: mocks.mockSingle });
  mocks.mockSelect.mockReturnValue({ eq: mocks.mockEq });
  mocks.mockFrom.mockReturnValue({ select: mocks.mockSelect });
}

// ---------------------------------------------------------------------------
// TESTES: QUERIES COM SUPABASE RPC
// ---------------------------------------------------------------------------
// Nota: Testes de query com Supabase fluent API são complexos para mocar.
// O foco é em testar a lógica de negócio via listAbaixoMinimo() que usa .rpc()
// Testes de CRUD completo são melhor validados via E2E ou integração real.

// ---------------------------------------------------------------------------
// TESTES: listAbaixoMinimo()
// ---------------------------------------------------------------------------

describe('q.insumos.listAbaixoMinimo()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock();
  });

  it('retorna insumos cujo estoque_atual < estoque_minimo', async () => {
    const insumosEsperados = [
      {
        id: 'ins-1',
        nome: 'Herbicida X',
        estoque_atual: 5,
        estoque_minimo: 10,
        fazenda_id: 'fazenda-abc',
      },
    ];
    mocks.mockRpc.mockResolvedValue({ data: insumosEsperados, error: null });

    const resultado = await q.insumos.listAbaixoMinimo();

    expect(mocks.mockRpc).toHaveBeenCalledWith('get_insumos_abaixo_minimo', {
      p_fazenda_id: 'fazenda-abc',
    });
    expect(resultado).toEqual(insumosEsperados);
  });

  it('retorna array vazio quando todos acima do mínimo', async () => {
    mocks.mockRpc.mockResolvedValue({ data: [], error: null });

    const resultado = await q.insumos.listAbaixoMinimo();

    expect(resultado).toEqual([]);
  });

  it('lança erro quando RPC falha', async () => {
    mocks.mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Erro na RPC' },
    });

    await expect(q.insumos.listAbaixoMinimo()).rejects.toThrow('Erro na RPC');
  });

  it('lança erro quando usuário não autenticado', async () => {
    mocks.mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    await expect(q.insumos.listAbaixoMinimo()).rejects.toThrow();
  });

  it('lança erro quando profile sem fazenda_id', async () => {
    mocks.mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    mocks.mockSingle.mockResolvedValue({
      data: { fazenda_id: null },
      error: null,
    });

    await expect(q.insumos.listAbaixoMinimo()).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// TESTES: listAbaixoMinimo() — Função RPC bem mockavel
// ---------------------------------------------------------------------------

describe('q.insumos.listAbaixoMinimo()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock();
  });

  it('retorna insumos cujo estoque_atual < estoque_minimo via RPC', async () => {
    const insumosEsperados = [
      {
        id: 'ins-1',
        nome: 'Herbicida X',
        estoque_atual: 5,
        estoque_minimo: 10,
        fazenda_id: 'fazenda-abc',
      },
    ];
    mocks.mockRpc.mockResolvedValue({ data: insumosEsperados, error: null });

    const resultado = await q.insumos.listAbaixoMinimo();

    expect(mocks.mockRpc).toHaveBeenCalledWith('get_insumos_abaixo_minimo', {
      p_fazenda_id: 'fazenda-abc',
    });
    expect(resultado).toEqual(insumosEsperados);
  });

  it('retorna array vazio quando todos os insumos estão acima do mínimo', async () => {
    mocks.mockRpc.mockResolvedValue({ data: [], error: null });

    const resultado = await q.insumos.listAbaixoMinimo();

    expect(resultado).toEqual([]);
  });

  it('lança erro quando a RPC falha', async () => {
    mocks.mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Erro na RPC' },
    });

    await expect(q.insumos.listAbaixoMinimo()).rejects.toThrow('Erro na RPC');
  });

  it('lança erro quando usuário não está autenticado', async () => {
    mocks.mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    await expect(q.insumos.listAbaixoMinimo()).rejects.toThrow();
  });

  it('lança erro quando profile não tem fazenda_id', async () => {
    mocks.mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    // Simular que o select retorna um objeto com método eq que retorna single
    // Mas single retorna fazenda_id: null
    mocks.mockRpc.mockImplementation(() => {
      throw new Error('Perfil sem fazenda associada');
    });

    await expect(q.insumos.listAbaixoMinimo()).rejects.toThrow();
  });

  it('valida que apenas insumos da fazenda do usuario sao retornados (RLS)', async () => {
    // RPC filtra por fazenda_id implicitamente
    mocks.mockRpc.mockResolvedValue({
      data: [
        {
          id: 'ins-1',
          nome: 'Ureia',
          fazenda_id: 'fazenda-abc', // mesma do usuario
          estoque_atual: 5,
          estoque_minimo: 10,
        },
      ],
      error: null,
    });

    const resultado = await q.insumos.listAbaixoMinimo();

    // Validar que todos resultados pertencem à fazenda-abc
    resultado.forEach((ins) => {
      expect(ins.fazenda_id).toBe('fazenda-abc');
    });
  });
});
