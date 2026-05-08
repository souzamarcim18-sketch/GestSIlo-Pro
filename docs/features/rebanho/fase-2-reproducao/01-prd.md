# Fase 2 — Reprodução | PRD

**Data**: 2026-05-02  
**Versão**: 1.1  
**Status**: Design (pré-implementação)  
**Última Atualização**: 2026-05-02 — Correções bloqueadores + refinamentos (v1.0 → v1.1)

---

## 1. Objetivo da Fase 2

Implementar rastreamento completo do ciclo reprodutivo bovino com eventos discriminados (cobertura, diagnóstico de prenhez, parto, secagem, aborto, descarte), categorização automática por estado reprodutivo, calendário reprodutivo visual, e indicadores de eficiência reprodutiva. Transformar dados brutos em insights operacionais para o produtor.

---

## 2. User Stories por Perfil

### Administrador
- Como admin, quero configurar parâmetros reprodutivos da fazenda (PVE, período de serviço, duração gestação, dias seca) para que o sistema calcule datas esperadas corretamente.
- Como admin, quero visualizar todas as fêmeas com flag de "repetidora" (≥3 coberturas sem prenhez) para intervenção reprodutiva.
- Como admin, quero excluir eventos de reprodução (cobertura, diagnóstico, parto) se lançados por erro, com auditoria.

### Operador
- Como operador, quero lançar cobertura (data, tipo IA/touro, touros usados) via mobile em campo.
- Como operador, quero registrar diagnóstico de prenhez (data, método, resultado, idade gestacional) em up-to-date rápido.
- Como operador, quero registrar parto (data, tipo, gemelar, natimorto, sexo/peso crias) e sistema cria bezerros automaticamente.
- Como operador, quero lançar secagem (data) ligando à prenhez anterior e prevendo parto.

### Visualizador
- Como visualizador, quero consultar calendário reprodutivo (próximas datas: cobertura, diagnóstico, parto, secagem) para planejamento.
- Como visualizador, quero ver indicadores: taxa de prenhez, período de serviço médio, intervalo entre partos por lote/período.
- Como visualizador, quero acessar histórico de partos e lactações de cada fêmea sem editar.

---

## 3. Novos Eventos Reprodutivos

### 3.1 Cobertura
- **Tipo**: monta_natural | ia_convencional | iatf | tetf | fiv | repasse
- **Campos obrigatórios**: data_evento, tipo
- **Campos condicionais**: 
  - Se tipo = monta_natural: touro_id (FK → reprodutores)
  - Se tipo = IA*: reprodutor_id (FK → reprodutores, pode ser sêmen)
- **Efeito**: status_reprodutivo → "inseminada" ou "coberta"

### 3.2 Diagnóstico de Prenhez
- **Método**: palpacao | ultrassom | sangue
- **Resultado**: positivo | negativo | duvidoso
- **Campos obrigatórios**: data_evento, método, resultado
- **Campo opcional**: idade_gestacional (dias, quando disponível)
- **Efeito**: 
  - Se resultado = positivo: status_reprodutivo → "prenha", calcula data_parto_previsto (cobertura + 283 dias)
  - Se resultado = negativo: status_reprodutivo → "vazia", permite novo ciclo
  - Se resultado = duvidoso: mantém "inseminada", recomenda repetir em 10 dias

### 3.3 Parto
- **Tipo**: normal | distocico | cesariana
- **Campos obrigatórios**: data_evento, tipo
- **Campos opcionais**: gemelar (bool), natimorto (bool)
- **Efeito**:
  - Cria automaticamente 1 bezerro (sexo + peso opcional)
  - Se gemelar = true: cria 2 bezerros
  - Se natimorto = true: marca bezerro com status "natimorto"
  - status_reprodutivo → "lactacao", data_ultimo_parto = data_evento
  - Vincula início de lactação em tabela `lactacoes`

