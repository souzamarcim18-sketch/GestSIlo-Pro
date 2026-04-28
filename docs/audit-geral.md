# 🔍 Relatório de Auditoria Geral — GestSilo Pro

## Resumo Executivo
A saúde geral do projeto é de **6.8/10**. O GestSilo Pro possui uma excelente organização arquitetural em camadas (`app/`, `components/`, `lib/`) e aproveita recursos do Next.js de forma coerente. A stack multitenant baseada em PostgreSQL RLS garante um bom isolamento no backend.
**Pontos fortes:** (1) Estrutura sólida de proteção multitenant no banco (`get_minha_fazenda_id`). (2) Formulários bem integrados usando React Hook Form e Zod. (3) Separação clara de Client vs Server components com Server Actions.
**Pontos críticos:** (1) Falhas graves de injeção de `fazenda_id` pelo Frontend em formulários de inserção, e no SDK `queries-audit.ts`. (2) Quebra do TypeScript com `any` e supressão manual de ESLint em useEffects vitais. (3) 9 testes automatizados (Vitest) falhando na suíte de `insumos/validations.test.ts`.

## 🔬 Metodologia da Auditoria

- **Data de execução:** 27/04/2026
- **Documentos de referência:** `database-snapshot.md`, `ARCHITECTURE_REVIEW.md`, `AUDIT_PROMPT.md`
- **Ferramentas usadas:** leitura estática do código, `npm run test` (Vitest), cruzamento manual com snapshot SQL
- **Validação:** todos os achados críticos foram confirmados por inspeção direta no arquivo+linha citado
- **Escopo coberto:** 8 dimensões (Arquitetura, Qualidade TS/React, Segurança, Performance, Banco, Testes, DX, Infra)
- **Limitações conhecidas:** não foram executados testes E2E em ambiente de staging; análise de bundle size não foi realizada
- **Próxima auditoria sugerida:** 90 dias (27/07/2026)

---

## Tabela Consolidada de Notas

| Dimensão | Nota | Achados Críticos | Médios | Baixos |
|---|---|---|---|---|
| 3.1. Arquitetura & Organização | 8/10 | 0 | 1 | 0 |
| 3.2. Qualidade TS/React | 6/10 | 1 | 1 | 0 |
| 3.3. Segurança | 7/10 | 0 | 2 | 1 |
| 3.4. Performance | 6/10 | 0 | 2 | 0 |
| 3.5. Banco de Dados | 5/10 | 2 | 1 | 0 |
| 3.6. Testes | 6/10 | 1 | 0 | 0 |
| 3.7. DX & Manutenibilidade | 8/10 | 0 | 1 | 0 |
| 3.8. Infraestrutura & Deploy | 9/10 | 0 | 1 | 0 |

---

## Top 10 Prioridades (Impacto × Esforço)

1. **[Alto/Baixo]** Injeção manual vazia `fazenda_id: ''` quebrando formulários (Silos/Finanças).
2. **[Alto/Baixo]** Enviar `fazenda_id` na API de insert para Bromatologia e PSPS (`queries-audit.ts`).
3. **[Alto/Baixo]** Correção da falha dos 9 testes unitários automatizados de Insumos.
4. **[Alto/Baixo]** Substituir falha de tipagem `any` na AtividadeDialog por inferência correta.
5. **[Alto/Baixo]** Corrigir divergência silenciosa de tipo `Profile.role` no Supabase TS.
6. **[Alto/Baixo]** Criar índice `idx_planos_manutencao_fazenda_id` para otimizar dashboards.
7. **[Médio/Alto]** Remover e refinar métodos expostos `.select()` ou `.select('*')` no SDK Supabase. *(Esforço Alto pois exige varredura e refatoração em toda a aplicação cliente para mapear dependências)*.
8. **[Médio/Alto]** Alinhar limites do Zod (ex: `% da Matéria Seca`) com novas `CHECK` constraints no PostgreSQL. *(Esforço Alto pois requer criação e teste de novas migrations de banco em produção)*.
9. **[Médio/Alto]** Criar pipeline de disaster recovery e dump do DB (Github Actions via `pg_dump`). *(Esforço Alto pois demanda configurar nuvem secundária, buckets S3, chaves de API e testar o restore)*.
10. **[Médio/Baixo]** Ocultar botões de DELETE (Trash2) para o perfil Operador na UI.

