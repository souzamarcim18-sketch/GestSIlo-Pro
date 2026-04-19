-- =====================================================
-- Migration: Move pg_trgm extension from public to extensions schema
-- Date: 2026-04-19
-- Description: Resolves Supabase lint issue: extensions should not be in public schema
-- =====================================================

-- 1. CREATE EXTENSIONS SCHEMA
-- This schema will hold all PostgreSQL extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. MOVE pg_trgm EXTENSION
-- Move the pg_trgm extension from public schema to extensions schema
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Note: The indexes using gin_trgm_ops will continue to work because:
-- - gin_trgm_ops is part of the extension and is automatically available
-- - PostgreSQL resolves the type/operator via search_path and extension definition
-- - No need to update existing indexes
