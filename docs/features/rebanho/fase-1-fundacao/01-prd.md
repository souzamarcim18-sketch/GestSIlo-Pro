# PRD — Módulo de Rebanho — Fase 1: Fundação

**Status**: ✅ Aprovado | **Data**: 2026-04-30 | **Versão**: 1.1

---

## 1. Objetivo da Fase 1

Viabilizar o cadastro inicial e contínuo de animais de um rebanho leiteiro/corte, com lançamento de eventos básicos (nascimento, pesagem, morte, venda, transferência de lote) e importação em massa via CSV. Estabelecer a fundação de dados para alimentar o Planejamento de Silagem (Fase 3) com informações reais do rebanho.

**Resultado esperado ao final da Fase 1**:
- Produtor consegue cadastrar 100 animais em menos de 30 minutos (via CSV)
- Lançamento de evento no curral em até 3 toques (mobile)
- Dashboard com visão viva do rebanho (animais, lotes, eventos)
- Dados prontos para consumo pelo Planejamento de Silagem

---

## 2. User Stories

### Perfil: Administrador

1. **Como Administrador, quero importar animais via CSV** para cadastrar rapidamente o rebanho inicial sem preencher 100+ formulários manualmente.

2. **Como Administrador, quero visualizar todas as movimentações de animais** para auditoria e conformidade com registros zootécnicos.

3. **Como Administrador, quero deletar um lote inteiro** para corrigir erros de organização sem impactar registros de eventos.

4. **Como Administrador, quero exportar relatórios do rebanho em PDF** para documentação e relatórios financeiros.

### Perfil: Operador

5. **Como Operador, quero cadastrar um animal novo** para registrar natimortos ou compras de forma rápida.

6. **Como Operador, quero lançar eventos de pesagem** para acompanhar ganho de peso do rebanho.

7. **Como Operador, quero registrar morte ou venda de animal** para atualizar o status do rebanho em tempo real.

8. **Como Operador, quero mover um animal entre lotes** para refletir reorganizações de manejo.

9. **Como Operador, quero visualizar animais por lote e filtrar por status** para trabalhar de forma organizada no curral.

10. **Como Operador, quero acessar a tela de lançamento de evento no modo offline** para registrar eventos mesmo sem WiFi no curral.

### Perfil: Visualizador

11. **Como Visualizador, quero visualizar lista completa de animais** para consultar genealogia e histórico.

12. **Como Visualizador, quero filtrar animais por sexo, categoria automática e status** para análises rápidas.

13. **Como Visualizador, quero ver histórico de eventos de um animal** para rastreabilidade total.

---

## 3. Requisitos Funcionais

### Cadastro & Listagem

**RF-01**: Sistema deve permitir cadastro manual de animal individual com campos: número/ID animal, sexo (Macho/Fêmea), tipo rebanho (leiteiro/corte), data nascimento, lote (referência FK), categoria automática (vide seção 9).

**RF-02**: Sistema deve permitir importação via arquivo CSV com mapeamento de colunas. Colunas obrigatórias: numero_animal, sexo, data_nascimento. Colunas opcionais: tipo_rebanho (default: 'leiteiro'), lote_id, raca, observacoes.

**RF-03**: Validação de CSV: rejeitar se sexo ≠ {Macho, Fêmea}, se data_nascimento > hoje, se numero_animal vazio. Erros devem listar linha e motivo.

**RF-04**: Ao importar, sistema deve criar lote automaticamente se não existir (com nome "Importação YYYY-MM-DD") e atribuir animais a ele.

**RF-05**: Listagem de animais deve permitir filtros: status (Ativo, Morto, Vendido), sexo, lote, categoria, intervalo de data nascimento. Apenas admin visualiza animais deletados (deleted_at IS NOT NULL) via checkbox opcional.

**RF-06**: Listagem deve exibir grid com colunas: ID, Nome/Nº, Sexo, Categoria, Data Nasc., Status, Ações (Ver, Editar, Deletar).

**RF-07**: Paginação na listagem de animais (50 por página, mobile: 25).

**RF-08**: Busca por número/nome de animal em tempo real (debounced 300ms).

### Detalhes & Edição de Animal

