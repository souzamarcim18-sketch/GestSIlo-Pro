# PRD — Mapeamento Completo do Módulo Rebanho
**Data:** 2026-05-07  
**Última Auditoria:** Refatoração Rebanho (sem edições — pesquisa apenas)  
**Status:** Mapeamento Detalhado de Implementação vs. Especificação

---

## RESUMO EXECUTIVO

O módulo de rebanho do GestSilo Pro possui **~60% de implementação** da especificação fornecida. A maior parte da estrutura de dados, queries e um fluxo básico de CRUD de animais/lotes estão em produção. Porém, vários submódulos críticos (Gestão Leiteira, Gestão de Corte, Sanidade completa, Movimentações) estão **ausentes ou apenas parcialmente implementados**. A estrutura de rotas também é confusa e não reflete a hierarquia de UI desejada.

---

## 1. MAPEAMENTO POR SEÇÃO DA ESPECIFICAÇÃO

### **3.1 — Cadastro de Lotes** ✅ 95% Implementado

#### ✅ Implementado:
- Tabela `lotes` no Supabase com colunas: `id`, `fazenda_id`, `nome`, `descricao`, `data_criacao`, `created_at`, `updated_at`
- Queries CRUD completas em `lib/supabase/rebanho.ts`:
  - `listLotes(limit, offset)` — lista paginada
  - `queryLotes.create(payload)` — cria novo lote
  - `queryLotes.update(id, payload)` — edita lote
  - `queryLotes.softDelete(id)` — soft delete
- Schema Zod para validação: `criarLoteSchema`, `editarLoteSchema`
- Página de listagem: `app/dashboard/rebanho/lotes/page.tsx`
- Página de criação: `app/dashboard/rebanho/lotes/novo/page.tsx`
- Página de detalhes: `app/dashboard/rebanho/lotes/[id]/page.tsx`
- RLS policies ativas: `lotes_select_todos`, `lotes_insert_admin_gerente`, `lotes_update_admin_gerente`, `lotes_delete_admin`

#### ⚠️ Parcialmente Implementado:
- **Edição de lote**: página existe mas com funcionalidade limitada
- **Histórico de composição**: não há registro histórico de quais animais pertenciam ao lote em cada data (requisito: "animais são associados e desassociados ao longo do tempo, gerando histórico de composição")

#### ❌ Não Implementado:
- Suporte a tipos de lote (Leiteiro, Corte, Misto) — tabela `lotes` não tem coluna `tipo_rebanho`
- Associação automática de animais por "divisões físicas ou de manejo" (ex: "Pasto 1 — Maternidade")

#### 🔴 Conflitos Estruturais:
- **Tipo do lote**: Especificação diz que cada lote tem `tipo_rebanho` (Leiteiro, Corte, Misto). Tabela não tem essa coluna.
  - Solução necessária: `ALTER TABLE lotes ADD COLUMN tipo_rebanho TEXT CHECK (tipo_rebanho IN ('leiteiro', 'corte', 'misto'));`

---

### **3.2 — Cadastro de Animais** ✅ 70% Implementado

#### ✅ Implementado:
- Tabela `animais` com campos:
  - `id`, `fazenda_id`, `brinco`, `sexo`, `tipo_rebanho`, `data_nascimento`
  - `categoria`, `status`, `lote_id`, `peso_atual`
  - `mae_id`, `pai_id`, `raca`, `observacoes`
  - `deleted_at`, `created_at`, `updated_at`

- Queries CRUD em `lib/supabase/rebanho.ts`:
  - `getByBrinco(brinco)`, `getById(id)`, `create(payload)`, `update(id, payload)`, `softDelete(id)`
  - `listAnimais(filters, limit, offset)` com suporte a filtros: status, lote_id, busca (brinco)
  - `listPesosPorAnimal(animalId)` — histórico de pesagens
  - `listEventosPorAnimal(animalId)` — eventos reprodutivos/sanitários

- Formulário de criação: `app/dashboard/rebanho/novo/page.tsx`
  - Campos obrigatórios: brinco, sexo, tipo_rebanho, data_nascimento
  - Campos opcionais: mae_id, pai_id, raca, lote_id, observacoes
  - Validação Zod: `criarAnimalSchema`, `editarAnimalSchema`

- Página de detalhes: `app/dashboard/rebanho/[id]/page.tsx` com:
  - Aba Resumo (dados do animal)
  - Aba Pesagens (histórico + gráfico de evolução de peso)
  - Aba Reprodutiva (eventos reprodutivos — parcial)
  - Aba Produção Leiteira (vazia — não implementada)
  - Aba Sanidade (vazia — não implementada)

- RLS policies ativas: `animais_select_todos`, `animais_insert_todos`, `animais_update_todos`, `animais_delete_admin`

#### ⚠️ Parcialmente Implementado:
- **Upload de foto**: não há suporte a upload de foto do animal (requisito: "foto do animal (upload opcional)")
- **Data estimada**: não há campo `data_estimada` (requisito: "caso não seja conhecida com precisão, o usuário poderá marcar o campo 'Data estimada'")
- **Código SISBOV/CRBIO**: não há coluna no banco (requisito: "Código SISBOV/CRBIO (opcional)")
- **Origem (Nascido/Comprado)**: não há coluna (requisito: "Origem (Nascido na propriedade / Comprado)")
- **Peso ao nascimento**: não há coluna (requisito: "Peso ao nascimento (opcional)")
- **Status do animal**: apenas 3 valores: 'Ativo', 'Morto', 'Vendido'. Especificação não menciona "Descartado" e "Transferido" mas eles estão em tipos TypeScript.
- **Edição de categoria**: categoria é calculada automaticamente no banco; não pode ser editada na UI (correto segundo spec, mas não há evidência de qual é o algoritmo de cálculo)

