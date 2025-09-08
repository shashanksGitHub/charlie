-- Fix bidirectional duplicate records in compatibility score tables
-- This script will consolidate duplicate user pairs and add unique constraints

-- 1. Fix suite_compatibility_scores table
-- First, identify and remove duplicate records, keeping only one per user pair

-- Create a temporary table to store the records we want to keep
CREATE TEMP TABLE suite_compatibility_scores_temp AS
WITH ordered_scores AS (
  SELECT *,
    CASE 
      WHEN user_id < target_user_id THEN user_id
      ELSE target_user_id
    END AS smaller_user_id,
    CASE 
      WHEN user_id < target_user_id THEN target_user_id
      ELSE user_id
    END AS larger_user_id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        CASE 
          WHEN user_id < target_user_id THEN user_id
          ELSE target_user_id
        END,
        CASE 
          WHEN user_id < target_user_id THEN target_user_id
          ELSE user_id
        END,
        target_profile_id
      ORDER BY computed_at DESC
    ) as rn
  FROM suite_compatibility_scores
)
SELECT 
  id,
  smaller_user_id as user_id,
  larger_user_id as target_user_id,
  target_profile_id,
  synergy_score,
  network_value_score,
  collaboration_score,
  exchange_score,
  overall_star_rating,
  analysis_data,
  insights,
  suggested_actions,
  geographic_fit,
  cultural_alignment,
  computed_at,
  last_updated,
  is_active
FROM ordered_scores 
WHERE rn = 1;

-- Delete all records from the original table
DELETE FROM suite_compatibility_scores;

-- Insert the deduplicated records back
INSERT INTO suite_compatibility_scores 
SELECT * FROM suite_compatibility_scores_temp;

-- 2. Fix suite_mentorship_compatibility_scores table
-- Create a temporary table to store the records we want to keep
CREATE TEMP TABLE suite_mentorship_compatibility_scores_temp AS
WITH ordered_scores AS (
  SELECT *,
    CASE 
      WHEN user_id < target_user_id THEN user_id
      ELSE target_user_id
    END AS smaller_user_id,
    CASE 
      WHEN user_id < target_user_id THEN target_user_id
      ELSE user_id
    END AS larger_user_id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        CASE 
          WHEN user_id < target_user_id THEN user_id
          ELSE target_user_id
        END,
        CASE 
          WHEN user_id < target_user_id THEN target_user_id
          ELSE user_id
        END,
        target_profile_id
      ORDER BY computed_at DESC
    ) as rn
  FROM suite_mentorship_compatibility_scores
)
SELECT 
  id,
  smaller_user_id as user_id,
  larger_user_id as target_user_id,
  target_profile_id,
  expertise_relevance,
  mentorship_style_fit,
  time_synergy,
  communication_fit,
  contextual_alignment,
  growth_gap_potential,
  overall_compatibility_score,
  success_probability,
  breakthrough_moment_prediction,
  plateau_risk_assessment,
  analysis_data,
  insights,
  conversation_starters,
  mentorship_roadmap,
  milestone_pathway,
  skill_gap_forecast,
  computed_at,
  last_updated,
  is_active
FROM ordered_scores 
WHERE rn = 1;

-- Delete all records from the original table
DELETE FROM suite_mentorship_compatibility_scores;

-- Insert the deduplicated records back
INSERT INTO suite_mentorship_compatibility_scores 
SELECT * FROM suite_mentorship_compatibility_scores_temp;

-- 3. Add unique constraints to prevent future duplicates
-- Note: These will be handled by the schema update in code

-- Display summary of changes
SELECT 
  'suite_compatibility_scores' as table_name,
  COUNT(*) as remaining_records
FROM suite_compatibility_scores
UNION ALL
SELECT 
  'suite_mentorship_compatibility_scores' as table_name,
  COUNT(*) as remaining_records
FROM suite_mentorship_compatibility_scores;