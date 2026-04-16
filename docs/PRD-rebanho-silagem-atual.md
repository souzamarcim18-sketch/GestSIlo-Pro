# PRD — Estado Atual: Rebanho e Planejamento de Silagem

**Data:** 16 de abril de 2026  
**Status:** ✍️ Análise AS-IS (Pesquisa)  
**Versão:** 1.0  
**Autor:** Claude Code (Pesquisa Automatizada)

---

## 📋 Resumo Executivo

O GestSilo Pro possui **dois módulos parcialmente implementados** para gestão de rebanho e planejamento de silagem:

1. **Módulo de Rebanho** (`/dashboard/rebanho`) — Planejador de Necessidade de Silagem com categorias de animais e períodos de confinamento. **Estado: Funcional (Básico)**.

2. **Módulo de Silagem (Planejamento)** (`/dashboard/simulador`) — Simulador Forrageiro com cálculos de oferta vs. demanda. **Estado: Funcional (Básico)** com um **gap crítico**: as análises bromatológicas e PSPS têm formulários mas **NÃO SALVAM** em banco de dados.

Ambos os módulos integram-se com:
- Dados de **silos** (estoque de silagem)
- Dados de **talhões** (histórico de produtividade)
- Dados de **máquinas** (atividades agrícolas)

---

## 1. Arquivos Encontrados

### 1.1 Páginas do Dashboard (2 arquivos)

```
app/dashboard/rebanho/page.tsx          (457 linhas)
  └─ Planejador de Necessidade de Silagem
     ├─ Gestão de Categorias do Rebanho
     ├─ Gestão de Períodos de Confinamento
     └─ Cálculos de Necessidade vs. Estoque

app/dashboard/simulador/page.tsx        (382 linhas)
  └─ Simulador Forrageiro Sazonal
     ├─ Parâmetros: Área, Produtividade, Teor MS
     ├─ Cálculos: Oferta (produção) vs. Demanda (rebanho)
     └─ Recomendações: Aumentar área ou comprar silagem
```

### 1.2 Componentes Dialogados (2 arquivos)

```
app/dashboard/silos/components/dialogs/
  ├─ AvaliacaoBromatologicaDialog.tsx   (203 linhas) ⚠️ TODO: Não salva em BD
  └─ AvaliacaoPspsDialog.tsx            (238 linhas) ⚠️ TODO: Não salva em BD
```

### 1.3 Tipos TypeScript (lib/supabase.ts)

```typescript
// Linhas 192-208 em lib/supabase.ts

export type CategoriaRebanho = {
  id: string;
  fazenda_id: string;
  nome: string;
  quantidade_cabecas: number;
  consumo_ms_kg_cab_dia: number;
  created_at: string;
};

export type PeriodoConfinamento = {
  id: string;
  fazenda_id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  created_at: string;
};

export type AvaliacaoBromatologica = {
  id: string;
  silo_id: string;
  data: string;
  ms: number | null;
  created_at: string;
};
```

### 1.4 Queries de Acesso a Dados (lib/supabase/queries-audit.ts)

```typescript
// Linhas 917-1011

// REBANHO — Categorias
const categoriasRebanho = {
  async list(): Promise<CategoriaRebanho[]>
  async upsert(payload: Partial<CategoriaRebanho>): Promise<CategoriaRebanho>
  async remove(id: string): Promise<void>
};

// REBANHO — Períodos de Confinamento
const periodosConfinamento = {
  async list(): Promise<PeriodoConfinamento[]>
  async upsert(payload: Partial<PeriodoConfinamento>): Promise<PeriodoConfinamento>
  async remove(id: string): Promise<void>
};

// Exportadas via: export const q = { ..., categoriasRebanho, periodosConfinamento }
```

### 1.5 Migrações SQL (supabase/migrations/)

```
supabase/migrations/20260407_planejador_rebanho.sql (45 linhas)
  ├─ CREATE TABLE categorias_rebanho
  ├─ CREATE TABLE periodos_confinamento
  ├─ ENABLE ROW LEVEL SECURITY
  └─ CREATE POLICY para isolamento por fazenda
```

### 1.6 Validadores Zod

**NÃO ENCONTRADO:** Nenhum schema Zod para Rebanho ou Silagem.  
Apenas existe: `validators/calculadoras.ts` (schemas para Calagem + NPK)

