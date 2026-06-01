/**
 * GET /api/export/preview-excel
 *
 * Gera um XLSX de exemplo com dados fictícios aplicando o novo padrão GestSilo.
 * Usado exclusivamente para validação visual — não expor em produção sem proteção.
 */
import { NextResponse } from 'next/server';
import { buildWorkbook } from '@/lib/relatorios/excel-builder';
import { readFileSync } from 'fs';
import path from 'path';

// ── Dados fictícios ─────────────────────────────────────────────────────────
const MOVIMENTACOES = [
  { descricao: 'Venda de silagem — Lote A', tipo: 'Receita', valor: 12500, data: '2026-05-15', categoria: 'Silagem' },
  { descricao: 'Compra de insumos NPK', tipo: 'Despesa', valor: -4320, data: '2026-05-10', categoria: 'Insumos' },
  { descricao: 'Mão de obra — Trato rebanho', tipo: 'Despesa', valor: -2800, data: '2026-05-08', categoria: 'Mão de Obra' },
  { descricao: 'Venda de grãos — Milho', tipo: 'Receita', valor: 31000, data: '2026-05-02', categoria: 'Produtos' },
  { descricao: 'Combustível — Frota', tipo: 'Despesa', valor: -1950, data: '2026-04-28', categoria: 'Frota' },
  { descricao: 'Venda de animais — Novilhos', tipo: 'Receita', valor: 18750, data: '2026-04-20', categoria: 'Rebanho' },
  { descricao: 'Adubação — Talhão 3', tipo: 'Despesa', valor: -6100, data: '2026-04-15', categoria: 'Lavouras' },
  { descricao: 'Serviço de análise de solo', tipo: 'Despesa', valor: -850, data: '2026-04-10', categoria: 'Lavouras' },
  { descricao: 'Venda leite — Cooperativa', tipo: 'Receita', valor: 9400, data: '2026-04-05', categoria: 'Rebanho' },
];

const REBANHO = [
  { categoria: 'Vacas em Lactação', cabecas: 42, peso_medio: 540, ua: 50.4, gmd: '' },
  { categoria: 'Vacas Secas', cabecas: 8, peso_medio: 520, ua: 9.2, gmd: '' },
  { categoria: 'Novilhas', cabecas: 15, peso_medio: 310, ua: 10.3, gmd: 0.65 },
  { categoria: 'Bezerros', cabecas: 12, peso_medio: 85, ua: 2.3, gmd: 0.45 },
  { categoria: 'Touros', cabecas: 2, peso_medio: 820, ua: 3.6, gmd: '' },
];

export async function GET(): Promise<NextResponse> {
  // Carrega logo
  let logoBuffer: Buffer | undefined;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo_verde.png');
    logoBuffer = readFileSync(logoPath);
  } catch {
    // sem logo
  }

  const agora = new Date();

  const wb = buildWorkbook({
    fileName: 'gestsilo-preview.xlsx',
    logoBuffer,
    metadata: {
      fazendaNome: 'Fazenda Boa Vista (EXEMPLO)',
      nomeRelatorio: 'Relatório Gerencial — Exemplo',
      geradoEm: agora,
      periodo: {
        from: new Date('2026-04-01'),
        to: new Date('2026-05-31'),
      },
    },
    sheets: [
      {
        nome: 'Financeiro',
        colunas: [
          { key: 'descricao', label: 'Descrição', largura: 38 },
          { key: 'tipo', label: 'Tipo', largura: 12 },
          { key: 'valor', label: 'Valor (R$)', tipo: 'BRL', largura: 18 },
          { key: 'data', label: 'Data', tipo: 'date', largura: 14 },
          { key: 'categoria', label: 'Categoria', largura: 18 },
        ],
        linhas: MOVIMENTACOES,
      },
      {
        nome: 'Rebanho',
        colunas: [
          { key: 'categoria', label: 'Categoria', largura: 28 },
          { key: 'cabecas', label: 'Cabeças', tipo: 'number', largura: 12 },
          { key: 'peso_medio', label: 'Peso Médio (kg)', tipo: 'number', largura: 18 },
          { key: 'ua', label: 'UA Total', tipo: 'number', largura: 14 },
          { key: 'gmd', label: 'GMD (kg/d)', tipo: 'number', largura: 14 },
        ],
        linhas: REBANHO,
      },
    ],
  });

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="gestsilo-preview.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
