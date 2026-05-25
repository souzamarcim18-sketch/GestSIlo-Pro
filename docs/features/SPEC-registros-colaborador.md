# SPEC — Rastreabilidade de Colaboradores em Operações Agrícolas

**Data:** 2026-05-22  
**Status:** Pronto para implementação  
**Baseado em:** PRD-registros-colaborador.md

---

## Decisões de design adotadas

### `entrada_silo` + `fechamento_silo` → fundidos em `cadastro_silo`
Ambos os eventos ocorrem no mesmo ato (`SiloForm`, `mode='create'`). Exigir dois campos "colaborador" no mesmo formulário seria confuso. O `referencia_id` aponta para `silos.id` — entidade principal com significado direto para o usuário. O `CHECK` da tabela terá 4 valores (não 5).

### `AtividadeDialog` — Server Action auxiliar
O formulário de talhões usa `queries-audit.ts` (cliente anônimo do browser). A solução é criar `vincularColaboradorAction` — uma Server Action `'use server'` que o Client Component chama após o `q.atividadesCampo.create()`. Sem migrar o formulário para Server Action.

### Múltiplos animais em eventos sanitários
Quando N eventos são criados em paralelo, o mesmo `colaborador_id` é vinculado a todos via `Promise.all` na Server Action.

### `deletarEventoSanitario` é soft delete
A função em `lib/supabase/rebanho-sanitario.ts` faz `UPDATE deleted_at`. O `registro_colaborador` usa hard delete — ao deletar o evento (soft), o vínculo de colaborador some. Comportamento correto: se o evento está "deletado", a rastreabilidade desse evento não é exibida.

---

## Camada 1 — Banco de dados (migration)

### 1.1 Criar tabela

```sql
CREATE TABLE registros_colaborador (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id  uuid        NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  referencia_tipo text        NOT NULL,
  referencia_id   uuid        NOT NULL,
  fazenda_id      uuid        NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_referencia_tipo CHECK (
    referencia_tipo IN (
      'atividade_campo',
      'cadastro_silo',
      'evento_manejo_pastagem',
      'evento_sanitario'
    )
  )
);
```

### 1.2 Índices

```sql
CREATE INDEX idx_registros_colaborador_fazenda
  ON registros_colaborador(fazenda_id);

CREATE INDEX idx_registros_colaborador_ref
  ON registros_colaborador(referencia_tipo, referencia_id);

CREATE INDEX idx_registros_colaborador_colaborador
  ON registros_colaborador(colaborador_id);
```

### 1.3 RLS

```sql
ALTER TABLE registros_colaborador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rc_select"
  ON registros_colaborador FOR SELECT
  USING (sou_admin_ou_visualizador() AND fazenda_id = get_minha_fazenda_id());

CREATE POLICY "rc_insert"
  ON registros_colaborador FOR INSERT
  WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

CREATE POLICY "rc_delete"
  ON registros_colaborador FOR DELETE
  USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());
```

### 1.4 Trigger de `fazenda_id`

O trigger `set_fazenda_id` já existe e é aplicado por nome de tabela. Verificar se a migration precisa registrá-lo explicitamente para `registros_colaborador` ou se ele é aplicado automaticamente via `BEFORE INSERT ON *`. Confirmar com `database-snapshot.md` atualizado após execução.

> Se o trigger não se aplicar automaticamente, adicionar:
> ```sql
> CREATE TRIGGER set_fazenda_id_registros_colaborador
>   BEFORE INSERT ON registros_colaborador
>   FOR EACH ROW EXECUTE FUNCTION set_fazenda_id();
> ```

### 1.5 Após executar a migration

```bash
npm run db:types
```

---

## Camada 2 — Tipos TypeScript

### Arquivo: `lib/types/registros-colaborador.ts` (novo)

```typescript
export type ReferenciaTipo =
  | 'atividade_campo'
  | 'cadastro_silo'
  | 'evento_manejo_pastagem'
  | 'evento_sanitario';

export interface RegistroColaborador {
  id: string;
  colaborador_id: string;
  referencia_tipo: ReferenciaTipo;
  referencia_id: string;
  fazenda_id: string;
  created_at: string;
}

export interface ColaboradorResumidoSelect {
  id: string;
  nome: string;
  funcao: string;
}
```

---

## Camada 3 — Funções utilitárias

### Arquivo: `lib/supabase/registros-colaborador.ts` (novo)

