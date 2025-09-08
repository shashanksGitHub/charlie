-- Migration to add is_dislike column to SUITE connection tables
-- This ensures dislikes are properly recorded instead of creating duplicate entries

-- Add is_dislike column to suite_networking_connections table
ALTER TABLE suite_networking_connections 
ADD COLUMN IF NOT EXISTS is_dislike BOOLEAN NOT NULL DEFAULT FALSE;

-- Add is_dislike column to suite_mentorship_connections table  
ALTER TABLE suite_mentorship_connections 
ADD COLUMN IF NOT EXISTS is_dislike BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing 'pass' actions to set is_dislike = true
UPDATE suite_networking_connections 
SET is_dislike = TRUE 
WHERE action = 'pass';

UPDATE suite_mentorship_connections 
SET is_dislike = TRUE 
WHERE action = 'pass';

-- Verify the changes
SELECT 'suite_networking_connections' as table_name, COUNT(*) as total_records, 
       SUM(CASE WHEN is_dislike = TRUE THEN 1 ELSE 0 END) as dislike_records
FROM suite_networking_connections
UNION ALL
SELECT 'suite_mentorship_connections' as table_name, COUNT(*) as total_records,
       SUM(CASE WHEN is_dislike = TRUE THEN 1 ELSE 0 END) as dislike_records  
FROM suite_mentorship_connections;