# PRD — Lançamento em Lote de Eventos de Rebanho

**Versão**: 1.0  
**Data**: 2026-05-29  
**Status**: Pesquisa concluída — aguardando aprovação para SPEC

---

## 1. Problema

O módulo de Rebanho do GestSilo exige que cada evento (pesagem, cobertura, diagnóstico, etc.) seja registrado individualmente por animal. Em uma fazenda com 30 vacas recebendo o mesmo protocolo hormonal, o técnico precisa abrir o formulário 30 vezes, preencher os mesmos campos compartilhados 30 vezes e confirmar 30 vezes — tudo isso muitas vezes sob sol, com luvas, numa tela de celular.

**Cenários concretos que o fluxo individual penaliza:**

| Cenário | Animais típicos | Tempo estimado (individual) |
|---|---|---|
| Pesagem mensal do lote de recria | 20–40 animais | 15–30 min |
| Protocolo de sincronização IATF | 10–50 fêmeas | 20–60 min |
| Diagnóstico de prenhez por lote | 15–40 fêmeas | 15–40 min |
| Desmame coletivo | 5–30 bezerros | 5–20 min |
| OPU (aspiração em lote de doadoras) | 5–15 vacas | 10–25 min |

Além do tempo, o risco de erro aumenta: o usuário pode selecionar o animal errado, repetir o mesmo animal ou pular animais da lista. O dado de campo fica incompleto.

**O que precisa mudar**: um único fluxo de wizard que permita configurar o evento uma vez, selecionar todos os animais participantes e preencher apenas os dados que diferem por animal (peso, resultado, etc.) em uma tabela inline editável.

---

## 2. Solução

Wizard de **3 etapas** na rota `/dashboard/rebanho/eventos/lote/novo`, acessível apenas para Administrador.

### Etapa 1 — Configurar o Evento
- Seletor de **Tipo de evento** (dropdown com os tipos suportados em lote — ver Seção 3)
- Campo **Data do evento** (date picker, default hoje, não permite data futura)
- Campos **compartilhados** de todos os animais do lote, específicos por tipo (ver tabela na Seção 3)
- Botão "Próximo" habilitado apenas quando todos os campos obrigatórios da Etapa 1 estiverem preenchidos

### Etapa 2 — Selecionar Animais
- Lista completa de animais **ativos** da fazenda (`status = 'Ativo'`, `deleted_at IS NULL`)
- **Sem pré-filtro por lote**: o usuário vê todos os animais e decide quem participou
- Filtros de apoio (não obrigatórios, apenas para facilitar a seleção):
  - Lote (dropdown)
  - Categoria (dropdown)
  - Sexo (Macho / Fêmea)
  - Busca por brinco ou nome (campo de texto)
- Seleção via checkbox por linha; botão "Selecionar todos os filtrados" e "Limpar seleção"
- Contador `"N animais selecionados"` fixo no rodapé
- Botão "Próximo" habilitado apenas quando ao menos 1 animal estiver selecionado

### Etapa 3 — Dados Individuais
- Tabela inline editável: uma linha por animal selecionado na Etapa 2
- Colunas: brinco (read-only) + nome (read-only) + colunas do tipo de evento (editáveis)
- As colunas editáveis são determinadas pelo tipo escolhido na Etapa 1 (ver tabela na Seção 3)
- Campos **obrigatórios** por linha: validação visual inline (borda âmbar na célula vazia)
- **Preenchimento em cascata**: ícone "↓ Aplicar a todos" aparece ao lado do campo da primeira linha preenchida; ao clicar, replica o valor para todas as linhas abaixo
- Navegação por Tab/Enter entre campos
- Contador no rodapé: `"X de Y animais com dados preenchidos"`
- Linhas com erro **não bloqueiam** as linhas completas — o usuário pode confirmar uma submissão parcial se quiser (ver Seção 8)
- Botão "Confirmar e Salvar" no rodapé

---

## 3. Tipos de Evento Suportados

### 3.1 Enum atual (`tipo_evento_rebanho`) — fonte: `types/supabase.ts`

Valores confirmados no banco em 2026-05-29:

```
nascimento | pesagem | morte | venda | transferencia_lote |
cobertura | diagnostico_prenhez | parto | secagem | aborto | descarte | desmame
```

