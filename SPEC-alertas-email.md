# SPEC — Alertas Proativos por Email

**Status**: Aguardando aprovação para implementação  
**Data**: 2026-05-24  
**Baseado em**: PRD-alertas-email.md (aprovado)

---

## 1. Arquivos a Criar ou Modificar

### 1.1 `vercel.json` — **CRIAR** (não existe no projeto)

Arquivo mínimo. A única responsabilidade deste arquivo neste momento é declarar o cron job para o Vercel. Não configurar rewrites, headers ou qualquer outra chave — o projeto já gerencia headers em `next.config.ts`.

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

> **Nota Vercel Hobby**: o plano Hobby suporta exatamente 1 cron por dia. Este schedule executa 1 vez/dia às 6h UTC (3h Brasília). Não adicionar outros crons sem upgrade de plano.

---

### 1.2 `app/api/cron/alertas/route.ts` — **CRIAR**

Responsabilidade: ponto de entrada HTTP `POST`. Autentica a requisição, instancia o cliente Supabase com service role, itera por todas as fazendas em paralelo, aciona verificação e envio de email para cada uma que tenha alertas.

Não contém lógica de negócio — delega tudo para `lib/services/alertas-email.ts`.

---

### 1.3 `lib/services/alertas-email.ts` — **CRIAR**

Responsabilidade: 4 funções de verificação de alertas + 1 função de composição. Cada função recebe `fazendaId` e o cliente Supabase como parâmetros (injeção de dependência para testabilidade). Não instancia clientes internamente, não envia email, não acessa variáveis de ambiente.

---

### 1.4 `lib/email/templates/alertas-fazenda.ts` — **CRIAR**

Responsabilidade: função pura que recebe nome da fazenda e array de alertas, e retorna uma string HTML pronta para envio. Sem side effects, sem dependências externas — apenas string interpolation.

Colocado em `lib/email/templates/` para manter consistência com `lib/email/resend.ts` (padrão de diretório já existente).

---

### 1.5 `__tests__/alertas-email/verificacoes.test.ts` — **CRIAR**

Responsabilidade: cobertura unitária das 5 funções exportadas por `lib/services/alertas-email.ts` com cliente Supabase mockado (sem conexão real). Segue o padrão `vi.fn()` já usado em `__tests__/assessoria/email.test.ts`.

---

### 1.6 `.env.local` (exemplo / `.env.example`) — **ATUALIZAR**

Adicionar `CRON_SECRET` com comentário. Não alterar o arquivo `.env.local` real — apenas o exemplo de referência.

---

## 2. Tipos TypeScript

Todos os tipos ficam em `lib/services/alertas-email.ts` (exportados), exceto o tipo do cliente Supabase que é importado de `@supabase/supabase-js`.

### 2.1 `TipoAlertaEmail`

```typescript
type TipoAlertaEmail =
  | 'autonomia_silagem'
  | 'perdas_silagem'
  | 'ocupacao_vencida'
  | 'piquete_pronto'
```

### 2.2 `AlertaEmail`

Unidade mínima de um alerta. O campo `detalhe` contém o texto em linguagem simples já formatado para inclusão direta no email (ex: "O silo **Norte** tem apenas **8 dias** de silagem restante.").

```typescript
export type AlertaEmail = {
  tipo: TipoAlertaEmail
  detalhe: string
}
```

### 2.3 `ResultadoVerificacaoFazenda`

Resultado agregado por fazenda após executar `verificarAlertasFazenda`. Usado pela API route para decidir se envia ou não o email.

```typescript
export type ResultadoVerificacaoFazenda = {
  fazendaId: string
  fazendaNome: string
  alertas: AlertaEmail[]
  adminEmail: string | null  // null quando fazenda não tem Admin cadastrado
}
```

### 2.4 `ResumoCronJob`

Retorno da API route `POST /api/cron/alertas`.

```typescript
type ResumoCronJob = {
  enviados: number      // fazendas que receberam email
  sem_alertas: number   // fazendas processadas sem nenhum alerta ativo
  erros: number         // fazendas que lançaram exceção durante o processamento
}
```

### 2.5 `SupabaseAdminClient`

Alias de tipo para o cliente com service role, aceito como parâmetro pelas funções de verificação.

```typescript
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

type SupabaseAdminClient = SupabaseClient<Database>
```

