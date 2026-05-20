import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { gerarTokenConfirmacao, verificarTokenConfirmacao } from '@/lib/services/email';

describe('Email Service - Link Mágico', () => {
  let token: string;
  const agendamentoId = '550e8400-e29b-41d4-a716-446655440000';

  beforeAll(() => {
    // Gerar token para testes
    token = gerarTokenConfirmacao(agendamentoId, 'confirmar');
  });

  describe('gerarTokenConfirmacao', () => {
    it('deve gerar token válido', () => {
      const novoToken = gerarTokenConfirmacao(agendamentoId, 'confirmar');
      expect(novoToken).toBeTruthy();
      expect(typeof novoToken).toBe('string');
      expect(novoToken.length).toBeGreaterThan(0);
    });

    it('deve gerar tokens diferentes para IDs diferentes', () => {
      const token1 = gerarTokenConfirmacao(agendamentoId, 'confirmar');
      const token2 = gerarTokenConfirmacao('550e8400-e29b-41d4-a716-446655440001', 'confirmar');
      expect(token1).not.toBe(token2);
    });

    it('deve gerar tokens diferentes para tipos diferentes', () => {
      const token1 = gerarTokenConfirmacao(agendamentoId, 'confirmar');
      const token2 = gerarTokenConfirmacao(agendamentoId, 'recusar');
      const token3 = gerarTokenConfirmacao(agendamentoId, 'remarcar');
      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });
  });

  describe('verificarTokenConfirmacao', () => {
    it('deve verificar token válido', () => {
      const decoded = verificarTokenConfirmacao(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.agendamento_id).toBe(agendamentoId);
      expect(decoded?.tipo).toBe('confirmar');
    });

    it('deve retornar null para token inválido', () => {
      const decoded = verificarTokenConfirmacao('token-invalido');
      expect(decoded).toBeNull();
    });

    it('deve retornar null para token vazio', () => {
      const decoded = verificarTokenConfirmacao('');
      expect(decoded).toBeNull();
    });

    it('deve retornar o tipo correto', () => {
      const tokenConfirmar = gerarTokenConfirmacao(agendamentoId, 'confirmar');
      const decodedConfirmar = verificarTokenConfirmacao(tokenConfirmar);
      expect(decodedConfirmar?.tipo).toBe('confirmar');

      const tokenRecusar = gerarTokenConfirmacao(agendamentoId, 'recusar');
      const decodedRecusar = verificarTokenConfirmacao(tokenRecusar);
      expect(decodedRecusar?.tipo).toBe('recusar');

      const tokenRemarcar = gerarTokenConfirmacao(agendamentoId, 'remarcar');
      const decodedRemarcar = verificarTokenConfirmacao(tokenRemarcar);
      expect(decodedRemarcar?.tipo).toBe('remarcar');
    });

    it('deve retornar o ID de agendamento correto', () => {
      const id1 = '550e8400-e29b-41d4-a716-446655440000';
      const id2 = '550e8400-e29b-41d4-a716-446655440001';

      const token1 = gerarTokenConfirmacao(id1, 'confirmar');
      const decoded1 = verificarTokenConfirmacao(token1);
      expect(decoded1?.agendamento_id).toBe(id1);

      const token2 = gerarTokenConfirmacao(id2, 'confirmar');
      const decoded2 = verificarTokenConfirmacao(token2);
      expect(decoded2?.agendamento_id).toBe(id2);
    });
  });

  describe('Roundtrip Tests', () => {
    it('deve gerar e verificar token com sucesso', () => {
      const tipos: Array<'confirmar' | 'recusar' | 'remarcar'> = ['confirmar', 'recusar', 'remarcar'];
      const ids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ];

      tipos.forEach((tipo) => {
        ids.forEach((id) => {
          const gerado = gerarTokenConfirmacao(id, tipo);
          const verificado = verificarTokenConfirmacao(gerado);

          expect(verificado).not.toBeNull();
          expect(verificado?.agendamento_id).toBe(id);
          expect(verificado?.tipo).toBe(tipo);
        });
      });
    });
  });
});
