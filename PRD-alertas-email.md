# PRD — Alertas Proativos por Email

**Status**: Aguardando aprovação  
**Data**: 2026-05-24  
**Autor**: Marcio Bastos

---

## 1. Problema

O GestSilo detecta alertas críticos no dashboard em tempo real, mas o Administrador só os vê ao acessar a plataforma. Situações urgentes — silagem acabando, piquetes superlotados, animais retidos após prazo — podem passar despercebidas por dias. O sistema já possui Resend configurado e infraestrutura de email funcional; falta apenas o disparo proativo.

---

## 2. Objetivo

Enviar, uma vez por dia, um email consolidado para o Administrador de cada fazenda que possua ao menos um alerta ativo nos 4 critérios aprovados. O email deve permitir que o Admin compreenda a situação e acesse o dashboard diretamente para agir.

---

## 3. Escopo

### 3.1 Inclui

- Cron job diário via Vercel Cron (schedule `0 6 * * *` — 6h UTC / 3h de Brasília)
- API route autenticada `POST /api/cron/alertas`
- Verificação de exatamente **4 alertas** (ver seção 4)
- Email único por fazenda com todos os alertas consolidados
- Testes unitários isolados para as funções de verificação

### 3.2 Não inclui

- Preferências de notificação por usuário (campo inexistente no banco — não criar)
- Controle de deduplicação / "já enviado hoje" (v2)
- Alertas de insumos, manutenção ou vacinação
- Envio para Operador ou Visualizador
- Endpoint de teste via UI
- Push notifications, SMS, WhatsApp

---

## 4. Alertas Cobertos

| # | Nome | Condição de Disparo | Fonte de Dados |
|---|---|---|---|
| 1 | Autonomia de silagem baixa | `autonomiaDias < 30` | `silos` + `movimentacoes_silo` (últimos 30 dias, subtipos que reduzem estoque) |
| 2 | Taxa de perdas alta | `taxaPerdas > 20%` | `movimentacoes_silo` (últimos 30 dias, subtipo `Perda` vs total saído) |
| 3 | Piquete com ocupação vencida | `ocupacoes_piquete.data_saida_real IS NULL` e `data_saida_prevista < hoje` | `ocupacoes_piquete` + `piquetes` |
| 4 | Piquete pronto sem uso | `piquetes.status = 'Descanso'` e `updated_at < hoje − 3 dias` | `piquetes` |

**Regra de envio**: se a fazenda não tiver nenhum dos 4 alertas ativos, nenhum email é enviado. Sem email "tudo ok".

---

## 5. Arquitetura

### 5.1 Vercel Cron Job

Entrada em `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/alertas",
      "schedule": "0 6 * * *"
    }
  ]
}
```

O Vercel Hobby suporta no máximo 1 cron por dia — este schedule usa exatamente 1 execução diária.

### 5.2 API Route — `app/api/cron/alertas/route.ts`

**Método**: `POST`

**Autenticação**: header `Authorization: Bearer <CRON_SECRET>`. Se ausente ou inválido, retorna `401` imediatamente.

**Fluxo**:

1. Valida `Authorization` contra `process.env.CRON_SECRET`
2. Instancia `supabaseAdmin` com service role key (bypassa RLS)
3. Busca todos os registros de `fazendas` (apenas `id` e `nome`)
4. Para cada fazenda, em paralelo (`Promise.allSettled`):
   - Executa `verificarAlertasFazenda(fazendaId, supabaseAdmin)` — retorna array de alertas ativos
   - Se array não vazio: busca email do Admin e envia email consolidado
5. Retorna JSON com resumo: `{ processadas: N, comAlertas: M, emailsEnviados: K, erros: [...] }`

**Tratamento de erros**:
- Falha em uma fazenda não interrompe o processamento das demais (`Promise.allSettled`)
- Erros são logados via `console.error` e incluídos no JSON de retorno
- Falha no envio de email é logada mas não relançada (operação best-effort)

### 5.3 Serviço de Verificação — `lib/services/alertas-email.ts`

**Dependências externas recebidas por parâmetro** (não instanciadas internamente — necessário para testes):

```typescript
type SupabaseAdmin = /* cliente Supabase com service role */
```

**4 funções de verificação** (uma por alerta):