---

## 2. Funcionalidades Implementadas

### 2.1 Módulo de Rebanho (Planejador de Necessidade de Silagem)

**URL:** `/dashboard/rebanho`  
**Arquivo:** `app/dashboard/rebanho/page.tsx`  
**Status:** ✅ Funcional

#### O que faz:
1. **Gestão de Categorias do Rebanho**
   - Cadastrar categoria (Nome, Qtd. Cabeças, Consumo MS kg/cab/dia)
   - Editar (via modal)
   - Deletar
   - Exibir tabela de categorias com totais

2. **Gestão de Períodos de Confinamento**
   - Cadastrar período (Nome, Data Início, Data Fim)
   - Selecionar período ativo
   - Deletar período

3. **Cálculos Automáticos (useMemo)**
   ```
   consumoDiarioMS_kg = ∑(quantidade_cabecas × consumo_ms_kg_cab_dia)
   diasPeriodo = (data_fim - data_inicio) + 1
   necessidadeTotalMS = (consumoDiarioMS_kg / 1000) × diasPeriodo
   
   estoqueMS = ∑(silo: estoque_atual × materia_seca_percent / 100)
   saldo = estoqueMS - necessidadeTotalMS
   diasCobertos = estoqueMS / consumoDiarioMS_ton
   percentualCobertura = (estoqueMS / necessidadeTotalMS) × 100
   ```

4. **Visualização**
   - Card de Status com alertas (deficit, margem de segurança)
   - Gráfico de barras horizontal (Estoque MS vs. Necessidade MS)
   - Tabela de Categorias com totais
   - Resumo executivo de planejamento

#### Dados recebidos:
- `CategoriaRebanho[]` — lista de categorias
- `PeriodoConfinamento[]` — lista de períodos
- `Silo[]` — silos para consultar estoque e matéria seca
- `MovimentacaoSilo[]` — movimentações para calcular estoque real

#### Fluxo:
```
useEffect → loadData()
  ↓
Promise.all([
  q.categoriasRebanho.list(),
  q.periodosConfinamento.list(),
  q.silos.list()
])
  ↓
Para cada silo: q.movimentacoesSilo.listBySilos(siloIds)
  ↓
setState + useMemo(calculos)
```

---

### 2.2 Módulo de Silagem — Simulador Forrageiro

**URL:** `/dashboard/simulador`  
**Arquivo:** `app/dashboard/simulador/page.tsx`  
**Status:** ✅ Funcional

#### O que faz:
1. **Entrada de Parâmetros (Sliders + Selects)**
   - Período de Referência (dropdown de PeriodoConfinamento)
   - Área de Plantio (ha) — slider 0–200 ha
   - Produtividade Esperada (ton MV/ha) — slider 0–80 t/ha
     - Dica: Média histórica de ciclos_agricolas
   - Teor MS Esperado (%) — slider 20–45%
     - Dica: Média dos silos cadastrados

2. **Cálculos de Cenários**
   ```
   Demanda (Consumo do Rebanho):
   consumoDiarioMS_kg = ∑(cat: quantidade_cabecas × consumo_ms_kg_cab_dia)
   necessidadeTotalMS = (consumoDiarioMS_kg / 1000) × diasPeriodo
   
   Oferta (Produção Esperada):
   producaoEstimadaMV = areaSimulada × produtividadeEsperada
   producaoEstimadaMS = producaoEstimadaMV × (msEsperada / 100)
   
   Análise:
   saldo = producaoEstimadaMS - necessidadeTotalMS
   percentualCobertura = (producaoEstimadaMS / necessidadeTotalMS) × 100
   areaAdicionalNecessaria = saldo < 0 ? 
     |saldo| / (produtividadeEsperada × msEsperada/100) : 0
   ```

3. **Visualização**
   - Card de Oferta (Produção Estimada em ton MS)
   - Card de Demanda (Necessidade do Rebanho em ton MS)
   - Card de Saldo com Progress Bar
   - Recomendações condicionadas:
     - Se saldo < 0: "Aumentar Área" ou "Comprar Silagem"
     - Se saldo ≥ 0: Dica de gestão (margem de segurança, crescimento do rebanho)
   - Tabela de "Memória de Cálculo" com fórmulas