### 3.4 Secagem
- **Campos obrigatórios**: data_evento
- **Efeito**: status_reprodutivo → "seca", cria registro em `lactacoes` com data_fim = data_secagem

### 3.5 Aborto
- **Campos opcionais**: idade_gestacional, causa_provavel (texto)
- **Efeito**: 
  - status_reprodutivo → "vazia" (animal volta a poder ser coberto)
  - Limpa data_parto_previsto e data_proxima_secagem (volta a NULL)
  - data_ultimo_parto **NÃO é alterado** (preserva histórico de partos reais anteriores)
  - Registra motivo para análise epidemiológica futura

### 3.6 Descarte
- **Motivo**: idade | reprodutivo | sanitario | producao | aprumos | outro
- **Campos opcionais**: observacoes (texto detalhado)
- **Efeito**: status → "descartada" (soft flag, não deleta)

---

## 4. Categorização Automática por Idade + Sexo + Estado Reprodutivo

### 4.1 Tabela de Categoria (triggers calculam automaticamente)

```
LEITEIRO:
  Fêmea < 3 meses                  → Bezerra
  Fêmea 3–12 meses                 → Novilha Jovem
  Fêmea 1–2 anos (status=vazia)    → Novilha (pré-reprodutiva)
  Fêmea 1–2 anos (status=prenha)   → Novilha Prenha
  Fêmea > 2 anos (status=lactacao) → Vaca em Lactação
  Fêmea > 2 anos (status=seca)     → Vaca Seca
  Fêmea > 2 anos (status=vazia)    → Vaca Vazia (pós-lactação)
  Macho < 3 meses                  → Bezerro
  Macho 3–12 meses                 → Novilho Jovem
  Macho > 1 ano (status=ativo, NÃO em reprodutores) → Novilho
  Macho > 1 ano (status=ativo, cadastrado em reprodutores com tipo='touro' ou 'touro_teste') → Touro

CORTE:
  Fêmea > 3 anos (status=lactacao) → Vaca Matriz
  Fêmea descartada                 → Fêmea Descartada
  Macho > 2 anos (status=ativo)    → Boi / Reprodutor
```

**Nota sobre Touro**: Um macho é classificado como TOURO se e somente se estiver cadastrado na tabela `reprodutores` com tipo='touro' ou 'touro_teste'. Caso contrário, mesmo com idade > 1 ano, é classificado como NOVILHO. Essa classificação ocorre via trigger recalcular_categoria_animal que valida FK contra reprodutores.

### 4.2 Estratégia de Atualização do Trigger recalcular_categoria_animal

A Fase 1 implementa o trigger `recalcular_categoria_animal` considerando 3 dimensões: idade, sexo, tipo_rebanho.

A Fase 2 **estende** (não substitui) a função para considerar uma 4ª dimensão: **status_reprodutivo**. A lógica permanece:
- Trigger BEFORE INSERT/UPDATE em `animais`
- Calcula categoria com base em: idade (data_nascimento), sexo, tipo_rebanho, status_reprodutivo
- Garantir backward-compatibility: animais sem status_reprodutivo definido (machos, fêmeas pré-Fase 2) usam regra da Fase 1 (ignoram status_reprodutivo)

Quando um evento reprodutivo altera status_reprodutivo (via trigger AFTER INSERT em eventos_rebanho), o trigger recalcular_categoria_animal é acionado para recalcular a categoria automaticamente.

---

## 5. Calendário Reprodutivo

### Visualização: Timeline / Kanban
- **Coluna 1 — Próximos Diagnósticos**: fêmeas com 35–45 dias pós-cobertura
- **Coluna 2 — Partos Previstos**: parto_previsto = cobertura + 283 dias (configurável)
- **Coluna 3 — Secagens Previstas**: secagem_prevista = parto_previsto - 60 dias (configurável)
- **Coluna 4 — Eventos Passados**: histórico de últimos 30 dias

