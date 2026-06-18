import jsPDF from 'jspdf';
import { CalagemResult, NPKResult, CalagemInput, NPKInput } from '@/lib/calculadoras';
import {
  FONT_FAMILY,
  PDF_MARGIN,
  PDF_HEADER_HEIGHT,
  PDF_HEADER_ACCENT_H,
  PDF_LOGO_HEIGHT,
  PDF_LOGO_WIDTH,
  PDF_FIRST_CONTENT_Y,
  TEXT_DARK_HEX,
  TEXT_MUTED_HEX,
  SECTION_TITLE_HEX,
  REPORT_HEADER_FILL_RGB,
  REPORT_HEADER_ACCENT_RGB,
  REPORT_HEADER_TEXT_HEX,
  REPORT_HEADER_SUBTEXT_HEX,
  BRAND_VIVID_HEX,
  BRAND_VIVID_RGB,
} from '@/lib/branding/tokens';

export interface PDFOptions {
  nomeProdutor?: string;
  nomeFazenda?: string;
  localidade?: string;
  dataAnalise?: Date;
  responsavelTecnico?: string;
}

// ── Helpers compartilhados ──────────────────────────────────────────────────

// 'use client' (consumido apenas em Client Components) — logo via fetch no browser
async function carregarLogoBase64(): Promise<string | undefined> {
  try {
    const resp = await fetch('/logo_verde.png');
    if (!resp.ok) return undefined;
    const buf = await resp.arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  } catch {
    return undefined;
  }
}

function desenharCabecalho(
  doc: jsPDF,
  titulo: string,
  subtitulo: string,
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
  doc.text(titulo, titleX, 14);

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(REPORT_HEADER_SUBTEXT_HEX);
  doc.text(subtitulo, titleX, 22);

  const rightX = doc.internal.pageSize.getWidth() - PDF_MARGIN;
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

function desenharRodape(doc: jsPDF): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont(FONT_FAMILY, 'italic');
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED_HEX);
  doc.line(PDF_MARGIN, pageH - 14, pageW - PDF_MARGIN, pageH - 14);
  doc.text('Gerado por GestSilo — Plataforma de Gestão Agrícola', PDF_MARGIN, pageH - 10);
  doc.text('Recomendações indicativas — consulte um agrônomo para implementação.', PDF_MARGIN, pageH - 6);
  doc.setTextColor(TEXT_DARK_HEX);
}

// ── Calagem ─────────────────────────────────────────────────────────────────

