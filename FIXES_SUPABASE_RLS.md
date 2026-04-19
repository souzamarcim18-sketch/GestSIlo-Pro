# Resolução de Issues de RLS no Supabase

## Problemas Identificados

### Issue 1 & 2: RLS desabilitado na tabela `profiles`
- **Causa**: A migração `optimize_profiles_access.sql` desabilita RLS (`ALTER TABLE profiles DISABLE ROW LEVEL SECURITY`)
- **Risco**: Policies RLS existem mas não são aplicadas, exposição de dados
- **Solução**: Reabilitar RLS na tabela `profiles`

### Issue 3: View com `SECURITY DEFINER`
- **Causa**: A view `user_profiles` foi criada sem especificar `SECURITY INVOKER`
- **Risco**: View aplica permissões do criador, não do usuário final, bypass de RLS
- **Solução**: Recriar view com `SECURITY INVOKER` ou remover e usar tabela diretamente

---

## Passos de Resolução

### Opção 1: Via Supabase Dashboard (Recomendado)

#### 1. Acessar SQL Editor
1. Ir em **Supabase Dashboard** → **SQL Editor**
2. Executar o seguinte SQL:

```sql
-- Step 1: Drop the insecure view
DROP VIEW IF EXISTS user_profiles CASCADE;

-- Step 2: Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Ensure RLS policies are in place
CREATE POLICY IF NOT EXISTS "profiles_select" ON profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY IF NOT EXISTS "profiles_insert" ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY IF NOT EXISTS "profiles_update" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Step 4: Create secure view with SECURITY INVOKER
CREATE OR REPLACE VIEW user_profiles WITH (security_invoker) AS
  SELECT * FROM profiles
  WHERE id = auth.uid();

GRANT SELECT ON user_profiles TO authenticated;
```

#### 2. Verificar que RLS está habilitado
1. Ir em **Authentication** → **Policies**
2. Selecionar tabela `profiles`
3. Confirmar que RLS está **habilitado** (toggle verde)
4. Confirmar que as 3 policies existem:
   - `profiles_select`
   - `profiles_insert`
   - `profiles_update`

---

### Opção 2: Via Migração Local

Se você está usando `supabase link`, executar:

```bash
supabase migration push
```

Isso aplicará a migração `20260419_fix_rls_security_issues.sql` ao banco remoto.

---

## Verificação Pós-Resolução

### Checklist

- [ ] RLS habilitado em `profiles` (deve mostrar "Enabled" no Supabase)
- [ ] View `user_profiles` removida ou recriada com `SECURITY INVOKER`
- [ ] Policies `profiles_select`, `profiles_insert`, `profiles_update` existem
- [ ] Nenhum erro de segurança reportado no Supabase
- [ ] Testes de login funcionam normalmente

### Teste de RLS

Para verificar que RLS está funcionando:

```sql
-- Como admin (deve retornar todos os perfis)
SELECT * FROM profiles;

-- Como usuário autenticado (deve retornar apenas seu próprio perfil)
-- Executar via Supabase Client com token do usuário
```

---

## Por que esses erros ocorreram

1. **`optimize_profiles_access.sql`** foi uma tentativa de otimização que desabilitou RLS
   - Isso violou a intenção das policies criadas em `simplify_profiles_policies.sql`
   - Criou uma falsa sensação de segurança (policies existem mas não aplicadas)

2. **View com `SECURITY DEFINER` implícito** é um padrão perigoso
   - Views precisam explicitamente usar `WITH (security_invoker)` para respeitar RLS
   - Sem isso, as permissões da view contornam as RLS policies

---

## Recomendações Futuras

1. **Sempre revisar migrações que desabilitam RLS**
   - RLS deve estar habilitado em todas as tabelas sensíveis (user data, finances, etc.)

2. **Para views, sempre usar `SECURITY INVOKER`**
   ```sql
   CREATE OR REPLACE VIEW view_name WITH (security_invoker) AS ...
   ```

3. **Testar RLS em desenvolvimento**
   - Use `supabase start` localmente e teste com diferentes tokens
   - Garanta que dados não vazem entre usuários

4. **Auditar permissões regularmente**
   - Revisar views, funções RPC, e policies RLS
   - Testar no Supabase Dashboard → Security → Policies

---

## Issue Adicional: Funções RPC com SECURITY DEFINER

### Identificado: `get_insumos_abaixo_minimo()`
- **Função**: RPC para listar insumos com estoque abaixo do mínimo
- **Problema**: Não valida se usuário tem permissão para a `fazenda_id` passada
- **Risco**: Usuário pode listar insumos de fazendas não autorizadas
- **Solução**: Adicionada validação via `profiles` table

O arquivo `20260419_fix_rpc_security_definer.sql` corrige isso com:
```sql
-- Verify user has access to this fazenda
IF NOT EXISTS (
  SELECT 1 FROM profiles
  WHERE id = auth.uid()
  AND fazenda_id = p_fazenda_id
) THEN
  RAISE EXCEPTION 'Access denied: User does not have permission for this fazenda';
END IF;
```

---

## Arquivos de Migração Criados

1. **`20260419_fix_rls_security_issues.sql`**
   - Habilita RLS em `profiles`
   - Remove view insegura e recria com `SECURITY INVOKER`
   - Valida policies de acesso

2. **`20260419_fix_rpc_security_definer.sql`**
   - Adiciona validação de fazenda em `get_insumos_abaixo_minimo()`
   - Impede acesso não autorizado a dados de outras fazendas
   - Revoga permissão para usuários anônimos

---

## Referências

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Security Definer](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Supabase RLS Best Practices](https://supabase.com/blog/supabase-rls-intro)
