-- ARCHIVAL SYSTEM FOR SECURITY AND AUDIT TRAIL
-- This system automatically copies user data, matches, and messages to archived tables
-- for permanent security records and compliance requirements.

-- Function to archive user data on registration or significant updates
CREATE OR REPLACE FUNCTION archive_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Archive user data on INSERT (registration) or significant UPDATE
    INSERT INTO archived_users (
        original_user_id, username, full_name, email, phone_number, gender,
        location, country_of_origin, bio, profession, ethnicity, secondary_tribe,
        religion, photo_url, show_profile_photo, date_of_birth, relationship_status,
        relationship_goal, interests, visibility_preferences, verified_by_phone,
        two_factor_enabled, profile_hidden, ghost_mode, is_online, last_active,
        user_created_at, archived_reason, archived_by_user_id, ip_address, user_agent
    ) VALUES (
        NEW.id, NEW.username, NEW.full_name, NEW.email, NEW.phone_number, NEW.gender,
        NEW.location, NEW.country_of_origin, NEW.bio, NEW.profession, NEW.ethnicity, NEW.secondary_tribe,
        NEW.religion, NEW.photo_url, NEW.show_profile_photo, NEW.date_of_birth, NEW.relationship_status,
        NEW.relationship_goal, NEW.interests, NEW.visibility_preferences, NEW.verified_by_phone,
        NEW.two_factor_enabled, NEW.profile_hidden, NEW.ghost_mode, NEW.is_online, NEW.last_active,
        COALESCE(NEW.created_at, NOW()), 
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'registration'
            WHEN TG_OP = 'UPDATE' THEN 'profile_update'
            ELSE 'system_backup'
        END,
        NEW.id, -- User is archiving their own data
        NULL, NULL -- IP and user agent would be populated from application layer
    )
    ON CONFLICT (original_user_id, archived_reason) DO UPDATE SET
        -- Update existing archive record with latest data
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone_number = EXCLUDED.phone_number,
        bio = EXCLUDED.bio,
        profession = EXCLUDED.profession,
        photo_url = EXCLUDED.photo_url,
        relationship_status = EXCLUDED.relationship_status,
        relationship_goal = EXCLUDED.relationship_goal,
        interests = EXCLUDED.interests,
        visibility_preferences = EXCLUDED.visibility_preferences,
        verified_by_phone = EXCLUDED.verified_by_phone,
        two_factor_enabled = EXCLUDED.two_factor_enabled,
        profile_hidden = EXCLUDED.profile_hidden,
        ghost_mode = EXCLUDED.ghost_mode,
        is_online = EXCLUDED.is_online,
        last_active = EXCLUDED.last_active,
        archived_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to archive match data on creation or deletion
CREATE OR REPLACE FUNCTION archive_match_data()
RETURNS TRIGGER AS $$
DECLARE
    msg_count INTEGER := 0;
