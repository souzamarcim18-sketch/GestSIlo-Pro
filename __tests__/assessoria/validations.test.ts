import { describe, it, expect } from 'vitest';
import { anotacaoFormSchema } from '@/lib/validations/assessoria';

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


});