#### ❌ Não Implementado:
- Campo `nome` do animal — não há no banco nem no formulário (spec diz: "Nome (opcional)")
- Raça como lista pré-cadastrada editável pelo usuário (atualmente é texto livre)
- Busca por Pai/Mãe com autocomplete no formulário de criação (apenas UUIDs)
- Validação cruzada de sexo para campos pai/mãe (ex: pai sempre macho, mãe sempre fêmea)

#### 🔴 Conflitos Estruturais:
1. **Coluna `categoria`**: existe no banco, mas sua origem é desconhecida
   - TypeScript: `categoria: string` (não é enum)
   - Banco: sem CHECK constraint visível
   - Cálculo: não documentado qual é o algoritmo
   - **Risco**: formulário não pede categoria; criação falha silenciosamente se cálculo retornar nulo

2. **Status animal vs. status reprodutivo**: 
   - `animais.status` ('Ativo', 'Morto', 'Vendido')
   - `animais.status_reprodutivo` (referenciado em queries mas não em types/supabase.ts)
   - **Confusão**: qual é a fonte de verdade?

3. **Campos faltando no banco**:
   - `nome` (field in spec, not in database)
   - `sisbov_crbio` (optional, not in database)
   - `origem` (nascido vs. comprado, not in database)
   - `peso_nascimento` (optional, not in database)
   - `data_estimada` (boolean flag, not in database)

---

### **3.3 — Gestão do Rebanho (Listagem Geral)** ✅ 70% Implementado

#### ✅ Implementado:
- Página principal: `app/dashboard/rebanho/page.tsx`
- Tabela exibindo animais com colunas:
  - brinco, nome (vazio se não existe), sexo, categoria, tipo_rebanho, raca, lote_id, peso_atual, status
  - **Nota**: `nome` sempre vazio pois campo não existe

- Filtros funcionais:
  - Busca por brinco ou nome
  - Filtro por status (Ativo, Morto, Vendido)
  - Filtro por lote
  - **Nota**: filtro por tipo_rebanho e sexo NÃO implementados

- Linhas clicáveis → redirecionam para `/rebanho/[id]`

#### ⚠️ Parcialmente Implementado:
- **Filtro por tipo de rebanho**: UI tem select vazio (não funciona)
- **Filtro por sexo**: não existe no UI
- **Filtro por categoria**: não existe no UI
- **Botões de acesso rápido** (Dashboard, Gestão Reprodutiva, Gestão Leiteira, Gestão de Corte, Sanidade, Movimentações):
  - Alguns existem no Sidebar como submenu
  - Mas especificação diz "botões no topo da página de listagem"

#### ❌ Não Implementado:
- Botão "Dashboard do Rebanho" visível na página principal
- Botão "Gestão Reprodutiva" com link direto
- Botão "Gestão Leiteira" 
- Botão "Gestão de Corte"
- Botão "Sanidade"
- Botão "Movimentações"

---

### **3.4 — Ficha Individual do Animal** ✅ 60% Implementado

#### ✅ Implementado:
**Aba Resumo**: exibe dados do cadastro (brinco, sexo, tipo, categoria, raça, lote, status, peso atual, idade)
- Botão "Editar informações" → redireciona para `/[id]/editar`
- Botão "Alterar status" → abre diálogo para mudar status com data obrigatória
  - Para "Vendido": pede valor recebido e comprador
  - **Nota**: apenas Administrador pode deletar animal

**Aba Pesagens**: 
- Lista histórica de pesagens com colunas: data, peso, GMD, método, observações
- Gráfico de linha com evolução de peso ✅
- Botão "Registrar Pesagem" funcional

**Aba Reprodutiva**: 
- Lista de eventos reprodutivos (se houver)
- Botão "Registrar Evento Reprodutivo" existe (ver seção 3.6)

#### ⚠️ Parcialmente Implementado:
- **Foto do animal**: campo não existe no banco; formulário não permite upload
- **Peso atual calculado automaticamente**: há coluna `peso_atual` mas não está claro como é calculada (deve vir da última pesagem)
- **Idade atual calculada**: aparentemente calculada no frontend, não no banco
- **Editar status**: modal existe mas apenas com 3 opções (Morto, Vendido, e talvez mover para Descartado)

**Aba Produção Leiteira**: 
- Componente existe mas sempre vazio
- Requisito: visível apenas para fêmeas de rebanho leiteiro/dupla aptidão
- **Status**: NÃO IMPLEMENTADA

**Aba Sanidade**:
- Componente existe mas sempre vazio
- Requisito: histórico sanitário (vacinas, vermifugações, tratamentos)
- **Status**: NÃO IMPLEMENTADA

#### ❌ Não Implementado:
- Aba Produção Leiteira completa (exigida para fêmeas leiteiras)
- Aba Sanidade completa (para todos os animais)
- Foto do animal (upload + exibição)
- Cálculo automático de idade baseado em `data_nascimento`
- Indicador de "dias de lactação atual" (requisito leiteiro)

#### 🔴 Conflitos Estruturais:
- **Peso atual não é atualizado**: coluna `peso_atual` na tabela `animais` existe, mas não há trigger que atualize quando novas pesagens são adicionadas
  - Solução: trigger `atualizar_peso_animal_on_pesagem` que executa `UPDATE animais SET peso_atual = NEW.peso_kg WHERE id = NEW.animal_id`

---

### **3.5 — Dashboard do Rebanho** ✅ 50% Implementado

#### ✅ Implementado:
- Página: `app/dashboard/rebanho/indicadores/page.tsx`
- **Seção Composição do Rebanho**:
  - KPI: Total de animais ativos ✅
  - KPI: Total por tipo (Leiteiro, Corte) ✅ (provavelmente necessita refatoração para "Dupla aptidão")
  - KPI: Total por sexo (Machos, Fêmeas) ✅

- **Seção Distribuição por Categoria**:
  - Gráfico de barras/rosca ✅ (componente `GraficoComposicao.tsx`)
  - Filtro por tipo de rebanho ✅

