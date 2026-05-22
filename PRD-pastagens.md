# PRD — Módulo de Pastagens
**Data:** 2026-05-21  
**Autor:** Claude Code (pesquisa + elaboração)  
**Status:** Rascunho — aguardando aprovação para SPEC

---

## 1. Visão Geral

O módulo de **Pastagens** complementa o ecossistema GestSilo para propriedades de pecuária leiteira e de corte. Ele gerencia áreas permanentes divididas em piquetes, controla a rotação de lotes entre piquetes e monitora a saúde da pastagem via indicadores agronômicos (altura de dossel, capacidade de suporte em UA/ha).

Diferentemente do módulo de **Talhões** (lavoura com ciclos anuais e colheita), pastagem é área permanente, sem ciclo agrícola com início/fim definido. O eixo temporal é o **pastejo e descanso por piquete**, não a cultura plantada.

---

## 2. Escopo do MVP

### 2.1 O que está dentro do escopo

| Funcionalidade | Descrição |
|---|---|
| Cadastro de pastagens | Área permanente com nome, espécie forrageira, área (ha), sistema de pastejo |
| Cadastro de piquetes | Subdivisões da pastagem com área, status e altura de referência |
| Ocupação de piquete | Registrar qual lote está em qual piquete, data de entrada e saída prevista |
| Histórico de rotação | Consultar quem esteve em cada piquete ao longo do tempo |
| Medição de dossel | Registrar altura de entrada e saída do pastejo por ocupação |
| Capacidade de suporte | Calcular UA/ha real vs. suportada por piquete |
| Eventos de manejo | Adubação, calagem, reforma, ressemeadura, irrigação, interdição |
| Alertas proativos | Piquete pronto para entrada (tempo de descanso atingido), lotação acima do suportado |

### 2.2 O que está fora do escopo (backlog)

- Integração financeira automática com eventos de manejo (será manual via módulo Financeiro)
- Mapa georreferenciado de piquetes (aguarda feedback da fase 1)
- Análise de solo por piquete (reutilizável da estrutura de talhões se demandado)
- Export de relatórios PDF
- Importação CSV de piquetes

---

## 3. Regras de Negócio

### 3.1 Hierarquia de entidades

```
Fazenda
└── Pastagem (área permanente, ex: "Capim Mombaça Talhão 3")
    └── Piquete (subdivisão rotacionável, ex: "Piquete 01")
        └── Ocupação (lote × período × medições de dossel)
        └── Evento de Manejo
```

### 3.2 Status de piquete

```
Em pastejo    → lote alocado, ocupação aberta (sem data_saida_real)
Descanso      → sem lote alocado, aguardando atingir dias_descanso_ideal
Em reforma    → interdição longa (reforma de pastagem, ressemeadura)
Interditado   → bloqueio temporário (emergência, pragas, etc.)
```

**Regra de transição automática (UI, sem trigger de banco):**
- Ao registrar `data_saida_real` na ocupação → piquete vai para "Descanso"
- Ao registrar evento do tipo `reforma` → piquete vai para "Em reforma"
- Ao registrar evento do tipo `interdição` → piquete vai para "Interditado"
- Admin pode alterar status manualmente a qualquer momento

### 3.3 Capacidade de suporte (UA/ha)

- **UA (Unidade Animal)** = animal de 450 kg de PV
- **Fórmula:** `ua_real = (quantidade_animais_no_lote × peso_medio_kg) / 450 / area_piquete_ha`
- **Fonte dos dados:** lote referenciado via `lotes.id` (tabela existente); peso médio derivado dos animais do lote via `animais.peso_atual`
- Alerta se `ua_real > ua_suportada` (campo configurável por piquete)

### 3.4 Sistemas de pastejo suportados

```
rotacionado       → múltiplos piquetes, rotação controlada
continuo          → um único piquete (sem rotação)
semi_intensivo    → rotação simplificada, sem controle de dossel
```

### 3.5 Cálculo de dias de descanso

- `dias_descanso_acumulado = CURRENT_DATE - data_saida_real` (calculado em JS, sem coluna persistida)
- Alerta proativo quando `dias_descanso_acumulado >= dias_descanso_ideal` do piquete