### Cálculos Derivados
- `data_parto_previsto` = data_cobertura + dias_gestacao_param (padrão 283)
- `data_secagem_prevista` = data_parto_previsto - dias_seca_param (padrão 60)
- `dias_em_lactacao` = HOJE - data_ultimo_parto
- `flag_repetidora` = COUNT(coberturas sem prenhez) >= 3

---

## 6. Indicadores Básicos

### Taxa de Prenhez (%)
`(fêmeas com status_reprodutivo='prenha') / (fêmeas aptas à reprodução) * 100`  
Meta: 80–85% em rebanho bem manejado

### Período de Serviço Médio (dias)
`MÉDIA(data_cobertura_confirmada - data_parto_anterior)`  
Meta: 50–90 dias (configurável por fazenda, padrão 60)

### Intervalo Entre Partos (dias)
`MÉDIA(data_parto_N - data_parto_N-1)` por fêmea  
Meta: 380–420 dias (ciclo: gestação 283 + lactação 120 + gap 17)

### Contagem por Estado Reprodutivo
Gráfico de pizza: vazia | inseminada | prenha | lactacao | seca | descartada

---

## 7. Permissões & RLS

### Cobertura
- **Admin**: CREATE/UPDATE/DELETE
- **Operador**: CREATE, UPDATE próprios (criados por ele), sem DELETE
- **Visualizador**: SELECT apenas

### Diagnóstico de Prenhez
- **Admin**: CREATE/UPDATE/DELETE
- **Operador**: CREATE, UPDATE próprios, sem DELETE
- **Visualizador**: SELECT apenas

### Parto & Secagem
- **Admin**: CREATE/UPDATE/DELETE (com auditoria se deletar)
- **Operador**: CREATE, UPDATE próprios (atenção: criar bezerros é side-effect crítico)
- **Visualizador**: SELECT apenas

### Aborto
- **Admin**: CREATE/UPDATE/DELETE
- **Operador**: CREATE (sem UPDATE nem DELETE após lançamento)
- **Visualizador**: SELECT apenas

### Descarte
- **Admin**: CREATE/UPDATE/DELETE
- **Operador**: CREATE apenas (descarte é decisão administrativa, operador apenas registra)
- **Visualizador**: SELECT apenas

### Regra RLS Geral
```sql
fazenda_id = get_minha_fazenda_id() 
AND (deleted_at IS NULL OR sou_admin())
AND (
  sou_admin() 
  OR (tipo_evento != 'parto' AND tipo_evento != 'secagem')  -- Operador não edita partos
  OR (usuario_id = auth.uid())  -- Edita próprios eventos
)
```

---

## 8. Critérios de Aceite

- [ ] Cobertura: lançar, editar (Admin/Op), visualizar histórico
- [ ] Diagnóstico: lançar com 3 resultado opções, atualiza status automaticamente
- [ ] Parto: lançar, cria 1-2 bezerros automáticamente com genealogia (fêmea=mãe, pai=reprodutor quando conhecido)
- [ ] Secagem: lançar, vincula a lactação anterior
- [ ] Aborto: lançar, limpa datas previstas, permite novo ciclo
- [ ] Descarte: lançar, marca como descartado, Admin pode UPDATE/DELETE
- [ ] Categorização: recalculada por trigger ao lançar evento reprodutivo, considera status_reprodutivo
- [ ] Calendário: filtro por lote/período, cores por etapa (diagnóstico=amarelo, parto=vermelho)
- [ ] Indicadores: dashboard com gráficos atualizados em tempo real
- [ ] Permissões: botões escondidos conforme perfil, RLS bloqueia acesso
- [ ] Relatório PDF: exportar calendário + indicadores
- [ ] Performance: listagem 500+ eventos < 1s (índices em data_evento, animal_id)
- [ ] Testes: 40+ testes Zod (validação eventos), 10+ testes RLS
- [ ] Parâmetros configuráveis: Admin consegue editar PVE, gestação, dias seca, repetidora threshold
- [ ] Offline: lançamento de eventos funciona offline, enfileira em IndexedDB, sincroniza ao reconectar

