# PRD — Módulo de Calculadoras Agronômicas | GestSilo Pro

**Status**: 🟠 Parcialmente Implementado | **Versão**: 2.0 | **Data**: 2026-04-15  
**Responsável**: Estrutura base pronta, integração e features avançadas pendentes

---

## 1. Visão Geral

O módulo de **Calculadoras Agronômicas** oferece ferramentas de precisão para auxiliar produtores rurais em decisões técnicas críticas: **calagem de solos** (corretivo de pH) e **adubação NPK** (balanceamento de nutrientes).

**Objetivo**: Processar cálculos complexos **100% client-side** (offline-ready para PWA), com validação de inputs, geração de laudos PDF e recomendações técnicas baseadas em análises de solo laboratoriais.

**Diferenciais**:
- ✅ Múltiplos métodos de cálculo para calagem (V%, Alumínio, Mg Manual)
- ✅ Otimizador inteligente de custo para adubação (testa combinações de fertilizantes)
- ✅ Geração de laudos PDF técnicos (assinável)
- ✅ Banco de 15+ fertilizantes padrão com atualização de preços
- ✅ Suporte para fertilizantes customizados por fazenda

---

## 2. Estado Atual (Pesquisa 2026-04-15)

### 2.1 Estrutura de Arquivos Existente

```
app/dashboard/calculadoras/
├── page.tsx                    ✅ (287 linhas — funcional com Tabs)

lib/
├── calculadoras.ts              ✅ (107 linhas — lógica de cálculo)
└── supabase/
    ├── index.ts
    ├── queries-audit.ts         (RLS + CRUD aplicável)
    └── insumos.ts              (Tipos Insumo já existem)

__tests__/
└── calculadoras.test.ts         ✅ (145 linhas — testes unitários Vitest)

components/ui/
├── card.tsx, button.tsx, input.tsx, tabs.tsx, dialog.tsx, select.tsx ✅
└── (shadcn/ui completo)
```

### 2.2 Funcionalidades Implementadas ✅

#### Calculadora de Calagem (NC)
- ✅ 3 métodos de cálculo implementados:
  1. **Saturação por Bases (V%)**: NC = ((V2 - V1) × CTC) / (PRNT × 10)
  2. **Neutralização de Al³⁺ + Ca²⁺/Mg²⁺**: NC = (Al × 2 + max(0, 2 - (Ca + Mg))) / (PRNT / 100)
  3. **Método MG Manual**: NC = max(0, 3×Al + (2 - (Ca + Mg))) / (PRNT / 100)
- ✅ Inputs: Al³⁺, Ca²⁺, Mg²⁺, CTC(T), V1, V2, PRNT, Área
- ✅ Outputs: Necessidade de Calagem (t/ha) + Total para área (toneladas)
- ✅ Validação básica (prnt e area obrigatórios)
- ✅ Testes unitários cobrindo 3 métodos + edge cases

#### Calculadora de Adubação NPK (Básica)
- ✅ Cálculo simples: dosePorHa = max(dose_N, dose_P, dose_K)
- ✅ Inputs: N (kg/ha), P₂O₅ (kg/ha), K₂O (kg/ha), Fertilizante selecionado, Área
- ✅ Outputs: Dose por hectare + Total para área
- ✅ Integração com tabela `insumos` (tipo = Fertilizante)
- ✅ Testes unitários para nutriente limitante

#### UI/UX
- ✅ Page layout com hero title + descrição
- ✅ Tabs para alternar entre Calagem e NPK
- ✅ Card de resultado destacado com cor primária
- ✅ Icons (lucide-react): Beaker, Sprout, Calculator, Download, etc.
- ✅ Cards com `bg-primary/10` e `border-primary/30` (design system)
- ✅ Dicas agronômicas em Cards secundários

### 2.3 Lacunas Identificadas ❌

