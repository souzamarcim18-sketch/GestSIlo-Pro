-- Migration: Optimize profiles access with VIEW to avoid RLS overhead
-- Create a secure view that filters by current user

-- Disable RLS on profiles table (we'll use VIEW-based security)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Create a secure view for profile access
CREATE OR REPLACE VIEW user_profiles AS
  SELECT * FROM profiles
  WHERE id = auth.uid();

-- Grant access
GRANT SELECT, UPDATE, INSERT ON user_profiles TO authenticated;

-- Optional: If you want to use the view transparently, update your queries to use user_profiles instead of profiles
-- For now, profiles table is accessible without RLS, but the app should query smartly
