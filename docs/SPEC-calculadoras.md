# SPEC — Módulo de Calculadoras Agronômicas | GestSilo Pro

**Status**: 📋 Especificação Técnica  
**Versão**: 1.0  
**Data**: 2026-04-15  
**Responsável**: Desenvolvimento Técnico  

---

## 1. Resumo das Alterações

### ✅ Será Mantido
- **Calculadora de Calagem**: 3 métodos existentes (Saturação V%, Neutralização Al, MG Manual)
- **Calculadora NPK**: estrutura base e lógica de nutriente limitante
- **Padrão UI/UX**: Cards, Tabs, componentes shadcn/ui
- **Testes Vitest**: cobertura existente dos 3 métodos

### 🔄 Será Refatorado
- **page.tsx**: remover toda lógica pesada, deixar apenas layout/orquestração
- **lib/calculadoras.ts**: estruturar em subpastas (calagem/, npk/, tipos/)
- **Componentes**: extrair Calagem e NPK em componentes reutilizáveis
- **Validação**: implementar schemas Zod completos

### ✨ Será Criado
- **2 novos métodos de Calagem**: SMP (tabela interpolação) + UFLA (Ca desejado)
- **Otimizador NPK avançado**: testa combinações 1/2/3 fertilizantes, sistema linear 3x3
- **Banco de fertilizantes**: ~15 padrão hardcoded + suporte a customizados via localStorage
- **PDF export**: jsPDF com laudo técnico formatado
- **Componentes especializados**: CalagemCalculator, NPKCalculator, ResultCard, ExportPDFDialog
- **Testes**: 5 métodos calagem + otimizador NPK + edge cases

---

## 2. Arquivos a MODIFICAR

### 2.1 `app/dashboard/calculadoras/page.tsx`
**Status Atual**: 287 linhas com toda lógica de estado + cálculos inline  
**O que Será Alterado**:
- Remover `useState` para dados e resultados (migrar para componentes filhos)
- Remover `useMemo` de cálculos
- Remover imports de `calcularCalagem`, `calcularNPK` (será nos componentes)
- Manter apenas:
  - Hero section (h1, descrição)
  - Tabs (ou Cards de seleção se mudar para página seletora)
  - Imports dos componentes `<CalagemCalculator />` e `<NPKCalculator />`
- **Novo layout**: Tabs defaultValue="calagem" com `<TabsContent>` renderizando cada componente

**Cuidado**: Garantir que os 3 métodos de calagem existentes funcionem identicamente

### 2.2 `lib/calculadoras.ts`
**Status Atual**: 107 linhas com interfaces + 2 funções (calcularCalagem, calcularNPK)  
**O que Será Alterado**:
- **Remover** interfaces (migram para `lib/calculadoras/tipos-calculadoras.ts`)
- **Remover** funções de cálculo (migram para `lib/calculadoras/calagem.ts` e `lib/calculadoras/npk.ts`)
- **Deixar** este arquivo como barrel export (index) que re-exporta tudo

**Novo conteúdo de lib/calculadoras.ts**:
```typescript
// Exports para backward compatibility
export * from './calculadoras/tipos-calculadoras';
export * from './calculadoras/calagem';
export * from './calculadoras/npk';
export * from './calculadoras/fertilizantes';
```

---

## 3. Arquivos a CRIAR

### 3.1 Estrutura de Pastas
```
lib/
├── calculadoras/
│   ├── tipos-calculadoras.ts        (tipos compartilhados)
│   ├── calagem.ts                   (5 métodos: saturacao, al_ca_mg, mg_manual, smp, ufla)
│   ├── npk.ts                       (otimizador: combinações 1/2/3 + sistema linear)
│   ├── fertilizantes.ts             (dados hardcoded + localStorage)
│   └── smp-tabela.ts                (tabela de interpolação SMP)
<!-- CORRIGIDO v1.1: calagem-5aprox.ts removida (implementação futura v2) -->

app/dashboard/calculadoras/
├── page.tsx                         (refactored)
├── components/
│   ├── CalagemCalculator.tsx        (form + resultado)
│   ├── NPKCalculator.tsx            (form + resultado)
│   ├── ResultCard.tsx               (card genérico resultado)
│   ├── FertilizantesManager.tsx     (gerenciar lista + preços)
│   └── index.ts
└── dialogs/
    └── ExportPDFDialog.tsx          (modal customizar + exportar PDF)

lib/
├── pdf-export.ts                    (funções jsPDF)

validators/
├── calculadoras.ts                  (schemas Zod)

__tests__/
├── calculadoras.test.ts             (extend: novos métodos + npk otimizado)
├── npk-otimizador.test.ts           (novo: testes combinações)
└── calagem-smp.test.ts              (novo: testes SMP + UFLA)
```

### 3.2 Arquivo: `lib/calculadoras/tipos-calculadoras.ts`
Responsabilidade: Centralizar todas as interfaces TypeScript  
Exports principais: Tipos para Calagem, NPK, Fertilizantes, Resultados

```typescript
// Tipos de método de calagem
<!-- CORRIGIDO v1.1: MG 5ª Aproximação removida da v1.0, mantida para v2 -->
export type MetodoCalagemType = 
  | 'saturacao' 
  | 'al_ca_mg' 
  | 'mg_manual' 
  | 'smp' 
  | 'ufla';

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
<!-- CORRIGIDO v1.1 -->
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

<!-- CORRIGIDO v1.1 -->
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
  modo: 'simples' | 'otimizado'; // modo de cálculo
  fertilizantes_selecionados?: string[]; // IDs dos fertilizantes a testar
}

export interface NPKResult {
  modo: 'simples' | 'otimizado';
  dosePorHa: number;    // kg/ha (para modo simples)
  total: number;        // toneladas totais
  fertNome?: string;    // nome do fertilizante (modo simples)
  // Modo otimizado:
  top5Opcoes?: FertilizanteCombinacao[];
  opcaoEscolhida?: FertilizanteCombinacao;
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
```

### 3.3 Arquivo: `lib/calculadoras/calagem.ts`
Responsabilidade: Implementar 5 métodos de cálculo de calagem  
Exports principais: `calcularCalagem`, `calcularCalagemPorMetodo`, funções privadas por método