| # | Funcionalidade | Impacto | Prioridade |
|---|---|---|---|
| 1 | Exportação PDF com jsPDF | Usuários não conseguem gerar laudos | 🔴 Alta |
| 2 | Validação Zod de inputs | Sem sanitização formal de dados | 🔴 Alta |
| 3 | Otimizador NPK avançado | Funciona com 1 fertilizante apenas, não testa combinações | 🟠 Média |
| 4 | Método SMP para calagem | Solos com alto poder tampão não cobertos | 🟠 Média |
| 5 | Método UFLA de calagem | Estratégia de Ca++ isolado não suportada | 🟠 Média |
| 6 | 5ª Aproximação MG dinâmica | Valores X/Y hardcoded, sem tabelas de argila/cultura | 🟡 Baixa |
| 7 | Banco de fertilizantes estruturado | UI não exibe lista padrão, integra só via Insumos | 🟡 Baixa |
| 8 | Histórico de cálculos (cache) | Usuários não conseguem rever cálculos passados | 🟡 Baixa |

### 2.4 Package.json — Dependências Verificadas

```json
{
  "dependencies": {
    "react": "^19.2.1",
    "next": "^15.4.9",
    "react-hook-form": "^7.72.1",
    "zod": "^4.3.6",
    "recharts": "^3.8.1",
    "sonner": "^2.0.7",
    "lucide-react": "^0.553.0",
    "shadcn": "^4.1.2",
    "motion": "^12.23.24",
    "xlsx": "^0.18.5"
  }
}
```

**Faltam para PDF**: `jspdf` (^2.5.1), `jspdf-autotable` (^3.5.0)

---

## 3. Referência: AgerPro (Adaptação Necessária)

O aplicativo **AgerPro** possui calculadoras avançadas que servirão como referência. **Adaptação**: Dados client-side, sem persistência de histórico (apenas cache de sessão), foco em cálculos puros.

### 3.1 Calculadora de Calagem (NC) — 5 Métodos Referência

#### Método 1: Saturação por Bases (V%)
```
NC (t/ha) = ((V2 - V1) × CTC) / (PRNT / 100)
Exemplo: V1=40%, V2=60%, CTC=5, PRNT=80%
NC = ((60-40) × 5) / 0.8 = 125/10 = 1.25 t/ha
```
✅ **JÁ IMPLEMENTADO**

#### Método 2: Neutralização de Alumínio + Elevação Ca²⁺/Mg²⁺
```
NC = (Al × 2 + max(0, 2 - (Ca + Mg))) / (PRNT / 100)
Presume: 2 cmolc/dm³ de Ca+Mg é adequado; Al × 2 é equivalente de CaO necessário
```
✅ **JÁ IMPLEMENTADO**

#### Método 3: Minas Gerais (5ª Aproximação)
```
NC = (Al × Y + (X - (Ca + Mg))) / (PRNT / 100)
Onde X e Y são fatores que variam por:
  - % de argila do solo
  - Cultura escolhida
Exemplo: Argila 20-40%, Milho → X=1.0, Y=2.0
```
❌ **FALTA IMPLEMENTAÇÃO** — requer tabela de fatores (argila × cultura)

#### Método 4: Índice SMP (Soilmoisture Plant)
```
pH_SMP = 6.52 + 1.4(pH_solo_0_1 - 7.0)
NC = base na tabela SMP correlacionada com poder tampão
Requer: tabela de interpolação SMP × textura
```
❌ **FALTA IMPLEMENTAÇÃO** — requer tabela SMP

#### Método 5: Teor de Cálcio Desejado (UFLA)
```
NC = (Ca_desejado - Ca_atual) / (PRNT / 100)
Valores de Ca desejado por cultura (ex: Milho = 6 cmolc/dm³)
Requer: tabela Ca desejado por cultura
```
❌ **FALTA IMPLEMENTAÇÃO** — requer tabela de culturas

### 3.2 Calculadora de Adubação NPK — Otimizador de Custo

