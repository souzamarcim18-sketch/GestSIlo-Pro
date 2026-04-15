# SPEC.md — Refatoração do Módulo de Talhões

**Data**: 2026-04-15  
**Status**: Planejamento  
**Baseado em**: `PRD-talhoes.md` + Requisitos Adicionais do Produto

---

## 📋 Sumário Executivo

Este documento detalha a implementação técnica completa do módulo **Talhões** refatorado. O módulo oferecerá gestão integrada de talhões com operações agrícolas, ciclos de cultivo, calendário DAP (Days After Planting), e rastreabilidade de custos.

**Padrão de Referência**: Módulo de Silos (`app/dashboard/silos/`) — usar mesma arquitetura, UI, e padrões.

---

## 🗂️ Lista Completa de Arquivos

### A. TIPOS & VALIDAÇÕES

#### `lib/types/talhoes.ts` (NOVO)
**Responsabilidade**: Tipagens TypeScript para todas as entidades do módulo.

```typescript
// Enums
export enum StatusTalhao {
  POUSO = 'Em pousio',
  PREPARACAO = 'Em preparação',
  PLANTADO = 'Plantado',
  COLHEITA = 'Em colheita',
  COLHIDO = 'Colhido',
}

export enum TipoOperacao {
  // Preparo de Solo
  ARACAO = 'Aração',
  GRADAGEM = 'Gradagem',
  SUBSOLAGEM = 'Subsolagem',
  ESCARIFICACAO = 'Escarificação',
  NIVELAMENTO = 'Nivelamento',
  ROCAGEM = 'Roçagem',
  DESTORROAMENTO = 'Destorroamento',
  // Corretivos
  CALAGEM = 'Calagem',
  GESSAGEM = 'Gessagem',
  // Semeadura
  PLANTIO = 'Plantio',
  // Aplicações
  PULVERIZACAO = 'Pulverização',
  // Colheita
  COLHEITA = 'Colheita',
  // Análise
  ANALISE_SOLO = 'Análise de Solo',
  // Irrigação
  IRRIGACAO = 'Irrigação',
}

export enum CategoriaPulverizacao {
  HERBICIDA = 'Herbicida',
  INSETICIDA = 'Inseticida',
  FUNGICIDA = 'Fungicida',
  FERTILIZANTE_FOLIAR = 'Fertilizante Foliar',
  OUTROS = 'Outros',
}

// Tipos principais
export interface Talhao {
  id: string;
  fazenda_id: string;
  nome: string; // ex: "Talhão A"
  area_ha: number; // hectares
  tipo_solo: string; // ex: "Latossolo", "Argissolo"
  status: StatusTalhao;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface CicloAgricola {
  id: string;
  talhao_id: string;
  cultura: string; // ex: "Milho Grão", "Soja"
  data_plantio: string;
  data_colheita_prevista: string;
  data_colheita_real?: string;
  produtividade_ton_ha?: number;
  custo_total_estimado?: number; // R$ calculado automaticamente
  permite_rebrota: boolean; // Para Sorgo Silagem
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AtividadeCampo {
  id: string;
  ciclo_id: string;
  talhao_id: string;
  tipo_operacao: TipoOperacao;
  data: string;
  maquina_id: string; // FK → frota
  horas_maquina: number;
  observacoes?: string;
  custo_total: number; // R$ — calculado automaticamente
  custo_manual?: number; // R$ — fallback opcional
  
  // Dados específicos por tipo (JSONB ou campos específicos)
  // Preparo de Solo
  tipo_operacao_solo?: string;
  
  // Calagem / Gessagem
  insumo_id?: string; // FK → insumos
  dose_ton_ha?: number;
  
  // Plantio
  semente_id?: string; // FK → insumos
  populacao_plantas_ha?: number;
  sacos_ha?: number;
  espacamento_entre_linhas_cm?: number;
  
  // Pulverização
  categoria_pulverizacao?: CategoriaPulverizacao;
  // insumo_id já está acima
  dose_valor?: number; // L/ha ou kg/ha
  dose_unidade?: 'L/ha' | 'kg/ha'; // dinâmica conforme insumo
  volume_calda_l_ha?: number;
  
  // Colheita
  produtividade_ton_ha?: number;
  maquina_colheita_id?: string; // FK → frota
  horas_colheita?: number;
  maquina_transporte_id?: string; // FK → frota
  horas_transporte?: number;
  maquina_compactacao_id?: string; // FK → frota
  horas_compactacao?: number;
  valor_terceirizacao_r?: number;
  
  // Análise de Solo
  custo_amostra_r?: number;
  metodo_entrada: 'Manual' | 'Upload PDF'; // só Análise
  url_pdf_analise?: string;
  // Campos de análise (só se Manual)
  ph_cacl2?: number;
  mo_g_dm3?: number;
  p_mg_dm3?: number;
  k_mmolc_dm3?: number;
  ca_mmolc_dm3?: number;
  mg_mmolc_dm3?: number;
  al_mmolc_dm3?: number;
  h_al_mmolc_dm3?: number;
  s_mg_dm3?: number;
  b_mg_dm3?: number;
  cu_mg_dm3?: number;
  fe_mg_dm3?: number;
  mn_mg_dm3?: number;
  zn_mg_dm3?: number;
  // Calculados automaticamente
  sb_mmolc_dm3?: number; // Ca + Mg + K
  ctc_mmolc_dm3?: number; // SB + H+Al
  v_percent?: number; // (SB/CTC) × 100
  
  // Irrigação
  lamina_mm?: number;
  horas_irrigacao?: number;
  custo_por_hora_r?: number;

  created_at: string;
  updated_at: string;
}

export interface EventoDAP {
  id: string;
  ciclo_id: string;
  talhao_id: string;
  cultura: string;
  tipo_operacao: TipoOperacao;
  dias_apos_plantio: number; // DAP
  dias_apos_plantio_final?: number; // range: DAP a DAP_final
  data_esperada?: string; // calculada automaticamente
  data_realizada?: string; // quando atividade é registrada
  status: 'Planejado' | 'Realizado' | 'Atrasado';
  atividade_campo_id?: string; // FK → atividades_campo (quando realizado)
  created_at: string;
  updated_at: string;
}

export interface AnaliseSolo {
  id: string;
  atividade_id: string;
  // Campos de análise...
  // (mesmos campos acima)
  created_at: string;
}

export interface ProximaOperacao {
  id: string;
  data_esperada: string;
  data_realizada?: string;
  tipo_operacao: string;
  status: 'Planejado' | 'Realizado' | 'Atrasado';
  cultura: string;
  talhao_nome: string;
}
```

#### `lib/validations/talhoes.ts` (NOVO)
**Responsabilidade**: Schemas Zod para validação de inputs do usuário.

