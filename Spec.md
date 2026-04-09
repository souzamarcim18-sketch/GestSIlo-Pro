# Spec.md — GestSilo-Pro: Plano de Ação

> Gerado em: 2026-04-09  
> Baseado em: PRD.md (análise completa do projeto)  
> Objetivo: Corrigir bugs críticos, eliminar débitos técnicos e elevar o projeto a produção.

---

## 1. Prioridade Crítica (fazer primeiro)

---

### C1 — Corrigir `handleAddMov` em Silos (movimentação não persiste)

**O que está errado (PRD §3 — Crítico)**  
`app/dashboard/silos/page.tsx:181-184` — `handleAddMov` exibe toast e fecha dialog sem chamar Supabase. Movimentações são silenciosamente descartadas.

**Arquivos a modificar**  
- `app/dashboard/silos/page.tsx`
- `lib/supabase/silos.ts` (adicionar função `createMovimentacao` se não existir)

**O que precisa ser feito**  
1. Em `lib/supabase/silos.ts`, adicionar (ou verificar se já existe) função `createMovimentacao(data: { silo_id, tipo, quantidade, responsavel, observacao, fazenda_id })` que insere na tabela `movimentacoes_silo`.
2. Em `silos/page.tsx`, substituir o corpo de `handleAddMov` por:
   - Chamar `createMovimentacao` com os dados do formulário + `fazenda_id` do profile atual.
   - Atualizar `estoque_atual` do silo (incremento ou decremento conforme `tipo`).
   - Atualizar estado local de movimentações com `setMovimentacoes(prev => [...prev, nova])`.
   - Exibir `toast.success` apenas após confirmação do banco.
   - Em caso de erro, exibir `toast.error` e não fechar o dialog.
3. Adicionar estado de loading no botão de submit (`disabled` + spinner durante a chamada).

**Critério de conclusão**  
- Registrar uma movimentação de entrada/saída persiste no Supabase (verificável no dashboard do Supabase).
- O estoque do silo atualiza visualmente após o registro.
- Em caso de falha de rede, um `toast.error` é exibido e o dialog permanece aberto.

---

### C2 — Implementar Configurações (fetch e persistência reais)

**O que está errado (PRD §3 — Crítico)**  
`app/dashboard/configuracoes/page.tsx:47-68` — `fetchData()` seta `null`/`[]` sem consultar Supabase. `handleSaveProfile` e `handleSaveFazenda` só exibem toast sem persistir nada.

**Arquivos a modificar**  
- `app/dashboard/configuracoes/page.tsx`
- `lib/supabase/` — criar `lib/supabase/configuracoes.ts` com as funções necessárias

**O que precisa ser feito**  
1. Criar `lib/supabase/configuracoes.ts` com:
   - `getProfile(userId: string)` → `SELECT * FROM profiles WHERE id = userId`
   - `updateProfile(userId: string, data: { nome, email, telefone })` → `UPDATE profiles`
   - `getFazenda(fazendaId: string)` → `SELECT * FROM fazendas WHERE id = fazendaId`
   - `updateFazenda(fazendaId: string, data: { nome, cnpj, endereco, area_total })` → `UPDATE fazendas`
   - `getUsersByFazenda(fazendaId: string)` → `SELECT * FROM profiles WHERE fazenda_id = fazendaId`
2. Em `configuracoes/page.tsx`, substituir `fetchData()` por chamadas reais às funções acima usando `fazenda_id` e `user.id` do profile.
3. Em `handleSaveProfile`, chamar `updateProfile` e aguardar retorno antes do toast.
4. Em `handleSaveFazenda`, chamar `updateFazenda` e aguardar retorno antes do toast.
5. Tratar erros com `toast.error` e tipagem `err: unknown` com type guard.

**Critério de conclusão**  
- Ao abrir Configurações, os campos carregam com os dados reais do banco.
- Salvar perfil ou fazenda atualiza o registro no Supabase (verificável no dashboard).
- Erros de banco exibem mensagem específica via `toast.error`.

---

### C3 — Dashboard Home: substituir stats hardcoded por dados reais

**O que está errado (PRD §3 — Crítico)**  
`app/dashboard/page.tsx` — array `stats` estático com `'0%'`, `'0 ha'`, `'0 / 0'`, `'R$ 0,00'`. Nenhum fetch de dados.