#### Dados recebidos:
- `CategoriaRebanho[]` — para calcular demanda
- `PeriodoConfinamento[]` — para contexto de período
- `CicloAgricola[]` — histórico de produtividade (sugestão de valor)
- `Silo[]` — histórico de teor MS (sugestão de valor)

#### Fluxo:
```
useEffect → loadBaseData()
  ↓
Promise.all([
  q.categoriasRebanho.list(),
  q.periodosConfinamento.list(),
  q.silos.list(),
  supabase.from('ciclos_agricolas').select('*').not('produtividade', 'is', null)
])
  ↓
Calcular médias de produtividade e MS
  ↓
setState + useMemo(resultados)
```

---

### 2.3 Análises de Qualidade de Silagem (Parcialmente Implementado)

**Status:** ⚠️ Formulários criados, mas **NÃO SALVAM** em banco de dados

#### AvaliacaoBromatologicaDialog
**Arquivo:** `app/dashboard/silos/components/dialogs/AvaliacaoBromatologicaDialog.tsx`

**Schema Zod (linhas 19–28):**
```typescript
const bromatologicaSchema = z.object({
  data: z.string().min(1),
  momento: z.string().min(1),        // Ex: "Manhã", "Tarde"
  avaliador: z.string().min(1),
  pb: z.number().min(0).max(100),    // Proteína Bruta (%)
  fd: z.number().min(0).max(100),    // Fibra Detergente (%)
  fda: z.number().min(0).max(100),   // Fibra Detergente Ácida (%)
  energia: z.number().min(0),        // Mcal/kg
  umidade: z.number().min(0).max(100), // Umidade (%)
});
```

**Problema (linha 61):**
```typescript
const handleSubmit = async (data: BromatologicaFormData) => {
  try {
    // TODO: Implementar salvamento em banco de dados
    // Por enquanto, apenas mostrar sucesso
    toast.success('Análise bromatológica registrada!');
    // ... reset form ...
  }
};
```

---

#### AvaliacaoPspsDialog
**Arquivo:** `app/dashboard/silos/components/dialogs/AvaliacaoPspsDialog.tsx`

**Schema Zod (linhas 27–35):**
```typescript
const pspsSchema = z.object({
  data: z.string().min(1),
  peneira1: z.number().min(0).max(100),    // 19 mm
  peneira2: z.number().min(0).max(100),    // 8 mm
  peneira3: z.number().min(0).max(100),    // 1.18 mm
  peneira4: z.number().min(0).max(100),    // Fundo < 1.18 mm
  tmp: z.number().min(0),                  // Tempo Médio (min)
  status: z.enum(['Ideal', 'Bom', 'Ruim']),
});
```

**Validação Extra (linhas 74–79):**
```typescript
// Valida que peneiras somem 100%
const total = data.peneira1 + data.peneira2 + data.peneira3 + data.peneira4;
if (Math.abs(total - 100) > 0.1) {
  toast.error('A soma dos peneiras deve ser 100%');
  return;
}
```

**Problema (linha 82):**
```typescript
const handleSubmit = async (data: PspsFormData) => {
  try {
    // TODO: Implementar salvamento em banco de dados
    toast.success('Análise PSPS registrada!');
    // ... reset form ...
  }
};
```

---

## 3. Modelo de Dados Atual

### 3.1 Tabelas no Supabase (Migration: 20260407_planejador_rebanho.sql)

#### Tabela: `categorias_rebanho`
```sql
CREATE TABLE IF NOT EXISTS categorias_rebanho (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id              UUID NOT NULL REFERENCES fazendas(id),
  nome                    TEXT NOT NULL,              -- Ex: "Vacas em lactação"
  quantidade_cabecas      INTEGER NOT NULL DEFAULT 0,
  consumo_ms_kg_cab_dia   NUMERIC(6,2) NOT NULL,     -- kg MS/cabeça/dia
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categorias_rebanho ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso_fazenda_categorias" ON categorias_rebanho
  FOR ALL USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));
```

**Relações:**
- Chave Estrangeira: `fazenda_id` → `fazendas(id)`
- Isolamento: RLS por `fazenda_id`

---

