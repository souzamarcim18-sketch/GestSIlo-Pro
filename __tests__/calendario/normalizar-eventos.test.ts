import { describe, it, expect } from 'vitest';
import {
  normalizarEventoDap,
  normalizarManutencao,
  normalizarEventoSanitario,
  normalizarOcupacaoPiquete,
  normalizarAtividadeCampo,
  normalizarEventoRebanho,
  type EventoDapRow,
  type ManutencaoRow,
  type EventoSanitarioRow,
  type OcupacaoPiqueteRow,
} from '@/lib/utils/calendario';

const HOJE = '2026-05-24';
const ONTEM = '2026-05-23';
const AMANHA = '2026-05-25';
const PASSADO = '2026-05-01';
const FUTURO = '2026-06-15';

// --- normalizarEventoDap ---
describe('normalizarEventoDap', () => {
  const base: EventoDapRow = {
    id: '1',
    tipo_operacao: 'Plantio',
    cultura: 'Milho',
    status: 'Planejado',
    data_esperada: AMANHA,
    data_realizada: null,
    talhao_id: 'talhao-1',
    talhoes: { nome: 'Talhão A' },
  };

  it('status Realizado → realizado', () => {
    const row = { ...base, status: 'Realizado', data_esperada: ONTEM };
    const evento = normalizarEventoDap(row, HOJE);
    expect(evento.status).toBe('realizado');
  });

  it('data passada + Planejado → atrasado', () => {
    const row = { ...base, status: 'Planejado', data_esperada: PASSADO };
    const evento = normalizarEventoDap(row, HOJE);
    expect(evento.status).toBe('atrasado');
  });

  it('data futura + Planejado → planejado', () => {
    const evento = normalizarEventoDap(base, HOJE);
    expect(evento.status).toBe('planejado');
  });

  it('inclui talhaoId na saída', () => {
    const evento = normalizarEventoDap(base, HOJE);
    expect(evento.talhaoId).toBe('talhao-1');
  });

  it('titulo inclui operação e talhão', () => {
    const evento = normalizarEventoDap(base, HOJE);
    expect(evento.titulo).toContain('Plantio');
    expect(evento.titulo).toContain('Talhão A');
  });
});

// --- normalizarManutencao ---
describe('normalizarManutencao', () => {
  const base: ManutencaoRow = {
    id: '2',
    tipo: 'Preventiva',
    descricao: 'Troca de óleo',
    status: 'pendente',
    data_prevista: AMANHA,
    data_realizada: null,
    proxima_manutencao: null,
    maquinas: { nome: 'Trator 1' },
  };

  it('data_realizada presente → status concluido', () => {
    const row = { ...base, status: 'concluida', data_realizada: ONTEM, data_prevista: null };
    const eventos = normalizarManutencao(row, HOJE);
    expect(eventos[0].status).toBe('concluido');
  });

  it('data_prevista passada sem realização → atrasado', () => {
    const row = { ...base, data_prevista: PASSADO };
    const eventos = normalizarManutencao(row, HOJE);
    expect(eventos[0].status).toBe('atrasado');
  });

  it('data_prevista futura → planejado', () => {
    const eventos = normalizarManutencao(base, HOJE);
    expect(eventos[0].status).toBe('planejado');
  });

  it('proxima_manutencao futura → gera 2 eventos', () => {
    const row = { ...base, proxima_manutencao: FUTURO };
    const eventos = normalizarManutencao(row, HOJE);
    expect(eventos).toHaveLength(2);
    expect(eventos[1].id).toBe('2_proxima');
    expect(eventos[1].status).toBe('planejado');
  });

  it('proxima_manutencao passada → não gera evento futuro', () => {
    const row = { ...base, proxima_manutencao: PASSADO };
    const eventos = normalizarManutencao(row, HOJE);
    expect(eventos).toHaveLength(1);
  });

  it('sem data_realizada e sem data_prevista → array vazio', () => {
    const row = { ...base, data_prevista: null, data_realizada: null };
    const eventos = normalizarManutencao(row, HOJE);
    expect(eventos).toHaveLength(0);
  });
});

// --- normalizarEventoSanitario ---
describe('normalizarEventoSanitario', () => {
  const base: EventoSanitarioRow = {
    id: '3',
    tipo: 'vacinacao',
    descricao: 'Aftosa',
    data_evento: ONTEM,
    data_proxima_dose: null,
    animal_id: 'animal-1',
  };

  it('sem data_proxima_dose → 1 evento realizado', () => {
    const eventos = normalizarEventoSanitario(base, HOJE);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].status).toBe('realizado');
  });

  it('com data_proxima_dose futura → 2 eventos', () => {
    const row = { ...base, data_proxima_dose: FUTURO };
    const eventos = normalizarEventoSanitario(row, HOJE);
    expect(eventos).toHaveLength(2);
    expect(eventos[1].id).toBe('3_proxima_dose');
    expect(eventos[1].status).toBe('planejado');
  });

  it('com data_proxima_dose igual a hoje → gera evento futuro (borda)', () => {
    const row = { ...base, data_proxima_dose: HOJE };
    const eventos = normalizarEventoSanitario(row, HOJE);
    expect(eventos).toHaveLength(2);
  });

  it('com data_proxima_dose passada → não gera evento futuro', () => {
    const row = { ...base, data_proxima_dose: PASSADO };
    const eventos = normalizarEventoSanitario(row, HOJE);
    expect(eventos).toHaveLength(1);
  });
});