`desmame` foi adicionado via `20260529000002_fix_registrar_evento_rpc_v2.sql` (`ALTER TYPE ADD VALUE IF NOT EXISTS 'desmame'`).

**Confirmado**: `aspiracao_opu`, `protocolo_hormonal`, `transferencia_embriao` **NÃO existem** no enum do banco nem nas migrations. São novos e requerem migration.

### 3.2 Tabela completa de tipos no lote

| Tipo (enum) | Nome na UI | Campos Etapa 1 (compartilhados) | Colunas Etapa 3 (individuais) | Triggers que disparam | Entra no lote? |
|---|---|---|---|---|---|
| `pesagem` | Pesagem | Data | Peso (kg) obrigatório; Escore corporal (1–5) | `atualizar_peso_atual_pesagem` → INSERT em `pesos_animal` + UPDATE `animais.peso_atual` | ✅ |
| `cobertura` | Cobertura | Data; Tipo de cobertura (monta_natural/ia_convencional/iatf/tetf/fiv/repasse) | Reprodutor (select, opcional); Observações | Nenhum trigger de negócio | ✅ |
| `diagnostico_prenhez` | Diagnóstico de Prenhez | Data; Método (palpacao/ultrassom/sangue) | Resultado (positivo/negativo/duvidoso) obrigatório; Idade gestacional (dias); Observações | Nenhum trigger de negócio | ✅ |
| `transferencia_lote` | Transferência de Lote | Data; Lote destino (select obrigatório, único para todos) | — (todos vão para o mesmo lote) | `atualizar_lote_transferencia` → UPDATE `animais.lote_id` + status Ativo | ✅ |
| `secagem` | Secagem | Data | Observações | Nenhum trigger de negócio | ✅ |
| `aborto` | Aborto | Data | Causa do aborto (text); Observações | Nenhum trigger de negócio | ✅ |
| `descarte` | Descarte | Data; Motivo descarte (idade/reprodutivo/sanitario/producao/aprumos/outro) | Observações | `atualizar_status_morte_venda` (via RPC `registrar_evento_com_status`) → UPDATE `animais.status = 'Descartado'` | ✅ |
| `desmame` | Desmame | Data | Peso ao desmame (kg); Observações | Nenhum trigger de negócio | ✅ |
| `aspiracao_opu` | Aspiração / OPU | Data | Oócitos coletados (int); Oócitos viáveis (int); Grau de qualidade (I/II/III/IV); Observações | Nenhum trigger (novo tipo) | ✅ **NOVO** |
| `protocolo_hormonal` | Protocolo Hormonal | Data; Finalidade (Pré-IATF/Pré-TE/Pré-monta Natural/Sincronização Receptoras) | Produto/hormônio; Dose (mg/ml); Via de aplicação (IM/IV/SC/SL); Observações | Nenhum trigger (novo tipo) | ✅ **NOVO** |
| `transferencia_embriao` | Transferência de Embrião | Data | Grau do embrião (1/2/3/4); Raça do embrião (text); Reprodutor doador (select); Resultado (transferido/não_transferido) obrigatório; Observações | Nenhum trigger (novo tipo) | ✅ **NOVO** |
| `nascimento` | Nascimento | — | — | — | ❌ (cria animal novo — permanece individual) |
| `morte` | Morte | — | — | `atualizar_status_morte_venda` → `animais.status = 'Morto'` | ❌ (implicação financeira, confirmação manual) |
| `venda` | Venda | — | — | `atualizar_status_morte_venda` → `animais.status = 'Vendido'` | ❌ (implicação financeira, confirmação manual) |
| `parto` | Parto | — | — | RPC `registrar_evento_com_status` cria bezerro | ❌ (cria bezerro, muda lactação, muito específico) |

### 3.3 Onde os dados dos novos tipos são armazenados

Os 3 novos tipos precisam persistir dados específicos por animal. **As colunas existentes na tabela `eventos_rebanho` NÃO são suficientes** para esses dados:

- `aspiracao_opu`: `oocitos_coletados`, `oocitos_viaveis`, `grau_qualidade` → não existem no schema atual
- `protocolo_hormonal`: `produto_hormonal`, `dose_produto`, `via_aplicacao` → não existem
- `transferencia_embriao`: `grau_embriao`, `raca_embriao`, `resultado_te` → não existem

**Duas opções de design para a SPEC decidir**:

**Opção A — Campo JSONB `dados_extras`**: adicionar coluna `dados_extras JSONB NULL` em `eventos_rebanho`. Dados dos novos tipos ficam em JSON estruturado. Sem migration de colunas por tipo futuro.

**Opção B — Colunas dedicadas**: adicionar as colunas específicas (`oocitos_coletados`, `oocitos_viaveis`, etc.) à `eventos_rebanho`. Mais verboso, mas tipado no PostgreSQL e refletido em `types/supabase.ts`.

> ⚠️ **Decisão de design pendente**: a SPEC deve escolher entre Opção A ou B antes de definir a migration.

---

## 4. Comportamento da Tabela na Etapa 3

### Preenchimento em cascata
- Ao digitar o primeiro valor em qualquer coluna editável da primeira linha, aparece um ícone "↓ Aplicar a todos" ao lado do campo
- O ícone fica disponível enquanto houver linhas abaixo sem valor nessa coluna
- UX: botão pequeno `text-xs` com ícone `CopyCheck` (Lucide), tooltip "Aplicar a todos"

### Navegação por teclado
- Tab: move para o próximo campo na mesma linha (da esquerda para direita), depois para o primeiro campo da próxima linha
- Enter: move para o mesmo campo na próxima linha (ótimo para coluna única como "peso")
- Shift+Tab: volta ao campo anterior

### Validação inline
- Campo obrigatório vazio: célula com `border-amber-500` e ícone `AlertCircle` pequeno
- Valor inválido (ex: peso negativo): célula com `border-destructive`
- Linhas completas: nenhuma marcação visual especial
- Contador no rodapé: `"X de Y animais preenchidos"` — atualiza em tempo real
- O botão "Confirmar e Salvar" fica **habilitado mesmo com linhas incompletas** — o usuário recebe um modal de aviso:
  > "Y de N animais têm dados incompletos. Deseja salvar apenas os X animais com dados válidos?"
  > Botões: `Cancelar` | `Salvar X animais`

### Largura mínima de células
- Células editáveis: `min-w-[120px]` para campos de texto, `min-w-[80px]` para numéricos
- Tabela com `overflow-x-auto` para não quebrar em mobile
- Inputs com `h-9` (altura padrão shadcn), não abaixo de `text-sm` (14px)

---

## 5. Rastreabilidade Pós-Confirmação

### Ficha individual do animal
- Cada INSERT em `eventos_rebanho` usa o `animal_id` correto → aparece automaticamente na aba "Histórico" da ficha individual (`app/dashboard/rebanho/[id]/page.tsx`)
- A query de histórico (`listEventosPorAnimal` em `lib/supabase/rebanho.ts`) filtra por `animal_id` — zero trabalho extra; qualquer evento inserido com o `animal_id` correto aparece
- **Confirmado**: nenhum ajuste necessário na ficha individual

### Triggers existentes que continuam funcionando em INSERT múltiplo
Os triggers em `eventos_rebanho` são `FOR EACH ROW` — disparam uma vez por linha insertada, independentemente de ser INSERT único ou INSERT múltiplo via array. Comportamento padrão do PostgreSQL.

| Trigger | Ativado por | Efeito |
|---|---|---|
| `eventos_rebanho_set_fazenda_id_trigger` | BEFORE INSERT, todos os tipos | Preenche `fazenda_id` via `get_minha_fazenda_id()` |
| `eventos_rebanho_pesagem_trigger` | AFTER INSERT, tipo `pesagem` | INSERT em `pesos_animal` + UPDATE `animais.peso_atual` |
| `eventos_rebanho_morte_venda_trigger` | AFTER INSERT, tipo `morte`/`venda` | UPDATE `animais.status` |
| `eventos_rebanho_transferencia_trigger` | AFTER INSERT, tipo `transferencia_lote` | UPDATE `animais.lote_id` |
| `eventos_rebanho_update_updated_at_trigger` | BEFORE UPDATE | UPDATE `updated_at` |

> ⚠️ O trigger `eventos_rebanho_morte_venda_trigger` **não trata `descarte`** — o descarte muda o status via RPC `registrar_evento_com_status`. Para o lote de descarte, a Server Action deverá fazer UPDATE de status por `animal_id` explicitamente (sem passar pela RPC individual). A SPEC deve definir essa abordagem.