```typescript
import { z } from 'zod';
import { StatusTalhao, TipoOperacao, CategoriaPulverizacao } from '@/lib/types/talhoes';

// ========== CONSTANTES ==========
export const CULTURAS_SUPORTADAS = [
  'Milho Grão',
  'Milho Silagem',
  'Soja',
  'Feijão',
  'Sorgo Grão',
  'Sorgo Silagem',
  'Trigo',
  'Trigo Silagem',
] as const;

export const TIPOS_SOLO = [
  'Latossolo',
  'Argissolo',
  'Neossolo',
  'Cambissolo',
  'Gleissolo',
  'Nitossolo',
  'Chernossolos',
  'Outro',
] as const;

// ========== SCHEMAS ==========

/**
 * Novo Talhão — Cadastro inicial
 * Campos: Identificação, Área (ha), Tipo de Solo
 * Status inicial: "Em pousio"
 */
export const talhoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100),
  area_ha: z.number()
    .positive('Área deve ser maior que 0')
    .max(10000, 'Área deve ser menor que 10.000 ha'),
  tipo_solo: z.enum(TIPOS_SOLO),
  observacoes: z.string().max(500).nullable().optional(),
});

export type TalhaoInput = z.infer<typeof talhoSchema>;

/**
 * Novo Ciclo Agrícola
 */
export const cicloAgricolaSchema = z.object({
  talhao_id: z.string().uuid('ID do talhão inválido'),
  cultura: z.enum(CULTURAS_SUPORTADAS),
  data_plantio: z.string().date('Data de plantio inválida'),
  data_colheita_prevista: z.string().date('Data de colheita prevista inválida'),
}).refine(
  (data) => new Date(data.data_plantio) < new Date(data.data_colheita_prevista),
  {
    message: 'Data de colheita deve ser após data de plantio',
    path: ['data_colheita_prevista'],
  }
);

export type CicloAgricolaInput = z.infer<typeof cicloAgricolaSchema>;

/**
 * Registro de Atividade de Campo
 * Campos comuns OBRIGATÓRIOS:
 * - tipo_operacao, data, observacoes
 * Máquina/Trator: OBRIGATÓRIA para Preparo/Calagem/Gessagem/Plantio/Pulverização/Colheita
 *                 OPCIONAL para Análise de Solo e Irrigação
 * Campos específicos por tipo
 */
export const atividadeCampoSchema = z
  .object({
    ciclo_id: z.string().uuid('ID do ciclo inválido'),
    talhao_id: z.string().uuid('ID do talhão inválido'),
    tipo_operacao: z.nativeEnum(TipoOperacao),
    data: z.string().date('Data inválida'),
    maquina_id: z.string().uuid('ID da máquina inválido').nullable().optional(),
    horas_maquina: z.number()
      .positive('Horas deve ser maior que 0')
      .max(24, 'Horas não pode exceder 24')
      .nullable()
      .optional(),
    observacoes: z.string().max(500).nullable().optional(),
    custo_manual: z.number().positive().nullable().optional(),

    // Preparo de Solo
    tipo_operacao_solo: z.enum([
      'Aração', 'Gradagem', 'Subsolagem', 'Escarificação',
      'Nivelamento', 'Roçagem', 'Destorroamento'
    ]).nullable().optional(),

    // Calagem / Gessagem
    insumo_id: z.string().uuid('ID do insumo inválido').nullable().optional(),
    dose_ton_ha: z.number().positive().nullable().optional(),

    // Plantio
    semente_id: z.string().uuid('ID da semente inválido').nullable().optional(),
    populacao_plantas_ha: z.number().positive().nullable().optional(),
    sacos_ha: z.number().positive().nullable().optional(),
    espacamento_entre_linhas_cm: z.number().positive().nullable().optional(),

    // Pulverização
    categoria_pulverizacao: z.nativeEnum(CategoriaPulverizacao).nullable().optional(),
    dose_valor: z.number().positive().nullable().optional(),
    dose_unidade: z.enum(['L/ha', 'kg/ha']).nullable().optional(),
    volume_calda_l_ha: z.number().positive().nullable().optional(),

    // Colheita
    produtividade_ton_ha: z.number().positive().nullable().optional(),
    maquina_colheita_id: z.string().uuid().nullable().optional(),
    horas_colheita: z.number().positive().nullable().optional(),
    maquina_transporte_id: z.string().uuid().nullable().optional(),
    horas_transporte: z.number().positive().nullable().optional(),
    maquina_compactacao_id: z.string().uuid().nullable().optional(),
    horas_compactacao: z.number().positive().nullable().optional(),
    valor_terceirizacao_r: z.number().positive().nullable().optional(),

    // Análise de Solo
    custo_amostra_r: z.number().positive().nullable().optional(),
    metodo_entrada: z.enum(['Manual', 'Upload PDF']).nullable().optional(),
    url_pdf_analise: z.string().url().nullable().optional(),
    ph_cacl2: z.number().min(0).max(14).nullable().optional(),
    mo_g_dm3: z.number().positive().nullable().optional(),
    p_mg_dm3: z.number().positive().nullable().optional(),
    k_mmolc_dm3: z.number().positive().nullable().optional(),
    ca_mmolc_dm3: z.number().positive().nullable().optional(),
    mg_mmolc_dm3: z.number().positive().nullable().optional(),
    al_mmolc_dm3: z.number().positive().nullable().optional(),
    h_al_mmolc_dm3: z.number().positive().nullable().optional(),
    s_mg_dm3: z.number().positive().nullable().optional(),
    b_mg_dm3: z.number().positive().nullable().optional(),
    cu_mg_dm3: z.number().positive().nullable().optional(),
    fe_mg_dm3: z.number().positive().nullable().optional(),
    mn_mg_dm3: z.number().positive().nullable().optional(),
    zn_mg_dm3: z.number().positive().nullable().optional(),

    // Irrigação
    lamina_mm: z.number().positive().nullable().optional(),
    horas_irrigacao: z.number().positive().nullable().optional(),
    custo_por_hora_r: z.number().positive().nullable().optional(),
  })
  .refine(
    (data) => {
      // Máquina obrigatória para certos tipos
      const tiposComMaquinaObrigatoria = [
        'Aração', 'Gradagem', 'Subsolagem', 'Escarificação',
        'Nivelamento', 'Roçagem', 'Destorroamento', // Preparo
        'Calagem', 'Gessagem',
        'Plantio',
        'Pulverização',
        'Colheita'
      ];
      if (tiposComMaquinaObrigatoria.includes(data.tipo_operacao)) {
        return data.maquina_id !== null && data.maquina_id !== undefined;
      }
      // Análise de Solo e Irrigação: máquina opcional
      return true;
    },
    { message: 'Máquina/Trator é obrigatória para este tipo de operação', path: ['maquina_id'] }
  )
  .refine(
    (data) => {
      // Horas também obrigatória se máquina fornecida
      if (data.maquina_id) {
        return data.horas_maquina !== null && data.horas_maquina !== undefined && data.horas_maquina > 0;
      }
      return true;
    },
    { message: 'Horas de máquina é obrigatória quando máquina é fornecida', path: ['horas_maquina'] }
  );

export type AtividadeCampoInput = z.infer<typeof atividadeCampoSchema>;

/**
 * Análise de Solo — subform dentro de AtividadeCampo
 */
export const analiseSoloSchema = z.object({
  custo_amostra_r: z.number().positive('Custo deve ser maior que 0'),
  metodo_entrada: z.enum(['Manual', 'Upload PDF']),
  // Condicional: se Manual, campos de análise
  // se Upload, URL do PDF
}).refine(
  (data) => {
    if (data.metodo_entrada === 'Manual') {
      // TODO: Validar que tem pelo menos um campo de análise
      return true;
    }
    return true;
  },
  { message: 'Dados inválidos para a análise de solo' }
);

export type AnaliseSoloInput = z.infer<typeof analiseSoloSchema>;
```

