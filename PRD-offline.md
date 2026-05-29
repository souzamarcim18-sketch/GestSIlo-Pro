# PRD-offline — Auditoria do Sistema Offline/Sync do GestSilo

> Documento gerado em 2026-05-29 via auditoria de leitura (nenhum arquivo alterado).
> Objetivo: mapear o estado atual da infraestrutura offline antes de qualquer evolução.

---

## 1. Estrutura da Página do Operador

### Arquivos existentes

```
app/operador/
├── page.tsx        ← Interface principal do Operador (ativa, com suporte offline)
└── silos/
    └── page.tsx    ← Interface legada de saída (sem suporte offline)
```

### `app/operador/page.tsx` — Interface principal (em uso)

Fluxo em 3 etapas (wizard mobile-first):

1. **Etapa "silo"** — lista silos disponíveis, persiste o último usado em `localStorage` (`gestsilo:operador:ultimo_silo`)
2. **Etapa "acao"** — escolha entre Fornecimento ou Descarte
3. **Etapas "retirada" / "descarte"** — formulários de entrada de dados

**Comportamento online/offline:**

- `isOnline` vem de `useOfflineSync()` (escuta `window.online/offline`)
- **Se online**: chama diretamente `registrarRetiradaSilo()` ou `registrarPerdaSilo()` de `lib/supabase/operador.ts` → INSERT direto no Supabase
- **Se offline**: chama `enqueue('movimentacoes_silo', 'INSERT', payload)` → grava no IndexedDB
- Footer mostra indicador de conexão com dot animado

### `app/operador/silos/page.tsx` — Interface legada (sem uso ativo)

- Sem suporte offline (sem `enqueue`, sem `useOfflineSync`)
- Usa `q.movimentacoesSilo.create()` do cliente browser direto
- Zod inline para validação no cliente
- Não usa Server Actions (chama Supabase client-side diretamente)
- Status: **provavelmente obsoleta** — a `page.tsx` principal cobre o mesmo caso de uso com mais robustez

---

## 2. Camada de Persistência Local — IndexedDB

### Dependência

```json
"idb": "^8.0.3"
```

Biblioteca `idb` — wrapper tipado sobre a API nativa `IndexedDB`.

### Schema do banco local (`lib/db/localDb.ts`)

**Nome**: `gestsilo-offline-db`  
**Versão atual**: `2`

| Object Store | Key | Uso |
|---|---|---|
| `sync_queue` | `id` (autoIncrement) | Fila de operações a sincronizar. Índice: `by-timestamp` |
| `movimentacoes_silo` | `id` (string UUID) | Cache local de movimentações |
| `atividades_campo` | `id` | Cache local |
| `movimentacoes_insumo` | `id` | Cache local |
| `financeiro` | `id` | Cache local |
| `uso_maquinas` | `id` | Cache local |
| `abastecimentos` | `id` | Cache local |
| `eventos_rebanho` | `id` | Cache local + fila com status de sync |

**Índices do store `eventos_rebanho`** (adicionados na migração v1→v2):
- `by-animal` — filtra por `animal_id`
- `by-data` — filtra por `data_evento`
- `by-tipo` — filtra por `tipo_evento`
- `by-sync-status` — filtra por `_sync_status` (`pending | synced | error | pendente_revisao`)

### Schema da `sync_queue`

```typescript
{
  id?: number;          // autoIncrement
  tabela: string;       // nome da tabela Supabase de destino
  operacao: 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC';
  payload: Record<string, unknown>;
  timestamp: number;    // Date.now()
}
```

---

## 3. Fila de Sincronização (`lib/db/syncQueue.ts`)

### Funções exportadas

| Função | Descrição |
|---|---|
| `enqueue(tabela, operacao, payload)` | Adiciona operação à fila + atualiza cache local otimistamente |
| `enqueueRpc(rpcName, params, localPayload?)` | Adiciona chamada RPC à fila (para eventos reprodutivos) |
| `syncAll(supabase)` | Drena a fila: executa INSERT/UPDATE/DELETE/RPC em sequência |
| `getSyncStatus()` | Retorna `{ pendentes: number }` |
| `getSyncConflitos()` | Retorna eventos `eventos_rebanho` com status `pendente_revisao` |

