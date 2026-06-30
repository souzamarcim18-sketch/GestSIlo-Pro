/**
 * Testes de borda — Contratos centrais CONGELADOS durante as Fases 1 e 2
 * (SPEC-rebanho012, P0.5).
 *
 * Estes testes NÃO exercitam comportamento de runtime das features; eles FIXAM o
 * shape dos contratos centrais para que qualquer alteração acidental durante as
 * Fases 1–2 quebre a compilação/teste. São a rede de segurança do congelamento.
 *
 * Contratos cobertos:
 *  1. Animal e Lote                        (lib/types/rebanho.ts)
 *  2. CSVValidacaoResult / CSVImportResult (lib/types/rebanho.ts)
 *  3. ResultadoLote { inseridos, erros[] } (lib/types/rebanho-lote.ts)
 *  4. RPC registrar_evento_com_status      (types/supabase.ts — Args/Returns)
 *
 * Regra: se um destes testes falhar por mudança de shape, a mudança provavelmente
 * viola o congelamento da Fase 0. Só ajustar com decisão explícita registrada.
 */

import { describe, it, expect, expectTypeOf } from 'vitest';

import type {
  Animal,
  Lote,
  CSVValidacaoResult,
  CSVImportResult,
  CSVLinhaValidada,
  AnimalCSVValidationResult,
  StatusAnimal,
  TipoRebanho,
} from '@/lib/types/rebanho';
import type { ResultadoLote } from '@/lib/types/rebanho-lote';
import type { Database, Json } from '@/types/supabase';

// ─── 1. Animal e Lote ────────────────────────────────────────────────────────