---

### B. QUERIES & SUPABASE

#### `lib/supabase/talhoes.ts` (NOVO)
**Responsabilidade**: Funções isoladas para queries/mutations de Talhões (sem o padrão audit por enquanto).

**Imports principais**:
```typescript
import { supabase, type Talhao, type CicloAgricola, type AtividadeCampo, type EventoDAP } from '../supabase';
import { type TalhaoInput, type CicloAgricolaInput, type AtividadeCampoInput } from '../validations/talhoes';
```

**Funções esperadas**:
- `getTalhaoById(id: string): Promise<Talhao>`
- `listTalhoes(): Promise<Talhao[]>` — todos do usuário/fazenda
- `createTalhao(input: TalhaoInput): Promise<Talhao>`
- `updateTalhao(id: string, input: Partial<TalhaoInput>): Promise<Talhao>`
- `deleteTalhao(id: string): Promise<void>`
- `getCicloAtivo(talhaoId: string): Promise<CicloAgricola | null>`
- `createCiclo(input: CicloAgricolaInput): Promise<CicloAgricola>`
- `closeCiclo(cicloId: string, data_colheita_real: string, produtividade: number): Promise<CicloAgricola>`
- `listAtividadesByCiclo(cicloId: string): Promise<AtividadeCampo[]>`
- `createAtividade(input: AtividadeCampoInput): Promise<AtividadeCampo>`
- `listEventosDAP(cicloId: string): Promise<EventoDAP[]>`
- `generateEventosDAP(cicloId: string, cultura: string, dataplantio: string): Promise<void>`
- `calcularCustoTotalCiclo(cicloId: string): Promise<number>`
- `getProximasOperacoes(fazendaId: string): Promise<ProximaOperacao[]>` — Busca eventos DAP para card "Próximas Operações" no dashboard (range: 2 dias atrás até 5 dias futuros)

**Implementação de `getProximasOperacoes`**:
```typescript
/**
 * Busca eventos DAP + atividades para o card "Próximas Operações" do dashboard.
 * Range: 2 dias atrás até 5 dias futuros.
 */
export async function getProximasOperacoes(fazendaId: string): Promise<ProximaOperacao[]> {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - 2);
  const fim = new Date(hoje);
  fim.setDate(hoje.getDate() + 5);

  const inicioStr = inicio.toISOString().split('T')[0];
  const fimStr = fim.toISOString().split('T')[0];

  const { data } = await supabase
    .from('eventos_dap')
    .select(`
      id,
      data_esperada,
      data_realizada,
      tipo_operacao,
      status,
      cultura,
      talhoes!inner(id, nome, fazenda_id)
    `)
    .eq('talhoes.fazenda_id', fazendaId)
    .gte('data_esperada', inicioStr)
    .lte('data_esperada', fimStr)
    .order('data_esperada', { ascending: true });

  return (data ?? []).map((evento: any) => ({
    id: evento.id,
    data_esperada: evento.data_esperada,
    data_realizada: evento.data_realizada,
    tipo_operacao: evento.tipo_operacao,
    status: evento.status,
    cultura: evento.cultura,
    talhao_nome: evento.talhoes.nome,
  }));
}
```

#### `lib/supabase/queries-audit.ts` (MODIFICADO)
**Responsabilidade**: Adicionar padrão de queries para Talhões dentro do objeto `q`.

```typescript
// Dentro de q, adicionar:
q.talhoes = {
  list: () => /* ... */,
  getById: (id) => /* ... */,
  getCicloAtivo: (talhaoId) => /* ... */,
  // ... etc
};

q.ciclosAgricolas = {
  create: (input) => /* ... */,
  getById: (id) => /* ... */,
  close: (id, data_colheita, produtividade) => /* ... */,
};

q.atividadesCampo = {
  create: (input) => /* ... */,
  listByCiclo: (cicloId) => /* ... */,
  getById: (id) => /* ... */,
};

q.eventosDAP = {
  listByCiclo: (cicloId) => /* ... */,
  generate: (cicloId, cultura, dataplantio) => /* ... */,
};
```

---

### C. PÁGINAS & ROTAS

#### `app/dashboard/talhoes/page.tsx` (MODIFICADO → REFATORADO)
**Responsabilidade**: Página principal de Talhões com grid de cards.

**Estrutura**:
- Header com título e botão "+ Novo Talhão"
- Grid de cards (clicáveis, navegam para `/dashboard/talhoes/[id]`)
- **REMOVER**: Botões "Registrar Atividade" e "Novo Ciclo Agrícola"
- Card "Custo por Período" (compacto ou removido)
- Empty state se nenhum talhão

**Imports principais**:
```typescript
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { q } from '@/lib/supabase/queries-audit';
import { TalhaoCard } from './components/TalhaoCard';
import { TalhaoForm } from './components/dialogs/TalhaoForm';
```

**Estado**:
- `talhoes: Talhao[]`
- `ciclosAtivos: Record<string, CicloAgricola>`
- `isAddOpen: boolean`

#### `app/dashboard/talhoes/[id]/page.tsx` (NOVO)
**Responsabilidade**: Página de detalhe com 3 abas.

**Estrutura**:
```
Header (nome do talhão, voltar, deletar)
  ↓
Tabs:
  1. "Resumo e Custos" → TalhaoResumoTab
  2. "Operações Agrícolas" → TalhaoOperacoesTab
  3. "Histórico e Calendário" → TalhaoHistoricoTab
```

