# BUGS & PENDÊNCIAS — Módulo Rebanho

**Data:** 2026-05-08

---

## RESUMO EXECUTIVO (Adições após inspeção do usuário)

### Arquitetura Desejada
```
Sidebar:
├── Dashboard
├── Silos
├── Lavouras
├── 🔸 Rebanho (APENAS ESTE ITEM — sem submenu)
├── Insumos
├── Produtos
├── Frota
├── Financeiro
└── ...

Clicando em "Rebanho":
└── /dashboard/rebanho (página hub)
    ├── Blocos acesso rápido (cards grandes):
    │   ├── Indicadores
    │   ├── Reprodução
    │   ├── Leiteira
    │   ├── Corte
    │   ├── Sanidade
    │   └── Movimentações
    └── Listagem de animais (abaixo dos blocos)
```

### Rotas Faltando (404)
1. **`/dashboard/rebanho/[id]/evento`** — Botão "Registrar Evento" (linha 361 de page.tsx) aponta para rota inexistente
2. **`/dashboard/rebanho/reproducao` (página hub)** — Não existe, deve ser criada com abas para Eventos, Reprodutores, Parâmetros

### Sidebar — Remover Completamente Subitens
- **Atual**: `rebanhoSubRoutes` tem 8 itens que expandem como submenu
- **Deve ser**: Remover a lógica de expansão (linhas 270-284 do Sidebar.tsx)
- **Resultado**: Item "Rebanho" sem nenhum submenu, sempre aponta a `/dashboard/rebanho`

### Página Hub `/rebanho` Deve Ser Auto-contida
- Tem botões de acesso rápido (linhas 127-164) mas são pequenos
- **Deve ter**: Bloco visual com 6 cards grandes (Indicadores, Reprodução, Leiteira, Corte, Sanidade, Movimentações)
- Listagem de animais já existe mas deve ficar ABAIXO
- **Navegação interna**: Cada card leva para sua seção — TUDO dentro de `/dashboard/rebanho` e sub-rotas

---

## 1. ERROS CRÍTICOS (Impedem uso ou causam falhas)

### 1.1 TipoEvento incompleto — lib/types/rebanho.ts:23-29
- **Problema**: Enum `TipoEvento` está faltando eventos reprodutivos críticos
- **Causa raiz**: O enum foi definido com apenas 5 tipos (NASCIMENTO, PESAGEM, MORTE, VENDA, TRANSFERENCIA_LOTE)
- **Impacto**: TypeScript rejeitará strings literais como `'cobertura'`, `'parto'`, `'aborto'`, `'secagem'`, `'descarte'`, `'desmame'`, `'diagnostico_prenhez'` quando usadas em queries e comparações
- **Afeta**:
  - `lib/supabase/rebanho-reproducao.ts` (linhas 137, 159, 207, 227, etc.)
  - Testes em `lib/calculos/__tests__/indicadores-rebanho.test.ts` (linhas 124-126, 231-233, etc.)
  - Testes em `tests/rebanho/__tests__/projecao.test.ts` (múltiplas comparações falhando)
- **Evidência**: 100+ erros TS2322 nos testes mencionando tipos incompatíveis

**Eventos que faltam no enum:**
```
- COBERTURA = 'cobertura'
- DIAGNOSTICO_PRENHEZ = 'diagnostico_prenhez'
- PARTO = 'parto'
- SECAGEM = 'secagem'
- ABORTO = 'aborto'
- DESCARTE = 'descarte'
- DESMAME = 'desmame'
```

---

### 1.2 StatusAnimal tipo incompatível — lib/types/rebanho.ts:16-21
- **Problema**: Tests esperam tipo discriminado mas enum está usando capitalizações inconsistentes
- **Causa raiz**: Enum define valores capitalizados ('Ativo', 'Morto', 'Vendido', 'Descartado') mas comparações em testes usam as mesmas strings e falham
- **Impacto**: Múltiplos testes recusam valores como "Ativo" quando deveriam aceitar
- **Afeta**:
  - `lib/supabase/__tests__/projetar-rebanho.test.ts:40`
  - `tests/rebanho/__tests__/projecao.test.ts` (linhas 289, 308, 340, 359, 398, 454, 512, 583, 643, 686, 726, 755, 826, 870, 901)
  - `tests/rebanho/__tests__/rebanho-indicadores-queries.test.ts:74`
