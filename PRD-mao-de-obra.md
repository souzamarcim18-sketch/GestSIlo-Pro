# PRD — Módulo de Registro de Atividades com Custo de Mão de Obra

**Data**: 2026-05-22  
**Autor**: Pesquisa automatizada + revisão Marcio Bastos  
**Status**: Rascunho para revisão

---

## 1. Visão Geral

Diário de campo com custo: o produtor registra quem trabalhou, em quê e quanto custou. O módulo **não é um sistema de RH** — sem folha de pagamento, ponto eletrônico, férias, FGTS, eSocial ou horas extras por legislação trabalhista.

**Valor de negócio**: o produtor passa a ver o custo real de cada atividade da fazenda, integrado ao módulo Financeiro como Despesa, com a mesma rastreabilidade já existente em Insumos e Silagem.

---

## 2. Escopo

### Dentro do escopo
- Cadastro simples de colaboradores (nome, função, vínculo, valor de referência)
- Registro de atividades: quem trabalhou, no quê, quando, por quanto tempo
- Cálculo automático do custo (duração × valor de referência)
- Lançamento automático de Despesa em `financeiro` com categoria "Mão de Obra"
- Exclusão da atividade remove a despesa correspondente (cleanup atômico)
- Edição do custo atualiza a despesa no financeiro
- Associação opcional a talhão, silo ou máquina

### Fora do escopo (não implementar)
- Folha de pagamento, holerites, cálculo de verbas rescisórias
- Controle de ponto eletrônico
- Férias, 13º salário, FGTS, INSS
- eSocial ou qualquer integração trabalhista
- Relatórios de horas para órgãos reguladores
- Gestão de equipes ou hierarquia

---

## 3. Perfis e Permissões

| Perfil | Colaboradores | Atividades |
|---|---|---|
| **Administrador** | CRUD completo | CRUD completo |
| **Visualizador** | Somente leitura | Somente leitura |
| **Operador** | Sem acesso | Sem acesso (redireciona para `/dashboard`) |

**Guard de rota**: `app/dashboard/mao-de-obra/layout.tsx` — Client Component com `useAuth()`, redireciona Operador para `/dashboard` (mesmo padrão de `pastagens/layout.tsx`).

**RLS**:
- SELECT: `sou_admin_ou_visualizador()` (bloqueia Operador)
- INSERT/UPDATE: `sou_admin()`
- DELETE: `sou_admin()`

---

## 4. Modelo de Dados

### 4.1 Nova tabela: `colaboradores`

```sql
CREATE TABLE colaboradores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id  uuid NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome        text NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 100),
  funcao      text NOT NULL CHECK (funcao IN (
                'Vaqueiro', 'Tratorista', 'Auxiliar', 'Gerente', 'Outros'
              )),
  vinculo     text NOT NULL CHECK (vinculo IN (
                'CLT', 'Diarista', 'Empreiteiro', 'Familiar'
              )),
  tipo_valor  text NOT NULL CHECK (tipo_valor IN ('diaria', 'hora')),
  valor_ref   numeric(10,2) NOT NULL CHECK (valor_ref >= 0),
  ativo       boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- fazenda_id preenchido pelo trigger (padrão do projeto)
-- Índice
CREATE INDEX idx_colaboradores_fazenda_id ON colaboradores(fazenda_id);
CREATE INDEX idx_colaboradores_ativo ON colaboradores(fazenda_id, ativo);
```

**Campos**:
| Campo | Tipo | Descrição |
|---|---|---|
| `nome` | text | Nome completo ou apelido — sem CPF obrigatório |
| `funcao` | text (enum) | Vaqueiro / Tratorista / Auxiliar / Gerente / Outros |
| `vinculo` | text (enum) | CLT / Diarista / Empreiteiro / Familiar |
| `tipo_valor` | text (enum) | `diaria` ou `hora` — define como calcular custo |
| `valor_ref` | numeric | Valor base em R$ para cálculo (diária ou hora) |
| `ativo` | boolean | Soft-delete: colaboradores com atividades não são deletados |

### 4.2 Nova tabela: `atividades_mao_obra`

> **Nota**: A tabela `atividades_campo` existente é para planejamento/execução de atividades agrícolas vinculadas a ciclos e talhões. O módulo de mão de obra tem entidade própria para não poluir o schema já consolidado.