describe('Contrato congelado: Animal', () => {
  it('mantém o conjunto de chaves esperado (shape estável)', () => {
    // Objeto-testemunha: se uma chave for removida/renomeada, isto deixa de compilar.
    const animal: Animal = {
      id: 'a1',
      fazenda_id: 'f1',
      brinco: '001',
      nome: null,
      sexo: 'Fêmea',
      tipo_rebanho: 'leiteiro' as TipoRebanho,
      data_nascimento: '2024-01-01',
      data_nascimento_estimada: false,
      categoria: 'Novilha',
      status: 'Ativo' as StatusAnimal,
      lote_id: null,
      peso_atual: null,
      peso_nascimento: null,
      mae_id: null,
      pai_id: null,
      raca: null,
      observacoes: null,
      sisbov_crbio: null,
      origem: null,
      foto_url: null,
      status_reprodutivo: null,
      data_ultimo_parto: null,
      data_parto_previsto: null,
      data_proxima_secagem: null,
      escore_condicao_corporal: null,
      flag_repetidora: false,
      is_reprodutor: false,
      reprodutor_vinculado_id: null,
      deleted_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const chaves = Object.keys(animal).sort();
    expect(chaves).toEqual(
      [
        'brinco',
        'categoria',
        'created_at',
        'data_nascimento',
        'data_nascimento_estimada',
        'data_parto_previsto',
        'data_proxima_secagem',
        'data_ultimo_parto',
        'deleted_at',
        'escore_condicao_corporal',
        'fazenda_id',
        'flag_repetidora',
        'foto_url',
        'id',
        'is_reprodutor',
        'lote_id',
        'mae_id',
        'nome',
        'observacoes',
        'origem',
        'pai_id',
        'peso_atual',
        'peso_nascimento',
        'raca',
        'reprodutor_vinculado_id',
        'sexo',
        'sisbov_crbio',
        'status',
        'status_reprodutivo',
        'tipo_rebanho',
        'updated_at',
      ].sort(),
    );
  });

  it('fixa os tipos das chaves de identidade do Núcleo', () => {
    expectTypeOf<Animal['id']>().toEqualTypeOf<string>();
    expectTypeOf<Animal['fazenda_id']>().toEqualTypeOf<string>();
    expectTypeOf<Animal['brinco']>().toEqualTypeOf<string>();
    expectTypeOf<Animal['categoria']>().toEqualTypeOf<string>();
    expectTypeOf<Animal['lote_id']>().toEqualTypeOf<string | null>();
    expectTypeOf<Animal['mae_id']>().toEqualTypeOf<string | null>();
    expectTypeOf<Animal['pai_id']>().toEqualTypeOf<string | null>();
  });
});

describe('Contrato congelado: Lote', () => {
  it('mantém o conjunto de chaves esperado (shape estável)', () => {
    const lote: Lote = {
      id: 'l1',
      fazenda_id: 'f1',
      nome: 'Lote A',
      descricao: null,
      tipo_rebanho: 'leiteiro',
      data_criacao: '2024-01-01',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    expect(Object.keys(lote).sort()).toEqual(
      ['created_at', 'data_criacao', 'descricao', 'fazenda_id', 'id', 'nome', 'tipo_rebanho', 'updated_at'].sort(),
    );
  });

  it('fixa o union de tipo_rebanho do Lote', () => {
    expectTypeOf<Lote['tipo_rebanho']>().toEqualTypeOf<'leiteiro' | 'corte' | 'misto' | null>();
  });
});

// ─── 2. CSVValidacaoResult / CSVImportResult ─────────────────────────────────

describe('Contrato congelado: CSVValidacaoResult (dry-run)', () => {
  it('mantém o shape do resultado de pré-validação', () => {
    const linha: CSVLinhaValidada = {
      linha: 1,
      brinco: '001',
      sexo: 'Fêmea',
      data_nascimento: '2024-01-01',
      tipo_rebanho: 'leiteiro',
      status: 'valido',
    };

    const resultado: CSVValidacaoResult = {
      total_linhas: 1,
      validos: 1,
      com_erro: 0,
      duplicados_arquivo: 0,
      duplicados_banco: 0,
      linhas: [linha],
    };

    expect(Object.keys(resultado).sort()).toEqual(
      ['com_erro', 'duplicados_arquivo', 'duplicados_banco', 'linhas', 'total_linhas', 'validos'].sort(),
    );
    expectTypeOf<CSVLinhaValidada['status']>().toEqualTypeOf<'valido' | 'erro'>();
  });
});

describe('Contrato congelado: CSVImportResult (commit)', () => {
  it('mantém o shape do resultado de importação (com resultado parcial)', () => {
    const erro: AnimalCSVValidationResult = {
      linha: 2,
      brinco: '002',
      status: 'erro',
      mensagem: 'duplicado',
    };

    const resultado: CSVImportResult = {
      total_linhas: 2,
      importados: 1,
      erros: [erro],
      lote_criado_id: 'l1',
      lote_criado_nome: 'Importação',
    };

    // erros[] é o canal de resultado parcial — deve permanecer um array por-linha
    expect(Array.isArray(resultado.erros)).toBe(true);
    expectTypeOf<CSVImportResult['importados']>().toEqualTypeOf<number>();
    expectTypeOf<CSVImportResult['erros']>().toEqualTypeOf<AnimalCSVValidationResult[]>();
    expectTypeOf<AnimalCSVValidationResult['status']>().toEqualTypeOf<'sucesso' | 'erro'>();
  });
});

// ─── 3. ResultadoLote ────────────────────────────────────────────────────────

describe('Contrato congelado: ResultadoLote', () => {
  it('mantém { inseridos, erros[{ animal_id, brinco, motivo }] }', () => {
    const resultado: ResultadoLote = {
      inseridos: 2,
      erros: [{ animal_id: 'a3', brinco: '003', motivo: 'animal inativo' }],
    };

    expect(Object.keys(resultado).sort()).toEqual(['erros', 'inseridos'].sort());
    expect(Object.keys(resultado.erros[0]).sort()).toEqual(['animal_id', 'brinco', 'motivo'].sort());

    expectTypeOf<ResultadoLote['inseridos']>().toEqualTypeOf<number>();
    // O contrato real inclui animal_id além de { brinco, motivo } citados na SPEC.
    expectTypeOf<ResultadoLote['erros']>().toEqualTypeOf<
      Array<{ animal_id: string; brinco: string; motivo: string }>
    >();
  });

  it('preserva o resultado parcial: erros nunca impedem inseridos > 0', () => {
    // Invariante semântica do Promise.allSettled por animal.
    const resultado: ResultadoLote = {
      inseridos: 2,
      erros: [{ animal_id: 'a1', brinco: '001', motivo: 'erro' }],
    };
    expect(resultado.inseridos).toBeGreaterThan(0);
    expect(resultado.erros.length).toBeGreaterThan(0);
  });
});

// ─── 4. RPC registrar_evento_com_status (ponto único de escrita) ─────────────

describe('Contrato congelado: RPC registrar_evento_com_status', () => {
  type RpcFn = Database['public']['Functions']['registrar_evento_com_status'];

  it('mantém a assinatura Args { p_animal_id, p_payload } → Returns string', () => {
    expectTypeOf<RpcFn['Args']>().toEqualTypeOf<{ p_animal_id: string; p_payload: Json }>();
  });

  it('continua sendo o ponto único de escrita declarado (Returns = id string)', () => {
    expectTypeOf<RpcFn['Returns']>().toEqualTypeOf<string>();
  });
});
