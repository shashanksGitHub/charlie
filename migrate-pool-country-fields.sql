-- Migration: Add app-specific pool_country fields
-- This enables independent geographic preferences for MEET and SUITE apps

-- Add new columns for app-specific pool countries
ALTER TABLE user_preferences 
ADD COLUMN meet_pool_country TEXT,
ADD COLUMN suite_pool_country TEXT;

-- Migrate existing pool_country data to both new fields
-- This preserves user's current preferences for both apps
UPDATE user_preferences 
SET 
  meet_pool_country = pool_country,
  suite_pool_country = pool_country
WHERE pool_country IS NOT NULL;

-- Set default values for users without pool_country
UPDATE user_preferences 
SET 
  meet_pool_country = 'ANYWHERE',
  suite_pool_country = 'ANYWHERE'
WHERE pool_country IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN user_preferences.meet_pool_country IS 'Geographic preference for MEET app: "Where should love come from?"';
COMMENT ON COLUMN user_preferences.suite_pool_country IS 'Geographic preference for SUITE app: "Where should connection come from?"';
COMMENT ON COLUMN user_preferences.pool_country IS 'Legacy field maintained for backward compatibility';