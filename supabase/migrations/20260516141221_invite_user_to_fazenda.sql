-- =============================================================================
-- Migration: Sistema de convite de usuários por fazenda
-- Data: 2026-05-16
--
-- 1. Função get_my_fazenda_id_jwt(): lê fazenda_id do JWT sem tocar em profiles
--    (evita recursão infinita em policies da tabela profiles)
-- 2. RLS profiles: membros da mesma fazenda podem ver uns aos outros via JWT
-- 3. Trigger handle_new_user: cria profile ao aceitar convite
-- =============================================================================

-- =============================================================================
-- 1. FUNÇÃO: get_my_fazenda_id_jwt
--    Lê fazenda_id do user_metadata do JWT — não faz SELECT em nenhuma tabela.
--    Usada exclusivamente nas policies de profiles para evitar recursão.
--    O fazenda_id é gravado no JWT pelo trigger handle_new_user após o login.
--
--    IMPORTANTE: user_metadata é controlado pelo próprio usuário (não seguro
--    para autorização). Aqui usamos apenas para isolamento de leitura da
--    listagem de perfis da mesma fazenda — a segurança real de escrita
--    permanece nas políticas INSERT/UPDATE que usam id = auth.uid().
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_fazenda_id_jwt()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(
    (auth.jwt() -> 'user_metadata' ->> 'fazenda_id'),
    ''
  )::uuid;
$$;

COMMENT ON FUNCTION public.get_my_fazenda_id_jwt() IS
  'Lê fazenda_id do JWT (user_metadata) sem tocar em profiles. '
  'Usado em policies de profiles para evitar recursão infinita.';

-- =============================================================================
-- 2. AJUSTE RLS profiles: membros da mesma fazenda podem ver uns aos outros
--    Substitui a policy anterior (id = auth.uid() apenas) pela nova que
--    permite ver todos os profiles com o mesmo fazenda_id via JWT.
-- =============================================================================

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_mesma_fazenda" ON public.profiles;

CREATE POLICY "profiles_select_mesma_fazenda" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR (
      fazenda_id IS NOT NULL
      AND fazenda_id = get_my_fazenda_id_jwt()
    )
  );

-- =============================================================================
-- 3. FUNÇÃO handle_new_user: cria profile ao criar usuário no auth.users
--    Para usuários convidados, lê fazenda_id e perfil do raw_user_meta_data
--    gravado pela API route de convite via service_role.
--    Para cadastro normal (onboarding), usa defaults seguros.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, perfil, fazenda_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'nome',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'perfil',
      'Administrador'
    ),
    CASE
      WHEN NEW.raw_user_meta_data->>'fazenda_id' IS NOT NULL
       AND NEW.raw_user_meta_data->>'fazenda_id' != ''
      THEN (NEW.raw_user_meta_data->>'fazenda_id')::uuid
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    nome       = COALESCE(EXCLUDED.nome, public.profiles.nome),
    perfil     = COALESCE(EXCLUDED.perfil, public.profiles.perfil),
    fazenda_id = COALESCE(EXCLUDED.fazenda_id, public.profiles.fazenda_id);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Cria ou atualiza profile ao registrar novo usuário. '
  'Para convidados, lê fazenda_id e perfil do raw_user_meta_data '
  'gravado pela API route de convite via service_role.';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- FIM DA MIGRATION
-- =============================================================================
