/**
 * Calculadora de Calagem - 5 Métodos
 * Implementa funções puras de cálculo para otimização de corretivos.
 * Fonte: SPEC-calculadoras.md v1.1
 */

import { CalagemInput, CalagemResult, MetodoCalagemType } from './tipos-calculadoras';
import { tabelaSMP, tabelaCaDesejadoUFLA } from './smp-tabela';

// ========== MÉTODO 1: Saturação por Bases (V%) ==========
function calcularSaturacao(data: CalagemInput): CalagemResult | null {
  const v1 = parseFloat(data.v1 || '0');
  const v2 = parseFloat(data.v2 || '0');
  const ctc = parseFloat(data.ctc || '0');
  const prnt = parseFloat(data.prnt || '80');
  const area = parseFloat(data.area || '0');

  if (!prnt || !area || ctc <= 0) return null;

  // NC = (CTC × (V2 - V1) / 100) / (PRNT / 100)
  const nc = v2 > v1 ? (ctc * (v2 - v1) / 100) / (prnt / 100) : 0;

  const nces = Math.max(0, nc);
  const total = nces * area;

  return {
    nc: nces,
    total,
    metodo: 'saturacao',
    validacoes: v2 <= v1 ? ['V2 deve ser maior que V1'] : [],
    detalhe: {
      formula: '((V2 - V1) × CTC) / (PRNT / 100)',
      etapas: {
        'V2 - V1': v2 - v1,
        CTC: ctc,
        'PRNT/100': prnt / 100,
        'NC (t/ha)': nces,
      },
    },
  };
}

// ========== MÉTODO 2: Neutralização Al + Ca/Mg ==========
function calcularAlCaMg(data: CalagemInput): CalagemResult | null {
  const al = parseFloat(data.al || '0');
  const ca = parseFloat(data.ca || '0');
  const mg = parseFloat(data.mg || '0');
  const prnt = parseFloat(data.prnt || '80');
  const area = parseFloat(data.area || '0');

  if (!prnt || !area) return null;

  // NC = (Al × 2 + max(0, 2 - (Ca + Mg))) / (PRNT / 100)
  const ncNecessario =
    (al * 2 + Math.max(0, 2 - (ca + mg))) / (prnt / 100);
  const nc = Math.max(0, ncNecessario);
  const total = nc * area;

  return {
    nc,
    total,
    metodo: 'al_ca_mg',
    detalhe: {
      formula: '(Al × 2 + max(0, 2 - (Ca + Mg))) / (PRNT / 100)',
      etapas: {
        Al: al,
        'Ca + Mg': ca + mg,
        'Deficiência Ca/Mg': Math.max(0, 2 - (ca + mg)),
        'Al × 2 + defic': al * 2 + Math.max(0, 2 - (ca + mg)),
        'NC (t/ha)': nc,
      },
    },
  };
}

// ========== MÉTODO 3: Minas Gerais Manual (Al + Ca+Mg) ==========
function calcularMGManual(data: CalagemInput): CalagemResult | null {
  const al = parseFloat(data.al || '0');
  const ca = parseFloat(data.ca || '0');
  const mg = parseFloat(data.mg || '0');
  const prnt = parseFloat(data.prnt || '80');
  const area = parseFloat(data.area || '0');

  if (!prnt || !area) return null;

  // NC = max(0, 3×Al + (2 - (Ca+Mg))) / (PRNT / 100)
  const numerador = Math.max(0, 3 * al + (2 - (ca + mg)));
  const nc = numerador / (prnt / 100);
  const total = nc * area;

  return {
    nc,
    total,
    metodo: 'mg_manual',
    detalhe: {
      formula: 'max(0, 3×Al + (2 - (Ca+Mg))) / (PRNT / 100)',
      etapas: {
        '3 × Al': 3 * al,
        'Ca + Mg': ca + mg,
        Deficiência: 2 - (ca + mg),
        Numerador: numerador,
        'NC (t/ha)': nc,
      },
    },
  };
}