---

## 3. Assinaturas das Funções — `lib/services/alertas-email.ts`

### 3.1 `verificarAutonomiaSilagem`

```typescript
export async function verificarAutonomiaSilagem(
  fazendaId: string,
  supabase: SupabaseAdminClient
): Promise<AlertaEmail[]>
```

**Lógica**:

1. Buscar todos os silos da fazenda:
   ```sql
   SELECT id, nome FROM silos WHERE fazenda_id = $fazendaId
   ```

2. Para cada silo, em paralelo, buscar movimentações dos últimos 30 dias:
   ```sql
   SELECT quantidade_kg, tipo_movimento, subtipo
   FROM movimentacoes_silo
   WHERE silo_id = $siloId
     AND data >= NOW() - INTERVAL '30 days'
   ```
   Colunas explícitas: `quantidade_kg`, `tipo_movimento`, `subtipo`.

3. **Calcular estoque atual** — somatório histórico de TODAS as movimentações do silo (sem filtro de data), não apenas dos últimos 30 dias:
   ```sql
   SELECT quantidade_kg, tipo_movimento
   FROM movimentacoes_silo
   WHERE silo_id = $siloId
   ```
   - Entradas (`tipo_movimento = 'Entrada'`): somar `quantidade_kg`
   - Saídas (`tipo_movimento = 'Saída'`): subtrair `quantidade_kg`
   - `estoqueAtual = somaEntradas - somaSaidas` (em kg)
   - Converter para toneladas no texto do detalhe: `estoqueAtual / 1000`

4. **Calcular consumo médio diário** — usar apenas saídas dos últimos 30 dias, excluindo subtipos `'Descarte'` e `'Perda'`:
   ```
   consumoTotal30d = soma das saídas dos últimos 30d (excluindo Descarte/Perda)
   consumoDiario = consumoTotal30d / 30
   ```

5. **Critério de disparo**: se `consumoDiario === 0`, não retornar alerta para este silo (sem consumo → autonomia indefinida). Se `consumoDiario > 0`:
   ```
   autonomiaDias = estoqueAtual / consumoDiario
   ```
   Retornar alerta se `autonomiaDias < 30`.

6. **Texto do `detalhe`** (usar nome do silo e valor arredondado):
   ```
   "O silo **[nome]** tem apenas **[Math.floor(autonomiaDias)] dias** de silagem restante (abaixo do mínimo de 30 dias)."
   ```

**Retorno quando sem alertas**: `[]`

**Retorno de exemplo com alerta**:
```typescript
[{ tipo: 'autonomia_silagem', detalhe: 'O silo **Silo Norte** tem apenas **8 dias** de silagem restante (abaixo do mínimo de 30 dias).' }]
```

---

### 3.2 `verificarPerdasSilagem`

```typescript
export async function verificarPerdasSilagem(
  fazendaId: string,
  supabase: SupabaseAdminClient
): Promise<AlertaEmail[]>
```

**Lógica**:

1. Buscar silos da fazenda (id + nome).

2. Para cada silo, buscar saídas dos últimos 30 dias:
   ```sql
   SELECT quantidade_kg, subtipo
   FROM movimentacoes_silo
   WHERE silo_id = $siloId
     AND tipo_movimento = 'Saída'
     AND data >= NOW() - INTERVAL '30 days'
   ```

3. Calcular:
   ```
   totalSaidas = soma de todas as saídas (qualquer subtipo)
   totalPerdas = soma apenas das saídas com subtipo = 'Perda'
   taxaPerdas  = totalSaidas === 0 ? 0 : totalPerdas / totalSaidas
   ```

4. **Critério de disparo**: `taxaPerdas > 0.20` (estritamente maior que 20%).

5. **Texto do `detalhe`**:
   ```
   "O silo **[nome]** registrou **[Math.round(taxaPerdas * 100)]%** de perdas nos últimos 30 dias (acima do limite de 20%)."
   ```

**Retorno quando `totalSaidas === 0`**: `[]` (sem saídas = sem cálculo de perdas).

---

### 3.3 `verificarOcupacoesVencidas`

```typescript
export async function verificarOcupacoesVencidas(
  fazendaId: string,
  supabase: SupabaseAdminClient
): Promise<AlertaEmail[]>
```

