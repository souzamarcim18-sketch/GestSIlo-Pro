# SPEC — Calendário Unificado

**Versão**: 1.0  
**Data**: 2026-05-24  
**PRD de referência**: `PRD-calendario-unificado.md`  
**Status**: Pronto para execução

---

## Visão Geral

Transformar `/dashboard/calendario` em feed cronológico de 11 fontes e implementar o card "Atividades Recentes" no dashboard. A arquitetura usa **queries paralelas no RSC** (sem função PostgreSQL centralizada — ver §1 para justificativa), tipos normalizados em `lib/types/calendario.ts` e um módulo de queries em `lib/supabase/calendario.ts`.

---

## 1. Decisão de Arquitetura: Sem Função PostgreSQL Centralizada

O PRD solicitou uma função `get_eventos_calendario()`. Após análise do schema e das constraints do projeto, a função única **não é adequada** por estas razões:

1. **`movimentacoes_insumo` não tem `fazenda_id` diretamente** — a RLS usa subquery via `insumos.fazenda_id`. Uma função SQL genérica precisaria replicar essa subquery ou usar `SECURITY DEFINER`, o que bypassa a RLS e viola os princípios de segurança do projeto.

2. **Tabelas pós-snapshot sem RLS confirmada no snapshot** (`atividades_mao_obra`, `pastagens`, `piquetes`, `ocupacoes_piquete`, `eventos_manejo_pastagem`) — a função teria que fazer UNION sem garantia de que as policies aplicam corretamente dentro do contexto `SECURITY DEFINER`.

3. **Flexibilidade de filtro** — o filtro de módulos (`modulos?: ModuloCalendario[]`) exige pular tabelas seletivamente; em SQL isso requer condicionais complexas com `CASE` ou múltiplas branches, enquanto `Promise.allSettled` em TypeScript resolve isso trivialmente.

4. **`Promise.allSettled` é o padrão estabelecido no projeto** — já usado em `alertas-helpers.ts` e no RSC do dashboard para queries paralelas.

**Alternativa adotada**: `getEventosCalendario()` em `lib/supabase/calendario.ts` executa as 11 queries em paralelo via `Promise.allSettled`, normaliza para `EventoCalendario[]` e ordena. O RSC de `page.tsx` recebe o cliente server-side já autenticado e com RLS ativa.

> ⚠️ Se uma função PostgreSQL for obrigatória por decisão futura, criar com `SECURITY INVOKER` (não `DEFINER`) para que as policies de cada tabela sejam respeitadas, e tratar `movimentacoes_insumo` via subquery `insumo_id IN (SELECT id FROM insumos WHERE fazenda_id = get_minha_fazenda_id())`.

---

## 2. Tipos TypeScript (`lib/types/calendario.ts`)

```typescript
export type ModuloCalendario =
  | 'lavoura_dap'
  | 'lavoura_atividade'
  | 'frota'
  | 'rebanho'
  | 'sanidade'
  | 'mao_obra'
  | 'pastagem_manejo'
  | 'pastagem_ocupacao'
  | 'silo'
  | 'insumo'
  | 'produto';

export type StatusEventoCalendario = 'planejado' | 'realizado' | 'atrasado' | 'concluido';

export interface EventoCalendario {
  id: string;
  fonte: string;
  modulo: ModuloCalendario;
  titulo: string;
  subtitulo?: string;
  data: string; // ISO date 'YYYY-MM-DD'
  status: StatusEventoCalendario;
  href?: string;
}

export interface FiltrosCalendario {
  dataInicio: string; // ISO date
  dataFim: string;    // ISO date
  modulos?: ModuloCalendario[];
  talhaoId?: string;
  cultura?: string;
}

// Mapeamento de módulo para cor Tailwind (classe CSS, nunca inline)
export const MODULO_CONFIG: Record<ModuloCalendario, { label: string; colorClass: string; bgClass: string }> = {
  lavoura_dap:        { label: 'DAP Lavoura',       colorClass: 'text-green-600',       bgClass: 'bg-green-100' },
  lavoura_atividade:  { label: 'Atividade Campo',    colorClass: 'text-green-800',       bgClass: 'bg-green-200' },
  frota:              { label: 'Frota',              colorClass: 'text-blue-600',        bgClass: 'bg-blue-100' },
  rebanho:            { label: 'Rebanho',            colorClass: 'text-amber-600',       bgClass: 'bg-amber-100' },
  sanidade:           { label: 'Sanidade',           colorClass: 'text-red-500',         bgClass: 'bg-red-100' },
  mao_obra:           { label: 'Mão de Obra',        colorClass: 'text-purple-600',      bgClass: 'bg-purple-100' },
  pastagem_manejo:    { label: 'Manejo Pastagem',    colorClass: 'text-lime-600',        bgClass: 'bg-lime-100' },
  pastagem_ocupacao:  { label: 'Ocupação Piquete',   colorClass: 'text-lime-500',        bgClass: 'bg-lime-50' },
  silo:               { label: 'Silo',               colorClass: 'text-orange-600',      bgClass: 'bg-orange-100' },
  insumo:             { label: 'Insumo',             colorClass: 'text-cyan-600',        bgClass: 'bg-cyan-100' },
  produto:            { label: 'Produto',            colorClass: 'text-indigo-600',      bgClass: 'bg-indigo-100' },
};
```

---

## 3. Migration (`supabase/migrations/20260524000001_calendario_indices.sql`)

Objetivo: adicionar índices de data nas tabelas cujos campos de data do calendário ainda não são indexados por data. Não cria tabelas nem funções.

### 3.1 Análise de índices existentes vs. necessários