- **Evidência**: ~20 erros TS2322 com status values

---

## 2. ERROS FUNCIONAIS (Feature quebrada mas página carrega)

### 2.1 Planejador de Silagem não detecta animais do rebanho
- **Problema**: Componente `Etapa2Rebanho.tsx` chama `detectarRebanho()` mas função sempre retorna "vazio" ou falha silenciosa
- **Localização**: `app/dashboard/planejamento-silagem/components/Etapa2Rebanho.tsx:70-114`
- **Causa investigada**: 
  - Funções existem em `lib/supabase/rebanho.ts:594` e `:658`
  - Código chama `supabase.from('animais').select(...)` sem `fazenda_id` no filtro?
- **Teste manual necessário**: Navegar para planejamento-silagem com rebanho cadastrado e verificar se campo "Detectar Rebanho" carrega dados
- **Status**: Requer inspeção de query de filtro

### 2.2 Reprodutores — Lista de coberturas não implementada
- **Localização**: `app/dashboard/rebanho/reproducao/reprodutores/[id]/page.tsx:118`
- **Código**: `{/* TODO: Adicionar lista de coberturas depois de implementar tabela */}`
- **Impacto**: Página renderiza vazio em seção "Coberturas"
- **Tipo**: Placeholder não implementado

### 2.3 Leiteira — Integração com silos incompleta
- **Localização**: `app/dashboard/rebanho/leiteira/page.tsx:134`
- **Código**: `{/* TODO: integrar com módulo de silos quando query de consumo estiver disponível */}`
- **Impacto**: Feature "Eficiência Alimentar" (litros/kg MS) não funciona
- **Tipo**: Feature esperada mas pendente de dependência externa

---

## 3. WARNINGS & QUALIDADE DE CÓDIGO

### 3.1 Múltiplos uses de `as any` (Violação CLAUDE.md)
- **Violação**: CLAUDE.md proíbe `as any` — tipagem deve ser correta
- **Ocorrências**:
  - `app/dashboard/rebanho/actions.ts:149`
  - `app/dashboard/rebanho/indicadores/page.tsx:67`
  - `app/dashboard/rebanho/reproducao/page.tsx:30-31` (2x)
  - `app/dashboard/rebanho/movimentacoes/actions.ts:73`
  - `app/dashboard/rebanho/sanidade/actions.ts:25-26` (2x)
- **Tipo**: Typecasting genérico sem especificar tipo

### 3.2 Imports `as any` em callbacks
- **Localização**: `app/dashboard/rebanho/indicadores/IndicadoresClient.tsx:269, 304, 342, 373`
- **Problema**: `alerta: any` em `.map()` callbacks
- **Violação**: Tipo deve ser especificado ao invés de `any`

### 3.3 Callbacks sem tipagem explícita
- **Localização**: `app/dashboard/rebanho/movimentacoes/components/RegistrarMovimentacaoDialog.tsx:231, 285`
- **Problema**: `(v: any) => setTipo(v)`
- **Deve ser**: Tipado com union type ou string literal

### 3.4 ESLint `react-hooks/exhaustive-deps` warnings
- **Crítico**:
  - `app/dashboard/planejamento-silagem/components/Etapa2Rebanho.tsx:114` — faltam deps: `categorias`, `dataAlvo`, `wizard.sistema?.tipo_rebanho`
  - `components/rebanho/AbaProducaoLeiteira.tsx:72` — faltam deps: `fetchProducoes`
- **Risco**: Side effects podem não rodar quando deveriam, causando UI desatualizada

