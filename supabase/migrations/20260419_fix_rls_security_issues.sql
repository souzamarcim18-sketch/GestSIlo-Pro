-- Migration: Fix RLS security issues
-- Issue1: Enable RLS on profiles table (policies exist but RLS is disabled)
-- Issue2: Ensure profiles table is secure with RLS enabled
-- Issue3: Replace user_profiles view with SECURITY INVOKER instead of DEFINER

-- Step 1: Drop the insecure view
DROP VIEW IF EXISTS user_profiles CASCADE;

-- Step 2: Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- Step 4: Create RLS policies
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

-- Step 4: Create a secure view with SECURITY INVOKER (if needed)
-- This view enforces RLS at query time using the invoker's permissions
CREATE OR REPLACE VIEW user_profiles WITH (security_invoker) AS
  SELECT * FROM profiles
  WHERE id = auth.uid();

-- Grant appropriate permissions
GRANT SELECT ON user_profiles TO authenticated;

-- Commit message
-- Enable RLS on profiles table, fix security definer view, ensure proper access control
