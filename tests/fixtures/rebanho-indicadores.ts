/**
 * Fixtures para testes de indicadores zootécnicos
 * Dataset: 10 animais, 30 pesagens, 10 eventos (5 partos, 2 mortes, 3 descartes)
 */

import { TipoRebanho, TipoEvento } from '@/lib/types/rebanho';

export const FAZENDA_TEST_ID = '550e8400-e29b-41d4-a716-446655440000';

export const ANIMAIS_FIXTURE = [
  // Leiteiras (7)
  { id: 'a1', fazenda_id: FAZENDA_TEST_ID, nome: 'Bessie', numero_brinco: 'BRI-001', tipo_rebanho: TipoRebanho.LEITEIRO, categoria: 'Vaca em Lactação', sexo: 'Fêmea' as const, data_nascimento: '2020-01-15', peso_kg: 550, ativo: true },
  { id: 'a2', fazenda_id: FAZENDA_TEST_ID, nome: 'Daisy', numero_brinco: 'BRI-002', tipo_rebanho: TipoRebanho.LEITEIRO, categoria: 'Vaca em Lactação', sexo: 'Fêmea' as const, data_nascimento: '2019-06-20', peso_kg: 520, ativo: true },
  { id: 'a3', fazenda_id: FAZENDA_TEST_ID, nome: 'Rosa', numero_brinco: 'BRI-003', tipo_rebanho: TipoRebanho.LEITEIRO, categoria: 'Vaca em Lactação', sexo: 'Fêmea' as const, data_nascimento: '2019-02-10', peso_kg: 560, ativo: true },
  { id: 'a4', fazenda_id: FAZENDA_TEST_ID, nome: 'Nora', numero_brinco: 'BRI-004', tipo_rebanho: TipoRebanho.LEITEIRO, categoria: 'Novilha', sexo: 'Fêmea' as const, data_nascimento: '2023-05-20', peso_kg: 420, ativo: true },
  { id: 'a5', fazenda_id: FAZENDA_TEST_ID, nome: 'Herd', numero_brinco: 'BRI-005', tipo_rebanho: TipoRebanho.LEITEIRO, categoria: 'Touro', sexo: 'Macho' as const, data_nascimento: '2018-03-10', peso_kg: 800, ativo: true },
  { id: 'a6', fazenda_id: FAZENDA_TEST_ID, nome: 'Vaca Seca', numero_brinco: 'BRI-006', tipo_rebanho: TipoRebanho.LEITEIRO, categoria: 'Vaca Seca', sexo: 'Fêmea' as const, data_nascimento: '2018-08-15', peso_kg: 540, ativo: true },
  { id: 'a7', fazenda_id: FAZENDA_TEST_ID, nome: 'Prenha', numero_brinco: 'BRI-007', tipo_rebanho: TipoRebanho.LEITEIRO, categoria: 'Vaca Prenha', sexo: 'Fêmea' as const, data_nascimento: '2019-11-05', peso_kg: 580, ativo: true },
  // Corte (3)
  { id: 'c1', fazenda_id: FAZENDA_TEST_ID, nome: 'Nata', numero_brinco: 'COR-001', tipo_rebanho: TipoRebanho.CORTE, categoria: 'Vaca Matriz', sexo: 'Fêmea' as const, data_nascimento: '2019-08-05', peso_kg: 480, ativo: true },
  { id: 'c2', fazenda_id: FAZENDA_TEST_ID, nome: 'Bezerro Corte', numero_brinco: 'COR-002', tipo_rebanho: TipoRebanho.CORTE, categoria: 'Bezerro', sexo: 'Macho' as const, data_nascimento: '2025-10-01', peso_kg: 250, ativo: true },
  { id: 'c3', fazenda_id: FAZENDA_TEST_ID, nome: 'Boi', numero_brinco: 'COR-003', tipo_rebanho: TipoRebanho.CORTE, categoria: 'Boi', sexo: 'Macho' as const, data_nascimento: '2023-06-15', peso_kg: 520, ativo: true },
];

