# Inventário de Consumidores Externos do Rebanho

> **Tipo**: documentação (Fase 0 — SPEC-rebanho012, P0.4). **Não é código de fachada.**
> **Objetivo**: tornar explícito o *blast radius* — todos os pontos do app que leem
> tabelas do domínio Rebanho (`animais`, `lotes`, `eventos_rebanho`, `eventos_sanitarios`,
> `pesos_animal`, `producoes_leiteiras`) **diretamente**, fora do próprio módulo
> `app/dashboard/rebanho/**` e `lib/supabase/rebanho*.ts`.
> Serve para que as Fases 1 e 2 (que **não** mudam schema) confirmem que não afetam estes
> consumidores, e para preparar a Fase 5 (fachadas/serviços).
>
> Data: 2026-06-30. Linhas conferidas contra o estado atual do repositório.

---

## Por que isto importa para as Fases 1 e 2

As Fases 1 (navegação) e 2 (ficha do animal) **não alteram schema, RPC, RLS nem contratos
de dados**. Estes consumidores leem as tabelas do rebanho por acoplamento direto — em
particular, **casam por string** com `animais.categoria` (gravado pelo trigger
`recalcular_categoria_animal`). Qualquer mudança de string de categoria, de shape de tabela
ou de semântica de status quebraria estes pontos silenciosamente. Como as Fases 1–2 não
mexem em nada disso, o blast radius confirmado abaixo **permanece intacto**; este documento
é a evidência de que isso foi verificado.

---

## Consumidores diretos (mínimo exigido pela SPEC)

### 1. `lib/supabase/pastagens.ts` — cálculo de UA por lote/piquete

- **Função**: `calcularUADoLote(loteId, areaHa)` — aprox. **linhas 445–490+**.
- **O que lê do rebanho**:
  - `animais` → `select('id, categoria').eq('lote_id', loteId).eq('status', 'Ativo')`.
  - `pesos_animal` → pesagens dos últimos 90 dias (`peso_kg`, `data_pesagem`) para os
    animais do lote, pega a mais recente por animal.
- **Como usa**: converte cada animal em Unidade Animal (UA). Usa peso real quando há
  pesagem ≤ 90 dias; senão cai no fallback `FATORES_UA_POR_CATEGORIA`
  (`lib/types/pastagens.ts`), que **casa por string** com `animais.categoria`.
- **Sensibilidade**: depende de (a) string exata de `categoria`, (b) `status = 'Ativo'`,
  (c) shape de `pesos_animal`. Fase 1–2 não tocam nenhum desses → sem impacto.

### 2. `lib/supabase/balanco-forrageiro.ts` — demanda do rebanho por categoria

- **Função**: `getAnimaisAtivosPorCategoria(supabase)` — **linhas 162–183**.
- **O que lê do rebanho**:
  - `animais` → `select('categoria').eq('status', 'Ativo').is('deleted_at', null)`,
    agregando contagem por categoria em memória.
- **Como usa**: alimenta `CONSUMO_MS_POR_CATEGORIA` (`lib/constants/balanco-forrageiro.ts`)
  para projetar a demanda de matéria seca; também **casa por string** com a categoria.
- **Sensibilidade**: idêntica à #1 — string de categoria + `status`/`deleted_at`.
  Fase 1–2 não tocam → sem impacto.

### 3. `app/dashboard/page.tsx` — alertas e KPIs do dashboard principal

- **Trecho**: bloco de `Promise.all` em aprox. **linhas 138–197**.
- **O que lê do rebanho** (vários SELECT independentes):
  - `animais` → `select('categoria')` (composição por categoria);
  - `animais` → `select('tipo_rebanho')` (vocação do rebanho);
  - `animais` → `select('lote_id')` (animais alocados em lote);
  - `lotes` → `select('id, nome')`;
  - `eventos_sanitarios` → vacinações com `data_proxima_dose` próxima (alerta sanitário),
    join `animais(brinco, nome)`.