```typescript
'use server';

import { createSupabaseServerClient } from './server';
import type { ReferenciaTipo } from '@/lib/types/registros-colaborador';

const COLS = 'id, colaborador_id, referencia_tipo, referencia_id, fazenda_id, created_at';

/**
 * Vincula ou troca o colaborador de uma operação.
 * - colaboradorId = string → DELETE anterior (se existir) + INSERT novo
 * - colaboradorId = null → apenas DELETE (remove vínculo)
 * Falhas não lançam exceção — são logadas. A operação pai já foi persistida.
 */
export async function upsertRegistroColaborador(
  tipo: ReferenciaTipo,
  referenciaId: string,
  colaboradorId: string | null,
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // Sempre remove o vínculo anterior (idempotente)
  const { error: deleteError } = await supabase
    .from('registros_colaborador')
    .delete()
    .eq('referencia_tipo', tipo)
    .eq('referencia_id', referenciaId);

  if (deleteError) {
    console.error('[registros_colaborador] Erro ao remover vínculo anterior:', deleteError);
  }

  if (!colaboradorId) return;

  const { error: insertError } = await supabase
    .from('registros_colaborador')
    .insert({
      colaborador_id: colaboradorId,
      referencia_tipo: tipo,
      referencia_id: referenciaId,
    });

  if (insertError) {
    console.error('[registros_colaborador] Erro ao inserir vínculo:', insertError);
  }
}

/**
 * Remove o vínculo de colaborador de uma operação.
 * Chamado ao deletar a operação pai. Falhas são logadas, nunca lançadas.
 */
export async function deleteRegistroColaborador(
  tipo: ReferenciaTipo,
  referenciaId: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('registros_colaborador')
    .delete()
    .eq('referencia_tipo', tipo)
    .eq('referencia_id', referenciaId);

  if (error) {
    console.error('[registros_colaborador] Erro ao limpar vínculo:', error);
  }
}

/**
 * Retorna o colaborador_id vinculado a uma operação, ou null se não houver.
 * Usado para pré-popular o select em formulários de edição.
 */
export async function getColaboradorDaOperacao(
  tipo: ReferenciaTipo,
  referenciaId: string,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('registros_colaborador')
    .select('colaborador_id')
    .eq('referencia_tipo', tipo)
    .eq('referencia_id', referenciaId)
    .maybeSingle();

  return data?.colaborador_id ?? null;
}

/**
 * Lista colaboradores ativos da fazenda para popular selects.
 * Reutiliza RLS de `colaboradores` (fazenda_id via JWT).
 */
export async function listColaboradoresAtivosParaSelect(): Promise<
  { id: string; nome: string; funcao: string }[]
> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nome, funcao')
    .eq('ativo', true)
    .order('nome');

  if (error) {
    console.error('[registros_colaborador] Erro ao listar colaboradores:', error);
    return [];
  }

  return data ?? [];
}
```

---

## Camada 4 — Server Actions auxiliares

### 4.1 `app/dashboard/talhoes/actions.ts` (novo arquivo)

Talhões não tem `actions.ts` hoje. Criar apenas com a função auxiliar necessária.

```typescript
'use server';

import { upsertRegistroColaborador } from '@/lib/supabase/registros-colaborador';

/**
 * Vincula colaborador a uma atividade de campo.
 * Chamado do Client Component AtividadeDialog após q.atividadesCampo.create().
 * Falhas internas são logadas — nunca propagadas para o usuário.
 */
export async function vincularColaboradorAtividadeAction(
  atividadeId: string,
  colaboradorId: string | null,
): Promise<void> {
  if (!colaboradorId) return;
  await upsertRegistroColaborador('atividade_campo', atividadeId, colaboradorId);
}
```

### 4.2 `app/dashboard/silos/actions.ts` (novo arquivo)

Silos também não tem `actions.ts`. Criar com a função auxiliar:

```typescript
'use server';

import { upsertRegistroColaborador } from '@/lib/supabase/registros-colaborador';

/**
 * Vincula colaborador ao cadastro de um silo.
 * Chamado do Client Component SiloForm após q.silos.create().
 */
export async function vincularColaboradorSiloAction(
  siloId: string,
  colaboradorId: string | null,
): Promise<void> {
  if (!colaboradorId) return;
  await upsertRegistroColaborador('cadastro_silo', siloId, colaboradorId);
}
```

---

## Camada 5 — Componente reutilizável

### Arquivo: `components/ColaboradorSelect.tsx` (novo)

Componente `'use client'` para ser usado em qualquer formulário. Carrega colaboradores via Server Action na montagem.