BEGIN
    -- Count messages for this match
    IF TG_OP = 'DELETE' THEN
        SELECT COUNT(*) INTO msg_count 
        FROM messages 
        WHERE match_id = OLD.id;
        
        -- Archive the match being deleted
        INSERT INTO archived_matches (
            original_match_id, user_id_1, user_id_2, matched, is_dislike,
            has_unread_messages_1, has_unread_messages_2, notified_user_1, notified_user_2,
            last_message_at, match_created_at, archived_reason, message_count
        ) VALUES (
            OLD.id, OLD.user_id_1, OLD.user_id_2, OLD.matched, OLD.is_dislike,
            OLD.has_unread_messages_1, OLD.has_unread_messages_2, OLD.notified_user_1, OLD.notified_user_2,
            OLD.last_message_at, OLD.created_at, 'match_deletion', msg_count
        );
        
        RETURN OLD;
    ELSE
        -- Archive match on creation or update
        INSERT INTO archived_matches (
            original_match_id, user_id_1, user_id_2, matched, is_dislike,
            has_unread_messages_1, has_unread_messages_2, notified_user_1, notified_user_2,
            last_message_at, match_created_at, archived_reason, message_count
        ) VALUES (
            NEW.id, NEW.user_id_1, NEW.user_id_2, NEW.matched, NEW.is_dislike,
            NEW.has_unread_messages_1, NEW.has_unread_messages_2, NEW.notified_user_1, NEW.notified_user_2,
            NEW.last_message_at, NEW.created_at, 
            CASE 
                WHEN TG_OP = 'INSERT' THEN 'match_creation'
                ELSE 'match_update'
            END, 
            0
        )
        ON CONFLICT (original_match_id, archived_reason) DO UPDATE SET
            matched = EXCLUDED.matched,
            has_unread_messages_1 = EXCLUDED.has_unread_messages_1,
            has_unread_messages_2 = EXCLUDED.has_unread_messages_2,
            notified_user_1 = EXCLUDED.notified_user_1,
            notified_user_2 = EXCLUDED.notified_user_2,
            last_message_at = EXCLUDED.last_message_at,
            archived_at = NOW();
        
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to archive message data on creation or deletion
CREATE OR REPLACE FUNCTION archive_message_data()
RETURNS TRIGGER AS $$
DECLARE
    archived_match_record_id INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- Find the corresponding archived match
        SELECT id INTO archived_match_record_id 
        FROM archived_matches 
        WHERE original_match_id = OLD.match_id 
        ORDER BY archived_at DESC 
        LIMIT 1;
        
        -- Create archived match if it doesn't exist
        IF archived_match_record_id IS NULL THEN
            INSERT INTO archived_matches (
                original_match_id, user_id_1, user_id_2, matched, is_dislike,
                has_unread_messages_1, has_unread_messages_2, notified_user_1, notified_user_2,
                last_message_at, match_created_at, archived_reason, message_count
            )
            SELECT 
                m.id, m.user_id_1, m.user_id_2, m.matched, m.is_dislike,
                m.has_unread_messages_1, m.has_unread_messages_2, m.notified_user_1, m.notified_user_2,
                m.last_message_at, m.created_at, 'message_deletion', 0
            FROM matches m 
            WHERE m.id = OLD.match_id
            RETURNING id INTO archived_match_record_id;
        END IF;
        
        -- Archive the message being deleted
        INSERT INTO archived_messages (
            original_message_id, original_match_id, archived_match_id, sender_id, receiver_id,
            content, encrypted_content, iv, message_type, audio_url, audio_duration,
            read, read_at, message_created_at, archived_reason,
            reply_to_message_id, reply_to_content, reply_to_sender_name, reply_to_is_current_user,
            auto_delete_scheduled_at, auto_delete_mode_when_sent, deleted_for_user_id
        ) VALUES (
            OLD.id, OLD.match_id, archived_match_record_id, OLD.sender_id, OLD.receiver_id,
            OLD.content, OLD.encrypted_content, OLD.iv, OLD.message_type, OLD.audio_url, OLD.audio_duration,
            OLD.read, OLD.read_at, OLD.created_at, 'message_deletion',
            OLD.reply_to_message_id, OLD.reply_to_content, OLD.reply_to_sender_name, OLD.reply_to_is_current_user,
            OLD.auto_delete_scheduled_at, OLD.auto_delete_mode_when_sent, OLD.deleted_for_user_id
        );
        
        RETURN OLD;
    ELSE
        -- Find the corresponding archived match for new messages
        SELECT id INTO archived_match_record_id 
        FROM archived_matches 
        WHERE original_match_id = NEW.match_id 
        ORDER BY archived_at DESC 
        LIMIT 1;
        
        -- Create archived match if it doesn't exist
        IF archived_match_record_id IS NULL THEN
            INSERT INTO archived_matches (
                original_match_id, user_id_1, user_id_2, matched, is_dislike,
                has_unread_messages_1, has_unread_messages_2, notified_user_1, notified_user_2,
                last_message_at, match_created_at, archived_reason, message_count
            )
            SELECT 
                m.id, m.user_id_1, m.user_id_2, m.matched, m.is_dislike,
                m.has_unread_messages_1, m.has_unread_messages_2, m.notified_user_1, m.notified_user_2,
                m.last_message_at, m.created_at, 'message_creation', 0
            FROM matches m 
            WHERE m.id = NEW.match_id
            RETURNING id INTO archived_match_record_id;
        END IF;
        
        -- Archive the new message
        INSERT INTO archived_messages (
            original_message_id, original_match_id, archived_match_id, sender_id, receiver_id,
            content, encrypted_content, iv, message_type, audio_url, audio_duration,
            read, read_at, message_created_at, archived_reason,
            reply_to_message_id, reply_to_content, reply_to_sender_name, reply_to_is_current_user,
            auto_delete_scheduled_at, auto_delete_mode_when_sent, deleted_for_user_id
        ) VALUES (
            NEW.id, NEW.match_id, archived_match_record_id, NEW.sender_id, NEW.receiver_id,
            NEW.content, NEW.encrypted_content, NEW.iv, NEW.message_type, NEW.audio_url, NEW.audio_duration,
            NEW.read, NEW.read_at, NEW.created_at, 'message_creation',
            NEW.reply_to_message_id, NEW.reply_to_content, NEW.reply_to_sender_name, NEW.reply_to_is_current_user,
            NEW.auto_delete_scheduled_at, NEW.auto_delete_mode_when_sent, NEW.deleted_for_user_id
        )
        ON CONFLICT (original_message_id, archived_reason) DO UPDATE SET
            content = EXCLUDED.content,
            read = EXCLUDED.read,
            read_at = EXCLUDED.read_at,
            archived_at = NOW();
        
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic archival

