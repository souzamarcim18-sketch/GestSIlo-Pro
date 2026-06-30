import { describe, it, expect } from 'vitest';
import { CATEGORIA } from '@/lib/constants/categorias-rebanho';
import { FATORES_UA_POR_CATEGORIA, UA_FATOR_PADRAO } from '@/lib/types/pastagens';
import { CONSUMO_MS_POR_CATEGORIA, CONSUMO_MS_PADRAO } from '@/lib/constants/balanco-forrageiro';

/**
 * Testes da Fase 5 (SPEC-rebanho345 §8.10):
 * 1. Paridade: os mapas continuam cobrindo todas as categorias canônicas.
 * 2. Correção do bug latente (P5.4): 'Novilha Prenha' usa o fator correto nos dois mapas,
 *    em vez de cair no fallback. Esta é a mudança intencional de comportamento.
 * 3. Consistência: as chaves dos mapas usam CATEGORIA (fonte única).
 */

// ─── UA por categoria (lib/types/pastagens.ts — FATORES_UA_POR_CATEGORIA) ─────

describe('FATORES_UA_POR_CATEGORIA', () => {
  it('cobre todas as categorias canônicas leiteiro/dupla_aptidao', () => {
    const categorias = [
      CATEGORIA.BEZERRO,
      CATEGORIA.BEZERRA,
      CATEGORIA.NOVILHA_PRENHA,
      CATEGORIA.NOVILHO,
      CATEGORIA.VACA_LACTACAO,
      CATEGORIA.VACA_SECA,
      CATEGORIA.VACA_PRENHA,
      CATEGORIA.VACA_VAZIA,
      CATEGORIA.TOURO,
    ];
    for (const cat of categorias) {
      expect(FATORES_UA_POR_CATEGORIA[cat], `categoria '${cat}' ausente no mapa UA`).toBeDefined();
    }
  });

  it('cobre todas as categorias canônicas de corte', () => {
    const categorias = [
      CATEGORIA.NOVILHA,
      CATEGORIA.VACA_MATRIZ,
      CATEGORIA.BOI,
      CATEGORIA.BOI_DESCARTADO,
      CATEGORIA.FEMEA_DESCARTADA,
    ];
    for (const cat of categorias) {
      expect(FATORES_UA_POR_CATEGORIA[cat], `categoria '${cat}' ausente no mapa UA`).toBeDefined();
    }
  });

  // ── Correção do bug latente (P5.4 — SPEC-rebanho345 §8.5) ──
  it('[P5.4 bugfix] Novilha Prenha usa fator 0.50 (não cai no fallback 1.00)', () => {
    const fator = FATORES_UA_POR_CATEGORIA[CATEGORIA.NOVILHA_PRENHA];
    expect(fator).toBe(0.50);
    // Garante que NÃO é o fallback — a correção é intencional
    expect(fator).not.toBe(UA_FATOR_PADRAO);
  });

  it('[P5.4 bugfix] chave com parênteses NÃO existe mais no mapa UA', () => {
    expect(FATORES_UA_POR_CATEGORIA['Novilha (Prenha)']).toBeUndefined();
  });

  it('Touro tem fator 1.25 (mais pesado que vaca adulta)', () => {
    expect(FATORES_UA_POR_CATEGORIA[CATEGORIA.TOURO]).toBe(1.25);
  });

  it('bezerros/bezerras têm fator 0.25', () => {
    expect(FATORES_UA_POR_CATEGORIA[CATEGORIA.BEZERRO]).toBe(0.25);
    expect(FATORES_UA_POR_CATEGORIA[CATEGORIA.BEZERRA]).toBe(0.25);
  });

  it('categoria desconhecida retorna UA_FATOR_PADRAO via fallback', () => {
    const fator = FATORES_UA_POR_CATEGORIA['Categoria Inexistente'] ?? UA_FATOR_PADRAO;
    expect(fator).toBe(UA_FATOR_PADRAO);
  });
});

// ─── Consumo MS por categoria (lib/constants/balanco-forrageiro.ts) ──────────

