import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { IndicadorRebanho, TipoExploracao } from '@/types/rebanho-indicadores';
import {
  FONT_FAMILY,
  PDF_MARGIN,
  PDF_HEADER_HEIGHT,
  PDF_HEADER_ACCENT_H,
  PDF_LOGO_HEIGHT,
  PDF_LOGO_WIDTH,
  PDF_FIRST_CONTENT_Y,
  TABLE_HEADER_FILL_RGB,
  TABLE_HEADER_TEXT_RGB,
  ROW_ZEBRA_RGB,
  TEXT_DARK_HEX,
  TEXT_MUTED_HEX,
  SECTION_TITLE_HEX,
  REPORT_HEADER_FILL_RGB,
  REPORT_HEADER_ACCENT_RGB,
  REPORT_HEADER_TEXT_HEX,
  REPORT_HEADER_SUBTEXT_HEX,
} from '@/lib/branding/tokens';

interface PdfExportOptions {
  fazendaNome: string;
  tipoExploracao: TipoExploracao;
  periodo: { dataInicio: Date; dataFim: Date };
  usuarioNome?: string;
  indicadores: IndicadorRebanho;
  /** Base64 da logo PNG. Quando omitido, carrega public/logo_verde.png via fs. */
  logoBase64?: string;
}

function carregarLogoBase64(): string | undefined {
  if (typeof window !== 'undefined') return undefined;
  try {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    return fs.readFileSync(path.join(process.cwd(), 'public', 'logo_verde.png')).toString('base64');
  } catch {
    return undefined;
  }
}

function desenharCabecalho(
  doc: jsPDF,
  fazendaNome: string,
  periodo: string,
  geradoEm: string,
  logoBase64: string | undefined
): void {
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(...REPORT_HEADER_FILL_RGB);
  doc.rect(0, 0, pageW, PDF_HEADER_HEIGHT, 'F');

  doc.setFillColor(...REPORT_HEADER_ACCENT_RGB);
  doc.rect(0, PDF_HEADER_HEIGHT - PDF_HEADER_ACCENT_H, pageW, PDF_HEADER_ACCENT_H, 'F');

  const logoX = PDF_MARGIN;
  const logoY = (PDF_HEADER_HEIGHT - PDF_LOGO_HEIGHT) / 2 - 1;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', logoX, logoY, PDF_LOGO_WIDTH, PDF_LOGO_HEIGHT);
    } catch {
      doc.setFont(FONT_FAMILY, 'bold');
      doc.setFontSize(14);
      doc.setTextColor(REPORT_HEADER_TEXT_HEX);
      doc.text('GestSilo', logoX, PDF_HEADER_HEIGHT / 2 + 2);
    }
  } else {
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(REPORT_HEADER_TEXT_HEX);
    doc.text('GestSilo', logoX, PDF_HEADER_HEIGHT / 2 + 2);
  }

  const titleX = logoX + PDF_LOGO_WIDTH + 8;
  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(REPORT_HEADER_TEXT_HEX);
  doc.text('Indicadores Zootécnicos', titleX, 14);

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(REPORT_HEADER_SUBTEXT_HEX);
  doc.text(`Fazenda: ${fazendaNome}`, titleX, 22);

  const rightX = pageW - PDF_MARGIN;
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(REPORT_HEADER_SUBTEXT_HEX);
  doc.text(periodo, rightX, 14, { align: 'right' });
  doc.text(`Gerado em: ${geradoEm}`, rightX, 21, { align: 'right' });
}

function adicionarSecao(doc: jsPDF, titulo: string, posY: number): void {
  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(SECTION_TITLE_HEX);
  doc.text(titulo, PDF_MARGIN, posY);

  doc.setDrawColor(SECTION_TITLE_HEX);
  doc.setLineWidth(0.4);
  doc.line(PDF_MARGIN, posY + 2, PDF_MARGIN + 150, posY + 2);

  doc.setTextColor(TEXT_DARK_HEX);
}