| Tabela | Campo data calendário | Índice de data existente? | Ação |
|---|---|---|---|
| `eventos_dap` | `data_esperada` | ❌ não encontrado | **Criar** |
| `atividades_campo` | `data` | ✅ `idx_atividades_campo_data` | — |
| `manutencoes` | `data_prevista`, `data_realizada` | ❌ não encontrado | **Criar** |
| `eventos_rebanho` | `data_evento` | ✅ `idx_eventos_rebanho_data_evento` | — |
| `eventos_sanitarios` | `data_evento`, `data_proxima_dose` | ✅ ambos existem | — |
| `atividades_mao_obra` | `data` | ❌ não encontrado | **Criar** |
| `eventos_manejo_pastagem` | `data` | ❌ não encontrado | **Criar** |
| `ocupacoes_piquete` | `data_entrada`, `data_saida_prevista` | ❌ não encontrado | **Criar** |
| `movimentacoes_silo` | `data` | ❌ não encontrado | **Criar** |
| `movimentacoes_insumo` | `data` | ✅ `idx_movimentacoes_data` (DESC) | — |
| `movimentacoes_produto` | `data` | ✅ `idx_mov_produto_data` (DESC) | — |

### 3.2 SQL completo da migration

```sql
-- Migration: 20260524000001_calendario_indices
-- Objetivo: índices de data para as queries do Calendário Unificado
-- Não altera nenhuma tabela, policy ou função existente.

-- eventos_dap: data_esperada é o campo principal do calendário
CREATE INDEX IF NOT EXISTS idx_eventos_dap_data_esperada
  ON public.eventos_dap (fazenda_id, data_esperada)
  WHERE data_esperada IS NOT NULL;

-- manutencoes: dois campos de data alternados (data_prevista quando não realizada)
CREATE INDEX IF NOT EXISTS idx_manutencoes_data_prevista
  ON public.manutencoes (fazenda_id, data_prevista)
  WHERE data_prevista IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_manutencoes_data_realizada
  ON public.manutencoes (fazenda_id, data_realizada)
  WHERE data_realizada IS NOT NULL;

-- atividades_mao_obra: campo data (tabela criada pós-snapshot de abril/2026)
CREATE INDEX IF NOT EXISTS idx_atividades_mao_obra_data
  ON public.atividades_mao_obra (fazenda_id, data);

-- eventos_manejo_pastagem: campo data (tabela criada em 2026-05-21)
CREATE INDEX IF NOT EXISTS idx_eventos_manejo_pastagem_data
  ON public.eventos_manejo_pastagem (fazenda_id, data);

-- ocupacoes_piquete: data_entrada e data_saida_prevista
CREATE INDEX IF NOT EXISTS idx_ocupacoes_piquete_data_entrada
  ON public.ocupacoes_piquete (fazenda_id, data_entrada);

CREATE INDEX IF NOT EXISTS idx_ocupacoes_piquete_data_saida_prevista
  ON public.ocupacoes_piquete (fazenda_id, data_saida_prevista)
  WHERE data_saida_prevista IS NOT NULL;

-- movimentacoes_silo: campo data
CREATE INDEX IF NOT EXISTS idx_movimentacoes_silo_data
  ON public.movimentacoes_silo (fazenda_id, data);
```

> ⚠️ `atividades_mao_obra` não aparece no `database-snapshot.md` (gerado em abril/2026, antes da criação do módulo). Verificar se a tabela existe em produção antes de aplicar. Se não existir, remover a linha do SQL antes de `supabase db push`.

---

## 4. Camada de Dados (`lib/supabase/calendario.ts`)

### 4.1 Assinatura pública

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { EventoCalendario, FiltrosCalendario, ModuloCalendario } from '@/lib/types/calendario';

type Supabase = SupabaseClient<Database>;

export async function getEventosCalendario(
  supabase: Supabase,
  filtros: FiltrosCalendario,
): Promise<EventoCalendario[]>;

