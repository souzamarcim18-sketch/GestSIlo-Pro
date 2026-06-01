/**
 * Paleta de impressão GestSilo — fundo claro (branco).
 * Espelha os brand tokens de globals.css, adaptados para relatórios impressos.
 * É a ÚNICA fonte de cor para PDF (jsPDF) e Excel (ExcelJS).
 *
 * Convenções:
 *   hex  → string "#RRGGBB"      usada pelo jsPDF (setTextColor, setFillColor)
 *   rgb  → [R, G, B]             usada pelo jsPDF autoTable (headStyles.fillColor)
 *   argb → "FFRRGGBB"            usada pelo ExcelJS (Fill / Font color)
 */

// ─── Brand (fixos — de globals.css :root) ────────────────────────────────────
export const BRAND_PRIMARY_HEX = '#00843D'; // --brand-green-primary
export const BRAND_PRIMARY_RGB: [number, number, number] = [0, 132, 61];
export const BRAND_PRIMARY_ARGB = 'FF00843D';

export const BRAND_VIVID_HEX = '#00A651';  // --brand-green-vivid
export const BRAND_VIVID_RGB: [number, number, number] = [0, 166, 81];
export const BRAND_VIVID_ARGB = 'FF00A651';

export const BRAND_SOFT_HEX = '#BBF7D0';   // --brand-green-soft
export const BRAND_SOFT_ARGB = 'FFBBF7D0';

// ─── Fundo e texto (impressão — fundo claro) ─────────────────────────────────
export const PAGE_BG_HEX = '#FFFFFF';
export const PAGE_BG_ARGB = 'FFFFFFFF';

export const TEXT_DARK_HEX = '#111111';    // corpo de tabelas
export const TEXT_DARK_ARGB = 'FF111111';

export const TEXT_MUTED_HEX = '#555555';   // subtítulos, rodapé
export const TEXT_MUTED_ARGB = 'FF555555';

// ─── Cabeçalho de tabela (verde de marca + texto branco) ─────────────────────
export const TABLE_HEADER_FILL_HEX = '#00843D';
export const TABLE_HEADER_FILL_RGB: [number, number, number] = [0, 132, 61];
export const TABLE_HEADER_FILL_ARGB = 'FF00843D';

export const TABLE_HEADER_TEXT_HEX = '#FFFFFF';
export const TABLE_HEADER_TEXT_RGB: [number, number, number] = [255, 255, 255];
export const TABLE_HEADER_TEXT_ARGB = 'FFFFFFFF';

// ─── Zebra (linhas alternadas — verde claríssimo, imprime bem) ────────────────
export const ROW_ZEBRA_HEX = '#F2F7F4';
export const ROW_ZEBRA_RGB: [number, number, number] = [242, 247, 244];
export const ROW_ZEBRA_ARGB = 'FFF2F7F4';

// ─── Linha divisória / borda ──────────────────────────────────────────────────
export const BORDER_HEX = '#CCCCCC';
export const BORDER_ARGB = 'FFCCCCCC';

// ─── Cabeçalho do relatório (fundo CLARO — logo destaca sobre branco) ────────
// Faixa de fundo no topo do documento: branco com borda inferior verde
export const REPORT_HEADER_FILL_HEX = '#FFFFFF';
export const REPORT_HEADER_FILL_RGB: [number, number, number] = [255, 255, 255];
export const REPORT_HEADER_FILL_ARGB = 'FFFFFFFF';

// Linha divisória inferior da faixa (verde de marca)
export const REPORT_HEADER_ACCENT_HEX = '#00843D';
export const REPORT_HEADER_ACCENT_RGB: [number, number, number] = [0, 132, 61];

// Título do relatório (verde escuro sobre fundo branco)
export const REPORT_HEADER_TEXT_HEX = '#023c1f'; // --brand-green-deep
export const REPORT_HEADER_TEXT_ARGB = 'FF023C1F';

// Subtexto (fazenda, período) — cinza discreto
export const REPORT_HEADER_SUBTEXT_HEX = '#555555';
export const REPORT_HEADER_SUBTEXT_ARGB = 'FF555555';

// Faixa de metadados (linha 2 do Excel) — verde muito claro
export const REPORT_META_FILL_ARGB = 'FFE8F5EE';

// ─── Título de seção (texto interno ao documento) ────────────────────────────
export const SECTION_TITLE_HEX = '#00843D';
export const SECTION_TITLE_ARGB = 'FF00843D';

// ─── Fonte padrão dos relatórios ─────────────────────────────────────────────
export const FONT_FAMILY = 'Helvetica' as const;

// ─── Dimensões padrão PDF (mm) ────────────────────────────────────────────────
export const PDF_MARGIN = 14;
export const PDF_HEADER_HEIGHT = 32;   // altura da faixa de cabeçalho
export const PDF_HEADER_ACCENT_H = 1;  // espessura da linha divisória inferior (mm)
// Logo: proporção real 9388×2222 ≈ 4.225:1 — altura 10mm → largura 42mm
export const PDF_LOGO_HEIGHT = 10;
export const PDF_LOGO_WIDTH = 42;
export const PDF_FIRST_CONTENT_Y = PDF_HEADER_HEIGHT + 8; // posY após o cabeçalho

// ─── Dimensões Excel ──────────────────────────────────────────────────────────
export const EXCEL_HEADER_ROW_HEIGHT = 42; // altura em pontos da linha de cabeçalho principal
export const EXCEL_SUBHEADER_ROW_HEIGHT = 18;
// Logo: proporção real 9388×2222 ≈ 4.225:1 — height 32px → width 135px
export const EXCEL_LOGO_HEIGHT = 32;
export const EXCEL_LOGO_WIDTH = 135;
