# PRD-relat.md — Mapa de Relatórios & Exportações

> Levantamento read-only. Nenhum arquivo foi alterado.
> Data: 2026-06-01

---

## 1. Inventário de Arquivos

### `app/dashboard/relatorios/`

```
app/dashboard/relatorios/
├── layout.tsx                        # Guard: bloqueia Operador
├── page.tsx                          # RSC: busca initial data, passa para Client
├── RelatoriosClient.tsx              # Client hub: 5 seções, botões de exportação
├── actions.ts                        # Server Actions: queries para cada relatório
└── rebanho/
    ├── page.tsx                      # RSC: construtor dinâmico (vw_animais_completos)
    ├── RebanhoBuilderClient.tsx      # Client: seletor de 25 campos em 7 categorias
    └── actions.ts                    # Server Action: busca via view vw_animais_completos
```

### `lib/pdf/`

```
lib/pdf/
├── gerarPdfIndicadoresRebanho.ts     # PDF de Indicadores Zootécnicos
└── gerarPdfPlanejamento.ts           # PDF de Planejamento de Silagem
```

### `lib/relatorios/`

```
lib/relatorios/
├── pdf-builder.ts                    # Template genérico PDF (config-driven)
├── excel-builder.ts                  # Template genérico Excel/XLSX (config-driven)
└── rebanho-builder.ts                # Helpers do construtor dinâmico de rebanho
```

### Outros arquivos relevantes

```
lib/pdf-export.ts                     # PDFs das Calculadoras (Calagem + NPK)
lib/csv/gerarCsvIndicadoresRebanho.ts # CSV de Indicadores Zootécnicos
app/dashboard/rebanho/indicadores/actions.ts  # Orquestra exports (PDF + CSV) do módulo Rebanho
```

---

## 2. Análise detalhada de cada arquivo PDF

### 2.1 `lib/pdf/gerarPdfIndicadoresRebanho.ts`

**Relatório gerado**: Indicadores Zootécnicos do Rebanho  
**Ponto de entrada**: chamado em `app/dashboard/rebanho/indicadores/actions.ts`  
**Bibliotecas**: `jspdf` + `jspdf-autotable`

#### Layout

| Elemento | Valor exato no código |
|---|---|
| Papel | `new jsPDF('p', 'mm', 'A4')` |
| Margem esq. | `20` mm |
| Largura útil | `170` mm |
| posY inicial | `20` mm |

#### Cabeçalho

```
Título:    Helvetica bold 16pt, cor #00A651 → RGB [0,166,81]
Subtítulos: Helvetica normal 10pt, cor RGB(100,100,100)
  - "Fazenda: {fazendaNome}"          posY+8
  - "Tipo de Exploração: {tipo}"      posY+5
  - "Período: {inicio} a {fim}"       posY+5
  - "Data de Geração: {hoje}"         posY+5
```

#### Seções (3)

1. **INDICADORES PRINCIPAIS** — tabela 4 colunas (Indicador, Valor, Unidade, Status)
2. **COMPOSIÇÃO DO REBANHO** — tabela 2 colunas (Categoria, Percentual) — condicional
3. **PESO MÉDIO POR CATEGORIA** — tabela 2 colunas (Categoria, Peso Médio) — condicional

Estilo das tabelas (idêntico nas 3):
```typescript
theme: 'grid'
headStyles: { fillColor: [0,166,81], textColor: 255, fontSize: 9, fontStyle: 'bold' }
bodyStyles: { fontSize: 9 }
margin: { left: 20, right: 20 }
```
**Sem** alternância de cores nas linhas (`alternateRowStyles` ausente).

#### Rodapé

```
Helvetica italic 8pt, RGB(150,150,150)
"Gerado por GestSilo — Página 1 de {N} — Usuário: {nome}"
posY = pageHeight - 10
```
⚠️ **Bug**: apenas a página 1 recebe rodapé (sem `didDrawPage`). O número de páginas é lido de `doc.internal.pages.length - 1`.

#### Funções privadas (duplicadas do arquivo de planejamento)

- `adicionarSecao(doc, titulo, cor, x, y)` — Helvetica bold 11pt + linha horizontal `0.5px` comp. 150mm
- `hexToRgb(hex)` — converte `#RRGGBB` → `[R,G,B]`; fallback `[0,166,81]`
- `formatarValor(valor)` — `.toFixed(2).replace('.', ',')`; null → `'-'`
- `determinarStatusShort(valor, benchmark)` — retorna `'✓'`, `'↓'` ou `'↑'`