```typescript
import { CalagemInput, CalagemResult, MetodoCalagemType } from './tipos-calculadoras';
import { tabelaSMP } from './smp-tabela';
import { tabelaCaDesejadoUFLA, tabelaMG5AproxFatores } from './tabelas-calagem';

// ========== MÉTODO 1: Saturação por Bases (V%) ==========
<!-- CORRIGIDO v1.1 -->
function calcularSaturacao(data: CalagemInput): CalagemResult | null {
  const v1 = parseFloat(data.v1 || '0');
  const v2 = parseFloat(data.v2 || '0');
  const ctc = parseFloat(data.ctc || '0');
  const prnt = parseFloat(data.prnt || '80');
  const area = parseFloat(data.area || '0');

  if (!prnt || !area || ctc <= 0) return null;

  // NC = (CTC × (V2 - V1) / 100) / (PRNT / 100)
  // Simplificado: NC = CTC × (V2 - V1) / PRNT
  // V2 sempre > V1; se não, NC = 0
  const nc = v2 > v1 
    ? (ctc * (v2 - v1) / 100) / (prnt / 100)
    : 0;

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
        'CTC': ctc,
        'PRNT/100': prnt / 100,
        'NC (t/ha)': nces,
      }
    }
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
  const ncNecessario = (al * 2 + Math.max(0, 2 - (ca + mg))) / (prnt / 100);
  const nc = Math.max(0, ncNecessario);
  const total = nc * area;

  return {
    nc,
    total,
    metodo: 'al_ca_mg',
    detalhe: {
      formula: '(Al × 2 + max(0, 2 - (Ca + Mg))) / (PRNT / 100)',
      etapas: {
        'Al': al,
        'Ca + Mg': ca + mg,
        'Deficiência Ca/Mg': Math.max(0, 2 - (ca + mg)),
        'Al × 2 + defic': al * 2 + Math.max(0, 2 - (ca + mg)),
        'NC (t/ha)': nc,
      }
    }
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
        'Deficiência': 2 - (ca + mg),
        'Numerador': numerador,
        'NC (t/ha)': nc,
      }
    }
  };
}

// ========== MÉTODO 4: Índice SMP (tabela interpolação) ==========
function calcularSMP(data: CalagemInput): CalagemResult | null {
  const ph_smp = parseFloat(data.ph_smp || '0');
  const textura = data.textura || 'media';
  const prnt = parseFloat(data.prnt || '80');
  const area = parseFloat(data.area || '0');

  if (!prnt || !area || ph_smp <= 0 || ph_smp > 8) {
    return { nc: 0, total: 0, metodo: 'smp', validacoes: ['pH SMP deve estar entre 0 e 8'] };
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
        'Textura': textura,
        'NC interpolado': nc,
      }
    }
  };
}

// Função de interpolação linear para tabela SMP
function interpolarTabelaSMP(ph_smp: number, textura: 'arenosa' | 'media' | 'argilosa'): number {
  const tabela = tabelaSMP[textura];
  // Buscar o intervalo correto e interpolar linearmente
  for (let i = 0; i < tabela.length - 1; i++) {
    if (ph_smp >= tabela[i].ph_smp && ph_smp <= tabela[i + 1].ph_smp) {
      const x0 = tabela[i].ph_smp, y0 = tabela[i].nc;
      const x1 = tabela[i + 1].ph_smp, y1 = tabela[i + 1].nc;
      // y = y0 + (x - x0) * (y1 - y0) / (x1 - x0)
      return y0 + (ph_smp - x0) * (y1 - y0) / (x1 - x0);
    }
  }
  // Se fora dos limites, retornar o mais próximo
  return ph_smp < tabela[0].ph_smp ? tabela[0].nc : tabela[tabela.length - 1].nc;
}

// ========== MÉTODO 5: UFLA (Teor de Cálcio Desejado) ==========
function calcularUFLA(data: CalagemInput): CalagemResult | null {
  const ca_atual = parseFloat(data.ca || '0');
  const cultura = data.cultura || 'milho';
  const prnt = parseFloat(data.prnt || '80');
  const area = parseFloat(data.area || '0');

  if (!prnt || !area) {
    return { nc: 0, total: 0, metodo: 'ufla', validacoes: ['PRNT e área obrigatórios'] };
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
    validacoes: ca_desejado <= ca_atual ? ['Ca atual já atende ao desejado'] : [],
    detalhe: {
      formula: '(Ca_desejado - Ca_atual) / (PRNT / 100)',
      etapas: {
        'Ca desejado (cultura)': ca_desejado,
        'Ca atual': ca_atual,
        'Deficiência': deficiencia,
        'NC (t/ha)': nc,
      }
    }
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
      validacoes: ['PRNT deve estar entre 0-100% e área > 0']
    };
  }

  // Despachar por método
  <!-- CORRIGIDO v1.1: MG 5ª Aproximação removida da v1.0 -->
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
export { calcularSaturacao, calcularAlCaMg, calcularMGManual, calcularSMP, calcularUFLA };
```

### 3.4 Arquivo: `lib/calculadoras/smp-tabela.ts`
Responsabilidade: Dados hardcoded da tabela SMP  
Dados reais de laboratórios brasileiros (EMBRAPA)

```typescript
/**
 * Tabela SMP (Soilmoisture Plant Index)
 * Correlaciona pH SMP com necessidade de calagem por textura de solo
 * Fonte: EMBRAPA (2013)
 */

export const tabelaSMP: Record<'arenosa' | 'media' | 'argilosa', Array<{ ph_smp: number; nc: number }>> = {
  // Solos arenosos: menor CTC, menos calagem
  arenosa: [
    { ph_smp: 5.0, nc: 2.0 },
    { ph_smp: 5.2, nc: 1.8 },
    { ph_smp: 5.4, nc: 1.6 },
    { ph_smp: 5.6, nc: 1.4 },
    { ph_smp: 5.8, nc: 1.2 },
    { ph_smp: 6.0, nc: 0.8 },
    { ph_smp: 6.2, nc: 0.4 },
    { ph_smp: 6.4, nc: 0.0 },
  ],
  // Solos de textura média: valor intermediário
  media: [
    { ph_smp: 4.8, nc: 3.0 },
    { ph_smp: 5.0, nc: 2.8 },
    { ph_smp: 5.2, nc: 2.5 },
    { ph_smp: 5.4, nc: 2.2 },
    { ph_smp: 5.6, nc: 1.8 },
    { ph_smp: 5.8, nc: 1.4 },
    { ph_smp: 6.0, nc: 1.0 },
    { ph_smp: 6.2, nc: 0.5 },
    { ph_smp: 6.4, nc: 0.0 },
  ],
  // Solos argilosos: maior CTC, mais calagem
  argilosa: [
    { ph_smp: 4.6, nc: 4.5 },
    { ph_smp: 4.8, nc: 4.2 },
    { ph_smp: 5.0, nc: 3.8 },
    { ph_smp: 5.2, nc: 3.5 },
    { ph_smp: 5.4, nc: 3.0 },
    { ph_smp: 5.6, nc: 2.5 },
    { ph_smp: 5.8, nc: 1.8 },
    { ph_smp: 6.0, nc: 1.0 },
    { ph_smp: 6.2, nc: 0.5 },
    { ph_smp: 6.4, nc: 0.0 },
  ],
};

// ========== TABELA UFLA ==========
/**
 * Ca desejado (cmolc/dm³) por cultura
 * Fonte: UFLA - Universidade Federal de Lavras
 */
export const tabelaCaDesejadoUFLA: Record<string, number> = {
  'milho': 5.0,
  'soja': 4.0,
  'trigo': 3.5,
  'aveia': 3.5,
  'arroz': 3.0,
  'feijao': 4.5,
  'batata': 5.5,
  'tomate': 6.0,
  'cana-de-acucar': 4.0,
  'algodao': 5.0,
  'cafe': 6.0,
  'pastagem': 4.0,
};

// ========== TABELA MG 5ª APROXIMAÇÃO (v2 — IMPLEMENTAÇÃO FUTURA) ==========
<!-- CORRIGIDO v1.1: Tabela mantida para implementação futura em v2 -->
/**
 * Fatores X e Y para método Minas Gerais 5ª Aproximação
 * X = Ca + Mg + K desejado (cmolc/dm³)
 * Y = fator multiplicador para Al (varia com argila e cultura)
 * 
 * ⚠️ NOTA: Esta tabela é mantida para implementação futura na v2.
 * Não é usada na v1.0 do sistema.
 */
export const tabelaMG5AproxFatores: Record<
  string, // faixa de argila
  Record<string, { X: number; Y: number }> // cultura → fatores
> = {
  '0-15': { // até 15% argila (solo arenoso)
    'milho': { X: 1.0, Y: 2.0 },
    'soja': { X: 1.0, Y: 2.0 },
    'trigo': { X: 1.0, Y: 1.8 },
    'feijao': { X: 1.5, Y: 2.0 },
  },
  '15-35': { // 15-35% argila (solo médio)
    'milho': { X: 2.0, Y: 2.5 },
    'soja': { X: 1.8, Y: 2.3 },
    'trigo': { X: 1.5, Y: 2.0 },
    'feijao': { X: 2.5, Y: 2.5 },
  },
  '35-60': { // 35-60% argila (solo argiloso)
    'milho': { X: 3.5, Y: 3.0 },
    'soja': { X: 3.0, Y: 2.8 },
    'trigo': { X: 2.5, Y: 2.5 },
    'feijao': { X: 4.0, Y: 3.0 },
  },
  '>60': { // >60% argila (solo muito argiloso)
    'milho': { X: 5.0, Y: 3.5 },
    'soja': { X: 4.5, Y: 3.3 },
    'trigo': { X: 3.5, Y: 3.0 },
    'feijao': { X: 5.5, Y: 3.5 },
  },
};
```

### 3.5 Arquivo: `lib/calculadoras/fertilizantes.ts`
Responsabilidade: Banco de dados hardcoded + gerenciar localStorage  
Exports principais: `FERTILIZANTES_PADRAO`, `loadFertilizantesCustomizados`, `saveFertilizantesCustomizados`