**Imports principais**:
```typescript
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TalhaoResumoTab } from '../components/tabs/TalhaoResumoTab';
import { TalhaoOperacoesTab } from '../components/tabs/TalhaoOperacoesTab';
import { TalhaoHistoricoTab } from '../components/tabs/TalhaoHistoricoTab';
```

**State management**:
- `talhao: Talhao`
- `cicloAtivo: CicloAgricola | null`
- `atividades: AtividadeCampo[]`
- `eventosDAP: EventoDAP[]`
- Dialogs: `isEditOpen`, `isDeleteOpen`, `isAddCicloOpen`

#### `app/dashboard/calendario/page.tsx` (NOVO)
**Responsabilidade**: Página de calendário integrado com eventos DAP + atividades.

**Estrutura**:
- Tabs: "Mensal", "Semanal", "Lista"
- Calendário com eventos (use `react-big-calendar` ou `react-calendar` + customização)
- Filtros: Talhão, Cultura, Status (Planejado/Realizado/Atrasado)
- Legenda de cores: 🔵 Planejado | 🟢 Realizado | 🔴 Atrasado

**Imports principais**:
```typescript
import { Calendar, List, Week } from 'lucide-react';
import BigCalendar from 'react-big-calendar';
```

---

### D. COMPONENTES

#### `app/dashboard/talhoes/components/TalhaoCard.tsx` (NOVO)
**Responsabilidade**: Card individual de Talhão (similar a `SiloCard`).

**Props**:
```typescript
interface TalhaoCardProps {
  talhao: Talhao;
  cicloAtivo?: CicloAgricola;
  onClick?: () => void;
}
```

**Display**:
- Nome do talhão
- Área (ha)
- Status
- Cultura ativa (se houver)
- Custo total estimado (se houver)

#### `app/dashboard/talhoes/components/dialogs/TalhaoForm.tsx` (NOVO)
**Responsabilidade**: Dialog para criar/editar Talhão.

**Modo**: `create | edit`

**Campos**:
- Nome (obrigatório)
- Área em ha (obrigatório)
- Tipo de Solo (select com constantes)
- Observações (opcional)

**Validação**: Zod com `talhoSchema`

**Imports principais**:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { talhoSchema, type TalhaoInput } from '@/lib/validations/talhoes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
```

#### `app/dashboard/talhoes/components/dialogs/CicloForm.tsx` (NOVO)
**Responsabilidade**: Dialog para criar novo Ciclo Agrícola.

**Campos**:
- Cultura (select: Milho Grão, Soja, etc.)
- Data de Plantio (date picker)
- Data de Colheita Prevista (date picker)

#### `app/dashboard/talhoes/components/dialogs/AtividadeDialog.tsx` (NOVO)
**Responsabilidade**: Dialog para registrar atividade com campos dinâmicos por tipo.

**Estrutura**:
1. Select de Tipo de Operação (obrigatório)
2. Bloco de campos comuns (data, máquina, horas)
3. **Bloco condicional**: campos específicos por tipo renderizados dinamicamente
4. Cálculo automático de custo_total (ou campo opcional para manual)

**Tipos e seus sub-componentes**:
- **Preparo de Solo** → `PreparoSoloFields`
- **Calagem** → `CalagensFields`
- **Gessagem** → `GessagemFields`
- **Plantio** → `PlantioFields`
- **Pulverização** → `PulverizacaoFields`
- **Colheita** → `ColheitaFields`
- **Análise de Solo** → `AnaliseSoloFields`
- **Irrigação** → `IrrigacaoFields`

#### `app/dashboard/talhoes/components/tabs/TalhaoResumoTab.tsx` (NOVO)
**Responsabilidade**: Aba 1 — Resumo e Custos.

**Content**:
- Card: Dados do talhão (nome, área, solo, status)
- Card: Ciclo agrícola ativo (cultura, data plantio, previsão colheita)
- Card: Custo Total Estimado + Custo por Hectare
- Botões: Editar, Deletar, Novo Ciclo

#### `app/dashboard/talhoes/components/tabs/TalhaoOperacoesTab.tsx` (NOVO)
**Responsabilidade**: Aba 2 — Operações Agrícolas.

**Content**:
- Botão "Registrar Atividade" → abre `AtividadeDialog`
- Tabela/lista de atividades com:
  - Data, Tipo, Máquina, Horas, Custo
  - Paginação (20 por página)
  - Filtros: Tipo de Operação, Data range
  - Ações: Editar, Deletar
- **Guard**: Aviso se não há ciclo ativo

#### `app/dashboard/talhoes/components/tabs/TalhaoHistoricoTab.tsx` (NOVO)
**Responsabilidade**: Aba 3 — Histórico e Calendário.

**Content**:
- Timeline de ciclos passados (com produtividade)
- Calendário DAP visual (ou tabela com DAP + data esperada + realizada)
- Gráfico de produtividade por ciclo (Recharts — BarChart)

#### `app/dashboard/talhoes/components/TalhaoDetailHeader.tsx` (NOVO)
**Responsabilidade**: Header da página de detalhe (nome, ícone status, botões).

**Props**:
```typescript
interface TalhaoDetailHeaderProps {
  talhao: Talhao;
  cicloAtivo?: CicloAgricola;
  onBack?: () => void;
  onEdit?: () => void;
}
```

#### `app/dashboard/talhoes/helpers.ts` (NOVO)
**Responsabilidade**: Funções utilitárias para cálculos e transformações.

**Funções esperadas**:
```typescript
export function calcularCustoTotalEstimado(atividades: AtividadeCampo[]): number
export function calcularCustoPorHectare(custoTotal: number, areaHa: number): number
export function getStatusDisplay(status: StatusTalhao): { label: string; color: string }
export function gerarEventosDAP(cultura: string, dataplantio: string): EventoDAP[]
export function calcularDiasAposPlantio(dataplantio: string, dataAtual: string): number
export function verificarAlertaSilagem(ciclo: CicloAgricola): { ativo: boolean; diasRestantes: number } | null
```

**Implementação de `verificarAlertaSilagem`**:
```typescript
/**
 * Verifica se há alerta de janela de colheita para silagem.
 * Retorna null se não for silagem ou se ciclo já foi colhido.
 * Retorna { ativo: true, diasRestantes: N } se faltam ≤7 dias.
 */