- **Seção Indicadores do Período**:
  - Nascimentos registrados ✅
  - Mortes registradas + taxa de mortalidade % ✅
  - Taxa de natalidade ✅
  - **Nota**: Entradas/saídas por compra/descarte/venda não estão explícitas

- **Seção Evolução do Plantel**:
  - Gráfico de linha com evolução mês a mês ✅ (componente `GraficoEvolucaoEfetivo.tsx`)

- **Filtros**:
  - Período (último mês / 3 meses / 12 meses / custom) ✅
  - Lotes ✅
  - Categorias ✅

- **Indicadores Zootécnicos Gerais** (calculados em `lib/services/indicadores-rebanho.ts`):
  - GMD por animal ✅
  - Taxa de natalidade ✅
  - Taxa de mortalidade ✅
  - Composição por categoria ✅
  - Total de cabeças ✅

#### ⚠️ Parcialmente Implementado:
- **Distribuição por Lote**: existe na lógica mas não tem componente visual dedicado
- **Alertas e Pendências**: 
  - Requisito especifica: vacinas vencidas, partos previstos, fêmeas sem pesagem, fêmeas com retorno à lactação
  - **Não há implementação visível de alertas**

#### ❌ Não Implementado:
- **Alertas sanitários**: vacinas vencidas, partos previstos nos próximos 30 dias
- **Alertas de pesagem**: animais sem pesagem há 60+ dias
- **Alertas reprodutivos**: fêmeas em período seco com previsão de retorno

#### 🟡 Possíveis Issues:
- Indicadores são baseados em dados de `eventos_rebanho` e `pesos_animal`, mas:
  - Não há garanta que esses dados sejam completos (ex: nem todo parto é registrado como evento)
  - Performance pode degradar com muitos animais/eventos

---

### **3.6 — Gestão Reprodutiva** ✅ 40% Implementado

#### ✅ Implementado:
- Tabela `eventos_rebanho` no banco com suporte a vários tipos de eventos:
  - `tipo` campo que pode ser: cobertura, diagnostico_prenhez, parto, secagem, aborto, descarte, pesagem, morte, venda, transferencia_lote, nascimento
  - Colunas adicionais por tipo: `tipo_cobertura`, `metodo_diagnostico`, `resultado_prenhez`, `tipo_parto`, `motivo_descarte`, etc.

- Tipos TypeScript em `lib/types/rebanho-reproducao.ts`:
  - `EventoCobertura`, `EventoDiagnostico`, `EventoParto`, `EventoSecagem`, `EventoAborto`, `EventoDescarte`
  - Schemas Zod para validação de cada tipo

- Tabelas suportando:
  - `reprodutores` — gestão de touros/sêmen IA
  - `parametros_reprodutivos_fazenda` — configurações por fazenda
  - `lactacoes` — ciclos de lactação (para fêmeas leiteiras)
  - `eventos_parto_crias` — registro de crias ao nascer

- Página principal: `app/dashboard/rebanho/reproducao/page.tsx`
  - Exibe calendário reprodutivo com eventos dos últimos 120 dias
  - Componente: `CalendarioReprodutivo.tsx`

- Subpáginas:
  - `reproducao/eventos/page.tsx` — lista eventos reprodutivos
  - `reproducao/reprodutores/page.tsx` — gestão de reprodutores (touros/sêmen)
  - `reproducao/parametros/page.tsx` — configuração de parâmetros reprodutivos
  - `reproducao/repetidoras/page.tsx` — gestão de fêmeas repetidoras
  - `reproducao/indicadores/page.tsx` — indicadores reprodutivos

- Queries em `lib/supabase/rebanho-reproducao.ts`:
  - `queryEventosRebanho.create(payload)` — cria evento
  - `queryEventosRebanho.listByPeriodo(fazendaId, dataInicio, dataFim)` — lista por período
  - `queryReprodutor.list()`, `.create()`, `.update()` — CRUD reprodutores

#### ⚠️ Parcialmente Implementado:
- **Registro de eventos reprodutivos**: API existe mas formulários de entrada não estão 100% mapeados
  - Cobertura (monta natural, IA, IATF) — query existe, UI não confirmada
  - Diagnóstico de gestação — query existe, UI não confirmada
  - Parto — query existe, UI não confirmada
  - Secagem — query existe, UI não confirmada

- **Indicadores Reprodutivos**:
  - Taxa de prenhez ✅ (cálculo em `indicadores-rebanho.ts`)
  - Taxa de concepção — implementação não clara
  - Taxa de serviço — não implementada
  - IEP (Intervalo Entre Partos) — implementação não clara
  - Taxa de natalidade — ✅
  - Taxa de aborto — possível via `tipo = 'aborto'` mas não cálculo dedicado

- **Calendário Reprodutivo**:
  - Componente existe mas funcionalidade não confirmada
  - Deve exibir eventos em vista de calendário mensal

#### ❌ Não Implementado:
- **Formulários de entrada para cada tipo de evento**:
  - Sem UI clara para "Registrar Evento Reprodutivo"
  - Sem diálogos de preenchimento específico por tipo
  - Sem opção de registrar em lote (ex: IATF em múltiplas fêmeas)

- **Cálculos de indicadores específicos**:
  - Taxa de concepção à IA/IATF
  - Taxa de serviço (nº serviços por concepção)
  - Dias em aberto / dias vazia
  - Idade ao primeiro parto (novilhas)
  - Período de espera voluntário — PEV (dias)

- **Botão automático "Cadastrar cria"** após parto:
  - Requisito: "o sistema exibirá automaticamente um botão 'Cadastrar cria' que pré-preenche o formulário"
  - **Não implementado**

- **Validações de negócio**:
  - Prenhez não pode ter nova cobertura antes do parto
  - Diagnóstico negativo deve ter data posterior à última cobertura
  - Parto só é válido se há prenhez confirmada (ou admin faz bypass)