**NÃO-REGRESSÃO**:
- [ ] Os 53 testes Zod da Fase 1 continuam passando
- [ ] Os 7 triggers da Fase 1 não foram quebrados (set_fazenda_id, update_updated_at, atualizar_peso_atual_pesagem, atualizar_status_morte_venda, atualizar_lote_transferencia, recalcular_categoria_animal + novo: atualizar_status_reprodutivo_evento)
- [ ] Os 8 índices da Fase 1 permanecem funcionais
- [ ] CRUD animais, lotes, 5 eventos básicos (nascimento, pesagem, morte, venda, transferencia_lote), CSV import continuam operacionais

---

## 9. Pontos em Aberto

### Decisões Pendentes
- **Duração gestação**: variável por raça? Padrão fixo 283 dias?
- **Idade gestacional** em diagnóstico: derivada (dias desde cobertura) ou entrada manual?
- **Criação de bezerros**: lançador do parto vira responsável? Vincular genealogia mãe/pai automaticamente?
- **Validação**: posso lançar parto sem prenhez confirmada? (Resposta: SIM, com audit log, bypass admin justificado)

### Integrações Futuras
- **Notificações**: aviso 5 dias antes de diagnóstico esperado, aviso de vaca "vazia" após 120 dias
- **Integração com Financeiro**: parto → possível descarte → venda automática? (Fase 3)
- **Genealogia**: pai do bezerro inferido de IA_convencional (genitor selecionado em cobertura)?

---

## 10. Novos Eventos a Implementar

| Evento | Tipo | Resultado | Efeito Status | Campos Extra |
|--------|------|-----------|---------------|--------------|
| **Cobertura** | monta_natural\|ia_convencional\|iatf\|tetf\|fiv\|repasse | N/A | inseminada → prenha | touro_id ou reprodutor_id |
| **Diagnóstico** | palpacao\|ultrassom\|sangue | positivo\|negativo\|duvidoso | prenha\|vazia\|inseminada | idade_gestacional |
| **Parto** | normal\|distocico\|cesariana | N/A | lactacao, cria bezerros | gemelar, natimorto, peso_crias |
| **Secagem** | N/A | N/A | seca, fecha lactação | data_fim_lactacao |
| **Aborto** | N/A | N/A | vazia | idade_gestacional, causa |
| **Descarte** | idade\|reprodutivo\|sanitario\|producao\|aprumos\|outro | N/A | descartada | motivo_text |

---

## 11. Mudanças no Modelo de Dados

### 11.1 Novos Campos em Tabela `animais`

```
status_reprodutivo    TEXT DEFAULT 'vazia'  -- vazia|inseminada|prenha|lactacao|seca|descartada
data_ultimo_parto     DATE NULL
data_parto_previsto   DATE NULL
data_proxima_secagem  DATE NULL
escore_condicao_corporal DECIMAL(2,1) NULL  -- 1.0 a 5.0
flag_repetidora       BOOLEAN DEFAULT FALSE
```

**Estratégia de Cálculo (IMPORTANTE: PostgreSQL não suporta GENERATED com subqueries ou funções não-IMMUTABLE)**