export function verificarAlertaSilagem(
  ciclo: CicloAgricola
): { ativo: boolean; diasRestantes: number } | null {
  const culturasSilagem = ['Milho Silagem', 'Sorgo Silagem', 'Trigo Silagem'];
  
  if (!culturasSilagem.includes(ciclo.cultura)) return null;
  if (!ciclo.data_colheita_prevista || ciclo.data_colheita_real) return null;
  
  const hoje = new Date();
  const colheita = new Date(ciclo.data_colheita_prevista);
  const diffMs = colheita.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return {
    ativo: diffDias <= 7 && diffDias >= 0,
    diasRestantes: Math.max(0, diffDias),
  };
}
```

**Matriz DAP** (hardcoded ou config):
```typescript
const MATRIZ_DAP: Record<string, DAP[]> = {
  'Milho Grão': [
    { tipo: 'Dessecação', dap: '0' },
    { tipo: 'Plantio', dap: '0-5' },
    { tipo: 'Herbicida pós-emergente', dap: '10-20' },
    { tipo: 'Adubação cobertura', dap: '30-40' },
    { tipo: 'Inseticida', dap: '35-45' },
    { tipo: 'Fungicida', dap: '50-60' },
    { tipo: 'Colheita', dap: '120-150' },
  ],
  'Sorgo Silagem': [
    { tipo: 'Plantio', dap: '0-5' },
    { tipo: 'Adubação cobertura', dap: '30-40' },
    { tipo: 'Inseticida', dap: '35-45' },
    { tipo: 'Fungicida', dap: '45-55' },
    { tipo: 'Colheita', dap: '90-110' },
    // REBROTA (se permite_rebrota = true):
    { tipo: 'Adubação cobertura (rebrota)', dap: '95-105', rebrota: true }, // 5-10 dias após 1ª colheita
    { tipo: 'Colheita rebrota', dap: '155-165', rebrota: true }, // 55-65 dias após 1ª colheita
  ],
  'Soja': [ /* ... */ ],
  // ... outras culturas
};
```

**Nota sobre Sorgo Silagem com Rebrota**:
- Eventos DAP base são gerados sempre ao registrar Plantio
- Se ao registrar Colheita (1ª colheita) o usuário confirmar rebrota:
  - `permite_rebrota = true` é setado no ciclo
  - Novos eventos DAP são gerados com base `data_colheita_real + offset`
  - Exemplo: se colheita real em 15 de janeiro, rebrota DAP 95-105 seria ~20-30 de janeiro

#### `app/dashboard/talhoes/components/index.ts` (NOVO)
**Responsabilidade**: Exportações centralizadas de componentes.

---

### E. LAYOUT & NAVEGAÇÃO

#### `components/Sidebar.tsx` (MODIFICADO)
**Mudança**: Adicionar "Calendário" ao grupo Operacional.

```typescript
const operacionalRoutes = [
  { label: 'Dashboard',   icon: LayoutDashboard, href: '/dashboard'                },
  { label: 'Silos',       icon: Database,        href: '/dashboard/silos'           },
  { label: 'Talhões',     icon: Map,             href: '/dashboard/talhoes'         },
  { label: 'Calendário',  icon: Calendar,        href: '/dashboard/calendario'      }, // NOVO
  { label: 'Rebanho',     icon: Sprout,          href: '/dashboard/rebanho'         },
  // ...
];
```

**Import adicional**: `import { Calendar } from 'lucide-react';`

#### `app/dashboard/page.tsx` (MODIFICADO)
**Mudança**: Adicionar novo card "Próximas Operações".

**Card**:
- Título: "Próximas Operações"
- Período: 2 dias atrás + hoje + 5 dias futuros
- Conteúdo: Lista com `data | tipo_operacao | talhao | cultura | status`
- Cores: 🔵 Planejado | 🟢 Realizado | 🔴 Atrasado

---

## 🗄️ Alterações no Banco de Dados (PostgreSQL/Supabase)

### Novas Tabelas

#### `talhoes`
```sql
CREATE TABLE talhoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  area_ha DECIMAL(10,2) NOT NULL,
  tipo_solo VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Em pousio',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT area_positive CHECK (area_ha > 0)
);

CREATE INDEX idx_talhoes_fazenda_id ON talhoes(fazenda_id);
ALTER TABLE talhoes ENABLE ROW LEVEL SECURITY;
```

#### `ciclos_agricolas`
```sql
CREATE TABLE ciclos_agricolas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talhao_id UUID NOT NULL REFERENCES talhoes(id) ON DELETE CASCADE,
  cultura VARCHAR(100) NOT NULL,
  data_plantio DATE NOT NULL,
  data_colheita_prevista DATE NOT NULL,
  data_colheita_real DATE,
  produtividade_ton_ha DECIMAL(10,2),
  custo_total_estimado DECIMAL(15,2),
  permite_rebrota BOOLEAN DEFAULT false, -- Para Sorgo Silagem: controla geração de eventos DAP de rebrota
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT colheita_after_plantio CHECK (data_colheita_prevista > data_plantio),
  CONSTRAINT produtividade_positive CHECK (produtividade_ton_ha IS NULL OR produtividade_ton_ha > 0)
);

CREATE INDEX idx_ciclos_agricolas_talhao_id ON ciclos_agricolas(talhao_id);
CREATE INDEX idx_ciclos_agricolas_ativo ON ciclos_agricolas(ativo);
ALTER TABLE ciclos_agricolas ENABLE ROW LEVEL SECURITY;
```

#### `atividades_campo`
```sql
CREATE TABLE atividades_campo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id UUID NOT NULL REFERENCES ciclos_agricolas(id) ON DELETE CASCADE,
  talhao_id UUID NOT NULL REFERENCES talhoes(id) ON DELETE CASCADE,
  tipo_operacao VARCHAR(50) NOT NULL,
  data DATE NOT NULL,
  maquina_id UUID REFERENCES maquinas(id),
  horas_maquina DECIMAL(10,2),
  observacoes TEXT,
  custo_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  custo_manual DECIMAL(15,2),
  
  -- Campos por tipo (JSONB para flexibilidade ou columns específicas)
  tipo_operacao_solo VARCHAR(50),
  insumo_id UUID REFERENCES insumos(id),
  dose_ton_ha DECIMAL(10,2),
  
  semente_id UUID REFERENCES insumos(id),
  populacao_plantas_ha DECIMAL(10,2),
  sacos_ha DECIMAL(10,2),
  espacamento_entre_linhas_cm DECIMAL(10,2),
  
  categoria_pulverizacao VARCHAR(50),
  dose_valor DECIMAL(10,2),
  dose_unidade VARCHAR(20), -- 'L/ha' ou 'kg/ha'
  volume_calda_l_ha DECIMAL(10,2),
  
  produtividade_ton_ha DECIMAL(10,2),
  maquina_colheita_id UUID REFERENCES maquinas(id),
  horas_colheita DECIMAL(10,2),
  maquina_transporte_id UUID REFERENCES maquinas(id),
  horas_transporte DECIMAL(10,2),
  maquina_compactacao_id UUID REFERENCES maquinas(id),
  horas_compactacao DECIMAL(10,2),
  valor_terceirizacao_r DECIMAL(15,2),
  
  custo_amostra_r DECIMAL(15,2),
  metodo_entrada VARCHAR(20),
  url_pdf_analise VARCHAR(255),
  ph_cacl2 DECIMAL(5,2),
  mo_g_dm3 DECIMAL(10,2),
  p_mg_dm3 DECIMAL(10,2),
  k_mmolc_dm3 DECIMAL(10,2),
  ca_mmolc_dm3 DECIMAL(10,2),
  mg_mmolc_dm3 DECIMAL(10,2),
  al_mmolc_dm3 DECIMAL(10,2),
  h_al_mmolc_dm3 DECIMAL(10,2),
  s_mg_dm3 DECIMAL(10,2),
  b_mg_dm3 DECIMAL(10,2),
  cu_mg_dm3 DECIMAL(10,2),
  fe_mg_dm3 DECIMAL(10,2),
  mn_mg_dm3 DECIMAL(10,2),
  zn_mg_dm3 DECIMAL(10,2),
  sb_mmolc_dm3 DECIMAL(10,2), -- Calculado: Ca + Mg + K
  ctc_mmolc_dm3 DECIMAL(10,2), -- Calculado: SB + H+Al
  v_percent DECIMAL(10,2), -- Calculado: (SB/CTC) × 100
  
  lamina_mm DECIMAL(10,2),
  horas_irrigacao DECIMAL(10,2),
  custo_por_hora_r DECIMAL(15,2),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT horas_maquina_positive CHECK (horas_maquina IS NULL OR horas_maquina > 0)
);

