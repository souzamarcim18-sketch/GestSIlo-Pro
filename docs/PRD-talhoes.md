# PRD - Módulo de Talhões (Gestão de Áreas de Cultivo)

**Status**: ⚠️ Parcialmente Implementado | **Versão**: 1.0 | **Data**: 2026-04-15

---

## 1. Executive Summary

O módulo de **Talhões** (gestão de áreas de cultivo) está **70% implementado** com lacunas significativas quando comparado ao módulo maduro de **Silos**. A página principal é funcional mas carece de:

- ❌ Página de detalhe individual do talhão (similar a silos/[id])
- ❌ Validações Zod estruturadas (sem schema de validação)
- ❌ Componentes especializados reutilizáveis
- ❌ Helper functions para cálculos agrícolas
- ❌ Integração de dados geoespaciais (mapa)
- ❌ Relatórios e exportação
- ❌ Análise de produtividade com gráficos

Diferentemente de **Silos** que tem estrutura robusta, **Talhões** funciona através de **uma única página monolítica** com 727 linhas de código cliente, gerando problemas de **manutenibilidade, testabilidade e escalabilidade**.

---

## 2. Estado Atual da Implementação

### 2.1 Estrutura de Arquivos

```
app/dashboard/talhoes/
├── page.tsx                    ✅ (727 linhas — MONOLÍTICO)
└── [nenhuma pasta de componentes ou subpáginas]

lib/supabase/
├── talhoes.ts                  ✅ (22 linhas — MÍNIMO)
└── queries-audit.ts            ✅ (CRUD básico para talhões + ciclos)

lib/validations/
└── [NENHUM arquivo de validação para talhões]

components/
└── [NENHUM componente especializado para talhões]
```

**Comparação com Silos:**
```
app/dashboard/silos/
├── page.tsx                                      ✅ (107 linhas — LIMPO)
├── [id]/
│   └── page.tsx                                  ✅ (DETALHE)
└── components/
    ├── SiloCard.tsx
    ├── SiloDetailHeader.tsx
    ├── SiloForm.tsx
    ├── dialogs/
    │   ├── AvaliacaoBromatologicaDialog.tsx
    │   ├── AvaliacaoPspsDialog.tsx
    │   ├── MovimentacaoDialog.tsx
    │   └── SiloForm.tsx
    └── tabs/
        ├── EstoqueTab.tsx
        ├── QualidadeTab.tsx
        └── VisaoGeralTab.tsx

lib/supabase/
├── silos.ts                                      ✅ (266 linhas — ROBUSTO)
└── helpers.ts                                    ✅ (125 linhas — CÁLCULOS)
```

### 2.2 Funcionalidades Implementadas ✅

#### Gerenciamento Básico de Talhões
- ✅ **CRUD completo**: Create, Read, Update (via page.tsx), Delete
- ✅ **Listagem**: Todos os talhões da fazenda em cards
- ✅ **Atributos básicos**: Nome, Área (ha), Tipo de Solo, Localização, Status
- ✅ **Status dinâmico**: Em pousio, Plantado, Em preparo, Colhido
  - Sincronizado com ciclos agrícolas via trigger PostgreSQL

#### Ciclos Agrícolas (Plantio & Colheita)
- ✅ **Registro de ciclos**: Associação com talhão, cultura, datas
- ✅ **Rastreamento**: Data plantio, colheita prevista/real, produtividade
- ✅ **Histórico tabular**: Tabela com todos os ciclos e status

#### Atividades de Campo
- ✅ **Tipos de atividade**: 8 tipos suportados
  - Preparo de Solo, Calagem, Gessagem, Plantio, Pulverização, Colheita, Análise de Solo, Irrigação
- ✅ **Dados dinâmicos**: Formulário adapta-se ao tipo de atividade selecionado
- ✅ **Rastreamento de custos**: Custo total por atividade
- ✅ **Integração com ciclos**: Atividades podem ser vinculadas ao ciclo ativo
- ✅ **Atualização automática de colheita**: Registro de colheita atualiza ciclo com produtividade

#### Ferramentas de Análise
- ✅ **Custo por Período**: Cardlet que calcula custos totais de um talhão em range de datas
- ✅ **Tabela de Atividades**: Últimas 10 atividades com filtros básicos