#### 🔴 Conflitos Estruturais:
1. **Tipo de evento genérico vs. específico**:
   - Banco tem `eventos_rebanho.tipo` que cobre TUDO (pesagem, morte, venda, cobertura, parto, etc.)
   - Especificação diz que cobertura, diagnóstico, parto, secagem, etc. devem ter campos específicos
   - **Solução atual**: polimorfismo via colunas opcionais (tipo_cobertura, metodo_diagnostico, tipo_parto)
   - **Risco**: validação complexa; fácil de errar

2. **Reprodutor externo vs. interno**:
   - Tabela `reprodutores` tem `tipo: 'touro' | 'semen_ia' | 'touro_teste'`
   - Para IA, pode vir de fora (sêmen comprado); não precisa estar cadastrado
   - Spec: "reprodutor/touro (nome, registro e raça — campo de texto livre, pois o sêmen pode ser de touros externos)"
   - **Implementação**: há campo `reprodutor_id` que é FK, mas também há campos texto para registro/raça
   - **Confusão**: qual é a fonte de verdade? ID ou texto livre?

---

### **3.7 — Gestão Leiteira** ❌ 0% Implementado

#### ✅ Implementado:
- Tabela `lactacoes` no banco com campos:
  - `id`, `fazenda_id`, `animal_id`, `data_inicio_parto`, `data_fim_secagem`, `producao_total_litros`, `observacoes`, `created_at`, `updated_at`

- Tipo TypeScript: `Lactacao` em `rebanho-reproducao.ts`

#### ⚠️ Parcialmente Implementado:
- **Registro de produção**:
  - Não há tabela `producoes_leiteiras` no banco visível no snapshot
  - Requisito pede campos: animal, data, turno, volume em litros, observações
  - **Não há schema/queries/UI para isso**

#### ❌ Não Implementado:
- **Página de Gestão Leiteira**: não existe `/dashboard/rebanho/leiteira` ou similar
- **Registro de produção individual**: sem UI para preenchimento
- **Registro de produção coletiva diária**: sem formulário
- **Status de lactação**: cálculo não existe (Em lactação, Seca, Novilha)
- **Indicadores Leiteiros**:
  - Produção média diária por vaca em lactação
  - Produção total da propriedade no período
  - Duração média das lactações
  - Persistência de lactação (% de manutenção)
  - Porcentagem de vacas em lactação
  - Produção acumulada por lactação
  - **Eficiência Alimentar** (litros de leite / kg MS consumida) — integração com silos não existe
- **Dashboard Leiteiro**:
  - Gráfico de produção diária/semanal/mensal
  - Ranking de vacas por produção
  - Lista de vacas em período seco
  - Alerta de queda de produção

#### 🔴 Tipo de Rebanho Incompleto:
- Especificação menciona "Dupla aptidão" mas tipos TypeScript só têm `LEITEIRO` e `CORTE`
  - **Solução necessária**: `export enum TipoRebanho { LEITEIRO = 'leiteiro', CORTE = 'corte', DUPLA = 'dupla_aptidao' }`
  - Categorias devem variar por tipo de rebanho
  - **Risco**: lógica de UI depende disso; mudança pode quebrar cálculos de categoria

---

### **3.8 — Gestão de Corte** ❌ 0% Implementado

#### ✅ Implementado:
- Suporte genérico em tipos/queries para peso e pesagens
- Cálculo de GMD (Ganho Médio Diário) em `lib/services/indicadores-rebanho.ts`

#### ❌ Não Implementado:
- **Página de Gestão de Corte**: não existe
- **Registro de pesagem em lote**: sem UI
- **Condição corporal**: tabela `pesos_animal` não tem coluna `condicao_corporal`
- **Indicadores de Corte**:
  - GMD por animal/lote ✅ (parcial — cálculo existe)
  - Peso médio do lote — não há agregação
  - Arrobas produzidas — não há cálculo
  - Conversão alimentar — não há integração com GestSilo
  - Projeção de abate — não existe
- **Dashboard de Corte**:
  - Peso médio por lote (cartões KPI)
  - GMD médio do rebanho
  - Evolução de peso por lote
  - Lista de animais próximos ao peso-alvo
  - Projeção de arrobas

---

### **3.9 — Sanidade** ❌ 10% Implementado

#### ✅ Implementado:
- Tabela `eventos_rebanho` tem coluna `tipo` que pode ser genérico
- **Muito pouco**: tipos TypeScript não têm definição de eventos sanitários

#### ❌ Não Implementado:
- **Tabela de eventos sanitários**: não há tabela específica (deveria estar em `eventos_rebanho` com tipo='vacinacao', 'vermifugacao', etc.)
- **Tipos de eventos sanitários**:
  - Vacinação (vacina, dose, via, lote, próxima dose, responsável)
  - Vermifugação/Antiparasitário
  - Tratamento Veterinário (diagnóstico, medicamentos, duração, resultado)
  - Exame Laboratorial (tipo, resultado, protocolo)
  - **Sem fields em banco; sem schemas Zod**

- **Calendário Sanitário**: não existe
- **Listagem geral de eventos sanitários**: sem UI
- **Alertas sanitários**: não existe (vacinações vencidas, próximas doses)
- **Dashboard Sanidade**: não existe

---

### **3.10 — Movimentações do Rebanho** ❌ 5% Implementado

#### ✅ Implementado:
- Tabela `eventos_rebanho` pode armazenar eventos de tipo `morte`, `venda`, `nascimento`, `transferencia_lote`, com campos opcionais para detalhes
- Colunas: `animal_id`, `tipo`, `data_evento`, `lote_id_destino` (para transferência), `comprador`, `valor_venda`, `observacoes`

#### ⚠️ Parcialmente Implementado:
- **Transferência entre lotes**: possível via evento, mas sem UI dedicada
- **Registro de morte**: possível ao alterar status do animal
- **Registro de venda**: possível ao alterar status do animal, mas sem formulário específico

#### ❌ Não Implementado:
- **Página de Movimentações**: não existe `/dashboard/rebanho/movimentacoes`
- **Tipos de entrada**:
  - Nascimento (com vínculo automático ao animal)
  - Compra (fornecedor, peso de entrada, valor)
  - **Sem UI**

