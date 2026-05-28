# Relatório de Auditoria — GestSilo
Este documento apresenta uma análise técnica detalhada do projeto **GestSilo**, focando em segurança backend/Supabase, arquitetura Next.js (App Router), overengineering e padronização de código.

---

## AGENTE 1 — SEGURANÇA BACKEND & SUPABASE

Nesta seção, analisamos aspectos relacionados a chaves de API, variáveis de ambiente, vazamento de segredos no cliente, validação de dados em rotas de API/Server Actions e segurança de RLS no Supabase.

📍 Arquivo: [app/api/assessoria/agendamentos/route.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/api/assessoria/agendamentos/route.ts) e [app/api/assessoria/anotacoes/route.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/api/assessoria/anotacoes/route.ts)
🟡 Severidade: MÉDIO
🔎 Problema: **Falta de validação explícita de autenticação no servidor nas APIs customizadas.**
As rotas criam o cliente Supabase a partir dos cookies do usuário, mas executam consultas diretas à tabela (ex: `.from('agendamentos_usuario').select('*').eq('fazenda_id', fazendaId)`) confiando inteiramente nas regras de Row Level Security (RLS) configuradas no banco. Se por algum motivo o RLS for desabilitado temporariamente ou mal configurado, a rota torna-se pública e passa a expor os dados de qualquer fazenda para quem enviar o parâmetro `fazenda_id` na URL.
💡 Sugestão: Aplicar "defesa em profundidade". Validar a sessão explicitamente no início do manipulador HTTP chamando `const { data: { user }, error } = await client.auth.getUser()`, e garantir que o `user` autenticado realmente pertence à fazenda requisitada antes de efetuar qualquer query.

📍 Arquivo: [app/api/assessoria/agendamentos/route.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/api/assessoria/agendamentos/route.ts)
🔴 Severidade: CRÍTICO
🔎 Problema: **Método PATCH quebrado devido a parâmetros dinâmicos em rota estática.**
O método `PATCH` para atualizar agendamentos foi equivocadamente inserido no arquivo de rota estática `/api/assessoria/agendamentos/route.ts`. O método tenta desestruturar a propriedade `id` de `params` (linha 62: `const { id } = await params`). No entanto, em rotas estáticas do Next.js, o argumento `params` não recebe valores de parâmetros dinâmicos. Isso faz com que `id` seja sempre `undefined`, caindo na validação subsequente (linha 64: `if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })`) e tornando a rota de atualização de agendamentos 100% inoperante.
💡 Sugestão: Mover o método `PATCH` para a rota dinâmica correspondente no arquivo [app/api/assessoria/agendamentos/[id]/route.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/api/assessoria/agendamentos/%5Bid%5D/route.ts).

📍 Arquivo: [lib/supabase/silos.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/lib/supabase/silos.ts) e [lib/supabase/pastagens.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/lib/supabase/pastagens.ts)
🟡 Severidade: MÉDIO
🔎 Problema: **Ausência de filtro explícito por `fazenda_id` em consultas de repositório.**
Diferente da filosofia de auditoria estabelecida em `queries-audit.ts` (onde todas as queries filtram obrigatoriamente por `fazenda_id`), as funções nestes arquivos realizam operações diretas no banco usando apenas o `id` da linha (ex: `.from('silos').update(silo).eq('id', id)`). Embora o RLS do Supabase bloqueie acessos indevidos se a sessão estiver ativa, a ausência de uma checagem de propriedade de dados no código contraria as melhores práticas de "defesa em profundidade" em cenários onde políticas RLS possam falhar.
💡 Sugestão: Alterar as funções nos repositórios específicos para receber e filtrar as consultas de forma explícita pelo `fazenda_id` do usuário logado.

📍 Arquivo: [app/api/auth/forgot-password/route.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/api/auth/forgot-password/route.ts), [app/api/auth/invite/route.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/api/auth/invite/route.ts), [app/api/auth/login/route.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/api/auth/login/route.ts), [app/api/auth/register/route.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/api/auth/register/route.ts) e [app/api/assessoria/solicitar-consulta/route.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/api/assessoria/solicitar-consulta/route.ts)
🟡 Severidade: MÉDIO
🔎 Problema: **Ausência de validação estruturada de payload (Zod) em rotas de autenticação e negócio.**
Várias APIs customizadas que recebem dados no corpo da requisição (`request.json()`) efetuam validações rudimentares de preenchimento (ex: `if (!email)`) ou expressões regulares diretas, em vez de passar por validações estruturadas como esquemas Zod. Isso expõe as rotas a problemas causados por payloads maliciosos, strings excessivamente longas (que podem estourar a memória do servidor) ou formatos inesperados.
💡 Sugestão: Definir e aplicar esquemas Zod (`z.object({...})`) e usar `.safeParse()` em todos os payloads recebidos nas rotas `/api/` antes de processar qualquer lógica.

---

## AGENTE 2 — ARQUITETURA NEXT.JS

Análise da arquitetura do projeto utilizando o App Router do Next.js, com foco no balanço entre Server e Client Components, carregamento paralelo de dados, utilização correta do Middleware e gerenciamento de estados.

📍 Arquivo: [app/dashboard/balanco-forrageiro/layout.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/balanco-forrageiro/layout.tsx) e [app/dashboard/calendario/layout.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/calendario/layout.tsx)
🟡 Severidade: MÉDIO
🔎 Problema: **Validação de permissão e redirecionamento de usuário no Client-side (`'use client'`).**
Ambos os layouts são marcados com `'use client'` exclusivamente para verificar o perfil do usuário atual (`Operador`) e redirecioná-lo usando `useEffect` e `useAuth`. Isso é um anti-padrão no App Router: expõe os arquivos de bundle das páginas restritas ao cliente (mesmo que ele seja redirecionado), causa flashes indesejados de carregamento e atrasa a resposta visual devido ao processamento ser feito apenas após a hidratação da página no navegador.
💡 Sugestão: Realizar o bloqueio e redirecionamento diretamente no servidor. Isso pode ser feito adicionando as rotas no mapeador de rotas protegidas por cargo em `middleware.ts`, ou efetuando a validação em um Server Component de layout através da leitura da sessão e usando a função `redirect()` do Next.js.

📍 Arquivo: [app/dashboard/page.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/page.tsx)
🟢 Severidade: BAIXO
🔎 Problema: **Chamada duplicada e desnecessária ao serviço `supabase.auth.getUser()`.**
No componente de página do Dashboard, `supabase.auth.getUser()` é invocado explicitamente na linha 49 para validar o usuário atual. Logo em seguida, na linha 52, é feito um `await getCurrentFazendaId()`. Esta última função também executa seu próprio `supabase.auth.getUser()`. Por não estarem sob o mesmo escopo de cache automático de requisição, isso causa duas chamadas idênticas de validação de autenticação HTTP para o servidor do Supabase na mesma requisição.
💡 Sugestão: Otimizar a função helper `getCurrentFazendaId` para aceitar opcionalmente o objeto de usuário (`User`) já extraído como parâmetro, ou aplicar a função `cache()` do React no método que busca a sessão.

