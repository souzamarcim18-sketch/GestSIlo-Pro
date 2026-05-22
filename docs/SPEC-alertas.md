# SPEC — Card "Alertas Críticos" (Dashboard)

> **Documento gerado em:** 2026-05-21  
> **Baseado em:** PRD-alertas.md  
> **Status:** Pronto para implementação

---

## 1. Tipos TypeScript

### 1.1 `AlertaCritico` — adicionar em `app/dashboard/dashboard-data.ts`

```typescript
export type AlertaTipo =
  | 'operacao_atrasada'
  | 'silagem_baixa_autonomia'
  | 'silagem_perdas_elevadas'
  | 'manutencao_pendente'
  | 'insumo_critico'
  | 'insumo_urgente'
  | 'produto_urgente'
  | 'vacinacao_vencida'
  | 'vacinacao_urgente';

export type AlertaSeveridade = 'critico' | 'urgente' | 'aviso';

export interface AlertaCritico {
  id: string;              // slug único: ex. "operacao_atrasada_0", "insumo_critico_abc-uuid"
  tipo: AlertaTipo;
  severidade: AlertaSeveridade;
  mensagem: string;        // texto principal: ex. "Adubação atrasada — Talhão Norte"
  detalhe?: string;        // texto secundário: ex. "2,5 kg (mín: 50 kg)"
  href: string;            // rota de destino ao clicar
}
```

### 1.2 Novos campos numéricos em `DashboardData` — adicionar em `dashboard-data.ts`

Os campos abaixo complementam os strings já existentes com os valores brutos necessários para a lógica de derivação:

```typescript
export interface DashboardData {
  // ... campos existentes ...

  // Campos numéricos brutos (novos)
  silosAutonomiaDiasNum: number | null;   // null quando consumoDiario === 0
  silosTaxaPerdasNum: number | null;      // null quando totalSaidas === 0; valor em % (0–100)
  manutencoesPendentesCount: number;      // valor bruto de manutRes.count

  // Alertas derivados (novos)
  alertas: AlertaCritico[];
}
```

### 1.3 Tipos auxiliares para as novas queries (Etapa 2)

Esses tipos são usados apenas internamente em `page.tsx` para tipar as respostas das queries; não precisam ser exportados.

```typescript
// Retorno da query de insumos
type InsumoAlertaRow = {
  id: string;
  nome: string;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
};

// Retorno da query de manutenções
type ManutencaoAlertaRow = {
  id: string;
  proxima_manutencao: string;   // ISO date
  status: string;
  maquinas: { nome: string } | null;
};

// Retorno da query de produtos
type ProdutoAlertaRow = {
  id: string;
  nome: string;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
};

// Reusar AlertaSanitario de lib/types/rebanho-sanitario.ts (já tem dias_para_vencimento)
```

---

## 2. Lógica de Derivação — Etapa 1 (função pura)

### 2.1 Assinatura

Função pura a ser declarada em `app/dashboard/page.tsx`, logo antes da construção do objeto `data`. Não acessa banco, não tem efeitos colaterais.

```typescript
function derivarAlertasEtapa1(params: {
  proximasOperacoes: ProximaOperacaoComBadge[];
  autonomiaDiasNum: number | null;
  taxaPerdasNum: number | null;
  manutencoesPendentesCount: number;
}): AlertaCritico[]
```

### 2.2 Regras por alerta

**Operações atrasadas**
- Fonte: `proximasOperacoes` (já disponível)
- Condição: `op.status === 'Atrasado'` (case-sensitive, conforme `getStatusBadgeColor` em DashboardClient)
- Severidade: `'critico'`
- Mensagem: `"${op.tipo_operacao} — ${op.talhao_nome}"`
- Detalhe: `"Previsto para ${formatarDataBR(op.data_esperada)}"`
- href: `'/dashboard/talhoes'`
- `id`: `operacao_atrasada_${index}`