### 3.6 Integração com Rebanho (lotes)

- Ao criar uma **Ocupação**, o usuário seleciona um `lote_id` da tabela `lotes` existente
- A movimentação física do lote (evento `transferencia_lote` em `eventos_rebanho`) **não é criada automaticamente** — o usuário registra separadamente no módulo Rebanho
- Razão: evitar side effects ocultos; o link bidirecional é via `lote_id` na ocupação

### 3.7 Integração com Insumos

- Eventos de manejo com insumos (adubação, calagem, ressemeadura) referenciam `insumo_id` da tabela `insumos` existente
- Não cria saída automática de estoque — usuário registra manualmente no módulo Insumos
- Razão: mesmo padrão do módulo Planejamento de Compras (rastreabilidade sem side effects automáticos)

---

## 4. Permissões por Perfil

| Operação | Administrador | Visualizador | Operador |
|---|---|---|---|
| Ver pastagens e piquetes | ✅ | ✅ | ❌ |
| Cadastrar/editar pastagem | ✅ | ❌ | ❌ |
| Cadastrar/editar piquete | ✅ | ❌ | ❌ |
| Deletar pastagem | ✅ | ❌ | ❌ |
| Deletar piquete | ✅ | ❌ | ❌ |
| Registrar ocupação | ✅ | ❌ | ❌ |
| Editar/fechar ocupação | ✅ | ❌ | ❌ |
| Registrar evento de manejo | ✅ | ❌ | ❌ |
| Deletar evento de manejo | ✅ | ❌ | ❌ |
| Acesso ao módulo | ✅ | ✅ | ❌ (→ /dashboard) |

**Nota:** Operador não tem acesso ao módulo (guard no `layout.tsx`). Visualizador tem acesso somente leitura via `sou_admin_ou_visualizador()` nas RLS policies de SELECT.

---

## 5. Schema do Banco de Dados

### 5.1 Novas tabelas

#### `pastagens`
| Coluna | Tipo | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `fazenda_id` | uuid | NO | get_minha_fazenda_id() | FK → fazendas.id, trigger |
| `nome` | text | NO | — | Ex: "Capim Mombaça — Setor Norte" |
| `especie_forrageira` | text | YES | null | Ex: "Brachiaria brizantha cv. Marandu" |
| `area_total_ha` | numeric | NO | — | Soma informativa; piquetes têm área própria |
| `sistema_pastejo` | text | NO | 'rotacionado' | CHECK: rotacionado, continuo, semi_intensivo |
| `observacoes` | text | YES | null | |
| `ativo` | boolean | NO | true | Soft-delete |
| `created_at` | timestamptz | YES | now() | |
| `updated_at` | timestamptz | YES | now() | |

#### `piquetes`
| Coluna | Tipo | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `fazenda_id` | uuid | NO | — | FK → fazendas.id, preenchido por trigger via pastagem_id |
| `pastagem_id` | uuid | NO | — | FK → pastagens.id |
| `nome` | text | NO | — | Ex: "Piquete 01" |
| `area_ha` | numeric | NO | — | |
| `status` | text | NO | 'Descanso' | CHECK: Em pastejo, Descanso, Em reforma, Interditado |
| `ua_suportada` | numeric | YES | null | Capacidade de suporte configurada (UA/ha) |
| `dias_descanso_ideal` | integer | YES | null | Dias de descanso esperados para esta forrageira |
| `altura_entrada_cm` | numeric | YES | null | Altura de dossel para entrada do lote (referência) |
| `altura_saida_cm` | numeric | YES | null | Altura de dossel para saída do lote (referência) |
| `observacoes` | text | YES | null | |
| `created_at` | timestamptz | YES | now() | |
| `updated_at` | timestamptz | YES | now() | |

