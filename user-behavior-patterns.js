/**
 * USER BEHAVIOR PATTERNS FOR CONTEXT-AWARE RE-RANKING
 *
 * Temporal Context Factors implementation for real-time user engagement analysis
 * Part of the CHARLEY Hybrid Matching Engine's Context-Aware Re-ranking component
 */
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
const sql = neon(process.env.DATABASE_URL);
export class UserBehaviorPatterns {
    /**
     * TEMPORAL FACTOR 1: Online Status Detection
     * Real-time user engagement boost for currently active users
     */
    async calculateOnlineStatus(userId) {
        try {
            console.log(`[USER-BEHAVIOR] Calculating online status for user ${userId}`);
            const userActivity = await sql `
        SELECT 
          id,
          last_active,
          is_online,
          EXTRACT(EPOCH FROM (NOW() - last_active))/60 as minutes_since_active
        FROM users 
        WHERE id = ${userId}
      `;
            if (userActivity.length === 0) {
                return { isOnline: false, onlineBoost: 0 };
            }
            const user = userActivity[0];
            const minutesSinceActive = user.minutes_since_active ? Number(user.minutes_since_active) : null;
            let isOnline = false;
            let onlineBoost = 0;
            if (user.is_online === true) {
                isOnline = true;
                onlineBoost = 1.0; // Maximum boost for explicitly online users
            }
            else if (minutesSinceActive !== null) {
                if (minutesSinceActive <= 5) {
                    isOnline = true;
                    onlineBoost = 1.0; // Online within 5 minutes
                }
                else if (minutesSinceActive <= 15) {
                    isOnline = false;
                    onlineBoost = 0.8; // Recently active boost
                }
                else if (minutesSinceActive <= 30) {
                    isOnline = false;
                    onlineBoost = 0.6; // Moderately recent activity
                }
                else if (minutesSinceActive <= 120) {
                    isOnline = false;
                    onlineBoost = 0.3; // Some recent activity
                }
                else {
                    isOnline = false;
                    onlineBoost = 0.1; // Minimal boost for older activity
                }
            }
            console.log(`[USER-BEHAVIOR] User ${userId} online status: ${isOnline} (boost: ${onlineBoost.toFixed(2)})`);
            return { isOnline, onlineBoost };
        }
        catch (error) {
            console.error(`[USER-BEHAVIOR] Error calculating online status for user ${userId}:`, error);
            return { isOnline: false, onlineBoost: 0 };
        }
    }
    /**
     * TEMPORAL FACTOR 2: Last Active Recency Scoring
     * Time-decay scoring based on user's last activity timestamp
     */
    async calculateRecencyScore(userId) {
        try {
            console.log(`[USER-BEHAVIOR] Calculating recency score for user ${userId}`);
            const userRecency = await sql `
        SELECT 
          id,
          last_active,
          CASE 
            WHEN last_active IS NULL THEN 0
            WHEN last_active >= NOW() - INTERVAL '1 hour' THEN 100
            WHEN last_active >= NOW() - INTERVAL '6 hours' THEN 80
            WHEN last_active >= NOW() - INTERVAL '24 hours' THEN 60
            WHEN last_active >= NOW() - INTERVAL '3 days' THEN 40
            WHEN last_active >= NOW() - INTERVAL '7 days' THEN 20
            ELSE 10
          END as recency_score,
          EXTRACT(EPOCH FROM (NOW() - last_active))/3600 as hours_since_active
        FROM users 
        WHERE id = ${userId}
      `;
            if (userRecency.length === 0) {
                return 0;
            }
            const recencyScore = Number(userRecency[0].recency_score);
            const hoursAgo = userRecency[0].hours_since_active ? Number(userRecency[0].hours_since_active).toFixed(1) : 'Unknown';
            console.log(`[USER-BEHAVIOR] User ${userId} recency score: ${recencyScore}/100 (${hoursAgo}h ago)`);
            return recencyScore / 100; // Normalize to 0-1 scale
        }
        catch (error) {
            console.error(`[USER-BEHAVIOR] Error calculating recency score for user ${userId}:`, error);
            return 0.1; // Minimal fallback score
        }
    }
    /**
     * TEMPORAL FACTOR 3: Profile Update Freshness
     * Boost users with recently updated profiles indicating active engagement
     */
    async calculateProfileFreshness(userId) {
        try {
            console.log(`[USER-BEHAVIOR] Calculating profile freshness for user ${userId}`);
            // Check for updated_at column first
            const updateTimestamp = await sql `
        SELECT 
          id,
          updated_at,
          created_at,
          CASE 
            WHEN updated_at IS NOT NULL THEN
              CASE 
                WHEN updated_at >= NOW() - INTERVAL '24 hours' THEN 100
                WHEN updated_at >= NOW() - INTERVAL '7 days' THEN 80
                WHEN updated_at >= NOW() - INTERVAL '30 days' THEN 60
                WHEN updated_at >= NOW() - INTERVAL '90 days' THEN 40
                ELSE 20
              END
            WHEN created_at >= NOW() - INTERVAL '7 days' THEN 70
            WHEN created_at >= NOW() - INTERVAL '30 days' THEN 50
            ELSE 30
          END as freshness_score,
          EXTRACT(EPOCH FROM (NOW() - COALESCE(updated_at, created_at)))/86400 as days_since_update
        FROM users 
        WHERE id = ${userId}
      `;
            if (updateTimestamp.length === 0) {
                return 0.3; // Default moderate freshness for unknown users
            }
            const freshnessScore = Number(updateTimestamp[0].freshness_score);
            const daysAgo = updateTimestamp[0].days_since_update ? Number(updateTimestamp[0].days_since_update).toFixed(1) : 'Unknown';
            console.log(`[USER-BEHAVIOR] User ${userId} profile freshness: ${freshnessScore}/100 (${daysAgo} days since update)`);
            return freshnessScore / 100; // Normalize to 0-1 scale
        }
        catch (error) {
            console.error(`[USER-BEHAVIOR] Error calculating profile freshness for user ${userId}:`, error);
            return 0.3; // Fallback moderate freshness
        }
    }
    /**
     * TEMPORAL FACTOR 4: Peak Activity Hours Analysis
     * Identify user's most active hours for temporal compatibility matching
     */
    async analyzePeakActivityHours(userId) {
        try {
            console.log(`[USER-BEHAVIOR] Analyzing peak activity hours for user ${userId}`);
            // Analyze message activity patterns
            const messageActivity = await sql `
        SELECT 
          EXTRACT(HOUR FROM created_at) as activity_hour,
          COUNT(*) as message_count
        FROM messages 
        WHERE sender_id = ${userId}
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY message_count DESC
        LIMIT 5
      `;
            // Analyze swipe activity patterns
            const swipeActivity = await sql `
        SELECT 
          EXTRACT(HOUR FROM timestamp) as activity_hour,
          COUNT(*) as swipe_count
        FROM swipe_history 
        WHERE user_id = ${userId}
          AND timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY EXTRACT(HOUR FROM timestamp)
        ORDER BY swipe_count DESC
        LIMIT 5
      `;
            // Combine activity patterns
            const activityMap = new Map();
            // Weight message activity higher (messages show deeper engagement)
            messageActivity.forEach(record => {
                const hour = Number(record.activity_hour);
                const weight = Number(record.message_count) * 2; // Messages weighted 2x
                activityMap.set(hour, (activityMap.get(hour) || 0) + weight);
            });
            // Add swipe activity
            swipeActivity.forEach(record => {
                const hour = Number(record.activity_hour);
                const weight = Number(record.swipe_count) * 1; // Swipes weighted 1x
                activityMap.set(hour, (activityMap.get(hour) || 0) + weight);
            });
            // Sort by activity level and extract top peak hours
            const sortedActivity = Array.from(activityMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3); // Top 3 peak hours
            const peakHours = sortedActivity.map(([hour]) => hour);
            const totalActivity = Array.from(activityMap.values()).reduce((sum, count) => sum + count, 0);
            const activityStrength = totalActivity > 0 ? Math.min(totalActivity / 50, 1.0) : 0.1; // Normalize to 0-1
            console.log(`[USER-BEHAVIOR] User ${userId} peak hours: [${peakHours.join(', ')}] (strength: ${activityStrength.toFixed(2)})`);
            return { peakHours, activityStrength };
        }
        catch (error) {
            console.error(`[USER-BEHAVIOR] Error analyzing peak activity for user ${userId}:`, error);
            return { peakHours: [], activityStrength: 0.1 };
        }
    }
    /**
     * Calculate Activity Hours Alignment Between Two Users
     * Users active at similar times are more likely to engage successfully
     */
    async calculateActivityAlignment(userId1, userId2) {
        try {
            console.log(`[USER-BEHAVIOR] Calculating activity alignment: ${userId1} vs ${userId2}`);
            const user1Activity = await this.analyzePeakActivityHours(userId1);
            const user2Activity = await this.analyzePeakActivityHours(userId2);
            if (user1Activity.peakHours.length === 0 || user2Activity.peakHours.length === 0) {
                return 0.5; // Neutral score when insufficient data
            }
            // Calculate hour overlap
            const user1Hours = new Set(user1Activity.peakHours);
            const user2Hours = new Set(user2Activity.peakHours);
            const sharedHours = [...user1Hours].filter(hour => user2Hours.has(hour));
            // Calculate alignment score
            let alignmentScore = 0;
            if (sharedHours.length > 0) {
                // Direct overlap bonus
                alignmentScore += 0.6 * (sharedHours.length / Math.max(user1Hours.size, user2Hours.size));
            }
            // Adjacent hours bonus (people active in adjacent hours often compatible)
            let adjacentHours = 0;
            for (const hour1 of user1Activity.peakHours) {
                for (const hour2 of user2Activity.peakHours) {
                    const hourDiff = Math.abs(hour1 - hour2);
                    if (hourDiff === 1 || hourDiff === 23) { // Adjacent hours (including 23->0 wrap)
                        adjacentHours++;
                    }
                }
            }
            if (adjacentHours > 0) {
                alignmentScore += 0.3 * Math.min(adjacentHours / 3, 1); // Bonus for adjacent hours
            }
            // Activity strength factor
            const strengthFactor = (user1Activity.activityStrength + user2Activity.activityStrength) / 2;
            alignmentScore *= strengthFactor;
            alignmentScore = Math.max(0, Math.min(1, alignmentScore)); // Clamp to 0-1
            console.log(`[USER-BEHAVIOR] Activity alignment ${userId1} vs ${userId2}: ${alignmentScore.toFixed(3)} (shared: ${sharedHours.length}, adjacent: ${adjacentHours})`);
            return alignmentScore;
        }
        catch (error) {
            console.error(`[USER-BEHAVIOR] Error calculating activity alignment:`, error);
            return 0.5; // Neutral fallback
        }
    }
    /**
     * Generate Complete Temporal Context Profile
     * Combines all 4 temporal factors into comprehensive user context
     */
    async generateTemporalProfile(userId) {
        try {
            console.log(`[USER-BEHAVIOR] Generating temporal profile for user ${userId}`);
            const [onlineStatus, recencyScore, freshnessScore, activityData] = await Promise.all([
                this.calculateOnlineStatus(userId),
                this.calculateRecencyScore(userId),
                this.calculateProfileFreshness(userId),
                this.analyzePeakActivityHours(userId)
            ]);
            const profile = {
                userId,
                isOnline: onlineStatus.isOnline,
                lastActiveScore: recencyScore * 100, // Convert back to 0-100 for display
                profileFreshnessScore: freshnessScore * 100,
                peakActivityHours: activityData.peakHours,
                activityPatternScore: activityData.activityStrength
            };
            console.log(`[USER-BEHAVIOR] Temporal profile for user ${userId}:`, {
                online: profile.isOnline,
                recency: profile.lastActiveScore.toFixed(1),
                freshness: profile.profileFreshnessScore.toFixed(1),
                peaks: profile.peakActivityHours,
                strength: profile.activityPatternScore.toFixed(2)
            });
            return profile;
        }
        catch (error) {
            console.error(`[USER-BEHAVIOR] Error generating temporal profile for user ${userId}:`, error);
            // Return neutral fallback profile
            return {
                userId,
                isOnline: false,
                lastActiveScore: 30,
                profileFreshnessScore: 50,
                peakActivityHours: [],
                activityPatternScore: 0.1
            };
        }
    }
    /**
     * Calculate Combined Context Score
     * Integrates all temporal factors into single context-aware score for re-ranking
     */
    async calculateContextScore(targetUserId, candidateUserId) {
        try {
            console.log(`[USER-BEHAVIOR] Calculating context score: ${targetUserId} evaluating ${candidateUserId}`);
            const [candidateProfile, activityAlignment] = await Promise.all([
                this.generateTemporalProfile(candidateUserId),
                this.calculateActivityAlignment(targetUserId, candidateUserId)
            ]);
            // Weight factors for context scoring
            const onlineWeight = 0.3; // 30% - Real-time availability
            const recencyWeight = 0.25; // 25% - Recent activity indicates engagement
            const freshnessWeight = 0.20; // 20% - Updated profiles show active users
            const alignmentWeight = 0.25; // 25% - Activity hour compatibility
            let contextScore = 0;
            // Online status boost
            const onlineBoost = await this.calculateOnlineStatus(candidateUserId);
            contextScore += onlineWeight * onlineBoost.onlineBoost;
            // Recency score
            contextScore += recencyWeight * (candidateProfile.lastActiveScore / 100);
            // Freshness score
            contextScore += freshnessWeight * (candidateProfile.profileFreshnessScore / 100);
            // Activity alignment
            contextScore += alignmentWeight * activityAlignment;
            // Clamp to valid range
            contextScore = Math.max(0, Math.min(1, contextScore));
            console.log(`[USER-BEHAVIOR] Context score ${targetUserId} → ${candidateUserId}: ${contextScore.toFixed(3)} (online: ${onlineBoost.onlineBoost.toFixed(2)}, recency: ${(candidateProfile.lastActiveScore / 100).toFixed(2)}, fresh: ${(candidateProfile.profileFreshnessScore / 100).toFixed(2)}, align: ${activityAlignment.toFixed(2)})`);
            return contextScore;
        }
        catch (error) {
            console.error(`[USER-BEHAVIOR] Error calculating context score:`, error);
            return 0.5; // Neutral fallback score
        }
    }
    /**
     * Bulk Context Score Calculation
     * Efficiently calculate context scores for multiple candidates
     */
    async calculateBulkContextScores(targetUserId, candidateUserIds) {
        try {
            console.log(`[USER-BEHAVIOR] Calculating bulk context scores for ${candidateUserIds.length} candidates`);
            const contextScores = new Map();
            // Process candidates in parallel batches for performance
            const batchSize = 5;
            for (let i = 0; i < candidateUserIds.length; i += batchSize) {
                const batch = candidateUserIds.slice(i, i + batchSize);
                const batchPromises = batch.map(candidateId => this.calculateContextScore(targetUserId, candidateId)
                    .then(score => ({ candidateId, score })));
                const batchResults = await Promise.all(batchPromises);
                batchResults.forEach(({ candidateId, score }) => {
                    contextScores.set(candidateId, score);
                });
            }
            console.log(`[USER-BEHAVIOR] Bulk context scoring complete for user ${targetUserId}: ${contextScores.size} scores calculated`);
            return contextScores;
        }
        catch (error) {
            console.error(`[USER-BEHAVIOR] Error in bulk context scoring:`, error);
            // Return neutral scores for all candidates as fallback
            const fallbackScores = new Map();
            candidateUserIds.forEach(id => fallbackScores.set(id, 0.5));
            return fallbackScores;
        }
    }
}
// Export singleton instance
export const userBehaviorPatterns = new UserBehaviorPatterns();
// Compile with: tsc --outDir ./dist --target ES2022 --module ESNext --allowImportingTsExtensions --noEmit false server/user-behavior-patterns.ts