CREATE INDEX idx_atividades_campo_ciclo_id ON atividades_campo(ciclo_id);
CREATE INDEX idx_atividades_campo_talhao_id ON atividades_campo(talhao_id);
CREATE INDEX idx_atividades_campo_data ON atividades_campo(data);
ALTER TABLE atividades_campo ENABLE ROW LEVEL SECURITY;
```

#### `eventos_dap`
```sql
CREATE TABLE eventos_dap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id UUID NOT NULL REFERENCES ciclos_agricolas(id) ON DELETE CASCADE,
  talhao_id UUID NOT NULL REFERENCES talhoes(id) ON DELETE CASCADE,
  cultura VARCHAR(100) NOT NULL,
  tipo_operacao VARCHAR(50) NOT NULL,
  dias_apos_plantio INT NOT NULL,
  dias_apos_plantio_final INT,
  data_esperada DATE,
  data_realizada DATE,
  status VARCHAR(20) DEFAULT 'Planejado', -- 'Planejado', 'Realizado', 'Atrasado'
  atividade_campo_id UUID REFERENCES atividades_campo(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_eventos_dap_ciclo_id ON eventos_dap(ciclo_id);
CREATE INDEX idx_eventos_dap_status ON eventos_dap(status);
ALTER TABLE eventos_dap ENABLE ROW LEVEL SECURITY;
```

### Triggers (automatizar cálculos)

#### Trigger: Calcular Análise de Solo (SB, CTC, V%)
```sql
CREATE OR REPLACE FUNCTION calcular_analise_solo()
RETURNS TRIGGER AS $$
BEGIN
  -- Só executa se for atividade de Análise de Solo com dados manuais
  IF NEW.tipo_operacao = 'Análise de Solo' AND NEW.metodo_entrada = 'Manual' THEN
    -- 1. SB = Ca + Mg + K
    NEW.sb_mmolc_dm3 := COALESCE(NEW.ca_mmolc_dm3, 0) + 
                        COALESCE(NEW.mg_mmolc_dm3, 0) + 
                        COALESCE(NEW.k_mmolc_dm3, 0);
    
    -- 2. CTC = SB + H+Al
    NEW.ctc_mmolc_dm3 := NEW.sb_mmolc_dm3 + COALESCE(NEW.h_al_mmolc_dm3, 0);
    
    -- 3. V% = (SB / CTC) × 100
    IF NEW.ctc_mmolc_dm3 > 0 THEN
      NEW.v_percent := (NEW.sb_mmolc_dm3 / NEW.ctc_mmolc_dm3) * 100;
    ELSE
      NEW.v_percent := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calcular_analise_solo 
  BEFORE INSERT OR UPDATE ON atividades_campo
  FOR EACH ROW EXECUTE FUNCTION calcular_analise_solo();
```

#### Trigger: Atualizar `status` de `eventos_dap` para 'Atrasado'
```sql
-- Disparar diariamente (via cron ou app)
UPDATE eventos_dap
SET status = 'Atrasado'
WHERE status = 'Planejado'
  AND data_esperada < CURRENT_DATE;
```

### RLS Policies

Para todas as novas tabelas, aplicar políticas RLS:

```sql
-- Política para talhoes: usuário só vê talhões da sua fazenda
CREATE POLICY "Talhoes isolado por fazenda" ON talhoes
  USING (fazenda_id IN (SELECT id FROM fazendas WHERE user_id = auth.uid()));

-- Similar para ciclos_agricolas, atividades_campo, eventos_dap
-- (relacionados via talhao_id → fazenda_id)
```

---

## 📦 Ordem de Implementação (com Dependências)

### Fase 1: Tipos & Validações (sem dependências)
1. ✅ `lib/types/talhoes.ts`
2. ✅ `lib/validations/talhoes.ts`

### Fase 2: Banco de Dados
3. ✅ Criar tabelas: `talhoes`, `ciclos_agricolas`
4. ✅ Criar triggers de cálculo (SB, CTC, V%)
5. ✅ Ativar RLS nas tabelas

### Fase 3: Queries (depende de Fase 2)
6. ✅ `lib/supabase/talhoes.ts`
7. ✅ `lib/supabase/queries-audit.ts` (adicionar `q.talhoes`, `q.ciclos_agricolas`, etc.)

### Fase 4: Página Principal (depende de Fase 3)
8. ✅ `app/dashboard/talhoes/page.tsx` (refatorar)
9. ✅ `app/dashboard/talhoes/components/TalhaoCard.tsx`
10. ✅ `app/dashboard/talhoes/components/dialogs/TalhaoForm.tsx`
11. ✅ `app/dashboard/talhoes/helpers.ts`
12. ✅ `app/dashboard/talhoes/components/index.ts`

### Fase 5: Página de Detalhe (depende de Fase 3, 4)
13. ✅ Criar tabela `atividades_campo` + triggers
14. ✅ `app/dashboard/talhoes/[id]/page.tsx`
15. ✅ `app/dashboard/talhoes/components/TalhaoDetailHeader.tsx`
16. ✅ `app/dashboard/talhoes/components/tabs/TalhaoResumoTab.tsx`
17. ✅ `app/dashboard/talhoes/components/dialogs/CicloForm.tsx`
18. ✅ `app/dashboard/talhoes/components/tabs/TalhaoOperacoesTab.tsx`
19. ✅ `app/dashboard/talhoes/components/dialogs/AtividadeDialog.tsx`
20. ✅ Sub-componentes de Atividade: `PreparoSoloFields`, `CalagensFields`, etc.
21. ✅ `app/dashboard/talhoes/components/tabs/TalhaoHistoricoTab.tsx`

### Fase 6: Calendário DAP (depende de Fase 3, 5)
22. ✅ Criar tabela `eventos_dap`
23. ✅ Função para gerar DAP: `generateEventosDAP()` em `lib/supabase/talhoes.ts`
24. ✅ `app/dashboard/talhoes/helpers.ts` — adicionar `gerarEventosDAP()` com MATRIZ_DAP

### Fase 7: Página Calendário (depende de Fase 6)
25. ✅ `app/dashboard/calendario/page.tsx`
26. ✅ Componentes de calendário reutilizáveis

### Fase 8: Dashboard & Navegação (depende de Fase 7)
27. ✅ `components/Sidebar.tsx` (adicionar Calendário)
28. ✅ `app/dashboard/page.tsx` (adicionar card "Próximas Operações")

---

## ✅ Critérios de Aceite

### Talhão Principal (`/dashboard/talhoes`)
- [ ] Cards são clicáveis e navegam para `/dashboard/talhoes/[id]`
- [ ] Botão "+ Novo Talhão" abre dialog
- [ ] Dialog permite: nome, área, tipo_solo
- [ ] Status inicial: "Em pousio"
- [ ] Empty state se nenhum talhão
- [ ] **AUSENTE**: Botões "Registrar Atividade" e "Novo Ciclo" (removidos)

### Página de Detalhe (`/dashboard/talhoes/[id]`)

#### Aba 1: Resumo e Custos
- [ ] Exibe dados: nome, área, solo, status
- [ ] Ciclo ativo: cultura, plantio, colheita_prevista
- [ ] Custo Total Estimado (soma de atividades)
- [ ] Custo por Hectare (total ÷ área)
- [ ] Botões: Editar Talhão, Deletar, Novo Ciclo Agrícola

#### Aba 2: Operações Agrícolas
- [ ] Botão "Registrar Atividade" → dialog
- [ ] Tabela com: data, tipo, máquina, horas, custo
- [ ] Paginação (20 por página)
- [ ] Filtros: tipo, data range
- [ ] Guard: "Crie um ciclo agrícola para registrar atividades"

#### Aba 3: Histórico e Calendário
- [ ] Timeline de ciclos passados (com produtividade)
- [ ] Calendário DAP ou tabela com operações planejadas/realizadas
- [ ] Gráfico Recharts com produtividade por ciclo

### Atividades de Campo
- [ ] Dialog com tipo_operacao (select)
- [ ] Campos comuns: data, máquina, horas_maquina
- [ ] Campos dinâmicos por tipo (renderizados condicionalmente)
- [ ] Cálculo automático: `custo_total = (dose × área × preço) + (horas × $/h) + terceirização`
- [ ] Campo opcional: `custo_manual` (fallback)
- [ ] Máquina/Trator obrigatória para: Preparo de Solo, Calagem, Gessagem, Plantio, Pulverização, Colheita
- [ ] Máquina/Trator opcional para: Análise de Solo, Irrigação

#### Preparo de Solo
- [ ] Tipo de Operação: enum com 7 valores

#### Calagem / Gessagem
- [ ] Insumo (select do estoque, filtrado)
- [ ] Dose em ton/ha

#### Plantio
- [ ] Semente (select estoque)
- [ ] População (plantas/ha)
- [ ] Sacos/ha
- [ ] Espaçamento entre linhas (cm)
- [ ] **Trigger**: Ao salvar, gerar `eventos_dap` para a cultura

#### Pulverização
- [ ] Categoria: Herbicida, Inseticida, Fungicida, Fertilizante Foliar, Outros
- [ ] Insumo (filtrado por categoria)
- [ ] Dose (L/ha ou kg/ha — dinâmico)
- [ ] Volume de calda (opcional)
- [ ] **Aviso UI**: "Misturas: registre cada produto separadamente"

#### Colheita
- [ ] Produtividade (ton/ha)
- [ ] 3 máquinas opcionais: colheita, transporte, compactação
- [ ] Horas para cada
- [ ] Valor terceirização (opcional)
- [ ] Para Sorgo Silagem: Pergunta "Planeja colher rebrota? (~60 dias)" com checkbox
- [ ] Se rebrota confirmada: Settar `permite_rebrota = true` no ciclo e gerar novos eventos DAP (adubação cobertura + colheita de rebrota)

#### Análise de Solo
- [ ] Custo da amostra (R$)
- [ ] Método: Manual ou Upload PDF
- [ ] Se Manual: 14 campos (pH, MO, P, K, Ca, Mg, Al, H+Al, S, B, Cu, Fe, Mn, Zn)
- [ ] Campos calculados: SB, CTC, V%
- [ ] Se Upload: campo de upload (Supabase Storage)

#### Irrigação
- [ ] Lâmina (mm — opcional)
- [ ] Horas de irrigação
- [ ] Custo por hora (R$)

### Calendário DAP
- [ ] Ao registrar Plantio: sistema gera eventos automáticos
- [ ] Eventos têm status: "Planejado", "Realizado", "Atrasado"
- [ ] Página `/dashboard/calendario` exibe todos os eventos
- [ ] Filtros por talhão, cultura, status
- [ ] Cores: 🔵 Planejado, 🟢 Realizado, 🔴 Atrasado

### Dashboard Principal
- [ ] Novo card "Próximas Operações" (2 dias atrás + hoje + 5 dias futuros)
- [ ] Exibe: data, tipo, talhão, cultura, status
- [ ] Alerta de janela de colheita (silagem): exibido quando faltam ≤7 dias para `data_colheita_prevista` e a cultura contém "Silagem"
  - [ ] No card "Próximas Operações": badge "⚠️ Janela de colheita" para o evento de colheita de silagem
  - [ ] Na página de detalhe do talhão (`/dashboard/talhoes/[id]`): banner amarelo/warning no topo da aba Resumo com texto: "Atenção: janela de colheita de silagem se aproxima em X dias"
  - [ ] Toast (Sonner) exibido UMA VEZ por sessão ao acessar `/dashboard` se houver alerta ativo

### Navegação
- [ ] Sidebar: "Calendário" adicionado ao grupo Operacional
- [ ] Ícone de calendário

---

## ⚠️ Riscos & Dependências

### Dependências Externas
1. **Módulo de Insumos**: Necessário para select de insumos nas atividades
   - Risco: Se estoque não tiver dados, formulários vazios
   - Mitigação: Campos opcionais + campo de custo manual
   
2. **Módulo de Frota**: Necessário para select de máquinas
   - Risco: Se não houver máquinas cadastradas, atividades sem maquinário
   - Mitigação: Campo opcional, custo manual como fallback

3. **Módulo Financeiro**: Rastreabilidade de custos
   - Risco: Duplicação de custos se não sincronizado
   - Mitigação: Registrar custo em `atividades_campo.custo_total` (source of truth)

### Pré-requisitos de Banco de Dados (VERIFICAR ANTES DE IMPLEMENTAR)

Antes de iniciar a **Fase 5** (Página de Detalhe com Atividades), verificar:

1. **Tabela `maquinas`**: Confirmar existência do campo `custo_hora` (DECIMAL).
   - Se não existir: adicionar coluna `custo_hora DECIMAL(10,2)` à tabela `maquinas`
   - Esse campo é necessário para o cálculo automático: `custo_maquina = horas × custo_hora`

2. **Tabela `insumos`**: Confirmar existência do campo `preco_unitario` (DECIMAL).
   - Se não existir: adicionar coluna `preco_unitario DECIMAL(15,2)` à tabela `insumos`
   - Esse campo é necessário para: `custo_insumo = dose × area × preco_unitario`

3. **Tabela `insumos`**: Confirmar existência de campo `categoria` ou `tipo` para filtrar insumos por tipo (Calcário, Gesso, Semente, Herbicida, etc.).
   - Se não existir: adicionar coluna `categoria VARCHAR(50)` à tabela `insumos`

Se qualquer campo estiver ausente, criar migration antes de prosseguir.

### Riscos Técnicos

1. **Cálculos Automáticos**: Se trigger falhar, custos inconsistentes
   - Mitigação: Testar triggers extensivamente, adicionar validação no app

2. **Performance de Calendário DAP**: Se houver muitos eventos, calendario lento
   - Mitigação: Paginação, filtros, indexes no banco

3. **Upload de PDF (Análise de Solo)**: Requer Supabase Storage configurado
   - Mitigação: Começar com método Manual, adicionar Upload depois

4. **Isolamento por Fazenda (RLS)**: Muito importante para multi-tenant
   - Mitigação: Testar RLS em staging antes de produção

### Bugs Potenciais

1. **Ciclo ativo pode ser null**: Precisamos de guard em operações
   - Solução: Validar no server antes de criar atividade

2. **Custo calculado vs. manual**: Qual prevalece?
   - Decisão: `custo_manual` é fallback — usar calculado se disponível

3. **DAP pode gerar datas inválidas** (dataplantio + dias_apos_plantio > fim do ciclo)
   - Solução: Validar ao gerar, não salvar eventos além de colheita_prevista

4. **Timeline de ciclos passados**: Precisamos de histórico
   - Solução: Usar `data_colheita_real` para filtrar ciclos fechados

---

## 🎨 Padrões & Convenções (do Projeto)

### Arquivo Estrutura
- **Pages**: `app/dashboard/[modulo]/page.tsx` (client + `'use client'`)
- **Components**: `app/dashboard/[modulo]/components/` (nomeação PascalCase)
- **Dialogs**: `components/dialogs/` (pattern: `DialogName.tsx`)
- **Tabs**: `components/tabs/` (pattern: `TabName.tsx`)
- **Validações**: `lib/validations/[modulo].ts` (Zod schemas)
- **Queries**: `lib/supabase/[modulo].ts` + `queries-audit.ts`

### UI Components
- shadcn/ui (Button, Card, Dialog, Tabs, Input, Select, etc.)
- Lucide React para ícones
- Tailwind CSS 4.1 para estilos
- Sonner para toast notifications

### Formulários
- React Hook Form + Zod (validation)
- Padrão: `useForm(resolver: zodResolver(schema))`
- Controlled inputs com `{...register('field')}`

### State Management
- useState para estado local
- useCallback para memoização
- Context para autenticação (useAuth)

### Queries ao Supabase
- Usar `q` (queries-audit) para centralizar
- Sempre especificar `.select('campo1, campo2')` (não `select('*')`)
- RLS sempre ativo
- Foreign keys com ON DELETE CASCADE

### Erros & Toasts
- `toast.error('Mensagem')` para erros
- `toast.success('Mensagem')` para sucesso
- Try/catch em funções assíncronas

---

## 📝 Notas Adicionais

### Matriz DAP — Valores Base
Será fornecida na fase de implementação com detalhes completos. Exemplo:

| Cultura | Operação | DAP | Range |
|---------|----------|-----|-------|
| Milho Grão | Dessecação | 0 | 0-5 |
| Milho Grão | Plantio | 0 | 0-5 |
| Milho Grão | Herbicida pós | 15 | 10-20 |
| Milho Grão | Adubação cobertura | 35 | 30-40 |
| ... | ... | ... | ... |

### Nomes de Culturas
- Milho Grão
- Milho Silagem
- Soja
- Feijão
- Sorgo Grão
- Sorgo Silagem
- Trigo
- Trigo Silagem

### Nomes de Tipos de Solo
- Latossolo
- Argissolo
- Neossolo
- Cambissolo
- Gleissolo
- Nitossolo
- Chernossolos
- Outro

### Segurança
- ✅ RLS ativo em todas as tabelas
- ✅ Validação Zod no client
- ✅ Validação no server (refine com chamada ao BD)
- ✅ Campos sensíveis (custo) não podem ser alterados direto pelo usuário
- ⚠️ Upload PDF: validar tipo MIME, tamanho, vírus scanning (future)

---

## 📞 Questões Abertas

1. **Armazenamento de PDF**: Qual pasta no Supabase Storage? Nomeação?
   - Sugestão: `uploads/analises/{fazenda_id}/{talhao_id}/{uuid}.pdf`

2. **Custo por Hora de Máquina**: Vem de qual tabela?
   - Sugestão: Campo `custo_por_hora_r` na tabela `maquinas`

3. **Valor Unitário de Insumo**: Vem de qual tabela?
   - Sugestão: Usar `preco_unitario_r` da tabela `insumos`

4. **Autorização de Deletar Talhão**: Se tem ciclos/atividades, permitir?
   - Sugestão: Deletar em cascata (ON DELETE CASCADE) — mais prático

5. **Alertas de Colheita**: Notificação ou apenas card visual?
   - Sugestão: Card visual + Sonner toast quando acessar página

---

**Data de Criação**: 2026-04-15  
**Última Atualização**: 2026-04-15  
**Status**: ✅ PRONTO PARA IMPLEMENTAÇÃO
