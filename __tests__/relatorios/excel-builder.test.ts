// @vitest-environment node
import { describe, it, expect } from 'vitest';

// Mock do formatBRL antes de importar o módulo
vi.mock('@/lib/utils', () => ({
  formatBRL: (v: number) => {
    return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },
  formatDate: (d: string) => d,
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import { buildWorkbook, type ExcelReportConfig } from '@/lib/relatorios/excel-builder';

function buildConfig(overrides: Partial<ExcelReportConfig> = {}): ExcelReportConfig {
  return {
    fileName: 'teste.xlsx',
    metadata: {
      fazendaNome: 'Fazenda Teste',
      geradoEm: new Date('2026-05-25T12:00:00Z'),
      nomeRelatorio: 'Relatório Teste',
      periodo: { from: new Date(2026, 4, 1), to: new Date(2026, 4, 25) },
    },
    sheets: [
      {
        nome: 'Aba1',
        colunas: [
          { key: 'nome', label: 'Nome', tipo: 'text' },
          { key: 'valor', label: 'Valor', tipo: 'BRL' },
          { key: 'data', label: 'Data', tipo: 'date' },
          { key: 'pct', label: '%', tipo: 'percent' },
          { key: 'qtd', label: 'Qtd', tipo: 'number', largura: 10 },
        ],
        linhas: [
          { nome: 'Item A', valor: 1234.56, data: new Date(2026, 4, 10).toISOString().slice(0, 10), pct: 0.125, qtd: 3000 },
          { nome: 'Item B', valor: 0, data: '2026-05-20', pct: 0, qtd: 0 },
        ],
      },
    ],
    ...overrides,
  };
}

describe('buildWorkbook / gerarExcel', () => {
  it('formata valores BRL corretamente', () => {
    const wb = buildWorkbook(buildConfig());
    const ws = wb.getWorksheet('Aba1')!;
    // Linha 5, coluna 2 (1-indexed) = valor BRL da primeira linha de dados
    const cell = ws.getCell(5, 2);
    expect(String(cell.value)).toMatch(/R\$/);
  });

  it('formata datas como dd/MM/yyyy', () => {
    const wb = buildWorkbook(buildConfig());
    const ws = wb.getWorksheet('Aba1')!;
    const cell = ws.getCell(5, 3);
    expect(String(cell.value)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('linha 1 da aba contém "GestSilo"', () => {
    const wb = buildWorkbook(buildConfig());
    const ws = wb.getWorksheet('Aba1')!;
    const cell = ws.getCell(1, 1);
    expect(String(cell.value)).toContain('GestSilo');
  });

  it('linha 2 da aba contém fazendaNome e período', () => {
    const wb = buildWorkbook(buildConfig());
    const ws = wb.getWorksheet('Aba1')!;
    const cell = ws.getCell(2, 1);
    expect(String(cell.value)).toContain('Fazenda Teste');
    expect(String(cell.value)).toContain('05/2026');
  });

  it('workbook tem exatamente N abas para N sheets', () => {
    const config = buildConfig();
    config.sheets.push({
      nome: 'Aba2',
      colunas: [{ key: 'x', label: 'X' }],
      linhas: [{ x: 'abc' }],
    });
    const wb = buildWorkbook(config);
    expect(wb.worksheets).toHaveLength(2);
    expect(wb.worksheets.map((s) => s.name)).toContain('Aba1');
    expect(wb.worksheets.map((s) => s.name)).toContain('Aba2');
  });

  it('largura de coluna segue ColunaConfig.largura', () => {
    const wb = buildWorkbook(buildConfig());
    const ws = wb.getWorksheet('Aba1')!;
    // coluna 5 = largura 10, coluna 1 = padrão (fallback = 22)
    expect(ws.getColumn(5).width).toBe(10);
    expect(ws.getColumn(1).width).toBe(22);
  });

  it('aba vazia gera linha 5 com texto de empty state em itálico', () => {
    const config = buildConfig();
    config.sheets[0].linhas = [];
    const wb = buildWorkbook(config);
    const ws = wb.getWorksheet('Aba1')!;
    // Acessar via endereço string para obter o objeto master da merge com estilo intacto
    const emptyCell = ws.getCell('A5');
    expect(String(emptyCell.value)).toContain('Nenhum registro encontrado no período selecionado');
expect(emptyCell.font?.italic).toBe(true);
  });

  it('aba vazia permanece presente no workbook', () => {
    const config = buildConfig();
    config.sheets[0].linhas = [];
    const wb = buildWorkbook(config);
    expect(wb.worksheets.map((s) => s.name)).toContain('Aba1');
  });

  it('formata percent corretamente', () => {
    const wb = buildWorkbook(buildConfig());
    const ws = wb.getWorksheet('Aba1')!;
    const cell = ws.getCell(5, 4);
    expect(String(cell.value)).toBe('12.5%');
  });
});
