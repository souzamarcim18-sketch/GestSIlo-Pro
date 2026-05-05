# Fase 3 — Integração Wizard Planejamento com Rebanho: PRD

**Status**: 📋 Especificação  
**Data**: 2026-05-05  
**Branch**: `feat/rebanho-modulo` (após merge de Fase 2)  
**Impacto**: Fluxo do usuário (wizard) + schema (planejamentos_silagem + rebanho_snapshot)  

---

## 1. Objetivo da Fase 3

Integrar dados reais do rebanho (Fase 2) ao **planejador de silagem** (Etapa 2 — Rebanho), substituindo entrada manual de categorias por **pré-preenchimento automático com projeção futura**. Usuários visualizam composição atual/projetada do rebanho sem abandonar o fluxo manual quando não assinam o plano que inclui Gestão de Rebanho.

**Resultado esperado**: wizard mais inteligente, menos digitação, dados mais precisos — mantendo retrocompatibilidade com simulações antigas e flexibilidade para usuários sem módulo de rebanho.

---

## 2. Contexto: Estado Atual vs. Desejado

### Hoje (Etapa 2 Rebanho — Manual)
```
┌─────────────────────────────────┐
│ Etapa 2: Rebanho                │
│                                 │
│ Categoria        Qtd. Cabeças    │
│ ─────────────────────────────    │
│ Vaca Lactando    [  __  ]        │ ← usuário digita manualmente
│ Vaca Seca        [  __  ]        │
│ Novilha          [  __  ]        │
│ ...                              │
│                                 │
│ [Voltar]              [Próximo] │
└─────────────────────────────────┘
```

**Problemas**:
- Usuário com rebanho cadastrado precisa lembrar/procurar números
- Nenhuma validação vs. realidade
- Simulação não preserva contexto (qual data essa composição representa?)

### Desejado (Etapa 2 com Projeção)
```
┌──────────────────────────────────────────────────┐
│ Etapa 2: Rebanho — Com Dados Reais               │
│                                                  │
│ ✓ Rebanho detectado! Projetado para [20/06/2026]│
│                                                  │
│ [🔄 Ajustar Manualmente]  [📅 Alterar Data]     │
│                                                  │
│ Categoria         Projetado    Atual    Editar   │
│ ────────────────────────────────────────────    │
│ Vaca Lactando      42           40      [↕]      │
│ Vaca Seca          8            8       [↕]      │
│ Novilha            15           14      [↕]      │
│ Bezerro            20           18      [↕]      │
│ ...                                              │
│                                                  │
│ Total: 85 cabeças (5 partos previstos para jun)  │
│                                                  │
│ [Voltar]                          [Próximo]     │
└──────────────────────────────────────────────────┘

Se sem rebanho cadastrado:
┌──────────────────────────────────────────────────┐
│ Etapa 2: Rebanho                                 │
│                                                  │
│ 📌 Você ainda não tem rebanho cadastrado.        │
│ Deseja cadastrar agora ou continuar manualmente? │
│                                                  │
│ [Cadastrar Rebanho]  [Continuar Manual]          │
│                                                  │
│ Categoria        Qtd. Cabeças                   │
│ ─────────────────────────────────                │
│ Vaca Lactando    [  __  ]                       │
│ ...                                              │
│                                                  │
│ [Voltar]                          [Próximo]     │
└──────────────────────────────────────────────────┘
```

**Ganhos**:
- ✅ Pré-preenchimento automático (reduz input do usuário 80%)
- ✅ Projeção dinâmica (considera partos previstos, mudanças de categoria por idade)
- ✅ Editável: usuário pode ajustar manualmente se discordar
- ✅ Retrocompatível: usuários sem rebanho continuam usando modo manual
- ✅ Snapshot preservado: simulação grava estado do rebanho como era na data da projeção

---

## 3. Função de Projeção: Composição do Rebanho em Data Alvo

