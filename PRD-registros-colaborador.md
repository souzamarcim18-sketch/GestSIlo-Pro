# PRD — Rastreabilidade de Colaboradores em Operações Agrícolas

**Data:** 2026-05-22  
**Status:** Pesquisa concluída — aguardando aprovação para especificação  
**Escopo:** Nova tabela + campo opcional em 5 formulários existentes

---

## 1. Objetivo

Permitir associar um colaborador (pessoa física cadastrada na fazenda) a operações agrícolas já existentes, com o único propósito de rastreabilidade — saber quem executou cada operação. Sem impacto em custo, duração ou lançamentos financeiros.

---

## 2. Modelo de Dados

### 2.1 Nova tabela: `registros_colaborador`

```sql
CREATE TABLE registros_colaborador (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id  uuid NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  referencia_tipo text NOT NULL CHECK (referencia_tipo IN (
    'atividade_campo',
    'entrada_silo',
    'fechamento_silo',
    'evento_manejo_pastagem',
    'evento_sanitario'
  )),
  referencia_id   uuid NOT NULL,
  fazenda_id      uuid NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

**Notas de design:**
- `fazenda_id` **não enviar no INSERT** — trigger `set_fazenda_id` preenche via `get_minha_fazenda_id()`
- Sem `UNIQUE(referencia_id)` — permite corrigir colaborador errado via DELETE + INSERT sem bloquear
- Sem `UNIQUE(referencia_tipo, referencia_id)` — mesma razão: troca de colaborador deve ser livre
- FK polimórfica não é possível no PostgreSQL — cleanup ao deletar operação pai é responsabilidade da Server Action
- `ON DELETE CASCADE` em `colaborador_id`: se o colaborador for hard-deleted, o registro some junto
- Colaborador com soft-delete (`ativo=false`) mantém os registros históricos intactos

### 2.2 RLS

```sql
-- SELECT: admin ou visualizador (mesmo padrão das demais tabelas do dashboard)
CREATE POLICY "registros_colaborador_select" ON registros_colaborador
  FOR SELECT USING (sou_admin_ou_visualizador() AND fazenda_id = get_minha_fazenda_id());

-- INSERT: apenas admin
CREATE POLICY "registros_colaborador_insert" ON registros_colaborador
  FOR INSERT WITH CHECK (sou_admin() AND fazenda_id = get_minha_fazenda_id());

-- DELETE: apenas admin
CREATE POLICY "registros_colaborador_delete" ON registros_colaborador
  FOR DELETE USING (sou_admin() AND fazenda_id = get_minha_fazenda_id());