-- User archival triggers
DROP TRIGGER IF EXISTS trigger_archive_user_on_insert ON users;
CREATE TRIGGER trigger_archive_user_on_insert
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION archive_user_data();

DROP TRIGGER IF EXISTS trigger_archive_user_on_update ON users;
CREATE TRIGGER trigger_archive_user_on_update
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN (
        OLD.full_name IS DISTINCT FROM NEW.full_name OR
        OLD.email IS DISTINCT FROM NEW.email OR
        OLD.phone_number IS DISTINCT FROM NEW.phone_number OR
        OLD.bio IS DISTINCT FROM NEW.bio OR
        OLD.profession IS DISTINCT FROM NEW.profession OR
        OLD.relationship_status IS DISTINCT FROM NEW.relationship_status OR
        OLD.verified_by_phone IS DISTINCT FROM NEW.verified_by_phone
    )
    EXECUTE FUNCTION archive_user_data();

-- Match archival triggers
DROP TRIGGER IF EXISTS trigger_archive_match_on_insert ON matches;
CREATE TRIGGER trigger_archive_match_on_insert
    AFTER INSERT ON matches
    FOR EACH ROW
    EXECUTE FUNCTION archive_match_data();

DROP TRIGGER IF EXISTS trigger_archive_match_on_update ON matches;
CREATE TRIGGER trigger_archive_match_on_update
    AFTER UPDATE ON matches
    FOR EACH ROW
    WHEN (OLD.matched IS DISTINCT FROM NEW.matched)
    EXECUTE FUNCTION archive_match_data();

DROP TRIGGER IF EXISTS trigger_archive_match_on_delete ON matches;
CREATE TRIGGER trigger_archive_match_on_delete
    BEFORE DELETE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION archive_match_data();

-- Message archival triggers
DROP TRIGGER IF EXISTS trigger_archive_message_on_insert ON messages;
CREATE TRIGGER trigger_archive_message_on_insert
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION archive_message_data();

DROP TRIGGER IF EXISTS trigger_archive_message_on_delete ON messages;
CREATE TRIGGER trigger_archive_message_on_delete
    BEFORE DELETE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION archive_message_data();

-- Add unique constraints for archived tables to prevent duplicate archival
ALTER TABLE archived_users 
DROP CONSTRAINT IF EXISTS unique_archived_user_reason;
ALTER TABLE archived_users 
ADD CONSTRAINT unique_archived_user_reason 
UNIQUE (original_user_id, archived_reason);

ALTER TABLE archived_matches 
DROP CONSTRAINT IF EXISTS unique_archived_match_reason;
ALTER TABLE archived_matches 
ADD CONSTRAINT unique_archived_match_reason 
UNIQUE (original_match_id, archived_reason);

ALTER TABLE archived_messages 
DROP CONSTRAINT IF EXISTS unique_archived_message_reason;
ALTER TABLE archived_messages 
ADD CONSTRAINT unique_archived_message_reason 
UNIQUE (original_message_id, archived_reason);

-- Create indexes for efficient querying of archived data
CREATE INDEX IF NOT EXISTS idx_archived_users_original_user_id ON archived_users(original_user_id);
CREATE INDEX IF NOT EXISTS idx_archived_users_archived_at ON archived_users(archived_at);
CREATE INDEX IF NOT EXISTS idx_archived_users_archived_reason ON archived_users(archived_reason);

CREATE INDEX IF NOT EXISTS idx_archived_matches_original_match_id ON archived_matches(original_match_id);
CREATE INDEX IF NOT EXISTS idx_archived_matches_user_ids ON archived_matches(user_id_1, user_id_2);
CREATE INDEX IF NOT EXISTS idx_archived_matches_archived_at ON archived_matches(archived_at);

