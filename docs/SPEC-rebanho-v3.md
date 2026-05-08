# SPEC-rebanho-v3.md — Refatoração do Módulo Rebanho (3ª Iteração)

**Data:** 2026-05-08  
**Versão:** 3.0  
**Baseado em:** `BUGS-rebanho.md` (auditoria completa) + `CLAUDE.md` + `database-snapshot.md`  
**Status:** PENDENTE DE REVISÃO

---

## 1. RESUMO EXECUTIVO

### O que vai mudar (5 linhas)
1. **Sidebar**: Remover submenu de Rebanho (8 sub-rotas colapsam para 1 item)
2. **Rota crítica faltando**: Criar `/rebanho/[id]/evento` para registrar eventos por animal
3. **Hub de reprodução**: Criar `/rebanho/reproducao` com 3 abas (Eventos, Reprodutores, Parâmetros)
4. **Página hub redesenhada**: Substituir botões pequenos por 6 cards grandes (grid responsivo)
5. **Tipos corrigidos**: Completar enum `TipoEvento` (7 valores faltando) + validar `StatusAnimal` vs banco

### O que NÃO vai mudar
- ❌ Schema do banco (zero migrations necessárias)
- ❌ Server Actions existentes (apenas criar 1 novo para registro de eventos)
- ❌ Queries Supabase core (apenas adicionar validações/filtros onde necessário)
- ❌ Estrutura de pastas (pasta `rebanho` permanece igual, apenas novas páginas dentro)
- ❌ RLS policies (todas já existem e funcionam)
- ❌ Tabelas do rebanho (`animais`, `eventos_rebanho`, `lotes`, etc.) já têm índices

### Critérios de aceitação global
✅ `npm run build` verde sem erros TS (exceto 1 erro pre-existente fora do rebanho)  
✅ `npm run test` — 646+ testes passando  
✅ Zero `as any` no módulo `rebanho/`  
✅ Zero warnings `exhaustive-deps` no módulo `rebanho/`  
✅ Zero `select('*')` em queries  
✅ Smoke test manual:
  - Criar animal novo
  - Clicar "Registrar Evento" → navega para `/rebanho/[id]/evento` (não 404)
  - Registrar 1 evento
  - Navegar para `/rebanho/reproducao` → abas funcionam
  - Voltar ao hub → 6 cards grandes visíveis

---

## 2. ARQUITETURA FINAL DESEJADA

### Diagrama Sidebar (antes vs depois)

```
❌ ANTES
Sidebar
└── Rebanho (expandível)
    ├── Indicadores
    ├── Reprodução (aponta para /reproducao/eventos)
    ├── Reprodutores (aponta para /reproducao/reprodutores)
    ├── Parâmetros (aponta para /reproducao/parametros)
    ├── Leiteira
    ├── Corte
    ├── Sanidade
    └── Movimentações

✅ DEPOIS
Sidebar
└── Rebanho (simples, sem expansão)
    └── aponta para /dashboard/rebanho
```

### Diagrama Rotas (antes vs depois)

```
❌ ANTES
/dashboard/rebanho (hub)
├── /indicadores
├── /reproducao/eventos
├── /reproducao/reprodutores
├── /reproducao/parametros
├── /leiteira
├── /corte
├── /sanidade
└── /movimentacoes

✅ DEPOIS
/dashboard/rebanho (hub)
├── /rebanho/indicadores
├── /rebanho/reproducao (NOVO — hub com abas)
│   ├── /eventos (embutido em abas)
│   ├── /reprodutores (embutido em abas)
│   └── /parametros (embutido em abas)
├── /rebanho/[id]/evento (NOVO — criar/editar evento)
├── /rebanho/leiteira
├── /rebanho/corte
├── /rebanho/sanidade
└── /rebanho/movimentacoes
```

### Mapa de navegação interna da página hub `/rebanho`

```
┌─────────────────────────────────────────────────────────────┐
│  PÁGINA HUB /dashboard/rebanho (está hoje, será redesenhada) │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [SEÇÃO 1] BLOCOS DE ACESSO RÁPIDO (Grid 2-3 colunas)       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ 📊 Indicadores │  │ ❤️ Reprodução │  │ 🥛 Leiteira   │       │
│  │ link →        │  │ link →        │  │ link →        │       │
│  │ /indicadores  │  │ /reproducao   │  │ /leiteira     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ ⚖️ Corte      │  │ 🩺 Sanidade   │  │ ↔️ Movimentações│   │
│  │ link →        │  │ link →        │  │ link →        │       │
│  │ /corte        │  │ /sanidade     │  │ /movimentacoes│       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  [SEÇÃO 2] CABEÇALHO DE LISTAGEM                             │
│  "Gestão de Rebanho" + [Novo Animal] [Lotes] [Importar CSV] │
├─────────────────────────────────────────────────────────────┤
│  [SEÇÃO 3] FILTROS (ja existe)                              │
│  Brinco | Status | Tipo Rebanho | Sexo | Lote | Categoria   │
├─────────────────────────────────────────────────────────────┤
│  [SEÇÃO 4] TABELA DE ANIMAIS (ja existe)                    │
│  Brinco | Nome | Sexo | Status | Tipo | Categoria | Ações   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. MUDANÇAS POR ARQUIVO (SEÇÃO MAIS IMPORTANTE)

### Arquivo: `components/Sidebar.tsx`
**Tipo:** MODIFICAR  
**Motivação:** BUGS-rebanho.md, seção 5A — Remover lógica de submenu Rebanho (linhas 270-284)

**O que muda:**

```
[linhas 270-284] REMOVER bloco inteiro que renderiza rebanhoSubRoutes
  if (route.label === 'Rebanho' && pathname.startsWith('/dashboard/rebanho')) {
    <ul className="space-y-0.5 list-none mt-1">
      {rebanhoSubRoutes.map(...)}
    </ul>
  }

[linhas 74-83] COMENTAR (não deletar yet, em caso de rollback) array rebanhoSubRoutes
  // const rebanhoSubRoutes: RouteItem[] = [
  //   { label: 'Indicadores', ... },
  //   ...
  // ];

[resultado] Linha 53 permanece:
  { label: 'Rebanho', icon: PawPrint, href: '/dashboard/rebanho', badge: null }
```

**Dependências:**
- Importação: Nenhuma mudança
- Exportação: Nenhuma mudança
- Afeta: UI da sidebar (renderização), não afeta routing

**Riscos:**
- ❌ RLS: Nenhum (UI pura)
- ⚠️ Usuários em `/dashboard/rebanho/indicadores` + refresh → caem no `/dashboard/rebanho` (esperado, é o novo hub)

**Validação:**
1. Sidebar abre
2. Item "Rebanho" não expande (sem submenu)
3. Clique em "Rebanho" → navega para `/dashboard/rebanho`
4. Browser back/forward funciona

---

### Arquivo: `app/dashboard/rebanho/page.tsx`
**Tipo:** MODIFICAR  
**Motivação:** BUGS-rebanho.md, seção 6.1A — Redesenhar layout com 6 cards grandes

**O que muda:**

```
[linhas 127-164] REMOVER botões pequenos (tamanho "sm")
  <div className="flex gap-2 flex-wrap">
    <Link href="/dashboard/rebanho/indicadores">
      <Button variant="outline" size="sm">...</Button>
    </Link>
    ...
  </div>

