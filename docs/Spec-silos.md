# Spec Técnica — Reformulação do Módulo de Gestão de Silos

**Data:** 13/04/2026  
**Status:** 📋 Especificação Técnica de Implementação  
**Baseado em:** PRD-silos.md (aprovado)

---

## 📋 Índice

1. [Fases de Implementação](#fases-de-implementação)
2. [Lista Completa de Arquivos](#lista-completa-de-arquivos)
3. [Dependências Entre Fases](#dependências-entre-fases)
4. [Detalhes por Arquivo](#detalhes-por-arquivo)
5. [Pontos Críticos de Atenção](#pontos-críticos-de-atenção)
6. [Checklist de Validação](#checklist-de-validação)

---

## 🎯 Fases de Implementação

### **FASE 0: Preparação Estrutural** (Sem impacto visual)
- [ ] Migration do banco de dados
- [ ] Tipos TypeScript
- [ ] Schemas de validação

**Duração estimada:** 1-2 horas  
**Bloqueador:** Nenhum (preparação)  
**Output:** BD atualizado, tipos prontos, schemas de validação

---

### **FASE 1: Backend & Queries** (Sem impacto visual)
- [ ] Funções helper para cálculos
- [ ] Queries CRUD para silos, movimentações, avaliações
- [ ] Funções de rastreabilidade de custo

**Duração estimada:** 2-3 horas  
**Bloqueador:** Fase 0  
**Output:** Camada de dados pronta

---

### **FASE 2: Formulários & Dialogs** (Interação sem visualização)
- [ ] Dialog "Novo Silo" com 3 seções
- [ ] Dialog "Registrar Movimentação"
- [ ] Dialog "Nova Avaliação Bromatológica"
- [ ] Dialog "Nova Avaliação PSPS"
- [ ] Lógica de auto-preenchimento (talhão → cultura, data fechamento → data abertura)
- [ ] Validações em tempo real e cálculos automáticos

**Duração estimada:** 3-4 horas  
**Bloqueador:** Fase 1  
**Output:** Formulários funcionais (sem visualização na página ainda)

---

### **FASE 3: Componentes de Exibição** (Componentes isolados)
- [ ] `SiloCard.tsx` — card resumo para listagem
- [ ] `SiloDetailHeader.tsx` — header com status badge
- [ ] `VisaoGeralTab.tsx` — aba 1 (dados gerais, custo, datas)
- [ ] `EstoqueTab.tsx` — aba 2 (resumo de movimentações, histórico)
- [ ] `QualidadeTab.tsx` — aba 3 (avaliações bromatológicas e PSPS)
- [ ] Componentes auxiliares (barras de progresso, badges, indicadores)

**Duração estimada:** 4-5 horas  
**Bloqueador:** Fase 1, 2 (parcialmente)  
**Output:** Componentes prontos, testáveis isoladamente

---

### **FASE 4: Páginas Principais** (Páginas de rota)
- [ ] `app/dashboard/silos/page.tsx` — listagem com grid de cards
- [ ] `app/dashboard/silos/[id]/page.tsx` — tela detalhada com abas

**Duração estimada:** 1-2 horas  
**Bloqueador:** Fase 2, 3  
**Output:** Funcionalidade completa, pronta para testes

---

## 📂 Lista Completa de Arquivos

### **FASE 0 — Preparação Estrutural**

| Arquivo | Tipo | Ação | Prioridade |
|---------|------|------|-----------|
| `supabase/migrations/20260413_silos_reformulacao.sql` | SQL | ✅ Criar | 🔴 Crítica |
| `lib/supabase.ts` | TS | 🔄 Modificar (tipos) | 🔴 Crítica |
| `lib/validations/silos.ts` | TS | ✨ Criar | 🔴 Crítica |

### **FASE 1 — Backend & Queries**

| Arquivo | Tipo | Ação | Prioridade |
|---------|------|------|-----------|
| `lib/supabase/queries-audit.ts` | TS | 🔄 Modificar (queries) | 🔴 Crítica |
| `lib/supabase/silos.ts` | TS | 🔄 Modificar (helpers) | 🔴 Crítica |

### **FASE 2 — Formulários & Dialogs**

| Arquivo | Tipo | Ação | Prioridade |
|---------|------|------|-----------|
| `app/dashboard/silos/components/SiloForm.tsx` | TSX | ✨ Criar | 🟡 Alta |
| `app/dashboard/silos/components/dialogs/MovimentacaoDialog.tsx` | TSX | ✨ Criar | 🟡 Alta |
| `app/dashboard/silos/components/dialogs/AvaliacaoBromatologicaDialog.tsx` | TSX | ✨ Criar | 🟡 Alta |
| `app/dashboard/silos/components/dialogs/AvaliacaoPspsDialog.tsx` | TSX | ✨ Criar | 🟡 Alta |

### **FASE 3 — Componentes de Exibição**

| Arquivo | Tipo | Ação | Prioridade |
|---------|------|------|-----------|
| `app/dashboard/silos/components/SiloCard.tsx` | TSX | ✨ Criar | 🟡 Alta |
| `app/dashboard/silos/components/SiloDetailHeader.tsx` | TSX | ✨ Criar | 🟡 Alta |
| `app/dashboard/silos/components/tabs/VisaoGeralTab.tsx` | TSX | ✨ Criar | 🟡 Alta |
| `app/dashboard/silos/components/tabs/EstoqueTab.tsx` | TSX | ✨ Criar | 🟡 Alta |
| `app/dashboard/silos/components/tabs/QualidadeTab.tsx` | TSX | ✨ Criar | 🟡 Alta |

### **FASE 4 — Páginas Principais**

| Arquivo | Tipo | Ação | Prioridade |
|---------|------|------|-----------|
| `app/dashboard/silos/page.tsx` | TSX | 🔄 Modificar (reescrever) | 🔴 Crítica |
| `app/dashboard/silos/[id]/page.tsx` | TSX | ✨ Criar | 🔴 Crítica |

### **Arquivos Deletados (Referência)**

| Arquivo | Motivo |
|---------|--------|
| — | Nenhum arquivo será deletado (refactor é in-place) |

---

## 🔗 Dependências Entre Fases

```
FASE 0 (Migration + Types + Validations)
   ↓
FASE 1 (Queries + Helpers)
   ↓
   ├─→ FASE 2 (Formulários)
   │      ↓
   └─→ FASE 3 (Componentes)
          ↓
       FASE 4 (Páginas)
```

**Ordem de execução recomendada:**
1. **Fase 0** → Tudo
2. **Fase 1** → Tudo
3. **Fase 2** → Tudo (paralelo com Fase 3 possível, mas recomenda-se ordem)
4. **Fase 3** → Tudo
5. **Fase 4** → Tudo

---

## 🔍 Detalhes por Arquivo

### FASE 0: Preparação Estrutural

#### **supabase/migrations/20260413_silos_reformulacao.sql** — ✨ CRIAR

**O que:** Script SQL de migration completo  
**Contém:**
- Migração de tipo enum de silo (Bolsa→Bag, Bunker→Trincheira, Convencional→Outros)
- Adição de coluna `talhao_id` (FK → talhoes, **NULLABLE** para permitir legado)
- Adição de campos novos: `data_fechamento`, `data_abertura_prevista`, `data_abertura_real`, `volume_ensilado_ton_mv`, `comprimento_m`, `largura_m`, `altura_m`, `observacoes_gerais`, `cultura_ensilada`
- Remoção de: `capacidade`, `localizacao`, `consumo_medio_diario_ton`
- Criação de tabelas: `avaliacoes_bromatologicas` (com campo `avaliador`), `avaliacoes_psps`
- Adição de coluna `subtipo` em `movimentacoes_silo`
- RLS policies para três novas tabelas (SELECT/INSERT/UPDATE/DELETE)

**Tabelas criadas com detalhe:**
```sql
CREATE TABLE avaliacoes_bromatologicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silo_id UUID NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  momento VARCHAR(20) NOT NULL,
  ms NUMERIC(5, 2), pb NUMERIC(5, 2), fdn NUMERIC(5, 2), ... [outros campos],
  avaliador VARCHAR(100), -- NOVO: quem realizou
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**RLS Policies — VERIFICAR DUPLICAÇÃO:**
- ✅ `silos_select_by_fazenda` — já existe? Verificar em `auth.users`
- ✅ `avaliacoes_bromatologicas_select_by_fazenda` — nova
- ✅ `avaliacoes_psps_select_by_fazenda` — nova
- ✅ INSERT/UPDATE/DELETE policies para todas as tabelas

**Validações de migração:**
- [ ] `talhao_id` deixar como NULLABLE (silos legado sem talhão)
- [ ] Tipo enum migrado corretamente
- [ ] Campo `avaliador` adicionado em `avaliacoes_bromatologicas`
- [ ] Validar RLS policies após aplicação

---

#### **lib/supabase.ts** — 🔄 MODIFICAR (Tipos)

**O que:** Adicionar tipos e atualizar existentes

**Adicionar:**
```typescript
export type Silo = {
  id: string;
  nome: string;
  tipo: 'Superfície' | 'Trincheira' | 'Bag' | 'Outros';
  talhao_id: string | null; // NOVO (NULLABLE para permitir silos legado sem talhão)
  cultura_ensilada: string | null; // NOVO
  fazenda_id: string;
  data_fechamento: string | null; // NOVO
  data_abertura_prevista: string | null; // NOVO
  data_abertura_real: string | null; // NOVO
  observacoes_gerais: string | null; // NOVO
  volume_ensilado_ton_mv: number | null; // NOVO
  materia_seca_percent: number | null;
  comprimento_m: number | null; // NOVO
  largura_m: number | null; // NOVO
  altura_m: number | null; // NOVO
  insumo_lona_id: string | null;
  insumo_inoculante_id: string | null;
  // REMOVIDO: capacidade, localizacao, consumo_medio_diario_ton
};

export type AvaliacaoBromatologica = {
  id: string;
  silo_id: string;
  data: string;
  momento: 'Fechamento' | 'Abertura' | 'Monitoramento';
  ms: number | null;
  pb: number | null;
  fdn: number | null;
  fda: number | null;
  ee: number | null;
  mm: number | null;
  amido: number | null;
  ndt: number | null;
  ph: number | null;
  avaliador: string | null; // NOVO: quem realizou a avaliação
  created_at: string;
  updated_at: string;
};

export type AvaliacaoPsps = {
  id: string;
  silo_id: string;
  data: string;
  momento: 'Fechamento' | 'Abertura' | 'Monitoramento';
  peneira_19mm: number;
  peneira_8_19mm: number;
  peneira_4_8mm: number;
  peneira_fundo_4mm: number;
  tamanho_teorico_corte_mm: number | null;
  kernel_processor: boolean;
  avaliador: string | null;
  tmp_mm: number; // CALCULADO
  status_peneira_19mm: 'ok' | 'fora'; // CALCULADO
  status_peneira_8_19mm: 'ok' | 'fora'; // CALCULADO
  status_peneira_4_8mm: 'ok' | 'fora'; // CALCULADO
  status_peneira_fundo_4mm: 'ok' | 'fora'; // CALCULADO
  created_at: string;
  updated_at: string;
};

export type MovimentacaoSilo = {
  id: string;
  silo_id: string;
  tipo: 'Entrada' | 'Saída';
  subtipo: string | null; // NOVO: 'Uso na alimentação' | 'Descarte' | 'Transferência' | 'Venda'
  quantidade: number;
  data: string;
  talhao_id: string | null;
  responsavel: string | null;
  observacao: string | null;
};
```

---

#### **lib/validations/silos.ts** — ✨ CRIAR

**O que:** Schemas Zod para validação de formulários

**Contém:**
- `siloSchema` — validação do formulário "Novo Silo"
- `movimentacaoSiloSchema` — validação do formulário "Registrar Movimentação"
- `avaliacaoBromatologicaSchema` — validação do formulário "Avaliação Bromatológica"
- `avaliacaoPspsSchema` — validação do formulário "Avaliação PSPS" (com refine para soma = 100%)

**Constantes exportadas:**
- `TIPOS_SILO = ['Superfície', 'Trincheira', 'Bag', 'Outros']`
- `MOMENTOS_AVALIACAO = ['Fechamento', 'Abertura', 'Monitoramento']`
- `SUBTIPOS_MOVIMENTACAO = ['Uso na alimentação', 'Descarte', 'Transferência', 'Venda']`

---

### FASE 1: Backend & Queries

#### **lib/supabase/queries-audit.ts** — 🔄 MODIFICAR (Adicionar queries)

**O que:** Adicionar/atualizar namespace `q.silos`, `q.movimentacoesSilo`, e criar novos `q.avaliacoesBromatologicas`, `q.avaliacoesPsps`

**Funções a adicionar/atualizar:**

**`q.silos`:**
```typescript
q.silos.list() // Existente, manter
q.silos.create(payload: Omit<Silo, 'id'>) // Existente, atualizar para incluir novos campos
q.silos.update(id, payload: Partial<Silo>) // Existente, manter
q.silos.remove(id) // Existente, manter

// NOVOS
q.silos.getById(id: string): Promise<Silo>
q.silos.getEstoque(siloId: string): Promise<{ total: number; percentage: number }>
q.silos.getDensidade(siloId: string): Promise<number>
q.silos.getStatusAtual(siloId: string): Promise<'Enchendo' | 'Fechado' | 'Aberto' | 'Vazio' | 'Atenção'>
q.silos.getMsAtual(siloId: string): Promise<number | null> // Último MS de avaliacoes_bromatologicas
```

**`q.movimentacoesSilo`:**
```typescript
q.movimentacoesSilo.listBySilo(siloId: string) // Existente, manter
q.movimentacoesSilo.listBySilos(siloIds: string[]) // Existente, manter
q.movimentacoesSilo.create(payload) // Existente, atualizar para incluir subtipo
q.movimentacoesSilo.remove(id) // Existente, manter

// NOVOS (helpers para cálculos)
q.movimentacoesSilo.getSaidasUso(siloId: string): Promise<MovimentacaoSilo[]> // Apenas subtipo='Uso na alimentação'
q.movimentacoesSilo.sumQtd(siloId: string, tipo: 'Entrada' | 'Saída'): Promise<number>
q.movimentacoesSilo.getConsumoDiario(siloId: string): Promise<number> // Σ saídas(Uso) / dias desde data_abertura_real
```

**`q.avaliacoesBromatologicas` (NOVO namespace):**
```typescript
q.avaliacoesBromatologicas.listBySilo(siloId: string): Promise<AvaliacaoBromatologica[]>
q.avaliacoesBromatologicas.create(payload: Omit<AvaliacaoBromatologica, 'id' | 'created_at' | 'updated_at'>): Promise<AvaliacaoBromatologica>
q.avaliacoesBromatologicas.remove(id: string): Promise<void>
```

**`q.avaliacoesPsps` (NOVO namespace):**
```typescript
q.avaliacoesPsps.listBySilo(siloId: string): Promise<AvaliacaoPsps[]>
q.avaliacoesPsps.create(payload): Promise<AvaliacaoPsps> // Com validação de soma = 100%
q.avaliacoesPsps.remove(id: string): Promise<void>
```

**`q.talhoes` — VERIFICAR SE EXISTE:**
```typescript
// ✅ SE EXISTIR, apenas validar:
q.talhoes.getById(id: string): Promise<Talhao>

// ❌ SE NÃO EXISTIR, CRIAR:
q.talhoes.list(): Promise<Talhao[]> // Listar talhões da fazenda
q.talhoes.getById(id: string): Promise<Talhao> // Buscar talhão específico
```

**Observação:** `q.talhoes.getById()` é usado em:
- `SiloDetailPage` para buscar talhão associado ao silo
- `SiloForm` para buscar cultura ao selecionar talhão
- Validações de RLS (talhão pertence à mesma fazenda)

**RLS Security — Verificar existentes:**
- ✅ Todas as queries de `silos` já usam `eq('fazenda_id', fazendaId)` via `getFazendaId()`
- ✅ Adicionar checks similares em queries de avaliações (verificar que silo pertence à fazenda antes de modificar)

---

#### **lib/supabase/silos.ts** — 🔄 MODIFICAR (Adicionar helpers)

**O que:** Funções helper reutilizáveis para cálculos

**Atualizar/Adicionar:**
```typescript
// Existentes (atualizar assinatura)
export async function updateSilo(id: string, partial: Partial<Silo>): Promise<void>
export async function deleteSilo(id: string): Promise<void>
export async function getCustoProducaoSilagem(siloId: string): Promise<{
  custoTotal: number;
  totalToneladas: number;
  custoPorTonelada: number;
}>

// NOVOS
export async function calcularDensidade(
  volumeTonMv: number,
  comprimento: number,
  largura: number,
  altura: number
): Promise<number> // Retorna kg/m³

export async function calcularEstoqueAtual(
  siloId: string
): Promise<{ total: number; percentage: number }> // Retorna ton e % do volume

export async function calcularConsumoDiario(
  siloId: string
): Promise<number> // Retorna ton/dia

export async function obterStatusSilo(
  siloId: string
): Promise<'Enchendo' | 'Fechado' | 'Aberto' | 'Vazio' | 'Atenção'> // Retorna status para badge

export async function obterMsAtual(
  siloId: string
): Promise<number | null> // Retorna último MS registrado

export async function obterEstoqueParaDias(
  siloId: string
): Promise<number | null> // Retorna número de dias de estoque
```

---

### FASE 2: Formulários & Dialogs

#### **app/dashboard/silos/components/SiloForm.tsx** — ✨ CRIAR

**O que:** Dialog para criar/editar Silo com 3 seções, auto-preenchimentos e cálculos

**Props:**
```typescript
interface SiloFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  siloData?: Silo; // Requerido quando mode='edit'
  onSuccess: () => void; // Callback após sucesso
}
```

**Estrutura:**
```
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>
        {mode === 'create' ? 'Cadastrar Novo Silo' : `Editar ${siloData.nome}`}
      </DialogTitle>
    </DialogHeader>
    
    <Tabs defaultValue="section-a">
      <TabsList>
        <TabsTrigger value="section-a">Dados Gerais</TabsTrigger>
        <TabsTrigger value="section-b">Dados Quantitativos</TabsTrigger>
        <TabsTrigger value="section-c">Insumos</TabsTrigger>
      </TabsList>
      
      <TabsContent value="section-a">
        ... Nome, Tipo, Talhão, Cultura (ro), Data fechamento, Data abertura prev, Obs
      </TabsContent>
      
      <TabsContent value="section-b">
        ... Volume, MS, Comprimento, Largura, Altura, Densidade (ro+indicador)
      </TabsContent>
      
      <TabsContent value="section-c">
        ... Lona, Inoculante
      </TabsContent>
    </Tabs>
    
    <DialogFooter>
      <Button variant="outline">Cancelar</Button>
      <Button>{mode === 'create' ? 'Cadastrar' : 'Atualizar'}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Comportamentos automáticos:**
- [ ] Ao selecionar Talhão: buscar e preencher `cultura_ensilada` (read-only)
- [ ] Ao sair de "Data fechamento": calcular e pré-preencher "Data abertura prevista" (+ 60 dias)
- [ ] Ao sair de "Altura": calcular densidade com indicador visual (🟢/🟡/🔴)
- [ ] Validação em tempo real com Zod schema

**Submit:**
- Validar com `siloSchema` do Zod
- Se `mode='create'`: chamar `q.silos.create()`
- Se `mode='edit'`: chamar `q.silos.update(siloData.id, payload)`
- Fechar dialog
- Notificar sucesso com toast
- Chamar `onSuccess()` callback para refetch

---

#### **app/dashboard/silos/components/dialogs/MovimentacaoDialog.tsx** — ✨ CRIAR

**O que:** Dialog "Registrar Movimentação" com silo selecionável ou pré-definido

**Props:**
```typescript
interface MovimentacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siloId?: string; // Se undefined: mostrar dropdown de silos. Se definido: read-only
  onSuccess: () => void;
}
```

**Comportamento:**
- **Sem `siloId`:** Exibir dropdown como primeiro campo (buscar lista de silos)
- **Com `siloId`:** Exibir nome do silo como read-only (header ou campo desabilitado)

**Estrutura:**
```
<Dialog>
  <DialogContent>
    <DialogHeader><DialogTitle>Registrar Movimentação</DialogTitle></DialogHeader>
    
    <Form>
      {/* Se siloId undefined: dropdown de silos */}
      {!siloId && (
        <FormField name="silo_id">
          <Label>Silo *</Label>
          <Select>
            <SelectItem value="id1">Silo Norte 01</SelectItem>
            <SelectItem value="id2">Silo Sul 02</SelectItem>
            ...
          </Select>
        </FormField>
      )}
      
      {/* Se siloId definido: exibir como read-only */}
      {siloId && (
        <div className="p-3 bg-muted rounded">
          <Label>Silo</Label>
          <p className="font-semibold">{siloNome}</p>
        </div>
      )}
      
      <FormField name="tipo">
        <Label>Tipo</Label>
        <Select defaultValue="Saída">
          <SelectItem value="Entrada">Entrada</SelectItem>
          <SelectItem value="Saída">Saída</SelectItem>
        </Select>
      </FormField>
      
      <FormField name="subtipo" [hidden={tipo==='Entrada'}]>
        <Label>Subtipo (obrigatório se Saída)</Label>
        <Select>
          <SelectItem value="Uso na alimentação">Uso na alimentação</SelectItem>
          <SelectItem value="Descarte">Descarte</SelectItem>
          <SelectItem value="Transferência">Transferência</SelectItem>
          <SelectItem value="Venda">Venda</SelectItem>
        </Select>
      </FormField>
      
      <FormField name="quantidade">
        <Label>Quantidade (ton)</Label>
        <Input type="number" />
      </FormField>
      
      <FormField name="data">
        <Label>Data</Label>
        <DatePicker defaultValue={today()} />
      </FormField>
      
      <FormField name="talhao_id" [hidden={subtipo !== 'Transferência'}]>
        <Label>Talhão de destino (opcional, se Transferência)</Label>
        <Select />
      </FormField>
      
      <FormField name="responsavel">
        <Label>Responsável</Label>
        <Input />
      </FormField>
      
      <FormField name="observacao">
        <Label>Observação</Label>
        <Textarea />
      </FormField>
    </Form>
    
    <DialogFooter>
      <Button variant="outline">Cancelar</Button>
      <Button>Registrar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Validação:**
- Validar com `movimentacaoSiloSchema`
- Se tipo='Saída', subtipo obrigatório
- Quantidade > 0
- Quantidade não pode exceder estoque atual (se tipo='Saída')
- Se siloId undefined, campo silo_id obrigatório

---

#### **app/dashboard/silos/components/dialogs/AvaliacaoBromatologicaDialog.tsx** — ✨ CRIAR

**O que:** Dialog "Nova Avaliação Bromatológica"

**Estrutura:**
```
<Dialog>
  <DialogContent>
    <DialogHeader><DialogTitle>Nova Avaliação Bromatológica</DialogTitle></DialogHeader>
    
    <Form>
      <FormField name="data"><Label>Data</Label><DatePicker /></FormField>
      <FormField name="momento"><Label>Momento</Label><Select>
        <SelectItem>Fechamento</SelectItem>
        <SelectItem>Abertura</SelectItem>
        <SelectItem>Monitoramento</SelectItem>
      </Select></FormField>
      
      <Separator />
      <Label className="font-semibold">Valores Bromatológicos (%)</Label>
      
      <FormField name="ms"><Label>Matéria Seca (MS)</Label><Input type="number" placeholder="32.5" /></FormField>
      <FormField name="pb"><Label>Proteína Bruta (PB)</Label><Input /></FormField>
      <FormField name="fdn"><Label>Fibra em Detergente Neutro (FDN)</Label><Input /></FormField>
      <FormField name="fda"><Label>Fibra em Detergente Ácido (FDA)</Label><Input /></FormField>
      <FormField name="ee"><Label>Extrato Etéreo (EE)</Label><Input /></FormField>
      <FormField name="mm"><Label>Matéria Mineral (MM)</Label><Input /></FormField>
      <FormField name="amido"><Label>Amido</Label><Input /></FormField>
      <FormField name="ndt"><Label>Nutrientes Digestíveis Totais (NDT)</Label><Input /></FormField>
      <FormField name="ph"><Label>pH</Label><Input type="number" placeholder="3.8" /></FormField>
    </Form>
    
    <DialogFooter>
      <Button variant="outline">Cancelar</Button>
      <Button>Salvar Avaliação</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Validação:**
- Validar com `avaliacaoBromatologicaSchema`
- Todos os campos opcionais (usuário escolhe quais preencher)

---

#### **app/dashboard/silos/components/dialogs/AvaliacaoPspsDialog.tsx** — ✨ CRIAR

**O que:** Dialog "Nova Avaliação PSPS" com validação de soma de peneiras

**Estrutura:**
```
<Dialog>
  <DialogContent>
    <DialogHeader><DialogTitle>Nova Avaliação de Partículas (PSPS)</DialogTitle></DialogHeader>
    
    <Form>
      <FormField name="data"><Label>Data</Label><DatePicker /></FormField>
      <FormField name="momento"><Label>Momento</Label><Select>...</Select></FormField>
      
      <Separator />
      <Label className="font-semibold">Peneiras (%)</Label>
      
      <FormField name="peneira_19mm">
        <Label>Peneira >19mm (ideal: 3-8%)</Label>
        <Input type="number" onChange={recalcSoma} />
        <ProgressBar value={value} color={value >= 3 && value <= 8 ? 'green' : 'red'} />
      </FormField>
      
      <FormField name="peneira_8_19mm">
        <Label>Peneira 8-19mm (ideal: 45-65%)</Label>
        <Input type="number" onChange={recalcSoma} />
        <ProgressBar ... />
      </FormField>
      
      <FormField name="peneira_4_8mm">
        <Label>Peneira 4-8mm (ideal: 20-30%)</Label>
        <Input type="number" onChange={recalcSoma} />
        <ProgressBar ... />
      </FormField>
      
      <FormField name="peneira_fundo_4mm">
        <Label>Fundo <4mm (ideal: 0-10%)</Label>
        <Input type="number" onChange={recalcSoma} />
        <ProgressBar ... />
      </FormField>
      
      <Alert variant={somaOk ? 'default' : 'destructive'}>
        {somaOk ? '✅ Soma = 100%' : `❌ Soma = ${soma}% (deve ser 100% ±0.5%)`}
      </Alert>
      
      <Separator />
      
      <FormField name="tamanho_teorico_corte_mm">
        <Label>Tamanho Teórico de Corte (mm)</Label>
        <Input type="number" />
      </FormField>
      
      <FormField name="kernel_processor">
        <Label>Kernel Processor</Label>
        <Checkbox />
      </FormField>
      
      <FormField name="avaliador">
        <Label>Avaliador</Label>
        <Input />
      </FormField>
    </Form>
    
    <DialogFooter>
      <Button variant="outline">Cancelar</Button>
      <Button disabled={!somaOk}>Salvar Avaliação</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Validação:**
- Validar com `avaliacaoPspsSchema` (que inclui refine para soma = 100% ±0.5%)
- Soma deve ser 100% para ativar botão "Salvar"
- Mostrar erro em vermelho se fora da faixa
- TMP calculado automaticamente no servidor (campo GENERATED em SQL)

---

### FASE 3: Componentes de Exibição

#### **app/dashboard/silos/components/SiloCard.tsx** — ✨ CRIAR

**O que:** Card individual para listagem de silos

**Props:**
```typescript
interface SiloCardProps {
  silo: Silo;
  estoque: { total: number; percentage: number };
  msAtual: number | null;
  consumoDiario: number | null;
  estoquePara: number | null;
  status: 'Enchendo' | 'Fechado' | 'Aberto' | 'Vazio' | 'Atenção';
  onClick: () => void;
}
```

**Renderização:**
```
┌─ Card ─────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Silo Norte 01          [Superfície]               [Status]  │ │
│ │ Milho — Talhão 005  |  {status_badge}                       │ │
│ ├────────────────────────────────────────────────────────────┤ │
│ │ [████████░░░░░░░░] {percentage}% ({total}/{volume} ton)    │ │
│ │ MS: {ms_original}% | MS atual: {ms_atual}% (há X dias)    │ │
│ │ Estoque para: {dias} dias | Consumo: {consumo}/dia          │ │
│ │ Fechado em: {data} | Aberto em: {data}                      │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Comportamento:**
- Clicável → navega para `/dashboard/silos/[id]`
- Status badge com cores (🟢/🟡/🔴/⚫)
- Barra de progresso com cor dinâmica
- Dados calculados em tempo real

---

#### **app/dashboard/silos/components/SiloDetailHeader.tsx** — ✨ CRIAR

**O que:** Header da tela detalhada com informações gerais

**Props:**
```typescript
interface SiloDetailHeaderProps {
  silo: Silo;
  status: 'Enchendo' | 'Fechado' | 'Aberto' | 'Vazio' | 'Atenção';
  onBack: () => void;
  onEdit: () => void;
}
```

**Renderização:**
```
┌─ Header ──────────────────────────────────────────────────────────┐
│ ← Voltar                                                           │
│                                                                    │
│ Silo Norte 01   [Superfície]   Milho — Talhão 005   [Status 🟢]  │
│                                                                    │
│ [✏️ Editar Dados do Silo]                                          │
└────────────────────────────────────────────────────────────────────┘
```

---

#### **app/dashboard/silos/components/tabs/VisaoGeralTab.tsx** — ✨ CRIAR

**O que:** Aba 1 — Visão Geral com dados, rastreabilidade, custo, datas, insumos, observações

**Seções:**
1. **Dados do Silo** (Nome, Tipo, Cultura, Dimensões, Volume, MS original, Densidade)
2. **Rastreabilidade & Custo** (Talhão origem, Ciclo agrícola, Custo/ton, Custo total)
3. **Datas** (Fechamento, Abertura prevista, Abertura real, Dias de fermentação)
4. **Insumos Utilizados** (Lona com lote/estoque, Inoculante)
5. **Observações** (Texto livre)

**Props:**
```typescript
interface VisaoGeralTabProps {
  silo: Silo;
  talhao: Talhao; // Para exibir nome e ciclo
  custo: { custoTotal: number; custoPorTonelada: number };
  densidade: number;
  insumoLona: Insumo | null;
  insumoInoculante: Insumo | null;
  onEdit: () => void;
}
```

---

#### **app/dashboard/silos/components/tabs/EstoqueTab.tsx** — ✨ CRIAR

**O que:** Aba 2 — Estoque e Movimentações

**Seções:**
1. **Resumo** (Entrada total, Saídas por subtipo, Estoque atual, Consumo diário, Estoque para X dias)
2. **Ações** ([🔄 Atualizar] [+ Registrar Movimentação])
3. **Histórico** (Tabela com últimas movimentações)

**Props:**
```typescript
interface EstoqueTabProps {
  siloId: string;
  volumeTotal: number;
  movimentacoes: MovimentacaoSilo[];
  estoque: { total: number; percentage: number };
  consumoDiario: number;
  estoquePara: number;
  onNovaMovimentacao: () => void;
}
```

**Comportamento:**
- Botão [+ Registrar Movimentação] abre `MovimentacaoDialog`
- Botão [🔄 Atualizar] refetch movimentações
- Tabela é paginada ou scrollável
- Ao registrar nova movimentação, atualizar tabela sem refresh (refetch ou otimista)

---

#### **app/dashboard/silos/components/tabs/QualidadeTab.tsx** — ✨ CRIAR

**O que:** Aba 3 — Qualidade (Avaliações Bromatológicas e PSPS)

**Seções:**
1. **Avaliação Bromatológica**
   - Botão [+ Nova Avaliação Bromatológica]
   - Lista com cards de avaliações (mais recente primeiro)
   - Cada card exibe: Data, Momento, Avaliador, valores (MS, PB, FDN, etc.)

2. **Avaliação PSPS**
   - Botão [+ Nova Avaliação PSPS]
   - Lista com cards de avaliações (mais recente primeiro)
   - Cada card exibe: Data, Momento, Avaliador, peneiras com barras de progresso
   - Indicadores 🟢/🟡/🔴 para cada peneira se dentro/fora da faixa ideal
   - TMP calculado e exibido
   - Status geral "✅ Todas as faixas dentro do ideal" ou "⚠️ Fora das faixas ideais"

**Props:**
```typescript
interface QualidadeTabProps {
  siloId: string;
  avaliacoesBromatologicas: AvaliacaoBromatologica[];
  avaliacoesPsps: AvaliacaoPsps[];
  onNovaBromatologica: () => void;
  onNovaPsps: () => void;
}
```

---

### FASE 4: Páginas Principais

#### **app/dashboard/silos/page.tsx** — 🔄 MODIFICAR (Reescrever)

**O que:** Tela principal de listagem de silos com carregamento em batch

**Atual:** ~700 linhas monolíticas → **Novo:** ~150-180 linhas com componentes importados

**Estratégia de dados:**
- ✅ Buscar todos os silos em uma chamada (`q.silos.list()`)
- ✅ Buscar movimentações de todos os silos em uma chamada (`q.movimentacoesSilo.listBySilos()`)
- ✅ **Calcular estoque, consumo, status, MS atual NO `fetchData()`**, não no JSX
- ❌ NÃO fazer chamadas async direto no render/JSX

**Estrutura:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { q } from '@/lib/supabase/queries-audit';
import { SiloCard } from './components/SiloCard';
import { SiloForm } from './components/SiloForm';
import { MovimentacaoDialog } from './components/dialogs/MovimentacaoDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Database } from 'lucide-react';
import { toast } from 'sonner';

interface SiloCardData {
  silo: Silo;
  estoque: { total: number; percentage: number };
  msAtual: number | null;
  consumoDiario: number;
  estoquePara: number;
  status: 'Enchendo' | 'Fechado' | 'Aberto' | 'Vazio' | 'Atenção';
}

export default function SilosPage() {
  const router = useRouter();
  const [silosData, setSilosData] = useState<SiloCardData[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoSilo[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNovoSilo, setOpenNovoSilo] = useState(false);
  const [openNovaMovimentacao, setOpenNovaMovimentacao] = useState(false);

  // Fetch BATCH: silos + movimentações + cálculos
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      // 1. Fetch silos
      const silos = await q.silos.list();
      if (silos.length === 0) {
        setSilosData([]);
        setMovimentacoes([]);
        return;
      }
      
      // 2. Fetch movimentações em batch (uma chamada para todos)
      const movs = await q.movimentacoesSilo.listBySilos(silos.map(s => s.id));
      setMovimentacoes(movs);
      
      // 3. Calcular dados para cada silo NO ESTADO, não no render
      const silosWithData: SiloCardData[] = await Promise.all(
        silos.map(async (silo) => {
          const estoque = await calcularEstoque(silo, movs);
          const msAtual = await obterMsAtual(silo.id);
          const consumoDiario = await obterConsumoDiario(silo, movs);
          const estoquePara = estoque.total > 0 
            ? Math.round(estoque.total / (consumoDiario || 1))
            : 0;
          const status = obterStatusSilo(silo, estoque, estoquePara);
          
          return {
            silo,
            estoque,
            msAtual,
            consumoDiario,
            estoquePara,
            status,
          };
        })
      );
      
      setSilosData(silosWithData);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar silos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestão de Silos</h1>
        <div className="flex gap-2">
          <Button onClick={() => setOpenNovoSilo(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Silo
          </Button>
          <Button variant="outline" onClick={() => setOpenNovaMovimentacao(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar Movimentação
          </Button>
        </div>
      </div>

      {/* Grid de Cards — DADOS JÁ CALCULADOS */}
      {silosData.length === 0 ? (
        <Card className="p-12 text-center">
          <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p>Nenhum silo cadastrado. Clique em "Novo Silo" para começar.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {silosData.map(({ silo, estoque, msAtual, consumoDiario, estoquePara, status }) => (
            <SiloCard
              key={silo.id}
              silo={silo}
              estoque={estoque}
              msAtual={msAtual}
              consumoDiario={consumoDiario}
              estoquePara={estoquePara}
              status={status}
              onClick={() => router.push(`/dashboard/silos/${silo.id}`)}
            />
          ))}
        </div>
      )}

      {/* Tabela de Histórico de Movimentações */}
      {movimentacoes.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Histórico de Movimentações</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Silo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Subtipo</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoes.slice(0, 20).map(mov => {
                const siloNome = silosData.find(s => s.silo.id === mov.silo_id)?.silo.nome || 'N/A';
                return (
                  <TableRow key={mov.id}>
                    <TableCell>{formatDate(mov.data)}</TableCell>
                    <TableCell>{siloNome}</TableCell>
                    <TableCell>{mov.tipo}</TableCell>
                    <TableCell>{mov.subtipo || '-'}</TableCell>
                    <TableCell>{mov.quantidade} ton</TableCell>
                    <TableCell>{mov.responsavel || '-'}</TableCell>
                    <TableCell>{mov.observacao || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialogs */}
      <SiloForm 
        open={openNovoSilo} 
        onOpenChange={setOpenNovoSilo}
        mode="create"
        onSuccess={fetchData}
      />
      <MovimentacaoDialog 
        open={openNovaMovimentacao} 
        onOpenChange={setOpenNovaMovimentacao}
        // Sem siloId → dropdown de silos
        onSuccess={fetchData}
      />
    </div>
  );
}
```

**Comportamentos:**
- [ ] Fetch inicial de silos + movimentações **em batch**
- [ ] Cálculos de estoque, consumo, status feitos no `fetchData()`, não no render
- [ ] Grid responsivo (md:2, lg:3 colunas)
- [ ] Cards clicáveis → navegar para `/dashboard/silos/[id]`
- [ ] Dialog "Novo Silo" abre sem silo pré-selecionado (mode="create")
- [ ] Dialog "Registrar Movimentação" abre sem silo pré-selecionado (mostra dropdown)
- [ ] Tabela com últimas 20 movimentações
- [ ] Refetch via `onSuccess={fetchData}` após criar novo silo ou movimentação

**✅ Vantagens do batch loading:**
- Uma única chamada para movimentações de todos os silos
- Cálculos feitos com dados em memória, não em renderização
- Performance melhorada: sem múltiplas async calls no JSX

---

#### **app/dashboard/silos/[id]/page.tsx** — ✨ CRIAR

**O que:** Tela detalhada de um silo com abas

**Estrutura:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { q } from '@/lib/supabase/queries-audit';
import { SiloDetailHeader } from '../components/SiloDetailHeader';
import { VisaoGeralTab } from '../components/tabs/VisaoGeralTab';
import { EstoqueTab } from '../components/tabs/EstoqueTab';
import { QualidadeTab } from '../components/tabs/QualidadeTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface SiloDetailPageProps {
  params: { id: string };
}

export default function SiloDetailPage({ params }: SiloDetailPageProps) {
  const router = useRouter();
  const { id } = params;
  
  const [silo, setSilo] = useState<Silo | null>(null);
  const [talhao, setTalhao] = useState<Talhao | null>(null);
  const [estoque, setEstoque] = useState<{ total: number; percentage: number } | null>(null);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSilo();
  }, [id]);

  async function fetchSilo() {
    try {
      setLoading(true);
      const siloData = await q.silos.getById(id);
      setSilo(siloData);
      
      // Fetch talhão
      const talData = await q.talhoes.getById(siloData.talhao_id);
      setTalhao(talData);
      
      // Calcular estoque
      const estoqueData = await calcularEstoque(id);
      setEstoque(estoqueData);
      
      // Obter status
      const statusData = await obterStatus(id);
      setStatus(statusData);
    } catch (err) {
      toast.error('Erro ao carregar silo');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <Skeleton className="w-full h-96" />;
  }

  if (!silo) {
    return <div>Silo não encontrado</div>;
  }

  return (
    <div className="space-y-6">
      <SiloDetailHeader
        silo={silo}
        status={status}
        onBack={() => router.back()}
        onEdit={() => {/* Abrir dialog de edição */}}
      />

      <Tabs defaultValue="visao-geral">
        <TabsList>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="estoque">Estoque e Movimentações</TabsTrigger>
          <TabsTrigger value="qualidade">Qualidade</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <VisaoGeralTab
            silo={silo}
            talhao={talhao!}
            custo={/* Fetch getCustoProducaoSilagem */}
            densidade={/* Fetch getDensidade */}
            insumoLona={/* Fetch insumo */}
            insumoInoculante={/* Fetch insumo */}
            onEdit={() => {/* Dialog edição */}}
          />
        </TabsContent>

        <TabsContent value="estoque">
          <EstoqueTab
            siloId={id}
            volumeTotal={silo.volume_ensilado_ton_mv!}
            movimentacoes={/* Fetch listBySilo */}
            estoque={estoque!}
            consumoDiario={/* Fetch getConsumoDiario */}
            estoquePara={/* Fetch getEstoqueParaDias */}
            onNovaMovimentacao={() => {/* Abrir dialog */}}
          />
        </TabsContent>

        <TabsContent value="qualidade">
          <QualidadeTab
            siloId={id}
            avaliacoesBromatologicas={/* Fetch listBySilo */}
            avaliacoesPsps={/* Fetch listBySilo */}
            onNovaBromatologica={() => {/* Abrir dialog */}}
            onNovaPsps={() => {/* Abrir dialog */}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Comportamentos:**
- [ ] Fetch silo por ID
- [ ] Fetch talhão associado
- [ ] Abas navegáveis (Visão Geral, Estoque, Qualidade)
- [ ] Botão "Voltar" na header
- [ ] Botão "Editar" abre dialog
- [ ] Diálogos para registrar movimentações e avaliações
- [ ] Refetch após ações (criar, editar, deletar)

---

## 🚨 Pontos Críticos de Atenção

### 1. RLS Policies — Verificação e Criação

**Status atual:** Verificar se as policies abaixo já existem em `silos`
```sql
CREATE POLICY "silos_select_by_fazenda" ON silos FOR SELECT 
  USING (fazenda_id = auth.jwt() ->> 'fazenda_id'::text);
```

**Novas policies a criar:**
```sql
CREATE POLICY "avaliacoes_bromatologicas_select_by_fazenda" ON avaliacoes_bromatologicas 
  FOR SELECT USING (
    silo_id IN (SELECT id FROM silos WHERE fazenda_id = auth.jwt() ->> 'fazenda_id')
  );

CREATE POLICY "avaliacoes_psps_select_by_fazenda" ON avaliacoes_psps 
  FOR SELECT USING (
    silo_id IN (SELECT id FROM silos WHERE fazenda_id = auth.jwt() ->> 'fazenda_id')
  );
```

**Checklist:**
- [ ] Verificar se policy `silos_select_by_fazenda` já existe
- [ ] Se não existir, adicionar na migration
- [ ] Adicionar novas policies para avaliações
- [ ] Testar que usuário de fazenda A não consegue ver silos de fazenda B

---

### 2. INSERT/UPDATE/DELETE Policies (Faltam!)

**Aviso:** Migration SÓ cria SELECT policies. Faltam INSERT/UPDATE/DELETE.

**Adicionar à migration:**
```sql
-- INSERT policies
CREATE POLICY "silos_insert" ON silos FOR INSERT
  WITH CHECK (fazenda_id = auth.jwt() ->> 'fazenda_id'::text);

CREATE POLICY "avaliacoes_bromatologicas_insert" ON avaliacoes_bromatologicas FOR INSERT
  WITH CHECK (
    silo_id IN (SELECT id FROM silos WHERE fazenda_id = auth.jwt() ->> 'fazenda_id')
  );

CREATE POLICY "avaliacoes_psps_insert" ON avaliacoes_psps FOR INSERT
  WITH CHECK (
    silo_id IN (SELECT id FROM silos WHERE fazenda_id = auth.jwt() ->> 'fazenda_id')
  );

-- UPDATE policies
CREATE POLICY "silos_update" ON silos FOR UPDATE
  USING (fazenda_id = auth.jwt() ->> 'fazenda_id'::text);

CREATE POLICY "avaliacoes_bromatologicas_update" ON avaliacoes_bromatologicas FOR UPDATE
  USING (silo_id IN (SELECT id FROM silos WHERE fazenda_id = auth.jwt() ->> 'fazenda_id'));

CREATE POLICY "avaliacoes_psps_update" ON avaliacoes_psps FOR UPDATE
  USING (silo_id IN (SELECT id FROM silos WHERE fazenda_id = auth.jwt() ->> 'fazenda_id'));

-- DELETE policies
CREATE POLICY "silos_delete" ON silos FOR DELETE
  USING (fazenda_id = auth.jwt() ->> 'fazenda_id'::text);

CREATE POLICY "avaliacoes_bromatologicas_delete" ON avaliacoes_bromatologicas FOR DELETE
  USING (silo_id IN (SELECT id FROM silos WHERE fazenda_id = auth.jwt() ->> 'fazenda_id'));

CREATE POLICY "avaliacoes_psps_delete" ON avaliacoes_psps FOR DELETE
  USING (silo_id IN (SELECT id FROM silos WHERE fazenda_id = auth.jwt() ->> 'fazenda_id'));
```

---

### 3. Migration de Dados Existentes — Estratégia Gradual

**Problema:** Tabela `silos` atual tem ~X registros com `tipo` enum antigo e sem `talhao_id`.

**Estratégia de migração gradual:**

1. **Adicionar coluna `talhao_id` como NULLABLE** (não forçar NOT NULL)
   - Silos existentes ficam com `talhao_id = NULL` (legado)
   - Novos silos: `talhao_id` obrigatório
   - ⚠️ Exibir **alerta visual na UI** para silos sem talhão

2. **Migração de `tipo` enum** (Bolsa→Bag, etc)
   - Fazer durante migration script
   - Verificar dados após aplicação

3. **Adicionar constraint NOT NULL depois** (quando todos preenchidos)
   - Após preencher manualmente todos os silos legado
   - Executar em migration futura: `ALTER TABLE silos ALTER COLUMN talhao_id SET NOT NULL;`

**Solução na migration:**
```sql
-- Passo 1: Adicionar talhao_id como NULLABLE
ALTER TABLE silos ADD COLUMN talhao_id UUID REFERENCES talhoes(id) ON DELETE RESTRICT;

-- Passo 2: Migrar tipo enum (sem preencher talhao_id — deixar NULL para legado)
UPDATE silos SET tipo = 
  CASE 
    WHEN tipo = 'Bolsa' THEN 'Bag'
    WHEN tipo = 'Bunker' THEN 'Trincheira'
    WHEN tipo = 'Convencional' THEN 'Outros'
    ELSE tipo
  END;

-- Passo 3: Adicionar coluna cultura_ensilada (desnormalização)
ALTER TABLE silos ADD COLUMN IF NOT EXISTS cultura_ensilada VARCHAR(100);

-- Comentário: Não adicionar NOT NULL em talhao_id ainda. 
-- Silos legado (talhao_id = NULL) precisam ser preenchidos manualmente.
```

**UI/UX para silos legado:**
- Exibir alerta: "⚠️ Este silo não tem talhão de origem. Clique para editar e preencher."
- Na tela detalhada: card vermelho se `talhao_id = NULL`
- Permitir edição do silo para preencher `talhao_id`

**Checklist:**
- [ ] Verificar quantos silos existem e quantos têm `talhao_id`
- [ ] Aplicar migration (deixar como NULLABLE)
- [ ] Validar migração de tipo
- [ ] Adicionar UI para alertar sobre silos sem talhão
- [ ] Marcar TODO: "Após todos preenchidos, executar `ALTER TABLE silos ALTER COLUMN talhao_id SET NOT NULL;`"

---

### 4. Duplicação de Policies

**Antes de criar nova policy**, verificar se já existe com mesmo nome ou lógica:

**Queries para verificar:**
```sql
-- Ver todas as policies na tabela silos
SELECT * FROM pg_policies WHERE tablename = 'silos';

-- Ver todas as policies
SELECT * FROM pg_policies;
```

**Se policy já existe com nome diferente mas lógica igual:**
- Deletar antiga: `DROP POLICY "old_name" ON silos;`
- Criar nova com nome correto

---

### 5. Constraints de FK e ON DELETE

**Verificar em migration:**
```sql
-- talhao_id em silos
ALTER TABLE silos ADD COLUMN talhao_id UUID REFERENCES talhoes(id) ON DELETE RESTRICT;

-- silo_id em avaliacoes (deve cascade)
FOREIGN KEY (silo_id) REFERENCES silos(id) ON DELETE CASCADE;

-- silo_id em movimentacoes_silo
FOREIGN KEY (silo_id) REFERENCES silos(id) ON DELETE CASCADE;
```

**ON DELETE RESTRICT** em `talhao_id` → não permite deletar talhão se houver silo associado (seguro).  
**ON DELETE CASCADE** em avaliações/movimentações → ao deletar silo, deleta associados (intencional).

---

### 6. Cálculos em Tempo Real vs. Persistidos

**Campos NÃO persistidos (calculados em tempo real):**
- `estoque_atual_ton` = Σ Entradas − Σ Saídas
- `consumo_medio_diario_ton` = Σ Saídas(uso) / dias_desde_abertura
- `estoque_para_dias` = estoque_atual / consumo_diário
- `status_silo` = Lógica de datas + estoque
- `ms_atual` = Último registro de `avaliacoes_bromatologicas.ms`

**Estas funções devem estar em `lib/supabase/silos.ts` como helpers**, não em schema do BD.

**Razão:** <50 silos por fazenda = performance negligenciável.

---

### 7. TMP Calculado em Avaliacoes PSPS

**Campo gerado automático em SQL:**
```sql
tmp_mm NUMERIC(5, 2) GENERATED ALWAYS AS (
  (peneira_19mm / 100 * 26.9) +
  (peneira_8_19mm / 100 * 13.5) +
  (peneira_4_8mm / 100 * 6.0) +
  (peneira_fundo_4mm / 100 * 1.18)
) STORED,
```

**Não precisa ser calculado no TS**, o BD faz automaticamente. Apenas select após insert.

---

### 8. Validação de Soma de Peneiras em PSPS

**No Zod schema:**
```typescript
export const avaliacaoPspsSchema = z.object({
  // ...fields...
}).refine(
  (data) => {
    const soma = data.peneira_19mm + data.peneira_8_19mm + data.peneira_4_8mm + data.peneira_fundo_4mm;
    return Math.abs(soma - 100) <= 0.5;
  },
  {
    message: 'Soma das peneiras deve ser 100% (tolerância ±0.5%)',
    path: ['peneira_19mm'],
  }
);
```

**No dialog (UX):**
```typescript
useEffect(() => {
  const soma = peneira_19mm + peneira_8_19mm + peneira_4_8mm + peneira_fundo_4mm;
  setSomaOk(Math.abs(soma - 100) <= 0.5);
}, [peneira_19mm, peneira_8_19mm, peneira_4_8mm, peneira_fundo_4mm]);

// No botão submit:
<Button disabled={!somaOk}>Salvar</Button>
```

---

### 9. Verificação de `q.talhoes.getById()` — PRÉ-IMPLEMENTAÇÃO

**Checklist ANTES de iniciar Fase 1:**
- [ ] Verificar se `q.talhoes.getById()` já existe em `lib/supabase/queries-audit.ts`
- [ ] Se não existir, criar:
  ```typescript
  const talhoes = {
    async list(): Promise<Talhao[]> { /* listar talhões da fazenda */ },
    async getById(id: string): Promise<Talhao> { /* buscar talhão por ID */ },
    // ... outros
  };
  ```
- [ ] Se existir, apenas usar sem modificações
- [ ] Verificar que retorna campos: `id`, `nome`, `cultura`

**Usado por:**
- `SiloForm.tsx` → auto-preencher cultura ao selecionar talhão
- `SiloDetailPage.tsx` → buscar talhão para aba "Visão Geral"

---

## ✅ Checklist de Validação

### Antes de Iniciar Implementação

- [ ] PRD-silos.md lido e entendido
- [ ] Verificar se tabelas `avaliacoes_bromatologicas` e `avaliacoes_psps` já existem no BD
- [ ] Listar todas as RLS policies atuais em Supabase
- [ ] Verificar se migration anterior impactou `silos` table
- [ ] Copiar código de exemplo do PRD para validações Zod

### Após Completar FASE 0

- [ ] Migration executada sem erros
- [ ] Tipos TS compilam sem erros
- [ ] Schemas Zod importam corretamente
- [ ] Verificar que novos campos aparecem em Supabase

### Após Completar FASE 1

- [ ] Todos os helpers compilam
- [ ] Queries executam sem RLS errors
- [ ] `getFazendaId()` retorna ID correto
- [ ] Teste manual: criar silo via query → aparece no BD

### Após Completar FASE 2

- [ ] Dialog "Novo Silo" abre sem erros
- [ ] Auto-preenchimento de cultura funciona
- [ ] Auto-preenchimento de data abertura funciona
- [ ] Densidade calcula corretamente
- [ ] Validações funcionam (zod errors aparecem)
- [ ] Teste: submeter formulário → aparecer em BD

### Após Completar FASE 3

- [ ] SiloCard renderiza sem erros (passa dados mockados)
- [ ] SiloDetailHeader renderiza corretamente
- [ ] Abas renderizam corretamente (tabs component)
- [ ] Teste: clicar card → ativa aba correta

### Após Completar FASE 4

- [ ] Página `/dashboard/silos` carrega e exibe grid
- [ ] Página `/dashboard/silos/[id]` carrega e exibe abas
- [ ] Clique em card → navega para [id] page
- [ ] Botão "Voltar" → volta para listagem
- [ ] Dialogs abrem/fecham corretamente
- [ ] Submit de formulário → refetch listagem

### Smoke Tests (PRD § 8)

- [ ] ✅ Criar novo silo com todas as seções preenchidas
- [ ] ✅ Verificar que "Cultura ensilada" é preenchida automaticamente ao selecionar talhão
- [ ] ✅ Verificar que "Data abertura prevista" é calculada automaticamente
- [ ] ✅ Verificar que "Densidade" é calculada corretamente
- [ ] ✅ Listar silos e verificar cards exibem status correto
- [ ] ✅ Clicar em card e abrir tela detalhada
- [ ] ✅ Verificar aba "Visão Geral" exibe todos os dados
- [ ] ✅ Registrar movimentação e verificar que "Estoque atual" recalcula
- [ ] ✅ Registrar avaliação bromatológica e verificar que "MS atual" atualiza no card
- [ ] ✅ Registrar avaliação PSPS e verificar validação de peneiras (deve bloquear se soma ≠ 100%)
- [ ] ✅ Verificar que barras visuais de PSPS mostram status correto (ok/fora)
- [ ] ✅ Editar dados do silo e verificar que mudanças são persistidas
- [ ] ✅ Deletar silo e verificar que movimentações também são deletadas (cascade)

---

## 📝 Notas Finais

1. **Modularidade:** Cada componente deve ser testável isoladamente (passar props)
2. **RLS:** Sempre validar que dados de fazenda A não vazam para fazenda B
3. **Cálculos:** Implementar em helpers TypeScript, não em queries SQL (é mais legível)
4. **Validação:** Zod schemas são a fonte da verdade para validação
5. **Refactor:** `app/dashboard/silos/page.tsx` atual será reescrito, mas lógica será portada
6. **Silos Legado:** `talhao_id = NULL` é permitido (estratégia gradual). Exibir alerta na UI: "⚠️ Silo sem talhão. Edite para preencher."
7. **Modo Edição:** `SiloForm.tsx` deve suportar `mode: 'create' | 'edit'` para criar E editar silos
8. **Batch Loading:** Sempre carregar movimentações de todos os silos em uma chamada, nunca N+1 calls
9. **Avaliador:** Campo adicionado em `avaliacoes_bromatologicas` e `avaliacoes_psps` para rastreabilidade

---

**Fim da Especificação Técnica**  
Gerado em: 13/04/2026