- **Tipos de saída**:
  - Venda (com detalhes de comprador, peso, valor)
  - Morte (causa específica: doença/acidente/predador/desconhecida)
  - Descarte (motivo)
  - Abate próprio (peso, rendimento de carcaça)
  - **Sem UI específica; apenas genéricos**

- **Listagem consolidada**: sem página que mostre todas as movimentações com filtros
- **Integração com Dashboard**: movimentações não alimentam KPIs em tempo real

---

## 2. TABELAS DO BANCO — AUDITORIA ESTRUTURAL

### Tabelas Existentes e Estado

| Tabela | Campos Principais | RLS | Status | Notas |
|---|---|---|---|---|
| `animais` | id, fazenda_id, brinco, sexo, tipo_rebanho, data_nascimento, categoria, status, lote_id, peso_atual, mae_id, pai_id, raca, observacoes | ✅ | ✅ Produção | Faltam: nome, sisbov_crbio, origem, peso_nascimento, data_estimada, foto_url |
| `lotes` | id, fazenda_id, nome, descricao, data_criacao | ✅ | ✅ Produção | Falta: tipo_rebanho (Leiteiro/Corte/Misto) |
| `pesos_animal` | id, fazenda_id, animal_id, data_pesagem, peso_kg, observacoes | ✅ | ✅ Produção | Falta: condicao_corporal, metodo (balança/estimativa) |
| `eventos_rebanho` | id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes | ✅ | ✅ Produção | Polimórfico; colunas específicas: tipo_cobertura, metodo_diagnostico, resultado_prenhez, tipo_parto, motivo_descarte |
| `reprodutores` | id, fazenda_id, nome, tipo, raca, numero_registro, data_entrada, observacoes | ✅ | ✅ Produção | Bem definido |
| `parametros_reprodutivos_fazenda` | dias_gestacao, dias_seca, pve_dias, coberturas_para_repetidora, janela_repetidora_dias, meta_taxa_prenhez_pct, meta_psm_dias, meta_iep_dias | ✅ | ✅ Produção | Bem definido |
| `lactacoes` | id, fazenda_id, animal_id, data_inicio_parto, data_fim_secagem, producao_total_litros, observacoes | ✅ | ✅ Produção | Precisa de registros de produção diária (não existe tabela) |
| `eventos_parto_crias` | id, evento_id, fazenda_id, sexo, peso_kg, vivo, animal_criado_id | ✅ | ✅ Produção | Bem definido |
| `categorias_rebanho` | id, fazenda_id, nome, quantidade_cabecas, consumo_ms_kg_cab_dia | ✅ | ✅ Produção | Suporta categorias personalizadas por fazenda |

### Tabelas Faltando

| Tabela | Necessária Para | Prioridade | Comentários |
|---|---|---|---|
| `producoes_leiteiras` | Gestão Leiteira | 🔴 Alta | Precisa: animal_id, data, turno, volume_litros, observacoes |
| `eventos_sanitarios` | Sanidade | 🔴 Alta | Ou usar tipo em `eventos_rebanho`; precisa: tipo (vacina/vermifugacao/tratamento/exame), vacina_id (FK), dose, via, lote_produto, responsavel, data_proxima_dose, resultado |
| `vacinacoes_calendario` | Sanidade | 🟡 Média | Lista de vacinas pré-cadastradas por fazenda |
| `pesoabate` | Gestão Corte | 🟡 Média | Configuração de peso-alvo por categoria/raça |

---

## 3. ESTRUTURA DE ROTAS — PROBLEMAS ARQUITETURAIS

### Atual (Confuso)
```
/dashboard/rebanho/
├── page.tsx                    (lista de animais)
├── novo/page.tsx              (novo animal)
├── [id]/page.tsx              (detalhes animal)
├── [id]/editar/page.tsx       (editar animal)
├── lotes/page.tsx             (lista lotes)
├── lotes/novo/page.tsx        (novo lote)
├── lotes/[id]/page.tsx        (detalhes lote)
├── importar/page.tsx          (importar CSV)
├── indicadores/page.tsx       (indicadores gerais) 👈 NÃO no Sidebar
└── reproducao/                (submódulo separado)
    ├── layout.tsx             (layout wrapper)
    ├── TabsNav.tsx            (tabs navigation)
    ├── page.tsx               (vazio? stub?)
    ├── eventos/page.tsx       (eventos reprodutivos)
    ├── indicadores/page.tsx   (indicadores reprodutivos) 👈 DUPLICADO
    ├── parametros/page.tsx    (parâmetros reprodutivos)
    ├── repetidoras/page.tsx   (fêmeas repetidoras)
    └── reprodutores/page.tsx  (touros/sêmen)
```

### Esperado (Segundo Spec)
```
/dashboard/rebanho/
├── page.tsx                    (lista de animais)
├── novo/page.tsx              (novo animal)
├── [id]/page.tsx              (detalhes animal com abas: resumo, pesagens, reprodução, produção, sanidade)
├── [id]/editar/page.tsx       (editar animal)
├── lotes/page.tsx             (lista lotes)
├── lotes/novo/page.tsx        (novo lote)
├── lotes/[id]/page.tsx        (detalhes lote)
├── importar/page.tsx          (importar CSV)
├── indicadores/page.tsx       (dashboard geral)
├── reproducao/page.tsx        (gestão reprodutiva)
├── leiteira/page.tsx          (gestão leiteira — NÃO IMPLEMENTADA)
├── corte/page.tsx             (gestão de corte — NÃO IMPLEMENTADA)
├── sanidade/page.tsx          (gestão sanitária — NÃO IMPLEMENTADA)
└── movimentacoes/page.tsx     (movimentações — NÃO IMPLEMENTADA)
```