**RF-09**: Página de detalhe de animal exibe: ID, sexo, data nascimento, categoria, lote atual, peso atual (último registro), genealogia (mãe_id, pai_id), observações.

**RF-10**: Edição de animal permite alterar: sexo, data nascimento, lote, observações. Não permite alterar ID animal (imutável).

**RF-11**: Ao alterar data nascimento, categoria automática deve ser recalculada (vide seção 9).

**RF-12**: Deletar animal deve ser bloqueado se tiver eventos lançados. Mensagem: "Animal com eventos não pode ser deletado. Registre como morto/vendido."

**RF-13**: Soft delete: marcar animal como Deletado (coluna deleted_at), não remover do banco. Apenas admin visualiza deletados via checkbox.

### Lotes

**RF-14**: Lote é um agrupamento lógico de animais. Campos: nome, descricao, data_criacao, fazenda_id. FK: nenhum (não tem ciclo_id).

**RF-15**: Criar lote via dialog em Rebanho → Lotes ou inline ao importar CSV.

**RF-16**: Listar lotes com contagem de animais ativos/total. Grid 2-3 colunas.

**RF-17**: Editar lote permite alterar nome e descrição.

**RF-18**: Deletar lote é bloqueado se contiver animais ativos. Mensagem: "Transfira todos os animais antes de deletar o lote."

**RF-19**: Transferência em massa: permitir mover N animais entre lotes via multiselect + menu ação.

### Eventos — Lançamento

**RF-20**: Evento é um registro histórico imutável. Campos: id, animal_id, tipo (enum), data_evento, peso_kg (se aplicável), observacoes, usuario_id, created_at, fazenda_id.

**RF-21**: Tipos de evento na Fase 1: nascimento, pesagem, morte, venda, transferencia_lote.

**RF-22**: Lançamento via dialog com formulário mobile-first (campos grandes, teclado numérico para peso).

**RF-23**: Validação de evento: data_evento ≤ hoje, peso_kg > 0, animal_id deve existir e estar em status Ativo.

**RF-24**: Após lançar evento, atualizar campo `status` do animal:
- nascimento → status = 'Ativo'
- morte → status = 'Morto'
- venda → status = 'Vendido'
- transferencia_lote → permanecer 'Ativo'
- pesagem → não altera status

**RF-25**: Peso do animal deve ser armazenado em tabela separada `pesos_animal` (id, animal_id, data_pesagem, peso_kg, fazenda_id) para histórico longitudinal.

**RF-26**: Campo `peso_atual` no animal é computed: MAX(peso_kg) from pesos_animal onde animal_id = X ORDER BY data_pesagem DESC LIMIT 1.

**RF-27**: Eventos não podem ser editados. Permitir apenas visualização e exclusão (soft delete com deleted_at) em caso de erro. Apenas admin pode deletar evento.

**RF-28**: Listar eventos de um animal em abas/tabs: Nascimento, Pesagens, Mortes/Vendas/Transferências. Ordenado por data DESC.

### Offline & Sincronização

**RF-29**: Eventos lançados offline devem ser enfileirados em IndexedDB (tabela `eventos_rebanho_sync_queue`) com status='pendente'.

**RF-30**: Ao reconectar, sincronizar fila automaticamente. Apresentar toast: "X eventos sincronizados."

**RF-31**: Se sincronização falhar após 3 tentativas, apresentar notificação persistente com botão "Tentar Novamente" e "Ver Fila".

### Genealogia & Categorização

**RF-32**: Animal pode ter mãe_id e pai_id (FKs para animais da mesma fazenda). Opcional.

**RF-33**: Ao visualizar detalhe, exibir árvore de genealogia simplificada: [Mãe] ← Animal → [Pai].

**RF-34**: Categoria automática deve ser calculada conforme seção 9. Campo `categoria` é atualizado sempre que data_nascimento muda.

### Integração com Planejamento de Silagem

**RF-35**: API interna `GET /api/rebanho/animais-ativos?fazenda_id=X` retorna lista de animais com status='Ativo' para consumo pelo Planejamento de Silagem.