### 2.3 Funcionalidades NÃO Implementadas ❌

#### 1. Falta de Página de Detalhe Individual
- ❌ Não existe rota `/dashboard/talhoes/[id]/page.tsx`
- ❌ Impossível visualizar histórico completo de um talhão
- ❌ Sem possibilidade de edição em-line
- ❌ Sem análise específica do talhão com gráficos

#### 2. Falta de Validações (Zod Schema)
```typescript
// lib/validations/talhoes.ts — NÃO EXISTE
// Esperado: esquema similar a silos.ts
export const talhaoSchema = z.object({
  nome: z.string(),
  area: z.number().positive(),
  // ... mais validações
});
```

#### 3. Falta de Componentes Reutilizáveis
- ❌ `TalhaoCard.tsx` (comparável a SiloCard.tsx)
- ❌ `TalhaoForm.tsx` (dialog para criar/editar)
- ❌ `TalhaoDetailHeader.tsx`
- ❌ `CicloAgricolaDialog.tsx` (componente separado)
- ❌ `AtividadeCampoDialog.tsx` (componente separado)

#### 4. Falta de Helper Functions
```typescript
// lib/supabase/talhoes.ts — MUITO MÍNIMO
// Esperado: funções de cálculo agrícola como silos têm

// Exemplos do que FALTA:
export async function calcularProdutividadeMedia(talhaoId: string) { }
export async function calcularCustoMedioParaHectare(talhaoId: string) { }
export async function calcularAreaOcupada(fazendaId: string) { }
export function calcularStatusTalhao(...) { } // client-side helper
```

#### 5. Falta de Tipos Específicos para Talhão
```typescript
// lib/supabase.ts — tipos existem, mas sem contexto de card/view
export type TalhaoCardData = {
  talhao: Talhao;
  cicloAtivo: CicloAgricola | null;
  ciclosCompletos: number;
  produtividadeMedia: number | null;
  custoTotal: number;
  areaOcupada: number; // vs. area total
};
```

#### 6. Falta de Página de Detalhes
**Comparação com Silos:**

| Funcionalidade | Silos | Talhões |
|---|---|---|
| Página principal lista | ✅ `page.tsx` | ✅ `page.tsx` |
| Detalhes de 1 item | ✅ `[id]/page.tsx` (8.8 KB) | ❌ NÃO EXISTE |
| Abas (Visão Geral, Estoque, Qualidade) | ✅ 3 tabs customizados | ❌ NÃO EXISTE |
| Gráficos/Charts | ✅ Recharts integrado | ❌ NÃO EXISTE |
| Histórico detalhado | ✅ Com filtros | ❌ Apenas últimas 10 |
| Operações (movimentações) | ✅ Diálogos especializados | ⚠️ Inline na lista |

#### 7. Falta de Integração Geoespacial
- ❌ Sem campo `geom` (geometry) na tabela
- ❌ Sem visualização de mapa
- ❌ Sem cálculo de área via geospatial
- ⚠️ Campo `localizacao` é apenas texto, não coordenadas

#### 8. Falta de Exportação & Relatórios
- ❌ Sem export para CSV/PDF
- ❌ Sem relatório de produtividade
- ❌ Sem resumo financeiro por talhão

---

## 3. Problemas & Bugs Identificados

### 3.1 Problemas de Design

#### Problema 1: Page.tsx Monolítica (727 linhas)
**Severidade**: 🟡 Média | **Impacto**: Manutenibilidade

**Código Atual:**
```typescript
// app/dashboard/talhoes/page.tsx — 727 linhas EM UM ARQUIVO
export default function TalhoesPage() {
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [ciclos, setCiclos] = useState<CicloAgricola[]>([]);
  const [atividades, setAtividades] = useState<AtividadeCampo[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  // ... 50+ linhas de state
  // ... 500+ linhas de JSX com diálogos embutidos
}
```

**Problemas:**
- Impossível testar funções isoladamente
- Reutilização de componentes é zero
- Difícil encontrar lógica de negócio
- Qualidade de code review reduzida

