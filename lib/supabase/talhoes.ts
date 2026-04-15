import { supabase, type Financeiro } from '../supabase';
import type {
  Talhao,
  CicloAgricola,
  AtividadeCampo,
  EventoDAP,
  ProximaOperacao,
} from '@/lib/types/talhoes';
import type { TalhaoInput, CicloAgricolaInput, AtividadeCampoInput } from '@/lib/validations/talhoes';

/**
 * Calcula o custo total de um talhão em um período específico
 * baseado na tabela financeiro (referencia_tipo = 'Talhão')
 */
export async function getCustoTalhaoPeriodo(talhaoId: string, dataInicio: string, dataFim: string) {
  const { data, error } = await supabase
    .from('financeiro')
    .select('valor')
    .eq('referencia_id', talhaoId)
    .eq('referencia_tipo', 'Talhão')
    .eq('tipo', 'Despesa')
    .gte('data', dataInicio)
    .lte('data', dataFim);

  if (error) throw error;

  const custoTotal = (data as Financeiro[])?.reduce((acc: number, r: Financeiro) => acc + (r.valor || 0), 0) ?? 0;
  return custoTotal;
}

// ========== TALHOES (Bloco 1) ==========

export async function getTalhaoById(id: string): Promise<Talhao | null> {
  try {
    const { data, error } = await supabase
      .from('talhoes')
      .select('id, fazenda_id, nome, area_ha, tipo_solo, status, observacoes, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Talhao;
  } catch (error) {
    console.error('Erro ao buscar talhão:', error);
    return null;
  }
}

export async function listTalhoes(): Promise<Talhao[]> {
  try {
    const { data, error } = await supabase
      .from('talhoes')
      .select('id, fazenda_id, nome, area_ha, tipo_solo, status, observacoes, created_at, updated_at')
      .order('nome', { ascending: true });

    if (error) throw error;
    return (data as Talhao[]) || [];
  } catch (error) {
    console.error('Erro ao listar talhões:', error);
    return [];
  }
}

export async function createTalhao(input: TalhaoInput): Promise<Talhao> {
  try {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('fazenda_id')
      .single();

    if (!profileData?.fazenda_id) {
      throw new Error('Fazenda não encontrada para o usuário');
    }

    const { data, error } = await supabase
      .from('talhoes')
      .insert({
        fazenda_id: profileData.fazenda_id,
        ...input,
        status: 'Em pousio',
      })
      .select('id, fazenda_id, nome, area_ha, tipo_solo, status, observacoes, created_at, updated_at')
      .single();

    if (error) throw error;
    return data as Talhao;
  } catch (error) {
    console.error('Erro ao criar talhão:', error);
    throw error;
  }
}

export async function updateTalhao(id: string, input: Partial<TalhaoInput>): Promise<Talhao> {
  try {
    const { data, error } = await supabase
      .from('talhoes')
      .update(input)
      .eq('id', id)
      .select('id, fazenda_id, nome, area_ha, tipo_solo, status, observacoes, created_at, updated_at')
      .single();

    if (error) throw error;
    return data as Talhao;
  } catch (error) {
    console.error('Erro ao atualizar talhão:', error);
    throw error;
  }
}

export async function deleteTalhao(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('talhoes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao deletar talhão:', error);
    throw error;
  }
}

// ========== CICLOS AGRICOLAS ==========

export async function getCicloAtivo(talhaoId: string): Promise<CicloAgricola | null> {
  try {
    const { data, error } = await supabase
      .from('ciclos_agricolas')
      .select(
        'id, talhao_id, cultura, data_plantio, data_colheita_prevista, data_colheita_real, produtividade_ton_ha, custo_total_estimado, permite_rebrota, ativo, created_at, updated_at'
      )
      .eq('talhao_id', talhaoId)
      .eq('ativo', true)
      .order('data_plantio', { ascending: false })
      .limit(1)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;

    return data as CicloAgricola;
  } catch (error) {
    console.error('Erro ao buscar ciclo ativo:', error);
    return null;
  }
}