// ========== MÉTODO 4: Índice SMP (tabela interpolação) ==========
function calcularSMP(data: CalagemInput): CalagemResult | null {
  const ph_smp = parseFloat(data.ph_smp || '0');
  const textura = data.textura || 'media';
  const prnt = parseFloat(data.prnt || '80');
  const area = parseFloat(data.area || '0');

  if (!prnt || !area || ph_smp <= 0 || ph_smp > 8) {
    return {
      nc: 0,
      total: 0,
      metodo: 'smp',
      validacoes: ['pH SMP deve estar entre 0 e 8'],
    };
  }

  // Interpolação na tabela SMP
  const nc = interpolarTabelaSMP(ph_smp, textura);
  const total = nc * area;

  return {
    nc,
    total,
    metodo: 'smp',
    detalhe: {
      formula: 'Interpolação de tabela SMP (laboratório EMBRAPA)',
      etapas: {
        'pH SMP': ph_smp,
        Textura: textura === 'arenosa' ? 1 : textura === 'media' ? 2 : 3,
        'NC interpolado': nc,
      },
    },
  };
}

// Função de interpolação linear para tabela SMP
function interpolarTabelaSMP(
  ph_smp: number,
  textura: 'arenosa' | 'media' | 'argilosa'
): number {
  const tabela = tabelaSMP[textura];
  // Buscar o intervalo correto e interpolar linearmente
  for (let i = 0; i < tabela.length - 1; i++) {
    if (ph_smp >= tabela[i].ph_smp && ph_smp <= tabela[i + 1].ph_smp) {
      const x0 = tabela[i].ph_smp,
        y0 = tabela[i].nc;
      const x1 = tabela[i + 1].ph_smp,
        y1 = tabela[i + 1].nc;
      // y = y0 + (x - x0) * (y1 - y0) / (x1 - x0)
      return y0 + ((ph_smp - x0) * (y1 - y0)) / (x1 - x0);
    }
  }
  // Se fora dos limites, retornar o mais próximo
  return ph_smp < tabela[0].ph_smp
    ? tabela[0].nc
    : tabela[tabela.length - 1].nc;
}

// ========== MÉTODO 5: UFLA (Teor de Cálcio Desejado) ==========
function calcularUFLA(data: CalagemInput): CalagemResult | null {
  const ca_atual = parseFloat(data.ca || '0');
  const cultura = data.cultura || 'milho';
  const prnt = parseFloat(data.prnt || '80');
  const area = parseFloat(data.area || '0');

  if (!prnt || !area) {
    return {
      nc: 0,
      total: 0,
      metodo: 'ufla',
      validacoes: ['PRNT e área obrigatórios'],
    };
  }

  const ca_desejado = tabelaCaDesejadoUFLA[cultura] || 5; // default milho = 5 cmolc/dm³
  const deficiencia = Math.max(0, ca_desejado - ca_atual);

  // NC = (Ca_desejado - Ca_atual) / (PRNT / 100)
  const nc = deficiencia / (prnt / 100);
  const total = nc * area;

  return {
    nc,
    total,
    metodo: 'ufla',
    validacoes:
      ca_desejado <= ca_atual ? ['Ca atual já atende ao desejado'] : [],
    detalhe: {
      formula: '(Ca_desejado - Ca_atual) / (PRNT / 100)',
      etapas: {
        'Ca desejado (cultura)': ca_desejado,
        'Ca atual': ca_atual,
        Deficiência: deficiencia,
        'NC (t/ha)': nc,
      },
    },
  };
}

// ========== ORQUESTRADOR PRINCIPAL ==========
export function calcularCalagem(data: CalagemInput): CalagemResult | null {
  const prnt = parseFloat(data.prnt || '80');
  const area = parseFloat(data.area || '0');

  // Validação obrigatória
  if (!prnt || !area) return null;
  if (area <= 0 || prnt <= 0 || prnt > 100) {
    return {
      nc: 0,
      total: 0,
      metodo: data.metodo,
      validacoes: ['PRNT deve estar entre 0-100% e área > 0'],
    };
  }

  // Despachar por método
  switch (data.metodo) {
    case 'saturacao':
      return calcularSaturacao(data);
    case 'al_ca_mg':
      return calcularAlCaMg(data);
    case 'mg_manual':
      return calcularMGManual(data);
    case 'smp':
      return calcularSMP(data);
    case 'ufla':
      return calcularUFLA(data);
    default:
      return null;
  }
}

// Export das funções individuais para testes
export {
  calcularSaturacao,
  calcularAlCaMg,
  calcularMGManual,
  calcularSMP,
  calcularUFLA,
  interpolarTabelaSMP,
};