#### Tabela: `periodos_confinamento`
```sql
CREATE TABLE IF NOT EXISTS periodos_confinamento (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id  UUID NOT NULL REFERENCES fazendas(id),
  nome        TEXT NOT NULL,          -- Ex: "Seca 2025"
  data_inicio DATE NOT NULL,
  data_fim    DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE periodos_confinamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso_fazenda_periodos" ON periodos_confinamento
  FOR ALL USING (fazenda_id IN (SELECT fazenda_id FROM profiles WHERE id = auth.uid()));
```

**Relações:**
- Chave Estrangeira: `fazenda_id` → `fazendas(id)`
- Isolamento: RLS por `fazenda_id`

---

#### Tabela: `silos` (Existente — relacionado com análises)
```sql
CREATE TABLE silos (
  id                          UUID PRIMARY KEY,
  nome                        TEXT,
  tipo                        TEXT CHECK (tipo IN ('Superfície', 'Trincheira', 'Bag', 'Outros')),
  fazenda_id                  UUID REFERENCES fazendas(id),
  talhao_id                   UUID REFERENCES talhoes(id),
  materia_seca_percent        NUMERIC,        -- % MS
  insumo_lona_id              UUID REFERENCES insumos(id),
  insumo_inoculante_id        UUID REFERENCES insumos(id),
  cultura_ensilada            TEXT,
  data_fechamento             DATE,
  data_abertura_prevista      DATE,
  data_abertura_real          DATE,
  volume_ensilado_ton_mv      NUMERIC,
  comprimento_m               NUMERIC,
  largura_m                   NUMERIC,
  altura_m                    NUMERIC,
  observacoes_gerais          TEXT
);
```

---

#### Tabela: `movimentacoes_silo` (Existente — relacionado com cálculos)
```sql
CREATE TABLE movimentacoes_silo (
  id              UUID PRIMARY KEY,
  silo_id         UUID REFERENCES silos(id) ON DELETE CASCADE,
  tipo            TEXT CHECK (tipo IN ('Entrada', 'Saída')),
  quantidade      NUMERIC,
  data            DATE DEFAULT CURRENT_DATE,
  talhao_id       UUID REFERENCES talhoes(id),
  responsavel     TEXT,
  observacao      TEXT
);
```

---

### 3.2 Tabelas Não Encontradas (Esperadas mas Ausentes)

#### Avaliações Bromatológicas
**Status:** 🚫 **NÃO ENCONTRADA**

Esperada tabela (baseada no formulário):
```sql
CREATE TABLE avaliacoes_bromatologicas (
  id          UUID PRIMARY KEY,
  silo_id     UUID REFERENCES silos(id),
  data        DATE,
  momento     TEXT,          -- "Manhã", "Tarde"
  avaliador   TEXT,
  pb          NUMERIC,       -- Proteína Bruta %
  fd          NUMERIC,       -- Fibra Detergente %
  fda         NUMERIC,       -- Fibra Detergente Ácida %
  energia     NUMERIC,       -- Mcal/kg
  umidade     NUMERIC,       -- %
  created_at  TIMESTAMPTZ
);
```

---

#### Análises PSPS (Penn State Particle Separator)
**Status:** 🚫 **NÃO ENCONTRADA**

Esperada tabela (baseada no formulário):
```sql
CREATE TABLE avaliacoes_psps (
  id          UUID PRIMARY KEY,
  silo_id     UUID REFERENCES silos(id),
  data        DATE,
  peneira1    NUMERIC,       -- 19 mm %
  peneira2    NUMERIC,       -- 8 mm %
  peneira3    NUMERIC,       -- 1.18 mm %
  peneira4    NUMERIC,       -- < 1.18 mm (Fundo) %
  tmp         NUMERIC,       -- Tempo Médio Ponderado (min)
  status      TEXT,          -- "Ideal", "Bom", "Ruim"
  created_at  TIMESTAMPTZ
);
```

---

### 3.3 Tipos TypeScript Exportados

**Arquivo:** `lib/supabase.ts` (linhas 192–217)

```typescript
export type CategoriaRebanho = {
  id: string;
  fazenda_id: string;
  nome: string;
  quantidade_cabecas: number;
  consumo_ms_kg_cab_dia: number;
  created_at: string;
};

export type PeriodoConfinamento = {
  id: string;
  fazenda_id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  created_at: string;
};

export type AvaliacaoBromatologica = {
  id: string;
  silo_id: string;
  data: string;
  ms: number | null;
  created_at: string;
};
```