```sql
CREATE TABLE atividades_mao_obra (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id       uuid NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  data             date NOT NULL,
  tipo_atividade   text NOT NULL CHECK (tipo_atividade IN (
                     'Trato/alimentação do rebanho',
                     'Ordenha',
                     'Aplicação de defensivo',
                     'Adubação',
                     'Silagem (colheita/compactação/cobertura)',
                     'Manutenção de cerca',
                     'Manutenção de equipamento',
                     'Limpeza de instalações',
                     'Manejo sanitário',
                     'Irrigação',
                     'Roçagem',
                     'Transporte interno',
                     'Outros'
                   )),
  duracao_tipo     text NOT NULL CHECK (duracao_tipo IN ('horas', 'dias')),
  duracao_valor    numeric(8,2) NOT NULL CHECK (duracao_valor > 0),
  custo_calculado  numeric(10,2) NOT NULL DEFAULT 0,
  custo_manual     numeric(10,2),  -- para empreiteiros com valor fechado
  custo_final      numeric(10,2) GENERATED ALWAYS AS (
                     COALESCE(custo_manual, custo_calculado)
                   ) STORED,
  talhao_id        uuid REFERENCES talhoes(id) ON DELETE SET NULL,
  silo_id          uuid REFERENCES silos(id) ON DELETE SET NULL,
  maquina_id       uuid REFERENCES maquinas(id) ON DELETE SET NULL,
  observacoes      text,
  despesa_id       uuid REFERENCES financeiro(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_atividades_mao_obra_fazenda_id ON atividades_mao_obra(fazenda_id);
CREATE INDEX idx_atividades_mao_obra_data ON atividades_mao_obra(fazenda_id, data DESC);
```

### 4.3 Nova tabela: `atividades_mao_obra_colaboradores` (relação N:N)

```sql
CREATE TABLE atividades_mao_obra_colaboradores (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id            uuid NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  atividade_id          uuid NOT NULL REFERENCES atividades_mao_obra(id) ON DELETE CASCADE,
  colaborador_id        uuid NOT NULL REFERENCES colaboradores(id) ON DELETE RESTRICT,
  custo_colaborador     numeric(10,2) NOT NULL DEFAULT 0,
  UNIQUE (atividade_id, colaborador_id)
);

CREATE INDEX idx_atv_mao_obra_colab_atividade_id ON atividades_mao_obra_colaboradores(atividade_id);
CREATE INDEX idx_atv_mao_obra_colab_colaborador_id ON atividades_mao_obra_colaboradores(colaborador_id);
```

> **Custo calculado por colaborador**:
> - `tipo_valor = 'hora'` → `custo = duracao_valor * colaborador.valor_ref` (quando `duracao_tipo = 'horas'`)
> - `tipo_valor = 'diaria'` → `custo = duracao_valor * colaborador.valor_ref` (quando `duracao_tipo = 'dias'`)
> - `tipo_valor = 'hora'` com `duracao_tipo = 'dias'` → `custo = (duracao_valor * 8) * colaborador.valor_ref` (1 dia = 8 horas)
> - `tipo_valor = 'diaria'` com `duracao_tipo = 'horas'` → `custo = (duracao_valor / 8) * colaborador.valor_ref` (converte horas em fração de dia)
> - `custo_calculado` da atividade = soma dos `custo_colaborador` de todos os colaboradores

### 4.4 RLS Policies

```sql
-- colaboradores
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY colaboradores_select ON colaboradores
  FOR SELECT USING (fazenda_id = get_minha_fazenda_id() AND sou_admin_ou_visualizador());

CREATE POLICY colaboradores_insert ON colaboradores
  FOR INSERT WITH CHECK (sou_admin());

CREATE POLICY colaboradores_update ON colaboradores
  FOR UPDATE USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY colaboradores_delete ON colaboradores
  FOR DELETE USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

-- atividades_mao_obra
ALTER TABLE atividades_mao_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY atv_mao_obra_select ON atividades_mao_obra
  FOR SELECT USING (fazenda_id = get_minha_fazenda_id() AND sou_admin_ou_visualizador());

CREATE POLICY atv_mao_obra_insert ON atividades_mao_obra
  FOR INSERT WITH CHECK (sou_admin());

CREATE POLICY atv_mao_obra_update ON atividades_mao_obra
  FOR UPDATE USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY atv_mao_obra_delete ON atividades_mao_obra
  FOR DELETE USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

-- atividades_mao_obra_colaboradores (mesmas regras da tabela pai)
ALTER TABLE atividades_mao_obra_colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY atv_colab_select ON atividades_mao_obra_colaboradores
  FOR SELECT USING (fazenda_id = get_minha_fazenda_id() AND sou_admin_ou_visualizador());

CREATE POLICY atv_colab_insert ON atividades_mao_obra_colaboradores
  FOR INSERT WITH CHECK (sou_admin());

CREATE POLICY atv_colab_update ON atividades_mao_obra_colaboradores
  FOR UPDATE USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());

CREATE POLICY atv_colab_delete ON atividades_mao_obra_colaboradores
  FOR DELETE USING (fazenda_id = get_minha_fazenda_id() AND sou_admin());
```

