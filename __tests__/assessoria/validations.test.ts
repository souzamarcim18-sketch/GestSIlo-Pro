import { describe, it, expect } from 'vitest';
import {
  anotacaoFormSchema,
  criarAgendamentoSchema,
  atualizarStatusAgendamentoSchema,
} from '@/lib/validations/assessoria';

describe('Assessoria Validations', () => {
  describe('anotacaoFormSchema', () => {
    it('deve validar anotação com dados corretos', () => {
      const valido = {
        titulo: 'Dúvida sobre adubação',
        conteudo: 'Qual é a quantidade ideal de nitrogênio para silagem?',
        categoria: 'duvida' as const,
        prioridade: 'normal' as const,
      };
      expect(() => anotacaoFormSchema.parse(valido)).not.toThrow();
    });

    it('deve rejeitar título muito curto', () => {
      const invalido = {
        titulo: 'Abc',
        conteudo: 'Qual é a quantidade ideal?',
        categoria: 'duvida' as const,
        prioridade: 'normal' as const,
      };
      expect(() => anotacaoFormSchema.parse(invalido)).toThrow();
    });

    it('deve rejeitar conteúdo muito curto', () => {
      const invalido = {
        titulo: 'Dúvida válida',
        conteudo: 'Abc',
        categoria: 'duvida' as const,
        prioridade: 'normal' as const,
      };
      expect(() => anotacaoFormSchema.parse(invalido)).toThrow();
    });

    it('deve aceitar categorias válidas', () => {
      const categorias = ['duvida', 'observacao_campo', 'sugestao', 'outro'];
      categorias.forEach((cat) => {
        expect(() =>
          anotacaoFormSchema.parse({
            titulo: 'Título válido',
            conteudo: 'Conteúdo com tamanho válido',
            categoria: cat,
            prioridade: 'normal',
          })
        ).not.toThrow();
      });
    });

    it('deve aceitar prioridades válidas', () => {
      const prioridades = ['baixa', 'normal', 'alta', 'urgente'];
      prioridades.forEach((prior) => {
        expect(() =>
          anotacaoFormSchema.parse({
            titulo: 'Título válido',
            conteudo: 'Conteúdo com tamanho válido',
            categoria: 'duvida',
            prioridade: prior,
          })
        ).not.toThrow();
      });
    });
  });

  describe('criarAgendamentoSchema', () => {
    it('deve validar agendamento com dados corretos', () => {
      const valido = {
        horario_disponivel_id: '550e8400-e29b-41d4-a716-446655440000',
        consultor_id: '550e8400-e29b-41d4-a716-446655440001',
        tipo: 'reuniao_video' as const,
        observacoes: 'Gostaria de discutir sobre adubação',
      };
      expect(() => criarAgendamentoSchema.parse(valido)).not.toThrow();
    });

    it('deve rejeitar UUID inválido para horario_id', () => {
      const invalido = {
        horario_disponivel_id: 'nao-eh-uuid',
        consultor_id: '550e8400-e29b-41d4-a716-446655440001',
        tipo: 'reuniao_video' as const,
      };
      expect(() => criarAgendamentoSchema.parse(invalido)).toThrow();
    });

    it('deve rejeitar UUID inválido para consultor_id', () => {
      const invalido = {
        horario_disponivel_id: '550e8400-e29b-41d4-a716-446655440000',
        consultor_id: 'nao-eh-uuid',
        tipo: 'reuniao_video' as const,
      };
      expect(() => criarAgendamentoSchema.parse(invalido)).toThrow();
    });

    it('deve aceitar tipos válidos', () => {
      const tipos = ['reuniao_video', 'chamada_telefone'];
      tipos.forEach((tipo) => {
        expect(() =>
          criarAgendamentoSchema.parse({
            horario_disponivel_id: '550e8400-e29b-41d4-a716-446655440000',
            consultor_id: '550e8400-e29b-41d4-a716-446655440001',
            tipo,
          })
        ).not.toThrow();
      });
    });

    it('deve rejeitar URL inválida no link_reuniao', () => {
      const invalido = {
        horario_disponivel_id: '550e8400-e29b-41d4-a716-446655440000',
        consultor_id: '550e8400-e29b-41d4-a716-446655440001',
        tipo: 'reuniao_video' as const,
        link_reuniao: 'nao eh uma url',
      };
      expect(() => criarAgendamentoSchema.parse(invalido)).toThrow();
    });

    it('deve aceitar URL válida no link_reuniao', () => {
      const valido = {
        horario_disponivel_id: '550e8400-e29b-41d4-a716-446655440000',
        consultor_id: '550e8400-e29b-41d4-a716-446655440001',
        tipo: 'reuniao_video' as const,
        link_reuniao: 'https://meet.google.com/abc-defg-hij',
      };
      expect(() => criarAgendamentoSchema.parse(valido)).not.toThrow();
    });
  });

  describe('atualizarStatusAgendamentoSchema', () => {
    it('deve validar atualização de status com confirmado', () => {
      const valido = {
        status: 'confirmado' as const,
      };
      expect(() => atualizarStatusAgendamentoSchema.parse(valido)).not.toThrow();
    });

    it('deve validar atualização de status com recusado e motivo', () => {
      const valido = {
        status: 'recusado' as const,
        motivo_recusa: 'Indisponível nessa data',
      };
      expect(() => atualizarStatusAgendamentoSchema.parse(valido)).not.toThrow();
    });

    it('deve validar atualização de status com remarcado e nova data', () => {
      const valido = {
        status: 'remarcado' as const,
        sugestao_nova_data: new Date('2026-06-15T10:00:00'),
      };
      expect(() => atualizarStatusAgendamentoSchema.parse(valido)).not.toThrow();
    });

    it('deve aceitar todos os status válidos', () => {
      const status = ['confirmado', 'recusado', 'remarcado', 'cancelado', 'concluido'];
      status.forEach((s) => {
        expect(() =>
          atualizarStatusAgendamentoSchema.parse({
            status: s,
          })
        ).not.toThrow();
      });
    });
  });
});