**Solução Recomendada:**
Refatorar em componentes como Silos:
```
components/
├── TalhaoCard.tsx (card na lista)
├── TalhaoForm.tsx (dialog criar/editar)
├── TalhaoDetail.tsx (página /[id])
├── dialogs/
│   ├── CicloAgricolaDialog.tsx
│   ├── AtividadeCampoDialog.tsx
│   └── FormDynamicFields.tsx (campos dinâmicos por tipo)
└── tabs/
    ├── AtividadesTab.tsx
    ├── CiclosTab.tsx
    └── AnaliseTab.tsx
```

---

#### Problema 2: Sem Validação Zod
**Severidade**: 🟡 Média | **Impacto**: Segurança, UX

**Código Atual:**
```typescript
// Não há validação schema
const handleAddTalhao = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await q.talhoes.create({
      nome: newTalhao.nome,  // ⚠️ Nenhuma validação
      area: Number(newTalhao.area),  // ⚠️ Pode ser NaN
      tipo_solo: newTalhao.tipo_solo || null,
      // ...
    });
  } catch {
    toast.error('Erro ao cadastrar talhão');
  }
};
```

**Problemas:**
- Campo `area` pode virar `NaN` se o usuário digitar algo inválido
- Sem feedback específico de validação (apenas "Erro")
- Sem revalidação no lado do servidor
- Sem tipos TypeScript refinados

**Solução Recomendada:**
```typescript
// lib/validations/talhoes.ts (CRIAR)
import { z } from 'zod';

export const talhaoSchema = z.object({
  nome: z.string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome máximo 100 caracteres'),
  area: z.number()
    .positive('Área deve ser positiva')
    .max(10000, 'Área máxima 10.000 ha'),
  tipo_solo: z.string().max(50).nullable().optional(),
  localizacao: z.string().max(200).nullable().optional(),
  status: z.enum(['Plantado', 'Em preparo', 'Colhido', 'Em pousio']).default('Em pousio'),
});

export type TalhaoInput = z.infer<typeof talhaoSchema>;
```

---

#### Problema 3: Falta de `fazenda_id` Correto
**Severidade**: 🔴 Alta | **Impacto**: Segurança (Data Leak)

**Código Atual:**
```typescript
await q.talhoes.create({
  nome: newTalhao.nome,
  area: Number(newTalhao.area),
  // ...
  fazenda_id: '',  // ⚠️ STRING VAZIA — BUG CRÍTICO!
  status: 'Em pousio'
});
```

**Problema:**
- O `fazenda_id` é hardcoded como string vazia `''`
- O sistema DEVERIA receber `fazenda_id` de `useAuth()`
- Sem o filtro correto, RLS pode falhar ou o registro fica órfão

**Comparação com Silos (CORRETO):**
```typescript
// app/dashboard/silos/page.tsx — CORRETO
const { fazendaId } = useAuth();

const handleAddSilo = async (...) => {
  await q.silos.create({
    nome: ...,
    tipo: ...,
    fazenda_id: fazendaId,  // ✅ CORRETO
  });
};
```

**Solução:**
```typescript
const { fazendaId } = useAuth();  // ← adicionar

await q.talhoes.create({
  // ...
  fazenda_id: fazendaId,  // ← usar aqui (neste caso será adicionado por queries-audit)
  // ...
});
```

**Nota**: `queries-audit` adiciona `fazenda_id` automaticamente, então é apenas redundante, não crítico.

---

#### Problema 4: Campos Dinâmicos Sem Tipagem Forte
**Severidade**: 🟡 Média | **Impacto**: Confiabilidade de Dados

**Código Atual:**
```typescript
const [newAtividade, setNewAtividade] = useState({
  // ...
  dados: {} as any  // ⚠️ ANY TYPE — Sem segurança de tipo
});

// Depois, dependendo do tipo:
if (newAtividade.tipo_atividade === 'Preparo de Solo') {
  // Espera campos: tipo_operacao, horas_maquina
  setNewAtividade({ ...newAtividade, dados: { 
    ...newAtividade.dados, 
    horas_maquina: e.target.value 
  }});
} else if (newAtividade.tipo_atividade === 'Colheita') {
  // Espera campos: produtividade_ton_ha, destino
  setNewAtividade({ ...newAtividade, dados: { 
    ...newAtividade.dados, 
    produtividade_ton_ha: e.target.value 
  }});
}
```

