# PRD — Módulo de Planejamento de Compras de Insumos

**Versão:** 1.1  
**Data:** 2026-05-19  
**Fase:** 1 — Planejamento & Pesquisa  
**Status:** Aprovado — pronto para Fase 2 (Spec)

---

## 1. Resumo Executivo

O produtor não tem hoje uma forma estruturada de planejar quais insumos precisa comprar para atividades futuras. A solução proposta permite cadastrar atividades de campo planejadas por talhão com os insumos necessários, consolidar automaticamente a demanda total por insumo, descontar o estoque atual, e gerar uma lista de compras com quantidade e valor estimado. A funcionalidade é construída sobre tabelas existentes (`atividades_campo`, `insumos`, `movimentacoes_insumo`), com adição de duas novas tabelas de ligação.

---

## 2. Problema & Oportunidade

**Problema central:** O produtor planeja mentalmente ou em papel o que vai precisar comprar antes de cada safra. Não há visibilidade consolidada de demanda por insumo, o que leva a compras emergenciais caras, excesso de estoque ou falta de produto no momento certo.

**Oportunidade:** O GestSilo Pro já possui o cadastro de insumos com estoque em tempo real e o cadastro de talhões. Conectar essas duas peças com um planejamento de atividades gera valor imediato: o sistema calcula o que falta comprar automaticamente, sem planilhas externas.

---

## 3. Personas & Permissões

| Perfil | Pode planejar atividade | Pode vincular insumos | Pode marcar como comprado | Pode excluir planejamento |
|--------|------------------------|----------------------|--------------------------|--------------------------|
| **Administrador** | ✅ | ✅ | ✅ | ✅ |
| **Operador** | ✅ | ✅ | ✅ | ❌ |
| **Visualizador** | ❌ (leitura) | ❌ (leitura) | ❌ | ❌ |

**Rationale:**
- Operador executa o trabalho de campo, portanto pode criar e gerenciar planejamentos e marcar insumos como comprados. Não pode excluir porque a exclusão pode apagar histórico relevante.
- Visualizador acessa o relatório de compras para acompanhamento, sem alterar nada.

---

## 4. User Stories

1. Como **Administrador**, quero cadastrar uma atividade de campo planejada (ex.: "Adubação de cobertura — Talhão Norte") com data prevista e status `planejada`, para que o sistema saiba o que precisa ser feito.

2. Como **Administrador ou Operador**, quero vincular insumos a uma atividade planejada informando a quantidade necessária, para que o sistema calcule a demanda total.

3. Como **Administrador ou Operador**, quero ver uma lista consolidada de compras agrupada por insumo, mostrando quantidade total planejada, estoque atual, quantidade a comprar e valor estimado, para tomar decisões de compra sem precisar calcular manualmente.

4. Como **Administrador ou Operador**, quero filtrar o relatório de compras por período, talhão ou status da atividade, para focar no que é urgente.

5. Como **Administrador ou Operador**, quero marcar um insumo da lista de compras como "comprado", para que o sistema registre a entrada no estoque e retire o item da lista de pendências.

6. Como **Visualizador**, quero consultar a lista de compras sem editar nada, para acompanhar o planejamento da fazenda.

7. Como **Administrador**, quero cancelar uma atividade planejada, para que os insumos vinculados a ela não apareçam mais na lista de compras.

---

## 5. Achados da Pesquisa

### 5.1 Tabela `insumos` — preço unitário

- **Coluna `preco_unitario` existe** (`numeric | null`). Não é necessário criar.
- O campo já é editável no cadastro de insumos existente.
- Existe também `custo_medio` (calculado automaticamente pelas movimentações). Para o valor estimado de compra, usar `preco_unitario` (preço de mercado esperado), pois `custo_medio` reflete compras passadas e pode estar desatualizado.
- Quando `preco_unitario` for `null`, exibir valor estimado como "—" (não calcular).
- Demais colunas relevantes: `nome`, `unidade`, `estoque_atual`, `estoque_minimo`, `ativo`, `fazenda_id`.

### 5.2 Tabela `atividades_campo` — status

- A tabela **existe** com as seguintes colunas relevantes: `id`, `talhao_id`, `ciclo_id`, `tipo_operacao`, `data`, `custo_total`, `insumo_id`, `dose_ton_ha`, `fazenda_id`, `created_at`, `updated_at`.
- **Não possui coluna `status`**. A tabela atual registra atividades já ocorridas (passado), não atividades futuras planejadas.
- `insumo_id` aceita apenas **um insumo por atividade** — não suporta múltiplos insumos.
- **Decisão:** Criar uma nova tabela `planejamentos_atividade` em vez de adicionar `status` à `atividades_campo` existente. Isso evita quebrar a semântica atual da tabela (que registra atividades realizadas) e permite múltiplos insumos por atividade planejada.