**Lógica**:

1. Buscar ocupações abertas com prazo vencido, com join para obter o nome do piquete:
   ```sql
   SELECT
     ocupacoes_piquete.id,
     ocupacoes_piquete.data_saida_prevista,
     piquetes.nome
   FROM ocupacoes_piquete
   INNER JOIN piquetes ON piquetes.id = ocupacoes_piquete.piquete_id
   WHERE ocupacoes_piquete.fazenda_id = $fazendaId
     AND ocupacoes_piquete.data_saida_real IS NULL
     AND ocupacoes_piquete.data_saida_prevista < NOW()
   ```
   Colunas explícitas: `ocupacoes_piquete.id`, `ocupacoes_piquete.data_saida_prevista`, `piquetes.nome`.

   > **Nota de tipagem**: o join Supabase retorna `piquetes` como objeto (many-to-one). Ao iterar, usar `(row.piquetes as { nome: string }).nome` para evitar erro TypeScript.

2. Para cada linha retornada, gerar um `AlertaEmail`:

   **Texto do `detalhe`** — formatar data em pt-BR:
   ```
   "O piquete **[nome]** tem animais que deveriam ter saído em **[data_saida_prevista formatada]** e ainda estão ocupando o pasto."
   ```
   Usar `new Date(data_saida_prevista).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })`.

**Retorno quando sem ocupações vencidas**: `[]`

---

### 3.4 `verificarPiquetesProntos`

```typescript
export async function verificarPiquetesProntos(
  fazendaId: string,
  supabase: SupabaseAdminClient
): Promise<AlertaEmail[]>
```

> **Nome alterado em relação ao PRD**: o PRD usa `verificarPiquetesDescansoLongo` em alguns trechos e `verificarPiquetesProntos` em outros. Esta SPEC padroniza como `verificarPiquetesProntos` (nome mais descritivo do estado — piquete está pronto para receber animais).

**Lógica**:

1. Buscar piquetes em descanso com `updated_at` anterior a 3 dias atrás:
   ```sql
   SELECT id, nome, updated_at
   FROM piquetes
   WHERE fazenda_id = $fazendaId
     AND status = 'Descanso'
     AND updated_at < NOW() - INTERVAL '3 days'
   ```

2. Para cada piquete retornado, gerar um `AlertaEmail`:

   **Texto do `detalhe`**:
   ```
   "O piquete **[nome]** está em descanso há mais de 3 dias e pode estar pronto para receber animais."
   ```

**Threshold**: `updated_at < NOW() - INTERVAL '3 days'` — calculado no banco, não no JavaScript (evita drift de fuso horário).

**Retorno quando sem piquetes prontos**: `[]`

---

### 3.5 `verificarAlertasFazenda`

```typescript
export async function verificarAlertasFazenda(
  fazendaId: string,
  supabase: SupabaseAdminClient
): Promise<AlertaEmail[]>
```

**Lógica**:

Executa as 4 verificações em `Promise.all`. Cada verificação é envolvida em um bloco `try/catch` individual para que a falha de uma não cancele as demais:

```typescript
const resultados = await Promise.all([
  verificarAutonomiaSilagem(fazendaId, supabase).catch(err => {
    console.error(`[alertas-email] autonomia_silagem fazenda ${fazendaId}:`, err)
    return [] as AlertaEmail[]
  }),
  verificarPerdasSilagem(fazendaId, supabase).catch(err => {
    console.error(`[alertas-email] perdas_silagem fazenda ${fazendaId}:`, err)
    return [] as AlertaEmail[]
  }),
  verificarOcupacoesVencidas(fazendaId, supabase).catch(err => {
    console.error(`[alertas-email] ocupacao_vencida fazenda ${fazendaId}:`, err)
    return [] as AlertaEmail[]
  }),
  verificarPiquetesProntos(fazendaId, supabase).catch(err => {
    console.error(`[alertas-email] piquete_pronto fazenda ${fazendaId}:`, err)
    return [] as AlertaEmail[]
  }),
])
return resultados.flat()
```

**Retorno**: array concatenado de todos os alertas. Pode ser vazio se a fazenda não tiver nenhum alerta ativo.

---

## 4. API Route — `app/api/cron/alertas/route.ts`

### 4.1 Método HTTP