#### Motor de Cálculo Avançado (NÃO implementado)
**Objetivo**: Testar combinações de **1, 2 e 3 fertilizantes** para encontrar a **melhor relação custo/benefício**.

**Processo**:
1. Input do usuário: N_nec, P_nec, K_nec (kg/ha), Área (ha)
2. **Algoritmo**:
   - Testa todos os fertilizantes para dose simples (combinações de 1)
   - Testa pares de fertilizantes (combinações de 2)
   - Testa trios de fertilizantes (combinações de 3)
   - Validação: Margem de erro de 10% (não excede mais de 10% cada nutriente)
   - Ordena por **custo total** (dose × preço/kg)
   - Retorna **top 5 opções** mais baratas

**Fórmula para Combinação Linear**:
```
Para 3 fertilizantes: Fert1(dose_x) + Fert2(dose_y) + Fert3(dose_z) = N_nec, P_nec, K_nec
Sistema linear 3×3:
  N1×x + N2×y + N3×z = N_nec
  P1×x + P2×y + P3×z = P_nec
  K1×x + K2×y + K3×z = K_nec
Resolvido por Cramer ou Gaussian elimination
Validação: Cada dose deve estar entre 0 e dose_max (limite prático)
```

#### Banco de Fertilizantes Padrão (15 itens)
```
1. Ureia (45-0-0)
2. MAP (12-52-0)
3. DAP (18-46-0)
4. KCl (0-0-60)
5. NPK 20-20-20
6. NPK 10-10-10
7. Nitrato de Potássio (13-0-46)
8. Fosfato Natural (0-30-0)
9. Nitrato de Cálcio (26-0-0)
10. Sulfato de Potássio (0-0-50)
11. Sulfato de Amônio (21-0-0)
12. Calcário (0-0-0, para referência)
13. Gesso (0-0-0, para referência)
14. Aquamônia (25-0-0, líquido)
15. Cloreto de Potássio Mop (0-0-58)
```

**Preços de Referência**: Atualizados mensalmente, armazenados no BD ou hardcoded com data de atualização

---

## 4. Arquitetura Proposta (Final)

### 4.1 Estrutura de Pastas

```
app/dashboard/calculadoras/
├── page.tsx                         (refactor — remove lógica pesada)
├── components/
│   ├── CalculadoraSelector.tsx      (cards para escolher a calculadora)
│   ├── CalagemCalculator.tsx        (componente reutilizável)
│   ├── NPKCalculator.tsx            (componente reutilizável)
│   ├── ResultCard.tsx               (card de resultado genérico)
│   └── index.ts
└── dialogs/
    └── ExportarLaudoPDFDialog.tsx   (modal para customizar PDF)

lib/
├── calculadoras.ts                  ✅ (estender com novos métodos)
├── calculadoras/
│   ├── calagem.ts                   (refactor: concentrar Calagem)
│   ├── npk.ts                       (refactor: concentrar NPK + otimizador)
│   ├── fertilizantes.ts             (banco de dados + preços)
│   └── tipos-calculadoras.ts        (tipos comuns)
└── pdf-export.ts                    (novo: gerar laudos)

lib/supabase/
├── calculadoras.ts                  (novo: CRUD de histórico — opcional)
└── (existente) insumos.ts

validators/
├── calculadoras.ts                  (novo: schemas Zod)
```

### 4.2 Componentes a Criar

#### 1. `CalculadoraSelector` (Nova página)
**Descrição**: Cards interativos para o usuário escolher qual calculadora usar.

**Props**: Nenhuma (page-level)

**Comportamento**:
- Grid de 2-3 cards (mobile: 1, tablet: 2, desktop: 3)
- Card por calculadora com ícone, título, descrição, botão "Abrir"
- Animações ao hover (motion)

#### 2. `CalagemCalculator` & `NPKCalculator`
**Refactor**: Extrair dos Tabs atuais do `page.tsx`

