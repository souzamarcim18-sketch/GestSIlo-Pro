import { describe, it, expect } from 'vitest';
import {
  criarAnimalSchema,
  editarAnimalSchema,
  criarLoteSchema,
  criarEventoNascimentoSchema,
  criarEventoPesagemSchema,
  criarEventoMorteSchema,
  criarEventoVendaSchema,
  criarEventoTransferenciaSchema,
  animalCSVRowSchema,
} from '../validations/rebanho';
import { TipoEvento } from '../types/rebanho';

describe('rebanho.validations', () => {
  // ── ANIMAL — brinco ──────────────────────────────────────────────────────
  describe('criarAnimalSchema — brinco', () => {
    it('rejeita brinco vazio', () => {
      const result = criarAnimalSchema.safeParse({
        brinco: '',
        sexo: 'Macho',
        data_nascimento: '2025-01-01',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obrigatório');
      }
    });

    it('aceita brinco válido', () => {
      const result = criarAnimalSchema.safeParse({
        brinco: '001',
        sexo: 'Macho',
        data_nascimento: '2025-01-01',
      });
      expect(result.success).toBe(true);
    });

    it('rejeita brinco com mais de 255 caracteres', () => {
      const result = criarAnimalSchema.safeParse({
        brinco: 'A'.repeat(256),
        sexo: 'Macho',
        data_nascimento: '2025-01-01',
      });
      expect(result.success).toBe(false);
    });
  });

  // ── ANIMAL — data_nascimento ─────────────────────────────────────────────
  describe('criarAnimalSchema — data_nascimento', () => {
    it('rejeita data futura', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = criarAnimalSchema.safeParse({
        brinco: '001',
        sexo: 'Macho',
        data_nascimento: tomorrow.toISOString().split('T')[0],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('não futura');
      }
    });

    it('aceita data de hoje', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = criarAnimalSchema.safeParse({
        brinco: '001',
        sexo: 'Macho',
        data_nascimento: today,
      });
      expect(result.success).toBe(true);
    });

    it('aceita data passada', () => {
      const result = criarAnimalSchema.safeParse({
        brinco: '001',
        sexo: 'Macho',
        data_nascimento: '2020-01-01',
      });
      expect(result.success).toBe(true);
    });

    it('rejeita data inválida', () => {
      const result = criarAnimalSchema.safeParse({
        brinco: '001',
        sexo: 'Macho',
        data_nascimento: 'invalid-date',
      });
      expect(result.success).toBe(false);
    });
  });

  // ── ANIMAL — sexo ────────────────────────────────────────────────────────
  describe('criarAnimalSchema — sexo', () => {
    it('aceita Macho', () => {
      const result = criarAnimalSchema.safeParse({
        brinco: '001',
        sexo: 'Macho',
        data_nascimento: '2020-01-01',
      });
      expect(result.success).toBe(true);
    });

    it('aceita Fêmea', () => {
      const result = criarAnimalSchema.safeParse({
        brinco: '001',
        sexo: 'Fêmea',
        data_nascimento: '2020-01-01',
      });
      expect(result.success).toBe(true);
    });

    it('rejeita sexo inválido', () => {
      const result = criarAnimalSchema.safeParse({
        brinco: '001',
        sexo: 'Outro',
        data_nascimento: '2020-01-01',
      });
      expect(result.success).toBe(false);
    });
  });

  // ── ANIMAL — tipo_rebanho ────────────────────────────────────────────────
  describe('criarAnimalSchema — tipo_rebanho', () => {
    it('usa default leiteiro quando não informado', () => {
      const result = criarAnimalSchema.safeParse({
        brinco: '001',
        sexo: 'Macho',
        data_nascimento: '2020-01-01',
      });
      expect(result.success).toBe(true);
      expect(result.data?.tipo_rebanho).toBe('leiteiro');
    });

    it('aceita corte explícito', () => {
      const result = criarAnimalSchema.safeParse({
        brinco: '001',
        sexo: 'Macho',
        data_nascimento: '2020-01-01',
        tipo_rebanho: 'corte',
      });
      expect(result.success).toBe(true);
      expect(result.data?.tipo_rebanho).toBe('corte');
    });
  });

  // ── EVENTO PESAGEM — peso_kg ─────────────────────────────────────────────
  describe('criarEventoPesagemSchema — peso_kg', () => {
    const validBase = {
      animal_id: '550e8400-e29b-41d4-a716-446655440000',
      tipo: TipoEvento.PESAGEM as const,
      data_evento: '2026-01-01',
    };

    it('rejeita peso negativo', () => {
      const result = criarEventoPesagemSchema.safeParse({
        ...validBase,
        peso_kg: -10,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('maior que 0');
      }
    });

    it('rejeita peso zero', () => {
      const result = criarEventoPesagemSchema.safeParse({
        ...validBase,
        peso_kg: 0,
      });
      expect(result.success).toBe(false);
    });

    it('aceita peso positivo', () => {
      const result = criarEventoPesagemSchema.safeParse({
        ...validBase,
        peso_kg: 450.5,
      });
      expect(result.success).toBe(true);
    });

    it('rejeita peso acima de 2000 kg', () => {
      const result = criarEventoPesagemSchema.safeParse({
        ...validBase,
        peso_kg: 2001,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── EVENTO — data_evento ─────────────────────────────────────────────────
  describe('criarEventoNascimentoSchema — data_evento', () => {
    const validBase = {
      animal_id: '550e8400-e29b-41d4-a716-446655440000',
      tipo: TipoEvento.NASCIMENTO as const,
    };

    it('rejeita data futura', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = criarEventoNascimentoSchema.safeParse({
        ...validBase,
        data_evento: tomorrow.toISOString().split('T')[0],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('não futura');
      }
    });

    it('aceita data de hoje', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = criarEventoNascimentoSchema.safeParse({
        ...validBase,
        data_evento: today,
      });
      expect(result.success).toBe(true);
    });
  });

  // ── EVENTO TRANSFERÊNCIA — lote_id_destino ───────────────────────────────
  describe('criarEventoTransferenciaSchema — lote_id_destino', () => {
    const validBase = {
      animal_id: '550e8400-e29b-41d4-a716-446655440000',
      tipo: TipoEvento.TRANSFERENCIA_LOTE as const,
      data_evento: '2026-01-01',
    };

    it('rejeita sem lote_id_destino', () => {
      const result = criarEventoTransferenciaSchema.safeParse({
        ...validBase,
        // lote_id_destino omitido
      });
      expect(result.success).toBe(false);
    });

    it('rejeita lote_id_destino inválido (não UUID)', () => {
      const result = criarEventoTransferenciaSchema.safeParse({
        ...validBase,
        lote_id_destino: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('aceita lote_id_destino válido', () => {
      const result = criarEventoTransferenciaSchema.safeParse({
        ...validBase,
        lote_id_destino: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });
  });

  // ── CSV ROW — brinco ─────────────────────────────────────────────────────
  describe('animalCSVRowSchema — brinco', () => {
    const validBase = {
      sexo: 'Macho' as const,
      data_nascimento: '2020-01-01',
    };

    it('rejeita brinco vazio', () => {
      const result = animalCSVRowSchema.safeParse({
        ...validBase,
        brinco: '',
      });
      expect(result.success).toBe(false);
    });

    it('aceita brinco válido', () => {
      const result = animalCSVRowSchema.safeParse({
        ...validBase,
        brinco: '001',
      });
      expect(result.success).toBe(true);
    });
  });

  // ── CSV ROW — data_nascimento ────────────────────────────────────────────
  describe('animalCSVRowSchema — data_nascimento', () => {
    const validBase = {
      brinco: '001',
      sexo: 'Macho' as const,
    };

    it('aceita ISO format (YYYY-MM-DD)', () => {
      const result = animalCSVRowSchema.safeParse({
        ...validBase,
        data_nascimento: '2020-01-15',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data_nascimento).toBe('2020-01-15');
      }
    });

    it('aceita DD/MM/YYYY format', () => {
      const result = animalCSVRowSchema.safeParse({
        ...validBase,
        data_nascimento: '15/01/2020',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data_nascimento).toBe('2020-01-15');
      }
    });

    it('rejeita data futura', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isoDate = tomorrow.toISOString().split('T')[0];
      const result = animalCSVRowSchema.safeParse({
        ...validBase,
        data_nascimento: isoDate,
      });
      expect(result.success).toBe(false);
    });

    it('rejeita data inválida', () => {
      const result = animalCSVRowSchema.safeParse({
        ...validBase,
        data_nascimento: 'invalid-date',
      });
      expect(result.success).toBe(false);
    });
  });

  // ── CSV ROW — tipo_rebanho ───────────────────────────────────────────────
  describe('animalCSVRowSchema — tipo_rebanho', () => {
    const validBase = {
      brinco: '001',
      sexo: 'Macho' as const,
      data_nascimento: '2020-01-01',
    };

    it('usa default leiteiro', () => {
      const result = animalCSVRowSchema.safeParse(validBase);
      expect(result.success).toBe(true);
      expect(result.data?.tipo_rebanho).toBe('leiteiro');
    });

    it('aceita corte', () => {
      const result = animalCSVRowSchema.safeParse({
        ...validBase,
        tipo_rebanho: 'corte',
      });
      expect(result.success).toBe(true);
    });
  });

  // ── LOTE ──────────────────────────────────────────────────────────────────
  describe('criarLoteSchema', () => {
    it('rejeita nome vazio', () => {
      const result = criarLoteSchema.safeParse({
        nome: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejeita nome com 1 caractere', () => {
      const result = criarLoteSchema.safeParse({
        nome: 'A',
      });
      expect(result.success).toBe(false);
    });

    it('aceita nome com 2+ caracteres', () => {
      const result = criarLoteSchema.safeParse({
        nome: 'Lote A',
      });
      expect(result.success).toBe(true);
    });

    it('rejeita nome com mais de 255 caracteres', () => {
      const result = criarLoteSchema.safeParse({
        nome: 'A'.repeat(256),
      });
      expect(result.success).toBe(false);
    });
  });

  // ── EDIT ANIMAL ───────────────────────────────────────────────────────────
  describe('editarAnimalSchema', () => {
    it('aceita sem campos (todas as propriedades opcionais)', () => {
      const result = editarAnimalSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('aceita apenas data_nascimento', () => {
      const result = editarAnimalSchema.safeParse({
        data_nascimento: '2020-01-01',
      });
      expect(result.success).toBe(true);
    });

    it('rejeita data futura em data_nascimento', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = editarAnimalSchema.safeParse({
        data_nascimento: tomorrow.toISOString().split('T')[0],
      });
      expect(result.success).toBe(false);
    });
  });
});