`POST` (padrão do Vercel Cron — o Vercel envia `POST` para o path configurado).

### 4.2 Validação de Autenticação

```typescript
const authHeader = request.headers.get('Authorization')
const cronSecret = process.env.CRON_SECRET

if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Comparação `!==` simples (não `timingSafeEqual`) — conforme PRD seção 6. O header é interno do Vercel, não exposto ao browser.

### 4.3 Cliente Supabase

Instanciar com service role para bypassar RLS:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

> `SUPABASE_SERVICE_ROLE_KEY` já existe no projeto (usada no backup automático). Não é variável nova.

### 4.4 Query de Fazendas

```sql
SELECT id, nome FROM fazendas
```

Sem filtro de status (todas as fazendas ativas no banco são processadas). Colunas explícitas: `id`, `nome`.

### 4.5 Query de Email do Admin

Para cada fazenda com alertas, buscar o email do Administrador:

```sql
SELECT auth.users.email
FROM profiles
INNER JOIN auth.users ON auth.users.id = profiles.id
WHERE profiles.fazenda_id = $fazendaId
  AND profiles.perfil = 'Administrador'
LIMIT 1
```

> **Implementação via Supabase SDK**: `profiles` não armazena email diretamente. O email está em `auth.users`. Usar `supabaseAdmin.auth.admin.listUsers()` filtrado pelo `id` do perfil, ou adicionar `email` à query de profiles se o projeto já faz join com `auth.users`. Verificar `types/supabase.ts` durante implementação para confirmar qual campo de email está disponível na view de profiles.

**Tratamento quando `adminEmail === null`**: logar `console.warn` e incrementar `sem_alertas` (não incrementar `erros`). Fazenda sem Admin cadastrado não é um erro do sistema.

### 4.6 Envio de Email

Usar `resend.emails.send` via o cliente já instanciado em `lib/email/resend.ts` (não o `fetch` direto usado em `lib/services/email.ts`). Importar `Resend` e instanciar localmente na route, ou exportar a instância `resend` de `lib/email/resend.ts`.

```typescript
await resend.emails.send({
  from: 'GestSilo <noreply@gestsilo.com.br>',
  to: adminEmail,
  subject: `⚠️ GestSilo — ${alertas.length} alerta(s) na sua fazenda`,
  html: gerarEmailAlertasFazenda(fazendaNome, alertas),
})
```

### 4.7 Loop Principal com `Promise.allSettled`

```typescript
const resultados = await Promise.allSettled(
  fazendas.map(async (fazenda) => {
    const alertas = await verificarAlertasFazenda(fazenda.id, supabaseAdmin)
    if (alertas.length === 0) return 'sem_alertas'

    const adminEmail = await buscarEmailAdmin(fazenda.id, supabaseAdmin)
    if (!adminEmail) {
      console.warn(`[cron/alertas] Fazenda ${fazenda.id} sem Admin cadastrado`)
      return 'sem_admin'
    }

    await resend.emails.send({ ... })
    return 'enviado'
  })
)
```

### 4.8 Resposta Final

```typescript
const contagem = { enviados: 0, sem_alertas: 0, erros: 0 }

for (const resultado of resultados) {
  if (resultado.status === 'rejected') {
    console.error('[cron/alertas] Falha em fazenda:', resultado.reason)
    contagem.erros++
  } else if (resultado.value === 'enviado') {
    contagem.enviados++
  } else {
    contagem.sem_alertas++
  }
}

return NextResponse.json(contagem, { status: 200 })
```

---

## 5. Template de Email — `lib/email/templates/alertas-fazenda.ts`

### 5.1 Assinatura

```typescript
export function gerarEmailAlertasFazenda(
  fazendaNome: string,
  alertas: AlertaEmail[]
): string
// Retorna HTML string completo (<!DOCTYPE html> ... </html>)
```

### 5.2 Estrutura HTML

Layout consistente com `lib/email/resend.ts` (inline styles, sem CSS externo, max-width 600px).

**Paleta** (design system do projeto — seção "Cores" do CLAUDE.md):
- Background externo: `#161616`
- Background do card: `#1c1c1c`
- Background do cabeçalho: `#222222`
- Cor de destaque (alertas): `#f5d000` (Alert Gold)
- Texto principal: `#ffffff`
- Texto secundário: `rgba(255,255,255,0.7)`
- Botão CTA: `#00A651` (verde primário do projeto — consistente com outros emails)
- Borda do bloco de alerta: `#f5d000`