**Baixa autonomia de silagem**
- Fonte: `autonomiaDiasNum`
- Condição: `autonomiaDiasNum !== null && autonomiaDiasNum < 30`
- Severidade: `autonomiaDiasNum < 10 ? 'critico' : 'urgente'`
- Mensagem: `"Estoque de silagem crítico"`
- Detalhe: `"Autonomia estimada: ${autonomiaDiasNum} dias"`
- href: `'/dashboard/silos'`
- `id`: `'silagem_baixa_autonomia'`

**Taxa de perdas elevada**
- Fonte: `taxaPerdasNum`
- Condição: `taxaPerdasNum !== null && taxaPerdasNum > 10`
- Severidade: `taxaPerdasNum > 20 ? 'critico' : 'urgente'`
- Mensagem: `"Taxa de perdas de silagem elevada"`
- Detalhe: `"${taxaPerdasNum.toFixed(1)}% dos últimos 30 dias"`
- href: `'/dashboard/silos'`
- `id`: `'silagem_perdas_elevadas'`

**Manutenções pendentes**
- Fonte: `manutencoesPendentesCount`
- Condição: `manutencoesPendentesCount > 0`
- Severidade: `'aviso'`
- Mensagem: `"${manutencoesPendentesCount} manutenção(ões) pendente(s) no mês"`
- Detalhe: `undefined`
- href: `'/dashboard/frota'`
- `id`: `'manutencao_pendente'`

### 2.3 Ordem de retorno

A função retorna os alertas na ordem em que são derivados acima. A ordenação final por severidade é feita em uma etapa posterior (ver seção 4.3).

---

## 3. Novas Queries — Etapa 2

Todas adicionadas ao `Promise.all` existente em `page.tsx`. Variáveis de data disponíveis em `page.tsx`:

- `hoje` — `string` ISO (`YYYY-MM-DD`)
- Calcular `proximosSete` e `proximosQuinze` com o mesmo padrão das variáveis existentes.

### 3.1 Insumos abaixo do mínimo

**Query SDK:**
```typescript
supabase
  .from('insumos')
  .select('id, nome, unidade, estoque_atual, estoque_minimo')
  .eq('fazenda_id', fazendaId)
  .eq('ativo', true)
  .lt('estoque_atual', 'estoque_minimo')
  // Nota: filtro coluna < coluna não é suportado diretamente pelo SDK.
  // Alternativa 1 (preferida): usar RPC existente
  //   supabase.rpc('get_insumos_abaixo_minimo', { p_fazenda_id: fazendaId })
  // Alternativa 2: buscar todos ativos e filtrar em JS pós-query
  //   .select(...).eq('fazenda_id', fazendaId).eq('ativo', true)
  //   depois: .filter((i) => i.estoque_atual < i.estoque_minimo)
```

**Decisão:** usar `.rpc('get_insumos_abaixo_minimo', { p_fazenda_id: fazendaId })` — função já existente no banco, evita buscar registros desnecessários.

**Formato de retorno esperado:** `InsumoAlertaRow[]`

**Derivação dos alertas:**
```
Para cada insumo:
  severidade = estoque_atual === 0 ? 'critico' : 'urgente'
  tipo = estoque_atual === 0 ? 'insumo_critico' : 'insumo_urgente'
  mensagem = `${insumo.nome} — Estoque ${estoque_atual === 0 ? 'esgotado' : 'abaixo do mínimo'}`
  detalhe = `${estoque_atual} ${unidade} (mín: ${estoque_minimo} ${unidade})`
  href = '/dashboard/insumos'
  id = `insumo_${insumo.id}`
```

### 3.2 Manutenções vencidas ou urgentes

**Variável auxiliar:** `proximosSete` = `hoje + 7 dias` (string ISO `YYYY-MM-DD`)

**Query SDK:**
```typescript
supabase
  .from('manutencoes')
  .select('id, proxima_manutencao, status, maquinas(nome)')
  .eq('fazenda_id', fazendaId)
  .neq('status', 'concluida')
  .lte('proxima_manutencao', proximosSete)
  .order('proxima_manutencao', { ascending: true })
  .limit(5)
```

**Formato de retorno esperado:** `ManutencaoAlertaRow[]`