### 3.5 Compilation Skipped warnings (React Compiler)
- Múltiplas páginas apresentam "Compilation Skipped: Use of incompatible library" com React Hook Form's `watch()`
- Afeta: `AnimalForm.tsx:86`, `PlanoManutencaoDialog.tsx:105`, `UsoDialog.tsx:109`, `MovimentacaoDialog.tsx:64`
- **Contexto**: Aviso informativo, não bloqueador, mas indica padrão que React Compiler não consegue otimizar

---

## 3A. ROTAS FALTANDO (404 Errors)

### 3A.1 Rota `/rebanho/[id]/evento` não existe
- **Localização de call**: `app/dashboard/rebanho/[id]/page.tsx:361`
- **Código**: `router.push(/dashboard/rebanho/${animalId}/evento)`
- **Botão**: "Registrar Evento" (visível quando `canRegisterEvent === true`)
- **Impacto**: Click no botão causa erro 404
- **Deveria ser**: Modal dialog ou página separada para registrar diferentes tipos de eventos (nascimento, pesagem, morte, venda, etc.)
- **Tipo**: Rota crítica faltando

### 3A.2 Página hub `/rebanho/reproducao` não existe
- **Contexto**: Rotas `/rebanho/reproducao/eventos`, `/rebanho/reproducao/reprodutores`, `/rebanho/reproducao/parametros` existem
- **Problema**: Não há página pai em `/rebanho/reproducao/page.tsx` que agregue essas sub-rotas com abas
- **Esperado**: Página com abas internas (Eventos, Reprodutores, Parâmetros) para navegação intra-módulo
- **Impacto**: Navegação confusa, essas sub-rotas aparecem como itens de menu separados no Sidebar
- **Tipo**: Rota estrutural faltando

---

## 4. FEATURES INCOMPLETAS

### 4.1 Reprodutores — Query ao banco não implementada
- **Localização**: `app/dashboard/rebanho/reproducao/reprodutores/[id]/page.tsx:13`
- **Código**: `// TODO: Substituir por query ao banco`
- **Status**: Placeholder usando dados mockados ou inválidos

### 4.2 Reprodutores — Profile não carregado do AuthProvider
- **Localização**: `app/dashboard/rebanho/reproducao/reprodutores/[id]/page.tsx:44`
- **Código**: `// TODO: Obter profile do AuthProvider`
- **Impacto**: Profile provavelmente undefined, afeta lógica de permissões

### 4.3 Indicadores — Ranking por lote não implementado
- **Localização**: `app/dashboard/rebanho/indicadores/actions.ts:164`
- **Código**: `// TODO: Implementar lógica de ranking por lote em T43`
- **Status**: Feature não codificada, retorna dados incompletos

---

## 5. INTEGRAÇÕES PENDENTES

### 5.1 Planejador de Silagem + Rebanho
- **Status**: Ambíguo (parecem implementados mas com problemas)
- **Problema**: Função `detectarRebanho()` existe mas retorna "vazio" mesmo com dados
- **Causa suspeita**: Filtro de `fazenda_id` pode estar faltando ou RLS bloqueando
- **Próximo passo**: Debugar query em staging com RLS ativado

---

## 5A. ESTRUTURA DE SIDEBAR INCORRETA

### 5A.1 Menu lateral não deveria expandir nenhum submenu de Rebanho
- **Localização**: `components/Sidebar.tsx:74-83 e 270-284`
- **Array `rebanhoSubRoutes`**: Contém 8 itens que são renderizados como submenu
  - Indicadores, Reprodução, Reprodutores, Parâmetros, Leiteira, Corte, Sanidade, Movimentações
- **Problema**: Lógica em linhas 270-284 expande submenu quando `pathname.startsWith('/dashboard/rebanho')`
- **Solução**: 
  1. Remover condição de expansão (linhas 270-284)
  2. Manter apenas: `<NavItem href="/dashboard/rebanho" label="Rebanho" .../>`
  3. Deletar ou comentar array `rebanhoSubRoutes` (já não usado)
