import { describe, it, expect, beforeAll } from 'vitest';
import { gerarTokenConfirmacao, verificarTokenConfirmacao } from '@/lib/services/email';

describe('Email Service - Link Mágico', () => {
  let token: string;
  const agendamentoId = '550e8400-e29b-41d4-a716-446655440000';

  beforeAll(async () => {
    token = await gerarTokenConfirmacao(agendamentoId, 'confirmar');
  });

  describe('gerarTokenConfirmacao', () => {
    it('deve gerar token válido', async () => {
      const novoToken = await gerarTokenConfirmacao(agendamentoId, 'confirmar');
      expect(novoToken).toBeTruthy();
      expect(typeof novoToken).toBe('string');
      expect(novoToken.length).toBeGreaterThan(0);
    });

    it('deve gerar tokens diferentes para IDs diferentes', async () => {
      const token1 = await gerarTokenConfirmacao(agendamentoId, 'confirmar');
      const token2 = await gerarTokenConfirmacao('550e8400-e29b-41d4-a716-446655440001', 'confirmar');
      expect(token1).not.toBe(token2);
    });

    it('deve gerar tokens diferentes para tipos diferentes', async () => {
      const token1 = await gerarTokenConfirmacao(agendamentoId, 'confirmar');
      const token2 = await gerarTokenConfirmacao(agendamentoId, 'recusar');
      const token3 = await gerarTokenConfirmacao(agendamentoId, 'remarcar');
      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });
  });

  describe('verificarTokenConfirmacao', () => {
    it('deve verificar token válido', async () => {
      const decoded = await verificarTokenConfirmacao(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.agendamento_id).toBe(agendamentoId);
      expect(decoded?.tipo).toBe('confirmar');
    });

    it('deve retornar null para token inválido', async () => {
      const decoded = await verificarTokenConfirmacao('token-invalido');
      expect(decoded).toBeNull();
    });

    it('deve retornar null para token vazio', async () => {
      const decoded = await verificarTokenConfirmacao('');
      expect(decoded).toBeNull();
    });

    it('deve retornar o tipo correto', async () => {
      const tokenConfirmar = await gerarTokenConfirmacao(agendamentoId, 'confirmar');
      const decodedConfirmar = await verificarTokenConfirmacao(tokenConfirmar);
      expect(decodedConfirmar?.tipo).toBe('confirmar');

      const tokenRecusar = await gerarTokenConfirmacao(agendamentoId, 'recusar');
      const decodedRecusar = await verificarTokenConfirmacao(tokenRecusar);
      expect(decodedRecusar?.tipo).toBe('recusar');

      const tokenRemarcar = await gerarTokenConfirmacao(agendamentoId, 'remarcar');
      const decodedRemarcar = await verificarTokenConfirmacao(tokenRemarcar);
      expect(decodedRemarcar?.tipo).toBe('remarcar');
    });

    it('deve retornar o ID de agendamento correto', async () => {
      const id1 = '550e8400-e29b-41d4-a716-446655440000';
      const id2 = '550e8400-e29b-41d4-a716-446655440001';

      const token1 = await gerarTokenConfirmacao(id1, 'confirmar');
      const decoded1 = await verificarTokenConfirmacao(token1);
      expect(decoded1?.agendamento_id).toBe(id1);

      const token2 = await gerarTokenConfirmacao(id2, 'confirmar');
      const decoded2 = await verificarTokenConfirmacao(token2);
      expect(decoded2?.agendamento_id).toBe(id2);
    });
  });

  describe('Roundtrip Tests', () => {
    it('deve gerar e verificar token com sucesso', async () => {
      const tipos: Array<'confirmar' | 'recusar' | 'remarcar'> = ['confirmar', 'recusar', 'remarcar'];
      const ids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ];

      for (const tipo of tipos) {
        for (const id of ids) {
          const gerado = await gerarTokenConfirmacao(id, tipo);
          const verificado = await verificarTokenConfirmacao(gerado);
          expect(verificado).not.toBeNull();
          expect(verificado?.agendamento_id).toBe(id);
          expect(verificado?.tipo).toBe(tipo);
        }
      }
    });
  });
});