### Problemas:
1. **Indicadores não estão no Sidebar**: usuário não consegue navegar diretamente
2. **Reprodução é subseção desnecessária**: `/reproducao` é um wrapper que redireciona para abas, não uma página real
3. **Indicadores duplicados**: `/indicadores` e `/reproducao/indicadores` são ambos visíveis; qual é qual?
4. **Padrão de navegação inconsistente**: reprodução usa tabs, indicadores é página standalone
5. **Submódulos invisíveis**: Gestão Leiteira, Gestão de Corte, Sanidade, Movimentações não têm rotas nem links visíveis

---

## 4. ANÁLISE DE TIPOS TYPESCRIPT

### Discrepâncias entre Types e Banco

| Campo | Especificação | Banco | TypeScript | Status |
|---|---|---|---|---|
| `Animal.nome` | Opcional | ❌ Não existe | ✅ Campo em types | 🔴 Mismatch |
| `Animal.sisbov_crbio` | Opcional | ❌ Não existe | ❌ Não definido | 🔴 Missing |
| `Animal.origem` | Obrigatório | ❌ Não existe | ❌ Não definido | 🔴 Missing |
| `Animal.peso_nascimento` | Opcional | ❌ Não existe | ❌ Não definido | 🔴 Missing |
| `Animal.data_estimada` | Boolean flag | ❌ Não existe | ❌ Não definido | 🔴 Missing |
| `Animal.foto_url` | Upload | ❌ Não existe | ❌ Não definido | 🔴 Missing |
| `Lote.tipo_rebanho` | Enum (leiteiro/corte/misto) | ❌ Não existe | ❌ Não definido | 🔴 Missing |
| `PesoAnimal.metodo` | Enum (Balança/Estimativa) | ❌ Não existe | ❌ Não definido | 🔴 Missing |
| `PesoAnimal.condicao_corporal` | Enum (1-5) | ❌ Não existe | ❌ Não definido | 🔴 Missing |
| `EventoRebanho.tipo` | Discriminated union | ✅ Existe | ✅ Bem tipado | ✅ OK |
| `TipoRebanho.DUPLA_APTIDAO` | Dupla aptidão | ❌ Não no enum | ❌ Não definido | 🔴 Missing |
| `EventoRebanho.status_reprodutivo` | Referenciado em queries | ❓ Possível | ❌ Não em types/supabase | 🟡 Unclear |

---

## 5. VALIDAÇÃO ZOD vs. CHECK CONSTRAINTS

### Gaps Identificados

| Validação | Zod Schema | PostgreSQL CHECK | Status |
|---|---|---|---|
| Brinco obrigatório | ✅ `min(1)` | ❓ Desconhecido | 🟡 Possível |
| Data nascimento não futura | ✅ Custom refine | ❓ Sem trigger visível | 🟡 Possível |
| Sexo (Macho/Fêmea) | ✅ Enum | ❓ Desconhecido | 🟡 Possível |
| Tipo rebanho (leiteiro/corte) | ✅ Enum | ❓ Desconhecido | 🟡 Possível |
| Categoria válida por tipo | ❌ Não implementado | ❓ Desconhecido | 🔴 Missing |
| Status animal válido | ❌ Não definido | ❓ Desconhecido | 🔴 Missing |
| Peso > 0 | ❌ Não implementado | ❓ Desconhecido | 🔴 Missing |

---

## 6. INDICADORES ZOOTÉCNICOS — MAPEAMENTO DE CÁLCULOS

### Implementados ✅

| Indicador | Fórmula | Arquivo | Status |
|---|---|---|---|
| **GMD** | (Peso_Final - Peso_Inicial) / dias | `indicadores-rebanho.ts:calculateGMD()` | ✅ Produção |
| **Taxa Natalidade** | bezerros nascidos / fêmeas aptas × 100 | `indicadores-rebanho.ts:calculateTaxaNatalidade()` | ✅ Produção |
| **Taxa Mortalidade** | mortes / total_animais × 100 | `indicadores-rebanho.ts:calculateTaxaMortalidade()` | ✅ Produção |
| **Composição** | count por categoria | `indicadores-rebanho.ts:calculateComposicao()` | ✅ Produção |
| **Total Cabeças** | count(animais) where status='Ativo' | `indicadores-rebanho.ts:totalAnimais()` | ✅ Produção |

### Parcialmente Implementados 🟡

| Indicador | Status | Notas |
|---|---|---|
| **IEP (Intervalo Entre Partos)** | 🟡 Parcial | Dados de `lactacoes` existem; cálculo necessário: (data_fim_secagem - data_inicio_parto) em dias, média dos últimos 12 meses |
| **Taxa Prenhez** | 🟡 Parcial | Precisa count(eventos where tipo='diagnostico_prenhez' AND resultado='positivo'); implementável |
| **Taxa Concepção** | 🟡 Parcial | Precisa count(eventos IA que resultou em prenhez) / total IA; lógica complexa |
| **IPP (Idade Primeira Parição)** | 🟡 Parcial | Precisa datediff(parto_evento, data_nascimento) para novilhas; possível mas complexo |

### Não Implementados ❌

| Indicador | Requisitado Para | Complexidade |
|---|---|---|
| **Taxa de Desmame** | Corte | 🟡 Média (evento 'desmame' necessário) |
| **Persistência de Lactação** | Leiteira | 🔴 Alta (requer modelo matemático) |
| **Conversão Alimentar** | Corte + Leiteira | 🔴 Alta (integração com GestSilo/silos) |
| **Projeção de Abate** | Corte | 🟡 Média (GMD × dias-alvo) |
| **Eficiência Alimentar** | Leiteira | 🔴 Alta (litros / kg MS consumida — integração externa) |
| **Arrobas Produzidas** | Corte | 🟡 Média (peso × % rendimento carcaça) |
| **Período Espera Voluntário (PEV)** | Leiteira | 🔴 Alta (estatísticas reprodutivas complexas) |

---

## 7. QUERIES SUPABASE — AUDITORIA

### Queries Existentes em `lib/supabase/rebanho.ts`

