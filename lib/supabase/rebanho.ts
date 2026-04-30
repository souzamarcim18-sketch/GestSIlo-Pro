'use server';

import { createSupabaseServerClient } from './server';
import type {
  Animal,
  Lote,
  EventoRebanho,
  PesoAnimal,
  LoteInput,
  EventoRebanhoInput,
  PesoAnimalInput,
  CSVImportResult,
} from '@/lib/types/rebanho';
import {
  animalCSVRowSchema,
  type CriarAnimalInput,
  type EditarAnimalInput,
  type CriarEventoInput,
} from '@/lib/validations/rebanho';
import { TipoEvento } from '@/lib/types/rebanho';

// ---------------------------------------------------------------------------
// Helper interno — nunca exportar diretamente
// ---------------------------------------------------------------------------

const fazendaIdCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Busca o fazenda_id do usuário logado a partir do seu profile.
 * Lança erro se não houver sessão ou se o profile não tiver fazenda associada.
 * Cacheia o resultado por 5 minutos para evitar queries desnecessárias.
 */
async function getFazendaId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuário não autenticado. Faça login novamente.');
  }

  // Verificar cache
  const cached = fazendaIdCache.get(user.id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
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

  const fazendaId = profile.fazenda_id as string;
  fazendaIdCache.set(user.id, { value: fazendaId, expiresAt: Date.now() + CACHE_TTL_MS });
  return fazendaId;
}

/**
 * Busca o user_id do usuário logado.
 */
async function getUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuário não autenticado.');
  }

  return user.id;
}

// ---------------------------------------------------------------------------
// ANIMAIS
// ---------------------------------------------------------------------------

export const animais = {
  async list(
    filtros?: {
      status?: string;
      lote_id?: string;
      categoria?: string;
      sexo?: string;
    },
    pagina: number = 1,
    limite: number = 50
  ): Promise<{ dados: Animal[]; total: number }> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const offset = (pagina - 1) * limite;

    let query = supabase
      .from('animais')
      .select(
        'id, fazenda_id, numero_animal, sexo, tipo_rebanho, data_nascimento, categoria, status, lote_id, peso_atual, mae_id, pai_id, raca, observacoes, deleted_at, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .order('numero_animal', { ascending: true });

    if (filtros?.status) {
      query = query.eq('status', filtros.status);
    }
    if (filtros?.lote_id) {
      query = query.eq('lote_id', filtros.lote_id);
    }
    if (filtros?.categoria) {
      query = query.eq('categoria', filtros.categoria);
    }
    if (filtros?.sexo) {
      query = query.eq('sexo', filtros.sexo);
    }

    query = query.range(offset, offset + limite - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      dados: (data as Animal[]) || [],
      total: count || 0,
    };
  },

  async getById(id: string): Promise<Animal> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('animais')
      .select(
        'id, fazenda_id, numero_animal, sexo, tipo_rebanho, data_nascimento, categoria, status, lote_id, peso_atual, mae_id, pai_id, raca, observacoes, deleted_at, created_at, updated_at'
      )
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data as Animal;
  },

  async getByNumero(numero_animal: string): Promise<Animal | null> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('animais')
      .select(
        'id, fazenda_id, numero_animal, sexo, tipo_rebanho, data_nascimento, categoria, status, lote_id, peso_atual, mae_id, pai_id, raca, observacoes, deleted_at, created_at, updated_at'
      )
      .eq('fazenda_id', fazendaId)
      .eq('numero_animal', numero_animal)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as Animal) || null;
  },

  async create(payload: CriarAnimalInput): Promise<Animal> {
    const supabase = await createSupabaseServerClient();
    await getFazendaId();
    const { data, error } = await supabase
      .from('animais')
      .insert({
        ...payload,
        status: 'Ativo',
        peso_atual: null,
      })
      .select(
        'id, fazenda_id, numero_animal, sexo, tipo_rebanho, data_nascimento, categoria, status, lote_id, peso_atual, mae_id, pai_id, raca, observacoes, deleted_at, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return data as Animal;
  },

  async update(id: string, payload: EditarAnimalInput): Promise<Animal> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('animais')
      .update(payload)
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .select(
        'id, fazenda_id, numero_animal, sexo, tipo_rebanho, data_nascimento, categoria, status, lote_id, peso_atual, mae_id, pai_id, raca, observacoes, deleted_at, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return data as Animal;
  },

  async remove(id: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { error } = await supabase
      .from('animais')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('fazenda_id', fazendaId);

    if (error) throw error;
  },

  async listAtivos(): Promise<Animal[]> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('animais')
      .select(
        'id, fazenda_id, numero_animal, sexo, tipo_rebanho, data_nascimento, categoria, status, lote_id, peso_atual, mae_id, pai_id, raca, observacoes, deleted_at, created_at, updated_at'
      )
      .eq('fazenda_id', fazendaId)
      .eq('status', 'Ativo')
      .is('deleted_at', null);

    if (error) throw error;
    return (data as Animal[]) || [];
  },

  async search(query: string, limite: number = 10): Promise<Animal[]> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('animais')
      .select(
        'id, fazenda_id, numero_animal, sexo, tipo_rebanho, data_nascimento, categoria, status, lote_id, peso_atual, mae_id, pai_id, raca, observacoes, deleted_at, created_at, updated_at'
      )
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .or(`numero_animal.ilike.%${query}%`)
      .limit(limite);

    if (error) throw error;
    return (data as Animal[]) || [];
  },

  async countPorStatus(): Promise<Record<string, number>> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('animais')
      .select('status')
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null);

    if (error) throw error;

    const counts: Record<string, number> = {
      Ativo: 0,
      Morto: 0,
      Vendido: 0,
    };

    (data as Pick<Animal, 'status'>[]).forEach((animal) => {
      if (animal.status in counts) {
        counts[animal.status]++;
      }
    });

    return counts;
  },
};