export async function exportarLaudoCalagem(
  input: CalagemInput,
  resultado: CalagemResult,
  options: PDFOptions = {}
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logoBase64 = await carregarLogoBase64();
  const geradoEm = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const subtitulo = options.nomeFazenda ? `Fazenda: ${options.nomeFazenda}` : 'Calculadora Agronômica';

  desenharCabecalho(doc, 'Laudo Técnico de Calagem', subtitulo, geradoEm, logoBase64);

  let yPos = PDF_FIRST_CONTENT_Y;

  // Informações da Propriedade
  adicionarSecao(doc, 'INFORMAÇÕES DA PROPRIEDADE', yPos);
  yPos += 8;

  doc.setFontSize(9);
  const propriedadeLines: [string, string][] = [
    ['Produtor:', options.nomeProdutor || '___________________'],
    ['Fazenda:', options.nomeFazenda || '___________________'],
    ['Localidade:', options.localidade || '___________________'],
    ['Área do Talhão:', `${parseFloat(input.area)} ha`],
  ];

  propriedadeLines.forEach(([label, value]) => {
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setTextColor(TEXT_DARK_HEX);
    doc.text(label, PDF_MARGIN, yPos);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setTextColor(TEXT_MUTED_HEX);
    doc.text(value, PDF_MARGIN + 50, yPos);
    yPos += 7;
  });

  if (options.responsavelTecnico) {
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setTextColor(TEXT_DARK_HEX);
    doc.text('Resp. Técnico:', PDF_MARGIN, yPos);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setTextColor(TEXT_MUTED_HEX);
    doc.text(options.responsavelTecnico, PDF_MARGIN + 50, yPos);
    yPos += 7;
  }

  yPos += 5;

  // Dados da Análise
  adicionarSecao(doc, 'DADOS DA ANÁLISE', yPos);
  yPos += 8;

  doc.setFontSize(9);
  const prnt = parseFloat(input.prnt);
  const analiseLines: [string, string][] = [
    ['Método:', nomeMetodo(resultado.metodo)],
    ['PRNT do Calcário:', `${prnt.toFixed(1)}%`],
    ...obterParametrosPorMetodo(input, resultado),
  ];

  analiseLines.forEach(([label, value]) => {
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setTextColor(TEXT_DARK_HEX);
    doc.text(label, PDF_MARGIN, yPos);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setTextColor(TEXT_MUTED_HEX);
    doc.text(value, PDF_MARGIN + 60, yPos);
    yPos += 6;
  });

  yPos += 8;

  // Resultado em destaque
  adicionarSecao(doc, 'RESULTADO', yPos);
  yPos += 8;

  doc.setFillColor(242, 247, 244); // ROW_ZEBRA
  doc.rect(PDF_MARGIN, yPos - 4, pageW - PDF_MARGIN * 2, 22, 'F');

  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_VIVID_RGB);
  doc.text(`Necessidade de Calagem: ${resultado.nc.toFixed(2)} t/ha`, PDF_MARGIN + 4, yPos + 4);

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(TEXT_DARK_HEX);
  doc.text(`Total para a área: ${resultado.total.toFixed(1)} toneladas`, PDF_MARGIN + 4, yPos + 13);
  yPos += 28;

  // Recomendações Técnicas
  adicionarSecao(doc, 'RECOMENDAÇÕES TÉCNICAS', yPos);
  yPos += 8;

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(TEXT_DARK_HEX);
  gerarRecomendacoesCalagem(resultado).forEach((rec) => {
    const lines = doc.splitTextToSize(rec, pageW - PDF_MARGIN * 2 - 5);
    doc.text(lines, PDF_MARGIN + 3, yPos);
    yPos += lines.length * 4.5 + 2;
  });

  yPos += 5;

  // Disclaimer
  if (yPos > pageH - 55) { doc.addPage(); yPos = PDF_MARGIN + 10; }
  doc.setFont(FONT_FAMILY, 'italic');
  doc.setFontSize(8);
  doc.setTextColor(TEXT_MUTED_HEX);
  const disclaimer = 'Disclaimer: Estas recomendações são indicativas e baseadas em fórmulas técnicas. Consulte um agrônomo qualificado para validar e implementar adequadamente.';
  doc.text(doc.splitTextToSize(disclaimer, pageW - PDF_MARGIN * 2), PDF_MARGIN, yPos);

  // Linha de assinatura
  const assinaturaY = pageH - 22;
  doc.setTextColor(TEXT_DARK_HEX);
  doc.setFontSize(9);
  doc.text('Assinatura do Responsável Técnico:', PDF_MARGIN, assinaturaY);
  doc.setDrawColor(TEXT_MUTED_HEX);
  doc.line(PDF_MARGIN + 52, assinaturaY + 2, PDF_MARGIN + 130, assinaturaY + 2);

  desenharRodape(doc);
  doc.save(`laudo_calagem_${Date.now()}.pdf`);
}

// ── NPK ─────────────────────────────────────────────────────────────────────