### 5.3 Estoque de insumos — controle atual

- Estoque controlado pela coluna `insumos.estoque_atual` (valor denormalizado, atualizado por triggers ou pela aplicação a cada movimentação).
- Movimentações registradas em `movimentacoes_insumo` com `tipo IN ('Entrada', 'Saída', 'Ajuste')`.
- Para saldo atual: ler diretamente `insumos.estoque_atual` — **não** recalcular via soma de movimentações.
- Quando o insumo for marcado como comprado (ação desta feature), criar um registro em `movimentacoes_insumo` com `tipo = 'Entrada'` e `origem = 'planejamento'` para manter a rastreabilidade.

### 5.4 Tabela `talhoes` — estrutura mínima

- Colunas disponíveis: `id`, `nome`, `area_ha` (em hectares), `tipo_solo`, `status`, `fazenda_id`.
- `status` do talhão é independente do status da atividade planejada.
- Para o planejamento, usar apenas `id`, `nome` e `area_ha`.

### 5.5 RLS e isolamento por fazenda

- Todas as tabelas autenticadas usam `fazenda_id` como chave de isolamento.
- O banco impõe RLS via funções SQL (`get_minha_fazenda_id()`, `sou_admin()`, `sou_gerente_ou_admin()`).
- A aplicação aplica `.eq('fazenda_id', fazendaId)` em todas as queries (dupla camada de proteção).
- As novas tabelas devem seguir o mesmo padrão: RLS com `fazenda_id` preenchido automaticamente pelo trigger `get_minha_fazenda_id()`.

### 5.6 Roles — Admin vs Operador

- Verificação de perfil via `profile.perfil` (`'Administrador' | 'Operador' | 'Visualizador'`).
- Deleção protegida por RLS no banco (policies `sou_admin()`) e por guards na UI.
- Operador pode criar/editar mas não deletar — mesmo padrão usado no módulo Rebanho.
- Guard de leitura para Visualizador: layout ou page-level check.

---

## 6. Escopo Funcional

### 6.1 Cadastro de atividade planejada

**Campos obrigatórios:**
- Talhão (`talhao_id`) — seleção via autocomplete
- Tipo de operação — enum fixo: `Plantio | Adubação de base | Adubação de cobertura | Pulverização | Calagem | Outro`
- Data prevista — date picker
- Status — `planejada` (default ao criar)

**Campos opcionais:**
- Observações — texto livre
- Ciclo agrícola (`ciclo_id`) — vínculo opcional com ciclos existentes

**Validações:**
- Data prevista: não pode ser no passado (warning, não bloqueio — o produtor pode querer registrar atividade atrasada)
- Talhão: deve pertencer à fazenda do usuário

### 6.2 Vínculo de insumos à atividade

- Uma atividade pode ter **N insumos** (relação N:N via tabela de ligação `planejamento_insumos`)
- Campos por insumo vinculado:
  - Insumo (`insumo_id`) — autocomplete por nome, mostra unidade
  - Quantidade necessária — numérico positivo
  - Unidade — preenchida automaticamente do cadastro do insumo (read-only)
- Adicionar/remover insumos inline na tela de edição da atividade
- Insumo inativo (`ativo = false`) não deve aparecer no autocomplete

### 6.3 Tela/relatório consolidado de compras

**Agrupamento:** uma linha por insumo (não por atividade)

**Colunas:**
| Coluna | Fonte |
|--------|-------|
| Insumo | `insumos.nome` |
| Unidade | `insumos.unidade` |
| Total planejado | SUM(`planejamento_insumos.quantidade`) WHERE atividade.status = 'planejada' |
| Estoque atual | `insumos.estoque_atual` |
| Quantidade a comprar | MAX(0, total_planejado − estoque_atual) |
| Preço unitário | `insumos.preco_unitario` |
| Valor estimado | quantidade_a_comprar × preco_unitario (ou "—" se preco_unitario NULL) |
| Status compra | `pendente` / `comprado parcialmente` / `comprado` |

**Filtros disponíveis:**
- Período de data das atividades (de / até)
- Talhão
- Status da atividade (`planejada`, `executada`, `cancelada`)
- Apenas insumos com necessidade de compra (toggle: ocultar quem tem estoque suficiente)

**Ordenação padrão:** valor estimado decrescente (prioriza maior gasto)

**Ordenações alternativas:** nome do insumo, quantidade a comprar

### 6.4 Ação "Marcar como comprado"

**Recomendação técnica: Movimentação completa de estoque (Entrada em `movimentacoes_insumo`)**

