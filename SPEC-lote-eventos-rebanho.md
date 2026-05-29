# SPEC — Lançamento em Lote de Eventos de Rebanho

**Versão**: 1.0  
**Data**: 2026-05-29  
**PRD de referência**: `PRD-lote-eventos-rebanho.md`  
**Status**: Pronta para implementação

---

## 1. Decisões de Design

### 1.1 Opção A vs B — Armazenamento dos dados dos novos tipos

**Decisão: Opção B — Colunas dedicadas**

**Justificativa**: O projeto proíbe `any` TypeScript e usa `types/supabase.ts` como fonte de verdade. Com colunas dedicadas, `npm run db:types` gera tipos concretos para `oocitos_coletados`, `grau_qualidade_opu`, etc. — sem casting manual nem `Record<string, unknown>` em produção. CHECK constraints no PostgreSQL espelham as validações Zod (padrão obrigatório do projeto). O argumento de flexibilidade do JSONB perde peso aqui porque os três novos tipos são bem definidos e não se espera variação de schema futura. O impacto de largura em `eventos_rebanho` (append-only) é mínimo.

### 1.2 INSERT múltiplo vs Promise.allSettled

**Decisão: Promise.allSettled (Opção B do PRD)**

**Justificativa**: A feature exige retorno parcial com a lista de brincos que falharam. O volume típico (5–50 animais) não justifica a complexidade de uma transação manual. `Promise.allSettled` isola falhas por animal e preserva os INSERTs bem-sucedidos, alinhado com o padrão de tolerância a falha já adotado no offline sync.

### 1.3 Descarte em lote — UPDATE explícito de status

O trigger `eventos_rebanho_morte_venda_trigger` não trata `descarte` (conforme confirmado no PRD). A Server Action deverá executar, após INSERTs bem-sucedidos de tipo `descarte`, um UPDATE explícito:

```typescript
await supabase
  .from('animais')
  .update({ status: 'Descartado' })
  .in('id', animalIdsInseridos.filter((id) => tipoDescarte))
```

### 1.4 IDB — Abordagem para os novos tipos

**Decisão: expandir a union do `tipo_evento` no schema TypeScript do IDB** ao incrementar para DB_VERSION=3, em vez de usar `| string` como fallback. Os três novos valores (`aspiracao_opu`, `protocolo_hormonal`, `transferencia_embriao`) são conhecidos e devem ser tipados desde o início.

### 1.5 Layout guard — padrão a seguir

O guard desta rota diverge de `relatorios/layout.tsx` (que bloqueia Operador) e segue o padrão do PRD: redireciona qualquer perfil que **não seja** `Administrador` para `/dashboard/rebanho`. Isso inclui Visualizador (que tem acesso ao módulo Rebanho mas não à sub-rota de escrita) e Operador (que seria redirecionado para `/operador` pelo middleware antes de chegar aqui, mas o guard adiciona segurança em profundidade).

---

## 2. Migration SQL

**Arquivo**: `supabase/migrations/YYYYMMDDHHMMSS_lote_eventos_rebanho.sql`

> **Nota crítica**: `ALTER TYPE ADD VALUE` não pode rodar dentro de bloco `BEGIN/COMMIT`. Os três `ALTER TYPE` devem ser os primeiros statements do arquivo, sem bloco de transação ao redor. Ver padrão em `20260502000001_rebanho_fase2_enum.sql`.

```sql
-- Novos valores do enum (fora de transação — comportamento obrigatório do PostgreSQL 13+)
ALTER TYPE public.tipo_evento_rebanho ADD VALUE IF NOT EXISTS 'aspiracao_opu';
ALTER TYPE public.tipo_evento_rebanho ADD VALUE IF NOT EXISTS 'protocolo_hormonal';
ALTER TYPE public.tipo_evento_rebanho ADD VALUE IF NOT EXISTS 'transferencia_embriao';

-- Colunas dedicadas para os novos tipos (Opção B)
ALTER TABLE public.eventos_rebanho
  ADD COLUMN IF NOT EXISTS oocitos_coletados       INT NULL
    CHECK (oocitos_coletados IS NULL OR oocitos_coletados >= 0),
  ADD COLUMN IF NOT EXISTS oocitos_viaveis          INT NULL
    CHECK (oocitos_viaveis IS NULL OR oocitos_viaveis >= 0),
  ADD COLUMN IF NOT EXISTS grau_qualidade_opu       TEXT NULL
    CHECK (grau_qualidade_opu IS NULL OR grau_qualidade_opu IN ('I','II','III','IV')),
  ADD COLUMN IF NOT EXISTS produto_hormonal         TEXT NULL,
  ADD COLUMN IF NOT EXISTS dose_produto             TEXT NULL,
  ADD COLUMN IF NOT EXISTS via_aplicacao            TEXT NULL
    CHECK (via_aplicacao IS NULL OR via_aplicacao IN ('IM','IV','SC','SL')),
  ADD COLUMN IF NOT EXISTS finalidade_protocolo     TEXT NULL
    CHECK (finalidade_protocolo IS NULL OR finalidade_protocolo IN
      ('pre_iatf','pre_te','monta_natural','sincronizacao_receptoras')),
  ADD COLUMN IF NOT EXISTS grau_embriao             INT NULL
    CHECK (grau_embriao IS NULL OR grau_embriao BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS raca_embriao             TEXT NULL,
  ADD COLUMN IF NOT EXISTS resultado_te             TEXT NULL
    CHECK (resultado_te IS NULL OR resultado_te IN ('transferido','nao_transferido'));

-- Recriar a view para garantir que ela reflete a nova estrutura da tabela
-- (a view usa CREATE OR REPLACE, mas ADD COLUMN pode invalidar o cache)
CREATE OR REPLACE VIEW public.vw_animais_completos
  WITH (security_invoker = true)
AS
  SELECT * FROM public.vw_animais_completos;
-- IMPORTANTE: substituir pela definição completa da view em
-- 20260525000001_vw_animais_completos.sql antes de executar em produção.
```

