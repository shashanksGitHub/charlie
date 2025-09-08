-- RECIPROCITY & ENGAGEMENT DATA COLLECTION SETUP
-- Creates tables and triggers for tracking user interactions needed for Context-Aware Re-ranking

-- ===============================
-- PROFILE VIEWS TRACKING TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS profile_views (
  id SERIAL PRIMARY KEY,
  viewer_id INTEGER NOT NULL REFERENCES users(id),
  viewed_id INTEGER NOT NULL REFERENCES users(id),
  view_count INTEGER NOT NULL DEFAULT 1,
  first_viewed_at TIMESTAMP DEFAULT NOW(),
  last_viewed_at TIMESTAMP DEFAULT NOW(),
  total_view_duration INTEGER DEFAULT 0, -- Total seconds spent viewing
  app_mode TEXT NOT NULL DEFAULT 'MEET', -- "MEET", "HEAT", "SUITE_NETWORKING", etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent duplicate viewer-viewed pairs per app mode
  UNIQUE(viewer_id, viewed_id, app_mode)
);

-- Index for fast reciprocity queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profile_views_viewer_viewed 
ON profile_views(viewer_id, viewed_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profile_views_app_mode 
ON profile_views(app_mode, last_viewed_at);

-- ===============================
-- MESSAGE ENGAGEMENT METRICS TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS message_engagement_metrics (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  receiver_id INTEGER NOT NULL REFERENCES users(id),
  message_length INTEGER NOT NULL,
  has_question BOOLEAN NOT NULL DEFAULT false,
  has_exclamation BOOLEAN NOT NULL DEFAULT false,
  word_count INTEGER NOT NULL,
  sentiment_score REAL DEFAULT 0, -- -1 to 1 sentiment analysis
  read_time INTEGER, -- Seconds to read message
  response_time INTEGER, -- Seconds until response
  engagement_score REAL DEFAULT 0.5, -- 0-1 calculated engagement score
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- One metric record per message
  UNIQUE(message_id)
);

-- Index for engagement analysis queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_engagement_participants 
ON message_engagement_metrics(sender_id, receiver_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_engagement_score 
ON message_engagement_metrics(engagement_score, created_at);

-- ===============================
-- CONVERSATION THREADS TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS conversation_threads (
  id SERIAL PRIMARY KEY,
  participant_one_id INTEGER NOT NULL REFERENCES users(id),
  participant_two_id INTEGER NOT NULL REFERENCES users(id),
  thread_id TEXT NOT NULL UNIQUE, -- Format: "userId1-userId2" (lower ID first)
  total_messages INTEGER NOT NULL DEFAULT 0,
  messages_from_one INTEGER NOT NULL DEFAULT 0,
  messages_from_two INTEGER NOT NULL DEFAULT 0,
  average_response_time REAL DEFAULT 0, -- Hours
  conversation_depth INTEGER DEFAULT 0, -- Number of back-and-forth exchanges
  last_activity_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  app_mode TEXT NOT NULL DEFAULT 'MEET', -- "MEET", "HEAT", "SUITE"
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure participant_one_id is always the lower ID
  CHECK (participant_one_id < participant_two_id)
);

-- Index for fast conversation lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_threads_participants 
ON conversation_threads(participant_one_id, participant_two_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_threads_activity 
ON conversation_threads(is_active, last_activity_at);

-- ===============================
-- AUTOMATIC PROFILE VIEW TRACKING TRIGGER
-- ===============================
CREATE OR REPLACE FUNCTION track_profile_view()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called from frontend when users view profiles
  -- For now, it's a placeholder for future implementation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- MESSAGE ENGAGEMENT ANALYSIS TRIGGER
-- ===============================
CREATE OR REPLACE FUNCTION analyze_message_engagement()
RETURNS TRIGGER AS $$
DECLARE
  msg_length INTEGER;
  msg_words INTEGER;
  has_question_mark BOOLEAN;
  has_exclamation_mark BOOLEAN;
  calculated_score REAL;
BEGIN
  -- Extract message metrics
  msg_length := LENGTH(NEW.content);
  msg_words := array_length(string_to_array(trim(NEW.content), ' '), 1);
  has_question_mark := NEW.content LIKE '%?%';
  has_exclamation_mark := NEW.content LIKE '%!%';
  
  -- Calculate basic engagement score
  calculated_score := 0.3; -- Base score
  
  -- Length bonus (up to 0.3 points)
  IF msg_length > 100 THEN calculated_score := calculated_score + 0.3;
  ELSIF msg_length > 50 THEN calculated_score := calculated_score + 0.2;
  ELSIF msg_length > 20 THEN calculated_score := calculated_score + 0.1;
  END IF;
  
  -- Question bonus (0.2 points)
  IF has_question_mark THEN calculated_score := calculated_score + 0.2; END IF;
  
  -- Enthusiasm bonus (0.2 points)
  IF has_exclamation_mark THEN calculated_score := calculated_score + 0.2; END IF;
  
  -- Clamp score to 0-1 range
  calculated_score := GREATEST(0, LEAST(1, calculated_score));
  
  -- Insert engagement metrics
  INSERT INTO message_engagement_metrics (
    message_id, sender_id, receiver_id, message_length, 
    has_question, has_exclamation, word_count, engagement_score
  ) VALUES (
    NEW.id, NEW.sender_id, NEW.receiver_id, msg_length,
    has_question_mark, has_exclamation_mark, COALESCE(msg_words, 1), calculated_score
  );
  
  -- Update or create conversation thread
  INSERT INTO conversation_threads (
    participant_one_id, participant_two_id, thread_id, 
    total_messages, messages_from_one, messages_from_two, last_activity_at
  ) VALUES (
    LEAST(NEW.sender_id, NEW.receiver_id),
    GREATEST(NEW.sender_id, NEW.receiver_id),
    LEAST(NEW.sender_id, NEW.receiver_id) || '-' || GREATEST(NEW.sender_id, NEW.receiver_id),
    1, 
    CASE WHEN NEW.sender_id < NEW.receiver_id THEN 1 ELSE 0 END,
    CASE WHEN NEW.sender_id > NEW.receiver_id THEN 1 ELSE 0 END,
    NEW.created_at
  )
  ON CONFLICT (thread_id) DO UPDATE SET
    total_messages = conversation_threads.total_messages + 1,
    messages_from_one = CASE 
      WHEN NEW.sender_id = conversation_threads.participant_one_id 
      THEN conversation_threads.messages_from_one + 1 
      ELSE conversation_threads.messages_from_one 
    END,
    messages_from_two = CASE 
      WHEN NEW.sender_id = conversation_threads.participant_two_id 
      THEN conversation_threads.messages_from_two + 1 
      ELSE conversation_threads.messages_from_two 
    END,
    last_activity_at = NEW.created_at,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to analyze messages automatically
DROP TRIGGER IF EXISTS trigger_analyze_message_engagement ON messages;
CREATE TRIGGER trigger_analyze_message_engagement
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION analyze_message_engagement();

-- ===============================
-- PROFILE VIEW UPSERT FUNCTION
-- ===============================
CREATE OR REPLACE FUNCTION upsert_profile_view(
  p_viewer_id INTEGER,
  p_viewed_id INTEGER,
  p_app_mode TEXT DEFAULT 'MEET',
  p_view_duration INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
  INSERT INTO profile_views (
    viewer_id, viewed_id, app_mode, view_count, 
    total_view_duration, last_viewed_at
  ) VALUES (
    p_viewer_id, p_viewed_id, p_app_mode, 1, 
    p_view_duration, NOW()
  )
  ON CONFLICT (viewer_id, viewed_id, app_mode) DO UPDATE SET
    view_count = profile_views.view_count + 1,
    total_view_duration = profile_views.total_view_duration + p_view_duration,
    last_viewed_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- RECIPROCITY DATA ANALYSIS VIEWS
-- ===============================
CREATE OR REPLACE VIEW reciprocity_response_rates AS
SELECT 
  ct.participant_one_id as user_id,
  ct.participant_two_id as target_user_id,
  ct.thread_id,
  ct.total_messages,
  ct.messages_from_one,
  ct.messages_from_two,
  ct.average_response_time,
  ct.conversation_depth,
  CASE 
    WHEN ct.messages_from_one > 0 AND ct.messages_from_two > 0 
    THEN LEAST(ct.messages_from_one::REAL / GREATEST(ct.messages_from_two, 1), 1.0)
    ELSE 0
  END as response_rate_one_to_two,
  CASE 
    WHEN ct.messages_from_two > 0 AND ct.messages_from_one > 0 
    THEN LEAST(ct.messages_from_two::REAL / GREATEST(ct.messages_from_one, 1), 1.0)
    ELSE 0
  END as response_rate_two_to_one,
  ct.last_activity_at,
  ct.app_mode
FROM conversation_threads ct
WHERE ct.is_active = true;

CREATE OR REPLACE VIEW engagement_quality_summary AS
SELECT 
  mem.sender_id as user_id,
  mem.receiver_id as target_user_id,
  COUNT(*) as total_messages,
  AVG(mem.message_length) as avg_message_length,
  AVG(mem.word_count) as avg_word_count,
  AVG(mem.engagement_score) as avg_engagement_score,
  COUNT(CASE WHEN mem.has_question THEN 1 END)::REAL / COUNT(*) as question_rate,
  COUNT(CASE WHEN mem.has_exclamation THEN 1 END)::REAL / COUNT(*) as enthusiasm_rate,
  COUNT(CASE WHEN mem.message_length > 50 THEN 1 END)::REAL / COUNT(*) as substantial_message_rate,
  MAX(mem.created_at) as last_message_at
FROM message_engagement_metrics mem
GROUP BY mem.sender_id, mem.receiver_id;

-- ===============================
-- GRANT PERMISSIONS FOR WEB APPLICATION
-- ===============================
-- Note: Adjust user permissions based on your database setup
-- GRANT SELECT, INSERT, UPDATE ON profile_views TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON message_engagement_metrics TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON conversation_threads TO your_app_user;

COMMENT ON TABLE profile_views IS 'Tracks profile viewing patterns for reciprocity analysis in Context-Aware Re-ranking';
COMMENT ON TABLE message_engagement_metrics IS 'Analyzes message quality and engagement for conversation depth scoring';
COMMENT ON TABLE conversation_threads IS 'Tracks conversation patterns and response rates between user pairs';
COMMENT ON FUNCTION upsert_profile_view IS 'Safely increments profile view counts with duration tracking';
COMMENT ON VIEW reciprocity_response_rates IS 'Pre-calculated response rates for efficient reciprocity scoring';
COMMENT ON VIEW engagement_quality_summary IS 'Aggregated engagement metrics for quality analysis';

-- Success message
SELECT 'Reciprocity & Engagement data collection tables created successfully' AS status;