**Arquivos a modificar**  
- `app/dashboard/page.tsx`

**O que precisa ser feito**  
1. Adicionar `useEffect` que, após obter `fazenda_id` do profile, realiza 4 queries paralelas com `Promise.all`:
   - Total de silos e ocupação média → `SELECT COUNT(*), AVG(estoque_atual/capacidade*100) FROM silos WHERE fazenda_id = ?`
   - Área total de talhões ativos → `SELECT SUM(area_ha) FROM talhoes WHERE fazenda_id = ?`
   - Total de máquinas e manutenções pendentes → `SELECT COUNT(*) FROM maquinas WHERE fazenda_id = ?`
   - Saldo financeiro do mês → `SELECT SUM(CASE WHEN tipo='receita' THEN valor ELSE -valor END) FROM lancamentos WHERE fazenda_id = ? AND mes atual`
2. Mostrar skeleton (`<Skeleton>` do shadcn) enquanto os dados carregam.
3. Formatar valores: `ocupação` como `'X%'`, área como `'X ha'`, saldo como `'R$ X.XXX,XX'`.
4. Tratar o caso em que não há dados (fazenda nova) exibindo `'—'` ao invés de `'0'`.

**Critério de conclusão**  
- Stats do dashboard refletem dados reais do banco para a fazenda logada.
- Um skeleton é exibido durante o carregamento.
- Fazenda sem dados exibe `'—'` em todos os campos, não `'0'`.

---

### C4 — Corrigir `listAbaixoMinimo()` em Insumos

**O que está errado (PRD §3 — Crítico / PostgreSQL)**  
`lib/supabase/insumos.ts` — `.filter('estoque_atual', 'lt', 'estoque_minimo')` compara a coluna com a string literal `"estoque_minimo"` em vez do valor da outra coluna. O alerta de estoque nunca funciona corretamente.

**Arquivos a modificar**  
- `lib/supabase/insumos.ts`

**O que precisa ser feito**  
Substituir o filtro incorreto por uma das opções (escolher a mais simples viável):

**Opção A — RPC Supabase (recomendada):** Criar função SQL `get_insumos_abaixo_minimo(p_fazenda_id uuid)` que retorna `SELECT * FROM insumos WHERE fazenda_id = p_fazenda_id AND estoque_atual < estoque_minimo`. Chamar via `supabase.rpc('get_insumos_abaixo_minimo', { p_fazenda_id })`.

**Opção B — Filtrar no cliente:** Buscar todos os insumos da fazenda e filtrar em JS: `insumos.filter(i => i.estoque_atual < i.estoque_minimo)`. Adequado se o volume for baixo (< 500 registros).

Incluir a migração SQL caso opte pela RPC no arquivo `supabase/migrations/009_rpc_insumos_abaixo_minimo.sql`.

**Critério de conclusão**  
- Inserir um insumo com `estoque_atual = 5` e `estoque_minimo = 10` → aparece na lista de alertas.
- Inserir um insumo com `estoque_atual = 15` e `estoque_minimo = 10` → não aparece na lista.

---

### C5 — Remover `ignoreDuringBuilds` do `next.config.ts`

**O que está errado (PRD §6 — Next.js)**  
`next.config.ts` — `eslint: { ignoreDuringBuilds: true }` e `typescript: { ignoreBuildErrors: true }` desativam verificação no build. Bugs de tipo e lint chegam a produção sem aviso.

**Arquivos a modificar**  
- `next.config.ts`
- Qualquer arquivo com erro de tipo ou lint descoberto após remoção

**O que precisa ser feito**  
1. Remover as chaves `eslint: { ignoreDuringBuilds: true }` e `typescript: { ignoreBuildErrors: true }` do `next.config.ts`.
2. Rodar `npm run build` e `npm run lint` para listar todos os erros emergentes.
3. Corrigir cada erro: priorizar erros de tipo (`any` explícito, retornos não tipados) e erros de lint (imports não usados, hooks sem deps).
4. Não suprimir erros com `// @ts-ignore` ou `// eslint-disable` — corrigir na origem.

