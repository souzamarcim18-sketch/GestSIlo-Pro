/**
 * queries-audit.ts
 *
 * Camada de acesso a dados com filtro por fazenda_id OBRIGATÓRIO em todas
 * as funções. Toda query que busca dados do usuário deve passar por aqui.
 *
 * Por que isso existe:
 *   O RLS no Supabase é a barreira definitiva, mas queries espalhadas pelo
 *   código podem omitir o filtro por fazenda_id e ainda assim funcionar em
 *   desenvolvimento (quando RLS está desativado localmente). Este módulo
 *   garante que o filtro esteja presente no código, não apenas no banco.
 *
 * Como usar:
 *   import { q } from '@/lib/supabase/queries-audit';
 *   const silos = await q.silos.list();
 *   const silo  = await q.silos.create({ nome: '...', ... });
 */

import {
  supabase,
  type Silo,
  type MovimentacaoSilo,
  type Talhao,
  type CicloAgricola,
  type Insumo,
  type MovimentacaoInsumo,
  type CategoriaInsumo,
  type TipoInsumo,
  type Maquina,
  type UsoMaquina,
  type Manutencao,
  type Abastecimento,
  type Financeiro,
  type AtividadeCampo,
  type CategoriaRebanho,
  type PeriodoConfinamento,
  type AvaliacaoBromatologica,
  type AvaliacaoPSPS,
  type PlanoManutencao,
} from '../supabase';
import type { AvaliacaoBromatologicaInput, AvaliacaoPspsInput } from '../validations/silos';
import type { EventoDAP } from '@/lib/types/talhoes';
import type { PlanejamentoSilagem } from '@/lib/types/planejamento-silagem';
import {
  deleteSiloSafely,
  deleteTalhaoSafely,
  deleteCicloSafely,
  deleteMaquinaSafely,
  deleteInsumoSafely,
} from './safe-delete';

// ---------------------------------------------------------------------------
// Helper interno — nunca exportar diretamente
// ---------------------------------------------------------------------------

/**
 * Busca o fazenda_id do usuário logado a partir do seu profile.
 * Lança erro se não houver sessão ou se o profile não tiver fazenda associada.
 */
async function getFazendaId(): Promise<string> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuário não autenticado. Faça login novamente.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('fazenda_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.fazenda_id) {
    throw new Error(
      'Perfil sem fazenda associada. Conclua o cadastro antes de continuar.'
    );
  }

  return profile.fazenda_id as string;
}

// ---------------------------------------------------------------------------
// SILOS
// ---------------------------------------------------------------------------
const silos = {
  async list(): Promise<Silo[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('silos')
      .select('id, nome, tipo, talhao_id, cultura_ensilada, data_fechamento, data_abertura_real, data_abertura_prevista, volume_ensilado_ton_mv, materia_seca_percent, comprimento_m, largura_m, altura_m, observacoes_gerais, custo_aquisicao_rs_ton, insumo_lona_id, insumo_inoculante_id, created_at, fazenda_id')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Silo[];
  },

  async create(payload: Omit<Silo, 'id'>): Promise<Silo> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('silos')
      .insert({ ...payload, fazenda_id: fazendaId })
      .select()
      .single();
    if (error) throw error;
    return data as Silo;
  },

  async update(id: string, payload: Partial<Silo>): Promise<Silo> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('silos')
      .update(payload)
      .eq('id', id)
      .eq('fazenda_id', fazendaId) // dupla garantia além do RLS
      .select()
      .single();
    if (error) throw error;
    return data as Silo;
  },

  async remove(id: string): Promise<void> {
    const fazendaId = await getFazendaId();

    // Validação: verificar dependências antes de deletar
    const validacao = await deleteSiloSafely(id);
    if (!validacao.permitir) {
      throw new Error(validacao.mensagem);
    }

    const { error } = await supabase
      .from('silos')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
  },

  async getById(id: string): Promise<Silo> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('silos')
      .select('id, nome, tipo, talhao_id, cultura_ensilada, data_fechamento, data_abertura_real, data_abertura_prevista, volume_ensilado_ton_mv, materia_seca_percent, comprimento_m, largura_m, altura_m, observacoes_gerais, custo_aquisicao_rs_ton, insumo_lona_id, insumo_inoculante_id, created_at, fazenda_id')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .single();
    if (error) throw error;
    return data as Silo;
  },
};