[novo, após linha 125] ADICIONAR seção com 6 cards grandes (grid responsivo)
  <div className="mb-8">
    <h2 className="text-xl font-bold mb-4">Acesso Rápido</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      
      {/* Card 1: Indicadores */}
      <Link href="/dashboard/rebanho/indicadores">
        <Card className="h-32 cursor-pointer hover:shadow-lg hover:bg-accent/50 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Indicadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Dashboard com KPIs e 4 alertas proativos
            </p>
          </CardContent>
        </Card>
      </Link>

      {/* Card 2: Reprodução */}
      <Link href="/dashboard/rebanho/reproducao">
        <Card className="h-32 cursor-pointer hover:shadow-lg hover:bg-accent/50 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="h-5 w-5" />
              Reprodução
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Calendário reprodutivo, eventos, reprodutores
            </p>
          </CardContent>
        </Card>
      </Link>

      {/* Card 3: Leiteira */}
      <Link href="/dashboard/rebanho/leiteira">
        <Card className="h-32 cursor-pointer hover:shadow-lg hover:bg-accent/50 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Milk className="h-5 w-5" />
              Leiteira
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Registro e curva de lactação
            </p>
          </CardContent>
        </Card>
      </Link>

      {/* Card 4: Corte */}
      <Link href="/dashboard/rebanho/corte">
        <Card className="h-32 cursor-pointer hover:shadow-lg hover:bg-accent/50 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scale className="h-5 w-5" />
              Corte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              GMD, arrobas, projeção de abate
            </p>
          </CardContent>
        </Card>
      </Link>

      {/* Card 5: Sanidade */}
      <Link href="/dashboard/rebanho/sanidade">
        <Card className="h-32 cursor-pointer hover:shadow-lg hover:bg-accent/50 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="h-5 w-5" />
              Sanidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Vacinação, sanitários, alertas
            </p>
          </CardContent>
        </Card>
      </Link>

      {/* Card 6: Movimentações */}
      <Link href="/dashboard/rebanho/movimentacoes">
        <Card className="h-32 cursor-pointer hover:shadow-lg hover:bg-accent/50 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="h-5 w-5" />
              Movimentações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Entradas, saídas, transferências
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  </div>
```

**Dependências:**
- Importação: `Link` (já importado), `Heart`, `Milk`, `Scale`, `Stethoscope`, `ArrowRightLeft` (já em lucide-react)
- Exportação: Nenhuma
- Afeta: Renderização da página (UI pura)

**Riscos:**
- ❌ RLS: Nenhum
- ⚠️ Tamanho bundle: +200 bytes (negligenciável)

**Validação:**
1. Página carrega
2. Grid responsivo: 1 coluna mobile, 2 tablet, 3 desktop
3. Cards com hover visual (sombra + bg color)
4. Clique em cada card → navega para rota correta
5. Abaixo dos cards, listagem de animais permanece visível

---

### Arquivo: `app/dashboard/rebanho/[id]/page.tsx`
**Tipo:** MODIFICAR  
**Motivação:** BUGS-rebanho.md, seção 3A.1 — Botão "Registrar Evento" aponta para rota inexistente (linha 361)

**O que muda:**

```
[linha 361] Alterar rota navegação
  ANTES: router.push(`/dashboard/rebanho/${animalId}/evento`)
  DEPOIS: router.push(`/dashboard/rebanho/${animalId}/evento`)
  
  (URL permanece igual, mas agora a rota EXISTS)
```

**Dependências:**
- Nenhuma mudança no código deste arquivo
- A rota `/rebanho/[id]/evento` será criada em novo arquivo

**Riscos:**
- ✅ Zero — apenas validação que rota será criada

**Validação:**
1. Abrir ficha de animal (ex: `/dashboard/rebanho/abc-123`)
2. Botão "Registrar Evento" visível (depende de `canRegisterEvent`)
3. Clique no botão → navega para `/dashboard/rebanho/abc-123/evento` (não 404)

---

### Arquivo: `app/dashboard/rebanho/reproducao/page.tsx`
**Tipo:** CRIAR  
**Motivação:** BUGS-rebanho.md, seção 3A.2 — Hub de reprodução com 3 abas não existe

**O que muda:**

```
[novo arquivo] Criar página com componente Tabs do shadcn/ui
  - Arquivo: app/dashboard/rebanho/reproducao/page.tsx
  - Tipo: Client Component ('use client' — possui estado Tabs)
  - Conteúdo:
  
  'use client';

  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
  import EventosPage from './eventos/page';
  import ReprodutoresPage from './reprodutores/page';
  import ParametrosPage from './parametros/page';

  export default function ReproducaoHub() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reprodução</h1>
          <p className="text-muted-foreground mt-1">
            Gestão de eventos reprodutivos, reprodutores e parâmetros
          </p>
        </div>

        <Tabs defaultValue="eventos" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="eventos">Eventos</TabsTrigger>
            <TabsTrigger value="reprodutores">Reprodutores</TabsTrigger>
            <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
          </TabsList>

          <TabsContent value="eventos" className="space-y-4">
            <EventosPage />
          </TabsContent>

          <TabsContent value="reprodutores" className="space-y-4">
            <ReprodutoresPage />
          </TabsContent>

          <TabsContent value="parametros" className="space-y-4">
            <ParametrosPage />
          </TabsContent>
        </Tabs>
      </div>
    );
  }
