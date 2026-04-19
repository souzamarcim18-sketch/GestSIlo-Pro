# 🔧 Guia: Resolver 5 Erros de Lint do Supabase

## Resumo dos 5 Problemas

| # | Problema | Status | Arquivo |
|---|----------|--------|---------|
| 1 | Extension pg_trgm in public schema | ✅ Migration criada | `20260419_move_pg_trgm_to_extensions.sql` |
| 2 | Function Search Path Mutable (4 funções) | ✅ Corrigidas | 4 arquivos de migration |
| 3 | Leaked Password Protection Disabled | ⏳ Manual | Dashboard Supabase |
| 4 | Auth RLS Initialization Plan | ✅ Migration criada | `20260419_enable_rls_avaliacoes.sql` |

---

## 🚀 Passo a Passo (Ordem Correta)

### **PASSO 1: Sincronizar as Migrations Automáticas** (2 min)
As 3 migrations já foram criadas e corrigidas no seu projeto:
- `20260419_move_pg_trgm_to_extensions.sql`
- `20260419_enable_rls_avaliacoes.sql`
- Corrigidas: 4 funções com `SET search_path`

**O que fazer:**
1. Commitar as mudanças no git:
   ```bash
   git add supabase/migrations/
   git commit -m "fix: resolve Supabase lint issues (RLS, search_path, extensions)"
   ```

2. Fazer push para o repositório:
   ```bash
   git push origin main
   ```

3. O Supabase sincronizará automaticamente as migrations quando você fazer deploy ou acesso ao dashboard

---

### **PASSO 2: Resolver "Function Search Path Mutable"** ✅ JÁ FEITO
As 4 funções foram corrigidas adicionando `SET search_path = extensions, public`:

**Funções corrigidas:**
- ✅ `atualizar_custo_medio_e_estoque()` → `/supabase/migrations/20260416090300_create_trigger_cmp_e_ajuste.sql`
- ✅ `update_updated_at_planejamentos()` → `/supabase/migrations/20260416_planejamento_silagem_trigger.sql`
- ✅ `update_insumos_atualizado_em()` → `/supabase/migrations/20260417215300_refactor_insumos_schema.sql`
- ✅ `calcular_analise_solo()` → `/supabase/migrations/20260415_create_talhoes_module.sql`

**Status:** Aguarda sincronização das migrations

---

### **PASSO 3: Resolver "Extension pg_trgm in public schema"** ✅ JÁ FEITO
Migration criada: `20260419_move_pg_trgm_to_extensions.sql`

**O que faz:**
```sql
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
```

**Status:** Aguarda aplicação da migration

---

### **PASSO 4: Resolver "Auth RLS Initialization Plan"** ✅ JÁ FEITO
Migration criada: `20260419_enable_rls_avaliacoes.sql`

**Tabelas afetadas:**
- `avaliacoes_bromatologicas`
- `avaliacoes_psps`

**O que faz:**
1. Habilita RLS em ambas as tabelas
2. Cria policies que isolam dados por `fazenda_id`
3. Usa a função `get_my_fazenda_id()` para controle de acesso

**Status:** Aguarda aplicação da migration

---

### **PASSO 5: Resolver "Leaked Password Protection Disabled"** ⏳ MANUAL
Este é um setting de Auth do Supabase que **NÃO é SQL**.

**O que fazer:**
1. Acessar: https://app.supabase.com/project/[seu-project]/auth/providers
2. Selecionar **Email**
3. Ativar a opção: **"Protect against compromised passwords"**
4. Salvar

**Por que?**
- Verifica senhas contra o banco de dados HaveIBeenPwned
- Previne login com senhas vazadas
- Ativação automática de MFA se detectar comprometimento

**Screenshot esperado:**
- Na tela de Email Provider, procure por "Compromised password prevention" ou "Leaked password protection"

---

## ✔️ Verificação Final

Após completar os 5 passos, acesse o dashboard Supabase:
1. Vá para **Lint** (ou **Development**)
2. Procure pelos 5 problemas listados acima
3. Eles devem desaparecer da lista

---

## 📋 Checklist de Conclusão

- [ ] **Git**: Commits feitos e push realizado
- [ ] **Migration 1**: `20260419_move_pg_trgm_to_extensions.sql` aplicada
- [ ] **Migration 2**: `20260419_enable_rls_avaliacoes.sql` aplicada
- [ ] **Funções**: 4 funções com `SET search_path` aplicadas
- [ ] **Auth**: "Leaked password protection" habilitado no dashboard
- [ ] **Supabase Lint**: Todos os 5 erros resolvidos

---

## 🔍 Troubleshooting

### "Erro ao aplicar migration"
**Solução:** Verifique se o Supabase sincronizou. Vá ao SQL Editor e execute manualmente:
```sql
SELECT * FROM information_schema.schemata WHERE schema_name = 'extensions';
```

### "Funções ainda reclamando de search_path"
**Solução:** Após aplicar as mudanças, force a sincronização:
1. Vá ao dashboard Supabase
2. SQL Editor
3. Execute: `SELECT proname, proconfig FROM pg_proc WHERE proname LIKE '%atualizar%' OR proname LIKE '%update_%' OR proname LIKE '%calcular%';`
4. Confirme que `search_path` está no `proconfig`

### "Auth protection não aparece"
**Solução:** 
- Certificar que você tem permissão de admin no projeto
- Verificar na seção **Auth → Settings → Security**
- Em alguns projetos pode estar em **Auth → Providers → Email**

---

## 📚 Referências

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Search Path](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-SEARCH-PATH)
- [Supabase Lint Guide](https://supabase.com/docs/guides/database/lint)