---

## 5. Integração com Financeiro

### Padrão a replicar (fonte: `app/dashboard/insumos/actions.ts`)

Ao registrar atividade:
1. Inserir em `atividades_mao_obra` + `atividades_mao_obra_colaboradores`
2. Inserir em `financeiro`:
   ```typescript
   {
     tipo: 'Despesa',
     categoria: 'Mão de Obra',
     descricao: `${tipo_atividade} — ${colaboradores.map(c => c.nome).join(', ')}`,
     valor: custo_final,  // custo_manual ?? custo_calculado
     data: data,
     forma_pagamento: null,
     referencia_id: atividade.id,
     referencia_tipo: 'Mão de Obra',
     natureza: 'variavel',
   }
   ```
3. Atualizar `atividades_mao_obra.despesa_id = financeiro.id` (rastreabilidade)

Ao deletar atividade:
1. Se `despesa_id` existe → deletar de `financeiro` primeiro
2. Deletar filhos em `atividades_mao_obra_colaboradores`
3. Deletar `atividades_mao_obra`
4. (Rollback: se qualquer passo falhar, nenhuma alteração persiste)

Ao editar custo:
1. Se `despesa_id` existe → `UPDATE financeiro SET valor = novo_custo WHERE id = despesa_id`
2. Atualizar `atividades_mao_obra.custo_calculado` / `custo_manual`

### Observação sobre RLS do financeiro

As policies atuais de `financeiro` usam `sou_gerente_ou_admin()` — equivale a `sou_admin()` na prática (Gerente não existe). Portanto, o INSERT em `financeiro` feito pela Server Action do módulo mão de obra só funcionará para usuários Administrador (correto — Visualizador não pode criar atividades).

---

## 6. Funcionalidades do Módulo

### 6.1 Colaboradores

**Listagem**:
- Tabela com nome, função, vínculo, valor de referência e status (ativo/inativo)
- Filtro por função e vínculo
- Busca por nome

**Cadastro/edição** (modal — padrão shadcn Dialog + React Hook Form + Zod):
- Nome (obrigatório, 2–100 chars)
- Função (select: Vaqueiro / Tratorista / Auxiliar / Gerente / Outros)
- Vínculo (select: CLT / Diarista / Empreiteiro / Familiar)
- Tipo de valor (radio: "Por dia" / "Por hora")
- Valor de referência (R$ — campo numérico)
- Observações (textarea opcional)

**Exclusão**:
- Colaborador com atividades registradas → soft-delete (`ativo = false`)
- Colaborador sem atividades → hard-delete
- Confirmação via dialog antes de deletar

### 6.2 Atividades

**Listagem** (aba principal):
- Tabela: data, tipo de atividade, colaboradores, duração, custo, vínculo (talhão/silo/máquina)
- Filtros: período (data início/fim), tipo de atividade, colaborador
- Ordenação por data descendente
- Total de custo no período (rodapé da tabela)

**Registro** (modal — atender caso de uso principal):
- Data (date picker — default hoje)
- Tipo de atividade (select com os 13 tipos fixos)
- Colaboradores (multi-select com os colaboradores ativos da fazenda)
  - Ao selecionar cada colaborador, mostra preview do custo individual calculado
- Duração: toggle "Horas" / "Dias" + campo numérico
- Custo calculado (read-only, calculado em tempo real: soma dos custos individuais)
- Custo manual (opcional — para empreiteiro com valor fechado; ao preencher, substitui o calculado)
- Vínculo opcional (3 campos condicionais — apenas um por vez):
  - Talhão (select dos talhões da fazenda)
  - Silo (select dos silos da fazenda)
  - Máquina (select das máquinas da fazenda)
- Observações (textarea opcional)

**Edição**:
- Mesmo modal do registro com campos pré-preenchidos
- Ao editar custo → atualiza `financeiro` atomicamente