**Justificativa:** A opção simples (apenas marcar flag `comprado`) não atualiza o estoque, exige sincronização manual posterior e cria inconsistência: o relatório diria "comprado" mas o estoque continuaria mostrando a necessidade. A versão com movimentação completa mantém o banco como única fonte de verdade, é rastreável, e o produtor vê o estoque atualizado imediatamente após a compra.

**Fluxo da ação:**
1. Usuário clica em "Marcar como comprado" na linha do insumo no relatório
2. Modal solicita: quantidade comprada (padrão: quantidade a comprar), valor unitário pago (padrão: `preco_unitario`), data de compra (padrão: hoje)
3. Sistema cria `movimentacoes_insumo` com `tipo = 'Entrada'`, `origem = 'planejamento'`, preenchendo `fazenda_id` automaticamente
4. `insumos.estoque_atual` é atualizado (trigger ou aplicação, seguindo padrão existente)
5. Relatório recalcula `quantidade_a_comprar` automaticamente

**Compra parcial:** se quantidade comprada < quantidade necessária, status do insumo no relatório fica `comprado parcialmente` até zerar a necessidade.

### 6.5 Cálculo de necessidade e valor estimado

```
quantidade_a_comprar = MAX(0, total_planejado − estoque_atual)
valor_estimado       = quantidade_a_comprar × preco_unitario   (se preco_unitario IS NOT NULL)
total_geral_estimado = SUM(valor_estimado) de todos os insumos com preco_unitario preenchido
```

- Se `estoque_atual >= total_planejado`: exibir quantidade a comprar = 0, status = "Estoque suficiente"
- Estoque atual reflete movimentações em tempo real (sem cache manual nesta feature)

---

## 7. Fora de Escopo (Fase 1)

- Geração de pedido de compra em PDF ou envio para fornecedor
- Integração financeira automática com o módulo Financeiro ao marcar como comprado (apenas a movimentação de entrada no estoque — sem criar lançamento em `financeiro`)
- Alertas por notificação push ou e-mail sobre atividades próximas
- Importação em lote de atividades planejadas via CSV
- Versionamento ou histórico de alterações no planejamento
- Recomendação automática de insumos baseada em tipo de cultura ou histórico
- Comparação entre planejado vs. realizado (análise pós-safra)
- Agrupamento por ciclo agrícola no relatório (apenas por insumo na Fase 1)

---

## 8. Regras de Negócio

1. Uma atividade planejada pertence a exatamente um talhão.
2. Uma atividade pode ter zero ou mais insumos vinculados.
3. O mesmo insumo não pode aparecer duas vezes na mesma atividade (deduplica na UI e no banco via unique constraint).
4. Atividades com status `cancelada` ou `executada` **não entram** no cálculo de quantidade a comprar.
5. O relatório de compras considera **todas as atividades planejadas** dentro do filtro de período selecionado.
6. `quantidade_a_comprar` nunca é negativa — estoque excedente não é subtraído de outros insumos.
7. Ao marcar como comprado, a quantidade comprada deve ser > 0.
8. Ao marcar como comprado, o valor unitário pago é opcional — se informado, é registrado em `movimentacoes_insumo.valor_unitario`.
9. Insumos inativos (`ativo = false`) não podem ser adicionados a novos planejamentos; os já vinculados permanecem visíveis com indicação visual de inativo.
10. Somente Administrador pode excluir uma atividade planejada. Exclusão remove também os vínculos de insumos (cascade).
11. Executar uma atividade (status `executada`) não cria movimentação de estoque automaticamente — isso é responsabilidade da funcionalidade existente de saídas de insumos.
12. O `preco_unitario` usado no cálculo é o valor atual em `insumos.preco_unitario` no momento da consulta — não é congelado ao criar o planejamento.

---

## 9. Fluxos Principais

### Fluxo A — Criar atividade planejada com insumos

1. Usuário acessa "Ferramentas" > "Plan. Compras" no Sidebar
2. Clica em "Nova Atividade"
3. Preenche: talhão, tipo de operação, data prevista; salva
4. Na tela da atividade, clica "Adicionar Insumo"
5. Seleciona insumo, informa quantidade; repete para cada insumo
6. Atividade fica com status `planejada`

### Fluxo B — Consultar lista de compras

1. Usuário acessa "Ferramentas" > "Plan. Compras" > aba "Lista de Compras"
2. Sistema exibe relatório consolidado com filtro padrão: próximos 90 dias, status `planejada`
3. Usuário ajusta filtros se necessário
4. Visualiza quantidade a comprar e valor estimado por insumo

### Fluxo C — Marcar insumo como comprado