function formatarValor(valor: number | null): string {
  if (valor === null || valor === undefined) return '-';
  return valor.toFixed(2).replace('.', ',');
}

function determinarStatusShort(valor: number | null, benchmark?: { min: number; max: number }): string {
  if (valor === null || valor === undefined) return '—';
  if (!benchmark) return 'OK';
  if (valor >= benchmark.min && valor <= benchmark.max) return '✓';
  if (valor < benchmark.min) return '↓';
  return '↑';
}

export function gerarPdfIndicadoresRebanho(options: PdfExportOptions): void {
  const { fazendaNome, tipoExploracao, periodo, usuarioNome = 'Sistema', indicadores } = options;
  const logoBase64 = options.logoBase64 ?? carregarLogoBase64();

  const doc = new jsPDF('p', 'mm', 'A4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const periodoStr = `${periodo.dataInicio.toLocaleDateString('pt-BR')} – ${periodo.dataFim.toLocaleDateString('pt-BR')}`;
  const geradoEm = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  desenharCabecalho(doc, fazendaNome, periodoStr, geradoEm, logoBase64);

  let posY = PDF_FIRST_CONTENT_Y;

  // Tipo de exploração logo abaixo do cabeçalho
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(TEXT_MUTED_HEX);
  doc.text(`Tipo de Exploração: ${tipoExploracao}`, PDF_MARGIN, posY);
  posY += 8;

  const rodape = (pageNum: number): void => {
    const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
    doc.setFont(FONT_FAMILY, 'italic');
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED_HEX);
    doc.text(
      `Gerado por GestSilo — Página ${pageNum} de ${totalPages} — Usuário: ${usuarioNome}`,
      pageW / 2,
      pageH - 6,
      { align: 'center' }
    );
    doc.setTextColor(TEXT_DARK_HEX);
  };

  const tableOptions = {
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    headStyles: {
      fillColor: TABLE_HEADER_FILL_RGB,
      textColor: TABLE_HEADER_TEXT_RGB,
      fontStyle: 'bold' as const,
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: [17, 17, 17] as [number, number, number] },
    alternateRowStyles: { fillColor: ROW_ZEBRA_RGB },
    didDrawPage: (data: { pageNumber: number }) => {
      if (data.pageNumber > 1) {
        desenharCabecalho(doc, fazendaNome, periodoStr, geradoEm, logoBase64);
      }
      rodape(data.pageNumber);
    },
  };

  // ── Indicadores Principais ────────────────────────────────────────────────
  adicionarSecao(doc, 'INDICADORES PRINCIPAIS', posY);
  posY += 8;

  const indicadoresData: string[][] = [
    ['GMD (Ganho de Peso)', formatarValor(indicadores.gmd.valor), 'kg/dia', determinarStatusShort(indicadores.gmd.valor, { min: 0.8, max: 1.5 })],
    ['Taxa de Natalidade', formatarValor(indicadores.taxaNatalidade.valor), '%', determinarStatusShort(indicadores.taxaNatalidade.valor, { min: 80, max: 95 })],
    ['Taxa de Mortalidade Geral', formatarValor(indicadores.taxaMortalidadeGeral.valor), '%', determinarStatusShort(indicadores.taxaMortalidadeGeral.valor, { min: 0, max: 5 })],
    ['Taxa de Mortalidade (Bezerros)', formatarValor(indicadores.taxaMortalidadeBezerros.valor), '%', determinarStatusShort(indicadores.taxaMortalidadeBezerros.valor, { min: 0, max: 8 })],
    ['Taxa de Descarte', formatarValor(indicadores.taxaDescarte.valor), '%', determinarStatusShort(indicadores.taxaDescarte.valor, { min: 10, max: 20 })],
    ['Taxa de Prenhez', formatarValor(indicadores.taxaPrenhez.valor), '%', determinarStatusShort(indicadores.taxaPrenhez.valor, { min: 80, max: 95 })],
    ['IEP (Int. Entre Partos)', formatarValor(indicadores.iep.valor), 'dias', determinarStatusShort(indicadores.iep.valor, { min: 380, max: 420 })],
    ['IPP (Idade 1º Parto)', formatarValor(indicadores.ipp.valor), 'meses', determinarStatusShort(indicadores.ipp.valor, { min: 22, max: 26 })],
    ['Taxa de Reposição', formatarValor(indicadores.taxaReposicao.valor), '%', determinarStatusShort(indicadores.taxaReposicao.valor, { min: 20, max: 30 })],
  ];

  if (indicadores.taxaDesfrute) {
    indicadoresData.push(['Taxa de Desfrute', formatarValor(indicadores.taxaDesfrute.valor), '%', determinarStatusShort(indicadores.taxaDesfrute.valor, { min: 15, max: 25 })]);
  }
  if (indicadores.percentualVacasLactacao) {
    indicadoresData.push(['% Vacas em Lactação', formatarValor(indicadores.percentualVacasLactacao.valor), '%', determinarStatusShort(indicadores.percentualVacasLactacao.valor, { min: 70, max: 85 })]);
  }
  if (indicadores.periodoSecoMedio) {
    indicadoresData.push(['Período Seco Médio', formatarValor(indicadores.periodoSecoMedio.valor), 'dias', determinarStatusShort(indicadores.periodoSecoMedio.valor, { min: 45, max: 60 })]);
  }

  autoTable(doc, {
    startY: posY,
    head: [['Indicador', 'Valor', 'Unidade', 'Status']],
    body: indicadoresData,
    columnStyles: { 0: { halign: 'left' }, 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
    ...tableOptions,
  });
  posY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // ── Composição do Rebanho ─────────────────────────────────────────────────
  if (indicadores.composicaoRebanho.valor && Object.keys(indicadores.composicaoRebanho.valor).length > 0) {
    if (posY > pageH - 50) { doc.addPage(); desenharCabecalho(doc, fazendaNome, periodoStr, geradoEm, logoBase64); posY = PDF_FIRST_CONTENT_Y; }
    adicionarSecao(doc, 'COMPOSIÇÃO DO REBANHO', posY);
    posY += 8;

    const composicaoData = Object.entries(indicadores.composicaoRebanho.valor)
      .filter(([, pct]) => pct > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([categoria, pct]) => [categoria, `${formatarValor(pct)}%`]);

    if (composicaoData.length > 0) {
      autoTable(doc, {
        startY: posY,
        head: [['Categoria', 'Percentual']],
        body: composicaoData,
        columnStyles: { 0: { halign: 'left' }, 1: { halign: 'right' } },
        ...tableOptions,
      });
      posY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }
  }

  // ── Peso Médio por Categoria ──────────────────────────────────────────────
  if (indicadores.pesoMedioPorCategoria.valor && Object.keys(indicadores.pesoMedioPorCategoria.valor).length > 0) {
    if (posY > pageH - 50) { doc.addPage(); desenharCabecalho(doc, fazendaNome, periodoStr, geradoEm, logoBase64); posY = PDF_FIRST_CONTENT_Y; }
    adicionarSecao(doc, 'PESO MÉDIO POR CATEGORIA', posY);
    posY += 8;

    const pesoData = Object.entries(indicadores.pesoMedioPorCategoria.valor)
      .filter(([, peso]) => peso > 0)
      .map(([categoria, peso]) => [categoria, `${formatarValor(peso)} kg`]);

    if (pesoData.length > 0) {
      autoTable(doc, {
        startY: posY,
        head: [['Categoria', 'Peso Médio']],
        body: pesoData,
        columnStyles: { 0: { halign: 'left' }, 1: { halign: 'right' } },
        ...tableOptions,
      });
    }
  }

  const nomearquivo = `indicadores-${fazendaNome.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(nomearquivo);
}