- **Resultado**: Item "Rebanho" permanece simples, sem submenu expandível
- **Impacto**: Sidebar fica limpo, navegação interna fica 100% na página hub
- **Tipo**: Lógica de renderização

### 5A.2 Página hub `/rebanho` é o único lugar de navegação interna
- **O que é**: Única página que contém navegação para Indicadores, Reprodução, Leiteira, Corte, Sanidade, Movimentações
- **Como**: Cards grandes com links internos
- **Rotas filhas** (usadas via cards internos): `/indicadores`, `/reproducao`, `/leiteira`, `/corte`, `/sanidade`, `/movimentacoes`
- **Tipo**: Arquitetura de navegação

---

## 6. PROBLEMAS ESTRUTURAIS

### 6.1 TipoRebanho vs tipo_rebanho inconsistência
- **Localização**: `lib/types/rebanho.ts:73`
- **Problema**: Interface `Lote.tipo_rebanho` declara como string union `'leiteiro' | 'corte' | 'misto' | null`
- **Risco**: Não usa enum TipoRebanho, pode causar inconsistência

### 6.1A Página hub `/rebanho` — Layout e estrutura
- **Localização**: `app/dashboard/rebanho/page.tsx`
- **Atual**: 
  - Linhas 126-164: Buttons pequenos (tamanho "sm") em linha
  - Linhas 167+: Filtros (Card)
  - Linhas após: Tabela de animais
- **Esperado**: 
  ```
  Seção 1 — Blocos de acesso rápido (cards grandes)
    Grid 2-3 colunas com 6 cards:
    • Indicadores (BarChart3 icon) → /dashboard/rebanho/indicadores
    • Reprodução (Heart icon) → /dashboard/rebanho/reproducao
    • Leiteira (Milk icon) → /dashboard/rebanho/leiteira
    • Corte (Scale icon) → /dashboard/rebanho/corte
    • Sanidade (Stethoscope icon) → /dashboard/rebanho/sanidade
    • Movimentações (ArrowRightLeft icon) → /dashboard/rebanho/movimentacoes
  
  Seção 2 — Cabeçalho de listagem
    "Gestão de Rebanho" + botões (Novo Animal, Lotes, Importar CSV)
  
  Seção 3 — Filtros
    (já existe)
  
  Seção 4 — Tabela de animais
    (já existe)
  ```
- **Impacto**: Página hub fica auto-contida com toda navegação visível
- **Tipo**: Design/UX/Arquitetura

### 6.2 Animal.status vs expected field
- **Localização**: `lib/types/rebanho.ts:43`
- **Problema**: Campo chamado `status` mas banco pode esperar `status_animal` ou similar
- **Risco**: Query mismatch com banco de dados

---

## 7. RESUMO DE AÇÕES NECESSÁRIAS

| Prioridade | Bug | Tipo | Ação | Fase |
|------------|-----|------|------|------|
| 🔴 CRÍTICA | Sidebar expande subitens Rebanho | Sidebar | Remover lógica de submenu (linhas 270-284) | 1 |
| 🔴 CRÍTICA | Rota `/rebanho/[id]/evento` não existe | Rota | Criar modal/página para registrar eventos | 2 |
| 🔴 CRÍTICA | Página `/rebanho/reproducao` não existe | Rota | Criar hub com 3 abas internas | 2 |
| 🔴 CRÍTICA | Página hub `/rebanho` — blocos pequenos | UX | Redesenhar cards acesso rápido (grid 6 cards) | 3 |
| 🔴 CRÍTICA | TipoEvento incompleto | Tipo | Adicionar 7 valores ao enum | 4 |
| 🔴 CRÍTICA | StatusAnimal incompatível | Tipo | Verificar/corrigir enum vs testes | 4 |
| 🟠 ALTA | Planejador não detecta rebanho | Funcional | Debugar `detectarRebanho()` query | 5 |
| 🟠 ALTA | `as any` violations (6+) | Código | Tipar corretamente todas as ocorrências | 4 |
| 🟡 MÉDIO | React Hook deps warnings (2) | Qualidade | Adicionar deps faltantes (Etapa2Rebanho, AbaProducao) | 4 |
| 🟡 MÉDIO | Reprodutores incompleto (3 TODOs) | Funcional | Implementar 3 features pendentes | 6 |
| 🟢 BAIXA | Leiteira + silos | Feature | Aguardar query de consumo | — |
| 🟢 BAIXA | Indicadores ranking | Feature | Implementar T43 | — |