📍 Arquivo: Raiz do [app/dashboard/](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/) e subpastas de módulos (silos, talhões, pastagens, financeiro, frota, insumos, produtos, mão de obra)
🟡 Severidade: MÉDIO
🔎 Problema: **Ausência de arquivos `loading.tsx` para feedback visual instantâneo (Suspense).**
A página raiz do Dashboard executa uma quantidade maciça de consultas assíncronas em paralelo (19 queries via `Promise.all`), o que pode elevar consideravelmente o tempo de processamento inicial no servidor (TTFB). Como não existem arquivos `loading.tsx` na pasta raiz do Dashboard ou na grande maioria das páginas de módulo, o Next.js suspende toda a transição de forma síncrona na tela atual do usuário. Isso causa a sensação de travamento e atraso no clique da navegação. Os únicos caminhos que possuem loadings implementados são as rotas de Rebanho.
💡 Sugestão: Implementar arquivos `loading.tsx` contendo esqueletos visuais (Skeletons) na raiz do `/dashboard` e dentro de cada módulo pesado, para que o Next.js exiba o container de layout e o feedback de carregamento imediatamente enquanto o servidor resolve os dados.

📍 Arquivo: [lib/supabase/queries-audit.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/lib/supabase/queries-audit.ts)
🟢 Severidade: BAIXO
🔎 Problema: **Falta de uso de cache integrado do Next.js para dados de catálogo.**
Consultas de catálogos que raramente sofrem modificações (tais como categorias de insumos, tipos de máquinas ou locais de armazenagem) são executadas diretamente contra o banco de dados a cada ciclo de renderização. O Next.js não consegue aplicar cache HTTP de requisição a estas consultas diretas, gerando chamadas redundantes e desnecessárias ao Supabase.
💡 Sugestão: Envolver as queries que retornam tabelas de catálogo estáticas usando a função `unstable_cache` do Next.js e usar tags de revalidação para invalidar o cache apenas quando houver novos inserts ou alterações nas respectivas tabelas de parametrização.

---

## AGENTE 3 — OVERENGINEERING & PADRONIZAÇÃO

Detecção de complexidades desnecessárias, código duplicado ou órfão, mistura de padrões assíncronos e inconsistências na nomenclatura e na arquitetura do projeto.

📍 Arquivo: [lib/supabase/queries-audit.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/lib/supabase/queries-audit.ts)
🟡 Severidade: MÉDIO
🔎 Problema: **Arquivo monolítico monolítico central de consultas violando o princípio SRP.**
O arquivo `queries-audit.ts` cresceu desordenadamente, acumulando mais de 2.000 linhas de código e centralizando consultas SQL de todos os domínios do sistema (Silos, Lotes, Máquinas, Atividades, Eventos, Financeiro, Insumos, Rebanho, etc.). Essa centralização viola frontalmente o princípio da responsabilidade única (SRP), dificulta severamente a legibilidade/manutenibilidade e torna o arquivo um ímã de conflitos de mesclagem (merge conflicts) em times de desenvolvimento concorrente.
💡 Sugestão: Modularizar a camada de consultas dividindo o arquivo gigante em sub-arquivos organizados por domínio de dados (ex: `silos-queries.ts`, `financeiro-queries.ts`), importando-os ou expondo-os de forma unificada se necessário.

📍 Arquivo: [lib/supabase/queries-audit.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/lib/supabase/queries-audit.ts)
🟡 Severidade: MÉDIO
🔎 Problema: **Vazamento potencial de memória por cache global no servidor.**
A função `getFazendaId()` implementa um cache simples utilizando um objeto `Map` estático global (`fazendaIdCache`) declarado no escopo externo do módulo Node. Como as instâncias de servidor do Next.js persistem em memória ao longo de múltiplas requisições, esse `Map` continuará acumulando chaves de usuários indefinidamente sem qualquer método de limpeza passiva (Garbage Collection) das chaves antigas ou expiração de tamanho máximo (LRU Cache), causando um vazamento de memória silencioso.
💡 Sugestão: Substituir o `Map` global manual pela função `cache()` nativa do React (que memoiza as chamadas de forma segura apenas durante o ciclo de vida de uma única requisição HTTP e é limpa automaticamente ao final dela).

📍 Arquivo: [app/dashboard/alertas-helpers.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/alertas-helpers.ts) (linha 14), [lib/supabase/pastagens.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/lib/supabase/pastagens.ts) (linha 36), [lib/utils.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/lib/utils.ts) (linha 14) e [app/dashboard/page.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/page.tsx) (linha 42)
🟢 Severidade: BAIXO
🔎 Problema: **Código e funções utilitárias duplicadas em diferentes arquivos.**
Existem funções utilitárias idênticas declaradas de forma redundante em múltiplos pontos do sistema:
- A função `daysBetween` está declarada em duplicidade em `app/dashboard/alertas-helpers.ts` e `lib/supabase/pastagens.ts`.
- A função de formatação financeira `formatBRL` está declarada em duplicidade em `lib/utils.ts` e diretamente no escopo de `app/dashboard/page.tsx`.
💡 Sugestão: Remover as declarações duplicadas e centralizar todas as funções utilitárias e de formatação no arquivo global de utilitários `lib/utils.ts`.

📍 Arquivo: [lib/auth/helpers.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/lib/auth/helpers.ts) e [lib/supabase/pastagens.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/lib/supabase/pastagens.ts)
🟢 Severidade: BAIXO
🔎 Problema: **Extrema inconsistência na nomenclatura de funções (misto de inglês e português).**
O código apresenta uma alternância confusa entre inglês e português nas assinaturas de funções. No mesmo arquivo [lib/auth/helpers.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/lib/auth/helpers.ts) encontram-se `sou_admin()` e `sou_operador()` (Português) misturados com `getCurrentUserId()` e `getCurrentFazendaId()` (Inglês). O repositório de pastagens possui anomalias de nomenclatura como `listPastagensParaAlertas()` (Inglês + Português + Português) e `getPiqueteById()` (Inglês + Português + Inglês).
💡 Sugestão: Estabelecer um padrão unificado (recomenda-se o uso do Inglês em todo o código e nomenclatura de métodos de API/Repositório) e refatorar gradativamente para manter a consistência estética do projeto.

📍 Arquivo: [app/dashboard/rebanho/novo/page.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/rebanho/novo/page.tsx) (linha 42), [app/dashboard/rebanho/[id]/evento/page.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/rebanho/%5Bid%5D/evento/page.tsx) (linha 136) e [app/dashboard/frota/hooks/useFrotaData.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/frota/hooks/useFrotaData.ts) (linhas 183-204)
🟢 Severidade: BAIXO
🔎 Problema: **Mistura de fluxo assíncrono moderno `async/await` com cadeias de promessa `.then()`.**
Inconsistência no tratamento de promessas assíncronas. Enquanto o projeto adota o padrão moderno de `async/await` na maior parte do código, vários arquivos de componentes e hooks ainda recorrem ao encadeamento `.then()` e `.catch()` para processar dados assíncronos (ex: `listLotes(100, 0).then(...)` e `q.usoMaquinas.listByMaquinas(ids).then(...)`), reduzindo a legibilidade e a padronização do código.
💡 Sugestão: Refatorar as chamadas baseadas em `.then()` para usar a sintaxe unificada de `async/await` em conjunto com blocos `try/catch` convencionais.

📍 Arquivo: [app/dashboard/insumos/actions.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/insumos/actions.ts) (linha 3)
🟢 Severidade: BAIXO
🔎 Problema: **Importação de dependência não utilizada (código morto).**
O arquivo importa o objeto cliente `q` na linha 3 (`import { q, qServer } from ...`), porém o código do arquivo faz uso estrito do `qServer` para executar suas ações. Isso deixa o import `q` como código órfão/morto.
💡 Sugestão: Limpar o arquivo removendo a importação desnecessária do objeto `q`.

---

## AGENTE 4 — CONSISTÊNCIA DE FEATURES