```typescript
'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listColaboradoresAtivosParaSelect } from '@/lib/supabase/registros-colaborador';

interface ColaboradorSelectProps {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  disabled?: boolean;
}

export function ColaboradorSelect({ value, onChange, disabled }: ColaboradorSelectProps) {
  const [colaboradores, setColaboradores] = useState<{ id: string; nome: string; funcao: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listColaboradoresAtivosParaSelect()
      .then(setColaboradores)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Select
      value={value ?? '__none__'}
      onValueChange={(v) => onChange(v === '__none__' ? undefined : v)}
      disabled={disabled || loading}
    >
      <SelectTrigger>
        <SelectValue placeholder={loading ? 'Carregando...' : 'Colaborador responsável (opcional)'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Nenhum</SelectItem>
        {colaboradores.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.nome} — {c.funcao}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

**Nota sobre `__none__`:** O `Select` do shadcn/ui não aceita `value=""` ou `value={undefined}` bem — usa sentinel `'__none__'` para representar "sem seleção", convertido para `undefined` no `onChange`.

---

## Camada 6 — Modificações em formulários e actions existentes

### 6.1 `EventoManejoForm.tsx` — Pastagens

**Arquivo:** `app/dashboard/pastagens/components/EventoManejoForm.tsx`

Adicionar campo `colaborador_id` ao schema do formulário e ao payload enviado para a action.

**Mudança no formulário (trecho após `observacoes`):**
```tsx
// Adicionar import
import { ColaboradorSelect } from '@/components/ColaboradorSelect';

// Adicionar campo ao defaultValues:
colaborador_id: undefined,

// Adicionar campo no JSX (antes do botão submit):
<FormField
  control={form.control}
  name="colaborador_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel className="text-sm text-muted-foreground">Colaborador responsável</FormLabel>
      <FormControl>
        <ColaboradorSelect
          value={field.value}
          onChange={field.onChange}
        />
      </FormControl>
    </FormItem>
  )}
/>
```

**Schema Zod** (`lib/validations/pastagens.ts`) — adicionar ao `eventoManejoFormSchema`:
```typescript
colaborador_id: z.string().uuid().optional(),
```

**Tipo** `EventoManejoFormData` recebe o campo opcional.

### 6.2 `registrarEventoManejoAction` — Pastagens

**Arquivo:** `app/dashboard/pastagens/actions.ts`

```typescript
// Adicionar import
import { upsertRegistroColaborador } from '@/lib/supabase/registros-colaborador';

export async function registrarEventoManejoAction(formData: unknown): Promise<ActionResult> {
  try {
    const parsed = eventoManejoFormSchema.parse(formData);

    // ... validações existentes ...

    const evento = await createEventoManejo({ /* payload sem colaborador_id */ });

    // ... atualização de status do piquete ...

    // Vínculo de colaborador (secundário — não bloqueia sucesso)
    if (parsed.colaborador_id) {
      await upsertRegistroColaborador('evento_manejo_pastagem', evento.id, parsed.colaborador_id);
    }

    revalidate();
    return { success: true };
  } catch (err) { ... }
}
```

**Atenção:** `createEventoManejo` hoje retorna `data` (o evento criado). O `evento.id` já está disponível.

### 6.3 `deletarEventoManejoAction` — Pastagens

```typescript
import { deleteRegistroColaborador } from '@/lib/supabase/registros-colaborador';

export async function deletarEventoManejoAction(id: string): Promise<ActionResult> {
  try {
    // Limpar vínculo de colaborador antes de deletar
    await deleteRegistroColaborador('evento_manejo_pastagem', id);

    await deleteEventoManejo(id);
    revalidate();
    return { success: true };
  } catch (err) { ... }
}
```

### 6.4 `criarEventoSanitarioAction` — Rebanho/Sanidade

**Arquivo:** `app/dashboard/rebanho/sanidade/actions.ts`

O schema `criarEventoSanitarioSchema` em `lib/validations/rebanho.ts` precisa do campo `colaborador_id` opcional.

```typescript
// Adicionar import
import { upsertRegistroColaborador } from '@/lib/supabase/registros-colaborador';

export async function criarEventoSanitarioAction(
  formData: unknown,
  animalIdOverride?: string
): Promise<{ success: boolean; data?: ...; error?: string }> {
  try {
    // ... validação e admin check existentes ...

    const eventos = await Promise.all(
      animalIds.map((animalId) => criarEventoSanitario({ ...parsed, animal_id: animalId }))
    );

    // Vincular colaborador a todos os eventos criados (secundário)
    if (parsed.colaborador_id) {
      await Promise.all(
        eventos.map((e) =>
          upsertRegistroColaborador('evento_sanitario', e.id, parsed.colaborador_id!)
        )
      );
    }

    revalidatePath('/dashboard/rebanho/sanidade');
    revalidatePath('/dashboard/rebanho/[id]');
    return { success: true, data: eventos.length === 1 ? eventos[0] : eventos };
  } catch (error) { ... }
}
```

### 6.5 `deletarEventoSanitarioAction` — Rebanho/Sanidade

```typescript
import { deleteRegistroColaborador } from '@/lib/supabase/registros-colaborador';