**RF-36**: Cada animal retorna: id, numero_animal, sexo, categoria, peso_atual, data_nascimento para cálculos de requisição de MS.

---

## 4. Requisitos Não-Funcionais

### Performance

**RNF-01**: Listagem de 1000+ animais deve carregar em < 2s. Usar índices em (fazenda_id, status, lote_id, created_at).

**RNF-02**: Busca em tempo real deve retornar resultados em < 500ms. Usar índice em (fazenda_id, numero_animal).

**RNF-03**: Importação de 500 linhas de CSV deve processar em < 10s no servidor.

**RNF-04**: Queries devem usar select explícito de colunas (nunca select('*')).

### Segurança & RLS

**RNF-05**: RLS obrigatório em tabelas: animais, pesos_animal, eventos_rebanho, lotes. Todas filtradas por fazenda_id.

**RNF-06**: Função RLS: `sou_admin()` retorna true se perfil='Administrador' via JWT. Verificação inline em policies.

**RNF-07**: Soft delete via deleted_at deve ser respeitado em RLS: admin vê todos, operador/visualizador veem apenas não-deletados.

**RNF-08**: fazenda_id nunca é enviado no payload de INSERT — preenchido via trigger SQL.

**RNF-09**: Policy RLS para delete: apenas admin pode deletar eventos.

### Mobile & Offline

**RNF-10**: Tela de lançamento de evento (dialog) deve ser mobile-first: campo de entrada com min 48px altura, teclado numérico para peso.

**RNF-11**: Modo PWA offline: eventos enfileirados localmente sem erro ao usuário. UI deve indicar "offline mode" no header.

**RNF-12**: Sincronização automática ao reconectar (sem refresh manual).

### Tipagem & Qualidade de Código

**RNF-13**: Todos os tipos gerados via `npm run db:types` — nenhum type any.

**RNF-14**: Componentes React com Props interface explícita.

**RNF-15**: Validação Zod em lib/validations/rebanho.ts para todos os payloads.

**RNF-16**: Testes Vitest: mínimo 80% cobertura em lib/supabase/rebanho.ts e actions.

---

## 5. Modelo de Dados Conceitual

### Tabela: animais

**Propósito**: Registro único de cada animal da fazenda.

| Campo | Tipo Conceitual | Restrições | Notas |
|-------|---|---|---|
| id | UUID | PK | Chave primária |
| fazenda_id | UUID | FK(fazendas), NN | Preenchido via trigger |
| numero_animal | String | NN, Unique(fazenda_id) | ID único por fazenda |
| sexo | Enum(Macho, Fêmea) | NN | Imutável após criação |
| tipo_rebanho | Enum(leiteiro, corte) | NN, Default=leiteiro | Tipo do animal (produtor pode ter múltiplos) |
| data_nascimento | Date | NN, ≤ hoje | Recalcula categoria ao mudar |
| categoria | String | Computed | Calculada conforme seção 9 (tipo_rebanho + sexo + idade) |
| status | Enum(Ativo, Morto, Vendido) | NN, Default=Ativo | Atualizado por eventos; soft delete via deleted_at |
| lote_id | UUID | FK(lotes), Nullable | Lote atual |
| peso_atual | Numeric(6,2) | Computed | MAX peso_kg from pesos_animal |
| mae_id | UUID | FK(animais), Nullable | Genealogia (mesma fazenda) |
| pai_id | UUID | FK(animais), Nullable | Genealogia (mesma fazenda) |
| raca | String | Nullable | Ex: Holandês, Nelore |
| observacoes | Text | Nullable | Notas do produtor |
| deleted_at | Timestamp | Nullable | Soft delete |
| created_at | Timestamp | NN | Sistema |
| updated_at | Timestamp | NN | Sistema |

### Tabela: lotes

**Propósito**: Agrupamento lógico de animais para manejo.

| Campo | Tipo Conceitual | Restrições | Notas |
|-------|---|---|---|
| id | UUID | PK | Chave primária |
| fazenda_id | UUID | FK(fazendas), NN | Preenchido via trigger |
| nome | String | NN, Unique(fazenda_id) | Ex: "Bezerras 2026", "Leiteiras" |
| descricao | Text | Nullable | Proposição do lote |
| data_criacao | Timestamp | NN | Sistema |
| created_at | Timestamp | NN | Sistema |
| updated_at | Timestamp | NN | Sistema |