**Critério de conclusão**  
- `npm run build` completa sem erros (zero TypeScript errors, zero ESLint errors).
- As flags `ignoreDuringBuilds` e `ignoreBuildErrors` não existem mais no `next.config.ts`.

---

### C6 — Corrigir isolamento de `fazenda_id` nas queries de Talhões, Calculadoras e Simulador

**O que está errado (PRD §6 — Supabase)**  
`app/dashboard/talhoes/page.tsx`, `app/dashboard/calculadoras/page.tsx`, `app/dashboard/simulador/page.tsx` — queries diretas sem `fazenda_id` explícito. Segurança depende 100% do RLS; qualquer brecha expõe dados de todas as fazendas.

**Arquivos a modificar**  
- `app/dashboard/talhoes/page.tsx`
- `app/dashboard/calculadoras/page.tsx`
- `app/dashboard/simulador/page.tsx`

**O que precisa ser feito**  
Para cada um dos 3 arquivos:
1. Verificar que `fazenda_id` é obtido do profile no `useEffect` inicial.
2. Em cada `supabase.from(tabela).select(...)` sem `.eq('fazenda_id', fazendaId)`, adicionar o filtro.
3. Verificar se `lib/supabase/queries-audit.ts` já cobre as queries necessárias; se sim, importar de lá em vez de duplicar.
4. Garantir que inserções e updates também incluem `fazenda_id`.

**Critério de conclusão**  
- Nenhuma query em `talhoes/page.tsx`, `calculadoras/page.tsx` ou `simulador/page.tsx` acessa o banco sem `.eq('fazenda_id', fazendaId)`.
- Duas fazendas diferentes logadas ao mesmo tempo não veem dados uma da outra (teste manual ou E2E).

---

## 2. Prioridade Alta

---

### A1 — Criar hook `useAuth()` centralizando auth + fazenda_id

**O que está errado (PRD §5 — Overengineering / §6 React)**  
O bloco de `getUser()` + query de `profiles` está duplicado em 8+ `useEffect` pelo projeto. Qualquer mudança no schema de `profiles` requer atualização em 8 lugares.

**Arquivos a criar/modificar**  
- Criar: `hooks/useAuth.ts`
- Modificar: todos os pages do dashboard que fazem fetch de `profiles` diretamente

**O que precisa ser feito**  
1. Criar `hooks/useAuth.ts` exportando um hook com retorno:
   ```ts
   { user: User | null, profile: Profile | null, fazendaId: string | null, loading: boolean }
   ```
2. Internamente: usar `supabase.auth.onAuthStateChange` para detectar mudanças de sessão e buscar o profile correspondente uma única vez.
3. Substituir nos 8+ pages o bloco duplicado por `const { fazendaId, profile } = useAuth()`.
4. Atualizar o tipo `Profile` em `lib/supabase.ts` para incluir todos os campos usados (`nome`, `email`, `role`, `fazenda_id`, `fazendas`).

**Critério de conclusão**  
- O bloco `supabase.auth.getUser()` + query de profiles aparece apenas dentro de `hooks/useAuth.ts`.
- Todos os pages do dashboard usam `useAuth()` para obter `fazendaId`.

---

### A2 — Corrigir tipagem do Supabase client em `lib/supabase.ts`

**O que está errado (PRD §5 — Overengineering / §6 Supabase)**  
`lib/supabase.ts` — cliente exposto como `Proxy<any>` perde todo o type-safety do `SupabaseClient`. `supabaseInstance: any` impede autocomplete e type-checking.

**Arquivos a modificar**  
- `lib/supabase.ts`

**O que precisa ser feito**  
Substituir o `Proxy` por um singleton simples e tipado:
```ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

// Manter export `supabase` para compatibilidade com imports existentes
export const supabase = getSupabaseClient();
```
Verificar que nenhum import nos outros arquivos precisa ser atualizado (o `export const supabase` mantém compatibilidade).

**Critério de conclusão**  
- `lib/supabase.ts` não usa `Proxy` nem `any`.
- `npm run build` passa sem erros de tipo relacionados ao cliente Supabase.

---

### A3 — Implementar Relatórios (exportação PDF/Excel real)

