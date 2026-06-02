# PRD — Auditoria de Segurança do Código GestSilo Pro

**Data**: 2026-06-02  
**Escopo**: Segurança do código da aplicação (não RLS/banco — já auditado)  
**Auditor**: Claude Code (análise estática + leitura direta dos arquivos)

---

## 1. Tabela-Resumo dos Achados

| # | Severidade | Arquivo | Linha | Problema |
|---|---|---|---|---|
| S-01 | 🔴 Crítico | `app/api/assessoria/solicitar-consulta/route.ts` | 59, 105 | `console.log` expõe email, telefone, nome e observações do usuário em logs de produção |
| S-02 | 🔴 Crítico | `app/assessor/confirmar/page.tsx` + `app/dashboard/assessoria/actions.ts` | 67–118 / 190 | Página pública (`/assessor/confirmar`) chama `atualizarStatusAgendamentoAction` sem verificar autenticação nem ownership — qualquer pessoa que adivinhe o `agendamento_id` pode confirmar/recusar/remarcar agendamentos |
| S-03 | 🔴 Crítico | `package.json` — `dompurify ≤ 3.3.3` via `jspdf` | deps | **XSS em geração de PDF**: múltiplas CVEs incluindo mutation-XSS, prototype pollution via ADD_TAGS e bypass de SAFE_FOR_TEMPLATES. Afeta relatórios exportados com dados do usuário |
| S-04 | 🟡 Médio | `app/dashboard/talhoes/actions.ts` | 46 | `fazenda_id` obtido de `user.user_metadata` (JWT claim controlável pelo usuário, não confiável). Se RLS falhar, um usuário poderia injetar um `fazenda_id` arbitrário nos registros |
| S-05 | 🟡 Médio | `app/api/cron/alertas/route.ts` | 14 | Comparação de `CRON_SECRET` com `===` sujeita a timing attack; vazamento por análise de tempo de resposta |
| S-06 | 🟡 Médio | `app/dashboard/assessoria/actions.ts` | 190–213 | `atualizarStatusAgendamentoAction` não chama `getUser()` — Server Action sem autenticação. Qualquer origem pode chamar se souber o `id` |
| S-07 | 🟡 Médio | `app/dashboard/assessoria/actions.ts` | 86–118 | `atualizarAnotacaoAction` e `deletarAnotacaoAction` recebem `id` de anotação sem verificar se pertence à fazenda do usuário logado |
| S-08 | 🟡 Médio | `app/api/assessoria/solicitar-consulta/route.ts` | 95, 130 | `console.log` do resultado do email e `console.error` do erro de banco expõem dados operacionais em logs |
| S-09 | 🟡 Médio | `app/reset-password/page.tsx` | 24 | `getSession()` usado client-side para verificar sessão de recuperação de senha — correto neste contexto, mas deve ser documentado; sessão estabelecida via magic link pode ser inválida sem validação server-side adicional |
| S-10 | 🟡 Médio | `app/dashboard/configuracoes/sincronizacao/page.tsx` | 103 | `getSession()` usado para verificar sessão antes de sync manual — aceitável client-side, mas inconsistente com padrão `getUser()` do projeto |
| S-11 | 🟡 Médio | `package.json` — `fast-uri ≤ 3.1.1` | deps | **Alta**: path traversal via percent-encoded dot segments e host confusion via authority delimiters (GHSA-q3j6-qgpj-74h6, GHSA-v39h-62p7-jpjc) |
| S-12 | 🟡 Médio | `package.json` — `ws 8.0.0–8.20.0` | deps | Uninitialized memory disclosure (GHSA-58qx-3vcg-4xpx) — afeta conexões WebSocket do Supabase Realtime |
| S-13 | 🟢 Baixo | `app/dashboard/assessoria/actions.ts` | 99–116 | `console.log` de ID de anotação e stack trace em `deletarAnotacaoAction` vaza estrutura interna de dados e stacktraces para logs |
| S-14 | 🟢 Baixo | `app/dashboard/insumos/actions.ts` | 25, 218–237 | `console.log` em Server Actions expõe nomes de operações e IDs em logs de produção |
| S-15 | 🟢 Baixo | `app/dashboard/talhoes/[id]/page.tsx` | 46–71 | `console.log` com emoji em Client Component expõe IDs de talhão, contagens e dados de carregamento |
| S-16 | 🟢 Baixo | `next.config.ts` | 89 | `script-src 'unsafe-inline'` em produção — necessário para Next.js mas permite execução de scripts inline; monitorar se pode ser restringido com nonces |
| S-17 | 🟢 Baixo | `next.config.ts` | 94 | CSP `connect-src` não inclui Sentry (`*.ingest.sentry.io`), impedindo envio de erros client-side em produção |
| S-18 | 🟢 Baixo | `package.json` — `uuid < 11.1.1` via `exceljs` | deps | Missing buffer bounds check em v3/v5/v6 (GHSA-w5hq-g745-h8pq) — baixo impacto, dependência transitiva |
| S-19 | 🟢 Baixo | `app/api/auth/invite/route.ts` | 95–110 | Senha temporária retornada no corpo JSON da resposta — se o cliente logar ou repassar essa resposta, a senha fica exposta |
| S-20 | 🟢 Baixo | `middleware.ts` | 58–65 | Rotas `/login` e `/register` com usuário autenticado não redirecionam no servidor — deliberado (comentário explica), mas re-submissão de formulários é possível |