export const PESAGENS_FIXTURE = [
  // Animal 1 (3 pesagens: 2026-03-01 a 2026-05-01)
  { id: 'p1', animal_id: 'a1', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-03-01', peso_kg: 540 },
  { id: 'p2', animal_id: 'a1', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-04-01', peso_kg: 545 },
  { id: 'p3', animal_id: 'a1', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-05-01', peso_kg: 550 },
  // Animal 2 (3 pesagens)
  { id: 'p4', animal_id: 'a2', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-03-01', peso_kg: 510 },
  { id: 'p5', animal_id: 'a2', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-04-01', peso_kg: 515 },
  { id: 'p6', animal_id: 'a2', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-05-01', peso_kg: 520 },
  // Animal 3 (3 pesagens)
  { id: 'p7', animal_id: 'a3', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-03-01', peso_kg: 550 },
  { id: 'p8', animal_id: 'a3', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-04-01', peso_kg: 555 },
  { id: 'p9', animal_id: 'a3', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-05-01', peso_kg: 560 },
  // Animal 4 (3 pesagens)
  { id: 'p10', animal_id: 'a4', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-03-01', peso_kg: 410 },
  { id: 'p11', animal_id: 'a4', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-04-01', peso_kg: 415 },
  { id: 'p12', animal_id: 'a4', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-05-01', peso_kg: 420 },
  // Animal C1 (3 pesagens)
  { id: 'p13', animal_id: 'c1', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-03-01', peso_kg: 470 },
  { id: 'p14', animal_id: 'c1', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-04-01', peso_kg: 475 },
  { id: 'p15', animal_id: 'c1', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-05-01', peso_kg: 480 },
  // Animal C2 (3 pesagens)
  { id: 'p16', animal_id: 'c2', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-03-01', peso_kg: 240 },
  { id: 'p17', animal_id: 'c2', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-04-01', peso_kg: 245 },
  { id: 'p18', animal_id: 'c2', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-05-01', peso_kg: 250 },
  // Animal C3 (3 pesagens)
  { id: 'p19', animal_id: 'c3', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-03-01', peso_kg: 510 },
  { id: 'p20', animal_id: 'c3', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-04-01', peso_kg: 515 },
  { id: 'p21', animal_id: 'c3', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-05-01', peso_kg: 520 },
  // Animais sem pesagens (a5, a6, a7) — 9 pesagens mais
  { id: 'p22', animal_id: 'a5', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-03-01', peso_kg: 800 },
  { id: 'p23', animal_id: 'a6', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-03-01', peso_kg: 540 },
  { id: 'p24', animal_id: 'a7', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-03-01', peso_kg: 570 },
  { id: 'p25', animal_id: 'a5', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-04-01', peso_kg: 805 },
  { id: 'p26', animal_id: 'a6', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-04-01', peso_kg: 545 },
  { id: 'p27', animal_id: 'a7', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-04-01', peso_kg: 575 },
  { id: 'p28', animal_id: 'a5', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-05-01', peso_kg: 810 },
  { id: 'p29', animal_id: 'a6', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-05-01', peso_kg: 550 },
  { id: 'p30', animal_id: 'a7', fazenda_id: FAZENDA_TEST_ID, data_pesagem: '2026-05-01', peso_kg: 580 },
];

export const EVENTOS_FIXTURE = [
  // Partos (5)
  { id: 'e1', animal_id: 'a1', fazenda_id: FAZENDA_TEST_ID, tipo: TipoEvento.NASCIMENTO, data_evento: '2026-02-15', peso_kg: null, lote_id_destino: null, comprador: null, valor_venda: null, observacoes: 'Parto bezerro macho', usuario_id: 'test-user', deleted_at: null, created_at: '2026-02-15T10:00:00Z', updated_at: '2026-02-15T10:00:00Z' },
  { id: 'e2', animal_id: 'a2', fazenda_id: FAZENDA_TEST_ID, tipo: TipoEvento.NASCIMENTO, data_evento: '2026-03-10', peso_kg: null, lote_id_destino: null, comprador: null, valor_venda: null, observacoes: 'Parto bezerro fêmea', usuario_id: 'test-user', deleted_at: null, created_at: '2026-03-10T10:00:00Z', updated_at: '2026-03-10T10:00:00Z' },
  { id: 'e3', animal_id: 'a3', fazenda_id: FAZENDA_TEST_ID, tipo: TipoEvento.NASCIMENTO, data_evento: '2026-03-20', peso_kg: null, lote_id_destino: null, comprador: null, valor_venda: null, observacoes: 'Parto bezerro macho', usuario_id: 'test-user', deleted_at: null, created_at: '2026-03-20T10:00:00Z', updated_at: '2026-03-20T10:00:00Z' },
  { id: 'e4', animal_id: 'a7', fazenda_id: FAZENDA_TEST_ID, tipo: TipoEvento.NASCIMENTO, data_evento: '2026-01-05', peso_kg: null, lote_id_destino: null, comprador: null, valor_venda: null, observacoes: 'Parto bezerro', usuario_id: 'test-user', deleted_at: null, created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },
  { id: 'e5', animal_id: 'c1', fazenda_id: FAZENDA_TEST_ID, tipo: TipoEvento.NASCIMENTO, data_evento: '2026-02-01', peso_kg: null, lote_id_destino: null, comprador: null, valor_venda: null, observacoes: 'Parto bezerro', usuario_id: 'test-user', deleted_at: null, created_at: '2026-02-01T10:00:00Z', updated_at: '2026-02-01T10:00:00Z' },
  // Mortes (2)
  { id: 'e6', animal_id: 'c2', fazenda_id: FAZENDA_TEST_ID, tipo: TipoEvento.MORTE, data_evento: '2026-04-15', peso_kg: null, lote_id_destino: null, comprador: null, valor_venda: null, observacoes: 'Morte doença', usuario_id: 'test-user', deleted_at: null, created_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'e7', animal_id: 'a4', fazenda_id: FAZENDA_TEST_ID, tipo: TipoEvento.MORTE, data_evento: '2026-03-01', peso_kg: null, lote_id_destino: null, comprador: null, valor_venda: null, observacoes: 'Morte desconhecida', usuario_id: 'test-user', deleted_at: null, created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-01T10:00:00Z' },
  // Vendas/Descartes (3)
  { id: 'e8', animal_id: 'a6', fazenda_id: FAZENDA_TEST_ID, tipo: TipoEvento.VENDA, data_evento: '2026-04-20', peso_kg: null, lote_id_destino: null, comprador: 'Frigorífico X', valor_venda: 2500, observacoes: 'Descarte vaca seca', usuario_id: 'test-user', deleted_at: null, created_at: '2026-04-20T10:00:00Z', updated_at: '2026-04-20T10:00:00Z' },
  { id: 'e9', animal_id: 'c3', fazenda_id: FAZENDA_TEST_ID, tipo: TipoEvento.VENDA, data_evento: '2026-02-28', peso_kg: null, lote_id_destino: null, comprador: 'Frigorífico Y', valor_venda: 3000, observacoes: 'Descarte boi', usuario_id: 'test-user', deleted_at: null, created_at: '2026-02-28T10:00:00Z', updated_at: '2026-02-28T10:00:00Z' },
  { id: 'e10', animal_id: 'a5', fazenda_id: FAZENDA_TEST_ID, tipo: TipoEvento.TRANSFERENCIA_LOTE, data_evento: '2026-05-01', peso_kg: null, lote_id_destino: 'lote-2', comprador: null, valor_venda: null, observacoes: 'Transferência', usuario_id: 'test-user', deleted_at: null, created_at: '2026-05-01T10:00:00Z', updated_at: '2026-05-01T10:00:00Z' },
];

/**
 * Contagem de categorias por tipo para taxas reprodutivas:
 * Vacas aptas (LEITEIRO): a1, a2, a3 (Lactação), a6 (Seca), a7 (Prenha) = 5
 * Vacas aptas (CORTE): c1 (Matriz) = 1
 * Total fêmeas aptas: 6
 *
 * Período: 2026-03-01 a 2026-05-01 (61 dias)
 * GMD por animal: (10 kg) / 61 dias = 0.164 kg/dia
 * GMD médio (10 animais com pesagens): ~0.164 kg/dia
 *
 * Partos no período: e1 (2026-02-15), e2 (2026-03-10), e3 (2026-03-20), e5 (2026-02-01) = 4
 * Mas e4 (2026-01-05) e e5 (2026-02-01) estão FORA do período [2026-03-01, 2026-05-01]
 * Partos DENTRO do período: e2 (2026-03-10), e3 (2026-03-20) = 2 partos
 * Taxa natalidade: (2 / 6) * 100 = 33.33%
 *
 * Mortes no período: e6 (2026-04-15), e7 (2026-03-01) = 2 óbitos
 * Taxa mortalidade: (2 / 10) * 100 = 20%
 */
export const RESULTADOS_ESPERADOS = {
  composicao: {
    total: 10,
    por_categoria: {
      'Vaca em Lactação': 3,
      'Novilha': 1,
      'Touro': 1,
      'Vaca Seca': 1,
      'Vaca Prenha': 1,
      'Vaca Matriz': 1,
      'Bezerro': 1,
    },
  },
  // GMD: (peso_final - peso_inicial) / 61 dias = (550-540)/61 = 0.164 kg/dia
  gmd_medio: 0.164,
  // Taxa natalidade: 2 partos no período / 6 fêmeas aptas = 33.33%
  taxa_natalidade_numerador: 2,
  taxa_natalidade_denominador: 6,
  taxa_natalidade_percentual: 33.33,
  // Taxa mortalidade: 2 óbitos / 10 animais = 20%
  taxa_mortalidade_numerador: 2,
  taxa_mortalidade_denominador: 10,
  taxa_mortalidade_percentual: 20,
};