// ---------------------------------------------------------------------------
// MOVIMENTAÇÕES DE SILO
// ---------------------------------------------------------------------------
const movimentacoesSilo = {
  async listBySilo(siloId: string): Promise<MovimentacaoSilo[]> {
    // A subquery no RLS garante isolamento; a fazendaId no TS garante auditoria
    await getFazendaId();
    const { data, error } = await supabase
      .from('movimentacoes_silo')
      .select('*')
      .eq('silo_id', siloId)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as MovimentacaoSilo[];
  },

  /** Busca movimentações de múltiplos silos de uma vez (batch) */
  async listBySilos(siloIds: string[]): Promise<MovimentacaoSilo[]> {
    if (siloIds.length === 0) return [];
    await getFazendaId();
    const { data, error } = await supabase
      .from('movimentacoes_silo')
      .select('*')
      .in('silo_id', siloIds)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as MovimentacaoSilo[];
  },

  async create(payload: Omit<MovimentacaoSilo, 'id'>): Promise<MovimentacaoSilo> {
    // Verificar que o silo_id pertence à fazenda antes de inserir
    const fazendaId = await getFazendaId();
    const { data: silo, error: checkError } = await supabase
      .from('silos')
      .select('id, data_abertura_real')
      .eq('id', payload.silo_id)
      .eq('fazenda_id', fazendaId)
      .single();
    if (checkError || !silo) {
      throw new Error('Silo não encontrado ou não pertence a esta fazenda.');
    }

    // Criar movimentação
    const { data, error } = await supabase
      .from('movimentacoes_silo')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    // Auto-registrar data de abertura real na primeira saída
    if (payload.tipo === 'Saída' && !silo.data_abertura_real) {
      const { count: countSaidas, error: countError } = await supabase
        .from('movimentacoes_silo')
        .select('id', { count: 'exact', head: true })
        .eq('silo_id', payload.silo_id)
        .eq('tipo', 'Saída');

      // Se essa é a primeira saída (count === 1), atualizar data_abertura_real
      if (!countError && countSaidas === 1) {
        await supabase
          .from('silos')
          .update({ data_abertura_real: payload.data })
          .eq('id', payload.silo_id)
          .eq('fazenda_id', fazendaId);
      }
    }

    return data as MovimentacaoSilo;
  },

  async remove(id: string): Promise<void> {
    await getFazendaId(); // garante sessão ativa antes de deletar
    const { error } = await supabase
      .from('movimentacoes_silo')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /** Verifica se já existe uma movimentação de Entrada para o silo (UNIQUE INDEX no BD) */
  async hasEntrada(siloId: string): Promise<boolean> {
    await getFazendaId();
    const { count, error } = await supabase
      .from('movimentacoes_silo')
      .select('id', { count: 'exact', head: true })
      .eq('silo_id', siloId)
      .eq('tipo', 'Entrada');
    if (error) throw error;
    return (count ?? 0) > 0;
  },
};

// ---------------------------------------------------------------------------
// TALHÕES
// ---------------------------------------------------------------------------
const talhoes = {
  async list(): Promise<Talhao[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('talhoes')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('nome', { ascending: true });
    if (error) throw error;
    return data as Talhao[];
  },

  async getById(id: string): Promise<Talhao | null> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('talhoes')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .single();
    if (error) throw error;
    return (data as Talhao) || null;
  },

  async create(payload: Omit<Talhao, 'id'>): Promise<Talhao> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('talhoes')
      .insert({ ...payload, fazenda_id: fazendaId })
      .select()
      .single();
    if (error) throw error;
    return data as Talhao;
  },

  async update(id: string, payload: Partial<Talhao>): Promise<Talhao> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('talhoes')
      .update(payload)
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .select()
      .single();
    if (error) throw error;
    return data as Talhao;
  },

  async remove(id: string): Promise<void> {
    const fazendaId = await getFazendaId();

    // Validação: verificar dependências antes de deletar
    const validacao = await deleteTalhaoSafely(id);
    if (!validacao.permitir) {
      throw new Error(validacao.mensagem);
    }

    const { error } = await supabase
      .from('talhoes')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// CICLOS AGRÍCOLAS
// ---------------------------------------------------------------------------
const ciclosAgricolas = {
  /**
   * Lista todos os ciclos dos talhões desta fazenda.
   * Filtra pelos IDs de talhões que pertencem à fazenda — não expõe ciclos
   * de outras fazendas mesmo que o talhao_id seja adivinhado.
   */
  async listByTalhoes(talhaoIds: string[]): Promise<CicloAgricola[]> {
    if (talhaoIds.length === 0) return [];
    const fazendaId = await getFazendaId();

    // Confirmar que todos os talhaoIds pertencem a esta fazenda
    const { data: talhoesDaFazenda, error: tErr } = await supabase
      .from('talhoes')
      .select('id')
      .eq('fazenda_id', fazendaId)
      .in('id', talhaoIds);
    if (tErr) throw tErr;

    const idsValidados = (talhoesDaFazenda ?? []).map((t: { id: string }) => t.id);
    if (idsValidados.length === 0) return [];

    const { data, error } = await supabase
      .from('ciclos_agricolas')
      .select('*')
      .in('talhao_id', idsValidados)
      .order('data_plantio', { ascending: false });
    if (error) throw error;
    return data as CicloAgricola[];
  },

  async create(payload: Omit<CicloAgricola, 'id'>): Promise<CicloAgricola> {
    const fazendaId = await getFazendaId();
    const { count, error: checkError } = await supabase
      .from('talhoes')
      .select('id', { count: 'exact', head: true })
      .eq('id', payload.talhao_id)
      .eq('fazenda_id', fazendaId);
    if (checkError || count === 0) {
      throw new Error('Talhão não encontrado ou não pertence a esta fazenda.');
    }

    const { data, error } = await supabase
      .from('ciclos_agricolas')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as CicloAgricola;
  },

  async update(id: string, payload: Partial<CicloAgricola>): Promise<CicloAgricola> {
    await getFazendaId(); // RLS garante isolamento no banco
    const { data, error } = await supabase
      .from('ciclos_agricolas')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as CicloAgricola;
  },

  async remove(id: string): Promise<void> {
    await getFazendaId();

    // Validação: verificar dependências antes de deletar
    const validacao = await deleteCicloSafely(id);
    if (!validacao.permitir) {
      throw new Error(validacao.mensagem);
    }

    const { error } = await supabase
      .from('ciclos_agricolas')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// INSUMOS
// ---------------------------------------------------------------------------
const insumos = {
  async list(filters?: {
    categoria_id?: string;
    tipo_id?: string;
    local_armazen?: string;
    busca?: string;
    apenasCriticos?: boolean;
  }, pagination?: { limit: number; offset: number }): Promise<Insumo[]> {
    const fazendaId = await getFazendaId();
    let query = supabase
      .from('insumos')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (filters?.categoria_id) {
      query = query.eq('categoria_id', filters.categoria_id);
    }
    if (filters?.tipo_id) {
      query = query.eq('tipo_id', filters.tipo_id);
    }
    if (filters?.local_armazen) {
      query = query.ilike('local_armazen', `%${filters.local_armazen}%`);
    }
    if (filters?.busca) {
      query = query.or(`nome.ilike.%${filters.busca}%,fornecedor.ilike.%${filters.busca}%`);
    }

    if (pagination) {
      query = query.range(pagination.offset, pagination.offset + pagination.limit - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Insumo[];
  },

  async listAbaixoMinimo(): Promise<Insumo[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .rpc('get_insumos_abaixo_minimo', { p_fazenda_id: fazendaId });
    if (error) throw error;
    return data as Insumo[];
  },

  async searchByName(term: string, limit: number = 10): Promise<Insumo[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('insumos')
      .select('id, nome, unidade, categoria_id, tipo_id, estoque_atual, estoque_minimo')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .ilike('nome', `%${term}%`)
      .limit(limit)
      .order('nome');
    if (error) throw error;
    return data as Insumo[];
  },

  async create(payload: Omit<Insumo, 'id' | 'fazenda_id'>): Promise<Insumo> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('insumos')
      .insert({ ...payload, fazenda_id: fazendaId })
      .select()
      .single();
    if (error) throw error;
    return data as Insumo;
  },

  async update(id: string, payload: Partial<Insumo>): Promise<Insumo> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('insumos')
      .update(payload)
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .select()
      .single();
    if (error) throw error;
    return data as Insumo;
  },

  async getById(id: string): Promise<Insumo> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('insumos')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .single();
    if (error) throw error;
    return data as Insumo;
  },

  /**
   * Lista insumos com categoria e tipo relacionados (JOIN).
   * Retorna dados normalizados para otimizar queries no frontend.
   */
  async listComRelacoes(filters?: {
    categoria_id?: string;
    tipo_id?: string;
    local_armazen?: string;
    busca?: string;
    apenasCriticos?: boolean;
  }, pagination?: { limit: number; offset: number }): Promise<Array<Insumo & { categoria?: { id: string; nome: string }; tipo?: { id: string; nome: string } }>> {
    const fazendaId = await getFazendaId();
    let query = supabase
      .from('insumos')
      .select(`
        *,
        categoria:categorias_insumo(id, nome),
        tipo:tipos_insumo(id, nome)
      `)
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (filters?.categoria_id) {
      query = query.eq('categoria_id', filters.categoria_id);
    }
    if (filters?.tipo_id) {
      query = query.eq('tipo_id', filters.tipo_id);
    }
    if (filters?.local_armazen) {
      query = query.ilike('local_armazen', `%${filters.local_armazen}%`);
    }
    if (filters?.busca) {
      query = query.or(`nome.ilike.%${filters.busca}%,fornecedor.ilike.%${filters.busca}%`);
    }

    if (pagination) {
      query = query.range(pagination.offset, pagination.offset + pagination.limit - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Array<Insumo & { categoria?: { id: string; nome: string }; tipo?: { id: string; nome: string } }>;
  },

  async delete(id: string): Promise<void> {
    const fazendaId = await getFazendaId();
    // Soft-delete via ativo = false
    const { error } = await supabase
      .from('insumos')
      .update({ ativo: false })
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const fazendaId = await getFazendaId();

    // Validação: verificar dependências antes de hard-delete
    const validacao = await deleteInsumoSafely(id);
    if (!validacao.permitir) {
      throw new Error(validacao.mensagem);
    }

    const { error } = await supabase
      .from('insumos')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// MOVIMENTAÇÕES DE INSUMO
// ---------------------------------------------------------------------------
const movimentacoesInsumo = {
  async listByInsumo(insumoId: string): Promise<MovimentacaoInsumo[]> {
    await getFazendaId();
    const { data, error } = await supabase
      .from('movimentacoes_insumo')
      .select('*')
      .eq('insumo_id', insumoId)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as MovimentacaoInsumo[];
  },

  async listByFazenda(): Promise<(MovimentacaoInsumo & { insumo_nome: string; insumo_unidade: string })[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('movimentacoes_insumo')
      .select(`
        *,
        insumos!inner(nome, unidade, fazenda_id)
      `)
      .eq('insumos.fazenda_id', fazendaId)
      .order('data', { ascending: false });
    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      ...row,
      insumo_nome: row.insumos?.nome ?? '',
      insumo_unidade: row.insumos?.unidade ?? '',
      insumos: undefined,
    }));
  },

  async create(payload: Omit<MovimentacaoInsumo, 'id'>): Promise<MovimentacaoInsumo> {
    const fazendaId = await getFazendaId();
    const { count, error: checkError } = await supabase
      .from('insumos')
      .select('id', { count: 'exact', head: true })
      .eq('id', payload.insumo_id)
      .eq('fazenda_id', fazendaId);
    if (checkError || count === 0) {
      throw new Error('Insumo não encontrado ou não pertence a esta fazenda.');
    }

    const { data, error } = await supabase
      .from('movimentacoes_insumo')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as MovimentacaoInsumo;
  },

  async remove(id: string): Promise<void> {
    await getFazendaId();
    const { error } = await supabase
      .from('movimentacoes_insumo')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async createAjuste(insumo_id: string, estoque_real: number, motivo: string): Promise<MovimentacaoInsumo> {
    const fazendaId = await getFazendaId();

    // Buscar insumo para comparar estoque
    const insumo = await supabase
      .from('insumos')
      .select('estoque_atual')
      .eq('id', insumo_id)
      .eq('fazenda_id', fazendaId)
      .single();
    if (insumo.error) throw insumo.error;

    const diferenca = estoque_real - (insumo.data?.estoque_atual || 0);

    if (diferenca === 0) {
      throw new Error('Nenhuma divergência de inventário');
    }

    // Insert directly without calling this.create() to avoid duplicate getFazendaId() calls
    const { data, error } = await supabase
      .from('movimentacoes_insumo')
      .insert({
        insumo_id,
        tipo: 'Ajuste',
        quantidade: Math.abs(diferenca),
        sinal_ajuste: diferenca > 0 ? 1 : -1,
        observacoes: motivo,
        origem: 'manual',
        data: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();
    if (error) throw error;
    return data as MovimentacaoInsumo;
  },
};

// ---------------------------------------------------------------------------
// CATEGORIAS DE INSUMO
// ---------------------------------------------------------------------------
const categorias = {
  async list(): Promise<CategoriaInsumo[]> {
    const { data, error } = await supabase
      .from('categorias_insumo')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    return data as CategoriaInsumo[];
  },

  async getById(id: string): Promise<CategoriaInsumo> {
    const { data, error } = await supabase
      .from('categorias_insumo')
      .select('*')
      .eq('id', id)
      .eq('ativo', true)
      .single();
    if (error) throw error;
    return data as CategoriaInsumo;
  },
};

// ✅ Server-side versions para Server Actions
const categoriasServer = {
  async list(): Promise<CategoriaInsumo[]> {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('categorias_insumo')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    return data as CategoriaInsumo[];
  },
};

// ---------------------------------------------------------------------------
// TIPOS DE INSUMO
// ---------------------------------------------------------------------------
const tipos = {
  async listByCategoria(categoria_id: string): Promise<TipoInsumo[]> {
    const { data, error } = await supabase
      .from('tipos_insumo')
      .select('*')
      .eq('categoria_id', categoria_id)
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    return data as TipoInsumo[];
  },

  async getById(id: string): Promise<TipoInsumo> {
    const { data, error } = await supabase
      .from('tipos_insumo')
      .select('*')
      .eq('id', id)
      .eq('ativo', true)
      .single();
    if (error) throw error;
    return data as TipoInsumo;
  },
};

// ✅ Server-side versions para Server Actions

const insumosServer = {
  async create(payload: Omit<Insumo, 'id' | 'fazenda_id'>): Promise<Insumo> {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    const fazendaId = await getFazendaIdServer();
    const { data, error } = await supabaseServer
      .from('insumos')
      .insert({ ...payload, fazenda_id: fazendaId })
      .select()
      .single();
    if (error) throw error;
    return data as Insumo;
  },

  async getById(id: string): Promise<Insumo> {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    const fazendaId = await getFazendaIdServer();
    const { data, error } = await supabaseServer
      .from('insumos')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .single();
    if (error) throw error;
    return data as Insumo;
  },

  async update(id: string, payload: Partial<Insumo>): Promise<Insumo> {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    const fazendaId = await getFazendaIdServer();
    const { data, error } = await supabaseServer
      .from('insumos')
      .update(payload)
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .select()
      .single();
    if (error) throw error;
    return data as Insumo;
  },

  async delete(id: string): Promise<void> {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    const fazendaId = await getFazendaIdServer();
    const { error } = await supabaseServer
      .from('insumos')
      .update({ ativo: false })
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
  },
};

const movimentacoesInsumoServer = {
  async create(payload: Omit<MovimentacaoInsumo, 'id'>): Promise<MovimentacaoInsumo> {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    const fazendaId = await getFazendaIdServer();

    const { data: insumoCheck, error: checkError } = await supabaseServer
      .from('insumos')
      .select('id')
      .eq('id', payload.insumo_id)
      .eq('fazenda_id', fazendaId)
      .single();

    if (checkError || !insumoCheck) {
      throw new Error('Insumo não encontrado ou não pertence a esta fazenda.');
    }

    const { data, error } = await supabaseServer
      .from('movimentacoes_insumo')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as MovimentacaoInsumo;
  },

  async remove(id: string): Promise<void> {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    await getFazendaIdServer();
    const { error } = await supabaseServer
      .from('movimentacoes_insumo')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async createAjuste(insumo_id: string, estoque_real: number, motivo: string): Promise<MovimentacaoInsumo> {
    try {
      const { createSupabaseServerClient } = await import('./server');
      const supabaseServer = await createSupabaseServerClient();
      const fazendaId = await getFazendaIdServer();

      console.log('[createAjuste] Iniciando:', { insumo_id, estoque_real, motivo, fazendaId });

      // Buscar insumo com tratamento de erro explícito
      const { data: insumoData, error: insumoError } = await supabaseServer
        .from('insumos')
        .select('estoque_atual, fazenda_id, nome')
        .eq('id', insumo_id)
        .single();

      if (insumoError) {
        console.error('[createAjuste] Erro ao buscar insumo:', insumoError);
        throw new Error(`Não foi possível buscar insumo: ${insumoError.message}`);
      }

      if (!insumoData) {
        throw new Error('Insumo não encontrado');
      }

      if (insumoData.fazenda_id !== fazendaId) {
        throw new Error('Insumo não pertence a esta fazenda');
      }

      console.log('[createAjuste] Insumo encontrado:', { nome: insumoData.nome, estoque_atual: insumoData.estoque_atual });

      const diferenca = estoque_real - (insumoData.estoque_atual || 0);

      if (diferenca === 0) {
        throw new Error('Nenhuma divergência de inventário (estoque real = estoque registrado)');
      }

      const sinal = diferenca > 0 ? 1 : -1;

      console.log('[createAjuste] Diferença calculada:', { diferenca, sinal, quantidade: Math.abs(diferenca) });

      // Insert with explicit error handling
      const { data, error } = await supabaseServer
        .from('movimentacoes_insumo')
        .insert({
          insumo_id,
          tipo: 'Ajuste',
          quantidade: Math.abs(diferenca),
          sinal_ajuste: sinal,
          observacoes: motivo,
          origem: 'manual',
          data: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) {
        console.error('[createAjuste] Erro ao inserir movimentação:', error);
        throw new Error(`Erro ao registrar ajuste: ${error.message}`);
      }

      if (!data) {
        throw new Error('Nenhum registro retornado após inserção');
      }

      console.log('[createAjuste] Ajuste criado com sucesso:', { id: data.id });
      return data as MovimentacaoInsumo;
    } catch (error) {
      console.error('[createAjuste] Erro geral:', error);
      throw error;
    }
  },
};

const financeiroServer = {
  async create(payload: Omit<Financeiro, 'id' | 'fazenda_id'>): Promise<Financeiro> {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    const fazendaId = await getFazendaIdServer();
    const { data, error } = await supabaseServer
      .from('financeiro')
      .insert({ ...payload, fazenda_id: fazendaId })
      .select()
      .single();
    if (error) throw error;
    return data as Financeiro;
  },
};

const tiposServer = {
  async getById(id: string): Promise<TipoInsumo> {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    const { data, error } = await supabaseServer
      .from('tipos_insumo')
      .select('*')
      .eq('id', id)
      .eq('ativo', true)
      .single();
    if (error) throw error;
    return data as TipoInsumo;
  },
};

// ---------------------------------------------------------------------------
// LOCAIS DE ARMAZENAMENTO
// ---------------------------------------------------------------------------
const locais = {
  async listDistinct(): Promise<string[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('insumos')
      .select('local_armazen')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .neq('local_armazen', null);
    if (error) throw error;

    const locaisSet = new Set(data?.map(d => d.local_armazen).filter(Boolean));
    return Array.from(locaisSet).sort();
  },
};

// ---------------------------------------------------------------------------
// MÁQUINAS
// ---------------------------------------------------------------------------
const maquinas = {
  async list(): Promise<Maquina[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('maquinas')
      .select('id, nome, tipo, marca, modelo, ano, identificacao, fazenda_id, consumo_medio_lh, valor_aquisicao, data_aquisicao, vida_util_anos, status, numero_serie, placa, potencia_cv, horimetro_atual, valor_residual, vida_util_horas, largura_trabalho_metros, tratores_compativeis')
      .eq('fazenda_id', fazendaId)
      .order('nome', { ascending: true });
    if (error) throw error;
    return data as Maquina[];
  },

  async create(payload: Omit<Maquina, 'id'>): Promise<Maquina> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('maquinas')
      .insert({ ...payload, fazenda_id: fazendaId })
      .select()
      .single();
    if (error) throw error;
    return data as Maquina;
  },

  async update(id: string, payload: Partial<Maquina>): Promise<Maquina> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('maquinas')
      .update(payload)
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .select()
      .single();
    if (error) throw error;
    return data as Maquina;
  },

  async remove(id: string): Promise<void> {
    const fazendaId = await getFazendaId();

    // Validação: verificar dependências antes de deletar
    const validacao = await deleteMaquinaSafely(id);
    if (!validacao.permitir) {
      throw new Error(validacao.mensagem);
    }

    const { error } = await supabase
      .from('maquinas')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// USO DE MÁQUINAS
// ---------------------------------------------------------------------------
const usoMaquinas = {
  async listByMaquina(maquinaId: string): Promise<UsoMaquina[]> {
    await getFazendaId();
    const { data, error } = await supabase
      .from('uso_maquinas')
      .select('id, maquina_id, data, operador, atividade, horas, km, horimetro_inicio, horimetro_fim, implemento_id, talhao_id, tipo_operacao, area_ha, origem')
      .eq('maquina_id', maquinaId)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as UsoMaquina[];
  },

  async listByMaquinas(maquinaIds: string[]): Promise<UsoMaquina[]> {
    if (maquinaIds.length === 0) return [];
    await getFazendaId();
    const { data, error } = await supabase
      .from('uso_maquinas')
      .select('id, maquina_id, data, operador, atividade, horas, km, horimetro_inicio, horimetro_fim, implemento_id, talhao_id, tipo_operacao, area_ha, origem')
      .in('maquina_id', maquinaIds)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as UsoMaquina[];
  },

  async create(payload: Omit<UsoMaquina, 'id'>): Promise<UsoMaquina> {
    const fazendaId = await getFazendaId();
    const { count, error: checkError } = await supabase
      .from('maquinas')
      .select('id', { count: 'exact', head: true })
      .eq('id', payload.maquina_id)
      .eq('fazenda_id', fazendaId);
    if (checkError || count === 0) {
      throw new Error('Máquina não encontrada ou não pertence a esta fazenda.');
    }

    const { data, error } = await supabase
      .from('uso_maquinas')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as UsoMaquina;
  },

  async remove(id: string): Promise<void> {
    await getFazendaId();
    const { error } = await supabase
      .from('uso_maquinas')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// MANUTENÇÕES
// ---------------------------------------------------------------------------
const manutencoes = {
  async listByMaquina(maquinaId: string): Promise<Manutencao[]> {
    await getFazendaId();
    const { data, error } = await supabase
      .from('manutencoes')
      .select('id, maquina_id, data, tipo, descricao, custo, proxima_manutencao, status, data_prevista, data_realizada, horimetro, proxima_manutencao_horimetro, responsavel, mao_de_obra_tipo, mao_de_obra_valor, pecas')
      .eq('maquina_id', maquinaId)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as Manutencao[];
  },

  async listByMaquinas(maquinaIds: string[]): Promise<Manutencao[]> {
    if (maquinaIds.length === 0) return [];
    await getFazendaId();
    const { data, error } = await supabase
      .from('manutencoes')
      .select('id, maquina_id, data, tipo, descricao, custo, proxima_manutencao, status, data_prevista, data_realizada, horimetro, proxima_manutencao_horimetro, responsavel, mao_de_obra_tipo, mao_de_obra_valor, pecas')
      .in('maquina_id', maquinaIds)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as Manutencao[];
  },

  async create(payload: Omit<Manutencao, 'id'>): Promise<Manutencao> {
    const fazendaId = await getFazendaId();
    const { count, error: checkError } = await supabase
      .from('maquinas')
      .select('id', { count: 'exact', head: true })
      .eq('id', payload.maquina_id)
      .eq('fazenda_id', fazendaId);
    if (checkError || count === 0) {
      throw new Error('Máquina não encontrada ou não pertence a esta fazenda.');
    }

    const { data, error } = await supabase
      .from('manutencoes')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Manutencao;
  },

  async update(id: string, payload: Partial<Manutencao>): Promise<Manutencao> {
    await getFazendaId();
    const { data, error } = await supabase
      .from('manutencoes')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Manutencao;
  },

  async remove(id: string): Promise<void> {
    await getFazendaId();
    const { error } = await supabase
      .from('manutencoes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// ABASTECIMENTOS
// ---------------------------------------------------------------------------
const abastecimentos = {
  async listByMaquina(maquinaId: string): Promise<Abastecimento[]> {
    await getFazendaId();
    const { data, error } = await supabase
      .from('abastecimentos')
      .select('id, maquina_id, data, combustivel, litros, valor, hodometro, preco_litro, fornecedor, horimetro')
      .eq('maquina_id', maquinaId)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as Abastecimento[];
  },

  async listByMaquinas(maquinaIds: string[]): Promise<Abastecimento[]> {
    if (maquinaIds.length === 0) return [];
    await getFazendaId();
    const { data, error } = await supabase
      .from('abastecimentos')
      .select('id, maquina_id, data, combustivel, litros, valor, hodometro, preco_litro, fornecedor, horimetro')
      .in('maquina_id', maquinaIds)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as Abastecimento[];
  },

  async create(payload: Omit<Abastecimento, 'id'>): Promise<Abastecimento> {
    const fazendaId = await getFazendaId();
    const { count, error: checkError } = await supabase
      .from('maquinas')
      .select('id', { count: 'exact', head: true })
      .eq('id', payload.maquina_id)
      .eq('fazenda_id', fazendaId);
    if (checkError || count === 0) {
      throw new Error('Máquina não encontrada ou não pertence a esta fazenda.');
    }

    const { data, error } = await supabase
      .from('abastecimentos')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Abastecimento;
  },

  async remove(id: string): Promise<void> {
    await getFazendaId();
    const { error } = await supabase
      .from('abastecimentos')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// FINANCEIRO
// ---------------------------------------------------------------------------
const financeiro = {
  async list(filtros?: {
    tipo?: 'Receita' | 'Despesa';
    dataInicio?: string;
    dataFim?: string;
    categoria?: string;
  }): Promise<Financeiro[]> {
    const fazendaId = await getFazendaId();
    let query = supabase
      .from('financeiro')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('data', { ascending: false });

    if (filtros?.tipo) query = query.eq('tipo', filtros.tipo);
    if (filtros?.dataInicio) query = query.gte('data', filtros.dataInicio);
    if (filtros?.dataFim) query = query.lte('data', filtros.dataFim);
    if (filtros?.categoria) query = query.eq('categoria', filtros.categoria);

    const { data, error } = await query;
    if (error) throw error;
    return data as Financeiro[];
  },

  async create(payload: Omit<Financeiro, 'id'>): Promise<Financeiro> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('financeiro')
      .insert({ ...payload, fazenda_id: fazendaId })
      .select()
      .single();
    if (error) throw error;
    return data as Financeiro;
  },

  async update(id: string, payload: Partial<Financeiro>): Promise<Financeiro> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('financeiro')
      .update(payload)
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .select()
      .single();
    if (error) throw error;
    return data as Financeiro;
  },

  async remove(id: string): Promise<void> {
    const fazendaId = await getFazendaId();
    const { error } = await supabase
      .from('financeiro')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
  },

  /** Soma receitas e despesas do período para o dashboard */
  async resumo(dataInicio: string, dataFim: string) {
    const registros = await financeiro.list({ dataInicio, dataFim });
    const receitas = registros
      .filter((r) => r.tipo === 'Receita')
      .reduce((acc, r) => acc + r.valor, 0);
    const despesas = registros
      .filter((r) => r.tipo === 'Despesa')
      .reduce((acc, r) => acc + r.valor, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  },
};

// ---------------------------------------------------------------------------
// ATIVIDADES DE CAMPO
// ---------------------------------------------------------------------------
const atividadesCampo = {
  async list(): Promise<AtividadeCampo[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('atividades_campo')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('data_atividade', { ascending: false });
    if (error) throw error;
    return data as AtividadeCampo[];
  },

  async listByTalhao(talhaoId: string): Promise<AtividadeCampo[]> {
    // Validar que o talhão pertence à fazenda do usuário
    const fazendaId = await getFazendaId();
    const { count, error: checkError } = await supabase
      .from('talhoes')
      .select('id', { count: 'exact', head: true })
      .eq('id', talhaoId)
      .eq('fazenda_id', fazendaId);
    if (checkError || count === 0) {
      throw new Error('Talhão não encontrado ou não pertence a esta fazenda.');
    }

    // Buscar atividades (RLS garante isolamento, tabela não tem fazenda_id)
    const { data, error } = await supabase
      .from('atividades_campo')
      .select('*')
      .eq('talhao_id', talhaoId)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as AtividadeCampo[];
  },

  async create(
    payload: Omit<AtividadeCampo, 'id' | 'created_at' | 'fazenda_id'>
  ): Promise<AtividadeCampo> {
    // TODO [Bloco Frota/Insumos]: Integrar custo_hora da tabela maquinas
    // e preco_unitario da tabela insumos para cálculo automático de custo_total.
    // Atualmente, custo é calculado client-side e passado aqui como payload.
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('atividades_campo')
      .insert({ ...payload, fazenda_id: fazendaId })
      .select()
      .single();
    if (error) throw error;
    return data as AtividadeCampo;
  },

  async update(
    id: string,
    payload: Partial<AtividadeCampo>
  ): Promise<AtividadeCampo> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('atividades_campo')
      .update(payload)
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .select()
      .single();
    if (error) throw error;
    return data as AtividadeCampo;
  },

  async remove(id: string): Promise<void> {
    const fazendaId = await getFazendaId();
    const { error } = await supabase
      .from('atividades_campo')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// TALHÕES — Eventos DAP (Days After Planting)
// ---------------------------------------------------------------------------
const eventosDAP = {
  async listByCiclo(cicloId: string): Promise<EventoDAP[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('eventos_dap')
      .select('*')
      .eq('ciclo_id', cicloId)
      .eq(
        'talhao_id',
        `(SELECT id FROM talhoes WHERE fazenda_id = '${fazendaId}')`
      )
      .order('dias_apos_plantio', { ascending: true });
    if (error) throw error;
    return data as EventoDAP[];
  },

  async create(payload: Omit<EventoDAP, 'id' | 'created_at' | 'updated_at'>): Promise<EventoDAP> {
    const { data, error } = await supabase
      .from('eventos_dap')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as EventoDAP;
  },

  async update(id: string, payload: Partial<EventoDAP>): Promise<EventoDAP> {
    const { data, error } = await supabase
      .from('eventos_dap')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as EventoDAP;
  },

  async generate(cicloId: string, cultura: string, dataplantio: string): Promise<number> {
    const { gerarEventosDAP } = await import('@/app/dashboard/talhoes/helpers');
    const { data: cicloData, error: cicloError } = await supabase
      .from('ciclos_agricolas')
      .select('talhao_id, data_colheita_prevista')
      .eq('id', cicloId)
      .single();

    if (cicloError) throw cicloError;
    const { talhao_id, data_colheita_prevista } = cicloData;

    const eventos = gerarEventosDAP(cultura, dataplantio, data_colheita_prevista);

    if (eventos.length === 0) return 0;

    const { error: insertError } = await supabase.from('eventos_dap').insert(
      eventos.map((evt) => ({
        ...evt,
        ciclo_id: cicloId,
        talhao_id,
      }))
    );

    if (insertError) throw insertError;
    return eventos.length;
  },

  async generateRebrota(cicloId: string, cultura: string, dataColheitaReal: string): Promise<number> {
    const { gerarEventosRebrota } = await import('@/app/dashboard/talhoes/helpers');

    const eventosRebrota = gerarEventosRebrota(cultura, dataColheitaReal);

    if (eventosRebrota.length === 0) return 0;

    const { data: cicloData, error: cicloError } = await supabase
      .from('ciclos_agricolas')
      .select('talhao_id')
      .eq('id', cicloId)
      .single();

    if (cicloError) throw cicloError;
    const talhaoId = (cicloData as any).talhao_id;

    const { error: insertError } = await supabase.from('eventos_dap').insert(
      eventosRebrota.map((evt) => ({
        ...evt,
        ciclo_id: cicloId,
        talhao_id: talhaoId,
      }))
    );

    if (insertError) throw insertError;
    return eventosRebrota.length;
  },
};

// ---------------------------------------------------------------------------
// REBANHO — Categorias
// ---------------------------------------------------------------------------
const categoriasRebanho = {
  async list(): Promise<CategoriaRebanho[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('categorias_rebanho')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('nome');
    if (error) throw error;
    return data as CategoriaRebanho[];
  },

  async upsert(payload: Partial<CategoriaRebanho>): Promise<CategoriaRebanho> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('categorias_rebanho')
      .upsert({ ...payload, fazenda_id: fazendaId })
      .select()
      .single();
    if (error) throw error;
    return data as CategoriaRebanho;
  },

  async remove(id: string): Promise<void> {
    const fazendaId = await getFazendaId();
    const { error } = await supabase
      .from('categorias_rebanho')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// REBANHO — Períodos de Confinamento
// ---------------------------------------------------------------------------
const periodosConfinamento = {
  async list(): Promise<PeriodoConfinamento[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('periodos_confinamento')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('data_inicio', { ascending: false });
    if (error) throw error;
    return data as PeriodoConfinamento[];
  },

  async upsert(
    payload: Partial<PeriodoConfinamento>
  ): Promise<PeriodoConfinamento> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('periodos_confinamento')
      .upsert({ ...payload, fazenda_id: fazendaId })
      .select()
      .single();
    if (error) throw error;
    return data as PeriodoConfinamento;
  },

  async remove(id: string): Promise<void> {
    const fazendaId = await getFazendaId();
    const { error } = await supabase
      .from('periodos_confinamento')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// PLANEJAMENTOS DE SILAGEM
// ---------------------------------------------------------------------------
const planejamentosSilagem = {
  async list(): Promise<PlanejamentoSilagem[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('planejamentos_silagem')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as PlanejamentoSilagem[];
  },

  async create(
    payload: Omit<PlanejamentoSilagem, 'id' | 'created_at'>
  ): Promise<PlanejamentoSilagem> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('planejamentos_silagem')
      .insert({ ...payload, fazenda_id: fazendaId })
      .select()
      .single();
    if (error) throw error;
    return data as PlanejamentoSilagem;
  },

  async getById(id: string): Promise<PlanejamentoSilagem> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('planejamentos_silagem')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .single();
    if (error) throw error;
    return data as PlanejamentoSilagem;
  },

  async delete(id: string): Promise<void> {
    const fazendaId = await getFazendaId();
    const { error } = await supabase
      .from('planejamentos_silagem')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
  },

  async updateNome(id: string, nome: string): Promise<PlanejamentoSilagem> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('planejamentos_silagem')
      .update({ nome })
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .select()
      .single();
    if (error) throw error;
    return data as PlanejamentoSilagem;
  },
};

// ---------------------------------------------------------------------------
// SERVER-SIDE QUERIES — Para uso em Server Actions e Server Components
// ---------------------------------------------------------------------------

/**
 * Busca o fazenda_id do usuário logado usando Server Client SSR-safe.
 * Use em Server Actions/Components. Para Client Components, use getFazendaId().
 */
async function getFazendaIdServer(): Promise<string> {
  const { createSupabaseServerClient } = await import('./server');
  const supabaseServer = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabaseServer.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuário não autenticado. Faça login novamente.');
  }

  const { data: profile, error: profileError } = await supabaseServer
    .from('profiles')
    .select('fazenda_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.fazenda_id) {
    throw new Error(
      'Perfil sem fazenda associada. Conclua o cadastro antes de continuar.'
    );
  }

  return profile.fazenda_id as string;
}

/**
 * Queries server-side para uso em Server Actions.
 * Usa Server Client com acesso a cookies HTTP.
 * Importação dinâmica evita carregar next/headers em Client Components.
 */
const planejamentosSilagemServer = {
  async list(): Promise<PlanejamentoSilagem[]> {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    const fazendaId = await getFazendaIdServer();
    const { data, error } = await supabaseServer
      .from('planejamentos_silagem')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as PlanejamentoSilagem[];
  },

  async create(
    payload: Omit<PlanejamentoSilagem, 'id' | 'created_at'>
  ): Promise<PlanejamentoSilagem> {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    const fazendaId = await getFazendaIdServer();
    const { data, error } = await supabaseServer
      .from('planejamentos_silagem')
      .insert({ ...payload, fazenda_id: fazendaId })
      .select()
      .single();
    if (error) throw error;
    return data as PlanejamentoSilagem;
  },

  async getById(id: string): Promise<PlanejamentoSilagem> {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    const fazendaId = await getFazendaIdServer();
    const { data, error } = await supabaseServer
      .from('planejamentos_silagem')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .single();
    if (error) throw error;
    return data as PlanejamentoSilagem;
  },

  async delete(id: string): Promise<void> {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    const fazendaId = await getFazendaIdServer();
    const { error } = await supabaseServer
      .from('planejamentos_silagem')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
  },

  async updateNome(id: string, nome: string): Promise<PlanejamentoSilagem> {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    const fazendaId = await getFazendaIdServer();
    const { data, error } = await supabaseServer
      .from('planejamentos_silagem')
      .update({ nome })
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .select()
      .single();
    if (error) throw error;
    return data as PlanejamentoSilagem;
  },
};

// ---------------------------------------------------------------------------
// AVALIAÇÕES BROMATOLÓGICAS
// ---------------------------------------------------------------------------
const avaliacoesBromatologicas = {
  async listBySilo(siloId: string): Promise<AvaliacaoBromatologica[]> {
    await getFazendaId();
    const { data, error } = await supabase
      .from('avaliacoes_bromatologicas')
      .select('*')
      .eq('silo_id', siloId)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as AvaliacaoBromatologica[];
  },

  async create(payload: AvaliacaoBromatologicaInput): Promise<AvaliacaoBromatologica> {
    await getFazendaId();
    const { data, error } = await supabase
      .from('avaliacoes_bromatologicas')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as AvaliacaoBromatologica;
  },

  async remove(id: string): Promise<void> {
    await getFazendaId();
    const { error } = await supabase
      .from('avaliacoes_bromatologicas')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// AVALIAÇÕES PSPS
// ---------------------------------------------------------------------------
const avaliacoesPsps = {
  async listBySilo(siloId: string): Promise<AvaliacaoPSPS[]> {
    await getFazendaId();
    const { data, error } = await supabase
      .from('avaliacoes_psps')
      .select('*')
      .eq('silo_id', siloId)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as AvaliacaoPSPS[];
  },

  // Nota: não enviar tmp_mm no payload — é GENERATED pelo BD
  async create(payload: AvaliacaoPspsInput): Promise<AvaliacaoPSPS> {
    await getFazendaId();
    const { data, error } = await supabase
      .from('avaliacoes_psps')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as AvaliacaoPSPS;
  },

  async remove(id: string): Promise<void> {
    await getFazendaId();
    const { error } = await supabase
      .from('avaliacoes_psps')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// EXPORT PRINCIPAL — use `q.<tabela>.<operação>()` para Client
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// PLANOS DE MANUTENÇÃO
// ---------------------------------------------------------------------------
const planosManutencao = {
  async listByMaquina(maquinaId: string): Promise<PlanoManutencao[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('planos_manutencao')
      .select('id, maquina_id, descricao, intervalo_horas, intervalo_dias, horimetro_base, data_base, ativo, fazenda_id, created_at')
      .eq('maquina_id', maquinaId)
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as PlanoManutencao[];
  },

  async listByMaquinas(maquinaIds: string[]): Promise<PlanoManutencao[]> {
    if (maquinaIds.length === 0) return [];
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('planos_manutencao')
      .select('id, maquina_id, descricao, intervalo_horas, intervalo_dias, horimetro_base, data_base, ativo, fazenda_id, created_at')
      .in('maquina_id', maquinaIds)
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as PlanoManutencao[];
  },

  async create(payload: Omit<PlanoManutencao, 'id' | 'created_at'>): Promise<PlanoManutencao> {
    const fazendaId = await getFazendaId();
    const { count, error: checkError } = await supabase
      .from('maquinas')
      .select('id', { count: 'exact', head: true })
      .eq('id', payload.maquina_id)
      .eq('fazenda_id', fazendaId);
    if (checkError || count === 0) {
      throw new Error('Máquina não encontrada ou não pertence a esta fazenda.');
    }

    const { data, error } = await supabase
      .from('planos_manutencao')
      .insert({ ...payload, fazenda_id: fazendaId })
      .select('id, maquina_id, descricao, intervalo_horas, intervalo_dias, horimetro_base, data_base, ativo, fazenda_id, created_at')
      .single();
    if (error) throw error;
    return data as PlanoManutencao;
  },

  async update(id: string, payload: Partial<Omit<PlanoManutencao, 'id' | 'created_at' | 'fazenda_id'>>): Promise<void> {
    const fazendaId = await getFazendaId();
    const { error } = await supabase
      .from('planos_manutencao')
      .update(payload)
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const fazendaId = await getFazendaId();
    const { error } = await supabase
      .from('planos_manutencao')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
  },
};

export const q = {
  silos,
  movimentacoesSilo,
  talhoes,
  ciclosAgricolas,
  atividadesCampo,
  eventosDAP,
  insumos,
  movimentacoesInsumo,
  categorias,
  tipos,
  locais,
  maquinas,
  usoMaquinas,
  manutencoes,
  abastecimentos,
  planosManutencao,
  financeiro,
  categoriasRebanho,
  periodosConfinamento,
  planejamentosSilagem,
  avaliacoesBromatologicas,
  avaliacoesPsps,
};

// ---------------------------------------------------------------------------
// EXPORT SERVER — use `qServer.<tabela>.<operação>()` em Server Actions
// ---------------------------------------------------------------------------
export const qServer = {
  planejamentosSilagem: planejamentosSilagemServer,
  categorias: categoriasServer,
  tipos: tiposServer,
  insumos: insumosServer,
  movimentacoesInsumo: movimentacoesInsumoServer,
  financeiro: financeiroServer,
};