---

## 2. Detalhamento de Cada Achado

---

### S-01 — 🔴 Crítico — Log com dados pessoais em produção

**Arquivo**: [app/api/assessoria/solicitar-consulta/route.ts](app/api/assessoria/solicitar-consulta/route.ts) — linhas 59 e 105  
**Problema**: Dois `console.log` imprimem explicitamente `{ nome, fazenda, localizacao, telefone, email, sugestao_dia, sugestao_horario }` e o payload de INSERT com `fazenda_id`. Logs de produção (Vercel, Sentry) capturarão dados sensíveis de LGPD: email, telefone, nome completo e localização geográfica de usuários reais.

**Correção**:
```typescript
// REMOVER linha 59:
// console.log('[solicitar-consulta] Dados recebidos:', { nome, fazenda, ... });

// REMOVER linhas 105–112:
// console.log('[solicitar-consulta] Tentando inserir:', { ... });

// SUBSTITUIR linha 95 por:
console.log('[solicitar-consulta] Email enviado com sucesso. ID:', emailResult.data?.id);
```

---

### S-02 — 🔴 Crítico — Página pública pode modificar agendamentos sem autenticação

**Arquivos**:  
- [app/assessor/confirmar/page.tsx](app/assessor/confirmar/page.tsx) — linhas 67, 92, 118  
- [app/dashboard/assessoria/actions.ts](app/dashboard/assessoria/actions.ts) — linha 190

**Problema**: A página `/assessor/confirmar` verifica o JWT do link mágico **apenas no client** (via `verificarTokenConfirmacao` no browser). A Server Action `atualizarStatusAgendamentoAction` não chama `getUser()` nem valida o token JWT do link mágico — ela simplesmente atualiza o status de qualquer `id` que receber. 

Isso significa que qualquer pessoa que conheça um UUID de agendamento (ex: via vazamento de URL em logs) pode chamar `atualizarStatusAgendamentoAction` diretamente, sem passar pela verificação do token.

**Cadeia do ataque**:
1. Atacante obtém `agendamento_id` (UUID) — ex: via log, captura de rede ou força bruta
2. Chama a Server Action diretamente: `atualizarStatusAgendamentoAction(id, { status: 'confirmado' })`
3. Agendamento é modificado sem qualquer autenticação do lado servidor

**Correção** — adicionar validação de token na Server Action:
```typescript
// Em app/dashboard/assessoria/actions.ts
export async function atualizarStatusAgendamentoAction(
  id: string,
  payload: unknown,
  token?: string  // token do link mágico (passado pela página pública)
) {
  try {
    const validated = atualizarStatusAgendamentoSchema.parse(payload);

    // Verificar: ou usuário autenticado, ou token JWT válido do link mágico
    const cookieStore = await cookies();
    const client = createServerClient(/* ... */);
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
      // Rota pública: exige token JWT do link mágico
      if (!token) return { success: false, message: 'Não autorizado' };
      const decoded = verificarTokenConfirmacao(token);
      if (!decoded || decoded.agendamento_id !== id) {
        return { success: false, message: 'Link inválido ou expirado' };
      }
    }
    // ... resto da lógica
  }
}
```

---

### S-03 — 🔴 Crítico — DOMPurify com múltiplas CVEs via jspdf

**Arquivo**: `package.json` → `jspdf` depende de `dompurify ≤ 3.3.3`  
**CVEs**: GHSA-vhxf-7vqr-mrjg, GHSA-cjmm-f4jc-qw8r, GHSA-cj63-jhhr-wcxv, GHSA-39q2-94rc-95cp, GHSA-h7mw-gpvr-xq4m, GHSA-crv5-9vww-q3g8, GHSA-h8r8-wccr-v5f2