**Seções em ordem**:

1. **Cabeçalho**
   - Fundo `#222222`, padding `28px 32px`, border-radius `12px 12px 0 0`
   - Texto "GestSilo" — branco, `22px`, `font-weight: 700`
   - Subtítulo "Plataforma de Gestão Agrícola" — `rgba(255,255,255,0.7)`, `13px`

2. **Corpo do card** — fundo `#1c1c1c`, padding `32px`, border-radius `0 0 12px 12px`

3. **Saudação**
   ```html
   <p>Olá, você tem <strong style="color:#f5d000">[N] alerta(s)</strong>
   na fazenda <strong>[fazendaNome]</strong> que precisam de atenção:</p>
   ```

4. **Lista de alertas** — um bloco por alerta:
   ```html
   <div style="border-left: 3px solid #f5d000; padding: 12px 16px;
               background: #222222; border-radius: 0 6px 6px 0;
               margin: 12px 0">
     <p style="color: #f5d000; font-weight: 700; margin: 0 0 4px; font-size: 13px">
       ⚠️ [TÍTULO CURTO POR TIPO]
     </p>
     <p style="color: #ffffff; margin: 0; font-size: 14px; line-height: 1.6">
       [alerta.detalhe]
     </p>
   </div>
   ```

   **Títulos curtos por `tipo`**:
   | `tipo` | Título |
   |---|---|
   | `autonomia_silagem` | Silagem com estoque baixo |
   | `perdas_silagem` | Alta taxa de perdas |
   | `ocupacao_vencida` | Animais além do prazo no piquete |
   | `piquete_pronto` | Piquete pronto para entrada |

5. **CTA**
   ```html
   <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
      style="display:inline-block; background:#00A651; color:#ffffff;
             font-weight:600; font-size:15px; padding:14px 32px;
             border-radius:8px; text-decoration:none; margin-top:24px">
     Ver no dashboard
   </a>
   ```
   > A função é pura — não acessa `process.env`. O `appUrl` deve ser passado como parâmetro adicional ou interpolado na chamada. Ver seção 5.3 abaixo.

6. **Rodapé**
   ```html
   <hr style="border:none; border-top:1px solid #333; margin:28px 0"/>
   <p style="color:rgba(255,255,255,0.4); font-size:12px; margin:0">
     Você recebe este email porque é Administrador da fazenda [fazendaNome].<br/>
     © 2026 GestSilo · Todos os direitos reservados
   </p>
   ```

### 5.3 Assinatura Revisada (com `appUrl`)

Para manter a função pura (sem `process.env` interno):

```typescript
export function gerarEmailAlertasFazenda(
  fazendaNome: string,
  alertas: AlertaEmail[],
  appUrl: string  // process.env.NEXT_PUBLIC_APP_URL passado pela route
): string
```

A route chama:
```typescript
gerarEmailAlertasFazenda(
  fazenda.nome,
  alertas,
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://gestsilo.com'
)
```

---

## 6. `vercel.json` — Detalhamento

**Não existe no projeto** (confirmado via Glob). Criar com estrutura mínima:

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

**Não adicionar** outras chaves (`rewrites`, `headers`, `redirects`, `functions`) — o projeto já configura headers em `next.config.ts` e rewrites não estão em uso. Arquivo limpo evita conflitos com a configuração automática do Vercel para Next.js.

---

## 7. Testes — `__tests__/alertas-email/verificacoes.test.ts`

### 7.1 Padrão de Mock

Seguir o padrão de `__tests__/assessoria/email.test.ts`: usar `vi.fn()` do Vitest para simular as chamadas do Supabase. Não conectar ao Supabase real.

```typescript
function criarSupabaseMock(dados: unknown) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: dados, error: null }),
        // encadeamentos adicionais conforme necessário
      }),
    }),
  } as unknown as SupabaseAdminClient
}
```

### 7.2 Casos de Teste — `verificarAutonomiaSilagem`

