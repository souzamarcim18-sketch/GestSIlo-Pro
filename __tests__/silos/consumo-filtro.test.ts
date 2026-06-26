import { describe, it, expect } from 'vitest';
import {
  ehSaidaConsumo,
  calcularConsumoDiario,
  calcularAutonomiaPrimeiraRetirada,
  SUBTIPOS_NAO_CONSUMO,
} from '@/app/dashboard/silos/helpers';
import type { Silo, MovimentacaoSilo } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSilo(over: Partial<Silo> = {}): Silo {
  return {
    id: 'silo-1',
    nome: 'Silo 01',
    tipo: 'Trincheira',
    fazenda_id: 'faz-1',
    talhao_id: null,
    materia_seca_percent: 39,
    insumo_lona_id: null,
    insumo_inoculante_id: null,
    cultura_ensilada: 'Milho',
    data_fechamento: '2026-04-01',
    data_abertura_prevista: null,
    // 100 dias atrás de "hoje" — torna o consumo diário estável o suficiente
    data_abertura_real: new Date(Date.now() - 100 * 86_400_000)
      .toISOString()
      .slice(0, 10),
    volume_ensilado_ton_mv: 420,
    comprimento_m: 50,
    largura_m: 5,
    altura_m: 2.5,
    observacoes_gerais: null,
    custo_aquisicao_rs_ton: null,
    ...over,
  };
}

let movId = 0;
function makeSaida(
  quantidade: number,
  subtipo: MovimentacaoSilo['subtipo'],
  data = '2026-04-10'
): MovimentacaoSilo {
  return {
    id: `mov-${movId++}`,
    silo_id: 'silo-1',
    tipo: 'Saída',
    subtipo,
    quantidade,
    data,
    talhao_id: null,
    responsavel: null,
    observacao: null,
  };
}

// ---------------------------------------------------------------------------
// ehSaidaConsumo / SUBTIPOS_NAO_CONSUMO
// ---------------------------------------------------------------------------
describe('ehSaidaConsumo', () => {
  it('conta Uso na alimentação como consumo', () => {
    expect(ehSaidaConsumo(makeSaida(10, 'Uso na alimentação'))).toBe(true);
  });

  it('conta Descarte como consumo (silagem saindo do silo)', () => {
    expect(ehSaidaConsumo(makeSaida(10, 'Descarte'))).toBe(true);
  });

  it('NÃO conta Venda como consumo', () => {
    expect(ehSaidaConsumo(makeSaida(10, 'Venda'))).toBe(false);
  });

  it('NÃO conta Transferência como consumo', () => {
    expect(ehSaidaConsumo(makeSaida(10, 'Transferência'))).toBe(false);
  });

  it('ignora entradas', () => {
    const entrada: MovimentacaoSilo = { ...makeSaida(10, null), tipo: 'Entrada' };
    expect(ehSaidaConsumo(entrada)).toBe(false);
  });

  it('o conjunto de exclusão contém exatamente Venda e Transferência', () => {
    expect([...SUBTIPOS_NAO_CONSUMO].sort()).toEqual(['Transferência', 'Venda']);
  });
});

// ---------------------------------------------------------------------------
// calcularConsumoDiario
// ---------------------------------------------------------------------------
describe('calcularConsumoDiario', () => {
  it('exclui Venda e Transferência do consumo médio', () => {
    const silo = makeSilo();
    const semVenda = [
      makeSaida(100, 'Uso na alimentação'),
      makeSaida(50, 'Descarte'),
    ];
    const comVenda = [
      ...semVenda,
      makeSaida(500, 'Venda'),
      makeSaida(300, 'Transferência'),
    ];

    const consumoSem = calcularConsumoDiario(silo, semVenda)!;
    const consumoCom = calcularConsumoDiario(silo, comVenda)!;

    // A venda/transferência não pode inflar o consumo: mesmo resultado.
    expect(consumoCom).toBeCloseTo(consumoSem, 6);
  });

  it('retorna null quando só há venda/transferência (sem consumo real)', () => {
    const silo = makeSilo();
    const movs = [makeSaida(500, 'Venda'), makeSaida(300, 'Transferência')];
    expect(calcularConsumoDiario(silo, movs)).toBeNull();
  });

  it('retorna null quando o silo não está aberto', () => {
    const silo = makeSilo({ data_abertura_real: null });
    expect(calcularConsumoDiario(silo, [makeSaida(100, 'Uso na alimentação')])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// calcularAutonomiaPrimeiraRetirada
// ---------------------------------------------------------------------------
describe('calcularAutonomiaPrimeiraRetirada', () => {
  it('ignora venda/transferência ao determinar a 1ª retirada e o consumo', () => {
    const semVenda = [makeSaida(100, 'Uso na alimentação', '2026-04-10')];
    const comVenda = [
      makeSaida(500, 'Venda', '2026-04-01'),
      makeSaida(300, 'Transferência', '2026-04-02'),
      ...semVenda,
    ];

    const autonomiaSem = calcularAutonomiaPrimeiraRetirada(semVenda, 1000);
    const autonomiaCom = calcularAutonomiaPrimeiraRetirada(comVenda, 1000);

    expect(autonomiaCom).toBe(autonomiaSem);
  });

  it('retorna null quando só há venda/transferência', () => {
    const movs = [makeSaida(500, 'Venda'), makeSaida(300, 'Transferência')];
    expect(calcularAutonomiaPrimeiraRetirada(movs, 1000)).toBeNull();
  });
});