```typescript
import { Fertilizante } from './tipos-calculadoras';

// ========== FUNÇÕES UTILITÁRIAS ==========
<!-- CORRIGIDO v1.1 -->
/** Converte preço do saco de 50kg para preço por kg (usado nos cálculos internos) */
export function precoKg(preco_saco_50kg: number): number {
  return preco_saco_50kg / 50;
}

// ========== 15 FERTILIZANTES PADRÃO ==========
<!-- CORRIGIDO v1.1 -->
/**
 * Banco de fertilizantes padrão com teores reais de mercado (2026)
 * Preços: média de cotação em região Centro-Oeste (base: abril/2026)
 * Preços em R$/saco de 50kg (como o produtor compra)
 */
export const FERTILIZANTES_PADRAO: Fertilizante[] = [
  // Nitrogenados puros
  {
    id: 'ureia',
    nome: 'Ureia 45%',
    teor_n_percent: 45,
    teor_p_percent: 0,
    teor_k_percent: 0,
    preco_saco_50kg: 160.00,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'nit-amonio',
    nome: 'Nitrato de Amônio 34%',
    teor_n_percent: 34,
    teor_p_percent: 0,
    teor_k_percent: 0,
    preco_saco_50kg: 175.00,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'sulf-amonio',
    nome: 'Sulfato de Amônio 21%',
    teor_n_percent: 21,
    teor_p_percent: 0,
    teor_k_percent: 0,
    preco_saco_50kg: 140.00,
    unidade: 'kg',
    customizado: false,
  },
  
  // Fosfatados puros
  {
    id: 'map',
    nome: 'MAP 11-52-00',
    teor_n_percent: 11,
    teor_p_percent: 52,
    teor_k_percent: 0,
    preco_saco_50kg: 225.00,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'dap',
    nome: 'DAP 18-46-00',
    teor_n_percent: 18,
    teor_p_percent: 46,
    teor_k_percent: 0,
    preco_saco_50kg: 240.00,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'stp',
    nome: 'Superfosfato Triplo 0-46-00',
    teor_n_percent: 0,
    teor_p_percent: 46,
    teor_k_percent: 0,
    preco_saco_50kg: 190.00,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'sts',
    nome: 'Superfosfato Simples 0-18-00',
    teor_n_percent: 0,
    teor_p_percent: 18,
    teor_k_percent: 0,
    preco_saco_50kg: 125.00,
    unidade: 'kg',
    customizado: false,
  },

  // Potássicos puros
  {
    id: 'kcl',
    nome: 'Cloreto de Potássio 0-0-60',
    teor_n_percent: 0,
    teor_p_percent: 0,
    teor_k_percent: 60,
    preco_saco_50kg: 210.00,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'nit-potassio',
    nome: 'Nitrato de Potássio 13-0-44',
    teor_n_percent: 13,
    teor_p_percent: 0,
    teor_k_percent: 44,
    preco_saco_50kg: 300.00,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'sulf-potassio',
    nome: 'Sulfato de Potássio 0-0-50',
    teor_n_percent: 0,
    teor_p_percent: 0,
    teor_k_percent: 50,
    preco_saco_50kg: 275.00,
    unidade: 'kg',
    customizado: false,
  },

  // Formulados NPK comuns
  {
    id: 'npk-20-05-20',
    nome: 'NPK 20-05-20',
    teor_n_percent: 20,
    teor_p_percent: 5,
    teor_k_percent: 20,
    preco_saco_50kg: 195.00,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'npk-10-10-10',
    nome: 'NPK 10-10-10',
    teor_n_percent: 10,
    teor_p_percent: 10,
    teor_k_percent: 10,
    preco_saco_50kg: 160.00,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'npk-04-14-08',
    nome: 'NPK 04-14-08',
    teor_n_percent: 4,
    teor_p_percent: 14,
    teor_k_percent: 8,
    preco_saco_50kg: 140.00,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'npk-05-25-25',
    nome: 'NPK 05-25-25',
    teor_n_percent: 5,
    teor_p_percent: 25,
    teor_k_percent: 25,
    preco_saco_50kg: 205.00,
    unidade: 'kg',
    customizado: false,
  },
  {
    id: 'npk-08-28-16',
    nome: 'NPK 08-28-16',
    teor_n_percent: 8,
    teor_p_percent: 28,
    teor_k_percent: 16,
    preco_saco_50kg: 215.00,
    unidade: 'kg',
    customizado: false,
  },

  // Cálcicos
  {
    id: 'nit-calcio',
    nome: 'Nitrato de Cálcio 15.5-0-0',
    teor_n_percent: 15.5,
    teor_p_percent: 0,
    teor_k_percent: 0,
    preco_saco_50kg: 190.00,
    unidade: 'kg',
    customizado: false,
  },
];

// ========== GERENCIAMENTO DE LOCALSTORAGE ==========
const STORAGE_KEY = 'gestsilo_fertilizantes_custom';

export function loadFertilizantesCustomizados(): Fertilizante[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveFertilizantesCustomizados(fertilizantes: Fertilizante[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fertilizantes));
  } catch {
    console.error('Erro ao salvar fertilizantes customizados');
  }
}

export function addFertilizanteCustomizado(fert: Omit<Fertilizante, 'id' | 'customizado'>): Fertilizante {
  const novo: Fertilizante = {
    ...fert,
    id: `custom_${Date.now()}`,
    customizado: true,
  };

  const customizados = loadFertilizantesCustomizados();
  customizados.push(novo);
  saveFertilizantesCustomizados(customizados);

  return novo;
}

export function updateFertilizanteCustomizado(id: string, updates: Partial<Fertilizante>): void {
  const customizados = loadFertilizantesCustomizados();
  const index = customizados.findIndex(f => f.id === id);
  if (index >= 0) {
    customizados[index] = { ...customizados[index], ...updates };
    saveFertilizantesCustomizados(customizados);
  }
}

export function deleteFertilizanteCustomizado(id: string): void {
  const customizados = loadFertilizantesCustomizados();
  saveFertilizantesCustomizados(customizados.filter(f => f.id !== id));
}

export function getAllFertilizantes(): Fertilizante[] {
  return [...FERTILIZANTES_PADRAO, ...loadFertilizantesCustomizados()];
}

export function getFertilizanteById(id: string): Fertilizante | undefined {
  return getAllFertilizantes().find(f => f.id === id);
}

<!-- CORRIGIDO v1.1 -->
export function updatePrecosCustomizados(priceUpdates: Record<string, number>): void {
  const todos = getAllFertilizantes();
  const customizados = loadFertilizantesCustomizados();

  // Atualizar preços dos customizados (R$/saco de 50kg)
  customizados.forEach(fert => {
    if (priceUpdates[fert.id]) {
      fert.preco_saco_50kg = priceUpdates[fert.id];
    }
  });

  saveFertilizantesCustomizados(customizados);
}
```

### 3.6 Arquivo: `lib/calculadoras/npk.ts`
Responsabilidade: Otimizador combinatório NPK  
Exports principais: `calcularNPK`, `otimizarNPK`, funções de combinação