**Nota:** O tipo `AvaliacaoBromatologica` existe mas é **INCOMPLETO** — faltam campos como `pb`, `fd`, `fda`, `energia`, `umidade`, `momento`, `avaliador`.

---

### 3.4 Relacionamentos Principais

```
Fazenda
  ├─ CategoriaRebanho (1:N via fazenda_id)
  ├─ PeriodoConfinamento (1:N via fazenda_id)
  ├─ Silo (1:N via fazenda_id)
  │  ├─ MovimentacaoSilo (1:N via silo_id)
  │  ├─ AvaliacaoBromatologica (1:N via silo_id) [NÃO IMPLEMENTADO]
  │  └─ AvaliacaoPSPS (1:N via silo_id) [NÃO IMPLEMENTADO]
  └─ Talhao (1:N via fazenda_id)
     └─ CicloAgricola (1:N via talhao_id)
```

---

## 4. Fluxo de Telas Atual

### 4.1 Navegação

**Sidebar.tsx** → Menu do Dashboard

```
Dashboard (/)
  └─ Rebanho (/dashboard/rebanho)
      ├─ [Dialog] Nova Categoria
      └─ [Dialog] Novo Período
  
  └─ Simulador (/dashboard/simulador)
      └─ [Sliders] Parâmetros de simulação
  
  └─ Silos (/dashboard/silos)
      ├─ [Dialog] Avaliação Bromatológica [TODO: Não salva]
      └─ [Dialog] Avaliação PSPS [TODO: Não salva]
```

---

### 4.2 Jornada do Usuário: Planejador de Rebanho

```
1. Acessar /dashboard/rebanho
   ↓
2. [Opcional] Clicar "Novo Período" → Modal
   ├─ Preencher: Nome, Data Início, Data Fim
   ├─ Clicar "Salvar Período"
   └─ upsert em: q.periodosConfinamento.upsert()
   ↓
3. [Obrigatório] Clicar "Nova Categoria" → Modal
   ├─ Preencher: Nome, Qtd. Cabeças, Consumo MS
   ├─ Clicar "Salvar Categoria"
   └─ upsert em: q.categoriasRebanho.upsert()
   ↓
4. Tabela atualizada com categorias
   ↓
5. Card de Status calcula:
   ├─ Necessidade Total MS (demanda)
   ├─ Estoque Atual MS (oferta dos silos)
   ├─ Saldo (MS)
   ├─ Dias Cobertos
   └─ Percentual de Cobertura
   ↓
6. [Opcional] Deletar categoria ou período via botão Trash
```

---

### 4.3 Jornada do Usuário: Simulador Forrageiro

```
1. Acessar /dashboard/simulador
   ↓
2. Selecionar "Período de Referência" no dropdown
   ├─ Busca categorias e períodos (q.categoriasRebanho.list(), q.periodosConfinamento.list())
   └─ Sugestões de produtividade e MS via histórico
   ↓
3. Ajustar Parâmetros com Sliders:
   ├─ Área de Plantio (ha)
   ├─ Produtividade (ton MV/ha)
   ├─ Teor MS (%)
   ↓
4. Resultados calculados em tempo real (useMemo):
   ├─ Demanda do Rebanho (ton MS)
   ├─ Oferta Estimada (ton MS)
   ├─ Saldo Final (ton MS)
   ├─ Percentual de Cobertura
   ├─ Recomendações
   └─ Memória de Cálculo (fórmulas)
   ↓
5. [No futuro] Possibilidade de "Salvar Cenário"
```

---

## 5. Cálculos Implementados

### 5.1 Planejador de Rebanho — Cálculos de Necessidade

**Arquivo:** `app/dashboard/rebanho/page.tsx` (linhas 72–109)