```

**Dependências:**
- Importação: `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` (shadcn/ui — já existem)
- Importação: 3 páginas filhas (já existem em subpastas)
- Exportação: Nenhuma

**Riscos:**
- ❌ RLS: Nenhum (UI pura)
- ⚠️ Layout: Se alguma sub-página usa layout.tsx, verificar se conflita

**Validação:**
1. Navegar para `/dashboard/rebanho/reproducao`
2. 3 abas visíveis (Eventos, Reprodutores, Parâmetros)
3. Clicar em aba → conteúdo muda
4. URL não muda (abas locais, não rotas)
5. Back/forward do browser funciona (estado preservado)

---

### Arquivo: `app/dashboard/rebanho/[id]/evento/page.tsx`
**Tipo:** CRIAR  
**Motivação:** BUGS-rebanho.md, seção 3A.1 — Rota crítica faltando para registrar eventos

**O que muda:**

```
[novo arquivo] Criar página para formulário de evento
  - Arquivo: app/dashboard/rebanho/[id]/evento/page.tsx
  - Tipo: Client Component ('use client' — possui formulário)
  - Conteúdo:

  'use client';

  import { useState } from 'react';
  import { useRouter, useParams } from 'next/navigation';
  import { Button } from '@/components/ui/button';
  import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
  import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
  import { Input } from '@/components/ui/input';
  import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
  import { Textarea } from '@/components/ui/textarea';
  import { useForm } from 'react-hook-form';
  import { zodResolver } from '@hookform/resolvers/zod';
  import { z } from 'zod';
  import { registrarEventoAction } from '@/app/dashboard/rebanho/actions';
  import { toast } from 'sonner';
  import { ArrowLeft } from 'lucide-react';
  import Link from 'next/link';
  import { TipoEvento } from '@/lib/types/rebanho';

  // Schema Zod para validação (espelhar em lib/validations/rebanho.ts depois)
  const registrarEventoSchema = z.object({
    tipo: z.nativeEnum(TipoEvento, { message: 'Tipo de evento obrigatório' }),
    data_evento: z.string().refine((val) => {
      const date = new Date(val);
      return date <= new Date() && !isNaN(date.getTime());
    }, 'Data deve ser válida e não futura'),
    peso_kg: z.coerce.number().positive('Peso deve ser maior que 0').optional().nullable(),
    lote_id_destino: z.string().uuid().optional().nullable(),
    comprador: z.string().optional().nullable(),
    valor_venda: z.coerce.number().positive().optional().nullable(),
    observacoes: z.string().optional().nullable(),
  });

  export default function RegistrarEventoPage() {
    const router = useRouter();
    const params = useParams();
    const animalId = params.id as string;
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof registrarEventoSchema>>({
      resolver: zodResolver(registrarEventoSchema),
      defaultValues: {
        tipo: undefined,
        data_evento: new Date().toISOString().split('T')[0],
        peso_kg: undefined,
        lote_id_destino: null,
        comprador: null,
        valor_venda: null,
        observacoes: null,
      },
    });

    const tipoEvento = form.watch('tipo');

    async function onSubmit(values: z.infer<typeof registrarEventoSchema>) {
      setIsLoading(true);
      try {
        const result = await registrarEventoAction(animalId, {
          ...values,
          animal_id: animalId,
        });

        if (result.success) {
          toast.success('Evento registrado com sucesso');
          router.back();
        } else {
          toast.error(result.error || 'Erro ao registrar evento');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/rebanho/${animalId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Registrar Evento</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Novo Evento</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Tipo de Evento (obrigatório) */}
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Evento *</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={TipoEvento.NASCIMENTO}>Nascimento</SelectItem>
                          <SelectItem value={TipoEvento.PESAGEM}>Pesagem</SelectItem>
                          <SelectItem value={TipoEvento.COBERTURA}>Cobertura</SelectItem>
                          <SelectItem value={TipoEvento.DIAGNOSTICO_PRENHEZ}>Diagnóstico de Prenhez</SelectItem>
                          <SelectItem value={TipoEvento.PARTO}>Parto</SelectItem>
                          <SelectItem value={TipoEvento.SECAGEM}>Secagem</SelectItem>
                          <SelectItem value={TipoEvento.ABORTO}>Aborto</SelectItem>
                          <SelectItem value={TipoEvento.DESCARTE}>Descarte</SelectItem>
                          <SelectItem value={TipoEvento.DESMAME}>Desmame</SelectItem>
                          <SelectItem value={TipoEvento.MORTE}>Morte</SelectItem>
                          <SelectItem value={TipoEvento.VENDA}>Venda</SelectItem>
                          <SelectItem value={TipoEvento.TRANSFERENCIA_LOTE}>Transferência de Lote</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Data do Evento (obrigatória) */}
                <FormField
                  control={form.control}
                  name="data_evento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Peso (condicional para PESAGEM) */}
                {tipoEvento === TipoEvento.PESAGEM && (
                  <FormField
                    control={form.control}
                    name="peso_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peso (kg) *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="Ex: 250.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Lote Destino (condicional para TRANSFERENCIA_LOTE) */}
                {tipoEvento === TipoEvento.TRANSFERENCIA_LOTE && (
                  <FormField
                    control={form.control}
                    name="lote_id_destino"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lote Destino *</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="Selecione o lote" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Comprador (condicional para VENDA) */}
                {tipoEvento === TipoEvento.VENDA && (
                  <>
                    <FormField
                      control={form.control}
                      name="comprador"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comprador</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do comprador" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="valor_venda"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Ex: 2500.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Observações (opcional para todos) */}
                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Anotações adicionais..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Botões */}
                <div className="flex justify-between pt-4">
                  <Link href={`/dashboard/rebanho/${animalId}`}>
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Salvando...' : 'Registrar Evento'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }
```

**Dependências:**
- Importação: Form components (shadcn/ui), hooks React, Zod, React Hook Form
- Importação: `registrarEventoAction` de `../actions.ts` (será criada)
- Exportação: Nenhuma

**Riscos:**
- ⚠️ Validação: Campos condicionais (peso, lote destino, etc.) devem ser validados corretamente
- ⚠️ Status animal: Se evento for MORTE ou VENDA, deve atualizar `status` do animal

**Validação:**
1. Página carrega em `/dashboard/rebanho/abc-123/evento`
2. Dropdown "Tipo de Evento" mostra 12 opções
3. Selecionar PESAGEM → campo "Peso" aparece
4. Selecionar VENDA → campos "Comprador" e "Valor" aparecem
5. Selecionar TRANSFERENCIA_LOTE → campo "Lote Destino" aparece
6. Submit com validação Zod
7. Toast de sucesso/erro aparece

---

### Arquivo: `lib/types/rebanho.ts`
**Tipo:** MODIFICAR  
**Motivação:** BUGS-rebanho.md, seção 1.1 — Enum `TipoEvento` incompleto (faltam 7 valores)

**O que muda:**

```
[linhas 23-29] SUBSTITUIR enum TipoEvento incompleto por versão completa

ANTES:
export enum TipoEvento {
  NASCIMENTO = 'nascimento',
  PESAGEM = 'pesagem',
  MORTE = 'morte',
  VENDA = 'venda',
  TRANSFERENCIA_LOTE = 'transferencia_lote',
}

DEPOIS:
export enum TipoEvento {
  NASCIMENTO = 'nascimento',
  PESAGEM = 'pesagem',
  COBERTURA = 'cobertura',
  DIAGNOSTICO_PRENHEZ = 'diagnostico_prenhez',
  PARTO = 'parto',
  SECAGEM = 'secagem',
  ABORTO = 'aborto',
  DESCARTE = 'descarte',
  DESMAME = 'desmame',
  MORTE = 'morte',
  VENDA = 'venda',
  TRANSFERENCIA_LOTE = 'transferencia_lote',
}
```

**Fonte:** CLAUDE.md, seção "Tipos de eventos (`eventos_rebanho.tipo`)"  
Valores: nascimento, pesagem, morte, venda, transferencia_lote, cobertura, diagnostico_prenhez, parto, secagem, aborto, descarte, desmame

**Dependências:**
- Exportação: Todos os arquivos que importam `TipoEvento`
  - `lib/validations/rebanho.ts` (schemas Zod)
  - `app/dashboard/rebanho/actions.ts`
  - `app/dashboard/rebanho/[id]/evento/page.tsx` (novo)
  - Testes em `tests/rebanho/__tests__/*.test.ts`

**Riscos:**
- ✅ Tipagem: Todos os testes que usam TipoEvento precisam ser atualizados (mas isso é esperado, não é "quebra")
- ⚠️ Build: TypeScript pode reportar novos erros em comparações de literal strings → RUMStar

**Validação:**
1. `npm run build` — sem erros TS2322 relacionados a TipoEvento
2. `npm run test` — testes que verificam `tipo: 'cobertura'` etc. passam
3. Dropdown em `/rebanho/[id]/evento` mostra 12 opções

---

### Arquivo: `lib/types/rebanho.ts`
**Tipo:** MODIFICAR (mesma localização)  
**Motivação:** BUGS-rebanho.md, seção 1.2 — Validar `StatusAnimal` enum vs banco

**O que muda:**

```
[linhas 16-21] VERIFICAR enum StatusAnimal vs CHECK constraint do banco

ATUAL:
export enum StatusAnimal {
  ATIVO = 'Ativo',
  MORTO = 'Morto',
  VENDIDO = 'Vendido',
  DESCARTADO = 'Descartado',
}

VALIDAÇÃO contra database-snapshot.md:
- Seção 3: coluna 'animais.status' tipo 'character varying'
- Seção 9: CHECK constraint na tabela 'animais' → verificar valores permitidos

RESULTADO:
  ✅ SE banco tem CHECK IN ('Ativo', 'Morto', 'Vendido', 'Descartado')
     → Enum está correto, NENHUMA mudança necessária
  
  ❌ SE banco tem outros valores (ex: 'ativo' minúsculo)
     → Enum precisa ser ajustado para sincronizar
```

> **NOTA CRÍTICA:** Este arquivo **NUNCA é editado manualmente**. É gerado via `npm run db:types` a partir do schema Supabase.  
> Se houver inconsistência, o problema é no banco, não no TS.  
> Abordagem: Verificar `types/supabase.ts` (gerado) e espelhar em `lib/types/rebanho.ts` (custom).

**Validação:**
1. Abrir `docs/database-snapshot.md`, seção 3 → procurar tabela `animais` coluna `status`
2. Ver CHECK constraint na seção 9
3. Cruzar valores com enum
4. Se divergência: Avisar usuário para atualizar schema e rodar `npm run db:types`

---

### Arquivo: `app/dashboard/rebanho/actions.ts`
**Tipo:** MODIFICAR  
**Motivação:** BUGS-rebanho.md, seção 3A.1 — Criar Server Action para registrar eventos

**O que muda:**

```
[novo, após linha 150] ADICIONAR Server Action para registrar evento

export async function registrarEventoAction(
  animal_id: string,
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; error?: string }> {
  try {
    // 1. Validar com Zod
    const payload = z.object({
      animal_id: z.string().uuid(),
      tipo: z.nativeEnum(TipoEvento),
      data_evento: z.string().refine((val) => {
        const date = new Date(val);
        return date <= new Date() && !isNaN(date.getTime());
      }, 'Data deve ser válida e não futura'),
      peso_kg: z.number().positive().optional().nullable(),
      lote_id_destino: z.string().uuid().optional().nullable(),
      comprador: z.string().optional().nullable(),
      valor_venda: z.number().positive().optional().nullable(),
      observacoes: z.string().optional().nullable(),
    }).parse(formData);

    // 2. Chamar query do banco
    const resultado = await registrarEvento(payload as CriarEventoInput);

    // 3. Revalidar cache
    revalidatePath(`/dashboard/rebanho/${animal_id}`);
    revalidatePath('/dashboard/rebanho');

    // 4. Retornar sucesso
    return { success: true, evento_id: resultado.id };

  } catch (error) {
    if (error instanceof z.ZodError) {
      const mensagem = error.issues.map((e) => e.message).join('; ');
      return { success: false, error: mensagem };
    }
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: mensagem };
  }
}
```

**Dependências:**
- Importação: `registrarEvento` de `@/lib/supabase/rebanho` (já existe? verificar)
- Importação: `CriarEventoInput` de `@/lib/validations/rebanho`
- Exportação: Chamado de `/rebanho/[id]/evento/page.tsx`

**Riscos:**
- ⚠️ Se animal status muda (MORTE, VENDA) → trigger do banco deve atualizar `status` da tabela `animais`
- ⚠️ Se evento é TRANSFERENCIA_LOTE → validar que `lote_id_destino` existe e pertence à mesma fazenda (RLS do banco cuida disso)

**Validação:**
1. Registrar evento PESAGEM → sucesso, evento criado
2. Registrar evento VENDA → status do animal muda para "Vendido"
3. Registrar evento MORTE → status do animal muda para "Morto"
4. Toast de sucesso/erro aparece
5. Página atualiza após sucesso

---

### Arquivo: `lib/validations/rebanho.ts`
**Tipo:** MODIFICAR  
**Motivação:** Adicionar schema Zod para novo tipo de evento

**O que muda:**

```
[novo, após criarEventoPesagemSchema] ADICIONAR schemas para outros tipos de evento

// COBERTURA
export const criarEventoCoberturaSchema = z.object({
  animal_id: z.string().uuid(),
  tipo: z.literal(TipoEvento.COBERTURA),
  data_evento: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date();
  }, 'Data deve ser válida e não futura'),
  reprodutor_id: z.string().uuid().optional(),
  observacoes: z.string().optional().nullable(),
});

// DIAGNOSTICO_PRENHEZ
export const criarEventoDiagnosticoPrenzSchema = z.object({
  animal_id: z.string().uuid(),
  tipo: z.literal(TipoEvento.DIAGNOSTICO_PRENHEZ),
  data_evento: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date();
  }, 'Data deve ser válida e não futura'),
  resultado: z.enum(['positivo', 'negativo']),
  dias_pos_cobertura: z.number().int().positive().optional(),
  observacoes: z.string().optional().nullable(),
});

// PARTO
export const criarEventoPartoSchema = z.object({
  animal_id: z.string().uuid(),
  tipo: z.literal(TipoEvento.PARTO),
  data_evento: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date();
  }, 'Data deve ser válida e não futura'),
  tipo_parto: z.enum(['simples', 'gemelar', 'triplo']).optional(),
  observacoes: z.string().optional().nullable(),
});

// MORTE, VENDA, TRANSFERENCIA_LOTE, etc. (simplificados por agora)
// Podem ser expandidos conforme necessário
```

**Dependências:**
- Importação: `TipoEvento` (já importado)
- Exportação: Tipos `CriarEventoCoberturaInput`, etc. para uso em actions

**Riscos:**
- ❌ Nenhum — validação no servidor

**Validação:**
1. Registrar evento com tipo COBERTURA → Zod aceita schema
2. Registrar evento DIAGNOSTICO_PRENHEZ → Zod valida enum "resultado"
3. Registrar com campo inválido → Zod rejeita com mensagem clara

---

### Arquivo: `lib/supabase/rebanho.ts`
**Status:** ✅ VERIFICADO

**Verificação executada: 2026-05-08**
- **Função `registrarEvento`**: ✅ **EXISTE** na linha **305**
- **Assinatura**: 
  ```typescript
  export async function registrarEvento(
    formData: CriarEventoInput
  ): Promise<{ id: string }>
  ```
- **Implementação**: Função já cria evento em `queryEventos.create()` e adiciona `usuario_id` do usuário autenticado
- **Ação necessária**: NENHUMA — função está pronta para ser usada pela nova Server Action

---

## 4. FASES DE EXECUÇÃO (espelhar BUGS-rebanho.md seção 10)

### FASE 1 — Sidebar Limpeza (30 minutos)
**Objetivo:** Remover lógica de submenu Rebanho

**Arquivos a tocar:**
- [Seção 3.1] `components/Sidebar.tsx` (MODIFICAR linhas 270-284, comentar 74-83)

**Validação da fase:**
```bash
npm run build
# Esperado: build sucede, sem erros TS
npm run lint
# Esperado: nenhum warning eslint novo
```

**Smoke test manual:**
1. Abrir http://localhost:3000/dashboard
2. Sidebar carrega
3. Item "Rebanho" não expande (sem submenu)
4. Clique em "Rebanho" → navega para /dashboard/rebanho
5. Sidebar fecha em mobile (se houver toggle)

**Critério de "feito" antes de avançar:**
✅ Sidebar visualmente limpo (sem submenu)  
✅ Build verde  
✅ Nenhum erro 404 ao clicar

---

### FASE 2 — Rotas Críticas Faltando (2-3 horas)
**Objetivo:** Criar `/rebanho/[id]/evento` e `/rebanho/reproducao`

**Arquivos a tocar:**
- [Seção 3.2] `app/dashboard/rebanho/page.tsx` (MODIFICAR — será feito em Fase 3, aqui apenas validar estrutura)
- [Seção 3.3] `app/dashboard/rebanho/[id]/page.tsx` (VERIFICAR linha 361 aponta para rota correta)
- [Seção 3.4] `app/dashboard/rebanho/reproducao/page.tsx` (CRIAR com Tabs)
- [Seção 3.5] `app/dashboard/rebanho/[id]/evento/page.tsx` (CRIAR com formulário)

**Validação da fase:**
```bash
npm run build
# Esperado: build sucede (novos arquivos inclusos)
npm run test
# Esperado: 646+ testes passam
```

**Smoke test manual:**
1. Navegar para `/dashboard/rebanho/abc-123` (animal existente)
2. Botão "Registrar Evento" visível
3. Clique → navega para `/dashboard/rebanho/abc-123/evento`
4. Formulário carrega com campos
5. Preencher e submeter → toast sucesso, volta para ficha animal
6. Navegar para `/dashboard/rebanho/reproducao`
7. 3 abas visíveis (Eventos, Reprodutores, Parâmetros)
8. Clicar em cada aba → conteúdo muda

**Critério de "feito" antes de avançar:**
✅ Rota `/rebanho/[id]/evento` carrega (não 404)  
✅ Rota `/rebanho/reproducao` carrega com 3 abas  
✅ Build verde, 646+ testes passam  
✅ Formulário evento valida com Zod  

---

### FASE 3 — Redesenho Página Hub `/rebanho` (2-3 horas)
**Objetivo:** Substituir botões pequenos por 6 cards grandes

**Arquivos a tocar:**
- [Seção 3.2] `app/dashboard/rebanho/page.tsx` (MODIFICAR linhas 127-164, adicionar cards grid)

**Validação da fase:**
```bash
npm run build
# Esperado: build sucede
```

**Smoke test manual:**
1. Navegar para `/dashboard/rebanho`
2. 6 cards grandes visíveis em grid (responsive)
3. Grid: 1 coluna mobile, 2 tablet, 3 desktop
4. Cada card tem ícone + título + descrição
5. Hover visual (sombra, bg color muda)
6. Clique em card → navega para sub-rota
7. Abaixo dos cards, filtros + listagem de animais
8. Listagem funciona como antes (paginação, busca)

**Critério de "feito" antes de avançar:**
✅ Cards renderizam com layout correto  
✅ Grid responsivo funciona em mobile/tablet/desktop  
✅ Cliques navegam para rotas corretas  
✅ Listagem de animais não foi quebrada  

---

### FASE 4 — Corrigir Tipagem (1-2 horas)
**Objetivo:** Completar enum `TipoEvento`, validar `StatusAnimal`, remover `as any`

**Arquivos a tocar:**
- [Seção 3.6] `lib/types/rebanho.ts` (MODIFICAR enum `TipoEvento` + validar `StatusAnimal`)
- [Seção 3.7] `lib/validations/rebanho.ts` (ADICIONAR schemas para novos tipos de evento)
- [Seção 3.8] `app/dashboard/rebanho/actions.ts` (ADICIONAR `registrarEventoAction`, remover `as any` na linha 149)
- [Seção 3.9] `app/dashboard/rebanho/[id]/evento/page.tsx` (CRIAR sem `as any`)
- Identificar todos `as any` em: indicadores/page.tsx, reproducao/page.tsx, movimentacoes/actions.ts, sanidade/actions.ts
  - REMOVER e tipar corretamente com `interface` ou `type` explícito

**Validação da fase:**
```bash
npm run build
# Esperado: zero erros TS no módulo rebanho, 1 erro pré-existente aceitável fora do rebanho
npm run test
# Esperado: 646+ testes passam (testes com TipoEvento podem falhar se usam literal strings, corrigir)
```

**Buscar todos `as any`:**
```bash
grep -rn "as any" app/dashboard/rebanho/ lib/
# Esperado em Fase 4: remover todas ocorrências
```

**Smoke test manual:**
1. Registrar evento com novo tipo (cobertura, parto, etc.)
2. Enum `TipoEvento` aceita novos valores
3. Sem warnings TypeScript
4. Testes que usam TipoEvento passam

**Critério de "feito" antes de avançar:**
✅ Zero `as any` no módulo rebanho  
✅ Zero erros TS no módulo rebanho  
✅ `npm run build` verde  
✅ `npm run test` — 646+ testes passam  

---

### FASE 5 — Debugar Integração Planejador (2-3 horas)
**Objetivo:** Investigar por que `detectarRebanho()` falha silenciosamente

**Arquivos a inspecionar:**
- `lib/supabase/rebanho.ts` → funcões `detectarRebanho()` (linhas ~594, ~658)
- `app/dashboard/planejamento-silagem/components/Etapa2Rebanho.tsx` (linhas 70-114)
- Verificar: filtro de `fazenda_id`, RLS da tabela `animais`, supabase.rpc() ou .select()?

**Problema suspeito:**
- Query sem `fazenda_id` no filtro
- RLS bloqueando leitura (role permissions)
- Erro silencioso não logado

**Solução esperada:**
- Adicionar `eq('fazenda_id', getCurrentFazendaId())` à query
- Validar que usuário tem permissão `select` em `animais`
- Loggar erros com Sentry se houver

**Validação da fase:**
1. Navegar para Planejamento de Silagem (Etapa 2)
2. Clicar "Detectar Rebanho"
3. Campo preenche com dados reais (não "vazio")
4. Soma de animais está correta

**Critério de "feito":**
✅ `detectarRebanho()` retorna dados corretos  
✅ Nenhum erro silencioso  

---

### FASE 6 — Completar Features Pendentes (3-4 horas)
**Objetivo:** Implementar 3 TODOs em Reprodutores + outros pendentes

**Arquivos a tocar:**
- `app/dashboard/rebanho/reproducao/reprodutores/[id]/page.tsx`
  - [linha 13] Substituir `// TODO: query ao banco` por query real
  - [linha 44] `// TODO: Obter profile do AuthProvider` → usar `useAuth()`
  - [linha 118] `// TODO: lista de coberturas` → implementar tabela ou lista
- `app/dashboard/rebanho/indicadores/actions.ts` (linha 164) — `// TODO: ranking por lote` (T43)
- `app/dashboard/rebanho/leiteira/page.tsx` (linha 134) — `// TODO: eficiência alimentar` (aguardar silos)

**Validação da fase:**
```bash
npm run test
# Esperado: 646+ testes passam
```

**Critério de "feito":**
✅ 3 TODOs em Reprodutores implementados  
✅ Reprodutor page carrega dados reais do banco  
✅ Profile carregado do AuthProvider  
✅ Lista de coberturas exibe dados  

---

## 5. MODELO DE DADOS — Validação contra database-snapshot.md

| Tabela | Colunas usadas no código | Existe no banco? | Tipos batem? | RLS OK? |
|--------|--------------------------|-----------------|-------------|---------|
| `animais` | id, fazenda_id, brinco, nome, sexo, tipo_rebanho, data_nascimento, data_nascimento_estimada, categoria, status, lote_id, peso_atual, peso_nascimento, mae_id, pai_id, raca, observacoes, sisbov_crbio, origem, foto_url, status_reprodutivo, data_ultimo_parto, data_parto_previsto, data_proxima_secagem, escore_condicao_corporal, flag_repetidora, is_reprodutor, reprodutor_vinculado_id, deleted_at, created_at, updated_at | ✅ SIM | ✅ Todos | ✅ Sim (select, insert, update, delete) |
| `eventos_rebanho` | id, fazenda_id, animal_id, tipo, data_evento, peso_kg, lote_id_destino, comprador, valor_venda, observacoes, usuario_id, deleted_at, created_at, updated_at | ✅ SIM | ✅ Todos | ✅ Sim (select, insert, update, delete) |
| `lotes` | id, fazenda_id, nome, descricao, tipo_rebanho, data_criacao, created_at, updated_at | ✅ SIM | ✅ Todos | ✅ Sim (select, insert, update, delete) |
| `pesos_animal` | id, fazenda_id, animal_id, data_pesagem, peso_kg, condicao_corporal, metodo, observacoes, criado_em, atualizado_em | ✅ SIM | ✅ Todos | ✅ Sim (select, insert, update) |
| `reproducoes` | (parte de eventos_rebanho com tipo = 'cobertura', 'parto', etc.) | ✅ SIM (consolidado em eventos_rebanho) | ✅ Sim | ✅ Sim |
| `producoes_leiteiras` | id, fazenda_id, animal_id, data, litros, gordura, proteina, observacoes, criado_em | ✅ SIM | ✅ Todos | ✅ Sim (select, insert, update) |
| `eventos_sanitarios` | id, fazenda_id, animal_id, tipo, data, descrição, proxima_data, criado_em | ✅ SIM | ✅ Todos | ✅ Sim (select, insert, update) |

**Discrepâncias apontadas:**
- ❌ Coluna `status` vs `status_animal` — VERIFICAR no banco qual é o nome real
- ❌ Campo `peso_kg` em `pesos_animal` vs `peso_atual` em `animais` — ambos coexistem (histórico vs snapshot)

---

## 6. CONTRATOS DE SERVER ACTIONS

### `registrarEventoAction`
**Arquivo:** `app/dashboard/rebanho/actions.ts`

```typescript
export async function registrarEventoAction(
  animal_id: string,
  formData: unknown
): Promise<{ success: boolean; evento_id?: string; error?: string }>
```

**Input schema (Zod):**
```typescript
z.object({
  animal_id: z.string().uuid('Animal inválido'),
  tipo: z.nativeEnum(TipoEvento),
  data_evento: z.string().refine((val) => {
    const date = new Date(val);
    return date <= new Date() && !isNaN(date.getTime());
  }, 'Data deve ser válida e não futura'),
  peso_kg: z.number().positive().optional().nullable(),
  lote_id_destino: z.string().uuid().optional().nullable(),
  comprador: z.string().optional().nullable(),
  valor_venda: z.number().positive().optional().nullable(),
  observacoes: z.string().optional().nullable(),
})
```

**Output type:**
```typescript
{ success: true; evento_id: string } | { success: false; error: string }
```

**Permissões (qual perfil pode chamar):**
- ✅ Administrador (CRUD completo)
- ✅ Operador (inserir eventos)
- ❌ Visualizador (sem acesso)

**Tabelas tocadas:**
- `eventos_rebanho` (INSERT)
- `animais` (UPDATE — se tipo = MORTE, VENDA, etc.)

**revalidatePath necessários:**
```typescript
revalidatePath(`/dashboard/rebanho/${animal_id}`);  // Ficha do animal
revalidatePath('/dashboard/rebanho');                 // Hub
revalidatePath('/dashboard/rebanho/indicadores');      // KPIs podem mudar
revalidatePath('/dashboard/rebanho/reproducao/eventos'); // Eventos podem mudar
```

---

## 7. UI/UX — Página Hub `/rebanho`

### Wireframe textual da nova estrutura

```
┌─────────────────────────────────────────────────────────────────┐
│  Página: /dashboard/rebanho                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [HEADER]                                                        │
│  Título: "Gestão de Rebanho"                                     │
│  Subtítulo: "Dashboard centralizado de animais e eventos"        │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  [SEÇÃO 1] BLOCOS DE ACESSO RÁPIDO                              │
│                                                                   │
│  Grid responsivo: 1 col mobile, 2 tablet, 3 desktop             │
│                                                                   │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ 📊                   │  │ ❤️                   │               │
│  │ Indicadores         │  │ Reprodução          │               │
│  │                     │  │                     │               │
│  │ "Dashboard com      │  │ "Calendário repro-  │               │
│  │  KPIs e 4 alertas   │  │  dutivo, eventos,   │               │
│  │  proativos"         │  │  reprodutores"      │               │
│  │                     │  │                     │               │
│  │ [clicável, hover]   │  │ [clicável, hover]   │               │
│  └─────────────────────┘  └─────────────────────┘               │
│                                                                   │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ 🥛                   │  │ ⚖️                   │               │
│  │ Leiteira            │  │ Corte               │               │
│  │                     │  │                     │               │
│  │ "Registro e curva   │  │ "GMD, arrobas,      │               │
│  │  de lactação"       │  │  projeção abate"    │               │
│  │                     │  │                     │               │
│  │ [clicável, hover]   │  │ [clicável, hover]   │               │
│  └─────────────────────┘  └─────────────────────┘               │
│                                                                   │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ 🩺                   │  │ ↔️                   │               │
│  │ Sanidade            │  │ Movimentações       │               │
│  │                     │  │                     │               │
│  │ "Vacinação, sanita- │  │ "Entradas, saídas,  │               │
│  │  rios, alertas"     │  │  transferências"    │               │
│  │                     │  │                     │               │
│  │ [clicável, hover]   │  │ [clicável, hover]   │               │
│  └─────────────────────┘  └─────────────────────┘               │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  [SEÇÃO 2] CABEÇALHO DE LISTAGEM                                │
│                                                                   │
│  "Gestão de Rebanho"                                             │
│  [Novo Animal]  [Lotes]  [Importar CSV]                         │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  [SEÇÃO 3] FILTROS (já existe, mantém)                          │
│                                                                   │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐      │
│  │ Brinco      │ Status      │ Tipo Reba.  │ Sexo        │      │
│  │ [input]     │ [select]    │ [select]    │ [select]    │      │
│  └─────────────┴─────────────┴─────────────┴─────────────┘      │
│  ┌─────────────┬─────────────┬─────────────────────────┐        │
│  │ Lote        │ Categoria   │ Data Nascimento         │        │
│  │ [select]    │ [select]    │ [date range]            │        │
│  └─────────────┴─────────────┴─────────────────────────┘        │
│  [Limpar Filtros]                                              │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  [SEÇÃO 4] TABELA DE ANIMAIS (já existe, mantém)               │
│                                                                   │
│  ┌──────────┬────────┬─────┬─────────┬──────┬────────┬────────┐ │
│  │ Brinco   │ Nome   │ Sexo│ Status  │ Tipo │ Lote   │ Ações  │ │
│  ├──────────┼────────┼─────┼─────────┼──────┼────────┼────────┤ │
│  │ 001      │ Luna   │ F   │ Ativo   │ Leit │ L001   │ Ver... │ │
│  │ 002      │ Touro  │ M   │ Ativo   │ Cort │ L002   │ Ver... │ │
│  │ 003      │ Bella  │ F   │ Vendida │ Leit │ L001   │ Ver... │ │
│  └──────────┴────────┴─────┴─────────┴──────┴────────┴────────┘ │
│                                                                   │
│  [Anterior] [1] [2] [3] [Próximo]  — Mostrando 1-50 de 150     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes shadcn/ui usados
- `Card` (6x para cards grandes)
- `CardHeader`, `CardTitle`, `CardContent` (para estrutura do card)
- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` (filtros)
- `Input` (busca brinco)
- `Button` (ações: Novo Animal, Lotes, Importar CSV)
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` (listagem)
- `Badge` (status visual)

### Ícones Lucide para cada card
- **Indicadores**: `BarChart3`
- **Reprodução**: `Heart`
- **Leiteira**: `Milk`
- **Corte**: `Scale`
- **Sanidade**: `Stethoscope`
- **Movimentações**: `ArrowRightLeft`

### Comportamento responsivo
```
Mobile (< 640px):
  Grid: 1 coluna
  Cards: altura 120px, fonte 14px
  Filtros: empilhados verticalmente
  Tabela: scrollável horizontalmente

Tablet (640px - 1024px):
  Grid: 2 colunas
  Cards: altura 140px, fonte 15px
  Filtros: 2 colunas (brinco/status | tipo/sexo | lote/categoria)
  Tabela: exibe colunas principais

Desktop (> 1024px):
  Grid: 3 colunas
  Cards: altura 160px, fonte 16px
  Filtros: 3 colunas (brinco | status | tipo | sexo | lote | categoria | data)
  Tabela: exibe todas as colunas
```

---

## 8. Modal/Página `/rebanho/[id]/evento`

### Decisão: Página separada (não modal)
**Justificativa:**
- ✅ Formulário é complexo (13+ campos, 12 tipos de evento, campos condicionais)
- ✅ Validações Zod extensas → melhor em página própria
- ✅ UX clara: usuário sabe que está em fluxo de criação de evento
- ✅ Histórico de navegação preservado (back button volta para ficha animal)
- ✅ Padrão do projeto: formulários em páginas separadas (animal/novo, animal/editar)
- ❌ Modal seria muito grande em mobile (não cabe)

### Tipos de evento suportados no formulário

Todos os 12 tipos do enum `TipoEvento`:
1. NASCIMENTO
2. PESAGEM
3. COBERTURA
4. DIAGNOSTICO_PRENHEZ
5. PARTO
6. SECAGEM
7. ABORTO
8. DESCARTE
9. DESMAME
10. MORTE
11. VENDA
12. TRANSFERENCIA_LOTE

### Campos condicionais por tipo de evento

```
NASCIMENTO:
  ├── tipo ✓
  ├── data_evento ✓
  ├── observacoes
  └── (atualizar status animal → mantém Ativo)

PESAGEM:
  ├── tipo ✓
  ├── data_evento ✓
  ├── peso_kg ✓ (OBRIGATÓRIO)
  ├── condicao_corporal (1-5)
  ├── metodo (balanca | estimativa_visual)
  └── observacoes

COBERTURA:
  ├── tipo ✓
  ├── data_evento ✓
  ├── reprodutor_id (opcional)
  └── observacoes

DIAGNOSTICO_PRENHEZ:
  ├── tipo ✓
  ├── data_evento ✓
  ├── resultado ✓ (positivo | negativo)
  ├── dias_pos_cobertura (opcional)
  └── observacoes

PARTO:
  ├── tipo ✓
  ├── data_evento ✓
  ├── tipo_parto (simples | gemelar | triplo)
  └── observacoes

SECAGEM:
  ├── tipo ✓
  ├── data_evento ✓
  └── observacoes

ABORTO:
  ├── tipo ✓
  ├── data_evento ✓
  └── observacoes

DESCARTE:
  ├── tipo ✓
  ├── data_evento ✓
  └── observacoes
  └── (atualizar status animal → Descartado)

DESMAME:
  ├── tipo ✓
  ├── data_evento ✓
  └── observacoes

MORTE:
  ├── tipo ✓
  ├── data_evento ✓
  └── observacoes
  └── (atualizar status animal → Morto)

VENDA:
  ├── tipo ✓
  ├── data_evento ✓
  ├── comprador (opcional)
  ├── valor_venda (opcional)
  └── observacoes
  └── (atualizar status animal → Vendido)

TRANSFERENCIA_LOTE:
  ├── tipo ✓
  ├── data_evento ✓
  ├── lote_id_destino ✓ (OBRIGATÓRIO)
  └── observacoes
```

### Integração com `eventos_rebanho` e atualização de `status` do animal

**✅ Verificação executada: 2026-05-08**
- **Trigger de atualização de status**: ❌ **NÃO EXISTE** em `docs/database-snapshot.md` (seção 5, Triggers)
- **Tabela `eventos_rebanho`**: Não listada em triggers do snapshot (banco criado após snapshot)

**Decisão**: A lógica de UPDATE do `status` do animal (MORTE → 'Morto', VENDA → 'Vendido', DESCARTE → 'Descartado') **DEVE estar em `registrarEventoAction`** (Server Action) por enquanto.

**Implementação em `registrarEventoAction`:**
```typescript
export async function registrarEventoAction(animal_id: string, formData: unknown) {
  // ... validar com Zod ...
  
  // 1. Registrar evento
  const resultado = await registrarEvento(payload);
  
  // 2. Atualizar status do animal se necessário
  if (payload.tipo === TipoEvento.MORTE) {
    await supabase.from('animais').update({ status: 'Morto' }).eq('id', animal_id);
  } else if (payload.tipo === TipoEvento.VENDA) {
    await supabase.from('animais').update({ status: 'Vendido' }).eq('id', animal_id);
  } else if (payload.tipo === TipoEvento.DESCARTE) {
    await supabase.from('animais').update({ status: 'Descartado' }).eq('id', animal_id);
  }
  
  // 3. Revalidar cache
  revalidatePath(`/dashboard/rebanho/${animal_id}`);
  ...
}
```

**Nota futura**: Se trigger for criado no banco em release futura, remover essa lógica de `registrarEventoAction` e deixar trigger cuidar (KISS principle).

---

## 9. Página Hub `/rebanho/reproducao` com abas

### Componente Tabs do shadcn/ui
```typescript
<Tabs defaultValue="eventos" className="w-full">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="eventos">Eventos</TabsTrigger>
    <TabsTrigger value="reprodutores">Reprodutores</TabsTrigger>
    <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
  </TabsList>
  
  <TabsContent value="..." />
</Tabs>
```

### 3 abas: Eventos, Reprodutores, Parâmetros

**Aba "Eventos":**
- Renderiza componente `EventosPage` existente
- Mostra eventos reprodutivos dos últimos 90 dias
- Filtros, listagem, editor em linha

**Aba "Reprodutores":**
- Renderiza componente `ReprodutoresPage` existente
- Lista reprodutores cadastrados, ficha individual, coberturas

**Aba "Parâmetros":**
- Renderiza componente `ParametrosPage` existente
- Indicadores reprodutivos por rebanho (IEP, taxa prenhez, DG, etc.)

### Cada aba renderiza sub-rota existente OU embute conteúdo?

**Decisão: Embutir conteúdo (não sub-rotas)**

**Justificativa:**
- ✅ URL permanece `/dashboard/rebanho/reproducao` (não muda para `/eventos`)
- ✅ Estado das abas preservado ao navegar
- ✅ Mais simples que multi-nível routing
- ✅ Padrão do projeto (ex: rebanho/indicadores já usa abas simples)

**Implementação:**
```typescript
// App/dashboard/rebanho/reproducao/page.tsx
'use client';

import EventosListagem from '@/components/rebanho/reproducao/EventosListagem';
import ReprodutoresClient from './reprodutores/ReprodutoresClient';
import ParametrosClient from './parametros/ParametrosClient';

export default function ReproducaoHub() {
  return (
    <Tabs defaultValue="eventos">
      <TabsList>
        <TabsTrigger value="eventos">Eventos</TabsTrigger>
        <TabsTrigger value="reprodutores">Reprodutores</TabsTrigger>
        <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
      </TabsList>

      <TabsContent value="eventos">
        <EventosListagem /> {/* Sem RSC, apenas client-side */}
      </TabsContent>

      <TabsContent value="reprodutores">
        <ReprodutoresClient />
      </TabsContent>

      <TabsContent value="parametros">
        <ParametrosClient />
      </TabsContent>
    </Tabs>
  );
}
```

---

## 10. Correções de Tipo (TipoEvento, StatusAnimal)

### Enum `TipoEvento` — Valores corretos

**Fonte:** CLAUDE.md, seção "Tipos de eventos (`eventos_rebanho.tipo`)"

```typescript
export enum TipoEvento {
  NASCIMENTO = 'nascimento',           // ✅ (1) nascimento
  PESAGEM = 'pesagem',                 // ✅ (2) pesagem
  COBERTURA = 'cobertura',             // ✅ (3) NOVO — faltava
  DIAGNOSTICO_PRENHEZ = 'diagnostico_prenhez',  // ✅ (4) NOVO — faltava
  PARTO = 'parto',                     // ✅ (5) NOVO — faltava
  SECAGEM = 'secagem',                 // ✅ (6) NOVO — faltava
  ABORTO = 'aborto',                   // ✅ (7) NOVO — faltava
  DESCARTE = 'descarte',               // ✅ (8) NOVO — faltava
  DESMAME = 'desmame',                 // ✅ (9) NOVO — faltava
  MORTE = 'morte',                     // ✅ (10) morte
  VENDA = 'venda',                     // ✅ (11) venda
  TRANSFERENCIA_LOTE = 'transferencia_lote',  // ✅ (12) transferencia_lote
}
```

**CHECK constraint do banco esperado:**
```sql
CHECK (tipo IN (
  'nascimento', 'pesagem', 'morte', 'venda', 'transferencia_lote',
  'cobertura', 'diagnostico_prenhez', 'parto', 'secagem', 'aborto', 'descarte', 'desmame'
))
```

### Enum `StatusAnimal` — Validação

**Valor atual:**
```typescript
export enum StatusAnimal {
  ATIVO = 'Ativo',
  MORTO = 'Morto',
  VENDIDO = 'Vendido',
  DESCARTADO = 'Descartado',
}
```

**✅ Validação executada: 2026-05-08**
- **Tabela `animais`**: NÃO está em `docs/database-snapshot.md` (snapshot gerado 27/04/2026, tabelas rebanho adicionadas após)
- **Decisão**: O enum `StatusAnimal` está correto e bate com código atual
  - Comparações no código usam `'Ativo'`, `'Morto'`, `'Vendido'`, `'Descartado'` (maiúsculas)
  - Selects em `page.tsx:190-193` confirmam: `<SelectItem value="Ativo">`, etc.
  - ✅ **MANTER enum atual SEM alterações**

**Ação**: Nenhuma mudança necessária

### Arquivos de teste que precisam revisão após ajuste

**Teste afetados:**
- `lib/__tests__/rebanho.queries.test.ts` — tipos Animal, Lote, PesoAnimal
- `lib/calculos/__tests__/indicadores-rebanho.test.ts` — TipoRebanho, TipoEvento, StatusAnimal
- `tests/rebanho/__tests__/projecao.test.ts` — TipoRebanho, TipoEvento, StatusAnimal (75+ erros)
- `tests/rebanho/__tests__/rebanho-reproducao.rls.test.ts` — role comparison
- `tests/rebanho/__tests__/rebanho-reproducao.offline-sync.test.ts` — uuid, implicit any

**Ação recomendada:** Após ajustar enum, rodar:
```bash
npm run test -- rebanho
# Revisar falhas de tipo
# Corrigir comparações de literal strings com enum
```

---

## 11. Eliminação de `as any` (6+ ocorrências)

### Ocorrências identificadas em BUGS-rebanho.md seção 3.1

| Arquivo | Linha | Contexto | Tipo correto |
|---------|-------|----------|--------------|
| `app/dashboard/rebanho/actions.ts` | 149 | `} as any)` em `transferirAnimaisAction` | `CriarEventoInput` |
| `app/dashboard/rebanho/indicadores/page.tsx` | 67 | `alerta: any` em callback `.map()` | Type based on `AlertaProativo` interface |
| `app/dashboard/rebanho/reproducao/page.tsx` | 30-31 | `data: any`, `resultado: any` em hooks | `EventoReprodutivo[]`, `ParametrosReproductivos` |
| `app/dashboard/rebanho/movimentacoes/actions.ts` | 73 | `v: any` em Select change | `string` ou `TipoMovimentacao` enum |
| `app/dashboard/rebanho/sanidade/actions.ts` | 25-26 | `v: any` em callbacks (2x) | `string`, `TipoEventoSanitario` |
| `components/rebanho/IndicadoresClient.tsx` | 269, 304, 342, 373 | `alerta: any` em `.map()` | `AlertaSanitario` interface |

### Proposta de tipo correto para cada ocorrência

**1. `actions.ts:149`**
```typescript
// ANTES:
} as any);