**Problemas:**
- `dados: {} as any` não oferece segurança de tipo
- Impossível refatorar campos dinâmicos sem erros silenciosos
- Sem validação de quais campos são obrigatórios por tipo

**Solução Recomendada:**
Criar Zod discriminated unions:

```typescript
const atividadePreparaSoloSchema = z.object({
  tipo_atividade: z.literal('Preparo de Solo'),
  dados: z.object({
    tipo_operacao: z.enum(['Aração', 'Gradagem', ...]),
    horas_maquina: z.number().positive(),
  }),
});

const atividadeColheitaSchema = z.object({
  tipo_atividade: z.literal('Colheita'),
  dados: z.object({
    produtividade_ton_ha: z.number().positive(),
    destino: z.enum(['Silo', 'Venda', 'Grão']),
  }),
});

export const atividadeCampoSchema = z.discriminatedUnion('tipo_atividade', [
  atividadePreparaSoloSchema,
  atividadeColheitaSchema,
  // ... outros tipos
]);
```

---

### 3.2 Problemas de Funcionalidade

#### Problema 5: Histórico de Atividades Limitado
**Severidade**: 🟠 Média | **Impacto**: UX

**Código Atual:**
```typescript
{atividades.slice(0, 10).map((atv) => (
  // Renderiza apenas 10 últimas atividades
))}
```

**Problemas:**
- Sem pagination
- Sem filtros (por talhão, por tipo, por período)
- Sem busca

**Esperado:**
- Tabela completa com pagination (25, 50, 100 rows)
- Filtros por: talhão, tipo atividade, período
- Busca por observações

---

#### Problema 6: Cálculo de Custo Não Refinado
**Severidade**: 🟡 Média | **Impacto**: Relatórios

**Código Atual:**
```typescript
export async function getCustoTalhaoPeriodo(
  talhaoId: string, 
  dataInicio: string, 
  dataFim: string
) {
  const { data } = await supabase
    .from('financeiro')
    .select('valor')
    .eq('referencia_id', talhaoId)
    .eq('referencia_tipo', 'Talhão')
    .eq('tipo', 'Despesa')
    .gte('data', dataInicio)
    .lte('data', dataFim);

  const custoTotal = data?.reduce(
    (acc, r) => acc + (r.valor || 0), 0
  ) ?? 0;
  return custoTotal;
}
```

**Problemas:**
- Conta APENAS despesas vinculadas via `referencia_id` na tabela `financeiro`
- ❌ **NÃO INCLUI** custos de atividades (`atividades_campo.custo_total`)
- Faltam análises: custo por hectare, custo por ciclo, ROI

**Comparação com Silos (MAIS ROBUSTO):**
```typescript
export async function getCustoProducaoSilagem(siloId: string) {
  // 1. Busca o talhão de origem
  // 2. Busca ciclo agrícola do talhão
  // 3. Soma FINANCEIRO + ATIVIDADES_CAMPO + MOVIMENTAÇÕES
  // 4. Calcula custo por tonelada

  return {
    custoTotal,
    totalToneladas,
    custoPorTonelada: custoTotal / totalToneladas
  };
}
```

**Solução Recomendada:**
Expandir `getCustoTalhaoPeriodo` para incluir atividades:
```typescript
export async function calcularCustoTalhao(
  talhaoId: string,
  dataInicio?: string,
  dataFim?: string
) {
  // Custos do financeiro
  const custoFinanceiro = await supabase
    .from('financeiro')
    .select('valor')
    .eq('referencia_id', talhaoId)
    .eq('referencia_tipo', 'Talhão')
    .eq('tipo', 'Despesa');

  // Custos das atividades
  const custoAtividades = await supabase
    .from('atividades_campo')
    .select('custo_total')
    .eq('talhao_id', talhaoId)
    .eq('tipo_atividade', 'Colheita'); // opcional filter

  return {
    financeiro: sum(custoFinanceiro),
    atividades: sum(custoAtividades),
    total: sum(custoFinanceiro) + sum(custoAtividades),
    pPorHectare: total / talhao.area,
  };
}
```

---

#### Problema 7: Status Talhão Fora de Sync
**Severidade**: 🟡 Média | **Impacto**: Consistência

**Situação:**
- Trigger PostgreSQL `trigger_status_talhao` atualiza `talhoes.status` ao inserir ciclo
- Mas o frontend **não refetcha** o talhão após criar ciclo
- UI mostra status antigo até page refresh

