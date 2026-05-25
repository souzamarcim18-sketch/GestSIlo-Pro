import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';

// Mock do formatBRL antes de importar o módulo
vi.mock('@/lib/utils', () => ({
  formatBRL: (v: number) => {
    // Formatar como R$ X.XXX,XX
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
      // Usar construtor local para evitar problemas de timezone nos testes
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
    const ws = wb.Sheets['Aba1'];
    const cellB5 = ws[XLSX.utils.encode_cell({ r: 4, c: 1 })];
    expect(String(cellB5?.v)).toMatch(/R\$/);
  });

  it('formata datas como dd/MM/yyyy', () => {
    const wb = buildWorkbook(buildConfig());
    const ws = wb.Sheets['Aba1'];
    const cellC5 = ws[XLSX.utils.encode_cell({ r: 4, c: 2 })];
    expect(String(cellC5?.v)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('linha 1 da aba contém "GestSilo"', () => {
    const wb = buildWorkbook(buildConfig());
    const ws = wb.Sheets['Aba1'];
    const cellA1 = ws[XLSX.utils.encode_cell({ r: 0, c: 0 })];
    expect(String(cellA1?.v)).toContain('GestSilo');
  });

  it('linha 2 da aba contém fazendaNome e período', () => {
    const wb = buildWorkbook(buildConfig());
    const ws = wb.Sheets['Aba1'];
    const cellA2 = ws[XLSX.utils.encode_cell({ r: 1, c: 0 })];
    expect(String(cellA2?.v)).toContain('Fazenda Teste');
    expect(String(cellA2?.v)).toContain('05/2026'); // mês e ano do período
  });

  it('workbook tem exatamente N abas para N sheets', () => {
    const config = buildConfig();
    config.sheets.push({
      nome: 'Aba2',
      colunas: [{ key: 'x', label: 'X' }],
      linhas: [{ x: 'abc' }],
    });
    const wb = buildWorkbook(config);
    expect(wb.SheetNames).toHaveLength(2);
    expect(wb.SheetNames).toContain('Aba1');
    expect(wb.SheetNames).toContain('Aba2');
  });

  it('largura de coluna segue ColunaConfig.largura', () => {
    const wb = buildWorkbook(buildConfig());
    const ws = wb.Sheets['Aba1'];
    expect(ws['!cols']?.[4]?.wch).toBe(10);
    expect(ws['!cols']?.[0]?.wch).toBe(20);
  });

  it('aba vazia gera linha 5 com texto de empty state em itálico', () => {
    const config = buildConfig();
    config.sheets[0].linhas = [];
    const wb = buildWorkbook(config);
    const ws = wb.Sheets['Aba1'];
    const emptyCell = ws[XLSX.utils.encode_cell({ r: 4, c: 0 })];
    expect(String(emptyCell?.v)).toContain('Nenhum registro encontrado');
    expect(emptyCell?.s?.font?.italic).toBe(true);
  });

  it('aba vazia permanece presente no workbook', () => {
    const config = buildConfig();
    config.sheets[0].linhas = [];
    const wb = buildWorkbook(config);
    expect(wb.SheetNames).toContain('Aba1');
  });

  it('formata percent corretamente', () => {
    const wb = buildWorkbook(buildConfig());
    const ws = wb.Sheets['Aba1'];
    const cellD5 = ws[XLSX.utils.encode_cell({ r: 4, c: 3 })];
    expect(String(cellD5?.v)).toBe('12.5%');
  });
});
