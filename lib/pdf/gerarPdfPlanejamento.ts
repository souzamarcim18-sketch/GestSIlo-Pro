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

export function gerarPdfPlanejamento(
  planejamento: PlanejamentoSilagem,
  nomeFazenda: string
): void {
  const doc = new jsPDF('p', 'mm', 'A4');
  const cor_verde = '#00A651';
  const cor_texto = '#1a1a1a';
  const margemEsquerda = 20;
  const larguraPagina = 170;
  let posY = 20;

  // ===== HEADER =====
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...hexToRgb(cor_verde));
  doc.text('GestSilo Pro — Planejamento de Silagem', margemEsquerda, posY);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  posY += 8;
  doc.text(`Fazenda: ${nomeFazenda}`, margemEsquerda, posY);
  posY += 5;
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, margemEsquerda, posY);
  posY += 10;

  // ===== SEÇÃO CONFIGURAÇÃO =====
  adicionarSecao(doc, 'CONFIGURAÇÃO', cor_verde, margemEsquerda, posY);
  posY += 8;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(cor_texto));

  const configData = [
    [`Nome:`, planejamento.nome],
    [`Tipo de Rebanho:`, planejamento.sistema.tipo_rebanho],
    [`Sistema Produção:`, planejamento.sistema.sistema_producao.replace('-', ' ')],
    [`Período:`, `${planejamento.parametros.periodo_dias} dias`],
    [`Cultura:`, planejamento.parametros.cultura],
  ];

  configData.forEach(([label, value]) => {
    doc.setFont('Helvetica', 'bold');
    doc.text(label, margemEsquerda, posY);
    doc.setFont('Helvetica', 'normal');
    doc.text(String(value), margemEsquerda + 40, posY);
    posY += 6;
  });

  posY += 4;

  // ===== SEÇÃO REBANHO =====
  if (planejamento.rebanho.length > 0) {
    // Verificar se há espaço
    if (posY > 200) {
      doc.addPage();
      posY = 20;
    }

    adicionarSecao(doc, 'REBANHO', cor_verde, margemEsquerda, posY);
    posY += 8;

    const rebanhoTableData = planejamento.rebanho.map((cat) => [
      cat.nome,
      String(cat.quantidade_cabecas),
    ]);

    const totalCabecas = planejamento.rebanho.reduce(
      (sum, cat) => sum + cat.quantidade_cabecas,
      0
    );
    rebanhoTableData.push(['Total', String(totalCabecas)]);

    autoTable(doc, {
      startY: posY,
      margin: { left: margemEsquerda, right: margemEsquerda },
      head: [['Categoria', 'Cabeças']],
      body: rebanhoTableData,
      theme: 'grid',
      headStyles: {
        fillColor: hexToRgb(cor_verde),
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 10,
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right' },
      },
    });

    posY = (doc as any).lastAutoTable.finalY + 10;
  }

  // ===== SEÇÃO RESULTADOS =====
  if (posY > 200) {
    doc.addPage();
    posY = 20;
  }

  adicionarSecao(doc, 'RESULTADOS', cor_verde, margemEsquerda, posY);
  posY += 8;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(cor_texto));

  const resultadosData = [
    [`Demanda MS Total:`, `${formatTon(planejamento.resultados.demanda_ms_total_ton)} ton`],
    [`Demanda MO (sem perdas):`, `${formatTon(planejamento.resultados.demanda_mo_sem_perdas_ton)} ton`],
    [`Demanda MO (com perdas):`, `${formatTon(planejamento.resultados.demanda_mo_com_perdas_ton)} ton`],
    [`Consumo Diário MO:`, `${formatKgDia(planejamento.resultados.consumo_diario_mo_kg)} kg/dia`],
    [`Área de Plantio:`, `${formatHa(planejamento.resultados.area_plantio_ha)} ha`],
    [`Área Painel Frontal:`, `${formatM2(planejamento.resultados.area_painel_m2)} m²`],
  ];

  resultadosData.forEach(([label, value]) => {
    doc.setFont('Helvetica', 'bold');
    doc.text(label, margemEsquerda, posY);
    doc.setFont('Helvetica', 'normal');
    doc.text(String(value), margemEsquerda + 60, posY);
    posY += 6;
  });

  posY += 4;

  // ===== SEÇÃO DISTRIBUIÇÃO POR CULTURA =====
  if (planejamento.resultados.categorias_calculo.length > 0) {
    if (posY > 200) {
      doc.addPage();
      posY = 20;
    }

    adicionarSecao(doc, 'DISTRIBUIÇÃO POR CATEGORIA', cor_verde, margemEsquerda, posY);
    posY += 8;

    const distribuicaoData = planejamento.resultados.categorias_calculo
      .filter((cat) => cat.quantidade_cabecas > 0)
      .sort((a, b) => b.participacao_pct - a.participacao_pct)
      .map((cat) => [
        cat.nome,
        String(cat.quantidade_cabecas),
        formatTon(cat.demanda_ms_ton),
        formatPercent(cat.participacao_pct),
      ]);

    autoTable(doc, {
      startY: posY,
      margin: { left: margemEsquerda, right: margemEsquerda },
      head: [['Categoria', 'Cabeças', 'Demanda MS', 'Participação']],
      body: distribuicaoData,
      theme: 'grid',
      headStyles: {
        fillColor: hexToRgb(cor_verde),
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 10,
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    });

    posY = (doc as any).lastAutoTable.finalY + 10;
  }

  // ===== SEÇÃO PAINEL FRONTAL =====
  if (posY > 200) {
    doc.addPage();
    posY = 20;
  }

  adicionarSecao(doc, 'PAINEL FRONTAL', cor_verde, margemEsquerda, posY);
  posY += 8;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    `Área máxima do painel: ${formatM2(planejamento.resultados.area_painel_m2)} m²`,
    margemEsquerda,
    posY
  );
  posY += 7;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Exemplos de dimensão:', margemEsquerda, posY);
  posY += 5;

  const exemplos = gerarExemplosDimensaoPainel(
    planejamento.resultados.area_painel_m2
  );
  exemplos.forEach((ex) => {
    doc.text(
      `• ${ex.largura.toFixed(1)} m × ${ex.altura.toFixed(1)} m = ${formatM2(ex.area)} m²`,
      margemEsquerda + 5,
      posY
    );
    posY += 5;
  });

  posY += 5;

  // ===== FOOTER =====
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const totalPaginas = (doc as any).internal.pages.length - 1;
  doc.text(
    `Gerado por GestSilo Pro — Página 1 de ${totalPaginas}`,
    margemEsquerda,
    doc.internal.pageSize.getHeight() - 10
  );

  // Salvar PDF
  doc.save(`planejamento-${planejamento.nome}.pdf`);
}

/**
 * Adiciona uma seção com título e linha horizontal
 */
function adicionarSecao(
  doc: jsPDF,
  titulo: string,
  cor: string,
  x: number,
  y: number
): void {
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(cor));
  doc.text(titulo, x, y);

  // Linha
  doc.setDrawColor(...hexToRgb(cor));
  doc.setLineWidth(0.5);
  doc.line(x, y + 2, x + 150, y + 2);

  doc.setTextColor(0, 0, 0);
}

/**
 * Converte hex para RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const resultado = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!resultado) {
    return [0, 166, 81]; // Verde padrão
  }
  return [
    parseInt(resultado[1], 16),
    parseInt(resultado[2], 16),
    parseInt(resultado[3], 16),
  ];
}