export async function createCiclo(input: CicloAgricolaInput): Promise<CicloAgricola> {
  try {
    const { data, error } = await supabase
      .from('ciclos_agricolas')
      .insert({
        ...input,
        ativo: true,
      })
      .select(
        'id, talhao_id, cultura, data_plantio, data_colheita_prevista, data_colheita_real, produtividade_ton_ha, custo_total_estimado, permite_rebrota, ativo, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return data as CicloAgricola;
  } catch (error) {
    console.error('Erro ao criar ciclo agrícola:', error);
    throw error;
  }
}

export async function closeCiclo(
  cicloId: string,
  data_colheita_real: string,
  produtividade: number
): Promise<CicloAgricola> {
  try {
    const { data, error } = await supabase
      .from('ciclos_agricolas')
      .update({
        data_colheita_real,
        produtividade_ton_ha: produtividade,
        ativo: false,
      })
      .eq('id', cicloId)
      .select(
        'id, talhao_id, cultura, data_plantio, data_colheita_prevista, data_colheita_real, produtividade_ton_ha, custo_total_estimado, permite_rebrota, ativo, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return data as CicloAgricola;
  } catch (error) {
    console.error('Erro ao fechar ciclo:', error);
    throw error;
  }
}

// ========== ATIVIDADES CAMPO ==========

export async function listAtividadesByCiclo(cicloId: string): Promise<AtividadeCampo[]> {
  try {
    const { data, error } = await supabase
      .from('atividades_campo')
      .select(
        `id, ciclo_id, talhao_id, tipo_operacao, data, maquina_id, horas_maquina, observacoes,
         custo_total, custo_manual, tipo_operacao_solo, insumo_id, dose_ton_ha, semente_id,
         populacao_plantas_ha, sacos_ha, espacamento_entre_linhas_cm, categoria_pulverizacao,
         dose_valor, dose_unidade, volume_calda_l_ha, produtividade_ton_ha, maquina_colheita_id,
         horas_colheita, maquina_transporte_id, horas_transporte, maquina_compactacao_id,
         horas_compactacao, valor_terceirizacao_r, custo_amostra_r, metodo_entrada, url_pdf_analise,
         ph_cacl2, mo_g_dm3, p_mg_dm3, k_mmolc_dm3, ca_mmolc_dm3, mg_mmolc_dm3, al_mmolc_dm3,
         h_al_mmolc_dm3, s_mg_dm3, b_mg_dm3, cu_mg_dm3, fe_mg_dm3, mn_mg_dm3, zn_mg_dm3,
         sb_mmolc_dm3, ctc_mmolc_dm3, v_percent, lamina_mm, horas_irrigacao, custo_por_hora_r,
         created_at, updated_at`
      )
      .eq('ciclo_id', cicloId)
      .order('data', { ascending: false });

    if (error) throw error;
    return (data as AtividadeCampo[]) || [];
  } catch (error) {
    console.error('Erro ao listar atividades:', error);
    return [];
  }
}

export async function createAtividade(input: AtividadeCampoInput): Promise<AtividadeCampo> {
  try {
    const { data, error } = await supabase
      .from('atividades_campo')
      .insert({
        ...input,
        custo_total: 0,
      })
      .select(
        `id, ciclo_id, talhao_id, tipo_operacao, data, maquina_id, horas_maquina, observacoes,
         custo_total, custo_manual, tipo_operacao_solo, insumo_id, dose_ton_ha, semente_id,
         populacao_plantas_ha, sacos_ha, espacamento_entre_linhas_cm, categoria_pulverizacao,
         dose_valor, dose_unidade, volume_calda_l_ha, produtividade_ton_ha, maquina_colheita_id,
         horas_colheita, maquina_transporte_id, horas_transporte, maquina_compactacao_id,
         horas_compactacao, valor_terceirizacao_r, custo_amostra_r, metodo_entrada, url_pdf_analise,
         ph_cacl2, mo_g_dm3, p_mg_dm3, k_mmolc_dm3, ca_mmolc_dm3, mg_mmolc_dm3, al_mmolc_dm3,
         h_al_mmolc_dm3, s_mg_dm3, b_mg_dm3, cu_mg_dm3, fe_mg_dm3, mn_mg_dm3, zn_mg_dm3,
         sb_mmolc_dm3, ctc_mmolc_dm3, v_percent, lamina_mm, horas_irrigacao, custo_por_hora_r,
         created_at, updated_at`
      )
      .single();

    if (error) throw error;
    return data as AtividadeCampo;
  } catch (error) {
    console.error('Erro ao criar atividade:', error);
    throw error;
  }
}

// ========== EVENTOS DAP ==========

export async function listEventosDAP(cicloId: string): Promise<EventoDAP[]> {
  try {
    const { data, error } = await supabase
      .from('eventos_dap')
      .select(
        'id, ciclo_id, talhao_id, cultura, tipo_operacao, dias_apos_plantio, dias_apos_plantio_final, data_esperada, data_realizada, status, atividade_campo_id, created_at, updated_at'
      )
      .eq('ciclo_id', cicloId)
      .order('dias_apos_plantio', { ascending: true });

    if (error) throw error;
    return (data as EventoDAP[]) || [];
  } catch (error) {
    console.error('Erro ao listar eventos DAP:', error);
    return [];
  }
}

export async function generateEventosDAP(
  cicloId: string,
  cultura: string,
  dataplantio: string
): Promise<void> {
  try {
    const MATRIZ_DAP: Record<string, Array<{ tipo: string; dap: string; rebrota?: boolean }>> = {
      'Milho Grão': [
        { tipo: 'Dessecação', dap: '0' },
        { tipo: 'Plantio', dap: '0-5' },
        { tipo: 'Herbicida pós-emergente', dap: '10-20' },
        { tipo: 'Adubação cobertura', dap: '30-40' },
        { tipo: 'Inseticida', dap: '35-45' },
        { tipo: 'Fungicida', dap: '50-60' },
        { tipo: 'Colheita', dap: '120-150' },
      ],
      'Sorgo Silagem': [
        { tipo: 'Plantio', dap: '0-5' },
        { tipo: 'Adubação cobertura', dap: '30-40' },
        { tipo: 'Inseticida', dap: '35-45' },
        { tipo: 'Fungicida', dap: '45-55' },
        { tipo: 'Colheita', dap: '90-110' },
        { tipo: 'Adubação cobertura (rebrota)', dap: '95-105', rebrota: true },
        { tipo: 'Colheita rebrota', dap: '155-165', rebrota: true },
      ],
      'Soja': [
        { tipo: 'Plantio', dap: '0-5' },
        { tipo: 'Adubação cobertura', dap: '20-30' },
        { tipo: 'Pulverização', dap: '35-45' },
        { tipo: 'Colheita', dap: '105-130' },
      ],
      'Milho Silagem': [
        { tipo: 'Dessecação', dap: '0' },
        { tipo: 'Plantio', dap: '0-5' },
        { tipo: 'Herbicida pós-emergente', dap: '10-20' },
        { tipo: 'Adubação cobertura', dap: '30-40' },
        { tipo: 'Colheita', dap: '100-120' },
      ],
    };

    const daps = MATRIZ_DAP[cultura] || [];
    const plantioDate = new Date(dataplantio);

    const eventos = daps
      .filter((dap) => !dap.rebrota)
      .map((dap) => {
        const [dapMin, dapMax] = dap.dap.split('-').map(Number);
        const dataEsperada = new Date(plantioDate);
        dataEsperada.setDate(dataEsperada.getDate() + (dapMax || dapMin));

        return {
          ciclo_id: cicloId,
          cultura,
          tipo_operacao: dap.tipo,
          dias_apos_plantio: dapMin,
          dias_apos_plantio_final: dapMax || undefined,
          data_esperada: dataEsperada.toISOString().split('T')[0],
          status: 'Planejado',
        };
      });

    const { data: cicloData, error: cicloError } = await supabase
      .from('ciclos_agricolas')
      .select('talhao_id')
      .eq('id', cicloId)
      .single();

    if (cicloError) throw cicloError;
    const talhaoId = (cicloData as any).talhao_id;

    const { error } = await supabase.from('eventos_dap').insert(
      eventos.map((evt) => ({
        ...evt,
        talhao_id: talhaoId,
      }))
    );

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao gerar eventos DAP:', error);
    throw error;
  }
}

export async function calcularCustoTotalCiclo(cicloId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('atividades_campo')
      .select('custo_total')
      .eq('ciclo_id', cicloId);

    if (error) throw error;

    const total = (data || []).reduce((sum, atividade) => sum + (atividade.custo_total || 0), 0);
    return total;
  } catch (error) {
    console.error('Erro ao calcular custo total do ciclo:', error);
    return 0;
  }
}

export async function getProximasOperacoes(fazendaId: string): Promise<ProximaOperacao[]> {
  try {
    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - 2);
    const fim = new Date(hoje);
    fim.setDate(hoje.getDate() + 5);

    const inicioStr = inicio.toISOString().split('T')[0];
    const fimStr = fim.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('eventos_dap')
      .select(
        'id, data_esperada, data_realizada, tipo_operacao, status, cultura, talhoes!inner(id, nome, fazenda_id)'
      )
      .eq('talhoes.fazenda_id', fazendaId)
      .gte('data_esperada', inicioStr)
      .lte('data_esperada', fimStr)
      .order('data_esperada', { ascending: true });

    if (error) throw error;

    return (data || []).map((evento: any) => ({
      id: evento.id,
      data_esperada: evento.data_esperada,
      data_realizada: evento.data_realizada,
      tipo_operacao: evento.tipo_operacao,
      status: evento.status,
      cultura: evento.cultura,
      talhao_nome: evento.talhoes.nome,
    }));
  } catch (error) {
    console.error('Erro ao buscar próximas operações:', error);
    return [];
  }
}