**Código Atual:**
```typescript
const handleAddCiclo = async (e: React.FormEvent) => {
  try {
    await q.ciclosAgricolas.create({ /* ... */ });
    toast.success('Ciclo registrado com sucesso!');
    setIsAddCicloOpen(false);
    fetchData();  // ← refetch, MAS há delay
    // Status não é atualizado se RLS falhar silenciosamente
  }
};
```

**Solução:**
```typescript
const handleAddCiclo = async (e: React.FormEvent) => {
  try {
    await q.ciclosAgricolas.create({ /* ... */ });
    
    // Forçar refresh apenas do talhão afetado
    const talhaoAtualizado = await q.talhoes.getById(newCiclo.talhao_id);
    setTalhoes(t => t.map(t => t.id === talhaoAtualizado.id ? talhaoAtualizado : t));
    
    toast.success('Ciclo registrado com sucesso!');
    setIsAddCicloOpen(false);
  }
};
```

---

### 3.3 Problemas de Segurança

#### Problema 8: Sem Validação de Permissão
**Severidade**: 🔴 Alta | **Impacto**: Segurança

**Situação:**
- Frontend não valida se o usuário tem permissão para editar talhão
- RLS deveria bloquear, mas não há feedback claro se falha

**Esperado:**
```typescript
const canEditTalhao = () => {
  const { perfil } = useAuth();
  return perfil === 'Administrador' || perfil === 'Operador';
};

{canEditTalhao() ? <TalhaoForm /> : <ReadOnlyView />}
```

---

## 4. Comparação Detalhada: Silos vs Talhões

| Aspecto | Silos ✅ | Talhões ⚠️ | Gap |
|---|---|---|---|
| **Arquitetura** | 7 componentes + 1 página detalhe | 1 página monolítica | -6 componentes |
| **Validação** | Zod schema (184 linhas) | Nenhuma | 184 linhas missing |
| **Página Detalhe** | ✅ Existe com 3 tabs | ❌ Não existe | Crítico |
| **Helpers** | 125 linhas de cálculos | 22 linhas mínimo | -103 linhas |
| **Gráficos** | ✅ Recharts em abas | ❌ Apenas cards | Critério UX |
| **Exportação** | ❌ Não implementado | ❌ Não implementado | Igual |
| **Relacionamentos** | Links a movimentações, avaliações | Links a ciclos, atividades | Similar scope |
| **Paginação** | Em lista cards (grid) | Em lista cards (grid) | Igual |

---

## 5. Roadmap de Implementação

### Fase 1: Fundação (Semana 1)
**Objetivo**: Tornar módulo seguro e validado

- [ ] Criar `lib/validations/talhoes.ts` com Zod schemas
- [ ] Criar `lib/supabase/talhoes.ts` helpers (calc produtividade, custo, etc)
- [ ] Criar `components/talhao/TalhaoCard.tsx` reutilizável
- [ ] Refatorar `page.tsx` para 200-300 linhas (remover diálogos)
- [ ] Adicionar tipos `TalhaoCardData` para pré-cálculos

**Estimativa**: 12-16 horas

### Fase 2: Detalhe & Edição (Semana 2)
**Objetivo**: Página de detalhe funcional

- [ ] Criar `app/dashboard/talhoes/[id]/page.tsx`
- [ ] Criar `components/talhao/TalhaoDetail.tsx` com layout
- [ ] Criar `components/talhao/TalhaoDetailHeader.tsx`
- [ ] Criar `components/talhao/tabs/AtividadesTab.tsx`
- [ ] Criar `components/talhao/tabs/CiclosTab.tsx`
- [ ] Implementar edição inline

**Estimativa**: 16-20 horas

### Fase 3: Visualização & Análise (Semana 3)
**Objetivo**: Insights agrícolas

- [ ] Adicionar Recharts com gráficos:
  - Produtividade por ciclo
  - Custo por hectare
  - Ciclo de plantio (timeline)
- [ ] Criar aba de "Análise Produtiva"
- [ ] Implementar filtros de período
- [ ] Dashboard de status dos talhões

**Estimativa**: 12-16 horas