CREATE INDEX IF NOT EXISTS idx_archived_messages_original_message_id ON archived_messages(original_message_id);
CREATE INDEX IF NOT EXISTS idx_archived_messages_archived_match_id ON archived_messages(archived_match_id);
CREATE INDEX IF NOT EXISTS idx_archived_messages_sender_receiver ON archived_messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_archived_messages_archived_at ON archived_messages(archived_at);

-- Function to manually archive existing data (one-time setup)
CREATE OR REPLACE FUNCTION archive_existing_data()
RETURNS TEXT AS $$
DECLARE
    user_count INTEGER := 0;
    match_count INTEGER := 0;
    message_count INTEGER := 0;
BEGIN
    -- Archive all existing users
    INSERT INTO archived_users (
        original_user_id, username, full_name, email, phone_number, gender,
        location, country_of_origin, bio, profession, ethnicity, secondary_tribe,
        religion, photo_url, show_profile_photo, date_of_birth, relationship_status,
        relationship_goal, interests, visibility_preferences, verified_by_phone,
        two_factor_enabled, profile_hidden, ghost_mode, is_online, last_active,
        user_created_at, archived_reason, archived_by_user_id
    )
    SELECT 
        id, username, full_name, email, phone_number, gender,
        location, country_of_origin, bio, profession, ethnicity, secondary_tribe,
        religion, photo_url, show_profile_photo, date_of_birth, relationship_status,
        relationship_goal, interests, visibility_preferences, verified_by_phone,
        two_factor_enabled, profile_hidden, ghost_mode, is_online, last_active,
        created_at, 'initial_backup', id
    FROM users
    ON CONFLICT (original_user_id, archived_reason) DO NOTHING;
    
    GET DIAGNOSTICS user_count = ROW_COUNT;
    
    -- Archive all existing matches
    INSERT INTO archived_matches (
        original_match_id, user_id_1, user_id_2, matched, is_dislike,
        has_unread_messages_1, has_unread_messages_2, notified_user_1, notified_user_2,
        last_message_at, match_created_at, archived_reason, message_count
    )
    SELECT 
        m.id, m.user_id_1, m.user_id_2, m.matched, m.is_dislike,
        m.has_unread_messages_1, m.has_unread_messages_2, m.notified_user_1, m.notified_user_2,
        m.last_message_at, m.created_at, 'initial_backup',
        COALESCE((SELECT COUNT(*) FROM messages WHERE match_id = m.id), 0)
    FROM matches m
    ON CONFLICT (original_match_id, archived_reason) DO NOTHING;
    
    GET DIAGNOSTICS match_count = ROW_COUNT;
    
    -- Archive all existing messages
    INSERT INTO archived_messages (
        original_message_id, original_match_id, archived_match_id, sender_id, receiver_id,
        content, encrypted_content, iv, message_type, audio_url, audio_duration,
        read, read_at, message_created_at, archived_reason,
        reply_to_message_id, reply_to_content, reply_to_sender_name, reply_to_is_current_user,
        auto_delete_scheduled_at, auto_delete_mode_when_sent, deleted_for_user_id
    )
    SELECT 
        msg.id, msg.match_id, am.id, msg.sender_id, msg.receiver_id,
        msg.content, msg.encrypted_content, msg.iv, msg.message_type, msg.audio_url, msg.audio_duration,
        msg.read, msg.read_at, msg.created_at, 'initial_backup',
        msg.reply_to_message_id, msg.reply_to_content, msg.reply_to_sender_name, msg.reply_to_is_current_user,
        msg.auto_delete_scheduled_at, msg.auto_delete_mode_when_sent, msg.deleted_for_user_id
    FROM messages msg
    JOIN archived_matches am ON am.original_match_id = msg.match_id AND am.archived_reason = 'initial_backup'
    ON CONFLICT (original_message_id, archived_reason) DO NOTHING;
    
    GET DIAGNOSTICS message_count = ROW_COUNT;
    
    RETURN format('Successfully archived %s users, %s matches, and %s messages', 
                  user_count, match_count, message_count);
END;
$$ LANGUAGE plpgsql;

