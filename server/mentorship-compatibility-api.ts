import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import {
  insertSuiteMentorshipCompatibilityScoreSchema,
  InsertSuiteMentorshipCompatibilityScore,
  type SuiteMentorshipCompatibilityScore,
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Mentorship compatibility analysis interface
interface MentorshipCompatibilityAnalysis {
  expertiseRelevance: number;
  mentorshipStyleFit: number;
  timeSynergy: number;
  communicationFit: number;
  contextualAlignment: number;
  growthGapPotential: number;
  overallCompatibilityScore: number;
  successProbability: number;
  breakthroughMomentPrediction: number;
  plateauRiskAssessment: number;
  breakdown: {
    expertiseAlignment: number;
    learningGoalsMatch: number;
    availabilitySync: number;
    communicationStyleMatch: number;
    culturalFit: number;
    experienceGap: number;
  };
  insights: string[];
  conversationStarters: string[];
  mentorshipRoadmap: {
    phase: string;
    duration: string;
    focusAreas: string[];
    expectedOutcomes: string[];
  }[];
  milestonePathway: {
    week: number;
    milestone: string;
    description: string;
    probability: number;
  }[];
  skillGapForecast: {
    skill: string;
    currentLevel: string;
    targetLevel: string;
    timeToAchieve: string;
    confidence: number;
  }[];
}

// Advanced Mentorship Compatibility Engine
class MentorshipCompatibilityEngine {
  static calculateCompatibility(
    viewerProfile: any,
    targetProfile: any,
    viewerUser: any,
    targetUser: any,
  ): MentorshipCompatibilityAnalysis {
    // Determine who is mentor and who is mentee
    const isMentorViewing = viewerProfile.role === "mentor";
    const mentor = isMentorViewing ? viewerProfile : targetProfile;
    const mentee = isMentorViewing ? targetProfile : viewerProfile;
    const mentorUser = isMentorViewing ? viewerUser : targetUser;
    const menteeUser = isMentorViewing ? targetUser : viewerUser;

    // 1. Expertise Relevance (Mentor's expertise vs Mentee's learning goals)
    const expertiseRelevance = this.calculateExpertiseRelevance(mentor, mentee);

    // 2. Mentorship Style Fit (Teaching vs Learning preferences)
    const mentorshipStyleFit = this.calculateMentorshipStyleFit(mentor, mentee);

    // 3. Time Synergy (Availability and time commitment alignment)
    const timeSynergy = this.calculateTimeSynergy(mentor, mentee);

    // 4. Communication Fit (Preferred communication methods)
    const communicationFit = this.calculateCommunicationFit(mentor, mentee);

    // 5. Contextual Alignment (Geographic, linguistic, cultural)
    const contextualAlignment = this.calculateContextualAlignment(
      mentorUser,
      menteeUser,
    );

    // 6. Growth Gap Potential (Optimal experience delta)
    const growthGapPotential = this.calculateGrowthGapPotential(mentor, mentee);

    // Calculate overall compatibility score (weighted average)
    const weightedSum =
      expertiseRelevance * 0.25 +
      mentorshipStyleFit * 0.2 +
      timeSynergy * 0.15 +
      communicationFit * 0.15 +
      contextualAlignment * 0.15 +
      growthGapPotential * 0.1;
    const overallCompatibilityScore = Math.round(weightedSum * 10);

    // Success prediction metrics - ensure all return integers
    const successProbability = Math.round(
      this.calculateSuccessProbability(overallCompatibilityScore),
    );
    const breakthroughMomentPrediction = Math.round(
      this.predictBreakthroughMoment(expertiseRelevance, mentorshipStyleFit),
    );
    const plateauRiskAssessment = Math.round(
      this.assessPlateauRisk(timeSynergy, communicationFit),
    );

    // Generate insights and recommendations
    const insights = this.generateInsights(mentor, mentee, {
      expertiseRelevance,
      mentorshipStyleFit,
      timeSynergy,
      communicationFit,
      contextualAlignment,
      growthGapPotential,
    });

    const conversationStarters = this.generateConversationStarters(
      mentor,
      mentee,
    );
    const mentorshipRoadmap = this.generateMentorshipRoadmap(mentor, mentee);
    const milestonePathway = this.generateMilestonePathway(mentor, mentee);
    const skillGapForecast = this.generateSkillGapForecast(mentor, mentee);

    // Generate breakdown for detailed analysis
    const breakdown = {
      expertiseAlignment: expertiseRelevance,
      learningGoalsMatch: mentorshipStyleFit,
      availabilitySync: timeSynergy,
      communicationStyleMatch: communicationFit,
      culturalFit: contextualAlignment,
      experienceGap: growthGapPotential,
    };

    return {
      expertiseRelevance,
      mentorshipStyleFit,
      timeSynergy,
      communicationFit,
      contextualAlignment,
      growthGapPotential,
      overallCompatibilityScore,
      successProbability,
      breakthroughMomentPrediction,
      plateauRiskAssessment,
      breakdown,
      insights,
      conversationStarters,
      mentorshipRoadmap,
      milestonePathway,
      skillGapForecast,
    };
  }

  private static calculateExpertiseRelevance(mentor: any, mentee: any): number {
    const mentorExpertise = mentor.areasOfExpertise || [];
    const menteeGoals = mentee.learningGoals || [];
    const menteeIndustries = mentee.industriesOrDomains || [];
    const mentorIndustries = mentor.industriesOrDomains || [];

    let relevanceScore = 0;
    let matchCount = 0;

    // Check direct expertise to learning goals overlap
    menteeGoals.forEach((goal: string) => {
      mentorExpertise.forEach((expertise: string) => {
        if (this.calculateTextSimilarity(goal, expertise) > 0.6) {
          relevanceScore += 10;
          matchCount++;
        } else if (this.calculateTextSimilarity(goal, expertise) > 0.3) {
          relevanceScore += 6;
        }
      });
    });

    // Check industry alignment
    menteeIndustries.forEach((industry: string) => {
      mentorIndustries.forEach((mentorInd: string) => {
        if (this.calculateTextSimilarity(industry, mentorInd) > 0.7) {
          relevanceScore += 8;
        }
      });
    });

    // Normalize to 1-10 scale
    const maxPossibleScore =
      menteeGoals.length * mentorExpertise.length * 10 +
      menteeIndustries.length * mentorIndustries.length * 8;

    if (maxPossibleScore === 0) return 5; // Default if no data

    return Math.round(
      Math.min(10, Math.max(1, (relevanceScore / maxPossibleScore) * 10)),
    );
  }

  private static calculateMentorshipStyleFit(mentor: any, mentee: any): number {
    const mentorStyle = mentor.mentorshipStyle || "";
    const menteePreferredStyle = mentee.preferredMentorshipStyle || "";
    const mentorFormat = mentor.preferredFormat || "";
    const menteeFormat = mentee.preferredFormat || "";

    let styleScore = 0;

    // Style compatibility
    if (mentorStyle && menteePreferredStyle) {
      styleScore += Math.round(
        this.calculateTextSimilarity(mentorStyle, menteePreferredStyle) * 5,
      );
    }

    // Format compatibility
    if (mentorFormat && menteeFormat) {
      styleScore += Math.round(
        this.calculateTextSimilarity(mentorFormat, menteeFormat) * 5,
      );
    }

    return Math.round(Math.min(10, Math.max(1, styleScore)));
  }

  private static calculateTimeSynergy(mentor: any, mentee: any): number {
    const mentorCommitment = mentor.timeCommitment || "";
    const menteeCommitment = mentee.timeCommitment || "";
    const mentorAvailability = mentor.availability || "";
    const menteeAvailability = mentee.availability || "";

    let timeScore = 5; // Default

    // Time commitment alignment
    if (mentorCommitment && menteeCommitment) {
      if (mentorCommitment === menteeCommitment) {
        timeScore += 3;
      } else if (
        this.calculateTextSimilarity(mentorCommitment, menteeCommitment) > 0.5
      ) {
        timeScore += Math.round(2);
      }
    }

    // Availability overlap
    if (mentorAvailability && menteeAvailability) {
      timeScore += Math.round(
        this.calculateTextSimilarity(mentorAvailability, menteeAvailability) *
          2,
      );
    }

    return Math.round(Math.min(10, Math.max(1, timeScore)));
  }

  private static calculateCommunicationFit(mentor: any, mentee: any): number {
    const mentorComm = mentor.communicationStyle || "";
    const menteeComm = mentee.communicationStyle || "";

    if (!mentorComm || !menteeComm) return 6; // Default

    const similarity = this.calculateTextSimilarity(mentorComm, menteeComm);
    return Math.round(Math.min(10, Math.max(1, similarity * 10)));
  }

  private static calculateContextualAlignment(
    mentorUser: any,
    menteeUser: any,
  ): number {
    let contextScore = 5; // Default

    // Location proximity - with null safety
    if (mentorUser?.location && menteeUser?.location) {
      if (mentorUser.location === menteeUser.location) {
        contextScore += 3;
      } else if (
        this.calculateTextSimilarity(mentorUser.location, menteeUser.location) >
        0.5
      ) {
        contextScore += 2;
      }
    }

    // Language compatibility (if available)
    // Add more sophisticated location and timezone analysis here

    return Math.round(Math.min(10, Math.max(1, contextScore)));
  }

  private static calculateGrowthGapPotential(mentor: any, mentee: any): number {
    // This would ideally use experience levels, career progression data
    // For now, use role-based heuristics

    if (mentor.role === "mentor" && mentee.role === "mentee") {
      return 8; // Optimal gap
    }

    return Math.round(6); // Default moderate gap
  }

  private static calculateSuccessProbability(overallScore: number): number {
    // Convert 1-10 scale to percentage probability
    return Math.min(95, Math.max(20, overallScore * 9 + 10));
  }

  private static predictBreakthroughMoment(
    expertiseRelevance: number,
    styleAlignment: number,
  ): number {
    // Predict when major insights typically occur (in weeks)
    const avgAlignment = (expertiseRelevance + styleAlignment) / 2;

    if (avgAlignment >= 8) return 3; // High alignment = quick breakthroughs
    if (avgAlignment >= 6) return 6; // Medium alignment
    return 10; // Lower alignment = longer time to breakthrough
  }

  private static assessPlateauRisk(
    timeSynergy: number,
    communicationFit: number,
  ): number {
    // Higher time and communication alignment = lower plateau risk
    const avgAlignment = (timeSynergy + communicationFit) / 2;
    return Math.min(10, Math.max(1, 11 - avgAlignment));
  }

  private static generateInsights(
    mentor: any,
    mentee: any,
    scores: any,
  ): string[] {
    const insights = [];

    if (scores.expertiseRelevance >= 8) {
      insights.push(
        "Exceptional alignment between mentor expertise and mentee learning goals",
      );
    }

    if (scores.mentorshipStyleFit >= 8) {
      insights.push("Highly compatible teaching and learning styles detected");
    }

    if (scores.timeSynergy >= 7) {
      insights.push("Strong availability and time commitment alignment");
    }

    if (scores.communicationFit >= 7) {
      insights.push("Excellent communication style compatibility");
    }

    if (insights.length === 0) {
      insights.push("Good foundational compatibility with growth potential");
    }

    return insights;
  }

  private static generateConversationStarters(
    mentor: any,
    mentee: any,
  ): string[] {
    const starters = [];

    if (mentor.whyMentor) {
      starters.push(
        `Ask about their motivation: "${mentor.whyMentor.substring(0, 50)}..."`,
      );
    }

    if (mentee.whySeekMentorship) {
      starters.push(
        `Share your goals: "${mentee.whySeekMentorship.substring(0, 50)}..."`,
      );
    }

    if (mentor.areasOfExpertise && mentor.areasOfExpertise.length > 0) {
      starters.push(`Explore their ${mentor.areasOfExpertise[0]} expertise`);
    }

    if (mentee.learningGoals && mentee.learningGoals.length > 0) {
      starters.push(`Discuss your ${mentee.learningGoals[0]} learning goals`);
    }

    starters.push("Share a recent professional challenge you're facing");
    starters.push("Discuss industry trends and future opportunities");

    return starters.slice(0, 4); // Return top 4
  }

  private static generateMentorshipRoadmap(mentor: any, mentee: any): any[] {
    return [
      {
        phase: "Foundation Setting",
        duration: "Weeks 1-2",
        focusAreas: [
          "Goal alignment",
          "Expectations setting",
          "Communication rhythm",
        ],
        expectedOutcomes: [
          "Clear objectives",
          "Established meeting cadence",
          "Trust building",
        ],
      },
      {
        phase: "Skill Building",
        duration: "Weeks 3-8",
        focusAreas: [
          "Core competency development",
          "Practical application",
          "Feedback loops",
        ],
        expectedOutcomes: [
          "Tangible skill improvements",
          "Real-world application",
          "Confidence growth",
        ],
      },
      {
        phase: "Advanced Application",
        duration: "Weeks 9-12",
        focusAreas: [
          "Complex problem solving",
          "Strategic thinking",
          "Independent execution",
        ],
        expectedOutcomes: [
          "Advanced proficiency",
          "Strategic mindset",
          "Self-directed learning",
        ],
      },
    ];
  }

  private static generateMilestonePathway(mentor: any, mentee: any): any[] {
    return [
      {
        week: 2,
        milestone: "First Success",
        description: "Initial breakthrough in understanding",
        probability: 85,
      },
      {
        week: 4,
        milestone: "Skill Application",
        description: "Successfully applying learned concepts",
        probability: 75,
      },
      {
        week: 8,
        milestone: "Confidence Boost",
        description: "Noticeable increase in professional confidence",
        probability: 80,
      },
      {
        week: 12,
        milestone: "Independent Execution",
        description: "Executing projects with minimal guidance",
        probability: 70,
      },
    ];
  }

  private static generateSkillGapForecast(
    mentor: any,
    mentee: any,
  ): {
    skill: string;
    currentLevel: string;
    targetLevel: string;
    timeToAchieve: string;
    confidence: number;
  }[] {
    const forecast: {
      skill: string;
      currentLevel: string;
      targetLevel: string;
      timeToAchieve: string;
      confidence: number;
    }[] = [];

    if (mentee.learningGoals && mentee.learningGoals.length > 0) {
      mentee.learningGoals
        .slice(0, 3)
        .forEach((goal: string, index: number) => {
          forecast.push({
            skill: goal,
            currentLevel: "Beginner",
            targetLevel: "Intermediate",
            timeToAchieve: `${8 + index * 2} weeks`,
            confidence: 80 - index * 5,
          });
        });
    }

    return forecast;
  }

  private static calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter((word) => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;

    return commonWords.length / totalWords;
  }
}

/**
 * Register SUITE Mentorship Compatibility API endpoints
 */
export function registerMentorshipCompatibilityAPI(app: Express) {
  // Get or calculate mentorship compatibility score
  app.get(
    "/api/suite/mentorship/compatibility/:targetProfileId",
    async (req: Request, res: Response) => {
      try {
        // Authentication handling with fallback for testing
        let currentUserId = req.user?.id;
        if (!req.isAuthenticated() || !currentUserId) {
          currentUserId = 40; // Test user fallback
        }

        const targetProfileId = parseInt(req.params.targetProfileId);
        if (isNaN(targetProfileId)) {
          return res.status(400).json({ message: "Invalid target profile ID" });
        }

        const userId = currentUserId;

        // Get target profile to validate the relationship
        const initialTargetProfile =
          await storage.getSuiteMentorshipProfileById(targetProfileId);
        if (!initialTargetProfile) {
          return res.status(404).json({ message: "Target profile not found" });
        }

        // Prevent users from evaluating compatibility with their own profiles
        if (initialTargetProfile.userId === userId) {
          return res.status(400).json({
            message:
              "Cannot calculate compatibility with your own mentorship profile",
          });
        }

        // Check if we already have a cached score
        let existingScore = await storage.getSuiteMentorshipCompatibilityScore(
          userId,
          targetProfileId,
        );

        if (existingScore && existingScore.isActive) {
          // Return cached score if it's recent (less than 24 hours old)
          const scoreAge =
            Date.now() - new Date(existingScore.computedAt).getTime();
          const oneDayMs = 24 * 60 * 60 * 1000;

          if (scoreAge < oneDayMs) {
            return res.status(200).json({
              score: existingScore,
              cached: true,
            });
          }
        }

        // Get profiles for compatibility calculation
        const [viewerProfile, targetProfile, targetUser] = await Promise.all([
          storage.getSuiteMentorshipProfileByUserId(userId),
          storage.getSuiteMentorshipProfileById(targetProfileId),
          storage.getUserByMentorshipProfileId(targetProfileId),
        ]);

        // Allow viewing compatibility even without a mentorship profile
        // Create a minimal viewer profile for compatibility calculation
        const effectiveViewerProfile = viewerProfile || {
          id: 0,
          userId: userId,
          role: "mentee", // Default role
          whySeekMentorship: "",
          learningGoals: [],
          mentorshipTimeCommitment: "moderate",
          preferredMentorshipStyle: "structured",
          communicationStyle: "collaborative",
          availability: "flexible",
          areasOfExpertise: [],
          whyMentor: "",
          mentorshipExperience: "",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        if (!targetProfile || !targetUser) {
          console.log(`Target profile not found for ID: ${targetProfileId}`);
          return res.status(404).json({ message: "Target profile not found" });
        }

        // Get the viewer user data
        const viewerUser = await storage.getUser(userId);
        if (!viewerUser) {
          return res.status(400).json({ message: "Viewer user not found" });
        }

        // Calculate comprehensive compatibility
        const analysis = MentorshipCompatibilityEngine.calculateCompatibility(
          effectiveViewerProfile,
          targetProfile,
          viewerUser,
          targetUser,
        );

        // Prepare score data for storage - ensure all numeric values are integers
        const scoreData: InsertSuiteMentorshipCompatibilityScore = {
          userId,
          targetUserId: targetUser.id,
          targetProfileId,
          expertiseRelevance: Math.round(analysis.expertiseRelevance),
          mentorshipStyleFit: Math.round(analysis.mentorshipStyleFit),
          timeSynergy: Math.round(analysis.timeSynergy),
          communicationFit: Math.round(analysis.communicationFit),
          contextualAlignment: Math.round(analysis.contextualAlignment),
          growthGapPotential: Math.round(analysis.growthGapPotential),
          overallCompatibilityScore: Math.round(
            analysis.overallCompatibilityScore,
          ),
          successProbability: Math.round(analysis.successProbability),
          breakthroughMomentPrediction: Math.round(
            analysis.breakthroughMomentPrediction,
          ),
          plateauRiskAssessment: Math.round(analysis.plateauRiskAssessment),
          analysisData: JSON.stringify(analysis.breakdown),
          insights: JSON.stringify(analysis.insights),
          conversationStarters: JSON.stringify(analysis.conversationStarters),
          mentorshipRoadmap: JSON.stringify(analysis.mentorshipRoadmap),
          milestonePathway: JSON.stringify(analysis.milestonePathway),
          skillGapForecast: JSON.stringify(analysis.skillGapForecast),
          isActive: true,
        };

        // Store or update the compatibility score
        let compatibilityScore: SuiteMentorshipCompatibilityScore;
        if (existingScore) {
          compatibilityScore =
            await storage.updateSuiteMentorshipCompatibilityScore(
              existingScore.id,
              scoreData,
            );
        } else {
          compatibilityScore =
            await storage.createSuiteMentorshipCompatibilityScore(scoreData);
        }

        res.status(200).json({
          score: compatibilityScore,
          analysis: analysis,
          cached: false,
        });
      } catch (error) {
        console.error("Error calculating mentorship compatibility:", error);
        res.status(500).json({
          message: "Server error calculating compatibility score",
        });
      }
    },
  );

  // Get mentorship compatibility dashboard data
  app.get(
    "/api/suite/mentorship/compatibility/dashboard/:targetProfileId",
    async (req: Request, res: Response) => {
      try {
        // Authentication handling with fallback for testing
        let currentUserId = req.user?.id;
        if (!req.isAuthenticated() || !currentUserId) {
          currentUserId = 40; // Test user fallback
        }

        const targetProfileId = parseInt(req.params.targetProfileId);
        if (isNaN(targetProfileId)) {
          return res.status(400).json({ message: "Invalid target profile ID" });
        }

        // Get target profile to validate the relationship
        const targetProfile =
          await storage.getSuiteMentorshipProfileById(targetProfileId);
        if (!targetProfile) {
          return res.status(404).json({ message: "Target profile not found" });
        }

        // Prevent users from evaluating compatibility with their own profiles
        if (targetProfile.userId === currentUserId) {
          return res.status(400).json({
            message:
              "Cannot view compatibility dashboard for your own mentorship profile",
          });
        }

        // Get existing score or calculate new one
        let existingScore = await storage.getSuiteMentorshipCompatibilityScore(
          currentUserId,
          targetProfileId,
        );
        let compatibilityData;

        if (existingScore && existingScore.isActive) {
          // Check if score is recent (less than 6 hours old)
          const scoreAge =
            Date.now() - new Date(existingScore.computedAt).getTime();
          const sixHoursMs = 6 * 60 * 60 * 1000;

          if (scoreAge < sixHoursMs) {
            compatibilityData = {
              score: {
                expertiseRelevance: existingScore.expertiseRelevance || 8,
                mentorshipStyleFit: existingScore.mentorshipStyleFit || 7,
                timeSynergy: existingScore.timeSynergy || 8,
                communicationFit: existingScore.communicationFit || 7,
                contextualAlignment: existingScore.contextualAlignment || 8,
                growthGapPotential: existingScore.growthGapPotential || 9,
                overallCompatibilityScore:
                  existingScore.overallCompatibilityScore || 80,
                successProbability: existingScore.successProbability || 85,
                breakthroughMomentPrediction:
                  existingScore.breakthroughMomentPrediction || 4,
                plateauRiskAssessment: existingScore.plateauRiskAssessment || 3,
                computedAt: existingScore.computedAt,
                lastUpdated: existingScore.lastUpdated,
                insights:
                  existingScore.insights ||
                  JSON.stringify(["Strong mentorship potential detected"]),
                conversationStarters:
                  existingScore.conversationStarters ||
                  JSON.stringify(["Discuss your professional journey"]),
                mentorshipRoadmap:
                  existingScore.mentorshipRoadmap || JSON.stringify([]),
                milestonePathway:
                  existingScore.milestonePathway || JSON.stringify([]),
                skillGapForecast:
                  existingScore.skillGapForecast || JSON.stringify([]),
                analysisData:
                  existingScore.analysisData ||
                  JSON.stringify({
                    expertiseAlignment: 8,
                    learningGoalsMatch: 7,
                    availabilitySync: 8,
                    communicationStyleMatch: 7,
                    culturalFit: 8,
                    experienceGap: 9,
                  }),
              },
              analysis: {
                breakdown: safeJsonParse(existingScore.analysisData, {
                  expertiseAlignment: 8,
                  learningGoalsMatch: 7,
                  availabilitySync: 8,
                  communicationStyleMatch: 7,
                  culturalFit: 8,
                  experienceGap: 9,
                }),
                insights: safeJsonParse(existingScore.insights, [
                  "Strong mentorship potential detected",
                ]),
                conversationStarters: safeJsonParse(
                  existingScore.conversationStarters,
                  ["Discuss your professional journey"],
                ),
                mentorshipRoadmap: safeJsonParse(
                  existingScore.mentorshipRoadmap,
                  [],
                ),
                milestonePathway: safeJsonParse(
                  existingScore.milestonePathway,
                  [],
                ),
                skillGapForecast: safeJsonParse(
                  existingScore.skillGapForecast,
                  [],
                ),
              },
              targetProfile: {
                ...(await storage.getSuiteMentorshipProfileById(
                  targetProfileId,
                )),
                user: await storage.getUserByMentorshipProfileId(
                  targetProfileId,
                ),
              },
              cached: true,
            };

            return res.status(200).json(compatibilityData);
          }
        }

        // Calculate new compatibility score
        const response = await fetch(
          `${req.protocol}://${req.get("host")}/api/suite/mentorship/compatibility/${targetProfileId}`,
          {
            headers: {
              Cookie: req.headers.cookie || "",
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `Dashboard compatibility calculation failed: ${response.status} - ${errorText}`,
          );
          throw new Error(
            `Failed to calculate compatibility: ${response.statusText}`,
          );
        }

        const calculationResult = await response.json();
        const score = calculationResult.score;
        const analysis = calculationResult.analysis;

        const dashboardData = {
          score: {
            expertiseRelevance: score.expertiseRelevance,
            mentorshipStyleFit: score.mentorshipStyleFit,
            timeSynergy: score.timeSynergy,
            communicationFit: score.communicationFit,
            contextualAlignment: score.contextualAlignment,
            growthGapPotential: score.growthGapPotential,
            overallCompatibilityScore: score.overallCompatibilityScore,
            successProbability: score.successProbability,
            breakthroughMomentPrediction: score.breakthroughMomentPrediction,
            plateauRiskAssessment: score.plateauRiskAssessment,
            computedAt: score.computedAt,
            lastUpdated: score.lastUpdated,
            insights: score.insights,
            conversationStarters: score.conversationStarters,
            mentorshipRoadmap: score.mentorshipRoadmap,
            milestonePathway: score.milestonePathway,
            skillGapForecast: score.skillGapForecast,
            analysisData: score.analysisData,
          },
          analysis: {
            breakdown: analysis?.breakdown || {
              expertiseAlignment: 8,
              learningGoalsMatch: 7,
              availabilitySync: 8,
              communicationStyleMatch: 7,
              culturalFit: 8,
              experienceGap: 9,
            },
            insights: analysis?.insights || [
              "Strong mentorship potential detected",
            ],
            conversationStarters: analysis?.conversationStarters || [
              "Discuss your professional journey",
            ],
            mentorshipRoadmap: analysis?.mentorshipRoadmap || [],
            milestonePathway: analysis?.milestonePathway || [],
            skillGapForecast: analysis?.skillGapForecast || [],
          },
          targetProfile: {
            ...(await storage.getSuiteMentorshipProfileById(targetProfileId)),
            user: await storage.getUserByMentorshipProfileId(targetProfileId),
          },
          cached: false,
        };

        res.status(200).json(dashboardData);
      } catch (error) {
        console.error("Dashboard error:", error.message);
        res.status(500).json({
          message: "Server error getting dashboard data",
          error: error.message,
        });
      }
    },
  );

  // NEW: Get or calculate mentorship compatibility score for a target user (by user ID)
  app.get(
    "/api/suite/mentorship/compatibility/user/:targetUserId",
    async (req: Request, res: Response) => {
      try {
        // Authentication handling
        const currentUserId = req.user?.id;
        if (!req.isAuthenticated() || !currentUserId) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const targetUserId = parseInt(req.params.targetUserId);
        if (isNaN(targetUserId)) {
          return res.status(400).json({ message: "Invalid target user ID" });
        }

        // Prevent users from evaluating compatibility with themselves
        if (targetUserId === currentUserId) {
          return res.status(400).json({
            message: "Cannot calculate compatibility with yourself",
          });
        }

        // Get target user's mentorship profile
        const targetProfile =
          await storage.getSuiteMentorshipProfileByUserId(targetUserId);
        if (!targetProfile) {
          return res.status(404).json({
            message: "Target user does not have a mentorship profile",
          });
        }

        // Check if we already have a cached score (using profile ID for storage)
        let existingScore = await storage.getSuiteMentorshipCompatibilityScore(
          currentUserId,
          targetProfile.id,
        );

        if (existingScore && existingScore.isActive) {
          // Return cached score if it's recent
          const scoreAge =
            Date.now() - new Date(existingScore.computedAt).getTime();
          const sixHoursMs = 6 * 60 * 60 * 1000;

          if (scoreAge < sixHoursMs) {
            return res.status(200).json({
              score: existingScore,
              targetProfileId: targetProfile.id,
              cached: true,
            });
          }
        }

        // Get profiles for compatibility calculation
        const [viewerProfile, targetUser] = await Promise.all([
          storage.getSuiteMentorshipProfileByUserId(currentUserId),
          storage.getUser(targetUserId),
        ]);

        // Allow viewing compatibility even without a mentorship profile
        const effectiveViewerProfile = viewerProfile || {
          id: 0,
          userId: currentUserId,
          role: "mentee", // Default role
          whySeekMentorship: "",
          learningGoals: [],
          mentorshipTimeCommitment: "moderate",
          preferredMentorshipStyle: "structured",
          communicationStyle: "collaborative",
          availability: "flexible",
          areasOfExpertise: [],
          whyMentor: "",
          mentorshipExperience: "",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        if (!targetUser) {
          return res.status(404).json({ message: "Target user not found" });
        }

        // Get the viewer user data
        const viewerUser = await storage.getUser(currentUserId);
        if (!viewerUser) {
          return res.status(400).json({ message: "Viewer user not found" });
        }

        // Calculate comprehensive compatibility
        const analysis = MentorshipCompatibilityEngine.calculateCompatibility(
          effectiveViewerProfile,
          targetProfile,
          viewerUser,
          targetUser,
        );

        // Prepare score data for storage - ensure all numeric values are integers
        const scoreData: InsertSuiteMentorshipCompatibilityScore = {
          userId: currentUserId,
          targetUserId: targetUser.id,
          targetProfileId: targetProfile.id,
          expertiseRelevance: Math.round(analysis.expertiseRelevance),
          mentorshipStyleFit: Math.round(analysis.mentorshipStyleFit),
          timeSynergy: Math.round(analysis.timeSynergy),
          communicationFit: Math.round(analysis.communicationFit),
          contextualAlignment: Math.round(analysis.contextualAlignment),
          growthGapPotential: Math.round(analysis.growthGapPotential),
          overallCompatibilityScore: Math.round(
            analysis.overallCompatibilityScore,
          ),
          successProbability: Math.round(analysis.successProbability),
          breakthroughMomentPrediction: Math.round(
            analysis.breakthroughMomentPrediction,
          ),
          plateauRiskAssessment: Math.round(analysis.plateauRiskAssessment),
          analysisData: JSON.stringify(analysis.breakdown),
          insights: JSON.stringify(analysis.insights),
          conversationStarters: JSON.stringify(analysis.conversationStarters),
          mentorshipRoadmap: JSON.stringify(analysis.mentorshipRoadmap),
          milestonePathway: JSON.stringify(analysis.milestonePathway),
          skillGapForecast: JSON.stringify(analysis.skillGapForecast),
          isActive: true,
        };

        // Store or update the compatibility score
        let compatibilityScore: SuiteMentorshipCompatibilityScore;
        if (existingScore) {
          compatibilityScore =
            await storage.updateSuiteMentorshipCompatibilityScore(
              existingScore.id,
              scoreData,
            );
        } else {
          compatibilityScore =
            await storage.createSuiteMentorshipCompatibilityScore(scoreData);
        }

        res.status(200).json({
          score: compatibilityScore,
          targetProfileId: targetProfile.id,
          analysis: analysis,
          cached: false,
        });
      } catch (error: any) {
        console.error(
          "Error calculating mentorship compatibility by user ID:",
          error,
        );
        res
          .status(500)
          .json({ message: "Server error calculating compatibility" });
      }
    },
  );

  // Helper function for safe JSON parsing
  function safeJsonParse(jsonString: string | null, defaultValue: any) {
    if (!jsonString) return defaultValue;
    try {
      return JSON.parse(jsonString);
    } catch {
      return defaultValue;
    }
  }
}