### Novos tipos de evento (OPU, protocolo, TE)
- Sem triggers de negócio por ora — persistência direta em `eventos_rebanho`
- Indicadores derivados desses tipos (taxa de concepção TE, média de oócitos) ficam no backlog para SPEC futura
- `vw_animais_completos` (`20260525000001_vw_animais_completos.sql`): usa `security_invoker = true` e faz LEFT JOINs em `eventos_rebanho` filtrando por tipo (`cobertura`, `parto`, etc.) — os novos tipos não são referenciados e **não afetam a view**. Zero ajuste necessário.

### Aba Histórico de Reprodução (`/reproducao/eventos`)
Componente `EventosListagem` em `components/rebanho/reproducao/EventosListagem.tsx`, linha 39–48.

`tipoEventoMap` atual:
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
};
```

Filtro no Select (linha 231–238):
```tsx
<SelectItem value="cobertura">Cobertura</SelectItem>
<SelectItem value="diagnostico">Diagnóstico</SelectItem>
<SelectItem value="parto">Parto</SelectItem>
<SelectItem value="secagem">Secagem</SelectItem>
<SelectItem value="aborto">Aborto</SelectItem>
<SelectItem value="descarte">Descarte</SelectItem>
```

**Ajuste necessário**: adicionar os 3 novos tipos ao `tipoEventoMap` e ao `<SelectContent>` do filtro:

```typescript
aspiracao_opu: 'Aspiração / OPU',
protocolo_hormonal: 'Protocolo Hormonal',
transferencia_embriao: 'Transferência de Embrião',
```

---

## 6. Permissões

| Perfil | Acesso |
|---|---|
| **Administrador** | Acesso total: visualizar wizard, criar eventos em lote |
| **Operador** | **Sem acesso** — Operador é exclusivo de `/operador` (silos). Guard no layout redireciona para `/operador` |
| **Visualizador** | **Sem acesso** — somente leitura; guard redireciona para `/dashboard` |

RLS relevante:
- `eventos_rebanho_insert` policy: `sou_gerente_ou_admin()` — na prática equivale a `sou_admin()` (Gerente não existe no banco)
- A Server Action já valida `sou_admin()` antes de qualquer INSERT

**Padrão de layout guard** (seguir `app/dashboard/relatorios/layout.tsx`):
```tsx
'use client';
export default function LoteEventosLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && profile?.perfil !== 'Administrador') {
      toast.error('Acesso restrito a Administradores.');
      router.replace('/dashboard/rebanho');
    }
  }, [loading, profile, router]);
  if (loading || profile?.perfil !== 'Administrador') return null;
  return <>{children}</>;
}
```

> ⚠️ **Diferença do padrão geral**: o guard desta rota redireciona para `/dashboard/rebanho` (não `/dashboard`), pois Visualizador tem acesso ao módulo Rebanho mas não a esta sub-rota de escrita.

---

## 7. Rota

**Rota principal**: `/dashboard/rebanho/eventos/lote/novo`

**Arquivos a criar**:
- `app/dashboard/rebanho/eventos/lote/novo/page.tsx` — Client Component (wizard com estado)
- `app/dashboard/rebanho/eventos/lote/novo/layout.tsx` — guard de Admin
- `app/dashboard/rebanho/eventos/lote/actions.ts` — Server Action batch

### Ponto de entrada na UI

O hub Rebanho (`app/dashboard/rebanho/RebanhoClient.tsx`) exibe 6 cards de acesso rápido com ícones Lucide:

```tsx
// Linha atual do hub — ícones existentes:
<BarChart3>  <Milk>  <Scale>  <Stethoscope>  <ArrowRightLeft>  <Beef>  <Dna>
```

**Opção recomendada**: adicionar um botão **"Lançamento em Lote"** no header do hub (ao lado do botão `+ Novo Animal`) com ícone `ClipboardList` (Lucide), visível apenas para `isAdmin === true`.

```tsx
{isAdmin && (
  <Button variant="outline" asChild>
    <Link href="/dashboard/rebanho/eventos/lote/novo">
      <ClipboardList className="mr-2 h-4 w-4" />
      Lançamento em Lote
    </Link>
  </Button>
)}
```

**Alternativa**: card fixo no grid de acesso rápido — aumenta o grid de 6 para 7 (risco de quebrar o layout em mobile). Preferir o botão no header.

---

## 8. Server Action Batch

### Contrato esperado

```typescript
// app/dashboard/rebanho/eventos/lote/actions.ts