```typescript
const calculos = useMemo(() => {
  if (!selectedPeriodo) return null;

  // 1. CONSUMO DIÁRIO (MS)
  const consumoDiarioMS_kg = categorias.reduce((acc, c) => 
    acc + (c.quantidade_cabecas * c.consumo_ms_kg_cab_dia), 0);
  const consumoDiarioMS_ton = consumoDiarioMS_kg / 1000;

  // 2. DURAÇÃO DO PERÍODO
  const diasPeriodo = differenceInDays(
    parseISO(selectedPeriodo.data_fim),
    parseISO(selectedPeriodo.data_inicio)
  ) + 1;

  // 3. NECESSIDADE TOTAL (MS)
  const necessidadeTotalMS = consumoDiarioMS_ton * diasPeriodo;

  // 4. ESTOQUE DISPONÍVEL (MS)
  const estoqueMS = silos.reduce((acc, s) => {
    const estoqueAtualSilo = movimentacoes
      .filter(m => m.silo_id === s.id)
      .reduce((sum, m) => 
        m.tipo === 'Entrada' ? sum + m.quantidade : sum - m.quantidade, 0);
    
    return acc + (estoqueAtualSilo * (s.materia_seca_percent || 30) / 100);
  }, 0);

  // 5. ANÁLISE
  const saldo = estoqueMS - necessidadeTotalMS;
  const diasCobertos = consumoDiarioMS_ton > 0 
    ? Math.floor(estoqueMS / consumoDiarioMS_ton) : 0;
  const percentualCobertura = necessidadeTotalMS > 0 
    ? (estoqueMS / necessidadeTotalMS) * 100 : 0;

  return {
    consumoDiarioMS_ton,
    diasPeriodo,
    necessidadeTotalMS,
    estoqueMS,
    saldo,
    diasCobertos,
    percentualCobertura
  };
}, [selectedPeriodo, categorias, silos, movimentacoes]);
```

**Fórmulas:**
- `Consumo Diário = ∑(Qtd. Cabeças × Consumo MS/cab/dia)`
- `Necessidade = Consumo Diário × Dias do Período`
- `Estoque MS = ∑(Silo: Quantidade × Teor MS%)`
- `Saldo = Estoque - Necessidade`
- `Dias Cobertos = Estoque / Consumo Diário`
- `Cobertura = (Estoque / Necessidade) × 100%`

---

### 5.2 Simulador Forrageiro — Cálculos de Cenário

**Arquivo:** `app/dashboard/simulador/page.tsx` (linhas 91–126)

```typescript
const resultados = useMemo(() => {
  if (!selectedPeriodo) return null;

  // 1. DEMANDA (NECESSIDADE DO REBANHO)
  const consumoDiarioMS_kg = categorias.reduce((acc, c) => 
    acc + (c.quantidade_cabecas * c.consumo_ms_kg_cab_dia), 0);
  
  const diasPeriodo = differenceInDays(
    parseISO(selectedPeriodo.data_fim),
    parseISO(selectedPeriodo.data_inicio)
  ) + 1;

  const necessidadeTotalMS = (consumoDiarioMS_kg / 1000) * diasPeriodo;

  // 2. OFERTA (PRODUÇÃO ESTIMADA)
  const producaoEstimadaMV = areaSimulada * produtividadeEsperada;
  const producaoEstimadaMS = producaoEstimadaMV * (msEsperada / 100);

  // 3. SALDO E RECOMENDAÇÕES
  const saldo = producaoEstimadaMS - necessidadeTotalMS;
  const percentualCobertura = necessidadeTotalMS > 0 
    ? (producaoEstimadaMS / necessidadeTotalMS) * 100 : 0;
  
  const areaAdicionalNecessaria = saldo < 0 
    ? Math.abs(saldo) / (produtividadeEsperada * (msEsperada / 100))
    : 0;

  return {
    necessidadeTotalMS,
    producaoEstimadaMV,
    producaoEstimadaMS,
    saldo,
    percentualCobertura,
    areaAdicionalNecessaria,
    diasPeriodo
  };
}, [selectedPeriodo, categorias, areaSimulada, produtividadeEsperada, msEsperada]);
```

**Fórmulas:**
- `Demanda = Consumo Diário × Dias do Período`
- `Produção MV = Área (ha) × Produtividade (ton/ha)`
- `Produção MS = Produção MV × Teor MS%`
- `Saldo = Produção MS - Demanda`
- `Cobertura = (Produção MS / Demanda) × 100%`
- `Área Adicional = |Saldo| / (Produtividade × Teor MS%)`

---

### 5.3 Sugestões Automáticas (Histórico)

**Arquivo:** `app/dashboard/simulador/page.tsx` (linhas 42–85)

