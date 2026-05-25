# Spec — Planejamento de Produção de Silagem

**Data:** 16 de abril de 2026  
**Versão:** 1.1  
**Revisão:** Correções de unidades, validação e formatação  
**Baseado em:** Documento Técnico v2 + PRD AS-IS (Estado Atual)

---

## 1. Resumo da Mudança

**O QUÊ:** Substituição dos módulos `/dashboard/rebanho` e `/dashboard/simulador` por um novo planejador integrado em `/dashboard/planejamento-silagem`.

**POR QUÊ:**
- Rebanho e Simulador são dois lados da mesma moeda (demanda + oferta)
- Necessidade de **modelagem técnica robusta** com categorias pré-definidas (não editáveis)
- Fatores de ajuste por sistema (Pasto/Semi-conf/Conf) não existem no código atual
- Cálculo de **painel frontal do silo** (MFR — Bernardes et al., 2021) é novo requisito crítico
- Validações mais rigorosas e alertas dinâmicos complexos
- Salvamento de planejamentos no banco para histórico

**RESULTADO:** Um wizard de **4 etapas** (Sistema → Rebanho → Parâmetros → Resultados) com cálculos precisos, categorias pré-definidas, e saídas completas (demanda, área, painel, alertas).

---

## 2. Arquivos a CRIAR (lista completa)

### 2.1 Páginas e Rotas

#### `app/dashboard/planejamento-silagem/page.tsx` (NEW — 80–100 linhas)
- **Responsabilidade:** Página raiz do wizard, controla o fluxo de etapas (state management)
- **Tipo:** Server Component (layout) com Client Components para interações
- **Dependências:** 
  - `./components/WizardContainer` (Client)
  - `./components/Etapa1Sistema`
  - `./components/Etapa2Rebanho`
  - `./components/Etapa3Parametros`
  - `./components/Etapa4Resultados`
  - `lib/supabase/queries-audit` (para salvar planejamento)
- **Comportamento:**
  - Renderiza `<WizardContainer />` que gerencia estado interno (etapa, dados preenchidos)
  - Passa callbacks para avançar/voltar entre etapas
  - No final, "Salvar" dispara `q.planejamentosSilagem.create()`
  - Breadcrumb mostrando "Etapa X de 4"

---

#### `app/dashboard/planejamento-silagem/layout.tsx` (NEW — 30 linhas)
- **Responsabilidade:** Layout wrapper com sidebar + header específico do módulo
- **Dependências:** shadcn/ui components (Breadcrumb, Card, etc.)
- **Comportamento:** Padrão do dashboard, sem mudanças

---

### 2.2 Componentes do Wizard (Client Components)

#### `app/dashboard/planejamento-silagem/components/WizardContainer.tsx` (NEW — 120–150 linhas)
- **Responsabilidade:** Gerencia estado global do wizard (etapa atual, dados parciais)
- **Tipo:** Client Component (`"use client"`)
- **Props:** Nenhuma
- **Estado interno:**
  ```typescript
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [wizard, setWizard] = useState<WizardState>({
    sistema: null,
    rebanho: {},
    parametros: null,
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  ```
- **Comportamento:**
  - Renderiza componente da etapa atual baseado em `etapaAtual`
  - Passa `wizard` e callbacks (`onNext`, `onBack`) para componentes
  - Valida dados antes de permitir avançar
  - Mostra breadcrumb: "Etapa 1 de 4" → "Etapa 4 de 4"
  - Botões: "← Voltar" (desabilitado em etapa 1), "Próximo →" / "Calcular" (etapa 3), "Salvar" (etapa 4)

---

#### `app/dashboard/planejamento-silagem/components/Etapa1Sistema.tsx` (NEW — 60–80 linhas)
- **Responsabilidade:** Seleção do tipo de rebanho e sistema produtivo
- **Tipo:** Client Component
- **Props:**
  ```typescript
  interface Etapa1Props {
    wizard: WizardState;
    onNext: (data: Partial<WizardState>) => void;
    errors: Record<string, string>;
  }
  ```
- **Formulário:**
  - Radio buttons: **Tipo de Rebanho**
    - ○ Leite
    - ○ Corte
  - Select/Tabs: **Sistema Produção**
    - [ ] Pasto + suplementação
    - [ ] Semi-confinado (padrão)
    - [ ] Confinado
  - Info box explicando os fatores de cada sistema
  - Botão "Próximo →"
- **Validações:** Ambos os campos obrigatórios
- **Comportamento:** 
  - Ao clicar "Próximo", valida e chama `onNext()` com `{ sistema }`
  - Se já tem dados salvos, pre-popula

---

#### `app/dashboard/planejamento-silagem/components/Etapa2Rebanho.tsx` (NEW — 150–180 linhas)
- **Responsabilidade:** Entrada de quantidade de animais para cada categoria
- **Tipo:** Client Component
- **Props:**
  ```typescript
  interface Etapa2Props {
    wizard: WizardState;
    onNext: (data: Partial<WizardState>) => void;
    onBack: () => void;
    errors: Record<string, string>;
  }
  ```
- **Comportamento:**
  - Carrega categorias pré-definidas baseado em `wizard.sistema.tipo_rebanho` (Leite/Corte)
  - Renderiza tabela com colunas:
    | Categoria | PV ref (kg) | CMS (kg/dia) | % Silagem | Qtd. Cabeças |
    - Inputs numéricos (spinners) para quantidade
    - Mostrar totais de cabeças
    - Tooltip para cada categoria (PV, consumo)
  - Botões: "← Voltar" e "Próximo →"
  - Validação: ∑ cabeças ≥ 1
- **Estado:**
  - Estado local para inputs (rebanho[categoryId] = quantidade)
  - Sincroniza com `wizard` ao clicar "Próximo"

---

#### `app/dashboard/planejamento-silagem/components/Etapa3Parametros.tsx` (NEW — 120–150 linhas)
- **Responsabilidade:** Entrada de parâmetros de planejamento (período, MS, perdas, etc.)
- **Tipo:** Client Component
- **Props:**
  ```typescript
  interface Etapa3Props {
    wizard: WizardState;
    onNext: (data: Partial<WizardState>) => void;
    onBack: () => void;
    errors: Record<string, string>;
  }
  ```
- **Formulário (shadcn/ui Input, Select, Slider):**
  - **Período de fornecimento:** Input number (1–365 dias) — default 180
  - **Cultura da silagem:** Select (Milho, Sorgo) — default Milho
  - **Teor MS:** Input number (25–40%) — default 33
  - **Perdas estimadas:** Input number (15–30%) — default 20
  - **Produtividade esperada:** Input number
    - Se Milho: 30–65 ton MO/ha — default 50
    - Se Sorgo: 25–55 ton MO/ha — default 40
  - **Taxa de retirada (MFR):** Input number (200–350 kg/m²/dia) — default 250
  - Info boxes explicando cada parâmetro
- **Validações:** Zod schema `Etapa3ParametrosSchema` (ver seção 7)
- **Comportamento:**
  - Ao selecionar Cultura, ajusta labels e ranges de Produtividade
  - Botões: "← Voltar" e "Calcular →"
  - Ao clicar "Calcular", valida e chama `onNext()` com `{ parametros }`

---

