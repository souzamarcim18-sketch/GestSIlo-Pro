import { describe, it, expect } from 'vitest';
import { filtrosIndicadoresSchema, type FiltrosIndicadoresValidados } from '@/lib/validations/indicadores-rebanho';

describe('filtrosIndicadoresSchema (plural)', () => {
  describe('Períodos preset válidos', () => {
    it('aceita período 30d sem datas custom', () => {
      const filtro = {
        periodo: '30d',
        dataInicio: undefined,
        dataFim: undefined,
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(true);
    });

    it('aceita período 90d sem datas custom', () => {
      const filtro = {
        periodo: '90d',
        dataInicio: undefined,
        dataFim: undefined,
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(true);
    });

    it('aceita período 365d sem datas custom', () => {
      const filtro = {
        periodo: '365d',
        dataInicio: undefined,
        dataFim: undefined,
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(true);
    });

    it('aceita período safra sem datas custom', () => {
      const filtro = {
        periodo: 'safra',
        dataInicio: undefined,
        dataFim: undefined,
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(true);
    });
  });

  describe('Período custom com datas', () => {
    it('aceita custom com dataInicio e dataFim válidas', () => {
      const hoje = new Date();
      const trinta = new Date(hoje);
      trinta.setDate(trinta.getDate() - 30);

      const filtro = {
        periodo: 'custom',
        dataInicio: trinta,
        dataFim: hoje,
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(true);
    });

    it('rejeita custom sem dataInicio', () => {
      const hoje = new Date();
      const filtro = {
        periodo: 'custom',
        dataInicio: undefined,
        dataFim: hoje,
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('obrigatórios');
    });

    it('rejeita custom sem dataFim', () => {
      const hoje = new Date();
      const filtro = {
        periodo: 'custom',
        dataInicio: hoje,
        dataFim: undefined,
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('obrigatórios');
    });

    it('rejeita custom com dataFim < dataInicio', () => {
      const hoje = new Date();
      const futuro = new Date(hoje);
      futuro.setDate(futuro.getDate() + 30);

      const filtro = {
        periodo: 'custom',
        dataInicio: futuro,
        dataFim: hoje,
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('>=');
    });

    it('aceita custom com dataFim == dataInicio', () => {
      const hoje = new Date();
      const filtro = {
        periodo: 'custom',
        dataInicio: hoje,
        dataFim: hoje,
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(true);
    });
  });

  describe('Filtros opcionais', () => {
    it('aceita lotes como UUID array', () => {
      const filtro = {
        periodo: '30d',
        lotes: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(true);
    });

    it('rejeita lotes com UUID inválido', () => {
      const filtro = {
        periodo: '30d',
        lotes: ['not-a-uuid'],
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(false);
    });

    it('aceita categorias como string array', () => {
      const filtro = {
        periodo: '30d',
        categorias: ['Vaca em Lactação', 'Novilha', 'Bezerro(a)'],
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(true);
    });

    it('aceita lotes e categorias juntos', () => {
      const filtro = {
        periodo: '90d',
        lotes: ['550e8400-e29b-41d4-a716-446655440000'],
        categorias: ['Vaca em Lactação'],
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(true);
    });
  });

  describe('Payload mínimo (como envia IndicadoresClient)', () => {
    it('aceita apenas periodo (caso padrão)', () => {
      const filtro = {
        periodo: '90d',
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(true);
    });

    it('rejeita sem nenhum campo', () => {
      const filtro = {};
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(false);
    });

    it('rejeita periodo inválido', () => {
      const filtro = {
        periodo: 'invalid-preset',
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(false);
    });
  });

  describe('Blindagem de Schema — Rejeita Campos Extras (RLS-First)', () => {
    it('rejeita fazenda_id como campo extra (unrecognized_keys)', () => {
      const filtro = {
        periodo: '30d',
        fazenda_id: '550e8400-e29b-41d4-a716-446655440000',
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            code: 'unrecognized_keys',
          })
        );
      }
    });

    it('rejeita tipo_rebanho como campo extra', () => {
      const filtro = {
        periodo: '90d',
        tipo_rebanho: 'leiteiro',
      };
      const result = filtrosIndicadoresSchema.safeParse(filtro);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            code: 'unrecognized_keys',
          })
        );
      }
    });
  });

  describe('Type safety', () => {
    it('tipo FiltrosIndicadoresValidados é inferido corretamente', () => {
      const filtro: FiltrosIndicadoresValidados = {
        periodo: '30d',
        dataInicio: undefined,
        dataFim: undefined,
        lotes: undefined,
        categorias: undefined,
      };
      expect(filtro).toBeDefined();
    });
  });
});