**CalagemCalculator**:
- Props: { initialMethod?: string, onResultChange?: (result) => void }
- Mantém estado local de inputs + resultados
- Valida com Zod antes de calcular
- Renderiza botão "Exportar Laudo PDF"

**NPKCalculator**:
- Props: { fertilizantes?: Insumo[], area?: number }
- Carrega fertilizantes via `useAuth` + query (ou props)
- Suporta modo simples (1 fertilizante) e otimizado (múltiplos)
- Valida com Zod

#### 3. `ResultCard`
**Descrição**: Card genérico para exibir resultado de qualquer calculadora.

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

#### 4. `ExportarLaudoPDFDialog`
**Descrição**: Dialog para customizar e exportar PDF com laudo técnico.

**Props**:
```typescript
{
  calculadora: 'calagem' | 'npk';
  dados: CalagemResult | NPKResult;
  inputs: CalagemInput | NPKInput;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Conteúdo do PDF**:
- Header com logo + "LAUDO TÉCNICO DE ADUBAÇÃO/CALAGEM"
- Dados da Fazenda (se integrado com auth)
- Método escolhido + Inputs resumidos
- Resultado final em destaque
- Recomendações técnicas de aplicação
- Rodapé com data/hora + "Gerado por GestSilo Pro"
- Campo para assinatura (espaço vazio)

### 4.3 Tipos Necessários (TypeScript)

```typescript
// lib/calculadoras/tipos-calculadoras.ts

export type MetodoCalagemType = 'saturacao' | 'al_ca_mg' | 'mg_manual' | 'smp' | 'ufla' | 'mg_5aprox';

export interface CalagemInput {
  metodo: MetodoCalagemType;
  al: string;
  ca: string;
  mg: string;
  v1: string;
  v2: string;
  ctc: string;
  prnt: string;
  area: string;
  // Opcional para métodos avançados:
  argila_percent?: string;
  cultura?: string;
  ph_smp?: string;
}

export interface CalagemResult {
  nc: number;           // t/ha
  total: number;        // toneladas
  metodo: MetodoCalagemType;
  validacoes?: string[]; // warnings/erros
}

export interface NPKInput {
  n_nec: string;
  p_nec: string;
  k_nec: string;
  area: string;
  fertilizante_id?: string;
  modo?: 'simples' | 'otimizado';
}

export interface FertilizanteOpcao {
  doses: { fert_id: string; dose_kg_ha: number }[];
  custoTotal: number;
  margemErro: { n: number; p: number; k: number };
}

export interface NPKResult {
  modo: 'simples' | 'otimizado';
  dosePorHa: number;
  total: number;
  fertNome: string;
  // Modo otimizado:
  top5Opcoes?: FertilizanteOpcao[];
  opcaoEscolhida?: FertilizanteOpcao;
}

export interface Fertilizante {
  id: string;
  nome: string;
  teor_n_percent: number;
  teor_p_percent: number;
  teor_k_percent: number;
  preco_kg?: number; // para otimizador
}
```

### 4.4 Validação com Zod

```typescript
// validators/calculadoras.ts

import { z } from 'zod';

const metodosCalagemSchema = z.enum(['saturacao', 'al_ca_mg', 'mg_manual', 'smp', 'ufla', 'mg_5aprox']);

export const calagemInputSchema = z.object({
  metodo: metodosCalagemSchema,
  al: z.string().transform(s => parseFloat(s) || 0).refine(n => n >= 0, 'Al³⁺ não pode ser negativo'),
  ca: z.string().transform(s => parseFloat(s) || 0).refine(n => n >= 0),
  mg: z.string().transform(s => parseFloat(s) || 0).refine(n => n >= 0),
  v1: z.string().transform(s => parseFloat(s) || 0).refine(n => n >= 0 && n <= 100, 'V1 deve estar entre 0 e 100'),
  v2: z.string().transform(s => parseFloat(s) || 0).refine(n => n >= 0 && n <= 100, 'V2 deve estar entre 0 e 100'),
  ctc: z.string().transform(s => parseFloat(s) || 0).refine(n => n > 0, 'CTC deve ser > 0'),
  prnt: z.string().transform(s => parseFloat(s) || 80).refine(n => n > 0 && n <= 100, 'PRNT deve estar entre 0 e 100'),
  area: z.string().transform(s => parseFloat(s) || 0).refine(n => n > 0, 'Área deve ser > 0'),
});

