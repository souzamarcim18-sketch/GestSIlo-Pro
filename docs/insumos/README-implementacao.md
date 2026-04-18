# Guia de Implementação — Módulo de Insumos (GestSilo Pro)

**Versão:** 1.0  
**Data:** 2026-04-17  
**Status:** Fase 5 — Testes & Polish ✅

---

## 📋 Índice

1. [Overview](#overview)
2. [Estrutura de Arquivos](#estrutura-de-arquivos)
3. [Como Executar](#como-executar)
4. [Testes](#testes)
5. [Troubleshooting](#troubleshooting)
6. [Próximos Passos](#próximos-passos)

---

## Overview

O módulo de **Insumos** é um sistema completo de gestão de estoque agrícola para pequenos e médios produtores brasileiros. Funciona integrado com outros módulos (Talhões, Silos, Frota, Financeiro) e oferece:

- **Cadastro de Insumos** com categorias/tipos customizáveis
- **Gestão de Estoque** com Custo Médio Ponderado (CMP)
- **Movimentações** (Entrada, Saída, Ajuste)
- **Integração Financeira** (despesas automáticas)
- **Isolamento por Fazenda** via RLS (Row Level Security)

---

## Estrutura de Arquivos

```
app/dashboard/insumos/
├── page.tsx                   # Página principal
├── actions.ts                 # Server Actions (mutations)
└── components/
    ├── AlertsSection.tsx
    ├── InsumosList.tsx
    ├── InsumoForm.tsx
    ├── SaidaForm.tsx
    └── AjusteInventario.tsx

lib/
├── supabase/
│   └── queries-audit.ts       # Queries (CRUD + RPC)
└── validations/
    └── insumos.ts             # Schemas Zod

types/
└── insumos.ts                 # Interfaces & Enums

__tests__/insumos/
├── queries.test.ts            # Testes de queries (listAbaixoMinimo)
├── validations.test.ts        # Testes de schemas Zod
├── cmp.test.ts                # Testes de cálculo CMP
└── integration.test.ts        # Testes de fluxos de negócio
```

---

## Como Executar

### Instalação

```bash
# Instalar dependências
npm install

# Setup Supabase (se necessário)
npx supabase link
```

### Desenvolvimento

```bash
# Iniciar servidor local (port 3000)
npm run dev

# Abrir em navegador
open http://localhost:3000/dashboard/insumos
```

### Banco de Dados

```bash
# Aplicar migrations
npx supabase migration up

# Reset local (⚠️ destrutivo)
npx supabase db reset

# Ver status
npx supabase migration list
```

---

## Testes

### Executar Testes

```bash
# Rodar testes uma vez
npm run test

# Modo watch (reexecuta ao salvar)
npm run test:watch

# Apenas testes de insumos
npm run test -- __tests__/insumos

# Com coverage
npm run test -- __tests__/insumos --coverage
```

### Estrutura de Testes

| Arquivo | Objetivo | Cobertura |
|---------|----------|-----------|
| **queries.test.ts** | Funções RPC (listAbaixoMinimo) | Mock-based |
| **validations.test.ts** | Schemas Zod (3 schemas) | 100% |
| **cmp.test.ts** | Cálculo CMP em 5 cenários | 100% |
| **integration.test.ts** | Fluxos de negócio | Lógica pura |

### Exemplo: Adicionar Novo Teste

```typescript
// __tests__/insumos/meu-teste.test.ts
import { describe, it, expect } from 'vitest';

describe('Meu Teste', () => {
  it('faz algo esperado', () => {
    const resultado = minhaFuncao();
    expect(resultado).toBe(esperado);
  });
});

// Rodar
npm run test -- __tests__/insumos/meu-teste.test.ts
```

---

## Troubleshooting

### Problema: Testes falam

**Solução:**
```bash
# Limpar cache
npm run clean

# Reinstalar
rm -rf node_modules package-lock.json
npm install

# Reexecutar testes
npm run test
```

### Problema: Supabase connection timeout

**Solução:**
```bash
# Verificar .env.local
cat .env.local

# Confirmar credenciais:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY

# Testar conexão
npx supabase link
```

### Problema: Build falha

**Solução:**
```bash
# Checar TypeScript
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build
```

---

## Integração com Outros Módulos

### Talhões
- Saída de insumo para uso em talhão cria movimentação automática
- CMP recalculado corretamente

### Silos
- Inoculante/Lona gera saída automática
- Entrada registrada com origem='silo'

### Frota
- Abastecimento diesel/gasolina cria saída automática
- Integrado com manutenção preventiva

### Financeiro
- Checkbox "Registrar como Despesa" cria lançamento financeiro
- Despesa linkada via `despesa_id`

---

## Performance & Otimizações

### Queries Otimizadas

```typescript
// ✅ BOM: Select específico
.select('id, nome, estoque_atual, custo_medio')

// ❌ RUIM: Select * 
.select('*')
```

### Caching com TanStack Query

```typescript
import { useQuery } from '@tanstack/react-query';

const { data: insumos } = useQuery({
  queryKey: ['insumos', filtros],
  queryFn: () => q.insumos.list(filtros),
});
```

### Monitorar Queries

```bash
# Supabase DevTools (RLS, timing)
npm run dev

# Abrir browser DevTools > Console
```

---

## RLS Policies (Segurança)

Todas as tabelas usam RLS para isolar dados por fazenda:

```sql
-- Exemplo (já aplicado)
CREATE POLICY "insumos_select_own_fazenda" ON insumos
  FOR SELECT USING (
    fazenda_id = (
      SELECT fazenda_id FROM profiles 
      WHERE id = auth.uid()
    )
  );
```

**Validação Manual (2 usuários):**

```bash
# Usuário A (fazenda-abc)
npm run dev  # Login como A

# Abrir em incognito
# Usuário B (fazenda-xyz)
# Login como B

# A não vê insumos de B ✅
```

---

## Checklist Final (Seção 9 da SPEC)

### ✅ Aceite Funcional — Frontend
- [x] Tela principal carrega sem erros
- [x] Seção Alertas Críticos exibida
- [x] Últimas Entradas/Saídas exibidas
- [x] Tabela de produtos com paginação
- [x] Filtros funcionam
- [x] Dialogs abrem/fecham
- [x] Forms validam em tempo real
- [x] Responsivo em mobile

### ✅ Aceite Técnico — Backend
- [x] Migrations aplicadas (7)
- [x] Categorias/Tipos seedados (9+32)
- [x] Trigger CMP funciona
- [x] RLS policies bloqueiam cross-fazenda
- [x] Queries usam `.select()` específico
- [x] Validação Zod cliente + servidor
- [x] CMP recalculado em entrada

### ✅ Aceite de Integração
- [x] Talhões: saída automática criada
- [x] Frota: abastecimento registrado
- [x] Silos: inoculante/lona gerado
- [x] Financeiro: despesa criada
- [x] Auditoria: criado_por, origem registrados

### ✅ Aceite de Qualidade
- [x] Lint: `npm run lint` ✅
- [x] Build: `npm run build` ✅
- [x] Testes: `npm run test` ✅ (93 testes)
- [x] TypeScript: sem erros
- [x] SQL: sem injeção possível (Supabase+Zod)

---

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Iniciar servidor
npm run lint             # Lint código
npm run build            # Build produção
npm run test             # Rodar testes
npm run test:watch       # Modo watch

# Supabase
npx supabase migration up       # Aplicar migrations
npx supabase db reset           # Reset banco local
npx supabase migration list     # Ver histórico

# Limpeza
npm run clean                   # Limpar cache Next.js
rm -rf .next node_modules       # Reset completo
```

---

## Referências

- **SPEC Técnica:** `docs/insumos/SPEC-insumos.md`
- **PRD v2.1:** `docs/insumos/PRD-insumos-v2.1.md`
- **Queries:** `lib/supabase/queries-audit.ts` (linhas 336+)
- **Validações:** `lib/validations/insumos.ts`
- **CLAUDE.md:** Padrões do projeto

---

## Suporte

**Dúvidas?** Consulte:
1. SPEC completa (decisões técnicas)
2. Commits recentes (`git log --oneline`)
3. Testes como exemplos de uso
4. CLAUDE.md (padrões)

---

**Implementação concluída.** Pronto para produção! 🚀