**Exclusão**:
- Confirm dialog: "Excluir atividade e a despesa correspondente em Financeiro?"
- Rollback se financeiro falhar

### 6.3 KPIs (topo da página)
- Total gasto em mão de obra (mês corrente)
- Número de atividades registradas (mês corrente)
- Colaborador com mais atividades (mês corrente)
- Custo por tipo de atividade (mês corrente, top 3)

---

## 7. Estrutura de Arquivos

```
app/dashboard/mao-de-obra/
├── layout.tsx                      # Guard: redireciona Operador → /dashboard (useAuth)
├── page.tsx                        # RSC: busca dados iniciais (colaboradores + atividades + KPIs)
├── MaoDeObraClient.tsx             # Client hub: abas (Atividades | Colaboradores), KPIs, modais
├── actions.ts                      # 9 Server Actions (ver seção 8)
└── components/
    ├── ColaboradorForm.tsx          # Modal criar/editar colaborador
    ├── DeleteColaboradorDialog.tsx  # Confirm dialog exclusão colaborador
    ├── ColaboradoresList.tsx        # Tabela de colaboradores
    ├── AtividadeForm.tsx            # Modal registrar/editar atividade
    ├── DeleteAtividadeDialog.tsx    # Confirm dialog exclusão atividade
    ├── AtividadesList.tsx           # Tabela de atividades com filtros
    └── KpisSection.tsx              # Card de KPIs (custo mensal, atividades, etc.)

lib/
├── supabase/mao-de-obra.ts         # Queries: listColaboradores, listAtividades, getKpis
├── validations/mao-de-obra.ts      # Schemas Zod: colaboradorFormSchema, atividadeFormSchema
└── types/mao-de-obra.ts            # Tipos: Colaborador, AtividadeMaoObra, FuncaoColaborador, etc.
```

---

## 8. Server Actions (`actions.ts`)

| Action | Descrição |
|---|---|
| `criarColaboradorAction` | INSERT em `colaboradores` (Zod + sou_admin check) |
| `atualizarColaboradorAction` | UPDATE em `colaboradores` |
| `deletarColaboradorAction` | Soft-delete se tem atividades; hard-delete se não tem |
| `criarAtividadeAction` | INSERT atividade + colaboradores + financeiro (atômico) |
| `atualizarAtividadeAction` | UPDATE atividade + colaboradores + financeiro (atômico) |
| `deletarAtividadeAction` | DELETE financeiro → colaboradores → atividade (atômico) |

---

## 9. Schemas Zod

### `colaboradorFormSchema`
```typescript
z.object({
  nome: z.string().min(2).max(100),
  funcao: z.enum(['Vaqueiro', 'Tratorista', 'Auxiliar', 'Gerente', 'Outros']),
  vinculo: z.enum(['CLT', 'Diarista', 'Empreiteiro', 'Familiar']),
  tipo_valor: z.enum(['diaria', 'hora']),
  valor_ref: z.number().nonnegative(),
  observacoes: z.string().optional(),
})
```

### `atividadeFormSchema`
```typescript
z.object({
  data: z.string().min(1),
  tipo_atividade: z.enum([
    'Trato/alimentação do rebanho', 'Ordenha', 'Aplicação de defensivo',
    'Adubação', 'Silagem (colheita/compactação/cobertura)', 'Manutenção de cerca',
    'Manutenção de equipamento', 'Limpeza de instalações', 'Manejo sanitário',
    'Irrigação', 'Roçagem', 'Transporte interno', 'Outros',
  ]),
  colaboradores: z.array(z.string().uuid()).min(1, 'Selecione ao menos 1 colaborador'),
  duracao_tipo: z.enum(['horas', 'dias']),
  duracao_valor: z.number().positive(),
  custo_manual: z.number().nonnegative().optional().nullable(),
  talhao_id: z.string().uuid().optional().nullable(),
  silo_id: z.string().uuid().optional().nullable(),
  maquina_id: z.string().uuid().optional().nullable(),
  observacoes: z.string().optional(),
}).refine(
  (d) => [d.talhao_id, d.silo_id, d.maquina_id].filter(Boolean).length <= 1,
  { message: 'Associe a no máximo um: talhão, silo ou máquina' }
)
```

---

## 10. Navegação

**Sidebar**: novo item "Mão de Obra" em `gerencialRoutes` (mesma seção de Insumos, Financeiro, Produtos).
- Ícone: `Users` (Lucide)
- Rota: `/dashboard/mao-de-obra`
- Oculto para Operador