### Fase 4: Geoespacial (Opcional - Fase Futura)
**Objetivo**: Mapa e análise espacial

- [ ] Adicionar coluna `geom` (geometry) ao Supabase
- [ ] Integrar Mapbox ou Leaflet
- [ ] Visualizar talhões em mapa
- [ ] Cálculo de área via geoprocessamento
- [ ] Heatmap de produtividade

**Estimativa**: 20-24 horas (Future Sprint)

### Fase 5: Exportação & Relatórios (Opcional)
**Objetivo**: Funcionalidades avançadas

- [ ] Export CSV de atividades/ciclos
- [ ] Relatório PDF de produtividade
- [ ] Análise financeira por talhão

**Estimativa**: 8-12 horas

---

## 6. Detalhamento Técnico das Mudanças

### 6.1 Nova Estrutura de Pastas

```
app/dashboard/talhoes/
├── page.tsx                                   (Refatorado: 250 linhas)
├── [id]/
│   └── page.tsx                              (Novo: 300 linhas)
└── components/
    ├── TalhaoCard.tsx                        (Novo: 150 linhas)
    ├── TalhaoDetail.tsx                      (Novo: 100 linhas)
    ├── TalhaoDetailHeader.tsx                (Novo: 100 linhas)
    ├── TalhaoForm.tsx                        (Novo: 200 linhas)
    ├── dialogs/
    │   ├── CicloAgricolaDialog.tsx           (Novo: 150 linhas)
    │   ├── AtividadeCampoDialog.tsx          (Novo: 250 linhas)
    │   └── DadosDinamicosFields.tsx          (Novo: 200 linhas)
    ├── tabs/
    │   ├── AtividadesTab.tsx                 (Novo: 200 linhas)
    │   ├── CiclosTab.tsx                     (Novo: 200 linhas)
    │   └── AnaliseTab.tsx                    (Novo: 250 linhas — Gráficos)
    └── helpers.ts                            (Novo: 150 linhas)

lib/
├── validations/
│   └── talhoes.ts                            (Novo: 200 linhas)
└── supabase/
    └── talhoes.ts                            (Expandido: 22 → 300 linhas)
```

### 6.2 Exemplo: Nova Validação Schema

```typescript
// lib/validations/talhoes.ts
import { z } from 'zod';

export const TIPOS_SOLO = [
  'Argissolo', 'Cambissolo', 'Latossolo', 'Neossolo', 
  'Espodossolo', 'Gleissolo', 'Plintossolo', 'Organossolo'
] as const;

export const talhaoSchema = z.object({
  nome: z.string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome máximo 100 caracteres'),
  area: z.number()
    .positive('Área deve ser positiva')
    .max(10000, 'Área máxima 10.000 ha'),
  tipo_solo: z.enum(TIPOS_SOLO).nullable().optional(),
  localizacao: z.string().max(200).nullable().optional(),
  status: z.enum(['Plantado', 'Em preparo', 'Colhido', 'Em pousio'])
    .default('Em pousio'),
});

export const cicloAgricolaSchema = z.object({
  talhao_id: z.string().uuid('Talhão inválido'),
  cultura: z.string()
    .min(1, 'Cultura obrigatória')
    .max(100),
  data_plantio: z.string()
    .refine(d => new Date(d) < new Date(), 'Data não pode ser futura'),
  data_colheita_prevista: z.string()
    .refine(d => new Date(d) > new Date(), 'Colheita prevista deve ser futura')
    .nullable()
    .optional(),
  data_colheita_real: z.string().nullable().optional(),
  produtividade: z.number().positive().nullable().optional(),
}).refine(
  (d) => new Date(d.data_plantio) < (d.data_colheita_prevista ? new Date(d.data_colheita_prevista) : new Date()),
  { message: 'Colheita deve ser após plantio', path: ['data_colheita_prevista'] }
);

// Atividades com discriminated union por tipo
const atividadePreparaSoloSchema = z.object({
  tipo_atividade: z.literal('Preparo de Solo'),
  dados: z.object({
    tipo_operacao: z.enum(['Aração', 'Gradagem', 'Subsolagem', 'Escarificação', 'Nivelamento']),
    horas_maquina: z.number().positive('Horas deve ser positiva'),
  }),
});

const atividadeCalageSchema = z.object({
  tipo_atividade: z.literal('Calagem'),
  dados: z.object({
    insumo_id: z.string().uuid('Insumo inválido'),
    dose_por_hectare_kg: z.number().positive(),
  }),
});

const atividadeColheitaSchema = z.object({
  tipo_atividade: z.literal('Colheita'),
  dados: z.object({
    produtividade_ton_ha: z.number().positive('Produtividade é obrigatória'),
    destino: z.enum(['Silo', 'Venda', 'Grão']),
  }),
});

// ... outros tipos

export const atividadeCampoSchema = z.discriminatedUnion('tipo_atividade', [
  atividadePreparaSoloSchema,
  ativideCalageSchema,
  atividadeColheitaSchema,
  // ...
]);

export type AtividadeCampoInput = z.infer<typeof atividadeCampoSchema>;
```

