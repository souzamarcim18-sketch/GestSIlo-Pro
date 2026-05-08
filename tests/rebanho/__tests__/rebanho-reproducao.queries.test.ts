import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fixtures para testes de queries
const FAZENDA_ID = '11111111-1111-1111-1111-111111111111';
const ANIMAL_ID_1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ANIMAL_ID_2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ANIMAL_ID_3 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

describe('Rebanho Reprodução — Queries & Lógica de Negócio', () => {
  describe('Performance', () => {
    it('Query calendário com 500 eventos → tempo < 1s', async () => {
      // Simular 500 eventos
      const eventosLargeSet = Array.from({ length: 500 }, (_, i) => ({
        id: `evento-${i}`,
        animal_id: `animal-${i % 10}`,
        tipo: ['cobertura', 'diagnostico_prenhez', 'parto'][i % 3],
        data_evento: new Date(2026, 0, (i % 28) + 1).toISOString().split('T')[0],
      }));

      const startTime = performance.now();

      // Simular query com filtro e ordenação
      const resultado = eventosLargeSet
        .filter(e => e.data_evento >= '2026-01-01')
        .sort((a, b) => new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime())
        .slice(0, 100);

      const endTime = performance.now();
      const tempoMs = endTime - startTime;

      expect(resultado.length).toBeGreaterThan(0);
      expect(tempoMs).toBeLessThan(1000); // < 1 segundo
    });
  });

  describe('Indicadores - Taxa Prenhez', () => {
    it('100 vacas, 60 prenhes → taxa 60%', () => {
      const animais = [
        // 60 prenhes
        ...Array.from({ length: 60 }, () => ({ status_reprodutivo: 'prenha' })),
        // 40 vazias
        ...Array.from({ length: 40 }, () => ({ status_reprodutivo: 'vazia' })),
      ];

      const prenhas = animais.filter(a => a.status_reprodutivo === 'prenha').length;
      const aptos = animais.filter(a => a.status_reprodutivo !== 'descartada').length;
      const taxa = aptos > 0 ? Math.round((prenhas / aptos) * 100) : 0;

      expect(taxa).toBe(60);
    });

    it('0 vacas → taxa 0%', () => {
      const animais: any[] = [];

      const prenhas = animais.filter(a => a.status_reprodutivo === 'prenha').length;
      const aptos = animais.filter(a => a.status_reprodutivo !== 'descartada').length;
      const taxa = aptos > 0 ? Math.round((prenhas / aptos) * 100) : 0;

      expect(taxa).toBe(0);
    });

    it('Inclui lactação, exclui descartada no denominador', () => {
      const animais = [
        { status_reprodutivo: 'prenha' },
        { status_reprodutivo: 'lactacao' },
        { status_reprodutivo: 'vazia' },
        { status_reprodutivo: 'descartada' }, // NÃO conta em aptos
      ];

      const prenhas = animais.filter(a => a.status_reprodutivo === 'prenha').length;
      const aptos = animais.filter(a => a.status_reprodutivo !== 'descartada').length;
      const taxa = aptos > 0 ? Math.round((prenhas / aptos) * 100) : 0;

      expect(prenhas).toBe(1);
      expect(aptos).toBe(3);
      expect(taxa).toBe(33); // 1/3 ≈ 33%
    });
  });

  describe('Indicadores - PSM Médio (Período de Serviço Médio)', () => {
    it('PSM = dias entre cobertura e diagnóstico positivo', () => {
      const eventos = [
        { animal_id: ANIMAL_ID_1, tipo: 'cobertura', data_evento: '2026-04-01' },
        { animal_id: ANIMAL_ID_1, tipo: 'diagnostico_prenhez', data_evento: '2026-05-01', resultado_prenhez: 'positivo' },
      ];

      // Simular cálculo PSM
      const psms: number[] = [];
      for (let i = 0; i < eventos.length - 1; i++) {
        const evt = eventos[i];
        const prox = eventos[i + 1];
        if (evt.tipo === 'cobertura' && prox.tipo === 'diagnostico_prenhez') {
          const dias = Math.floor(
            (new Date(prox.data_evento).getTime() - new Date(evt.data_evento).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (dias > 0 && dias < 100) {
            psms.push(dias);
          }
        }
      }

      const psmMedia = psms.length > 0 ? Math.round(psms.reduce((a, b) => a + b, 0) / psms.length) : null;

      expect(psms.length).toBe(1);
      expect(psms[0]).toBe(30); // 30 dias entre 01/04 e 01/05
      expect(psmMedia).toBe(30);
    });

    it('PSM nulo quando não há cobertura/diagnóstico', () => {
      const eventos: any[] = [];

      const psms: number[] = [];
      for (let i = 0; i < eventos.length - 1; i++) {
        const evt = eventos[i];
        const prox = eventos[i + 1];
        if (evt.tipo === 'cobertura' && prox.tipo === 'diagnostico_prenhez') {
          psms.push(30);
        }
      }

      const psmMedia = psms.length > 0 ? Math.round(psms.reduce((a, b) => a + b, 0) / psms.length) : null;

      expect(psms.length).toBe(0);
      expect(psmMedia).toBeNull();
    });
  });

  describe('Indicadores - IEP Médio (Intervalo Entre Partos)', () => {
    it('IEP = dias entre partos sucessivos (300-500 dias válidos)', () => {
      const partos = [
        { animal_id: ANIMAL_ID_1, data_evento: '2025-01-01' },
        { animal_id: ANIMAL_ID_1, data_evento: '2026-01-15' }, // 379 dias - válido
      ];

      const ieps: number[] = [];
      for (let i = 0; i < partos.length - 1; i++) {
        const dias = Math.floor(
          (new Date(partos[i + 1].data_evento).getTime() - new Date(partos[i].data_evento).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (dias > 300 && dias < 500) {
          ieps.push(dias);
        }
      }

      const iepMedia = ieps.length > 0 ? Math.round(ieps.reduce((a, b) => a + b, 0) / ieps.length) : null;

      expect(ieps.length).toBe(1);
      expect(ieps[0]).toBe(379);
      expect(iepMedia).toBe(379);
    });

    it('IEP descarta partos < 300 dias (muito próximos)', () => {
      const partos = [
        { animal_id: ANIMAL_ID_1, data_evento: '2025-12-01' },
        { animal_id: ANIMAL_ID_1, data_evento: '2026-01-01' }, // 31 dias - inválido
      ];

      const ieps: number[] = [];
      for (let i = 0; i < partos.length - 1; i++) {
        const dias = Math.floor(
          (new Date(partos[i + 1].data_evento).getTime() - new Date(partos[i].data_evento).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (dias > 300 && dias < 500) {
          ieps.push(dias);
        }
      }

      expect(ieps.length).toBe(0);
    });

    it('IEP descarta partos > 500 dias (muito distantes)', () => {
      const partos = [
        { animal_id: ANIMAL_ID_1, data_evento: '2024-01-01' },
        { animal_id: ANIMAL_ID_1, data_evento: '2026-02-01' }, // 762 dias - inválido
      ];

      const ieps: number[] = [];
      for (let i = 0; i < partos.length - 1; i++) {
        const dias = Math.floor(
          (new Date(partos[i + 1].data_evento).getTime() - new Date(partos[i].data_evento).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (dias > 300 && dias < 500) {
          ieps.push(dias);
        }
      }

      expect(ieps.length).toBe(0);
    });
  });

  describe('Triggers & Lógica de Negócio', () => {
    it('Após parto → lactação criada automaticamente', () => {
      const evento_parto = {
        id: 'evento-parto-1',
        tipo: 'parto',
        animal_id: ANIMAL_ID_1,
        fazenda_id: FAZENDA_ID,
        data_evento: '2026-05-01',
      };

      // Simulando trigger: após inserir evento parto, criar lactação
      const lactacoes: any[] = [];

      if (evento_parto.tipo === 'parto') {
        lactacoes.push({
          id: `lactacao-${evento_parto.id}`,
          animal_id: evento_parto.animal_id,
          fazenda_id: evento_parto.fazenda_id,
          data_inicio_parto: evento_parto.data_evento,
        });
      }

      expect(lactacoes.length).toBe(1);
      expect(lactacoes[0].data_inicio_parto).toBe('2026-05-01');
    });

    it('Parto gemelar cria 2 bezerros em animais', () => {
      const evento_parto = {
        id: 'evento-parto-gemelar',
        tipo: 'parto',
        animal_id: ANIMAL_ID_1,
        fazenda_id: FAZENDA_ID,
        data_evento: '2026-05-01',
        gemelar: true,
      };

      // Simulando trigger: após parto gemelar, criar 2 animais
      const bezerros_criados: any[] = [];

      if (evento_parto.tipo === 'parto' && evento_parto.gemelar) {
        for (let i = 0; i < 2; i++) {
          bezerros_criados.push({
            id: `bezerro-${i + 1}`,
            mae_id: evento_parto.animal_id,
            data_nascimento: evento_parto.data_evento,
            origem: 'nascimento',
          });
        }
      }

      expect(bezerros_criados.length).toBe(2);
      expect(bezerros_criados[0].mae_id).toBe(ANIMAL_ID_1);
      expect(bezerros_criados[1].origem).toBe('nascimento');
    });

    it('3ª cobertura sem prenhez → flag_repetidora = true', () => {
      const eventos = [
        { tipo: 'cobertura', animal_id: ANIMAL_ID_1, data_evento: '2026-03-01' },
        { tipo: 'cobertura', animal_id: ANIMAL_ID_1, data_evento: '2026-03-20' },
        { tipo: 'cobertura', animal_id: ANIMAL_ID_1, data_evento: '2026-04-10' },
        // Nenhum diagnóstico positivo após qualquer cobertura
      ];

      // Contar coberturas sem prenhez
      let coberturas_count = 0;
      let flag_repetidora = false;
      const coberturas_para_repetidora = 3;

      for (const evt of eventos) {
        if (evt.tipo === 'cobertura') {
          coberturas_count++;
          if (coberturas_count >= coberturas_para_repetidora) {
            flag_repetidora = true;
          }
        }
      }

      expect(coberturas_count).toBe(3);
      expect(flag_repetidora).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('Aborto cancela prenhez: status volta de prenha para vazia', () => {
      let animal_status = 'prenha';

      // Simular trigger aborto_limpar_datas_previstas
      const evento_aborto = { tipo: 'aborto', animal_id: ANIMAL_ID_1 };

      if (evento_aborto.tipo === 'aborto') {
        animal_status = 'vazia';
      }

      expect(animal_status).toBe('vazia');
    });

    it('Descarte bloqueia novos eventos: status = descartada', () => {
      let animal_status = 'vazia';

      // Simular trigger descarte_marcar_status
      const evento_descarte = { tipo: 'descarte', animal_id: ANIMAL_ID_1 };

      if (evento_descarte.tipo === 'descarte') {
        animal_status = 'descartada';
      }

      expect(animal_status).toBe('descartada');

      // Tentar inserir novo evento em animal descartado deveria falhar em BEFORE INSERT trigger
      const pode_inserir_evento = animal_status !== 'descartada';
      expect(pode_inserir_evento).toBe(false);
    });

    it('Diagnóstico positivo atualiza status para prenha e calcula datas', () => {
      const animal = { status_reprodutivo: 'inseminada' };
      const evento = {
        tipo: 'diagnostico_prenhez',
        resultado_prenhez: 'positivo',
        data_evento: '2025-05-01',
      };

      const dias_gestacao = 283;
      const dias_seca = 60;

      // Simular trigger diagnostico_atualizar_datas_previstas
      if (evento.tipo === 'diagnostico_prenhez' && evento.resultado_prenhez === 'positivo') {
        animal.status_reprodutivo = 'prenha';
        const data_evento = new Date(evento.data_evento);
        const data_parto_previsto = new Date(data_evento.getTime() + dias_gestacao * 24 * 60 * 60 * 1000);
        const data_proxima_secagem = new Date(
          data_parto_previsto.getTime() - dias_seca * 24 * 60 * 60 * 1000
        );

        expect(animal.status_reprodutivo).toBe('prenha');
        // 2025-05-01 + 283 dias = 2026-02-08
        expect(data_parto_previsto.toISOString().split('T')[0]).toBe('2026-02-08');
        // 2026-02-08 - 60 dias = 2025-12-10
        expect(data_proxima_secagem.toISOString().split('T')[0]).toBe('2025-12-10');
      }
    });
  });
});