**Posição sugerida no Sidebar**: após "Produtos", antes de "Financeiro" ou junto à seção de custos operacionais.

---

## 11. Integrações Cross-Módulo

### Financeiro
- Toda atividade registrada gera Despesa em `financeiro` com `categoria = 'Mão de Obra'`
- `referencia_tipo = 'Mão de Obra'` para filtros futuros no módulo Financeiro
- Rastreabilidade: `atividades_mao_obra.despesa_id → financeiro.id`

### Talhões, Silos, Máquinas
- Vínculo opcional: associa a atividade ao contexto onde o trabalho foi feito
- Não há impacto funcional nas tabelas referenciadas — apenas leitura para exibição

### Pastagens (futuro)
- Quando o módulo Pastagens estiver integrado ao módulo Mão de Obra, adicionar `piquete_id uuid REFERENCES piquetes(id) ON DELETE SET NULL` via migration
- A coluna foi intencionalmente omitida do schema inicial para evitar campo morto

---

## 12. Queries Principais (`lib/supabase/mao-de-obra.ts`)

```typescript
// listColaboradores(supabase): Colaborador[]
// Selecionar: id, nome, funcao, vinculo, tipo_valor, valor_ref, ativo, observacoes

// listAtividades(supabase, filtros): AtividadeMaoObra[]
// Join: atividades_mao_obra_colaboradores → colaboradores(nome, funcao)
// Join: talhoes(nome), silos(nome), maquinas(nome) — LEFT JOIN, nullable
// Selecionar explícito de todas as colunas (sem select('*'))

// getKpisMensais(supabase): KpisMaoObra
// Filtro: data >= primeiro dia do mês corrente
// Retorna: custo_total, qtd_atividades, colaborador_destaque, top3_tipos
```

---

## 13. Checklist de Implementação (para SPEC)

- [ ] Migration SQL: criar `colaboradores`, `atividades_mao_obra`, `atividades_mao_obra_colaboradores`
- [ ] Migration SQL: RLS policies nas 3 tabelas
- [ ] `lib/types/mao-de-obra.ts` — tipos TypeScript
- [ ] `lib/validations/mao-de-obra.ts` — schemas Zod
- [ ] `lib/supabase/mao-de-obra.ts` — queries (sem select *)
- [ ] `app/dashboard/mao-de-obra/actions.ts` — 6 Server Actions
- [ ] `app/dashboard/mao-de-obra/layout.tsx` — guard Operador
- [ ] `app/dashboard/mao-de-obra/page.tsx` — RSC com Promise.all
- [ ] `app/dashboard/mao-de-obra/MaoDeObraClient.tsx` — hub client
- [ ] `components/` — 7 componentes UI
- [ ] Sidebar: adicionar item "Mão de Obra"
- [ ] `npm run build` sem erros TypeScript
- [ ] `npm run test` — 741+ testes passando
- [ ] Adicionar entradas em `database-snapshot.md`
- [ ] Atualizar `CLAUDE.md` com o novo módulo

---

## 14. Observações Técnicas

1. **`fazenda_id` em INSERT**: Nunca enviar manualmente — trigger `get_minha_fazenda_id()` preenche. Aplica-se às 3 novas tabelas.

2. **`select('*')` proibido**: Todas as queries devem listar colunas explicitamente.

3. **Cálculo de custo client-side**: `AtividadeForm.tsx` deve calcular custo em tempo real (`useEffect` ou `watch` do React Hook Form) ao selecionar colaboradores e mudar duração — só para preview. A Server Action recalcula no servidor antes de persistir.

4. **Rollback financeiro**: Se o INSERT em `financeiro` falhar após o INSERT em `atividades_mao_obra`, fazer DELETE da atividade antes de retornar erro — mesmo padrão de `criarSaidaProdutoAction` com `receita_id`.

5. **Edição de colaboradores ativos com atividades**: Permitir editar nome, função, vínculo e observações. Ao editar `valor_ref`, o custo das atividades passadas **não** é recalculado — apenas atividades futuras usam o novo valor.

6. **Tipo gerado `custo_final`**: coluna `GENERATED ALWAYS AS` evita lógica duplicada no código — sempre usar `custo_final` para exibição e para o INSERT em `financeiro`.

7. **Multi-select de colaboradores**: O campo `colaboradores` no formulário deve usar o componente `Combobox` do shadcn/ui (ou padrão similar ao `ProdutoAutocomplete.tsx`), permitindo busca e seleção múltipla com chips dos selecionados.