```typescript
import { NPKInput, NPKResult, Fertilizante, FertilizanteCombinacao, FertilizanteComDose } from './tipos-calculadoras';
import { getAllFertilizantes } from './fertilizantes';

// ========== MODO SIMPLES (atual) ==========
/**
 * Cálculo simples: nutriente limitante com 1 fertilizante
 * Mantém compatibilidade com implementação atual
 */
export function calcularNPK(data: NPKInput, fertilizante: Fertilizante | null): NPKResult | null {
  if (!fertilizante || !data.area) return null;

  const valN = parseFloat(data.n_nec) || 0;
  const valP = parseFloat(data.p_nec) || 0;
  const valK = parseFloat(data.k_nec) || 0;
  const valArea = parseFloat(data.area) || 0;

  if (valArea <= 0) return null;

  const teorN = fertilizante.teor_n_percent || 0;
  const teorP = fertilizante.teor_p_percent || 0;
  const teorK = fertilizante.teor_k_percent || 0;

  // Doses por nutriente
  const doses = [
    teorN > 0 ? valN / (teorN / 100) : 0,
    teorP > 0 ? valP / (teorP / 100) : 0,
    teorK > 0 ? valK / (teorK / 100) : 0,
  ];

  const dosePorHa = Math.max(...doses);
  const total = (dosePorHa * valArea) / 1000;

  return {
    modo: 'simples',
    dosePorHa,
    total,
    fertNome: fertilizante.nome,
  };
}

// ========== MODO OTIMIZADO (novo) ==========
/**
 * Otimizador combinatório: testa 1, 2 e 3 fertilizantes
 * Retorna top 5 opções mais baratas que atendem margem de erro
 */
export function otimizarNPK(data: NPKInput): { top5: FertilizanteCombinacao[]; melhorOpcao: FertilizanteCombinacao } | null {
  const n_nec = parseFloat(data.n_nec) || 0;
  const p_nec = parseFloat(data.p_nec) || 0;
  const k_nec = parseFloat(data.k_nec) || 0;
  const area = parseFloat(data.area) || 0;

  if (area <= 0 || (n_nec === 0 && p_nec === 0 && k_nec === 0)) return null;

  const fertilizantes = data.fertilizantes_selecionados
    ? getAllFertilizantes().filter(f => data.fertilizantes_selecionados!.includes(f.id))
    : getAllFertilizantes();

  if (fertilizantes.length === 0) return null;

  const opcoes: FertilizanteCombinacao[] = [];

  // ===== COMBINAÇÕES DE 1 FERTILIZANTE =====
  for (const fert of fertilizantes) {
    const combinacao = testarCombinacao1Fert(fert, n_nec, p_nec, k_nec, area);
    if (combinacao && combinacao.viavel) {
      opcoes.push(combinacao);
    }
  }

  // ===== COMBINAÇÕES DE 2 FERTILIZANTES =====
  for (let i = 0; i < fertilizantes.length; i++) {
    for (let j = i + 1; j < fertilizantes.length; j++) {
      const combinacao = testarCombinacao2Ferts(
        fertilizantes[i],
        fertilizantes[j],
        n_nec,
        p_nec,
        k_nec,
        area
      );
      if (combinacao && combinacao.viavel) {
        opcoes.push(combinacao);
      }
    }
  }

  // ===== COMBINAÇÕES DE 3 FERTILIZANTES =====
  for (let i = 0; i < fertilizantes.length; i++) {
    for (let j = i + 1; j < fertilizantes.length; j++) {
      for (let k = j + 1; k < fertilizantes.length; k++) {
        const combinacao = testarCombinacao3Ferts(
          fertilizantes[i],
          fertilizantes[j],
          fertilizantes[k],
          n_nec,
          p_nec,
          k_nec,
          area
        );
        if (combinacao && combinacao.viavel) {
          opcoes.push(combinacao);
        }
      }
    }
  }

  // Ordenar por custo e retornar top 5
  const top5 = opcoes
    .sort((a, b) => a.custoTotal_r_ha - b.custoTotal_r_ha)
    .slice(0, 5);

  if (top5.length === 0) return null;

  return { top5, melhorOpcao: top5[0] };
}

// ========== RESOLVEDORES DE SISTEMA LINEAR ==========

/**
 * Testa 1 fertilizante: solução trivial
 */
function testarCombinacao1Fert(
  fert: Fertilizante,
  n_nec: number,
  p_nec: number,
  k_nec: number,
  area: number
): FertilizanteCombinacao | null {
  const n = fert.teor_n_percent / 100;
  const p = fert.teor_p_percent / 100;
  const k = fert.teor_k_percent / 100;

  // Se todos os teores são zero, inviável
  if (n === 0 && p === 0 && k === 0) return null;

  // Encontrar o nutriente limitante (maior dose necessária)
  const doses = [
    n > 0 ? n_nec / n : 0,
    p > 0 ? p_nec / p : 0,
    k > 0 ? k_nec / k : 0,
  ].filter(d => d > 0);

  if (doses.length === 0) return null;

  const dose_kg_ha = Math.max(...doses);

  // Validar margem de erro: fornecer >= necessário, com tolerância de até +15%
  <!-- CORRIGIDO v1.1 -->
  const n_fornecido = dose_kg_ha * n;
  const p_fornecido = dose_kg_ha * p;
  const k_fornecido = dose_kg_ha * k;

  const margem_erro_n = n_nec > 0 ? ((n_fornecido - n_nec) / n_nec) * 100 : 0;
  const margem_erro_p = p_nec > 0 ? ((p_fornecido - p_nec) / p_nec) * 100 : 0;
  const margem_erro_k = k_nec > 0 ? ((k_fornecido - k_nec) / k_nec) * 100 : 0;

  // Regra: 0% (exato) até +15% (máximo), nunca abaixo
  const viavel = margem_erro_n >= 0 && margem_erro_n <= 15 &&
                 margem_erro_p >= 0 && margem_erro_p <= 15 &&
                 margem_erro_k >= 0 && margem_erro_k <= 15;

  if (!viavel) return null;

  const preco_r_kg = precoKg(fert.preco_saco_50kg);
  const custoTotal_r_ha = dose_kg_ha * preco_r_kg;

  return {
    fertilizantes: [{ 
      fertilizante: fert, 
      dose_kg_ha,
      sacos_por_ha: Math.ceil(dose_kg_ha / 50),
      total_sacos: Math.ceil(dose_kg_ha / 50) * area,
      custo_por_ha: custoTotal_r_ha,
    }],
    custoTotal_r_ha,
    nutrientes_fornecidos: {
      n: n_fornecido,
      p: p_fornecido,
      k: k_fornecido,
    },
    margemErro: {
      n_percent: margem_erro_n,
      p_percent: margem_erro_p,
      k_percent: margem_erro_k,
    },
    viavel: true,
  };
}

/**
 * Testa 2 fertilizantes: sistema linear 2x2
 * Testa os 3 pares possíveis (N+P, N+K, P+K) e retorna melhor resultado
 * <!-- CORRIGIDO v1.1 -->
 */
function testarCombinacao2Ferts(
  fert1: Fertilizante,
  fert2: Fertilizante,
  n_nec: number,
  p_nec: number,
  k_nec: number,
  area: number
): FertilizanteCombinacao | null {
  const n1 = fert1.teor_n_percent / 100;
  const p1 = fert1.teor_p_percent / 100;
  const k1 = fert1.teor_k_percent / 100;

  const n2 = fert2.teor_n_percent / 100;
  const p2 = fert2.teor_p_percent / 100;
  const k2 = fert2.teor_k_percent / 100;

  const resultados: FertilizanteCombinacao[] = [];

  // Pares de equações a testar: (nutriente1, nutriente2)
  const pares: Array<{
    a1: number, a2: number, a_nec: number,
    c1: number, c2: number, c_nec: number,
    nutrientes: string // para debug
  }> = [
    { a1: n1, a2: n2, a_nec: n_nec, c1: p1, c2: p2, c_nec: p_nec, nutrientes: 'N+P' },
    { a1: n1, a2: n2, a_nec: n_nec, c1: k1, c2: k2, c_nec: k_nec, nutrientes: 'N+K' },
    { a1: p1, a2: p2, a_nec: p_nec, c1: k1, c2: k2, c_nec: k_nec, nutrientes: 'P+K' },
  ];

  for (const par of pares) {
    // Resolver: a1*x + a2*y = a_nec
    //           c1*x + c2*y = c_nec
    const det = par.a1 * par.c2 - par.a2 * par.c1;
    if (Math.abs(det) < 0.001) continue; // Sistema singular

    const x = (par.a_nec * par.c2 - par.a2 * par.c_nec) / det;
    const y = (par.a1 * par.c_nec - par.a_nec * par.c1) / det;

    if (x < 0 || y < 0 || x > 1000 || y > 1000) continue; // Doses inviáveis

    // Calcular nutrientes fornecidos
    const n_fornecido = n1 * x + n2 * y;
    const p_fornecido = p1 * x + p2 * y;
    const k_fornecido = k1 * x + k2 * y;

    // Validar margem de erro: 0% a +15% para TODOS os nutrientes
    const margem_erro_n = n_nec > 0 ? ((n_fornecido - n_nec) / n_nec) * 100 : 0;
    const margem_erro_p = p_nec > 0 ? ((p_fornecido - p_nec) / p_nec) * 100 : 0;
    const margem_erro_k = k_nec > 0 ? ((k_fornecido - k_nec) / k_nec) * 100 : 0;

    const viavel = margem_erro_n >= 0 && margem_erro_n <= 15 &&
                   margem_erro_p >= 0 && margem_erro_p <= 15 &&
                   margem_erro_k >= 0 && margem_erro_k <= 15;

    if (!viavel) continue;

    const custoTotal_r_ha = x * precoKg(fert1.preco_saco_50kg) + y * precoKg(fert2.preco_saco_50kg);

    resultados.push({
      fertilizantes: [
        { fertilizante: fert1, dose_kg_ha: x, sacos_por_ha: Math.ceil(x / 50), total_sacos: Math.ceil(x / 50) * area, custo_por_ha: x * precoKg(fert1.preco_saco_50kg) },
        { fertilizante: fert2, dose_kg_ha: y, sacos_por_ha: Math.ceil(y / 50), total_sacos: Math.ceil(y / 50) * area, custo_por_ha: y * precoKg(fert2.preco_saco_50kg) },
      ],
      custoTotal_r_ha,
      nutrientes_fornecidos: { n: n_fornecido, p: p_fornecido, k: k_fornecido },
      margemErro: {
        n_percent: margem_erro_n,
        p_percent: margem_erro_p,
        k_percent: margem_erro_k,
      },
      viavel: true,
    });
  }

  // Retornar o de menor custo
  return resultados.length > 0
    ? resultados.sort((a, b) => a.custoTotal_r_ha - b.custoTotal_r_ha)[0]
    : null;
}

/**
 * Testa 3 fertilizantes: sistema linear 3x3 (Cramer)
 */
function testarCombinacao3Ferts(
  fert1: Fertilizante,
  fert2: Fertilizante,
  fert3: Fertilizante,
  n_nec: number,
  p_nec: number,
  k_nec: number,
  area: number
): FertilizanteCombinacao | null {
  const n1 = fert1.teor_n_percent / 100;
  const p1 = fert1.teor_p_percent / 100;
  const k1 = fert1.teor_k_percent / 100;

  const n2 = fert2.teor_n_percent / 100;
  const p2 = fert2.teor_p_percent / 100;
  const k2 = fert2.teor_k_percent / 100;

  const n3 = fert3.teor_n_percent / 100;
  const p3 = fert3.teor_p_percent / 100;
  const k3 = fert3.teor_k_percent / 100;

  // Matriz 3x3: [n1 n2 n3] [x]   [n_nec]
  //             [p1 p2 p3] [y] = [p_nec]
  //             [k1 k2 k3] [z]   [k_nec]

  // Det(A)
  const detA = n1 * (p2 * k3 - p3 * k2) -
               n2 * (p1 * k3 - p3 * k1) +
               n3 * (p1 * k2 - p2 * k1);

  if (Math.abs(detA) < 0.001) return null; // Sistema singular

  // Regra de Cramer
  const detX = n_nec * (p2 * k3 - p3 * k2) -
               n2 * (p_nec * k3 - p3 * k_nec) +
               n3 * (p_nec * k2 - p2 * k_nec);

  const detY = n1 * (p_nec * k3 - p3 * k_nec) -
               n_nec * (p1 * k3 - p3 * k1) +
               n3 * (p1 * k_nec - p_nec * k1);

  const detZ = n1 * (p2 * k_nec - p_nec * k2) -
               n2 * (p1 * k_nec - p_nec * k1) +
               n_nec * (p1 * k2 - p2 * k1);

  const x = detX / detA;
  const y = detY / detA;
  const z = detZ / detA;

  if (x < 0 || y < 0 || z < 0 || x > 1000 || y > 1000 || z > 1000) return null;

  // Validar margem de erro: 0% a +15%
  <!-- CORRIGIDO v1.1 -->
  const n_fornecido = n1 * x + n2 * y + n3 * z;
  const p_fornecido = p1 * x + p2 * y + p3 * z;
  const k_fornecido = k1 * x + k2 * y + k3 * z;

  const margem_erro_n = n_nec > 0 ? ((n_fornecido - n_nec) / n_nec) * 100 : 0;
  const margem_erro_p = p_nec > 0 ? ((p_fornecido - p_nec) / p_nec) * 100 : 0;
  const margem_erro_k = k_nec > 0 ? ((k_fornecido - k_nec) / k_nec) * 100 : 0;

  const viavel = margem_erro_n >= 0 && margem_erro_n <= 15 &&
                 margem_erro_p >= 0 && margem_erro_p <= 15 &&
                 margem_erro_k >= 0 && margem_erro_k <= 15;

  if (!viavel) return null;

  const preco1_r_kg = precoKg(fert1.preco_saco_50kg);
  const preco2_r_kg = precoKg(fert2.preco_saco_50kg);
  const preco3_r_kg = precoKg(fert3.preco_saco_50kg);

  const custoTotal_r_ha = x * preco1_r_kg + y * preco2_r_kg + z * preco3_r_kg;

  return {
    fertilizantes: [
      { 
        fertilizante: fert1, 
        dose_kg_ha: x,
        sacos_por_ha: Math.ceil(x / 50),
        total_sacos: Math.ceil(x / 50) * area,
        custo_por_ha: x * preco1_r_kg,
      },
      { 
        fertilizante: fert2, 
        dose_kg_ha: y,
        sacos_por_ha: Math.ceil(y / 50),
        total_sacos: Math.ceil(y / 50) * area,
        custo_por_ha: y * preco2_r_kg,
      },
      { 
        fertilizante: fert3, 
        dose_kg_ha: z,
        sacos_por_ha: Math.ceil(z / 50),
        total_sacos: Math.ceil(z / 50) * area,
        custo_por_ha: z * preco3_r_kg,
      },
    ],
    custoTotal_r_ha,
    nutrientes_fornecidos: { n: n_fornecido, p: p_fornecido, k: k_fornecido },
    margemErro: {
      n_percent: margem_erro_n,
      p_percent: margem_erro_p,
      k_percent: margem_erro_k,
    },
    viavel: true,
  };
}
```