### Assinatura Conceitual
```typescript
function projetarRebanhoEmData(
  rebanho_atual: Animal[],        // estado real de hoje
  partos_previstos: PartoEventoReproducao[],  // eventos futuros
  data_alvo: Date,                // quando projetar
  categorias_possíveis: Categoria[] // mapping idade/status → categoria
): RebanhoProjetado {
  return {
    composicao: Map<categoria_id, quantidade_projetada>,
    data_calculo: new Date(),
    data_alvo,
    fatores_aplicados: {
      partos_inclusos: number,
      mudancas_categoria: number,
      desvios_desconhecidos: string[]  // lista de animais que não conseguiu projetar
    }
  }
}
```

### Lógica de Cálculo

**Entrada**:
- Lista de animais cadastrados (`animais` table) com status/categoria atuais
- Eventos reprodutivos (especialmente partos confirmados em `eventos_reproducao_parto`)
- Data-alvo do planejamento (default = hoje, mas customizável)

**Processamento** (em ordem):

1. **Base**: contar animais por categoria (status atual)
2. **Partos previstos**: se evento parto com `data_evento ≤ data_alvo`:
   - Incrementa categoria de cria esperada (sexo da cria determina: fêmea → Novilha, macho → descarte/venda)
   - Muda mãe de categoria se aplicável (ex: Vaca Lactando pós-parto permanece Lactando)
3. **Mudanças de categoria por idade**: se animal `data_nascimento + idade_transição ≤ data_alvo`:
   - Transição Bezerro → Novilha (ex: 6 meses)
   - Transição Novilha → Vaca Lactando (ex: primeira cobertura confirmada + gestação)
4. **Status morto/vendido**: excluir de projeção se `evento tipo Descarte/Venda com data ≤ data_alvo`

**Saída**: mapa `{ categoria_id → quantidade }`

### Exemplo
```
Data-alvo: 20/06/2026 (45 dias no futuro)

Animais hoje:
- 40 Vacas Lactando
- 8 Vacas Secas
- 14 Novilhas
- 18 Bezerros

Partos previstos até 20/06:
- 3 partos confirmados (fêmea)
- 2 partos confirmados (macho)

Mudanças por idade:
- 3 bezerros completam 6 meses → viram Novilhas
- 2 novilhas completam cobertura → viram Vacas (se diagnóstico positivo)

Projeção resultado:
- 40 Vacas Lactando (mantém) + 3 (novo parto fêmea) = 43
- 8 Vacas Secas
- 14 Novilhas (mantém) + 3 (novo parto fêmea) + 3 (idade 6m) + 2 (cobertura) = 22
- 18 Bezerros (mantém) - 3 (saem) - 2 (macho, descarte) = 13
```

---

## 4. Fluxo UI/UX: "Detectar → Pré-Preencher → Editar"

### 4.1 Detecção de Rebanho Cadastrado

Quando usuário entra em Etapa 2:

```typescript
// Server Action no início do wizard
const { rebanho_detectado, data_ultimo_animal } = await detectarRebanho();

if (rebanho_detectado) {
  // Obter projeção para data de hoje (customizável)
  const projetado = await projetarRebanhoEmData(
    data_alvo: new Date(),
    considerarPartos: true
  );
  
  setState({
    modo: 'PROJETADO',
    rebanho: projetado.composicao,
    dataProjecao: projetado.data_alvo,
    podeAjustar: true
  });
} else {
  setState({
    modo: 'MANUAL',
    rebanho: {},
    avisoRebanhoVazio: true
  });
}
```

### 4.2 Renderização Condicional