---

### 2.2 `lib/pdf/gerarPdfPlanejamento.ts`

**Relatório gerado**: Planejamento de Silagem  
**Ponto de entrada**: componente de Planejamento de Silagem (diretamente no client)  
**Bibliotecas**: `jspdf` + `jspdf-autotable` + `date-fns`  
**Diretiva**: `'use client'` no topo — roda exclusivamente no browser

#### Layout

| Elemento | Valor exato no código |
|---|---|
| Papel | `new jsPDF('p', 'mm', 'A4')` |
| Margem esq. | `20` mm |
| Largura útil | `170` mm |
| posY inicial | `20` mm |

#### Cabeçalho

```
Título:    Helvetica bold 16pt, cor #00A651
Subtítulos: Helvetica normal 10pt, cor RGB(100,100,100)
  - "Fazenda: {nomeFazenda}"    posY+8
  - "Data: {hoje}"              posY+5
```

#### Seções (5)

1. **CONFIGURAÇÃO** — pares label/valor em texto corrido (2 colunas alinhadas em 40mm)
2. **REBANHO** — tabela 2 colunas (Categoria, Cabeças) com linha de total
3. **RESULTADOS** — pares label/valor em texto corrido (2 colunas alinhadas em 60mm)
4. **DISTRIBUIÇÃO POR CATEGORIA** — tabela 4 colunas (Categoria, Cabeças, Demanda MS, Participação)
5. **PAINEL FRONTAL** — lista de exemplos de dimensões em texto livre

Estilo das tabelas (idêntico nas 2 tabelas):
```typescript
theme: 'grid'
headStyles: { fillColor: [0,166,81], textColor: 255, fontSize: 10, fontStyle: 'bold' }
bodyStyles: { fontSize: 10 }
margin: { left: 20, right: 20 }
```
**Sem** alternância de cores nas linhas.

#### Rodapé

```
Helvetica italic 8pt, RGB(150,150,150)
"Gerado por GestSilo — Página 1 de {N}"
posY = pageHeight - 10
```
⚠️ **Mesmo bug** de rodapé: só aparece na página 1.

#### Funções privadas (cópia idêntica do arquivo de indicadores)

- `adicionarSecao()` — idêntica
- `hexToRgb()` — idêntica

---

### 2.3 `lib/relatorios/pdf-builder.ts`

**Relatório gerado**: Template genérico — usado pelo módulo `relatorios/` para 2+ relatórios (Balanço Forrageiro PDF e outros)  
**Bibliotecas**: `jspdf` + `jspdf-autotable` + `date-fns`

#### Layout

| Elemento | Valor exato no código |
|---|---|
| Papel | `new jsPDF(orientacao, 'mm', 'A4')` — portrait ou landscape |
| Margem esq. | `14` mm |
| Largura útil portrait | `182` mm |
| Largura útil landscape | `267` mm |
| posY inicial | `14` mm (dentro do cabeçalho) |
| posY após cabeçalho | `34` mm |

#### Cabeçalho (fundo escuro — diferente dos arquivos de lib/pdf/)

```
Retângulo fundo: fillColor #161616 (darkbg), altura 28mm, largura total
"GestSilo":  Helvetica bold 14pt, cor #00A651, posY=12
"{titulo}":  Helvetica normal 11pt, cor #ffffff, posY=21
Canto direito (align:'right', 8pt, cor #cccccc):
  - "Fazenda: {fazendaNome}"       posY=10
  - "Período: {from} – {to}"       posY=16  (ou "Gerado em: ...")
  - "Gerado em: {datetime}"        posY=22  (se tiver período)
```

#### Seções (dinâmicas por config)

Para cada `PdfSecaoConfig`:
- Título da seção: Helvetica bold 10pt, cor `#00A651`
- Se `linhas.length === 0`: texto em itálico cinza `#888888`
- Tabela via `autoTable`:

```typescript
headStyles: { fillColor: [22,22,22], textColor: [255,255,255], fontStyle: 'bold', fontSize: 8 }
bodyStyles: { fontSize: 8 }
alternateRowStyles: { fillColor: [245,245,245] }   // ← SIM, tem alternância
margin: { left: 14, right: 14 }
```

#### Rodapé (via `didDrawPage` — correto, aparece em todas as páginas)