✅ **Implementadas**:
- `listAnimais(filters, limit, offset)` — OK
- `queryAnimais.getById(id)` — OK
- `queryAnimais.getByBrinco(brinco)` — OK
- `queryAnimais.create(payload)` — OK, sem envio de `fazenda_id` (bom)
- `queryAnimais.update(id, payload)` — OK
- `queryAnimais.softDelete(id)` — OK
- `listLotes(limit, offset)` — OK
- `queryLotes.create()`, `.update()`, `.softDelete()` — OK
- `listEventosPorAnimal(animalId)` — OK
- `listPesosPorAnimal(animalId)` — OK
- `queryEventos.create(payload)` — Possível, não confirmado
- `queryEventos.update()` — Possível, não confirmado

❌ **Faltando**:
- Queries para registros sanitários
- Queries para produção leiteira
- Queries para relatórios de movimentações
- Queries para cálculos de conversão alimentar/eficiência

---

## 8. COMPONENTES & PÁGINAS — STATUS

### Páginas RSC (Server Components)

| Rota | Arquivo | Implementado | Funcional |
|---|---|---|---|
| `/rebanho` | `page.tsx` | ✅ | ✅ Lista animais, filtros básicos |
| `/rebanho/novo` | `novo/page.tsx` | ✅ | ⚠️ Erro desconhecido em criação, UUID do lote exibido |
| `/rebanho/[id]` | `[id]/page.tsx` | ✅ | ✅ Ficha com 5 abas; Leiteira/Sanidade vazias |
| `/rebanho/[id]/editar` | `[id]/editar/page.tsx` | ✅ | ✅ Edição básica |
| `/rebanho/lotes` | `lotes/page.tsx` | ✅ | ✅ Lista lotes |
| `/rebanho/lotes/novo` | `lotes/novo/page.tsx` | ✅ | ✅ Cria lote |
| `/rebanho/lotes/[id]` | `lotes/[id]/page.tsx` | ✅ | ✅ Detalhes lote |
| `/rebanho/importar` | `importar/page.tsx` | ✅ | ✅ Import CSV |
| `/rebanho/indicadores` | `indicadores/page.tsx` | ✅ | ✅ Dashboard com 14+ indicadores |
| `/rebanho/reproducao` | `reproducao/page.tsx` | ✅ | ⚠️ Wrapper vazio, redireciona para layout |
| `/rebanho/reproducao/eventos` | `reproducao/eventos/page.tsx` | ✅ | ⚠️ Componente existe, conteúdo não claro |
| `/rebanho/reproducao/indicadores` | `reproducao/indicadores/page.tsx` | ✅ | 🟡 Duplicado com `/indicadores` |
| `/rebanho/reproducao/parametros` | `reproducao/parametros/page.tsx` | ✅ | ✅ Edição de parâmetros |
| `/rebanho/reproducao/reprodutores` | `reproducao/reprodutores/page.tsx` | ✅ | ✅ Gestão de reprodutores |
| `/rebanho/reproducao/repetidoras` | `reproducao/repetidoras/page.tsx` | ✅ | ⚠️ Conteúdo não claro |
| `/rebanho/leiteira` | Não existe | ❌ | ❌ |
| `/rebanho/corte` | Não existe | ❌ | ❌ |
| `/rebanho/sanidade` | Não existe | ❌ | ❌ |
| `/rebanho/movimentacoes` | Não existe | ❌ | ❌ |

---

## 9. PROBLEMAS CRÍTICOS RESUMIDOS

### 🔴 Impedem Uso da Aplicação

1. **[CRÍTICA] Erro desconhecido ao criar animal**
   - Localização: `novo/page.tsx` + `actions.ts`
   - Problema: toast genérico não revela causa; validação Zod falha silenciosamente
   - Impacto: Usuário não consegue criar animais
   - Solução: Passar erro específico de validação ao componente

2. **[CRÍTICA] UUID do lote em vez de nome no select**
   - Localização: `novo/page.tsx` (linha 147-154)
   - Problema: `SelectValue` exibe ID em vez de label quando há defaultValue
   - Impacto: Confusão ao selecionar lote
   - Solução: Customizar comportamento do select ou usar componente diferente

3. **[CRÍTICA] Indicadores não acessíveis via menu**
   - Localização: `Sidebar.tsx`
   - Problema: `/indicadores` não está em `rebanhoSubRoutes`
   - Impacto: Feature invisível; usuário não consegue navegar
   - Solução: Adicionar link no Sidebar ou criar botões na página principal

### 🟡 Confusão, Mas Funciona

4. **Estrutura de rotas confusa**: `/reproducao` é submenu desnecessário
5. **Indicadores duplicados**: `/indicadores` vs `/reproducao/indicadores`
6. **Padrões inconsistentes**: abas vs páginas standalone
7. **Categorias**: calculadas automaticamente; impossível saber qual será até criação

### 🔴 Funcionalidade Completamente Ausente

8. **Gestão Leiteira**: sem página, sem formulários, sem indicadores
9. **Gestão de Corte**: sem página, sem indicadores específicos
10. **Sanidade**: sem página, sem eventos sanitários, sem alertas
11. **Movimentações**: sem página consolidada

---

## 10. CONFLITOS DE ESTRUTURA DE DADOS PARA REFATORAÇÃO

### Problemas de Modelagem

1. **Coluna `categoria` é mágica**
   - Existe no banco mas sem algoritmo documentado
   - Tipos TypeScript não definem quais categorias são válidas
   - **Solução proposta**:
     - Adicionar tabela `categorias_animais_tipo_rebanho`:
       ```
       - tipo_rebanho: 'leiteiro' | 'corte' | 'dupla_aptidao'
       - sexo: 'Macho' | 'Fêmea'
       - categoria_nome: 'Bezerro', 'Novilha', 'Vaca em Lactação', etc.
       - peso_minimo_kg, peso_maximo_kg: para cálculo automático
       ```
     - Trigger que popula `animais.categoria` baseado em `tipo_rebanho + sexo + peso_atual`