export async function criarEventosLoteAction(input: {
  tipo: Database['public']['Enums']['tipo_evento_rebanho']
  dados_compartilhados: Record<string, unknown>
  animais: Array<{
    animal_id: string
    dados_individuais: Record<string, unknown>
  }>
}): Promise<{
  inseridos: number
  erros: Array<{ animal_id: string; brinco: string; motivo: string }>
}>
```

### Estratégia de INSERT

**Opção A — INSERT múltiplo via Supabase JS** (um `.insert(array)`):
```typescript
const { data, error } = await supabase
  .from('eventos_rebanho')
  .insert(payloads)  // array de objetos
  .select('id, animal_id');
```
- Se um registro falha, o INSERT inteiro falha (comportamento padrão do PostgreSQL)
- Mais eficiente para lotes grandes (1 round-trip)

**Opção B — INSERT por animal com `Promise.allSettled`**:
```typescript
const results = await Promise.allSettled(
  input.animais.map((a) =>
    supabase.from('eventos_rebanho').insert({ ...payload, animal_id: a.animal_id })
  )
);
```
- Erros parciais retornam com os IDs que falharam
- Mais lento (N round-trips), mas mais granular

**Recomendação para a SPEC**: usar Opção B para suportar retorno parcial (N inseridos, M erros com brinco). O volume típico (5–50 animais) não justifica a complexidade de uma transação manual.

### Regras críticas
- `fazenda_id` **nunca incluir** no payload — trigger `set_eventos_rebanho_fazenda_id_trigger` preenche automaticamente
- `usuario_id` = `auth.uid()` resolvido na Server Action via `getCurrentUserId()` (`lib/auth/helpers.ts`)
- Validação Zod obrigatória antes de qualquer INSERT
- Retorno de erro: não expor mensagens internas do PostgreSQL — mapear para mensagens em português

### Toast de feedback
```
// Sucesso total
toast.success(`${inseridos} eventos registrados com sucesso.`)

// Sucesso parcial
toast.warning(`${inseridos} eventos registrados. ${erros.length} falharam: ${erros.map(e => e.brinco).join(', ')}`)

// Falha total
toast.error('Nenhum evento foi registrado. Verifique os dados e tente novamente.')
```

### revalidatePath após sucesso
```typescript
revalidatePath('/dashboard/rebanho');
revalidatePath('/dashboard/rebanho/[id]', 'page');
revalidatePath('/dashboard/rebanho/reproducao/eventos');
```

---

## 9. Migration Necessária

### 9.1 Novos valores no enum

```sql
-- EXECUTAR ISOLADO — fora de bloco BEGIN/COMMIT
-- ALTER TYPE ADD VALUE não suporta transações (comportamento do PostgreSQL 13+)