export const npkInputSchema = z.object({
  n_nec: z.string().transform(s => parseFloat(s) || 0).refine(n => n >= 0),
  p_nec: z.string().transform(s => parseFloat(s) || 0).refine(n => n >= 0),
  k_nec: z.string().transform(s => parseFloat(s) || 0).refine(n => n >= 0),
  area: z.string().transform(s => parseFloat(s) || 0).refine(n => n > 0, 'Área é obrigatória'),
  fertilizante_id: z.string().optional(),
});
```

### 4.5 Banco de Dados — Client-Side vs. Server

**Decisão**: **100% Client-Side (sem persistência no BD)**

**Justificativa**:
- Cálculos são determinísticos (saída = função pura dos inputs)
- Armazenar histórico teria pouco valor (usuário pode guardar PDF)
- Reduz queries ao Supabase
- Funciona offline no PWA

**Exceção (Futura)**: Opcional "Salvar cálculo" em BD (tabela `calculadoras_historico`) — low priority

---

## 5. Funcionalidades Planejadas (Escopo & Roadmap)

### Fase 1️⃣ — MVP (Alinhamento com Atual) — Sprint 1-2

✅ **Já existem / Manter**:
1. Calculadora de Calagem — 3 métodos
2. Calculadora de Adubação NPK — básico
3. Validação de inputs básica
4. UI com Tabs e Cards

🔴 **Implementar CRÍTICO**:
1. Validação Zod completa (safety)
2. Exportação PDF com jsPDF (laudo técnico)
3. Refactor: separar componentes em `components/`
4. Recomendações técnicas dinâmicas

### Fase 2️⃣ — Expansão (Referência AgerPro) — Sprint 3-4

🟠 **Implementar IMPORTANTE**:
1. Método SMP (interpolação de tabela)
2. Método UFLA (tabela Ca desejado)
3. Método 5ª Aproximação MG (fatores X/Y dinâmicos)
4. Otimizador NPK avançado (testa combinações 1/2/3 ferts)
5. Banco de fertilizantes estruturado com preços

🟡 **Implementar NICE-TO-HAVE**:
1. Histórico de cálculos (cache SessionStorage)
2. Ferramentas adicionais (dimensionamento silo, consumo silagem)
3. Integração com Weather API (dados de clima para recomendações)
4. Gráficos comparativos (Recharts)

### Fase 3️⃣ — Premium (Futuro) — Sprint 5+

- Análise de imagens de solo (IA/ML)
- Sincronização com dispositivos móveis (PWA)
- Integração com fornecedores de insumos (preços em tempo real)
- Recomendações baseadas em histórico da fazenda

---

## 6. UI/UX — Design System Aplicado

### Padrão Visual

**Página Principal** (`/dashboard/calculadoras`):
```
┌─ Hero Section ──────────────────────────────┐
│ h1: "Calculadoras Agronômicas"              │
│ p: "Ferramentas de precisão para..."        │
└─────────────────────────────────────────────┘

┌─ Grid de Cards 2-3 colunas ─────────────────┐
│ ┌─ Card ─────────┐  ┌─ Card ─────────┐    │
│ │ Icon: Beaker   │  │ Icon: Sprout   │    │
│ │ Title: Calagem │  │ Title: NPK     │    │
│ │ Desc: ...      │  │ Desc: ...      │    │
│ │ [Abrir]        │  │ [Abrir]        │    │
│ └────────────────┘  └────────────────┘    │
└─────────────────────────────────────────────┘
```

**Dentro de Cada Calculadora**:
```
┌─ Formulário (lg:col-span-2) ────────────────┐
│ [Inputs em grid 2-3 colunas]                │
│ [Validações em tempo real]                  │
│ [Mensagens de erro em rouge]                │
└─────────────────────────────────────────────┘