1. Na "Lista de Compras", clica "Marcar como comprado" na linha do insumo
2. Modal aparece com campos: quantidade comprada, valor unitário pago, data
3. Confirma → sistema cria movimentação de entrada, estoque atualiza
4. Linha do relatório mostra status atualizado (suficiente ou parcialmente comprado)

### Fluxo D — Cancelar atividade

1. Usuário abre a atividade planejada
2. Altera status para `cancelada`
3. Sistema remove os insumos dessa atividade do cálculo do relatório de compras

---

## 10. Critérios de Aceitação

- [ ] Administrador e Operador conseguem criar atividades planejadas com talhão, tipo e data
- [ ] É possível vincular múltiplos insumos com quantidade a uma atividade
- [ ] O mesmo insumo não pode ser adicionado duas vezes à mesma atividade (erro claro na UI)
- [ ] Atividades com status `cancelada` ou `executada` não aparecem na lista de compras
- [ ] O relatório agrupa por insumo (não por atividade) e calcula corretamente: total planejado, estoque atual, quantidade a comprar
- [ ] `quantidade_a_comprar` é 0 quando `estoque_atual >= total_planejado`
- [ ] Valor estimado exibe "—" quando `preco_unitario` é nulo
- [ ] Total geral estimado ignora insumos sem `preco_unitario`
- [ ] Filtros de período, talhão e status da atividade funcionam corretamente
- [ ] "Marcar como comprado" cria movimentação em `movimentacoes_insumo` com `tipo = 'Entrada'` e `origem = 'planejamento'`
- [ ] Após marcar como comprado, `insumos.estoque_atual` é atualizado imediatamente
- [ ] Compra parcial (quantidade < necessidade) mantém status `comprado parcialmente`
- [ ] Visualizador vê o relatório em leitura mas não vê botões de criar/editar/comprar
- [ ] Operador não vê botão de excluir atividade
- [ ] Insumos inativos não aparecem no autocomplete de novos vínculos
- [ ] Isolamento por fazenda: usuário não vê atividades de outras fazendas
- [ ] Build sem erros TypeScript; testes existentes continuam passando (673+)

---

## 11. Riscos & Dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `insumos.estoque_atual` desatualizado (inconsistência de trigger) | Baixa | Médio | Documentar como limitação; a feature lê o valor existente sem recalcular |
| `preco_unitario` não preenchido na maioria dos insumos | Média | Baixo | Exibir banner/alerta no relatório sugerindo preencher preços; valor estimado opcional |
| Usuário criar atividade para talhão de outra fazenda via manipulação de payload | Baixa | Alto | RLS + validação server-side do `talhao_id` pertencer à fazenda |
| Performance do relatório com muitas atividades/insumos | Baixa | Médio | Índice em `planejamento_insumos.insumo_id` e `planejamentos_atividade.fazenda_id`; paginação se necessário |

**Dependências:**
- Módulo de Insumos existente (leitura de `insumos` e escrita em `movimentacoes_insumo`)
- Módulo de Talhões existente (leitura de `talhoes`)
- Ciclos Agrícolas (opcional — vínculo loosely-coupled)
- Padrão de autenticação/RLS já implementado (sem dependência nova)

---

## 12. Métricas de Sucesso

- **Adoção:** ≥ 60% dos usuários ativos criam pelo menos 1 atividade planejada no primeiro mês após lançamento
- **Qualidade do dado:** ≥ 70% dos insumos cadastrados têm `preco_unitario` preenchido após 30 dias do lançamento (indica engajamento com a funcionalidade de valor estimado)
- **Conclusão de ciclo:** ≥ 40% das atividades criadas com status `planejada` transitam para `executada` ou têm pelo menos 1 insumo marcado como comprado
- **Satisfação:** feedback qualitativo positivo sobre redução de compras emergenciais (coletado via canal de suporte)

---

## Decisões de Produto (registradas em 2026-05-19)

| # | Decisão | Escolha |
|---|---------|---------|
| 1 | Localização no Sidebar | Item próprio **"Plan. Compras"** dentro do grupo **Ferramentas**, junto com "Plan. Silagem" e "Calculadoras" |
| 2 | Tipos de operação | **Enum fixo**: `Plantio \| Adubação de base \| Adubação de cobertura \| Pulverização \| Calagem \| Outro` |
| 3 | Ciclo agrícola | **Opcional** |
| 4 | Integração com Financeiro ao comprar | **Fora de escopo na Fase 1** — usuário cadastra entrada de insumo manualmente via módulo de Insumos |
| 5 | Rota | `/dashboard/planejamento-compras` |
| 6 | Insumo sem `preco_unitario` | Exibir no relatório com valor estimado **"—"** (não ocultar) |