### Tabela: eventos_rebanho

**Propósito**: Log imutável de eventos de um animal.

| Campo | Tipo Conceitual | Restrições | Notas |
|-------|---|---|---|
| id | UUID | PK | Chave primária |
| fazenda_id | UUID | FK(fazendas), NN | Preenchido via trigger |
| animal_id | UUID | FK(animais), NN | Animal afetado |
| tipo | Enum(nascimento, pesagem, morte, venda, transferencia_lote) | NN | Tipo de evento |
| data_evento | Date | NN, ≤ hoje | Data do registro |
| peso_kg | Numeric(6,2) | Nullable | Obrigatório se tipo=pesagem |
| lote_id_destino | UUID | FK(lotes), Nullable | Obrigatório se tipo=transferencia_lote |
| comprador | Text | Nullable | Nome/empresa compradora (se venda) |
| valor_venda | Numeric(12,2) | Nullable | Valor da venda em R$ (se venda) |
| observacoes | Text | Nullable | Contexto do evento |
| usuario_id | UUID | FK(profiles), NN | Quem registrou |
| deleted_at | Timestamp | Nullable | Soft delete (admin) |
| created_at | Timestamp | NN | Sistema |
| updated_at | Timestamp | NN | Sistema |

### Tabela: pesos_animal (derivada)

**Propósito**: Histórico longitudinal de pesagens de um animal.

| Campo | Tipo Conceitual | Restrições | Notas |
|-------|---|---|---|
| id | UUID | PK | Chave primária |
| fazenda_id | UUID | FK(fazendas), NN | Preenchido via trigger |
| animal_id | UUID | FK(animais), NN | Animal pesado |
| data_pesagem | Date | NN | Data da pesagem |
| peso_kg | Numeric(6,2) | NN, > 0 | Peso em quilogramas |
| observacoes | Text | Nullable | Notas da pesagem |
| created_at | Timestamp | NN | Sistema |

**Relacionamentos**:
- animais ← pesos_animal (1:N) — cada animal tem 0..N pesagens
- animais ← eventos_rebanho (1:N) — cada animal tem 0..N eventos
- lotes ← animais (1:N) — cada lote tem 0..N animais
- eventos_rebanho.tipo=pesagem → pesos_animal.data_pesagem sincronizados

---

## 6. Fluxos de Usuário Principais

### Fluxo 1: Cadastro Inicial via CSV

```
1. Admin navega a /dashboard/rebanho/importar
2. Clica em "Selecionar arquivo CSV"
3. Seleciona arquivo (máx 10MB)
4. Sistema valida colunas e primeiras linhas
5. Exibe preview com mapping: "numero_animal" → col A, "sexo" → col B, "tipo_rebanho" → col C, etc.
6. Admin ajusta mapping se necessário
7. Clica em "Importar"
8. Sistema:
   - Valida cada linha (tipo dado, range, tipo_rebanho ∈ {leiteiro, corte}, etc)
   - Cria lote "Importação 2026-04-29" se não existir
   - Insere animais em background (toast: "Importando 250/500...")
   - Cria eventos de "nascimento" com data_evento = data_nascimento
   - Nota: Não importa histórico de pesagens ou eventos anteriores
9. Exibe resultado: "250 animais importados com sucesso. 3 erros (linhas 15, 87, 102)."
10. Link para download de relatório de erros (CSV)
```

### Fluxo 2: Lançamento de Evento (Pesagem) — Mobile, No Curral

```
1. Operador navega a /dashboard/rebanho/animais
2. Clica em animal "Leiteira-001"
3. Página abre com tabs: Visão Geral | Eventos | Genealogia
4. Clica em botão flutuante (+) ou botão "Novo Evento"
5. Dialog abre com formulário mobile-first:
   - [Tipo de evento] dropdown (pré-selecionado: Pesagem)
   - [Data do evento] datepicker (default: hoje)
   - [Peso (kg)] input com teclado numérico
   - [Observações] textarea (opcional)
6. Operador preenche peso: 250
7. Clica em "Registrar"
8. Se offline: evento enfileirado em IndexedDB, toast "Evento enfileirado (online: Xmin)"
9. Se online: evento enviado ao servidor via Server Action
   - RLS valida ownership (animal pertence à fazenda do usuário)
   - Trigger atualiza pesos_animal
   - Resposta retorna sucesso
   - Toast: "Pesagem registrada!"
   - Tab "Eventos" atualiza mostrando novo evento
10. Operador pode registrar próximo evento imediatamente
```

