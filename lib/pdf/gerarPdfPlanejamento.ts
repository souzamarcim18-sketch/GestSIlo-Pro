'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PlanejamentoSilagem } from '@/lib/types/planejamento-silagem';
import {
  formatTon,
  formatHa,
  formatM2,
  formatKgDia,
  formatPercent,
} from '@/lib/utils/format-planejamento';
import { gerarExemplosDimensaoPainel } from '@/lib/services/planejamento-silagem';
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

// 'use client' — carregamento de logo via fetch (browser) ou omitido
async function carregarLogoBase64(): Promise<string | undefined> {
  try {
    const resp = await fetch('/logo_verde.png');
    if (!resp.ok) return undefined;
    const buf = await resp.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return b64;
  } catch {
    return undefined;
  }
}

function desenharCabecalho(
  doc: jsPDF,
  nomeFazenda: string,
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
  doc.text('Planejamento de Silagem', titleX, 14);

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(REPORT_HEADER_SUBTEXT_HEX);
  doc.text(`Fazenda: ${nomeFazenda}`, titleX, 22);

  const rightX = pageW - PDF_MARGIN;
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(REPORT_HEADER_SUBTEXT_HEX);
  doc.text(`Gerado em: ${geradoEm}`, rightX, 17, { align: 'right' });
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

export async function gerarPdfPlanejamento(
  planejamento: PlanejamentoSilagem,
  nomeFazenda: string
): Promise<void> {
  const logoBase64 = await carregarLogoBase64();
  const doc = new jsPDF('p', 'mm', 'A4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const geradoEm = new Date().toLocaleString('pt-BR');

  desenharCabecalho(doc, nomeFazenda, geradoEm, logoBase64);
  let posY = PDF_FIRST_CONTENT_Y;

  const rodape = (pageNum: number): void => {
    const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
    doc.setFont(FONT_FAMILY, 'italic');
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED_HEX);
    doc.text(
      `Gerado por GestSilo — Página ${pageNum} de ${totalPages}`,
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
      fontSize: 10,
    },
    bodyStyles: { fontSize: 10, textColor: [17, 17, 17] as [number, number, number] },
    alternateRowStyles: { fillColor: ROW_ZEBRA_RGB },
    didDrawPage: (data: { pageNumber: number }) => {
      if (data.pageNumber > 1) {
        desenharCabecalho(doc, nomeFazenda, geradoEm, logoBase64);
      }
      rodape(data.pageNumber);
    },
  };

  // ── Configuração ─────────────────────────────────────────────────────────
  adicionarSecao(doc, 'CONFIGURAÇÃO', posY);
  posY += 8;

  const configData: [string, string][] = [
    ['Nome:', planejamento.nome],
    ['Tipo de Rebanho:', planejamento.sistema.tipo_rebanho],
    ['Sistema Produção:', planejamento.sistema.sistema_producao.replace('-', ' ')],
    ['Período:', `${planejamento.parametros.periodo_dias} dias`],
    ['Cultura:', planejamento.parametros.cultura],
  ];

  doc.setFontSize(9);
  configData.forEach(([label, value]) => {
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setTextColor(TEXT_DARK_HEX);
    doc.text(label, PDF_MARGIN, posY);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setTextColor(TEXT_MUTED_HEX);
    doc.text(value, PDF_MARGIN + 40, posY);
    posY += 6;
  });
  posY += 4;

  // ── Rebanho ───────────────────────────────────────────────────────────────
  if (planejamento.rebanho.length > 0) {
    if (posY > pageH - 60) { doc.addPage(); desenharCabecalho(doc, nomeFazenda, geradoEm, logoBase64); posY = PDF_FIRST_CONTENT_Y; }
    adicionarSecao(doc, 'REBANHO', posY);
    posY += 8;

    const rebanhoData = planejamento.rebanho.map((cat) => [cat.nome, String(cat.quantidade_cabecas)]);
    const totalCabecas = planejamento.rebanho.reduce((sum, cat) => sum + cat.quantidade_cabecas, 0);
    rebanhoData.push(['Total', String(totalCabecas)]);

    autoTable(doc, {
      startY: posY,
      head: [['Categoria', 'Cabeças']],
      body: rebanhoData,
      columnStyles: { 0: { halign: 'left' }, 1: { halign: 'right' } },
      ...tableOptions,
    });
    posY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ── Resultados ────────────────────────────────────────────────────────────
  if (posY > pageH - 60) { doc.addPage(); desenharCabecalho(doc, nomeFazenda, geradoEm, logoBase64); posY = PDF_FIRST_CONTENT_Y; }
  adicionarSecao(doc, 'RESULTADOS', posY);
  posY += 8;

  const resultadosData: [string, string][] = [
    ['Demanda MS Total:', `${formatTon(planejamento.resultados.demanda_ms_total_ton)} ton`],
    ['Demanda MO (sem perdas):', `${formatTon(planejamento.resultados.demanda_mo_sem_perdas_ton)} ton`],
    ['Demanda MO (com perdas):', `${formatTon(planejamento.resultados.demanda_mo_com_perdas_ton)} ton`],
    ['Consumo Diário MO:', `${formatKgDia(planejamento.resultados.consumo_diario_mo_kg)} kg/dia`],
    ['Área de Plantio:', `${formatHa(planejamento.resultados.area_plantio_ha)} ha`],
    ['Área Painel Frontal:', `${formatM2(planejamento.resultados.area_painel_m2)} m²`],
  ];

  doc.setFontSize(9);
  resultadosData.forEach(([label, value]) => {
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setTextColor(TEXT_DARK_HEX);
    doc.text(label, PDF_MARGIN, posY);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setTextColor(TEXT_MUTED_HEX);
    doc.text(value, PDF_MARGIN + 60, posY);
    posY += 6;
  });
  posY += 4;

  // ── Distribuição por Categoria ────────────────────────────────────────────
  if (planejamento.resultados.categorias_calculo.length > 0) {
    if (posY > pageH - 60) { doc.addPage(); desenharCabecalho(doc, nomeFazenda, geradoEm, logoBase64); posY = PDF_FIRST_CONTENT_Y; }
    adicionarSecao(doc, 'DISTRIBUIÇÃO POR CATEGORIA', posY);
    posY += 8;

    const distribuicaoData = planejamento.resultados.categorias_calculo
      .filter((cat) => cat.quantidade_cabecas > 0)
      .sort((a, b) => b.participacao_pct - a.participacao_pct)
      .map((cat) => [cat.nome, String(cat.quantidade_cabecas), formatTon(cat.demanda_ms_ton), formatPercent(cat.participacao_pct)]);

    autoTable(doc, {
      startY: posY,
      head: [['Categoria', 'Cabeças', 'Demanda MS', 'Participação']],
      body: distribuicaoData,
      columnStyles: { 0: { halign: 'left' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      ...tableOptions,
    });
    posY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ── Painel Frontal ────────────────────────────────────────────────────────
  if (posY > pageH - 60) { doc.addPage(); desenharCabecalho(doc, nomeFazenda, geradoEm, logoBase64); posY = PDF_FIRST_CONTENT_Y; }
  adicionarSecao(doc, 'PAINEL FRONTAL', posY);
  posY += 8;

  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(TEXT_DARK_HEX);
  doc.text(`Área máxima do painel: ${formatM2(planejamento.resultados.area_painel_m2)} m²`, PDF_MARGIN, posY);
  posY += 7;

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(TEXT_MUTED_HEX);
  doc.text('Exemplos de dimensão:', PDF_MARGIN, posY);
  posY += 5;

  gerarExemplosDimensaoPainel(planejamento.resultados.area_painel_m2).forEach((ex) => {
    doc.text(
      `• ${ex.largura.toFixed(1)} m × ${ex.altura.toFixed(1)} m = ${formatM2(ex.area)} m²`,
      PDF_MARGIN + 5,
      posY
    );
    posY += 5;
  });

  doc.save(`planejamento-${planejamento.nome}.pdf`);
}