// ---------------------------------------------------------------------------
// LOTES
// ---------------------------------------------------------------------------

export const lotes = {
  async list(
    pagina: number = 1,
    limite: number = 50
  ): Promise<{ dados: Lote[]; total: number }> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const offset = (pagina - 1) * limite;

    const { data, error, count } = await supabase
      .from('lotes')
      .select(
        'id, fazenda_id, nome, descricao, data_criacao, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('fazenda_id', fazendaId)
      .order('nome', { ascending: true })
      .range(offset, offset + limite - 1);

    if (error) throw error;

    return {
      dados: (data as Lote[]) || [],
      total: count || 0,
    };
  },

  async getById(id: string): Promise<Lote> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('lotes')
      .select('id, fazenda_id, nome, descricao, data_criacao, created_at, updated_at')
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .single();

    if (error) throw error;
    return data as Lote;
  },

  async getByNome(nome: string): Promise<Lote | null> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('lotes')
      .select('id, fazenda_id, nome, descricao, data_criacao, created_at, updated_at')
      .eq('fazenda_id', fazendaId)
      .eq('nome', nome)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as Lote) || null;
  },

  async create(payload: LoteInput): Promise<Lote> {
    const supabase = await createSupabaseServerClient();
    await getFazendaId();
    const { data, error } = await supabase
      .from('lotes')
      .insert(payload)
      .select('id, fazenda_id, nome, descricao, data_criacao, created_at, updated_at')
      .single();

    if (error) throw error;
    return data as Lote;
  },

  async update(id: string, payload: Partial<LoteInput>): Promise<Lote> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('lotes')
      .update(payload)
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .select('id, fazenda_id, nome, descricao, data_criacao, created_at, updated_at')
      .single();

    if (error) throw error;
    return data as Lote;
  },

  async remove(id: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();

    // Validar que lote não tem animais ativos
    const { count, error: checkError } = await supabase
      .from('animais')
      .select('id', { count: 'exact', head: true })
      .eq('lote_id', id)
      .eq('fazenda_id', fazendaId)
      .eq('status', 'Ativo')
      .is('deleted_at', null);

    if (checkError) throw checkError;
    if (count && count > 0) {
      throw new Error('Não é possível deletar um lote que possui animais ativos.');
    }

    const { error } = await supabase
      .from('lotes')
      .delete()
      .eq('id', id)
      .eq('fazenda_id', fazendaId);

    if (error) throw error;
  },

  async countAnimaisAtivos(lote_id: string): Promise<number> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { count, error } = await supabase
      .from('animais')
      .select('id', { count: 'exact', head: true })
      .eq('lote_id', lote_id)
      .eq('fazenda_id', fazendaId)
      .eq('status', 'Ativo')
      .is('deleted_at', null);

    if (error) throw error;
    return count || 0;
  },
};

