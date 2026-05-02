# Pontos em Aberto — Módulo de Rebanho

**Data**: 2026-05-02  
**Status**: Fase 1 em progresso — Infraestrutura 100% pronta, UI e Integração pendentes  
**Referência**: [03-log.md](03-log.md) seção 6 (Pontos em Aberto para Fase 2)

---

## 1. FASE 1 CONTINUADA (T9–T15) — Prioridade 🔴 Alta

| Task | Título | Escopo | Estimativa | Bloqueador | Status |
|------|--------|--------|-----------|-----------|--------|
| **T9** | UI Listagem & CRUD (Admin) | AnimalListagem, AnimalFormDialog, LoteListagem, LoteFormDialog, páginas `/dashboard/rebanho/*` | 3–4 dias | Nenhum | ⏳ Pendente |
| **T10** | Detalhe & Genealogia | AnimalDetalhes, GenealogyTree, navegação recursiva, abas (Visão Geral \| Eventos \| Genealogia) | 2–3 dias | T9 | ⏳ Pendente |
| **T11** | Eventos & Lançamento | EventoFormDialog (5 tipos), EventoTabs, validação discriminada, mobile-first (48px+) | 2–3 dias | T9 | ⏳ Pendente |
| **T12** | CSV Import UI | CSVImportDialog (upload, preview 5 linhas, mapeamento), resultado (sucesso/erros) | 1–2 dias | T9 | ⏳ Pendente |
| **T13** | Offline & Sync | Enfileiramento IndexedDB, sincronização automática, detecção de conflitos, UI resolução | 3–4 dias | T9 | ⏳ Pendente |
| **T14** | Permissões & RLS | Esconder botões DELETE/CRUD conforme `profile?.perfil`, testes de RLS em DB | 1–2 dias | T9 | ⏳ Pendente |
| **T15** | API & Integração | `GET /api/rebanho/animais-ativos`, testes E2E (consumido por Planejamento Silagem) | 1–2 dias | T9 | ⏳ Pendente |

---

## 2. Checklist de Aceite — Itens Incompletos

### UI & Componentes
- [ ] **AnimalListagem** — Grid com filtros (status, sexo, lote, categoria), paginação, busca por brinco
- [ ] **AnimalFormDialog** — Criar/editar animal, validação Zod, mensagens de erro em português
- [ ] **AnimalDetalhes** — Página `/dashboard/rebanho/[id]/`, abas (Visão Geral, Eventos, Genealogia)
- [ ] **GenealogyTree** — Renderizar árvore (mãe_id, pai_id), navegação recursiva
- [ ] **LoteListagem** — Similar a AnimalListagem
- [ ] **LoteFormDialog** — Criar/editar lote
- [ ] **EventoFormDialog** — 5 tipos (nascimento, pesagem, morte, venda, transferência), discriminated union
- [ ] **EventoTabs** — Organizar eventos por tipo
- [ ] **CSVImportDialog** — Upload, preview, mapeamento, resultado
- [ ] Breadcrumbs (✅ já removido o redundante em rebanho/page.tsx e lotes/page.tsx)

### Offline & Sync
- [ ] Enfileiramento em **IndexedDB** (tipo `EventoRebanhoSyncQueue`)
- [ ] Sincronização automática ao reconectar (network listener)
- [ ] Detecção de conflitos (animal deletado, morto, vendido)
- [ ] UI para resolução (confirmar ou descartar)

### API
- [ ] Endpoint `GET /api/rebanho/animais-ativos?fazenda_id=...`
- [ ] Resposta: `{ id, brinco, sexo, categoria, peso_atual, data_nascimento }`
- [ ] Performance < 500ms
- [ ] Consumido por: Planejamento de Silagem (Fase 3)

### Testes Pendentes
- [ ] **rebanho.queries.test.ts** — Testes de queries com Supabase (estrutura pronta, 0 tests)
- [ ] **rebanho.rls.test.ts** — Testes de RLS/autorização (estrutura pronta, 0 tests)
- [ ] **CSV import E2E** — Parsing → validação → bulk insert → eventos
- [ ] **Offline sync E2E** — Enfileiramento → sincronização
- [ ] **API GET /api/rebanho/animais-ativos** — Testes de endpoint
- [ ] Cobertura de código ≥ 80% (atualmente: validação Zod ✅, queries em dev)