> **Ação pós-migration**: `npm run db:types` (requer `SUPABASE_PROJECT_ID`)

> **Risco pesagem**: `pesos_animal` tem UNIQUE `(animal_id, data_pesagem)`. Na Server Action de `pesagem`, usar `upsert` com `onConflict: 'animal_id,data_pesagem'` para evitar falha quando o animal já tem pesagem na mesma data.

---

## 3. Novos arquivos a criar

```
lib/
├── types/
│   └── rebanho-lote.ts
├── validations/
│   └── rebanho-lote.ts
└── supabase/
    └── rebanho-lote.ts

app/dashboard/rebanho/eventos/lote/
├── actions.ts
└── novo/
    ├── layout.tsx
    ├── page.tsx
    └── EventosLoteClient.tsx

components/rebanho/lote/
└── CamposCompartilhados.tsx

__tests__/rebanho/
└── lote-eventos.test.ts
```

**Arquivos existentes a modificar** (cirúrgico — sem reescritas):
- `lib/db/localDb.ts` — DB_VERSION 2→3, expandir union `tipo_evento`
- `components/rebanho/reproducao/EventosListagem.tsx` — adicionar 3 tipos ao map e filtro
- `app/dashboard/rebanho/RebanhoClient.tsx` — botão "Lançamento em Lote" no header

---

## 4. `lib/types/rebanho-lote.ts`

```typescript
import type { Database } from '@/types/supabase';

// Alias conveniente do enum gerado pelo banco
export type TipoEventoRebanho =
  Database['public']['Enums']['tipo_evento_rebanho'];

// Tipos suportados no lote (exclui nascimento, morte, venda, parto)
export const TIPOS_EVENTO_LOTE = [
  'pesagem',
  'cobertura',
  'diagnostico_prenhez',
  'transferencia_lote',
  'secagem',
  'aborto',
  'descarte',
  'desmame',
  'aspiracao_opu',
  'protocolo_hormonal',
  'transferencia_embriao',
] as const satisfies ReadonlyArray<TipoEventoRebanho>;

export type TipoEventoLote = (typeof TIPOS_EVENTO_LOTE)[number];

export const LABEL_TIPO_EVENTO: Record<TipoEventoLote, string> = {
  pesagem: 'Pesagem',
  cobertura: 'Cobertura',
  diagnostico_prenhez: 'Diagnóstico de Prenhez',
  transferencia_lote: 'Transferência de Lote',
  secagem: 'Secagem',
  aborto: 'Aborto',
  descarte: 'Descarte',
  desmame: 'Desmame',
  aspiracao_opu: 'Aspiração / OPU',
  protocolo_hormonal: 'Protocolo Hormonal',
  transferencia_embriao: 'Transferência de Embrião',
};

// Animal como aparece nas listas do wizard
export interface AnimalParaLote {
  id: string;
  brinco: string;
  nome: string | null;
  sexo: 'Macho' | 'Fêmea';
  categoria: string;
  lote_id: string | null;
  lote_nome: string | null; // join com lotes
  peso_atual: number | null;
}

// Estado interno do wizard
export type WizardStep = 1 | 2 | 3;

export interface WizardState {
  step: WizardStep;
  tipo: TipoEventoLote | null;
  dadosCompartilhados: Record<string, unknown>;
  animaisSelecionados: AnimalParaLote[];
  dadosIndividuais: Record<string, Record<string, unknown>>; // animal_id → campos
}

// Retorno da Server Action
export interface ResultadoLote {
  inseridos: number;
  erros: Array<{ animal_id: string; brinco: string; motivo: string }>;
}
```

---

## 5. `lib/validations/rebanho-lote.ts`

Definir um schema por tipo de evento. O schema de entrada da Server Action é um discriminated union.