2. **Tipo de rebanho não suporta Dupla Aptidão**
   - Enum TypeScript só tem `LEITEIRO`, `CORTE`
   - Faltando: `DUPLA_APTIDAO`
   - **Solução**: adicionar ao enum e tabela de categorias

3. **Eventos Rebanho é polimórfico demais**
   - Uma tabela para 10+ tipos de eventos com campos específicos opcionais
   - **Risco**: fácil inserir evento com campos incoerentes
   - **Solução alternativa**: 
     - Manter `eventos_rebanho` como tabela genérica
     - Criar sub-tabelas especializadas (`eventos_cobertura`, `eventos_parto`, etc.) com FK
     - Mais normalizado; mais queries JOINs

4. **Peso atual não é mantido sincronizado**
   - `animais.peso_atual` existe mas não há trigger para atualizar
   - **Solução**: trigger `ON INSERT INTO pesos_animal UPDATE animais SET peso_atual = ...`

5. **Produções leiteiras não têm tabela**
   - Spec pede "registro de produção de forma individual ou coletiva"
   - Sem tabela no banco; sem schema TypeScript
   - **Solução necessária**: 
     ```sql
     CREATE TABLE producoes_leiteiras (
       id UUID PRIMARY KEY,
       fazenda_id UUID NOT NULL,
       animal_id UUID NOT NULL,
       data DATE NOT NULL,
       turno TEXT NOT NULL, -- 'Manhã' | 'Tarde' | 'Noite' | 'Dia inteiro'
       volume_litros NUMERIC NOT NULL,
       observacoes TEXT,
       created_at TIMESTAMP DEFAULT now(),
       FOREIGN KEY (animal_id) REFERENCES animais(id),
       FOREIGN KEY (fazenda_id) REFERENCES fazendas(id)
     );
     ```

6. **Eventos sanitários não estruturados**
   - Spec descreve 4 tipos: vacinação, vermifugação, tratamento, exame
   - Sem tabela dedicada
   - **Solução**: usar `eventos_rebanho` com `tipo IN ('vacinacao', 'vermifugacao', 'tratamento_veterinario', 'exame_laboratorial')`
   - Ou tabela específica `eventos_sanitarios` com FK

---

## 11. RESUMO PERCENTUAL DE IMPLEMENTAÇÃO

| Módulo | % Implementado | Prioridade para Refatoração |
|---|---|---|
| Cadastro de Lotes | **95%** | 🟢 Baixa (apenas faltam: tipo_rebanho, histórico) |
| Cadastro de Animais | **70%** | 🟡 Média (faltam: nome, foto, origem, sisbov, data_estimada) |
| Listagem de Animais | **70%** | 🟡 Média (faltam filtros: tipo, categoria, sexo) |
| Ficha Individual | **60%** | 🟡 Média (abas Leiteira e Sanidade vazias) |
| Dashboard Rebanho | **50%** | 🟡 Média (faltam alertas sanitários/reprodutivos) |
| Gestão Reprodutiva | **40%** | 🔴 Alta (formulários, indicadores específicos) |
| Gestão Leiteira | **0%** | 🔴 Alta (página, tabelas, indicadores) |
| Gestão de Corte | **0%** | 🔴 Alta (página, indicadores específicos) |
| Sanidade | **10%** | 🔴 Alta (tabelas, eventos, alertas) |
| Movimentações | **5%** | 🔴 Alta (página consolidada, integrações) |
| **MÓDULO GERAL** | **~60%** | 🟡 Média (refatoração de arquitetura de rotas necessária) |

---

## 12. RECOMENDAÇÕES PARA REFATORAÇÃO

### Ordem de Prioridade

1. **Phase 1 — Correções Críticas** (semana 1)
   - Erro desconhecido na criação de animal → passar erro específico
   - UUID do lote → customizar select
   - Adicionar indicadores ao menu sidebar

2. **Phase 2 — Reestruturação de Rotas** (semana 2-3)
   - Remover `/reproducao/page.tsx` vazio
   - Consolidar indicadores em uma única rota
   - Adicionar rotas para Leiteira, Corte, Sanidade, Movimentações
   - Criar botões de acesso rápido na página principal

3. **Phase 3 — Gestão Reprodutiva Completa** (semana 4-6)
   - Formulários de entrada para cada tipo de evento
   - Indicadores reprodutivos específicos
   - Validações de negócio (prenhez, coberturas, etc.)
   - Botão "Cadastrar cria" automático após parto

4. **Phase 4 — Gestão Leiteira & Corte** (semana 7-10)
   - Tabelas de produção leiteira
   - Indicadores leiteiros (produção média, duração lactação, etc.)
   - Indicadores de corte (GMD, arrobas, projeção abate)
   - Dashboards específicos

5. **Phase 5 — Sanidade & Movimentações** (semana 11-14)
   - Tabela de eventos sanitários com alertas
   - Calendário sanitário
   - Página consolidada de movimentações
   - Rastreamento bidirecional

6. **Phase 6 — Refatoração de Dados** (ongoing)
   - Adicionar coluna `tipo_rebanho` aos lotes
   - Adicionar coluna `dupla_aptidao` ao enum TipoRebanho
   - Implementar trigger para `peso_atual`
   - Documentar algoritmo de cálculo de categoria
   - Criar tabelas de produção leiteira

---

## CONCLUSÃO

O módulo de Rebanho está **50-60% implementado** segundo a especificação fornecida. A fundação (CRUD de animais/lotes, indicadores básicos, estrutura reprodutiva) está sólida, mas faltam submódulos críticos (Leiteira, Corte, Sanidade) e há problemas de arquitetura de rotas/UI que dificultam a navegação. A refatoração será longa mas viável; recomenda-se começar com correções críticas e depois avançar para submódulos completos.

**Estimativa de esforço**: 12-16 semanas para implementação completa (incluindo testes e QA).