#### `app/dashboard/planejamento-silagem/components/Etapa4Resultados.tsx` (NEW — 350–400 linhas)
- **Responsabilidade:** Exibição dos resultados e alertas com formatação pt-BR
- **Tipo:** Client Component
- **Props:**
  ```typescript
  interface Etapa4Props {
    wizard: WizardState;
    resultados: ResultadosPlanejamento;
    alertas: AlertaPlanejamento[];
    onBack: () => void;
    onSave: (nome: string) => Promise<void>;
    isSaving: boolean;
  }
  ```
- **Dependências:** 
  - `lib/utils/format-planejamento` (formatTon, formatHa, formatM2, formatKgDia, formatPercent)
  - `lib/services/planejamento-silagem` (gerarExemplosDimensaoPainel, calcularPainelMultiplosSilos)
- **Conteúdo renderizado:**
  1. **Card Principal — Demanda Total de Silagem:**
     - MS necessária: `formatTon(resultados.demanda_ms_total_ton)` ton
     - MO sem perdas: `formatTon(resultados.demanda_mo_sem_perdas_ton)` ton
     - MO com perdas (FINAL): `formatTon(resultados.demanda_mo_com_perdas_ton)` ton
     - Consumo diário MO: `formatKgDia(resultados.consumo_diario_mo_kg)` kg/dia
  2. **Card — Área de Plantio:**
     - Área estimada: `formatHa(resultados.area_plantio_ha)` ha
     - Cultura: `wizard.parametros.cultura`
  3. **Card — Painel Frontal do Silo:**
     - Área máxima painel: `formatM2(resultados.area_painel_m2)` m²
     - Taxa de retirada: `wizard.parametros.taxa_retirada_kg_m2_dia` kg/m²/dia
     - Exemplos de dimensão: Chamar `gerarExemplosDimensaoPainel(resultados.area_painel_m2)` e renderizar 2–3 exemplos como:
       ```
       • 3,0 m larg. × 2,8 m alt. = 8,4 m²
       • 2,5 m larg. × 3,4 m alt. = 8,5 m²
       ```
     - Nota sobre múltiplos silos: Se área > 15 m², mostrar exemplo com `calcularPainelMultiplosSilos(area, 2)`:
       ```
       Se usar 2 silos simultâneos:
       • cada painel ≤ 4,2 m² (ex.: 2,0 m × 2,1 m)
       ```
  4. **Tabela Detalhamento por Categoria:**
     | Categoria | n | Demanda MS (ton) | Participação |
     - Usar `formatTon()` para demanda MS
     - Usar `formatPercent()` para participação
     - Ordenado do maior para menor participação
     - Ocultar categorias com n = 0
  5. **Gráfico de Barras (Recharts):**
     - Barras horizontais, participação (%)
     - Ordenado por participação (maior → menor)
     - Labels com `formatPercent()`
  6. **Alertas Fixos:**
     - "Valores estimados com base em parâmetros médios..."
     - "Inclui margem de segurança de {X}% para perdas." (onde {X} = `wizard.parametros.perdas_percent`)
     - "Dietas com maior proporção de concentrado reduzem..."
     - "A área do painel frontal indica o tamanho MÁXIMO para manter taxa de retirada ≥ {Y} kg/m²/dia..." (onde {Y} = `wizard.parametros.taxa_retirada_kg_m2_dia`)
  7. **Alertas Dinâmicos (se houver):**
     - Lista de alertas com ícones (⚠️ / ⓘ)
  8. **Input para Salvar:**
     - Campo de texto: "Nome do planejamento" (ex: "Rebanho Leiteiro 2026-06")
     - Botão "Salvar" (dispara POST ao Supabase)
     - Botão "Exportar PDF" (futura feature — placeholder com toast: "Feature em desenvolvimento")
  9. **Botão "← Voltar"** (volta para Etapa 3)

---

### 2.3 Componentes Auxiliares (Reusable)

#### `app/dashboard/planejamento-silagem/components/Breadcrumb.tsx` (NEW — 30–40 linhas)
- **Responsabilidade:** Mostra progresso do wizard "Etapa X de 4"
- **Tipo:** Client Component
- **Props:**
  ```typescript
  interface BreadcrumbProps {
    etapaAtual: number;
    labels?: string[];
  }
  ```

---

#### `app/dashboard/planejamento-silagem/components/AlertasDinamicos.tsx` (NEW — 60–80 linhas)
- **Responsabilidade:** Renderiza lista de alertas dinâmicos
- **Tipo:** Client Component
- **Props:**
  ```typescript
  interface AlertasDinamicosProps {
    alertas: AlertaPlanejamento[];
  }
  ```
- **Comportamento:**
  - Para cada alerta, renderiza card com ícone (⚠️ / ⓘ), título e descrição
  - Usa cores do design system (laranja/amarelo para ⚠️, azul para ⓘ)

---

#### `app/dashboard/planejamento-silagem/components/TabelaDetalhamento.tsx` (NEW — 50–70 linhas)
- **Responsabilidade:** Renderiza tabela de demanda por categoria
- **Tipo:** Client Component
- **Props:**
  ```typescript
  interface TabelaDetalhamentoProps {
    categorias: CategoriaCalculo[];
  }
  ```

---

#### `app/dashboard/planejamento-silagem/components/GraficoParticipacao.tsx` (NEW — 80–100 linhas)
- **Responsabilidade:** Gráfico de barras horizontais (Recharts)
- **Tipo:** Client Component
- **Props:**
  ```typescript
  interface GraficoParticipacaoProps {
    dados: { nome: string; participacao: number }[];
  }
  ```

---

### 2.3a Utilitários de Formatação

#### `lib/utils/format-planejamento.ts` (NEW — 60–80 linhas)
- **Responsabilidade:** Formatadores de números em português brasileiro
- **Implementação:** Usar `Intl.NumberFormat('pt-BR', {...})` com opções adequadas
- **Funções:**

```typescript
/**
 * Formata número em toneladas (1 casa decimal, vírgula decimal, ponto milhar)
 * Exemplo: 454.5 → "454,5"  |  2346.0 → "2.346,0"
 */
export function formatTon(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Formata número em hectares (1 casa decimal, vírgula decimal, ponto milhar)
 * Exemplo: 9.1 → "9,1"  |  56.3 → "56,3"
 */
export function formatHa(value: number): string {
  return formatTon(value); // Mesma regra
}

/**
 * Formata número em metros quadrados (1 casa decimal, vírgula decimal, ponto milhar)
 * Exemplo: 8.4 → "8,4"  |  25.7 → "25,7"
 */
export function formatM2(value: number): string {
  return formatTon(value); // Mesma regra
}

/**
 * Formata número em kg/dia (sem decimais, ponto milhar)
 * Exemplo: 2104 → "2.104"  |  6427 → "6.427"
 */
export function formatKgDia(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formata número em percentual (1 casa decimal, vírgula decimal, sem ponto milhar)
 * Exemplo: 40.4 → "40,4%"  |  0.8 → "0,8%"
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value) + '%';
}
```

---

### 2.4 Tipos e Constantes

