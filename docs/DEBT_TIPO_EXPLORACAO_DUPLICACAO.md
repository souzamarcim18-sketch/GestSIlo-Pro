# Dívida Técnica — Duplicação de Lógica tipo_exploracao

## Status
🔴 **BLOQUEADO PARA FASE 2** — Refatoração entra em backlog separado após Fase 2 concluída (remoção de código legado).

## Descrição
A lógica condicional de filtragem por `tipo_exploracao` está **duplicada em 3 arquivos**:

### Localizações
1. **`app/dashboard/rebanho/indicadores/actions.ts:132-138`** — `getIndicadoresAction()` (core)
   ```typescript
   if (tipoExploracao !== 'LEITE') {
     indicadores.taxaDesfrute = { valor: taxaDesfrute.taxa_percentual, estado: 'OK' };
   }
   if (tipoExploracao !== 'CORTE') {
     indicadores.percentualVacasLactacao = { valor: 75, estado: 'OK' };
     indicadores.periodoSecoMedio = { valor: 58, estado: 'OK' };
   }
   ```

2. **`app/dashboard/rebanho/indicadores/actions.ts:233-239`** — `exportarIndicadoresCSVAction()` (export CSV)
   ```typescript
   if (tipoExploracao !== 'LEITE') {
     indicadores.taxaDesfrute = { valor: taxaDesfrute.taxa_percentual, estado: 'OK' };
   }
   if (tipoExploracao !== 'CORTE') {
     indicadores.percentualVacasLactacao = { valor: 75, estado: 'OK' };
     indicadores.periodoSecoMedio = { valor: 58, estado: 'OK' };
   }
   ```

3. **`app/dashboard/rebanho/indicadores/actions.ts:325-331`** — `exportarIndicadoresPDFAction()` (export PDF)
   ```typescript
   if (tipoExploracao !== 'LEITE') {
     indicadores.taxaDesfrute = { valor: taxaDesfrute.taxa_percentual, estado: 'OK' };
   }
   if (tipoExploracao !== 'CORTE') {
     indicadores.percentualVacasLactacao = { valor: 75, estado: 'OK' };
     indicadores.periodoSecoMedio = { valor: 58, estado: 'OK' };
   }
   ```

## Risco de Drift
Se um desenvolvedor atualizar a lógica em um dos 3 locais e esquecer de sincronizar os outros, criará:
- Inconsistência entre core e exports
- Bugs de validação intermitentes
- Maintenance burden futuro

## Solução Proposta
Extrair helper reutilizável:

```typescript
// lib/calculos/indicadores-rebanho.ts
export function aplicarFiltroPorTipoExploracao(
  indicadores: IndicadorRebanho,
  tipoExploracao: TipoExploracao
): IndicadorRebanho {
  if (tipoExploracao !== 'LEITE') {
    indicadores.taxaDesfrute = { valor: indicadores.taxaDesfrute.valor, estado: 'OK' };
  }
  if (tipoExploracao !== 'CORTE') {
    indicadores.percentualVacasLactacao = { valor: 75, estado: 'OK' };
    indicadores.periodoSecoMedio = { valor: 58, estado: 'OK' };
  }
  return indicadores;
}
```

Uso:
```typescript
// actions.ts — todos os 3 pontos
const indicadores = { /* ... */ };
const indicadoresFiltrados = aplicarFiltroPorTipoExploracao(indicadores, tipoExploracao);
```

## Timeline
- **Fase 2** (atual): Remover código legado — NÃO refatorar
- **Backlog** (pós-Fase 2): Criar issue separada para extrair helper
- **Prioridade**: MÉDIA — não bloqueia funcionalidade, mas melhora mantenibilidade

---

**Criado por**: Auditoria Fase 1 Ampliada — 2026-05-06  
**Referência**: Bloqueio Fase 2 — Trilha A (Intencionalidade RLS-First)