### Lógica de `syncAll`

1. Lê **todas** as entradas da `sync_queue` ordenadas pelo índice `by-timestamp`
2. Para cada ação:
   - Checa conflitos (só para `eventos_rebanho`): verifica se animal está `Morto` ou `Vendido`
   - Se conflito: marca evento como `pendente_revisao` no IndexedDB; remove da fila; incrementa `conflitos`
   - Se sem conflito: executa a operação no Supabase
   - Se sucesso: remove da fila; incrementa `sincronizados`
   - Se erro de rede: **break** (mantém restante na fila para próxima tentativa)
3. Retorna `{ sincronizados, conflitos }`

### Detecção de conflito

Implementada apenas para `eventos_rebanho`. Consulta `animais` no Supabase para verificar se o animal foi `Morto` ou `Vendido` desde que o evento foi gravado offline. Conflitos ficam em `pendente_revisao` — **não são re-tentados automaticamente**.

### Operações suportadas por tabela (via `enqueue`)

```typescript
type TableName =
  | 'movimentacoes_silo'
  | 'atividades_campo'
  | 'movimentacoes_insumo'
  | 'financeiro'
  | 'uso_maquinas'
  | 'abastecimentos'
  | 'eventos_rebanho';
```

**Observação crítica**: `fazenda_id` não é enviado nos payloads de INSERT offline (correto — o trigger do banco preenche via `get_minha_fazenda_id()`). Mas a sessão JWT deve estar válida no momento da sincronização para que o trigger funcione.

---

## 4. Camada de API Local — Eventos Reprodutivos (`lib/db/eventosRebanho.ts`)

Módulo especializado para eventos do rebanho, com API de mais alto nível que `syncQueue`:

| Função | Descrição |
|---|---|
| `saveEventoLocal(tipo, animalId, data, payload, rpcName, rpcParams)` | Salva localmente + enfileira RPC |
| `getEventosByAnimal(animalId)` | Recupera por animal (ordenado por data desc) |
| `getEventosByTipo(tipo)` | Recupera por tipo de evento |
| `getEventosPendentes()` | Recupera `_sync_status === 'pending'` (ordenado por criação asc) |
| `hydrateEventosFromServer(serverEventos)` | Hidrata cache com dados do servidor; preserva `pending` |
| `markAsSynced(eventoId)` | Muda status para `synced` |
| `markAsError(eventoId)` | Muda status para `error` |
| `deleteEventoLocal(eventoId)` | Remove do cache |
| `getAllEventosLocais()` | Retorna todos os eventos locais |

**Política de merge em `hydrateEventosFromServer`:**
- Se evento não existe localmente → insere como `synced`
- Se existe como `synced` → sobrescreve com dados do servidor
- Se existe como `pending` ou `error` → **não modifica** (dados locais têm prioridade)

---

## 5. Hooks de Detecção de Status

### `hooks/useOfflineSync.ts` — usado pelo Operador e `SyncStatusBar`

- Estado: `isOnline`, `pendentes`, `isSyncing`
- Escuta `window.online/offline`
- Ao voltar online: dispara `syncAll` automaticamente com toast informativo
- Polling de `getSyncStatus()` a cada **5 segundos** (para manter contador atualizado)
- `handleSync`: trigger manual de sincronização
- `updateStatus`: re-lê contador da fila

### `lib/hooks/useOnlineStatus.ts` — hook simples

- Retorna `boolean` baseado em `navigator.onLine` + listeners de evento
- Sem integração com IndexedDB
- Usado nos dialogs de eventos reprodutivos do Rebanho

### `lib/hooks/useSyncOnReconnect.ts` — hook avançado (não usado no Operador)

- Usa `useOnlineStatus` internamente
- Detecta transição `offline → online` (via ref `wasOffline`)
- Escuta `visibilitychange` (PWA voltando do background)
- Retry com backoff exponencial: 1s, 2s, 4s, 8s, 16s (máx. 5 tentativas)
- Expõe `{ isSyncing, lastSyncAt, syncNow }`
- **Não está sendo usado em nenhum componente de produção identificado** — é um hook disponível mas sem ponto de uso ativo