export async function getAtividadesRecentes(
  supabase: Supabase,
): Promise<EventoCalendario[]>;
```

### 4.2 Implementação de `getEventosCalendario`

Usa `Promise.allSettled` sobre 11 funções privadas. Cada função retorna `EventoCalendario[]` ou lança exceção (que `allSettled` captura sem bloquear as demais).

```typescript
export async function getEventosCalendario(
  supabase: Supabase,
  filtros: FiltrosCalendario,
): Promise<EventoCalendario[]> {
  const { dataInicio, dataFim, modulos } = filtros;

  const fontes: Array<() => Promise<EventoCalendario[]>> = [
    () => fetchEventosDap(supabase, dataInicio, dataFim, filtros.talhaoId, filtros.cultura),
    () => fetchAtividadesCampo(supabase, dataInicio, dataFim, filtros.talhaoId),
    () => fetchManutencoes(supabase, dataInicio, dataFim),
    () => fetchEventosRebanho(supabase, dataInicio, dataFim),
    () => fetchEventosSanitarios(supabase, dataInicio, dataFim),
    () => fetchAtividadesMaoObra(supabase, dataInicio, dataFim),
    () => fetchEventosManejoPassagem(supabase, dataInicio, dataFim),
    () => fetchOcupacoesPiquete(supabase, dataInicio, dataFim),
    () => fetchMovimentacoesSilo(supabase, dataInicio, dataFim),
    () => fetchMovimentacoesInsumo(supabase, dataInicio, dataFim),
    () => fetchMovimentacoesProduto(supabase, dataInicio, dataFim),
  ];

  // Se filtro de módulos ativo, pular fontes não selecionadas
  const modulosPorIndice: ModuloCalendario[] = [
    'lavoura_dap', 'lavoura_atividade', 'frota', 'rebanho', 'sanidade',
    'mao_obra', 'pastagem_manejo', 'pastagem_ocupacao', 'silo', 'insumo', 'produto',
  ];

  const fontesAtivas = modulos
    ? fontes.filter((_, i) => modulos.includes(modulosPorIndice[i]))
    : fontes;

  const resultados = await Promise.allSettled(fontesAtivas.map((fn) => fn()));

  const eventos: EventoCalendario[] = [];
  for (const r of resultados) {
    if (r.status === 'fulfilled') eventos.push(...r.value);
    // rejections logadas via console.error (Sentry captura)
    else console.error('[calendario] fetch parcial falhou:', r.reason);
  }

  return eventos.sort((a, b) => a.data.localeCompare(b.data));
}
```

### 4.3 Queries privadas por fonte

#### Fonte 1 — `eventos_dap`

```typescript
async function fetchEventosDap(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
  talhaoId?: string,
  cultura?: string,
): Promise<EventoCalendario[]> {
  let q = supabase
    .from('eventos_dap')
    .select('id, tipo_operacao, cultura, status, data_esperada, data_realizada, talhao_id, talhoes(nome)')
    .gte('data_esperada', dataInicio)
    .lte('data_esperada', dataFim);

  if (talhaoId) q = q.eq('talhao_id', talhaoId);
  if (cultura) q = q.eq('cultura', cultura);

  const { data, error } = await q.order('data_esperada');
  if (error) throw error;

  const hoje = new Date().toISOString().slice(0, 10);

  return (data ?? []).map((r) => {
    const talhaoNome = (r.talhoes as { nome?: string } | null)?.nome ?? '';
    const data = r.data_esperada ?? hoje;
    const isAtrasado = r.status === 'Planejado' && data < hoje;
    return {
      id: r.id,
      fonte: 'eventos_dap',
      modulo: 'lavoura_dap' as const,
      titulo: `${r.tipo_operacao} — ${talhaoNome}`,
      subtitulo: r.cultura ?? undefined,
      data,
      status: r.status === 'Realizado' ? 'realizado' : isAtrasado ? 'atrasado' : 'planejado',
      href: '/dashboard/talhoes',
    };
  });
}
```

#### Fonte 2 — `atividades_campo`

```typescript
async function fetchAtividadesCampo(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
  talhaoId?: string,
): Promise<EventoCalendario[]> {
  let q = supabase
    .from('atividades_campo')
    .select('id, tipo_operacao, data, talhoes(nome)')
    .gte('data', dataInicio)
    .lte('data', dataFim);

  if (talhaoId) q = q.eq('talhao_id', talhaoId);

  const { data, error } = await q.order('data');
  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    fonte: 'atividades_campo',
    modulo: 'lavoura_atividade' as const,
    titulo: `${r.tipo_operacao} — ${(r.talhoes as { nome?: string } | null)?.nome ?? ''}`,
    data: r.data,
    status: 'realizado' as const,
    href: '/dashboard/talhoes',
  }));
}
```

#### Fonte 3 — `manutencoes` (duas passagens: realizada e planejada/próxima)

```typescript
async function fetchManutencoes(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
): Promise<EventoCalendario[]> {
  const { data, error } = await supabase
    .from('manutencoes')
    .select('id, tipo, descricao, status, data_prevista, data_realizada, proxima_manutencao, maquinas(nome)')
    .or(`data_realizada.gte.${dataInicio},data_prevista.gte.${dataInicio}`)
    .or(`data_realizada.lte.${dataFim},data_prevista.lte.${dataFim}`);

  // NOTA: A query acima usa OR composto que pode trazer registros fora do range.
  // Filtrar em JS para garantir precisão:
  if (error) throw error;

  const hoje = new Date().toISOString().slice(0, 10);
  const eventos: EventoCalendario[] = [];

  for (const r of data ?? []) {
    const maquinaNome = (r.maquinas as { nome?: string } | null)?.nome ?? '';
    const titulo = `${r.tipo} — ${maquinaNome}`;

    // Evento principal: data_realizada ou data_prevista
    const dataEvento = r.data_realizada ?? r.data_prevista;
    if (dataEvento && dataEvento >= dataInicio && dataEvento <= dataFim) {
      const isConcluida = r.status === 'concluida';
      const isAtrasada = !isConcluida && !!r.data_prevista && r.data_prevista < hoje;
      eventos.push({
        id: r.id,
        fonte: 'manutencoes',
        modulo: 'frota' as const,
        titulo,
        subtitulo: r.descricao ?? undefined,
        data: dataEvento,
        status: isConcluida ? 'concluido' : isAtrasada ? 'atrasado' : 'planejado',
        href: '/dashboard/frota',
      });
    }

    // Evento secundário: proxima_manutencao (futuro)
    if (r.proxima_manutencao && r.proxima_manutencao >= dataInicio && r.proxima_manutencao <= dataFim && r.proxima_manutencao >= hoje) {
      eventos.push({
        id: `${r.id}_proxima`,
        fonte: 'manutencoes',
        modulo: 'frota' as const,
        titulo: `Próxima manutenção — ${maquinaNome}`,
        subtitulo: r.tipo,
        data: r.proxima_manutencao,
        status: 'planejado',
        href: '/dashboard/frota',
      });
    }
  }

  return eventos;
}
```

> ⚠️ Alternativa mais precisa: duas queries separadas (uma para `data_realizada`, outra para `data_prevista`) com `.gte/.lte` em cada. A versão acima funciona mas pode trazer registros extras sem o filtro JS. Implementar como duas queries para máxima correção:

```typescript
// Versão recomendada com duas queries separadas
const [realizadas, planejadas] = await Promise.all([
  supabase.from('manutencoes')
    .select('id, tipo, descricao, status, data_realizada, proxima_manutencao, maquinas(nome)')
    .gte('data_realizada', dataInicio).lte('data_realizada', dataFim),
  supabase.from('manutencoes')
    .select('id, tipo, descricao, status, data_prevista, proxima_manutencao, maquinas(nome)')
    .is('data_realizada', null)
    .gte('data_prevista', dataInicio).lte('data_prevista', dataFim),
]);
```

#### Fonte 4 — `eventos_rebanho`

```typescript
async function fetchEventosRebanho(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
): Promise<EventoCalendario[]> {
  const { data, error } = await supabase
    .from('eventos_rebanho')
    .select('id, tipo, descricao, data_evento, animal_id, animais(brinco, nome)')
    .gte('data_evento', dataInicio)
    .lte('data_evento', dataFim)
    .is('deleted_at', null) // soft-delete conforme PRD §3.5
    .order('data_evento');

  if (error) throw error;

  return (data ?? []).map((r) => {
    const animal = r.animais as { brinco?: string; nome?: string } | null;
    const animalLabel = animal?.brinco ?? animal?.nome ?? '';
    return {
      id: r.id,
      fonte: 'eventos_rebanho',
      modulo: 'rebanho' as const,
      titulo: `${r.tipo}${animalLabel ? ` — ${animalLabel}` : ''}`,
      subtitulo: r.descricao ?? undefined,
      data: r.data_evento,
      status: 'realizado' as const,
      href: r.animal_id ? `/dashboard/rebanho/${r.animal_id}` : '/dashboard/rebanho',
    };
  });
}
```

#### Fonte 5 — `eventos_sanitarios` (evento + próxima dose)

```typescript
async function fetchEventosSanitarios(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
): Promise<EventoCalendario[]> {
  const hoje = new Date().toISOString().slice(0, 10);
  const eventos: EventoCalendario[] = [];

  const [passados, futuros] = await Promise.all([
    supabase.from('eventos_sanitarios')
      .select('id, tipo, descricao, data_evento, data_proxima_dose, animal_id')
      .gte('data_evento', dataInicio).lte('data_evento', dataFim)
      .order('data_evento'),
    supabase.from('eventos_sanitarios')
      .select('id, tipo, descricao, data_proxima_dose')
      .gte('data_proxima_dose', dataInicio).lte('data_proxima_dose', dataFim)
      .gte('data_proxima_dose', hoje) // apenas futuros
      .order('data_proxima_dose'),
  ]);

  if (passados.error) throw passados.error;
  if (futuros.error) throw futuros.error;

  for (const r of passados.data ?? []) {
    eventos.push({
      id: r.id,
      fonte: 'eventos_sanitarios',
      modulo: 'sanidade' as const,
      titulo: `${r.tipo}`,
      subtitulo: r.descricao ?? undefined,
      data: r.data_evento,
      status: 'realizado',
      href: '/dashboard/rebanho/sanidade',
    });
  }

  for (const r of futuros.data ?? []) {
    if (!r.data_proxima_dose) continue;
    eventos.push({
      id: `${r.id}_proxima_dose`,
      fonte: 'eventos_sanitarios',
      modulo: 'sanidade' as const,
      titulo: `Próxima dose — ${r.tipo}`,
      subtitulo: r.descricao ?? undefined,
      data: r.data_proxima_dose,
      status: 'planejado',
      href: '/dashboard/rebanho/sanidade',
    });
  }

  return eventos;
}
```

#### Fonte 6 — `atividades_mao_obra`

```typescript
async function fetchAtividadesMaoObra(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
): Promise<EventoCalendario[]> {
  const { data, error } = await supabase
    .from('atividades_mao_obra')
    .select('id, tipo_atividade, descricao, data, custo_final')
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data');

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    fonte: 'atividades_mao_obra',
    modulo: 'mao_obra' as const,
    titulo: r.tipo_atividade,
    subtitulo: r.descricao ?? undefined,
    data: r.data,
    status: 'realizado' as const,
    href: '/dashboard/mao-de-obra',
  }));
}
```

#### Fonte 7 — `eventos_manejo_pastagem`

```typescript
async function fetchEventosManejoPassagem(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
): Promise<EventoCalendario[]> {
  const { data, error } = await supabase
    .from('eventos_manejo_pastagem')
    .select('id, tipo, descricao, data, piquete_id, piquetes(pastagem_id)')
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data');

  if (error) throw error;

  return (data ?? []).map((r) => {
    const pastagem = r.piquetes as { pastagem_id?: string } | null;
    return {
      id: r.id,
      fonte: 'eventos_manejo_pastagem',
      modulo: 'pastagem_manejo' as const,
      titulo: r.tipo,
      subtitulo: r.descricao ?? undefined,
      data: r.data,
      status: 'realizado' as const,
      href: pastagem?.pastagem_id
        ? `/dashboard/pastagens/${pastagem.pastagem_id}`
        : '/dashboard/pastagens',
    };
  });
}
```

#### Fonte 8 — `ocupacoes_piquete` (entrada + saída)

```typescript
async function fetchOcupacoesPiquete(
  supabase: Supabase,
  dataInicio: string,
  dataFim: string,
): Promise<EventoCalendario[]> {
  const eventos: EventoCalendario[] = [];

  const [entradas, saidas] = await Promise.all([
    supabase.from('ocupacoes_piquete')
      .select('id, data_entrada, lotes(nome), piquetes(nome, pastagem_id)')
      .gte('data_entrada', dataInicio).lte('data_entrada', dataFim)
      .order('data_entrada'),
    supabase.from('ocupacoes_piquete')
      .select('id, data_saida_real, data_saida_prevista, lotes(nome), piquetes(nome, pastagem_id)')
      .or(`data_saida_real.gte.${dataInicio},data_saida_prevista.gte.${dataInicio}`)
      .is('data_saida_real', null) // saída prevista apenas quando saída real não existe
      .gte('data_saida_prevista', dataInicio).lte('data_saida_prevista', dataFim),
  ]);

  // Entradas
  for (const r of entradas.data ?? []) {
    const piquete = r.piquetes as { nome?: string; pastagem_id?: string } | null;
    const lote = r.lotes as { nome?: string } | null;
    eventos.push({
      id: `${r.id}_entrada`,
      fonte: 'ocupacoes_piquete',
      modulo: 'pastagem_ocupacao' as const,
      titulo: `Entrada no piquete — ${piquete?.nome ?? ''}`,
      subtitulo: lote?.nome,
      data: r.data_entrada,
      status: 'realizado',
      href: piquete?.pastagem_id ? `/dashboard/pastagens/${piquete.pastagem_id}` : '/dashboard/pastagens',
    });
  }

  // Saídas reais
  const { data: saidasReais } = await supabase
    .from('ocupacoes_piquete')
    .select('id, data_saida_real, lotes(nome), piquetes(nome, pastagem_id)')
    .gte('data_saida_real', dataInicio).lte('data_saida_real', dataFim)
    .not('data_saida_real', 'is', null);

  for (const r of saidasReais ?? []) {
    const piquete = r.piquetes as { nome?: string; pastagem_id?: string } | null;
    const lote = r.lotes as { nome?: string } | null;
    eventos.push({
      id: `${r.id}_saida_real`,
      fonte: 'ocupacoes_piquete',
      modulo: 'pastagem_ocupacao' as const,
      titulo: `Saída do piquete — ${piquete?.nome ?? ''}`,
      subtitulo: lote?.nome,
      data: r.data_saida_real!,
      status: 'realizado',
      href: piquete?.pastagem_id ? `/dashboard/pastagens/${piquete.pastagem_id}` : '/dashboard/pastagens',
    });
  }

  // Saídas previstas (quando data_saida_real IS NULL)
  for (const r of saidas.data ?? []) {
    if (!r.data_saida_prevista) continue;
    const piquete = r.piquetes as { nome?: string; pastagem_id?: string } | null;
    const lote = r.lotes as { nome?: string } | null;
    eventos.push({
      id: `${r.id}_saida_prevista`,
      fonte: 'ocupacoes_piquete',
      modulo: 'pastagem_ocupacao' as const,
      titulo: `Saída prevista — ${piquete?.nome ?? ''}`,
      subtitulo: lote?.nome,
      data: r.data_saida_prevista,
      status: 'planejado',
      href: piquete?.pastagem_id ? `/dashboard/pastagens/${piquete.pastagem_id}` : '/dashboard/pastagens',
    });
  }

  return eventos;
}
```

#### Fontes 9, 10, 11 — Movimentações (silo, insumo, produto)

```typescript
// Padrão idêntico para as 3 fontes
async function fetchMovimentacoesSilo(supabase: Supabase, dataInicio: string, dataFim: string): Promise<EventoCalendario[]> {
  const { data, error } = await supabase
    .from('movimentacoes_silo')
    .select('id, tipo, subtipo, quantidade, data, silos(nome)')
    .gte('data', dataInicio).lte('data', dataFim)
    .order('data');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    fonte: 'movimentacoes_silo',
    modulo: 'silo' as const,
    titulo: `${r.tipo}${r.subtipo ? ` (${r.subtipo})` : ''} — ${(r.silos as { nome?: string } | null)?.nome ?? ''}`,
    subtitulo: `${r.quantidade} kg`,
    data: r.data,
    status: 'realizado',
    href: '/dashboard/silos',
  }));
}