### 6.3 Exemplo: Novo Helper para Cálculos

```typescript
// lib/supabase/talhoes.ts (expandido)
import { supabase, type Talhao, type CicloAgricola, type AtividadeCampo } from '../supabase';

/**
 * Calcula produtividade média do talhão
 * Baseado em ciclos completos (com colheita_real e produtividade)
 */
export async function calcularProdutividadeMedia(talhaoId: string): Promise<number | null> {
  const { data: ciclos } = await supabase
    .from('ciclos_agricolas')
    .select('produtividade')
    .eq('talhao_id', talhaoId)
    .not('data_colheita_real', 'is', null)
    .not('produtividade', 'is', null);

  if (!ciclos || ciclos.length === 0) return null;

  const soma = ciclos.reduce((acc, c) => acc + (c.produtividade || 0), 0);
  return soma / ciclos.length;
}

/**
 * Calcula custo total vinculado a um talhão (financeiro + atividades)
 */
export async function calcularCustoTalhao(
  talhaoId: string,
  dataInicio?: string,
  dataFim?: string
): Promise<{ financeiro: number; atividades: number; total: number; porHectare: number }> {
  const talhao = await supabase
    .from('talhoes')
    .select('area')
    .eq('id', talhaoId)
    .single()
    .then(r => r.data);

  // Custos financeiros
  let qFinanceiro = supabase
    .from('financeiro')
    .select('valor')
    .eq('referencia_id', talhaoId)
    .eq('referencia_tipo', 'Talhão')
    .eq('tipo', 'Despesa');

  if (dataInicio) qFinanceiro = qFinanceiro.gte('data', dataInicio);
  if (dataFim) qFinanceiro = qFinanceiro.lte('data', dataFim);

  const { data: financeiro } = await qFinanceiro;
  const custoFinanceiro = financeiro?.reduce((a, f) => a + (f.valor || 0), 0) ?? 0;

  // Custos de atividades
  let qAtividades = supabase
    .from('atividades_campo')
    .select('custo_total')
    .eq('talhao_id', talhaoId);

  if (dataInicio) qAtividades = qAtividades.gte('data_atividade', dataInicio);
  if (dataFim) qAtividades = qAtividades.lte('data_atividade', dataFim);

  const { data: atividades } = await qAtividades;
  const custoAtividades = atividades?.reduce((a, at) => a + (at.custo_total || 0), 0) ?? 0;

  const total = custoFinanceiro + custoAtividades;
  const porHectare = talhao?.area ? total / talhao.area : 0;

  return { financeiro: custoFinanceiro, atividades: custoAtividades, total, porHectare };
}

/**
 * Obtém área total ocupada na fazenda (soma de todos os talhões)
 */
export async function calcularAreaTotalFazenda(fazendaId: string): Promise<number> {
  const { data } = await supabase
    .from('talhoes')
    .select('area')
    .eq('fazenda_id', fazendaId);

  return data?.reduce((sum, t) => sum + t.area, 0) ?? 0;
}

/**
 * Interface pré-calculada de um talhão para exibição em card
 */
export interface TalhaoCardData {
  talhao: Talhao;
  cicloAtivo: CicloAgricola | null;
  ciclosCompletos: number;
  produtividadeMedia: number | null;
  custoTotal: number;
  custosPorHectare: number;
  diasDesdeUltimoCiclo: number | null;
}
```

---

## 7. Plano de Testes