#### `ocupacoes_piquete`
| Coluna | Tipo | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `fazenda_id` | uuid | NO | — | FK → fazendas.id, preenchido por trigger via piquete_id |
| `piquete_id` | uuid | NO | — | FK → piquetes.id |
| `lote_id` | uuid | NO | — | FK → lotes.id (tabela existente) |
| `data_entrada` | date | NO | CURRENT_DATE | |
| `data_saida_prevista` | date | YES | null | Estimativa de saída do lote |
| `data_saida_real` | date | YES | null | Preenchido ao fechar a ocupação |
| `altura_dossel_entrada_cm` | numeric | YES | null | Medição real na entrada |
| `altura_dossel_saida_cm` | numeric | YES | null | Medição real na saída |
| `quantidade_animais` | integer | YES | null | Snapshot da quantidade ao registrar |
| `peso_medio_kg` | numeric | YES | null | Snapshot do peso médio ao registrar |
| `ua_real` | numeric | YES | null | Calculado: (qtd × peso_medio) / 450 / area_ha |
| `observacoes` | text | YES | null | |
| `created_by` | uuid | YES | auth.uid() | |
| `created_at` | timestamptz | YES | now() | |
| `updated_at` | timestamptz | YES | now() | |

**Regra de integridade:** Um piquete não pode ter duas ocupações abertas simultaneamente (`data_saida_real IS NULL`). Garantido por UNIQUE partial index.

#### `eventos_manejo_pastagem`
| Coluna | Tipo | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `fazenda_id` | uuid | NO | — | FK → fazendas.id, trigger via piquete_id |
| `piquete_id` | uuid | NO | — | FK → piquetes.id |
| `tipo` | text | NO | — | CHECK: ver seção 5.2 |
| `data` | date | NO | CURRENT_DATE | |
| `insumo_id` | uuid | YES | null | FK → insumos.id (para adubação, calagem, ressemeadura) |
| `quantidade_insumo` | numeric | YES | null | Quantidade aplicada |
| `unidade_insumo` | text | YES | null | Ex: "kg/ha", "L/ha" |
| `dose_por_ha` | numeric | YES | null | |
| `maquina_id` | uuid | YES | null | FK → maquinas.id (operação mecanizada) |
| `custo_estimado` | numeric | YES | null | |
| `observacoes` | text | YES | null | |
| `created_by` | uuid | YES | auth.uid() | |
| `created_at` | timestamptz | YES | now() | |

### 5.2 CHECK Constraints

```sql
-- pastagens.sistema_pastejo
CHECK (sistema_pastejo IN ('rotacionado', 'continuo', 'semi_intensivo'))

-- piquetes.status
CHECK (status IN ('Em pastejo', 'Descanso', 'Em reforma', 'Interditado'))

-- eventos_manejo_pastagem.tipo
CHECK (tipo IN ('adubacao_manutencao', 'calagem', 'reforma', 'ressemeadura', 'irrigacao', 'interdicao', 'roçagem', 'outro'))
```

### 5.3 Índices a criar

```sql
CREATE INDEX idx_pastagens_fazenda_id ON pastagens(fazenda_id);
CREATE INDEX idx_piquetes_fazenda_id ON piquetes(fazenda_id);
CREATE INDEX idx_piquetes_pastagem_id ON piquetes(pastagem_id);
CREATE INDEX idx_ocupacoes_piquete_fazenda_id ON ocupacoes_piquete(fazenda_id);
CREATE INDEX idx_ocupacoes_piquete_piquete_id ON ocupacoes_piquete(piquete_id);
CREATE INDEX idx_ocupacoes_piquete_lote_id ON ocupacoes_piquete(lote_id);
CREATE INDEX idx_eventos_manejo_pastagem_piquete_id ON eventos_manejo_pastagem(piquete_id);
CREATE INDEX idx_eventos_manejo_pastagem_fazenda_id ON eventos_manejo_pastagem(fazenda_id);

-- Impede ocupação dupla simultânea
CREATE UNIQUE INDEX idx_ocupacao_aberta_unica
  ON ocupacoes_piquete(piquete_id)
  WHERE data_saida_real IS NULL;
```

### 5.4 RLS Policies (padrão do projeto)

Baseadas nos padrões já existentes (`sou_admin_ou_visualizador()`, `sou_gerente_ou_admin()`, `get_minha_fazenda_id()`):