### 3.7 Arquivo: `validators/calculadoras.ts`
Responsabilidade: Schemas Zod para validação de formulários

```typescript
import { z } from 'zod';

// ========== CALAGEM ==========
<!-- CORRIGIDO v1.1: MG 5ª Aproximação removida da v1.0, mantida para v2 -->
export const metodosCalagemSchema = z.enum([
  'saturacao',
  'al_ca_mg',
  'mg_manual',
  'smp',
  'ufla',
]);

export const calagemInputSchema = z.object({
  metodo: metodosCalagemSchema,
  area: z.string()
    .transform(s => parseFloat(s) || 0)
    .refine(n => n > 0, 'Área deve ser > 0'),
  prnt: z.string()
    .transform(s => parseFloat(s) || 80)
    .refine(n => n > 0 && n <= 100, 'PRNT deve estar entre 0-100%'),
  
  // Método: Saturação por Bases
  v1: z.string()
    .transform(s => parseFloat(s) || 0)
    .optional(),
  v2: z.string()
    .transform(s => parseFloat(s) || 0)
    .optional(),
  ctc: z.string()
    .transform(s => parseFloat(s) || 0)
    .optional(),

  // Método: Al + Ca/Mg
  al: z.string()
    .transform(s => parseFloat(s) || 0)
    .refine(n => n >= 0, 'Al³⁺ não pode ser negativo')
    .optional(),
  ca: z.string()
    .transform(s => parseFloat(s) || 0)
    .refine(n => n >= 0, 'Ca²⁺ não pode ser negativo')
    .optional(),
  mg: z.string()
    .transform(s => parseFloat(s) || 0)
    .refine(n => n >= 0, 'Mg²⁺ não pode ser negativo')
    .optional(),

  // Método: SMP
  ph_smp: z.string()
    .transform(s => parseFloat(s) || 0)
    .optional(),
  textura: z.enum(['arenosa', 'media', 'argilosa']).optional(),

  // Método: UFLA
  ca_desejado: z.string()
    .transform(s => parseFloat(s) || 0)
    .optional(),
  cultura: z.string().optional(),

});

export type CalagemInputValidated = z.infer<typeof calagemInputSchema>;

// ========== NPK ==========
export const npkInputSchema = z.object({
  n_nec: z.string()
    .transform(s => parseFloat(s) || 0)
    .refine(n => n >= 0, 'N não pode ser negativo'),
  p_nec: z.string()
    .transform(s => parseFloat(s) || 0)
    .refine(n => n >= 0, 'P₂O₅ não pode ser negativo'),
  k_nec: z.string()
    .transform(s => parseFloat(s) || 0)
    .refine(n => n >= 0, 'K₂O não pode ser negativo'),
  area: z.string()
    .transform(s => parseFloat(s) || 0)
    .refine(n => n > 0, 'Área é obrigatória'),
  modo: z.enum(['simples', 'otimizado']).default('simples'),
  fertilizantes_selecionados: z.array(z.string()).optional(),
});

export type NPKInputValidated = z.infer<typeof npkInputSchema>;
```

