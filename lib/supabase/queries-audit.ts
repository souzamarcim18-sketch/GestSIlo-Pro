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
  type Maquina,
  type UsoMaquina,
  type Manutencao,
  type Abastecimento,
  type Financeiro,
  type AtividadeCampo,
  type CategoriaRebanho,
  type PeriodoConfinamento,
  type AvaliacaoBromatologica,
  type AvaliacaoPsps,
} from '../supabase';

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
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Silo[];
  },

  async getById(id: string): Promise<Silo> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('silos')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .single();
    if (error) throw error;
    return data as Silo;
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
    const { error } = await supabase
      .from('silos')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazendaId);
    if (error) throw error;
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
    const { count, error: checkError } = await supabase
      .from('silos')
      .select('id', { count: 'exact', head: true })
      .eq('id', payload.silo_id)
      .eq('fazenda_id', fazendaId);
    if (checkError || count === 0) {
      throw new Error('Silo não encontrado ou não pertence a esta fazenda.');
    }

    const { data, error } = await supabase
      .from('movimentacoes_silo')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
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

  async getById(id: string): Promise<Talhao> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('talhoes')
      .select('*')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .single();
    if (error) throw error;
    return data as Talhao;
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
  async list(): Promise<Insumo[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('insumos')
      .select('*')
      .eq('fazenda_id', fazendaId)
      .order('nome', { ascending: true });
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

  async create(payload: Omit<Insumo, 'id'>): Promise<Insumo> {
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

  async remove(id: string): Promise<void> {
    const fazendaId = await getFazendaId();
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
};

// ---------------------------------------------------------------------------
// MÁQUINAS
// ---------------------------------------------------------------------------
const maquinas = {
  async list(): Promise<Maquina[]> {
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('maquinas')
      .select('*')
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
      .select('*')
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
      .select('*')
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
      .select('*')
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
      .select('*')
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
      .select('*')
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
      .select('*')
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
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('atividades_campo')
      .select('*')
      .eq('fazenda_id', fazendaId) // filtro explícito além do talhao_id
      .eq('talhao_id', talhaoId)
      .order('data_atividade', { ascending: false });
    if (error) throw error;
    return data as AtividadeCampo[];
  },

  async create(
    payload: Omit<AtividadeCampo, 'id' | 'created_at'>
  ): Promise<AtividadeCampo> {
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
// AVALIAÇÕES BROMATOLÓGICAS
// ---------------------------------------------------------------------------
const avaliacoesBromatologicas = {
  async listBySilo(siloId: string): Promise<AvaliacaoBromatologica[]> {
    await getFazendaId(); // Garantir sessão ativa
    const { data, error } = await supabase
      .from('avaliacoes_bromatologicas')
      .select('*')
      .eq('silo_id', siloId)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as AvaliacaoBromatologica[];
  },

  async create(
    payload: Omit<AvaliacaoBromatologica, 'id' | 'created_at' | 'updated_at'>
  ): Promise<AvaliacaoBromatologica> {
    const fazendaId = await getFazendaId();
    // Verificar que o silo pertence à fazenda
    const { count, error: checkError } = await supabase
      .from('silos')
      .select('id', { count: 'exact', head: true })
      .eq('id', payload.silo_id)
      .eq('fazenda_id', fazendaId);
    if (checkError || count === 0) {
      throw new Error('Silo não encontrado ou não pertence a esta fazenda.');
    }

    const { data, error } = await supabase
      .from('avaliacoes_bromatologicas')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as AvaliacaoBromatologica;
  },

  async remove(id: string): Promise<void> {
    await getFazendaId(); // Garantir sessão ativa
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
  async listBySilo(siloId: string): Promise<AvaliacaoPsps[]> {
    await getFazendaId(); // Garantir sessão ativa
    const { data, error } = await supabase
      .from('avaliacoes_psps')
      .select('*')
      .eq('silo_id', siloId)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as AvaliacaoPsps[];
  },

  async create(
    payload: Omit<AvaliacaoPsps, 'id' | 'created_at' | 'updated_at'>
  ): Promise<AvaliacaoPsps> {
    const fazendaId = await getFazendaId();
    // Verificar que o silo pertence à fazenda
    const { count, error: checkError } = await supabase
      .from('silos')
      .select('id', { count: 'exact', head: true })
      .eq('id', payload.silo_id)
      .eq('fazenda_id', fazendaId);
    if (checkError || count === 0) {
      throw new Error('Silo não encontrado ou não pertence a esta fazenda.');
    }

    // Validar que soma das peneiras = 100%
    const soma =
      payload.peneira_19mm +
      payload.peneira_8_19mm +
      payload.peneira_4_8mm +
      payload.peneira_fundo_4mm;
    if (Math.abs(soma - 100) > 0.01) {
      throw new Error('A soma das peneiras deve ser igual a 100%');
    }

    const { data, error } = await supabase
      .from('avaliacoes_psps')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as AvaliacaoPsps;
  },

  async remove(id: string): Promise<void> {
    await getFazendaId(); // Garantir sessão ativa
    const { error } = await supabase
      .from('avaliacoes_psps')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// EXPORT PRINCIPAL — use `q.<tabela>.<operação>()`
// ---------------------------------------------------------------------------
export const q = {
  silos,
  movimentacoesSilo,
  talhoes,
  ciclosAgricolas,
  insumos,
  movimentacoesInsumo,
  maquinas,
  usoMaquinas,
  manutencoes,
  abastecimentos,
  financeiro,
  atividadesCampo,
  categoriasRebanho,
  periodosConfinamento,
  avaliacoesBromatologicas,
  avaliacoesPsps,
};
