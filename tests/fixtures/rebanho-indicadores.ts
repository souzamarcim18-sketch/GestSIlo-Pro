/**
 * Fixtures para testes de indicadores zootécnicos
 * Dataset: 10 animais, 30 pesagens, 10 eventos (5 partos, 2 mortes, 3 descartes)
 */

export const FAZENDA_TEST_ID = '550e8400-e29b-41d4-a716-446655440000';

export const ANIMAIS_FIXTURE = [
  // Leiteiras (7)
  { id: 'a1', fazenda_id: FAZENDA_TEST_ID, nome: 'Bessie', numero_brinco: 'BRI-001', tipo_rebanho: 'leiteiro', categoria: 'Vaca em Lactação', sexo: 'F', data_nascimento: '2020-01-15', peso_kg: 550, ativo: true },
  { id: 'a2', fazenda_id: FAZENDA_TEST_ID, nome: 'Daisy', numero_brinco: 'BRI-002', tipo_rebanho: 'leiteiro', categoria: 'Vaca em Lactação', sexo: 'F', data_nascimento: '2019-06-20', peso_kg: 520, ativo: true },
  { id: 'a3', fazenda_id: FAZENDA_TEST_ID, nome: 'Rosa', numero_brinco: 'BRI-003', tipo_rebanho: 'leiteiro', categoria: 'Vaca em Lactação', sexo: 'F', data_nascimento: '2019-02-10', peso_kg: 560, ativo: true },
  { id: 'a4', fazenda_id: FAZENDA_TEST_ID, nome: 'Nora', numero_brinco: 'BRI-004', tipo_rebanho: 'leiteiro', categoria: 'Novilha', sexo: 'F', data_nascimento: '2023-05-20', peso_kg: 420, ativo: true },
  { id: 'a5', fazenda_id: FAZENDA_TEST_ID, nome: 'Herd', numero_brinco: 'BRI-005', tipo_rebanho: 'leiteiro', categoria: 'Touro', sexo: 'M', data_nascimento: '2018-03-10', peso_kg: 800, ativo: true },
  { id: 'a6', fazenda_id: FAZENDA_TEST_ID, nome: 'Vaca Seca', numero_brinco: 'BRI-006', tipo_rebanho: 'leiteiro', categoria: 'Vaca Seca', sexo: 'F', data_nascimento: '2018-08-15', peso_kg: 540, ativo: true },
  { id: 'a7', fazenda_id: FAZENDA_TEST_ID, nome: 'Prenha', numero_brinco: 'BRI-007', tipo_rebanho: 'leiteiro', categoria: 'Vaca Prenha', sexo: 'F', data_nascimento: '2019-11-05', peso_kg: 580, ativo: true },
  // Corte (3)
  { id: 'c1', fazenda_id: FAZENDA_TEST_ID, nome: 'Nata', numero_brinco: 'COR-001', tipo_rebanho: 'corte', categoria: 'Vaca Matriz', sexo: 'F', data_nascimento: '2019-08-05', peso_kg: 480, ativo: true },
  { id: 'c2', fazenda_id: FAZENDA_TEST_ID, nome: 'Bezerro Corte', numero_brinco: 'COR-002', tipo_rebanho: 'corte', categoria: 'Bezerro', sexo: 'M', data_nascimento: '2025-10-01', peso_kg: 250, ativo: true },
  { id: 'c3', fazenda_id: FAZENDA_TEST_ID, nome: 'Boi', numero_brinco: 'COR-003', tipo_rebanho: 'corte', categoria: 'Boi', sexo: 'M', data_nascimento: '2023-06-15', peso_kg: 520, ativo: true },
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
  { id: 'e1', animal_id: 'a1', fazenda_id: FAZENDA_TEST_ID, tipo_evento: 'parto', data_evento: '2026-02-15', descricao: 'Parto bezerro macho' },
  { id: 'e2', animal_id: 'a2', fazenda_id: FAZENDA_TEST_ID, tipo_evento: 'parto', data_evento: '2026-03-10', descricao: 'Parto bezerro fêmea' },
  { id: 'e3', animal_id: 'a3', fazenda_id: FAZENDA_TEST_ID, tipo_evento: 'parto', data_evento: '2026-03-20', descricao: 'Parto bezerro macho' },
  { id: 'e4', animal_id: 'a7', fazenda_id: FAZENDA_TEST_ID, tipo_evento: 'parto', data_evento: '2026-01-05', descricao: 'Parto bezerro' },
  { id: 'e5', animal_id: 'c1', fazenda_id: FAZENDA_TEST_ID, tipo_evento: 'parto', data_evento: '2026-02-01', descricao: 'Parto bezerro' },
  // Mortes (2)
  { id: 'e6', animal_id: 'c2', fazenda_id: FAZENDA_TEST_ID, tipo_evento: 'morte', data_evento: '2026-04-15', descricao: 'Morte doença' },
  { id: 'e7', animal_id: 'a4', fazenda_id: FAZENDA_TEST_ID, tipo_evento: 'morte', data_evento: '2026-03-01', descricao: 'Morte desconhecida' },
  // Descartes (3)
  { id: 'e8', animal_id: 'a6', fazenda_id: FAZENDA_TEST_ID, tipo_evento: 'venda', data_evento: '2026-04-20', descricao: 'Descarte vaca seca' },
  { id: 'e9', animal_id: 'c3', fazenda_id: FAZENDA_TEST_ID, tipo_evento: 'venda', data_evento: '2026-02-28', descricao: 'Descarte boi' },
  { id: 'e10', animal_id: 'a5', fazenda_id: FAZENDA_TEST_ID, tipo_evento: 'transferencia_lote', data_evento: '2026-05-01', descricao: 'Transferência' },
];

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
  gmd_medio: 1.5,
  taxa_natalidade: 60, // 5 partos / aprox 8 fêmeas aptas
  taxa_mortalidade: 20, // 2 mortes / 10
};