### 3.8 Arquivo: `lib/pdf-export.ts`
Responsabilidade: Geração de laudos PDF com jsPDF  
Exports principais: `exportarLaudoCalagem`, `exportarRelatorioNPK`

```typescript
import jsPDF from 'jspdf';
import { CalagemResult, NPKResult, CalagemInput, NPKInput } from '@/lib/calculadoras';

export interface PDFOptions {
  nomeProdutor?: string;
  nomeFazenda?: string;
  localidade?: string;
  dataAnalise?: Date;
  responsavelTecnico?: string;
}

/**
 * Exportar laudo de calagem em PDF
 */
export function exportarLaudoCalagem(
  input: CalagemInput,
  resultado: CalagemResult,
  options: PDFOptions = {}
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  let yPos = margin;

  // --- HEADER ---
  doc.setFontSize(18);
  doc.text('LAUDO TÉCNICO DE CALAGEM', margin, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, margin, yPos);
  yPos += 8;
  if (options.responsavelTecnico) {
    doc.text(`Responsável: ${options.responsavelTecnico}`, margin, yPos);
    yPos += 8;
  }

  yPos += 5;

  // --- INFORMAÇÕES DA PROPRIEDADE ---
  doc.setFontSize(12);
  doc.text('INFORMAÇÕES DA PROPRIEDADE', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  const propriedadeLines = [
    ['Produtor:', options.nomeProdutor || '___________________'],
    ['Fazenda:', options.nomeFazenda || '___________________'],
    ['Localidade:', options.localidade || '___________________'],
    ['Área do Talhão:', `${parseFloat(input.area)} ha`],
  ];

  propriedadeLines.forEach(([label, value]) => {
    doc.text(label, margin, yPos);
    doc.text(value, margin + 40, yPos);
    yPos += 8;
  });

  yPos += 5;

  // --- MÉTODO E PARÂMETROS ---
  doc.setFontSize(12);
  doc.text('DADOS DA ANÁLISE', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.text(`Método: ${nomeMetodo(resultado.metodo)}`, margin, yPos);
  yPos += 8;

  const prnt = parseFloat(input.prnt);
  doc.text(`PRNT do Calcário: ${prnt.toFixed(1)}%`, margin, yPos);
  yPos += 8;

  // Parâmetros específicos do método
  const paramLines = obterParametrosPorMetodo(input, resultado);
  paramLines.forEach(([label, value]) => {
    doc.text(label, margin, yPos);
    doc.text(value, margin + 60, yPos);
    yPos += 8;
  });

  yPos += 10;

  // --- RESULTADO ---
  doc.setFontSize(12);
  doc.text('RESULTADO', margin, yPos);
  yPos += 10;

  doc.setFontSize(14);
  doc.setTextColor(0, 166, 81); // Verde GestSilo
  doc.text(`Necessidade de Calagem: ${resultado.nc.toFixed(2)} t/ha`, margin, yPos);
  yPos += 12;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Total para a Área: ${resultado.total.toFixed(1)} toneladas`, margin, yPos);
  yPos += 15;

  // --- RECOMENDAÇÕES ---
  doc.setFontSize(12);
  doc.text('RECOMENDAÇÕES TÉCNICAS', margin, yPos);
  yPos += 10;

  doc.setFontSize(9);
  const recomendacoes = gerarRecomendacoesCalagem(resultado);
  recomendacoes.forEach(rec => {
    const lines = doc.splitTextToSize(rec, pageWidth - 2 * margin);
    doc.text(lines, margin, yPos);
    yPos += lines.length * 5 + 3;
  });

  yPos += 10;

  // --- RODAPÉ ---
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Gerado por GestSilo Pro - Plataforma de Gestão Agrícola', margin, pageHeight - 10);
  doc.text(`Responsabilidade: Recomendações indicativas. Consulte agrônomo para implementação.`, margin, pageHeight - 5);

  // --- ASSINATURA ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text('Assinatura do Responsável Técnico:', margin, pageHeight - 25);
  doc.line(margin + 50, pageHeight - 22, margin + 150, pageHeight - 22); // linha de assinatura

  doc.save(`laudo_calagem_${new Date().getTime()}.pdf`);
}

/**
 * Exportar relatório de otimização NPK
 */
