-- Migration: Clean up and fix RLS Policies on profiles table
-- Removes all conflicting/duplicate policies and creates clean ones

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Service pode inserir perfil" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Usuarios podem atualizar proprio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuarios podem ver proprio perfil" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- Create CLEAN, single set of policies
CREATE POLICY "Users can read their own profile" ON profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can create their own profile" ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
