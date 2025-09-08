import type { Express, Request, Response } from "express";
import { db } from "./db";
import {
  compatibilityAnalysis,
  users,
  userInterests,
  userPreferences,
  matches as matchesTable,
  insertCompatibilityAnalysisSchema,
  type InsertCompatibilityAnalysis,
  type CompatibilityAnalysis,
} from "@shared/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { ZodError } from "zod";

// Mock compatibility computation function (replace with actual AI/ML logic)
function computeCompatibilityData(user1: any, user2: any): any {
  // This is a mock implementation - replace with your actual compatibility algorithm
  const mockData = {
    overall_score: Math.floor(Math.random() * 30) + 70, // 70-100% (integer)
    computed_at: new Date().toISOString(),
    version: 1, // Integer version

    categories: {
      personality: Math.floor(Math.random() * 20) + 80,
      lifestyle: Math.floor(Math.random() * 25) + 75,
      values: Math.floor(Math.random() * 15) + 85,
      interests: Math.floor(Math.random() * 30) + 70,
      communication: Math.floor(Math.random() * 20) + 80,
    },

    personality_analysis: {
      big5_compatibility: {
        openness: { user1: 88, user2: 85, match: 95 },
        conscientiousness: { user1: 70, user2: 78, match: 88 },
        extraversion: { user1: 75, user2: 82, match: 92 },
        agreeableness: { user1: 85, user2: 80, match: 90 },
        neuroticism: { user1: 35, user2: 28, match: 89 },
      },
    },

    shared_interests: [
      { name: "Travel", match: 95, icon: "✈️", category: "adventure" },
      { name: "Photography", match: 88, icon: "📸", category: "creative" },
      { name: "Coffee", match: 92, icon: "☕", category: "lifestyle" },
      { name: "Art Museums", match: 85, icon: "🎨", category: "culture" },
      { name: "Hiking", match: 78, icon: "🥾", category: "outdoor" },
      { name: "Live Music", match: 82, icon: "🎵", category: "entertainment" },
    ],

    insights: {
      strengths: [
        "Shared passion for travel and adventure",
        "Similar communication styles",
        "Compatible life goals and values",
        "Complementary personality traits",
      ],
      growth_areas: [
        "Different approaches to social activities",
        "Varying interests in creative pursuits",
        "Different preferred pace of life",
      ],
      recommendations: [
        "Plan adventure trips together to strengthen your bond",
        "Explore new creative activities as a couple",
        "Discuss your social preferences openly",
        "Find balance between active and relaxed activities",
      ],
    },

    conversation_starters: [
      `Ask about ${user2.fullName || "their"} interests and hobbies`,
      "Share your favorite travel destination",
      "Discuss your favorite local spots",
      "Plan an activity you both enjoy",
    ],

    date_ideas: [
      {
        activity: "Photography Walk",
        location: "Brooklyn Bridge",
        duration: "2-3 hours",
        match: 95,
        description: "Capture the city together while exploring iconic spots",
        tags: ["Creative", "Outdoor", "Romantic"],
      },
      {
        activity: "Coffee & Art",
        location: "MoMA + Local Café",
        duration: "3-4 hours",
        match: 88,
        description: "Discuss art over expertly crafted coffee",
        tags: ["Cultural", "Intimate", "Inspiring"],
      },
    ],

    compatibility_timeline: [
      {
        date: "Dec 8, 2024",
        time: "2:47 PM",
        title: "Matched",
        description: "Initial compatibility established",
        score: 73,
        status: "completed",
      },
      {
        date: "Dec 8, 2024",
        time: "6:23 PM",
        title: "First Conversation",
        description: "Discussed art and travel",
        score: 78,
        status: "completed",
      },
      {
        date: "Dec 12, 2024",
        time: "Evening",
        title: "Deep Connection",
        description: "Shared personal stories",
        score: 81,
        status: "completed",
      },
      {
        date: "Dec 18, 2024",
        time: "All day",
        title: "Values Alignment",
        description: "Discovered shared life goals",
        score: 85,
        status: "completed",
      },
      {
        date: "Dec 25, 2024",
        time: "Future",
        title: "First Date",
        description: "Planned coffee & art gallery visit",
        score: 90,
        status: "upcoming",
      },
    ],

    profiles: {
      user: {
        name: "You",
        age: user1.dateOfBirth
          ? Math.floor(
              (Date.now() - new Date(user1.dateOfBirth).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000),
            )
          : 25,
        location: user1.location || "Unknown",
        photo: user1.photoUrl || "",
        bio: user1.bio || "",
      },
      match: {
        name: user2.fullName || "",
        age: user2.dateOfBirth
          ? Math.floor(
              (Date.now() - new Date(user2.dateOfBirth).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000),
            )
          : 0,
        location: user2.location || "",
        photo: user2.photoUrl || "",
        bio: user2.bio || "",
      },
    },
  };

  return mockData;
}