async function fetchMovimentacoesInsumo(supabase: Supabase, dataInicio: string, dataFim: string): Promise<EventoCalendario[]> {
  const { data, error } = await supabase
    .from('movimentacoes_insumo')
    .select('id, tipo, quantidade, data, insumos(nome)')
    .gte('data', dataInicio).lte('data', dataFim)
    .order('data');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    fonte: 'movimentacoes_insumo',
    modulo: 'insumo' as const,
    titulo: `${r.tipo} — ${(r.insumos as { nome?: string } | null)?.nome ?? ''}`,
    subtitulo: `${r.quantidade}`,
    data: r.data,
    status: 'realizado',
    href: '/dashboard/insumos',
  }));
}

async function fetchMovimentacoesProduto(supabase: Supabase, dataInicio: string, dataFim: string): Promise<EventoCalendario[]> {
  const { data, error } = await supabase
    .from('movimentacoes_produto')
    .select('id, tipo_movimento, quantidade, data, produtos(nome)')
    .gte('data', dataInicio).lte('data', dataFim)
    .order('data');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    fonte: 'movimentacoes_produto',
    modulo: 'produto' as const,
    titulo: `${r.tipo_movimento} — ${(r.produtos as { nome?: string } | null)?.nome ?? ''}`,
    subtitulo: `${r.quantidade}`,
    data: r.data,
    status: 'realizado',
    href: '/dashboard/produtos',
  }));
}
```

> ⚠️ `movimentacoes_insumo` não tem `fazenda_id` diretamente — a RLS usa join via `insumos.fazenda_id`. O Supabase aplica a policy corretamente no SELECT mesmo sem `fazenda_id` na query, pois a policy `movimentacoes_insumo_select_todos` usa `insumo_id IN (SELECT insumos.id FROM insumos WHERE insumos.fazenda_id = get_minha_fazenda_id())`. Não é necessário filtrar por `fazenda_id` explicitamente.

### 4.4 `getAtividadesRecentes`

```typescript
export async function getAtividadesRecentes(supabase: Supabase): Promise<EventoCalendario[]> {
  const hoje = new Date();
  const d2 = new Date(hoje);
  d2.setDate(d2.getDate() - 2);

  const dataInicio = d2.toISOString().slice(0, 10);
  const dataFim = hoje.toISOString().slice(0, 10);

  const todos = await getEventosCalendario(supabase, { dataInicio, dataFim });

  // Dashboard: desc (mais recente primeiro), limite 8
  return todos
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 8);
}
```

---

## 5. Refatoração do `app/dashboard/calendario/page.tsx`

### 5.1 Estado atual

Busca apenas `eventos_dap` e `talhoes`. Passa `initialEventos: EventoDAP_Extended[]` para `CalendarioClient`.

### 5.2 Novo comportamento

RSC passa `initialEventos: EventoCalendario[]` do mês atual + talhões para filtros.  
Re-fetch ao navegar de mês: via `router.refresh()` com mês como `searchParam`.

```typescript
// app/dashboard/calendario/page.tsx — estrutura nova
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getEventosCalendario } from '@/lib/supabase/calendario';
import { CalendarioClient } from './CalendarioClient';