#### `lib/types/planejamento-silagem.ts` (NEW — 150–200 linhas)
- **Responsabilidade:** Tipos TypeScript para o novo módulo
- **Tipos definidos:**
  ```typescript
  // Sistema de Produção
  export type TipoRebanho = 'Leite' | 'Corte';
  export type SistemaProducao = 'pasto' | 'semiconfinado' | 'confinado';

  export interface DefinicaoSistema {
    tipo_rebanho: TipoRebanho;
    sistema_producao: SistemaProducao;
    fator_consumo: number;      // 0.90, 1.00 ou 1.10
    fator_silagem: number;      // 0.70, 1.00 ou 1.15
  }

  // Categoria Pré-definida
  export interface CategoriaPreDefinida {
    id: string;              // "L1", "C4", etc.
    nome: string;
    tipo_rebanho: TipoRebanho;
    pv_ref_kg: number;
    cms_base_kg_dia: number;
    pct_silagem_base: number;  // 0.35 a 0.75 (decimal)
  }

  // Categoria com Quantidade (usuário preencheu)
  export interface CategoriaComQuantidade extends CategoriaPreDefinida {
    quantidade_cabecas: number;
  }

  // Parâmetros de Planejamento
  export interface ParametrosPlanejamento {
    periodo_dias: number;          // 1-365
    cultura: 'Milho' | 'Sorgo';
    teor_ms_percent: number;       // 25-40
    perdas_percent: number;        // 15-30
    produtividade_ton_mo_ha: number;
    taxa_retirada_kg_m2_dia: number; // 200-350
  }

  // Estado Completo do Wizard
  export interface WizardState {
    sistema: DefinicaoSistema | null;
    rebanho: Record<string, number>;           // {categoryId: quantidade}
    parametros: ParametrosPlanejamento | null;
  }

  // Cálculos Intermediários por Categoria
  export interface CategoriaCalculo extends CategoriaComQuantidade {
    cms_ajust_kg_dia: number;
    pct_silagem_ajust: number;
    silagem_ms_dia_kg: number;
    demanda_ms_ton: number;
    participacao_pct: number;
  }

  // Resultados Finais
  export interface ResultadosPlanejamento {
    demanda_ms_total_ton: number;
    demanda_mo_sem_perdas_ton: number;
    demanda_mo_com_perdas_ton: number;
    consumo_diario_mo_kg: number;
    area_plantio_ha: number;
    area_painel_m2: number;
    categorias_calculo: CategoriaCalculo[];
  }

  // Alerta Dinâmico
  export interface AlertaPlanejamento {
    tipo: 'warning' | 'info';  // ⚠️ ou ⓘ
    mensagem: string;
  }

  // Planejamento Salvo (Banco de Dados)
  export interface PlanejamentoSilagem {
    id: string;
    fazenda_id: string;
    nome: string;
    // Dados do planejamento (JSON)
    sistema: DefinicaoSistema;
    rebanho: CategoriaComQuantidade[];
    parametros: ParametrosPlanejamento;
    resultados: ResultadosPlanejamento;
    created_at: string;
  }
  ```

---

#### `lib/constants/planejamento-silagem.ts` (NEW — 300–400 linhas)
- **Responsabilidade:** Categorias pré-definidas, fatores, limites de validação
- **Conteúdo:**
  ```typescript
  // Categorias Leite (L1-L7)
  export const CATEGORIAS_LEITE: CategoriaPreDefinida[] = [
    {
      id: 'L1',
      nome: 'Vaca lactação (baixa/média prod.)',
      tipo_rebanho: 'Leite',
      pv_ref_kg: 550,
      cms_base_kg_dia: 17.0,
      pct_silagem_base: 0.55,
    },
    {
      id: 'L2',
      nome: 'Vaca lactação (alta prod.)',
      tipo_rebanho: 'Leite',
      pv_ref_kg: 580,
      cms_base_kg_dia: 20.0,
      pct_silagem_base: 0.50,
    },
    // ... L3-L7 seguindo tabela do documento técnico
  ];

  // Categorias Corte (C1-C6)
  export const CATEGORIAS_CORTE: CategoriaPreDefinida[] = [
    {
      id: 'C1',
      nome: 'Cria (bezerros com mãe)',
      tipo_rebanho: 'Corte',
      pv_ref_kg: 150,
      cms_base_kg_dia: 2.5,
      pct_silagem_base: 0.35,
    },
    // ... C2-C6 seguindo tabela
  ];

  // Fatores por Sistema
  export const FATORES_SISTEMA: Record<SistemaProducao, { consumo: number; silagem: number }> = {
    pasto: { consumo: 0.90, silagem: 0.70 },
    semiconfinado: { consumo: 1.00, silagem: 1.00 },
    confinado: { consumo: 1.10, silagem: 1.15 },
  };

  // Ranges de Validação
  export const RANGES_PARAMETROS = {
    periodo_dias: { min: 1, max: 365 },
    teor_ms_percent: { min: 25, max: 40 },
    perdas_percent: { min: 15, max: 30 },
    produtividade_milho: { min: 30, max: 65 },
    produtividade_sorgo: { min: 25, max: 55 },
    taxa_retirada: { min: 200, max: 350 },
  };

  // Defaults
  export const DEFAULTS_PARAMETROS: ParametrosPlanejamento = {
    periodo_dias: 180,
    cultura: 'Milho',
    teor_ms_percent: 33,
    perdas_percent: 20,
    produtividade_ton_mo_ha: 50,
    taxa_retirada_kg_m2_dia: 250,
  };

  // Limites para Alertas
  export const LIMITES_ALERTAS = {
    teor_ms_critico_baixo: 28,
    teor_ms_critico_alto: 38,
    perdas_excelente: 15,
    area_alta: 30,
    area_painel_alta: 20,
    area_painel_baixa: 4,
    taxa_retirada_minima: 250,
    pct_silagem_max_confinado: 70,
    periodo_longo: 300,
  };
  ```

---

### 2.5 Lógica de Cálculo

#### `lib/services/planejamento-silagem.ts` (NEW — 200–250 linhas)
- **Responsabilidade:** Funções puras de cálculo
- **Tipo:** TypeScript puro (sem dependências de React/Supabase)
- **Funções principais:**