| Função | Retorno quando alerta ativo |
|---|---|
| `verificarAutonomiaSilagem(fazendaId, supabaseAdmin)` | `{ tipo: 'autonomia_silagem', detalhe: string }[]` |
| `verificarPerdasSilagem(fazendaId, supabaseAdmin)` | `{ tipo: 'perdas_silagem', detalhe: string }[]` |
| `verificarOcupacoesVencidas(fazendaId, supabaseAdmin)` | `{ tipo: 'ocupacao_vencida', detalhe: string }[]` |
| `verificarPiquetesProntos(fazendaId, supabaseAdmin)` | `{ tipo: 'piquete_pronto', detalhe: string }[]` |

**Função de composição**:

```typescript
verificarAlertasFazenda(fazendaId, supabaseAdmin): Promise<AlertaEmail[]>
```

Executa as 4 verificações em `Promise.all` e retorna array concatenado. Se uma verificação lançar exceção, a função a suprime, loga o erro e continua (um alerta com falha não cancela os demais).

**Tipo `AlertaEmail`**:

```typescript
type AlertaEmail = {
  tipo: 'autonomia_silagem' | 'perdas_silagem' | 'ocupacao_vencida' | 'piquete_pronto'
  detalhe: string  // texto em linguagem simples para o email
}
```

**Lógica de cada verificação**:

- **Autonomia de silagem**: para cada silo da fazenda, calcula estoque atual (somatório de entradas menos saídas em `movimentacoes_silo`) e consumo médio diário (saídas dos últimos 30 dias excluindo subtipo `Descarte` / `Perda`). `autonomiaDias = estoqueAtual / consumoDiario`. Retorna 1 item por silo com `autonomiaDias < 30`.
- **Perdas de silagem**: soma saídas com subtipo `Perda` e total de saídas dos últimos 30 dias por silo. `taxaPerdas = totalPerdas / totalSaidas`. Retorna 1 item por silo com `taxaPerdas > 0.20`.
- **Ocupações vencidas**: busca em `ocupacoes_piquete` onde `data_saida_real IS NULL` e `data_saida_prevista < now()`, join com `piquetes` para obter nome. Retorna 1 item por ocupação.
- **Piquetes prontos sem uso**: busca em `piquetes` onde `status = 'Descanso'` e `updated_at < now() - interval '3 days'`. Retorna 1 item por piquete.

Todas as queries usam colunas explícitas (sem `select('*')`), filtro por `fazenda_id` e não dependem de RLS (service role bypassa tudo).

### 5.4 Template de Email — `lib/email/templates/alertas-fazenda.ts`

**Assinatura da função**:

```typescript
gerarEmailAlertasFazenda(fazendaNome: string, alertas: AlertaEmail[]): string
// retorna HTML string pronto para envio via Resend
```

**Especificações**:

| Campo | Valor |
|---|---|
| `from` | `noreply@gestsilo.com.br` |
| `subject` | `⚠️ GestSilo — [N] alerta(s) na sua fazenda` onde N = `alertas.length` |
| Estrutura HTML | Inline, padrão do projeto (sem CSS externo) |
| Paleta | Backgrounds `#161616` / `#1c1c1c`, destaque dourado `#f5d000` para alertas |
| Tipografia | `font-family: Arial, sans-serif`, body `14px`, títulos `18–22px` |

**Estrutura do corpo**:

1. **Cabeçalho**: logo textual "GestSilo", subtítulo "Resumo de alertas — [data de hoje]"
2. **Saudação**: "Olá, você tem [N] alerta(s) na fazenda [nome da fazenda] que precisam de atenção:"
3. **Lista de alertas**: um bloco por alerta com ícone, título curto e texto em linguagem simples (ex: "O silo *Silo Norte* tem apenas 12 dias de autonomia. Considere agendar uma nova colheita.")
4. **CTA**: botão "Ver no dashboard" → `NEXT_PUBLIC_APP_URL/dashboard`
5. **Rodapé**: "Você recebe este email porque é Administrador da fazenda [nome]. © GestSilo"

**Linguagem dos alertas** (exemplos — não jargão técnico):

