-- SQL script to safely delete specific users
-- This handles foreign key constraints properly

-- Start a transaction
BEGIN;

-- First set CASCADE to handle related tables
DO $$ 
DECLARE
    user_id_to_delete INT;
    user_ids INT[] := ARRAY[22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 41, 42, 43, 44, 45, 46];
BEGIN
    -- Loop through each user ID
    FOREACH user_id_to_delete IN ARRAY user_ids
    LOOP
        -- Handle typing_status first - has FK to both matches and users
        DELETE FROM typing_status WHERE user_id = user_id_to_delete;
        
        -- Handle messages
        DELETE FROM messages WHERE sender_id = user_id_to_delete OR receiver_id = user_id_to_delete;
        
        -- Handle matches 
        DELETE FROM matches WHERE user_id_1 = user_id_to_delete OR user_id_2 = user_id_to_delete;
        
        -- Clean up other dependent tables
        DELETE FROM user_interests WHERE user_id = user_id_to_delete;
        DELETE FROM user_preferences WHERE user_id = user_id_to_delete;
        DELETE FROM user_photos WHERE user_id = user_id_to_delete;
        DELETE FROM video_calls WHERE initiator_id = user_id_to_delete OR receiver_id = user_id_to_delete;
        
        -- Finally delete the user
        DELETE FROM users WHERE id = user_id_to_delete;
    END LOOP;
END $$;

-- Commit the transaction
COMMIT;