```typescript
// Sugerir produtividade a partir do histórico
if (ciclosData.data && ciclosData.data.length > 0) {
  const avgProd = (ciclosData.data as CicloAgricola[])
    .reduce((acc, c) => acc + (c.produtividade || 0), 0) 
    / ciclosData.data.length;
  setProdutividadeEsperada(Math.round(avgProd));
}

// Sugerir teor MS a partir do histórico
if (silosData.length > 0) {
  const silosComMS = silosData.filter(s => s.materia_seca_percent);
  if (silosComMS.length > 0) {
    const avgMS = silosComMS.reduce((acc, s) => 
      acc + (s.materia_seca_percent || 0), 0) 
      / silosComMS.length;
    setMsEsperada(Math.round(avgMS));
  }
}
```

---

## 6. Lacunas e Problemas Identificados

### 6.1 Críticos 🔴

#### 1. **Análises Bromatológicas Não Salvam em BD**
- **Arquivo:** `app/dashboard/silos/components/dialogs/AvaliacaoBromatologicaDialog.tsx`
- **Linha:** 61
- **Problema:** Formulário completo com validação Zod, mas `handleSubmit` contém `TODO: Implementar salvamento em banco de dados`
- **Impacto:** Usuário não consegue registrar análises de qualidade da silagem
- **O que falta:**
  - Criar tabela `avaliacoes_bromatologicas` no Supabase
  - Adicionar tipo TypeScript completo (atualmente `AvaliacaoBromatologica` é incompleto)
  - Implementar query em `queries-audit.ts`: `q.avaliacoesBromatologicas.create()`
  - Conectar `handleSubmit` à query

---

#### 2. **Análises PSPS Não Salvam em BD**
- **Arquivo:** `app/dashboard/silos/components/dialogs/AvaliacaoPspsDialog.tsx`
- **Linha:** 82
- **Problema:** Mesmo problema que análises bromatológicas
- **Impacto:** Usuário não consegue registrar distribuição de tamanho de partículas
- **O que falta:**
  - Criar tabela `avaliacoes_psps` no Supabase
  - Adicionar tipo TypeScript
  - Implementar query em `queries-audit.ts`: `q.avaliacoesPsps.create()`
  - Conectar `handleSubmit` à query

---

#### 3. **Tabelas de Avaliação Não Existem no Banco**
- **Esperado:** Migrations para `avaliacoes_bromatologicas` e `avaliacoes_psps`
- **Encontrado:** ❌ Nenhuma migration criada
- **Problema:** Dados não persistem, formulários são apenas UI
- **Impacto:** Perda de dados de qualidade de silagem

---

### 6.2 Graves ⚠️

#### 4. **Tipo AvaliacaoBromatologica Incompleto**
- **Arquivo:** `lib/supabase.ts` (linhas 210–216)
- **Problema:** Tipo tem apenas 4 campos; formulário usa 8
- **O que falta:**
  ```typescript
  export type AvaliacaoBromatologica = {
    id: string;
    silo_id: string;
    data: string;
    momento: string;          // ← FALTA
    avaliador: string;        // ← FALTA
    pb: number | null;        // ← FALTA
    fd: number | null;        // ← FALTA
    fda: number | null;       // ← FALTA
    energia: number | null;   // ← FALTA
    umidade: number | null;   // ← FALTA
    ms: number | null;        // Mantém este?
    created_at: string;
  };
  ```

---

#### 5. **Nenhum Schema Zod para Rebanho**
- **Esperado:** Validadores em `validators/` para Rebanho e Silagem
- **Encontrado:** Apenas `validators/calculadoras.ts` (Calagem + NPK)
- **Problema:** Formulários de rebanho/período usam formulários manuais, sem validação Zod centralizada
- **Exemplo do que deveria existir:**
  ```typescript
  // validators/rebanho.ts
  export const categoriaRebanhoSchema = z.object({
    nome: z.string().min(1, "Nome obrigatório"),
    quantidade_cabecas: z.number().positive("Qtd. deve ser > 0"),
    consumo_ms_kg_cab_dia: z.number().positive("Consumo deve ser > 0"),
  });
  ```

---

