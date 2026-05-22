# PRD — Card "Alertas Críticos" (Dashboard)

> **Documento gerado em:** 2026-05-21  
> **Autor:** Claude Code (mapeamento de escopo)  
> **Status:** Rascunho — aguardando aprovação para implementação

---

## 1. Situação Atual

### 1.1 O card hoje

O card "Alertas Críticos" existe em [DashboardClient.tsx](../app/dashboard/DashboardClient.tsx) (linhas 250–261) e é **100% estático**:

```tsx
<Card className="bg-card rounded-2xl p-6 ...">
  <h2>Alertas Críticos</h2>
  <CheckCircle2 className="text-status-success" />
  <p>Tudo em ordem!</p>
  <p className="text-xs">Não há alertas críticos ou manutenções pendentes para hoje.</p>
</Card>
```

Não recebe nenhuma prop de dados. Não há campo `alertas` em `DashboardData`. O card ocupa o canto inferior direito do dashboard, numa coluna ao lado de "Atividades Recentes".

### 1.2 Dados que já chegam em DashboardData (aproveitáveis sem nova query)

| Campo em `DashboardData` | Como é calculado | Possível alerta derivável |
|---|---|---|
| `maquinasDetalhe` | Contagem de `manutencoes` com `proxima_manutencao >= mesInicio` | "N manutenção(ões) pendente(s)" — já exibido no KPI card de Frota, mas não no card de Alertas |
| `silosOcupacaoPctNum` | Calculado a partir de `estoquePorSilo` | Silo com < 10% de ocupação pode ser alerta de estoque crítico de silagem |
| `silosAutonomiaDias` | `totalEstoqueAtual / consumoDiario` | Autonomia < 30 dias = alerta de abastecimento |
| `silosTaxaPerdas` | `totalDescarte / totalSaidas` nos últimos 30 dias | Taxa de perdas > 10% = alerta de qualidade |
| `proximasOperacoes` | `eventos_dap` dos próximos 5 dias | Operações com `status = 'atrasado'` já têm dado suficiente para gerar alerta |

**Problema central**: `page.tsx` não transforma nenhum desses dados em alertas estruturados antes de passar para o Client Component. O Client Component exibe os KPIs sem síntese de alertas.

---

## 2. Mapeamento de Tabelas Relevantes no Banco

> Todas as tabelas abaixo constam em `docs/database-snapshot.md` com RLS ativo e acessíveis via `fazenda_id`.

### 2.1 Insumos — Estoque Abaixo do Mínimo

**Tabela:** `insumos`  
**Colunas críticas:** `nome`, `unidade`, `estoque_atual`, `estoque_minimo`, `ativo`  
**Condição de alerta:** `estoque_atual < estoque_minimo AND ativo = true`  
**RLS:** `insumos_select_todos` — todos os perfis da fazenda leem  
**Função SQL existente:** `get_insumos_abaixo_minimo(p_fazenda_id uuid)` — retorna `SETOF insumos`  
**Pattern já implementado:** `app/dashboard/insumos/components/AlertsSection.tsx` usa exatamente esse padrão com `criticos: Insumo[]`

### 2.2 Frota — Manutenções Vencidas ou Urgentes

**Tabela:** `manutencoes`  
**Colunas críticas:** `maquina_id`, `proxima_manutencao`, `status`, `data_prevista`, `fazenda_id`  
**Condição de alerta:**  
- `proxima_manutencao <= hoje` (manutenção vencida)  
- `proxima_manutencao entre hoje e hoje+7` (urgente, nos próximos 7 dias)  
**RLS:** `manutencoes_select_todos` — todos os perfis da fazenda leem  
**Join necessário:** `maquinas(nome)` para exibir o nome da máquina  
**Observação:** A query atual em `page.tsx` conta manutenções do mês inteiro (`proxima_manutencao >= mesInicio`), o que inclui manutenções já realizadas. A query de alerta precisa filtrar por `status != 'concluida'` e pela data relativa a hoje.