**Problema**: jsPDF usa DOMPurify para sanitizar HTML antes de renderizar em PDF. As vulnerabilidades incluem mutation-XSS, prototype pollution e bypass de filtros de sanitização. Se dados de usuário (nomes de fazendas, observações, nomes de animais) forem incluídos em relatórios PDF com HTML não sanitizado, um atacante poderia injetar HTML/JS malicioso.

**Impacto real**: Os relatórios são gerados server-side (Node.js), onde XSS não executa. O risco é maior se relatórios forem abertos em browsers com renderização HTML embutida, ou se o DOMPurify for usado client-side em outros contextos.

**Correção**:
```bash
npm audit fix --force
# Isso atualizará jspdf para 4.2.1 (breaking change — verificar compatibilidade)
```
Se a atualização não for possível imediatamente, garantir que dados de usuário nos PDFs passem por sanitização adicional antes de serem interpolados em templates HTML.

---

### S-04 — 🟡 Médio — `fazenda_id` de JWT claim em Server Action de talhões

**Arquivo**: [app/dashboard/talhoes/actions.ts](app/dashboard/talhoes/actions.ts) — linha 46  
**Problema**:
```typescript
const fazenda_id = user.user_metadata?.fazenda_id as string | undefined;
```
`user_metadata` é uma claim do JWT que pode ser manipulada pelo usuário em alguns cenários. O padrão correto do projeto (conforme `lib/supabase/queries-audit.ts`) é usar `getFazendaIdServer()` ou chamar a RPC `get_minha_fazenda_id()` que valida via PostgreSQL.

Note que o RLS do banco protege contra uso indevido dessa fazenda_id, mas a defesa em profundidade recomenda não confiar em user_metadata para dados críticos de negócio.

**Correção**:
```typescript
// ANTES (linha 46):
const fazenda_id = user.user_metadata?.fazenda_id as string | undefined;

// DEPOIS — usar RPC confiável:
const { data: fazendaId } = await supabase.rpc('get_minha_fazenda_id');
if (!fazendaId) return { success: false, error: 'Fazenda não encontrada.' };
// Usar fazendaId (string) nas queries subsequentes
```

---

### S-05 — 🟡 Médio — Timing attack na verificação do CRON_SECRET

**Arquivo**: [app/api/cron/alertas/route.ts](app/api/cron/alertas/route.ts) — linha 14  
**Problema**:
```typescript
if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
```
Comparação de strings com `!==` é sujeita a timing attacks: o tempo de comparação varia conforme o número de caracteres iguais no início. Em teoria, um atacante pode inferir o secret caracter por caracter medindo tempo de resposta.

**Correção**:
```typescript
import { timingSafeEqual } from 'crypto';

const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

const token = authHeader?.replace('Bearer ', '') ?? '';
const expected = Buffer.from(cronSecret);
const actual = Buffer.from(token);

// Buffers devem ter o mesmo tamanho para timingSafeEqual
const isValid =
  actual.length === expected.length &&
  timingSafeEqual(actual, expected);

if (!isValid) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

### S-06 — 🟡 Médio — `atualizarStatusAgendamentoAction` sem autenticação

**Arquivo**: [app/dashboard/assessoria/actions.ts](app/dashboard/assessoria/actions.ts) — linha 190  
**Problema**: A Server Action não verifica autenticação. Qualquer request que chegue ao servidor (via Server Action RPC do Next.js) pode chamar esta função sem precisar estar logado.

Ver S-02 para detalhes — este achado e S-02 têm a mesma raiz.

---

### S-07 — 🟡 Médio — Anotações sem verificação de ownership

**Arquivo**: [app/dashboard/assessoria/actions.ts](app/dashboard/assessoria/actions.ts) — linhas 86 e 97  
**Problema**: `atualizarAnotacaoAction(id, payload)` e `deletarAnotacaoAction(id)` recebem um `id` de anotação e chamam `queryAnotacoes.update(id, ...)` / `queryAnotacoes.delete(id)` **sem verificar se o usuário autenticado pertence à mesma fazenda da anotação**. A proteção fica inteiramente no RLS do banco (função `get_minha_fazenda_id()`).

Se o RLS estiver corretamente configurado, o ataque é bloqueado no banco. Mas como defesa em profundidade, a Server Action deveria verificar:
```typescript
// Verificar ownership antes de atualizar
const { data: anotacao } = await client
  .from('anotacoes_assessoria')
  .select('id, fazenda_id')
  .eq('id', id)
  .eq('fazenda_id', fazendaId)  // verifica ownership
  .single();