**O que está errado (PRD §3 — Alto)**  
`app/dashboard/relatorios/page.tsx` — `handleExport()` exibe `toast.success('Exportando...')` sem gerar arquivo. Módulo completamente não funcional.

**Arquivos a criar/modificar**  
- `app/dashboard/relatorios/page.tsx`
- Instalar `jspdf` + `jspdf-autotable` (PDF) ou `xlsx` (Excel) — escolher um

**O que precisa ser feito**  
1. Decidir formato: recomendar `xlsx` para tabelas financeiras/estoque e `jspdf` para relatórios formatados.
2. Instalar dependência escolhida: `npm install xlsx` ou `npm install jspdf jspdf-autotable`.
3. Para cada tipo de relatório disponível na UI (Financeiro, Silos, Insumos):
   - Buscar dados reais do Supabase com `fazenda_id`.
   - Gerar o arquivo no cliente com a biblioteca instalada.
   - Triggerar download via `URL.createObjectURL` + link temporário.
4. Remover o botão "Configurar Dashboards" com `toast.info('Em breve')` ou implementá-lo.
5. Adicionar estado de loading durante a geração.

**Critério de conclusão**  
- Clicar em "Exportar" para qualquer módulo dispara download de arquivo real (`.xlsx` ou `.pdf`).
- O arquivo contém dados reais da fazenda logada.
- Nenhum botão exibe `toast.info('Em breve')` como resposta final.

---

### A4 — Corrigir tipagem `any` no `header.tsx` e `catch` blocks

**O que está errado (PRD §6 — React)**  
`header.tsx:23` usa `useState<any>(null)` para `user`. Múltiplos arquivos usam `catch (err: any)` em vez de `unknown` com type guard.

**Arquivos a modificar**  
- `components/header.tsx`
- `app/login/page.tsx`
- `app/register/page.tsx`
- `app/dashboard/insumos/page.tsx`
- `app/dashboard/rebanho/page.tsx`

**O que precisa ser feito**  
1. Em `header.tsx:23`: substituir `useState<any>(null)` por `useState<User | null>(null)` (importar `User` de `@supabase/supabase-js`).
2. Em cada arquivo com `catch (err: any)`: substituir por `catch (err: unknown)` e adicionar type guard:
   ```ts
   const message = err instanceof Error ? err.message : 'Erro desconhecido';
   toast.error(message);
   ```
3. Remover qualquer `(err as any).message` resultante — substituir pelo type guard acima.

**Critério de conclusão**  
- Nenhum `useState<any>` ou `catch (err: any)` nos arquivos listados.
- `npm run build` passa sem erros de tipo nesses arquivos.

---

### A5 — Remover ESLint config duplicado

**O que está errado (PRD §6 — Next.js)**  
`eslint.config.mjs` (flat config) e `.eslintrc.json` (legacy) coexistem. Comportamento imprevisível de qual configuração se aplica.

**Arquivos a modificar/remover**  
- Remover: `.eslintrc.json`
- Manter: `eslint.config.mjs`

**O que precisa ser feito**  
1. Verificar se `.eslintrc.json` tem regras que não estão em `eslint.config.mjs`. Se sim, migrar as regras faltantes para `eslint.config.mjs`.
2. Deletar `.eslintrc.json`.
3. Rodar `npm run lint` e confirmar que as regras corretas ainda se aplicam.

**Critério de conclusão**  
- Apenas `eslint.config.mjs` existe na raiz.
- `npm run lint` executa sem warnings sobre configuração duplicada.

---

## 3. Prioridade Média

---

### M1 — Ativar Breadcrumbs no dashboard layout

**O que está errado (PRD §3 — Médio / §4 Morto)**  
`app/dashboard/layout.tsx` — `import Breadcrumbs from '@/components/breadcrumbs'` existe mas `<Breadcrumbs />` nunca é renderizado no JSX retornado.

**Arquivos a modificar**  
- `app/dashboard/layout.tsx`

**O que precisa ser feito**  
Opção A (renderizar): Adicionar `<Breadcrumbs />` no JSX do layout, dentro do `<main>` e antes de `{children}`, verificando que o componente funciona corretamente com o App Router (usa `usePathname`).  
Opção B (remover): Se breadcrumbs não estão no roadmap, remover o import e o arquivo `components/breadcrumbs.tsx`.