```

### 2.3 Índices necessários

```sql
CREATE INDEX idx_registros_colaborador_fazenda ON registros_colaborador(fazenda_id);
CREATE INDEX idx_registros_colaborador_referencia ON registros_colaborador(referencia_tipo, referencia_id);
CREATE INDEX idx_registros_colaborador_colaborador ON registros_colaborador(colaborador_id);
```

---

## 3. Mapeamento das Operações

### 3.1 `atividade_campo` — Talhões

| Campo | Valor |
|---|---|
| Tabela pai | `atividades_campo` |
| Coluna PK | `id` |
| Formulário | `AtividadeDialog.tsx` (`app/dashboard/talhoes/components/dialogs/`) |
| Função de criação | `q.atividadesCampo.create(payload)` via `queries-audit.ts` (Client Component) |
| Função de remoção | `q.atividadesCampo.remove(id)` via `queries-audit.ts` |
| Contexto do formulário | `FormProvider` (React Hook Form), campo no mesmo `form.handleSubmit` |

**Comportamento atual de criação:**  
O `AtividadeDialog` chama `q.atividadesCampo.create()` diretamente do Client Component (pattern antigo via `queries-audit.ts` com `anon key`). Não usa Server Action. Retorna `atividade.id` na linha 174.

**Problema para implementação:**  
`registros_colaborador` exige `createSupabaseServerClient()` (autenticado) para respeitar RLS do INSERT com `sou_admin()`. O `queries-audit.ts` usa cliente anônimo do browser. A criação do `registros_colaborador` deverá ser feita via Server Action chamada após o `q.atividadesCampo.create()`.

**Onde adicionar DELETE cleanup:**  
Em `q.atividadesCampo.remove(id)` dentro de `queries-audit.ts` (linha 1436) — mas como usa cliente anônimo, precisará de Server Action auxiliar ou usar `createSupabaseServerClient()` dinamicamente (pattern já visto em `movimentacoesSilo.remove`).

---

### 3.2 `entrada_silo` — Silos (Entrada/Ensilagem)

| Campo | Valor |
|---|---|
| Tabela pai | `movimentacoes_silo` onde `tipo = 'Entrada'` |
| Coluna PK | `id` |
| Formulário A | `SiloForm.tsx` — criação do silo gera Entrada automática (subtipo `'Ensilagem'`, responsavel `'Sistema'`) |
| Formulário B | `MovimentacaoDialog.tsx` — tipo `'Entrada'` selecionável quando silo ainda não tem entrada |
| Função de criação | `q.movimentacoesSilo.create(payload)` via `queries-audit.ts` |
| Função de remoção | `q.movimentacoesSilo.remove(id)` via `queries-audit.ts` (linha 272) |

**Observação crítica:**  
No `SiloForm`, a Entrada é criada automaticamente com `responsavel: 'Sistema'` — não há interação humana explícita. Para o `referencia_tipo = 'entrada_silo'`, o `referencia_id` será o `id` da `movimentacao_silo` gerada, não o `id` do silo. Isso é consistente com os demais tipos que referenciam o evento específico, não a entidade pai.

**Onde `SiloForm` cria a entrada (linhas 189–196):**
```typescript
await q.movimentacoesSilo.create({
  silo_id: ...,
  tipo: 'Entrada',
  subtipo: 'Ensilagem',
  quantidade: data.volume_ensilado_ton_mv,
  data: data.data_fechamento,
  responsavel: 'Sistema',
  ...
});
```
O ID desta movimentação não é capturado hoje — precisará ser capturado para criar o `registro_colaborador`.

---

### 3.3 `fechamento_silo` — Silos (Cadastro/Fechamento)

| Campo | Valor |
|---|---|
| Tabela pai | `silos` |
| Coluna PK | `id` |
| Formulário | `SiloForm.tsx` — ao criar silo (`mode = 'create'`), `data_fechamento` é obrigatória |
| Função de criação | `q.silos.create(payload)` via `queries-audit.ts` |
| Função de remoção | `q.silos.remove(id)` via `queries-audit.ts` (linha 136) |

**Diferença entre `entrada_silo` e `fechamento_silo`:**  
- `fechamento_silo` → `referencia_id = silos.id` — rastreia quem fechou/compactou o silo
- `entrada_silo` → `referencia_id = movimentacoes_silo.id` — rastreia quem fez a movimentação de entrada

São dois eventos distintos com semântica diferente: um é quem supervisionou o fechamento (operação de dias), outro é quem registrou a entrada volumétrica. A decisão de manter ambos no escopo ou fundir em um só deve ser validada com o usuário antes da especificação.

**Onde adicionar DELETE cleanup:**  
Em `q.silos.remove(id)` no `queries-audit.ts`, junto ao DELETE do silo. O cleanup deve ser feito antes do DELETE do silo (consistência).

---

### 3.4 `evento_manejo_pastagem` — Pastagens

| Campo | Valor |
|---|---|
| Tabela pai | `eventos_manejo_pastagem` |
| Coluna PK | `id` |
| Formulário | `EventoManejoForm.tsx` (`app/dashboard/pastagens/components/`) |
| Server Action de criação | `registrarEventoManejoAction(formData)` em `app/dashboard/pastagens/actions.ts` |
| Server Action de remoção | `deletarEventoManejoAction(id)` em `app/dashboard/pastagens/actions.ts` |

**Comportamento atual:**  
`EventoManejoForm` usa `registrarEventoManejoAction()` diretamente — padrão Server Action correto. A action retorna `{ success, error }`. O ID do evento criado não é retornado hoje na action — precisará ser incluído no retorno para criar o `registro_colaborador`.

**Comportamento de DELETE:**  
`deletarEventoManejoAction(id)` — sem validações, deleção direta. Cleanup do `registro_colaborador` deve ser adicionado antes do DELETE do evento.

**Nota:** Deletar evento de manejo **não reverte** status do piquete (documentado no CLAUDE.md). O mesmo aviso se aplica ao colaborador — deletar o `registro_colaborador` não desfaz a operação.

---

### 3.5 `evento_sanitario` — Rebanho

| Campo | Valor |
|---|---|
| Tabela pai | `eventos_sanitarios` |
| Coluna PK | `id` |
| Formulário | Páginas de sanidade em `app/dashboard/rebanho/sanidade/` e `app/dashboard/rebanho/[id]/evento/` |
| Server Action de criação | `criarEventoSanitarioAction(formData, animalIdOverride?)` em `app/dashboard/rebanho/sanidade/actions.ts` |
| Server Action de remoção | `deletarEventoSanitarioAction(id)` em `app/dashboard/rebanho/sanidade/actions.ts` |

**Comportamento atual:**  
`criarEventoSanitarioAction` suporta múltiplos animais (cria N eventos em paralelo via `Promise.all`). A action retorna `{ success, data }` onde `data` pode ser `EventoSanitarioRow | EventoSanitarioRow[]`. O `registro_colaborador` deverá ser criado para cada evento gerado.

**Permissões:** Restrito a `sou_admin()` — não acessível por Operador nem Visualizador.

**Soft delete:** `eventos_sanitarios` usa `deleted_at` para soft delete nas listagens, mas `deletarEventoSanitario()` provavelmente faz hard delete (confirmar em `lib/supabase/rebanho-sanitario.ts` na especificação). Cleanup do `registro_colaborador` deve ocorrer no `deletarEventoSanitarioAction`.

---

## 4. Comportamento no Formulário

### 4.1 Campo de seleção (padrão)

```
Label: Colaborador responsável (opcional)
Componente: Select simples com lista de colaboradores ativos
Placeholder: "Selecionar colaborador..."
Valor nulo: permite não selecionar
```

**Fonte de dados:** `listColaboradores(supabase, { ativo: true })` em `lib/supabase/mao-de-obra.ts` — função já existe e aceita filtro `ativo`. Para uso em formulários que chamam Server Actions, a lista pode ser carregada via Server Action auxiliar. Para `AtividadeDialog.tsx` (Client Component com `queries-audit`), carregada via query direta ao banco (mesmo padrão usado para `insumos` e `maquinas` no formulário).

### 4.2 Regras de criação

| Cenário | Comportamento |
|---|---|
| Colaborador não selecionado | Não cria nenhum `registro_colaborador` |
| Colaborador selecionado | INSERT em `registros_colaborador` após INSERT na operação |
| INSERT em `registros_colaborador` falha | Logar via `console.error` e retornar sucesso — a operação principal já foi persistida, rastreabilidade é secundária |

### 4.3 Regras de edição

| Cenário | Comportamento |
|---|---|
| Nenhum → Colaborador | INSERT em `registros_colaborador` |
| Colaborador → Nenhum | DELETE em `registros_colaborador` onde `referencia_tipo + referencia_id` |
| Colaborador A → Colaborador B | DELETE + INSERT em `registros_colaborador` |
| Sem mudança de colaborador | Nenhuma operação em `registros_colaborador` |

**Nota:** Para editar, o formulário precisa carregar o colaborador atual, buscando via `registros_colaborador` por `referencia_tipo + referencia_id`.

### 4.4 Regras de deleção da operação pai

Ao deletar a operação, a Server Action deve:
1. DELETE em `registros_colaborador` WHERE `referencia_tipo = '<tipo>' AND referencia_id = '<id>'`
2. DELETE na operação pai

Se o DELETE em `registros_colaborador` falhar: logar e continuar (não bloquear a deleção da operação).

---

## 5. Análise de Gaps e Decisões Pendentes

### 5.1 `AtividadeDialog` usa Client Component com `queries-audit`

**Situação:** O formulário de atividade de campo não usa Server Action — chama `q.atividadesCampo.create()` diretamente do browser. O `registros_colaborador` precisa de cliente autenticado (RLS `sou_admin()`).

**Opção A:** Criar Server Action auxiliar `vincularColaboradorAction(tipo, referenciaId, colaboradorId)` e chamá-la do Client Component após o `q.atividadesCampo.create()`.

**Opção B:** Migrar `AtividadeDialog` para usar Server Action (maior refatoração, fora do escopo).

**Recomendação:** Opção A — menor invasão, Server Action já é o padrão do projeto para escritas autenticadas.

### 5.2 `entrada_silo` vs `fechamento_silo` — dois tipos ou um?

Ambos são criados no mesmo `SiloForm`. O usuário pode querer rastrear quem fechou o silo (responsável pelo processo de compactação/fechamento) separadamente de quem registrou a entrada volumétrica. Como são gerados no mesmo ato de cadastro, podem compartilhar o mesmo colaborador — mas são referências para tabelas diferentes (`silos.id` vs `movimentacoes_silo.id`).

**Decisão a validar:** Manter os dois tipos separados (conforme especificado no escopo) ou fundir em `cadastro_silo` referenciando `silos.id`?

### 5.3 `criarEventoSanitarioAction` — múltiplos animais

Quando vários animais são selecionados, N eventos são criados. O colaborador selecionado deve ser vinculado a **todos** os eventos gerados (um `registro_colaborador` por evento).

### 5.4 Não há tela de edição em `atividades_campo`

O `AtividadeDialog` só tem modo `create` — não há formulário de edição de atividade de campo. As regras de edição do `registro_colaborador` se aplicam apenas quando/se a edição for implementada.

### 5.5 Exibição nas listagens

O PRD cobre apenas a **escrita** do `registro_colaborador`. A **leitura** (exibir nome do colaborador nas listagens de operações) é escopo separado e não deve ser implementado junto.

---

## 6. Arquivos que Precisam de Alteração

### Banco de dados (migration)
- Nova tabela `registros_colaborador` com índices e RLS
- Enum via CHECK constraint (não enum PostgreSQL — mais fácil de evoluir)

### Backend — nova função utilitária
- `lib/supabase/registros-colaborador.ts` — funções:
  - `upsertRegistroColaborador(supabase, tipo, referenciaId, colaboradorId | null): Promise<void>`
  - `deleteRegistroColaborador(supabase, tipo, referenciaId): Promise<void>`
  - `getColaboradorDaOperacao(supabase, tipo, referenciaId): Promise<string | null>` (retorna `colaborador_id`)

### Backend — Server Actions modificadas
- `app/dashboard/pastagens/actions.ts` — `registrarEventoManejoAction`, `deletarEventoManejoAction`
- `app/dashboard/rebanho/sanidade/actions.ts` — `criarEventoSanitarioAction`, `editarEventoSanitarioAction` (se implementado), `deletarEventoSanitarioAction`

### Backend — nova Server Action auxiliar
- `app/dashboard/silos/actions.ts` (criar) — `vincularColaboradorSiloAction` ou integrar em `queries-audit.ts`
- `app/dashboard/talhoes/actions.ts` (criar) — `vincularColaboradorAtividadeAction`

### Frontend — formulários modificados
- `app/dashboard/talhoes/components/dialogs/AtividadeDialog.tsx`
- `app/dashboard/silos/components/dialogs/SiloForm.tsx`
- `app/dashboard/silos/components/dialogs/MovimentacaoDialog.tsx` (entrada)
- `app/dashboard/pastagens/components/EventoManejoForm.tsx`
- Formulário(s) de evento sanitário (localizar em `app/dashboard/rebanho/sanidade/`)

### Frontend — componente reutilizável
- `components/ColaboradorSelect.tsx` — Select simples com lista de colaboradores ativos da fazenda (carregar via Server Action auxiliar na montagem; passar `defaultValue` para edição)

### Tipos
- `lib/types/registros-colaborador.ts` — tipo `ReferenciaColaborador`, enum `ReferenciaTipo`

---

## 7. Fora do Escopo

- Saída/fornecimento de silo (Operador já tem perfil próprio — rastreado pelo `user_id`)
- Uso de maquinário (já implementado via `uso_maquinas`)
- Eventos reprodutivos (veterinário externo, fora da fazenda)
- Exibição do colaborador nas listagens de operações (escopo separado)
- Relatórios de produtividade por colaborador (escopo futuro)
- Múltiplos colaboradores por operação (escopo futuro, tabela já suporta via DELETE + INSERT)

---

## 8. Sequência de Implementação Sugerida

1. **Migration** — criar tabela, índices, RLS, atualizar `npm run db:types`
2. **Utilitária** — `lib/supabase/registros-colaborador.ts` + tipos
3. **Componente** — `ColaboradorSelect.tsx` reutilizável
4. **Pastagens** — menor complexidade, usa Server Action (mais simples de adaptar)
5. **Rebanho/Sanidade** — média complexidade (múltiplos animais)
6. **Silos** — média complexidade (dois tipos, `queries-audit` com server client dinâmico)
7. **Talhões** — maior complexidade (`queries-audit` Client Component, Server Action auxiliar)
8. **Testes** — schemas Zod + casos de upsert/delete