| # | Cenário | Setup | Expectativa |
|---|---|---|---|
| 1 | Silo com autonomia < 30 dias | Estoque 5.000 kg, consumo 30 dias = 3.000 kg (100 kg/dia), autonomia ≈ 50d → NÃO dispara. Novo: consumo = 6.000 kg (200 kg/dia), autonomia = 25d | Retorna 1 alerta `autonomia_silagem` |
| 2 | Silo com autonomia ≥ 30 dias | Estoque 10.000 kg, consumo 30d = 3.000 kg (100 kg/dia), autonomia = 100d | Retorna `[]` |
| 3 | Autonomia exatamente 30 dias (boundary) | Estoque 3.000 kg, consumo 30d = 3.000 kg (100 kg/dia), autonomia = 30d | Retorna `[]` (não é `< 30`, é `=== 30`) |
| 4 | Sem movimentações nos últimos 30 dias | Saídas últimos 30d = 0, `consumoDiario = 0` | Retorna `[]` (divisão por zero protegida) |
| 5 | Dois silos: um abaixo, um ok | Dois silos com dados diferentes | Retorna 1 alerta (apenas o silo abaixo do threshold) |

### 7.3 Casos de Teste — `verificarPerdasSilagem`

| # | Cenário | Setup | Expectativa |
|---|---|---|---|
| 1 | Perdas > 20% | Total saídas = 1.000 kg, subtipo Perda = 250 kg, taxa = 25% | Retorna 1 alerta `perdas_silagem` |
| 2 | Perdas ≤ 20% | Total saídas = 1.000 kg, Perda = 200 kg, taxa = 20% | Retorna `[]` (boundary: não é `> 0.20`) |
| 3 | Perdas = 0 | Nenhuma saída com subtipo Perda | Retorna `[]` |
| 4 | Sem saídas nos últimos 30 dias | `totalSaidas = 0` | Retorna `[]` (proteção divisão por zero) |

### 7.4 Casos de Teste — `verificarOcupacoesVencidas`

| # | Cenário | Setup | Expectativa |
|---|---|---|---|
| 1 | Ocupação com prazo vencido e `data_saida_real = null` | `data_saida_prevista = 5 dias atrás`, `data_saida_real = null` | Retorna 1 alerta `ocupacao_vencida` com nome do piquete |
| 2 | Ocupação com `data_saida_real` preenchida | Prazo vencido mas `data_saida_real` não null | Retorna `[]` (query já filtra `IS NULL`) |
| 3 | Prazo futuro | `data_saida_prevista = amanhã`, `data_saida_real = null` | Retorna `[]` |
| 4 | Múltiplas ocupações vencidas | 3 ocupações vencidas | Retorna 3 alertas |
| 5 | Nenhuma ocupação vencida | Query retorna `[]` | Retorna `[]` |

### 7.5 Casos de Teste — `verificarPiquetesProntos`

| # | Cenário | Setup | Expectativa |
|---|---|---|---|
| 1 | Piquete Descanso com `updated_at` > 3 dias atrás | Status `Descanso`, `updated_at = 4 dias atrás` | Retorna 1 alerta `piquete_pronto` |
| 2 | Piquete Descanso com `updated_at` recente | Status `Descanso`, `updated_at = 2 dias atrás` | Retorna `[]` (query já filtra no banco — mock retorna `[]`) |
| 3 | Piquete com status diferente de Descanso | Status `Em pastejo`, `updated_at = 10 dias atrás` | Retorna `[]` (query já filtra por status) |
| 4 | Nenhum piquete pronto | Query retorna `[]` | Retorna `[]` |

### 7.6 Casos de Teste — `verificarAlertasFazenda`

| # | Cenário | Setup | Expectativa |
|---|---|---|---|
| 1 | Fazenda sem nenhum alerta | Todas as 4 funções retornam `[]` | Retorna `[]` |
| 2 | Fazenda com todos os alertas | Cada função retorna 1 alerta | Retorna array de 4 alertas (tipos distintos) |
| 3 | Exceção em uma verificação não cancela demais | `verificarPerdasSilagem` lança Error | Retorna alertas das outras 3 funções; falha logada via `console.error` |
| 4 | Dois alertas do mesmo tipo | `verificarOcupacoesVencidas` retorna 2 itens | Retorna 2 alertas `ocupacao_vencida` no array final |

### 7.7 Casos de Teste — `gerarEmailAlertasFazenda`

