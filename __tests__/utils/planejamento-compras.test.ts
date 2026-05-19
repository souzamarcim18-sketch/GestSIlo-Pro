import { describe, it, expect } from 'vitest';
import { calcularLinhasRelatorio, type RawVinculo } from '@/lib/supabase/planejamento-compras';

// Fábrica de vínculo bruto
function makeVinculo(
  insumo_id: string,
  quantidade: number,
  estoque_atual: number,
  preco_unitario: number | null,
  planejamento_id = 'pl-1',
  nome = 'Insumo Teste',
  unidade = 'kg'
): RawVinculo {
  return {
    insumo_id,
    quantidade,
    planejamento: {
      id: planejamento_id,
      status: 'planejada',
      data_prevista: '2026-06-01',
      talhao_id: 'talhao-1',
    },
    insumo: {
      id: insumo_id,
      nome,
      unidade,
      estoque_atual,
      preco_unitario,
      ativo: true,
    },
  };
}

describe('calcularLinhasRelatorio', () => {
  it('retorna array vazio para input vazio', () => {
    expect(calcularLinhasRelatorio([])).toEqual([]);
  });

  it('ignora vínculos com insumo ou planejamento nulos', () => {
    const vinculos: RawVinculo[] = [
      { insumo_id: 'i1', quantidade: 10, planejamento: null, insumo: null },
    ];
    expect(calcularLinhasRelatorio(vinculos)).toEqual([]);
  });

  describe('quantidade_a_comprar = MAX(0, total - estoque)', () => {
    it('calcula corretamente quando total > estoque', () => {
      const linhas = calcularLinhasRelatorio([makeVinculo('i1', 100, 30, null)]);
      expect(linhas[0].quantidade_a_comprar).toBe(70);
    });

    it('retorna 0 quando estoque cobre a demanda', () => {
      const linhas = calcularLinhasRelatorio([makeVinculo('i1', 50, 60, null)]);
      expect(linhas[0].quantidade_a_comprar).toBe(0);
    });

    it('retorna 0 quando estoque iguala a demanda', () => {
      const linhas = calcularLinhasRelatorio([makeVinculo('i1', 50, 50, null)]);
      expect(linhas[0].quantidade_a_comprar).toBe(0);
    });
  });

  describe('valor_estimado', () => {
    it('é null quando preco_unitario é null', () => {
      const linhas = calcularLinhasRelatorio([makeVinculo('i1', 100, 20, null)]);
      expect(linhas[0].valor_estimado).toBeNull();
    });

    it('é calculado corretamente quando preco_unitario está presente', () => {
      // total=100, estoque=20 → qtd_a_comprar=80 → valor=80*5=400
      const linhas = calcularLinhasRelatorio([makeVinculo('i1', 100, 20, 5)]);
      expect(linhas[0].valor_estimado).toBe(400);
    });

    it('é 0 quando estoque suficiente (qtd_a_comprar=0), mesmo com preco', () => {
      const linhas = calcularLinhasRelatorio([makeVinculo('i1', 50, 100, 10)]);
      expect(linhas[0].valor_estimado).toBe(0);
    });
  });

  describe('status_compra', () => {
    it('pendente quando estoque=0 e total>0', () => {
      const linhas = calcularLinhasRelatorio([makeVinculo('i1', 100, 0, null)]);
      expect(linhas[0].status_compra).toBe('pendente');
    });

    it('comprado_parcialmente quando 0 < estoque < total', () => {
      const linhas = calcularLinhasRelatorio([makeVinculo('i1', 100, 40, null)]);
      expect(linhas[0].status_compra).toBe('comprado_parcialmente');
    });

    it('estoque_suficiente quando estoque >= total', () => {
      const linhas = calcularLinhasRelatorio([makeVinculo('i1', 100, 100, null)]);
      expect(linhas[0].status_compra).toBe('estoque_suficiente');
    });

    it('estoque_suficiente quando estoque > total', () => {
      const linhas = calcularLinhasRelatorio([makeVinculo('i1', 50, 200, null)]);
      expect(linhas[0].status_compra).toBe('estoque_suficiente');
    });
  });

  describe('agrupamento por insumo_id', () => {
    it('agrupa dois vínculos do mesmo insumo em uma única linha', () => {
      const vinculos = [
        makeVinculo('i1', 60, 10, 2, 'pl-1', 'Ureia'),
        makeVinculo('i1', 40, 10, 2, 'pl-2', 'Ureia'),
      ];
      const linhas = calcularLinhasRelatorio(vinculos);
      expect(linhas).toHaveLength(1);
      expect(linhas[0].total_planejado).toBe(100);
    });

    it('mantém insumos distintos como linhas separadas', () => {
      const vinculos = [
        makeVinculo('i1', 50, 0, null, 'pl-1', 'Ureia'),
        makeVinculo('i2', 30, 0, null, 'pl-1', 'Calcário'),
      ];
      const linhas = calcularLinhasRelatorio(vinculos);
      expect(linhas).toHaveLength(2);
    });

    it('acumula planejamentos_ids sem duplicatas', () => {
      const vinculos = [
        makeVinculo('i1', 60, 0, null, 'pl-1'),
        makeVinculo('i1', 40, 0, null, 'pl-1'), // mesmo planejamento
        makeVinculo('i1', 20, 0, null, 'pl-2'),
      ];
      const linhas = calcularLinhasRelatorio(vinculos);
      expect(linhas[0].planejamentos_ids).toHaveLength(2);
      expect(linhas[0].planejamentos_ids).toContain('pl-1');
      expect(linhas[0].planejamentos_ids).toContain('pl-2');
    });
  });

  describe('filtro apenas_com_necessidade', () => {
    it('remove linhas com estoque_suficiente quando ativo', () => {
      const vinculos = [
        makeVinculo('i1', 100, 0, null, 'pl-1', 'Pendente'),
        makeVinculo('i2', 50, 100, null, 'pl-1', 'Suficiente'),
      ];
      const linhas = calcularLinhasRelatorio(vinculos, { apenas_com_necessidade: true });
      expect(linhas).toHaveLength(1);
      expect(linhas[0].insumo_nome).toBe('Pendente');
    });

    it('mantém todas as linhas quando filtro está desativado', () => {
      const vinculos = [
        makeVinculo('i1', 100, 0, null, 'pl-1', 'Pendente'),
        makeVinculo('i2', 50, 100, null, 'pl-1', 'Suficiente'),
      ];
      const linhas = calcularLinhasRelatorio(vinculos, { apenas_com_necessidade: false });
      expect(linhas).toHaveLength(2);
    });
  });

  describe('ordenação', () => {
    it('ordena por valor_estimado DESC, nulls por último', () => {
      const vinculos = [
        makeVinculo('i1', 100, 0, null, 'pl-1', 'SemPreco'),
        makeVinculo('i2', 100, 0, 10, 'pl-1', 'Caro'), // valor=1000
        makeVinculo('i3', 100, 0, 3, 'pl-1', 'Barato'), // valor=300
      ];
      const linhas = calcularLinhasRelatorio(vinculos);
      expect(linhas[0].insumo_nome).toBe('Caro');
      expect(linhas[1].insumo_nome).toBe('Barato');
      expect(linhas[2].insumo_nome).toBe('SemPreco');
    });

    it('ordena alfabeticamente quando valor_estimado é igual', () => {
      const vinculos = [
        makeVinculo('i1', 100, 0, 5, 'pl-1', 'Zinco'),
        makeVinculo('i2', 100, 0, 5, 'pl-1', 'Boro'),
      ];
      const linhas = calcularLinhasRelatorio(vinculos);
      expect(linhas[0].insumo_nome).toBe('Boro');
      expect(linhas[1].insumo_nome).toBe('Zinco');
    });
  });
});
