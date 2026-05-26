import { describe, it, expect } from 'vitest';

vi.mock('@/lib/utils', () => ({
  formatBRL: (v: number) => `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`,
  formatDate: (d: string) => d,
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import {
  validarCamposSelecionados,
  buildRebanhoSelect,
  buildRebanhoRows,
  getCamposPorIds,
} from '@/lib/relatorios/rebanho-builder';
import { CAMPOS_REBANHO, type AnimalCompleto } from '@/lib/types/relatorios-rebanho';

function makeAnimal(overrides: Partial<AnimalCompleto> = {}): AnimalCompleto {
  return {
    id: 'a1',
    brinco: 'B001',
    nome: 'Mimosa',
    sexo: 'Fêmea',
    raca: 'Nelore',
    categoria: 'Vaca em Lactação',
    status: 'Ativo',
    data_nascimento: '2020-01-15',
    data_entrada: '2020-02-01',
    data_desmame: null,
    fazenda_id: 'f1',
    lote_nome: 'Lote A',
    ultimo_peso_kg: 450,
    data_ultimo_peso: '2026-04-01',
    gmd_90d: 0.35,
    producao_media_30d: 18.5,
    dias_lactacao: 60,
    total_lactacao: 1110,
    ultima_cobertura: '2025-06-01',
    data_parto_previsto: '2026-03-01',
    iep_dias: 365,
    qtd_partos: 2,
    status_reprodutivo: 'lactacao',
    ultima_vacinacao: '2026-01-10',
    proxima_vacinacao: '2026-07-10',
    ultima_vermifugacao: '2025-12-01',
    arroba_estimada: 15.6,
    projecao_abate: null,
    ...overrides,
  };
}

describe('validarCamposSelecionados', () => {
  it('retorna valid=true para ids reconhecidos', () => {
    const result = validarCamposSelecionados(['brinco', 'nome']);
    expect(result.valid).toBe(true);
    expect(result.validIds).toEqual(['brinco', 'nome']);
    expect(result.invalidIds).toEqual([]);
  });

  it('retorna valid=false para id desconhecido', () => {
    const result = validarCamposSelecionados(['campo_inexistente']);
    expect(result.valid).toBe(false);
    expect(result.invalidIds).toContain('campo_inexistente');
    expect(result.validIds).toEqual([]);
  });

  it('segrega corretamente válidos e inválidos quando misturados', () => {
    const result = validarCamposSelecionados(['brinco', 'campo_xpto', 'status']);
    expect(result.valid).toBe(false);
    expect(result.validIds).toEqual(['brinco', 'status']);
    expect(result.invalidIds).toEqual(['campo_xpto']);
  });

  it('retorna valid=true para lista vazia', () => {
    const result = validarCamposSelecionados([]);
    expect(result.valid).toBe(true);
    expect(result.validIds).toEqual([]);
  });

  it('cobre todos os ids do catálogo CAMPOS_REBANHO', () => {
    const todosIds = CAMPOS_REBANHO.map((c) => c.id);
    const result = validarCamposSelecionados(todosIds);
    expect(result.valid).toBe(true);
    expect(result.invalidIds).toHaveLength(0);
  });
});

describe('buildRebanhoSelect', () => {
  it('nunca gera select com *', () => {
    const campos = getCamposPorIds(['brinco', 'nome', 'status']);
    const select = buildRebanhoSelect(campos);
    expect(select).not.toContain('*');
  });

  it('sempre inclui id e fazenda_id na base', () => {
    const campos = getCamposPorIds(['brinco']);
    const select = buildRebanhoSelect(campos);
    expect(select).toContain('id');
    expect(select).toContain('fazenda_id');
  });

  it('não inclui colunas de categorias não selecionadas', () => {
    const campos = getCamposPorIds(['brinco', 'nome']);
    const select = buildRebanhoSelect(campos);
    // lote_nome não selecionado — não deve aparecer
    expect(select).not.toContain('lote_nome');
    // ultimo_peso_kg não selecionado
    expect(select).not.toContain('ultimo_peso_kg');
  });

  it('inclui a coluna correta para cada campo selecionado', () => {
    const campos = getCamposPorIds(['ultimo_peso_kg', 'data_ultimo_peso']);
    const select = buildRebanhoSelect(campos);
    expect(select).toContain('ultimo_peso_kg');
    expect(select).toContain('data_ultimo_peso');
  });
});

describe('buildRebanhoRows', () => {
  it('projeta apenas os campos selecionados (sem campos extras)', () => {
    const animal = makeAnimal();
    const campos = getCamposPorIds(['brinco', 'status']);
    const rows = buildRebanhoRows([animal], campos);
    expect(rows).toHaveLength(1);
    // Campos selecionados presentes
    expect(rows[0]).toHaveProperty('brinco');
    expect(rows[0]).toHaveProperty('status');
    // Campo não selecionado ausente
    expect(rows[0]).not.toHaveProperty('lote_nome');
    expect(rows[0]).not.toHaveProperty('gmd_90d');
  });

  it('mantém a ordem dos campos conforme o array de entrada', () => {
    const animal = makeAnimal();
    const campos = getCamposPorIds(['status', 'brinco', 'nome']);
    const rows = buildRebanhoRows([animal], campos);
    const keys = Object.keys(rows[0]);
    // status deve vir antes de nome
    expect(keys.indexOf('status')).toBeLessThan(keys.indexOf('nome'));
  });

  it('garante que brinco sempre está presente mesmo quando não selecionado', () => {
    const animal = makeAnimal();
    const campos = getCamposPorIds(['nome', 'status']); // sem brinco
    const rows = buildRebanhoRows([animal], campos);
    expect(rows[0]).toHaveProperty('brinco', 'B001');
  });

  it('formata datas como dd/MM/yyyy', () => {
    // Usa string ISO-date sem hora — date-fns interpreta como meia-noite UTC
    // Verificamos apenas o formato dd/MM/yyyy, não o dia exato (timezone do runner pode variar)
    const animal = makeAnimal({ data_nascimento: '2020-06-15' });
    const campos = getCamposPorIds(['brinco', 'data_nascimento']);
    const rows = buildRebanhoRows([animal], campos);
    const formatted = rows[0]['data_nascimento'] as string;
    expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(formatted).toContain('2020');
  });

  it('trata null como string vazia', () => {
    const animal = makeAnimal({ nome: null });
    const campos = getCamposPorIds(['brinco', 'nome']);
    const rows = buildRebanhoRows([animal], campos);
    expect(rows[0]['nome']).toBe('');
  });

  it('retorna array vazio para lista de animais vazia', () => {
    const campos = getCamposPorIds(['brinco']);
    const rows = buildRebanhoRows([], campos);
    expect(rows).toHaveLength(0);
  });
});

describe('getCamposPorIds', () => {
  it('retorna campos na ordem dos ids fornecidos', () => {
    const campos = getCamposPorIds(['status', 'brinco']);
    expect(campos[0].id).toBe('status');
    expect(campos[1].id).toBe('brinco');
  });

  it('ignora ids não existentes silenciosamente', () => {
    const campos = getCamposPorIds(['brinco', 'id_invalido', 'nome']);
    expect(campos).toHaveLength(2);
    expect(campos.map((c) => c.id)).toEqual(['brinco', 'nome']);
  });
});