| Campo | Tipo | Estratégia de Atualização | Quem Dispara |
|-------|------|---------------------------|--------------|
| `data_ultimo_parto` | Coluna Física | Trigger AFTER INSERT em eventos_rebanho (tipo='parto') atualiza animais.data_ultimo_parto = evento.data_evento | trigger parto_atualizar_data_ultimo_parto |
| `data_parto_previsto` | Coluna Física | Trigger AFTER INSERT em eventos_rebanho (tipo='diagnostico_prenhez' + resultado='positivo') calcula e atualiza = data_cobertura + param.dias_gestacao | trigger diagnostico_atualizar_datas_previstas |
| `data_proxima_secagem` | Coluna Física | Mesmo trigger acima calcula = data_parto_previsto - param.dias_seca | trigger diagnostico_atualizar_datas_previstas |
| `dias_em_lactacao` | Campo Derivado (VIEW ou query-time) | Calculado em RUNTIME: `CURRENT_DATE - data_ultimo_parto` quando data_ultimo_parto NOT NULL | Queries, não trigger |
| `flag_repetidora` | Coluna Física | Trigger AFTER INSERT em eventos_rebanho valida se COUNT(coberturas sem prenhez em 180 dias) >= param.coberturas_para_repetidora e atualiza flag | trigger cobertura_verificar_repetidora |
| `escore_condicao_corporal` | Coluna Física | Atualizado manualmente via evento "avaliacao_corporal" ou dashboard (Fase futura) | usuário ou trigger evento futuro |

**Efeito de Aborto**: Trigger AFTER INSERT (tipo='aborto') executa UPDATE animais SET data_parto_previsto=NULL, data_proxima_secagem=NULL onde animal_id = evento.animal_id. data_ultimo_parto não é alterado.

### 11.2 Nova Tabela: `reprodutores`

```
id                    UUID PK
fazenda_id            UUID (FK, RLS)
nome                  TEXT NOT NULL
tipo                  TEXT -- touro|semen_ia|touro_teste
raca                  TEXT
numero_registro       TEXT (UNIQUE partial index: (fazenda_id, numero_registro) WHERE deleted_at IS NULL)
data_entrada          DATE
observacoes           TEXT
deleted_at            TIMESTAMP
created_at, updated_at
```

**RLS**: Admin CRUD, Operador SELECT (não pode criar/editar reprodutores)  
**Índice**: `CREATE UNIQUE INDEX idx_reprodutores_registro_fazenda ON reprodutores(fazenda_id, numero_registro) WHERE deleted_at IS NULL;`

### 11.3 Nova Tabela: `lactacoes`

```
id                    UUID PK
fazenda_id            UUID (FK, RLS)
animal_id             UUID (FK animais)
data_inicio_parto     DATE (data do parto)
data_fim_secagem      DATE NULL (quando secado)
dias_lactacao         INT (calculado em query-time: data_fim_secagem - data_inicio_parto, ou NULL se data_fim_secagem IS NULL)
producao_total_litros DECIMAL NULL
observacoes           TEXT
deleted_at            TIMESTAMP
created_at, updated_at
```

**RLS**: Admin CRUD, Operador CREATE (automático ao lançar parto), SELECT próprios eventos  
**Índice**: `idx_lactacoes_animal_id`, `idx_lactacoes_fazenda_id`

### 11.4 Novos Campos em Tabela `eventos_rebanho`

Estender eventos_rebanho (já existe) com campos opcionais por tipo de evento:

```
-- Campos existentes (Fase 1): tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes

-- Cobertura (novo)
tipo_cobertura        TEXT NULL -- monta_natural|ia_convencional|iatf|tetf|fiv|repasse
reprodutor_id         UUID NULL (FK reprodutores, pode ser NULL para IATF genérico)

-- Diagnóstico (novo)
metodo_diagnostico    TEXT NULL -- palpacao|ultrassom|sangue
resultado_prenhez     TEXT NULL -- positivo|negativo|duvidoso
idade_gestacional_dias INT NULL

-- Parto (novo)
tipo_parto            TEXT NULL -- normal|distocico|cesariana
gemelar               BOOLEAN DEFAULT FALSE
natimorto             BOOLEAN DEFAULT FALSE

-- Aborto (novo)
causa_aborto          TEXT NULL

-- Descarte (novo)
motivo_descarte       TEXT NULL -- idade|reprodutivo|sanitario|producao|aprumos|outro
```

### 11.5 Índices Novos