### 2.3 Sanidade — Vacinações Vencendo

**Tabela:** `eventos_sanitarios`  
**Colunas críticas:** `animal_id`, `tipo`, `vacina_nome`, `data_proxima_dose`, `deleted_at`  
**Condição de alerta:** `tipo = 'vacinacao' AND data_proxima_dose <= hoje+15 AND deleted_at IS NULL`  
**RLS:** Não consta no `database-snapshot.md` (snapshot de 27/04/2026, tabela criada depois). Função `listAlertasVacinacao()` já implementada em `lib/supabase/rebanho-sanitario.ts` com filtro de `diasAntecedencia = 15`.  
**Tipo já definido:** `AlertaSanitario` em `lib/types/rebanho-sanitario.ts` com `dias_para_vencimento` calculado (negativo = vencido).  
**Join necessário:** `animais(brinco, nome)` — já feito na função existente.

### 2.4 Produtos — Estoque Abaixo do Mínimo

**Tabela:** `produtos` (criada em 2026-05-19, não consta no snapshot)  
**Colunas relevantes:** `nome`, `unidade`, `estoque_atual`, `estoque_minimo`, `ativo`  
**Condição de alerta:** `estoque_atual < estoque_minimo AND ativo = true`  
**RLS:** `sou_admin_ou_visualizador()` — Operador não acessa  
**Pattern já implementado:** `app/dashboard/produtos/components/AlertsSection.tsx` (idêntico ao de insumos)

### 2.5 Silos — Baixa Autonomia / Alta Taxa de Perdas

**Tabela:** `movimentacoes_silo` + cálculo em memória  
**Condição de alerta:**  
- Autonomia calculada < 30 dias → alerta "Estoque crítico de silagem"  
- Taxa de perdas dos últimos 30 dias > 10% → alerta "Taxa de perdas elevada"  
**Dados já disponíveis em `DashboardData`:** `silosAutonomiaDias` (string formatada) e `silosTaxaPerdas` (string com `%`). Necessário expor os valores numéricos brutos para comparação.

### 2.6 Talhões — Operações Atrasadas

**Tabela:** `eventos_dap`  
**Condição de alerta:** `status = 'Atrasado'` (campo já existe na tabela e no dado `proximasOperacoes`)  
**Dados já disponíveis em `DashboardData`:** `proximasOperacoes` inclui `status`. Basta filtrar no Client Component ou ao construir o objeto `DashboardData`.

---

## 3. Padrão de Alerta

### 3.1 Interface proposta

```typescript
// Em dashboard-data.ts
export interface AlertaCritico {
  id: string;                          // identificador único do alerta (slug + index)
  tipo: 'estoque_insumo'
      | 'estoque_produto'
      | 'manutencao_vencida'
      | 'manutencao_urgente'
      | 'vacinacao_vencida'
      | 'vacinacao_urgente'
      | 'silagem_baixa_autonomia'
      | 'silagem_perdas_elevadas'
      | 'operacao_atrasada';
  severidade: 'critico' | 'urgente' | 'aviso';
  titulo: string;                      // ex: "Ração Concentrada — Estoque Crítico"
  detalhe: string;                     // ex: "2,5 kg (mín: 50 kg)"
  href: string;                        // link para o módulo correspondente
}
```

### 3.2 Mapeamento severidade → cor

| Severidade | Cor | Ícone |
|---|---|---|
| `critico` | `text-status-danger` / `bg-status-danger/15` | `AlertCircle` |
| `urgente` | `text-status-warning` / `bg-status-warning/15` | `AlertTriangle` |
| `aviso` | `text-status-info` / `bg-status-info/15` | `Info` |

---

## 4. Escopo de Implementação

### Etapa 1 — Dados Existentes (zero novas queries ao banco)

Derivar alertas a partir do que `page.tsx` já carrega:

| Alerta | Origem dos dados | Lógica |
|---|---|---|
| Operações atrasadas | `proximasOperacoes` (já em `DashboardData`) | Filtrar `status === 'Atrasado'` |
| Baixa autonomia de silagem | `silosOcupacaoPctNum` + valor numérico de autonomia | Expor `silosAutonomiaDiasNum: number` raw (hoje é só string formatada) |
| Taxa de perdas elevada | `silosTaxaPerdas` | Expor `silosTaxaPerdasNum: number` raw |
| Manutenções no mês | `maquinasDetalhe` | Já está calculado; reexpor como `manutencoesPendentesCount: number` |

**Mudanças necessárias:**
1. Adicionar campos numéricos brutos em `DashboardData` (`silosAutonomiaDiasNum`, `silosTaxaPerdasNum`, `manutencoesPendentesCount`)
2. Preencher esses campos em `page.tsx` (a aritmética já existe, basta não descartar o número)
3. Adicionar campo `alertas: AlertaCritico[]` em `DashboardData`
4. Construir a lista de alertas em `page.tsx` antes do `return <DashboardClient ...>`
5. Passar `alertas` para `DashboardClient` e renderizar dinamicamente

**Impacto:** Sem latência adicional. Sem novas queries.

---

### Etapa 2 — Novas Queries (dados não disponíveis hoje)

Cada item abaixo requer uma query adicional em `page.tsx` dentro do `Promise.all` existente:

#### 2a. Insumos abaixo do mínimo

```sql
-- Equivalente Supabase SDK:
supabase
  .from('insumos')
  .select('id, nome, unidade, estoque_atual, estoque_minimo')
  .eq('fazenda_id', fazendaId)
  .eq('ativo', true)
  .filter('estoque_atual', 'lt', 'estoque_minimo')  -- requer lógica JS pós-query
  -- OU usar a função RPC existente: get_insumos_abaixo_minimo(fazenda_id)
```

> **Alternativa eficiente:** Usar a função SQL `get_insumos_abaixo_minimo(p_fazenda_id)` já existente via `.rpc()`.

**Severidade:** `critico` se `estoque_atual = 0`, `urgente` se `estoque_atual < estoque_minimo`  
**href:** `/dashboard/insumos`

#### 2b. Manutenções vencidas ou urgentes (próximos 7 dias)

```sql
-- Query refinada (hoje a query conta manutenções do mês):
supabase
  .from('manutencoes')
  .select('id, proxima_manutencao, status, maquinas(nome)')
  .eq('fazenda_id', fazendaId)
  .neq('status', 'concluida')
  .lte('proxima_manutencao', proximosSete)  -- hoje + 7 dias
  .order('proxima_manutencao', { ascending: true })
  .limit(5)
```

**Severidade:** `critico` se `proxima_manutencao <= hoje`, `urgente` se `proxima_manutencao <= hoje+7`  
**href:** `/dashboard/frota`

#### 2c. Vacinações vencendo (próximos 15 dias)

Reusar `listAlertasVacinacao(15)` de `lib/supabase/rebanho-sanitario.ts`.

> **Atenção:** Essa função usa `'use server'` e `createSupabaseServerClient()` internamente — pode ser chamada diretamente de `page.tsx` sem instanciar um novo cliente.

**Severidade:** `critico` se `dias_para_vencimento < 0` (vencida), `urgente` se `dias_para_vencimento <= 7`  
**href:** `/dashboard/rebanho/sanidade`

#### 2d. Produtos abaixo do mínimo (tabela `produtos`)

```sql
supabase
  .from('produtos')
  .select('id, nome, unidade, estoque_atual, estoque_minimo')
  .eq('fazenda_id', fazendaId)
  .eq('ativo', true)
  .lt('estoque_atual', 'estoque_minimo')  -- requer lógica pós-query pois não há RPC
```

> **Restrição de perfil:** `produtos` usa `sou_admin_ou_visualizador()` — Operador não lê essa tabela. O alerta só aparecerá para Admin e Visualizador. Isso é consistente com o modelo de autorização.

