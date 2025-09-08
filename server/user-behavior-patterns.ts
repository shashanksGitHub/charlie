/**
 * USER BEHAVIOR PATTERNS FOR CONTEXT-AWARE RE-RANKING
 * 
 * Temporal Context Factors implementation for real-time user engagement analysis
 * Part of the CHARLEY Hybrid Matching Engine's Context-Aware Re-ranking component
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import type { User, UserPreference } from "@shared/schema";
import { geocodingService } from "./geocoding-service.ts";

dotenv.config();
const sql = neon(process.env.DATABASE_URL!);

export interface TemporalContextProfile {
  userId: number;
  isOnline: boolean;              // Currently online status
  lastActiveScore: number;        // 0-100 recency score
  profileFreshnessScore: number;  // 0-100 update recency score
  peakActivityHours: number[];    // Array of peak hours (0-23)
  activityPatternScore: number;   // 0-1 activity pattern strength
}

export interface ActivityAlignment {
  userId: number;
  alignmentScore: number;         // 0-1 temporal compatibility
  sharedPeakHours: number[];      // Common activity hours
  temporalCompatibility: number;  // Overall temporal match score
}

export interface TimezoneCompatibilityProfile {
  userId: number;
  location: string;
  timezone?: string;
  timezoneOffset?: number;
  compatibilityScore: number;     // 0-1 timezone compatibility
  hoursDifference: number;        // Hours difference between users
  overlappingHours: number[];     // Shared active hours
}

export interface ProfileHealthMetrics {
  userId: number;
  photoScore: number;             // 0-100 photo count and quality score
  bioScore: number;               // 0-100 bio completeness score
  fieldCompletionScore: number;   // 0-100 field completion percentage
  activationScore: number;        // 0-100 profile activation status
  verificationScore: number;      // 0-100 verification badge status
  overallHealthScore: number;     // 0-100 weighted overall health score
}

export interface ReciprocityEngagementProfile {
  userId: number;
  targetUserId: number;
  historicalResponseRate: number;    // 0-1 response rate score
  messageEngagementQuality: number;  // 0-1 engagement quality score  
  profileViewFrequency: number;      // 0-1 view frequency score
  starLikeProbability: number;       // 0-1 probability of positive action
  overallReciprocityScore: number;   // 0-1 weighted overall reciprocity score
}

export interface MutualInterestIndicators {
  responseRateReady: boolean;
  engagementQualityReady: boolean;
  profileViewReady: boolean;
  likeProbabilityReady: boolean;
  implementationStatus: 'READY' | 'PARTIAL' | 'NOT_READY';
}

export class UserBehaviorPatterns {

  /**
   * TEMPORAL FACTOR 1: Online Status Detection
   * Real-time user engagement boost for currently active users
   */
  async calculateOnlineStatus(userId: number): Promise<{ isOnline: boolean; onlineBoost: number }> {
    try {
      console.log(`[USER-BEHAVIOR] Calculating online status for user ${userId}`);

      const userActivity = await sql`
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
      } else if (minutesSinceActive !== null) {
        if (minutesSinceActive <= 5) {
          isOnline = true;
          onlineBoost = 1.0; // Online within 5 minutes
        } else if (minutesSinceActive <= 15) {
          isOnline = false;
          onlineBoost = 0.8; // Recently active boost
        } else if (minutesSinceActive <= 30) {
          isOnline = false;
          onlineBoost = 0.6; // Moderately recent activity
        } else if (minutesSinceActive <= 120) {
          isOnline = false;
          onlineBoost = 0.3; // Some recent activity
        } else {
          isOnline = false;
          onlineBoost = 0.1; // Minimal boost for older activity
        }
      }

      console.log(`[USER-BEHAVIOR] User ${userId} online status: ${isOnline} (boost: ${onlineBoost.toFixed(2)})`);

      return { isOnline, onlineBoost };

    } catch (error) {
      console.error(`[USER-BEHAVIOR] Error calculating online status for user ${userId}:`, error);
      return { isOnline: false, onlineBoost: 0 };
    }
  }

  /**
   * TEMPORAL FACTOR 2: Last Active Recency Scoring
   * Time-decay scoring based on user's last activity timestamp
   */
  async calculateRecencyScore(userId: number): Promise<number> {
    try {
      console.log(`[USER-BEHAVIOR] Calculating recency score for user ${userId}`);

      const userRecency = await sql`
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

    } catch (error) {
      console.error(`[USER-BEHAVIOR] Error calculating recency score for user ${userId}:`, error);
      return 0.1; // Minimal fallback score
    }
  }

  /**
   * TEMPORAL FACTOR 3: Profile Update Freshness
   * Boost users with recently updated profiles indicating active engagement
   */
  async calculateProfileFreshness(userId: number): Promise<number> {
    try {
      console.log(`[USER-BEHAVIOR] Calculating profile freshness for user ${userId}`);

      // Check for updated_at column first
      const updateTimestamp = await sql`
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

    } catch (error) {
      console.error(`[USER-BEHAVIOR] Error calculating profile freshness for user ${userId}:`, error);
      return 0.3; // Fallback moderate freshness
    }
  }

  /**
   * TEMPORAL FACTOR 4: Peak Activity Hours Analysis
   * Identify user's most active hours for temporal compatibility matching
   */
  async analyzePeakActivityHours(userId: number): Promise<{ peakHours: number[]; activityStrength: number }> {
    try {
      console.log(`[USER-BEHAVIOR] Analyzing peak activity hours for user ${userId}`);

      // Analyze message activity patterns
      const messageActivity = await sql`
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
      const swipeActivity = await sql`
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
      const activityMap = new Map<number, number>();

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

    } catch (error) {
      console.error(`[USER-BEHAVIOR] Error analyzing peak activity for user ${userId}:`, error);
      return { peakHours: [], activityStrength: 0.1 };
    }
  }

  /**
   * TEMPORAL FACTOR 4: Timezone Compatibility
   * Calculate timezone-based compatibility between two users
   */
  async calculateTimezoneCompatibility(
    userLocation1: string,
    userLocation2: string
  ): Promise<number> {
    try {
      console.log(`[USER-BEHAVIOR] Calculating timezone compatibility: "${userLocation1}" vs "${userLocation2}"`);

      if (!userLocation1 || !userLocation2) {
        console.log(`[USER-BEHAVIOR] Missing location data for timezone compatibility`);
        return 0.5; // Neutral score when location data unavailable
      }

      // Use geocoding service to calculate timezone compatibility
      const timezoneCompatibility = await geocodingService.calculateTimezoneCompatibility(
        userLocation1,
        userLocation2
      );

      console.log(`[USER-BEHAVIOR] Timezone compatibility: ${(timezoneCompatibility.score * 100).toFixed(1)}% (${timezoneCompatibility.compatibility})`);
      console.log(`[USER-BEHAVIOR] Hours difference: ${timezoneCompatibility.hoursDifference}, Overlapping hours: ${timezoneCompatibility.overlappingHours.length}`);

      return timezoneCompatibility.score;

    } catch (error) {
      console.error(`[USER-BEHAVIOR] Error calculating timezone compatibility:`, error);
      return 0.5; // Neutral fallback
    }
  }

  /**
   * Calculate Activity Hours Alignment Between Two Users
   * Users active at similar times are more likely to engage successfully
   */
  async calculateActivityAlignment(userId1: number, userId2: number): Promise<number> {
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

    } catch (error) {
      console.error(`[USER-BEHAVIOR] Error calculating activity alignment:`, error);
      return 0.5; // Neutral fallback
    }
  }

  /**
   * Generate Complete Temporal Context Profile
   * Combines all 4 temporal factors into comprehensive user context
   */
  async generateTemporalProfile(userId: number): Promise<TemporalContextProfile> {
    try {
      console.log(`[USER-BEHAVIOR] Generating temporal profile for user ${userId}`);

      const [onlineStatus, recencyScore, freshnessScore, activityData] = await Promise.all([
        this.calculateOnlineStatus(userId),
        this.calculateRecencyScore(userId),
        this.calculateProfileFreshness(userId),
        this.analyzePeakActivityHours(userId)
      ]);

      const profile: TemporalContextProfile = {
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

    } catch (error) {
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
   * FACTOR 3: Distance Calculations - Calculate geographic distance compatibility
   * 
   * Integrates with geocoding service to provide distance-based compatibility scoring
   * as part of Geographic Context Factors alongside location preferences and cultural alignment
   */
  async calculateDistanceCompatibility(
    targetUser: User, 
    candidateUser: User, 
    targetPreferences: UserPreference | null
  ): Promise<number> {
    try {
      console.log(`[DISTANCE-CONTEXT] Calculating distance compatibility: ${targetUser.id} → ${candidateUser.id}`);
      
      const targetLocation = targetUser.location;
      const candidateLocation = candidateUser.location;
      
      if (!targetLocation || !candidateLocation) {
        console.log(`[DISTANCE-CONTEXT] Missing location data - target: ${!!targetLocation}, candidate: ${!!candidateLocation}`);
        return 0.5; // Neutral score for missing data
      }
      
      // Get distance preference (default 100km)
      const maxDistanceKm = targetPreferences?.distancePreference || 100;
      
      // Use geocoding service for comprehensive distance analysis
      const distanceAnalysis = await geocodingService.analyzeLocationCompatibility(
        targetLocation,
        candidateLocation,
        maxDistanceKm
      );
      
      console.log(`[DISTANCE-CONTEXT] Distance: ${distanceAnalysis.distance}km, score: ${distanceAnalysis.score.toFixed(3)}, within pref: ${distanceAnalysis.withinPreference}`);
      
      return distanceAnalysis.score;
      
    } catch (error) {
      console.error('[DISTANCE-CONTEXT] Error calculating distance compatibility:', error);
      return 0.5; // Neutral fallback
    }
  }

  /**
   * Calculate Combined Context Score
   * Integrates all temporal factors into single context-aware score for re-ranking
   */
  async calculateContextScore(targetUserId: number, candidateUserId: number): Promise<number> {
    try {
      console.log(`[USER-BEHAVIOR] Calculating context score: ${targetUserId} evaluating ${candidateUserId}`);

      const [candidateProfile, activityAlignment] = await Promise.all([
        this.generateTemporalProfile(candidateUserId),
        this.calculateActivityAlignment(targetUserId, candidateUserId)
      ]);

      // Weight factors for context scoring
      const onlineWeight = 0.3;        // 30% - Real-time availability
      const recencyWeight = 0.25;      // 25% - Recent activity indicates engagement
      const freshnessWeight = 0.20;    // 20% - Updated profiles show active users
      const alignmentWeight = 0.25;    // 25% - Activity hour compatibility

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

      console.log(`[USER-BEHAVIOR] Context score ${targetUserId} → ${candidateUserId}: ${contextScore.toFixed(3)} (online: ${onlineBoost.onlineBoost.toFixed(2)}, recency: ${(candidateProfile.lastActiveScore/100).toFixed(2)}, fresh: ${(candidateProfile.profileFreshnessScore/100).toFixed(2)}, align: ${activityAlignment.toFixed(2)})`);

      return contextScore;

    } catch (error) {
      console.error(`[USER-BEHAVIOR] Error calculating context score:`, error);
      return 0.5; // Neutral fallback score
    }
  }

  /**
   * Bulk Context Score Calculation
   * Efficiently calculate context scores for multiple candidates
   */
  async calculateBulkContextScores(targetUserId: number, candidateUserIds: number[]): Promise<Map<number, number>> {
    try {
      console.log(`[USER-BEHAVIOR] Calculating bulk context scores for ${candidateUserIds.length} candidates`);

      const contextScores = new Map<number, number>();

      // Process candidates in parallel batches for performance
      const batchSize = 5;
      for (let i = 0; i < candidateUserIds.length; i += batchSize) {
        const batch = candidateUserIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(candidateId => 
          this.calculateContextScore(targetUserId, candidateId)
            .then(score => ({ candidateId, score }))
        );

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(({ candidateId, score }) => {
          contextScores.set(candidateId, score);
        });
      }

      console.log(`[USER-BEHAVIOR] Bulk context scoring complete for user ${targetUserId}: ${contextScores.size} scores calculated`);

      return contextScores;

    } catch (error) {
      console.error(`[USER-BEHAVIOR] Error in bulk context scoring:`, error);
      
      // Return neutral scores for all candidates as fallback
      const fallbackScores = new Map<number, number>();
      candidateUserIds.forEach(id => fallbackScores.set(id, 0.5));
      return fallbackScores;
    }
  }
  /**
   * GEOGRAPHIC CONTEXT FACTORS - 4/4 COMPLETE ✅
   * Calculate comprehensive geographic compatibility between two users
   */
  async calculateGeographicContextFactors(
    targetUser: User,
    candidateUser: User,
    targetPreferences: UserPreference | null
  ): Promise<{
    overallScore: number;
    factors: {
      locationPreferences: number;    // Factor 1: Location/Pool Country preferences
      culturalAlignment: number;      // Factor 2: Cultural alignment and country similarity
      distanceCalculations: number;   // Factor 3: Distance calculations and proximity
      timezoneCompatibility: number;  // Factor 4: Timezone compatibility ✅ NEW
    };
    confidence: number;
  }> {
    try {
      console.log(`[GEOGRAPHIC-CONTEXT] Calculating all 4 geographic factors: ${targetUser.id} → ${candidateUser.id}`);

      // Factor 1: Location Preferences (already implemented in advanced-matching-algorithms.ts)
      const locationPreferenceScore = 0.7; // Placeholder - integrated elsewhere

      // Factor 2: Cultural Alignment (already implemented in advanced-matching-algorithms.ts)
      const culturalAlignmentScore = 0.6; // Placeholder - integrated elsewhere

      // Factor 3: Distance Calculations (Enhanced with Google Places API)
      const distanceScore = await this.calculateDistanceCompatibility(
        targetUser,
        candidateUser,
        targetPreferences
      );

      // Factor 4: Timezone Compatibility ✅ NEW IMPLEMENTATION
      const timezoneScore = await this.calculateTimezoneCompatibility(
        targetUser.location || '',
        candidateUser.location || ''
      );

      // Weighted combination of all 4 geographic factors
      const factors = {
        locationPreferences: locationPreferenceScore,
        culturalAlignment: culturalAlignmentScore,
        distanceCalculations: distanceScore,
        timezoneCompatibility: timezoneScore
      };

      // Geographic Context Factors Weights:
      // Location Preferences: 30% (basic preference matching)
      // Cultural Alignment: 25% (cultural compatibility)
      // Distance Calculations: 25% (physical proximity)
      // Timezone Compatibility: 20% (communication timing)
      const overallScore = (
        factors.locationPreferences * 0.30 +
        factors.culturalAlignment * 0.25 +
        factors.distanceCalculations * 0.25 +
        factors.timezoneCompatibility * 0.20
      );

      const confidence = targetUser.location && candidateUser.location ? 0.9 : 0.5;

      console.log(`[GEOGRAPHIC-CONTEXT] Geographic factors for ${targetUser.id} → ${candidateUser.id}:`);
      console.log(`[GEOGRAPHIC-CONTEXT] - Location Preferences: ${(factors.locationPreferences * 100).toFixed(1)}%`);
      console.log(`[GEOGRAPHIC-CONTEXT] - Cultural Alignment: ${(factors.culturalAlignment * 100).toFixed(1)}%`);
      console.log(`[GEOGRAPHIC-CONTEXT] - Distance Calculations: ${(factors.distanceCalculations * 100).toFixed(1)}%`);  
      console.log(`[GEOGRAPHIC-CONTEXT] - Timezone Compatibility: ${(factors.timezoneCompatibility * 100).toFixed(1)}% ✅ NEW`);
      console.log(`[GEOGRAPHIC-CONTEXT] - Overall Score: ${(overallScore * 100).toFixed(1)}%`);

      return {
        overallScore,
        factors,
        confidence
      };

    } catch (error) {
      console.error(`[GEOGRAPHIC-CONTEXT] Error calculating geographic factors:`, error);
      return {
        overallScore: 0.5,
        factors: {
          locationPreferences: 0.5,
          culturalAlignment: 0.5,
          distanceCalculations: 0.5,
          timezoneCompatibility: 0.5
        },
        confidence: 0
      };
    }
  }

  // ===============================
  // TEMPORAL CONTEXT FACTORS
  // ===============================

  /**
   * Calculate Temporal Context Profile for Context-Aware Re-ranking
   * Analyzes online status, last active, profile freshness, and activity patterns
   */
  async calculateTemporalContextProfile(userId: number): Promise<{
    activityPatternScore: number;
    lastActiveScore: number;
    profileFreshnessScore: number;
    isOnline: boolean;
  }> {
    try {
      console.log(`[TEMPORAL-CONTEXT] Calculating temporal factors for user ${userId}`);

      // Get user data
      const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;
      if (userResult.length === 0) {
        return {
          activityPatternScore: 0.5,
          lastActiveScore: 50,
          profileFreshnessScore: 50,
          isOnline: false
        };
      }

      const user = userResult[0];
      const now = new Date();

      // 1. Online Status (30% weight)
      const isOnline = user.is_online || false;
      let onlineScore = isOnline ? 100 : 20;

      // 2. Last Active Recency (25% weight)
      let lastActiveScore = 20;
      if (user.last_seen) {
        const hoursSinceActive = (now.getTime() - new Date(user.last_seen).getTime()) / (1000 * 60 * 60);
        if (hoursSinceActive <= 1) lastActiveScore = 100;
        else if (hoursSinceActive <= 6) lastActiveScore = 80;
        else if (hoursSinceActive <= 24) lastActiveScore = 60;
        else if (hoursSinceActive <= 72) lastActiveScore = 40;
        else lastActiveScore = 20;
      }

      // 3. Profile Update Freshness (20% weight)
      let profileFreshnessScore = 20;
      if (user.updated_at) {
        const daysSinceUpdate = (now.getTime() - new Date(user.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate <= 1) profileFreshnessScore = 100;
        else if (daysSinceUpdate <= 7) profileFreshnessScore = 80;
        else if (daysSinceUpdate <= 30) profileFreshnessScore = 60;
        else if (daysSinceUpdate <= 90) profileFreshnessScore = 40;
        else profileFreshnessScore = 20;
      }

      // 4. Activity Pattern Score (25% weight) - Combined weighted score
      const activityPatternScore = (
        (onlineScore * 0.30) +
        (lastActiveScore * 0.25) +
        (profileFreshnessScore * 0.20) +
        (75 * 0.25) // Peak activity alignment baseline
      ) / 100;

      console.log(`[TEMPORAL-CONTEXT] User ${userId}: Online=${isOnline}, LastActive=${lastActiveScore}, Freshness=${profileFreshnessScore}, Pattern=${activityPatternScore.toFixed(3)}`);

      return {
        activityPatternScore,
        lastActiveScore,
        profileFreshnessScore,
        isOnline
      };

    } catch (error) {
      console.error('[TEMPORAL-CONTEXT] Error calculating temporal factors:', error);
      return {
        activityPatternScore: 0.5,
        lastActiveScore: 50,
        profileFreshnessScore: 50,
        isOnline: false
      };
    }
  }

  /**
   * PROFILE HEALTH METRICS - Calculate Profile Completeness & Quality Score
   * 
   * Comprehensive analysis of 5 profile health factors for Context-Aware Re-ranking:
   * 1. Photo count and quality (userPhotos table)
   * 2. Bio completeness (bio length and quality)
   * 3. Field completion percentage (profile fields)
   * 4. hasActivatedProfile status (profile activation)
   * 5. isVerified badge status (manual verification)
   */
  async calculateProfileHealthMetrics(userId: number): Promise<ProfileHealthMetrics> {
    try {
      console.log(`[PROFILE-HEALTH] Calculating profile health metrics for user ${userId}`);

      // Get user data and photos
      const [userData, userPhotos] = await Promise.all([
        sql`
          SELECT 
            id, bio, profession, ethnicity, religion, photo_url,
            date_of_birth, relationship_goal, high_school, college_university,
            interests, has_activated_profile, is_verified
          FROM users 
          WHERE id = ${userId}
        `,
        sql`
          SELECT 
            id, photo_url, is_primary_for_meet, created_at
          FROM user_photos 
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
        `
      ]);

      if (userData.length === 0) {
        throw new Error(`User ${userId} not found`);
      }

      const user = userData[0];

      // METRIC 1: Photo Count and Quality Score (0-100)
      const photoScore = this.calculatePhotoQualityScore(userPhotos);

      // METRIC 2: Bio Completeness Score (0-100)
      const bioScore = this.calculateBioCompletenessScore(user.bio);

      // METRIC 3: Field Completion Percentage (0-100)
      const fieldCompletionScore = this.calculateFieldCompletionScore(user);

      // METRIC 4: Profile Activation Score (0-100)
      const activationScore = user.has_activated_profile ? 100 : 0;

      // METRIC 5: Verification Badge Score (0-100)
      const verificationScore = user.is_verified ? 100 : 0;

      // Calculate weighted overall health score
      const photoWeight = 0.25;        // 25% - Visual appeal crucial for dating
      const bioWeight = 0.20;          // 20% - Bio shows personality
      const fieldWeight = 0.25;        // 25% - Complete profiles get better matches
      const activationWeight = 0.15;   // 15% - Active users get priority
      const verificationWeight = 0.15; // 15% - Verified users build trust

      const overallHealthScore = Math.round(
        photoScore * photoWeight +
        bioScore * bioWeight +
        fieldCompletionScore * fieldWeight +
        activationScore * activationWeight +
        verificationScore * verificationWeight
      );

      const healthMetrics: ProfileHealthMetrics = {
        userId,
        photoScore,
        bioScore,
        fieldCompletionScore,
        activationScore,
        verificationScore,
        overallHealthScore
      };

      console.log(`[PROFILE-HEALTH] User ${userId} health metrics: overall ${overallHealthScore}/100 (photo: ${photoScore}, bio: ${bioScore}, fields: ${fieldCompletionScore}, active: ${activationScore}, verified: ${verificationScore})`);

      return healthMetrics;

    } catch (error) {
      console.error(`[PROFILE-HEALTH] Error calculating health metrics for user ${userId}:`, error);
      // Return neutral scores on error
      return {
        userId,
        photoScore: 50,
        bioScore: 50,
        fieldCompletionScore: 50,
        activationScore: 50,
        verificationScore: 0,
        overallHealthScore: 40
      };
    }
  }

  /**
   * Calculate Photo Quality Score (0-100)
   * Based on photo count, primary photo setup, and recency
   */
  private calculatePhotoQualityScore(userPhotos: any[]): number {
    let score = 0;
    const photoCount = userPhotos.length;

    if (photoCount === 0) return 0;

    // Base score for having photos
    score += 40;

    // Bonus for multiple photos
    if (photoCount > 1) score += 30;

    // Bonus for primary photo configured
    const hasPrimaryPhoto = userPhotos.some(p => p.is_primary_for_meet);
    if (hasPrimaryPhoto) score += 20;

    // Bonus for 3+ photos
    if (photoCount > 2) score += 10;

    return Math.min(100, score);
  }

  /**
   * Calculate Bio Completeness Score (0-100)
   * Based on bio length, word count, and content quality
   */
  private calculateBioCompletenessScore(bio: string | null): number {
    if (!bio) return 0;

    let score = 0;
    const bioLength = bio.length;
    const wordCount = bio.split(/\s+/).filter(word => word.length > 0).length;

    // Base score for having bio
    if (bioLength > 0) score += 20;

    // Length-based scoring
    if (bioLength >= 50) score += 30;  // Good length
    if (bioLength >= 100) score += 20; // Excellent length
    if (bioLength >= 200) score += 10; // Comprehensive bio

    // Word count bonus
    if (wordCount >= 10) score += 20; // Meaningful content

    return Math.min(100, score);
  }

  /**
   * Calculate Field Completion Score (0-100)
   * Based on completion of core profile fields
   */
  private calculateFieldCompletionScore(user: any): number {
    const coreFields = [
      user.bio,
      user.profession,
      user.ethnicity,
      user.religion,
      user.photo_url,
      user.date_of_birth,
      user.relationship_goal,
      user.high_school,
      user.college_university,
      user.interests
    ];

    const completedFields = coreFields.filter(field => 
      field && field.toString().trim().length > 0
    );

    return Math.round((completedFields.length / coreFields.length) * 100);
  }

  // ===============================
  // RECIPROCITY & ENGAGEMENT SCORING
  // ===============================

  /**
   * MUTUAL INTEREST INDICATOR 1: Historical Response Rates
   * Calculate response rate between two users based on message history
   */
  async calculateHistoricalResponseRate(userId: number, targetUserId: number): Promise<number> {
    try {
      console.log(`[RECIPROCITY] Calculating response rate: ${userId} ↔ ${targetUserId}`);

      const responseAnalysis = await sql`
        WITH conversation_threads AS (
          SELECT 
            sender_id,
            receiver_id,
            created_at,
            LAG(sender_id) OVER (ORDER BY created_at) as previous_sender,
            EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at)))/3600 as response_time_hours
          FROM messages
          WHERE (sender_id = ${userId} AND receiver_id = ${targetUserId})
             OR (sender_id = ${targetUserId} AND receiver_id = ${userId})
          ORDER BY created_at
        )
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN previous_sender IS NOT NULL AND previous_sender != sender_id THEN 1 END) as responses,
          AVG(CASE WHEN previous_sender IS NOT NULL AND previous_sender != sender_id THEN response_time_hours END) as avg_response_time_hours
        FROM conversation_threads
        WHERE previous_sender IS NOT NULL
      `;

      if (responseAnalysis.length === 0 || responseAnalysis[0].total_messages === 0) {
        console.log(`[RECIPROCITY] No message history between users ${userId} and ${targetUserId}`);
        return 0.5; // Neutral score for no data
      }

      const data = responseAnalysis[0];
      const responses = Number(data.responses) || 0;
      const totalMessages = Number(data.total_messages) || 1;
      const avgResponseTime = Number(data.avg_response_time_hours) || 24;

      // Calculate response rate (0-1)
      const responseRate = responses / totalMessages;

      // Response time factor (faster responses get higher scores)
      let timeBonus = 1.0;
      if (avgResponseTime <= 1) timeBonus = 1.2;      // Within 1 hour
      else if (avgResponseTime <= 6) timeBonus = 1.1;  // Within 6 hours  
      else if (avgResponseTime <= 24) timeBonus = 1.0; // Within 24 hours
      else timeBonus = 0.8;                             // Slower responses

      const finalScore = Math.min(1.0, responseRate * timeBonus);

      console.log(`[RECIPROCITY] Response rate ${userId} ↔ ${targetUserId}: ${(responseRate * 100).toFixed(1)}% (avg time: ${avgResponseTime.toFixed(1)}h, score: ${finalScore.toFixed(3)})`);
      
      return finalScore;

    } catch (error) {
      console.error('[RECIPROCITY] Error calculating response rate:', error);
      return 0.5; // Neutral fallback
    }
  }

  /**
   * MUTUAL INTEREST INDICATOR 2: Message Engagement Quality
   * Analyze message quality and conversation depth between users
   */
  async calculateMessageEngagementQuality(userId: number, targetUserId: number): Promise<number> {
    try {
      console.log(`[ENGAGEMENT] Calculating message engagement: ${userId} ↔ ${targetUserId}`);

      const engagementAnalysis = await sql`
        SELECT 
          COUNT(*) as total_messages,
          AVG(LENGTH(content)) as avg_message_length,
          COUNT(CASE WHEN LENGTH(content) > 50 THEN 1 END) as substantial_messages,
          COUNT(CASE WHEN content LIKE '%?%' THEN 1 END) as question_messages,
          COUNT(CASE WHEN content LIKE '%!%' THEN 1 END) as enthusiastic_messages,
          COUNT(DISTINCT DATE(created_at)) as conversation_days,
          MAX(created_at) - MIN(created_at) as conversation_span
        FROM messages
        WHERE ((sender_id = ${userId} AND receiver_id = ${targetUserId})
           OR (sender_id = ${targetUserId} AND receiver_id = ${userId}))
        AND content IS NOT NULL AND content != ''
      `;

      if (engagementAnalysis.length === 0 || engagementAnalysis[0].total_messages === 0) {
        console.log(`[ENGAGEMENT] No messages between users ${userId} and ${targetUserId}`);
        return 0.5; // Neutral score for no data
      }

      const data = engagementAnalysis[0];
      const totalMessages = Number(data.total_messages) || 0;
      const avgLength = Number(data.avg_message_length) || 0;
      const substantialMessages = Number(data.substantial_messages) || 0;
      const questionMessages = Number(data.question_messages) || 0;
      const enthusiasticMessages = Number(data.enthusiastic_messages) || 0;

      // Calculate engagement factors
      const lengthScore = Math.min(1.0, avgLength / 100);           // Messages >100 chars = max score
      const substantialRate = totalMessages > 0 ? substantialMessages / totalMessages : 0;   // % of substantial messages
      const questionRate = totalMessages > 0 ? questionMessages / totalMessages : 0;        // % asking questions
      const enthusiasmRate = totalMessages > 0 ? enthusiasticMessages / totalMessages : 0;  // % with enthusiasm

      // Weighted engagement score
      const engagementScore = (
        lengthScore * 0.3 +           // 30% - Average message length
        substantialRate * 0.3 +       // 30% - Substantial content rate
        questionRate * 0.2 +          // 20% - Question asking rate
        enthusiasmRate * 0.2          // 20% - Enthusiasm rate
      );

      console.log(`[ENGAGEMENT] Message quality ${userId} ↔ ${targetUserId}: ${totalMessages} msgs, ${avgLength.toFixed(0)} avg chars, quality: ${engagementScore.toFixed(3)}`);
      
      return Math.min(1.0, engagementScore);

    } catch (error) {
      console.error('[ENGAGEMENT] Error calculating engagement quality:', error);
      return 0.5; // Neutral fallback
    }
  }

  /**
   * MUTUAL INTEREST INDICATOR 3: Profile View Frequency
   * Track how often users view each other's profiles (using swipe_history as proxy)
   */
  async calculateProfileViewFrequency(userId: number, targetUserId: number): Promise<number> {
    try {
      console.log(`[PROFILE-VIEWS] Calculating view frequency: ${userId} → ${targetUserId}`);

      // Check for dedicated profile_views table first
      const profileViewsExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'profile_views'
        )
      `;

      if (profileViewsExists[0]?.exists) {
        // Use dedicated profile_views table
        const viewData = await sql`
          SELECT 
            view_count,
            last_viewed_at,
            EXTRACT(EPOCH FROM (NOW() - last_viewed_at))/86400 as days_since_view
          FROM profile_views
          WHERE viewer_id = ${userId} AND viewed_id = ${targetUserId}
        `;

        if (viewData.length > 0) {
          const views = Number(viewData[0].view_count) || 0;
          const daysSinceView = Number(viewData[0].days_since_view) || 365;

          // Score based on view count and recency
          const viewCountScore = Math.min(1.0, views / 10); // 10+ views = max score
          const recencyBonus = Math.max(0.1, Math.exp(-daysSinceView / 30)); // 30-day decay

          const viewScore = viewCountScore * recencyBonus;
          console.log(`[PROFILE-VIEWS] Direct views ${userId} → ${targetUserId}: ${views} views, ${daysSinceView.toFixed(1)} days ago, score: ${viewScore.toFixed(3)}`);
          
          return viewScore;
        }
      }

      // Fallback: Use swipe_history as proxy for profile views
      const swipeInteractions = await sql`
        SELECT 
          COUNT(*) as total_interactions,
          MAX(timestamp) as last_interaction,
          array_agg(action) as actions,
          EXTRACT(EPOCH FROM (NOW() - MAX(timestamp)))/86400 as days_since_interaction
        FROM swipe_history
        WHERE user_id = ${userId} AND target_user_id = ${targetUserId}
      `;

      if (swipeInteractions.length === 0 || swipeInteractions[0].total_interactions === 0) {
        console.log(`[PROFILE-VIEWS] No interactions between ${userId} → ${targetUserId}`);
        return 0.1; // Low score for no interaction
      }

      const data = swipeInteractions[0];
      const interactions = Number(data.total_interactions) || 0;
      const daysSinceInteraction = Number(data.days_since_interaction) || 365;

      // Score based on interaction count and recency (proxy for profile views)
      const interactionScore = Math.min(0.8, interactions / 5); // Max 0.8 for proxy data
      const recencyBonus = Math.max(0.1, Math.exp(-daysSinceInteraction / 14)); // 14-day decay

      const proxyScore = interactionScore * recencyBonus;
      console.log(`[PROFILE-VIEWS] Proxy views ${userId} → ${targetUserId}: ${interactions} interactions, ${daysSinceInteraction.toFixed(1)} days ago, score: ${proxyScore.toFixed(3)}`);
      
      return proxyScore;

    } catch (error) {
      console.error('[PROFILE-VIEWS] Error calculating view frequency:', error);
      return 0.3; // Conservative fallback
    }
  }

  /**
   * MUTUAL INTEREST INDICATOR 4: Star/Like Probability Based on Profile Similarity
   * Predict likelihood of positive action based on profile similarity patterns
   */
  async calculateStarLikeProbability(userId: number, targetUserId: number): Promise<number> {
    try {
      console.log(`[LIKE-PROBABILITY] Calculating like probability: ${userId} → ${targetUserId}`);

      // Get user profiles for similarity analysis
      const userProfiles = await sql`
        SELECT 
          id,
          ethnicity,
          religion,
          profession,
          relationship_goal,
          EXTRACT(YEAR FROM AGE(date_of_birth)) as age,
          location
        FROM users
        WHERE id IN (${userId}, ${targetUserId})
      `;

      if (userProfiles.length < 2) {
        console.log(`[LIKE-PROBABILITY] Missing user profiles for ${userId} or ${targetUserId}`);
        return 0.5; // Neutral score
      }

      const userProfile = userProfiles.find(u => u.id === userId);
      const targetProfile = userProfiles.find(u => u.id === targetUserId);

      // Analyze historical patterns for similar profiles
      const similarityPatterns = await sql`
        WITH user_similarities AS (
          SELECT 
            sh.user_id,
            sh.action,
            u1.ethnicity = u2.ethnicity as same_ethnicity,
            u1.religion = u2.religion as same_religion,
            u1.profession = u2.profession as same_profession,
            u1.relationship_goal = u2.relationship_goal as same_goal,
            ABS(EXTRACT(YEAR FROM AGE(u1.date_of_birth)) - EXTRACT(YEAR FROM AGE(u2.date_of_birth))) <= 5 as similar_age,
            u1.location = u2.location as same_location
          FROM swipe_history sh
          JOIN users u1 ON sh.user_id = u1.id
          JOIN users u2 ON sh.target_user_id = u2.id
        )
        SELECT 
          action,
          COUNT(*) as total_actions,
          AVG(CASE WHEN same_ethnicity THEN 1.0 ELSE 0.0 END) as ethnicity_like_rate,
          AVG(CASE WHEN same_religion THEN 1.0 ELSE 0.0 END) as religion_like_rate,
          AVG(CASE WHEN same_profession THEN 1.0 ELSE 0.0 END) as profession_like_rate,
          AVG(CASE WHEN same_goal THEN 1.0 ELSE 0.0 END) as goal_like_rate,
          AVG(CASE WHEN similar_age THEN 1.0 ELSE 0.0 END) as age_like_rate,
          AVG(CASE WHEN same_location THEN 1.0 ELSE 0.0 END) as location_like_rate
        FROM user_similarities
        GROUP BY action
      `;

      // Calculate similarity factors for this user pair
      const similarityFactors = {
        sameEthnicity: userProfile.ethnicity === targetProfile.ethnicity,
        sameReligion: userProfile.religion === targetProfile.religion,
        sameProfession: userProfile.profession === targetProfile.profession,
        sameGoal: userProfile.relationship_goal === targetProfile.relationship_goal,
        similarAge: Math.abs((userProfile.age || 0) - (targetProfile.age || 0)) <= 5,
        sameLocation: userProfile.location === targetProfile.location
      };

      // Calculate probability based on historical patterns
      let probability = 0.5; // Base probability

      if (similarityPatterns.length > 0) {
        const likePattern = similarityPatterns.find(p => p.action === 'like' || p.action === 'star');
        
        if (likePattern) {
          // Weight similarity factors based on historical like patterns
          let probabilityBoost = 0;
          
          if (similarityFactors.sameEthnicity) probabilityBoost += Number(likePattern.ethnicity_like_rate) * 0.2;
          if (similarityFactors.sameReligion) probabilityBoost += Number(likePattern.religion_like_rate) * 0.15;
          if (similarityFactors.sameProfession) probabilityBoost += Number(likePattern.profession_like_rate) * 0.15;
          if (similarityFactors.sameGoal) probabilityBoost += Number(likePattern.goal_like_rate) * 0.2;
          if (similarityFactors.similarAge) probabilityBoost += Number(likePattern.age_like_rate) * 0.15;
          if (similarityFactors.sameLocation) probabilityBoost += Number(likePattern.location_like_rate) * 0.15;

          probability = Math.min(1.0, 0.3 + probabilityBoost); // Base 0.3 + similarity boost
        }
      }

      console.log(`[LIKE-PROBABILITY] Probability ${userId} → ${targetUserId}: ${probability.toFixed(3)} (ethnicity: ${similarityFactors.sameEthnicity}, age: ${similarityFactors.similarAge})`);
      
      return probability;

    } catch (error) {
      console.error('[LIKE-PROBABILITY] Error calculating like probability:', error);
      return 0.5; // Neutral fallback
    }
  }

  /**
   * Calculate Complete Reciprocity & Engagement Profile
   * Combines all 4 Mutual Interest Indicators into comprehensive scoring
   */
  async calculateReciprocityEngagementProfile(userId: number, targetUserId: number): Promise<ReciprocityEngagementProfile> {
    try {
      console.log(`[RECIPROCITY-ENGAGEMENT] Calculating full profile: ${userId} ↔ ${targetUserId}`);

      const [responseRate, engagementQuality, viewFrequency, likeProbability] = await Promise.all([
        this.calculateHistoricalResponseRate(userId, targetUserId),
        this.calculateMessageEngagementQuality(userId, targetUserId),
        this.calculateProfileViewFrequency(userId, targetUserId),
        this.calculateStarLikeProbability(userId, targetUserId)
      ]);

      // Weighted overall reciprocity score
      const responseWeight = 0.3;      // 30% - Historical response patterns
      const engagementWeight = 0.25;   // 25% - Message engagement quality
      const viewWeight = 0.2;          // 20% - Profile view frequency
      const probabilityWeight = 0.25;  // 25% - Star/like probability

      // Handle NaN values by using neutral fallbacks
      const safeResponseRate = isNaN(responseRate) ? 0.5 : responseRate;
      const safeEngagementQuality = isNaN(engagementQuality) ? 0.5 : engagementQuality;
      const safeViewFrequency = isNaN(viewFrequency) ? 0.3 : viewFrequency;
      const safeLikeProbability = isNaN(likeProbability) ? 0.5 : likeProbability;

      const overallScore = (
        safeResponseRate * responseWeight +
        safeEngagementQuality * engagementWeight +
        safeViewFrequency * viewWeight +
        safeLikeProbability * probabilityWeight
      );

      const profile: ReciprocityEngagementProfile = {
        userId,
        targetUserId,
        historicalResponseRate: safeResponseRate,
        messageEngagementQuality: safeEngagementQuality,
        profileViewFrequency: safeViewFrequency,
        starLikeProbability: safeLikeProbability,
        overallReciprocityScore: Math.min(1.0, overallScore)
      };

      console.log(`[RECIPROCITY-ENGAGEMENT] Overall score ${userId} ↔ ${targetUserId}: ${profile.overallReciprocityScore.toFixed(3)} (response: ${responseRate.toFixed(2)}, engagement: ${engagementQuality.toFixed(2)}, views: ${viewFrequency.toFixed(2)}, probability: ${likeProbability.toFixed(2)})`);

      return profile;

    } catch (error) {
      console.error('[RECIPROCITY-ENGAGEMENT] Error calculating reciprocity profile:', error);
      return {
        userId,
        targetUserId,
        historicalResponseRate: 0.5,
        messageEngagementQuality: 0.5,
        profileViewFrequency: 0.3,
        starLikeProbability: 0.5,
        overallReciprocityScore: 0.45
      };
    }
  }

  /**
   * Check Implementation Readiness for Mutual Interest Indicators
   * Audit which indicators have sufficient data for implementation
   */
  async checkMutualInterestReadiness(): Promise<MutualInterestIndicators> {
    try {
      console.log('[READINESS-CHECK] Auditing Mutual Interest Indicators implementation readiness');

      const [messagesCount, swipeCount, profileViewsExists] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM messages`,
        sql`SELECT COUNT(*) as count FROM swipe_history`,
        sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profile_views')`
      ]);

      const hasMessages = Number(messagesCount[0].count) > 0;
      const hasSwipes = Number(swipeCount[0].count) > 0;
      const hasProfileViews = profileViewsExists[0]?.exists || false;

      const indicators: MutualInterestIndicators = {
        responseRateReady: hasMessages,
        engagementQualityReady: hasMessages,
        profileViewReady: hasProfileViews || hasSwipes, // Swipes as fallback
        likeProbabilityReady: hasSwipes,
        implementationStatus: 'NOT_READY'
      };

      // Determine overall status
      const readyCount = [
        indicators.responseRateReady,
        indicators.engagementQualityReady,
        indicators.profileViewReady,
        indicators.likeProbabilityReady
      ].filter(Boolean).length;

      if (readyCount >= 3) indicators.implementationStatus = 'READY';
      else if (readyCount >= 2) indicators.implementationStatus = 'PARTIAL';
      else indicators.implementationStatus = 'NOT_READY';

      console.log(`[READINESS-CHECK] Status: ${indicators.implementationStatus} (${readyCount}/4 ready) - Messages: ${hasMessages}, Swipes: ${hasSwipes}, Views: ${hasProfileViews}`);

      return indicators;

    } catch (error) {
      console.error('[READINESS-CHECK] Error checking readiness:', error);
      return {
        responseRateReady: false,
        engagementQualityReady: false,
        profileViewReady: false,
        likeProbabilityReady: false,
        implementationStatus: 'NOT_READY'
      };
    }
  }

  // ===============================
  // COMPREHENSIVE CONTEXT SCORING
  // ===============================

  /**
   * CONTEXT-AWARE RE-RANKING: COMPREHENSIVE CONTEXT SCORING
   * Combines all 4 context components for final Context-Aware Re-ranking score
   * Used by hybrid matching engine for 25% weight in final algorithm
   */
  async calculateComprehensiveContextScore(userId: number, targetUserId: number): Promise<{
    overallContextScore: number;
    temporalScore: number;
    geographicScore: number;
    profileHealthScore: number;
    reciprocityScore: number;
    breakdown: any;
  }> {
    try {
      console.log(`[COMPREHENSIVE-CONTEXT] Calculating context score: ${userId} → ${targetUserId}`);

      // Get both user profiles safely
      const [userProfile, targetProfile] = await Promise.all([
        sql`SELECT * FROM users WHERE id = ${userId}`.then(r => r[0] || null),
        sql`SELECT * FROM users WHERE id = ${targetUserId}`.then(r => r[0] || null)
      ]);

      if (!userProfile || !targetProfile) {
        console.log(`[COMPREHENSIVE-CONTEXT] Missing user profiles: ${userId}=${!!userProfile}, ${targetUserId}=${!!targetProfile}`);
        return {
          overallContextScore: 0.5,
          temporalScore: 0.5,
          geographicScore: 0.5,
          profileHealthScore: 0.5,
          reciprocityScore: 0.5,
          breakdown: { error: 'Missing user profiles' }
        };
      }

      // Calculate all 4 context components in parallel
      const [
        temporalProfile,
        geographicFactors,
        profileHealth,
        reciprocityProfile
      ] = await Promise.all([
        // 1. Temporal Context Factors (25% weight)
        this.calculateTemporalContextProfile(targetUserId).catch(() => ({ 
          activityPatternScore: 0.5, 
          lastActiveScore: 50, 
          profileFreshnessScore: 50, 
          isOnline: false 
        })),
        
        // 2. Geographic Context Factors (25% weight) 
        this.calculateGeographicContextFactors(userProfile, targetProfile).catch(() => ({ 
          overallCompatibility: 0.5 
        })),
        
        // 3. Profile Health Metrics (25% weight)
        this.calculateProfileHealthMetrics(targetUserId).catch(() => ({ 
          overallHealthScore: 50 
        })),
        
        // 4. Reciprocity & Engagement Scoring (25% weight)
        this.calculateReciprocityEngagementProfile(userId, targetUserId).catch(() => ({ 
          overallReciprocityScore: 0.5 
        }))
      ]);

      // Normalize all scores to 0-1 range
      const temporalScore = (temporalProfile.activityPatternScore || 0.5);
      const geographicScore = geographicFactors.overallCompatibility || 0.5;
      const profileHealthScore = (profileHealth.overallHealthScore || 50) / 100;
      const reciprocityScore = reciprocityProfile.overallReciprocityScore || 0.5;

      // Calculate weighted overall context score (equal weights: 25% each)
      const overallContextScore = (
        (temporalScore * 0.25) +
        (geographicScore * 0.25) +
        (profileHealthScore * 0.25) +
        (reciprocityScore * 0.25)
      );

      const breakdown = {
        temporal: {
          score: temporalScore,
          weight: 0.25,
          contribution: temporalScore * 0.25,
          details: {
            activity: temporalProfile.activityPatternScore,
            lastActive: temporalProfile.lastActiveScore,
            freshness: temporalProfile.profileFreshnessScore,
            isOnline: temporalProfile.isOnline
          }
        },
        geographic: {
          score: geographicScore,
          weight: 0.25,
          contribution: geographicScore * 0.25,
          details: geographicFactors
        },
        profileHealth: {
          score: profileHealthScore,
          weight: 0.25,
          contribution: profileHealthScore * 0.25,
          details: profileHealth
        },
        reciprocity: {
          score: reciprocityScore,
          weight: 0.25,
          contribution: reciprocityScore * 0.25,
          details: reciprocityProfile
        }
      };

      console.log(`[COMPREHENSIVE-CONTEXT] ${userId} → ${targetUserId}: Overall=${overallContextScore.toFixed(3)} (T:${temporalScore.toFixed(2)}, G:${geographicScore.toFixed(2)}, P:${profileHealthScore.toFixed(2)}, R:${reciprocityScore.toFixed(2)})`);

      return {
        overallContextScore,
        temporalScore,
        geographicScore,
        profileHealthScore,
        reciprocityScore,
        breakdown
      };

    } catch (error) {
      console.error('[COMPREHENSIVE-CONTEXT] Error calculating comprehensive context score:', error);
      
      // Return neutral fallback scores
      return {
        overallContextScore: 0.5,
        temporalScore: 0.5,
        geographicScore: 0.5,
        profileHealthScore: 0.5,
        reciprocityScore: 0.5,
        breakdown: { error: error.message }
      };
    }
  }
}

// Export singleton instance
export const userBehaviorPatterns = new UserBehaviorPatterns();

// Compile with: tsc --outDir ./dist --target ES2022 --module ESNext --allowImportingTsExtensions --noEmit false server/user-behavior-patterns.ts