**Critério de conclusão**  
- Não existe import de componente sem uso no `layout.tsx`.
- Se renderizado: breadcrumbs aparecem visualmente em todas as páginas do dashboard.

---

### M2 — Corrigir links mortos na tela de Login

**O que está errado (PRD §3 — Médio)**  
`app/login/page.tsx` — links para `/forgot-password`, `/privacidade`, `/termos`, `/suporte` não existem como rotas no App Router.

**Arquivos a modificar/criar**  
- `app/login/page.tsx`
- `app/forgot-password/page.tsx` (criar — formulário básico de reset)

**O que precisa ser feito**  
1. `/forgot-password`: Criar `app/forgot-password/page.tsx` com formulário de email que chama `supabase.auth.resetPasswordForEmail(email)`. Exibir confirmação de envio.
2. `/privacidade` e `/termos`: Criar `app/privacidade/page.tsx` e `app/termos/page.tsx` com conteúdo estático mínimo (pode ser placeholder com aviso "Em elaboração").
3. `/suporte`: Criar `app/suporte/page.tsx` com formulário de contato simples (nome, email, mensagem) ou redirecionar para email com `mailto:`.
4. Alternativa: remover os links que não serão implementados.

**Critério de conclusão**  
- Nenhum link na tela de login leva a uma rota 404.
- `/forgot-password` envia email de reset via Supabase Auth.

---

### M3 — Corrigir double fetch de silos em `rebanho/page.tsx`

**O que está errado (PRD §4 — Código Morto)**  
`app/dashboard/rebanho/page.tsx:56` — `getSilosByFazenda` é chamada duas vezes para o mesmo dado dentro do mesmo `useEffect`.

**Arquivos a modificar**  
- `app/dashboard/rebanho/page.tsx`

**O que precisa ser feito**  
1. Localizar o `Promise.all` no `useEffect` de fetch.
2. Garantir que `getSilosByFazenda` aparece apenas uma vez no `Promise.all`.
3. Usar o resultado único para preencher o estado de silos.
4. Remover a segunda chamada duplicada.

**Critério de conclusão**  
- Network tab do DevTools mostra apenas 1 requisição para `silos` ao carregar a página de Rebanho.

---

### M4 — Padronizar nomenclatura de arquivos em `components/`

**O que está errado (PRD §7 — Inconsistências)**  
`header.tsx`, `sidebar.tsx`, `breadcrumbs.tsx` usam camelCase enquanto `SyncStatusBar.tsx` usa PascalCase (convenção correta para componentes React).

**Arquivos a renomear**  
- `components/header.tsx` → `components/Header.tsx`
- `components/sidebar.tsx` → `components/Sidebar.tsx`
- `components/breadcrumbs.tsx` → `components/Breadcrumbs.tsx`

**O que precisa ser feito**  
1. Renomear os 3 arquivos.
2. Atualizar todos os imports nos arquivos que os importam (`dashboard/layout.tsx`, `app/layout.tsx`).
3. Verificar que o Git rastreou o rename (usar `git mv` em vez de deletar/criar).

**Critério de conclusão**  
- Todos os arquivos em `components/` (exceto `ui/`) usam PascalCase.
- `npm run build` passa sem erros de import.

---

### M5 — Criar ícones PWA

**O que está errado (PRD §3 — Médio / §6 Frontend)**  
`public/manifest.json` referencia `/icon-192.png` e `/icon-512.png` que não existem. Instalação PWA falha ou exibe ícone genérico do browser.

**Arquivos a criar**  
- `public/icon-192.png`
- `public/icon-512.png`

**O que precisa ser feito**  
1. Usar o logo existente em `public/logo.png` como base.
2. Redimensionar para 192×192 e 512×512 (ferramenta: `sharp` via script Node, ou Figma/Canva/ferramenta online).
3. Salvar como `public/icon-192.png` e `public/icon-512.png`.
4. Verificar que `public/manifest.json` aponta para os paths corretos.

**Critério de conclusão**  
- DevTools → Application → Manifest não exibe warnings sobre ícones ausentes.
- "Adicionar à tela inicial" no mobile exibe o ícone correto do GestSilo.

---

### M6 — Implementar middleware Next.js para proteção de rotas