export async function deletarEventoSanitarioAction(id: string) {
  try {
    const admin = await sou_admin();
    if (!admin) return { success: false, error: '...' };

    // Limpar vínculo antes do soft delete
    await deleteRegistroColaborador('evento_sanitario', id);

    await deletarEventoSanitario(id);
    revalidatePath('/dashboard/rebanho/sanidade');
    revalidatePath('/dashboard/rebanho/[id]');
    return { success: true };
  } catch (error) { ... }
}
```

### 6.6 `AtividadeDialog.tsx` — Talhões

**Arquivo:** `app/dashboard/talhoes/components/dialogs/AtividadeDialog.tsx`

Adicionar campo `colaborador_id` ao form e chamar a Server Action após o create.

```tsx
// Adicionar import
import { vincularColaboradorAtividadeAction } from '@/app/dashboard/talhoes/actions';
import { ColaboradorSelect } from '@/components/ColaboradorSelect';

// No onSubmit, após q.atividadesCampo.create():
const atividade = await q.atividadesCampo.create(payload);

// Vínculo de colaborador (fire-and-forget — não bloqueia UX)
if (data.colaborador_id) {
  vincularColaboradorAtividadeAction(atividade.id, data.colaborador_id).catch(
    (e) => console.error('[AtividadeDialog] Falha ao vincular colaborador:', e)
  );
}
```

**Campo no JSX** (antes de `DialogFooter`, após Observações):
```tsx
<div className="space-y-2">
  <Label>Colaborador responsável</Label>
  <ColaboradorSelect
    value={watch('colaborador_id')}
    onChange={(v) => setValue('colaborador_id', v)}
  />
</div>
```

**Schema Zod** (`lib/validators/atividades-campo.ts`) — adicionar:
```typescript
colaborador_id: z.string().uuid().optional(),
```

**Tipo** `AtividadeCampoInput` recebe o campo.

### 6.7 `SiloForm.tsx` — Silos

**Arquivo:** `app/dashboard/silos/components/dialogs/SiloForm.tsx`

O campo só aparece em `mode === 'create'`. Em edição (`mode === 'edit'`), o colaborador não é alterável (operação já ocorreu).

```tsx
// Adicionar import
import { vincularColaboradorSiloAction } from '@/app/dashboard/silos/actions';
import { ColaboradorSelect } from '@/components/ColaboradorSelect';