---

## Plano Sugerido de 3 Sprints

- **Sprint 1 (1 semana): Consistência & Estabilidade**
  Resolver imediatamente as exclusões de inserção do `fazenda_id` pelo `queries-audit.ts` e diálogos UI. Mitigar e consertar o payload das 9 quebras apontadas na execução do `vitest`. Retirar `any` de views de campo e criar o index do banco. Corrigir os botões de DELETE aparentes para Operadores. Corrigir divergência silenciosa de tipo `Profile.role` no Supabase TS para evitar negação de permissão pra gerentes.
- **Sprint 2 (2 semanas): Performance & Debt Cleanup**
  Refatorar chamadas ao banco delimitando estritamente colunas em retornos massivos `.select()`. Resolver advertências do `exhaustive-deps` via memoização nativa do React. Atualizar as migrations para alinhamento entre Zod Validator e CHECK Constraints. Gerar tipagens estritas globalmente.
- **Sprint 3 (1 mês): Melhorias Estruturais & Sec.Ops**
  Implementar mitigação CSRF e proteções de Header HTTP. Configurar rotina persistente para salvamento/backup automatizado em nuvem secundária. Depreciar e desativar views marcadas como _Mock_ sem back-end funcional para polir o SaaS.

---

## Detalhamento dos Achados por Dimensão

### ACHADO #1 — Lógica de form vazando na UI
Dimensão: 3.1
Severidade: 🟡 Médio
Arquivo: app/dashboard/silos/components/dialogs/SiloForm.tsx:185
Problema: O componente UI injeta diretamente o `fazenda_id: ''` no payload, assumindo responsabilidades do DB.
Evidência: `await q.silos.create({ ...payload, fazenda_id: '' });`
Esforço: P (≤1h)
**Risco se não corrigir:** O fazendeiro não vai conseguir salvar novos silos. O aplicativo vai travar na hora de salvar porque o ID da fazenda não pode ser vazio.

### ACHADO #2 — Bypass da segurança de tipos do TS com `any`
Dimensão: 3.2
Severidade: 🔴 Crítico
Arquivo: app/dashboard/talhoes/components/dialogs/AtividadeDialog.tsx:187
Problema: Quebra voluntária da checagem do TypeScript na montagem do formulário usando `any`.
Evidência: `const payload: any = {`
Esforço: P (≤1h)
**Risco se não corrigir:** O sistema vai aceitar dados errados e enviar lixo pro banco. O banco de dados vai ficar poluído e os relatórios de talhão vão quebrar misteriosamente no futuro.

### ACHADO #3 — Supressão de linter em Hooks críticos
Dimensão: 3.2
Severidade: 🟡 Médio
Arquivo: app/dashboard/silos/components/dialogs/SiloForm.tsx:148
Problema: Regra do ESLint sendo desligada manualmente dentro de um useEffect vital.
Evidência: `}, [dataFechamento]); // eslint-disable-line react-hooks/exhaustive-deps`
Esforço: P (≤1h)
**Risco se não corrigir:** A tela vai usar dados velhos gravados na memória. O fazendeiro vai digitar uma coisa e o sistema vai salvar outra.

### ACHADO #4 — Fuga de headers HTTP de segurança no Next
Dimensão: 3.3
Severidade: 🟡 Médio
Arquivo: next.config.ts:10
Problema: Ausência das travas padrão de segurança contra iframes e XSS (CSP, X-Frame-Options).
Evidência: O arquivo next.config.ts não tem a chave `headers()`.
Esforço: P (≤1h)
**Risco se não corrigir:** Hackers podem colocar a página do GestSilo escondida num site falso e roubar informações ou cliques dos usuários da plataforma.

