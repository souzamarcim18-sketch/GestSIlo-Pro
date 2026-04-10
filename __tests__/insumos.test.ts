import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — devem ser definidos antes dos imports via vi.hoisted
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
  const mockRpc = vi.fn();
  const mockGetUser = vi.fn();

  return { mockSingle, mockEq, mockSelect, mockFrom, mockRpc, mockGetUser };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.mockGetUser },
    from: mocks.mockFrom,
    rpc: mocks.mockRpc,
  },
}));

// Importar após o mock
import { q } from '@/lib/supabase/queries-audit';

// ---------------------------------------------------------------------------
// Helpers de setup
// ---------------------------------------------------------------------------
function setupAuthMock(fazendaId = 'fazenda-abc') {
  mocks.mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  });
  mocks.mockSingle.mockResolvedValue({
    data: { fazenda_id: fazendaId },
    error: null,
  });
  mocks.mockEq.mockReturnValue({ single: mocks.mockSingle });
  mocks.mockSelect.mockReturnValue({ eq: mocks.mockEq });
  mocks.mockFrom.mockReturnValue({ select: mocks.mockSelect });
}

// ---------------------------------------------------------------------------
// Testes: listAbaixoMinimo()
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

    await expect(q.insumos.listAbaixoMinimo()).rejects.toMatchObject({
      message: 'Erro na RPC',
    });
  });

  it('lança erro quando usuário não está autenticado', async () => {
    mocks.mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    await expect(q.insumos.listAbaixoMinimo()).rejects.toThrow(
      'Usuário não autenticado. Faça login novamente.'
    );
  });

  it('lança erro quando profile não tem fazenda_id', async () => {
    mocks.mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    mocks.mockSingle.mockResolvedValue({
      data: { fazenda_id: null },
      error: null,
    });
    mocks.mockEq.mockReturnValue({ single: mocks.mockSingle });
    mocks.mockSelect.mockReturnValue({ eq: mocks.mockEq });
    mocks.mockFrom.mockReturnValue({ select: mocks.mockSelect });

    await expect(q.insumos.listAbaixoMinimo()).rejects.toThrow(
      'Perfil sem fazenda associada. Conclua o cadastro antes de continuar.'
    );
  });
});
