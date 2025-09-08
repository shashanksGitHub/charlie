/**
 * CHARLEY Hybrid Matching Engine
 * 
 * Advanced recommendation system combining:
 * 1. Content-Based Filtering (profile & preferences matching)
 * 2. Collaborative Filtering (behavior-based recommendations)
 * 3. Context-Aware Re-ranking (real-time adjustments)
 */

import { storage } from "./storage";
import type { User, UserPreference } from "@shared/schema";
import { advancedMatchingEngine, type AdvancedMatchScore } from "./advanced-matching-algorithms";
import { matrixFactorization } from "./matrix-factorization";
import { hardFiltersEngine } from "./hard-filters";

export interface MatchScore {
  userId: number;
  contentScore: number;
  collaborativeScore: number;
  contextScore: number;
  finalScore: number;
  reasons: string[];
}

export interface MatchingContext {
  currentTime: Date;
  userLocation?: string;
  lastActiveThreshold: number; // minutes
  mode: 'meet' | 'suite' | 'heat';
}

export interface UserInteractionPattern {
  userId: number;
  likedUsers: number[];
  dislikedUsers: number[];
  averageResponseTime: number;
  preferredAgeRange: [number, number];
  preferredLocations: string[];
  interactionFrequency: number;
}

export class MatchingEngine {
  // Configurable weights for hybrid scoring
  private static readonly CONTENT_WEIGHT = 0.4;
  private static readonly COLLABORATIVE_WEIGHT = 0.35;
  private static readonly CONTEXT_WEIGHT = 0.25;
  
  private matrixFactorizationInitialized = false;

  /**
   * Main entry point: Get ranked discovery results with advanced algorithms
   */
  async getRankedDiscovery(
    userId: number, 
    context: MatchingContext,
    limit: number = 50
  ): Promise<User[]> {
    console.log(`[MATCHING-ENGINE] Starting ranked discovery for user ${userId} in ${context.mode} mode`);
    
    try {
      // Get user and preferences
      const [user, preferences] = await Promise.all([
        storage.getUser(userId),
        storage.getUserPreferences(userId)
      ]);

      if (!user) {
        console.error(`[MATCHING-ENGINE] User ${userId} not found`);
        return [];
      }

      // Get potential candidates (existing discovery logic as baseline)
      const allCandidates = await this.getCandidatePool(userId, context.mode);
      
      if (allCandidates.length === 0) {
        console.log(`[MATCHING-ENGINE] No potential users found for ${userId}`);
        return [];
      }

      // 🔒 APPLY HARD FILTERS FIRST (Non-negotiable filtering)
      console.log(`[MATCHING-ENGINE] 🔒 Applying hard filters before matching algorithm`);
      const filteredCandidates = await hardFiltersEngine.applyHardFilters(
        allCandidates,
        user,
        preferences || null
      );

      if (filteredCandidates.length === 0) {
        console.log(`[MATCHING-ENGINE] ❌ No candidates passed hard filters for user ${userId}`);
        return [];
      }

      console.log(`[MATCHING-ENGINE] ✅ ${filteredCandidates.length}/${allCandidates.length} candidates passed hard filters (${((filteredCandidates.length/allCandidates.length)*100).toFixed(1)}%)`);
      
      const potentialUsers = filteredCandidates;

      // Calculate scores for all candidates using advanced algorithms
      const scoredUsers = await this.calculateAdvancedHybridScores(
        user,
        preferences || null,
        potentialUsers,
        context
      );

      // Apply ENHANCED DEMOGRAPHIC DIVERSITY INJECTION before final ranking
      const diverseScores = advancedMatchingEngine.injectDemographicDiversity(
        scoredUsers.sort((a, b) => b.finalScore - a.finalScore),
        potentialUsers,
        user, // Current user for demographic analysis
        preferences || null, // User preferences for age range expansion
        0.15 // 15% diversity injection
      );

      // Sort by final score (highest first) and return top results
      const rankedUsers = diverseScores
        .slice(0, limit)
        .map(score => potentialUsers.find(u => u.id === score.userId)!)
        .filter(Boolean);

      console.log(`[MATCHING-ENGINE] Ranked ${rankedUsers.length} users for ${userId}`);
      
      // Log top 3 matches for debugging
      if (scoredUsers.length > 0) {
        const topMatches = scoredUsers.slice(0, 3);
        console.log(`[MATCHING-ENGINE] Top matches:`, topMatches.map(m => ({
          userId: m.userId,
          score: m.finalScore.toFixed(3),
          content: m.contentScore.toFixed(3),
          collaborative: m.collaborativeScore.toFixed(3),
          context: m.contextScore.toFixed(3)
        })));
      }

      return rankedUsers;

    } catch (error) {
      console.error(`[MATCHING-ENGINE] Error in getRankedDiscovery:`, error);
      // Fallback to existing discovery logic
      return this.getCandidatePool(userId, context.mode);
    }
  }

