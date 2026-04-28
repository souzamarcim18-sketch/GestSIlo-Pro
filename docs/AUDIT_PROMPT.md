# 🔍 Auditoria Geral — GestSilo Pro

## 1. Sua missão

Você é um auditor sênior de código. Vai realizar uma **auditoria geral e profunda** 
do projeto GestSilo Pro, cruzando o código-fonte do repositório com a documentação 
oficial. O objetivo é entregar um relatório acionável, com achados concretos, 
priorizados e com sugestões de correção.

**Você NÃO deve corrigir nada nesta etapa.** Apenas auditar e relatar.

---

## 2. Documentos de referência (leia ANTES de começar)

Leitura obrigatória, nesta ordem:

1. `ARCHITECTURE_REVIEW.md` — visão arquitetural, dívida técnica, ADRs
2. `database-snapshot.md` — **fonte de verdade do schema do banco**
3. `package.json` — stack, scripts, dependências
4. `tsconfig.json` — configurações de TypeScript
5. `next.config.js` ou `next.config.ts` — config do Next
6. `middleware.ts` — proteção de rotas
7. `eslint.config.*` — regras de lint ativas

> ⚠️ Se algum desses arquivos não existir ou estiver vazio, **registre como achado**.

---

## 3. Escopo da auditoria — 8 dimensões

Avalie cada dimensão atribuindo **nota de 0 a 10** e listando achados concretos.

### 3.1. Arquitetura & Organização
- Separação `app/`, `components/`, `hooks/`, `lib/`, `validators/` está coerente?
- Há lógica de negócio vazando pra dentro de componentes de UI?
- Server Components vs Client Components estão bem decididos?
- Onde existe acoplamento desnecessário?

### 3.2. Qualidade do código TypeScript/React
- `strict: true` está ativo? Há `any` ou `@ts-ignore` espalhados?
- Hooks seguem regras (deps arrays corretas, sem `eslint-disable` injustificado)?
- Componentes muito grandes (> 300 linhas) que precisam ser quebrados?
- Duplicação de código (DRY)?

### 3.3. Segurança
- RLS ativa em **todas** as tabelas sensíveis (cruzar com Seção 4 do snapshot)?
- Helpers RLS em uso são os corretos (`get_minha_fazenda_id`, `sou_gerente_ou_admin`)?
- Há chamadas `.rpc('get_my_fazenda_id')` legadas no código?
- Validação Zod em **todos** os formulários antes de enviar ao Supabase?
- Secrets fora de `.env`? Tokens hardcoded?
- Headers de segurança no `next.config.js` (CSP, X-Frame-Options)?
- Sanitização de inputs renderizados (XSS via `dangerouslySetInnerHTML`)?

### 3.4. Performance
- Queries `.select('*')` que poderiam ser específicas?
- Possíveis N+1 (loops fazendo `.select()` dentro)?
- Filtros `.eq()` e `.order()` em colunas **sem índice** (cruzar com Seção 6 do snapshot)?
- Lazy loading aplicado em libs pesadas (`recharts`, `jspdf`, `xlsx`)?
- Cache do Next 15 sendo usado adequadamente?
- Imagens otimizadas com `next/image`?

### 3.5. Banco de dados (cruzamento com snapshot)
Aplique **rigorosamente** o checklist da seção "INSTRUÇÕES PARA O CLAUDE CODE" 
do `database-snapshot.md`:
- Tipos TS ↔ colunas reais
- Schemas Zod ↔ CHECK constraints
- `.select()` ↔ colunas existentes
- Inserções manuais vs triggers (não enviar `fazenda_id`, `created_at`, etc.)
- RLS PT-BR ↔ helpers no código
- TODOs do `ARCHITECTURE_REVIEW.md` resolvidos no banco?
- DELETEs alinhados com policies por role
- Filtros usam colunas indexadas?

### 3.6. Testes
- Cobertura atual por módulo (rodar `npm run test -- --coverage`)
- Áreas críticas sem teste: `useOfflineSync`, fluxos de auth, RLS
- Testes E2E cobrem onboarding, login, CRUD principal?
- Há testes que estão pulados (`.skip`) ou comentados?

### 3.7. DX & Manutenibilidade
- README está atualizado e suficiente para onboarding?
- Convenções (Conventional Commits, padrão de branches) documentadas?
- Scripts do `package.json` cobrem o ciclo (dev, build, test, lint, clean)?
- Tipos do Supabase gerados e commitados em `types/supabase.ts`?

### 3.8. Infraestrutura & Deploy
- `next.config` com configs corretas pra Vercel?
- Variáveis de ambiente documentadas em `.env.example`?
- Manifest PWA e service worker configurados?
- Plano de backup do Supabase mencionado/implementado?

---

## 4. Formato de saída — OBRIGATÓRIO

### 4.1. Para cada achado, use este formato:

```
ACHADO #N — [Título curto]
Dimensão: [3.1 a 3.8]
Severidade: 🔴 Crítico | 🟡 Médio | 🟢 Baixo
Arquivo: caminho/exato.ts:linha
Problema:
  [1-3 frases descrevendo o problema]
Evidência:
  [trecho do código ou referência ao snapshot]
Sugestão:
  [correção concreta, com snippet quando aplicável]
Esforço: P (≤1h) | M (1 dia) | G (>1 dia)
Risco se não corrigir: [breve descrição]
```

### 4.2. Ao final do relatório, entregue um arquivo docs/audit-geral.md com:

1. **Resumo executivo** (máx. 25 linhas)
   - Saúde geral do projeto (nota consolidada 0-10)
   - 3 pontos fortes
   - 3 pontos críticos

2. **Tabela consolidada de notas**
   | Dimensão | Nota | Achados críticos | Médios | Baixos |
   |---|---|---|---|---|

3. **Top 10 prioridades** (matriz Impacto × Esforço)
   Ordenadas por: maior impacto + menor esforço primeiro.

4. **Plano de 3 sprints sugerido**
   - Sprint 1 (1 semana): correções críticas
   - Sprint 2 (2 semanas): refatorações de médio prazo
   - Sprint 3 (1 mês): melhorias estruturais

---

## 5. Regras invioláveis ❌

- ❌ **NÃO altere nenhum arquivo** nesta auditoria — apenas relate
- ❌ **NÃO altere policies, triggers ou funções** do banco
- ❌ **NÃO sugira renomear identificadores em PT-BR** (decisão arquitetural)
- ❌ **NÃO crie tabelas novas** ou sugira sem confirmar com o usuário
- ❌ **NÃO toque em `.env`, `.env.local` ou `next.config.js`**
- ❌ **NÃO invente colunas/tabelas** — sempre valide na Seção 3 do snapshot
- ❌ **NÃO faça refatorações cosméticas** (espaços, ordem de imports, etc.)

## 6. Regras de qualidade ✅

- ✅ Toda afirmação sobre o schema deve citar a seção do snapshot
- ✅ Todo achado precisa ter `arquivo:linha` (sem isso, descarte)
- ✅ Sugestões devem ser concretas e implementáveis
- ✅ Use português do Brasil em todo o relatório
- ✅ Seja objetivo — sem floreio, sem repetir óbvio

---

## 7. Entregável final

Salve o relatório completo em: docs/audit-geral.md 

Comece agora pela leitura dos documentos de referência e, em seguida, 
varra o repositório de forma sistemática.