### Fluxo 3: Transferência de Lote em Massa

```
1. Operador navega a /dashboard/rebanho/lotes/[id]
2. Visualiza animais do lote em listagem
3. Clica no checkbox do header para selecionar todos (ou multiselect N animais)
4. Barra de ações aparece: "N animais selecionados"
5. Clica em "Transferir para lote..."
6. Dialog aparece com dropdown de lotes destino
7. Seleciona lote e clica "Transferir"
8. Sistema:
   - Cria N eventos de tipo "transferencia_lote" (um por animal)
   - Atualiza lote_id dos animais
   - Atualiza status = 'Ativo' (se for Deletado, muda para Ativo)
9. Toast: "15 animais transferidos para Leiteiras 2026"
10. Listagem atualiza dinamicamente
```

### Fluxo 4: Visualização de Detalhe + Genealogia

```
1. Visualizador navega a /dashboard/rebanho/animais
2. Busca por número: "Leiteira-001"
3. Clica no animal
4. Página de detalhe exibe:
   - Header com ID, sexo, categoria, status (badges com cores)
   - Seção "Informações Gerais": data nasc, lote, raça, peso atual
   - Abas: Visão Geral | Eventos | Genealogia
5. Clica em aba "Genealogia"
6. Árvore simplificada renderiza:
   ```
   Mãe (link para clicável)
        ↓
   Leiteira-001 (atual)
        ↑
   Pai (link para clicável)
   ```
7. Clica em "Mãe" → navega a /dashboard/rebanho/animais/[mae_id]
8. Pode navegar recursivamente pela genealogia
```

### Fluxo 5: Edição de Animal

```
1. Operador visualiza detalhe de animal
2. Clica em botão "Editar"
3. Dialog abre com formulário pré-preenchido:
   - Sexo (desabilitado — imutável)
   - Data nascimento (habitado)
   - Lote (dropdown)
   - Raça (texto)
   - Observações (textarea)
4. Altera data nascimento de 2024-01-15 para 2024-02-15
5. Clica "Salvar"
6. Sistema:
   - Valida data_nascimento ≤ hoje
   - Recalcula categoria automática
   - Atualiza registro
7. Toast: "Animal atualizado"
8. Página de detalhe refresha com novos valores
```

---

## 7. Eventos Cobertos na Fase 1

### Evento: Nascimento

| Aspecto | Detalhe |
|---|---|
| **Dados** | animal_id, data_evento, observacoes (opcional) |
| **Regras** | Animal deve estar em status Ativo; data ≤ hoje |
| **Efeitos** | status → 'Ativo' |
| **Campos Derivados** | Nenhum (genealogia é FK mãe_id/pai_id, não derivada de evento) |
| **UI** | Form simples: data evento + obs |

### Evento: Pesagem

| Aspecto | Detalhe |
|---|---|
| **Dados** | animal_id, data_evento, peso_kg, observacoes (opcional) |
| **Regras** | peso_kg > 0; data ≤ hoje; animal status = 'Ativo' |
| **Efeitos** | status → não muda; insere registro em pesos_animal |
| **Campos Derivados** | peso_atual do animal recalculado (MAX peso_kg) |
| **UI** | Mobile-first: teclado numérico para peso |

### Evento: Morte

| Aspecto | Detalhe |
|---|---|
| **Dados** | animal_id, data_evento, observacoes (causa/contexto) |
| **Regras** | animal status = 'Ativo'; data ≤ hoje |
| **Efeitos** | status → 'Morto'; animal não pode receber novos eventos |
| **Campos Derivados** | Nenhum |
| **UI** | Form com dropdown "Causa" (opcional: doença, acidente, natureza) |