describe('CONSUMO_MS_POR_CATEGORIA', () => {
  it('cobre todas as categorias canônicas leiteiro/dupla_aptidao', () => {
    const categorias = [
      CATEGORIA.VACA_LACTACAO,
      CATEGORIA.VACA_PRENHA,
      CATEGORIA.VACA_SECA,
      CATEGORIA.VACA_VAZIA,
      CATEGORIA.NOVILHA_PRENHA,
      CATEGORIA.NOVILHA,
      CATEGORIA.NOVILHO,
      CATEGORIA.BEZERRO,
      CATEGORIA.BEZERRA,
      CATEGORIA.TOURO,
    ];
    for (const cat of categorias) {
      expect(CONSUMO_MS_POR_CATEGORIA.has(cat), `categoria '${cat}' ausente no mapa consumo`).toBe(true);
    }
  });

  it('cobre todas as categorias canônicas de corte', () => {
    const categorias = [
      CATEGORIA.BOI,
      CATEGORIA.VACA_MATRIZ,
      CATEGORIA.BOI_DESCARTADO,
      CATEGORIA.FEMEA_DESCARTADA,
    ];
    for (const cat of categorias) {
      expect(CONSUMO_MS_POR_CATEGORIA.has(cat), `categoria '${cat}' ausente no mapa consumo`).toBe(true);
    }
  });

  // ── Correção do bug latente (P5.4 — SPEC-rebanho345 §8.5) ──
  it('[P5.4 bugfix] Novilha Prenha usa consumo 8.5 kg MS/dia (não cai no fallback 7.0)', () => {
    const consumo = CONSUMO_MS_POR_CATEGORIA.get(CATEGORIA.NOVILHA_PRENHA);
    expect(consumo).toBe(8.5);
    // Garante que NÃO é o fallback — a correção é intencional
    expect(consumo).not.toBe(CONSUMO_MS_PADRAO);
  });

  it('[P5.4 bugfix] chave com parênteses NÃO existe mais no mapa consumo', () => {
    expect(CONSUMO_MS_POR_CATEGORIA.has('Novilha (Prenha)')).toBe(false);
  });

  it('Vaca em Lactação tem maior consumo (14.0 kg MS/dia)', () => {
    expect(CONSUMO_MS_POR_CATEGORIA.get(CATEGORIA.VACA_LACTACAO)).toBe(14.0);
  });

  it('Bezerros têm menor consumo (2.5 kg MS/dia)', () => {
    expect(CONSUMO_MS_POR_CATEGORIA.get(CATEGORIA.BEZERRO)).toBe(2.5);
    expect(CONSUMO_MS_POR_CATEGORIA.get(CATEGORIA.BEZERRA)).toBe(2.5);
  });

  it('categoria desconhecida retorna CONSUMO_MS_PADRAO via fallback', () => {
    const consumo = CONSUMO_MS_POR_CATEGORIA.get('Categoria Inexistente') ?? CONSUMO_MS_PADRAO;
    expect(consumo).toBe(CONSUMO_MS_PADRAO);
  });
});

// ─── Consistência entre os dois mapas ────────────────────────────────────────

describe('consistência entre FATORES_UA e CONSUMO_MS', () => {
  it('as mesmas categorias canônicas têm cobertura nos dois mapas', () => {
    const todasCategorias = Object.values(CATEGORIA);
    // Categorias que devem aparecer em ambos os mapas (exceto as de corte que
    // não aparecem no consumo e vice-versa — ambos cobrem overlap parcial)
    const overlap = [
      CATEGORIA.BEZERRO,
      CATEGORIA.BEZERRA,
      CATEGORIA.NOVILHA,
      CATEGORIA.NOVILHA_PRENHA,
      CATEGORIA.NOVILHO,
      CATEGORIA.TOURO,
      CATEGORIA.BOI,
      CATEGORIA.BOI_DESCARTADO,
      CATEGORIA.FEMEA_DESCARTADA,
    ];
    for (const cat of overlap) {
      expect(
        cat in FATORES_UA_POR_CATEGORIA,
        `'${cat}' ausente em FATORES_UA_POR_CATEGORIA`,
      ).toBe(true);
      expect(
        CONSUMO_MS_POR_CATEGORIA.has(cat),
        `'${cat}' ausente em CONSUMO_MS_POR_CATEGORIA`,
      ).toBe(true);
    }
    // Nenhuma categoria canônica usa string com parênteses
    for (const cat of todasCategorias) {
      expect(cat, `categoria canônica '${cat}' não deve ter parênteses`).not.toMatch(/\(|\)/);
    }
  });

  it('Novilha Prenha tem cobertura idêntica nos dois mapas após P5.4', () => {
    expect(FATORES_UA_POR_CATEGORIA[CATEGORIA.NOVILHA_PRENHA]).toBeDefined();
    expect(CONSUMO_MS_POR_CATEGORIA.has(CATEGORIA.NOVILHA_PRENHA)).toBe(true);
    // Valores zootécnicos esperados (referência Embrapa)
    expect(FATORES_UA_POR_CATEGORIA[CATEGORIA.NOVILHA_PRENHA]).toBe(0.50);
    expect(CONSUMO_MS_POR_CATEGORIA.get(CATEGORIA.NOVILHA_PRENHA)).toBe(8.5);
  });
});