// ---------------------------------------------------------------------------
// EVENTOS
// ---------------------------------------------------------------------------

export const eventos = {
  async listPorAnimal(animal_id: string): Promise<EventoRebanho[]> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('eventos_rebanho')
      .select(
        'id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at'
      )
      .eq('fazenda_id', fazendaId)
      .eq('animal_id', animal_id)
      .is('deleted_at', null)
      .order('data_evento', { ascending: false });

    if (error) throw error;
    return (data as EventoRebanho[]) || [];
  },

  async list(
    filtros?: {
      tipo?: string;
      data_inicio?: string;
      data_fim?: string;
    },
    pagina: number = 1,
    limite: number = 50
  ): Promise<{ dados: EventoRebanho[]; total: number }> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const offset = (pagina - 1) * limite;

    let query = supabase
      .from('eventos_rebanho')
      .select(
        'id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null);

    if (filtros?.tipo) {
      query = query.eq('tipo', filtros.tipo);
    }
    if (filtros?.data_inicio) {
      query = query.gte('data_evento', filtros.data_inicio);
    }
    if (filtros?.data_fim) {
      query = query.lte('data_evento', filtros.data_fim);
    }

    query = query
      .order('data_evento', { ascending: false })
      .range(offset, offset + limite - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      dados: (data as EventoRebanho[]) || [],
      total: count || 0,
    };
  },

  async getById(id: string): Promise<EventoRebanho> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('eventos_rebanho')
      .select(
        'id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at'
      )
      .eq('id', id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data as EventoRebanho;
  },

  async create(payload: CriarEventoInput & { usuario_id: string }): Promise<EventoRebanho> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();

    // Validar que animal existe e pertence à fazenda
    const { data: animal, error: animalError } = await supabase
      .from('animais')
      .select('id, status')
      .eq('id', payload.animal_id)
      .eq('fazenda_id', fazendaId)
      .is('deleted_at', null)
      .single();

    if (animalError || !animal) {
      throw new Error('Animal não encontrado ou não pertence a esta fazenda.');
    }

    const { data, error } = await supabase
      .from('eventos_rebanho')
      .insert(payload)
      .select(
        'id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return data as EventoRebanho;
  },

  async remove(id: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { error } = await supabase
      .from('eventos_rebanho')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('fazenda_id', fazendaId);

    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// PESOS
// ---------------------------------------------------------------------------

export const pesos = {
  async listPorAnimal(animal_id: string): Promise<PesoAnimal[]> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('pesos_animal')
      .select('id, fazenda_id, animal_id, data_pesagem, peso_kg, observacoes, created_at')
      .eq('fazenda_id', fazendaId)
      .eq('animal_id', animal_id)
      .order('data_pesagem', { ascending: false });

    if (error) throw error;
    return (data as PesoAnimal[]) || [];
  },

  async getUltimoPeso(animal_id: string): Promise<PesoAnimal | null> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('pesos_animal')
      .select('id, fazenda_id, animal_id, data_pesagem, peso_kg, observacoes, created_at')
      .eq('fazenda_id', fazendaId)
      .eq('animal_id', animal_id)
      .order('data_pesagem', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as PesoAnimal) || null;
  },

  async create(payload: PesoAnimalInput): Promise<PesoAnimal> {
    const supabase = await createSupabaseServerClient();
    await getFazendaId();
    const { data, error } = await supabase
      .from('pesos_animal')
      .insert(payload)
      .select('id, fazenda_id, animal_id, data_pesagem, peso_kg, observacoes, created_at')
      .single();

    if (error) throw error;
    return data as PesoAnimal;
  },
};