// No handleSubmit, bloco mode === 'create', APÓS toast.success('Silo criado com sucesso!'):
if (data.colaborador_id) {
  vincularColaboradorSiloAction(novoSilo.id, data.colaborador_id).catch(
    (e) => console.error('[SiloForm] Falha ao vincular colaborador:', e)
  );
}
```

**Campo no JSX** — renderizar somente quando `mode === 'create'`, antes de `DialogFooter`:
```tsx
{mode === 'create' && (
  <div className="space-y-2">
    <Label>Responsável pelo fechamento</Label>
    <ColaboradorSelect
      value={watch('colaborador_id')}
      onChange={(v) => setValue('colaborador_id', v)}
    />
  </div>
)}
```

**Schema Zod** (`lib/validations/silos.ts`) — adicionar ao `siloSchema`:
```typescript
colaborador_id: z.string().uuid().optional(),
```

### 6.8 Cleanup ao deletar silo (`q.silos.remove`)

**Arquivo:** `lib/supabase/queries-audit.ts`, função `silos.remove` (linha 136)

O `queries-audit.ts` usa cliente anônimo. Para deletar `registros_colaborador` (que exige cliente autenticado via RLS `sou_admin()`), usar o mesmo padrão já presente em `movimentacoesSilo.remove` (linhas 283–285): import dinâmico de `createSupabaseServerClient`.

```typescript
async remove(id: string): Promise<void> {
  const fazendaId = await getFazendaId();
  const validacao = await deleteSiloSafely(id);
  if (!validacao.permitir) throw new Error(validacao.mensagem);

  // Limpar vínculo de colaborador (usa server client — mesmo padrão do financeiro)
  try {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    await supabaseServer
      .from('registros_colaborador')
      .delete()
      .eq('referencia_tipo', 'cadastro_silo')
      .eq('referencia_id', id);
  } catch (e) {
    console.error('[silos.remove] Falha ao limpar registro_colaborador:', e);
  }

  const { error } = await supabase.from('silos').delete().eq('id', id).eq('fazenda_id', fazendaId);
  if (error) throw error;
},
```

### 6.9 Cleanup ao deletar atividade de campo (`q.atividadesCampo.remove`)

**Arquivo:** `lib/supabase/queries-audit.ts`, função `atividadesCampo.remove` (linha 1436)

Mesmo padrão de import dinâmico:

```typescript
async remove(id: string): Promise<void> {
  const fazendaId = await getFazendaId();

  // Limpar vínculo de colaborador
  try {
    const { createSupabaseServerClient } = await import('./server');
    const supabaseServer = await createSupabaseServerClient();
    await supabaseServer
      .from('registros_colaborador')
      .delete()
      .eq('referencia_tipo', 'atividade_campo')
      .eq('referencia_id', id);
  } catch (e) {
    console.error('[atividadesCampo.remove] Falha ao limpar registro_colaborador:', e);
  }

  const { error } = await supabase
    .from('atividades_campo')
    .delete()
    .eq('id', id)
    .eq('fazenda_id', fazendaId);
  if (error) throw error;
},
```

---

## Camada 7 — Schema Zod e tipo `criarEventoSanitarioSchema`

**Arquivo:** `lib/validations/rebanho.ts`

Localizar `criarEventoSanitarioSchema` e adicionar:
```typescript
colaborador_id: z.string().uuid().optional(),
```

---

## Resumo de todos os arquivos modificados/criados

### Novos (8 arquivos)
| Arquivo | Tipo |
|---|---|
| `lib/types/registros-colaborador.ts` | Tipos TypeScript |
| `lib/supabase/registros-colaborador.ts` | Funções utilitárias |
| `app/dashboard/talhoes/actions.ts` | Server Action auxiliar |
| `app/dashboard/silos/actions.ts` | Server Action auxiliar |
| `components/ColaboradorSelect.tsx` | Componente reutilizável |

### Modificados (9 arquivos)
| Arquivo | O que muda |
|---|---|
| `lib/validations/pastagens.ts` | `+ colaborador_id` em `eventoManejoFormSchema` |
| `lib/validations/rebanho.ts` | `+ colaborador_id` em `criarEventoSanitarioSchema` |
| `lib/validators/atividades-campo.ts` | `+ colaborador_id` em `AtividadeCampoSchema` |
| `lib/validations/silos.ts` | `+ colaborador_id` em `siloSchema` |
| `app/dashboard/pastagens/actions.ts` | `registrarEventoManejoAction` + `deletarEventoManejoAction` |
| `app/dashboard/rebanho/sanidade/actions.ts` | `criarEventoSanitarioAction` + `deletarEventoSanitarioAction` |
| `app/dashboard/talhoes/components/dialogs/AtividadeDialog.tsx` | Campo + call pós-create |
| `app/dashboard/silos/components/dialogs/SiloForm.tsx` | Campo mode=create + call pós-create |
| `lib/supabase/queries-audit.ts` | `silos.remove` + `atividadesCampo.remove` |

---

## Ordem de execução

1. Executar migration no Supabase → `npm run db:types`
2. Criar `lib/types/registros-colaborador.ts`
3. Criar `lib/supabase/registros-colaborador.ts`
4. Criar `components/ColaboradorSelect.tsx`
5. Criar `app/dashboard/talhoes/actions.ts`
6. Criar `app/dashboard/silos/actions.ts`
7. Atualizar schemas Zod (4 arquivos de validação)
8. Modificar `app/dashboard/pastagens/actions.ts`
9. Modificar `app/dashboard/rebanho/sanidade/actions.ts`
10. Modificar `EventoManejoForm.tsx`
11. Modificar `AtividadeDialog.tsx`
12. Modificar `SiloForm.tsx`
13. Modificar `lib/supabase/queries-audit.ts` (2 funções)
14. `npm run build` — zero erros TypeScript
15. `npm run test` — 741+ testes passando

---

## Invariantes que devem ser respeitadas na implementação

- `fazenda_id` **nunca** enviar em INSERT — trigger preenche
- `colaborador_id` no formulário é `string | undefined` — nunca `null` ou `''`
- Falha em `registros_colaborador` **nunca** bloqueia a operação principal
- `ColaboradorSelect` usa sentinel `'__none__'` internamente, expõe `undefined` para fora
- Cleanup de `registros_colaborador` sempre **antes** do DELETE da operação pai
- `soft delete` de evento sanitário (`deleted_at`) → `hard delete` do `registro_colaborador` associado
- Colaborador inativo (`ativo=false`) não aparece no select, mas seus `registros_colaborador` históricos persistem