export const metadata = { title: 'Calendário | GestSilo' };

interface Props {
  searchParams: Promise<{ mes?: string }>; // 'YYYY-MM'
}

export default async function CalendarioPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');

  const params = await searchParams;
  const mesStr = params.mes ?? new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const [ano, mes] = mesStr.split('-').map(Number);
  const dataInicio = `${mesStr}-01`;
  const dataFim = new Date(ano, mes, 0).toISOString().slice(0, 10); // último dia do mês

  const [eventosRes, talhoesRes] = await Promise.all([
    getEventosCalendario(supabase, { dataInicio, dataFim }),
    supabase.from('talhoes').select('id, nome').order('nome'),
  ]);

  return (
    <CalendarioClient
      initialEventos={eventosRes}
      talhoes={talhoesRes.data ?? []}
      mesAtual={mesStr}
    />
  );
}
```

### 5.3 `searchParams` e navegação de mês

Ao clicar "mês anterior" / "próximo mês" no `CalendarioClient`:

```typescript
// CalendarioClient.tsx
const router = useRouter();

function navegarMes(delta: number) {
  const [ano, mes] = mesAtual.split('-').map(Number);
  const novaData = new Date(ano, mes - 1 + delta, 1);
  const novoMes = novaData.toISOString().slice(0, 7);
  router.push(`/dashboard/calendario?mes=${novoMes}`);
}
```

Isso dispara o RSC com o novo `searchParams.mes`, rebuscando os dados corretamente.

---

## 6. Refatoração do `CalendarioClient.tsx`

### 6.1 Mudanças obrigatórias

- **Remover**: `import { supabase } from '@/lib/supabase'` (linha 15 atual — violação documentada no PRD §14)
- **Remover**: função `fetchEventos` (useCallback client-side)
- **Remover**: todo `useEffect` de re-fetch
- **Adicionar**: filtro de módulo (multiselect) — filtragem **local** sobre `initialEventos` (sem re-fetch)
- **Adicionar**: prop `mesAtual: string` para controle de navegação via `router.push`
- **Alterar**: type das props de `EventoDAP_Extended[]` para `EventoCalendario[]`

### 6.2 Novos props

```typescript
interface CalendarioClientProps {
  initialEventos: EventoCalendario[];
  talhoes: Array<{ id: string; nome: string }>;
  mesAtual: string; // 'YYYY-MM'
}
```

### 6.3 Filtros locais (sem re-fetch)

O filtro de módulo é aplicado localmente — `initialEventos` contém todos os eventos do mês, e o cliente filtra em memória:

```typescript
const eventosFiltrados = useMemo(() => {
  let resultado = initialEventos;
  if (modulosSelecionados.length > 0 && modulosSelecionados.length < 11) {
    resultado = resultado.filter((e) => modulosSelecionados.includes(e.modulo));
  }
  if (talhaoId) {
    // lavoura_dap e lavoura_atividade: filtrar por talhão no href ou remover do filtro
    // NOTA: talhaoId requer re-fetch porque o campo não está no EventoCalendario normalizado
    // Solução: ao selecionar talhaoId, router.push com searchParam talhaoId
  }
  return resultado;
}, [initialEventos, modulosSelecionados, talhaoId]);
```

> **Nota**: filtro por talhão requer o `talhao_id` no tipo `EventoCalendario`. Adicionar campo `talhaoId?: string` ao tipo para os módulos `lavoura_dap` e `lavoura_atividade`. O filtro de talhão e cultura pode manter `router.push` (re-fetch via RSC) pois é pouco frequente.

### 6.4 Badge por módulo

Substituir as badges de status actuais por badges de módulo coloridas:

```tsx
// Componente interno
function ModuloBadge({ modulo }: { modulo: ModuloCalendario }) {
  const { label, bgClass, colorClass } = MODULO_CONFIG[modulo];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bgClass} ${colorClass}`}>
      {label}
    </span>
  );
}
```