### ACHADO #5 — Anti-pattern de Select Massivo
Dimensão: 3.4
Severidade: 🟡 Médio
Arquivo: lib/supabase/queries-audit.ts:1102
Problema: O código pede a linha inteira da tabela pro banco em vez de só as colunas que precisa.
Evidência: `const { data, error } = await supabase.from('manutencoes').select()`
Esforço: G (Dias)
**Risco se não corrigir:** O aplicativo vai ficar muito lento quando o celular estiver num 3G fraco na fazenda, porque vai baixar muitos dados inúteis que a tela nem mostra.

### ACHADO #6 — Falta de Índice Específico para Planos de Manutenção
Dimensão: 3.4
Severidade: 🟡 Médio
Arquivo: docs/database-snapshot.md (Seção 6 - Índices)
Problema: A tabela de `planos_manutencao` não possui indexação para a chave `fazenda_id`.
Evidência: Ausência deste índice no snapshot e migrations.
Esforço: P (≤1h)
**Risco se não corrigir:** Quando a fazenda comprar muito maquinário e tiver muitos dados, a tela de manutenção de máquinas vai demorar uma eternidade pra carregar.

### ACHADO #7 — INSERTs explodindo por falha de envio de ID Tenant
Dimensão: 3.5
Severidade: 🔴 Crítico
Arquivo: lib/supabase/queries-audit.ts:1726
Problema: A API recebe o token da fazenda e não usa no payload das avaliações de bromatologia.
Evidência: `await getFazendaId(); const { data, error } = await supabase.from('...').insert(payload)`
Esforço: P (≤1h)
**Risco se não corrigir:** Ninguém vai conseguir salvar avaliações de qualidade de silagem. O botão de salvar vai dar erro sempre, impedindo o uso da nova feature.

### ACHADO #8 — Zod vs CHECK constraints divergentes
Dimensão: 3.5
Severidade: 🟡 Médio
Arquivo: lib/validations/silos.ts:65
Problema: A validação que bloqueia valores negativos só existe na tela, o banco não tem `CHECK` para barrar.
Evidência: `materia_seca_percent: z.number().min(0)` sem constraint no `schema_completo.txt`.
Esforço: G (Dias)
**Risco se não corrigir:** Um desenvolvedor ou integração terceira no futuro pode mandar um valor negativo e quebrar todos os cálculos financeiros e nutricionais do sistema.

### ACHADO #9 — Testes Automatizados Quebrados em Massa
Dimensão: 3.6
Severidade: 🔴 Crítico
Arquivo: __tests__/insumos/validations.test.ts:142
Problema: A bateria Vitest aponta 9 falhas ativas nas validações Zod atuais do projeto.
Evidência: 9 testes recebendo `false` onde deveriam retornar `true` em validações de formulário.
Esforço: P (≤1h)
**Risco se não corrigir:** A equipe vai ficar impedida de enviar atualizações automáticas pro servidor, pois o pipeline de deploy vai quebrar devido aos testes vermelhos.

### ACHADO #10 — Types do Supabase Ausentes ou Manuais
Dimensão: 3.7
Severidade: 🟡 Médio
Arquivo: package.json:5
Problema: As tipagens das colunas e tabelas foram escritas à mão em vez de gerar automaticamente.
Evidência: Falta do comando nativo `supabase gen types` no `package.json`.
Esforço: P (≤1h)
**Risco se não corrigir:** Se alguém adicionar uma coluna nova no banco de dados, o código fonte não vai ficar sabendo. Vai explodir um bug na mão do usuário final do nada.