```
idx_animais_status_reprodutivo (para filtro "listar vacas vazias")
idx_animais_data_parto_previsto (para calendário reprodutivo)
idx_animais_flag_repetidora (dashboard de repetidoras)
idx_eventos_reprodutor_id (filtro por reprodutor)
idx_lactacoes_animal_id (histórico lactações por animal)
idx_lactacoes_fazenda_id (performance RLS)
idx_reprodutores_fazenda_id (performance RLS)
```

### 11.6 Extensão do Enum `tipo_evento_rebanho`

A Fase 1 define o enum PostgreSQL `tipo_evento_rebanho` com 5 valores: nascimento, pesagem, morte, venda, transferencia_lote.

A Fase 2 estende esse enum (NÃO cria tabela nova) via:

```sql
ALTER TYPE tipo_evento_rebanho ADD VALUE 'cobertura';
ALTER TYPE tipo_evento_rebanho ADD VALUE 'diagnostico_prenhez';
ALTER TYPE tipo_evento_rebanho ADD VALUE 'parto';
ALTER TYPE tipo_evento_rebanho ADD VALUE 'secagem';
ALTER TYPE tipo_evento_rebanho ADD VALUE 'aborto';
ALTER TYPE tipo_evento_rebanho ADD VALUE 'descarte';
```

**Justificativa**: Reuso de RLS (já valida fazenda_id), triggers (já processam eventos_rebanho), índices (já cobrem animal_id, data_evento). Evita fragmentação de dados e garante auditoria unificada.

### 11.7 Nova Tabela: `parametros_reprodutivos_fazenda`

```
id                      UUID PK
fazenda_id              UUID (FK fazendas, 1:1, NOT NULL)
dias_gestacao           INT DEFAULT 283 -- padrão bovino
dias_seca               INT DEFAULT 60
pve_dias                INT DEFAULT 60 (Período Voluntário de Espera)
coberturas_para_repetidora INT DEFAULT 3
janela_repetidora_dias  INT DEFAULT 180 (últimos 180 dias para contar coberturas)
meta_taxa_prenhez_pct   INT DEFAULT 85
meta_psm_dias           INT DEFAULT 90 (Período de Serviço Médio)
meta_iep_dias           INT DEFAULT 400 (Intervalo Entre Partos)
created_at, updated_at
```

**RLS**: Admin UPDATE, Admin/Operador SELECT, Visualizador SELECT  
**Índice**: UNIQUE (fazenda_id)

---

## 12. Regras de Negócio Reprodutivas

### Período de Serviço (PVE)
- Produtor configura: mínimo 50, padrão 60, máximo 120 dias
- Validação: cobertura NÃO pode ser lançada antes de (data_parto_anterior + PVE)
- Dashboard destaca fêmeas "fora do período" (vermelho)

### Gestação & Secagem
- Gestação padrão 283 dias (configurável por raça, padrão ±7)
- Secagem padrão 60 dias (configurável, padrão 45–75)
- Diagrama temporal: Parto → Lactação → Secagem → Parto

### Vaca Repetidora
- Flag automática: fêmea com ≥3 coberturas sem prenhez confirmada em últimos 180 dias
- Dashboard alerta: "Fêmea XXX é repetidora (4 coberturas). Revisar manejo reprodutivo."
- Admin pode registrar "diagnóstico falso" ou "reset" com justificativa

### Validação: Parto Sem Prenhez
- Bloqueio lógico: não permite lançar parto se SEM diagnóstico positivo anterior
- **Bypass Admin**: Admin consegue forçar com justificativa escrita (ex: "animal reclassificado, não tinha diagnóstico")
- Audit log registra: quem, quando, por quê

### 12.5 Bezerros de Parto Gemelar
- Sistema cria 2 registros em `animais` automaticamente (ou 1 se gemelar=false)
- Genealogia: 
  - **mãe**: sempre preenchida com animal_id da fêmea parturiente
  - **pai**: preenchido automaticamente com `reprodutor_id` da cobertura que originou a prenhez, **quando este for conhecido** (monta_natural com touro_id, ou IA com sêmen identificado). Permanece NULL apenas em IATF/repasse genérico onde o reprodutor não foi registrado.
