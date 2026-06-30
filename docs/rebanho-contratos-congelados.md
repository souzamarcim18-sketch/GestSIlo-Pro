# Contratos Centrais Congelados do Rebanho (Fases 1 e 2)

> **Tipo**: documentação (Fase 0 — SPEC-rebanho012, P0.5).
> **Objetivo**: declarar formalmente quais contratos do domínio Rebanho ficam **estáveis
> durante as Fases 1 e 2** e estão protegidos por testes de borda. Qualquer alteração nestes
> contratos durante as Fases 1–2 é considerada violação de escopo (ver SPEC §B.6) e deve ser
> bloqueada salvo decisão explícita registrada.
>
> Data: 2026-06-30.

---

## Por que congelar

As Fases 1 (navegação) e 2 (ficha do animal) **não podem mudar schema, RPC, RLS, trigger nem
contratos de dados centrais**. Estes contratos são importados em grande parte do módulo de
rebanho e por consumidores externos (ver `rebanho-consumidores-externos.md`). Congelá-los —
com documentação **e** testes de borda type-level — garante que uma mudança acidental quebre
a compilação/teste, em vez de regredir silenciosamente.

---

## Contratos congelados

| # | Contrato | Fonte | O que está fixado |
|---|---|---|---|
| 1 | `Animal` | `lib/types/rebanho.ts` | Conjunto de 31 chaves + tipos das chaves de identidade (`id`, `fazenda_id`, `brinco`, `categoria`, `lote_id`, `mae_id`, `pai_id`) |
| 1 | `Lote` | `lib/types/rebanho.ts` | Conjunto de 8 chaves + union `tipo_rebanho: 'leiteiro' \| 'corte' \| 'misto' \| null` |
| 2 | `CSVValidacaoResult` + `CSVLinhaValidada` | `lib/types/rebanho.ts` | Shape do dry-run (`total_linhas`, `validos`, `com_erro`, `duplicados_arquivo`, `duplicados_banco`, `linhas`); `status: 'valido' \| 'erro'` |
| 2 | `CSVImportResult` + `AnimalCSVValidationResult` | `lib/types/rebanho.ts` | Resultado parcial do commit (`importados`, `erros: AnimalCSVValidationResult[]`); `status: 'sucesso' \| 'erro'` |
| 3 | `ResultadoLote` | `lib/types/rebanho-lote.ts` | `{ inseridos: number, erros: Array<{ animal_id, brinco, motivo }> }` — canal de resultado parcial do `Promise.allSettled` por animal |
| 4 | RPC `registrar_evento_com_status` | `types/supabase.ts` | Assinatura `Args { p_animal_id: string, p_payload: Json } → Returns string`; **ponto único de escrita de eventos** |

### Nota sobre `ResultadoLote`

A SPEC cita o shape de erro como `{brinco, motivo}`. O contrato **real** no código inclui
também `animal_id`: `Array<{ animal_id: string; brinco: string; motivo: string }>`. O teste
de borda congela o contrato real (com `animal_id`), que é superconjunto do citado na SPEC.

### Nota sobre a RPC como ponto único de escrita

`registrar_evento_com_status` é chamada por:
- `app/dashboard/rebanho/eventos/lote/actions.ts` (lançamento em lote, por animal);
- `app/dashboard/rebanho/actions.ts` (registro individual de evento).

Ambas passam `{ p_animal_id, p_payload }`. A RPC resolve `fazenda_id` internamente e atualiza
`status_animal` (Descartado/Morto/Vendido) quando aplicável. **Nenhuma escrita de evento pode
contornar, duplicar ou alterar esta RPC durante as Fases 1–2.**

---

## Cobertura de testes de borda

Arquivo: `__tests__/rebanho/contratos-congelados.test.ts` — **10 testes**, verdes.

- Asserções de **shape em runtime** (`Object.keys(...)`) para `Animal`, `Lote`,
  `CSVValidacaoResult`, `CSVImportResult`, `ResultadoLote`.
- Asserções **type-level** (`expectTypeOf`) para tipos de chave e unions.
- **Robustez verificada**: uma mutação proposital de um tipo (`inseridos: number → string`)
  faz `npm run build` (`tsc`) falhar com `TS2344`, comprovando que o `tsconfig` cobre o arquivo
  de teste e que os `expectTypeOf` realmente travam regressões em build (não só em runtime).

---

## Estado do repositório

Após P0.2–P0.5, a suíte completa está **verde: 952 testes passando, 0 falhas** (942 anteriores
+ 10 de contrato), e `npm run build` compila sem erro. As notas antigas do `CLAUDE.md` sobre
testes pré-existentes falhos (`projetar-rebanho.test.ts`, `__tests__/security/rls.test.ts`) **não
se aplicam ao estado atual** e foram atualizadas.
