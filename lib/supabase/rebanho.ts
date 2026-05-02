'use server';

import { createSupabaseServerClient } from './server';
import { sou_admin, getCurrentUserId } from '@/lib/auth/helpers';
import type {
  Animal,
  Lote,
  EventoRebanho,
  PesoAnimal,
  LoteInput,
  CSVImportResult,
} from '@/lib/types/rebanho';
import {
  animalCSVRowSchema,
  type CriarAnimalInput,
  type EditarAnimalInput,
  type CriarLoteInput,
  type EditarLoteInput,
  type CriarEventoInput,
} from '@/lib/validations/rebanho';
import { TipoEvento } from '@/lib/types/rebanho';

// ---------------------------------------------------------------------------
// Helper interno — nunca exportar diretamente
// ---------------------------------------------------------------------------

const fazendaIdCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

async function getFazendaId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuário não autenticado. Faça login novamente.');
  }

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

// ---------------------------------------------------------------------------
// QUERIES — ANIMAIS
// ---------------------------------------------------------------------------

const queryAnimais = {
  async getByBrinco(brinco: string): Promise<Animal | null> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { data, error } = await supabase
      .from('animais')
      .select(
        'id, fazenda_id, numero_animal, sexo, tipo_rebanho, data_nascimento, categoria, status, lote_id, peso_atual, mae_id, pai_id, raca, observacoes, deleted_at, created_at, updated_at'
      )
      .eq('fazenda_id', fazendaId)
      .eq('numero_animal', brinco)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data && { ...data, brinco: data.numero_animal } as Animal) || null;
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
    return { ...data, brinco: data.numero_animal } as Animal;
  },

  async create(payload: Omit<CriarAnimalInput, 'brinco'> & { numero_animal: string }): Promise<Animal> {
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
    return { ...data, brinco: data.numero_animal } as Animal;
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
    return { ...data, brinco: data.numero_animal } as Animal;
  },

  async softDelete(id: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();
    const { error } = await supabase
      .from('animais')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('fazenda_id', fazendaId);

    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// QUERIES — LOTES
// ---------------------------------------------------------------------------

const queryLotes = {
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

  async create(payload: CriarLoteInput): Promise<Lote> {
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

  async update(id: string, payload: Partial<CriarLoteInput>): Promise<Lote> {
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

  async delete(id: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();

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
};

// ---------------------------------------------------------------------------
// QUERIES — EVENTOS
// ---------------------------------------------------------------------------

const queryEventos = {
  async create(payload: CriarEventoInput & { usuario_id: string }): Promise<EventoRebanho> {
    const supabase = await createSupabaseServerClient();
    const fazendaId = await getFazendaId();

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
};

// ---------------------------------------------------------------------------
// FUNÇÕES DE DOMÍNIO — ANIMAIS
// ---------------------------------------------------------------------------

export async function criarAnimal(formData: CriarAnimalInput): Promise<{ id: string }> {
  const admin = await sou_admin();
  if (!admin) {
    throw new Error('Apenas administradores podem criar animais.');
  }

  const existente = await queryAnimais.getByBrinco(formData.brinco);
  if (existente) {
    throw new Error(`Animal com brinco ${formData.brinco} já existe nesta fazenda.`);
  }

  const animal = await queryAnimais.create({
    ...formData,
    numero_animal: formData.brinco,
  });

  return { id: animal.id };
}

export async function editarAnimal(
  id: string,
  formData: EditarAnimalInput
): Promise<{ success: boolean }> {
  const admin = await sou_admin();
  if (!admin) {
    throw new Error('Apenas administradores podem editar animais.');
  }

  await queryAnimais.update(id, formData);
  return { success: true };
}

export async function deletarAnimal(id: string): Promise<{ success: boolean }> {
  const admin = await sou_admin();
  if (!admin) {
    throw new Error('Apenas administradores podem deletar animais.');
  }

  await queryAnimais.softDelete(id);
  return { success: true };
}

// ---------------------------------------------------------------------------
// FUNÇÕES DE DOMÍNIO — LOTES
// ---------------------------------------------------------------------------

export async function criarLote(formData: CriarLoteInput): Promise<{ id: string }> {
  const admin = await sou_admin();
  if (!admin) {
    throw new Error('Apenas administradores podem criar lotes.');
  }

  const lote = await queryLotes.create(formData);
  return { id: lote.id };
}

export async function editarLote(
  id: string,
  formData: EditarLoteInput
): Promise<{ success: boolean }> {
  const admin = await sou_admin();
  if (!admin) {
    throw new Error('Apenas administradores podem editar lotes.');
  }

  await queryLotes.update(id, formData);
  return { success: true };
}

export async function deletarLote(id: string): Promise<{ success: boolean }> {
  const admin = await sou_admin();
  if (!admin) {
    throw new Error('Apenas administradores podem deletar lotes.');
  }

  await queryLotes.delete(id);
  return { success: true };
}

// ---------------------------------------------------------------------------
// FUNÇÕES DE DOMÍNIO — EVENTOS
// ---------------------------------------------------------------------------

export async function registrarEvento(
  formData: CriarEventoInput
): Promise<{ id: string }> {
  const userId = await getCurrentUserId();
  const evento = await queryEventos.create({
    ...formData,
    usuario_id: userId,
  });

  return { id: evento.id };
}

// ---------------------------------------------------------------------------
// FUNÇÕES DE DOMÍNIO — IMPORTAÇÃO CSV
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

export async function importarAnimaisCSV(
  arquivo: File,
  criarLoteAutomatico: boolean = true
): Promise<CSVImportResult> {
  const admin = await sou_admin();
  if (!admin) {
    throw new Error('Apenas administradores podem importar animais.');
  }

  const userId = await getCurrentUserId();
  const conteudoArquivo = await arquivo.text();
  const linhas = parseCSV(conteudoArquivo);

  const resultado: CSVImportResult = {
    total_linhas: linhas.length,
    importados: 0,
    erros: [],
  };

  const animaisParaInserir: Array<Omit<CriarAnimalInput, 'brinco'> & { numero_animal: string }> = [];
  let loteAutomatico: Lote | null = null;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const numeroLinha = i + 2;

    try {
      const validado = animalCSVRowSchema.parse(linha);

      const existente = await queryAnimais.getByBrinco(validado.brinco);
      if (existente) {
        resultado.erros.push({
          linha: numeroLinha,
          brinco: validado.brinco,
          status: 'erro',
          mensagem: `Animal com brinco ${validado.brinco} já existe.`,
        });
        continue;
      }

      let loteId: string | null = null;
      if (validado.lote) {
        let lote = await queryLotes.getByNome(validado.lote);
        if (!lote) {
          if (criarLoteAutomatico) {
            if (!loteAutomatico) {
              const dataHoje = new Date().toISOString().split('T')[0];
              loteAutomatico = await queryLotes.create({
                nome: `Importação ${dataHoje}`,
                descricao: 'Lote criado automaticamente durante importação CSV',
              });
            }
            lote = loteAutomatico;
          } else {
            resultado.erros.push({
              linha: numeroLinha,
              brinco: validado.brinco,
              status: 'erro',
              mensagem: `Lote "${validado.lote}" não existe.`,
            });
            continue;
          }
        }
        loteId = lote.id;
      }

      animaisParaInserir.push({
        numero_animal: validado.brinco,
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
        brinco: linha.brinco || '?',
        status: 'erro',
        mensagem,
      });
    }
  }

  if (animaisParaInserir.length > 0) {
    try {
      for (const animalPayload of animaisParaInserir) {
        const animal = await queryAnimais.create(animalPayload);

        await queryEventos.create({
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
}

// ---------------------------------------------------------------------------
// FUNÇÕES DE LISTAGEM
// ---------------------------------------------------------------------------

export async function listAnimais(
  filtros?: { status?: string; lote_id?: string; busca?: string },
  limit: number = 50,
  offset: number = 0
): Promise<Animal[]> {
  const supabase = await createSupabaseServerClient();
  const fazendaId = await getFazendaId();

  let query = supabase
    .from('animais')
    .select(
      'id, fazenda_id, numero_animal, sexo, tipo_rebanho, data_nascimento, categoria, status, lote_id, peso_atual, mae_id, pai_id, raca, observacoes, deleted_at, created_at, updated_at'
    )
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filtros?.status) {
    query = query.eq('status', filtros.status);
  }

  if (filtros?.lote_id) {
    query = query.eq('lote_id', filtros.lote_id);
  }

  if (filtros?.busca) {
    query = query.ilike('numero_animal', `%${filtros.busca}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).map(d => ({ ...d, brinco: d.numero_animal } as Animal));
}

export async function listLotes(
  limit: number = 50,
  offset: number = 0
): Promise<Lote[]> {
  const supabase = await createSupabaseServerClient();
  const fazendaId = await getFazendaId();

  const { data, error } = await supabase
    .from('lotes')
    .select('id, fazenda_id, nome, descricao, data_criacao, created_at, updated_at')
    .eq('fazenda_id', fazendaId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data as Lote[]) || [];
}

export async function listEventosPorAnimal(animalId: string): Promise<EventoRebanho[]> {
  const supabase = await createSupabaseServerClient();
  const fazendaId = await getFazendaId();

  const { data, error } = await supabase
    .from('eventos_rebanho')
    .select(
      'id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at'
    )
    .eq('animal_id', animalId)
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('data_evento', { ascending: false });

  if (error) throw error;
  return (data as EventoRebanho[]) || [];
}

export async function listPesosPorAnimal(animalId: string): Promise<PesoAnimal[]> {
  const supabase = await createSupabaseServerClient();
  const fazendaId = await getFazendaId();

  const { data, error } = await supabase
    .from('pesos_animal')
    .select('id, fazenda_id, animal_id, data_pesagem, peso_kg, observacoes, created_at')
    .eq('animal_id', animalId)
    .eq('fazenda_id', fazendaId)
    .order('data_pesagem', { ascending: false });

  if (error) throw error;
  return (data as PesoAnimal[]) || [];
}

export async function countAnimaisEmLote(loteId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const fazendaId = await getFazendaId();

  const { count, error } = await supabase
    .from('animais')
    .select('id', { count: 'exact', head: true })
    .eq('lote_id', loteId)
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null);

  if (error) throw error;
  return count || 0;
}

export async function listAnimaisEmLote(loteId: string): Promise<Animal[]> {
  const supabase = await createSupabaseServerClient();
  const fazendaId = await getFazendaId();

  const { data, error } = await supabase
    .from('animais')
    .select(
      'id, fazenda_id, numero_animal, sexo, tipo_rebanho, data_nascimento, categoria, status, lote_id, peso_atual, mae_id, pai_id, raca, observacoes, deleted_at, created_at, updated_at'
    )
    .eq('lote_id', loteId)
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(d => ({ ...d, brinco: d.numero_animal } as Animal));
}
