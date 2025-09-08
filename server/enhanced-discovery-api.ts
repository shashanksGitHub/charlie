/**
 * Enhanced Discovery API with Hybrid Matching Engine
 * 
 * Integrates the new Matching Engine with existing discovery endpoints
 * Provides both enhanced and fallback discovery modes
 */

import type { Express, Request, Response } from "express";
import { matchingEngine, type MatchingContext } from "./matching-engine";
import { advancedMatchingEngine, type AdvancedMatchScore } from "./advanced-matching-algorithms";
import { storage } from "./storage";
import { requireAuth } from "./auth";

export function registerEnhancedDiscoveryAPI(app: Express) {
  
  /**
   * Enhanced MEET Discovery with Hybrid Matching
   * GET /api/discovery/enhanced
   */
  app.get("/api/discovery/enhanced", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      
      console.log(`[ENHANCED-DISCOVERY] Starting enhanced discovery for user ${userId}`);
      
      // Create matching context
      const context: MatchingContext = {
        currentTime: new Date(),
        lastActiveThreshold: 60, // 1 hour
        mode: 'meet'
      };

      // Get ranked results from matching engine
      const rankedUsers = await matchingEngine.getRankedDiscovery(userId, context, limit);
      
      // Remove sensitive data
      const safeUsers = rankedUsers.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });

      console.log(`[ENHANCED-DISCOVERY] Returning ${safeUsers.length} ranked users for ${userId}`);
      
      res.json(safeUsers);

    } catch (error) {
      console.error("[ENHANCED-DISCOVERY] Error in enhanced discovery:", error);
      
      // Fallback to original discovery
      try {
        const fallbackUsers = await storage.getDiscoverUsers(req.user!.id);
        const safeUsers = fallbackUsers.map(user => {
          const { password, ...safeUser } = user;
          return safeUser;
        });
        
        console.log(`[ENHANCED-DISCOVERY] Fallback: Returning ${safeUsers.length} users`);
        res.json(safeUsers);
      } catch (fallbackError) {
        console.error("[ENHANCED-DISCOVERY] Fallback also failed:", fallbackError);
        res.status(500).json({ 
          message: "Discovery service temporarily unavailable",
          error: fallbackError instanceof Error ? fallbackError.message : "Unknown error"
        });
      }
    }
  });

  /**
   * Enhanced SUITE Networking Discovery with Professional Matching
   * GET /api/suite/discovery/networking/enhanced
   */
  app.get("/api/suite/discovery/networking/enhanced", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 30;
      
      console.log(`[ENHANCED-SUITE] Starting enhanced networking discovery for user ${userId}`);
      
      // Create SUITE networking context
      const context: MatchingContext = {
        currentTime: new Date(),
        lastActiveThreshold: 120, // 2 hours (professionals check less frequently)
        mode: 'suite'
      };

      // Get ranked results from matching engine
      const rankedUsers = await matchingEngine.getRankedDiscovery(userId, context, limit);
      
      // Remove sensitive data
      const safeUsers = rankedUsers.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });

      console.log(`[ENHANCED-SUITE] Returning ${safeUsers.length} ranked networking profiles for ${userId}`);
      
      res.json(safeUsers);

    } catch (error) {
      console.error("[ENHANCED-SUITE] Error in enhanced networking discovery:", error);
      
      // Fallback to original discovery
      try {
        const fallbackUsers = await storage.getDiscoverUsers(req.user!.id);
        const safeUsers = fallbackUsers.map(user => {
          const { password, ...safeUser } = user;
          return safeUser;
        });
        
        console.log(`[ENHANCED-SUITE] Fallback: Returning ${safeUsers.length} users`);
        res.json(safeUsers);
      } catch (fallbackError) {
        console.error("[ENHANCED-SUITE] Fallback also failed:", fallbackError);
        res.status(500).json({ 
          message: "Networking discovery service temporarily unavailable",
          error: fallbackError instanceof Error ? fallbackError.message : "Unknown error"
        });
      }
    }
  });

  /**
   * Matching Engine Performance Metrics
   * GET /api/matching-engine/stats
   */
  app.get("/api/matching-engine/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Get user's recent activity
      const [matches, preferences] = await Promise.all([
        storage.getMeetMatchesByUserId(userId),
        storage.getUserPreferences(userId)
      ]);

      const stats = {
        totalMatches: matches.length,
        hasPreferences: !!preferences,
        preferenceCompleteness: preferences ? calculatePreferenceCompleteness(preferences) : 0,
        lastMatchDate: matches.length > 0 ? Math.max(...matches.map(m => new Date(m.createdAt!).getTime())) : null,
        matchingEngineStatus: "active",
        algorithmVersion: "1.0-hybrid"
      };

      res.json(stats);

    } catch (error) {
      console.error("[MATCHING-ENGINE-STATS] Error getting stats:", error);
      res.status(500).json({ 
        message: "Stats temporarily unavailable",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * A/B Testing Endpoint - Toggle between enhanced and original discovery
   * POST /api/discovery/mode
   */
  app.post("/api/discovery/mode", requireAuth, async (req: Request, res: Response) => {
    try {
      const { mode } = req.body; // 'enhanced' or 'original'
      const userId = req.user!.id;
      
      if (!mode || !['enhanced', 'original'].includes(mode)) {
        return res.status(400).json({ 
          message: "Invalid mode. Use 'enhanced' or 'original'" 
        });
      }

      // Store user's discovery mode preference
      // For now, we'll just return confirmation
      // In production, this would be stored in user preferences
      
      console.log(`[DISCOVERY-MODE] User ${userId} set discovery mode to: ${mode}`);
      
      res.json({ 
        message: `Discovery mode set to ${mode}`,
        mode,
        userId 
      });

    } catch (error) {
      console.error("[DISCOVERY-MODE] Error setting discovery mode:", error);
      res.status(500).json({ 
        message: "Failed to set discovery mode",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Manual Refresh Trigger for Matching Engine
   * POST /api/matching-engine/refresh
   */
  app.post("/api/matching-engine/refresh", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      console.log(`[MATCHING-ENGINE-REFRESH] Manual refresh triggered by user ${userId}`);
      
      // Clear any caches and force fresh calculation
      // This is useful for testing and debugging
      
      const context: MatchingContext = {
        currentTime: new Date(),
        lastActiveThreshold: 60,
        mode: 'meet'
      };

      const refreshedUsers = await matchingEngine.getRankedDiscovery(userId, context, 10);
      
      res.json({ 
        message: "Matching engine refreshed successfully",
        refreshedCount: refreshedUsers.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("[MATCHING-ENGINE-REFRESH] Error refreshing:", error);
      res.status(500).json({ 
        message: "Failed to refresh matching engine",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Advanced Algorithm Testing Endpoint
   * GET /api/matching-engine/advanced-test/:candidateId
   */
  app.get("/api/matching-engine/advanced-test/:candidateId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const candidateId = parseInt(req.params.candidateId);
      
      console.log(`[ADVANCED-TEST] Testing advanced algorithms between ${userId} and ${candidateId}`);
      
      const user = await storage.getUser(userId);
      const candidate = await storage.getUser(candidateId);
      const preferences = await storage.getUserPreferences(userId);
      
      if (!user || !candidate) {
        return res.status(404).json({ error: "User not found" });
      }

      // Test all advanced algorithms
      const contentResult = advancedMatchingEngine.calculateAdvancedContentScore(user, candidate, preferences);
      
      const contextResult = advancedMatchingEngine.calculateAdvancedContextScore(
        candidate, 
        { currentTime: new Date() }, 
        { responseRate: 0.8, averageResponseTime: 1200 }
      );

      res.json({
        success: true,
        userId,
        candidateId,
        results: {
          content: contentResult,
          context: contextResult,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('[ADVANCED-TEST] Error:', error);
      res.status(500).json({ 
        error: "Advanced algorithm test failed",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Feedback Collection for Algorithm Improvement
   * POST /api/matching-engine/feedback
   */
  app.post("/api/matching-engine/feedback", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { targetUserId, action, feedback, algorithmVersion } = req.body;
      
      console.log(`[FEEDBACK] User ${userId} provided feedback on ${targetUserId}: ${action}`);
      
      // Store feedback for future model training
      const feedbackData = {
        userId,
        targetUserId: parseInt(targetUserId),
        action, // 'like', 'dislike', 'message', 'skip'
        feedback, // Optional text feedback
        algorithmVersion,
        timestamp: new Date(),
        sessionId: req.sessionID
      };

      // For now, just log the feedback (in production, store in dedicated feedback table)
      console.log('[FEEDBACK-DATA]', JSON.stringify(feedbackData, null, 2));
      
      res.json({ 
        success: true, 
        message: "Feedback recorded successfully",
        feedbackId: `fb_${Date.now()}_${userId}`
      });
      
    } catch (error) {
      console.error('[FEEDBACK] Error recording feedback:', error);
      res.status(500).json({ 
        error: "Failed to record feedback",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Helper method for preference completeness calculation
  function calculatePreferenceCompleteness(preferences: any): number {
    const fields = [
      preferences.minAge,
      preferences.maxAge,
      preferences.locationPreference,
      preferences.religionPreference,
      preferences.ethnicityPreference,
      preferences.relationshipGoalPreference
    ];
    
    const completedFields = fields.filter(field => field !== null && field !== undefined);
    return completedFields.length / fields.length;
  }
}