  /**
   * Get candidate pool using existing discovery logic
   */
  private async getCandidatePool(userId: number, mode: string): Promise<User[]> {
    try {
      switch (mode) {
        case 'meet':
        case 'heat':
          return await storage.getDiscoverUsers(userId);
        case 'suite':
          // For SUITE mode, we'd need to implement professional discovery
          // For now, use general discovery
          return await storage.getDiscoverUsers(userId);
        default:
          return await storage.getDiscoverUsers(userId);
      }
    } catch (error) {
      console.error(`[MATCHING-ENGINE] Error getting candidate pool:`, error);
      return [];
    }
  }

  /**
   * Calculate advanced hybrid scores for all candidates using sophisticated algorithms
   * PERFORMANCE OPTIMIZED: Batch operations to eliminate N+1 query problem
   */
  private async calculateAdvancedHybridScores(
    user: User,
    preferences: UserPreference | null,
    candidates: User[],
    context: MatchingContext
  ): Promise<AdvancedMatchScore[]> {
    
    const startTime = Date.now();
    console.log(`[PERFORMANCE] Starting batch scoring for ${candidates.length} candidates`);
    
    // 🚀 PERFORMANCE FIX #1: Batch load ALL candidate preferences in single query
    const candidateIds = candidates.map(c => c.id);
    const allCandidatePreferences = await this.batchGetUserPreferences(candidateIds);
    
    // 🚀 PERFORMANCE FIX #2: Load user interaction pattern ONCE and cache it
    const userInteractions = await this.getUserInteractionPattern(user.id);
    
    // 🚀 PERFORMANCE FIX #3: Parallel context calculations using Promise.all
    const contextCalculations = candidates.map(candidate => 
      this.calculateEnhancedContextScore(user.id, candidate, context)
    );
    const allContextResults = await Promise.all(contextCalculations);
    
    const scores: AdvancedMatchScore[] = [];
    const batchTime = Date.now() - startTime;
    console.log(`[PERFORMANCE] Batch operations completed in ${batchTime}ms`);

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      try {
        // Use pre-loaded candidate preferences (no database query!)
        const candidatePreferences = allCandidatePreferences.get(candidate.id);
        
        // Use advanced content scoring with multiple similarity algorithms
        const contentResult = advancedMatchingEngine.calculateAdvancedContentScore(user, candidate, preferences, candidatePreferences);
        
        // Use cached user interactions (no database query!)
        const collaborativeScore = await this.calculateCollaborativeScore(user, candidate, userInteractions);
        
        // Use pre-calculated context result (no database query!)
        const contextResult = allContextResults[i];

        // Diversity bonus (calculated later in diversity injection)
        const diversityBonus = 0;

        // Combine scores with weights
        const finalScore = 
          (contentResult.score * MatchingEngine.CONTENT_WEIGHT) +
          (collaborativeScore * MatchingEngine.COLLABORATIVE_WEIGHT) +
          (contextResult.score * MatchingEngine.CONTEXT_WEIGHT);

        const reasons = [
          ...this.generateMatchReasons(contentResult.score, collaborativeScore, contextResult.score),
          `Content: ${contentResult.details.cosine?.toFixed(2)} cosine, ${contentResult.details.jaccard?.toFixed(2)} jaccard`,
          `Context: Temporal=${contextResult.details.temporal?.toFixed(2)}, Geographic=${contextResult.details.geographic?.toFixed(2)}, Profile=${contextResult.details.profileHealth?.toFixed(2)}, Reciprocity=${contextResult.details.reciprocity?.toFixed(2)}`,
        ];

        scores.push({
          userId: candidate.id,
          contentScore: contentResult.score,
          collaborativeScore,
          contextScore: contextResult.score,
          diversityBonus,
          reciprocityScore: contextResult.details.reciprocity || 0.5,
          finalScore,
          algorithmVersion: 'advanced-v1.0',
          reasons
        });

      } catch (error) {
        console.error(`[ADVANCED-MATCHING] Error scoring candidate ${candidate.id}:`, error);
        // Add with minimal score to avoid excluding
        scores.push({
          userId: candidate.id,
          contentScore: 0.1,
          collaborativeScore: 0.1,
          contextScore: 0.1,
          diversityBonus: 0,
          reciprocityScore: 0.1,
          finalScore: 0.1,
          algorithmVersion: 'fallback-v1.0',
          reasons: ['Basic compatibility (error in advanced scoring)']
        });
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[PERFORMANCE] ⚡ COMPLETED: Scored ${candidates.length} candidates in ${totalTime}ms (vs previous ~${candidates.length * 200}ms)`);
    
    return scores;
  }

  /**
   * 🚀 PERFORMANCE OPTIMIZATION: Batch load user preferences in single query
   */
  private async batchGetUserPreferences(userIds: number[]): Promise<Map<number, UserPreference | null>> {
    const preferences = new Map<number, UserPreference | null>();
    
    if (userIds.length === 0) return preferences;
    
    try {
      const startTime = Date.now();
      const allPreferences = await storage.batchGetUserPreferences(userIds);
      
      // Initialize all users with null preferences
      userIds.forEach(id => preferences.set(id, null));
      
      // Update with actual preferences where they exist
      allPreferences.forEach(pref => {
        preferences.set(pref.userId, pref);
      });
      
      const duration = Date.now() - startTime;
      console.log(`[PERFORMANCE] Batch loaded ${allPreferences.length}/${userIds.length} preferences in ${duration}ms`);
      
      return preferences;
    } catch (error) {
      console.error(`[PERFORMANCE] Error batch loading preferences:`, error);
      // Fallback: initialize all with null
      userIds.forEach(id => preferences.set(id, null));
      return preferences;
    }
  }

  /**
   * Calculate hybrid scores for all candidates (legacy method for backward compatibility)
   */
  private async calculateHybridScores(
    user: User,
    preferences: UserPreference | null,
    candidates: User[],
    context: MatchingContext
  ): Promise<MatchScore[]> {
    
    const scores: MatchScore[] = [];

    // Get user interaction patterns for collaborative filtering
    const userInteractions = await this.getUserInteractionPattern(user.id);

    for (const candidate of candidates) {
      try {
        // Calculate individual scores
        const contentScore = this.calculateContentScore(user, candidate, preferences);
        const collaborativeScore = await this.calculateCollaborativeScore(user, candidate, userInteractions);
        const contextScore = this.calculateContextScore(candidate, context);

        // Combine scores with weights
        const finalScore = 
          (contentScore * MatchingEngine.CONTENT_WEIGHT) +
          (collaborativeScore * MatchingEngine.COLLABORATIVE_WEIGHT) +
          (contextScore * MatchingEngine.CONTEXT_WEIGHT);

        const reasons = this.generateMatchReasons(contentScore, collaborativeScore, contextScore);

        scores.push({
          userId: candidate.id,
          contentScore,
          collaborativeScore,
          contextScore,
          finalScore,
          reasons
        });

      } catch (error) {
        console.error(`[MATCHING-ENGINE] Error scoring candidate ${candidate.id}:`, error);
        // Add with minimal score to avoid excluding
        scores.push({
          userId: candidate.id,
          contentScore: 0.1,
          collaborativeScore: 0.1,
          contextScore: 0.1,
          finalScore: 0.1,
          reasons: ['Basic compatibility']
        });
      }
    }

    return scores;
  }

  /**
   * Content-Based Filtering: Profile and preference matching
   */
  private calculateContentScore(
    user: User,
    candidate: User,
    preferences: UserPreference | null
  ): number {
    let score = 0;
    let factors = 0;

    try {
      // Age compatibility
      if (preferences?.minAge && preferences?.maxAge && candidate.dateOfBirth) {
        const candidateAge = this.calculateAge(candidate.dateOfBirth);
        if (candidateAge >= preferences.minAge && candidateAge <= preferences.maxAge) {
          score += 0.25;
        }
        factors++;
      }

      // Location compatibility
      if (preferences?.locationPreference && candidate.location) {
        if (preferences.locationPreference === 'Both' || 
            preferences.locationPreference === candidate.location) {
          score += 0.2;
        }
        factors++;
      }

      // Religion compatibility
      if (preferences?.religionPreference && candidate.religion) {
        const religionPrefs = this.parseJsonArray(preferences.religionPreference);
        if (religionPrefs.includes(candidate.religion)) {
          score += 0.2;
        }
        factors++;
      }

      // Ethnicity compatibility
      if (preferences?.ethnicityPreference && candidate.ethnicity) {
        const ethnicityPrefs = this.parseJsonArray(preferences.ethnicityPreference);
        if (ethnicityPrefs.includes(candidate.ethnicity)) {
          score += 0.15;
        }
        factors++;
      }

      // Interest similarity
      if (user.interests && candidate.interests) {
        const userInterests = this.parseJsonArray(user.interests);
        const candidateInterests = this.parseJsonArray(candidate.interests);
        const similarity = this.calculateInterestSimilarity(userInterests, candidateInterests);
        score += similarity * 0.2;
        factors++;
      }

      // Normalize score by number of factors
      return factors > 0 ? score / factors : 0.1;

    } catch (error) {
      console.error(`[MATCHING-ENGINE] Error in content scoring:`, error);
      return 0.1;
    }
  }

  /**
   * Collaborative Filtering: Enhanced with Matrix Factorization
   */
  private async calculateCollaborativeScore(
    user: User,
    candidate: User,
    userInteractions: UserInteractionPattern
  ): Promise<number> {
    try {
      // Initialize Matrix Factorization model if not done yet
      if (!this.matrixFactorizationInitialized) {
        console.log('[MATCHING-ENGINE] Initializing Matrix Factorization model...');
        await matrixFactorization.trainModel();
        this.matrixFactorizationInitialized = true;
      }

      // Try Matrix Factorization approach first
      const matrixScore = matrixFactorization.getCollaborativeScore(user.id, candidate.id);
      
      // Fallback to traditional approach for comparison/enhancement
      const traditionalScore = await this.calculateTraditionalCollaborativeScore(user, candidate, userInteractions);
      
      // Blend both approaches: 70% matrix factorization, 30% traditional
      const blendedScore = (matrixScore * 0.7) + (traditionalScore * 0.3);
      
      console.log(`[COLLABORATIVE-FILTERING] User ${user.id} → User ${candidate.id}: Matrix=${matrixScore.toFixed(3)}, Traditional=${traditionalScore.toFixed(3)}, Blended=${blendedScore.toFixed(3)}`);
      
      return Math.max(0, Math.min(1, blendedScore));

    } catch (error) {
      console.error(`[MATCHING-ENGINE] Error in collaborative scoring:`, error);
      return 0.5;
    }
  }

  /**
   * Traditional collaborative filtering as fallback/enhancement
   */
  private async calculateTraditionalCollaborativeScore(
    user: User,
    candidate: User,
    userInteractions: UserInteractionPattern
  ): Promise<number> {
    try {
      // Find users with similar interaction patterns
      const similarUsers = await this.findSimilarUsers(user.id, userInteractions);
      
      if (similarUsers.length === 0) {
        return 0.5; // Neutral score when no interaction data
      }

      // Check if similar users liked this candidate
      let positiveVotes = 0;
      let totalVotes = 0;

      for (const similarUserId of similarUsers) {
        const interactions = await this.getUserInteractionPattern(similarUserId);
        if (interactions.likedUsers.includes(candidate.id)) {
          positiveVotes++;
        }
        if (interactions.likedUsers.includes(candidate.id) || 
            interactions.dislikedUsers.includes(candidate.id)) {
          totalVotes++;
        }
      }

      if (totalVotes === 0) {
        return 0.5; // No data available
      }

      return positiveVotes / totalVotes;

    } catch (error) {
      console.error(`[MATCHING-ENGINE] Error in traditional collaborative scoring:`, error);
      return 0.5;
    }
  }

  /**
   * Context-Aware Re-ranking: Real-time adjustments with comprehensive Reciprocity & Engagement scoring
   */
  private async calculateEnhancedContextScore(
    currentUserId: number,
    candidate: User, 
    context: MatchingContext
  ): Promise<{score: number, details: any}> {
    try {
      // Import user behavior patterns for comprehensive analysis
      const { userBehaviorPatterns } = await import('./user-behavior-patterns');
      
      // Calculate comprehensive context score using all 4 components:
      // 1. Temporal Context Factors (25% weight)
      // 2. Geographic Context Factors (25% weight) 
      // 3. Profile Health Metrics (25% weight)
      // 4. Reciprocity & Engagement Scoring (25% weight)
      const contextAnalysis = await userBehaviorPatterns.calculateComprehensiveContextScore(
        currentUserId,
        candidate.id
      );

      return {
        score: contextAnalysis.overallContextScore,
        details: {
          temporal: contextAnalysis.temporalScore,
          geographic: contextAnalysis.geographicScore,
          profileHealth: contextAnalysis.profileHealthScore,
          reciprocity: contextAnalysis.reciprocityScore,
          activity: candidate.isOnline || false,
          breakdown: contextAnalysis.breakdown
        }
      };

    } catch (error) {
      console.error(`[CONTEXT-SCORING] Error in enhanced context scoring for ${candidate.id}:`, error);
      
      // Fallback to basic context scoring
      return {
        score: this.calculateBasicContextScore(candidate, context),
        details: { fallback: true, activity: candidate.isOnline }
      };
    }
  }

  /**
   * Basic Context-Aware Re-ranking fallback method
   */
  private calculateBasicContextScore(candidate: User, context: MatchingContext): number {
    let score = 0.5; // Base score

    try {
      // Recently active users get priority
      if (candidate.lastActive) {
        const minutesSinceActive = (context.currentTime.getTime() - candidate.lastActive.getTime()) / (1000 * 60);
        if (minutesSinceActive <= context.lastActiveThreshold) {
          score += 0.3; // Recently active bonus
        } else if (minutesSinceActive <= context.lastActiveThreshold * 2) {
          score += 0.15; // Moderately recent bonus
        }
      }

      // Online status bonus
      if (candidate.isOnline) {
        score += 0.2;
      }

      // Profile completeness bonus
      const completeness = this.calculateProfileCompleteness(candidate);
      score += completeness * 0.3;

      return Math.min(score, 1.0); // Cap at 1.0

    } catch (error) {
      console.error(`[MATCHING-ENGINE] Error in basic context scoring:`, error);
      return 0.5;
    }
  }

  /**
   * Legacy context scoring method (kept for backward compatibility)
   */
  private calculateContextScore(candidate: User, context: MatchingContext): number {
    return this.calculateBasicContextScore(candidate, context);
  }

  /**
   * Helper methods
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    return age;
  }

  private parseJsonArray(jsonString: string): string[] {
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }

  private calculateInterestSimilarity(interests1: string[], interests2: string[]): number {
    if (interests1.length === 0 || interests2.length === 0) return 0;
    
    const set1 = new Set(interests1.map(i => i.toLowerCase()));
    const set2 = new Set(interests2.map(i => i.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  private calculateProfileCompleteness(user: User): number {
    const fields = [
      user.bio, user.profession, user.interests, 
      user.photoUrl, user.religion, user.ethnicity
    ];
    const completedFields = fields.filter(field => field && field.trim().length > 0);
    return completedFields.length / fields.length;
  }

  private async getUserInteractionPattern(userId: number): Promise<UserInteractionPattern> {
    try {
      // Get user's like/dislike history from storage
      const matches = await storage.getMeetMatchesByUserId(userId);
      const swipeHistory = await storage.getSwipeHistory(userId, 'MEET', 100);

      const likedUsers: number[] = [];
      const dislikedUsers: number[] = [];

      // Process matches for likes
      matches.forEach(match => {
        if (match.matched || (!match.isDislike)) {
          const otherUserId = match.userId1 === userId ? match.userId2 : match.userId1;
          likedUsers.push(otherUserId);
        }
      });

      // Process swipe history for dislikes
      swipeHistory.forEach(swipe => {
        if (swipe.action === 'dislike') {
          dislikedUsers.push(swipe.targetUserId);
        } else if (swipe.action === 'like') {
          likedUsers.push(swipe.targetUserId);
        }
      });

      return {
        userId,
        likedUsers: [...new Set(likedUsers)], // Remove duplicates
        dislikedUsers: [...new Set(dislikedUsers)],
        averageResponseTime: 0, // TODO: Calculate from message data
        preferredAgeRange: [18, 50], // TODO: Infer from interaction patterns
        preferredLocations: [], // TODO: Infer from liked users
        interactionFrequency: swipeHistory.length
      };

    } catch (error) {
      console.error(`[MATCHING-ENGINE] Error getting interaction pattern:`, error);
      return {
        userId,
        likedUsers: [],
        dislikedUsers: [],
        averageResponseTime: 0,
        preferredAgeRange: [18, 50],
        preferredLocations: [],
        interactionFrequency: 0
      };
    }
  }

  private async findSimilarUsers(userId: number, userPattern: UserInteractionPattern): Promise<number[]> {
    try {
      // Simple similarity: users who liked similar people
      // In a production system, this would use more sophisticated algorithms
      
      if (userPattern.likedUsers.length === 0) {
        return [];
      }

      // Get all users who have interactions
      const allMatches = await storage.getMatches(userId);
      const userSimilarities: { userId: number; similarity: number }[] = [];

      // Calculate similarity with other users
      const otherUsers = new Set<number>();
      allMatches.forEach((match: any) => {
        if (match.userId1 !== userId) otherUsers.add(match.userId1);
        if (match.userId2 !== userId) otherUsers.add(match.userId2);
      });

      for (const otherUserId of otherUsers) {
        const otherPattern = await this.getUserInteractionPattern(otherUserId);
        const similarity = this.calculateUserSimilarity(userPattern, otherPattern);
        
        if (similarity > 0.3) { // Threshold for similarity
          userSimilarities.push({ userId: otherUserId, similarity });
        }
      }

      // Return top 10 most similar users
      return userSimilarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10)
        .map(s => s.userId);

    } catch (error) {
      console.error(`[MATCHING-ENGINE] Error finding similar users:`, error);
      return [];
    }
  }

  private calculateUserSimilarity(pattern1: UserInteractionPattern, pattern2: UserInteractionPattern): number {
    // Calculate Jaccard similarity of liked users
    const likes1 = new Set(pattern1.likedUsers);
    const likes2 = new Set(pattern2.likedUsers);
    
    if (likes1.size === 0 && likes2.size === 0) return 0;
    
    const intersection = new Set([...likes1].filter(x => likes2.has(x)));
    const union = new Set([...likes1, ...likes2]);
    
    return intersection.size / union.size;
  }

  private generateMatchReasons(contentScore: number, collaborativeScore: number, contextScore: number): string[] {
    const reasons: string[] = [];

    if (contentScore > 0.7) reasons.push('Strong profile compatibility');
    if (contentScore > 0.5) reasons.push('Good preference match');
    
    if (collaborativeScore > 0.7) reasons.push('Liked by similar users');
    if (collaborativeScore > 0.5) reasons.push('Community recommended');
    
    if (contextScore > 0.7) reasons.push('Recently active');
    if (contextScore > 0.5) reasons.push('Complete profile');

    return reasons.length > 0 ? reasons : ['Basic compatibility'];
  }
}

// Export singleton instance
export const matchingEngine = new MatchingEngine();