Análise da padronização estrutural, de formulários, feedback ao usuário, estados vazios e estados de carregamento entre todas as features do dashboard.

---

### 4.1 — Estrutura de Pastas por Feature

📍 Arquivo: `app/dashboard/silos/`, `app/dashboard/talhoes/`, `app/dashboard/frota/`, `app/dashboard/insumos/`, `app/dashboard/rebanho/`, `app/dashboard/financeiro/`, `app/dashboard/configuracoes/`, `app/dashboard/calculadoras/`
🔴 Severidade: CRÍTICO
🔎 Problema: **8 features sem `layout.tsx` com guard de perfil.**
As features mais recentes (produtos, pastagens, mão de obra, planejamento-compras, assessoria) têm `layout.tsx` que detecta o perfil `Operador` e redireciona adequadamente. As features mais antigas (silos, talhões, frota, insumos, rebanho, financeiro, configurações, calculadoras) não possuem esse arquivo, dependendo exclusivamente do RLS do banco para restringir acesso — sem bloqueio de rota nem feedback de UI. Um Operador que navegue diretamente para `/dashboard/silos` verá a página renderizada até o momento em que o banco rejeitar a query.
💡 Sugestão: Criar `layout.tsx` com guard baseado em `useAuth()` (client-side) ou validação de perfil no RSC para todas as features que devem bloquear o perfil `Operador`. O padrão estabelecido nas features novas deve ser replicado nas antigas.

📍 Arquivo: `app/dashboard/frota/`, `app/dashboard/financeiro/`, `app/dashboard/calendario/`, `app/dashboard/balanco-forrageiro/`, `app/dashboard/configuracoes/`, `app/dashboard/calculadoras/`
🟡 Severidade: MÉDIO
🔎 Problema: **6 features sem `actions.ts` (Server Actions).**
O padrão do projeto é que cada feature com operações de escrita exponha suas Server Actions em `app/dashboard/[feature]/actions.ts`. Frota, financeiro, configurações e calculadoras não possuem esse arquivo — o que indica que as mutações estão em outros lugares ou inline nos componentes, dificultando manutenção. Calendário e balanço forrageiro são read-only por natureza, mas mesmo assim fogem do padrão documentado.
💡 Sugestão: Consolidar qualquer lógica de mutação dispersa em `actions.ts` na pasta da feature correspondente, mantendo uniformidade arquitetural.

---

### 4.2 — Padrão de Formulários

📍 Arquivo: `app/dashboard/silos/components/SiloForm.tsx`, `app/dashboard/talhoes/components/TalhaoForm.tsx`, `app/dashboard/insumos/components/InsumoForm.tsx`, `app/dashboard/frota/components/MaquinaDialog.tsx` vs. `app/dashboard/pastagens/components/PastagemForm.tsx`, `app/dashboard/mao-de-obra/components/ColaboradorForm.tsx`, `app/dashboard/assessoria/components/AgendamentoForm.tsx`
🟡 Severidade: MÉDIO
🔎 Problema: **Dois padrões distintos de formulários coexistem no projeto sem critério de escolha.**
Features antigas usam o **Padrão A**: `register()` + `Controller` do React Hook Form com `<Label>` e `<p className="text-sm text-destructive">` inline para erros. Features novas adotaram o **Padrão B**: wrapper `<Form>` + `<FormField>` + `<FormMessage />` do shadcn/ui, mais declarativo e consistente com o design system. Não há indicação de qual padrão deve ser usado em novas features.
💡 Sugestão: Documentar o Padrão B (shadcn/ui `<Form>`) como padrão oficial e migrar progressivamente as features antigas para ele.

📍 Arquivo: `app/dashboard/insumos/components/InsumoForm.tsx`, `app/dashboard/silos/components/SiloForm.tsx`, `app/dashboard/produtos/components/ProdutoForm.tsx`
🟢 Severidade: BAIXO
🔎 Problema: **Tamanho de texto de mensagens de erro de formulário inconsistente.**
InsumoForm e ProdutoForm usam `text-xs text-destructive mt-1` para mensagens de erro. SiloForm e TalhaoForm usam `text-sm text-destructive`. Features com o Padrão B delegam para `<FormMessage />` (que usa `text-sm`). Resultado: mensagens de erro aparecem em tamanhos diferentes dependendo da feature.
💡 Sugestão: Padronizar para `text-sm` (conforme `<FormMessage />` do shadcn/ui) em todos os formulários ainda no Padrão A.

📍 Arquivo: `app/dashboard/silos/components/RegistrarMovimentacaoDialog.tsx`
🔴 Severidade: CRÍTICO
🔎 Problema: **Formulário de movimentação de silo não usa React Hook Form nem validação Zod.**
Enquanto todos os demais formulários do projeto usam `react-hook-form` + Zod (o padrão estabelecido no CLAUDE.md), o dialog de registro de movimentações de silo gerencia estado com múltiplos `useState` e faz validação manual com `if (!campo) return`. Isso viola o padrão definido explicitamente no CLAUDE.md ("Sempre validar com Zod antes de persistir") e elimina a segurança de tipos na validação de formulário.
💡 Sugestão: Refatorar para usar `react-hook-form` + schema Zod correspondente, igual ao restante do projeto.

---

### 4.3 — Padrão de Listagens e Tabelas

📍 Arquivo: `app/dashboard/insumos/components/InsumosList.tsx`, `app/dashboard/produtos/components/ProdutosList.tsx`
🟡 Severidade: MÉDIO
🔎 Problema: **Estado de loading nas listagens implementado com `animate-pulse` genérico em vez de `<Skeleton>`.**
As listagens de Insumos e Produtos exibem `<div className="h-10 bg-muted rounded animate-pulse">` repetido N vezes para simular carregamento. As features mais novas (Rebanho, Planejamento de Silagem) usam o componente `<Skeleton>` do shadcn/ui com estrutura que reflete o conteúdo real — o que cria melhor consistência visual entre loading e estado carregado.
💡 Sugestão: Substituir os divs com `animate-pulse` pelos componentes `<Skeleton>` do shadcn/ui, criando skeletons estruturados que correspondam ao layout real da tabela.

📍 Arquivo: Múltiplos módulos (`silos/`, `talhoes/`, `insumos/`, `produtos/`, `pastagens/`, `mao-de-obra/`, `rebanho/`)
🟡 Severidade: MÉDIO
🔎 Problema: **Estado vazio ("sem registros") implementado de forma diferente em cada feature, sem componente unificado.**
Cada feature implementa seu próprio empty state com layout, ícone e mensagem distintos:
- Silos: `Card` com `Database` icon e borda tracejada (`col-span-full`)
- Insumos/Produtos: `<div className="text-center py-8 text-muted-foreground">`
- Mão de Obra: `<div>` estilizado com ícone `Users` e fundo levemente distinto
- Pastagens: `<h3>` com `text-muted-foreground`
Além disso, o texto guia varia: algumas features incluem "Clique em 'Novo X' para começar." outras apenas exibem "Nenhum X cadastrado." sem call-to-action.
💡 Sugestão: Criar um componente reutilizável `EmptyState` (icon, título, descrição, ação opcional) e adotá-lo em todas as listagens para garantir experiência consistente.

---

### 4.4 — Padrão de Feedback ao Usuário (Toasts)