---

## 6. Componente de UI — `components/SyncStatusBar.tsx`

Barra flutuante (fixed, bottom center) que aparece apenas quando:
- `!isOnline`, **OU**
- `pendentes > 0`, **OU**
- `isSyncing === true`

Estados visuais:
| Estado | Ícone | Cor |
|---|---|---|
| Offline | `WifiOff` pulsando | `bg-destructive/90` (vermelho) |
| Sincronizando | `RefreshCw` girando | `bg-secondary/90` |
| Pendentes (online) | `CheckCircle2` | `bg-primary/90` (verde) |

Usa `motion/react` (Framer Motion) para animação de entrada/saída.

**Ponto de montagem**: não identificado no código lido — provavelmente montado em um layout global, mas não foi verificado nesta auditoria.

---

## 7. Componentes de Rebanho com Suporte Offline

Os seguintes dialogs de eventos reprodutivos implementam o padrão online/offline:

| Componente | Evento | Offline |
|---|---|---|
| `CoberturaFormDialog.tsx` | cobertura | `db.put('eventos_rebanho', ...)` + `enqueue` |
| `AbortoFormDialog.tsx` | aborto | idem |
| `DescarteFormDialog.tsx` | descarte | idem |
| `DiagnosticoFormDialog.tsx` | diagnóstico de prenhez | idem |
| `PartoFormDialog.tsx` | parto | idem |
| `SecagemFormDialog.tsx` | secagem | idem |

Todos usam `useOnlineStatus()` (não `useOfflineSync`) — sem integração com o contador de pendentes da `SyncStatusBar`.

---

## 8. Service Worker — Serwist (`app/sw.ts`)

**Biblioteca**: `@serwist/next` + `serwist` v9.5.x (migrado de `next-pwa` em 2026-05-29)

**14 estratégias de cache runtime:**

| Recurso | Estratégia | TTL |
|---|---|---|
| Google Fonts (CSS) | StaleWhileRevalidate | 7 dias |
| Google Fonts (arquivos) | CacheFirst | 365 dias |
| Fontes locais | StaleWhileRevalidate | 7 dias |
| Imagens locais | StaleWhileRevalidate | 24h |
| Next.js Image | StaleWhileRevalidate | 24h |
| Áudio | CacheFirst + RangeRequests | 24h |
| Vídeo | CacheFirst + RangeRequests | 24h |
| JS estático | StaleWhileRevalidate | 24h |
| CSS | StaleWhileRevalidate | 24h |
| Next.js data (ISR) | StaleWhileRevalidate | 24h |
| JSON/XML/CSV | NetworkFirst (10s timeout) | 24h |
| `/api/*` (exceto `/api/auth/*`) | NetworkFirst (10s timeout) | 24h |
| Rotas internas (`/`) | NetworkFirst (10s timeout) | 24h |
| Cross-origin | NetworkFirst (10s timeout) | 1h |

**Fallback offline**: `/~offline` (página precacheada) — exibida quando documento não disponível.

**Exclusão de segurança**: `/api/auth/*` **nunca** entra em cache (tokens de sessão).

**Não implementado no SW**: Background Sync API (`SyncManager`), Periodic Background Sync — toda a sincronização é feita via JavaScript do app (listeners `online/offline`).

---

## 9. Testes

### `lib/db/__tests__/eventosRebanho.test.ts`

- **17 casos** cobrindo toda a API de `eventosRebanho.ts`
- Usa mock completo de IndexedDB (sem dependência de browser)
- Cobre: `saveEventoLocal`, `getEventosByAnimal`, `getEventosByTipo`, `getEventosPendentes`, `markAsSynced`, `markAsError`, `deleteEventoLocal`, `hydrateEventosFromServer`, migração v1→v2, integração com `sync_queue`

---

## 10. Dependências no `package.json`

```json
"idb": "^8.0.3"
```

**Ausentes** (não utilizados):
- `dexie` — não instalado
- `localforage` — não instalado
- `workbox-background-sync` — não instalado (workbox usado apenas indiretamente via Serwist)

---