### ACHADO #11 — Ausência de Disaster Recovery (Backup Offsite)
Dimensão: 3.8
Severidade: 🟡 Médio
Arquivo: docs/ARCHITECTURE_REVIEW.md
Problema: O Supabase atual está em conta gratuita sem point-in-time-recovery habilitado de forma contínua e sem backup S3.
Evidência: Sem indícios de CI/CD para backups semanais.
Esforço: G (Dias)
**Risco se não corrigir:** Se der um problema grave no servidor da Vercel/Supabase, ou alguém apagar algo sem querer, todos os clientes perdem seus dados inteiros. Fim da empresa. Além disso, a perda definitiva de dados configura violação direta da LGPD (Lei 13.709/2018), com exposição à ANPD e multas de até 2% do faturamento.

### ACHADO #12 — Ausência de Helpers RLS Legados (Positivo)
Dimensão: 3.3
Severidade: 🟢 Baixo (Validado)
Arquivo: Código fonte app/ e lib/
Problema: Verificação para saber se códigos antigos de migração (`get_my_fazenda_id` ou `is_admin_or_manager`) ainda eram usados.
Evidência: A pesquisa completa no TSX não acusou uso deles, apenas do novo fluxo via Token JWT.
Esforço: Zero.
**Risco se não corrigir:** Não aplicável. A aplicação se comportou bem e está livre dessas chamadas velhas no código cliente.

### ACHADO #13 — Botões de exclusão (DELETE) visíveis para perfis não autorizados
Dimensão: 3.3
Severidade: 🟡 Médio
Arquivo: app/dashboard/silos/[id]/page.tsx:200 e app/dashboard/talhoes/[id]/page.tsx:179
Problema: O botão e os modais de exclusão (Trash2) são renderizados cegamente na tela para o perfil "Operador". As policies do banco (`silos_delete_admin_gerente` e `talhoes_delete_admin_gerente`) bloqueiam a ação, mas o Frontend não esconde o botão.
Evidência: `onClick={() => setIsDeleteOpen(true)}` em views de detalhe sem qualquer validação if-else baseada no `profile.role`.
Sugestão de Correção:
```tsx
{['admin', 'gerente'].includes(profile?.role) && (
  <Button onClick={() => setIsDeleteOpen(true)}>...</Button>
)}
```
Esforço: P (≤1h)
**Risco se não corrigir:** O operador (peão da fazenda) vai conseguir ver o botão vermelho de deletar um silo, vai clicar achando que pode, e vai tomar um erro genérico e assustador de banco de dados bloqueando a ação.

### ACHADO #14 — Inconsistência de Tipos TS versus Schema Snapshot
Dimensão: 3.5
Severidade: 🔴 Crítico
Arquivo: lib/supabase.ts:27 e 38
Problema: As declarações manuais de tipo divergem do snapshot do banco de dados (Seção 3). 
Evidência: O type `Profile` diz ter `role`, mas no banco a coluna é `perfil`. A `Fazenda` alega ter `latitude` e `longitude`, não listadas como core no snapshot.
Esforço: P (≤1h)
**Risco se não corrigir:** A tela de login vai tentar ler `user.role` pra decidir algo, vai receber vazio (undefined), e vai travar o sistema ou negar permissão pra um gerente legítimo.

---

## 📎 Apêndice — Comandos de Verificação Rápida

```bash
# Confirmar testes quebrados (Achado #9)
npm run test -- __tests__/insumos/validations.test.ts

# Procurar uso de helpers RLS legados (validação Achado #12)
grep -rn "get_my_fazenda_id\|is_admin_or_manager" app/ lib/ components/

# Procurar inserções suspeitas de fazenda_id vazio (Achados #1 e #7)
grep -rn "fazenda_id: ''" app/ lib/

# Procurar uso de any em payloads (Achado #2)
grep -rn "payload: any\|: any =" app/dashboard/

# Procurar suppressões de exhaustive-deps (Achado #3)
grep -rn "eslint-disable.*exhaustive-deps" app/ components/

# Validar índice faltando no banco (Achado #6)
# Rodar no SQL Editor do Supabase:
# SELECT indexname FROM pg_indexes WHERE tablename = 'planos_manutencao';
```
