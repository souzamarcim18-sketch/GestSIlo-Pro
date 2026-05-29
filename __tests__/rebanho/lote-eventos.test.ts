import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mocks (vi.hoisted — definidos antes dos imports) ────────────────────────

const mocks = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockIn = vi.fn();
  const mockSelect = vi.fn().mockReturnValue({ in: vi.fn() });
  const mockFrom = vi.fn();
  const mockRevalidatePath = vi.fn();

  return { mockRpc, mockIn, mockSelect, mockFrom, mockRevalidatePath };
});

vi.mock('next/cache', () => ({
  revalidatePath: mocks.mockRevalidatePath,
}));

vi.mock('@/lib/auth/helpers', () => ({
  sou_admin: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { dadosIndividuaisPorTipo, criarEventosLoteSchema, dadosCompartilhadosPorTipo } from '@/lib/validations/rebanho-lote';
import {
  filtrarAnimais,
  selecionarTodosFiltrados,
  aplicarCascataEmMemoria,
  contarAnimaisCompletos,
} from '@/lib/utils/rebanho-lote';
import type { AnimalParaLote } from '@/lib/types/rebanho-lote';
import { sou_admin } from '@/lib/auth/helpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { criarEventosLoteAction } from '@/app/dashboard/rebanho/eventos/lote/actions';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const UUID_VALIDO = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const UUID_VALIDO_2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
const DATA_HOJE = new Date().toISOString().split('T')[0];

function makeAnimal(overrides: Partial<AnimalParaLote> = {}): AnimalParaLote {
  return {
    id: UUID_VALIDO,
    brinco: 'B001',
    nome: 'Mimosa',
    sexo: 'Fêmea',
    categoria: 'Vaca em Lactação',
    lote_id: 'lote-1',
    lote_nome: 'Lote A',
    peso_atual: 450,
    ...overrides,
  };
}

function setupSupabaseMock(
  opts: {
    animaisInfo?: Array<{ id: string; brinco: string }>;
    rpcError?: string | null;
  } = {}
) {
  const animaisInfo = opts.animaisInfo ?? [{ id: UUID_VALIDO, brinco: 'B001' }];
  const rpcError = opts.rpcError ?? null;

  const mockRpcFn = vi.fn().mockResolvedValue({ error: rpcError ? { message: rpcError } : null });
  const mockInFn = vi.fn().mockResolvedValue({ data: animaisInfo, error: null });
  const mockSelectFn = vi.fn().mockReturnValue({ in: mockInFn });
  const mockFromFn = vi.fn().mockReturnValue({ select: mockSelectFn });

  const supabaseMock = {
    from: mockFromFn,
    rpc: mockRpcFn,
  };

  vi.mocked(createSupabaseServerClient).mockResolvedValue(
    supabaseMock as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>
  );

  return { supabaseMock, mockRpcFn, mockFromFn };
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — Validação Zod
// ─────────────────────────────────────────────────────────────────────────────

describe('criarEventosLoteSchema', () => {
  it('rejeita array de animais vazio', () => {
    const result = criarEventosLoteSchema.safeParse({
      tipo: 'pesagem',
      dados_compartilhados: { data_evento: DATA_HOJE },
      animais: [],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('animais');
  });

  it('rejeita animal_id com UUID inválido', () => {
    const result = criarEventosLoteSchema.safeParse({
      tipo: 'pesagem',
      dados_compartilhados: { data_evento: DATA_HOJE },
      animais: [{ animal_id: 'nao-e-uuid', dados_individuais: {} }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/UUID/i);
  });

  it('rejeita tipo não suportado em lote (morte)', () => {
    const result = criarEventosLoteSchema.safeParse({
      tipo: 'morte',
      dados_compartilhados: { data_evento: DATA_HOJE },
      animais: [{ animal_id: UUID_VALIDO, dados_individuais: {} }],
    });
    expect(result.success).toBe(false);
  });

  it('rejeita tipo não suportado em lote (nascimento)', () => {
    const result = criarEventosLoteSchema.safeParse({
      tipo: 'nascimento',
      dados_compartilhados: { data_evento: DATA_HOJE },
      animais: [{ animal_id: UUID_VALIDO, dados_individuais: {} }],
    });
    expect(result.success).toBe(false);
  });

  it('aceita payload válido de pesagem', () => {
    const result = criarEventosLoteSchema.safeParse({
      tipo: 'pesagem',
      dados_compartilhados: { data_evento: DATA_HOJE },
      animais: [{ animal_id: UUID_VALIDO, dados_individuais: { peso_kg: 450 } }],
    });
    expect(result.success).toBe(true);
  });
});

describe('dadosIndividuaisPorTipo.pesagem', () => {
  it('rejeita peso_kg = 0', () => {
    const result = dadosIndividuaisPorTipo.pesagem.safeParse({ peso_kg: 0 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('peso_kg');
  });

  it('rejeita peso_kg negativo', () => {
    const result = dadosIndividuaisPorTipo.pesagem.safeParse({ peso_kg: -10 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('peso_kg');
  });

  it('aceita peso_kg = 500 com escore_condicao_corporal = 3.5', () => {
    const result = dadosIndividuaisPorTipo.pesagem.safeParse({
      peso_kg: 500,
      escore_condicao_corporal: 3.5,
    });
    expect(result.success).toBe(true);
  });
});

describe('dadosIndividuaisPorTipo.cobertura', () => {
  it('aceita sem reprodutor_id (campo opcional)', () => {
    const result = dadosIndividuaisPorTipo.cobertura.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('dadosIndividuaisPorTipo.diagnostico_prenhez', () => {
  it('rejeita resultado_prenhez com valor fora do enum', () => {
    const result = dadosIndividuaisPorTipo.diagnostico_prenhez.safeParse({
      resultado_prenhez: 'talvez',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('resultado_prenhez');
  });

  it('aceita resultado_prenhez = "positivo"', () => {
    const result = dadosIndividuaisPorTipo.diagnostico_prenhez.safeParse({
      resultado_prenhez: 'positivo',
    });
    expect(result.success).toBe(true);
  });
});

describe('dadosIndividuaisPorTipo.aspiracao_opu', () => {
  it('rejeita oocitos_viaveis > oocitos_coletados', () => {
    const result = dadosIndividuaisPorTipo.aspiracao_opu.safeParse({
      oocitos_coletados: 5,
      oocitos_viaveis: 8,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('oocitos_viaveis');
    expect(result.error?.issues[0].message).toMatch(/não pode exceder/i);
  });

  it('aceita oocitos_viaveis = oocitos_coletados', () => {
    const result = dadosIndividuaisPorTipo.aspiracao_opu.safeParse({
      oocitos_coletados: 5,
      oocitos_viaveis: 5,
    });
    expect(result.success).toBe(true);
  });

  it('aceita ambos null', () => {
    const result = dadosIndividuaisPorTipo.aspiracao_opu.safeParse({
      oocitos_coletados: null,
      oocitos_viaveis: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('dadosCompartilhadosPorTipo.protocolo_hormonal', () => {
  it('aceita finalidade_protocolo = "pre_iatf"', () => {
    // finalidade_protocolo está no schema compartilhado de protocolo_hormonal
    const result = dadosCompartilhadosPorTipo.protocolo_hormonal.safeParse({
      data_evento: DATA_HOJE,
      finalidade_protocolo: 'pre_iatf',
    });
    expect(result.success).toBe(true);
  });
});

describe('dadosIndividuaisPorTipo.transferencia_embriao', () => {
  it('aceita resultado_te = "transferido"', () => {
    const result = dadosIndividuaisPorTipo.transferencia_embriao.safeParse({
      resultado_te: 'transferido',
    });
    expect(result.success).toBe(true);
  });

  it('aceita resultado_te = "nao_transferido"', () => {
    const result = dadosIndividuaisPorTipo.transferencia_embriao.safeParse({
      resultado_te: 'nao_transferido',
    });
    expect(result.success).toBe(true);
  });

  it('aceita resultado_te = null (opcional)', () => {
    const result = dadosIndividuaisPorTipo.transferencia_embriao.safeParse({
      resultado_te: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejeita resultado_te com valor inválido', () => {
    const result = dadosIndividuaisPorTipo.transferencia_embriao.safeParse({
      resultado_te: 'pendente',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('resultado_te');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — Server Action (mock Supabase)
// ─────────────────────────────────────────────────────────────────────────────

describe('criarEventosLoteAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockRevalidatePath.mockReset();
  });

  it('retorna erro 403-like quando sou_admin() retorna false', async () => {
    vi.mocked(sou_admin).mockResolvedValue(false);
    setupSupabaseMock();

    const result = await criarEventosLoteAction({
      tipo: 'pesagem',
      dados_compartilhados: { data_evento: DATA_HOJE },
      animais: [{ animal_id: UUID_VALIDO, dados_individuais: { peso_kg: 450 } }],
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/administradores/i);
  });

  it('retorna dados inválidos quando schema Zod falha', async () => {
    vi.mocked(sou_admin).mockResolvedValue(true);
    setupSupabaseMock();

    const result = await criarEventosLoteAction({
      tipo: 'pesagem',
      dados_compartilhados: { data_evento: DATA_HOJE },
      animais: [], // array vazio — inválido pelo schema
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Dados inválidos');
  });

  it('retorna { inseridos: N, erros: [] } quando todos os INSERTs têm sucesso', async () => {
    vi.mocked(sou_admin).mockResolvedValue(true);
    setupSupabaseMock({
      animaisInfo: [
        { id: UUID_VALIDO, brinco: 'B001' },
        { id: UUID_VALIDO_2, brinco: 'B002' },
      ],
    });

    const result = await criarEventosLoteAction({
      tipo: 'pesagem',
      dados_compartilhados: { data_evento: DATA_HOJE },
      animais: [
        { animal_id: UUID_VALIDO, dados_individuais: { peso_kg: 450 } },
        { animal_id: UUID_VALIDO_2, dados_individuais: { peso_kg: 380 } },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data?.inseridos).toBe(2);
    expect(result.data?.erros).toHaveLength(0);
  });

  it('retorna { inseridos: N-1, erros: [{ brinco }] } em falha parcial', async () => {
    vi.mocked(sou_admin).mockResolvedValue(true);

    // Primeiro RPC sucesso, segundo falha
    const mockRpcFn = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'Constraint violation' } });

    const mockInFn = vi.fn().mockResolvedValue({
      data: [
        { id: UUID_VALIDO, brinco: 'B001' },
        { id: UUID_VALIDO_2, brinco: 'B002' },
      ],
      error: null,
    });
    const mockSelectFn = vi.fn().mockReturnValue({ in: mockInFn });
    const mockFromFn = vi.fn().mockReturnValue({ select: mockSelectFn });

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: mockFromFn,
      rpc: mockRpcFn,
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const result = await criarEventosLoteAction({
      tipo: 'pesagem',
      dados_compartilhados: { data_evento: DATA_HOJE },
      animais: [
        { animal_id: UUID_VALIDO, dados_individuais: { peso_kg: 450 } },
        { animal_id: UUID_VALIDO_2, dados_individuais: { peso_kg: 380 } },
      ],
    });

    expect(result.data?.inseridos).toBe(1);
    expect(result.data?.erros).toHaveLength(1);
    expect(result.data?.erros[0].brinco).toBe('B002');
  });

  it('não inclui fazenda_id no payload de INSERT', async () => {
    vi.mocked(sou_admin).mockResolvedValue(true);
    const { supabaseMock, mockRpcFn } = setupSupabaseMock();

    await criarEventosLoteAction({
      tipo: 'pesagem',
      dados_compartilhados: { data_evento: DATA_HOJE },
      animais: [{ animal_id: UUID_VALIDO, dados_individuais: { peso_kg: 450 } }],
    });

    expect(mockRpcFn).toHaveBeenCalled();
    const payloadEnviado = mockRpcFn.mock.calls[0][1].p_payload as Record<string, unknown>;
    expect(payloadEnviado).not.toHaveProperty('fazenda_id');
    // confirmar campo esperado presente
    expect(payloadEnviado).toHaveProperty('tipo', 'pesagem');
  });

  it('chama revalidatePath após sucesso', async () => {
    vi.mocked(sou_admin).mockResolvedValue(true);
    setupSupabaseMock();

    await criarEventosLoteAction({
      tipo: 'pesagem',
      dados_compartilhados: { data_evento: DATA_HOJE },
      animais: [{ animal_id: UUID_VALIDO, dados_individuais: { peso_kg: 450 } }],
    });

    expect(mocks.mockRevalidatePath).toHaveBeenCalledWith('/dashboard/rebanho');
  });

  it('executa RPC para tipo=descarte sem incluir fazenda_id', async () => {
    vi.mocked(sou_admin).mockResolvedValue(true);
    const { mockRpcFn } = setupSupabaseMock();

    await criarEventosLoteAction({
      tipo: 'descarte',
      dados_compartilhados: { data_evento: DATA_HOJE, motivo_descarte: 'idade' },
      animais: [{ animal_id: UUID_VALIDO, dados_individuais: {} }],
    });

    expect(mockRpcFn).toHaveBeenCalled();
    const payloadEnviado = mockRpcFn.mock.calls[0][1].p_payload as Record<string, unknown>;
    expect(payloadEnviado).toHaveProperty('tipo', 'descarte');
    expect(payloadEnviado).not.toHaveProperty('fazenda_id');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — Funções puras
// ─────────────────────────────────────────────────────────────────────────────

describe('aplicarCascataEmMemoria', () => {
  const animais: AnimalParaLote[] = [
    makeAnimal({ id: 'a1', brinco: 'B001' }),
    makeAnimal({ id: 'a2', brinco: 'B002' }),
    makeAnimal({ id: 'a3', brinco: 'B003' }),
  ];

  it('preenche todas as linhas com valor da linha 0', () => {
    const dados: Record<string, Record<string, unknown>> = {
      a1: { peso_kg: 450 },
      a2: {},
      a3: {},
    };

    const resultado = aplicarCascataEmMemoria('peso_kg', animais, dados);

    expect(resultado['a2']['peso_kg']).toBe(450);
    expect(resultado['a3']['peso_kg']).toBe(450);
    // linha 0 permanece inalterada
    expect(resultado['a1']['peso_kg']).toBe(450);
  });

  it('sobrescreve linhas que já têm valor com o da linha 0', () => {
    // Decisão documentada: cascata sempre sobrescreve — comportamento "aplicar a todos" deve ser
    // explícito. O usuário escolheu acionar a cascata, portanto todas as demais linhas recebem o
    // valor da linha 0, independentemente de já terem valor.
    const dados: Record<string, Record<string, unknown>> = {
      a1: { peso_kg: 500 },
      a2: { peso_kg: 300 }, // já tem valor
      a3: {},
    };

    const resultado = aplicarCascataEmMemoria('peso_kg', animais, dados);

    expect(resultado['a2']['peso_kg']).toBe(500); // sobrescrito com valor da linha 0
    expect(resultado['a3']['peso_kg']).toBe(500);
  });

  it('não modifica estado quando lista de animais está vazia', () => {
    const dados: Record<string, Record<string, unknown>> = { a1: { peso_kg: 450 } };
    const resultado = aplicarCascataEmMemoria('peso_kg', [], dados);
    expect(resultado).toEqual(dados);
  });

  it('cascata com valor undefined na linha 0 propaga undefined', () => {
    const dados: Record<string, Record<string, unknown>> = {
      a1: {}, // campo ausente = undefined
      a2: { peso_kg: 300 },
    };
    const resultado = aplicarCascataEmMemoria('peso_kg', animais.slice(0, 2), dados);
    expect(resultado['a2']['peso_kg']).toBeUndefined();
  });
});

describe('contarAnimaisCompletos', () => {
  it('retorna 0 quando nenhuma linha tem dados obrigatórios', () => {
    const animais = [
      makeAnimal({ id: 'a1' }),
      makeAnimal({ id: 'a2' }),
    ];
    const dados = {};

    expect(contarAnimaisCompletos(animais, 'pesagem', dados)).toBe(0);
  });

  it('retorna N quando todas as linhas de pesagem têm peso_kg > 0', () => {
    const animais = [
      makeAnimal({ id: 'a1' }),
      makeAnimal({ id: 'a2' }),
      makeAnimal({ id: 'a3' }),
    ];
    const dados = {
      a1: { peso_kg: 450 },
      a2: { peso_kg: 380 },
      a3: { peso_kg: 520 },
    };

    expect(contarAnimaisCompletos(animais, 'pesagem', dados)).toBe(3);
  });

  it('retorna N para tipo=transferencia_lote (sem campos obrigatórios individuais)', () => {
    const animais = [
      makeAnimal({ id: 'a1' }),
      makeAnimal({ id: 'a2' }),
    ];
    // transferencia_lote não tem campos obrigatórios individuais
    expect(contarAnimaisCompletos(animais, 'transferencia_lote', {})).toBe(2);
  });

  it('conta apenas animais com campo obrigatório preenchido (parcial)', () => {
    const animais = [
      makeAnimal({ id: 'a1' }),
      makeAnimal({ id: 'a2' }),
      makeAnimal({ id: 'a3' }),
    ];
    const dados = {
      a1: { peso_kg: 450 },
      a2: {}, // incompleto
      a3: { peso_kg: 520 },
    };

    expect(contarAnimaisCompletos(animais, 'pesagem', dados)).toBe(2);
  });
});

describe('filtrarAnimais', () => {
  const animais: AnimalParaLote[] = [
    makeAnimal({ id: 'a1', brinco: 'B001', lote_id: 'lote-1', categoria: 'Vaca em Lactação', sexo: 'Fêmea', nome: 'Mimosa' }),
    makeAnimal({ id: 'a2', brinco: 'B002', lote_id: 'lote-1', categoria: 'Novilha', sexo: 'Fêmea', nome: 'Flora' }),
    makeAnimal({ id: 'a3', brinco: 'B003', lote_id: 'lote-2', categoria: 'Touro', sexo: 'Macho', nome: 'Zeus' }),
    makeAnimal({ id: 'a4', brinco: 'C001', lote_id: 'lote-2', categoria: 'Novilho', sexo: 'Macho', nome: null }),
  ];

  it('sem filtros retorna todos', () => {
    expect(filtrarAnimais(animais, {})).toHaveLength(4);
  });

  it('filtro por lote_id retorna subset correto', () => {
    const resultado = filtrarAnimais(animais, { filtroLote: 'lote-1' });
    expect(resultado).toHaveLength(2);
    expect(resultado.map((a) => a.id)).toEqual(['a1', 'a2']);
  });

  it('filtro por sexo retorna apenas Fêmeas', () => {
    const resultado = filtrarAnimais(animais, { filtroSexo: 'Fêmea' });
    expect(resultado).toHaveLength(2);
    expect(resultado.every((a) => a.sexo === 'Fêmea')).toBe(true);
  });

  it('filtro por categoria retorna subset correto', () => {
    const resultado = filtrarAnimais(animais, { filtroCategoria: 'Novilha' });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('a2');
  });

  it('busca por brinco parcial retorna match', () => {
    const resultado = filtrarAnimais(animais, { termoBusca: 'B00' });
    expect(resultado).toHaveLength(3);
    expect(resultado.map((a) => a.brinco)).toEqual(['B001', 'B002', 'B003']);
  });

  it('busca case-insensitive por brinco', () => {
    const resultado = filtrarAnimais(animais, { termoBusca: 'b001' });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].brinco).toBe('B001');
  });

  it('busca case-insensitive por nome', () => {
    const resultado = filtrarAnimais(animais, { termoBusca: 'mimosa' });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('a1');
  });

  it('filtros combinados (lote + sexo) retorna interseção', () => {
    const resultado = filtrarAnimais(animais, { filtroLote: 'lote-2', filtroSexo: 'Macho' });
    expect(resultado).toHaveLength(2);
    expect(resultado.map((a) => a.id)).toEqual(['a3', 'a4']);
  });
});

describe('selecionarTodosFiltrados', () => {
  const animais: AnimalParaLote[] = [
    makeAnimal({ id: 'a1', brinco: 'B001' }),
    makeAnimal({ id: 'a2', brinco: 'B002' }),
    makeAnimal({ id: 'a3', brinco: 'B003' }),
  ];

  it('"Selecionar todos os filtrados" não duplica animais já selecionados', () => {
    const prevSelecionados = [animais[0]]; // a1 já selecionado
    const filtrados = animais; // todos aparecem nos filtrados

    const resultado = selecionarTodosFiltrados(prevSelecionados, filtrados);

    expect(resultado).toHaveLength(3);
    // verificar sem duplicatas
    const ids = resultado.map((a) => a.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('adiciona todos os filtrados quando nenhum estava selecionado', () => {
    const resultado = selecionarTodosFiltrados([], animais);
    expect(resultado).toHaveLength(3);
  });

  it('não muda a lista quando todos os filtrados já estão selecionados', () => {
    const resultado = selecionarTodosFiltrados(animais, animais);
    expect(resultado).toHaveLength(3);
  });

  it('adiciona apenas os novos filtrados, mantendo os já selecionados de outros filtros', () => {
    // a1 e a3 selecionados; filtrado retorna a2 e a3
    const prevSelecionados = [animais[0], animais[2]];
    const filtrados = [animais[1], animais[2]]; // a2 e a3

    const resultado = selecionarTodosFiltrados(prevSelecionados, filtrados);

    expect(resultado).toHaveLength(3); // a1 + a3 existentes + a2 novo
    const ids = resultado.map((a) => a.id);
    expect(ids).toContain('a1');
    expect(ids).toContain('a2');
    expect(ids).toContain('a3');
  });
});
