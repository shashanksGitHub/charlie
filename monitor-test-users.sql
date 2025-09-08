-- Monitoring script for Thibaut and Lucas testing
-- Run this periodically to track their relationship status across all platforms

-- Find user IDs
SELECT 'USER_IDS' as section, id, username, full_name 
FROM users 
WHERE full_name ILIKE '%thibaut%' OR full_name ILIKE '%lucas%'
ORDER BY full_name;

-- Check MEET relationships
SELECT 'MEET_RELATIONSHIPS' as section, 
       m.id as record_id, 
       m.user_id_1, u1.full_name as user1_name,
       m.user_id_2, u2.full_name as user2_name,
       m.matched, m.is_dislike, m.created_at
FROM matches m
JOIN users u1 ON m.user_id_1 = u1.id
JOIN users u2 ON m.user_id_2 = u2.id
WHERE (u1.full_name ILIKE '%thibaut%' OR u1.full_name ILIKE '%lucas%')
  AND (u2.full_name ILIKE '%thibaut%' OR u2.full_name ILIKE '%lucas%')
ORDER BY m.created_at DESC;

-- Check SUITE networking connections
SELECT 'SUITE_NETWORKING' as section,
       n.id as record_id,
       n.user_id, u1.full_name as user_name,
       n.target_user_id, u2.full_name as target_name,
       n.action, n.matched, n.created_at
FROM suite_networking_connections n
JOIN users u1 ON n.user_id = u1.id
JOIN users u2 ON n.target_user_id = u2.id
WHERE (u1.full_name ILIKE '%thibaut%' OR u1.full_name ILIKE '%lucas%')
  AND (u2.full_name ILIKE '%thibaut%' OR u2.full_name ILIKE '%lucas%')
ORDER BY n.created_at DESC;

-- Check SUITE mentorship connections
SELECT 'SUITE_MENTORSHIP' as section,
       s.id as record_id,
       s.user_id, u1.full_name as user_name,
       s.target_user_id, u2.full_name as target_name,
       s.action, s.matched, s.created_at
FROM suite_mentorship_connections s
JOIN users u1 ON s.user_id = u1.id
JOIN users u2 ON s.target_user_id = u2.id
WHERE (u1.full_name ILIKE '%thibaut%' OR u1.full_name ILIKE '%lucas%')
  AND (u2.full_name ILIKE '%thibaut%' OR u2.full_name ILIKE '%lucas%')
ORDER BY s.created_at DESC;