```typescript
didDrawPage: (data) => {
  // "Gerado por GestSilo — Página X de Y"
  // 7pt, cor #999999, centralizado, posY = pageHeight - 6
}
```

#### Interface TypeScript exportada

```typescript
PdfColunaConfig: { key, label, tipo?, largura? }
PdfSecaoConfig:  { titulo, colunas, linhas }
PdfReportConfig: { fileName, titulo, secoes, metadata, orientacao? }
```

---

### 2.4 `lib/pdf-export.ts`

**Relatórios gerados**: Laudo de Calagem + Recomendação de Adubação NPK  
**Ponto de entrada**: `app/dashboard/calculadoras/`  
**Bibliotecas**: `jspdf` (sem autoTable — layout manual com `doc.text()` e `doc.line()`)

#### Estilo — Calagem

```
Papel: new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
Margem: 15mm
Fonte título: 18pt, sem cor explícita (padrão preto)
Subtítulos: 12pt
Corpo: 10pt e 9pt
Caixa resultado: fillColor [240,248,245] (verde clarinho)
Valor NC: 14pt, textColor [0,166,81]
Linha separadora: drawColor [100,100,100]
Rodapé: 8pt, textColor [128,128,128], posY = pageHeight-30
```

#### Estilo — NPK

```
Papel: new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
Margem: 15mm
Fonte título: 18pt
Corpo: 10pt / 8pt
Valores verdes: textColor [0,166,81]
Rodapé: 8pt, textColor [128,128,128], posY = pageHeight-15
```

**Diferenças em relação ao padrão GestSilo**: sem fundo escuro no header, sem Helvetica explícita (usa fonte padrão do jsPDF = Helvetica, mas sem setar), margem 15mm (vs 14mm ou 20mm dos outros), título em preto (vs título verde/branco).

---

## 3. Template base: existe ou não?

### Conclusão

Há **dois padrões distintos** coexistindo no projeto, mais um grupo de arquivos fora do padrão:

| Arquivo | Padrão | Template reutilizável? |
|---|---|---|
| `lib/relatorios/pdf-builder.ts` | **Padrão B** (moderno) | ✅ Sim — config-driven |
| `lib/relatorios/excel-builder.ts` | **Padrão B** (moderno) | ✅ Sim — config-driven |
| `lib/pdf/gerarPdfIndicadoresRebanho.ts` | **Padrão A** (legado) | ❌ Não — monolítico |
| `lib/pdf/gerarPdfPlanejamento.ts` | **Padrão A** (legado) | ❌ Não — monolítico |
| `lib/pdf-export.ts` | **Sem padrão** (calculadoras) | ❌ Não — completamente ad-hoc |

### Padrão A (Legado — `lib/pdf/`)

- Cada arquivo instancia `new jsPDF()` próprio
- Define constantes (`corVerde`, `margemEsquerda`, `larguraPagina`) localmente
- Funções `adicionarSecao()` e `hexToRgb()` **duplicadas** em ambos os arquivos
- Cabeçalho: título verde sobre fundo branco
- Rodapé: **bugado** — só renderiza na página 1 (usa `doc.text()` fixo, sem `didDrawPage`)
- Sem alternância de cores nas linhas das tabelas

### Padrão B (Moderno — `lib/relatorios/pdf-builder.ts`)

- Config-driven: recebe `PdfReportConfig` e monta tudo internamente
- Cabeçalho: retângulo escuro `#161616` com texto branco/verde
- Rodapé: correto via `didDrawPage` (aparece em todas as páginas)
- Com alternância de linhas (`fillColor [245,245,245]`)
- Sem código duplicado

### Calculadoras (`lib/pdf-export.ts`)

- Completamente independente
- Layout manual via `doc.text()` e `doc.line()` — sem autoTable
- Visual diferente: título em preto (18pt), sem fundo no header, sem paginação automática
- Margem diferente: 15mm (vs 14mm ou 20mm)

---

## 4. Mapa completo de ocorrências fora de `lib/pdf/`

### `new jsPDF` / `jsPDF`

| Arquivo | Linha | Contexto |
|---|---|---|
| `lib/pdf-export.ts` | 20, 165 | Calagem e NPK |
| `lib/relatorios/pdf-builder.ts` | 49 | Template genérico |
| `app/dashboard/rebanho/indicadores/actions.ts` | ~436 | Import dinâmico `jsPDFModule` |

### `autoTable`