## 11. Resumo Executivo — Estado Atual

### O que está implementado e funcionando

| Capacidade | Status | Onde |
|---|---|---|
| Detecção online/offline | ✅ Funcionando | `useOnlineStatus`, `useOfflineSync` |
| Fila de sync com IndexedDB | ✅ Funcionando | `lib/db/syncQueue.ts` |
| Sync automático ao reconectar | ✅ Funcionando | `useOfflineSync` (evento `online`) |
| Retry com backoff exponencial | ✅ Implementado | `useSyncOnReconnect` (não montado em produção) |
| Operador — fornecimento offline | ✅ Funcionando | `app/operador/page.tsx` |
| Operador — descarte offline | ✅ Funcionando | `app/operador/page.tsx` |
| Eventos reprodutivos offline | ✅ Funcionando | 6 dialogs em `components/rebanho/reproducao/` |
| Detecção de conflitos (rebanho) | ✅ Implementado | `syncQueue.ts → detectarConflito()` |
| Indicador visual de status | ✅ Implementado | `SyncStatusBar.tsx` |
| Service Worker com cache | ✅ Funcionando | `app/sw.ts` (Serwist) |
| Fallback página offline | ✅ Funcionando | `/~offline` |
| Cache otimista local | ✅ Funcionando | `enqueue` atualiza stores locais imediatamente |
| Hidratação do cache do servidor | ✅ Implementado | `hydrateEventosFromServer` |

### Lacunas e pontos de atenção

| Item | Descrição | Risco |
|---|---|---|
| `app/operador/silos/page.tsx` | Rota legada sem suporte offline, mesmo nome de domínio | Baixo — provavelmente não linkada |
| `useSyncOnReconnect` não montado | Hook com retry/backoff implementado mas sem uso ativo em produção | Médio — funcionalidade de retry não aplicada |
| `SyncStatusBar` ponto de montagem | Não verificado onde é montado no layout | Baixo |
| Background Sync API | Não usa `SyncManager` do Service Worker — sync depende de JS estar rodando | Médio — se aba fechada, sync não ocorre |
| `sync_queue` sem limite de tamanho | Sem TTL ou limpeza automática de entradas antigas | Baixo (curto prazo) |
| Conflitos `pendente_revisao` | Ficam no IndexedDB sem UX de resolução para o usuário | Médio — usuário não sabe o que fazer |
| `hydrateEventosFromServer` | Implementada mas não há evidência de quem a chama na inicialização | Médio — cache pode ficar desatualizado |
| Polling de 5s em `useOfflineSync` | Custo de leitura ao IndexedDB a cada 5 segundos em todos que usam o hook | Baixo (IndexedDB é rápido) |
| Sessão JWT expirada no sync | Se o usuário fica offline por horas, o JWT pode expirar antes do sync | Alto — operações offline seriam rejeitadas pelo Supabase/RLS |

### Tabelas cobertas pelo sistema offline

As seguintes tabelas têm suporte de escrita offline via `sync_queue`:

1. `movimentacoes_silo` — **em uso ativo** (Operador)
2. `eventos_rebanho` — **em uso ativo** (dialogs de reprodução)
3. `atividades_campo` — **schema definido**, sem uso ativo identificado
4. `movimentacoes_insumo` — **schema definido**, sem uso ativo identificado
5. `financeiro` — **schema definido**, sem uso ativo identificado
6. `uso_maquinas` — **schema definido**, sem uso ativo identificado
7. `abastecimentos` — **schema definido**, sem uso ativo identificado

### Fluxo de dados resumido

```
Usuário preenche formulário
        │
        ├─ isOnline === true ──→ Supabase (direto) ──→ sucesso imediato
        │
        └─ isOnline === false
                │
                ├─ enqueue() → IndexedDB (sync_queue + store local)
                │
                └─ Usuário vê toast "Salvo localmente"
                          │
                          └─ Evento 'online' dispara
                                    │
                                    └─ syncAll(supabase) drena a fila
                                              │
                                              ├─ Sucesso → remove da fila
                                              └─ Conflito → pendente_revisao
```

---

*Fim da auditoria. Nenhum arquivo foi modificado.*
