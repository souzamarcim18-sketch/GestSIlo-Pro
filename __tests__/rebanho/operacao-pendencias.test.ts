import { describe, it, expect } from 'vitest';
import {
  montarPendencias,
  type EntradasPendencias,
} from '@/lib/utils/rebanho-pendencias';
import type { AlertaSanitario } from '@/lib/types/rebanho-sanitario';
import type { AlertaAnimal } from '@/lib/supabase/rebanho-indicadores';

// Helpers de data relativos a hoje (em YYYY-MM-DD).
function emDias(dias: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

function vacina(over: Partial<AlertaSanitario> = {}): AlertaSanitario {
  return {
    animal_id: over.animal_id ?? 'a1',
    animal_brinco: over.animal_brinco ?? 'BR1',
    animal_nome: over.animal_nome ?? null,
    tipo: 'vacinacao',
    vacina_nome: over.vacina_nome ?? 'Aftosa',
    data_proxima_dose: over.data_proxima_dose ?? emDias(5),
    dias_para_vencimento: over.dias_para_vencimento ?? 5,
  };
}

function animalAlerta(over: Partial<AlertaAnimal> = {}): AlertaAnimal {
  return {
    id: over.id ?? 'an1',
    brinco: over.brinco ?? 'BR2',
    nome: over.nome ?? null,
    categoria: over.categoria ?? null,
    lote_id: over.lote_id ?? null,
    data_parto_previsto: over.data_parto_previsto,
  };
}

const vazio: EntradasPendencias = {
  vacinacoes: [],
  partosPrevistos: [],
  vacasSecas: [],
  semPesagem: [],
};

describe('montarPendencias — Operação do dia', () => {
  it('retorna resumo vazio quando não há alertas', () => {
    const r = montarPendencias(vazio);
    expect(r.total).toBe(0);
    expect(r.pendencias).toHaveLength(0);
    expect(r.grupos).toHaveLength(0);
    expect(r.totaisPorCategoria).toHaveLength(0);
    expect(r.totaisPorSubdominio).toEqual({
      reproducao: 0,
      sanidade: 0,
      desempenho: 0,
      manejo: 0,
    });
  });

  it('classifica vacinação vencida como crítico/sanidade e próxima como urgente', () => {
    const r = montarPendencias({
      ...vazio,
      vacinacoes: [
        vacina({ animal_id: 'v1', dias_para_vencimento: -3 }),
        vacina({ animal_id: 'v2', dias_para_vencimento: 4 }),
      ],
    });
    const vencida = r.pendencias.find((p) => p.animal_id === 'v1');
    const proxima = r.pendencias.find((p) => p.animal_id === 'v2');
    expect(vencida?.tipo).toBe('vacinacao_vencida');
    expect(vencida?.criticidade).toBe('critico');
    expect(vencida?.subdominio).toBe('sanidade');
    expect(proxima?.tipo).toBe('vacinacao_proxima');
    expect(proxima?.criticidade).toBe('urgente');
    expect(r.totaisPorSubdominio.sanidade).toBe(2);
  });

  it('parto em ≤7 dias é crítico; >7 dias é urgente (reprodução)', () => {
    const r = montarPendencias({
      ...vazio,
      partosPrevistos: [
        animalAlerta({ id: 'p1', data_parto_previsto: emDias(3) }),
        animalAlerta({ id: 'p2', data_parto_previsto: emDias(20) }),
      ],
    });
    expect(r.pendencias.find((p) => p.animal_id === 'p1')?.criticidade).toBe('critico');
    expect(r.pendencias.find((p) => p.animal_id === 'p2')?.criticidade).toBe('urgente');
    expect(r.totaisPorSubdominio.reproducao).toBe(2);
  });

  it('vaca a secar é reprodução/urgente com ação de secagem', () => {
    const r = montarPendencias({
      ...vazio,
      vacasSecas: [animalAlerta({ id: 's1', categoria: 'Vaca Seca', data_parto_previsto: emDias(10) })],
    });
    const p = r.pendencias[0];
    expect(p.tipo).toBe('vaca_a_secar');
    expect(p.subdominio).toBe('reproducao');
    expect(p.criticidade).toBe('urgente');
    expect(p.acaoSugerida).toMatch(/secagem/i);
    expect(p.href).toContain('/evento');
  });

  it('pesagem atrasada é desempenho/aviso sem prazo', () => {
    const r = montarPendencias({
      ...vazio,
      semPesagem: [animalAlerta({ id: 'w1' })],
    });
    const p = r.pendencias[0];
    expect(p.tipo).toBe('pesagem_atrasada');
    expect(p.subdominio).toBe('desempenho');
    expect(p.criticidade).toBe('aviso');
    expect(p.diasParaVencimento).toBeNull();
  });

  it('prioriza por criticidade (crítico → urgente → aviso) e depois por prazo', () => {
    const r = montarPendencias({
      vacinacoes: [vacina({ animal_id: 'v1', dias_para_vencimento: -1 })], // crítico
      partosPrevistos: [animalAlerta({ id: 'p2', data_parto_previsto: emDias(25) })], // urgente
      vacasSecas: [],
      semPesagem: [animalAlerta({ id: 'w3' })], // aviso
    });
    expect(r.pendencias.map((p) => p.criticidade)).toEqual([
      'critico',
      'urgente',
      'aviso',
    ]);
  });

  it('agrupa em listas acionáveis apenas os tipos presentes', () => {
    const r = montarPendencias({
      ...vazio,
      vacinacoes: [vacina({ dias_para_vencimento: -2 })],
      semPesagem: [animalAlerta({ id: 'w1' })],
    });
    const tipos = r.grupos.map((g) => g.tipo);
    expect(tipos).toContain('vacinacao_vencida');
    expect(tipos).toContain('pesagem_atrasada');
    expect(tipos).not.toContain('parto_proximo');
  });

  it('conta pendências por categoria animal, ignorando as sem categoria', () => {
    const r = montarPendencias({
      ...vazio,
      partosPrevistos: [
        animalAlerta({ id: 'p1', categoria: 'Vaca Seca', data_parto_previsto: emDias(5) }),
        animalAlerta({ id: 'p2', categoria: 'Vaca Seca', data_parto_previsto: emDias(6) }),
        animalAlerta({ id: 'p3', categoria: null, data_parto_previsto: emDias(7) }),
      ],
    });
    expect(r.totaisPorCategoria).toEqual([{ categoria: 'Vaca Seca', total: 2 }]);
  });
});