```typescript
import { z } from 'zod';

const dataEventoSchema = z.string().refine((val) => {
  const d = new Date(val);
  return !isNaN(d.getTime()) && d <= new Date();
}, 'Data inválida ou futura');

const animalIdSchema = z.string().uuid('animal_id deve ser UUID válido');

// ── Compartilhados por tipo ──────────────────────────────────────────────────

export const dadosCompartilhadosPorTipo = {
  pesagem: z.object({ data_evento: dataEventoSchema }),
  cobertura: z.object({
    data_evento: dataEventoSchema,
    tipo_cobertura: z.enum(['monta_natural','ia_convencional','iatf','tetf','fiv','repasse']),
  }),
  diagnostico_prenhez: z.object({
    data_evento: dataEventoSchema,
    metodo_diagnostico: z.enum(['palpacao','ultrassom','sangue']),
  }),
  transferencia_lote: z.object({
    data_evento: dataEventoSchema,
    lote_id_destino: z.string().uuid('Lote de destino obrigatório'),
  }),
  secagem: z.object({ data_evento: dataEventoSchema }),
  aborto: z.object({ data_evento: dataEventoSchema }),
  descarte: z.object({
    data_evento: dataEventoSchema,
    motivo_descarte: z.enum(['idade','reprodutivo','sanitario','producao','aprumos','outro']),
  }),
  desmame: z.object({ data_evento: dataEventoSchema }),
  aspiracao_opu: z.object({ data_evento: dataEventoSchema }),
  protocolo_hormonal: z.object({
    data_evento: dataEventoSchema,
    finalidade_protocolo: z.enum(['pre_iatf','pre_te','monta_natural','sincronizacao_receptoras']),
    produto_hormonal: z.string().max(255).optional().nullable(),
    dose_produto: z.string().max(100).optional().nullable(),
    via_aplicacao: z.enum(['IM','IV','SC','SL']).optional().nullable(),
  }),
  transferencia_embriao: z.object({ data_evento: dataEventoSchema }),
} as const;

// ── Individuais por tipo ─────────────────────────────────────────────────────

export const dadosIndividuaisPorTipo = {
  pesagem: z.object({
    peso_kg: z.coerce.number().positive('Peso deve ser > 0').max(2000),
    escore_condicao_corporal: z.coerce.number().min(1).max(5).step(0.5).optional().nullable(),
  }),
  cobertura: z.object({
    reprodutor_id: z.string().uuid().optional().nullable(),
    observacoes: z.string().max(1000).optional().nullable(),
  }),
  diagnostico_prenhez: z.object({
    resultado_prenhez: z.enum(['positivo','negativo','duvidoso']),
    idade_gestacional_dias: z.coerce.number().int().min(0).max(300).optional().nullable(),
    observacoes: z.string().max(1000).optional().nullable(),
  }),
  transferencia_lote: z.object({}), // sem campos individuais
  secagem: z.object({
    observacoes: z.string().max(1000).optional().nullable(),
  }),
  aborto: z.object({
    causa_aborto: z.string().max(500).optional().nullable(),
    observacoes: z.string().max(1000).optional().nullable(),
  }),
  descarte: z.object({
    observacoes: z.string().max(1000).optional().nullable(),
  }),
  desmame: z.object({
    peso_kg: z.coerce.number().positive().max(2000).optional().nullable(),
    observacoes: z.string().max(1000).optional().nullable(),
  }),
  aspiracao_opu: z.object({
    oocitos_coletados: z.coerce.number().int().min(0).optional().nullable(),
    oocitos_viaveis: z.coerce.number().int().min(0).optional().nullable(),
    grau_qualidade_opu: z.enum(['I','II','III','IV']).optional().nullable(),
    observacoes: z.string().max(1000).optional().nullable(),
  }).refine((d) => {
    if (d.oocitos_coletados != null && d.oocitos_viaveis != null) {
      return d.oocitos_viaveis <= d.oocitos_coletados;
    }
    return true;
  }, { message: 'Viáveis não pode exceder coletados', path: ['oocitos_viaveis'] }),
  protocolo_hormonal: z.object({
    observacoes: z.string().max(1000).optional().nullable(),
  }),
  transferencia_embriao: z.object({
    grau_embriao: z.coerce.number().int().min(1).max(4).optional().nullable(),
    raca_embriao: z.string().max(255).optional().nullable(),
    reprodutor_id: z.string().uuid().optional().nullable(),
    resultado_te: z.enum(['transferido','nao_transferido']).optional().nullable(),
    observacoes: z.string().max(1000).optional().nullable(),
  }),
} as const;

// ── Schema da Server Action ──────────────────────────────────────────────────

const animalEntradaSchema = z.object({
  animal_id: animalIdSchema,
  dados_individuais: z.record(z.unknown()),
});

export const criarEventosLoteSchema = z.object({
  tipo: z.enum([
    'pesagem','cobertura','diagnostico_prenhez','transferencia_lote',
    'secagem','aborto','descarte','desmame',
    'aspiracao_opu','protocolo_hormonal','transferencia_embriao',
  ] as const),
  dados_compartilhados: z.record(z.unknown()),
  animais: z.array(animalEntradaSchema).min(1, 'Selecione pelo menos 1 animal'),
});

export type CriarEventosLoteInput = z.infer<typeof criarEventosLoteSchema>;
```

---

## 6. `lib/supabase/rebanho-lote.ts`

```typescript
'use server';

import { createSupabaseServerClient } from './server';
import type { AnimalParaLote } from '@/lib/types/rebanho-lote';

export async function listAnimaisAtivosParaLote(): Promise<AnimalParaLote[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('animais')
    .select('id, brinco, nome, sexo, categoria, lote_id, peso_atual, lotes(nome)')
    .eq('status', 'Ativo')
    .is('deleted_at', null)
    .order('brinco', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((a) => ({
    id: a.id,
    brinco: a.brinco,
    nome: a.nome,
    sexo: a.sexo as 'Macho' | 'Fêmea',
    categoria: a.categoria,
    lote_id: a.lote_id,
    lote_nome: (a.lotes as unknown as { nome: string } | null)?.nome ?? null,
    peso_atual: a.peso_atual,
  }));
}
```

> **Nota join**: Supabase JS infere `lotes` como array mesmo sendo many-to-one. Usar `as unknown as { nome: string } | null` (padrão já estabelecido em `alertas-helpers.ts` e `dashboard/page.tsx`).

---