if (!anotacao) return { success: false, message: 'Anotação não encontrada' };
```

---

### S-08 — 🟡 Médio — Logs operacionais com dados no route handler

**Arquivo**: [app/api/assessoria/solicitar-consulta/route.ts](app/api/assessoria/solicitar-consulta/route.ts) — linhas 95 e 130  
**Problema**:
- Linha 95: `console.log('[solicitar-consulta] Email enviado com sucesso:', emailResult)` — `emailResult` pode conter destinatário, ID de mensagem e metadata do Resend
- Linha 130: `console.error('Erro ao criar agendamento:', error)` — pode vazar mensagem de erro com SQL, stack trace ou detalhes de schema

**Correção**: Logar apenas identificadores opacos:
```typescript
// linha 95:
console.log('[solicitar-consulta] Email enviado. ID:', emailResult.data?.id ?? 'n/a');

// linha 130:
console.error('[solicitar-consulta] Erro ao criar registro:', error instanceof Error ? error.message : 'desconhecido');
```

---

### S-09 / S-10 — 🟡 Médio — `getSession()` client-side (contexto específico)

**Arquivos**:
- [app/reset-password/page.tsx](app/reset-password/page.tsx) — linha 24
- [app/dashboard/configuracoes/sincronizacao/page.tsx](app/dashboard/configuracoes/sincronizacao/page.tsx) — linha 103

**Problema**: `getSession()` no browser lê o cache local sem validar com o servidor — pode retornar sessões expiradas como válidas. No projeto, o padrão estabelecido é `getUser()` para autenticação confiável.

**Contexto**:
- `reset-password/page.tsx`: Verifica se a sessão existe após redirecionamento do magic link. Risco baixo pois `updateUser` subsequente falhará se a sessão for inválida.
- `sincronizacao/page.tsx`: Verifica sessão antes de sync manual. Risco baixo pois o sync em si requer JWT válido.

**Correção recomendada** para `sincronizacao/page.tsx` (Server Action no handler):
```typescript
// Em vez de getSession(), chamar handleSync() diretamente
// que já verifica getSession() + refreshSession() internamente
async function handleSyncManual() {
  await handleSync(); // useOfflineSync já verifica sessão internamente
  await carregarConflitos();
}
```

---

### S-11 — 🟡 Médio — fast-uri com path traversal (alta severidade)

**Dependência**: `fast-uri ≤ 3.1.1` (transitiva via ajv ou outras dependências)  
**CVEs**: GHSA-q3j6-qgpj-74h6 (path traversal), GHSA-v39h-62p7-jpjc (host confusion)  

**Correção**:
```bash
npm audit fix
# fast-uri tem fix disponível sem breaking changes
```

---

### S-12 — 🟡 Médio — ws com memory disclosure

**Dependência**: `ws 8.0.0–8.20.0` (transitiva via @supabase/realtime-js)  
**CVE**: GHSA-58qx-3vcg-4xpx — Uninitialized memory disclosure  

**Correção**:
```bash
npm audit fix
# ws tem fix disponível sem breaking changes
```

---

### S-13 — 🟢 Baixo — Stack trace em log de erro de anotação

**Arquivo**: [app/dashboard/assessoria/actions.ts](app/dashboard/assessoria/actions.ts) — linhas 99–116  
**Problema**: `console.error` com `error.stack` expõe estrutura interna da aplicação.

```typescript
// REMOVER estes logs excessivos:
console.log('[deletarAnotacaoAction] Iniciando deleção de:', id);
console.log('[deletarAnotacaoAction] Deleção bem-sucedida');
console.error('[deletarAnotacaoAction] Erro completo:', error);
console.error('[deletarAnotacaoAction] Tipo de erro:', typeof error);
console.error('[deletarAnotacaoAction] Stack:', error instanceof Error ? error.stack : undefined);