```typescript
/**
 * Calcula dados ajustados para cada categoria
 */
export function calcularCategoriaComAjustes(
  categoria: CategoriaPreDefinida,
  quantidade_cabecas: number,
  fator_consumo: number,
  fator_silagem: number
): CategoriaCalculo {
  const cms_ajust = categoria.cms_base_kg_dia * fator_consumo;
  const pct_silagem_ajust = categoria.pct_silagem_base * fator_silagem;
  const silagem_ms_dia = cms_ajust * pct_silagem_ajust;
  
  return {
    ...categoria,
    quantidade_cabecas,
    cms_ajust_kg_dia: cms_ajust,
    pct_silagem_ajust: pct_silagem_ajust,
    silagem_ms_dia_kg: silagem_ms_dia,
    demanda_ms_ton: 0,  // Preenchido depois
    participacao_pct: 0, // Preenchido depois
  };
}

/**
 * Calcula demanda MS para categoria
 */
export function calcularDemandaCategoria(
  cat: CategoriaCalculo,
  periodo_dias: number
): number {
  return (cat.quantidade_cabecas * cat.silagem_ms_dia_kg * periodo_dias) / 1000; // kg → ton
}

/**
 * Calcula resultados finais
 * 
 * CONVENÇÃO DE UNIDADES:
 * - Cálculos intermediários: tudo em kg e kg/dia
 * - Saída (ResultadosPlanejamento): ton para massas, ha para área, m² para painel, kg/dia para consumo
 * 
 * FÓRMULAS:
 * 1. demandaMS_total_kg = Σ(n[i] × silagemMS_dia_kg[i] × periodo_dias)
 * 2. demandaMO_semPerdas_kg = demandaMS_total_kg / (teor_ms_percent / 100)
 * 3. demandaMO_comPerdas_kg = demandaMO_semPerdas_kg × (1 + perdas_percent / 100)
 * 4. consumoDiarioMO_kg = demandaMO_semPerdas_kg / periodo_dias
 * 5. areaPlanio_ha = demandaMO_comPerdas_kg / (produtividade_ton_mo_ha × 1000)
 * 6. areaPainel_m2 = consumoDiarioMO_kg / taxa_retirada_kg_m2_dia
 */
export function calcularResultados(
  categorias_ajustadas: CategoriaCalculo[],
  periodo_dias: number,
  teor_ms_percent: number,
  perdas_percent: number,
  produtividade_ton_mo_ha: number,
  taxa_retirada_kg_m2_dia: number
): ResultadosPlanejamento {
  // 1. Demanda total MS (kg)
  const demandaMS_total_kg = categorias_ajustadas.reduce(
    (sum, cat) => sum + (cat.quantidade_cabecas * cat.silagem_ms_dia_kg * periodo_dias),
    0
  );

  // 2. Demanda MO sem perdas (kg)
  const demandaMO_semPerdas_kg = demandaMS_total_kg / (teor_ms_percent / 100);

  // 3. Demanda MO com perdas (kg)
  const demandaMO_comPerdas_kg = demandaMO_semPerdas_kg * (1 + perdas_percent / 100);

  // 4. Consumo diário MO (kg/dia)
  const consumoDiarioMO_kg = demandaMO_semPerdas_kg / periodo_dias;

  // 5. Área de plantio (ha)
  const areaPlanio_ha = demandaMO_comPerdas_kg / (produtividade_ton_mo_ha * 1000);

  // 6. Área mínima painel frontal (m²)
  const areaPainel_m2 = consumoDiarioMO_kg / taxa_retirada_kg_m2_dia;

  // Participação de cada categoria
  const categorias_com_participacao: CategoriaCalculo[] = categorias_ajustadas.map(cat => {
    const demanda_cat_kg = cat.quantidade_cabecas * cat.silagem_ms_dia_kg * periodo_dias;
    return {
      ...cat,
      demanda_ms_ton: demanda_cat_kg / 1000,
      participacao_pct: (demanda_cat_kg / demandaMS_total_kg) * 100,
    };
  }).filter(cat => cat.quantidade_cabecas > 0).sort(
    (a, b) => b.participacao_pct - a.participacao_pct
  );

  return {
    demanda_ms_total_ton: demandaMS_total_kg / 1000,
    demanda_mo_sem_perdas_ton: demandaMO_semPerdas_kg / 1000,
    demanda_mo_com_perdas_ton: demandaMO_comPerdas_kg / 1000,
    consumo_diario_mo_kg: Math.round(consumoDiarioMO_kg),
    area_plantio_ha: parseFloat(areaPlanio_ha.toFixed(1)),
    area_painel_m2: parseFloat(areaPainel_m2.toFixed(1)),
    categorias_calculo: categorias_com_participacao,
  };
}

/**
 * Gera exemplos de dimensão do painel frontal do silo
 * 
 * Entrada: area_m2 (number)
 * Saída: Array de { largura: number, altura: number, area: number } (2–3 exemplos)
 * 
 * Lógica:
 * - Gerar combinações com largura entre 2.0 e 8.0 m (step 0.5)
 * - Altura = area_m2 / largura
 * - Filtrar alturas entre 1.5 e 4.5 m (range realista para silos)
 * - Retornar 2–3 combinações mais equilibradas
 * - Arredondar largura e altura para 1 casa decimal
 */
export function gerarExemplosDimensaoPainel(area_m2: number): Array<{ largura: number; altura: number; area: number }> {
  const exemplos: Array<{ largura: number; altura: number; area: number }> = [];
  
  for (let largura = 2.0; largura <= 8.0; largura += 0.5) {
    const altura = area_m2 / largura;
    if (altura >= 1.5 && altura <= 4.5) {
      exemplos.push({
        largura: parseFloat(largura.toFixed(1)),
        altura: parseFloat(altura.toFixed(1)),
        area: parseFloat((largura * altura).toFixed(1)),
      });
    }
  }
  
  // Retornar 2–3 mais equilibradas (proporção mais próxima de 1:1)
  const melhorEquilibrio = exemplos.sort(
    (a, b) => Math.abs(a.altura - a.largura) - Math.abs(b.altura - b.largura)
  ).slice(0, 3);
  
  return melhorEquilibrio;
}

/**
 * Calcula painel para múltiplos silos abertos simultaneamente
 * 
 * Entrada: area_m2 (number), num_silos (number)
 * Saída: { area_por_silo: number, exemplo: { largura: number, altura: number } }
 */
export function calcularPainelMultiplosSilos(
  area_m2: number,
  num_silos: number
): { area_por_silo: number; exemplo: { largura: number; altura: number } } {
  const area_por_silo = area_m2 / num_silos;
  const exemplos = gerarExemplosDimensaoPainel(area_por_silo);
  
  return {
    area_por_silo: parseFloat(area_por_silo.toFixed(1)),
    exemplo: exemplos.length > 0 
      ? { largura: exemplos[0].largura, altura: exemplos[0].altura }
      : { largura: 2.0, altura: area_por_silo / 2.0 },
  };
}

/**
 * Gera alertas dinâmicos
 */
export function gerarAlertasDinamicos(
  parametros: ParametrosPlanejamento,
  resultados: ResultadosPlanejamento,
  sistema: DefinicaoSistema
): AlertaPlanejamento[] {
  const alertas: AlertaPlanejamento[] = [];

  if (parametros.teor_ms_percent < LIMITES_ALERTAS.teor_ms_critico_baixo) {
    alertas.push({
      tipo: 'warning',
      mensagem: `Silagem com MS abaixo de 28% pode apresentar perdas elevadas por efluente e fermentação clostrídica. Considere emurchecimento ou aditivos absorventes.`,
    });
  }

  if (parametros.teor_ms_percent > LIMITES_ALERTAS.teor_ms_critico_alto) {
    alertas.push({
      tipo: 'warning',
      mensagem: `Silagem com MS acima de 38% tem maior risco de aquecimento e baixa compactação. Atenção à vedação e ao processamento de grãos.`,
    });
  }

  // ... Mais alertas conforme tabela da seção 6.3 do documento

  return alertas;
}
```

---

### 2.6 Schemas de Validação Zod

#### `lib/validators/planejamento-silagem.ts` (NEW — 150–200 linhas)
- **Responsabilidade:** Schemas Zod para cada etapa do wizard + validações cross-field
- **Schemas:**

