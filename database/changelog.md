# Database Changelog — GestSilo Pro

Registro de alterações de schema, migrações e otimizações no banco de dados Supabase.

---

## [2026-04-17] Refactor Pós-Normalização da Tabela `insumos`

### Context
A tabela `insumos` foi normalizada para remover colunas legadas (strings) e usar foreign keys (UUIDs) para referências estruturadas.

### Schema Changes

#### Migrations Aplicadas
1. **20260416090000_create_categorias_tipos_insumo.sql**
   - Criadas tabelas `categorias_insumo` e `tipos_insumo`
   - Estrutura: id (uuid), nome (text), ativo (boolean), criado_em (timestamptz)

2. **20260416090100_alter_insumos_add_columns.sql**
   - Adicionadas: `categoria_id`, `tipo_id`, `atualizado_por`, `criado_por`
   - Adicionadas: `teor_n_percent`, `teor_p_percent`, `teor_k_percent` (NPK para fertilizantes)

3. **20260416090400_seed_categorias_tipos_insumo.sql**
   - Seed inicial com categorias padrão (Fertilizantes, Sementes, Defensivos, etc.)
   - Seed de tipos por categoria

4. **20260416090600_rls_policies_insumos_completo.sql**
   - RLS policies para `insumos`, `movimentacoes_insumo`, `categorias_insumo`, `tipos_insumo`
   - Isolamento por `fazenda_id` em insumos e movimentações

5. **20260417215300_refactor_insumos_schema.sql**
   - Remoção de colunas legadas: `categoria` (text), `tipo` (text), `destino` (text)
   - Adição de `atualizado_em` com trigger automática

#### Pending Migrations
6. **20260417220000_indices_e_rls_insumos.sql** ⚠️
   - Cria índices para performance
   - Habilita RLS nas tabelas
   - **⚠️ APLICAR MANUALMENTE NO SUPABASE**

### Frontend Changes

#### TypeScript Tipos
- **types/insumos.ts**: Adicionado tipo `InsumoComRelacoes` para dados com relacionamentos JOINados
- Interfaces `CategoriaInsumo` e `TipoInsumo` já existiam e foram mantidas

#### Queries (lib/supabase/queries-audit.ts)
- ✅ Adicionado: `q.insumos.listComRelacoes()` — query otimizada com JOINs
- Lista insumos junto com categoria e tipo relacionados em uma única query

#### Hooks (lib/hooks/useInsumos.ts)
- ✅ Adicionado: `useInsumosComRelacoes()` — hook recomendado para listas
- Mantém backward compatibility com `useInsumos()` original

#### Componentes
- **app/dashboard/insumos/page.tsx**
  - Migrado de `useInsumos()` para `useInsumosComRelacoes()`
  - Removido código fictício que criava placeholder de tipos: `Tipo ${id.substring(0, 8)}`
  - Removido mapa de tipos desnecessário

- **InsumosList.tsx**
  - Interface atualizada para receber `InsumoComRelacoes[]`
  - Funções `getCategoriaName()` e `getTipoName()` simplificadas
  - Agora usam dados do relacionamento direto: `insumo.categoria?.nome`, `insumo.tipo?.nome`

- **InsumosFilters.tsx**
  - Removido parâmetro `tipos` (mapa fictício)
  - Extrai tipos do relacionamento: `insumo.tipo`
  - Lógica de filtro mantida: lista apenas tipos com insumos cadastrados

### Performance Impact

#### Antes
- **N queries**: cada componente que mostrava tipos fazia lookup manual
- **Placeholder UX**: tipos exibidos como "Tipo a1b2c3d4" (IDs truncados)
- **Overhead**: construção de mapa em memória no cliente

#### Depois
- **1 query otimizada**: `listComRelacoes()` traz tudo em um JOIN
- **Dados corretos**: nomes reais das categorias e tipos
- **Sem overhead**: dados já normalizados do servidor

### Queries Afetadas
```typescript
// Antes (sem JOINs)
const insumos = await q.insumos.list();  // Retorna apenas IDs

// Depois (com JOINs)
const insumos = await q.insumos.listComRelacoes();  
// Retorna: { id, nome, categoria_id, tipo_id, ..., categoria: { id, nome }, tipo: { id, nome } }
```

### RLS Security
- ✅ Categorias: SELECT público (read-only, sem login necessário)
- ✅ Tipos: SELECT público (read-only, sem login necessário)
- ✅ Insumos: CRUD isolado por `fazenda_id` (via `profiles.fazenda_id`)
- ✅ Movimentações: CRUD isolado via JOIN com insumos

### Pending Manual Actions
⚠️ **Aplicar no painel Supabase:**
1. Executar migration `20260417220000_indices_e_rls_insumos.sql`
   - Habilita RLS nas tabelas
   - Cria índices de performance
   - Recomendado: executar em maintenance window

### Testing Checklist
- [ ] Verificar que insumos mostram categoria/tipo corretos na lista
- [ ] Filtros por categoria/tipo funcionam
- [ ] Criar novo insumo com categoria e tipo
- [ ] Editar insumo (validação de tipo pertencer à categoria)
- [ ] Saídas de insumo registram corretamente
- [ ] RLS: usuário de outra fazenda não vê insumos

---

## [2026-04-16] Initial Insumos Module Setup

### Created
- Tabelas: `insumos`, `movimentacoes_insumo`, `categorias_insumo`, `tipos_insumo`
- RLS policies
- Frontend components e hooks

### Notes
- Estrutura de base criada para o módulo
- Posterioramente normalizado em 2026-04-17

---

## Database Statistics

### Table Sizes (estimate)
- `insumos`: ~5-10KB por insumo
- `movimentacoes_insumo`: ~1-2KB por movimentação
- `categorias_insumo`: <1MB (dados fixos)
- `tipos_insumo`: <5MB (dados fixos)

### Common Query Patterns
1. `SELECT * FROM insumos WHERE fazenda_id = ? AND ativo = true` (com índice)
2. `SELECT ... FROM insumos JOIN categorias_insumo ... WHERE tipo_id = ?` (com índice)
3. `SELECT * FROM movimentacoes_insumo WHERE insumo_id = ? ORDER BY data DESC` (com índice)

---

## Next Steps
- [ ] Aplicar migration `20260417220000_indices_e_rls_insumos.sql` ao banco production
- [ ] Testar performance de queries com índices novos
- [ ] Monitorar query logs para identificar padrões não-indexados
- [ ] Documentar stored procedures de auditoria se necessário