-- Archival system status and statistics function
CREATE OR REPLACE FUNCTION get_archival_statistics()
RETURNS TABLE (
    table_name TEXT,
    total_records BIGINT,
    archived_today BIGINT,
    archived_this_week BIGINT,
    archived_this_month BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'users'::TEXT,
        (SELECT COUNT(*) FROM archived_users),
        (SELECT COUNT(*) FROM archived_users WHERE archived_at >= CURRENT_DATE),
        (SELECT COUNT(*) FROM archived_users WHERE archived_at >= CURRENT_DATE - INTERVAL '7 days'),
        (SELECT COUNT(*) FROM archived_users WHERE archived_at >= CURRENT_DATE - INTERVAL '30 days')
    UNION ALL
    SELECT 
        'matches'::TEXT,
        (SELECT COUNT(*) FROM archived_matches),
        (SELECT COUNT(*) FROM archived_matches WHERE archived_at >= CURRENT_DATE),
        (SELECT COUNT(*) FROM archived_matches WHERE archived_at >= CURRENT_DATE - INTERVAL '7 days'),
        (SELECT COUNT(*) FROM archived_matches WHERE archived_at >= CURRENT_DATE - INTERVAL '30 days')
    UNION ALL
    SELECT 
        'messages'::TEXT,
        (SELECT COUNT(*) FROM archived_messages),
        (SELECT COUNT(*) FROM archived_messages WHERE archived_at >= CURRENT_DATE),
        (SELECT COUNT(*) FROM archived_messages WHERE archived_at >= CURRENT_DATE - INTERVAL '7 days'),
        (SELECT COUNT(*) FROM archived_messages WHERE archived_at >= CURRENT_DATE - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- Security function to verify data integrity between live and archived tables
CREATE OR REPLACE FUNCTION verify_archival_integrity()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Check if all users have initial backup
    SELECT 
        'User Initial Backup Coverage'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM users u 
                WHERE NOT EXISTS (
                    SELECT 1 FROM archived_users au 
                    WHERE au.original_user_id = u.id 
                    AND au.archived_reason = 'initial_backup'
                )
            ) THEN 'INCOMPLETE'::TEXT
            ELSE 'COMPLETE'::TEXT
        END,
        format('Users without backup: %s', 
            (SELECT COUNT(*) FROM users u 
             WHERE NOT EXISTS (
                 SELECT 1 FROM archived_users au 
                 WHERE au.original_user_id = u.id 
                 AND au.archived_reason = 'initial_backup'
             ))
        )
    UNION ALL
    -- Check if all matches have initial backup
    SELECT 
        'Match Initial Backup Coverage'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM matches m 
                WHERE NOT EXISTS (
                    SELECT 1 FROM archived_matches am 
                    WHERE am.original_match_id = m.id 
                    AND am.archived_reason = 'initial_backup'
                )
            ) THEN 'INCOMPLETE'::TEXT
            ELSE 'COMPLETE'::TEXT
        END,
        format('Matches without backup: %s', 
            (SELECT COUNT(*) FROM matches m 
             WHERE NOT EXISTS (
                 SELECT 1 FROM archived_matches am 
                 WHERE am.original_match_id = m.id 
                 AND am.archived_reason = 'initial_backup'
             ))
        )
    UNION ALL
    -- Check if all messages have initial backup
    SELECT 
        'Message Initial Backup Coverage'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM messages msg 
                WHERE NOT EXISTS (
                    SELECT 1 FROM archived_messages amsg 
                    WHERE amsg.original_message_id = msg.id 
                    AND amsg.archived_reason = 'initial_backup'
                )
            ) THEN 'INCOMPLETE'::TEXT
            ELSE 'COMPLETE'::TEXT
        END,
        format('Messages without backup: %s', 
            (SELECT COUNT(*) FROM messages msg 
             WHERE NOT EXISTS (
                 SELECT 1 FROM archived_messages amsg 
                 WHERE amsg.original_message_id = msg.id 
                 AND amsg.archived_reason = 'initial_backup'
             ))
        );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION archive_existing_data() TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_archival_statistics() TO PUBLIC;
GRANT EXECUTE ON FUNCTION verify_archival_integrity() TO PUBLIC;

-- Log successful setup
DO $$
BEGIN
    RAISE NOTICE 'Archival system setup completed successfully at %', NOW();
    RAISE NOTICE 'Run SELECT archive_existing_data(); to archive all existing data';
    RAISE NOTICE 'Run SELECT * FROM get_archival_statistics(); to view statistics';
    RAISE NOTICE 'Run SELECT * FROM verify_archival_integrity(); to verify data integrity';
END $$;