| # | Cenário | Verificação |
|---|---|---|
| 1 | Email com 1 alerta | HTML contém o nome da fazenda, "1 alerta(s)", `⚠️`, link do dashboard |
| 2 | Email com múltiplos alertas | HTML contém `${N} alerta(s)` onde N = `alertas.length` |
| 3 | Cada tipo tem título correto | Para `autonomia_silagem`, HTML contém "Silagem com estoque baixo" |
| 4 | CTA aponta para dashboard | HTML contém `${appUrl}/dashboard` |
| 5 | Nome da fazenda no rodapé | HTML contém "Administrador da fazenda [nome]" |

---

## 8. Variável de Ambiente — `CRON_SECRET`

### 8.1 Onde Adicionar

No arquivo de exemplo de variáveis do projeto (`.env.local` com valores placeholder ou `.env.example` se existir).

### 8.2 Entrada a Adicionar

```bash
# Segredo para autenticar o Vercel Cron Job na API route POST /api/cron/alertas
# Gerar com: openssl rand -hex 32
# Configurar também em: Vercel Dashboard → Settings → Environment Variables
CRON_SECRET=
```

### 8.3 Variáveis Já Existentes (sem alteração necessária)

| Variável | Status |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Confirmar que está no Vercel (usada no backup GitHub Actions — pode não estar no Vercel env) |
| `RESEND_API_KEY` | Já existe (módulo Assessoria) |
| `NEXT_PUBLIC_APP_URL` | Já existe |
| `NEXT_PUBLIC_SUPABASE_URL` | Já existe |

> **Ação necessária antes de deploy**: verificar no Vercel Dashboard se `SUPABASE_SERVICE_ROLE_KEY` está configurada em Environment Variables. O backup usa GitHub Secrets, não Vercel env.

---

## 9. Impacto em Arquivos Existentes

| Arquivo | Tipo de mudança | Detalhe |
|---|---|---|
| `vercel.json` | **CRIAR** | Arquivo novo com apenas o bloco `crons` |
| `lib/email/resend.ts` | **NENHUMA** — não alterar | Apenas exportar `resend` instance se necessário, ou recriar localmente na route |
| `lib/services/email.ts` | **NENHUMA** | Arquivo existente para assessoria — não tocar |
| `next.config.ts` | **NENHUMA** | Regra inviolável |
| `app/globals.css` | **NENHUMA** | Regra inviolável |
| `types/supabase.ts` | **NENHUMA** | Gerado automaticamente |

---

## 10. Ordem de Implementação

A implementação deve seguir esta sequência para que cada camada seja validável antes da próxima:

1. **Tipos** — declarar `AlertaEmail`, `ResultadoVerificacaoFazenda`, `ResumoCronJob` em `lib/services/alertas-email.ts`
2. **Funções de verificação** — implementar as 4 funções + `verificarAlertasFazenda`
3. **Testes** — escrever e passar todos os casos de `__tests__/alertas-email/verificacoes.test.ts`
4. **Template** — implementar `gerarEmailAlertasFazenda` em `lib/email/templates/alertas-fazenda.ts`
5. **API route** — implementar `app/api/cron/alertas/route.ts`
6. **vercel.json** — criar com o cron declarado
7. **Build final** — `npm run build` + `npm run test` (741+ testes)

---

## 11. Critérios de Aceite (rastreados do PRD)

- [ ] `vercel.json` declara cron `0 6 * * *` apontando para `/api/cron/alertas`
- [ ] `POST /api/cron/alertas` sem header `Authorization` correto retorna `401`
- [ ] Fazenda sem alertas ativos não recebe email (contada em `sem_alertas`)
- [ ] Fazenda com 1+ alertas recebe exatamente 1 email consolidado
- [ ] Falha em processar uma fazenda não interrompe as demais (`Promise.allSettled`)
- [ ] Exceção em uma das 4 verificações não cancela as outras 3 (`.catch` individual)
- [ ] Email contém `${NEXT_PUBLIC_APP_URL}/dashboard` como link do CTA
- [ ] Subject do email: `⚠️ GestSilo — [N] alerta(s) na sua fazenda`
- [ ] Todos os testes unitários passam sem conexão real ao Supabase
- [ ] `npm run build` sem erros TypeScript
- [ ] `npm run test` com 741+ testes passando