// ─── Cálculo de UA com lote simulado (simula getUAPorLote sem Supabase) ───────

describe('lógica de UA (simula getUAPorLote sem rede)', () => {
  function calcularUASimulado(
    animais: Array<{ categoria: string; pesoKg?: number }>,
    areaHa: number,
  ) {
    let uaTotal = 0;
    let pesoTotal = 0;
    let semPesagem = 0;

    for (const animal of animais) {
      if (animal.pesoKg !== undefined) {
        uaTotal += animal.pesoKg / 450;
        pesoTotal += animal.pesoKg;
      } else {
        const fator = FATORES_UA_POR_CATEGORIA[animal.categoria] ?? UA_FATOR_PADRAO;
        uaTotal += fator;
        pesoTotal += fator * 450;
        semPesagem++;
      }
    }

    const quantidade = animais.length;
    return {
      ua_total: uaTotal,
      ua_por_ha: areaHa > 0 ? uaTotal / areaHa : null,
      peso_medio_kg: quantidade > 0 ? pesoTotal / quantidade : 0,
      quantidade_animais: quantidade,
      metodo: semPesagem === 0 ? 'peso_real' : 'fator_categoria',
      animais_sem_pesagem: semPesagem,
    };
  }

  it('lote vazio retorna UA 0 (ua_por_ha é 0 quando areaHa > 0)', () => {
    const r = calcularUASimulado([], 10);
    expect(r.ua_total).toBe(0);
    // ua_por_ha é null só quando areaHa === 0; com areaHa=10, 0/10 = 0
    expect(r.ua_por_ha).toBe(0);
    expect(r.quantidade_animais).toBe(0);
  });

  it('ua_por_ha é null quando areaHa é 0', () => {
    const r = calcularUASimulado([{ categoria: CATEGORIA.VACA_LACTACAO }], 0);
    expect(r.ua_por_ha).toBeNull();
  });

  it('Novilha Prenha sem pesagem contribui com UA 0.50 (não 1.00 fallback)', () => {
    const r = calcularUASimulado(
      [{ categoria: CATEGORIA.NOVILHA_PRENHA }],
      1,
    );
    expect(r.ua_total).toBe(0.50);
    expect(r.ua_por_ha).toBe(0.50);
    expect(r.metodo).toBe('fator_categoria');
  });

  it('mistura de peso real e fator por categoria usa metodo fator_categoria', () => {
    const r = calcularUASimulado(
      [
        { categoria: CATEGORIA.VACA_LACTACAO, pesoKg: 500 },
        { categoria: CATEGORIA.NOVILHA_PRENHA }, // sem pesagem
      ],
      2,
    );
    // vaca: 500/450 ≈ 1.111; novilha prenha: 0.50
    expect(r.ua_total).toBeCloseTo(500 / 450 + 0.50, 3);
    expect(r.metodo).toBe('fator_categoria');
    expect(r.animais_sem_pesagem).toBe(1);
  });

  it('peso real usa fórmula peso/450 e marca metodo como peso_real', () => {
    const r = calcularUASimulado(
      [{ categoria: CATEGORIA.VACA_LACTACAO, pesoKg: 450 }],
      1,
    );
    expect(r.ua_total).toBe(1.0);
    expect(r.metodo).toBe('peso_real');
    expect(r.animais_sem_pesagem).toBe(0);
  });
});