```typescript
import { z } from 'zod';

// Etapa 1
export const Etapa1SistemaSchema = z.object({
  tipo_rebanho: z.enum(['Leite', 'Corte'], {
    errorMap: () => ({ message: 'Selecione um tipo de rebanho' }),
  }),
  sistema_producao: z.enum(['pasto', 'semiconfinado', 'confinado'], {
    errorMap: () => ({ message: 'Selecione um sistema de produção' }),
  }),
});

// Etapa 2
export const Etapa2RebanhoSchema = z.object({
  rebanho: z.record(z.number().int().min(0, 'Quantidade deve ser ≥ 0')),
}).refine(
  (data) => Object.values(data.rebanho).reduce((a, b) => a + b, 0) >= 1,
  { message: 'Cadastre ao menos 1 animal' }
);

// Etapa 3
export const Etapa3ParametrosSchema = z.object({
  periodo_dias: z.number()
    .int('Período deve ser inteiro')
    .min(1, 'Informe um período entre 1 e 365 dias')
    .max(365, 'Informe um período entre 1 e 365 dias'),
  cultura: z.enum(['Milho', 'Sorgo']),
  teor_ms_percent: z.number()
    .min(25, 'Teor de MS deve ser entre 25% e 40%')
    .max(40, 'Teor de MS deve ser entre 25% e 40%'),
  perdas_percent: z.number()
    .min(15, 'Perdas devem ser entre 15% e 30%')
    .max(30, 'Perdas devem ser entre 15% e 30%'),
  produtividade_ton_mo_ha: z.number()
    .min(25, 'Produtividade fora da faixa esperada')  // min do Sorgo
    .max(65, 'Produtividade fora da faixa esperada'),  // max do Milho
  taxa_retirada_kg_m2_dia: z.number()
    .min(200, 'Taxa deve ser entre 200 e 350 kg/m²/dia')
    .max(350, 'Taxa deve ser entre 200 e 350 kg/m²/dia'),
}).refine(
  (data) => {
    if (data.cultura === 'Milho') {
      return data.produtividade_ton_mo_ha >= 30 && data.produtividade_ton_mo_ha <= 65;
    }
    if (data.cultura === 'Sorgo') {
      return data.produtividade_ton_mo_ha >= 25 && data.produtividade_ton_mo_ha <= 55;
    }
    return true;
  },
  { message: 'Produtividade fora da faixa para a cultura selecionada' }
);

export type Etapa1Sistema = z.infer<typeof Etapa1SistemaSchema>;
export type Etapa2Rebanho = z.infer<typeof Etapa2RebanhoSchema>;
export type Etapa3Parametros = z.infer<typeof Etapa3ParametrosSchema>;
```

---

### 2.7 Queries de Banco de Dados

#### Adicionar em `lib/supabase/queries-audit.ts` (NEW section — 50–80 linhas)
- **Responsabilidade:** Queries para tabela `planejamentos_silagem`
- **Funções:**

```typescript
const planejamentosSilagem = {
  async list(): Promise<PlanejamentoSilagem[]> {
    const { data, error } = await supabase
      .from('planejamentos_silagem')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  async create(payload: Omit<PlanejamentoSilagem, 'id' | 'created_at'>): Promise<PlanejamentoSilagem> {
    const { data, error } = await supabase
      .from('planejamentos_silagem')
      .insert([payload])
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('planejamentos_silagem')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  },
};

// Exportar ao final
export const q = {
  // ... queries existentes ...
  planejamentosSilagem,
};
```

---

## 3. Arquivos a MODIFICAR (lista completa)

### 3.1 Sidebar/Menu do Dashboard

#### `components/Sidebar.tsx`
- **O que mudar:**
  - Substituir item de menu "Rebanho" e "Simulador" por **um único item** "Planejamento de Silagem"
  - Atualizar href: `/dashboard/planejamento-silagem`
- **Linha aproximada:** Menu navigation section
- **O que NÃO tocar:** Estrutura geral de navegação, outros itens de menu
- **Razão:** Consolidação de módulos

---

### 3.2 Tipos TypeScript

#### `lib/supabase.ts`
- **O que mudar:**
  - Adicionar import: `import { PlanejamentoSilagem } from './types/planejamento-silagem'`
  - Exportar: `export type { PlanejamentoSilagem }`
  - ⚠️ **NÃO remover** tipos `CategoriaRebanho`, `PeriodoConfinamento` (ainda podem ser usados em relatórios ou consultas históricas)
- **O que NÃO tocar:** Tipos de Silos, Fazendas, Talhões
- **Razão:** Manter tipos antigos para compatibilidade com banco (dados históricos podem existir)

---

### 3.3 Queries Existentes

#### `lib/supabase/queries-audit.ts`
- **O que mudar:**
  - Adicionar novo objeto `planejamentosSilagem` (ver seção 2.7)
  - Exportar ao final: `export const q = { ..., planejamentosSilagem }`
- **O que NÃO tocar:**
  - Queries `categoriasRebanho`, `periodosConfinamento` (podem ser removidas depois se não há dependências)
  - Queries `silos`, `movimentacoesSilo`, `ciclosAgricolas`
- **Razão:** Adicionar suporte para salvar planejamentos

---

### 3.4 App Router / Página do Dashboard

#### `app/dashboard/page.tsx` (ou `app/layout.tsx` conforme estrutura)
- **O que mudar:**
  - Se há redirecionamento para `/dashboard/rebanho` em algum lugar, remover
  - Se há link hardcoded para rebanho/simulador em cards, remover
- **O que NÃO tocar:** Dashboard home, outros cards
- **Razão:** Limpeza de referências a módulos removidos

---

## 4. Arquivos a REMOVER

| Arquivo | Razão para Remoção |
|---------|-------------------|
| `app/dashboard/rebanho/` | Substituído por Planejamento Integrado |
| `app/dashboard/simulador/` | Substituído por Planejamento Integrado |

**Verificação de dependências:**
1. Buscar `import from 'dashboard/rebanho'` em todo codebase → remover
2. Buscar `import from 'dashboard/simulador'` em todo codebase → remover
3. Buscar `/dashboard/rebanho` e `/dashboard/simulador` em queries, navegação, testes → remover/atualizar
4. Verificar se `CategoriaRebanho` e `PeriodoConfinamento` são importadas em outros arquivos:
   - Se sim e ainda usadas: manter tipos em `supabase.ts`
   - Se não: podem ser removidas após análise

---

## 5. Schema do Banco de Dados

### 5.1 Nova Tabela

#### `planejamentos_silagem`
```sql
CREATE TABLE IF NOT EXISTS planejamentos_silagem (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id                  UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome                        TEXT NOT NULL,              -- Ex: "Rebanho Leiteiro 2026-06"
  
  -- Dados do planejamento (JSON)
  sistema                     JSONB NOT NULL,             -- DefinicaoSistema
  rebanho                     JSONB NOT NULL,             -- CategoriaComQuantidade[]
  parametros                  JSONB NOT NULL,             -- ParametrosPlanejamento
  resultados                  JSONB NOT NULL,             -- ResultadosPlanejamento
  
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE planejamentos_silagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso_fazenda_planejamentos" ON planejamentos_silagem
  FOR ALL USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX idx_planejamentos_fazenda ON planejamentos_silagem(fazenda_id);
```

### 5.2 Migrações SQL

**Nome sugerido:** `supabase/migrations/20260416_planejamento_silagem.sql`

```sql
-- Criar tabela
CREATE TABLE IF NOT EXISTS planejamentos_silagem (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id                  UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome                        TEXT NOT NULL,
  sistema                     JSONB NOT NULL,
  rebanho                     JSONB NOT NULL,
  parametros                  JSONB NOT NULL,
  resultados                  JSONB NOT NULL,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE planejamentos_silagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso_fazenda_planejamentos" ON planejamentos_silagem
  FOR ALL USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));

-- Index
CREATE INDEX idx_planejamentos_fazenda ON planejamentos_silagem(fazenda_id);

-- NOTA: Se no futuro for implementada edição de planejamentos,
-- adicionar trigger para atualizar updated_at automaticamente:
--
-- CREATE OR REPLACE FUNCTION update_updated_at_planejamentos()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = NOW();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER trigger_updated_at_planejamentos
--   BEFORE UPDATE ON planejamentos_silagem
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_planejamentos();

-- Opcional: Se remover tabelas antigas
-- DROP TABLE IF EXISTS categorias_rebanho CASCADE;
-- DROP TABLE IF EXISTS periodos_confinamento CASCADE;
```