**O que está errado (PRD §6 — Next.js)**  
A proteção de rotas é feita via `useEffect` no client, permitindo flash de conteúdo protegido antes do redirect. O padrão correto para App Router é usar `middleware.ts` na raiz.

**Arquivos a criar**  
- `middleware.ts` (raiz do projeto)

**O que precisa ser feito**  
1. Criar `middleware.ts` que:
   - Para rotas `/dashboard/*` e `/operador`: verifica sessão Supabase via `createMiddlewareClient` (ou `@supabase/ssr`). Redireciona para `/login` se não autenticado.
   - Para `/login` e `/register`: redireciona para `/dashboard` se já autenticado.
   - Exporta `config.matcher` cobrindo as rotas protegidas.
2. Usar `@supabase/ssr` (não `@supabase/auth-helpers-nextjs` — deprecated) com `createServerClient`.
3. Manter as verificações nos layouts como segunda camada de defesa (não remover).

**Critério de conclusão**  
- Acessar `/dashboard` sem sessão redireciona para `/login` sem flash de conteúdo.
- Acessar `/login` autenticado redireciona para `/dashboard`.
- `npm run build` passa sem erros no middleware.

---

## 4. Quick Wins (melhorias rápidas e fáceis)

---

### Q1 — Remover `lib/offlineQueue.ts` (arquivo morto)

**Arquivo a deletar:** `lib/offlineQueue.ts`  
**O que fazer:** Confirmar com `grep -r "offlineQueue"` que nenhum arquivo importa este módulo. Deletar o arquivo. Commitar.  
**Critério:** `grep -r "offlineQueue" .` retorna zero resultados.

---

### Q2 — Remover `hooks/use-mobile.ts` (arquivo morto)

**Arquivo a deletar:** `hooks/use-mobile.ts`  
**O que fazer:** Confirmar com `grep -r "use-mobile"` que nenhum arquivo importa este hook. Deletar o arquivo. Commitar.  
**Critério:** `grep -r "useIsMobile\|use-mobile" .` retorna zero resultados.

---

### Q3 — Remover `scripts/convert-hero.mjs` (script one-shot)

**Arquivo a deletar:** `scripts/convert-hero.mjs`  
**O que fazer:** Confirmar que é um script de conversão de imagem sem propósito continuado. Deletar. Commitar.  
**Critério:** Arquivo não existe mais. `npm run build` não é afetado.

---

### Q4 — Remover `console.log`/`console.error` em produção

**Arquivos a modificar:**  
- `lib/db/syncQueue.ts` (1 log + 2 errors)
- `app/dashboard/rebanho/page.tsx` (1 error)

**O que fazer:** Substituir `console.log` e `console.error` de infraestrutura por nada (remover) ou condicional `if (process.env.NODE_ENV === 'development')`. Manter apenas logs de erro real que nunca devem acontecer silenciosamente.  
**Critério:** Console do browser em produção não exibe logs de infraestrutura.

---

### Q5 — Remover dependências sem uso

**O que fazer:**  
1. Rodar `npm uninstall @google/genai` (SDK Gemini sem imports).
2. Rodar `npm uninstall --save-dev firebase-tools` (sem referência no projeto).
3. Rodar `npm uninstall @tailwindcss/typography` (sem classes `prose`).
4. Verificar se `react-day-picker` e `next-themes` têm uso real; se não, remover.
5. Após cada remoção, rodar `npm run build` para confirmar que nada quebrou.

**Critério:** `package.json` não lista `@google/genai`, `firebase-tools`, `@tailwindcss/typography`.

---

### Q6 — Corrigir cast `(profile as any)` em `operador/page.tsx`

**Arquivo:** `app/operador/page.tsx:163`  
**O que fazer:** Adicionar o campo `fazendas: { nome: string }` ao tipo `Profile` em `lib/supabase.ts` (ou onde o tipo é definido). Remover o cast `as any`.  
**Critério:** `operador/page.tsx` compila sem `as any` e sem erros de tipo.

---

### Q7 — Padronizar `catch` em `login/page.tsx` e `register/page.tsx`