---

## 8. TESTES AFETADOS

**Total de erros TS no módulo rebanho: ~150+ erros em testes**

- `lib/__tests__/rebanho.queries.test.ts` — 3 erros (tipos Animal, Lote, PesoAnimal)
- `lib/calculos/__tests__/indicadores-rebanho.test.ts` — ~40 erros (TipoRebanho, TipoEvento literal strings)
- `tests/rebanho/__tests__/projecao.test.ts` — ~75 erros (TipoRebanho, TipoEvento, StatusAnimal)
- `tests/rebanho/__tests__/rebanho-reproducao.rls.test.ts` — ~4 erros (role comparison)
- `tests/rebanho/__tests__/rebanho-reproducao.offline-sync.test.ts` — ~2 erros (uuid, implicit any)

**Nenhum erro crítico bloqueia o build** — projeto compila com sucesso (exit code 0)

---

## 9. BUILD STATUS

✅ **Build concluído com sucesso** (2026-05-08)
- TypeScript: 1 erro indetificado (fora do rebanho)
- ESLint: 15 warnings (rebanho-related)
- Output: 51 rotas geradas (tudo prerendeado ou dynamic OK)

---

## 10. PRÓXIMOS PASSOS RECOMENDADOS

### Ordem de Prioridade:

**Fase 1 - Sidebar Limpeza** (30min)
1. ✗ Remover lógica de submenu de Rebanho
   - Deletar linhas 270-284 em `components/Sidebar.tsx`
   - Deletar ou comentar array `rebanhoSubRoutes` (linhas 74-83)
   - Deixar apenas: `<NavItem href="/dashboard/rebanho" icon={PawPrint} label="Rebanho" />`
   - Resultado: Item "Rebanho" sem nenhum submenu

**Fase 2 - Rotas Críticas Faltando** (2-3h)
1. ✗ Criar `/rebanho/[id]/evento` → modal ou página para registrar eventos
   - Deveria suportar: nascimento, pesagem, morte, venda, transferencia_lote
   - Com chamada a Server Action em `actions.ts`
2. ✗ Criar `/rebanho/reproducao/page.tsx` → hub com 3 abas internas
   - Aba "Eventos" → link para `/reproducao/eventos`
   - Aba "Reprodutores" → link para `/reproducao/reprodutores`
   - Aba "Parâmetros" → link para `/reproducao/parametros`

**Fase 3 - Redesenho Página Hub `/rebanho`** (2-3h)
1. ✗ Substituir botões pequenos (linha 127-164) por cards grandes
   - Grid 2-3 colunas
   - 6 cards: Indicadores, Reprodução, Leiteira, Corte, Sanidade, Movimentações
   - Cada card com ícone, título, descrição curta
   - Animação hover
   - Layout: [Cards Acesso Rápido] + [Cabeçalho Listagem] + [Filtros] + [Tabela Animais]

**Fase 3 - Bloqueadores de Tipo** (1h)
- Completar enum `TipoEvento` com 7 valores faltantes
- Verificar enum `StatusAnimal` vs testes

**Fase 4 - Corrigir Tipagem** (2h)
- Remover todos os `as any` (6 ocorrências)
- Tipar callbacks corretamente

**Fase 5 - Debugar Integração** (2-3h)
- Investigar por que `detectarRebanho()` não funciona
- Testar RLS da tabela `animais`

**Fase 6 - Completar Features** (3-4h)
- Implementar 3 TODOs em Reprodutores
- Aguardar Indicadores (ranking T43)
- Aguardar Silos (consumo para Leiteira)

---

**Fim do relatório de auditoria**