📍 Arquivo: `app/dashboard/calendario/layout.tsx` vs. `app/dashboard/produtos/layout.tsx`, `app/dashboard/pastagens/layout.tsx`
🟡 Severidade: MÉDIO
🔎 Problema: **Guard de perfil no layout do Calendário redireciona sem exibir toast de feedback.**
O padrão estabelecido nas features novas (produtos, pastagens, mão de obra) é: ao detectar perfil `Operador`, exibir `toast.error('Acesso negado...')` e então redirecionar. O layout do Calendário apenas redireciona silenciosamente, sem nenhum feedback visual ao usuário. Isso gera uma experiência de UX inconsistente — o usuário simplesmente "some" da página sem entender o motivo.
💡 Sugestão: Adicionar `toast.error('Você não tem permissão para acessar esta área.')` antes do `router.push()` no layout do Calendário, igualando o comportamento das demais features.

📍 Arquivo: Múltiplas Server Actions em `app/dashboard/*/actions.ts`
🟢 Severidade: BAIXO
🔎 Problema: **Ausência de `toast.loading()` / `toast.promise()` durante operações assíncronas longas.**
Nenhuma feature utiliza `toast.loading()` ou `toast.promise()` do Sonner para indicar que uma operação está em progresso. O feedback de "pendente" é feito exclusivamente pelo estado `isSubmitting` do React Hook Form (que desabilita o botão e mostra ícone `Loader2`). Para operações mais longas (ex: geração de relatório XLSX, importação CSV), o usuário não recebe feedback claro de que algo está acontecendo além do botão desabilitado.
💡 Sugestão: Adotar `toast.promise()` do Sonner para operações notavelmente longas (relatórios, imports), mantendo `isSubmitting` + `Loader2` para operações rápidas de CRUD.

📍 Arquivo: Múltiplos componentes de formulário em `app/dashboard/`
🟢 Severidade: BAIXO
🔎 Problema: **Dois padrões de disparo de toast após Server Action.**
Padrão 1 (features antigas): `await action(data); toast.success('Sucesso!')` — dispara toast sem verificar retorno da action. Padrão 2 (features novas): `const result = await action(data); if (result.success) { toast.success(...) } else { toast.error(result.error) }` — verifica o retorno tipado da action. O Padrão 1 dispara `toast.success` mesmo quando a action pode ter falhado silenciosamente (sem retorno de erro explícito).
💡 Sugestão: Padronizar todas as Server Actions para retornar `{ success: boolean; error?: string }` e todos os chamadores para verificar `result.success` antes de exibir toast.

---

### 4.5 — Resumo Executivo — Agente 4

| Categoria | Achados Críticos | Médios | Baixos |
|---|---|---|---|
| Estrutura de pastas | 1 | 1 | — |
| Padrão de formulários | 1 | 1 | 1 |
| Listagens/Tabelas | — | 2 | — |
| Feedback ao usuário | — | 1 | 2 |
| **Total** | **2** | **5** | **3** |

**Principais ações recomendadas (por prioridade):**
1. Criar `layout.tsx` com guard de perfil para as 8 features sem proteção de rota
2. Refatorar `RegistrarMovimentacaoDialog` para usar React Hook Form + Zod
3. Documentar e unificar o padrão de formulário (Padrão B — shadcn/ui `<Form>`)
4. Criar componente `EmptyState` reutilizável
5. Padronizar retorno de Server Actions para `{ success, error }` em toda a codebase

---
## AGENTE 5 — DESIGN SYSTEM & UX

Análise de inconsistências visuais, acessibilidade, responsividade e uso do sistema de design no GestSilo-Pro.

---

### 5.1 — Sistema de Design & Componentes

📍 Arquivo: [components/ui/gradient-button.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/ui/gradient-button.tsx)
🟡 Severidade: MÉDIO
🔎 Problema: **Componente `GradientButton` duplica o `Button` do shadcn/ui em vez de ser uma variante.**
O projeto já possui `components/ui/button.tsx` com sistema de variantes via CVA (class-variance-authority). O `GradientButton` é implementado como componente separado e independente, sem herdar as variantes, o `asChild` prop ou outros recursos já presentes no `Button`. Isso cria dois pontos de manutenção para comportamento de botão e viola o DRY.
💡 Sugestão: Converter `GradientButton` em uma variante do `Button` existente (ex: `variant="gradient"`) usando CVA, eliminando o arquivo separado.

📍 Arquivo: [components/relatorios/PeriodoFilter.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/relatorios/PeriodoFilter.tsx) e [components/ui/](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/ui/)
🟢 Severidade: BAIXO
🔎 Problema: **Componente de negócio (`PeriodoFilter`) colocado incorretamente em `components/ui/`.**
`components/ui/` é reservado para componentes primitivos de UI sem lógica de negócio (padrão shadcn/ui). `PeriodoFilter` contém lógica de domínio (período de relatório) e deveria residir em `components/relatorios/` ou similar.
💡 Sugestão: Mover para `components/relatorios/PeriodoFilter.tsx`, que é a localização semanticamente correta para esse componente.

---

### 5.2 — Cores e Tokens de Design

📍 Arquivo: [components/Header.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/Header.tsx), [components/Sidebar.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/Sidebar.tsx), [components/ui/button.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/ui/button.tsx), [components/ui/input.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/ui/input.tsx), [components/ui/select.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/ui/select.tsx), [components/Breadcrumbs.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/Breadcrumbs.tsx)
🔴 Severidade: CRÍTICO
🔎 Problema: **40+ ocorrências de cores hardcoded em componentes core, ignorando as CSS custom properties definidas em `globals.css`.**
O `globals.css` define mais de 70 CSS custom properties de design (`--color-background`, `--color-foreground`, `--color-status-success`, `--color-green-dim`, etc.) — uma excelente base de design tokens. Porém, os componentes mais críticos do sistema ignoram completamente essas variáveis e usam valores hexadecimais e rgba() literais diretamente no JSX:

- `Header.tsx`: `text-[#dceede]`, `text-[#00c45a]`, `text-[#e05454]`, `hover:bg-[rgba(255,255,255,0.05)]`
- `Sidebar.tsx`: `text-[#00c45a]`, `text-[#688070]`, `hover:text-[#dceede]`, `hover:bg-[rgba(255,255,255,0.04)]`, `bg-[rgba(245,208,0,0.09)]`
- `button.tsx`: `text-[#dceede]`, `text-[#688070]`, `hover:bg-[rgba(255,255,255,0.07)]`
- `input.tsx`: `text-[#dceede]`, `placeholder:text-[#688070]`, `focus:border-[rgba(0,196,90,0.5)]`
- `select.tsx`: `text-[#dceede]`, `data-placeholder:text-[#688070]`, `focus:border-[rgba(0,196,90,0.5)]`
- `Breadcrumbs.tsx`: `text-[#688070]`, `text-[#dceede]`, `text-[#2a4433]`

Isso inviabiliza qualquer futura mudança de tema (ex: light mode) pois cada valor de cor precisaria ser caçado manualmente por todo o codebase em vez de alterar um único token.
💡 Sugestão: Substituir todos os valores hardcoded pelas CSS custom properties já definidas (ex: `text-[#dceede]` → `text-foreground` ou `var(--color-foreground)`, `text-[#00c45a]` → `text-primary` ou `var(--color-primary)`, `text-[#688070]` → `text-muted-foreground`). Registrar as variáveis como utilitários Tailwind em `globals.css` se necessário.