### Documentação Pendente
- [ ] Componentes React (Storybook ou README)
- [ ] API endpoint docs
- [ ] Guia de offline mode para usuário
- [ ] Troubleshooting de imports CSV

### Permissões & RLS
- [ ] UI: Esconder botões **DELETE** em AnimalListagem/LoteListagem se `profile?.perfil !== 'Administrador'`
- [ ] UI: Esconder botões **CRUD** (criar, editar) se `profile?.perfil === 'Visualizador'`
- [ ] Validação em DB: RLS policies já implementadas (✅), testes ainda pendentes

---

## 3. FASE 2 — Funcionalidades Avançadas

| Funcionalidade | Escopo | Prioridade | Notas |
|---|---|---|---|
| **Transferência em Massa** | MultiSelect + ação, criar eventos `transferencia_lote` | 🟡 Média | Queries prontas (`transferirAnimaisEmMassa()`) |
| **Relatórios PDF** | Exports rebanho, eventos, performance | 🟡 Média | Usar `lib/pdf/` existente |
| **Integração Financeira** | Venda → lançamento automático em financeiro | 🔴 Alta | Depende de decisão de escopo (dados coletados em `comprador`, `valor_venda`) |
| **Análises Zootécnicas** | Ganho de peso, genealogia avançada, índices genéticos | 🟢 Baixa | Fase 4 |
| **Notificações/Alerts** | Estoque crítico, eventos vencidos, transferências pendentes | 🟢 Baixa | Fase 3+ |

---

## 4. Índice de Implementação (Fase 1 → Fase 2)

### ✅ Completo (Fase 1)
- Banco de dados (4 tabelas, 2 enums, 7 triggers, 8 índices, RLS)
- Tipos & Validação (Zod, 53 testes)
- Server Actions (42 queries, 17 funções de domínio)
- Testes de validação (Vitest)
- Estrutura de testes (queries, RLS)

### 🔄 Em Progresso (Fase 1 continuada)
- UI (T9–T12)
- Permissões (T14)
- Testes de queries/RLS (T14)

### ⏳ Pendente (Fase 2)
- Offline Sync (T13)
- API (T15)
- Transferência em Massa (T19)
- Relatórios (T20)
- Integração Financeira (T21)

---

## 5. Dependências Entre Tasks

```
T9 (UI CRUD)
├── T10 (Detalhe + Genealogia)
├── T11 (Eventos)
├── T12 (CSV Import UI)
├── T14 (Permissões)
└── T15 (API) ← consumido por Planejamento Silagem

T13 (Offline) — independente, pode rodar em paralelo após T9
```

---

## 6. Recomendações

### Para começar T9 (UI CRUD)
1. Criar componente `AnimalListagem` (reutilizar tabela existente)
2. Criar `AnimalFormDialog` (com React Hook Form + Zod)
3. Criar página `/dashboard/rebanho/novo` (T9)
4. Validar permissões com `profile?.perfil`
5. Testar DELETE apenas para Admin (RLS bloqueia no servidor)

### Para T14 (Permissões)
1. Adicionar checks `if (profile?.perfil === 'Administrador')` nos botões DELETE/CRUD
2. Executar testes em `rebanho.rls.test.ts` (com Supabase real ou mock)
3. Verificar que Operador não consegue editar animal (apenas lançar evento)
4. Verificar que Visualizador não consegue editar/deletar nada

### Para T15 (API)
1. Criar rota `/api/rebanho/animais-ativos` (Server Action ou Route Handler)
2. Usar `listAnimais({ status: 'Ativo' })`
3. Mapear para response esperado
4. Validar performance com índice `idx_animais_fazenda_status`
5. Testar com Supabase real (< 500ms esperado)

---

## Histórico de Atualizações

- **2026-05-02**: Documento criado com pontos iniciais de Fase 1 continuada
