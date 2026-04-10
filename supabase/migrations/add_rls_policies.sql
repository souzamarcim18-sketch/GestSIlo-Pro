-- Migration: Add RLS Policies to profiles table
-- This migration adds the missing Row Level Security policies
-- that allow users to read/update/insert their own profiles

-- Drop existing policies if they exist (to be idempotent)
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;

-- Allow users to read their own profile
CREATE POLICY "Users can read their own profile" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid());

-- Allow users to insert their own profile (for registration)
CREATE POLICY "Users can create their own profile" ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());