export async function exportarRelatorioNPK(
  input: NPKInput,
  resultado: NPKResult,
  options: PDFOptions = {},
  faseAdubacao?: 'plantio' | 'cobertura'
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logoBase64 = await carregarLogoBase64();
  const geradoEm = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const faseLabel = faseAdubacao === 'plantio'
    ? 'Adubação de Base (Plantio)'
    : faseAdubacao === 'cobertura'
    ? 'Adubação de Cobertura'
    : undefined;
  const subtitulo = [options.nomeFazenda ? `Fazenda: ${options.nomeFazenda}` : undefined, faseLabel]
    .filter(Boolean)
    .join('  |  ') || 'Calculadora Agronômica';

  desenharCabecalho(doc, 'Recomendação de Adubação NPK', subtitulo, geradoEm, logoBase64);

  let yPos = PDF_FIRST_CONTENT_Y;

  // Necessidade de Nutrientes
  adicionarSecao(doc, 'NECESSIDADE DE NUTRIENTES', yPos);
  yPos += 8;

  const nNec = parseFloat(input.n_nec);
  const pNec = parseFloat(input.p_nec);
  const kNec = parseFloat(input.k_nec);
  const area = parseFloat(input.area);

  doc.setFontSize(9);
  const nutrientes: [string, string][] = [
    ['N:', `${nNec.toFixed(0)} kg/ha`],
    ['P₂O₅:', `${pNec.toFixed(0)} kg/ha`],
    ['K₂O:', `${kNec.toFixed(0)} kg/ha`],
    ['Área:', `${area.toFixed(2)} ha`],
  ];
  nutrientes.forEach(([label, value]) => {
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setTextColor(TEXT_DARK_HEX);
    doc.text(label, PDF_MARGIN, yPos);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setTextColor(TEXT_MUTED_HEX);
    doc.text(value, PDF_MARGIN + 30, yPos);
    yPos += 6;
  });
  yPos += 6;

  // Resultado / Opções
  if (resultado.modo === 'simples') {
    adicionarSecao(doc, 'RECOMENDAÇÃO SIMPLES', yPos);
    yPos += 8;

    doc.setFillColor(242, 247, 244);
    doc.rect(PDF_MARGIN, yPos - 4, pageW - PDF_MARGIN * 2, 20, 'F');

    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BRAND_VIVID_RGB);
    doc.text(`${resultado.fertNome}: ${resultado.dosePorHa.toFixed(0)} kg/ha`, PDF_MARGIN + 4, yPos + 4);

    doc.setFont(FONT_FAMILY, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(TEXT_DARK_HEX);
    doc.text(`Total para a área: ${resultado.total.toFixed(2)} t`, PDF_MARGIN + 4, yPos + 12);
    yPos += 26;

  } else if (resultado.topMaisBarata && resultado.topMaisBarata.length > 0) {
    const renderizarOpcoes = (
      opcoes: typeof resultado.topMaisBarata,
      tituloSecao: string
    ): void => {
      if (yPos > pageH - 50) {
        doc.addPage();
        desenharCabecalho(doc, 'Recomendação de Adubação NPK', subtitulo, geradoEm, logoBase64);
        yPos = PDF_FIRST_CONTENT_Y;
      }

      adicionarSecao(doc, tituloSecao, yPos);
      yPos += 8;

      opcoes.slice(0, 3).forEach((opcao, idx) => {
        if (yPos > pageH - 40) {
          doc.addPage();
          desenharCabecalho(doc, 'Recomendação de Adubação NPK', subtitulo, geradoEm, logoBase64);
          yPos = PDF_FIRST_CONTENT_Y;
        }

        doc.setFont(FONT_FAMILY, 'bold');
        doc.setFontSize(9);
        doc.setTextColor(BRAND_VIVID_HEX);
        doc.text(`${idx + 1}. ${opcao.fertilizantes.map((f) => f.fertilizante.nome).join(' + ')}`, PDF_MARGIN, yPos);
        yPos += 6;

        doc.setFont(FONT_FAMILY, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(TEXT_DARK_HEX);
        opcao.fertilizantes.forEach((f) => {
          doc.text(
            `${f.fertilizante.nome}: ${f.dose_kg_ha.toFixed(0)} kg/ha (${f.sacos_por_ha} sacos/ha)`,
            PDF_MARGIN + 5,
            yPos
          );
          yPos += 5;
        });

        const totalSacos = opcao.fertilizantes.reduce((acc, f) => acc + f.total_sacos, 0);
        doc.setTextColor(TEXT_MUTED_HEX);
        doc.text(
          `Custo: R$ ${opcao.custoTotal_r_ha.toFixed(2)}/ha  |  Total: R$ ${(opcao.custoTotal_r_ha * area).toFixed(2)}  |  ${totalSacos} sacos`,
          PDF_MARGIN + 5,
          yPos
        );
        yPos += 5;

        doc.text(
          `N: ${opcao.nutrientes_fornecidos.n.toFixed(0)} kg/ha  |  P: ${opcao.nutrientes_fornecidos.p.toFixed(0)} kg/ha  |  K: ${opcao.nutrientes_fornecidos.k.toFixed(0)} kg/ha`,
          PDF_MARGIN + 5,
          yPos
        );
        yPos += 8;
        doc.setTextColor(TEXT_DARK_HEX);
      });

      yPos += 4;
    };

    renderizarOpcoes(resultado.topMaisBarata ?? [], 'TOP 3 — MENOR CUSTO DE AQUISIÇÃO');
    renderizarOpcoes(resultado.topMaisSimples ?? [], 'TOP 3 — MAIOR FACILIDADE DE OPERAÇÃO');
  }

  // Disclaimer
  if (yPos > pageH - 40) { doc.addPage(); yPos = PDF_MARGIN + 10; }
  doc.setFont(FONT_FAMILY, 'italic');
  doc.setFontSize(8);
  doc.setTextColor(TEXT_MUTED_HEX);
  const disclaimer =
    'Aviso: Este cálculo considera apenas os custos de aquisição dos fertilizantes. O produtor deve ' +
    'considerar também os custos logísticos — transporte, mão de obra, horas-máquina e combustível. ' +
    'Recomendações indicativas. Consulte um agrônomo qualificado para implementação.';
  doc.text(doc.splitTextToSize(disclaimer, pageW - PDF_MARGIN * 2), PDF_MARGIN, yPos);

  desenharRodape(doc);
  doc.save(`recomendacao_npk_${Date.now()}.pdf`);
}

// ── Funções auxiliares ──────────────────────────────────────────────────────

function nomeMetodo(metodo: string): string {
  const nomes: Record<string, string> = {
    saturacao: 'Saturação por Bases (V%)',
    al_ca_mg: 'Neutralização de Alumínio + Ca/Mg',
    mg_manual: 'Método Minas Gerais Manual',
    smp: 'Índice SMP',
    ufla: 'Teor de Cálcio Desejado (UFLA)',
  };
  return nomes[metodo] || metodo;
}

function obterParametrosPorMetodo(input: CalagemInput, resultado: CalagemResult): [string, string][] {
  const params: [string, string][] = [];
  if (resultado.metodo === 'saturacao') {
    params.push(['V% Atual (V1):', `${parseFloat(input.v1 || '0').toFixed(1)}%`]);
    params.push(['V% Desejado (V2):', `${parseFloat(input.v2 || '0').toFixed(1)}%`]);
    params.push(['CTC(T):', `${parseFloat(input.ctc || '0').toFixed(2)} cmolc/dm³`]);
  } else if (resultado.metodo === 'al_ca_mg' || resultado.metodo === 'mg_manual') {
    params.push(['Al³⁺:', `${parseFloat(input.al || '0').toFixed(2)} cmolc/dm³`]);
    params.push(['Ca²⁺:', `${parseFloat(input.ca || '0').toFixed(2)} cmolc/dm³`]);
    params.push(['Mg²⁺:', `${parseFloat(input.mg || '0').toFixed(2)} cmolc/dm³`]);
  } else if (resultado.metodo === 'smp') {
    params.push(['pH SMP:', `${parseFloat(input.ph_smp || '0').toFixed(1)}`]);
    params.push(['Textura:', input.textura || '-']);
  } else if (resultado.metodo === 'ufla') {
    params.push(['Ca² Atual:', `${parseFloat(input.ca || '0').toFixed(2)} cmolc/dm³`]);
    params.push(['Cultura:', input.cultura || '-']);
  }
  return params;
}

function gerarRecomendacoesCalagem(resultado: CalagemResult): string[] {
  const r: string[] = [];
  r.push(`• Aplicar ${resultado.nc.toFixed(2)} t/ha de calcário com PRNT adequado.`);
  if (resultado.nc > 3) r.push('• Incorporar em profundidade (30–40 cm) para corrigir todo o perfil do solo.');
  if (resultado.nc > 5) r.push('• Para NC > 5 t/ha, considere parcelar em 2 safras para melhor aproveitamento.');
  r.push('• Realizar a calagem pelo menos 60–90 dias antes do plantio para permitir a reação do calcário.');
  r.push('• Manter umidade adequada no solo para acelerar a reação do calcário.');
  return r;
}