### Evento: Venda

| Aspecto | Detalhe |
|---|---|
| **Dados** | animal_id, data_evento, comprador (texto, opcional), valor_venda (R$, opcional), observacoes (opcional) |
| **Regras** | animal status = 'Ativo'; data ≤ hoje |
| **Efeitos** | status → 'Vendido'; animal não pode receber novos eventos |
| **Campos Derivados** | Nenhum |
| **Integração Financeira** | Fase 1: dados coletados em colunas dedicadas (comprador, valor_venda). Fase 2+: integração com financeiro (auto-lançamento) será implementada quando for pertinente |
| **UI** | Form com campos: data venda, comprador (texto, opcional), valor_venda (R$, opcional), observações |

### Evento: Transferência de Lote

| Aspecto | Detalhe |
|---|---|
| **Dados** | animal_id, data_evento, lote_id_destino (FK obrigatória), observacoes (motivo, opcional) |
| **Regras** | animal status = 'Ativo'; lote_id_destino deve existir na mesma fazenda; data ≤ hoje |
| **Efeitos** | status → 'Ativo' (não muda); lote_id → lote_id_destino (via trigger) |
| **Campos Derivados** | Nenhum |
| **UI** | Form com dropdown de lotes destino + campo motivo opcional |

---

## 8. Regras de Negócio

**RN-01**: Animal com status Morto ou Vendido não pode receber novos eventos. Exceção: Visualizar histórico de eventos.

**RN-02**: Deletado animal só é permitido se não tiver eventos lançados. Mensagem: "Animal com eventos não pode ser deletado."

**RN-03**: Lote não pode ser deletado enquanto tiver animais ativos. Mensagem: "Transfira todos os animais antes de deletar."

**RN-04**: Importação CSV gera eventos de "nascimento" com data_evento = data_nascimento do animal.

**RN-05**: Peso de um animal sempre é positivo (> 0). Validação no cliente e servidor.

**RN-06**: Data de evento nunca pode ser futura (data_evento ≤ hoje). Validação Zod + DB CHECK constraint.

**RN-07**: Categoria automática é recalculada sempre que data_nascimento é alterada.

**RN-08**: Campo `numero_animal` é imutável após criação (unique constraint + visível ao usuário).

**RN-09**: mãe_id e pai_id são opcionais. Se preenchidos, devem referenciar animais da mesma fazenda.

**RN-10**: Transferência de lote em massa cria um evento de "transferencia_lote" POR animal (não um evento agregado).

**RN-11**: Eventos são imutáveis. Edição não é permitida; apenas soft delete se erro.

**RN-12**: Relatórios e análises zootécnicas (Fase 4) usarão apenas eventos não-deletados.

**RN-13**: Tipo de rebanho (`tipo_rebanho`: 'leiteiro' ou 'corte') é definido por animal, não por fazenda. Produtor pode ter múltiplos tipos na mesma fazenda. Default ao criar: 'leiteiro'.

---

## 9. Categorias Automáticas de Animais

Categoria é computada automaticamente baseada em **sexo + idade** (derivada de data_nascimento).

### Para Rebanho Leiteiro

| Categoria | Sexo | Idade | Descrição |
|---|---|---|---|
| Bezerro(a) | M/F | 0–3 meses | Recém-nascido até desmama |
| Macho(a) Jovem | M/F | 3–12 meses | Depois desmama, antes 1 ano |
| Novilho(a) | M/F | 1–2 anos | Jovem em crescimento |
| Novilha Prenhe | F | 1–2 anos + prenhe | (Fase 2: com evento diagnóstico) |
| Vaca | F | > 2 anos | Adulta leiteira |
| Touro | M | > 2 anos | Adulto reprodutor |

### Para Rebanho de Corte

| Categoria | Sexo | Idade | Descrição |
|---|---|---|---|
| Bezerro(a) | M/F | 0–3 meses | Recém-nascido |
| Macho(a) Jovem | M/F | 3–12 meses | Pós-desmama |
| Novilho(a) | M/F | 1–2 anos | Jovem |
| Boi/Novilha | M/F | > 2 anos | Adulto |

