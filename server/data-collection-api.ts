/**
 * DATA COLLECTION API FOR RECIPROCITY & ENGAGEMENT SCORING
 * 
 * Provides API endpoints to track profile views and other user interactions
 * needed for Context-Aware Re-ranking in the Hybrid Matching Engine
 */

import { Request, Response } from 'express';
import { storage } from './storage';

// ===============================
// PROFILE VIEW TRACKING
// ===============================

/**
 * Track when a user views another user's profile
 * POST /api/tracking/profile-view
 */
export async function trackProfileView(req: Request, res: Response) {
  try {
    const { viewerId, viewedId, appMode = 'MEET', duration = 0 } = req.body;

    if (!viewerId || !viewedId) {
      return res.status(400).json({ 
        error: 'Missing required fields: viewerId, viewedId' 
      });
    }

    // Prevent self-viewing tracking
    if (viewerId === viewedId) {
      return res.status(400).json({ 
        error: 'Cannot track self-profile views' 
      });
    }

    console.log(`[PROFILE-VIEW-TRACKING] User ${viewerId} viewed ${viewedId} (${appMode}) for ${duration}s`);

    // Use database function to track profile view
    await storage.query(`
      SELECT upsert_profile_view($1, $2, $3, $4)
    `, [viewerId, viewedId, appMode, duration]);

    res.json({ 
      success: true, 
      message: 'Profile view tracked successfully',
      data: { viewerId, viewedId, appMode, duration }
    });

  } catch (error) {
    console.error('[PROFILE-VIEW-TRACKING] Error tracking profile view:', error);
    res.status(500).json({ 
      error: 'Failed to track profile view',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}

/**
 * Get profile view analytics for a user
 * GET /api/tracking/profile-views/:userId
 */
export async function getProfileViewAnalytics(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { appMode = 'MEET', timeframe = '30' } = req.query;

    console.log(`[PROFILE-ANALYTICS] Getting view analytics for user ${userId} (${appMode})`);

    // Get views received by this user
    const viewsReceived = await storage.query(`
      SELECT 
        viewer_id,
        view_count,
        total_view_duration,
        first_viewed_at,
        last_viewed_at,
        EXTRACT(EPOCH FROM (NOW() - last_viewed_at))/86400 as days_since_view
      FROM profile_views 
      WHERE viewed_id = $1 
        AND app_mode = $2
        AND last_viewed_at >= NOW() - INTERVAL '${timeframe} days'
      ORDER BY last_viewed_at DESC
      LIMIT 50
    `, [userId, appMode]);

    // Get views made by this user
    const viewsMade = await storage.query(`
      SELECT 
        viewed_id,
        view_count,
        total_view_duration,
        first_viewed_at,
        last_viewed_at,
        EXTRACT(EPOCH FROM (NOW() - last_viewed_at))/86400 as days_since_view
      FROM profile_views 
      WHERE viewer_id = $1 
        AND app_mode = $2
        AND last_viewed_at >= NOW() - INTERVAL '${timeframe} days'
      ORDER BY last_viewed_at DESC
      LIMIT 50
    `, [userId, appMode]);

    // Summary statistics
    const summary = await storage.query(`
      SELECT 
        COUNT(CASE WHEN viewed_id = $1 THEN 1 END) as views_received_count,
        COUNT(CASE WHEN viewer_id = $1 THEN 1 END) as views_made_count,
        AVG(CASE WHEN viewed_id = $1 THEN view_count END) as avg_views_received,
        AVG(CASE WHEN viewer_id = $1 THEN view_count END) as avg_views_made,
        SUM(CASE WHEN viewed_id = $1 THEN total_view_duration END) as total_duration_received,
        SUM(CASE WHEN viewer_id = $1 THEN total_view_duration END) as total_duration_made
      FROM profile_views 
      WHERE (viewer_id = $1 OR viewed_id = $1)
        AND app_mode = $2
        AND last_viewed_at >= NOW() - INTERVAL '${timeframe} days'
    `, [userId, appMode]);

    res.json({
      success: true,
      data: {
        summary: summary[0] || {},
        viewsReceived: viewsReceived,
        viewsMade: viewsMade,
        timeframe: `${timeframe} days`,
        appMode
      }
    });

  } catch (error) {
    console.error('[PROFILE-ANALYTICS] Error getting analytics:', error);
    res.status(500).json({ 
      error: 'Failed to get profile view analytics',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}

// ===============================
// MESSAGE ENGAGEMENT ANALYTICS
// ===============================

/**
 * Get message engagement analytics between two users
 * GET /api/tracking/message-engagement/:userId/:targetUserId
 */
export async function getMessageEngagementAnalytics(req: Request, res: Response) {
  try {
    const { userId, targetUserId } = req.params;
    const { timeframe = '30' } = req.query;

    console.log(`[MESSAGE-ANALYTICS] Getting engagement analytics: ${userId} ↔ ${targetUserId}`);

    // Get engagement metrics summary
    const engagementSummary = await storage.query(`
      SELECT 
        COUNT(*) as total_messages,
        AVG(message_length) as avg_message_length,
        AVG(word_count) as avg_word_count,
        AVG(engagement_score) as avg_engagement_score,
        COUNT(CASE WHEN has_question THEN 1 END)::REAL / COUNT(*) as question_rate,
        COUNT(CASE WHEN has_exclamation THEN 1 END)::REAL / COUNT(*) as enthusiasm_rate,
        COUNT(CASE WHEN message_length > 50 THEN 1 END)::REAL / COUNT(*) as substantial_rate,
        MAX(created_at) as last_message_at
      FROM message_engagement_metrics
      WHERE ((sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1))
        AND created_at >= NOW() - INTERVAL '${timeframe} days'
    `, [userId, targetUserId]);

    // Get conversation thread info
    const threadInfo = await storage.query(`
      SELECT 
        thread_id,
        total_messages,
        messages_from_one,
        messages_from_two,
        average_response_time,
        conversation_depth,
        last_activity_at,
        EXTRACT(EPOCH FROM (NOW() - last_activity_at))/86400 as days_since_activity
      FROM conversation_threads
      WHERE (participant_one_id = LEAST($1, $2) 
         AND participant_two_id = GREATEST($1, $2))
        AND is_active = true
    `, [userId, targetUserId]);

    // Recent engagement scores trend
    const engagementTrend = await storage.query(`
      SELECT 
        DATE(created_at) as date,
        AVG(engagement_score) as avg_engagement,
        COUNT(*) as message_count
      FROM message_engagement_metrics
      WHERE ((sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1))
        AND created_at >= NOW() - INTERVAL '${timeframe} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      LIMIT 30
    `, [userId, targetUserId]);

    res.json({
      success: true,
      data: {
        engagementSummary: engagementSummary[0] || {},
        threadInfo: threadInfo[0] || {},
        engagementTrend: engagementTrend,
        timeframe: `${timeframe} days`
      }
    });

  } catch (error) {
    console.error('[MESSAGE-ANALYTICS] Error getting engagement analytics:', error);
    res.status(500).json({ 
      error: 'Failed to get message engagement analytics',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}

// ===============================
// RECIPROCITY SCORING ANALYTICS
// ===============================

/**
 * Get reciprocity score for two users
 * GET /api/tracking/reciprocity-score/:userId/:targetUserId
 */
export async function getReciprocityScore(req: Request, res: Response) {
  try {
    const { userId, targetUserId } = req.params;

    console.log(`[RECIPROCITY-ANALYTICS] Calculating reciprocity score: ${userId} ↔ ${targetUserId}`);

    // Import user behavior patterns for reciprocity calculation
    const { userBehaviorPatterns } = await import('./user-behavior-patterns');

    // Calculate comprehensive reciprocity profile
    const reciprocityProfile = await userBehaviorPatterns.calculateReciprocityEngagementProfile(
      parseInt(userId), 
      parseInt(targetUserId)
    );

    res.json({
      success: true,
      data: reciprocityProfile
    });

  } catch (error) {
    console.error('[RECIPROCITY-ANALYTICS] Error calculating reciprocity score:', error);
    res.status(500).json({ 
      error: 'Failed to calculate reciprocity score',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}

// ===============================
// BULK DATA COLLECTION STATUS
// ===============================

/**
 * Get data collection readiness status
 * GET /api/tracking/readiness-status
 */
export async function getDataCollectionStatus(req: Request, res: Response) {
  try {
    console.log('[DATA-STATUS] Checking data collection readiness');

    // Check table existence and data availability
    const [profileViewsCount, engagementCount, threadsCount, messagesCount, swipeCount] = await Promise.all([
      storage.query(`SELECT COUNT(*) as count FROM profile_views`),
      storage.query(`SELECT COUNT(*) as count FROM message_engagement_metrics`),
      storage.query(`SELECT COUNT(*) as count FROM conversation_threads`),
      storage.query(`SELECT COUNT(*) as count FROM messages`),
      storage.query(`SELECT COUNT(*) as count FROM swipe_history`)
    ]);

    // Import user behavior patterns for readiness check
    const { userBehaviorPatterns } = await import('./user-behavior-patterns');
    const indicatorStatus = await userBehaviorPatterns.checkMutualInterestReadiness();

    const status = {
      infrastructure: {
        profileViewsTable: true,
        messageEngagementTable: true,
        conversationThreadsTable: true
      },
      dataAvailability: {
        profileViews: Number(profileViewsCount[0].count),
        messageEngagement: Number(engagementCount[0].count),
        conversationThreads: Number(threadsCount[0].count),
        totalMessages: Number(messagesCount[0].count),
        totalSwipes: Number(swipeCount[0].count)
      },
      indicators: indicatorStatus,
      readyForProduction: indicatorStatus.implementationStatus === 'READY',
      dataCollectionActive: true
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('[DATA-STATUS] Error checking readiness:', error);
    res.status(500).json({ 
      error: 'Failed to check data collection status',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}

// ===============================
// BACKFILL DATA FROM EXISTING MESSAGES
// ===============================

/**
 * Backfill engagement metrics for existing messages
 * POST /api/tracking/backfill-engagement
 */
export async function backfillEngagementMetrics(req: Request, res: Response) {
  try {
    const { limit = 1000 } = req.body || {};

    console.log(`[BACKFILL] Starting engagement metrics backfill for ${limit} messages`);

    // Get messages that don't have engagement metrics yet
    const unprocessedMessages = await storage.query(`
      SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at
      FROM messages m
      LEFT JOIN message_engagement_metrics mem ON m.id = mem.message_id
      WHERE mem.message_id IS NULL
        AND m.content IS NOT NULL 
        AND m.content != ''
      ORDER BY m.created_at DESC
      LIMIT $1
    `, [limit]);

    if (unprocessedMessages.length === 0) {
      return res.json({
        success: true,
        message: 'No messages to backfill',
        processed: 0
      });
    }

    let processedCount = 0;

    // Process messages in batches
    for (const message of unprocessedMessages) {
      try {
        const content = message.content || '';
        const msgLength = content.length;
        const msgWords = content.trim().split(/\s+/).length;
        const hasQuestion = content.includes('?');
        const hasExclamation = content.includes('!');

        // Calculate engagement score (0-100 scale)
        let score = 30; // Base score
        if (msgLength > 100) score += 30;
        else if (msgLength > 50) score += 20;
        else if (msgLength > 20) score += 10;
        if (hasQuestion) score += 20;
        if (hasExclamation) score += 20;
        score = Math.max(0, Math.min(100, score));

        // Insert engagement metrics
        await storage.query(`
          INSERT INTO message_engagement_metrics (
            message_id, sender_id, receiver_id, message_length,
            has_question, has_exclamation, word_count, engagement_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [message.id, message.sender_id, message.receiver_id, msgLength,
            hasQuestion, hasExclamation, msgWords, score]);

        processedCount++;

      } catch (error) {
        console.error(`[BACKFILL] Failed to process message ${message.id}:`, error);
      }
    }

    console.log(`[BACKFILL] Completed: ${processedCount}/${unprocessedMessages.length} messages processed`);

    res.json({
      success: true,
      message: `Backfill completed: ${processedCount} messages processed`,
      processed: processedCount,
      total: unprocessedMessages.length
    });

  } catch (error) {
    console.error('[BACKFILL] Error during backfill:', error);
    res.status(500).json({ 
      error: 'Failed to backfill engagement metrics',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}