```
pastagens_select_todos          → fazenda_id = get_minha_fazenda_id()
pastagens_insert_admin_gerente  → + sou_gerente_ou_admin()
pastagens_update_admin_gerente  → + sou_gerente_ou_admin()
pastagens_delete_admin          → + sou_admin()

piquetes_select_todos           → fazenda_id = get_minha_fazenda_id()
piquetes_insert_admin_gerente   → + sou_gerente_ou_admin()
piquetes_update_admin_gerente   → + sou_gerente_ou_admin()
piquetes_delete_admin           → + sou_admin()

ocupacoes_piquete_select_todos  → fazenda_id = get_minha_fazenda_id()
ocupacoes_piquete_insert_admin_gerente → + sou_gerente_ou_admin()
ocupacoes_piquete_update_admin_gerente → + sou_gerente_ou_admin()
ocupacoes_piquete_delete_admin  → + sou_admin()

eventos_manejo_pastagem_select_todos   → fazenda_id = get_minha_fazenda_id()
eventos_manejo_pastagem_insert_admin_gerente → + sou_gerente_ou_admin()
eventos_manejo_pastagem_update_admin_gerente → + sou_gerente_ou_admin()
eventos_manejo_pastagem_delete_admin   → + sou_admin()
```

**Nota de alinhamento:** O snapshot usa `sou_gerente_ou_admin()` nas INSERT/UPDATE e `sou_admin()` somente no DELETE de tabelas sensíveis (ex: `silos`, `maquinas`). Pastagens segue o mesmo padrão. Na prática, `sou_gerente_ou_admin() ≡ sou_admin()` pois o perfil Gerente não existe.

### 5.5 Triggers necessários

```sql
-- Propaga fazenda_id de pastagem para piquetes
CREATE FUNCTION preencher_fazenda_id_via_pastagem() RETURNS trigger ...
  → SET NEW.fazenda_id = (SELECT fazenda_id FROM pastagens WHERE id = NEW.pastagem_id)

-- Propaga fazenda_id de piquete para ocupacoes_piquete e eventos_manejo_pastagem
CREATE FUNCTION preencher_fazenda_id_via_piquete() RETURNS trigger ...
  → SET NEW.fazenda_id = (SELECT fazenda_id FROM piquetes WHERE id = NEW.piquete_id)

-- Atualiza updated_at em pastagens e piquetes
CREATE FUNCTION update_updated_at_pastagens() RETURNS trigger ...
```

---

## 6. Tabelas Existentes Referenciadas

| Tabela | Uso no módulo | Colunas relevantes |
|---|---|---|
| `fazendas` | Multitenancy via `fazenda_id` | `id` |
| `lotes` | Seleção do lote em Ocupação | `id`, `nome`, `tipo_rebanho` |
| `animais` | Cálculo de UA real (peso médio do lote) | `id`, `lote_id`, `peso_atual`, `status` |
| `insumos` | Eventos de manejo com insumo | `id`, `nome`, `unidade` |
| `maquinas` | Eventos de manejo mecanizados | `id`, `nome` |
| `financeiro` | Sem integração automática no MVP | — |

---

## 7. Funções SQL Reutilizáveis

Todas as funções abaixo já existem no banco e devem ser reutilizadas sem modificação:

| Função | Uso |
|---|---|
| `get_minha_fazenda_id()` | Todas as RLS policies de WHERE |
| `sou_admin()` | DELETE policies |
| `sou_gerente_ou_admin()` | INSERT/UPDATE policies |
| `sou_admin_ou_visualizador()` | Não há policy de SELECT que a use aqui — SELECT é aberto para todos da fazenda (padrão `_select_todos`) |

---

## 8. Estrutura de Arquivos Proposta

Seguindo o padrão do módulo Rebanho/Produtos:

```
app/dashboard/pastagens/
├── layout.tsx                    # Guard: Operador → /dashboard
├── page.tsx                      # RSC: busca pastagens + piquetes resumidos
├── PastagensClient.tsx           # Client: hub com cards de pastagens
├── actions.ts                    # Server Actions (CRUD pastagens, piquetes, ocupações, eventos)
└── components/
    ├── PastagemCard.tsx          # Card de pastagem com lista de piquetes
    ├── PastagemForm.tsx          # Modal criar/editar pastagem
    ├── PiqueteCard.tsx           # Card de piquete com status e KPIs
    ├── PiqueteForm.tsx           # Modal criar/editar piquete
    ├── OcupacaoForm.tsx          # Modal registrar entrada de lote
    ├── FecharOcupacaoDialog.tsx  # Fechar ocupação (registrar saída + dossel)
    ├── EventoManejoForm.tsx      # Modal registrar evento de manejo
    ├── HistoricoOcupacoes.tsx    # Tabela de histórico de ocupações por piquete
    └── DeletePastagemDialog.tsx  # Confirm dialog exclusão

lib/
├── supabase/pastagens.ts         # Queries (listPastagens, listPiquetes, listOcupacoes, etc.)
├── types/pastagens.ts            # Tipos TypeScript (Pastagem, Piquete, OcupacaoPiquete, EventoManejo)
└── validations/pastagens.ts      # Schemas Zod (pastagemFormSchema, piqueteFormSchema, ocupacaoFormSchema, eventoManejoFormSchema)
```

### 8.1 Server Actions planejadas

| Action | Operação | Validação Zod |
|---|---|---|
| `criarPastagemAction` | INSERT pastagens | `pastagemFormSchema` |
| `atualizarPastagemAction` | UPDATE pastagens | `pastagemFormSchema` |
| `deletarPastagemAction` | DELETE pastagens (+ piquetes filhos) | — |
| `criarPiqueteAction` | INSERT piquetes | `piqueteFormSchema` |
| `atualizarPiqueteAction` | UPDATE piquetes | `piqueteFormSchema` |
| `deletarPiqueteAction` | DELETE piquete (guard: sem ocupações abertas) | — |
| `registrarEntradaLoteAction` | INSERT ocupacoes_piquete + UPDATE piquetes.status → 'Em pastejo' | `ocupacaoFormSchema` |
| `fecharOcupacaoAction` | UPDATE ocupacoes_piquete (data_saida_real, dossel) + UPDATE piquetes.status → 'Descanso' | `fecharOcupacaoSchema` |
| `registrarEventoManejoAction` | INSERT eventos_manejo_pastagem + UPDATE piquetes.status (se reforma/interdicao) | `eventoManejoFormSchema` |
| `deletarEventoManejoAction` | DELETE eventos_manejo_pastagem | — |

---

## 9. UX e Navegação

### 9.1 Sidebar

- Novo item **"Pastagens"** no grupo "Propriedade" (junto de Talhões e Frota)
- Ícone sugerido: `Sprout` ou `Leaf` (Lucide React)
- Visível para Administrador e Visualizador; **oculto para Operador**

### 9.2 Hub (`/dashboard/pastagens`)

Estrutura em duas colunas:

```
┌─────────────────────────────────────────────────────┐
│  Pastagens                           [+ Nova Pastagem] │
├────────────────────────┬────────────────────────────┤
│  Card Pastagem A       │  Card Pastagem B            │
│  ■ 8 piquetes          │  ■ 4 piquetes               │
│  ■ 3 em pastejo        │  ■ 2 em pastejo             │
│  ■ 4 em descanso       │  ■ 1 em descanso            │
│  ■ 1 em reforma        │  ■ 1 interditado            │
│  [Ver detalhes]        │  [Ver detalhes]             │
└────────────────────────┴────────────────────────────┘
```

### 9.3 Detalhe da pastagem (`/dashboard/pastagens/[id]`)

Abas:
1. **Piquetes** — grid de cards com status visual por cor e KPIs de lotação
2. **Histórico** — tabela de ocupações passadas com filtro por lote/período
3. **Eventos de Manejo** — timeline de eventos com filtro por tipo

### 9.4 Alertas proativos (para integrar no Dashboard)

| Condição | Severidade | Mensagem |
|---|---|---|
| `ua_real > ua_suportada` | `urgente` | "Piquete [X] com superlotação" |
| `dias_descanso_acumulado >= dias_descanso_ideal` | `aviso` | "Piquete [X] pronto para entrada" |
| Piquete em reforma há >90 dias | `aviso` | "Piquete [X] em reforma há X dias" |

---

## 10. Validações Zod (esboço)