---

## 6. Tipos TypeScript

### 6.1 Tipos Principais

**Arquivo:** `lib/types/planejamento-silagem.ts` (completo — ver seção 2.4)

```typescript
// Exportados:
export type TipoRebanho = 'Leite' | 'Corte';
export type SistemaProducao = 'pasto' | 'semiconfinado' | 'confinado';
export interface DefinicaoSistema { ... }
export interface CategoriaPreDefinida { ... }
export interface CategoriaComQuantidade { ... }
export interface ParametrosPlanejamento { ... }
export interface WizardState { ... }
export interface CategoriaCalculo { ... }
export interface ResultadosPlanejamento { ... }
export interface AlertaPlanejamento { ... }
export interface PlanejamentoSilagem { ... }
```

### 6.2 Constantes de Categorias

**Arquivo:** `lib/constants/planejamento-silagem.ts` (completo — ver seção 2.4)

```typescript
// Exportados:
export const CATEGORIAS_LEITE: CategoriaPreDefinida[] = [L1, L2, ..., L7];
export const CATEGORIAS_CORTE: CategoriaPreDefinida[] = [C1, C2, ..., C6];
export const FATORES_SISTEMA: Record<SistemaProducao, ...> = {...};
export const RANGES_PARAMETROS = {...};
export const DEFAULTS_PARAMETROS: ParametrosPlanejamento = {...};
export const LIMITES_ALERTAS = {...};
```

### 6.3 Tipos a Manter

- ✅ `CategoriaRebanho` — manter em `lib/supabase.ts` para compatibilidade com dados históricos
- ✅ `PeriodoConfinamento` — idem
- ✅ `AvaliacaoBromatologica` — idem (já incompleto, não mexer agora)

### 6.4 Tipos a Remover

- ❌ Nenhum. Manter histórico no banco.

---

## 7. Schemas Zod de Validação

**Arquivo:** `lib/validators/planejamento-silagem.ts` (completo — ver seção 2.6)

```typescript
export const Etapa1SistemaSchema = z.object({...});
export const Etapa2RebanhoSchema = z.object({...}).refine(...);
export const Etapa3ParametrosSchema = z.object({...}).refine(...);

export type Etapa1Sistema = z.infer<typeof Etapa1SistemaSchema>;
export type Etapa2Rebanho = z.infer<typeof Etapa2RebanhoSchema>;
export type Etapa3Parametros = z.infer<typeof Etapa3ParametrosSchema>;
```

---

## 8. Componentes UI

### 8.1 Componentes Principais (4 telas do wizard)

| Componente | Props | Responsabilidade |
|---|---|---|
| `Etapa1Sistema` | `wizard`, `onNext`, `errors` | Seleção tipo/sistema |
| `Etapa2Rebanho` | `wizard`, `onNext`, `onBack`, `errors` | Input de quantidade |
| `Etapa3Parametros` | `wizard`, `onNext`, `onBack`, `errors` | Input de parâmetros |
| `Etapa4Resultados` | `wizard`, `resultados`, `alertas`, `onBack`, `onSave`, `isSaving` | Exibição de resultados |

### 8.2 Componentes Auxiliares

| Componente | Props | Responsabilidade |
|---|---|---|
| `WizardContainer` | Nenhuma | Orchestração do fluxo |
| `Breadcrumb` | `etapaAtual`, `labels?` | Progresso visual |
| `AlertasDinamicos` | `alertas` | Lista de alertas |
| `TabelaDetalhamento` | `categorias` | Tabela de demanda |
| `GraficoParticipacao` | `dados` | Gráfico de barras |

### 8.3 Padrões UI

- **Formulários:** shadcn/ui Input, Select, Slider
- **Cards:** shadcn/ui Card com hover + shadow
- **Botões:** shadcn/ui Button (primary, outline)
- **Ícones:** Lucide React (ChevronRight, AlertCircle, Info, etc.)
- **Gráficos:** Recharts BarChart (horizontal)
- **Notificações:** Sonner toast (sucesso/erro)
- **Tabelas:** shadcn/ui Table
- **Validação inline:** Mensagens de erro vermelhas abaixo de inputs

---

## 9. Lógica de Cálculo

**Arquivo:** `lib/services/planejamento-silagem.ts` (completo — ver seção 2.5)

### Funções Principais

```typescript
// 1. Ajustar categoria conforme sistema
calcularCategoriaComAjustes(
  categoria: CategoriaPreDefinida,
  quantidade_cabecas: number,
  fator_consumo: number,
  fator_silagem: number
): CategoriaCalculo

// 2. Calcular demanda MS de uma categoria
calcularDemandaCategoria(
  cat: CategoriaCalculo,
  periodo_dias: number
): number

// 3. Calcular todos os resultados finais
calcularResultados(
  categorias_ajustadas: CategoriaCalculo[],
  periodo_dias: number,
  teor_ms_percent: number,
  perdas_percent: number,
  produtividade_ton_mo_ha: number,
  taxa_retirada_kg_m2_dia: number
): ResultadosPlanejamento

// 4. Gerar alertas dinâmicos
gerarAlertasDinamicos(
  parametros: ParametrosPlanejamento,
  resultados: ResultadosPlanejamento,
  sistema: DefinicaoSistema
): AlertaPlanejamento[]
```

### Fluxo de Execução

1. Usuário preenche Etapa 1 → `DefinicaoSistema`
2. Usuário preenche Etapa 2 → `WizardState.rebanho = { [catId]: quantidade }`
3. Usuário preenche Etapa 3 → `ParametrosPlanejamento`
4. Ao clicar "Calcular":
   - `CATEGORIAS_LEITE` (ou `CORTE`) + quantidades → `CategoriaComQuantidade[]`
   - Para cada categoria: `calcularCategoriaComAjustes()` → `CategoriaCalculo[]`
   - `calcularResultados()` com todos os parâmetros → `ResultadosPlanejamento`
   - `gerarAlertasDinamicos()` → `AlertaPlanejamento[]`
   - Renderizar Etapa 4 com resultados e alertas

---

## 10. Fluxo de Navegação

### Rota e Entrada no Menu

- **Rota:** `/dashboard/planejamento-silagem`
- **Menu:** Sidebar → "Planejamento de Silagem" (ícone de calculadora ou semelhante)
- **Desativa:** "Rebanho" e "Simulador" removidos do menu

### Fluxo do Wizard