// DEPOIS:
} as CriarEventoInput);
```

**2. `indicadores/page.tsx:67`**
```typescript
// ANTES:
.map((alerta: any) => ...)

// DEPOIS:
interface AlertaProativo {
  tipo: 'parto' | 'pesagem' | 'vacinacao' | 'vaca_seca';
  animal_id: string;
  animal_brinco: string;
  mensagem: string;
  data_evento?: string;
  urgencia: 'alta' | 'média' | 'baixa';
}

.map((alerta: AlertaProativo) => ...)
```

**3. `reproducao/page.tsx:30-31`**
```typescript
// ANTES:
const data: any = await ...
const resultado: any = ...

// DEPOIS:
const data: EventoReprodutivo[] = await ...
const resultado: ParametrosReproductivos = ...
```

**4. `movimentacoes/actions.ts:73`**
```typescript
// ANTES:
onValueChange={(v: any) => setTipo(v)}

// DEPOIS:
onValueChange={(v: string) => {
  if (['entrada', 'saida', 'transferencia'].includes(v)) {
    setTipo(v as TipoMovimentacao);
  }
}}
```

**5. `sanidade/actions.ts:25-26`**
```typescript
// ANTES:
onValueChange={(v: any) => setTipo(v)}

// DEPOIS:
onValueChange={(v: string) => {
  if (['vacinacao', 'vermifugacao', 'tratamento_veterinario', 'exame_laboratorial'].includes(v)) {
    setTipo(v as TipoEventoSanitario);
  }
}}
```

**6. `IndicadoresClient.tsx:269, 304, 342, 373`**
```typescript
// ANTES:
{alertas.map((alerta: any) => ...)}