```typescript
// pastagemFormSchema
{
  nome: z.string().min(2).max(100),
  especie_forrageira: z.string().max(150).optional(),
  area_total_ha: z.number().positive(),
  sistema_pastejo: z.enum(['rotacionado', 'continuo', 'semi_intensivo']),
  observacoes: z.string().max(500).optional(),
}

// piqueteFormSchema
{
  pastagem_id: z.string().uuid(),
  nome: z.string().min(1).max(50),
  area_ha: z.number().positive(),
  ua_suportada: z.number().positive().optional(),
  dias_descanso_ideal: z.number().int().positive().optional(),
  altura_entrada_cm: z.number().positive().optional(),
  altura_saida_cm: z.number().positive().optional(),
  observacoes: z.string().max(500).optional(),
}

// ocupacaoFormSchema
{
  piquete_id: z.string().uuid(),
  lote_id: z.string().uuid(),
  data_entrada: z.string().date(),
  data_saida_prevista: z.string().date().optional(),
  altura_dossel_entrada_cm: z.number().positive().optional(),
  quantidade_animais: z.number().int().positive().optional(),
  peso_medio_kg: z.number().positive().optional(),
  observacoes: z.string().max(500).optional(),
}

// fecharOcupacaoSchema
{
  data_saida_real: z.string().date(),
  altura_dossel_saida_cm: z.number().positive().optional(),
  observacoes: z.string().max(500).optional(),
}

// eventoManejoFormSchema
{
  piquete_id: z.string().uuid(),
  tipo: z.enum(['adubacao_manutencao', 'calagem', 'reforma', 'ressemeadura', 'irrigacao', 'interdicao', 'roçagem', 'outro']),
  data: z.string().date(),
  insumo_id: z.string().uuid().optional(),
  quantidade_insumo: z.number().positive().optional(),
  unidade_insumo: z.string().optional(),
  dose_por_ha: z.number().positive().optional(),
  maquina_id: z.string().uuid().optional(),
  custo_estimado: z.number().nonnegative().optional(),
  observacoes: z.string().max(500).optional(),
}
```

---

## 11. Decisões de Design e Justificativas

| Decisão | Justificativa |
|---|---|
| `fazenda_id` preenchido por trigger (não pelo front) | Padrão universal do projeto — nenhum módulo envia `fazenda_id` no INSERT |
| `ua_real` persistida como snapshot na ocupação | Evita recalcular com dados que mudam (peso dos animais); rastreabilidade histórica |
| Sem integração automática com Financeiro | Consistência com Planejamento de Compras; simplifica o MVP; evita side effects |
| Sem integração automática com `eventos_rebanho` | Operação de pastejo ≠ movimentação de lote; usuário registra em módulos separados se quiser rastrear |
| Soft-delete só em `pastagens` (campo `ativo`) | Piquetes são filhos — deletar pastagem → deletar piquetes (guard na action). Ocupações históricas são preservadas |
| Status de piquete atualizado pela action, não por trigger | Status depende de regras de negócio complexas; trigger tornaria o schema mais frágil; controle total na camada de application |
| `lote_id` FK para `lotes` existente | Reutilização da entidade Rebanho; sem duplicação de dados |

---

## 12. Pontos de Atenção para a SPEC

1. **Tabela `lotes`** — snapshot do banco (27/04/2026) já inclui a tabela. Verificar se há FK constraint possível antes de criar a migration.
2. **Função `sou_admin_ou_visualizador()`** — presente no CLAUDE.md mas **não listada** no database-snapshot.md (Seção 5.1). Verificar se foi adicionada após o snapshot (provável, dado que foi criada em 2026-05-19 para módulo Produtos). **Não criar novamente.**
3. **Nomes dos triggers** — seguir convenção `trg_<tabela>_<campo>` já estabelecida: `trg_piquetes_fazenda_id`, `trg_ocupacoes_piquete_fazenda_id`, etc.
4. **Unique partial index** para ocupação dupla — verificar se a versão do PostgreSQL no Supabase suporta (sim, Postgres 15+).
5. **Peso médio do lote** — derivado em runtime via query `animais WHERE lote_id = X AND status = 'Ativo'`. O snapshot salvo na ocupação é para histórico.
6. **Sidebar** — verificar o componente `Sidebar.tsx` antes da SPEC para identificar o grupo correto de inserção do novo item.