```tsx
// Etapa2Rebanho.tsx (refatorado)
export function Etapa2Rebanho({ wizard, onNext, onBack }) {
  
  if (rebanhoDetectado && !ajusteManualAtivado) {
    return (
      <>
        {/* Cabeçalho com aviso de projeção */}
        <Alert variant="success">
          ✓ Rebanho detectado! Projetado para {dataProjecao.toLocaleDateString('pt-BR')}
        </Alert>
        
        {/* Toggle para ajuste manual */}
        <div>
          <label>
            <input 
              type="checkbox" 
              checked={ajusteManualAtivado}
              onChange={() => setAjusteManualAtivado(true)}
            />
            Ajustar Manualmente
          </label>
          <button onClick={() => mudarDataProjecao()}>
            📅 Alterar Data
          </button>
        </div>
        
        {/* Tabela com colunas: Projetado | Atual | Editar */}
        <Table>
          {categorias.map(cat => (
            <tr key={cat.id}>
              <td>{cat.nome}</td>
              <td className="text-right">{projetado[cat.id]}</td>
              <td className="text-right">{atual[cat.id]}</td>
              <td>
                <input 
                  disabled={!ajusteManualAtivado}
                  value={quantidades[cat.id]}
                  onChange={(e) => setQuantidades({...})}
                />
              </td>
            </tr>
          ))}
        </Table>
      </>
    );
  }
  
  // Fluxo manual (sem rebanho ou após desativar projeção)
  return (
    <>
      {!rebanhoDetectado && (
        <Alert>
          📌 Você ainda não tem rebanho cadastrado.
          Deseja{' '}
          <Link href="/dashboard/rebanho/animais">
            cadastrar agora
          </Link>
          {' '}ou{' '}
          <button onClick={() => setAjusteManualAtivado(true)}>
            continuar manualmente
          </button>
          ?
        </Alert>
      )}
      
      {/* Tabela simples (como hoje) */}
      <Table>
        {/* ... */}
      </Table>
    </>
  );
}
```

### 4.3 Alteração de Data de Projeção

Diálogo opcional:
```
┌──────────────────────────────┐
│ Projetar para qual data?     │
│                              │
│ Data: [20/06/2026]    📅     │
│                              │
│ Sugestões:                   │
│ • Hoje (05/05/2026)          │
│ • 30 dias (04/06/2026)       │
│ • 60 dias (04/07/2026)       │
│                              │
│ [Cancelar]     [Projetar]    │
└──────────────────────────────┘
```

Ao mudar data: re-calcular projeção, atualizar tabela de pré-preenchimento.

---

## 5. Snapshot: Preservação de Contexto

### 5.1 Schema da Tabela `planejamentos_silagem`

Adicionar coluna:

```sql
ALTER TABLE planejamentos_silagem
ADD COLUMN rebanho_snapshot JSONB DEFAULT NULL;
```

### 5.2 Conteúdo do Snapshot

```typescript
interface RebanhoSnapshot {
  // Identificação
  data_calculo: string;  // ISO 8601, quando o cálculo foi feito
  data_projecao: string; // ISO 8601, para qual data foi projetado
  
  // Composição
  composicao: {
    [categoria_id: string]: number  // ex: { "vaca_lactando": 42, "vaca_seca": 8 }
  };
  
  // Auditoria
  total_cabecas: number;
  total_animais_base: number;        // quantos animais existiam em data_calculo
  partos_inclusos_na_projecao: number;
  mudancas_categoria_inclusos: number;
  
  // Metadados
  modo: 'PROJETADO' | 'MANUAL';  // como foi preenchido
  usuario_editou: boolean;        // se usuário editou manualmente após projeção
}
```

### 5.3 Persistência

```typescript
// actions.ts (refatorado)
export async function savePlanejamentoAction(
  payload: Omit<PlanejamentoSilagem, 'id' | 'created_at' | 'fazenda_id'>,
  rebanhoSnapshot?: RebanhoSnapshot
) {
  // Gravar snapshot junto com planejamento
  const resultado = await qServer.planejamentosSilagem.create({
    ...payload,
    rebanho_snapshot: rebanhoSnapshot || null
  });
  
  return resultado;
}
```

### 5.4 Retrocompatibilidade

Simulações antigas (criadas antes de Fase 3) não terão `rebanho_snapshot`:

```typescript
// Ao carregar histórico
const simulacao = await getPlanejamentoAction(id);

if (!simulacao.rebanho_snapshot) {
  // Simulação manual antiga
  console.log('Criada manualmente, sem projeção de rebanho');
} else {
  // Simulação de Fase 3+
  console.log(`Projetada para ${simulacao.rebanho_snapshot.data_projecao}`);
}
```

---

## 6. Regra de Acesso: Modo Manual Mesmo Sem Plano de Rebanho

**Crítico**: se usuário não assina plano que inclui "Gestão de Rebanho", ele **não acessa** módulo `app/dashboard/rebanho/*`, mas **continua acessando planejador**.

### 6.1 Fluxo de Detecção

```typescript
async function detectarRebanho() {
  try {
    // Tentar buscar animais
    const animais = await listAnimais({ limit: 1 });
    
    return {
      rebanho_detectado: animais.length > 0,
      data_ultimo_animal: animais[0]?.created_at
    };
  } catch (error) {
    if (error.status === 403) {
      // RLS bloqueou: usuário sem acesso ao módulo
      return {
        rebanho_detectado: false,
        razao: 'sem_plano'
      };
    }
    throw error;
  }
}
```

### 6.2 UI: CTA Inteligente

```tsx
if (!rebanhoDetectado && razao === 'sem_plano') {
  return (
    <Alert>
      📌 Para usar projeção automática de rebanho, 
      assine um plano que inclua <strong>Gestão de Rebanho</strong>.
      <br />
      <Link href="/dashboard/configuracoes/planos">
        Ver planos →
      </Link>
      <br />
      Enquanto isso, <button>continuar com entrada manual</button>.
    </Alert>
  );
}
```

---

## 7. Critérios de Aceite

### Detectar Rebanho
- [ ] Server Action `detectarRebanho()` retorna `{ rebanho_detectado: boolean, ... }`
- [ ] Diferencia entre "rebanho vazio" e "sem acesso ao módulo" (403)
- [ ] Consulta < 200ms (cache se necessário)

### Projetar Composição
- [ ] Função `projetarRebanhoEmData()` calcula corretamente:
  - [ ] Base de animais por categoria (status atual)
  - [ ] Partos confirmados com data ≤ data_alvo (incrementa Novilha/Bezerro)
  - [ ] Mudanças de categoria por idade (Bezerro→Novilha, Novilha→Vaca)
  - [ ] Exclusão de mortos/vendidos
- [ ] Tempo de cálculo < 300ms (mesmo para rebanho > 500 cabeças)
- [ ] Testes cobrem: rebanho vazio, 1 parturiente, 10+ parturientes, data futura > 1 ano

### UI/UX: Pré-Preenchimento
- [ ] Tabela Etapa2Rebanho exibe:
  - [ ] Alertas verdes quando rebanho detectado
  - [ ] Colunas "Projetado | Atual | Editar"
  - [ ] Inputs desabilitados até checkbox "Ajustar Manualmente"
  - [ ] Botão "Alterar Data" funciona (re-projeta)
- [ ] Fluxo sem rebanho mostra CTA claro ("cadastrar agora" ou "continuar manual")
- [ ] Fluxo sem plano mostra aviso com link para upgrade

### Snapshot & Persistência
- [ ] `planejamentos_silagem.rebanho_snapshot` preenchido ao salvar (Fase 3+)
- [ ] Snapshot inclui: `data_calculo`, `data_projecao`, `composicao`, `modo`, `usuario_editou`
- [ ] Histórico carrega simulação com snapshot e exibe "(projetado em 20/06)"
- [ ] Simulações antigas carregam sem erro (snapshot = null)

### Retrocompatibilidade
- [ ] Usuários com plano "Manual Apenas" conseguem usar planejador normalmente
- [ ] Simulações criadas em Fase 2 (sem snapshot) continuam visíveis no histórico
- [ ] Re-editar simulação antiga não sobrescreve dados (apenas edição de nome/parâmetros)

