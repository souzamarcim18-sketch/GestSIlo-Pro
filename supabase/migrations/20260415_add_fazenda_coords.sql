-- Migration: Add latitude and longitude to fazendas table
-- Date: 2026-04-15
-- Purpose: Support Weather Widget and location-based features

-- Add latitude and longitude columns
ALTER TABLE fazendas
ADD COLUMN latitude DOUBLE PRECISION DEFAULT NULL,
ADD COLUMN longitude DOUBLE PRECISION DEFAULT NULL;

-- Add check constraints for valid coordinate ranges
ALTER TABLE fazendas
ADD CONSTRAINT latitude_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
ADD CONSTRAINT longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Add comments for documentation
COMMENT ON COLUMN fazendas.latitude IS 'Geographic latitude of the farm in decimal degrees. Required for Weather Widget and location-based features.';
COMMENT ON COLUMN fazendas.longitude IS 'Geographic longitude of the farm in decimal degrees. Required for Weather Widget and location-based features.';

-- (Optional) Create index for location-based queries
-- CREATE INDEX idx_fazendas_location ON fazendas (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