```
Página: /dashboard/planejamento-silagem
    ↓
[WizardContainer] controla etapa interna
    ↓
Etapa 1 — Sistema
├─ Radio: Tipo de Rebanho (Leite / Corte)
├─ Select: Sistema Produção
└─ Botão: Próximo →
    ↓ Validação OK, avança para Etapa 2
Etapa 2 — Rebanho
├─ Tabela de Categorias (conforme Tipo da Etapa 1)
├─ Inputs: Quantidade de cabeças
└─ Botões: ← Voltar | Próximo →
    ↓ Validação OK (∑ ≥ 1), avança para Etapa 3
Etapa 3 — Parâmetros
├─ Input: Período (1-365 dias)
├─ Select: Cultura (Milho / Sorgo)
├─ Input: Teor MS (25-40%)
├─ Input: Perdas (15-30%)
├─ Input: Produtividade (30-65 ou 25-55 conforme Cultura)
├─ Input: Taxa Retirada (200-350 kg/m²/dia)
└─ Botões: ← Voltar | Calcular →
    ↓ Validação OK, executa cálculos e avança para Etapa 4
Etapa 4 — Resultados
├─ Cards: Demanda MS, Demanda MO, Consumo diário, Área, Painel
├─ Tabela: Detalhamento por Categoria (sem n=0)
├─ Gráfico: Barras horizontais (participação %)
├─ Alertas Fixos (4 mensagens padrão)
├─ Alertas Dinâmicos (até 12 condições)
├─ Input: Nome do Planejamento
└─ Botões: ← Voltar | Salvar | Exportar PDF (placeholder)
    ↓ "Salvar"
[Confirmação] Toast: "Planejamento salvo com sucesso"
[Redirect] Volta para Dashboard ou Página de Histórico
```

### Ao Clicar "Voltar"

- Etapa 2 → Etapa 1: Mantém dados de Etapa 1 salvos em memória
- Etapa 3 → Etapa 2: Mantém dados de Etapas 1 e 2 salvos
- Etapa 4 → Etapa 3: Pode recalcular (ou reusar resultados anteriores)

### Ao Clicar "Salvar" (Etapa 4)

```typescript
const payload: Omit<PlanejamentoSilagem, 'id' | 'created_at'> = {
  fazenda_id: currentFazendaId,
  nome: inputNome, // usuário digitou
  data_criacao: new Date().toISOString(),
  sistema: wizard.sistema,
  rebanho: [categorias com quantidade],
  parametros: wizard.parametros,
  resultados: resultadosCalculados,
};

await q.planejamentosSilagem.create(payload);
```

---

## 11. Alertas e Feedback

### Alertas Fixos (sempre exibidos em Etapa 4)

1. "Valores estimados com base em parâmetros médios. Ajuste conforme manejo real e orientação de nutricionista."
2. "Inclui margem de segurança de **{X}%** para perdas." (onde {X} = `parametros.perdas_percent`)
3. "Dietas com maior proporção de concentrado reduzem a participação da silagem. Consulte um nutricionista para otimizar a relação volumoso:concentrado."
4. "A área do painel frontal indica o tamanho **MÁXIMO** para manter taxa de retirada ≥ **{Y}** kg/m²/dia, minimizando deterioração aeróbia (Bernardes et al., 2021)." (onde {Y} = `parametros.taxa_retirada_kg_m2_dia`)

### Alertas Dinâmicos (condições da tabela 6.3 do documento técnico)

| Condição | Tipo | Mensagem |
|----------|------|----------|
| MS < 28% | ⚠️ | "Silagem com MS abaixo de 28% pode apresentar perdas elevadas..." |
| MS > 38% | ⚠️ | "Silagem com MS acima de 38% tem maior risco de aquecimento..." |
| Perdas = 15% | ⓘ | "Perdas de 15% representam silo muito bem manejado..." |
| Área > 30 ha | ⓘ | "Área elevada de plantio. Considere escalonar..." |
| Cultura = Sorgo + Leite | ⓘ | "Silagem de sorgo pode ter menor valor energético..." |
| Confinado + %Sil > 70% | ⚠️ | "Participação de silagem acima de 70%..." |
| Período ≥ 300 dias | ⓘ | "Fornecimento prolongado..." |
| Área Painel > 20 m² | ⓘ | "Área de painel elevada. Considere dividir..." |
| Área Painel < 4 m² | ⚠️ | "Consumo diário baixo para silos convencionais..." |
| Taxa Retirada < 250 | ⚠️ | "Taxa de retirada abaixo de 250 kg/m²/dia..." |
| Pasto + Suplementação | ⓘ | "Em sistemas a pasto com baixo consumo diário..." |

### Toast Notifications

- ✅ **"Planejamento salvo com sucesso!"** — ao clicar "Salvar" e POST retornar 201
- ❌ **"Erro ao salvar. Tente novamente."** — se POST retornar erro
- ⚠️ **"Por favor, preencha todos os campos obrigatórios"** — ao clicar "Próximo" com validação falha

---

## 12. Testes Sugeridos

### Casos de Teste Críticos (usando exemplos do documento técnico)

#### Teste 1: Rebanho Leiteiro Semi-confinado (180 dias)

**Dados de Entrada:**
- Sistema: Leite / Semi-confinado
- Rebanho: L1=30, L2=15, L3=10, L4=5, L5=20, L6=15, L7=10 (Total: 105 cab)
- Parâmetros: 180 dias, Milho, 33% MS, 20% perdas, 50 ton/ha, 250 kg/m²/dia

**Resultados Esperados (tolerância ±1% para arredondamentos):**
- Demanda MS total: **125,0 ton**
- Demanda MO sem perdas: **378,7 ton**
- Demanda MO com perdas: **454,5 ton**
- Consumo diário MO: **2.104 kg/dia** (ou 2104)
- Área plantio: **9,1 ha**
- Área painel: **8,4 m²**

**Participação por categoria (verificar ordem):**
| Categoria | Participação | Esperado |
|-----------|--------------|----------|
| L1 | X% | 40,4% |
| L2 | X% | 21,6% |
| L5 | X% | 15,1% |
| L3 | X% | 11,3% |
| L6 | X% | 6,3% |
| L4 | X% | 4,4% |
| L7 | X% | 0,8% |

---

#### Teste 2: Rebanho de Corte Confinado (365 dias)

**Dados de Entrada:**
- Sistema: Corte / Confinado
- Rebanho: C3=100, C4=200 (Total: 300 cab)
- Parâmetros: 365 dias, Milho, 33% MS, 20% perdas, 50 ton/ha, 250 kg/m²/dia

**Resultados Esperados:**
- Demanda MS total: **774,2 ton**
- Demanda MO sem perdas: **2.346,0 ton**
- Demanda MO com perdas: **2.815,2 ton**
- Consumo diário MO: **6.427 kg/dia**
- Área plantio: **56,3 ha**
- Área painel: **25,7 m²**

**Participação:**
| Categoria | Esperado |
|-----------|----------|
| C4 | 72,1% |
| C3 | 27,9% |

---

### Casos de Teste de Validação

| Caso | Entrada | Erro Esperado |
|------|---------|---------------|
| 0 animais | ∑ cabeças = 0 | "Cadastre ao menos 1 animal" |
| Período = 0 | período_dias = 0 | "Informe um período entre 1 e 365 dias" |
| Período = 366 | período_dias = 366 | "Informe um período entre 1 e 365 dias" |
| MS = 24 | teor_ms = 24 | "Teor de MS deve ser entre 25% e 40%" |
| MS = 41 | teor_ms = 41 | "Teor de MS deve ser entre 25% e 40%" |
| Perdas = 14 | perdas = 14 | "Perdas devem ser entre 15% e 30%" |
| Produtividade Milho = 29 | prod = 29, cultura = Milho | "Produtividade fora da faixa..." |
| Produtividade Sorgo = 56 | prod = 56, cultura = Sorgo | "Produtividade fora da faixa..." |
| Taxa Retirada = 199 | taxa = 199 | "Taxa deve ser entre 200 e 350 kg/m²/dia" |