**Severidade:** `urgente`  
**href:** `/dashboard/produtos`

---

## 5. Limitações e Decisões de Design

### 5.1 Limite de alertas exibidos

O card ocupa `lg:col-span-1` (canto inferior direito). Altura máxima recomendada: **5 alertas**. Se houver mais, exibir badge com contagem (ex: "+3 alertas") e link "Ver tudo".

### 5.2 Estado "Tudo em ordem"

Manter a tela atual com `CheckCircle2` e texto "Tudo em ordem!" quando `alertas.length === 0`. Isso é explicitamente claro para o usuário.

### 5.3 Ordem de prioridade

Ordenar por severidade descendente (crítico → urgente → aviso), depois por módulo.

### 5.4 Perfil Operador

O Operador acessa o dashboard mas não vê produtos/insumos (RLS bloqueia e guarda de perfil no layout). Para o card de alertas:
- Alertas de `insumos` e `produtos`: queries retornarão vazio para Operador (RLS)
- Alertas de vacinação, manutenção, silagem: Operador recebe normalmente
- **Nenhuma lógica condicional de perfil** necessária no card — RLS resolve silenciosamente

### 5.5 Performance

A Etapa 2 adiciona **até 4 queries** ao `Promise.all` em `page.tsx`. Todas são simples (sem joins pesados, com índices em `fazenda_id`). Impacto estimado: < 50ms de latência adicional (as queries são paralelas).

A função `listAlertasVacinacao` já usa `createSupabaseServerClient()` internamente e pode ser chamada diretamente de `page.tsx`, mas isso cria **dois clientes Supabase** na mesma requisição. Alternativa: inlinar a query de vacinação diretamente em `page.tsx` usando o cliente já instanciado.

---

## 6. Arquivos a Modificar

| Arquivo | Mudança | Etapa |
|---|---|---|
| [dashboard-data.ts](../app/dashboard/dashboard-data.ts) | Adicionar `alertas: AlertaCritico[]` + campos numéricos brutos + interface `AlertaCritico` | 1 + 2 |
| [page.tsx](../app/dashboard/page.tsx) | Adicionar novas queries ao `Promise.all`, construir array `alertas`, passar para Client | 1 + 2 |
| [DashboardClient.tsx](../app/dashboard/DashboardClient.tsx) | Substituir bloco estático por renderização dinâmica de `data.alertas` | 1 + 2 |

**Nenhum arquivo novo** precisa ser criado. Nenhuma migration de banco.

---

## 7. Fora do Escopo (não implementar sem instrução)

- Alertas financeiros (saldo negativo, despesas acima do orçamento) — requer definição de regras de negócio
- Alertas de reprodução (IEP elevado, animais sem cobertura) — dados não chegam no dashboard hoje
- Notificações push / email para alertas — infraestrutura separada
- Badge de alertas no Sidebar / favicon — fora do card
- Persistência de alertas lidos/descartados — sem tabela de suporte
- Alertas de qualidade bromatológica dos silos — nenhuma regra de threshold definida

---

## 8. Resumo Executivo

| Item | Detalhe |
|---|---|
| Card atual | 100% estático, sem dados reais |
| Dados deriváveis sem nova query | Operações atrasadas, autonomia silagem, perdas silagem, contagem manutenções |
| Novas queries necessárias (Etapa 2) | 4: insumos críticos, manutenções vencidas/urgentes, vacinações vencendo, produtos críticos |
| Arquivos a modificar | 3 (dashboard-data.ts, page.tsx, DashboardClient.tsx) |
| Migrations de banco | Nenhuma |
| Novas funções SQL | Nenhuma (reusar `get_insumos_abaixo_minimo`) |
| Restrição de perfil | RLS resolve automaticamente para Operador |
| Risco | Baixo — queries simples, padrão já estabelecido em outros módulos |