**Arquivos:** `app/login/page.tsx`, `app/register/page.tsx`  
**O que fazer:** Substituir `catch (err: any)` por `catch (err: unknown)` com `const message = err instanceof Error ? err.message : 'Erro inesperado'` e exibir via `toast.error(message)`.  
**Critério:** Nenhum `catch (err: any)` nos dois arquivos. Erros de autenticação são exibidos ao usuário com mensagem clara.

---

## 5. Melhorias Futuras (não urgentes)

---

### F1 — Adotar `queries-audit.ts` em todo o projeto

**Contexto:** `lib/supabase/queries-audit.ts` tem uma camada de dados completa com `fazenda_id` garantido. Nenhuma página usa esta camada ainda. A migração deve acontecer página por página para não quebrar nada de uma vez.

**O que fazer (quando o Bloco 1 estiver completo):**  
Página por página (começar pelas menores), substituir imports de `lib/supabase/*.ts` pelos equivalentes de `queries-audit.ts`. Deletar as funções migradas das libs antigas. Ao fim, se `queries-audit.ts` absorveu tudo, consolidar em uma estrutura de módulos.

---

### F2 — Padronizar formulários com RHF + Zod em todos os módulos

**Contexto:** `silos`, `frota`, `talhoes`, `rebanho` usam `useState` com validação manual. `financeiro` e `insumos` usam RHF + Zod corretamente.

**O que fazer:** Para cada módulo ainda com `useState`, converter os formulários para RHF + Zod com schema tipado. Priorizar `silos` (módulo central) e `frota` (mais complexo).

---

### F3 — Configurar `next-themes` para dark mode real

**Contexto:** `next-themes` está instalado mas `ThemeProvider` nunca foi adicionado ao `app/layout.tsx`. O CSS tem variáveis de dark mode declaradas mas inativas.

**O que fazer:** Adicionar `<ThemeProvider attribute="class" defaultTheme="system">` no `app/layout.tsx`. Adicionar toggle de tema no `Header`. Testar que todas as páginas renderizam corretamente em dark mode.

---

### F4 — Adicionar testes unitários para lógica de negócio

**Contexto:** Zero testes de lógica. As calculadoras agronômicas, o simulador e as funções de `lib/supabase/*` são testáveis sem depender do Supabase real.

**O que fazer:** Instalar `vitest` + `@testing-library/react`. Escrever testes para:
- Calculadora de Calagem (ambos os métodos) — entrada conhecida → resultado esperado
- Calculadora NPK — entrada conhecida → resultado esperado
- `listAbaixoMinimo()` após correção do C4
- `handleAddMov` após correção do C1 (mock do Supabase)

---

### F5 — Testes E2E de fluxo completo com Playwright

**Contexto:** Só existe `tests/audit.spec.ts` com acessibilidade. Nenhum teste de fluxo.

**O que fazer:** Adicionar specs Playwright para:
- Login com credenciais válidas → redirect correto por perfil
- CRUD completo de Silos (criar, movimentar, verificar estoque)
- Lançamento financeiro (criar, editar, excluir)
- Sincronização offline (modo Operador)

---

### F6 — Sistema de convites / seleção de role no cadastro

**Contexto:** `register/page.tsx` hardcoda `role: 'Administrador'`. Não há como criar usuários Operadores pelo fluxo normal.

**O que fazer:** Implementar ou seleção de role no cadastro (com validação server-side de quem pode criar Admins), ou sistema de convites onde um Admin gera um link para um Operador se cadastrar.

---

## 6. Ordem de Implementação

### Bloco 1 — Correções Críticas de Dados (sem dependências entre si)

> Pode ser feito em qualquer ordem. Cada item pode ser um PR independente.

1. **[C4]** Corrigir `listAbaixoMinimo()` em `lib/supabase/insumos.ts`
2. **[C5]** Remover `ignoreDuringBuilds` do `next.config.ts` e corrigir erros emergentes
3. **[A5]** Remover `.eslintrc.json` duplicado
4. **[Q1]** Remover `lib/offlineQueue.ts`
5. **[Q2]** Remover `hooks/use-mobile.ts`
6. **[Q3]** Remover `scripts/convert-hero.mjs`
7. **[Q4]** Remover `console.log`/`console.error` de produção
8. **[Q5]** Remover dependências sem uso

---