#### 6. **Integração com Relatórios Não Implementada**
- **Arquivo:** `app/dashboard/relatorios/page.tsx`
- **Status:** Stub — nenhum relatório real gerado
- **Impacto:** Usuário não consegue exportar dados de rebanho/silagem
- **O que deveria ter:**
  - Relatório de "Necessidade vs. Estoque (histórico)"
  - Relatório de "Simulações salvas"
  - Export em PDF/CSV

---

### 6.3 Moderados 📋

#### 7. **Sem Persistência de Cenários no Simulador**
- **Problema:** Usuário ajusta parâmetros, mas não consegue salvar cenários
- **Esperado:**
  - Tabela `cenarios_simulacao` ou similar
  - Botão "Salvar Cenário"
  - Histórico de simulações para comparação

---

#### 8. **Sem Alertas/Manutenção Preventiva**
- **Problema:** Sistema calcula déficit, mas não dispara alertas
- **Esperado:**
  - Alertas no dashboard quando cobertura < 100%
  - Sugestões de aumento de área
  - Notificações sobre períodos críticos

---

#### 9. **Falta Validação de Período (Data Fim > Data Início)**
- **Arquivo:** `app/dashboard/rebanho/page.tsx` (Modal de período)
- **Problema:** Formulário não valida `data_fim > data_inicio` antes de salvar
- **Impacto:** Período com datas invertidas causa cálculos negativos ou errados

---

#### 10. **Movimentações de Silo Não Validam Silo Pertence à Fazenda**
- **Arquivo:** `lib/supabase/queries-audit.ts` (linhas 162–181)
- **Problema:** `movimentacoesSilo.create()` não valida que `silo_id` pertence à fazenda do usuário
- **Comportamento Atual:** RLS no banco garante, mas sem auditoria no TypeScript
- **Recomendação:** Adicionar check explícito como em `ciclosAgricolas.create()` (linhas 288–297)

---

### 6.4 Melhorias Sugeridas (Nice-to-Have) 💡

#### 11. **Calculadora de Necessidade de Silo**
- **Esperado:** "Quantos silos vou precisar?" baseado em:
  - Demanda total
  - Tipo de silo (rendimento vs. volume)
  - Margem de segurança

---

#### 12. **Gráficos de Série Temporal**
- **Esperado:** Histórico de estoque ao longo do período
- **Útil para:** Visualizar consumo esperado, pontos de risco

---

#### 13. **Suporte para Múltiplas Forrageiras**
- **Atual:** Trata silagem genericamente
- **Melhor:** Distinguir milho, capim, sorgo (consumo/produção diferentes)

---

## 7. Resumo Executivo

### Estado Geral

O GestSilo Pro possui **dois módulos com lógica de planejamento bem implementada**, mas com **gaps críticos de persistência**:

| Funcionalidade | Status | Detalhes |
|---|---|---|
| **Planejador de Rebanho** | ✅ Funcional | Cadastro de categorias e períodos, cálculos corretos |
| **Simulador Forrageiro** | ✅ Funcional | Parâmetros interativos, cálculos em tempo real |
| **Análises Bromatológicas** | ⚠️ Parcial | Formulário criado, **não salva em BD** |
| **Análises PSPS** | ⚠️ Parcial | Formulário criado, **não salva em BD** |
| **Persistência de Cenários** | ❌ Não Impl. | Sem tabela nem queries |
| **Relatórios** | ❌ Stub | Apenas placeholder |

### Arquitetura

- **Frontend:** React 19 + React Hook Form (sem Zod para Rebanho)
- **Queries:** Camada `q` em `queries-audit.ts` (pattern correto, implementado para Rebanho)
- **Banco:** Migrações presentes, tabelas de rebanho criadas, tabelas de análises ausentes
- **Cálculos:** Corretos e otimizados com `useMemo`

### Próximos Passos Recomendados (Prioridade)

1. **P1 — Crítico:** Implementar persistência de análises bromatológicas e PSPS
2. **P2 — Crítico:** Criar migrações SQL para tabelas de avaliação
3. **P3 — Alto:** Adicionar validação Zod para Rebanho e Silagem
4. **P4 — Médio:** Implementar persistência de cenários no simulador
5. **P5 — Médio:** Gerar relatórios reais (PDF/CSV)

---

**Gerado:** 16 de abril de 2026  
**Ferramenta:** Claude Code (Pesquisa Automatizada)