ALTER TYPE public.tipo_evento_rebanho ADD VALUE IF NOT EXISTS 'aspiracao_opu';
ALTER TYPE public.tipo_evento_rebanho ADD VALUE IF NOT EXISTS 'protocolo_hormonal';
ALTER TYPE public.tipo_evento_rebanho ADD VALUE IF NOT EXISTS 'transferencia_embriao';
```

**Enum resultante** (ordem de adição preservada):
```
nascimento | pesagem | morte | venda | transferencia_lote |
cobertura | diagnostico_prenhez | parto | secagem | aborto | descarte | desmame |
aspiracao_opu | protocolo_hormonal | transferencia_embriao
```

### 9.2 Colunas para dados dos novos tipos (Opção A ou B — decisão da SPEC)

**Se Opção A (JSONB)**:
```sql
ALTER TABLE public.eventos_rebanho
ADD COLUMN IF NOT EXISTS dados_extras JSONB NULL;
```

**Se Opção B (colunas dedicadas)**:
```sql
ALTER TABLE public.eventos_rebanho
  ADD COLUMN IF NOT EXISTS oocitos_coletados INT NULL
    CHECK (oocitos_coletados IS NULL OR oocitos_coletados >= 0),
  ADD COLUMN IF NOT EXISTS oocitos_viaveis INT NULL
    CHECK (oocitos_viaveis IS NULL OR oocitos_viaveis >= 0),
  ADD COLUMN IF NOT EXISTS grau_qualidade_opu TEXT NULL
    CHECK (grau_qualidade_opu IS NULL OR grau_qualidade_opu IN ('I','II','III','IV')),
  ADD COLUMN IF NOT EXISTS produto_hormonal TEXT NULL,
  ADD COLUMN IF NOT EXISTS dose_produto TEXT NULL,
  ADD COLUMN IF NOT EXISTS via_aplicacao TEXT NULL
    CHECK (via_aplicacao IS NULL OR via_aplicacao IN ('IM','IV','SC','SL')),
  ADD COLUMN IF NOT EXISTS finalidade_protocolo TEXT NULL
    CHECK (finalidade_protocolo IS NULL OR finalidade_protocolo IN ('pre_iatf','pre_te','monta_natural','sincronizacao_receptoras')),
  ADD COLUMN IF NOT EXISTS grau_embriao INT NULL
    CHECK (grau_embriao IS NULL OR grau_embriao BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS raca_embriao TEXT NULL,
  ADD COLUMN IF NOT EXISTS resultado_te TEXT NULL
    CHECK (resultado_te IS NULL OR resultado_te IN ('transferido','nao_transferido'));
```

### 9.3 Pós-migration obrigatório
```bash
npm run db:types  # requer SUPABASE_PROJECT_ID
```

### 9.4 Riscos

| Risco | Mitigação |
|---|---|
| `ALTER TYPE ADD VALUE` é irreversível sem recriar o tipo | Testar em ambiente de preview (branch Supabase) antes de aplicar em produção |
| `ADD VALUE` não pode rodar dentro de transação | Arquivo de migration dedicado, executar isolado (padrão já adotado em `20260502000001_rebanho_fase2_enum.sql`) |
| Colunas novas (Opção B) aumentam largura da tabela | `eventos_rebanho` é append-only (sem UPDATE); impacto em queries existentes é mínimo |
| `vw_animais_completos` pode precisar ser recriada | A view usa `CREATE OR REPLACE` — recriar após ALTER TABLE se necessário |

---

## 10. Offline / PWA

### Estado atual do IndexedDB (fonte: `lib/db/localDb.ts`, DB_VERSION=2)

O store `eventos_rebanho` já existe:
```typescript
eventos_rebanho: {
  key: string;
  value: {
    id: string;
    animal_id: string;
    tipo_evento: 'cobertura' | 'diagnostico' | 'parto' | 'desmame' | 'secagem' | 'aborto' | 'descarte';
    data_evento: string;
    payload: Record<string, unknown>;
    _sync_status: 'pending' | 'synced' | 'error' | 'pendente_revisao';
    _created_at: number;
    _conflict_motivo?: string;
  };
  indexes: { 'by-animal': string; 'by-data': string; 'by-tipo': string; 'by-sync-status': string };
}
```

**Observação**: o tipo `tipo_evento` do store IDB hardcoda apenas 7 valores. Com os 3 novos tipos, precisará ser atualizado (DB_VERSION increments ou TypeScript union expandida).

### Padrão de enfileiramento atual

O `saveEventoLocal` em `lib/db/eventosRebanho.ts` salva **um evento por animal** no IDB e enfileira **uma entrada RPC por animal** na `sync_queue`. Cada entrada chama `registrar_evento_com_status(animal_id, payload)`.

### Comportamento esperado para lote offline

**Recomendação**: manter o padrão de **uma entrada por animal na `sync_queue`** (não agrupar o lote inteiro em uma entrada). Razões:
1. Consistente com o padrão existente
2. Permite detecção de conflito por animal (animais Morto/Vendido são detectados individualmente)
3. Falha de um animal na sincronização não bloqueia os demais

**Fluxo offline para lote**:
1. Usuário confirma o wizard
2. Para cada animal: `saveEventoLocal(tipo, animal_id, data, payload, 'registrar_evento_com_status', rpcParams)`
3. IDB recebe N entradas em `eventos_rebanho` com `_sync_status: 'pending'`
4. `sync_queue` recebe N entradas com `operacao: 'RPC'`
5. Ao reconectar, `syncAll()` processa na ordem de timestamp
6. Conflitos (animal Morto/Vendido): marcados como `pendente_revisao`, removidos da fila
7. `SyncStatusBar` exibe badge de conflitos se houver

**Limitação atual**: os 3 novos tipos não estão na union do `tipo_evento` do store IDB. A DB_VERSION deve ser incrementada de 2 para 3 com migração do schema TypeScript do IDB para incluir os novos valores. **Ou**, usar `| string` como fallback temporário até a próxima atualização do offline (a SPEC deve decidir).

---

## 11. O Que NÃO Está no Escopo desta Feature

| Item | Motivo |
|---|---|
| **Morte em lote** | Implicação de status irreversível; requer confirmação manual por animal |
| **Venda em lote** | Implicação financeira (valor_venda individual); requer confirmação manual |
| **Vacinação/Vermifugação em lote** | Já cobertos pelo módulo Sanidade (`app/dashboard/rebanho/sanidade`) via `criarEventoSanitarioAction` — não duplicar |
| **Parto em lote** | Cria bezerro (animal novo), muda lactação, muito específico; permanece individual |
| **Tratamento veterinário em lote** | Prescrição individual por animal; permanece individual |
| **Nascimento em lote** | Cada nascimento cria um animal novo com brinco único |
| **Indicadores avançados de OPU** (taxa de concepção TE, média de oócitos/aspiração) | Backlog para iteração futura; requer queries específicas sobre os novos tipos |
| **Indicadores de protocolo hormonal** (taxa de ciclicidade, etc.) | Backlog para iteração futura |
| **Relatórios por tipo de evento lote** | Coberto pelo construtor dinâmico de relatórios (usa `vw_animais_completos`) |

---

## 12. Dependências e Riscos

### Dependências

| Dependência | Status | Impacto se ausente |
|---|---|---|
| Enum `tipo_evento_rebanho` com novos valores | Requer migration | Novos tipos não aparecem como opção |
| Colunas para dados extras (Opção A ou B) | Requer migration (decisão SPEC) | Dados de OPU/protocolo/TE não persistem |
| `npm run db:types` após migration | Obrigatório | TypeScript não reflete os novos tipos |
| `EventosListagem` atualizado | Simples adição de 3 SelectItems | Novos tipos não aparecem no filtro de histórico |
| Store IDB `eventos_rebanho` atualizado | DB_VERSION increment | Offline para novos tipos falha no TypeScript |

### Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Migration de enum irreversível | Alta certeza (padrão PG) | Médio (não há rollback fácil) | Testar em branch preview antes de produção |
| Trigger `descarte` via RPC vs trigger direto | Médio (comportamento diferente do lote) | Alto (animais não mudam de status) | Server Action deve fazer UPDATE explícito de status para `descarte` em lote |
| INSERT múltiplo ativa todos os triggers por linha | Baixo (comportamento padrão PG) | — | Documentado; comportamento correto |
| `pesos_animal` tem UNIQUE constraint `(animal_id, data_pesagem)` | Médio (usuário pode selecionar mesmo animal duas vezes ou já ter pesagem nessa data) | Médio (INSERT falha com conflito) | `ON CONFLICT (animal_id, data_pesagem) DO UPDATE SET peso_kg = EXCLUDED.peso_kg` na Server Action de pesagem em lote |
| `transferencia_lote` muda `lote_id` de todos os animais selecionados | Baixo | Médio (pode ser intencional) | Warning visual na Etapa 1 ao selecionar este tipo |
| `transferencia_embriao` precisa `reprodutor_id` (doador) — campo opcional | Baixo | Baixo | Campo opcional na Etapa 3; sem constraint no banco |
| `vw_animais_completos` pode invalidar após `ALTER TABLE eventos_rebanho` | Baixo (view usa `CREATE OR REPLACE`) | Médio (relatórios quebram) | Incluir `CREATE OR REPLACE VIEW` na migration |

---

## 13. Convenções Obrigatórias do Projeto (confirmadas na pesquisa)

| Convenção | Status | Referência |
|---|---|---|
| `select('*')` proibido | ✅ Confirmado | `CLAUDE.md` — listar colunas explicitamente |
| `fazenda_id` nunca no INSERT | ✅ Confirmado via trigger `set_eventos_rebanho_fazenda_id_trigger` | `20260430210000_rebanho_fase1.sql` linha 359–370 |
| TypeScript strict, zero `any` | ✅ Confirmado | `eslint.config.mjs` — regra `@typescript-eslint/no-explicit-any: "error"` |
| Tipografia mínima `text-sm` (14px) | ✅ Confirmado | `CLAUDE.md` Design System |
| Cores via CSS vars / Tailwind semântico | ✅ Confirmado | `app/globals.css` |
| Botões grandes, áreas de toque generosas | ✅ — `h-9` mínimo em inputs de tabela, `min-w-[80px]` | Design System |
| Fonte de verdade dos tipos: `types/supabase.ts` | ✅ Confirmado | `npm run db:types` após migrations |
| Validação Zod em Server Actions | ✅ Padrão do projeto | `criarEventoSanitarioAction`, `registrarPesagemLoteAction` |
| Retorno padronizado `{ success, error?, data? }` | ✅ Padrão do projeto | Todos os actions.ts do rebanho |

---

## Apêndice A — Enum Completo Atual

Fonte: `types/supabase.ts` linha 3599–3611 (gerado em 2026-05-29):

```typescript
tipo_evento_rebanho:
  | "nascimento"
  | "pesagem"
  | "morte"
  | "venda"
  | "transferencia_lote"
  | "cobertura"
  | "diagnostico_prenhez"
  | "parto"
  | "secagem"
  | "aborto"
  | "descarte"
  | "desmame"
```

## Apêndice B — Colunas Completas de `eventos_rebanho`

Fonte: `types/supabase.ts` + migrations (`20260502000002_rebanho_fase2_main.sql`, `20260529000001_fix_eventos_rebanho_colunas.sql`):

| Coluna | Tipo | Nullable | Uso |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `fazenda_id` | uuid | NOT NULL | FK → fazendas; preenchido por trigger |
| `animal_id` | uuid | NOT NULL | FK → animais ON DELETE CASCADE |
| `tipo` | enum `tipo_evento_rebanho` | NOT NULL | Tipo do evento |
| `data_evento` | date | NOT NULL | CHECK ≤ CURRENT_DATE |
| `peso_kg` | numeric(6,2) | NULL | Pesagem; obrigatório se tipo=pesagem |
| `lote_id_destino` | uuid | NULL | FK → lotes; obrigatório se tipo=transferencia_lote |
| `comprador` | text | NULL | Venda |
| `valor_venda` | numeric(12,2) | NULL | Venda |
| `observacoes` | text | NULL | Todos os tipos |
| `usuario_id` | uuid | NOT NULL | FK → profiles |
| `tipo_cobertura` | text | NULL | CHECK monta_natural/ia_convencional/iatf/tetf/fiv/repasse |
| `reprodutor_id` | uuid | NULL | FK → reprodutores ON DELETE SET NULL |
| `metodo_diagnostico` | text | NULL | CHECK palpacao/ultrassom/sangue |
| `resultado_prenhez` | text | NULL | CHECK positivo/negativo/duvidoso |
| `idade_gestacional_dias` | int | NULL | CHECK 0–300 |
| `tipo_parto` | text | NULL | CHECK normal/distocico/cesariana/simples/gemelar/triplo |
| `gemelar` | boolean | NULL | default FALSE |
| `natimorto` | boolean | NULL | default FALSE |
| `causa_aborto` | text | NULL | Aborto |
| `motivo_descarte` | text | NULL | CHECK idade/reprodutivo/sanitario/producao/aprumos/outro |
| `sexo_crias` | text | NULL | Parto |
| `bypass_justificativa` | text | NULL | Override de validação |
| `bypass_usuario_id` | uuid | NULL | FK → auth.users |
| `escore_condicao_corporal` | numeric(2,1) | NULL | CHECK 1.0–5.0 |
| `deleted_at` | timestamp | NULL | Soft delete |
| `created_at` | timestamp | NOT NULL | |
| `updated_at` | timestamp | NOT NULL | Atualizado por trigger |

## Apêndice C — Componentes de Seleção de Animais Existentes

Não existe componente reutilizável de **multi-seleção** de animais no `components/rebanho/`. Os formulários existentes usam:

- `FormRegistroPesagemLote.tsx` (`components/rebanho/corte/`): seleção por lote (dropdown), preenche automaticamente com os animais do lote — **não é multi-select livre**
- `criarEventoSanitarioAction`: aceita `animal_id` como `string | string[]` — suporta array, mas a UI de seleção não foi abstraída

**Conclusão**: o wizard de Etapa 2 deve criar um novo componente `AnimalMultiSelect` (ou similar) do zero. Recomendação: tabela com checkboxes, filtros de apoio no cabeçalho, e botão "Selecionar todos os filtrados" — padrão de multi-seleção similar ao módulo de Planejamento de Compras.