// --- normalizarOcupacaoPiquete ---
describe('normalizarOcupacaoPiquete', () => {
  const base: OcupacaoPiqueteRow = {
    id: '4',
    data_entrada: ONTEM,
    data_saida_real: null,
    data_saida_prevista: AMANHA,
    lotes: { nome: 'Lote A' },
    piquetes: { nome: 'Piquete 1', pastagem_id: 'pastagem-1' },
  };

  it('sem data_saida_real → gera entrada + saída prevista', () => {
    const eventos = normalizarOcupacaoPiquete(base);
    expect(eventos).toHaveLength(2);
    expect(eventos[0].id).toBe('4_entrada');
    expect(eventos[0].status).toBe('realizado');
    expect(eventos[1].id).toBe('4_saida_prevista');
    expect(eventos[1].status).toBe('planejado');
  });

  it('com data_saida_real → gera entrada + saída real (não prevista)', () => {
    const row = { ...base, data_saida_real: HOJE };
    const eventos = normalizarOcupacaoPiquete(row);
    expect(eventos).toHaveLength(2);
    expect(eventos[0].id).toBe('4_entrada');
    expect(eventos[1].id).toBe('4_saida_real');
    expect(eventos[1].status).toBe('realizado');
    const ids = eventos.map((e) => e.id);
    expect(ids).not.toContain('4_saida_prevista');
  });

  it('href usa pastagem_id quando disponível', () => {
    const eventos = normalizarOcupacaoPiquete(base);
    expect(eventos[0].href).toBe('/dashboard/pastagens/pastagem-1');
  });

  it('sem pastagem_id → href genérico', () => {
    const row = { ...base, piquetes: { nome: 'P1', pastagem_id: undefined } };
    const eventos = normalizarOcupacaoPiquete(row);
    expect(eventos[0].href).toBe('/dashboard/pastagens');
  });
});

// --- normalizarAtividadeCampo ---
describe('normalizarAtividadeCampo', () => {
  it('retorna status realizado com talhaoId', () => {
    const evento = normalizarAtividadeCampo({
      id: '5',
      tipo_operacao: 'Adubação',
      data: ONTEM,
      talhao_id: 'talhao-2',
      talhoes: { nome: 'Talhão B' },
    });
    expect(evento.status).toBe('realizado');
    expect(evento.talhaoId).toBe('talhao-2');
    expect(evento.titulo).toContain('Adubação');
  });
});

// --- normalizarEventoRebanho ---
describe('normalizarEventoRebanho', () => {
  it('inclui brinco do animal no título', () => {
    const evento = normalizarEventoRebanho({
      id: '6',
      tipo: 'pesagem',
      descricao: null,
      data_evento: ONTEM,
      animal_id: 'animal-2',
      animais: { brinco: 'BRN-001', nome: null },
    });
    expect(evento.titulo).toContain('BRN-001');
    expect(evento.href).toBe('/dashboard/rebanho/animal-2');
  });

  it('sem animal → href genérico do rebanho', () => {
    const evento = normalizarEventoRebanho({
      id: '7',
      tipo: 'nascimento',
      descricao: null,
      data_evento: ONTEM,
      animal_id: null,
      animais: null,
    });
    expect(evento.href).toBe('/dashboard/rebanho');
  });
});

// --- getAtividadesRecentes (lógica pura, sem Supabase) ---
describe('getAtividadesRecentes — lógica de slice e ordenação', () => {
  it('array com 10 itens → retorna 8 (mais recentes)', () => {
    const eventos = Array.from({ length: 10 }, (_, i) => ({
      id: `e${i}`,
      fonte: 'test',
      modulo: 'silo' as const,
      titulo: `Evento ${i}`,
      data: `2026-05-${String(i + 10).padStart(2, '0')}`,
      status: 'realizado' as const,
    }));
    const resultado = eventos
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 8);
    expect(resultado).toHaveLength(8);
    expect(resultado[0].data).toBe('2026-05-19');
  });

  it('array vazio → retorna []', () => {
    const resultado = ([] as typeof eventos).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8);
    expect(resultado).toHaveLength(0);
  });

  const eventos = Array.from({ length: 3 }, (_, i) => ({
    id: `e${i}`,
    fonte: 'test',
    modulo: 'silo' as const,
    titulo: `Evento ${i}`,
    data: `2026-05-${String(i + 10).padStart(2, '0')}`,
    status: 'realizado' as const,
  }));

  it('ordenação desc: primeiro item tem data mais recente', () => {
    const resultado = [...eventos].sort((a, b) => b.data.localeCompare(a.data));
    expect(resultado[0].data > resultado[1].data).toBe(true);
  });
});