### 6.5 Ícone por módulo

```typescript
import { Sprout, Shovel, Wrench, Beef, Syringe, HardHat, Leaf, PawPrint, Archive, Package, ShoppingBag } from 'lucide-react';

const MODULO_ICONE: Record<ModuloCalendario, React.ComponentType<{ className?: string }>> = {
  lavoura_dap:       Sprout,
  lavoura_atividade: Shovel,
  frota:             Wrench,
  rebanho:           Beef,
  sanidade:          Syringe,
  mao_obra:          HardHat,
  pastagem_manejo:   Leaf,
  pastagem_ocupacao: PawPrint,
  silo:              Archive,
  insumo:            Package,
  produto:           ShoppingBag,
};
```

### 6.6 Visão Lista — linha clicável

```tsx
// Linha da tabela
<tr
  key={evento.id}
  className={evento.href ? 'cursor-pointer hover:bg-muted/50' : ''}
  onClick={() => evento.href && router.push(evento.href)}
>
  <td><ModuloBadge modulo={evento.modulo} /></td>
  <td>
    <span className="text-sm font-medium">{evento.titulo}</span>
    {evento.subtitulo && (
      <span className="block text-xs text-muted-foreground">{evento.subtitulo}</span>
    )}
  </td>
  <td className="text-sm text-muted-foreground">{formatarDataBR(evento.data)}</td>
  <td><StatusBadge status={evento.status} /></td>
</tr>
```