### Testes Unitários
```typescript
// __tests__/talhoes.validators.test.ts
import { talhaoSchema, cicloAgricolaSchema } from '@/lib/validations/talhoes';

describe('Talhao Validators', () => {
  it('deve rejeitar área negativa', () => {
    const invalid = { nome: 'Talhão 1', area: -5 };
    expect(() => talhaoSchema.parse(invalid)).toThrow();
  });

  it('deve aceitar talhão válido', () => {
    const valid = { nome: 'Talhão 1', area: 100 };
    expect(talhaoSchema.parse(valid)).toEqual(valid);
  });

  it('deve validar datas de ciclo (colheita > plantio)', () => {
    const invalid = {
      talhao_id: 'uuid',
      cultura: 'Milho',
      data_plantio: '2026-04-20',
      data_colheita_prevista: '2026-04-10', // ← antes do plantio
    };
    expect(() => cicloAgricolaSchema.parse(invalid)).toThrow();
  });
});
```

### Testes de Integração
```typescript
// __tests__/talhoes.integration.test.ts
describe('Talhoes API', () => {
  it('deve criar talhão com fazenda_id correto', async () => {
    const talhao = await q.talhoes.create({ /* ... */ });
    expect(talhao.fazenda_id).toBe(mockFazendaId);
  });

  it('deve atualizar status ao criar ciclo', async () => {
    const ciclo = await q.ciclosAgricolas.create({
      talhao_id: talhaoId,
      data_plantio: today,
    });
    
    const talhaoAtualizado = await q.talhoes.getById(talhaoId);
    expect(talhaoAtualizado.status).toBe('Plantado');
  });

  it('deve calcular custo total incluindo atividades', async () => {
    const custo = await calcularCustoTalhao(talhaoId);
    expect(custo.total).toBe(custo.financeiro + custo.atividades);
  });
});
```

---

## 8. Checklist de Implementação

### Fase 1: Validações & Helpers
- [ ] `lib/validations/talhoes.ts` criado e testado
- [ ] `lib/supabase/talhoes.ts` expandido com 6+ helper functions
- [ ] Tipos `TalhaoCardData` e `TalhaoInput` exportados
- [ ] Testes unitários passando

### Fase 2: Componentes
- [ ] `TalhaoCard.tsx` implementado e reutilizado
- [ ] `TalhaoForm.tsx` com validação Zod
- [ ] `CicloAgricolaDialog.tsx` separado
- [ ] `AtividadeCampoDialog.tsx` com campos dinâmicos
- [ ] `TalhaoDetail.tsx` e header
- [ ] Testes de componentes passando

### Fase 3: Página de Detalhes
- [ ] `app/dashboard/talhoes/[id]/page.tsx` criado
- [ ] 3 abas funcionando (Atividades, Ciclos, Análise)
- [ ] Gráficos Recharts exibindo
- [ ] Edição inline funcional

### Fase 4: Refatoração da Página Principal
- [ ] `page.tsx` reduzido de 727 para ~250 linhas
- [ ] Diálogos movidos para componentes
- [ ] Todas as funcionalidades preservadas
- [ ] Testes E2E passando

### Fase 5: QA & Deploy
- [ ] Teste em navegadores (Chrome, Firefox, Safari)
- [ ] Teste em mobile (responsividade)
- [ ] Teste de permissões (RLS)
- [ ] Audit de segurança
- [ ] Deploy em staging
- [ ] Deploy em produção

---

## 9. Conclusão

O módulo de **Talhões** é **funcional mas imaturo** comparado ao padrão do projeto (Silos). A refatoração é **altamente recomendada** para:

1. ✅ **Segurança**: Adicionar validações Zod
2. ✅ **Manutenibilidade**: Dividir em componentes reutilizáveis
3. ✅ **UX**: Criar página de detalhe com análises profundas
4. ✅ **Escalabilidade**: Preparar para features futuras (mapa, geospatial, IA)

**Prioridade**: 🔴 **ALTA** (bloqueia features dependentes)  
**Estimativa Total**: 58-88 horas (1.5-2.5 sprints)  
**Recomendação**: Iniciar Fase 1 imediatamente.

---

**Última Atualização**: 2026-04-15  
**Autor**: Análise Automatizada com Claude Code  
**Status**: Ready for Review