**Derivação dos alertas:**
```
Para cada manutenção:
  vencida = proxima_manutencao <= hoje
  tipo = vencida ? 'manutencao_vencida' : 'manutencao_urgente'
  severidade = vencida ? 'critico' : 'urgente'
  nomeMaquina = maquinas?.nome ?? 'Máquina sem nome'
  mensagem = vencida
    ? `Manutenção vencida — ${nomeMaquina}`
    : `Manutenção em ${diasRestantes(proxima_manutencao)} dia(s) — ${nomeMaquina}`
  detalhe = `Prevista para ${formatarDataBR(proxima_manutencao)}`
  href = '/dashboard/frota'
  id = `manutencao_${manutencao.id}`
```

> **Atenção:** A query da Etapa 1 (`manutRes`) conta manutenções do mês inteiro sem filtrar por `status`. Esta nova query Etapa 2 é mais precisa e **substitui** a lógica de "manutenções pendentes" do alerta Etapa 1 (seção 2.2, último item). Portanto, ao implementar a Etapa 2, o alerta `manutencao_pendente` derivado em Etapa 1 deve ser removido da função pura — evitar duplicidade.

### 3.3 Vacinações vencendo (próximos 15 dias)

**Fonte:** `listAlertasVacinacao(15)` de `lib/supabase/rebanho-sanitario.ts`

> **Problema de dois clientes:** essa função instancia internamente `createSupabaseServerClient()`. Para evitar dois clientes na mesma requisição, **inlinar a query** usando o cliente `supabase` já instanciado em `page.tsx`:

**Variável auxiliar:** `proximosQuinze` = `hoje + 15 dias` (string ISO `YYYY-MM-DD`)

**Query SDK equivalente (inlinada):**
```typescript
supabase
  .from('eventos_sanitarios')
  .select('id, animal_id, tipo, vacina_nome, data_proxima_dose, animais(brinco, nome)')
  .eq('tipo', 'vacinacao')
  .is('deleted_at', null)
  .lte('data_proxima_dose', proximosQuinze)
  .order('data_proxima_dose', { ascending: true })
  .limit(10)
  // RLS filtra por fazenda_id automaticamente via sou_admin_ou_visualizador()
```

**Formato de retorno esperado:**
```typescript
{
  id: string;
  animal_id: string;
  vacina_nome: string | null;
  data_proxima_dose: string;      // ISO date
  animais: { brinco: string | null; nome: string | null } | null;
}[]
```

**Derivação dos alertas:**
```
Para cada vacinação:
  diasParaVencimento = daysBetween(hoje, data_proxima_dose)  // negativo = vencida
  vencida = diasParaVencimento < 0
  tipo = vencida ? 'vacinacao_vencida' : 'vacinacao_urgente'
  severidade = vencida ? 'critico' : 'urgente'
  nomeAnimal = animais?.nome ?? animais?.brinco ?? 'Animal sem identificação'
  mensagem = vencida
    ? `Vacinação vencida há ${Math.abs(diasParaVencimento)} dia(s) — ${nomeAnimal}`
    : `Vacinação em ${diasParaVencimento} dia(s) — ${nomeAnimal}`
  detalhe = vacina_nome ?? 'Vacina não especificada'
  href = '/dashboard/rebanho/sanidade'
  id = `vacinacao_${vacinacao.id}`
```

**Helper auxiliar (declarar em `page.tsx`):**
```typescript
function daysBetween(de: string, ate: string): number {
  return Math.floor(
    (new Date(ate).getTime() - new Date(de).getTime()) / (1000 * 60 * 60 * 24)
  );
}
```

### 3.4 Produtos abaixo do mínimo

**Query SDK:**
```typescript
supabase
  .from('produtos')
  .select('id, nome, unidade, estoque_atual, estoque_minimo')
  .eq('fazenda_id', fazendaId)
  .eq('ativo', true)
  // filtro coluna < coluna: buscar e filtrar em JS pós-query
```

> Não existe RPC equivalente ao `get_insumos_abaixo_minimo` para produtos. Estratégia: buscar todos ativos com `estoque_minimo > 0` e filtrar em JS.

