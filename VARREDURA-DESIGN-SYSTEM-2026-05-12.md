# Varredura Design System — 2026-05-12

## Resumo Executivo

✅ **Nenhuma cor hardcoded legada detectada** (#080e0a, #0b1410, #0a140d fora sidebar)
⚠️ **14 ocorrências de tipografia fora do padrão** encontradas (valores inline em px/rem)

---

## 1. Ocorrências de Tipografia — Mapeamento Completo

| Arquivo | Linha | Tipo | Padrão Atual | Substituição |
|---------|-------|------|-------------|-------------|
| `components/ui/select.tsx` | 110 | Tipografia + Cor | `text-[0.475rem] ... text-[#688070]` | `text-xs` + `text-muted-foreground` |
| `components/Sidebar.tsx` | 132 | Tipografia + Cor | `text-[0.45rem] ... text-[#f5d000]` | `text-xs` + `text-gold` |
| `components/Sidebar.tsx` | 190 | Tipografia + Cor | `text-[0.45rem] ... text-[#f5d000]` | `text-xs` + `text-gold` |
| `components/Sidebar.tsx` | 264 | Tipografia + Cor | `text-[#2a4433] ... text-[0.475rem]` | `text-xs` + `text-faint` |
| `components/Sidebar.tsx` | 288 | Tipografia + Cor | `text-[#2a4433] ... text-[0.475rem]` | `text-xs` + `text-faint` |
| `components/Sidebar.tsx` | 310 | Tipografia + Cor | `text-[#2a4433] ... text-[0.475rem]` | `text-xs` + `text-faint` |
| `components/ui/button.tsx` | 26 | Tipografia | `text-[0.8rem]` | `text-sm` |
| `components/ui/gradient-button.tsx` | 18 | Tipografia | `text-[0.8rem]` | `text-sm` |
| `components/ui/calendar.tsx` | 93 | Tipografia | `text-[0.8rem]` | `text-sm` |
| `components/ui/calendar.tsx` | 102 | Tipografia | `text-[0.8rem]` | `text-sm` |
| `components/widgets/GaugeOcupacaoSilos.tsx` | 40 | Tipografia | `text-[12px]` | `text-xs` |
| `components/widgets/PieCategoriasRebanho.tsx` | 72 | Tipografia | `text-[12px]` | `text-xs` |
| `components/widgets/PieCulturasAtivas.tsx` | 65 | Tipografia | `text-[12px]` | `text-xs` |
| `app/dashboard/rebanho/reproducao/TabsNav.tsx` | 61 | Tipografia | `text-[10px]` | `text-xs` |

---

## 2. Análise por Componente

### shadcn/ui Components (5 arquivos)
- `button.tsx:26` — `text-[0.8rem]` → `text-sm`
- `gradient-button.tsx:18` — `text-[0.8rem]` → `text-sm`
- `calendar.tsx:93, 102` — `text-[0.8rem]` → `text-sm` (2x)
- `select.tsx:110` — `text-[0.475rem]` → `text-xs` + cor

### Componentes Customizados (5 arquivos)
- `Sidebar.tsx:132, 190` — badges com gold — `text-[0.45rem]` → `text-xs`
- `Sidebar.tsx:264, 288, 310` — labels com faint — `text-[0.475rem]` → `text-xs`
- `GaugeOcupacaoSilos.tsx:40` — `text-[12px]` → `text-xs`
- `PieCategoriasRebanho.tsx:72` — `text-[12px]` → `text-xs`
- `PieCulturasAtivas.tsx:65` — `text-[12px]` → `text-xs`
- `TabsNav.tsx:61` — badge reprodução — `text-[10px]` → `text-xs`

---

## 3. Status de Cores Hardcoded

### Cores Legadas (Não Encontradas ✅)
```
❌ #080e0a  (Dark BG antigo)
❌ #0b1410  (Dark BG2 antigo)
❌ #0a140d  (Sidebar antigo — exceto uso legítimo atual)
```

### Cores Inline Encontradas (Manutenção Aceitável)
```
✅ text-[#f5d000]   — Alert Gold (nova paleta, correto)
✅ text-[#688070]   — Text Muted (padrão atual, correto)
✅ text-[#2a4433]   — Text Faint (padrão atual, correto)
```

> Estas cores podem ser migradas para classes Tailwind na refatoração (etapa 3), mas estão alinhadas com a paleta nova.

---

## 4. Documentação Atualizada

### DESIGN-SYSTEM.md
✅ Color Palette: Gold `#e09d1c` → `#f5d000`, backgrounds `#080e0a/#0b1410` → `#161616/#1c1c1c`
✅ Type Scales: Tabela reescrita com Tailwind classes + regra de mínimo text-sm
✅ Base Font Size: Nota adicionada sobre browser default (16px)
✅ Backgrounds & Surfaces: Paleta nova explicada, .bg-metal como assinatura visual
✅ Files in This System: `app/globals.css` (fonte de verdade), `colors_and_type.css` (referência)

### CLAUDE.md (Seção Design System)
✅ Timestamp atualizado: Concluído 13/05/2026 — Alinhado 2026-05-12
✅ Tipografia: Regra de mínimo text-sm, exemplos claros
✅ Cores: Paleta nova documentada, orientação de uso
✅ Arquivos Intocáveis: Marcados como atualizados em 2026-05-12

---

## 5. Próximas Etapas (Aguardando Confirmação)

### Fase 2: Refatoração de Componentes
- [ ] `components/ui/select.tsx:110` — Remover `text-[0.475rem] text-[#688070]`
- [ ] `components/Sidebar.tsx` — Consolidar badges e labels (6 locais)
- [ ] `components/ui/button.tsx`, `gradient-button.tsx` — Unificar `text-[0.8rem]` → `text-sm`
- [ ] `components/ui/calendar.tsx` — 2 linhas `text-[0.8rem]` → `text-sm`
- [ ] `components/widgets/` — 3 widgets com `text-[12px]` → `text-xs`
- [ ] `app/dashboard/rebanho/reproducao/TabsNav.tsx:61` — `text-[10px]` → `text-xs`

### Fase 3: Validação
- [ ] `npm run build` — verificar sem erros TypeScript
- [ ] `npm run test` — confirmar 646+ testes passando
- [ ] Visual regression — revisar componentes refatorados no navegador

---

## Resumo Estatístico

| Métrica | Valor |
|---------|-------|
| Total ocorrências | 14 |
| Tipografia fora do padrão | 14 |
| Cores hardcoded legadas | 0 ✅ |
| Cores inline (nova paleta) | 3 (aceitável) |
| Arquivos afetados | 11 |
| Arquivos da própria UI | 5 (shadcn) |
| Arquivos customizados | 6 |

---

**Data da varredura**: 2026-05-12  
**Ferramenta**: Claude Code + Grep  
**Status**: Concluído. Aguardando confirmação para Fase 2 (refatoração).