export function registerCompatibilityAPI(app: Express): void {
  // Test endpoint to verify API is working
  app.get("/api/compatibility/test", async (req: Request, res: Response) => {
    return res.json({
      message: "Compatibility API is working!",
      timestamp: new Date().toISOString(),
    });
  });

  // Get or create compatibility analysis between two users
  app.get(
    "/api/compatibility/:user1Id/:user2Id",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const user1Id = parseInt(req.params.user1Id);
        const user2Id = parseInt(req.params.user2Id);
        const currentUserId = req.user.id;

        // Ensure the current user is one of the two users in the compatibility analysis
        if (currentUserId !== user1Id && currentUserId !== user2Id) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Normalize user IDs to ensure consistent ordering
        const [normalizedUser1Id, normalizedUser2Id] =
          user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

        // Check if compatibility analysis already exists
        const existingAnalysis = await db
          .select()
          .from(compatibilityAnalysis)
          .where(
            and(
              or(
                and(
                  eq(compatibilityAnalysis.user1Id, normalizedUser1Id),
                  eq(compatibilityAnalysis.user2Id, normalizedUser2Id),
                ),
                and(
                  eq(compatibilityAnalysis.user1Id, normalizedUser2Id),
                  eq(compatibilityAnalysis.user2Id, normalizedUser1Id),
                ),
              ),
              eq(compatibilityAnalysis.isActive, true),
            ),
          )
          .limit(1);

        if (existingAnalysis.length > 0) {
          // Return existing analysis
          const analysis = existingAnalysis[0];
          return res.json({
            id: analysis.id,
            user1Id: analysis.user1Id,
            user2Id: analysis.user2Id,
            overallScore: analysis.overallScore,
            compatibilityData: typeof analysis.compatibilityData === 'string' 
              ? JSON.parse(analysis.compatibilityData) 
              : analysis.compatibilityData,
            computedAt: analysis.computedAt,
            version: analysis.version,
          });
        }

        // Get user data for compatibility computation
        const [user1Data] = await db
          .select()
          .from(users)
          .where(eq(users.id, user1Id))
          .limit(1);

        const [user2Data] = await db
          .select()
          .from(users)
          .where(eq(users.id, user2Id))
          .limit(1);

        if (!user1Data || !user2Data) {
          return res
            .status(404)
            .json({ message: "One or both users not found" });
        }

        // Compute compatibility data
        const compatibilityData = computeCompatibilityData(
          user1Data,
          user2Data,
        );

        // Store the analysis in the database
        const newAnalysis = await db
          .insert(compatibilityAnalysis)
          .values({
            user1Id: normalizedUser1Id,
            user2Id: normalizedUser2Id,
            compatibilityData: JSON.stringify(compatibilityData),
            overallScore: Math.round(compatibilityData.overall_score), // Ensure integer
            version: "1",
            isActive: true,
          })
          .returning();

        return res.json({
          id: newAnalysis[0].id,
          user1Id: newAnalysis[0].user1Id,
          user2Id: newAnalysis[0].user2Id,
          overallScore: newAnalysis[0].overallScore,
          compatibilityData: compatibilityData,
          computedAt: newAnalysis[0].computedAt,
          version: newAnalysis[0].version,
        });
      } catch (error) {
        console.error("Error in compatibility analysis:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Delete compatibility analysis when user dislikes (soft delete)
  app.delete(
    "/api/compatibility/:user1Id/:user2Id",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const user1Id = parseInt(req.params.user1Id);
        const user2Id = parseInt(req.params.user2Id);
        const currentUserId = req.user.id;

        // Ensure the current user is one of the two users
        if (currentUserId !== user1Id && currentUserId !== user2Id) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Soft delete by setting isActive to false
        await db
          .update(compatibilityAnalysis)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(
            and(
              or(
                and(
                  eq(compatibilityAnalysis.user1Id, user1Id),
                  eq(compatibilityAnalysis.user2Id, user2Id),
                ),
                and(
                  eq(compatibilityAnalysis.user1Id, user2Id),
                  eq(compatibilityAnalysis.user2Id, user1Id),
                ),
              ),
              eq(compatibilityAnalysis.isActive, true),
            ),
          );

        return res.json({
          message: "Compatibility analysis deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting compatibility analysis:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Update compatibility analysis (for future use when users interact more)
  app.put(
    "/api/compatibility/:user1Id/:user2Id",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const user1Id = parseInt(req.params.user1Id);
        const user2Id = parseInt(req.params.user2Id);
        const currentUserId = req.user.id;

        // Ensure the current user is one of the two users
        if (currentUserId !== user1Id && currentUserId !== user2Id) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Get fresh user data and recompute compatibility
        const [user1Data] = await db
          .select()
          .from(users)
          .where(eq(users.id, user1Id))
          .limit(1);

        const [user2Data] = await db
          .select()
          .from(users)
          .where(eq(users.id, user2Id))
          .limit(1);

        if (!user1Data || !user2Data) {
          return res
            .status(404)
            .json({ message: "One or both users not found" });
        }

        // Recompute compatibility data
        const compatibilityData = computeCompatibilityData(
          user1Data,
          user2Data,
        );

        // Update the analysis
        const updatedAnalysis = await db
          .update(compatibilityAnalysis)
          .set({
            compatibilityData: JSON.stringify(compatibilityData),
            overallScore: Math.round(compatibilityData.overall_score), // Ensure integer
            updatedAt: new Date(),
          })
          .where(
            and(
              or(
                and(
                  eq(compatibilityAnalysis.user1Id, user1Id),
                  eq(compatibilityAnalysis.user2Id, user2Id),
                ),
                and(
                  eq(compatibilityAnalysis.user1Id, user2Id),
                  eq(compatibilityAnalysis.user2Id, user1Id),
                ),
              ),
              eq(compatibilityAnalysis.isActive, true),
            ),
          )
          .returning();

        if (updatedAnalysis.length === 0) {
          return res
            .status(404)
            .json({ message: "Compatibility analysis not found" });
        }

        return res.json({
          id: updatedAnalysis[0].id,
          user1Id: updatedAnalysis[0].user1Id,
          user2Id: updatedAnalysis[0].user2Id,
          overallScore: updatedAnalysis[0].overallScore,
          compatibilityData: compatibilityData,
          computedAt: updatedAnalysis[0].computedAt,
          updatedAt: updatedAnalysis[0].updatedAt,
          version: updatedAnalysis[0].version,
        });
      } catch (error) {
        console.error("Error updating compatibility analysis:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Get compatibility analysis for match dashboard (simplified endpoint)
  app.get(
    "/api/match-dashboard/:matchId",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const matchId = parseInt(req.params.matchId);
        const currentUserId = req.user.id;

        // Get the match to find the two users
        const [match] = await db
          .select()
          .from(matchesTable)
          .where(eq(matchesTable.id, matchId))
          .limit(1);

        if (!match) {
          return res.status(404).json({ message: "Match not found" });
        }

        // Ensure the current user is part of this match
        if (
          currentUserId !== match.userId1 &&
          currentUserId !== match.userId2
        ) {
          return res.status(403).json({ message: "Access denied" });
        }

        const user1Id = match.userId1;
        const user2Id = match.userId2;

        // Get or create compatibility analysis
        const compatibilityResponse = await fetch(
          `${req.protocol}://${req.get("host")}/api/compatibility/${user1Id}/${user2Id}`,
          {
            headers: {
              Cookie: req.headers.cookie || "",
            },
          },
        );

        if (!compatibilityResponse.ok) {
          return res
            .status(500)
            .json({ message: "Failed to get compatibility analysis" });
        }

        const compatibilityData = await compatibilityResponse.json();

        return res.json({
          matchId: matchId,
          compatibility: compatibilityData,
        });
      } catch (error) {
        console.error("Error in match dashboard:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    },
  );
}