**Query corrigida:**
```typescript
supabase
  .from('produtos')
  .select('id, nome, unidade, estoque_atual, estoque_minimo')
  .eq('fazenda_id', fazendaId)
  .eq('ativo', true)
  .gt('estoque_minimo', 0)   // só produtos com mínimo definido
```

**Filtro JS pós-query:**
```typescript
(produtosRes.data ?? []).filter((p) => p.estoque_atual < p.estoque_minimo)
```

**Derivação dos alertas:**
```
Para cada produto:
  tipo = 'produto_urgente'
  severidade = 'urgente'
  mensagem = `${produto.nome} — Estoque abaixo do mínimo`
  detalhe = `${estoque_atual} ${unidade} (mín: ${estoque_minimo} ${unidade})`
  href = '/dashboard/produtos'
  id = `produto_${produto.id}`
```

---

## 4. Interface do Card em `DashboardClient.tsx`

### 4.1 Estado: sem alertas (`alertas.length === 0`)

Manter exatamente o layout atual:

```
[ícone CheckCircle2 verde, 56×56px, fundo success/15]
"Tudo em ordem!"       ← font-bold, text-foreground
"Não há alertas..."    ← text-xs, text-muted-foreground
```

### 4.2 Estado: com alertas

Substituir o bloco estático por uma lista de até 5 itens. Layout de cada item:

```
┌─────────────────────────────────────────────────┐
│ [ícone 16px]  Mensagem principal          href → │
│               Detalhe (text-xs, muted)           │
└─────────────────────────────────────────────────┘
```

**Ícone por severidade:**

| Severidade | Ícone Lucide   | Cor                    | Fundo                  |
|------------|---------------|------------------------|------------------------|
| `critico`  | `AlertCircle` | `text-status-danger`   | `bg-status-danger/10`  |
| `urgente`  | `AlertTriangle`| `text-status-warning` | `bg-status-warning/10` |
| `aviso`    | `Info`        | `text-status-info`     | `bg-status-info/10`    |

**Cada item é clicável** (via `router.push(alerta.href)`), comportamento idêntico ao `KpiCard`.

**Overflow (mais de 5 alertas):**

Se `alertas.length > 5`, exibir apenas os 5 primeiros e, abaixo da lista, uma linha:

```
"+N alertas adicionais"   ← text-xs, text-muted-foreground, alinhado à direita
```

Sem link "Ver tudo" por enquanto (módulo de alertas centralizado está fora do escopo).

### 4.3 Ordenação antes de renderizar

Ordenar `data.alertas` no Client Component antes do `.slice(0, 5)`:

```typescript
const ORDEM_SEVERIDADE: Record<AlertaSeveridade, number> = {
  critico: 0,
  urgente: 1,
  aviso: 2,
};

const alertasOrdenados = [...data.alertas].sort(
  (a, b) => ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade]
);
const alertasExibidos = alertasOrdenados.slice(0, 5);
const alertasOcultos = alertasOrdenados.length - alertasExibidos.length;
```

### 4.4 Tipografia

Seguir o padrão obrigatório do design system:
- Título do card: `text-lg font-semibold` (já existente, não alterar)
- Mensagem do alerta: `text-sm font-medium`
- Detalhe do alerta: `text-xs text-muted-foreground`
- Contador overflow: `text-xs text-muted-foreground`

Nenhum valor px/rem inline. Nenhuma cor hardcoded.

---

## 5. Alterações em `page.tsx`

### 5.1 Novas variáveis de data (antes do `Promise.all`)

Adicionar após a declaração de `proximosDiasStr`:

```typescript
const proximosSete = new Date(now);
proximosSete.setDate(now.getDate() + 7);
const proximosSeteStr = proximosSete.toISOString().split('T')[0];

const proximosQuinze = new Date(now);
proximosQuinze.setDate(now.getDate() + 15);
const proximosQuinzeStr = proximosQuinze.toISOString().split('T')[0];
```

### 5.2 Novas queries no `Promise.all` (Etapa 2)

Adicionar ao final do array do `Promise.all` existente:

