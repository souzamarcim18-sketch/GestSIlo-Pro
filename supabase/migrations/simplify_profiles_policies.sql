-- Migration: Simplify profiles RLS policies (remove conflicts)
-- Keep only one simple policy for each operation

-- DROP ALL policies from profiles
DROP POLICY IF EXISTS "Service pode inserir perfil" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Usuarios podem atualizar proprio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuarios podem ver proprio perfil" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- Create SIMPLE, non-overlapping policies
-- SELECT: Users can read their own profile ONLY
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- INSERT: Users can create their own profile (during signup)
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- UPDATE: Users can update their own profile
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE: Not allowed (keep this commented out - users shouldn't delete profiles)
-- CREATE POLICY "profiles_delete" ON profiles
--   FOR DELETE
--   USING (id = auth.uid());