### Bloco 2 — Bugs Funcionais Críticos (itens independentes)

> Depende do Bloco 1 (build limpo). Cada item pode ser um PR independente.

9. **[C1]** Implementar `handleAddMov` em Silos (movimentação persiste)
10. **[C3]** Dashboard Home: stats reais com `Promise.all` e skeleton
11. **[A2]** Corrigir `lib/supabase.ts` — remover Proxy, tipar como `SupabaseClient`

---

### Bloco 3 — Auth e Isolamento de Dados (Bloco 2 deve estar completo)

> **Bloco 3 depende do Bloco 2.** `useAuth` centraliza o padrão usado nos fixes anteriores.

12. **[A1]** Criar `hooks/useAuth.ts` e substituir bloco duplicado em 8+ pages
13. **[C6]** Adicionar `fazenda_id` explícito em talhões, calculadoras, simulador
14. **[A4]** Corrigir `useState<any>` em `header.tsx` e `catch (err: any)` em múltiplos arquivos
15. **[Q6]** Corrigir cast `(profile as any)` em `operador/page.tsx`
16. **[Q7]** Padronizar `catch` em `login/page.tsx` e `register/page.tsx`

---

### Bloco 4 — Features Ausentes (Bloco 3 deve estar completo)

> Cada item é independente dentro do bloco.

17. **[C2]** Implementar Configurações reais (fetch + persistência)
18. **[A3]** Implementar Relatórios (exportação real PDF/Excel)
19. **[M2]** Corrigir links mortos no Login + criar `/forgot-password`
20. **[M6]** Criar `middleware.ts` para proteção de rotas no servidor

---

### Bloco 5 — Qualidade e UX (independente dos blocos anteriores, mas melhor após Bloco 3)

21. **[M1]** Ativar ou remover Breadcrumbs no dashboard layout
22. **[M3]** Corrigir double fetch de silos em `rebanho/page.tsx`
23. **[M4]** Renomear arquivos em `components/` para PascalCase
24. **[M5]** Criar ícones PWA (`icon-192.png`, `icon-512.png`)

---

### Bloco 6 — Melhorias Futuras (após todos os blocos anteriores)

25. **[F1]** Adotar `queries-audit.ts` em todo o projeto
26. **[F2]** Padronizar formulários com RHF + Zod nos módulos restantes
27. **[F3]** Configurar `next-themes` para dark mode real
28. **[F4]** Adicionar testes unitários (vitest + @testing-library/react)
29. **[F5]** Adicionar testes E2E de fluxo completo (Playwright)
30. **[F6]** Sistema de convites / seleção de role no cadastro

---

## 7. Arquivos que NÃO devem ser alterados

| Arquivo | Motivo |
|---------|--------|
| `.env` / `.env.local` | Contém credenciais do Supabase e chaves de API. Modificar pode quebrar conexão com banco em todos os ambientes. |
| `next.config.ts` | **Exceção:** remover apenas as flags `ignoreDuringBuilds` e `ignoreBuildErrors` (tarefa C5). Não alterar PWA config, `transpilePackages`, ou `output: 'standalone'` sem análise prévia de impacto no deploy Vercel. |
| `supabase/migrations/*.sql` | Migrações SQL são imutáveis após aplicadas. Criar novos arquivos de migração com numeração sequencial. Nunca editar migrações já executadas em produção. |
| `components.json` | Configuração do shadcn/ui. Modificar pode invalidar o CLI `npx shadcn@latest add` para novos componentes. |
| `playwright.config.ts` | Configuração de testes E2E. Alterar `baseURL` ou `webServer` pode quebrar a suite de testes de acessibilidade existente. |
| `tsconfig.json` | Configuração do TypeScript compiler. Modificar `paths`, `strict`, ou `target` pode introduzir incompatibilidades com Next.js e componentes shadcn. |
| `postcss.config.mjs` | Configuração do PostCSS para Tailwind v4. Modificar pode quebrar compilação de CSS. |
| `public/imagem-hero.webp` / `public/imagem-hero.png` | Assets de marketing da landing page. Só alterar se solicitado redesign da página pública. |

---

*Plano gerado com base na análise completa do PRD.md (2026-04-09). 30 tarefas distribuídas em 6 blocos de implementação.*