**Tipo de rebanho por animal**: Campo `tipo_rebanho` (Enum: 'leiteiro', 'corte') em cada animal. Produtor pode ter múltiplos tipos simultâneos na mesma fazenda.

**Cálculo da idade**: `DATEDIFF(today(), data_nascimento) / 365.25` (em anos).

**Cálculo da categoria**: Baseado em `tipo_rebanho` + sexo + idade (via função SQL ou computed field).

**Exemplo**:
- Fêmea (leiteiro) nascida em 2024-01-15, hoje é 2026-04-29 → idade ≈ 2.3 anos → Categoria: Vaca
- Macho (corte) nascido em 2025-10-01, hoje é 2026-04-29 → idade ≈ 0.5 anos → Categoria: Macho Jovem
- Mesmo animal pode ter tipo diferente de outro da mesma fazenda

---

## 10. Permissões por Perfil

| Ação | Admin | Operador | Visualizador |
|---|:---:|:---:|:---:|
| **Animais** | | | |
| Visualizar lista | ✓ | ✓ | ✓ |
| Visualizar detalhe | ✓ | ✓ | ✓ |
| Criar animal (form) | ✓ | ✓ | ✗ |
| Editar animal | ✓ | ✓ | ✗ |
| Deletar animal | ✓ | ✗ | ✗ |
| **Eventos** | | | |
| Visualizar eventos | ✓ | ✓ | ✓ |
| Lançar evento | ✓ | ✓ | ✗ |
| Deletar evento | ✓ | ✗ | ✗ |
| **Lotes** | | | |
| Visualizar lotes | ✓ | ✓ | ✓ |
| Criar lote | ✓ | ✓ | ✗ |
| Editar lote | ✓ | ✓ | ✗ |
| Deletar lote | ✓ | ✗ | ✗ |
| Transferir animais em massa | ✓ | ✓ | ✗ |
| **Importação** | | | |
| Importar CSV | ✓ | ✗ | ✗ |
| **Relatórios** | | | |
| Exportar PDF | ✓ | ✓ | ✓ |
| Visualizar deletados | ✓ | ✗ | ✗ |

**Implementação**:
- Botões de ação verificam `profile?.perfil` e renderizam condicionalmente
- Server Actions validam perfil via JWT antes de persistir
- RLS policies bloqueiam acesso não-autorizado no banco

---

## 11. Critérios de Aceite da Fase 1

- [ ] CRUD completo de animais (criar, listar, editar, deletar com soft delete)
- [ ] Importação CSV com validação e preview
- [ ] CRUD de lotes com transferência em massa
- [ ] 5 tipos de evento lançáveis (nascimento, pesagem, morte, venda, transferencia_lote)
- [ ] Listagem de eventos por animal com paginação
- [ ] Categoria automática recalculada ao editar data nascimento
- [ ] Genealogia (mãe_id, pai_id) com navegação em árvore
- [ ] Sincronização offline via IndexedDB para eventos
- [ ] RLS em todas as 4 tabelas (animais, lotes, eventos_rebanho, pesos_animal)
- [ ] Mobile-first na tela de lançamento de evento
- [ ] Permissões por perfil (Admin, Operador, Visualizador)
- [ ] Tests Vitest com ≥80% cobertura em lib/supabase/rebanho.ts
- [ ] `npm run build` sem erros TypeScript
- [ ] `npm run test` com 237+ testes passando (incluindo suite de rebanho)
- [ ] Dados prontos para consumo por /api/rebanho/animais-ativos (Fase 3)

---

## 12. Pontos em Aberto

Nenhum ponto em aberto. Todas as 6 decisões arquiteturais foram confirmadas:

- ✅ Múltiplos tipos de rebanho por animal (campo `tipo_rebanho`)
- ✅ Integração financeira adiada para Fase 2+
- ✅ CSV importa apenas animais atuais (sem histórico)
- ✅ Sem máximo de animais; índices garantem escalabilidade
- ✅ Genealogia apenas 2 níveis (Mãe ← Animal → Pai)
- ✅ Cores padrão Tailwind (Ativo=green, Morto=gray, Vendido=blue)

---

**Fim do PRD — Pronto para Implementação**
