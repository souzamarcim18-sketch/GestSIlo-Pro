import { describe, it, expect } from 'vitest';
import { criarEventoSchema } from '@/lib/validations/rebanho';
import { TipoEvento } from '@/lib/types/rebanho';

// Paridade de payload (SPEC-rebanho345 R-3.1 / smoke 12.3):
// o caminho convergido envia o objeto do formulário direto à RPC, validado por
// `criarEventoSchema`. Este teste prova que, para cada tipo, o objeto validado
// contém os MESMOS campos semânticos que o antigo `buildPayload` montava
// manualmente — sem regressão de campo.

const ANIMAL_ID = '11111111-1111-4111-8111-111111111111';
const DATA = '2026-06-01';

describe('Evento individual — paridade do payload convergido', () => {
  it('PESAGEM: peso_kg + escore opcional', () => {
    const parsed = criarEventoSchema.parse({
      animal_id: ANIMAL_ID,
      tipo: TipoEvento.PESAGEM,
      data_evento: DATA,
      peso_kg: 420.5,
      escore_condicao_corporal: 3,
      observacoes: null,
    });
    expect(parsed).toMatchObject({
      animal_id: ANIMAL_ID,
      tipo: 'pesagem',
      data_evento: DATA,
      peso_kg: 420.5,
      escore_condicao_corporal: 3,
    });
  });

  it('VENDA: comprador + valor_venda', () => {
    const parsed = criarEventoSchema.parse({
      animal_id: ANIMAL_ID,
      tipo: TipoEvento.VENDA,
      data_evento: DATA,
      comprador: 'Fulano',
      valor_venda: 3500,
      observacoes: null,
    });
    expect(parsed).toMatchObject({
      tipo: 'venda',
      comprador: 'Fulano',
      valor_venda: 3500,
    });
  });

  it('TRANSFERENCIA_LOTE: lote_id_destino obrigatório', () => {
    const lote = '22222222-2222-4222-8222-222222222222';
    const parsed = criarEventoSchema.parse({
      animal_id: ANIMAL_ID,
      tipo: TipoEvento.TRANSFERENCIA_LOTE,
      data_evento: DATA,
      lote_id_destino: lote,
    });
    expect(parsed).toMatchObject({
      tipo: 'transferencia_lote',
      lote_id_destino: lote,
    });
  });

  it('COBERTURA: tipo_cobertura + reprodutor opcional', () => {
    const parsed = criarEventoSchema.parse({
      animal_id: ANIMAL_ID,
      tipo: TipoEvento.COBERTURA,
      data_evento: DATA,
      tipo_cobertura: 'iatf',
      reprodutor_id: null,
    });
    expect(parsed).toMatchObject({
      tipo: 'cobertura',
      tipo_cobertura: 'iatf',
    });
  });

  it('DIAGNOSTICO_PRENHEZ: resultado_prenhez', () => {
    const parsed = criarEventoSchema.parse({
      animal_id: ANIMAL_ID,
      tipo: TipoEvento.DIAGNOSTICO_PRENHEZ,
      data_evento: DATA,
      resultado_prenhez: 'positivo',
    });
    expect(parsed).toMatchObject({
      tipo: 'diagnostico_prenhez',
      resultado_prenhez: 'positivo',
    });
  });

  it('PARTO: tipo_parto opcional', () => {
    const parsed = criarEventoSchema.parse({
      animal_id: ANIMAL_ID,
      tipo: TipoEvento.PARTO,
      data_evento: DATA,
      tipo_parto: 'normal',
    });
    expect(parsed).toMatchObject({ tipo: 'parto', tipo_parto: 'normal' });
  });

  it('tipos mínimos (SECAGEM/ABORTO/DESCARTE/DESMAME/NASCIMENTO) só exigem base', () => {
    for (const tipo of [
      TipoEvento.SECAGEM,
      TipoEvento.ABORTO,
      TipoEvento.DESCARTE,
      TipoEvento.DESMAME,
      TipoEvento.NASCIMENTO,
    ]) {
      const parsed = criarEventoSchema.parse({
        animal_id: ANIMAL_ID,
        tipo,
        data_evento: DATA,
        observacoes: null,
      });
      expect(parsed).toMatchObject({ tipo, animal_id: ANIMAL_ID, data_evento: DATA });
    }
  });

  it('PESAGEM sem peso é rejeitada (validação preservada)', () => {
    expect(() =>
      criarEventoSchema.parse({
        animal_id: ANIMAL_ID,
        tipo: TipoEvento.PESAGEM,
        data_evento: DATA,
      })
    ).toThrow();
  });
});