📍 Arquivo: [components/rebanho/AnimalCard.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/rebanho/AnimalCard.tsx)
🟡 Severidade: MÉDIO
🔎 Problema: **Cores de status do rebanho usam classes Tailwind brutas (`bg-green-100 text-green-800`) em vez de tokens semânticos do projeto.**
O `AnimalCard` aplica diretamente `bg-green-100 text-green-800`, `bg-red-100 text-red-800`, `text-blue-600`, `hover:border-blue-300` — cores da paleta padrão do Tailwind que não correspondem ao tema visual escuro do GestSilo (que usa `#00c45a`, `#e05454`, etc.). Em dark mode essas cores não se adaptam corretamente.
💡 Sugestão: Substituir por tokens semânticos do projeto: `bg-status-success/10 text-status-success`, `bg-status-danger/10 text-status-danger`, etc., alinhando com a paleta definida em `globals.css`.

---

### 5.3 — Dark Mode

📍 Arquivo: [components/rebanho/AnimalCard.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/rebanho/AnimalCard.tsx), [components/planejamento-compras/PlanejamentosList.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/planejamento-compras/PlanejamentosList.tsx) e outros componentes de negócio
🟡 Severidade: MÉDIO
🔎 Problema: **Componentes de negócio usam cores Tailwind semânticas (`bg-green-100`) que não se adaptam ao dark mode do projeto.**
O projeto opera em dark mode por padrão (definido em `:root` no `globals.css`). Componentes que aplicam classes como `bg-green-100 text-green-800` ou `bg-red-100 text-red-800` exibem fundos claros sobre um layout escuro, criando contraste visual quebrado. Apenas alguns poucos arquivos usam o prefixo `dark:` (Header, badge, button, ImportadorCSV), enquanto a maioria dos componentes de negócio não tem nenhuma adaptação.
💡 Sugestão: Substituir cores hardcoded pela abordagem de tokens semânticos (`var(--color-status-*)`) que já funcionam independente do modo de tema, eliminando a necessidade de classes `dark:` adicionais.

---

### 5.4 — Responsividade

📍 Arquivo: [components/rebanho/AnimalCard.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/rebanho/AnimalCard.tsx)
🟢 Severidade: BAIXO
🔎 Problema: **Grid interno do card de animal com `grid-cols-2` fixo sem breakpoint responsivo.**
O grid de informações do animal usa `grid grid-cols-2 gap-3 text-sm` (sempre 2 colunas), sem breakpoint para telas muito pequenas (< 400px). Em viewports estreitos, as colunas podem ficar comprimidas demais, especialmente para valores numéricos com unidades (ex: "345 kg").
💡 Sugestão: Adicionar `grid-cols-1 sm:grid-cols-2` para garantir que em telas muito pequenas as informações empilhem verticalmente.

📍 Arquivo: Componentes de tabela em `components/rebanho/reproducao/ReprodutorListagem.tsx` e similares
🟢 Severidade: BAIXO
🔎 Problema: **Tabelas de listagem não ocultam colunas secundárias em mobile.**
O `table.tsx` do shadcn/ui provê `overflow-x-auto` que adiciona scroll horizontal, o que é funcionalmente correto mas produz UX ruim em mobile (scroll interno dentro da página). Padrão melhor seria ocultar colunas menos importantes em telas pequenas com `hidden sm:table-cell`.
💡 Sugestão: Identificar as colunas de menor prioridade em cada tabela e aplicar `hidden sm:table-cell` (ou `hidden md:table-cell`) para que mobile exiba apenas as colunas essenciais sem scroll horizontal.

---

### 5.5 — Acessibilidade

📍 Arquivo: [components/ui/calendar.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/ui/calendar.tsx)
🟢 Severidade: BAIXO
🔎 Problema: **Botões de navegação do calendário (mês anterior/próximo) sem `aria-label` explícito.**
Os botões de navegação do componente `Calendar` usam apenas ícones (`ChevronLeft`, `ChevronRight`) sem texto visível e sem `aria-label` explícito definido no componente customizado. Embora o `react-day-picker` adicione labels padrão em inglês internamente, a aplicação é em português e os labels nativos da biblioteca podem aparecer em inglês para leitores de tela.
💡 Sugestão: Adicionar `aria-label="Mês anterior"` e `aria-label="Próximo mês"` explicitamente nos botões `previousMonth` e `nextMonth` do `components/ui/calendar.tsx`.

📍 Arquivo: Componentes com ícones decorativos em `components/widgets/`, `components/rebanho/`
🟢 Severidade: BAIXO
🔎 Problema: **Ícones Lucide React decorativos (não interativos) sem `aria-hidden="true"`.**
Ícones usados puramente como decoração visual (ex: `<ArrowRight>` em links de card, ícones de tendência em KPI cards) não possuem `aria-hidden="true"`. Leitores de tela tentarão descrever esses ícones SVG com seus nomes automáticos, gerando ruído semântico desnecessário na navegação por acessibilidade.
💡 Sugestão: Adicionar `aria-hidden="true"` a todos os ícones Lucide que são puramente decorativos (não transmitem informação única e não são interativos). Ícones em botões sem texto já são cobertos pelo `aria-label` do botão.

📍 Arquivo: [components/Header.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/Header.tsx), [components/Sidebar.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/components/Sidebar.tsx)
🟢 Severidade: BAIXO
🔎 Problema: **Implementação parcial e inconsistente de `aria-` attributes entre os componentes de navegação.**
`Header.tsx` tem boa cobertura (`role="toolbar"`, `aria-label`, `aria-current`, `aria-hidden` em ícones). `Sidebar.tsx` usa `aria-current={isActive ? 'page' : undefined}` corretamente nos links, mas os grupos de navegação (seções "Principal", "Gerencial", "Ferramentas") não têm `role="navigation"` nem `aria-label` de região, dificultando a navegação por landmarks para usuários de leitores de tela.
💡 Sugestão: Envolver cada grupo de rotas do Sidebar com `<nav aria-label="Navegação principal">`, `<nav aria-label="Módulos gerenciais">` etc., criando landmarks de navegação semanticamente distintos.

---

### 5.6 — Resumo Executivo — Agente 5

| Categoria | Críticos | Médios | Baixos |
|---|---|---|---|
| Cores hardcoded / tokens não usados | 1 | 1 | — |
| Dark mode inconsistente | — | 1 | — |
| Componentes duplicados/mal posicionados | — | 1 | 1 |
| Responsividade | — | — | 2 |
| Acessibilidade | — | — | 3 |
| **Total** | **1** | **3** | **6** |

**Principais ações recomendadas (por prioridade):**
1. Substituir todas as cores hardcoded (`#hex`, `rgba()`) nos componentes core por CSS custom properties já definidas em `globals.css`
2. Corrigir cores de status em `AnimalCard` e demais componentes de negócio para tokens semânticos do projeto
3. Converter `GradientButton` em variante do `Button` shadcn/ui
4. Adicionar `aria-label` nos botões de navegação do `Calendar` (português)
5. Adicionar landmarks `<nav aria-label>` nos grupos de rotas do `Sidebar`
-----
## AGENTE 6 — PERFORMANCE

Análise de gargalos de performance: bundle JavaScript, re-renders desnecessários, queries ao banco e otimização de assets.

---

### 6.1 — Bundle / JavaScript