### 6.7 Visões Mensal e Semanal

- Ponto colorido por módulo: `<span className={`w-2 h-2 rounded-full ${MODULO_CONFIG[evento.modulo].bgClass}`} />`
- Limite de exibição por célula: 3 (mensal), 4 (semanal); excedente como `+N`
- Tooltip ao hover: usar `title` HTML nativo na v1 (não requer dependência extra)

---

## 7. Card "Atividades Recentes" no DashboardClient

### 7.1 Alterações no `app/dashboard/page.tsx`

Adicionar ao `Promise.all` existente:

```typescript
// Dentro do Promise.all existente (~18 queries)
getAtividadesRecentes(supabase),
```

Adicionar prop `initialAtividadesRecentes` ao `DashboardClient`.

### 7.2 Alterações no `DashboardClient.tsx`

**Remover** linhas 341–349 (empty state hardcoded com `TrendingUp`).  
**Remover** `<button>` sem `href` (linha 341).  
**Adicionar** `Link` do Next.js e `AtividadesRecentesList`:

```tsx
import Link from 'next/link';
import { AtividadesRecentesList } from '@/components/dashboard/AtividadesRecentesList';

// Na prop de DashboardClient:
interface DashboardClientProps {
  // ... props existentes ...
  initialAtividadesRecentes: EventoCalendario[];
}

// Na seção "Atividades Recentes":
<section aria-label="Atividades Recentes">
  <Card className="bg-card rounded-2xl p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-foreground">Atividades Recentes</h2>
      <Link
        href="/dashboard/calendario"
        className="text-sm font-semibold text-brand-primary hover:text-brand-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded px-2 py-1 transition-colors"
      >
        Ver tudo
      </Link>
    </div>
    <AtividadesRecentesList eventos={initialAtividadesRecentes} />
  </Card>
</section>
```

### 7.3 Novo componente `components/dashboard/AtividadesRecentesList.tsx`

```typescript
'use client';

import { TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { EventoCalendario, MODULO_CONFIG, MODULO_ICONE } from '@/lib/types/calendario';

interface Props {
  eventos: EventoCalendario[];
}

export function AtividadesRecentesList({ eventos }: Props) {
  if (eventos.length === 0) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        <TrendingUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" aria-hidden="true" />
        <p className="text-sm font-medium text-muted-foreground">Nenhuma atividade registrada recentemente.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Suas últimas movimentações aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {eventos.map((evento) => (
        <AtividadeRecenteItem key={evento.id} evento={evento} />
      ))}
    </ul>
  );
}

function AtividadeRecenteItem({ evento }: { evento: EventoCalendario }) {
  const { colorClass, bgClass } = MODULO_CONFIG[evento.modulo];
  const Icone = MODULO_ICONE[evento.modulo];
  const dataObj = new Date(`${evento.data}T12:00:00`); // noon para evitar off-by-one de timezone
  const tempoRelativo = formatDistanceToNow(dataObj, { addSuffix: true, locale: ptBR });

  const conteudo = (
    <div className="flex items-start gap-3 py-2">
      <span className={`mt-0.5 p-1.5 rounded-full ${bgClass} shrink-0`}>
        <Icone className={`w-3.5 h-3.5 ${colorClass}`} aria-hidden="true" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{evento.titulo}</p>
        {evento.subtitulo && (
          <p className="text-xs text-muted-foreground truncate">{evento.subtitulo}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{tempoRelativo}</span>
    </div>
  );

  if (evento.href) {
    return (
      <li>
        <Link href={evento.href} className="block hover:bg-muted/50 rounded-lg px-1 -mx-1 transition-colors">
          {conteudo}
        </Link>
      </li>
    );
  }

  return <li>{conteudo}</li>;
}
```

> ⚠️ `date-fns` é necessário para `formatDistanceToNow`. Verificar se já está no `package.json` antes de instalar. Se não estiver, usar implementação manual de tempo relativo para evitar nova dependência.

---

## 8. Guard de Perfil — `app/dashboard/calendario/layout.tsx`

O calendário não tem `layout.tsx` atualmente. Criar para redirecionar Operador:

```typescript
// app/dashboard/calendario/layout.tsx
'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CalendarioLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (profile && profile.perfil === 'Operador') {
      router.replace('/operador');
    }
  }, [profile, router]);

  if (profile?.perfil === 'Operador') return null;
  return <>{children}</>;
}
```

---

## 9. Análise de Impacto em Testes

### 9.1 Testes existentes possivelmente afetados

| Arquivo | Impacto | Ação |
|---|---|---|
| `__tests__/dashboard/alertas-helpers.test.ts` | Nenhum — funções puras não mudam | Verificar que passa |
| `__tests__/security/rls.test.ts` | Timeout de rede (pré-existente) | Ignorar — já documentado como falho |
| `lib/supabase/__tests__/projetar-rebanho.test.ts` | Falha de lógica pré-existente | Ignorar — não relacionado |

### 9.2 Novos testes necessários

**`__tests__/calendario/normalizar-eventos.test.ts`**

Testar as funções de normalização puras (extraídas das funções fetch para permitir teste sem Supabase):