## 7. `app/dashboard/rebanho/eventos/lote/actions.ts`

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sou_admin, getCurrentUserId } from '@/lib/auth/helpers';
import { criarEventosLoteSchema } from '@/lib/validations/rebanho-lote';
import type { ResultadoLote } from '@/lib/types/rebanho-lote';
import type { Database } from '@/types/supabase';
import { z } from 'zod';

type TipoEventoRebanho = Database['public']['Enums']['tipo_evento_rebanho'];

export async function criarEventosLoteAction(
  input: unknown
): Promise<{ success: boolean; data?: ResultadoLote; error?: string }> {
  try {
    const isAdmin = await sou_admin();
    if (!isAdmin) {
      return { success: false, error: 'Apenas administradores podem realizar lançamentos em lote.' };
    }

    const parsed = criarEventosLoteSchema.parse(input);
    const usuarioId = await getCurrentUserId();
    const supabase = await createSupabaseServerClient();

    const tipo = parsed.tipo as TipoEventoRebanho;
    const compartilhados = parsed.dados_compartilhados;

    const inseridos: string[] = [];
    const erros: ResultadoLote['erros'] = [];

    // Buscar brincos para mensagens de erro
    const { data: animaisInfo } = await supabase
      .from('animais')
      .select('id, brinco')
      .in('id', parsed.animais.map((a) => a.animal_id));

    const brincoPorId = new Map(
      (animaisInfo ?? []).map((a) => [a.id, a.brinco])
    );

    const results = await Promise.allSettled(
      parsed.animais.map(async (entrada) => {
        const ind = entrada.dados_individuais;
        const payload: Record<string, unknown> = {
          animal_id: entrada.animal_id,
          tipo,
          usuario_id: usuarioId,
          // fazenda_id NÃO incluído — trigger set_eventos_rebanho_fazenda_id_trigger preenche
          data_evento: compartilhados['data_evento'],
          observacoes: ind['observacoes'] ?? null,
          // Campos por tipo
          ...(tipo === 'pesagem' && {
            peso_kg: ind['peso_kg'],
            escore_condicao_corporal: ind['escore_condicao_corporal'] ?? null,
          }),
          ...(tipo === 'cobertura' && {
            tipo_cobertura: compartilhados['tipo_cobertura'],
            reprodutor_id: ind['reprodutor_id'] ?? null,
          }),
          ...(tipo === 'diagnostico_prenhez' && {
            metodo_diagnostico: compartilhados['metodo_diagnostico'],
            resultado_prenhez: ind['resultado_prenhez'],
            idade_gestacional_dias: ind['idade_gestacional_dias'] ?? null,
          }),
          ...(tipo === 'transferencia_lote' && {
            lote_id_destino: compartilhados['lote_id_destino'],
          }),
          ...(tipo === 'aborto' && {
            causa_aborto: ind['causa_aborto'] ?? null,
          }),
          ...(tipo === 'descarte' && {
            motivo_descarte: compartilhados['motivo_descarte'],
          }),
          ...(tipo === 'desmame' && {
            peso_kg: ind['peso_kg'] ?? null,
          }),
          ...(tipo === 'aspiracao_opu' && {
            oocitos_coletados: ind['oocitos_coletados'] ?? null,
            oocitos_viaveis: ind['oocitos_viaveis'] ?? null,
            grau_qualidade_opu: ind['grau_qualidade_opu'] ?? null,
          }),
          ...(tipo === 'protocolo_hormonal' && {
            finalidade_protocolo: compartilhados['finalidade_protocolo'],
            produto_hormonal: compartilhados['produto_hormonal'] ?? null,
            dose_produto: compartilhados['dose_produto'] ?? null,
            via_aplicacao: compartilhados['via_aplicacao'] ?? null,
          }),
          ...(tipo === 'transferencia_embriao' && {
            grau_embriao: ind['grau_embriao'] ?? null,
            raca_embriao: ind['raca_embriao'] ?? null,
            reprodutor_id: ind['reprodutor_id'] ?? null,
            resultado_te: ind['resultado_te'] ?? null,
          }),
        };

        // Pesagem: upsert para lidar com UNIQUE (animal_id, data_pesagem)
        if (tipo === 'pesagem') {
          const { error } = await supabase
            .from('eventos_rebanho')
            .upsert(payload as Parameters<typeof supabase.from>[0] extends 'eventos_rebanho' ? never : never, { onConflict: 'animal_id,data_evento' });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('eventos_rebanho')
            .insert(payload as Parameters<typeof supabase.from>[0] extends 'eventos_rebanho' ? never : never);
          if (error) throw error;
        }

        return entrada.animal_id;
      })
    );

    for (const [i, result] of results.entries()) {
      const animalId = parsed.animais[i].animal_id;
      if (result.status === 'fulfilled') {
        inseridos.push(animalId);
      } else {
        erros.push({
          animal_id: animalId,
          brinco: brincoPorId.get(animalId) ?? animalId,
          motivo: 'Erro ao registrar evento',
        });
      }
    }

    // UPDATE explícito de status para descarte (trigger não trata este tipo)
    if (tipo === 'descarte' && inseridos.length > 0) {
      await supabase
        .from('animais')
        .update({ status: 'Descartado' })
        .in('id', inseridos);
    }

    revalidatePath('/dashboard/rebanho');
    revalidatePath('/dashboard/rebanho/[id]', 'page');
    revalidatePath('/dashboard/rebanho/reproducao/eventos');

    return { success: true, data: { inseridos: inseridos.length, erros } };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: 'Dados inválidos' };
    }
    return { success: false, error: 'Erro ao processar lançamento em lote' };
  }
}
```

> **Nota sobre o upsert de pesagem**: o `UNIQUE` relevante em `pesos_animal` (não em `eventos_rebanho`) é gerenciado pelo trigger `eventos_rebanho_pesagem_trigger`. A Server Action deve usar INSERT padrão em `eventos_rebanho`; o trigger que insere em `pesos_animal` já lida com o upsert internamente. Verificar o corpo do trigger antes da implementação final.

---

## 8. `app/dashboard/rebanho/eventos/lote/novo/layout.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