// ---------------------------------------------------------------------------
// Helper: Parse CSV simples
// ---------------------------------------------------------------------------

function parseCSV(csv: string): Record<string, string>[] {
  const linhas = csv.trim().split('\n');
  if (linhas.length < 2) return [];

  const headers = linhas[0].split(',').map((h) => h.trim());
  const resultado: Record<string, string>[] = [];

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;

    const valores = linha.split(',').map((v) => v.trim());
    const obj: Record<string, string> = {};

    headers.forEach((header, idx) => {
      obj[header] = valores[idx] || '';
    });

    resultado.push(obj);
  }

  return resultado;
}

// ---------------------------------------------------------------------------
// IMPORTAÇÃO CSV
// ---------------------------------------------------------------------------

export const importacao = {
  async importarCSV(
    arquivo: File,
    criarLoteAutomatico: boolean = true
  ): Promise<CSVImportResult> {
    const fazendaId = await getFazendaId();
    const userId = await getUserId();

    const conteudoArquivo = await arquivo.text();
    const linhas = parseCSV(conteudoArquivo);
    const resultado: CSVImportResult = {
      total_linhas: linhas.length,
      importados: 0,
      erros: [],
    };

    const animaisParaInserir: CriarAnimalInput[] = [];
    let loteAutomatico: Lote | null = null;

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      const numeroLinha = i + 2; // +2 porque header é linha 1, dados começam em 2

      try {
        const validado = animalCSVRowSchema.parse(linha);

        // Validar unicidade
        const existente = await animais.getByNumero(validado.numero_animal);
        if (existente) {
          resultado.erros.push({
            linha: numeroLinha,
            numero_animal: validado.numero_animal,
            status: 'erro',
            mensagem: `Animal ${validado.numero_animal} já existe nesta fazenda`,
          });
          continue;
        }

        // Resolver ou criar lote
        let loteId: string | null = null;
        if (validado.lote) {
          let lote = await lotes.getByNome(validado.lote);
          if (!lote) {
            if (criarLoteAutomatico) {
              if (!loteAutomatico) {
                const dataHoje = new Date().toISOString().split('T')[0];
                loteAutomatico = await lotes.create({
                  nome: `Importação ${dataHoje}`,
                  descricao: 'Lote criado automaticamente durante importação CSV',
                });
              }
              lote = loteAutomatico;
            } else {
              resultado.erros.push({
                linha: numeroLinha,
                numero_animal: validado.numero_animal,
                status: 'erro',
                mensagem: `Lote "${validado.lote}" não existe`,
              });
              continue;
            }
          }
          loteId = lote.id;
        }

        animaisParaInserir.push({
          numero_animal: validado.numero_animal,
          sexo: validado.sexo,
          tipo_rebanho: validado.tipo_rebanho,
          data_nascimento: validado.data_nascimento,
          lote_id: loteId,
          raca: validado.raca || null,
          observacoes: validado.observacoes || null,
        });
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido';
        resultado.erros.push({
          linha: numeroLinha,
          numero_animal: linha.numero_animal || '?',
          status: 'erro',
          mensagem,
        });
      }
    }

    // Bulk insert em transação atômica
    if (animaisParaInserir.length > 0) {
      try {
        for (const animalPayload of animaisParaInserir) {
          const animal = await animais.create(animalPayload);

          // Criar evento de "nascimento" para cada animal
          await eventos.create({
            animal_id: animal.id,
            tipo: TipoEvento.NASCIMENTO,
            data_evento: animal.data_nascimento,
            observacoes: 'Evento de nascimento importado via CSV',
            usuario_id: userId,
          });

          resultado.importados++;
        }

        if (loteAutomatico) {
          resultado.lote_criado_id = loteAutomatico.id;
          resultado.lote_criado_nome = loteAutomatico.nome;
        }
      } catch (erro) {
        throw new Error(
          `Falha ao inserir animais: ${erro instanceof Error ? erro.message : 'Erro desconhecido'}`
        );
      }
    }

    return resultado;
  },
};
