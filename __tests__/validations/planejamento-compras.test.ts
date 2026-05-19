import { describe, it, expect } from 'vitest';
import {
  planejamentoAtividadeSchema,
  marcarComoCompradoSchema,
} from '@/lib/validations/planejamento-compras';

describe('planejamentoAtividadeSchema', () => {
  it('aceita payload válido', () => {
    const result = planejamentoAtividadeSchema.safeParse({
      talhao_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      tipo_operacao: 'Plantio',
      data_prevista: '2026-06-15',
    });
    expect(result.success).toBe(true);
  });

  it('rejeita quando talhao_id é inválido', () => {
    const result = planejamentoAtividadeSchema.safeParse({
      talhao_id: 'nao-e-uuid',
      tipo_operacao: 'Plantio',
      data_prevista: '2026-06-15',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('talhao_id');
  });

  it('rejeita quando data_prevista está ausente', () => {
    const result = planejamentoAtividadeSchema.safeParse({
      talhao_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      tipo_operacao: 'Calagem',
      data_prevista: '',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('data_prevista');
  });

  it('rejeita tipo_operacao inválido', () => {
    const result = planejamentoAtividadeSchema.safeParse({
      talhao_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      tipo_operacao: 'TipoInvalido',
      data_prevista: '2026-06-15',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('tipo_operacao');
  });

  it('aceita observacoes nulo', () => {
    const result = planejamentoAtividadeSchema.safeParse({
      talhao_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      tipo_operacao: 'Outro',
      data_prevista: '2026-06-15',
      observacoes: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejeita observacoes com mais de 500 caracteres', () => {
    const result = planejamentoAtividadeSchema.safeParse({
      talhao_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      tipo_operacao: 'Outro',
      data_prevista: '2026-06-15',
      observacoes: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('marcarComoCompradoSchema', () => {
  const base = {
    insumo_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    quantidade_comprada: 50,
    data_compra: '2026-05-19',
    planejamentos_ids: ['b1b2b3b4-e5f6-7890-abcd-ef1234567890'],
  };

  it('aceita payload válido', () => {
    expect(marcarComoCompradoSchema.safeParse(base).success).toBe(true);
  });

  it('rejeita quantidade_comprada negativa', () => {
    const result = marcarComoCompradoSchema.safeParse({
      ...base,
      quantidade_comprada: -10,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('quantidade_comprada');
  });

  it('rejeita quantidade_comprada zero', () => {
    const result = marcarComoCompradoSchema.safeParse({
      ...base,
      quantidade_comprada: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejeita data_compra ausente', () => {
    const result = marcarComoCompradoSchema.safeParse({
      ...base,
      data_compra: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejeita planejamentos_ids vazio', () => {
    const result = marcarComoCompradoSchema.safeParse({
      ...base,
      planejamentos_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it('aceita valor_unitario_pago nulo', () => {
    const result = marcarComoCompradoSchema.safeParse({
      ...base,
      valor_unitario_pago: null,
    });
    expect(result.success).toBe(true);
  });
});