export default function LoteEventosLayout({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && profile?.perfil !== 'Administrador') {
      toast.error('Acesso restrito a Administradores.');
      router.replace('/dashboard/rebanho');
    }
  }, [isLoading, profile, router]);

  if (isLoading || profile?.perfil !== 'Administrador') return null;
  return <>{children}</>;
}
```

> **Diferença do padrão geral**: redireciona para `/dashboard/rebanho` (não `/dashboard`). Usa `isLoading` (não `loading`) — verificar nome real do campo em `AuthProvider.tsx` antes da implementação. O campo em `useAuth()` é `isLoading` conforme os outros layout guards do projeto.

---

## 9. `app/dashboard/rebanho/eventos/lote/novo/page.tsx`

```typescript
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listAnimaisAtivosParaLote } from '@/lib/supabase/rebanho-lote';
import { listLotes } from '@/lib/supabase/rebanho';
import { EventosLoteClient } from './EventosLoteClient';

export const metadata = { title: 'Lançamento em Lote | GestSilo' };

export default async function LoteEventosPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');

  const [animais, lotes] = await Promise.all([
    listAnimaisAtivosParaLote(),
    listLotes(500, 0),
  ]);

  return <EventosLoteClient animais={animais} lotes={lotes} />;
}
```

---

## 10. `app/dashboard/rebanho/eventos/lote/novo/EventosLoteClient.tsx`

### Props e estado

```typescript
'use client';

interface Props {
  animais: AnimalParaLote[];
  lotes: Lote[];
}

export function EventosLoteClient({ animais, lotes }: Props) {
  // Estado do wizard
  const [step, setStep] = useState<WizardStep>(1);
  const [tipo, setTipo] = useState<TipoEventoLote | null>(null);
  const [animaisSelecionados, setAnimaisSelecionados] = useState<AnimalParaLote[]>([]);
  const [dadosIndividuais, setDadosIndividuais] =
    useState<Record<string, Record<string, unknown>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errosDialog, setErrosDialog] = useState<ResultadoLote['erros'] | null>(null);

  // form do step 1 (react-hook-form)
  const form = useForm({ ... });
  // ...
}
```

### Etapa 1 — Configurar o Evento

- `<Select>` com todos os 11 tipos de `TIPOS_EVENTO_LOTE`, labels de `LABEL_TIPO_EVENTO`
- Ao mudar tipo: `form.reset()` preservando `data_evento`, zera `animaisSelecionados` e `dadosIndividuais`
- `<CamposCompartilhados tipo={tipo} form={form} lotes={lotes} />`
- Date picker nativo `<input type="date" max={today}>` — não permite data futura
- Botão "Próximo": `disabled={!tipo || !form.formState.isValid}`
- Warning visual âmbar para `transferencia_lote`: `"Todos os animais selecionados serão movidos para o lote de destino."`

### Etapa 2 — Selecionar Animais

**Filtros client-side** (sem re-fetch):
- Select de lote (`lote_id`)
- Select de categoria (derivado de `animais`)
- Select de sexo (`Macho` / `Fêmea`)
- Input de busca por brinco/nome — debounce 300ms via `useCallback` com `setTimeout`/`clearTimeout` (sem dependência externa, padrão `useInsumos.ts`)

**Lista de animais**:
```typescript
const animaisFiltrados = useMemo(() => {
  return animais.filter((a) => {
    if (filtroLote && a.lote_id !== filtroLote) return false;
    if (filtroCategoria && a.categoria !== filtroCategoria) return false;
    if (filtroSexo && a.sexo !== filtroSexo) return false;
    if (termoBusca) {
      const t = termoBusca.toLowerCase();
      return a.brinco.toLowerCase().includes(t) || (a.nome ?? '').toLowerCase().includes(t);
    }
    return true;
  });
}, [animais, filtroLote, filtroCategoria, filtroSexo, termoBusca]);
```

**Seleção**:
- Checkbox por linha
- "Selecionar todos os filtrados": adiciona `animaisFiltrados` ao Set de selecionados (sem duplicatas)
- "Limpar seleção": esvazia o Set
- Contador fixo no rodapé: `"N animais selecionados"`
- Botão "Próximo": `disabled={animaisSelecionados.length === 0}`
- Botão "Voltar": retorna ao Step 1, preserva tipo e dados compartilhados do form

**Colunas exibidas**: brinco, nome, categoria, lote atual

### Etapa 3 — Dados Individuais

**Tabela**:
- `overflow-x-auto` no container
- Colunas fixas: Brinco (read-only), Nome (read-only)
- Colunas variáveis: determinadas por tipo (ver seção 3.2 do PRD)
- Células editáveis: `<input className="h-9 min-w-[120px] text-sm ...">` (numéricos `min-w-[80px]`)
- Campos obrigatórios vazios: `border-amber-500` + ícone `AlertCircle` Lucide pequeno
- Valores inválidos: `border-destructive`

**Preenchimento em cascata**:
- Ao digitar na primeira linha de qualquer coluna editável: aparece botão `<CopyCheck className="h-3 w-3">` com `title="Aplicar a todos"`
- Ao clicar: preenche todas as linhas abaixo com o valor da linha 0 naquela coluna
- Botão `text-xs`, ao lado do label no `<thead>`

**Navegação por teclado**:
- `onKeyDown` nos inputs:
  - Tab/Shift+Tab: comportamento padrão do browser (foca próximo/anterior)
  - Enter: `e.preventDefault()` + focar mesmo campo-coluna na próxima linha via `refs` ou `id` previsível

**Contador**:
```typescript
const animaisCompletos = useMemo(() => {
  return animaisSelecionados.filter((a) => linhaValida(a.id, tipo, dadosIndividuais)).length;
}, [animaisSelecionados, tipo, dadosIndividuais]);
```
Rodapé: `"X de Y animais preenchidos"`

**Botão "Confirmar e Salvar"**:
- Sempre visível/habilitado (sem linhas completas = warning antes de confirmar)
- Loading state: `isSubmitting`
- Se `animaisCompletos < animaisSelecionados.length`:
  ```
  Modal de confirmação:
  "Y de N animais têm dados incompletos.
   Deseja salvar apenas os X animais com dados válidos?"
  Botões: Cancelar | Salvar X animais
  ```
- Ao confirmar: filtra apenas animais com linha válida, chama `criarEventosLoteAction`

**Feedback pós-submit** (toast via Sonner):
```typescript
// Sucesso total
toast.success(`${inseridos} eventos registrados com sucesso.`);
router.push('/dashboard/rebanho');