```typescript
// Funções a extrair para lib/utils/calendario.ts (testáveis sem rede):
export function normalizarEventoDap(row: EventoDapRow, hoje: string): EventoCalendario
export function normalizarAtividadeCampo(row: AtividadeCampoRow): EventoCalendario
export function normalizarManutencao(row: ManutencaoRow, hoje: string): EventoCalendario[]
export function normalizarEventoRebanho(row: EventoRebanhoRow): EventoCalendario
export function normalizarEventoSanitario(row: EventoSanitarioRow, hoje: string): EventoCalendario[]
export function normalizarOcupacaoPiquete(row: OcupacaoPiqueteRow): EventoCalendario[]
```

**Casos de teste mínimos**:

| Função | Cenários |
|---|---|
| `normalizarEventoDap` | status Realizado → `realizado`; data passada + Planejado → `atrasado`; data futura → `planejado` |
| `normalizarManutencao` | sem `data_realizada` e `data_prevista` passada → `atrasado`; `data_realizada` presente → `concluido`; `proxima_manutencao` no futuro → gera 2 eventos |
| `normalizarEventoSanitario` | sem `data_proxima_dose` → 1 evento; com `data_proxima_dose` futura → 2 eventos; `data_proxima_dose` passada → não gera evento futuro |
| `normalizarOcupacaoPiquete` | sem `data_saida_real` → gera entrada + saída prevista; com `data_saida_real` → gera entrada + saída real (não prevista) |
| `getAtividadesRecentes` | array com 10 itens → retorna 8; array vazio → retorna []; ordenação desc por data |

**`__tests__/calendario/tipos.test.ts`**

Verificar que `MODULO_CONFIG` tem entrada para todos os 11 valores de `ModuloCalendario` (teste trivial que evita esquecimento ao adicionar módulo).

---

## 10. Checklist de Execução

Execute nesta ordem exata. Não avançar sem validar TypeScript no passo anterior.

### Etapa 1 — Migration

- [ ] Criar `supabase/migrations/20260524000001_calendario_indices.sql` com o SQL da §3.2
- [ ] Verificar se `atividades_mao_obra` existe em produção antes de aplicar
- [ ] `supabase db push` (ou aplicar via Supabase Dashboard)

### Etapa 2 — Tipos TypeScript

- [ ] Criar `lib/types/calendario.ts` com `ModuloCalendario`, `StatusEventoCalendario`, `EventoCalendario`, `FiltrosCalendario`, `MODULO_CONFIG`
- [ ] Criar `lib/utils/calendario.ts` com funções de normalização puras (extraídas da §4.3)

### Etapa 3 — Camada de dados

- [ ] Criar `lib/supabase/calendario.ts` com `getEventosCalendario` e `getAtividadesRecentes`
- [ ] Verificar tipos dos selects com `types/supabase.ts` — campos `tipo_movimento` em `movimentacoes_produto` e `tipo_atividade` em `atividades_mao_obra`

### Etapa 4 — page.tsx do calendário (RSC)

- [ ] Substituir `app/dashboard/calendario/page.tsx` pela versão com `searchParams.mes`
- [ ] Criar `app/dashboard/calendario/layout.tsx` com guard de Operador

### Etapa 5 — CalendarioClient.tsx (refatoração)

- [ ] Remover `import { supabase } from '@/lib/supabase'`
- [ ] Remover `fetchEventos` (useCallback), `useEffect` de re-fetch
- [ ] Alterar props: `initialEventos: EventoCalendario[]`, `talhoes`, `mesAtual`
- [ ] Adicionar filtro de módulo (multiselect local)
- [ ] Implementar navegação de mês via `router.push` com `?mes=YYYY-MM`
- [ ] Adicionar `ModuloBadge` e `MODULO_ICONE` nas três visões (Lista, Semanal, Mensal)

### Etapa 6 — DashboardClient.tsx + AtividadesRecentesList

- [ ] Adicionar `getAtividadesRecentes(supabase)` ao `Promise.all` em `app/dashboard/page.tsx`
- [ ] Adicionar prop `initialAtividadesRecentes: EventoCalendario[]` no `DashboardClient`
- [ ] Substituir empty state hardcoded por `<AtividadesRecentesList eventos={initialAtividadesRecentes} />`
- [ ] Substituir `<button>` por `<Link href="/dashboard/calendario">`
- [ ] Criar `components/dashboard/AtividadesRecentesList.tsx`

### Etapa 7 — Testes

- [ ] Criar `__tests__/calendario/normalizar-eventos.test.ts`
- [ ] `npm run test` — verificar 741+ passando

### Etapa 8 — Build final

- [ ] `npm run build` — zero erros TypeScript
- [ ] Validar visualmente: calendário com eventos coloridos, card dashboard com atividades recentes, botão "Ver tudo" navega corretamente, Operador redirecionado

---

## 11. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| `atividades_mao_obra` não existe no banco de produção (tabela criada pós-snapshot) | Usar `IF NOT EXISTS` no índice; fetch retorna vazio via RLS se tabela existir; verificar antes do deploy |
| `date-fns` não está no `package.json` | Verificar antes de usar `formatDistanceToNow`; implementar `tempoRelativo` manual se necessário |
| Volume alto no RSC do dashboard (18 queries + 11 novas) | Janela D-2→hoje é pequena — resultado por tabela < 20 registros tipicamente; `Promise.allSettled` garante que falha individual não bloqueia |
| Filtro local de módulo com `MODULO_CONFIG` fora de sincronia | Teste `__tests__/calendario/tipos.test.ts` verifica cobertura completa dos 11 módulos |
| Joins de `piquetes(pastagem_id)` em `eventos_manejo_pastagem` — Supabase pode inferir array no tipo | Usar `as unknown as { pastagem_id?: string } \| null` conforme padrão documentado no CLAUDE.md §Dashboard Alertas |

---

## 12. Fora do Escopo desta Implementação

Conforme PRD §12:
- Criação de eventos pelo calendário (somente leitura)
- Drag-and-drop
- Exportação iCal
- Notificações push
- Filtro por colaborador/responsável