---

### Casos de Teste de Alertas

| Condição | Alerta Esperado |
|----------|-----------------|
| MS = 27% | ⚠️ "Silagem com MS abaixo de 28%..." |
| MS = 39% | ⚠️ "Silagem com MS acima de 38%..." |
| Área = 31 ha | ⓘ "Área elevada de plantio..." |
| Cultura = Sorgo + Leite | ⓘ "Silagem de sorgo pode ter menor valor..." |
| Área Painel = 21 m² | ⓘ "Área de painel elevada..." |
| Período = 300 dias | ⓘ "Fornecimento prolongado..." |

---

### Testes de UI/UX

1. **Navegação do Wizard:**
   - Clicar "Próximo" sem preencher campos → mostra erros inline
   - Clicar "Voltar" em cada etapa → volta sem perder dados
   - Breadcrumb atualiza conforme navegação

2. **Interação com Inputs:**
   - Inputs numéricos: aceita apenas números
   - Sliders: movem e atualizam label de valor
   - Selects: dropdown abre e fecha corretamente

3. **Responsividade:**
   - Desktop (1920px): tela normal
   - Tablet (768px): inputs em coluna, cards stackados
   - Mobile (375px): tipicamente não adequado para wizard (pode desabilitar ou fazer versão simplificada)

---

## 13. Ordem de Implementação

### Fase 1: Infra + Tipos (Low — 2–3 days)

1. ✅ Criar `lib/types/planejamento-silagem.ts` com todos os tipos
2. ✅ Criar `lib/constants/planejamento-silagem.ts` com categorias e fatores
3. ✅ Criar migração SQL `supabase/migrations/20260416_planejamento_silagem.sql`
4. ✅ Executar migração no Supabase
5. ✅ Atualizar `lib/supabase.ts` para exportar novos tipos
6. ✅ Criar `lib/validators/planejamento-silagem.ts` com schemas Zod

**Bloqueio:** Nenhum. Pode rodar em paralelo.

---

### Fase 2: Serviços + Queries (Low — 1–2 days)

1. ✅ Criar `lib/services/planejamento-silagem.ts` com funções de cálculo
2. ✅ Testar funções com dados dos dois exemplos numéricos (manual ou unit tests)
3. ✅ Adicionar `planejamentosSilagem` queries em `lib/supabase/queries-audit.ts`

**Bloqueio:** Fase 1 deve estar completa.

---

### Fase 3: Componentes (Medium — 3–4 days)

1. ✅ Criar `app/dashboard/planejamento-silagem/` directory + `page.tsx` + `layout.tsx`
2. ✅ Criar `WizardContainer.tsx` (orquestração)
3. ✅ Criar `Etapa1Sistema.tsx` (simples)
4. ✅ Criar `Etapa2Rebanho.tsx` (tabela interativa)
5. ✅ Criar `Etapa3Parametros.tsx` (inputs com validação)
6. ✅ Criar `Etapa4Resultados.tsx` (complexo: cards, tabela, gráfico, alertas)
7. ✅ Criar componentes auxiliares: `Breadcrumb`, `AlertasDinamicos`, `TabelaDetalhamento`, `GraficoParticipacao`

**Bloqueio:** Fase 2 deve estar completa.

---

### Fase 4: Integração + Testes (Medium — 2–3 days)

1. ✅ Conectar `WizardContainer` para chamar `q.planejamentosSilagem.create()` ao salvar
2. ✅ Testar fluxo end-to-end com exemplos numéricos
3. ✅ Ajustar alertas dinâmicos conforme saída
4. ✅ Testar responsividade (desktop, tablet)
5. ✅ Validar RLS no banco (usuário só vê planejamentos da sua fazenda)

**Bloqueio:** Fase 3 deve estar completa.

---

### Fase 5: Remoção Módulos Antigos (Low — 1 day)

1. ✅ Deletar `/app/dashboard/rebanho/`
2. ✅ Deletar `/app/dashboard/simulador/`
3. ✅ Buscar e remover imports de `dashboard/rebanho` e `dashboard/simulador` em todo codebase
4. ✅ Atualizar `Sidebar.tsx` para remover itens antigos e adicionar "Planejamento de Silagem"
5. ✅ Testar navegação

**Bloqueio:** Fase 4 deve estar testada e validada (dados salvam corretamente).

---

## 14. Complexidade e Riscos

### Complexidade por Componente

| Componente | Complexidade | Razão |
|---|---|---|
| `Etapa1Sistema` | Baixa | Apenas selects/radios, sem cálculo |
| `Etapa2Rebanho` | Média | Tabela dinâmica com inputs, soma de total |
| `Etapa3Parametros` | Média | Múltiplos inputs com validações cross-field |
| `Etapa4Resultados` | **Alta** | Tabela, gráfico, alertas dinâmicos (12 condições), display de resultados |
| `WizardContainer` | Média | State management de 4 etapas, validação |
| `calcularResultados()` | Média | 6 cálculos em cascata, ordem importa |
| `gerarAlertasDinamicos()` | Média | 11 condições para verificar |

**Maior esforço:** Etapa 4 (Resultados) — muitos elementos visuais + lógica de renderção condicional.

---

### Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---|---|---|
| Arredondamentos nos cálculos diferem dos exemplos | Média | Baixo | Testar com exemplos numéricos, usar `parseFloat(x.toFixed(1))` |
| Alertas dinâmicos não triggerem corretamente | Média | Médio | Testar cada condição individualmente |
| RLS no Supabase não funciona (usuário vê planejamentos de outro) | Baixa | **Alto** | Testar com múltiplos usuários antes de release |
| Responsividade ruim em mobile | Média | Baixo | Testar em 375px, ajustar layout se necessário |
| Performance lenta se muitas categorias | Baixa | Baixo | Usar `useMemo` para cálculos custosos |

---

## 15. Considerações Finais

### O que NÃO fazer

- ❌ Não remover tipos `CategoriaRebanho` e `PeriodoConfinamento` (podem ter dados históricos)
- ❌ Não alterar `next.config.js` ou `.env`
- ❌ Não editorializar mensagens de alertas (usar textos exatos do documento)
- ❌ Não implementar "Exportar PDF" ainda (apenas placeholder com toast: "Feature em desenvolvimento")
- ❌ Não permitir edição de categorias pré-definidas (são constantes immutáveis)

### Checklist Final

- [ ] Tipos criados e tipados corretamente (strict mode)
- [ ] Banco de dados pronto (migration executada)
- [ ] Queries funcionando (read + create)
- [ ] Funções de cálculo testadas com 2 exemplos
- [ ] Componentes renderizados sem erros (React 19)
- [ ] Validações Zod funcionando com mensagens pt-BR
- [ ] Alertas dinâmicos todos triggerados corretamente
- [ ] Gráfico de barras renderiza dados corretos
- [ ] Wizard navega corretamente (voltar/próximo)
- [ ] "Salvar" persiste em Supabase
- [ ] RLS validada (usuário vê só seus planejamentos)
- [ ] Sidebar atualizada
- [ ] Módulos antigos deletados
- [ ] Testes end-to-end passam

---

**Data Gerada:** 16 de abril de 2026  
**Próxima Etapa:** Implementação (Fase 1 — Tipos e Infra)