📍 Arquivo: [lib/supabase/queries-audit.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/lib/supabase/queries-audit.ts), [lib/supabase/assessoria.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/lib/supabase/assessoria.ts), [app/dashboard/relatorios/actions.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/relatorios/actions.ts)
🟡 Severidade: MÉDIO
🔎 Problema: **`select('*')` em 25+ queries — transferência de dados desnecessária.**
Múltiplos arquivos utilizam `select('*')` ao invés de listar colunas explícitas, transferindo dados não utilizados em cada requisição. Principais ocorrências em `queries-audit.ts` (15+ instâncias: `movimentacoes_insumo`, `categorias_insumo`, `tipos_insumo`, `insumos`, `atividades_campo`, `eventos_dap`, `planejamentos_silagem`), em `assessoria.ts` (6 instâncias: `anotacoes_assessoria`, `horarios_disponiveis_consultor`, `agendamentos_usuario`, `historico_atendimentos`) e em `relatorios/actions.ts` (1 instância na busca de planejamento por ID).
💡 Sugestão: Substituir todos os `select('*')` por listas explícitas de colunas. O padrão já está estabelecido no projeto (várias queries já especificam colunas) e deve ser aplicado consistentemente em todo o codebase. Nota: este problema também foi identificado pelo Agente 1 sob a perspectiva de segurança — aqui reforça-se o impacto de performance.

📍 Arquivo: Todos os componentes de gráficos em `app/dashboard/*/` (~20 arquivos com Recharts)
🟡 Severidade: MÉDIO
🔎 Problema: **Recharts (~200 KB) carregado de forma síncrona em todas as páginas do dashboard.**
Nenhum componente de gráfico utiliza `next/dynamic` com lazy loading. O bundle completo do Recharts é incluído no JavaScript inicial de qualquer página do dashboard que importe qualquer gráfico — mesmo que o gráfico esteja dentro de uma aba não visível. Exemplos: `GraficoDistribuicaoEtaria.tsx`, `GraficoParticipacao.tsx`, `FrotaOverview.tsx`, `FinanceiroClient.tsx` e outros 15+ componentes.
💡 Sugestão: Aplicar `next/dynamic` com `{ loading: () => <Skeleton /> }` nos componentes de gráfico, especialmente os renderizados dentro de abas ou modais não visíveis imediatamente:
```tsx
const GraficoDistribuicaoEtaria = dynamic(
  () => import('./GraficoDistribuicaoEtaria'),
  { loading: () => <Skeleton className="h-64 w-full" /> }
);
```