// Sucesso parcial
toast.warning(`${inseridos} eventos registrados. ${erros.length} falharam.`);
setErrosDialog(erros); // abre dialog com lista de brincos

// Falha total
toast.error('Nenhum evento foi registrado. Verifique os dados e tente novamente.');
```

**Dialog de erros parciais**:
- Lista os brincos que falharam
- Botão "Fechar" e botão "Ir para o Rebanho"

### Indicador de progresso

Barra de steps no topo: `Step 1 → Step 2 → Step 3` com estado ativo/concluído.
Implementar com `div` + classes Tailwind (sem biblioteca extra).

---

## 11. `components/rebanho/lote/CamposCompartilhados.tsx`

```typescript
'use client';

import type { UseFormReturn } from 'react-hook-form';
import type { TipoEventoLote } from '@/lib/types/rebanho-lote';
import type { Lote } from '@/lib/types/rebanho';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
// demais imports shadcn/ui...

interface Props {
  tipo: TipoEventoLote | null;
  form: UseFormReturn<Record<string, unknown>>;
  lotes: Lote[];
}

export function CamposCompartilhados({ tipo, form, lotes }: Props) {
  if (!tipo) return null;

  // Renderiza campos com Form > FormField > FormItem > FormLabel > FormControl > FormMessage
  // Padrão B obrigatório — nunca <p className="text-destructive">

  switch (tipo) {
    case 'pesagem':
      return (
        // Apenas data_evento — exibido no Step 1 globalmente
        null
      );
    case 'cobertura':
      return (
        <FormField control={form.control} name="tipo_cobertura" render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo de Cobertura</FormLabel>
            <FormControl>
              <Select ... />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      );
    case 'diagnostico_prenhez':
      // método (Select)
    case 'transferencia_lote':
      // lote_id_destino (Select de lotes) + alerta âmbar
    case 'descarte':
      // motivo_descarte (Select)
    case 'protocolo_hormonal':
      // finalidade_protocolo (Select) + produto_hormonal + dose + via_aplicacao
    // demais tipos não têm campos compartilhados além de data_evento
    default:
      return null;
  }
}
```

> **Data do evento**: exibida como campo fixo no topo do Step 1, fora do `CamposCompartilhados`, pois é obrigatória para todos os tipos.

---

## 12. Colunas da Etapa 3 por tipo

| Tipo | Colunas editáveis | Obrigatórias |
|---|---|---|
| `pesagem` | Peso (kg), Escore corporal (1–5) | Peso (kg) |
| `cobertura` | Reprodutor (select), Observações | — |
| `diagnostico_prenhez` | Resultado (positivo/negativo/duvidoso), Idade gestacional (dias), Observações | Resultado |
| `transferencia_lote` | — (todos vão para o mesmo lote) | — |
| `secagem` | Observações | — |
| `aborto` | Causa do aborto, Observações | — |
| `descarte` | Observações | — |
| `desmame` | Peso ao desmame (kg), Observações | — |
| `aspiracao_opu` | Oócitos coletados, Oócitos viáveis, Grau de qualidade (I/II/III/IV), Observações | — |
| `protocolo_hormonal` | Observações | — |
| `transferencia_embriao` | Grau embrião (1–4), Raça embrião, Reprodutor doador (select), Resultado (transferido/não_transferido), Observações | — |

> Para `transferencia_lote`, a Etapa 3 exibe apenas brinco e nome dos animais (sem colunas editáveis). O botão "Confirmar e Salvar" fica imediatamente habilitado.

---

## 13. Atualização `lib/db/localDb.ts`

**DB_VERSION**: incrementar de `2` para `3`.

**Schema do store `eventos_rebanho`** — expandir a union de `tipo_evento`:

```typescript
tipo_evento:
  | 'cobertura'
  | 'diagnostico'
  | 'parto'
  | 'desmame'
  | 'secagem'
  | 'aborto'
  | 'descarte'
  | 'aspiracao_opu'        // NOVO
  | 'protocolo_hormonal'   // NOVO
  | 'transferencia_embriao'; // NOVO
