import { describe, it, expect } from 'vitest';
import { calcularEstruturaRebanho } from '@/lib/calculos/indicadores-rebanho';
import { CATEGORIA } from '@/lib/constants/categorias-rebanho';
import { TipoRebanho, type Animal } from '@/lib/types/rebanho';

// Estrutura/Composição (Fase 4, P4.2 — SPEC-rebanho345 §7.9).
// Usa a fonte única de categorias (D-4.2): as strings vêm de CATEGORIA.

type AnimalEstrutura = Pick<Animal, 'categoria' | 'sexo' | 'tipo_rebanho' | 'lote_id'>;

function animal(over: Partial<AnimalEstrutura>): AnimalEstrutura {
  return {
    categoria: over.categoria ?? CATEGORIA.VACA_LACTACAO,
    sexo: over.sexo ?? 'Fêmea',
    tipo_rebanho: over.tipo_rebanho ?? TipoRebanho.LEITEIRO,
    lote_id: over.lote_id ?? null,
  };
}

describe('calcularEstruturaRebanho', () => {
  const nomePorLote = new Map<string, string>([
    ['l1', 'Lote A'],
    ['l2', 'Lote B'],
  ]);

  const animais: AnimalEstrutura[] = [
    animal({ categoria: CATEGORIA.VACA_LACTACAO, sexo: 'Fêmea', tipo_rebanho: TipoRebanho.LEITEIRO, lote_id: 'l1' }),
    animal({ categoria: CATEGORIA.VACA_LACTACAO, sexo: 'Fêmea', tipo_rebanho: TipoRebanho.LEITEIRO, lote_id: 'l1' }),
    animal({ categoria: CATEGORIA.NOVILHA_PRENHA, sexo: 'Fêmea', tipo_rebanho: TipoRebanho.LEITEIRO, lote_id: 'l2' }),
    animal({ categoria: CATEGORIA.BEZERRO, sexo: 'Macho', tipo_rebanho: TipoRebanho.CORTE, lote_id: null }),
    animal({ categoria: CATEGORIA.TOURO, sexo: 'Macho', tipo_rebanho: TipoRebanho.DUPLA_APTIDAO, lote_id: 'l1' }),
  ];

  const estrutura = calcularEstruturaRebanho(animais, nomePorLote);

  it('conta o total de animais ativos', () => {
    expect(estrutura.total).toBe(5);
  });

  it('agrupa por categoria usando as strings canônicas', () => {
    expect(estrutura.composicao.por_categoria[CATEGORIA.VACA_LACTACAO]).toBe(2);
    expect(estrutura.composicao.por_categoria[CATEGORIA.NOVILHA_PRENHA]).toBe(1);
    expect(estrutura.composicao.por_categoria[CATEGORIA.BEZERRO]).toBe(1);
    expect(estrutura.composicao.por_categoria[CATEGORIA.TOURO]).toBe(1);
  });

  it('agrupa por sexo e por vocação', () => {
    expect(estrutura.composicao.por_sexo).toEqual({ Fêmea: 3, Macho: 2 });
    expect(estrutura.composicao.por_vocacao).toEqual({ leiteiro: 3, corte: 1, dupla_aptidao: 1 });
  });

  it('classifica a faixa etária pela fonte única (Novilha Prenha conta como novilha)', () => {
    expect(estrutura.faixaEtaria.vacas).toBe(2);
    expect(estrutura.faixaEtaria.novilhas).toBe(1); // Novilha Prenha
    expect(estrutura.faixaEtaria.bezerros).toBe(1);
    expect(estrutura.faixaEtaria.reprodutores).toBe(1); // Touro
  });

  it('agrega por lote, ordena por total e nomeia "Sem lote"', () => {
    expect(estrutura.porLote[0]).toEqual({ lote_id: 'l1', lote_nome: 'Lote A', total: 3 });
    const semLote = estrutura.porLote.find((l) => l.lote_id === null);
    expect(semLote).toEqual({ lote_id: null, lote_nome: 'Sem lote', total: 1 });
  });

  it('rebanho vazio retorna estrutura zerada', () => {
    const vazio = calcularEstruturaRebanho([], nomePorLote);
    expect(vazio.total).toBe(0);
    expect(vazio.porLote).toEqual([]);
    expect(vazio.composicao.por_categoria).toEqual({});
  });
});