┌─ Resultado (col-span-1) ────────────────────┐
│ [Card com bg-primary/10]                    │
│ [Grande número destacado]                   │
│ [Total para área]                           │
│ [Botão: Exportar PDF]                       │
│ [Card de dicas agronômicas]                 │
└─────────────────────────────────────────────┘
```

**Responsividade**:
- Mobile (< 768px): 1 coluna, formulário + resultado stack
- Tablet (768-1024px): 2 colunas iguais
- Desktop (> 1024px): 2 colunas (form lg, resultado sm)

**Cores & Componentes**:
- Calagem: `bg-primary/10 border-primary`
- NPK: `bg-[--status-info]/10 border-[--status-info]`
- Inputs: `<Input />`, `<Select />`, `<Label />`
- Buttons: shadcn Button com variant `default`, `outline`
- Icons: lucide-react (Calculator, Beaker, Sprout, Download, AlertCircle, Info, CheckCircle2)

**Animações**:
- Fade-in cards ao entrar na página
- Transição suave de resultado (300ms)
- Hover state em buttons (+3% brightness)

---

## 7. Regras de Negócio

### Calagem

1. **Validação de PRNT**: Deve estar entre 0 e 100% (default 80%)
2. **V% Validação**: V1 < V2 (senão NC = 0)
3. **Resultado Negativo**: Sempre retorna 0 (calagem nunca negativa)
4. **Métodos Ativos**:
   - Saturação por Bases: requer V1, V2, CTC
   - Neutralização Al: requer Al, Ca, Mg
   - MG Manual: requer Al, Ca, Mg
5. **Recomendações Técnicas**:
   - Se NC > 3: "Incorporar em profundidade (30-40cm)"
   - Se V1 < 30%: "Verificar alumínio em profundidade (gessagem)"
   - Timing: "Aplicar 60-90 dias antes do plantio"

### Adubação NPK

1. **Nutriente Limitante**: Dose = MAX(dose_N, dose_P, dose_K)
   - Exemplo: Se N precisa 250kg/ha, P precisa 115kg/ha → usa 250kg/ha (limitante)
2. **Validação de Fertilizante**: Se nenhum teor NPK → dose = 0
3. **Segurança**: Nunca recomenda dose > 1000 kg/ha (aviso visual)
4. **Modo Otimizado** (futuro): Margem de erro ±10% por nutriente
5. **Recomendações**:
   - Se K_nec > 150: "Considere parcelação da dose"
   - Aviso: "Verifique compatibilidade física dos fertilizantes"

### Geral

1. **Processamento**: 100% client-side (sem envio de dados ao servidor)
2. **Acesso**: Aberto para todos os usuários (não é feature premium)
3. **Responsabilidade**: "Recomendações são indicativas. Consulte agrônomo." (disclaimer)
4. **PDF**: Assinável, com espaço para carimbo profissional
5. **Offline**: Calculadora funciona offline (PWA)

---

## 8. Critérios de Aceite (Definition of Done)

### Funcionalidade

- [ ] Calculadora de Calagem: 3 métodos funcionais, com validação Zod
- [ ] Calculadora de NPK: cálculo por nutriente limitante, com validação Zod
- [ ] Exportação PDF: laudo técnico formatado, com logo + recomendações
- [ ] Responsividade: Mobile ✅, Tablet ✅, Desktop ✅
- [ ] Testes: Cobertura > 85% para funções de cálculo

### UX

- [ ] Erro de input: mensagem clara, em português
- [ ] Feedback visual: animação ao exibir resultado
- [ ] Acessibilidade: ARIA labels, navegação por teclado
- [ ] Loading: skeleton loader se houver fetch de fertilizantes
- [ ] Toast: confirmação ao exportar PDF

### Código

- [ ] TypeScript: sem `any`, tipos explícitos
- [ ] Componentes: reutilizáveis, sem lógica de página
- [ ] Testes: Vitest + @testing-library/react
- [ ] Lint: ESLint + Prettier passando
- [ ] Performance: Lighthouse > 80 (LCP < 2.5s)

---

## 9. Fora de Escopo

❌ **Não será implementado nesta versão**:

1. Persistência de histórico em BD (pode ser fase futura)
2. Integração com IoT/sensores de solo
3. Recomendações com ML (treinamento necessário)
4. Integração com API de preços de fertilizantes (preços hardcoded)
5. Mapa geoespacial (foco em cálculos, não em SIG)
6. Integração com whatsapp/telegram (distribuição de laudos)
7. Suporte a múltiplas moedas (BRL apenas por ora)
8. Cálculo de custo-benefício comparativo entre culturas

---

## 10. Stack & Dependências

### Já Instaladas ✅

```json
{
  "react": "^19.2.1",
  "next": "^15.4.9",
  "react-hook-form": "^7.72.1",
  "zod": "^4.3.6",
  "recharts": "^3.8.1",
  "sonner": "^2.0.7",
  "lucide-react": "^0.553.0",
  "motion": "^12.23.24",
  "shadcn": "^4.1.2",
  "typescript": "5.9.3"
}
```

### A Instalar 📦

```bash
npm install jspdf@^2.5.1 jspdf-autotable@^3.5.0
npm install --save-dev @types/jspdf@^2.5.0 @types/jspdf-autotable@^3.5.0
```

### Opcional (Futuro)

```bash
# Para otimizador NPK:
npm install numeric@^1.2.6  # Resolva sistemas lineares