| Arquivo | Contexto |
|---|---|
| `lib/relatorios/pdf-builder.ts` | Template genérico (1 chamada) |
| `app/dashboard/rebanho/indicadores/actions.ts` | PDF inline (Server Action) |

### `.save(`

| Arquivo | Nome do arquivo salvo |
|---|---|
| `lib/relatorios/pdf-builder.ts` | `config.fileName` (passado via config) |

### `gerarExcel` (Excel/XLSX)

Chamado via `await gerarExcel(config)` em `app/dashboard/relatorios/RelatoriosClient.tsx` para todos os 10 relatórios XLSX (Financeiro, Talhões, Silos, Frota, Pastagens, Mão de Obra, Insumos, Produtos, Planejamento de Compras, Anotações Assessoria, Calendário).

### `gerarPdf`

| Chamador | Relatório |
|---|---|
| `app/dashboard/relatorios/RelatoriosClient.tsx` | Balanço Forrageiro PDF |
| `app/dashboard/relatorios/rebanho/RebanhoBuilderClient.tsx` | Rebanho dinâmico PDF |

### `csv`

| Arquivo | Contexto |
|---|---|
| `lib/csv/gerarCsvIndicadoresRebanho.ts` | CSV de indicadores zootécnicos |
| `app/dashboard/rebanho/indicadores/actions.ts` | Orquestra download do CSV |

### `ExcelJS`

Apenas `lib/relatorios/excel-builder.ts` (import direto). Todos os demais usam via `buildWorkbook` / `gerarExcel`.

---

## 5. Inconsistências e Dívidas Técnicas

### 5.1 Funções duplicadas em `lib/pdf/`

`adicionarSecao()` e `hexToRgb()` existem **identicamente** em:
- `lib/pdf/gerarPdfIndicadoresRebanho.ts`
- `lib/pdf/gerarPdfPlanejamento.ts`

Ambas deveriam ser extraídas para um helper compartilhado.

### 5.2 Bug de rodapé nos arquivos Padrão A

`gerarPdfIndicadoresRebanho.ts` e `gerarPdfPlanejamento.ts` colocam o rodapé com `doc.text()` fixo após a última seção — **o rodapé só aparece na página 1**. O Padrão B (`pdf-builder.ts`) resolve isso corretamente via `didDrawPage`.

### 5.3 Visual inconsistente entre gerações de PDF

| Aspecto | Padrão A (`lib/pdf/`) | Padrão B (`lib/relatorios/pdf-builder.ts`) | Calculadoras (`lib/pdf-export.ts`) |
|---|---|---|---|
| Fundo do cabeçalho | Branco | `#161616` (escuro) | Branco |
| Título | Verde 16pt | Verde 14pt sobre fundo escuro | Preto 18pt |
| Margem | 20mm | 14mm | 15mm |
| Font size corpo | 9–10pt | 8pt | 9–10pt |
| Alternância linhas | Não | Sim (`#f5f5f5`) | N/A (sem tabelas) |
| Rodapé multipágina | ❌ Não | ✅ Sim | ✅ Sim (fixo no final) |

### 5.4 `lib/pdf-export.ts` completamente fora do padrão

Os laudos das calculadoras têm visual próprio, sem relação com o design system dos demais relatórios. Não usam `Helvetica` explicitamente, não têm fundo escuro, título em preto.

### 5.5 `app/dashboard/rebanho/indicadores/actions.ts` com import dinâmico

O PDF de indicadores neste arquivo usa `import(...)` dinâmico de jsPDF (padrão SSR-safe), mas está fora de qualquer helper centralizado.

---

## 6. Resumo Executivo

**Total de pontos de geração de PDF**: 5 distintos  
**Total de pontos de geração de XLSX**: 1 centralizado (`gerarExcel`)  
**Total de pontos de geração de CSV**: 1 específico  

**Template reutilizável existe?** Sim — `lib/relatorios/pdf-builder.ts` e `lib/relatorios/excel-builder.ts` — mas cobrem apenas os relatórios do módulo `/relatorios/`. Os PDFs de Planejamento de Silagem, Indicadores Zootécnicos e Calculadoras ficaram fora.

**Oportunidade principal**: migrar `lib/pdf/gerarPdfIndicadoresRebanho.ts` e `lib/pdf/gerarPdfPlanejamento.ts` para o Padrão B (`pdf-builder.ts`), eliminando a duplicação de `hexToRgb`/`adicionarSecao` e corrigindo o bug de rodapé.