### Testes & Performance
- [ ] 100+ testes: validações, projeção, UI, RLS
- [ ] Testes de projeção: rebanho pequeno (10 cabeças), médio (100), grande (500+)
- [ ] Load test: 100 simulações no histórico carregam < 500ms
- [ ] Lighthouse: sem regressão (LCP, CLS, FCP)

---

## 8. Pontos em Aberto

### 8.1 Cálculo de Mudanças de Categoria por Idade
- **Quando Novilha vira Vaca Lactando?**
  - Opção A: após diagnóstico de prenhez positivo (mais conservador)
  - Opção B: após eventos reprodutivos (cobertura ou diagnóstico, mais otimista)
  - **Proposta**: Opção A (diagnóstico positivo = prenhe, pronta para primeira lactação)
  - **Decisão**: ❓ validar com especialista em reprodução

### 8.2 Partos de Machos
- **Descarte imediato ou criar categoria Bezerro Macho?**
  - Leite: macho recém-nascido é descarte/venda
  - Corte: macho recém-nascido vira Bezerro (estoque até venda)
  - **Proposta**: consultar `sistema.tipo_rebanho` na projeção; se Leite, não contar macho; se Corte, contar
  - **Decisão**: ❓ confirmar com cliente

### 8.3 Trigger vs. Server Action
- **Onde calcular a projeção?**
  - Opção A: Server Action no wizard (requer 1 call ao inicializar; mais flexível)
  - Opção B: Postgres function (rápido, mas inflexível para ajustes futuros)
  - **Proposta**: Server Action (Etapa2Rebanho carrega com `.revalidate(300)`)
  - **Decisão**: ✅ recomendado

### 8.4 Cache de Projeção
- **Guardar projeção em cache local (IndexedDB)?**
  - Se sim: evita refetch ao voltar para Etapa 2, mas precisa invalidação
  - Se não: mais seguro, mas refetch a cada re-entrada
  - **Proposta**: cache no `WizardState` (já é state local), invalidar se usuário mudar data
  - **Decisão**: ✅ no React state

### 8.5 Edição em Histórico
- **Se usuário edita simulação antiga (com snapshot), preserve snapshot original?**
  - Opção A: sim, manter histórico (snapshot imutável, edição é atributo separado)
  - Opção B: não, regerar snapshot novo (semântica: simulação agora reflete edição)
  - **Proposta**: Opção A (preservar + flag `usuario_editou`)
  - **Decisão**: ❓ a decidir com time

### 8.6 Integração com Notificações
- **Avisar usuário se projeção incluir muitos partos (ex: > 20 crias)?**
  - Proposta: Toast informativo, não bloqueante
  - **Decisão**: ❓ opcional para Fase 3.1

### 8.7 Export/Relatório
- **Incluir snapshot no PDF de simulação?**
  - Proposta: sim, rodapé com "Rebanho projetado em 20/06/2026: 85 cabeças"
  - **Decisão**: ❓ Fase 3.1 (pós-MVP)

---

## Próximos Passos

1. **Decisões Arquiteturais** (24h):
   - Validar 8.1, 8.2 com especialista
   - Confirmar 8.3, 8.5 com PM

2. **Estimativa de Esforço**:
   - Função `projetarRebanhoEmData()` + testes: **4h**
   - Refatoração Etapa2Rebanho + UI: **6h**
   - Schema + snapshot + migration: **2h**
   - Testes integrais + performance: **4h**
   - **Total**: ~16h (2 dias)

3. **Branch & PR**:
   - Base: `feat/rebanho-modulo` (após Fase 2 merged)
   - Nome: `feat/rebanho/fase-3-integracao-wizard`

4. **Validação**:
   - [ ] 100+ testes passando
   - [ ] Lighthouse ≥ 82/100
   - [ ] Retrocompatibilidade verificada
   - [ ] Load test com 500+ cabeças < 300ms