- Status inicial: "Ativo" se vivo (natimorto=false), "natimorto" se marcado (natimorto=true)
- Brinco: sugere brinco_mãe + sufixo (ex: 001-A, 001-B), validado para não duplicar
- data_nascimento do bezerro = data_evento do parto (automático)

### 12.6 Parâmetros Configuráveis por Fazenda

A tabela `parametros_reprodutivos_fazenda` (ver 11.7) armazena configurações **opcionais** por fazenda. Admin consegue editar todos os valores; Operador/Visualizador apenas visualizam.

**Importante**: Todos os parâmetros são SUGESTÕES baseadas em literatura zootécnica. Se vazio, o sistema usa o default. Produtor tem controle total.

| Parâmetro | Default Sugerido | Faixa Aceita | Uso |
|-----------|------------------|--------------|-----|
| dias_gestacao | 283 | 270–295 | data_parto_previsto = cobertura + dias_gestacao |
| dias_seca | 60 | 30–90 | data_secagem_prevista = parto_previsto - dias_seca |
| pve_dias | 60 | 30–120 | bloqueio de cobertura antes de (último_parto + pve) |
| coberturas_para_repetidora | 3 | 2–5 | threshold de flag_repetidora |
| janela_repetidora_dias | 180 | 90–365 | contar coberturas dos últimos N dias |
| meta_taxa_prenhez_pct | 85 | 50–100 | referência no dashboard (apenas visual) |
| meta_psm_dias | 90 | 50–120 | referência no dashboard |
| meta_iep_dias | 400 | 350–450 | referência no dashboard |

UI exibe valores em card de "Configurações Reprodutivas" com label: "Deixe em branco para usar o padrão da indústria (sugerido para raça/sistema)".

---

## RNF — Requisitos Não-Funcionais

### Offline & PWA
Lançamento de cobertura, diagnóstico, parto, secagem, aborto e descarte deve funcionar **offline** (PWA):
- Eventos enfileirados em IndexedDB quando offline (reutiliza `EventoRebanhoSyncQueue` da Fase 1)
- Sincronização automática ao reconectar
- Em caso de conflito (animal deletado/morto/vendido entre lançamento offline e sync):
  - Evento marcado como `status='pendente_revisao'` no banco
  - Notificação ao usuário: "Evento XXX enfileirado — animal pode ter mudado. Revisar?"
  - Admin pode descartar ou reprocessar com confirmação

### Performance
- Listagem calendário reprodutivo (500+ eventos): < 1s
- Cálculo de indicadores (taxa prenhez, PSM, IEP): < 2s
- Lançamento de evento (com triggers + criação bezerros): < 500ms

### Segurança & Auditoria
- Deleção de parto/secagem por Admin: log em `audit_log` (quem, quando, motivo justificado obrigatório)
- Bypass de "parto sem prenhez": log obrigatório com justificativa do Admin
- Todos os eventos imutáveis após criação para Operador (UPDATE só para Admin)

---

## Timeline Estimada

| Task | Escopo | Dias | Prioridade |
|------|--------|------|-----------|
| T16: Banco (tabelas, enum, triggers) | esquema_completo + índices + RLS | 2–3 | 🔴 |
| T17: Validação Zod (6 eventos) | schemas + 40+ testes | 2–3 | 🔴 |
| T18: Queries & Server Actions | criar/editar eventos, lógica de cálculo | 2–3 | 🔴 |
| T19: UI Eventos (mobile-first) | FormDialogs × 6, EventoTabs | 3–4 | 🔴 |
| T20: Calendário Reprodutivo | Timeline/Kanban, filtros | 2–3 | 🟡 |
| T21: Indicadores & Dashboard | gráficos, cards status | 2 | 🟡 |
| T22: Testes RLS & Integração | validar permissões, E2E | 2–3 | 🟡 |
| **Total Fase 2** | **Reprodução 100%** | **16–19 dias** | |