📍 Arquivo: [public/fonts/Satoshi-Variable.ttf](file:///c:/Projetos/GestSilo/GestSIlo-Pro/public/fonts/Satoshi-Variable.ttf), [public/fonts/Satoshi-VariableItalic.ttf](file:///c:/Projetos/GestSilo/GestSIlo-Pro/public/fonts/Satoshi-VariableItalic.ttf)
🟢 Severidade: BAIXO
🔎 Problema: **Fontes em formato TTF em vez de WOFF2 — ~30% de tamanho extra desnecessário.**
O projeto utiliza fontes variáveis da família Satoshi no formato `.ttf`. O formato WOFF2 oferece compressão superior (Brotli), resultando em arquivos ~30% menores com suporte em todos os browsers modernos. A fonte já está configurada corretamente com `display: 'swap'` via `next/font/local`; a única otimização pendente é o formato do arquivo.
💡 Sugestão: Converter as fontes para WOFF2 e atualizar a declaração no `app/layout.tsx`:
```tsx
const satoshi = localFont({
  src: [
    { path: '../public/fonts/Satoshi-Variable.woff2', style: 'normal' },
    { path: '../public/fonts/Satoshi-VariableItalic.woff2', style: 'italic' },
  ],
  variable: '--font-satoshi',
  display: 'swap',
});
```

---

### 6.2 — Re-renders Desnecessários

📍 Arquivo: [app/dashboard/rebanho/indicadores/components/charts/GraficoDistribuicaoEtaria.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/rebanho/indicadores/components/charts/GraficoDistribuicaoEtaria.tsx), [app/dashboard/financeiro/FinanceiroClient.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/financeiro/FinanceiroClient.tsx), [app/dashboard/planejamento-silagem/components/GraficoParticipacao.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/planejamento-silagem/components/GraficoParticipacao.tsx), [app/dashboard/frota/components/FrotaOverview.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/frota/components/FrotaOverview.tsx)
🟡 Severidade: MÉDIO
🔎 Problema: **Objetos de estilo de tooltip criados inline a cada render dos gráficos Recharts.**
A propriedade `contentStyle` do `<Tooltip>` do Recharts recebe objetos literais criados inline (ex: `contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '...' }}`). Como JavaScript compara objetos por referência, a cada re-render do componente pai um novo objeto é criado, forçando o Recharts a re-renderizar o tooltip mesmo que o conteúdo não tenha mudado. O padrão correto já existe em `GraficoComposicao.tsx` (onde `TOOLTIP_STYLE` é declarado como constante fora do componente), mas não foi replicado nos demais arquivos.
💡 Sugestão: Extrair todos os objetos `contentStyle` como constantes de módulo (fora da função do componente), seguindo o padrão de `GraficoComposicao.tsx`:
```tsx
const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
} as const;
// ...
<Tooltip contentStyle={TOOLTIP_STYLE} />
```

📍 Arquivo: [app/dashboard/insumos/components/InsumosFilters.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/insumos/components/InsumosFilters.tsx)
🟡 Severidade: MÉDIO
🔎 Problema: **`Map` e array derivado recriados a cada render sem `useMemo`.**
O componente `InsumosFilters` cria um `new Map<string, {...}>()` e um array `tiposDisponiveis` dentro do corpo da função (linhas 34–47), sem memoização. Como esses valores são derivados da prop `insumos` (que pode ser uma lista grande), toda re-renderização do componente — incluindo as causadas por digitação no campo de busca — recalcula toda a estrutura de dados desnecessariamente.
💡 Sugestão: Envolver o bloco de derivação em `useMemo` com `insumos` como dependência:
```tsx
const tiposDisponiveis = useMemo(() => {
  const tiposMap = new Map<string, { id: string; nome: string }>();
  insumos.forEach(insumo => {
    if (insumo.tipo && !tiposMap.has(insumo.tipo.id)) {
      tiposMap.set(insumo.tipo.id, insumo.tipo);
    }
  });
  return Array.from(tiposMap.values());
}, [insumos]);
```

📍 Arquivo: [app/dashboard/DashboardClient.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/DashboardClient.tsx)
🟢 Severidade: BAIXO
🔎 Problema: **Objetos de estilo inline com `rgba` recriados a cada render no componente raiz do Dashboard.**
Linhas 32, 69 e 253 passam objetos de estilo literais (ex: `style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}`) diretamente no JSX. Por ser o componente raiz do dashboard, qualquer atualização de estado reconstrói esses objetos, podendo propagar re-renders a componentes filhos que recebem essas referências como props.
💡 Sugestão: Converter para classes Tailwind, respeitando o design system do projeto (que já define variáveis CSS como `var(--border)` em `globals.css`):
```tsx
// ❌ Atual
style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}

// ✅ Melhor
className="bg-white/[0.07] border border-white/10"
```

---

### 6.3 — Queries ao Banco

📍 Arquivo: [app/dashboard/page.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/page.tsx)
🟢 Severidade: BAIXO
🔎 Problema: **19 queries paralelas no `Promise.all` do Dashboard — TTFB elevado sem separação de prioridade.**
A página principal do Dashboard executa 19 queries simultâneas via `Promise.all`. O padrão é correto (evita waterfalls), mas o TTFB da página é determinado pela query mais lenta do conjunto. Não há separação entre dados críticos (necessários para o primeiro render visível) e dados secundários (KPIs e alertas de módulos específicos que poderiam chegar depois).
💡 Sugestão: Dividir o `Promise.all` em dois grupos e usar Suspense boundaries com `loading.tsx`: dados críticos (perfil, fazenda) renderizam o shell imediatamente; dados secundários (alertas, KPIs) carregam em paralelo enquanto o layout já é visível ao usuário.

📍 Arquivo: [lib/supabase/queries-audit.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/lib/supabase/queries-audit.ts)
🟢 Severidade: BAIXO
🔎 Problema: **Cache global `fazendaIdCache` com `Map` sem TTL nem limite de tamanho — risco de memory leak em produção.**
O `Map` estático `fazendaIdCache` acumula entradas indefinidamente ao longo do ciclo de vida do processo Node (que pode durar horas no Vercel). Não há limite de tamanho, TTL por entrada, nem mecanismo de evicção LRU. Em instâncias com muito tráfego, o Map cresce causando pressão no GC e degradação gradual de performance. Este problema também foi identificado pelo Agente 3 sob a perspectiva de memory leak.
💡 Sugestão: Substituir pelo `cache()` do React (memoização por request, limpeza automática ao final de cada request):
```tsx
import { cache } from 'react';

export const getFazendaId = cache(async (userId: string) => {
  // query ao banco — executada no máximo uma vez por request
});
```

---

### 6.4 — Assets

📍 Arquivo: Codebase geral (arquivos `.tsx`)
🟢 Severidade: BAIXO
🔎 Problema: **Nenhuma tag `<img>` HTML nativa encontrada — padrão correto.**
O projeto não utiliza `<img>` diretamente em componentes React. Quando imagens são usadas, o componente `next/image` é empregado corretamente, aproveitando lazy loading e otimização automática de formato.
💡 Sugestão: Nenhuma ação necessária. Manter o padrão em novas features.

📍 Arquivo: [app/layout.tsx](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/layout.tsx)
🟢 Severidade: BAIXO
🔎 Problema: **Carregamento de fontes com `display: 'swap'` — padrão correto.**
O projeto usa `next/font/local` com `display: 'swap'`, evitando bloqueio de renderização por carregamento de fonte (FOIT). O único ponto de melhoria é a conversão TTF → WOFF2, já documentada na seção 6.1.
💡 Sugestão: Nenhuma ação adicional além da conversão de formato de fonte descrita anteriormente.

---

### 6.5 — Resumo Executivo — Agente 6

| Categoria | Críticos | Médios | Baixos |
|---|---|---|---|
| Bundle / Lazy loading | — | 2 | 1 |
| Re-renders | — | 2 | 1 |
| Queries ao banco | — | 1* | 2 |
| Assets | — | — | 2 |
| **Total** | **0** | **5** | **6** |

\* O problema de `select('*')` foi categorizado como MÉDIO nesta seção, embora já documentado pelo Agente 1 (segurança) e Agente 3 (padronização). A solução é a mesma nos três contextos.

**Principais ações recomendadas (por prioridade):**
1. Implementar `next/dynamic` para componentes Recharts (maior impacto de bundle — biblioteca ~200 KB carregada desnecessariamente em todas as páginas)
2. Extrair objetos `contentStyle` de tooltips como constantes de módulo em todos os gráficos
3. Adicionar `useMemo` em `InsumosFilters` para evitar recriação de estruturas derivadas a cada render
4. Substituir `fazendaIdCache` (Map global) pelo `cache()` do React para eliminar o risco de memory leak
5. Converter fontes TTF para WOFF2 (ganho passivo de ~30%, zero risco de regressão)


---

## AGENTE 7 — DEPENDÊNCIAS & SAÚDE DO PROJETO

Análise do `package.json`, configurações de TypeScript, ESLint, Next.js e documentação do projeto.

---

### 7.1 — Dependências

📍 Arquivo: [package.json](file:///c:/Projetos/GestSilo/GestSIlo-Pro/package.json)
🟡 Severidade: MÉDIO
🔎 Problema: **`shadcn` listado em `dependencies` (produção) em vez de `devDependencies`.**
O pacote `shadcn` é a CLI do shadcn/ui, usada para adicionar componentes durante o desenvolvimento. Não é importada em nenhum arquivo `.ts`/`.tsx` do projeto. Estar em `dependencies` aumenta o bundle de produção sem necessidade, especialmente com `output: 'standalone'` ativo no `next.config.ts`.
💡 Sugestão: Mover `shadcn` para `devDependencies`.

📍 Arquivo: [package.json](file:///c:/Projetos/GestSilo/GestSIlo-Pro/package.json)
🟡 Severidade: MÉDIO
🔎 Problema: **`@types/jspdf` instalado mas redundante — `jspdf` v2.5+ já inclui seus próprios tipos.**
O pacote `@types/jspdf` (v1.3.3) é uma versão antiga de tipos comunitários da era pré-tipos embutidos. O `jspdf` moderno já expõe seus próprios tipos e o `@types/jspdf` pode conflitar com eles. Nenhum arquivo do projeto importa de `@types/jspdf` diretamente.
💡 Sugestão: Remover `@types/jspdf` de `devDependencies`.

📍 Arquivo: [package.json](file:///c:/Projetos/GestSilo/GestSIlo-Pro/package.json)
🟡 Severidade: MÉDIO
🔎 Problema: **`xlsx` na versão `^0.18.5` — abandonada e com vulnerabilidades de segurança conhecidas.**
O pacote `xlsx` (SheetJS Community Edition) parou de receber atualizações de segurança na v0.18.x. Vulnerabilidades de parsing contra arquivos maliciosos são conhecidas nessa linha de versão. O pacote é amplamente usado no módulo de relatórios.
💡 Sugestão: Avaliar migração para `exceljs` (fork mantida pela comunidade) ou para `@sheet/xlsx` (SheetJS Pro). Alternativa de menor impacto: fixar a versão e monitorar com `npm audit` regularmente.

📍 Arquivo: [package.json](file:///c:/Projetos/GestSilo/GestSIlo-Pro/package.json)
🟢 Severidade: BAIXO
🔎 Problema: **`use-debounce` usado em apenas 1 arquivo (`lib/hooks/useInsumos.ts`) — candidato à eliminação.**
A função de debounce pode ser implementada nativamente com `useEffect` + `setTimeout` em poucas linhas. Manter uma dependência externa só para isso aumenta a superfície de ataque e o bundle sem necessidade.
💡 Sugestão: Implementar debounce inline e remover o pacote `use-debounce`.

📍 Arquivo: [package.json](file:///c:/Projetos/GestSilo/GestSIlo-Pro/package.json)
🟢 Severidade: BAIXO
🔎 Problema: **`@testing-library/react` e `@testing-library/jest-dom` instalados sem nenhum uso.**
Nenhum dos arquivos em `__tests__/` importa de `@testing-library/react`. Os testes usam Vitest diretamente com funções puras, sem renderização de componentes React.
💡 Sugestão: Remover `@testing-library/react` e `@testing-library/jest-dom` de `devDependencies` se não houver plano imediato de testes de componente.

📍 Arquivo: [package.json](file:///c:/Projetos/GestSilo/GestSIlo-Pro/package.json)
🟢 Severidade: BAIXO
🔎 Problema: **`@base-ui/react` (Base UI / MUI) e `@radix-ui/react-*` coexistem — possível duplicidade de primitivos UI.**
O projeto instalou componentes `@radix-ui/react-*` (alert-dialog, checkbox, label) via shadcn e também tem `@base-ui/react`. Os 16 arquivos que importam `@base-ui/react` são todos componentes `ui/` do shadcn — verificar se a migração do Radix para Base UI foi parcial ou completa. Se parcial, há dois fornecedores de primitivos sem critério definido.
💡 Sugestão: Auditar se `@base-ui/react` e `@radix-ui/react-*` servem os mesmos primitivos e unificar em um único fornecedor.

---

### 7.2 — Scripts

📍 Arquivo: [package.json](file:///c:/Projetos/GestSilo/GestSIlo-Pro/package.json)
🟢 Severidade: BAIXO
🔎 Problema: **Ausência de scripts `test:coverage` e `test:e2e` no `package.json`.**
O projeto possui `@vitest/coverage-v8` instalado e testes Playwright em `e2e/`, mas não expõe scripts convencionais para cobertura de código nem para rodar os testes E2E. Isso dificulta a integração em CI/CD pipelines.
💡 Sugestão: Adicionar ao `package.json`:
```json
"test:coverage": "vitest run --coverage",
"test:e2e": "playwright test"
```

---

### 7.3 — Configurações

📍 Arquivo: [tsconfig.json](file:///c:/Projetos/GestSilo/GestSIlo-Pro/tsconfig.json)
🟢 Severidade: BAIXO
🔎 Problema: **`"target": "ES2017"` conservador para um projeto Next.js 15 + React 19 (2026).**
O alvo ES2017 força transpilação de recursos como `Object.fromEntries` (ES2019), `Promise.allSettled` (ES2020) e nullish coalescing (ES2020), que os ambientes-alvo já suportam nativamente.
💡 Sugestão: Atualizar `"target"` para `"ES2020"` ou `"ES2022"`, alinhando com o requisito mínimo do Next.js 15.

📍 Arquivo: [eslint.config.mjs](file:///c:/Projetos/GestSilo/GestSIlo-Pro/eslint.config.mjs)
🟡 Severidade: MÉDIO
🔎 Problema: **Configuração ESLint mínima: `extends: [...next]` sem nenhuma regra customizada do projeto.**
O CLAUDE.md documenta convenções críticas (nunca `payload: any`, nunca suprimir `react-hooks/exhaustive-deps`) que não estão codificadas como regras ESLint. O único `eslint-disable` encontrado no projeto está em [app/dashboard/rebanho/indicadores/IndicadoresClient.tsx:76](file:///c:/Projetos/GestSilo/GestSIlo-Pro/app/dashboard/rebanho/indicadores/IndicadoresClient.tsx) suprimindo exatamente `react-hooks/exhaustive-deps` — o que viola a regra documentada no CLAUDE.md.
💡 Sugestão: Adicionar ao `eslint.config.mjs`:
```js
rules: {
  "@typescript-eslint/no-explicit-any": "error",
  "react-hooks/exhaustive-deps": "error"
}
```
E corrigir a dependência real em `IndicadoresClient.tsx:76` em vez de suprimir o aviso.

📍 Arquivo: [next.config.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/next.config.ts)
🟡 Severidade: MÉDIO
🔎 Problema: **`next-pwa` v5.6.0 carregado via `require()` CommonJS em arquivo TypeScript ESM — e versão desatualizada sem suporte oficial ao App Router.**
O `next.config.ts` usa `import type` (ESM) mas carrega `next-pwa` com `require()` (CommonJS). Além disso, `next-pwa` v5.x não foi atualizado para o App Router do Next.js, podendo causar comportamentos inesperados com Server Components e cache.
💡 Sugestão: Avaliar migração para `@ducanh2912/next-pwa` ou `@serwist/next` (ambas as forks com suporte ao App Router). Se mantiver o `next-pwa`, converter para import ESM.

📍 Arquivo: [next.config.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/next.config.ts)
🟢 Severidade: BAIXO
🔎 Problema: **CSP permite `'unsafe-eval'` em todos os ambientes, incluindo produção.**
A diretiva `'unsafe-eval'` é necessária para hot-reload em desenvolvimento, mas enfraquece a proteção contra XSS em produção. O `next.config.ts` atual usa a mesma política para todos os ambientes.
💡 Sugestão: Tornar a CSP condicional: incluir `'unsafe-eval'` apenas quando `process.env.NODE_ENV === 'development'`.

📍 Arquivo: [playwright.config.ts](file:///c:/Projetos/GestSilo/GestSIlo-Pro/playwright.config.ts)
🟡 Severidade: MÉDIO
🔎 Problema: **`baseURL` do Playwright aponta para o ambiente de produção (`gestsilo-seven.vercel.app`).**
Testes E2E rodando contra produção podem criar registros reais no banco, disparar e-mails transacionais e poluir analytics. O risco é maior nos testes de `e2e/audit.spec.ts` que podem fazer requisições autenticadas.
💡 Sugestão: Mudar `baseURL` para `http://localhost:3000` como padrão. Criar um script `test:e2e:staging` separado que aponte para ambiente de staging/preview — nunca para produção.

---

### 7.4 — Documentação

📍 Arquivo: [.env.example](file:///c:/Projetos/GestSilo/GestSIlo-Pro/.env.example)
🟡 Severidade: MÉDIO
🔎 Problema: **`.env.example` desatualizado: falta `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CONSULTOR_EMAIL` e `OPENWEATHER_API_KEY`. Contém variáveis obsoletas (`GEMINI_API_KEY`, `APP_URL`).**
O CLAUDE.md documenta essas variáveis como necessárias para o módulo de Assessoria e para o módulo de previsão do tempo, mas elas estão ausentes do exemplo. As variáveis `GEMINI_API_KEY` e `APP_URL` são artefatos de um template anterior e não pertencem a este projeto.
💡 Sugestão: Atualizar o `.env.example` adicionando as variáveis faltantes e removendo as obsoletas.

📍 Arquivo: [.env.example](file:///c:/Projetos/GestSilo/GestSIlo-Pro/.env.example)
🔴 Severidade: CRÍTICO
🔎 Problema: **`SUPABASE_SERVICE_ROLE_KEY` documentada no `.env.example` sem aviso de segurança explícito.**
A service role key do Supabase ignora completamente todas as políticas de RLS e concede acesso total ao banco. Estar no `.env.example` sem um alerta claro aumenta o risco de um desenvolvedor usá-la inadvertidamente em contextos client-side ou expô-la em logs.
💡 Sugestão: Adicionar aviso explícito no `.env.example`:
```
# ⚠️ NUNCA expor no client (NEXT_PUBLIC_*). Usada APENAS em Server Actions e cron jobs.
# Bypass total de RLS — tratar como credencial de banco de dados raiz.
SUPABASE_SERVICE_ROLE_KEY=
```

---

### 7.5 — Resumo Executivo — Agente 7

| Categoria | Críticos | Médios | Baixos |
|---|---|---|---|
| Dependências | — | 2 | 3 |
| Scripts | — | — | 1 |
| Configurações | — | 3 | 2 |
| Documentação | 1 | 1 | — |
| **Total** | **1** | **6** | **6** |

**Principais ações recomendadas (por prioridade):**
1. Adicionar aviso de segurança explícito para `SUPABASE_SERVICE_ROLE_KEY` no `.env.example`
2. Mudar `baseURL` do Playwright de produção para `localhost:3000`
3. Atualizar `.env.example` com variáveis faltantes e remover as obsoletas (`GEMINI_API_KEY`, `APP_URL`)
4. Mover `shadcn` para `devDependencies` e remover `@types/jspdf`
5. Avaliar substituição do `xlsx` (abandonado) por alternativa mantida (`exceljs`)
6. Adicionar `"@typescript-eslint/no-explicit-any": "error"` no ESLint e corrigir o `eslint-disable` em `IndicadoresClient.tsx`
7. Tornar a CSP condicional por ambiente (remover `'unsafe-eval'` em produção)