# Para análise estatística:
npm install ml-matrix@^6.10.4  # Álgebra linear
```

---

## 11. Plano de Implementação (Timeline Estimada)

| Fase | Sprint | Atividades | Status |
|---|---|---|---|
| 1️⃣ MVP | 1-2 | Zod validation, jsPDF, refactor componentes, testes | 🟠 Pronto |
| 2️⃣ Expansão | 3-4 | Métodos 4-5, otimizador NPK, banco de ferts | 🟡 Planejado |
| 3️⃣ Premium | 5+ | IA/ML, IoT, historico, comparativos | 🔵 Futuro |

---

## 12. Notas & Observações

### Decisões Arquiteturais

1. **Por que client-side puro?**
   - Cálculos são determinísticos
   - Offline-ready (PWA)
   - Sem overhead de rede
   - Privacidade dos dados do agricultor

2. **Por que não persistir no BD?**
   - MVP não requer histórico
   - Usuário pode salvar PDF
   - Reduz complexidade

3. **Por que jsPDF em vez de headless browser?**
   - Menor bundle size
   - Mais rápido
   - Funciona offline
   - Bem documentado

### Possíveis Extensões

- **Integração com SIACAR** (sistema de classificação agrícola — MG)
- **Cálculo de emissão de carbono** (CO₂ por fertilizante)
- **Sugestão de culturas** por análise de solo
- **Marketplace de insumos** integrado

### Testes Manuais Recomendados

1. Calagem: Entrada conhecida → validar cálculo vs. planilha Excel
2. NPK: Testar com múltiplos fertilizantes → validar nutriente limitante
3. PDF: Exportar → abrir no Acrobat → verificar formatação
4. Offline: Desativar rede → verificar que funciona
5. Mobile: iPhone SE + Samsung A12 (telas pequenas)

---

**Próximo Passo**: Ler este PRD, validar com product & farm experts, iniciar implementação de validação + PDF.

**Responsável pela Atualização**: Equipe técnica
**Última Atualização**: 2026-04-15