- **Como usa**: monta cards de composição/alertas. Também depende de string de categoria
  e de `status = 'Ativo'`/`deleted_at`.
- **Sensibilidade**: alto fan-out de leitura, mas só leitura. Fase 1–2 não mudam schema
  nem strings → sem impacto.

### 4. `lib/supabase/calendario.ts` — calendário unificado da fazenda

- **Funções**: `fetchEventosRebanho` (aprox. **linhas 150–172**) e `fetchEventosSanitarios`
  (aprox. **linhas 174–230**).
- **O que lê do rebanho**:
  - `eventos_rebanho` → `select('id, tipo, observacoes, data_evento, animal_id,
    animais(brinco, nome)')` por janela de datas;
  - `eventos_sanitarios` → eventos passados e próximas doses, join implícito por `animal_id`.
- **Como usa**: agrega eventos do rebanho na visão de calendário (módulos `rebanho`/`sanidade`).
- **Sensibilidade**: depende do shape de `eventos_rebanho`/`eventos_sanitarios` e do join
  `animais(brinco, nome)`. Fase 1–2 não tocam essas tabelas → sem impacto.
  > Observação: a SPEC citou `producoes_leiteiras` como fonte do calendário; no código atual
  > `calendario.ts` **não** lê `producoes_leiteiras` (somente `eventos_rebanho` e
  > `eventos_sanitarios` no domínio rebanho). Registrado para precisão.

---

## Resíduo pré-existente fora do escopo (NÃO corrigir agora)

Durante o P0.2 (fonte única de categorias) foi confirmado um **bug latente pré-existente**
em dois consumidores externos, que usam a chave `'Novilha (Prenha)'` (com parênteses) — string
que **o banco nunca grava**. O trigger grava `'Novilha Prenha'` (sem parênteses, ver
`supabase/migrations/20260505_fix_categoria_bezerro_por_sexo.sql`).

| Arquivo | Linha | Mapa | Efeito do bug |
|---|---|---|---|
| `lib/types/pastagens.ts` | 142 | `FATORES_UA_POR_CATEGORIA` | Animais `Novilha Prenha` nunca casam a chave → caem no `UA_FATOR_PADRAO` (0.8) em vez de 0.50 |
| `lib/constants/balanco-forrageiro.ts` | 6 | `CONSUMO_MS_POR_CATEGORIA` | Animais `Novilha Prenha` nunca casam a chave → caem no `CONSUMO_MS_PADRAO` (7.0) em vez de 8.5 |

- **Natureza**: bug **pré-existente**, não introduzido pela refatoração. O P0.2 deixou esses
  arquivos intocados, então o comportamento atual é idêntico ao de antes (smoke 13 da SPEC
  passa por construção — contagens/UA inalteradas após a consolidação).
- **Decisão de escopo**: a SPEC restringe o P0.2/P0.3/P0.4 a **não** tocar consumidores
  externos (fachadas são Fase 5). Portanto **não corrigir agora**.
- **Pendência proposta (Fase 5 / SPEC futura)**: alinhar essas duas chaves a `'Novilha Prenha'`
  (idealmente consumindo `lib/constants/categorias-rebanho.ts`), de forma que os consumidores
  externos passem a casar a categoria real. Menor correção compatível: trocar a string da chave.

---

## Nota de estado do repositório (atualizada 2026-06-30)

Após os passos **P0.2** (fonte única de categorias) e **P0.3** (remoção de órfãos da
reprodução), a suíte completa de testes está **verde: 44 arquivos / 942 testes passando, 0
falhas**, e `npm run build` compila sem erro. As observações antigas do `CLAUDE.md` sobre
testes pré-existentes falhos (`projetar-rebanho.test.ts` e `__tests__/security/rls.test.ts`)
**não se aplicam ao estado atual** e devem ser tratadas como desatualizadas.
