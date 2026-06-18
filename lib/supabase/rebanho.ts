'use server';

import Papa from 'papaparse';
import { createSupabaseServerClient } from './server';
import { sou_admin, getCurrentUserId } from '@/lib/auth/helpers';
import type {
  Animal,
  Lote,
  EventoRebanho,
  PesoAnimal,
  LoteInput,
  CSVImportResult,
  CSVValidacaoResult,
  CSVLinhaValidada,
  AnimalCSVValidationResult,
  DeteccaoRebanho,
  RebanhoProjetado,
  CategoriaProjetada,
  RebanhoSnapshot,
} from '@/lib/types/rebanho';
import {
  animalCSVRowSchema,
  type AnimalCSVRowInput,
  type CriarAnimalInput,
  type EditarAnimalInput,
  type CriarLoteInput,
  type EditarLoteInput,
  type CriarEventoInput,
} from '@/lib/validations/rebanho';
import { TipoEvento } from '@/lib/types/rebanho';

// ---------------------------------------------------------------------------
// Nota: RLS + get_minha_fazenda_id() via JWT já garantem multi-tenancy.
// Não precisa buscar fazenda_id explicitamente em cada query.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// QUERIES — ANIMAIS
// ---------------------------------------------------------------------------

const queryAnimais = {
  async getByBrinco(brinco: string): Promise<Animal | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('animais')
      .select(
        'id, fazenda_id, brinco, nome, sexo, tipo_rebanho, data_nascimento, data_nascimento_estimada, categoria, status, lote_id, peso_atual, peso_nascimento, mae_id, pai_id, raca, observacoes, sisbov_crbio, origem, foto_url, status_reprodutivo, data_ultimo_parto, data_parto_previsto, data_proxima_secagem, escore_condicao_corporal, flag_repetidora, is_reprodutor, reprodutor_vinculado_id, deleted_at, created_at, updated_at'
      )
      .eq('brinco', brinco)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? JSON.parse(JSON.stringify(data as Animal)) : null;
  },

  async getById(id: string): Promise<Animal> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('animais')
      .select(
        'id, fazenda_id, brinco, nome, sexo, tipo_rebanho, data_nascimento, data_nascimento_estimada, categoria, status, lote_id, peso_atual, peso_nascimento, mae_id, pai_id, raca, observacoes, sisbov_crbio, origem, foto_url, status_reprodutivo, data_ultimo_parto, data_parto_previsto, data_proxima_secagem, escore_condicao_corporal, flag_repetidora, is_reprodutor, reprodutor_vinculado_id, deleted_at, created_at, updated_at'
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return JSON.parse(JSON.stringify(data as Animal));
  },

  async create(payload: CriarAnimalInput & { peso_atual?: number | null }): Promise<Animal> {
    const supabase = await createSupabaseServerClient();
    const { peso_atual = null, ...resto } = payload;
    const { data, error } = await supabase
      .from('animais')
      .insert({
        ...resto,
        status: 'Ativo',
        peso_atual,
      })
      .select(
        'id, fazenda_id, brinco, nome, sexo, tipo_rebanho, data_nascimento, data_nascimento_estimada, categoria, status, lote_id, peso_atual, peso_nascimento, mae_id, pai_id, raca, observacoes, sisbov_crbio, origem, foto_url, status_reprodutivo, data_ultimo_parto, data_parto_previsto, data_proxima_secagem, escore_condicao_corporal, flag_repetidora, is_reprodutor, reprodutor_vinculado_id, deleted_at, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return JSON.parse(JSON.stringify(data as Animal));
  },

  async update(id: string, payload: EditarAnimalInput): Promise<Animal> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('animais')
      .update(payload)
      .eq('id', id)
      .select(
        'id, fazenda_id, brinco, nome, sexo, tipo_rebanho, data_nascimento, data_nascimento_estimada, categoria, status, lote_id, peso_atual, peso_nascimento, mae_id, pai_id, raca, observacoes, sisbov_crbio, origem, foto_url, status_reprodutivo, data_ultimo_parto, data_parto_previsto, data_proxima_secagem, escore_condicao_corporal, flag_repetidora, is_reprodutor, reprodutor_vinculado_id, deleted_at, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return JSON.parse(JSON.stringify(data as Animal));
  },

  async softDelete(id: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('animais')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// QUERIES — LOTES
// ---------------------------------------------------------------------------

const queryLotes = {
  async getByNome(nome: string): Promise<Lote | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('lotes')
      .select('id, fazenda_id, nome, descricao, tipo_rebanho, data_criacao, created_at, updated_at')
      .eq('nome', nome)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? JSON.parse(JSON.stringify(data as Lote)) : null;
  },

  async getById(id: string): Promise<Lote> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('lotes')
      .select('id, fazenda_id, nome, descricao, tipo_rebanho, data_criacao, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) throw error;
    return JSON.parse(JSON.stringify(data as Lote));
  },

  async create(payload: CriarLoteInput): Promise<Lote> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('lotes')
      .insert(payload)
      .select('id, fazenda_id, nome, descricao, tipo_rebanho, data_criacao, created_at, updated_at')
      .single();

    if (error) throw error;
    return JSON.parse(JSON.stringify(data as Lote));
  },

  async update(id: string, payload: Partial<CriarLoteInput>): Promise<Lote> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('lotes')
      .update(payload)
      .eq('id', id)
      .select('id, fazenda_id, nome, descricao, tipo_rebanho, data_criacao, created_at, updated_at')
      .single();

    if (error) throw error;
    return JSON.parse(JSON.stringify(data as Lote));
  },

  async delete(id: string): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const { count, error: checkError } = await supabase
      .from('animais')
      .select('id', { count: 'exact', head: true })
      .eq('lote_id', id)
      .eq('status', 'Ativo')
      .is('deleted_at', null);

    if (checkError) throw checkError;
    if (count && count > 0) {
      throw new Error('Não é possível deletar um lote que possui animais ativos.');
    }

    const { error } = await supabase
      .from('lotes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// QUERIES — EVENTOS
// ---------------------------------------------------------------------------

const queryEventos = {
  async create(payload: CriarEventoInput & { usuario_id: string }): Promise<EventoRebanho> {
    const supabase = await createSupabaseServerClient();

    const { data: animal, error: animalError } = await supabase
      .from('animais')
      .select('id, status')
      .eq('id', payload.animal_id)
      .is('deleted_at', null)
      .single();

    if (animalError || !animal) {
      throw new Error('Animal não encontrado ou não pertence a esta fazenda.');
    }

    const { data, error } = await supabase
      .from('eventos_rebanho')
      .insert(payload as unknown as Record<string, unknown>)
      .select(
        'id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at'
      )
      .single();

    if (error) throw error;
    return JSON.parse(JSON.stringify(data as EventoRebanho));
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

  const animal = await queryAnimais.create(formData);

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

  const animalAtual = await queryAnimais.getById(id);
  await queryAnimais.update(id, formData);

  if (formData.categoria && formData.categoria !== animalAtual.categoria) {
    const userId = await getCurrentUserId();
    const supabase = await createSupabaseServerClient();
    await supabase.from('eventos_rebanho').insert({
      animal_id: id,
      tipo: TipoEvento.MUDANCA_CATEGORIA,
      data_evento: new Date().toISOString().split('T')[0],
      observacoes: `Categoria alterada: ${animalAtual.categoria ?? 'sem categoria'} → ${formData.categoria}`,
      usuario_id: userId,
    });
  }

  return { success: true };
}

export async function mudarCategoriaAnimalAction(
  id: string,
  novaCategoria: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await sou_admin();
  if (!admin) {
    throw new Error('Apenas administradores podem alterar a categoria de animais.');
  }

  const animalAtual = await queryAnimais.getById(id);
  if (animalAtual.categoria === novaCategoria) {
    return { success: true };
  }

  await queryAnimais.update(id, { categoria: novaCategoria });

  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  await supabase.from('eventos_rebanho').insert({
    animal_id: id,
    tipo: TipoEvento.MUDANCA_CATEGORIA,
    data_evento: new Date().toISOString().split('T')[0],
    observacoes: `Categoria alterada: ${animalAtual.categoria ?? 'sem categoria'} → ${novaCategoria}`,
    usuario_id: userId,
  });

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

// Parser robusto via PapaParse: lida com aspas, vírgulas dentro de campos, BOM
// e autodetecta o delimitador (Excel BR exporta com ';'). Substitui o split(',')
// manual que quebrava com qualquer campo contendo vírgula.
function parseCSV(conteudo: string): Record<string, string>[] {
  // Excel (locale pt-BR) só separa colunas corretamente com ';' ou com a
  // diretiva "sep=;" na primeira linha. Nosso template embute essa diretiva,
  // então removemos antes de entregar ao PapaParse — e usamos o delimitador
  // declarado quando presente (PapaParse não entende a convenção "sep=").
  let texto = conteudo.replace(/^﻿/, '');
  let delimiter: string | undefined;
  const sepMatch = texto.match(/^sep=(.)\r?\n/i);
  if (sepMatch) {
    delimiter = sepMatch[1];
    texto = texto.slice(sepMatch[0].length);
  }

  const { data } = Papa.parse<Record<string, string>>(texto, {
    header: true,
    skipEmptyLines: true,
    delimiter, // undefined → PapaParse autodetecta (Excel BR exporta com ';')
    transformHeader: (h) => h.trim().toLowerCase(),
    transform: (v) => (typeof v === 'string' ? v.trim() : v),
  });
  return data;
}

// Linha já validada e pronta para inserção (resultado do parsing + Zod).
interface LinhaPreparada {
  numeroLinha: number;
  validado: AnimalCSVRowInput;
}

// Núcleo compartilhado entre a pré-validação (dry-run), a importação por CSV e o
// cadastro em grade. Valida cada linha com Zod, detecta duplicados DENTRO do
// conjunto e duplicados no BANCO numa única query (.in), evitando o N+1 anterior.
// `offsetLinha` permite ajustar a numeração exibida (CSV usa header → +2).
async function analisarLinhas(
  linhas: Record<string, string>[],
  offsetLinha: number
): Promise<{
  total: number;
  preparadas: LinhaPreparada[];
  erros: AnimalCSVValidationResult[];
}> {
  const preparadas: LinhaPreparada[] = [];
  const erros: AnimalCSVValidationResult[] = [];
  const brincosNoArquivo = new Set<string>();

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const numeroLinha = i + offsetLinha;

    try {
      const validado = animalCSVRowSchema.parse(linha);

      if (brincosNoArquivo.has(validado.brinco)) {
        erros.push({
          linha: numeroLinha,
          brinco: validado.brinco,
          status: 'erro',
          mensagem: `Brinco ${validado.brinco} duplicado dentro do arquivo.`,
        });
        continue;
      }
      brincosNoArquivo.add(validado.brinco);
      preparadas.push({ numeroLinha, validado });
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido';
      erros.push({
        linha: numeroLinha,
        brinco: (linha.brinco as string) || '?',
        status: 'erro',
        mensagem,
      });
    }
  }

  // Duplicados no banco — uma única query para todos os brincos válidos.
  if (preparadas.length > 0) {
    const supabase = await createSupabaseServerClient();
    const brincos = preparadas.map((p) => p.validado.brinco);
    const { data, error } = await supabase
      .from('animais')
      .select('brinco')
      .in('brinco', brincos)
      .is('deleted_at', null);

    if (error) throw error;

    const existentes = new Set((data ?? []).map((r) => (r as { brinco: string }).brinco));
    if (existentes.size > 0) {
      const aindaValidas: LinhaPreparada[] = [];
      for (const p of preparadas) {
        if (existentes.has(p.validado.brinco)) {
          erros.push({
            linha: p.numeroLinha,
            brinco: p.validado.brinco,
            status: 'erro',
            mensagem: `Animal com brinco ${p.validado.brinco} já existe na fazenda.`,
          });
        } else {
          aindaValidas.push(p);
        }
      }
      preparadas.length = 0;
      preparadas.push(...aindaValidas);
    }
  }

  return { total: linhas.length, preparadas, erros };
}

// Wrapper que faz o parsing do arquivo CSV e delega ao núcleo de análise.
async function analisarCSV(arquivo: File) {
  const conteudo = await arquivo.text();
  const linhas = parseCSV(conteudo);
  return analisarLinhas(linhas, 2); // +1 header, +1 base-1
}

/**
 * Pré-validação (dry-run): valida o arquivo inteiro SEM gravar nada.
 * Alimenta a tela de revisão antes da confirmação.
 */
export async function validarAnimaisCSV(arquivo: File): Promise<CSVValidacaoResult> {
  const admin = await sou_admin();
  if (!admin) {
    throw new Error('Apenas administradores podem importar animais.');
  }

  const { total, preparadas, erros } = await analisarCSV(arquivo);

  const dupArquivo = erros.filter((e) => e.mensagem?.includes('duplicado dentro do arquivo')).length;
  const dupBanco = erros.filter((e) => e.mensagem?.includes('já existe na fazenda')).length;

  const linhasValidas: CSVLinhaValidada[] = preparadas.map((p) => ({
    linha: p.numeroLinha,
    brinco: p.validado.brinco,
    sexo: p.validado.sexo,
    data_nascimento: p.validado.data_nascimento,
    tipo_rebanho: p.validado.tipo_rebanho,
    lote: p.validado.lote ?? undefined,
    status: 'valido',
  }));

  const linhasComErro: CSVLinhaValidada[] = erros.map((e) => ({
    linha: e.linha,
    brinco: e.brinco,
    sexo: '',
    data_nascimento: '',
    tipo_rebanho: '',
    status: 'erro',
    mensagem: e.mensagem,
  }));

  const linhas = [...linhasValidas, ...linhasComErro].sort((a, b) => a.linha - b.linha);

  return {
    total_linhas: total,
    validos: preparadas.length,
    com_erro: erros.length,
    duplicados_arquivo: dupArquivo,
    duplicados_banco: dupBanco,
    linhas,
  };
}

// Resolve lotes (com cache + criação automática) e insere animais + evento de
// nascimento. Compartilhado entre a importação por CSV e o cadastro em grade.
async function persistirAnimaisPreparados(
  preparadas: LinhaPreparada[],
  errosIniciais: AnimalCSVValidationResult[],
  total: number,
  origem: 'CSV' | 'grade',
  criarLoteAutomatico: boolean
): Promise<CSVImportResult> {
  const userId = await getCurrentUserId();

  const resultado: CSVImportResult = {
    total_linhas: total,
    importados: 0,
    erros: errosIniciais,
  };

  // Resolve lotes referenciados: cache por nome para não recriar nem reconsultar.
  const cacheLotes = new Map<string, Lote>();
  let loteAutomatico: Lote | null = null;

  const animaisParaInserir: Array<{
    payload: CriarAnimalInput & { peso_atual?: number | null };
    pesoAtual: number | null;
  }> = [];

  for (const { numeroLinha, validado } of preparadas) {
    let loteId: string | null = null;
    if (validado.lote) {
      const chave = validado.lote;
      let lote = cacheLotes.get(chave) ?? (await queryLotes.getByNome(chave));
      if (!lote) {
        if (criarLoteAutomatico) {
          if (!loteAutomatico) {
            const dataHoje = new Date().toISOString().split('T')[0];
            loteAutomatico = await queryLotes.create({
              nome: `Importação ${dataHoje}`,
              descricao: `Lote criado automaticamente durante cadastro via ${origem}`,
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
      cacheLotes.set(chave, lote);
      loteId = lote.id;
    }

    const { lote: _lote, peso_atual, ...dadosAnimal } = validado;
    void _lote;
    animaisParaInserir.push({
      payload: {
        ...dadosAnimal,
        data_nascimento_estimada: validado.data_nascimento_estimada ?? false,
        lote_id: loteId,
      },
      pesoAtual: peso_atual ?? null,
    });
  }

  for (const { payload, pesoAtual } of animaisParaInserir) {
    try {
      const animal = await queryAnimais.create({ ...payload, peso_atual: pesoAtual });

      await queryEventos.create({
        animal_id: animal.id,
        tipo: TipoEvento.NASCIMENTO,
        data_evento: animal.data_nascimento,
        observacoes: `Evento de nascimento importado via ${origem}`,
        usuario_id: userId,
      });

      resultado.importados++;
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido';
      resultado.erros.push({
        linha: 0,
        brinco: payload.brinco,
        status: 'erro',
        mensagem: `Falha ao inserir ${payload.brinco}: ${mensagem}`,
      });
    }
  }

  if (loteAutomatico) {
    resultado.lote_criado_id = loteAutomatico.id;
    resultado.lote_criado_nome = loteAutomatico.nome;
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

  const { total, preparadas, erros } = await analisarCSV(arquivo);
  return persistirAnimaisPreparados(preparadas, erros, total, 'CSV', criarLoteAutomatico);
}

/**
 * Cadastro em massa via grade editável (sem planilha). Recebe as linhas já
 * digitadas pelo usuário, reaproveita o mesmo núcleo de validação/duplicados
 * e inserção da importação CSV.
 */
export async function cadastrarAnimaisLote(
  linhas: Record<string, string>[]
): Promise<CSVImportResult> {
  const admin = await sou_admin();
  if (!admin) {
    throw new Error('Apenas administradores podem cadastrar animais.');
  }

  const { total, preparadas, erros } = await analisarLinhas(linhas, 1);
  return persistirAnimaisPreparados(preparadas, erros, total, 'grade', true);
}

// ---------------------------------------------------------------------------
// FUNÇÕES DE LISTAGEM
// ---------------------------------------------------------------------------

export async function listAnimais(
  filtros?: { status?: string; lote_id?: string; busca?: string; tipo_rebanho?: string; sexo?: string },
  limit: number = 50,
  offset: number = 0
): Promise<Animal[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('animais')
    .select(
      'id, fazenda_id, brinco, nome, sexo, tipo_rebanho, data_nascimento, data_nascimento_estimada, categoria, status, lote_id, peso_atual, peso_nascimento, mae_id, pai_id, raca, observacoes, sisbov_crbio, origem, foto_url, status_reprodutivo, data_ultimo_parto, data_parto_previsto, data_proxima_secagem, escore_condicao_corporal, flag_repetidora, is_reprodutor, reprodutor_vinculado_id, deleted_at, created_at, updated_at'
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filtros?.status) {
    query = query.eq('status', filtros.status);
  }

  if (filtros?.lote_id) {
    query = query.eq('lote_id', filtros.lote_id);
  }

  if (filtros?.tipo_rebanho) {
    query = query.eq('tipo_rebanho', filtros.tipo_rebanho);
  }

  if (filtros?.sexo) {
    query = query.eq('sexo', filtros.sexo);
  }

  if (filtros?.busca) {
    query = query.ilike('brinco', `%${filtros.busca}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return JSON.parse(JSON.stringify((data as Animal[]) || []));
}

export async function listLotes(
  limit: number = 50,
  offset: number = 0
): Promise<Lote[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('lotes')
    .select('id, fazenda_id, nome, descricao, tipo_rebanho, data_criacao, created_at, updated_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return JSON.parse(JSON.stringify((data as Lote[]) || []));
}

export async function listEventosPorAnimal(animalId: string): Promise<EventoRebanho[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('eventos_rebanho')
    .select(
      'id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at'
    )
    .eq('animal_id', animalId)
    .is('deleted_at', null)
    .order('data_evento', { ascending: false });

  if (error) throw error;
  return JSON.parse(JSON.stringify((data as EventoRebanho[]) || []));
}

export async function listPesosPorAnimal(animalId: string): Promise<PesoAnimal[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('pesos_animal')
    .select('id, fazenda_id, animal_id, data_pesagem, peso_kg, metodo, condicao_corporal, observacoes, created_at')
    .eq('animal_id', animalId)
    .order('data_pesagem', { ascending: false });

  if (error) throw error;
  return JSON.parse(JSON.stringify((data as PesoAnimal[]) || []));
}

export async function countAnimaisEmLote(loteId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from('animais')
    .select('id', { count: 'exact', head: true })
    .eq('lote_id', loteId)
    .is('deleted_at', null);

  if (error) throw error;
  return count || 0;
}

export async function listAnimaisEmLote(loteId: string): Promise<Animal[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('animais')
    .select(
      'id, fazenda_id, brinco, sexo, tipo_rebanho, data_nascimento, categoria, status, lote_id, peso_atual, mae_id, pai_id, raca, observacoes, deleted_at, created_at, updated_at'
    )
    .eq('lote_id', loteId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return JSON.parse(JSON.stringify((data as Animal[]) || []));
}

export async function getLoteById(loteId: string): Promise<Lote | null> {
  try {
    return await queryLotes.getById(loteId);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// FUNÇÕES DE PROJEÇÃO — DETECÇÃO E CÁLCULO (FASE 3)
// ---------------------------------------------------------------------------

/**
 * Detecta se existe rebanho na fazenda com tratamento robusto de erros.
 * Retorna DeteccaoRebanho com status da detecção.
 * Nunca lança exceção.
 */
export async function detectarRebanho(): Promise<DeteccaoRebanho> {
  try {
    const supabase = await createSupabaseServerClient();

    // Verificar plano da fazenda — Free não tem acesso ao módulo de rebanho
    const { data: planoData } = await supabase.rpc('get_plano_fazenda');
    if (planoData === 'free') {
      return {
        rebanho_detectado: false,
        razao: 'sem_acesso',
      };
    }

    const { data, error, status } = await supabase
      .from('animais')
      .select('id, created_at, data_nascimento')
      .is('deleted_at', null)
      .limit(1);

    // Erro 403 = RLS bloqueou (sem acesso à fazenda)
    if (error && status === 403) {
      return {
        rebanho_detectado: false,
        razao: 'sem_acesso',
      };
    }

    // Outro erro
    if (error) {
      return {
        rebanho_detectado: false,
        razao: 'nenhum',
      };
    }

    // Sucesso vazio
    if (!data || data.length === 0) {
      return {
        rebanho_detectado: false,
        razao: 'vazio',
      };
    }

    // Sucesso com dados — buscar data mais recente
    const { data: animais } = await supabase
      .from('animais')
      .select('created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    const dataUltimo = animais?.[0]?.created_at
      ? new Date(animais[0].created_at)
      : undefined;

    return {
      rebanho_detectado: true,
      data_ultimo_animal: dataUltimo,
    };
  } catch {
    // Nunca lançar exceção
    return {
      rebanho_detectado: false,
      razao: 'nenhum',
    };
  }
}

/**
 * Projeta o rebanho para uma data alvo, calculando categorias e bezerros previstos.
 * Retorna RebanhoProjetado com composição projetada ou vazio em caso de erro.
 * Lança Error se dataAlvo está no passado. Nunca lança exceção para outros erros.
 */
export async function projetarRebanho(dataAlvo: Date): Promise<RebanhoProjetado> {
  const now = new Date();

  // Validação: dataAlvo não pode estar no passado
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (dataAlvo < hoje) {
    throw new Error('dataAlvo não pode estar no passado');
  }

  // Estrutura de retorno vazio para erros
  const rebanhoVazio: RebanhoProjetado = {
    data_alvo: dataAlvo,
    data_calculo: now,
    categorias: [],
    composicao: {},
    total_cabecas: 0,
    fatores_aplicados: {
      partos_confirmados: 0,
      mudancas_categoria: 0,
      descartes: 0,
      avisos: [],
    },
    toSnapshot(): RebanhoSnapshot {
      return {
        data_calculo: now.toISOString(),
        data_projecao: dataAlvo.toISOString(),
        composicao: {},
        total_cabecas: 0,
        total_animais_base: 0,
        partos_inclusos_na_projecao: 0,
        mudancas_categoria_inclusos: 0,
        descartes_inclusos: 0,
        tipo_rebanho: 'Leite',
        modo: 'PROJETADO',
        usuario_editou: false,
        versao_algoritmo: '1.0',
      };
    },
  };

  try {
    const supabase = await createSupabaseServerClient();

    // 1. Buscar todos animais ativos
    const { data: animais, error: animalError } = await supabase
      .from('animais')
      .select(
        'id, brinco, sexo, tipo_rebanho, data_nascimento, categoria, status_reprodutivo, is_reprodutor'
      )
      .eq('status', 'Ativo')
      .is('deleted_at', null);

    if (animalError || !animais) {
      return rebanhoVazio;
    }

    if (animais.length === 0) {
      return rebanhoVazio;
    }

    // 2. Calcular categoria para cada animal na dataAlvo
    type AnimalComCategoria = typeof animais[0] & { categoria_projetada: string };
    const animaisComProjecao: AnimalComCategoria[] = animais.map((animal) => ({
      ...animal,
      categoria_projetada: calcularCategoriaEmData(animal, dataAlvo),
    }));

    // 3. Buscar coberturas com partos previstos
    const { data: coberturas, error: coberturasError } = await supabase
      .from('eventos_rebanho')
      .select('id, animal_id, data_evento, gemelar')
      .eq('tipo', 'cobertura')
      .gte('data_evento', new Date('2020-01-01').toISOString().split('T')[0])
      .lte('data_evento', dataAlvo.toISOString().split('T')[0]);

    if (coberturasError) {
      return rebanhoVazio;
    }

    // 4. Buscar eventos de parto para saber quais coberturas já resultaram em parto
    const { data: partos, error: partosError } = await supabase
      .from('eventos_rebanho')
      .select('animal_id, data_evento')
      .eq('tipo', 'parto');

    if (partosError) {
      return rebanhoVazio;
    }

    // Construir mapa de animais com partos
    const animaisComParto = new Set(partos?.map((p) => p.animal_id) ?? []);

    // 5. Calcular bezerros previstos a partir de coberturas sem parto
    const bezerrosPorAnimal: Record<string, number> = {};

    if (coberturas) {
      for (const cobertura of coberturas) {
        // Cobertura + 283 dias = data_parto_previsto
        const dataParta = new Date(cobertura.data_evento);
        dataParta.setDate(dataParta.getDate() + 283);

        // Se parto previsto <= dataAlvo E animal NÃO tem parto registrado
        if (dataParta <= dataAlvo && !animaisComParto.has(cobertura.animal_id)) {
          const quantidade = cobertura.gemelar ? 2 : 1;
          bezerrosPorAnimal[cobertura.animal_id] =
            (bezerrosPorAnimal[cobertura.animal_id] ?? 0) + quantidade;
        }
      }
    }

    // 6. Agrupar por categoria e contar
    const composicao: Record<string, number> = {};
    let totalCabecas = 0;
    let partosPrevistosCount = 0;

    for (const animal of animaisComProjecao) {
      const cat = animal.categoria_projetada;
      composicao[cat] = (composicao[cat] ?? 0) + 1;
      totalCabecas += 1;

      // Adicionar bezerros previstos
      const bezerros = bezerrosPorAnimal[animal.id] ?? 0;
      if (bezerros > 0) {
        composicao['Bezerro(a)'] = (composicao['Bezerro(a)'] ?? 0) + bezerros;
        totalCabecas += bezerros;
        partosPrevistosCount += 1;
      }
    }

    // 7. Construir array de categorias com variação
    const categorias: CategoriaProjetada[] = [];
    const quantidadeAtualPorCategoria: Record<string, number> = {};

    for (const animal of animais) {
      quantidadeAtualPorCategoria[animal.categoria] =
        (quantidadeAtualPorCategoria[animal.categoria] ?? 0) + 1;
    }

    for (const [catId, quantidadeProjetada] of Object.entries(composicao)) {
      const quantidadeAtual = quantidadeAtualPorCategoria[catId] ?? 0;
      const variacao = quantidadeProjetada - quantidadeAtual;

      categorias.push({
        id: catId.toLowerCase().replace(/\s+/g, '_'),
        nome: catId,
        quantidade_atual: quantidadeAtual,
        quantidade_projetada: quantidadeProjetada,
        variacao,
      });
    }

    // 8. Retornar RebanhoProjetado completo
    const resultado: RebanhoProjetado = {
      data_alvo: dataAlvo,
      data_calculo: now,
      categorias,
      composicao,
      total_cabecas: totalCabecas,
      fatores_aplicados: {
        partos_confirmados: partosPrevistosCount,
        mudancas_categoria: 0,
        descartes: 0,
        avisos: [],
      },
      toSnapshot(): RebanhoSnapshot {
        return {
          data_calculo: now.toISOString(),
          data_projecao: dataAlvo.toISOString(),
          composicao,
          total_cabecas: totalCabecas,
          total_animais_base: animais.length,
          partos_inclusos_na_projecao: partosPrevistosCount,
          mudancas_categoria_inclusos: 0,
          descartes_inclusos: 0,
          tipo_rebanho: animais[0]?.tipo_rebanho === 'leiteiro' ? 'Leite' : 'Corte',
          modo: 'PROJETADO',
          usuario_editou: false,
          versao_algoritmo: '1.0',
        };
      },
    };

    return resultado;
  } catch {
    // Nunca lançar exceção
    return rebanhoVazio;
  }
}

/**
 * Calcula a categoria de um animal em uma data específica.
 * Implementa a mesma lógica do trigger recalcular_categoria_animal.
 */
function calcularCategoriaEmData(
  animal: {
    sexo: string;
    tipo_rebanho: string;
    data_nascimento: string;
    status_reprodutivo: string | null;
    is_reprodutor: boolean;
  },
  dataAlvo: Date
): string {
  const dataNasc = new Date(animal.data_nascimento);
  const idadeAnos =
    (dataAlvo.getTime() - dataNasc.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  if (animal.tipo_rebanho === 'leiteiro') {
    if (idadeAnos < 0.25) {
      return 'Bezerra';
    } else if (idadeAnos < 1) {
      return animal.sexo === 'Macho' ? 'Bezerro' : 'Bezerra';
    } else if (idadeAnos < 2) {
      if (animal.sexo === 'Fêmea') {
        return animal.status_reprodutivo === 'prenha'
          ? 'Novilha Prenha'
          : 'Novilha';
      } else {
        return 'Novilho';
      }
    } else {
      if (animal.sexo === 'Fêmea') {
        switch (animal.status_reprodutivo) {
          case 'lactacao':
            return 'Vaca em Lactação';
          case 'seca':
            return 'Vaca Seca';
          case 'prenha':
            return 'Vaca Prenha';
          default:
            return 'Vaca Vazia';
        }
      } else {
        return animal.is_reprodutor ? 'Touro' : 'Novilho';
      }
    }
  } else if (animal.tipo_rebanho === 'corte') {
    if (idadeAnos < 0.25) {
      return 'Bezerra';
    } else if (idadeAnos < 1) {
      return animal.sexo === 'Macho' ? 'Bezerro' : 'Bezerra';
    } else if (idadeAnos < 2) {
      return animal.sexo === 'Macho' ? 'Novilho' : 'Novilha';
    } else {
      if (animal.sexo === 'Macho') {
        if (animal.is_reprodutor) {
          return 'Touro';
        } else {
          return animal.status_reprodutivo === 'descartada'
            ? 'Boi Descartado'
            : 'Boi';
        }
      } else {
        return animal.status_reprodutivo === 'descartada'
          ? 'Fêmea Descartada'
          : 'Vaca Matriz';
      }
    }
  }

  return 'Desconhecido';
}