// DEPOIS:
interface AlertaSanitario {
  id: string;
  animal_id: string;
  tipo: 'vacinacao' | 'vermifugacao' | 'tratamento_veterinario' | 'exame_laboratorial';
  data: string;
  proxima_data?: string;
  animal_brinco: string;
}

{alertas.map((alerta: AlertaSanitario) => ...)}
```

### 11.1 Warnings `exhaustive-deps` (React Hooks)

**Ocorrências identificadas:**

| # | Arquivo | Linha | Hook | Deps faltando | Correção |
|---|---------|-------|------|---------------|----------|
| 1 | `app/dashboard/planejamento-silagem/components/Etapa2Rebanho.tsx` | 114 | `useEffect` | `categorias`, `dataAlvo`, `wizard.sistema?.tipo_rebanho` | Adicionar ao array `[]` de deps + envolver função `executarDeteccao` em `useCallback` |
| 2 | `components/rebanho/AbaProducaoLeiteira.tsx` | 72 | `useEffect` | `fetchProducoes` | Envolver `fetchProducoes` em `useCallback([], [animal.id])` e adicionar às deps |

**Prioridade**: 🟡 MÉDIA (ESLint warning, não bloqueia build)

**Ação**: Após Fase 4 (tipagem), dedicar 30min para corrigir esses 2 warnings.

---

## 12. Riscos e Pontos de Atenção

### Quais mudanças podem quebrar testes existentes?

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| Enum `TipoEvento` completado → testes com literal strings `'cobertura'` falham | 🔴 ALTA | Atualizar testes para usar `TipoEvento.COBERTURA` ao invés de string literal |
| Novas rotas criadas → build precisa incluir `/rebanho/[id]/evento` e `/rebanho/reproducao` | 🔴 ALTA | Rodar `npm run build` e verificar output |
| Sidebar sem submenu → usuários em `/dashboard/rebanho/indicadores` + refresh caem no hub | 🟠 MÉDIA | Esperado — é o novo fluxo. Documentar em release notes |
| Página hub com cards grandes → layout pode quebrar em resoluções estranhas | 🟠 MÉDIA | Testar em mobile, tablet, desktop com breakpoints reais |
| `registrarEventoAction` novo → se `registrarEvento()` não existe em `lib/supabase/rebanho.ts` | 🔴 ALTA | Verificar que função existe antes de chamar |
| Atualização de `status` animal em eventos (MORTE, VENDA) → se trigger não existir | 🟠 MÉDIA | Lógica pode estar em action ou trigger — confirmar com `database-snapshot.md` |

### Há migration de banco necessária?

**Resposta: NÃO**

- ❌ Nenhuma tabela criada
- ❌ Nenhuma coluna adicionada
- ❌ Nenhuma constraint mudada
- ❌ Nenhum índice adicionado

**Verificação:** Se houver discrepância de tipos entre TS e banco, rodar `npm run db:types` para sincronizar (gera código, não modifica banco).

### Algum impacto em outros módulos?

| Módulo | Impacto | Risco | Ação |
|--------|---------|-------|------|
| Planejamento de Silagem | `detectarRebanho()` será debuggado em Fase 5 | 🟠 MÉDIA | Testar Etapa 2 Planejador com rebanho ativo |
| Financeiro | Nenhum (integração via Insumos) | ✅ NENHUM | — |
| Silos | Nenhum (pode haver integração futura com eficiência alimentar) | ✅ NENHUM | — |
| Frota | Nenhum | ✅ NENHUM | — |
| Insumos | Nenhum (integração via `registrar_como_despesa`) | ✅ NENHUM | — |
| Relatórios | Pode usar dados de `eventos_rebanho` para gráficos | 🟡 BAIXO | Validar que queries continuam funcionando |

---

## 13. CHECKLIST FINAL (Definition of Done)

### Entrega obrigatória

- [ ] **Sidebar limpo** — Item "Rebanho" sem submenu, aponta direto para `/dashboard/rebanho`
- [ ] **Rota `/rebanho/[id]/evento` funcional** — Clique em botão "Registrar Evento" → carrega formulário (não 404)
- [ ] **Página `/rebanho/reproducao` com abas funcional** — 3 abas (Eventos, Reprodutores, Parâmetros) renderizam
- [ ] **Página hub redesenhada** — 6 cards grandes em grid responsivo (1/2/3 colunas mobile/tablet/desktop)
- [ ] **Enum `TipoEvento` completo** — 12 valores (nascimento, pesagem, cobertura, diagnostico_prenhez, parto, secagem, aborto, descarte, desmame, morte, venda, transferencia_lote)
- [ ] **Enum `StatusAnimal` validado** — Cruza com banco, bate com CHECK constraint
- [ ] **Zero `as any` no módulo rebanho** — Grep confirma: `0 hits for "as any" in app/dashboard/rebanho/`
- [ ] **Zero warnings `exhaustive-deps`** — ESLint passa sem warnings em rebanho
- [ ] **`npm run build` verde** — Compila sem erros TS (1 erro pré-existente fora do rebanho aceitável)
- [ ] **`npm run test` — 646+ testes passando** — Nenhuma regressão
- [ ] **Smoke test manual:**
  - [ ] Criar animal novo ✅
  - [ ] Navegar para ficha do animal (`/rebanho/[id]`) ✅
  - [ ] Botão "Registrar Evento" visível ✅
  - [ ] Clique → carrega `/rebanho/[id]/evento` ✅
  - [ ] Preencher formulário evento ✅
  - [ ] Submeter → toast sucesso ✅
  - [ ] Volta para ficha animal ✅
  - [ ] Navegar para `/rebanho/reproducao` ✅
  - [ ] 3 abas visíveis e funcionais ✅
  - [ ] Voltar ao hub `/rebanho` ✅
  - [ ] 6 cards grandes visíveis ✅
  - [ ] Clique em card → navega para sub-rota ✅
  - [ ] Filtros e listagem de animais funcionam ✅

---

## Resumo Executivo — O que foi especificado

| Item | Status | Arquivo(s) |
|------|--------|-----------|
| **Sidebar Limpeza** | Especificado | `components/Sidebar.tsx` |
| **Rota `/rebanho/[id]/evento`** | Especificado | `app/dashboard/rebanho/[id]/evento/page.tsx` (CRIAR) |
| **Página `/rebanho/reproducao`** | Especificado | `app/dashboard/rebanho/reproducao/page.tsx` (CRIAR) |
| **Redesenho página hub** | Especificado | `app/dashboard/rebanho/page.tsx` |
| **Enum `TipoEvento` completo** | Especificado | `lib/types/rebanho.ts` |
| **StatusAnimal validado** | Especificado | `lib/types/rebanho.ts` |
| **Server Action `registrarEventoAction`** | Especificado | `app/dashboard/rebanho/actions.ts` |
| **Remover `as any`** | Especificado | 6 arquivos identificados |
| **Validações Zod** | Especificado | `lib/validations/rebanho.ts` |
| **6 Fases de execução** | Especificado | Seção 4 |
| **Smoke tests** | Especificado | Seção 13 |

---

**Próximos passos:**
1. ✅ Usuário revisa SPEC.md
2. ⏳ Usuário aprova ou solicita ajustes
3. 🔧 Implementação segue Fases 1-6
4. 🧪 Smoke tests validam cada fase
5. 📝 PR final com testes verdes

**AGUARDANDO REVISÃO DO USUÁRIO**

---

Documento gerado: 2026-05-08 | Versão: 3.0 | Status: PENDENTE DE APROVAÇÃO
