/**
 * Unified API endpoint for parallel data loading optimization
 * Combines multiple independent API calls into single requests to reduce loading time
 */

import { Request, Response } from "express";
import { storage } from "./storage";
import { matchingEngine, type MatchingContext } from "./matching-engine";

export interface HomePageData {
  user: any;
  discoverUsers: any[];
  swipeHistory: any[];
  premiumStatus: any;
  matchCounts: any;
  matches: any[];
  unreadCount: number;
  suiteConnectionCounts: any;
}

/**
 * Unified endpoint for MEET home page data loading
 * Fetches all required data in parallel instead of sequential API calls
 */
export async function getHomePageData(req: Request, res: Response) {
  try {
    const startTime = Date.now();
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log(
      `[UNIFIED-API] Starting parallel data fetch for user ${userId}`,
    );
    console.log(
      `[UNIFIED-API] 🚨 VERIFICATION: About to call getEnhancedDiscoveryUsers with AI matching engine`,
    );

    // Execute only essential queries in parallel for maximum speed
    const [user, discoverUsers, swipeHistory, premiumStatus] =
      await Promise.all([
        // User data (essential)
        storage.getUser(userId),

        // 🎯 Enhanced AI-powered discovery with hybrid matching (with timeout & fallback)
        getDiscoveryWithTimeout(userId),

        // Swipe history (for undo functionality)
        storage.getSwipeHistory(userId, "MEET", 50),

        // Premium status (essential for features)
        storage.getPremiumStatus(userId),
      ]);

    const duration = Date.now() - startTime;
    console.log(
      `[UNIFIED-API] Parallel fetch completed in ${duration}ms for user ${userId}`,
    );

    const responseData: HomePageData = {
      user,
      discoverUsers: discoverUsers || [],
      swipeHistory: swipeHistory || [],
      premiumStatus: premiumStatus || { premiumAccess: false },
      matchCounts: { confirmed: 0, pending: 0, total: 0 }, // Load later if needed
      matches: [], // Load later if needed
      unreadCount: 0, // Load later if needed
      suiteConnectionCounts: { networking: { matches: 0, pending: 0 } }, // Load later if needed
    };

    res.json(responseData);
  } catch (error) {
    console.error("[UNIFIED-API] Error in getHomePageData:", error);
    console.error("[UNIFIED-API] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("[UNIFIED-API] Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      message: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/**
 * Enhanced Discovery Users with AI Matching Engine
 * Uses hybrid algorithm to rank and personalize MEET swipe cards
 */
async function getEnhancedDiscoveryUsers(userId: number, limit?: number) {
  try {
    console.log(
      `[ENHANCED-MEET] 🎯 Using AI matching engine for user ${userId}`,
    );

    // Create matching context for MEET mode
    const context: MatchingContext = {
      currentTime: new Date(),
      lastActiveThreshold: 60, // 1 hour
      mode: "meet",
    };

    // Get AI-ranked users from matching engine
    const isProduction = process.env.NODE_ENV === "production";
    const effectiveLimit =
      typeof limit === "number" && limit > 0 ? limit : isProduction ? 16 : 50; // Reduce workload in production to avoid timeouts
    const rankedUsers = await matchingEngine.getRankedDiscovery(
      userId,
      context,
      effectiveLimit,
    );

    console.log(
      `[ENHANCED-MEET] ⚡ AI engine returned ${rankedUsers.length} personalized matches`,
    );

    // Remove sensitive data
    const safeUsers = rankedUsers.map((user) => {
      const { password, ...safeUser } = user;
      return safeUser;
    });

    return safeUsers;
  } catch (error) {
    console.error(
      "[ENHANCED-MEET] AI matching failed, falling back to original discovery:",
      error,
    );

    // Fallback to original discovery if AI system fails
    return await storage.getDiscoverUsers(userId);
  }
}

/**
 * Production-safe wrapper: returns AI discovery, but falls back to legacy
 * discovery if the AI path exceeds a timeout or throws. Prevents 500s on
 * platforms with strict request time limits.
 */
async function getDiscoveryWithTimeout(userId: number): Promise<any[]> {
  const isProduction = process.env.NODE_ENV === "production";
  const timeoutMs = Number(
    process.env.MEET_DISCOVERY_TIMEOUT_MS || (isProduction ? 5000 : 15000),
  );
  const limit = Number(
    process.env.MEET_DISCOVERY_LIMIT || (isProduction ? 16 : 50),
  );

  try {
    const aiPromise = getEnhancedDiscoveryUsers(userId, limit);
    const timeoutPromise = new Promise<any[]>((resolve) => {
      setTimeout(async () => {
        try {
          console.warn(
            `[ENHANCED-MEET] ⏱️ Timeout after ${timeoutMs}ms for user ${userId}, using legacy discovery`,
          );
          const fallbackUsers = await storage.getDiscoverUsers(userId);
          resolve(fallbackUsers);
        } catch (fallbackError) {
          console.error(
            `[ENHANCED-MEET] ❌ Fallback discovery also failed for user ${userId}:`,
            fallbackError,
          );
          // Return empty array as last resort to prevent 500 error
          resolve([]);
        }
      }, timeoutMs);
    });

    // Return whichever finishes first
    return await Promise.race([aiPromise, timeoutPromise]);
  } catch (e) {
    console.error(
      "[ENHANCED-MEET] Discovery wrapper error, using legacy discovery:",
      e,
    );
    try {
      return await storage.getDiscoverUsers(userId);
    } catch (fallbackError) {
      console.error(
        `[ENHANCED-MEET] ❌ Both AI and fallback discovery failed for user ${userId}:`,
        fallbackError,
      );
      // Return empty array as last resort to prevent 500 error
      return [];
    }
  }
}

/**
 * Unified endpoint for SUITE page data loading
 * Combines SUITE-specific API calls for parallel loading
 */
export async function getSuitePageData(req: Request, res: Response) {
  try {
    const startTime = Date.now();
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log(
      `[UNIFIED-API] Starting parallel SUITE data fetch for user ${userId}`,
    );

    // Execute SUITE-specific queries in parallel
    const [
      user,
      suiteConnectionCounts,
      networkingProfile,
      mentorshipProfile,
      jobProfile,
      unreadCount,
    ] = await Promise.all([
      storage.getUser(userId),
      storage.getSuiteConnectionCounts(userId),
      storage.getSuiteNetworkingProfile(userId),
      storage.getSuiteMentorshipProfile(userId),
      storage.getSuiteJobProfile(userId),
      storage.getUnreadMessageCount(userId),
    ]);

    const duration = Date.now() - startTime;
    console.log(
      `[UNIFIED-API] Parallel SUITE fetch completed in ${duration}ms for user ${userId}`,
    );

    res.json({
      user,
      suiteConnectionCounts: suiteConnectionCounts || {
        networking: { matches: 0, pending: 0 },
      },
      networkingProfile,
      mentorshipProfile,
      jobProfile,
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error("[UNIFIED-API] Error in getSuitePageData:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