| Tipo | Texto modelo |
|---|---|
| `autonomia_silagem` | "O silo **[nome]** tem apenas **[N] dias** de silagem restante (abaixo do mínimo de 30 dias)." |
| `perdas_silagem` | "O silo **[nome]** registrou **[X]%** de perdas nos últimos 30 dias (acima do limite de 20%)." |
| `ocupacao_vencida` | "O piquete **[nome]** tem animais que deveriam ter saído em **[data]** e ainda estão ocupando o pasto." |
| `piquete_pronto` | "O piquete **[nome]** está em descanso há mais de 3 dias e pode estar pronto para receber animais." |

---

## 6. Segurança

- `CRON_SECRET` é comparado com `===` simples (timing-safe não necessário — header interno do Vercel)
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`) já existe no projeto para outros fins; não é variável nova
- A API route não é chamável pelo browser do usuário (sem autenticação de sessão)
- Nenhum dado pessoal sensível no corpo do email além do nome da fazenda (já visível ao Admin)

---

## 7. Variáveis de Ambiente

| Variável | Onde configurar | Observação |
|---|---|---|
| `CRON_SECRET` | Vercel + `.env.local` | String aleatória ≥ 32 chars. Nova variável. |
| `SUPABASE_SERVICE_ROLE_KEY` | Já existe no projeto | Verificar se está no Vercel env |
| `RESEND_API_KEY` | Já existe no projeto | Mesma chave usada no módulo Assessoria |
| `NEXT_PUBLIC_APP_URL` | Já existe no projeto | Usado no link do CTA |

---

## 8. Testes

As 5 funções exportadas por `lib/services/alertas-email.ts` devem ter cobertura unitária:

| Função | Cenários mínimos |
|---|---|
| `verificarAutonomiaSilagem` | silo com autonomia < 30d (alerta), silo com autonomia ≥ 30d (sem alerta), sem movimentações nos 30 dias (sem consumo → sem alerta) |
| `verificarPerdasSilagem` | perdas > 20% (alerta), perdas ≤ 20% (sem alerta), sem saídas (sem alerta) |
| `verificarOcupacoesVencidas` | ocupação com `data_saida_real = null` e prazo vencido (alerta), ocupação com `data_saida_real` preenchida (sem alerta), prazo futuro (sem alerta) |
| `verificarPiquetesProntos` | piquete em Descanso com `updated_at` > 3 dias atrás (alerta), em Descanso com `updated_at` recente (sem alerta), status diferente de Descanso (sem alerta) |
| `verificarAlertasFazenda` | agrega alertas de todas as 4 funções corretamente, exceção em uma verificação não cancela as demais |

As funções recebem `supabaseAdmin` como parâmetro → cliente mockado no teste via `vi.fn()` / stub simples, sem conexão real ao Supabase.

A função de template `gerarEmailAlertasFazenda` pode ser testada com snapshot ou verificações de substrings-chave (nome da fazenda, "alerta(s)", link do dashboard).

---

## 9. Impacto em Arquivos Existentes

| Arquivo | Tipo de mudança |
|---|---|
| `vercel.json` | Adição do bloco `crons` |
| `lib/services/email.ts` | Sem alteração — novo arquivo separado para alertas |
| `lib/supabase/alertas-email.ts` | **Novo** — funções de verificação |
| `lib/email/templates/alertas-fazenda.ts` | **Novo** — template HTML |
| `app/api/cron/alertas/route.ts` | **Novo** — API route |
| `__tests__/alertas-email/` | **Novo** — suite de testes |
| `.env.local` (exemplo) | Adicionar `CRON_SECRET=` |

**Arquivos intocáveis confirmados**: `next.config.ts`, `app/globals.css`, `types/supabase.ts`.

---

## 10. Critérios de Aceite

- [ ] Cron dispara às 6h UTC sem intervenção manual
- [ ] Fazenda sem nenhum alerta ativo não recebe email
- [ ] Fazenda com 1+ alertas recebe exatamente 1 email por dia com todos os alertas consolidados
- [ ] Email contém link funcional para `NEXT_PUBLIC_APP_URL/dashboard`
- [ ] Chamada sem `Authorization` correto retorna `401`
- [ ] Falha em processar uma fazenda não impede o processamento das demais
- [ ] Todos os testes unitários passam sem conexão real ao Supabase
- [ ] `npm run build` sem erros TypeScript
- [ ] `npm run test` com 741+ testes passando (mínimo do projeto + novos testes desta feature)