```typescript
// Etapa 2 — 4 novas queries (paralelas com as existentes)
supabase.rpc('get_insumos_abaixo_minimo', { p_fazenda_id: fazendaId }),   // insumosAlertaRes
supabase                                                                    // manutencoesAlertaRes
  .from('manutencoes')
  .select('id, proxima_manutencao, status, maquinas(nome)')
  .eq('fazenda_id', fazendaId)
  .neq('status', 'concluida')
  .lte('proxima_manutencao', proximosSeteStr)
  .order('proxima_manutencao', { ascending: true })
  .limit(5),
supabase                                                                    // vacinacoesAlertaRes
  .from('eventos_sanitarios')
  .select('id, animal_id, vacina_nome, data_proxima_dose, animais(brinco, nome)')
  .eq('tipo', 'vacinacao')
  .is('deleted_at', null)
  .lte('data_proxima_dose', proximosQuinzeStr)
  .order('data_proxima_dose', { ascending: true })
  .limit(10),
supabase                                                                    // produtosAlertaRes
  .from('produtos')
  .select('id, nome, unidade, estoque_atual, estoque_minimo')
  .eq('fazenda_id', fazendaId)
  .eq('ativo', true)
  .gt('estoque_minimo', 0),
```

### 5.3 Novos campos numéricos brutos

Adicionar junto ao bloco de silagem (após a declaração de `silosAutonomiaDias`):

```typescript
// Etapa 1 — valores numéricos brutos para derivação de alertas
const silosAutonomiaDiasNum = autonomiaDias;                // number | null (já existe no cálculo)
const silosTaxaPerdasNum = totalSaidas > 0 ? (totalDescarte / totalSaidas) * 100 : null;
const manutencoesPendentesCount = manutRes.count ?? 0;     // já existe como variável local
```

> `autonomiaDias` já é calculado em `page.tsx` mas descartado na string. `silosTaxaPerdasNum` reusa os mesmos `totalDescarte` e `totalSaidas` já calculados.

### 5.4 Construção do array `alertas`

Adicionar após todos os blocos de cálculo, antes da declaração `const data: DashboardData`:

```typescript
// Etapa 1 — alertas derivados de dados já disponíveis
const alertasEtapa1 = derivarAlertasEtapa1({
  proximasOperacoes,
  autonomiaDiasNum: silosAutonomiaDiasNum,
  taxaPerdasNum: silosTaxaPerdasNum,
  // manutencoesPendentesCount omitido na Etapa 2 (substituído pela query refinada)
});

// Etapa 2 — alertas de insumos
const insumosAbaixoMinimo = (insumosAlertaRes.data ?? []) as InsumoAlertaRow[];
const alertasInsumos: AlertaCritico[] = insumosAbaixoMinimo.map((i, idx) => ({
  id: `insumo_${i.id}`,
  tipo: i.estoque_atual === 0 ? 'insumo_critico' : 'insumo_urgente',
  severidade: i.estoque_atual === 0 ? 'critico' : 'urgente',
  mensagem: `${i.nome} — Estoque ${i.estoque_atual === 0 ? 'esgotado' : 'abaixo do mínimo'}`,
  detalhe: `${i.estoque_atual} ${i.unidade} (mín: ${i.estoque_minimo} ${i.unidade})`,
  href: '/dashboard/insumos',
}));

// Etapa 2 — alertas de manutenções refinadas
const manutencoesVencidas = (manutencoesAlertaRes.data ?? []) as ManutencaoAlertaRow[];
const alertasManutencao: AlertaCritico[] = manutencoesVencidas.map((m) => {
  const vencida = m.proxima_manutencao <= hoje;
  const nomeMaquina = (m.maquinas as { nome: string } | null)?.nome ?? 'Máquina sem nome';
  const diasRestantes = daysBetween(hoje, m.proxima_manutencao);
  return {
    id: `manutencao_${m.id}`,
    tipo: vencida ? 'manutencao_vencida' : 'manutencao_urgente',
    severidade: vencida ? 'critico' : 'urgente',
    mensagem: vencida
      ? `Manutenção vencida — ${nomeMaquina}`
      : `Manutenção em ${diasRestantes} dia(s) — ${nomeMaquina}`,
    detalhe: `Prevista para ${new Date(m.proxima_manutencao).toLocaleDateString('pt-BR')}`,
    href: '/dashboard/frota',
  };
});

// Etapa 2 — alertas de vacinações
const vacinacoesVencendo = (vacinacoesAlertaRes.data ?? []) as VacinacaoAlertaRow[];
const alertasVacinacao: AlertaCritico[] = vacinacoesVencendo.map((v) => {
  const dias = daysBetween(hoje, v.data_proxima_dose);
  const vencida = dias < 0;
  const nomeAnimal = v.animais?.nome ?? v.animais?.brinco ?? 'Animal sem identificação';
  return {
    id: `vacinacao_${v.id}`,
    tipo: vencida ? 'vacinacao_vencida' : 'vacinacao_urgente',
    severidade: vencida ? 'critico' : 'urgente',
    mensagem: vencida
      ? `Vacinação vencida há ${Math.abs(dias)} dia(s) — ${nomeAnimal}`
      : `Vacinação em ${dias} dia(s) — ${nomeAnimal}`,
    detalhe: v.vacina_nome ?? 'Vacina não especificada',
    href: '/dashboard/rebanho/sanidade',
  };
});

// Etapa 2 — alertas de produtos
const produtosAbaixoMinimo = ((produtosAlertaRes.data ?? []) as ProdutoAlertaRow[])
  .filter((p) => p.estoque_atual < p.estoque_minimo);
const alertasProdutos: AlertaCritico[] = produtosAbaixoMinimo.map((p) => ({
  id: `produto_${p.id}`,
  tipo: 'produto_urgente',
  severidade: 'urgente',
  mensagem: `${p.nome} — Estoque abaixo do mínimo`,
  detalhe: `${p.estoque_atual} ${p.unidade} (mín: ${p.estoque_minimo} ${p.unidade})`,
  href: '/dashboard/produtos',
}));

const alertas: AlertaCritico[] = [
  ...alertasEtapa1,
  ...alertasInsumos,
  ...alertasManutencao,
  ...alertasVacinacao,
  ...alertasProdutos,
];
```

### 5.5 Adicionar ao objeto `data`

```typescript
const data: DashboardData = {
  // ... campos existentes ...
  silosAutonomiaDiasNum,
  silosTaxaPerdasNum,
  manutencoesPendentesCount,
  alertas,
};
```

---

## 6. Alterações em `DashboardClient.tsx`

### 6.1 Novos imports

```typescript
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { AlertaCritico, AlertaSeveridade } from './dashboard-data';
```

> Remover `AlertTriangle` do import existente se já estiver importado — consolidar.

### 6.2 Constantes de configuração do card (declarar fora do componente)

```typescript
const ORDEM_SEVERIDADE: Record<AlertaSeveridade, number> = {
  critico: 0,
  urgente: 1,
  aviso: 2,
};

const ALERTA_CONFIG: Record<AlertaSeveridade, {
  Icon: React.ElementType;
  iconClass: string;
  bgClass: string;
}> = {
  critico:  { Icon: AlertCircle,   iconClass: 'text-status-danger',   bgClass: 'bg-status-danger/10'   },
  urgente:  { Icon: AlertTriangle, iconClass: 'text-status-warning',  bgClass: 'bg-status-warning/10'  },
  aviso:    { Icon: Info,          iconClass: 'text-status-info',     bgClass: 'bg-status-info/10'     },
};
```

### 6.3 Substituição do bloco estático (linhas 250–261)

O bloco atual:

```tsx
<Card className="bg-card rounded-2xl p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
  <h2 className="text-lg font-semibold text-foreground mb-4">Alertas Críticos</h2>
  <div className="flex flex-col items-center text-center">
    <div className="w-14 h-14 bg-status-success/15 rounded-full flex items-center justify-center mb-4">
      <CheckCircle2 className="w-7 h-7 text-status-success" aria-hidden="true" />
    </div>
    <p className="font-bold text-foreground mb-1">Tudo em ordem!</p>
    <p className="text-xs text-muted-foreground leading-relaxed">
      Não há alertas críticos ou manutenções pendentes para hoje.
    </p>
  </div>
</Card>
```