```

**Bloco upgrade**:
```typescript
if (oldVersion < 3) {
  // Nenhuma estrutura nova necessária — apenas a tipagem foi atualizada.
  // Os eventos dos novos tipos serão salvos no store existente 'eventos_rebanho'.
}
```

> O bloco `if (oldVersion < 3)` é necessário mesmo sem criar stores, pois aciona a migration no browser dos usuários existentes.

---

## 14. Atualização `components/rebanho/reproducao/EventosListagem.tsx`

**Mudança 1** — `tipoEventoMap` (linha ~39):

```typescript
const tipoEventoMap: Record<string, string> = {
  cobertura: 'Cobertura',
  diagnostico: 'Diagnóstico',
  diagnostico_prenhez: 'Diagnóstico',
  parto: 'Parto',
  desmame: 'Desmame',
  secagem: 'Secagem',
  aborto: 'Aborto',
  descarte: 'Descarte',
  // ADICIONAR:
  aspiracao_opu: 'Aspiração / OPU',
  protocolo_hormonal: 'Protocolo Hormonal',
  transferencia_embriao: 'Transferência de Embrião',
};
```

**Mudança 2** — `<SelectContent>` do filtro de tipo (linha ~230):

```tsx
<SelectItem value="aspiracao_opu">Aspiração / OPU</SelectItem>
<SelectItem value="protocolo_hormonal">Protocolo Hormonal</SelectItem>
<SelectItem value="transferencia_embriao">Transferência de Embrião</SelectItem>
```

Inserir após o `<SelectItem value="descarte">`.

---

## 15. Atualização `app/dashboard/rebanho/RebanhoClient.tsx`

**Mudança 1** — import (linha ~10):

```typescript
import { Plus, BarChart3, Milk, Scale, Stethoscope, ArrowRightLeft, Beef, Dna, ClipboardList } from 'lucide-react';
```

**Mudança 2** — header existente (linha ~129–142), dentro do `{isAdmin && (...)}`:

```tsx
{isAdmin && (
  <>
    <Button asChild variant="outline">
      <Link href="/dashboard/rebanho/eventos/lote/novo">
        <ClipboardList className="mr-2 h-4 w-4" />
        Lançamento em Lote
      </Link>
    </Button>
    <Button onClick={() => router.push('/dashboard/rebanho/novo')}>
      <Plus className="mr-2 h-4 w-4" />
      Novo Animal
    </Button>
    <Button variant="outline" onClick={() => router.push('/dashboard/rebanho/lotes')}>
      Lotes
    </Button>
  </>
)}
```

> Adicionar `import Link from 'next/link'` se não estiver importado (já está importado — verificar linha 5 do arquivo).

> **Cor do título** `text-[#00A651]` (linha 129): este hardcode é pré-existente. Não alterar — fora do escopo desta feature.

---

## 16. Offline / PWA

A Server Action `criarEventosLoteAction` é uma Server Action padrão do Next.js. O `useOfflineSync` existente em `hooks/useOfflineSync.ts` detecta estado offline antes de qualquer chamada de Server Action e enfileira via o mecanismo da `sync_queue`.

**Comportamento esperado** para um lote de N animais offline:
- N entradas no store `eventos_rebanho` com `_sync_status: 'pending'`
- N entradas na `sync_queue` com `operacao: 'RPC'` e `tabela: 'registrar_evento_com_status'`
- Ao reconectar: `syncAll()` processa na ordem de `timestamp`
- Conflitos por animal detectados individualmente → `_sync_status: 'pendente_revisao'`
- `SyncStatusBar` exibe badge de conflitos conforme padrão existente

**Não requer lógica offline específica** além do DB_VERSION increment já especificado na seção 13.

---

## 17. `__tests__/rebanho/lote-eventos.test.ts`

### Validação Zod (unitários)

```typescript
describe('criarEventosLoteSchema', () => {
  it('rejeita array de animais vazio')
  it('rejeita animal_id com UUID inválido')
  it('rejeita tipo não suportado em lote (morte, venda, parto, nascimento)')
})

describe('dadosIndividuaisPorTipo.pesagem', () => {
  it('rejeita peso_kg = 0')
  it('rejeita peso_kg negativo')
  it('aceita peso_kg = 500 com escore_condicao_corporal = 3.5')
})

describe('dadosIndividuaisPorTipo.cobertura', () => {
  it('aceita sem reprodutor_id (campo opcional)')
})

describe('dadosIndividuaisPorTipo.diagnostico_prenhez', () => {
  it('rejeita resultado_prenhez com valor fora do enum')
  it('aceita resultado_prenhez = "positivo"')
})

describe('dadosIndividuaisPorTipo.aspiracao_opu', () => {
  it('rejeita oocitos_viaveis > oocitos_coletados')
  it('aceita oocitos_viaveis = oocitos_coletados')
  it('aceita ambos null')
})

describe('dadosIndividuaisPorTipo.protocolo_hormonal', () => {
  it('aceita finalidade_protocolo = "pre_iatf" nos compartilhados')
})

describe('dadosIndividuaisPorTipo.transferencia_embriao', () => {
  it('aceita resultado_te = "transferido"')
  it('aceita resultado_te = "nao_transferido"')
  it('aceita resultado_te = null (opcional)')
  it('rejeita resultado_te com valor inválido')
})
```

### Server Action (integração — mock Supabase via vi.mock)

```typescript
describe('criarEventosLoteAction', () => {
  it('retorna erro 403-like quando sou_admin() retorna false')
  it('retorna dados inválidos quando schema Zod falha')
  it('retorna { inseridos: N, erros: [] } quando todos os INSERTs têm sucesso')
  it('retorna { inseridos: N-1, erros: [{ brinco }] } em falha parcial')
  it('executa UPDATE de status=Descartado apenas para tipo=descarte')
  it('não inclui fazenda_id no payload (verificar que chave não existe no objeto)')
  it('chama revalidatePath após sucesso')
})
```

### Lógica de UI (unitários Vitest — funções puras extraídas)

```typescript
describe('cascata "aplicar a todos"', () => {
  it('preenche todas as linhas com valor da linha 0')
  it('não sobrescreve linhas que já têm valor (comportamento esperado — confirmar no PRD)')
})

describe('contador de animais completos', () => {
  it('retorna 0 quando nenhuma linha tem dados obrigatórios')
  it('retorna N quando todas as linhas de pesagem têm peso_kg > 0')
  it('retorna N para tipo=transferencia_lote (sem campos obrigatórios individuais)')
})

describe('filtros da Etapa 2', () => {
  it('filtro por lote_id retorna subset correto')
  it('filtro por sexo retorna apenas Fêmeas')
  it('filtro por categoria retorna subset correto')
  it('busca por brinco parcial retorna match')
  it('busca case-insensitive')
  it('"Selecionar todos os filtrados" não duplica animais já selecionados')
})
```

**Total esperado**: 25–30 casos.

---

## 18. Sequência de implementação

1. **Migration SQL** + `npm run db:types`
2. **`lib/types/rebanho-lote.ts`**
3. **`lib/validations/rebanho-lote.ts`**
4. **`lib/supabase/rebanho-lote.ts`**
5. **`app/dashboard/rebanho/eventos/lote/actions.ts`**
6. **`app/dashboard/rebanho/eventos/lote/novo/layout.tsx`**
7. **`app/dashboard/rebanho/eventos/lote/novo/page.tsx`**
8. **`components/rebanho/lote/CamposCompartilhados.tsx`**
9. **`app/dashboard/rebanho/eventos/lote/novo/EventosLoteClient.tsx`**
10. **`lib/db/localDb.ts`** — DB_VERSION 2→3, expandir union
11. **`components/rebanho/reproducao/EventosListagem.tsx`** — adicionar 3 tipos
12. **`app/dashboard/rebanho/RebanhoClient.tsx`** — botão no header
13. **`__tests__/rebanho/lote-eventos.test.ts`**
14. `npm run test` — garantir 854+ passando
15. `npm run build` — sem erros TypeScript

---

## 19. Checklist de conformidade

- [ ] Nenhum `select('*')` introduzido
- [ ] `fazenda_id` nunca no payload de INSERT
- [ ] Zero `any` — TypeScript strict em todos os arquivos novos
- [ ] Tipografia mínima `text-sm` — sem px/rem inline
- [ ] Cores via CSS vars ou Tailwind semântico — sem hex hardcoded (exceto o title pré-existente em `RebanhoClient.tsx`)
- [ ] `Form > FormField > FormItem > FormLabel > FormControl > FormMessage` em todos os forms
- [ ] Botões com área de toque adequada para mobile (mínimo `h-10` em botões de ação, `h-9` em inputs de tabela)
- [ ] Guard de perfil no `layout.tsx` da nova rota — redireciona para `/dashboard/rebanho`
- [ ] `npm run db:types` executado após migration
- [ ] `npm run test` passando sem novos falhos
- [ ] DB_VERSION incrementado para 3 em `localDb.ts`
- [ ] `vw_animais_completos` recriada após `ALTER TABLE eventos_rebanho`

---

## Apêndice — Confirmação de arquivos lidos

| Arquivo | Linha(s) relevante(s) | Confirmado |
|---|---|---|
| `PRD-lote-eventos-rebanho.md` | Documento completo | ✅ |
| `app/dashboard/relatorios/layout.tsx` | Padrão guard de layout (linhas 1–23) | ✅ |
| `app/dashboard/rebanho/RebanhoClient.tsx` | Header com botões (linhas 129–143), imports (linha 10) | ✅ |
| `app/dashboard/rebanho/page.tsx` | Padrão RSC + Promise.all (linhas 11–34) | ✅ |
| `components/rebanho/reproducao/EventosListagem.tsx` | `tipoEventoMap` (linhas 39–48), `SelectContent` (linhas 230–238) | ✅ |
| `lib/db/localDb.ts` | DB_VERSION=2, union `tipo_evento` (linhas 26–27) | ✅ |
| `lib/auth/helpers.ts` | `sou_admin()`, `getCurrentUserId()` (linhas 9–107) | ✅ |
| `lib/types/rebanho.ts` | `TipoEvento` enum (linhas 23–36) | ✅ |
| `lib/validations/rebanho.ts` | Padrão schema Zod existente (linhas 1–80) | ✅ |
| `app/dashboard/rebanho/corte/actions.ts` | Padrão Server Action com `Promise.allSettled` e `registrarPesagemLoteAction` (linhas 1–64) | ✅ |