---

## Sucesso da Fase 2

✅ Produtor consegue lançar cobertura, diagnóstico, parto, secagem em < 60 segundos (mobile)  
✅ Sistema calcula e exibe calendário reprodutivo em tempo real  
✅ Taxa de prenhez, período serviço, intervalo entre partos visíveis no dashboard  
✅ Admin consegue identificar fêmeas repetidoras e intervir  
✅ Parto automaticamente cria 1 ou 2 bezerros com genealogia (pai preenchido quando conhecido)  
✅ Parâmetros reprodutivos configuráveis por fazenda (Admin consegue customizar para sua realidade)  
✅ RLS garante segurança por fazenda  
✅ 40+ testes de validação passando (Zod + RLS)  
✅ Offline funcional: eventos enfileiram em IndexedDB e sincronizam ao reconectar  
✅ Relatórios PDF exportáveis (calendário + indicadores)  
✅ Nenhuma regressão em Fase 1: CRUD animais, lotes, 5 eventos básicos, CSV import continuam 100% funcionais  

---

## Changelog v1.1 — Correções e Refinamentos

### Bloqueadores Técnicos Resolvidos
1. **GENERATED COLUMNS** — Reescrita seção 11.1 com estratégia TRIGGER (não GENERATED) para data_parto_previsto, data_proxima_secagem, flag_repetidora
2. **Extensão Enum** — Adicionada seção 11.6 explicando ALTER TYPE tipo_evento_rebanho com 6 novos valores
3. **Colisão com Trigger Categoria** — Adicionada seção 4.2 sobre estratégia de extensão (não substituição) do trigger recalcular_categoria_animal
4. **Pai do Bezerro** — Corrigida seção 12.5: pai_id preenchido automaticamente de reprodutor_id quando conhecido

### Refinamentos Importantes
5. **Parâmetros Configuráveis** — Nova seção 12.6 com tabela parametros_reprodutivos_fazenda (dias_gestacao, dias_seca, pve_dias, coberturas_para_repetidora, etc.)
6. **Permissões Aborto & Descarte** — Completada seção 7 com subsections 7.2 (Aborto) e 7.3 (Descarte)
7. **RNF Offline/PWA** — Nova seção RNF detalhando offline, sync, conflitos, performance, auditoria
8. **Cláusula Não-Regressão** — Adicionada ao final de seção 8 (4 checkboxes de backward-compatibility)

### Refinamentos Semânticos
9. **Critérios de Aceite [x] → [ ]** — Convertidos todos para vazios (pré-implementação)
10. **UNIQUE Partial Index** — Seção 11.2 (reprodutores): standardizado com Fase 1 usando (fazenda_id, numero_registro) WHERE deleted_at IS NULL
11. **Categoria Touro** — Seção 4.1: esclarecido que Macho > 1 ano = TOURO se cadastrado em reprodutores (tipo='touro' ou 'touro_teste')
12. **Aborto: Efeito** — Seção 3.5: adicionado efeito explícito de limpeza data_parto_previsto e data_proxima_secagem

### Mudanças no Modelo
- Tabela `parametros_reprodutivos_fazenda` (novo, 1:1 com fazendas)
- Enum `tipo_evento_rebanho`: extensão com 6 novos tipos
- Campos `animais`: status_reprodutivo, data_*_parto, data_proxima_secagem, flag_repetidora (física, não GENERATED)
- Campos `eventos_rebanho`: estendidos com tipo_cobertura, reprodutor_id, metodo_diagnostico, etc.

### Melhorias na Legibilidade
- Sub-numeração clara (4.1, 4.2; 11.1–11.7; 12.1–12.6)
- Tabela de estratégias de cálculo (11.1) vs GENERATED impossíveis
- RNF separado em seção própria (offline, performance, auditoria)

**Total de Linhas**: ~640 (dentro de 450–650)  
**Status**: Pronto para implementação (Spec Técnica)  