Deve ser substituído por JSX que implementa os dois estados (seções 4.1 e 4.2). A lógica de ordenação e slice fica dentro do JSX ou em variáveis locais calculadas imediatamente antes do `return`.

### 6.4 Lógica de renderização (pseudocódigo estrutural)

```
alertasOrdenados = [...data.alertas].sort(por severidade)
alertasExibidos  = alertasOrdenados.slice(0, 5)
alertasOcultos   = alertasOrdenados.length - alertasExibidos.length

if alertasExibidos.length === 0:
  → renderizar estado "Tudo em ordem" (idêntico ao atual)
else:
  → renderizar lista:
    para cada alerta em alertasExibidos:
      config = ALERTA_CONFIG[alerta.severidade]
      → item clicável com ícone + mensagem + detalhe
    se alertasOcultos > 0:
      → "X alertas adicionais" (text-xs, muted, direita)
```

---

## 7. Arquivos a Modificar

| Arquivo | Mudança | Etapa |
|---|---|---|
| [app/dashboard/dashboard-data.ts](../app/dashboard/dashboard-data.ts) | Adicionar `AlertaTipo`, `AlertaSeveridade`, `AlertaCritico`; adicionar 3 campos numéricos e `alertas` em `DashboardData` | 1 + 2 |
| [app/dashboard/page.tsx](../app/dashboard/page.tsx) | Adicionar `proximosSeteStr`/`proximosQuinzeStr`; adicionar 4 queries ao `Promise.all`; expor `silosAutonomiaDiasNum`, `silosTaxaPerdasNum`; declarar `derivarAlertasEtapa1`, `daysBetween`; construir `alertas`; passar ao `data` | 1 + 2 |
| [app/dashboard/DashboardClient.tsx](../app/dashboard/DashboardClient.tsx) | Adicionar imports; declarar `ORDEM_SEVERIDADE`, `ALERTA_CONFIG`; substituir card estático por lógica dinâmica | 1 + 2 |

**Nenhum arquivo novo. Nenhuma migration de banco. Nenhuma função SQL nova.**

---

## 8. Observações de Implementação

### 8.1 Compatibilidade com perfil Operador

O perfil Operador acessa `/dashboard` normalmente. As queries de insumos e produtos retornarão arrays vazios por RLS (`sou_admin_ou_visualizador()`). Nenhuma lógica condicional de perfil necessária no código — RLS resolve silenciosamente.

### 8.2 `AlertaTipo` expande o tipo do PRD

O PRD propunha `manutencao_vencida` e `manutencao_urgente` como tipos separados. Este SPEC mantém essa separação para granularidade futura. O campo `tipo` em `AlertaCritico` é informativo (para analytics ou filtragem futura) — a UI renderiza apenas a partir da `severidade`.

### 8.3 Evitar duplicidade na transição Etapa 1 → Etapa 2

A Etapa 1 deriva `manutencao_pendente` a partir de `manutencoesPendentesCount`. A Etapa 2 substitui esse alerta por alertas individuais por máquina vindos da query refinada. Ao implementar a Etapa 2, remover o item `manutencao_pendente` de `derivarAlertasEtapa1` para evitar alertas duplicados.

### 8.4 `autonomiaDias` já calculado

A variável `autonomiaDias` (tipo `number | null`) já existe em `page.tsx` (linha 173) mas não é exposta no `DashboardData`. O novo campo `silosAutonomiaDiasNum` é simplesmente `autonomiaDias` repassado — custo zero.

### 8.5 Testes

Nenhum novo teste de integração necessário (sem nova lógica de banco). Adicionar testes unitários para:
- `derivarAlertasEtapa1` — cobrir os 4 cenários (atrasada, autonomia crítica, autonomia urgente, perdas)
- Função auxiliar `daysBetween` — valores positivos, negativos e zero