export function exportarRelatorioNPK(
  input: NPKInput,
  resultado: NPKResult,
  options: PDFOptions = {}
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  let yPos = margin;

  // --- HEADER ---
  doc.setFontSize(18);
  doc.text('RECOMENDAÇÃO DE ADUBAÇÃO NPK', margin, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, margin, yPos);
  yPos += 8;

  yPos += 5;

  // --- NECESSIDADE ---
  doc.setFontSize(12);
  doc.text('NECESSIDADE DE NUTRIENTES', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  const nNec = parseFloat(input.n_nec);
  const pNec = parseFloat(input.p_nec);
  const kNec = parseFloat(input.k_nec);
  const area = parseFloat(input.area);

  doc.text(`N: ${nNec.toFixed(0)} kg/ha`, margin, yPos);
  yPos += 8;
  doc.text(`P₂O₅: ${pNec.toFixed(0)} kg/ha`, margin, yPos);
  yPos += 8;
  doc.text(`K₂O: ${kNec.toFixed(0)} kg/ha`, margin, yPos);
  yPos += 8;
  doc.text(`Área: ${area.toFixed(2)} ha`, margin, yPos);
  yPos += 15;

  // --- RESULTADO / OPÇÕES ---
  if (resultado.modo === 'simples') {
    doc.setFontSize(12);
    doc.text('RECOMENDAÇÃO SIMPLES', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(0, 166, 81);
    doc.text(`${resultado.fertNome}: ${resultado.dosePorHa.toFixed(0)} kg/ha`, margin, yPos);
    yPos += 8;

    doc.setTextColor(0, 0, 0);
    doc.text(`Total para a Área: ${resultado.total.toFixed(2)} t`, margin, yPos);
  } else if (resultado.top5Opcoes && resultado.top5Opcoes.length > 0) {
    doc.setFontSize(12);
    doc.text('TOP 5 OPÇÕES OTIMIZADAS (por custo)', margin, yPos);
    yPos += 10;

    doc.setFontSize(9);
    resultado.top5Opcoes.forEach((opcao, idx) => {
      doc.setTextColor(0, 166, 81);
      doc.text(`${idx + 1}. ${opcao.fertilizantes.map(f => f.fertilizante.nome).join(' + ')}`, margin, yPos);
      yPos += 7;

      doc.setTextColor(0, 0, 0);
      opcao.fertilizantes.forEach(f => {
        doc.text(`  - ${f.fertilizante.nome}: ${f.dose_kg_ha.toFixed(0)} kg/ha`, margin + 5, yPos);
        yPos += 6;
      });

      doc.text(`  Custo: R$ ${opcao.custoTotal_r_ha.toFixed(2)}/ha`, margin + 5, yPos);
      yPos += 6;

      yPos += 3;
    });
  }

  doc.save(`recomendacao_npk_${new Date().getTime()}.pdf`);
}

// ========== FUNÇÕES AUXILIARES ==========

<!-- CORRIGIDO v1.1: MG 5ª Aproximação removida -->
function nomeMetodo(metodo: string): string {
  const nomes: Record<string, string> = {
    'saturacao': 'Saturação por Bases (V%)',
    'al_ca_mg': 'Neutralização de Alumínio + Ca/Mg',
    'mg_manual': 'Método Minas Gerais Manual',
    'smp': 'Índice SMP',
    'ufla': 'Teor de Cálcio Desejado (UFLA)',
  };
  return nomes[metodo] || metodo;
}

function obterParametrosPorMetodo(input: CalagemInput, resultado: CalagemResult): [string, string][] {
  const params: [string, string][] = [];

  if (resultado.metodo === 'saturacao') {
    params.push(['V% Atual (V1):', parseFloat(input.v1 || '0').toFixed(1)]);
    params.push(['V% Desejado (V2):', parseFloat(input.v2 || '0').toFixed(1)]);
    params.push(['CTC(T):', parseFloat(input.ctc || '0').toFixed(2)]);
  } else if (resultado.metodo === 'al_ca_mg' || resultado.metodo === 'mg_manual') {
    params.push(['Al³⁺:', parseFloat(input.al || '0').toFixed(2)]);
    params.push(['Ca²⁺:', parseFloat(input.ca || '0').toFixed(2)]);
    params.push(['Mg²⁺:', parseFloat(input.mg || '0').toFixed(2)]);
  } else if (resultado.metodo === 'smp') {
    params.push(['pH SMP:', parseFloat(input.ph_smp || '0').toFixed(1)]);
    params.push(['Textura:', input.textura || '-']);
  } else if (resultado.metodo === 'ufla') {
    params.push(['Ca² Atual:', parseFloat(input.ca || '0').toFixed(2)]);
    params.push(['Cultura:', input.cultura || '-']);
  }

  return params;
}

function gerarRecomendacoesCalagem(resultado: CalagemResult): string[] {
  const recomendacoes: string[] = [];

  recomendacoes.push(`• Aplicar ${resultado.nc.toFixed(2)} t/ha de calcário com PRNT adequado.`);

  if (resultado.nc > 3) {
    recomendacoes.push('• Incorporar em profundidade (30-40 cm) para corrigir todo o perfil do solo.');
  }

  recomendacoes.push('• Realizar a calagem pelo menos 60-90 dias antes do plantio para permitir reação.');
  recomendacoes.push('• Opcionalmente, fazer uma segunda aplicação se NC > 5 t/ha, parcelando em 2 safras.');
  recomendacoes.push('• Disclaimer: Estas recomendações são indicativas. Consulte um agrônomo para implementação adequada.');

  return recomendacoes;
}
```

### 3.9 Componentes React (sketch)
Estrutura dos 4 componentes principais (implementação detalhada em código-fonte):

```
app/dashboard/calculadoras/components/
├── CalagemCalculator.tsx          - Form com tabs de método, exibe resultado
├── NPKCalculator.tsx              - Form NPK, exibe resultado (simples ou top 5)
├── ResultCard.tsx                 - Card genérico de resultado
├── FertilizantesManager.tsx       - Gerenciar lista, preços, add custom
└── index.ts                       - Re-exports

app/dashboard/calculadoras/dialogs/
└── ExportPDFDialog.tsx            - Modal para customizar e exportar PDF
```

---

## 4. Dependências a Instalar

```bash
npm install jspdf@^2.5.1 jspdf-autotable@^3.5.0
npm install --save-dev @types/jspdf@^2.5.0
```

**Motivo**: 
- `jspdf`: geração de PDFs no cliente com suporte a texto, imagens, tabelas
- `jspdf-autotable`: plugin para tabelas formatadas (top 5 opções NPK)

---

## 5. Tipos TypeScript

Todas as interfaces estão definidas em `lib/calculadoras/tipos-calculadoras.ts` (seção 3.2).

Exportações principais:
```typescript
export type MetodoCalagemType
export interface CalagemInput
export interface CalagemResult
export interface Fertilizante
export interface FertilizanteCombinacao
export interface NPKInput
export interface NPKResult
```

---

## 6. Schemas Zod

Definidos em `validators/calculadoras.ts` (seção 3.7):
- `calagemInputSchema` (com transformações parse)
- `npkInputSchema` (com transformações parse)
- `metodosCalagemSchema` (enum)

---

## 7. Dados Hardcoded

### 7.1 Fertilizantes Padrão (15 itens)
<!-- CORRIGIDO v1.1 -->
Em `lib/calculadoras/fertilizantes.ts`:
```
Ureia 45%, Nitrato Amônio 34%, Sulfato Amônio 21%
MAP 11-52%, DAP 18-46%, Superfosfato Triplo 46%, Superfosfato Simples 18%
KCl 60%, Nitrato Potássio 13-0-44%, Sulfato Potássio 50%
NPK 20-05-20, NPK 10-10-10, NPK 04-14-08, NPK 05-25-25, NPK 08-28-16
Nitrato Cálcio 15.5%
```

### 7.2 Tabela SMP
Em `lib/calculadoras/smp-tabela.ts` (interpolação linear por textura)

### 7.3 Tabela UFLA
Em `lib/calculadoras/smp-tabela.ts` (Ca desejado por cultura)

<!-- CORRIGIDO v1.1: Seção 7.4 MG 5ª Aproximação removida (implementação futura v2) -->

---

## 8. Lógica de Cálculo — Funções Puras (lib/)

### 8.1 Calagem
Ver seção 3.3 (`lib/calculadoras/calagem.ts`):
- `calcularSaturacao(data)` — fórmula V%
- `calcularAlCaMg(data)` — fórmula Al²⁺ + Ca/Mg
- `calcularMGManual(data)` — fórmula MG manual
- `calcularSMP(data)` — interpolação tabela SMP
- `calcularUFLA(data)` — teor Ca desejado
- `calcularCalagem(data)` — orquestrador que despacha por método

Exemplo (Saturação):
<!-- CORRIGIDO v1.1 -->
```typescript
// Input: { v1: '40', v2: '60', ctc: '5', prnt: '80', area: '10' }
// NC = (CTC × (V2 - V1) / 100) / (PRNT / 100)
// NC = (5 × (60-40) / 100) / (80/100)
// NC = (5 × 20 / 100) / 0.8
// NC = 1.0 / 0.8 = 1.25 t/ha
// Total: 1.25 × 10 = 12.5 toneladas
// Output: { nc: 1.25, total: 12.5 }
```

### 8.2 NPK — Otimizador Combinatório
Ver seção 3.6 (`lib/calculadoras/npk.ts`):

**Modo Simples** (atual):
```typescript
calcularNPK(data, fertilizante) → NPKResult
- Doses por nutriente: N/(teor_n), P/(teor_p), K/(teor_k)
- Toma MAX = nutriente limitante
- Calcula custo total
```

**Modo Otimizado** (novo):
```typescript
otimizarNPK(data) → { top5: FertilizanteCombinacao[], melhorOpcao }
- Testa C(n,1) combinações 1 fert
- Testa C(n,2) combinações 2 ferts → sistema 2x2 (Cramer)
- Testa C(n,3) combinações 3 ferts → sistema 3x3 (Cramer)
- Validação: margem ±10% por nutriente
- Ordena por custo, retorna top 5
```

Exemplo (2 fertilizantes — Ureia + MAP):
```
Input: n_nec=90, p_nec=60, k_nec=0, area=10

Ureia: 45-00-00
MAP:   12-52-00

Sistema:
45x + 12y = 90 (N)
0x + 52y = 60  (P)

Solução:
y = 60/52 ≈ 1.15 kg MAP/ha
45x + 12(1.15) = 90 → x ≈ 1.70 kg Ureia/ha

Custo: 1.70*3.20 + 1.15*4.50 = 5.44 + 5.18 = 10.62 R$/ha
Fornecido: N = 45*1.70 + 12*1.15 = 90.3 ≈ 90 ✓
           P = 52*1.15 = 59.8 ≈ 60 ✓
```

---

## 9. Componentes React

### 9.1 Página principal (`page.tsx`)

**Props**: Nenhuma  
**Estado**: loading, tab ativo  
**Renders**: Hero + Tabs([CalagemCalculator, NPKCalculator])

```tsx
export default function CalculadorasPage() {
  const { fazendaId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  // ... Load talhões, insumos se necessário para context

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Calculadoras Agronômicas</h1>
        <p className="text-muted-foreground">...</p>
      </div>

      <Tabs defaultValue="calagem">
        <TabsList>...</TabsList>
        <TabsContent value="calagem">
          <CalagemCalculator />
        </TabsContent>
        <TabsContent value="npk">
          <NPKCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 9.2 CalagemCalculator

**Props**: `{ initialMethod?: string, onResultChange?: (result) => void }`  
**Estado**: form inputs, resultado, método ativo  
**Validação**: Zod antes de calcular  
**Render**: Form em grid md:grid-cols-2, Resultado em col-span-1 com botão PDF

### 9.3 NPKCalculator

**Props**: `{ fertilizantes?: Fertilizante[] }`  
**Estado**: form inputs, modo (simples/otimizado), resultado, seleção top 5  
**Render**: Form + tabela de top 5 opções (se otimizado)

### 9.4 ResultCard

**Props**:
```typescript
{
  title: string;
  value: number | string;
  unit: string;
  total?: number;
  totalUnit?: string;
  color?: 'primary' | 'info' | 'warning';
  icon?: React.ReactNode;
  tips?: string[];
}
```

### 9.5 FertilizantesManager

**Props**: Nenhuma (usa localStorage)  
**Estado**: lista fertilizantes (padrão + customizados), preços editáveis  
**Render**: Tabela com edit preços, add novo, delete customizados

### 9.6 ExportPDFDialog

**Props**:
```typescript
{
  calculadora: 'calagem' | 'npk';
  dados: CalagemResult | NPKResult;
  inputs: CalagemInput | NPKInput;
  open: boolean;
  onOpenChange: (open) => void;
}
```

**Comportamento**:
- Input: nome produtor, fazenda, responsável técnico
- Botão: "Exportar PDF"
- Chama `exportarLaudoCalagem()` ou `exportarRelatorioNPK()`

---

## 10. Geração de PDF

### Laudo de Calagem
- Header com logo GestSilo + "LAUDO TÉCNICO DE CALAGEM"
- Dados da propriedade (produtor, fazenda, talhão)
- Dados da análise (método, PRNT, parâmetros)
- **Resultado destacado** (NC em verde, grande fonte)
- Recomendações técnicas dinâmicas (baseadas no NC)
- Rodapé com disclaimer + assinatura

### Relatório NPK
- Header "RECOMENDAÇÃO DE ADUBAÇÃO NPK"
- Necessidade resumida (N, P₂O₅, K₂O)
- Se simples: fertilizante + dose
- Se otimizado: tabela com top 5 opções (name, doses, custo)
- Rodapé

---

## 11. Testes (Vitest)

Cobertura esperada: > 85%

### 11.1 `__tests__/calculadoras.test.ts` (estender)
- ✅ Mantém testes dos 3 métodos atuais
- ✅ Adiciona testes para SMP (interpolação)
- ✅ Adiciona testes para UFLA
- ✅ Edge cases: PRNT=0, area=0, V1>V2, etc.

### 11.2 `__tests__/npk-otimizador.test.ts` (novo)
<!-- CORRIGIDO v1.1 -->
- Testa `calcularNPK` modo simples (nutriente limitante)
- Testa `otimizarNPK` combinações 1, 2, 3
- Valida margem 0-+15%
- Verifica ordenação por custo
- Edge cases: sem fertilizantes, 0 necessidade, doses inviáveis

### 11.3 `__tests__/calagem-smp.test.ts` (novo)
- Testa interpolação linear SMP
- Testa UFLA por cultura

Exemplo de teste:
```typescript
describe('calcularSMP', () => {
  it('interpola corretamente para pH SMP=5.5, textura=media', () => {
    const result = calcularSMP({
      metodo: 'smp',
      ph_smp: '5.5',
      textura: 'media',
      prnt: '80',
      area: '10',
    });

    // Espera interpolação entre ph=5.4 e ph=5.6
    expect(result!.nc).toBeCloseTo(2.0, 1); // ≈ 2.0 t/ha
  });
});
```

---

## 12. Ordem de Implementação

Sequência que garante compilação em cada etapa:

### Phase 1: Tipos & Dados (sem dependências)
1. `lib/calculadoras/tipos-calculadoras.ts` — interfaces
2. `lib/calculadoras/smp-tabela.ts` — dados hardcoded (tabelas)
3. `lib/calculadoras/fertilizantes.ts` — FERTILIZANTES_PADRAO

### Phase 2: Lógica Pura (testes no mesmo momento)
4. `lib/calculadoras/calagem.ts` — 5 métodos
5. `lib/calculadoras/npk.ts` — simples + otimizador
6. `__tests__/*.test.ts` — testes unitários

### Phase 3: Validação & PDF
7. `validators/calculadoras.ts` — schemas Zod
8. `lib/pdf-export.ts` — jsPDF export

### Phase 4: UI
9. `lib/calculadoras/index.ts` — barrel export
10. `app/dashboard/calculadoras/components/*.tsx` — componentes
11. `app/dashboard/calculadoras/dialogs/ExportPDFDialog.tsx` — modal PDF
12. `app/dashboard/calculadoras/page.tsx` — refactor page.tsx

---

## 13. Checklist de Validação

- [ ] 5 métodos calagem funcionando com resultados corretos (validar vs. AgerPro/Excel)
- [ ] Saturação V%: testa V1<V2, retorna 0 se V1≥V2
- [ ] SMP: interpola corretamente para 3 texturas
- [ ] UFLA: retorna 0 se Ca atual ≥ Ca desejado
- [ ] Otimizador NPK testa combinações 1/2/3
- [ ] Otimizador retorna top 5 por menor custo
- [ ] Margem 0-+15% validada para cada nutriente <!-- CORRIGIDO v1.1 -->
- [ ] Sistema 3x3 (Cramer) resolve corretamente combinações 3 ferts
- [ ] 15 fertilizantes padrão com teores e preços corretos
- [ ] Preços customizados persistem em localStorage
- [ ] Fertilizantes customizados: add/edit/remove funciona
- [ ] PDF calagem gera com laudo formatado + recomendações
- [ ] PDF NPK gera com tabela top 5
- [ ] Validação Zod bloqueia inputs inválidos (area≤0, PRNT>100, etc.)
- [ ] Responsivo: Mobile (1 col) / Tablet (2 col) / Desktop (2 col form+result)
- [ ] Testes: > 85% cobertura, especialmente funções de cálculo
- [ ] Sem erros TypeScript (`npm run lint`)
- [ ] 3 métodos calagem existentes funcionam identicamente (backward compat)
- [ ] Funciona offline (100% client-side)

---

## 14. Notas & Considerações

### Decisões Arquiteturais
1. **Client-side puro**: Sem persistência no BD. Cálculos são determinísticos; usuário salva PDF se necessário.
2. **localStorage para customizações**: Preços e fertilizantes customizados ficam locais (por navegador/dispositivo).
3. **Margem 0-+15%**: <!-- CORRIGIDO v1.1 --> Escolha agronômica para otimizador (fornecer >= necessário). Ajustável em futuras versões.
4. **Backward Compatibility**: 5 métodos calagem (saturacao, al_ca_mg, mg_manual, smp, ufla) funcionam independentemente.

### Possíveis Extensões Futuras
- Histórico de cálculos (SessionStorage ou BD)
- Integração com tabelas de custo de diferentes fornecedores
- IA para recomendação de cultura baseada em análise
- Gráficos comparativos de custos (Recharts)
- Análise de emissão de CO₂ por fertilizante

### Testes Manuais Recomendados
1. Calagem: Validar cada método com valores conhecidos (ex: AgerPro)
2. NPK: Testar otimizador com 2-3 fertilizantes, verificar que top 5 está em ordem ascendente de custo
3. PDF: Exportar ambos, abrir no Acrobat, verificar formatação
4. Offline: Desabilitar rede, verificar que calculadora funciona
5. Mobile: Testar em iPhone SE e Samsung A12 (responsividade)
6. localStorage: Adicionar fertilizante custom, recarregar página, verificar persistência

---

**Próximo Passo**: Implementar seguindo a ordem em Seção 12.

**Status**: 📋 Especificação completa e pronta para desenvolvimento.
