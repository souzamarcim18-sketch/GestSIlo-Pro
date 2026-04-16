/**
 * Tipos e interfaces compartilhadas do módulo de calculadoras agrônomicas.
 * Fonte: SPEC-calculadoras.md v1.1
 */

// ========== MÉTODOS DE CALAGEM ==========
/** 5 métodos de cálculo de calagem suportados */
export type MetodoCalagemType =
  | 'saturacao'   // Saturação por Bases (V%)
  | 'al_ca_mg'    // Neutralização Al + Ca/Mg
  | 'mg_manual'   // Método Minas Gerais Manual
  | 'smp'         // Índice SMP (tabela interpolação)
  | 'ufla';       // Teor de Cálcio Desejado (UFLA)

// ========== CALAGEM ==========
export interface CalagemInput {
  metodo: MetodoCalagemType;
  // Comum
  area: string;      // em ha
  prnt: string;      // PRNT do calcário (%)
  // Campos variáveis por método
  al?: string;       // Al³⁺ (cmolc/dm³)
  ca?: string;       // Ca²⁺ (cmolc/dm³)
  mg?: string;       // Mg²⁺ (cmolc/dm³)
  ctc?: string;      // CTC(T) (cmolc/dm³)
  v1?: string;       // V% atual (%)
  v2?: string;       // V% desejado (%)
  ph_smp?: string;   // pH SMP (para método SMP)
  textura?: 'arenosa' | 'media' | 'argilosa'; // para SMP
  ca_desejado?: string; // Ca desejado (cmolc/dm³) para UFLA
  cultura?: string;  // Cultura (para UFLA)
}

export interface CalagemResult {
  nc: number;          // Necessidade de Calagem (t/ha)
  total: number;       // Total para a área (toneladas)
  metodo: MetodoCalagemType;
  validacoes?: string[]; // warnings/erros
  detalhe?: {          // detalhes do cálculo (para debug/laudo)
    formula?: string;
    etapas?: Record<string, number>;
  };
}

// ========== FERTILIZANTES ==========
export interface Fertilizante {
  id: string;
  nome: string;
  teor_n_percent: number;    // 0-50
  teor_p_percent: number;    // 0-60
  teor_k_percent: number;    // 0-60
  preco_saco_50kg: number;   // R$/saco de 50kg (como o produtor compra)
  unidade?: 'kg' | 'l' | 'sc' | 'ton';
  customizado: boolean;      // true se criado pelo usuário
}

export interface FertilizanteComDose {
  fertilizante: Fertilizante;
  dose_kg_ha: number;      // kg/ha recomendado
  sacos_por_ha: number;    // Math.ceil(dose_kg_ha / 50)
  total_sacos: number;     // sacos_por_ha × area
  custo_por_ha: number;    // dose_kg_ha × precoKg(fertilizante.preco_saco_50kg)
}

export interface FertilizanteCombinacao {
  fertilizantes: FertilizanteComDose[];
  custoTotal_r_ha: number;
  nutrientes_fornecidos: {
    n: number;   // kg N/ha fornecido
    p: number;   // kg P₂O₅/ha fornecido
    k: number;   // kg K₂O/ha fornecido
  };
  margemErro: {
    n_percent: number;  // % acima da meta (-10 a +10 aceitável)
    p_percent: number;
    k_percent: number;
  };
  viavel: boolean; // true se atende margem de erro
}

// ========== NPK ==========
export interface NPKInput {
  n_nec: string;        // N necessário (kg/ha)
  p_nec: string;        // P₂O₅ necessário (kg/ha)
  k_nec: string;        // K₂O necessário (kg/ha)
  area: string;         // Área (ha)
  modo?: 'simples' | 'otimizado'; // modo de cálculo (default: 'simples')
  fertilizantes_selecionados?: string[]; // IDs dos fertilizantes a testar
}

export interface NPKResult {
  modo: 'simples' | 'otimizado';
  dosePorHa: number;    // kg/ha (para modo simples)
  total: number;        // toneladas totais
  fertNome: string;     // nome do fertilizante (modo simples)
  // Modo otimizado:
  top5?: FertilizanteCombinacao[];
  melhorOpcao?: FertilizanteCombinacao;
  custoPorHa?: number;  // R$/ha (modo otimizado)
  custoTotal?: number;  // R$ total para a área
}

// ========== SAÍDAS GENÉRICAS ==========
export interface ResultadoCalculadora {
  calculadora: 'calagem' | 'npk';
  timestamp: Date;
  input: CalagemInput | NPKInput;
  output: CalagemResult | NPKResult;
}