// MANTER apenas:
console.error('[deletarAnotacaoAction]', error instanceof Error ? error.message : 'Erro desconhecido');
```

---

### S-14 — 🟢 Baixo — Logs de debug em Server Actions de insumos

**Arquivo**: [app/dashboard/insumos/actions.ts](app/dashboard/insumos/actions.ts) — linhas 25, 218, 220, 237  
**Problema**: `console.log` com dados operacionais (IDs, valores) em produção.

**Correção**: Remover todos os `console.log` das Server Actions. Manter apenas `console.error` com mensagens genéricas.

---

### S-15 — 🟢 Baixo — Logs com emoji em página de talhão

**Arquivo**: [app/dashboard/talhoes/[id]/page.tsx](app/dashboard/talhoes/[id]/page.tsx) — linhas 46–71  
**Problema**: 6 `console.log` com `📍`, `🔄`, `✅` expõem IDs, contagens e dados de loading. Desnecessários em produção.

**Correção**: Remover todos os `console.log` de carregamento.

---

### S-16 — 🟢 Baixo — `unsafe-inline` em script-src de produção

**Arquivo**: [next.config.ts](next.config.ts) — linha 89  
**Problema**: `'unsafe-inline'` está presente em `script-src` mesmo em produção (apenas `'unsafe-eval'` é removido em prod). Isso permite execução de `<script>` inline em qualquer página, enfraquecendo a proteção contra XSS.

**Nota**: Next.js atualmente **requer** `unsafe-inline` para funcionar sem nonces. A solução definitiva é implementar CSP com nonces, o que requer configuração adicional no Next.js 15.

**Ação**: Documentar como débito técnico. Avaliar implementação de nonces quando possível.

---

### S-17 — 🟢 Baixo — Sentry não está no `connect-src` da CSP

**Arquivo**: [next.config.ts](next.config.ts) — linha 94  
**Problema**: O CSP `connect-src` inclui apenas `'self'`, `*.supabase.co`, `*.upstash.io`, mas **não inclui** `*.ingest.sentry.io`. Isso bloqueia o envio de erros client-side para o Sentry em produção.

**Correção**:
```typescript
"connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.upstash.io https://*.ingest.sentry.io",
```

---

### S-18 — 🟢 Baixo — uuid < 11.1.1 via exceljs

**Dependência**: `uuid < 11.1.1` (transitiva via `exceljs`)  
**CVE**: GHSA-w5hq-g745-h8pq — buffer bounds check em v3/v5/v6  

**Correção**: Atualização requer breaking change (`exceljs@3.4.0`). Avaliar custo/benefício. Impacto baixo pois uuid é usado internamente pelo ExcelJS, não pelo código da aplicação.

---

### S-19 — 🟢 Baixo — Senha temporária no JSON de resposta

**Arquivo**: [app/api/auth/invite/route.ts](app/api/auth/invite/route.ts) — resposta JSON  
**Problema**: A rota retorna `{ message: '...', temporaryPassword: senha }` no corpo da resposta. Se o cliente logar essa resposta (ex: em um `console.log` de componente), a senha temporária ficará exposta.

**Análise**: O email com a senha é enviado ao novo usuário via Resend. Retornar a senha no JSON é redundante e desnecessário. A resposta deveria confirmar apenas que o convite foi enviado.

**Correção**: Remover `temporaryPassword` da resposta JSON:
```typescript
return NextResponse.json({ 
  message: 'Convite enviado com sucesso. O usuário receberá um email com as instruções.' 
}, { status: 201 });
```

---

### S-20 — 🟢 Baixo — Re-submissão de formulários em rotas auth

**Arquivo**: [middleware.ts](middleware.ts) — linhas 58–65  
**Problema**: Usuários autenticados que acessam `/login` ou `/register` não são redirecionados pelo middleware (deliberado, conforme comentário). Isso permite re-submissão de formulários de login por usuários já logados.

**Análise**: O comentário no código explica a decisão técnica (race condition com AuthProvider). A proteção é feita via `useEffect` no client. Risco baixo, mas inconsistente.

**Ação**: Manter como está, mas documentar que o redirect é responsabilidade exclusiva do client para essas rotas.

---

## 3. Pontos Fortes Encontrados

✅ **SERVICE_ROLE_KEY**: Usada corretamente em apenas 3 lugares (forgot-password, invite, cron). Nenhum uso em componentes client ou exports `NEXT_PUBLIC_`.  
✅ **`getUser()` no middleware**: Implementação correta com validação server-side.  
✅ **Rate limiting**: Upstash bem calibrado em todas as rotas de auth (login, register, forgot-password, invite).  
✅ **Zod em todos os Route Handlers**: Todas as rotas de auth validam input antes de processar.  
✅ **Sentry `beforeSend`**: Filtro robusto de dados sensíveis implementado em `sentry.server.config.ts` e `sentry.client.config.ts`.  
✅ **CSP configurado**: Headers de segurança presentes: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy.  
✅ **Offline-first seguro**: IndexedDB não armazena secrets; sync usa JWT do usuário (não service key).  
✅ **`'use server'` em todas as Server Actions**: Verificado em todos os `actions.ts` do dashboard.  
✅ **`.env` no .gitignore**: Confirmado com `!.env.example` para versionar apenas o template.  
✅ **Sem secrets hardcoded**: Nenhum token, senha ou API key encontrada no código-fonte.

---

## 4. Plano de Ação — Ordem de Prioridade

### Fase 1 — Imediato (antes do próximo deploy)

**1. [S-01] Remover console.log com dados pessoais**  
Arquivo: `app/api/assessoria/solicitar-consulta/route.ts`, linhas 59 e 105  
Tempo estimado: 5 minutos  
Impacto: Remove vazamento de LGPD em logs de produção

**2. [S-02 + S-06] Adicionar autenticação em `atualizarStatusAgendamentoAction`**  
Arquivo: `app/dashboard/assessoria/actions.ts`, linha 190  
Tempo estimado: 30 minutos  
Impacto: Fecha vetor de modificação de agendamentos sem autenticação

**3. [S-11 + S-05 (parcial)] Rodar `npm audit fix`**  
Corrige: fast-uri (path traversal), ws (memory disclosure), @hono/node-server, brace-expansion  
Tempo estimado: 10 minutos + teste  
Impacto: Remove 4 vulnerabilidades sem breaking changes

### Fase 2 — Esta semana

**4. [S-03] Atualizar jspdf para 4.2.1**  
```bash
npm audit fix --force  # instala jspdf@4.2.1
```
Verificar quebras na geração de relatórios PDF após atualização.  
Tempo estimado: 1–2 horas (incluindo testes de regressão em relatórios)

**5. [S-05] Implementar `timingSafeEqual` no CRON_SECRET**  
Arquivo: `app/api/cron/alertas/route.ts`, linha 14  
Tempo estimado: 15 minutos

**6. [S-13 + S-14 + S-15] Limpar todos os console.log de debug**  
Arquivos: `assessoria/actions.ts`, `insumos/actions.ts`, `talhoes/[id]/page.tsx`  
Tempo estimado: 20 minutos

**7. [S-17] Adicionar Sentry ao `connect-src` da CSP**  
Arquivo: `next.config.ts`, linha 94  
Tempo estimado: 5 minutos

### Fase 3 — Próxima sprint

**8. [S-04] Substituir `user.user_metadata.fazenda_id` por RPC**  
Arquivo: `app/dashboard/talhoes/actions.ts`, linha 46  
Tempo estimado: 30 minutos

**9. [S-07] Adicionar verificação de ownership em anotações**  
Arquivo: `app/dashboard/assessoria/actions.ts`, linhas 86–118  
Tempo estimado: 30 minutos

**10. [S-19] Remover `temporaryPassword` da resposta de invite**  
Arquivo: `app/api/auth/invite/route.ts`  
Tempo estimado: 5 minutos

### Fase 4 — Débito técnico

**11. [S-16] Avaliar CSP com nonces** (Next.js 15 suporta via middleware)  
**12. [S-18] Atualizar exceljs** quando versão compatível com uuid ≥ 11.1.1 estiver disponível  
**13. [S-09 + S-10] Padronizar uso de `getUser()`** nas páginas client que usam `getSession()`

---

## 5. Resumo Executivo

**Total de achados**: 20  
- 🔴 Crítico: 3 (S-01, S-02, S-03)  
- 🟡 Médio: 9 (S-04 a S-12)  
- 🟢 Baixo: 8 (S-13 a S-20)  

**Avaliação geral**: A aplicação tem uma base de segurança sólida — rate limiting, RLS, validação Zod, getUser() no middleware, sem secrets no código. Os problemas críticos são todos **corrigíveis em poucas horas** e não representam vulnerabilidades exploradas ativamente. O maior risco imediato é o vazamento de dados de LGPD via logs (S-01) e a autenticação ausente na Server Action de agendamentos (S-02).

**Não foram encontrados**:  
- Secrets hardcoded no código  
- `SUPABASE_SERVICE_ROLE_KEY` em arquivos client  
- Variables `NEXT_PUBLIC_` expondo dados sensíveis  
- SQL injection (uso correto de Supabase client parametrizado)  
- CSRF (Next.js Server Actions são protegidas por origin check nativo)

---

*Documento gerado em 2026-06-02. Revalidar após cada release significativa.*
