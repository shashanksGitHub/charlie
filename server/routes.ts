import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import { hashPassword, comparePasswords } from "./auth"; // Import authentication functions
import { registerMatchAPI, setWebSocketConnections } from "./match-api"; // Import match API endpoints
import {
  registerSuiteConnectionAPI,
  setSuiteWebSocketConnections,
} from "./suite-connection-api"; // Import SUITE connection API
import { registerCompatibilityAPI } from "./compatibility-api"; // Import compatibility analysis API
import { registerSuiteCompatibilityAPI } from "./suite-compatibility-api";
import { registerMentorshipCompatibilityAPI } from "./mentorship-compatibility-api"; // Import SUITE compatibility API
import { registerKwameAPI, setKwameWebSocketConnections } from "./kwame-api"; // Import KWAME AI API
import { confirmPayment } from "./payment-confirm"; // Import payment confirmation
// Avatar API has been removed
import {
  insertMatchSchema,
  insertMessageSchema,
  userPreferencesSchema,
  userProfileSchema,
  insertVideoCallSchema,
  insertTypingStatusSchema,
  insertVerificationCodeSchema,
  insertUserPhotoSchema,
  insertGlobalInterestSchema,
  insertGlobalDealBreakerSchema,
  insertGlobalTribeSchema,
  insertGlobalReligionSchema,
  InsertTypingStatus,
  InsertVerificationCode,
  InsertUserPhoto,
  InsertGlobalInterest,
  InsertGlobalDealBreaker,
  InsertGlobalTribe,
  InsertGlobalReligion,
  UserProfile,
  GlobalInterest,
  GlobalDealBreaker,
  GlobalTribe,
  GlobalReligion,
  InsertMessage,
  insertUserReportStrikeSchema,
  InsertUserReportStrike,
  insertUserBlockSchema,
  userBlocks,
  passwordResetCodes,
  insertSubscriptionSchema,
  insertPaymentMethodSchema,
  insertPaymentHistorySchema,
  subscriptions,
  paymentMethods,
  paymentHistory,
  regionalPricing,
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { randomBytes } from "crypto";
import { db } from "./db";
import Stripe from "stripe";
import { invalidateMessageCaches } from "./cache-invalidation";

// Initialize Stripe (prioritize live keys for production, fallback to test keys)
let stripe: Stripe | null = null;
const stripeSecretKey =
  process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const isLiveMode = !!process.env.STRIPE_LIVE_SECRET_KEY;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20",
  } as any);
  console.log(
    `[STRIPE-ENVIRONMENT-FIX] Backend initialized successfully in ${isLiveMode ? "LIVE" : "TEST"} mode`,
  );
  console.log(
    `[STRIPE-ENVIRONMENT-FIX] Using ${isLiveMode ? "live" : "test"} secret key for payment processing`,
  );
} else {
  console.warn(
    "[STRIPE] No Stripe keys found - payment features will be disabled",
  );
}
import {
  sendEmail,
  sendContactFormEmail,
  sendContactFormConfirmationEmail,
} from "./services/sendgrid";
import {
  sendSecurityChangeNotification,
  handleSecurityDispute,
  getDisputeInfo,
} from "./services/security-notifications";
import highSchoolSearchRoutes from "./routes/highschool-search";
import { searchUniversities } from "./routes/university-search";
import {
  matches as matchesTable,
  messages as messagesTable,
  typingStatus,
  users,
  videoCalls,
} from "@shared/schema";
import { eq, and, or, desc, asc, sql, gte, like } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Contact form API - Must be placed before setupAuth to avoid authentication conflicts
  app.post("/api/contact/send", async (req, res) => {
    try {
      const { name, email, phoneNumber, message } = req.body;

      // Validate required fields
      if (!name || !email || !message) {
        return res.status(400).json({
          success: false,
          message: "All fields (name, email, message) are required",
        });
      }

      // Send both admin notification and user confirmation emails
      const contactData = {
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber || "Not provided",
        message: message.trim(),
      };

      const [adminEmailSent, confirmationEmailSent] = await Promise.all([
        sendContactFormEmail(contactData),
        sendContactFormConfirmationEmail(contactData),
      ]);

      if (adminEmailSent && confirmationEmailSent) {
        console.log(
          `[CONTACT-FORM] Both admin and confirmation emails sent successfully from ${email}`,
        );
        res.json({
          success: true,
          message:
            "Message sent successfully! You'll receive a confirmation email shortly, and we'll get back to you soon.",
        });
      } else if (adminEmailSent && !confirmationEmailSent) {
        console.log(
          `[CONTACT-FORM] Admin email sent but confirmation email failed from ${email}`,
        );
        res.json({
          success: true,
          message: "Message sent successfully! We'll get back to you soon.",
        });
      } else if (!adminEmailSent && confirmationEmailSent) {
        console.error(
          `[CONTACT-FORM] Admin email failed but confirmation sent from ${email}`,
        );
        res.status(500).json({
          success: false,
          message:
            "There was an issue processing your message. Please try again later.",
        });
      } else {
        console.error(`[CONTACT-FORM] Both emails failed from ${email}`);
        res.status(500).json({
          success: false,
          message: "Failed to send message. Please try again later.",
        });
      }
    } catch (error) {
      console.error("Contact form error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send message. Please try again later.",
      });
    }
  });

  // Field mapping helper function to convert snake_case DB fields to camelCase frontend fields
  function convertDbFieldsToFrontend(dbData: any): any {
    const fieldMapping: { [key: string]: string } = {
      // Mentorship fields
      mentorship_looking_for: "mentorshipLookingFor",
      mentorship_experience_level: "mentorshipExperienceLevel",
      mentorship_industries: "mentorshipIndustries",
      mentorship_areas_of_expertise: "mentorshipAreasOfExpertise",
      mentorship_education_level: "mentorshipEducationLevel",
      mentorship_skills: "mentorshipSkills",
      mentorship_topics: "mentorshipTopics",
      mentorship_format: "mentorshipFormat",
      mentorship_time_commitment: "mentorshipTimeCommitment",
      mentorship_location_preference: "mentorshipLocationPreference",
      mentorship_weights: "mentorshipWeights",

      // Networking fields
      networking_purpose: "networkingPurpose",
      networking_company_size: "networkingCompanySize",
      networking_seniority: "networkingSeniority",
      networking_industries: "networkingIndustries",
      networking_areas_of_expertise: "networkingAreasOfExpertise",
      networking_education_level: "networkingEducationLevel",
      networking_skills: "networkingSkills",
      networking_functional_areas: "networkingFunctionalAreas",
      networking_geographic: "networkingGeographic",
      networking_event_preference: "networkingEventPreference",
      networking_weights: "networkingWeights",

      // Jobs fields
      jobs_types: "jobsTypes",
      jobs_salary_range: "jobsSalaryRange",
      jobs_work_arrangement: "jobsWorkArrangement",
      jobs_company_size: "jobsCompanySize",
      jobs_industries: "jobsIndustries",
      jobs_education_level: "jobsEducationLevel",
      jobs_skills: "jobsSkills",
      jobs_experience_level: "jobsExperienceLevel",
      jobs_functional_areas: "jobsFunctionalAreas",
      jobs_work_location: "jobsWorkLocation",
      jobs_weights: "jobsWeights",

      // Global fields
      deal_breakers: "dealBreakers",
      preference_profiles: "preferenceProfiles",
    };

    const mappedData: any = {};

    Object.entries(dbData).forEach(([key, value]) => {
      const frontendField = fieldMapping[key] || key;
      mappedData[frontendField] = value;
    });

    return mappedData;
  }

  // Set up authentication routes (/api/login, /api/register, /api/logout, /api/user)
  setupAuth(app);

  // Register User Blocking API AFTER setupAuth to ensure passport.js middleware is available
  const { registerUserBlockingAPI } = await import("./user-blocking-api");
  registerUserBlockingAPI(app);

  // Register match-related API endpoints
  registerMatchAPI(app);

  // Register compatibility analysis API endpoints
  registerCompatibilityAPI(app);

  // Register SUITE compatibility APIs
  registerSuiteCompatibilityAPI(app);
  registerMentorshipCompatibilityAPI(app);

  // Register KWAME AI API
  registerKwameAPI(app);

  // Register Jobs compatibility API
  const { registerJobsCompatibilityAPI } = await import(
    "./jobs-compatibility-api"
  );
  registerJobsCompatibilityAPI(app);

  // Register Enhanced Discovery API with Matching Engine
  const { registerEnhancedDiscoveryAPI } = await import(
    "./enhanced-discovery-api"
  );
  registerEnhancedDiscoveryAPI(app);

  // Register Data Collection API for Reciprocity & Engagement Scoring
  const dataCollectionRoutes = await import("./routes/data-collection-routes");
  app.use("/api/tracking", dataCollectionRoutes.default);

  // Avatar API has been removed

  // Optimized undo swipe action endpoint with bulletproof authentication and restoration
  app.post("/api/swipe/undo", async (req: Request, res: Response) => {
    try {
      // Enhanced authentication with detailed error reporting
      if (!req.isAuthenticated() || !req.user || !req.user.id) {
        console.log("[UNDO-AUTH-ERROR] Authentication failed:", {
          isAuthenticated: req.isAuthenticated(),
          hasUser: !!req.user,
          userId: req.user?.id,
        });
        return res.status(401).json({
          message: "Unauthorized",
          details: "Valid authentication session required",
        });
      }

      const { userId, action } = req.body;
      const currentUser = req.user;

      if (!userId || !action) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Start timing for performance monitoring
      const startTime = Date.now();

      if (action === "like" || action === "dislike") {
        // Remove from both likes/dislikes and swipe history
        await Promise.all([
          storage.removeLikeOrDislike(currentUser.id, userId),
          storage.removeSwipeFromHistory(currentUser.id, userId),
        ]);

        // BULLETPROOF CARD RESTORATION: Triple-redundancy restoration system
        const sourceUserWs = connectedUsers.get(currentUser.id);
        let restorationResults = {
          primaryWebSocket: false,
          fallbackRefresh: false,
          connectionStatus: "disconnected",
        };

        // Check WebSocket connection status
        if (sourceUserWs) {
          restorationResults.connectionStatus =
            sourceUserWs.readyState === WebSocket.OPEN ? "open" : "closed";
        }

        // PRIMARY: Attempt specific restoration message
        if (sourceUserWs && sourceUserWs.readyState === WebSocket.OPEN) {
          try {
            const restorationMessage = {
              type: "meet_restore_to_discover",
              userId: parseInt(userId),
              reason: "undo_action",
              timestamp: new Date().toISOString(),
              sourceUserId: currentUser.id,
            };

            sourceUserWs.send(JSON.stringify(restorationMessage));
            restorationResults.primaryWebSocket = true;
            console.log(
              `[RESTORATION-PRIMARY] ✅ Sent meet_restore_to_discover for user ${userId}`,
            );
          } catch (error) {
            console.log(`[RESTORATION-PRIMARY] ❌ Failed:`, error.message);
          }
        }

        // FALLBACK: Send generic refresh signal
        if (sourceUserWs && sourceUserWs.readyState === WebSocket.OPEN) {
          try {
            const refreshMessage = {
              type: "discover:refresh",
              reason: "undo_action",
              userId: parseInt(userId),
              timestamp: new Date().toISOString(),
              sourceUserId: currentUser.id,
            };

            sourceUserWs.send(JSON.stringify(refreshMessage));
            restorationResults.fallbackRefresh = true;
            console.log(
              `[RESTORATION-FALLBACK] ✅ Sent discover:refresh for user ${userId}`,
            );
          } catch (error) {
            console.log(`[RESTORATION-FALLBACK] ❌ Failed:`, error.message);
          }
        }

        // GUARANTEED: Force immediate cache invalidation via response data
        const restoredUserData = await storage.getUser(parseInt(userId));

        console.log(
          `[RESTORATION-COMPLETE] User ${userId} restored with results:`,
          {
            primary: restorationResults.primaryWebSocket ? "✅" : "❌",
            fallback: restorationResults.fallbackRefresh ? "✅" : "❌",
            connection: restorationResults.connectionStatus,
            hasUserData: !!restoredUserData,
          },
        );

        console.log(
          `User ${currentUser.id} undid ${action} for user ${userId} in ${Date.now() - startTime}ms`,
        );

        // Return enhanced response with restored user data for guaranteed client updates
        return res.status(200).json({
          message: "Action undone successfully",
          performance: `${Date.now() - startTime}ms`,
          restoration: restorationResults,
          restoredUser: restoredUserData,
          userId: parseInt(userId),
          action: action,
        });
      } else if (action === "message") {
        // Batch database operations for message undo
        const [match] = await Promise.all([
          storage.getMatchBetweenUsers(currentUser.id, userId),
          storage.removeLikeOrDislike(currentUser.id, userId),
        ]);

        // Handle match cleanup only if match exists
        if (match) {
          const messageCount = await storage.getMessageCountForMatch(match.id);

          if (messageCount === 0) {
            // No messages yet, safe to delete the match
            await storage.deleteMatch(match.id);
            console.log(
              `User ${currentUser.id} undid message for user ${userId} and deleted match ${match.id} in ${Date.now() - startTime}ms`,
            );
          } else {
            // Messages exist, just mark it as no longer matched
            await storage.updateMatchStatus(match.id, false);
            console.log(
              `User ${currentUser.id} undid message for user ${userId} and updated match ${match.id} to unmatched in ${Date.now() - startTime}ms`,
            );
          }
        } else {
          console.log(
            `User ${currentUser.id} undid message for user ${userId} (no match found) in ${Date.now() - startTime}ms`,
          );
        }
      } else {
        return res.status(400).json({ message: "Invalid action" });
      }

      // This return is only reached for message actions
      return res.status(200).json({
        message: "Action undone successfully",
        performance: `${Date.now() - startTime}ms`,
        action: action,
      });
    } catch (error) {
      console.error("Error undoing swipe action:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // SUITE mentorship undo endpoint for multi-undo functionality
  app.post(
    "/api/suite/mentorship/undo",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const currentUserId = req.user.id;
        const startTime = Date.now();

        // Get the most recent swipe from history for SUITE mentorship
        const swipeHistory = await storage.getUserSwipeHistory(
          currentUserId,
          "SUITE_MENTORSHIP",
          1,
        );

        if (!swipeHistory || swipeHistory.length === 0) {
          return res.status(404).json({ message: "No recent swipes to undo" });
        }

        const lastSwipe = swipeHistory[0];
        const targetUserId = lastSwipe.targetUserId;

        // Get the target user's mentorship profile to get the profile ID
        const targetMentorshipProfile =
          await storage.getSuiteMentorshipProfile(targetUserId);
        if (!targetMentorshipProfile) {
          return res
            .status(404)
            .json({ message: "Target mentorship profile not found" });
        }

        // Remove the mentorship connection if it exists
        const existingConnection = await storage.getSuiteMentorshipConnection(
          currentUserId,
          targetMentorshipProfile.id,
        );

        if (existingConnection) {
          // If there's a match, handle it appropriately
          if (existingConnection.matched) {
            // For matched connections, we need to handle both sides
            // Get the current user's mentorship profile to find the mutual connection
            const currentUserMentorshipProfile =
              await storage.getSuiteMentorshipProfile(currentUserId);
            if (!currentUserMentorshipProfile) {
              console.log(
                `[SUITE-MENTORSHIP-UNDO] Current user ${currentUserId} has no mentorship profile`,
              );
              return res
                .status(404)
                .json({ message: "Current user mentorship profile not found" });
            }

            const mutualConnection = await storage.getSuiteMentorshipConnection(
              targetUserId,
              currentUserMentorshipProfile.id,
            );

            if (mutualConnection) {
              // Remove both connections for matched pairs
              await storage.deleteSuiteMentorshipConnectionById(
                existingConnection.id,
              );
              await storage.deleteSuiteMentorshipConnectionById(
                mutualConnection.id,
              );
              console.log(
                `[SUITE-MENTORSHIP-UNDO] Removed matched connection between ${currentUserId} and ${targetUserId}`,
              );
            }
          } else {
            // Just remove the single connection
            await storage.deleteSuiteMentorshipConnectionById(
              existingConnection.id,
            );
            console.log(
              `[SUITE-MENTORSHIP-UNDO] Removed connection ${existingConnection.id} for user ${currentUserId}`,
            );
          }
        }

        // Remove the swipe from history
        await storage.removeSwipeHistory(lastSwipe.id);

        // Send real-time WebSocket updates to restore the card
        const sourceUserWs = connectedUsers.get(currentUserId);
        if (sourceUserWs && sourceUserWs.readyState === WebSocket.OPEN) {
          sourceUserWs.send(
            JSON.stringify({
              type: "suite_restore_to_discover",
              suiteType: "mentorship",
              profileId: targetMentorshipProfile.id,
              userId: targetUserId,
              reason: "undo_action",
              timestamp: new Date().toISOString(),
            }),
          );

          console.log(
            `[REAL-TIME] Restored mentorship profile ${targetMentorshipProfile.id} to user ${currentUserId}'s discover deck`,
          );
        }

        console.log(
          `🔄 [SUITE-MENTORSHIP-UNDO] User ${currentUserId} undid ${lastSwipe.action} on user ${targetUserId} in ${Date.now() - startTime}ms`,
        );

        // Get the complete target mentorship profile with user data for optimistic updates
        const completeProfile =
          await storage.getSuiteMentorshipProfile(targetUserId);

        return res.status(200).json({
          message: "Mentorship action undone successfully",
          undoneAction: lastSwipe.action,
          targetUserId: targetUserId,
          profileId: targetMentorshipProfile.id,
          profile: completeProfile, // Include full profile data for instant frontend restoration
          performance: `${Date.now() - startTime}ms`,
        });
      } catch (error) {
        console.error("Error undoing mentorship swipe action:", error);
        return res.status(500).json({ message: "Server error" });
      }
    },
  );

  // Undo networking swipe action endpoint
  app.post(
    "/api/suite/networking/undo",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const currentUserId = req.user.id;
        const startTime = Date.now();

        // Get the most recent swipe from history for SUITE networking
        const swipeHistory = await storage.getUserSwipeHistory(
          currentUserId,
          "SUITE_NETWORKING",
          1,
        );

        if (!swipeHistory || swipeHistory.length === 0) {
          return res.status(404).json({ message: "No recent swipes to undo" });
        }

        const lastSwipe = swipeHistory[0];
        const targetUserId = lastSwipe.targetUserId;

        // Get the target user's networking profile to get the profile ID
        const targetNetworkingProfile =
          await storage.getSuiteNetworkingProfile(targetUserId);
        if (!targetNetworkingProfile) {
          return res
            .status(404)
            .json({ message: "Target networking profile not found" });
        }

        // Remove the networking connection if it exists
        const existingConnection = await storage.getSuiteNetworkingConnection(
          currentUserId,
          targetNetworkingProfile.id,
        );

        if (existingConnection) {
          // If there's a match, handle it appropriately
          if (existingConnection.matched) {
            // For matched connections, we need to handle both sides
            // Get the current user's networking profile to find the mutual connection
            const currentUserNetworkingProfile =
              await storage.getSuiteNetworkingProfile(currentUserId);
            if (!currentUserNetworkingProfile) {
              console.log(
                `[SUITE-NETWORKING-UNDO] Current user ${currentUserId} has no networking profile`,
              );
              return res
                .status(404)
                .json({ message: "Current user networking profile not found" });
            }

            const mutualConnection = await storage.getSuiteNetworkingConnection(
              targetUserId,
              currentUserNetworkingProfile.id,
            );

            if (mutualConnection) {
              // Remove both connections for matched pairs
              await storage.deleteSuiteNetworkingConnectionById(
                existingConnection.id,
              );
              await storage.deleteSuiteNetworkingConnectionById(
                mutualConnection.id,
              );
              console.log(
                `[SUITE-NETWORKING-UNDO] Removed mutual networking connections: ${existingConnection.id} and ${mutualConnection.id}`,
              );
            }
          } else {
            // Remove single connection for unmatched likes/dislikes
            await storage.deleteSuiteNetworkingConnectionById(
              existingConnection.id,
            );
            console.log(
              `[SUITE-NETWORKING-UNDO] Removed single networking connection: ${existingConnection.id}`,
            );
          }
        } else {
          console.log(
            `[SUITE-NETWORKING-UNDO] No networking connection found between user ${currentUserId} and profile ${targetNetworkingProfile.id}`,
          );
        }

        // Remove the swipe from history
        await storage.removeSwipeHistory(lastSwipe.id);

        // Send real-time WebSocket updates to restore the card
        const sourceUserWs = connectedUsers.get(currentUserId);
        if (sourceUserWs && sourceUserWs.readyState === WebSocket.OPEN) {
          sourceUserWs.send(
            JSON.stringify({
              type: "suite_restore_to_discover",
              suiteType: "networking",
              profileId: targetNetworkingProfile.id,
              userId: targetUserId,
              reason: "undo_action",
              timestamp: new Date().toISOString(),
            }),
          );

          console.log(
            `[REAL-TIME] Restored networking profile ${targetNetworkingProfile.id} to user ${currentUserId}'s discover deck`,
          );
        }

        console.log(
          `🔄 [SUITE-NETWORKING-UNDO] User ${currentUserId} undid ${lastSwipe.action} on user ${targetUserId} in ${Date.now() - startTime}ms`,
        );

        // Get the complete target networking profile with user data for optimistic updates
        const completeProfile =
          await storage.getSuiteNetworkingProfile(targetUserId);

        return res.status(200).json({
          message: "Networking action undone successfully",
          undoneAction: lastSwipe.action,
          targetUserId: targetUserId,
          profileId: targetNetworkingProfile.id,
          profile: completeProfile, // Include full profile data for instant frontend restoration
          performance: `${Date.now() - startTime}ms`,
        });
      } catch (error) {
        console.error("Error undoing networking swipe action:", error);
        return res.status(500).json({ message: "Server error" });
      }
    },
  );

  // SUITE job undo endpoint for multi-undo functionality
  app.post("/api/suite/jobs/undo", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const currentUserId = req.user.id;
      const startTime = Date.now();

      // Get the most recent swipe from history for SUITE jobs
      const swipeHistory = await storage.getUserSwipeHistory(
        currentUserId,
        "SUITE_JOBS",
        1,
      );

      if (!swipeHistory || swipeHistory.length === 0) {
        return res
          .status(404)
          .json({ message: "No recent job swipes to undo" });
      }

      const lastSwipe = swipeHistory[0];
      const targetUserId = lastSwipe.targetUserId;

      // Get the target user's job profile to get the profile ID
      const targetJobProfile = await storage.getSuiteJobProfile(targetUserId);
      if (!targetJobProfile) {
        return res
          .status(404)
          .json({ message: "Target job profile not found" });
      }

      // Remove the job application if it exists
      const existingApplication = await storage.getSuiteJobApplication(
        currentUserId,
        targetJobProfile.id,
      );

      if (existingApplication) {
        // If there's a match, handle it appropriately
        if (existingApplication.matched) {
          // For matched applications, we need to handle both sides
          // Get the reciprocal application from the job poster
          const reciprocalApplication =
            await storage.getSuiteJobApplicationByUsers(
              targetUserId, // job poster
              currentUserId, // current user (applicant)
            );

          if (reciprocalApplication) {
            // Remove both applications for matched pairs
            await storage.deleteSuiteJobApplicationById(existingApplication.id);
            await storage.deleteSuiteJobApplicationById(
              reciprocalApplication.id,
            );
            console.log(
              `[SUITE-JOBS-UNDO] Removed mutual job applications: ${existingApplication.id} and ${reciprocalApplication.id}`,
            );
          }
        } else {
          // Remove single application for unmatched likes/dislikes
          await storage.deleteSuiteJobApplicationById(existingApplication.id);
          console.log(
            `[SUITE-JOBS-UNDO] Removed single job application: ${existingApplication.id}`,
          );
        }
      } else {
        console.log(
          `[SUITE-JOBS-UNDO] No job application found between user ${currentUserId} and profile ${targetJobProfile.id}`,
        );
      }

      // Remove the swipe from history
      await storage.removeSwipeHistory(lastSwipe.id);

      // Send real-time WebSocket updates to restore the card
      const sourceUserWs = connectedUsers.get(currentUserId);
      if (sourceUserWs && sourceUserWs.readyState === WebSocket.OPEN) {
        sourceUserWs.send(
          JSON.stringify({
            type: "suite_restore_to_discover",
            suiteType: "jobs",
            profileId: targetJobProfile.id,
            userId: targetUserId,
            reason: "undo_action",
            timestamp: new Date().toISOString(),
          }),
        );

        console.log(
          `[REAL-TIME] Restored job profile ${targetJobProfile.id} to user ${currentUserId}'s discover deck`,
        );
      }

      console.log(
        `[SUITE-JOBS-UNDO] User ${currentUserId} undid job swipe for profile ${targetJobProfile.id} in ${Date.now() - startTime}ms`,
      );

      return res.status(200).json({
        message: "Job swipe undone successfully",
        performance: `${Date.now() - startTime}ms`,
      });
    } catch (error) {
      console.error("Error undoing job swipe action:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Create chat endpoint for direct messaging
  app.post("/api/messages/create-chat", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { targetUserId } = req.body;
      if (!targetUserId) {
        return res.status(400).json({ message: "Target user ID is required" });
      }

      const currentUserId = req.user.id;

      // Prevent users from creating chats with themselves
      if (currentUserId === targetUserId) {
        console.log(
          `User ${currentUserId} attempted to create chat with themselves`,
        );
        return res
          .status(400)
          .json({ message: "Users cannot create chats with themselves" });
      }

      console.log(
        "[CHAT-PERFORMANCE] Starting optimized chat creation process",
      );
      const startTime = Date.now();

      // Parallel database operations for better performance
      const [userMatches, currentUser, targetUser] = await Promise.all([
        storage.getMatchesByUserId(currentUserId),
        storage.getUser(currentUserId),
        storage.getUser(targetUserId),
      ]);

      console.log(
        `[CHAT-PERFORMANCE] Parallel DB fetch completed in ${Date.now() - startTime}ms`,
      );

      const existingMatch = userMatches.find(
        (match) =>
          (match.userId1 === currentUserId && match.userId2 === targetUserId) ||
          (match.userId1 === targetUserId && match.userId2 === currentUserId),
      );

      let matchId;
      let match;

      if (!targetUser) {
        return res.status(404).json({ message: "Target user not found" });
      }

      if (existingMatch) {
        // 🔗 BIDIRECTIONAL DETECTION: Check if this is a SUITE match that needs MEET as additional connection
        console.log(
          `🔍 [MEET-DIRECT-MESSAGE] Found existing match ${existingMatch.id} between users ${currentUserId} and ${targetUserId}`,
        );
        console.log(
          `🔍 [MEET-DIRECT-MESSAGE] Existing match metadata: ${existingMatch.metadata}`,
        );

        if (existingMatch.metadata) {
          try {
            const existingMetadata =
              typeof existingMatch.metadata === "string"
                ? JSON.parse(existingMatch.metadata)
                : existingMatch.metadata;

            // Check if this is a SUITE match that needs MEET as additional connection
            if (existingMetadata && existingMetadata.origin === "SUITE") {
              console.log(
                `🔗 [MEET-DIRECT-MESSAGE] Found existing SUITE match, checking for MEET in additionalConnections`,
              );

              // Initialize additionalConnections if it doesn't exist
              if (!existingMetadata.additionalConnections) {
                existingMetadata.additionalConnections = [];
                console.log(
                  `🔗 [MEET-DIRECT-MESSAGE] Initialized additionalConnections array`,
                );
              }

              // Add MEET if not already present
              if (!existingMetadata.additionalConnections.includes("MEET")) {
                existingMetadata.additionalConnections.push("MEET");
                console.log(
                  `🔗 [MEET-DIRECT-MESSAGE] Adding MEET to additionalConnections for existing SUITE match ${existingMatch.id}`,
                );
                console.log(
                  `🔗 [MEET-DIRECT-MESSAGE] New additionalConnections: ${JSON.stringify(existingMetadata.additionalConnections)}`,
                );

                // Update the existing match with MEET as additional connection
                const updatedMatch = await storage.updateMatch(
                  existingMatch.id,
                  {
                    metadata: JSON.stringify(existingMetadata),
                  },
                );

                console.log(
                  `🔗 [MEET-DIRECT-MESSAGE] Successfully added MEET to additionalConnections for existing SUITE match ${existingMatch.id}`,
                );
                console.log(
                  `🔗 [MEET-DIRECT-MESSAGE] Final updated metadata: ${updatedMatch?.metadata}`,
                );

                // Use the updated match
                match = updatedMatch || existingMatch;
              } else {
                console.log(
                  `🔗 [MEET-DIRECT-MESSAGE] MEET already exists in additionalConnections`,
                );
                match = existingMatch;
              }
            } else {
              console.log(
                `🔗 [MEET-DIRECT-MESSAGE] Existing match is not a SUITE match, using as-is`,
              );
              match = existingMatch;
            }
          } catch (error) {
            console.error(
              `🔗 [MEET-DIRECT-MESSAGE] Error parsing/updating existing match metadata:`,
              error,
            );
            match = existingMatch;
          }
        } else {
          console.log(
            `🔗 [MEET-DIRECT-MESSAGE] Existing match has no metadata, using as-is`,
          );
          match = existingMatch;
        }

        // Use the existing (possibly updated) match
        matchId = existingMatch.id;

        // For direct messages, don't update existing matches to matched=true
        // This prevents triggering match notifications for direct message actions
        console.log(
          `Using existing match ${existingMatch.id} for direct message without changing match status`,
        );

        // Notify via WebSocket if recipient is connected (direct message, not match)
        const recipientWs = connectedUsers.get(targetUserId);
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
          // Send chat tab creation event without match notification
          recipientWs.send(
            JSON.stringify({
              type: "chat_created",
              matchId: existingMatch.id,
              userId: currentUserId,
              isDirectMessage: true, // Flag to prevent match dialog
              fromUserInfo: {
                id: currentUserId,
                fullName: currentUser?.fullName || "Unknown User",
                photoUrl: currentUser?.photoUrl,
              },
            }),
          );
        }
      } else {
        // 🔗 BIDIRECTIONAL DETECTION: Check if a SUITE match already exists before creating new MEET match
        console.log(
          `🔍 [MEET-DIRECT-MESSAGE] Checking for existing SUITE matches between users ${currentUserId} and ${targetUserId}`,
        );
        const existingMatches = await storage.getAllMatchesBetweenUsers(
          currentUserId,
          targetUserId,
        );
        console.log(
          `🔍 [MEET-DIRECT-MESSAGE] Found ${existingMatches.length} existing matches between users`,
        );

        if (existingMatches.length > 0) {
          existingMatches.forEach((match, index) => {
            console.log(
              `🔍 [MEET-DIRECT-MESSAGE] Match ${index + 1}: ID=${match.id}, metadata=${match.metadata}`,
            );
          });
        }

        // Check if any existing match is from SUITE
        const existingSuiteMatch = existingMatches.find((match) => {
          if (match.metadata) {
            try {
              const metadata =
                typeof match.metadata === "string"
                  ? JSON.parse(match.metadata)
                  : match.metadata;
              return metadata && metadata.origin === "SUITE";
            } catch (e) {
              console.error(
                `🔍 [MEET-DIRECT-MESSAGE] Failed to parse metadata for match ${match.id}:`,
                e,
              );
              return false;
            }
          }
          return false;
        });

        if (existingSuiteMatch) {
          console.log(
            `🔗 [MEET-DIRECT-MESSAGE] Found existing SUITE match ${existingSuiteMatch.id}, adding MEET as additional connection`,
          );

          try {
            const existingMetadata =
              typeof existingSuiteMatch.metadata === "string"
                ? JSON.parse(existingSuiteMatch.metadata)
                : existingSuiteMatch.metadata;

            console.log(
              `🔗 [MEET-DIRECT-MESSAGE] Current metadata: ${JSON.stringify(existingMetadata)}`,
            );

            // Add MEET as additional connection to existing SUITE match
            if (!existingMetadata.additionalConnections) {
              existingMetadata.additionalConnections = [];
              console.log(
                `🔗 [MEET-DIRECT-MESSAGE] Initialized additionalConnections array`,
              );
            }

            if (!existingMetadata.additionalConnections.includes("MEET")) {
              existingMetadata.additionalConnections.push("MEET");
              console.log(
                `🔗 [MEET-DIRECT-MESSAGE] Adding MEET to additionalConnections for SUITE match ${existingSuiteMatch.id}`,
              );
              console.log(
                `🔗 [MEET-DIRECT-MESSAGE] New additionalConnections: ${JSON.stringify(existingMetadata.additionalConnections)}`,
              );

              // Update the existing SUITE match with MEET as additional connection
              const updatedMatch = await storage.updateMatch(
                existingSuiteMatch.id,
                {
                  metadata: JSON.stringify(existingMetadata),
                },
              );

              console.log(
                `🔗 [MEET-DIRECT-MESSAGE] Successfully added MEET to additionalConnections for existing SUITE match ${existingSuiteMatch.id}`,
              );
              console.log(
                `🔗 [MEET-DIRECT-MESSAGE] Final updated metadata: ${updatedMatch?.metadata}`,
              );

              // Use the updated existing match for the chat
              matchId = existingSuiteMatch.id;
              match = updatedMatch || existingSuiteMatch;
            } else {
              console.log(
                `🔗 [MEET-DIRECT-MESSAGE] MEET already exists in additionalConnections, using existing match`,
              );
              matchId = existingSuiteMatch.id;
              match = existingSuiteMatch;
            }
          } catch (error) {
            console.error(
              `🔗 [MEET-DIRECT-MESSAGE] Error updating existing SUITE match:`,
              error,
            );
            // Fall through to create new MEET match if update fails
            const newMatch = await storage.createMatch({
              userId1: currentUserId,
              userId2: targetUserId,
              matched: true, // Direct messages should create matched connections
              metadata: JSON.stringify({ origin: "MEET" }),
            });
            matchId = newMatch.id;
            match = newMatch;
          }
        } else {
          // Create a new match with matched=true for direct messages
          // This creates a conversation channel and enables full chat functionality
          const newMatch = await storage.createMatch({
            userId1: currentUserId,
            userId2: targetUserId,
            matched: true, // CRITICAL FIX: Direct messages should create matched connections
            metadata: JSON.stringify({ origin: "MEET" }),
          });

          matchId = newMatch.id;
          match = newMatch;
        }

        console.log(
          `Created direct message channel ${newMatch.id} without match notification`,
        );

        // Notify via WebSocket if recipient is connected (direct message, not match)
        const recipientWs = connectedUsers.get(targetUserId);
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
          // Send chat tab creation event without match notification
          recipientWs.send(
            JSON.stringify({
              type: "chat_created",
              matchId: newMatch.id,
              userId: currentUserId,
              isDirectMessage: true, // Flag to prevent match dialog
              fromUserInfo: {
                id: currentUserId,
                fullName: currentUser?.fullName || "Unknown User",
                photoUrl: currentUser?.photoUrl,
              },
            }),
          );
        }
      }

      // CRITICAL FIX: Align response structure with chat page expectations
      // The chat components expect match.user (not targetUser) to display header info
      const enrichedMatch = {
        ...match,
        // Primary user property for chat components (the other user in the match)
        user: {
          id: targetUser.id,
          fullName: targetUser.fullName,
          photoUrl: targetUser.photoUrl,
          bio: targetUser.bio,
          profession: targetUser.profession,
          location: targetUser.location,
        },
        // Keep targetUser for backward compatibility
        targetUser: {
          id: targetUser.id,
          fullName: targetUser.fullName,
          photoUrl: targetUser.photoUrl,
          bio: targetUser.bio,
          profession: targetUser.profession,
          location: targetUser.location,
        },
        currentUser: {
          id: currentUser?.id,
          fullName: currentUser?.fullName,
          photoUrl: currentUser?.photoUrl,
        },
        // Make it clear which user is which
        initiatorId: currentUserId,
        targetUserId: targetUserId,
      };

      const totalTime = Date.now() - startTime;
      console.log(
        `[CHAT-PERFORMANCE] Complete chat creation process finished in ${totalTime}ms`,
      );

      res.json({
        matchId,
        match: enrichedMatch,
        success: true,
        performance: `${totalTime}ms`, // Include performance metrics in response
      });
    } catch (error) {
      console.error("Error creating chat:", error);
      res.status(500).json({ message: "Server error creating chat" });
    }
  });

  // Check if email exists endpoint with enhanced logging for duplicate prevention
  app.post("/api/check-email", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Normalize email to lowercase for consistent checking
      const normalizedEmail = email.trim().toLowerCase();

      const user = await storage.getUserByEmail(normalizedEmail);
      const exists = !!user;

      // Log email check attempts for duplicate account prevention monitoring
      if (exists) {
        console.log(
          `[EMAIL-DUPLICATE-PREVENTION] Email ${normalizedEmail} already exists in system - preventing duplicate account creation`,
        );
      }

      return res.status(200).json({ exists });
    } catch (error) {
      console.error("Error checking email:", error);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // Admin API - Get all users
  app.get("/api/admin/users", async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      // Remove sensitive data like passwords before sending
      const safeUsers = users.map((user) => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      res.status(200).json(safeUsers);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  // Admin API - Clean all users (for development purposes)
  app.delete("/api/admin/clean-users", async (req: Request, res: Response) => {
    try {
      await storage.cleanAllUsers();
      res.status(200).json({ message: "All users have been deleted" });
    } catch (error) {
      console.error("Error cleaning users:", error);
      res.status(500).json({ message: "Error cleaning users" });
    }
  });

  // User profile routes
  app.get("/api/profile/:id", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Don't send password in response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Server error retrieving profile" });
    }
  });

  app.patch("/api/profile/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId) || req.user?.id !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this profile" });
    }

    try {
      // Log the incoming request body
      console.log("Raw profile update request:", req.body);

      // If this is a visibility preferences-only update, validate JSON
      if (
        Object.keys(req.body).length === 1 &&
        "visibilityPreferences" in req.body
      ) {
        console.log("Processing visibility preferences-only update");
        try {
          // Validate the JSON format
          const visPrefs = JSON.parse(req.body.visibilityPreferences);
          console.log("Parsed visibility preferences:", visPrefs);
        } catch (jsonError) {
          console.error("Invalid JSON in visibilityPreferences:", jsonError);
          return res.status(400).json({
            message: "visibilityPreferences must be a valid JSON string",
          });
        }
      }

      // Modify the dateOfBirth field before validation if it's an ISO string
      if (req.body.dateOfBirth && typeof req.body.dateOfBirth === "string") {
        // If it's already an ISO string, convert it to a Date object for Zod validation
        req.body.dateOfBirth = new Date(req.body.dateOfBirth);
      }

      // Allow updating lastUsedApp for app mode tracking
      // Only validate the fields that are being updated
      // This allows partial updates without requiring all fields

      // Special handling for profileHidden and ghostMode fields due to schema validation issues
      let profileData: any = {};

      if (req.body.profileHidden !== undefined) {
        // Manually validate profileHidden as boolean
        if (typeof req.body.profileHidden === "boolean") {
          profileData.profileHidden = req.body.profileHidden;
        } else {
          return res
            .status(400)
            .json({ message: "profileHidden must be a boolean" });
        }
      }

      if (req.body.ghostMode !== undefined) {
        // Manually validate ghostMode as boolean
        if (typeof req.body.ghostMode === "boolean") {
          profileData.ghostMode = req.body.ghostMode;
        } else {
          return res
            .status(400)
            .json({ message: "ghostMode must be a boolean" });
        }
      }

      if (req.body.hideAge !== undefined) {
        // Manually validate hideAge as boolean
        if (typeof req.body.hideAge === "boolean") {
          profileData.hideAge = req.body.hideAge;
        } else {
          return res.status(400).json({ message: "hideAge must be a boolean" });
        }
      }

      if (req.body.preferredLanguage !== undefined) {
        // Manually validate preferredLanguage as string
        if (typeof req.body.preferredLanguage === "string") {
          profileData.preferredLanguage = req.body.preferredLanguage;
        } else {
          return res
            .status(400)
            .json({ message: "preferredLanguage must be a string" });
        }
      }

      // For other fields, use the normal schema validation
      const otherFields = { ...req.body };
      delete otherFields.profileHidden;
      delete otherFields.ghostMode;
      delete otherFields.hideAge;
      delete otherFields.preferredLanguage;

      console.log(
        "[PROFILE-UPDATE-DEBUG] Other fields to validate:",
        otherFields,
      );

      if (Object.keys(otherFields).length > 0) {
        const partialProfileSchema = userProfileSchema.partial();
        try {
          const validatedOtherFields = partialProfileSchema.parse(otherFields);
          console.log(
            "[PROFILE-UPDATE-DEBUG] Validated fields:",
            validatedOtherFields,
          );
          profileData = { ...profileData, ...validatedOtherFields };
        } catch (error) {
          console.log("[PROFILE-UPDATE-DEBUG] Validation error:", error);
          return res.status(400).json({
            message: "Validation failed",
            error: (error as Error).message,
          });
        }
      }

      // Check if we have data to update
      if (Object.keys(profileData).length === 0) {
        return res.status(400).json({ message: "No data provided for update" });
      }

      // Check for email validations
      if ("email" in profileData) {
        if (profileData.email === "") {
          return res.status(400).json({ message: "Email cannot be empty" });
        }

        if (profileData.email && typeof profileData.email === "string") {
          if (!profileData.email.includes("@")) {
            return res.status(400).json({ message: "Invalid email format" });
          }
        }
      }

      // Phone number validation
      if ("phoneNumber" in profileData) {
        const phoneNumber = profileData.phoneNumber;

        console.log("Validating phone number:", phoneNumber);

        if (phoneNumber === "") {
          return res
            .status(400)
            .json({ message: "Phone number cannot be empty" });
        }

        // Check if this phone number is already registered to another user
        const existingUser = phoneNumber
          ? await storage.getUserByPhoneNumber(phoneNumber)
          : undefined;
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({
            message: "Phone number already registered to another user",
          });
        }

        if (typeof phoneNumber === "string") {
          // Should start with a plus and country code
          if (!phoneNumber.startsWith("+")) {
            return res.status(400).json({
              message: "Phone number must start with country code (e.g., +233)",
            });
          }

          // Remove the + and check if the rest is numeric
          const numericPart = phoneNumber.substring(1);
          if (!/^\d+$/.test(numericPart)) {
            return res.status(400).json({
              message:
                "Phone number must contain only digits after the country code",
            });
          }

          // Check minimum length (at least 7 digits after country code)
          if (numericPart.length < 7) {
            return res.status(400).json({
              message:
                "Phone number must have at least 7 digits after country code",
            });
          }

          // Check maximum length (country code + number shouldn't be excessively long)
          if (phoneNumber.length > 18) {
            return res.status(400).json({
              message:
                "Phone number is too long. Maximum length is 18 characters including the country code",
            });
          }

          // Check if country code looks valid (should be 1-4 digits)
          const countryCodeMatch = phoneNumber.match(/^\+(\d{1,4})/);
          if (
            !countryCodeMatch ||
            countryCodeMatch[1].length < 1 ||
            countryCodeMatch[1].length > 4
          ) {
            return res.status(400).json({
              message:
                "Invalid country code format. Country code should be 1-4 digits after the + sign",
            });
          }
        }
      }

      try {
        // Get original user data for security notifications
        const originalUser = await storage.getUser(userId);
        if (!originalUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Log what we're sending to the storage layer
        const isVisibilityUpdate =
          Object.keys(profileData).length === 1 &&
          "visibilityPreferences" in profileData;
        if (isVisibilityUpdate) {
          console.log("Updating visibility preferences only for user", userId);
        } else {
          console.log("Updating profile fields for user", userId, profileData);
        }

        const updatedUser = await storage.updateUserProfile(
          userId,
          profileData,
        );
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Don't send password in response
        const { password, ...userWithoutPassword } = updatedUser;
        console.log("Profile updated successfully:", userWithoutPassword);

        // Send security notifications for sensitive changes asynchronously (non-blocking)
        const userAgent = req.get("User-Agent") || "Unknown";
        const ipAddress = req.ip || req.connection.remoteAddress || "Unknown";

        // Check for password changes
        if ("password" in profileData) {
          console.log(
            `[SECURITY-NOTIFICATION] Sending password change notification for user ${userId}`,
          );
          sendSecurityChangeNotification({
            userId,
            email: updatedUser.email,
            fullName: updatedUser.fullName,
            phoneNumber: updatedUser.phoneNumber,
            changeType: "password",
            userAgent,
            ipAddress,
          }).catch((error) => {
            console.error(
              "[SECURITY-NOTIFICATION] Error sending password change notification:",
              error,
            );
          });
        }

        // Check for email changes
        if (
          "email" in profileData &&
          originalUser.email !== profileData.email
        ) {
          console.log(
            `[SECURITY-NOTIFICATION] Sending email change notification to PREVIOUS email for user ${userId}`,
          );
          sendSecurityChangeNotification({
            userId,
            email: originalUser.email, // Send to OLD email (critical security requirement)
            fullName: updatedUser.fullName,
            phoneNumber: updatedUser.phoneNumber,
            changeType: "email",
            oldValue: originalUser.email,
            newValue: profileData.email as string,
            userAgent,
            ipAddress,
          }).catch((error) => {
            console.error(
              "[SECURITY-NOTIFICATION] Error sending email change notification:",
              error,
            );
          });
        }

        // Check for phone number changes
        if (
          "phoneNumber" in profileData &&
          originalUser.phoneNumber !== profileData.phoneNumber
        ) {
          console.log(
            `[SECURITY-NOTIFICATION] Sending phone number change notification for user ${userId}`,
          );
          sendSecurityChangeNotification({
            userId,
            email: updatedUser.email,
            fullName: updatedUser.fullName,
            phoneNumber: originalUser.phoneNumber, // Use original phone number for context
            changeType: "phone",
            oldValue: originalUser.phoneNumber || "Not set",
            newValue: (profileData.phoneNumber as string) || "Removed",
            userAgent,
            ipAddress,
          }).catch((error) => {
            console.error(
              "[SECURITY-NOTIFICATION] Error sending phone number change notification:",
              error,
            );
          });
        }

        // Store profile visibility change for WebSocket notification (handled later)
        if ("profileHidden" in profileData) {
          console.log(
            `User ${userId} changed profile visibility to hidden: ${profileData.profileHidden}`,
          );
          // Send WebSocket notification to other users
          if (profileVisibilityBroadcaster) {
            profileVisibilityBroadcaster(userId, profileData.profileHidden);
          }
        }

        // Handle Ghost Mode changes
        if ("ghostMode" in profileData) {
          console.log(
            `User ${userId} changed Ghost Mode to: ${profileData.ghostMode}`,
          );
          // Update the user's online status immediately to reflect Ghost Mode
          await storage.updateUserOnlineStatus(userId, !profileData.ghostMode);

          // Send WebSocket notification to other users
          if (ghostModeBroadcaster) {
            ghostModeBroadcaster(userId, profileData.ghostMode);
            console.log(
              `Ghost Mode change broadcasted via WebSocket for user ${userId}: ghostMode=${profileData.ghostMode}`,
            );
          }
        }

        return res.json(userWithoutPassword);
      } catch (storageError: unknown) {
        console.error("Storage error during profile update:", storageError);

        // Enhanced error logging
        if (storageError instanceof Error) {
          console.error("Storage error details:", storageError.message);
          console.error("Storage error stack:", storageError.stack);

          // Handle special cases
          if (storageError.message.includes("No valid values to set")) {
            return res
              .status(400)
              .json({ message: "No valid values to update" });
          }

          // Database-specific errors
          if (storageError.message.includes("Database error")) {
            return res.status(500).json({
              message: "Database error updating profile",
              details: storageError.message,
            });
          }
        }

        throw storageError; // Re-throw to be caught by outer catch
      }
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Profile update error:", error);
      return res.status(500).json({
        message: "Server error updating profile",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // User preferences routes
  app.get("/api/preferences/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = parseInt(req.params.userId);
    if (isNaN(userId) || req.user?.id !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to view these preferences" });
    }

    try {
      // Try to get existing preferences for the user
      let preferences = await storage.getUserPreferences(userId);

      // If preferences don't exist, create default empty preferences
      if (!preferences) {
        try {
          console.log(`Creating default preferences for user ${userId}`);

          // Create default preferences object with null values for user choice fields
          const defaultPrefs = {
            userId,
            // Set age, height, and distance preferences to NULL so new users see "Not Specified"
            minAge: null,
            maxAge: null,
            distancePreference: null,
            minHeightPreference: null,
            maxHeightPreference: null,
            religionPreference: JSON.stringify([]),
            ethnicityPreference: JSON.stringify([]),
            educationLevelPreference: JSON.stringify([]),
            highSchoolPreference: JSON.stringify([]),
            hasChildrenPreference: null,
            wantsChildrenPreference: null,
            bodyTypePreference: JSON.stringify([]),
            dealBreakers: JSON.stringify([]),
            interestPreferences: JSON.stringify([]),
            matchingPriorities: JSON.stringify([]),
            relationshipGoalPreference: null, // Changed from "long-term" to null
          };

          // Save default preferences to database
          preferences = await storage.createUserPreferences(defaultPrefs);
          console.log(
            `Created default preferences for user ${userId}:`,
            preferences,
          );
        } catch (createError) {
          console.error(
            `Error creating default preferences for user ${userId}:`,
            createError,
          );
          // Continue with 404 response as we couldn't create defaults
          return res.status(404).json({
            message: "Preferences not found and could not create defaults",
          });
        }
      }

      // Return preferences (either existing or newly created defaults)
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching/creating preferences:", error);
      res.status(500).json({ message: "Server error retrieving preferences" });
    }
  });

  app.post("/api/preferences", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const preferencesData = userPreferencesSchema.parse(req.body);
      const userId = req.user.id;

      // Check if preferences already exist
      const existingPreferences = await storage.getUserPreferences(userId);
      if (existingPreferences) {
        return res
          .status(400)
          .json({ message: "Preferences already exist, use PATCH to update" });
      }

      const newPreferences = await storage.createUserPreferences({
        ...preferencesData,
        userId,
      });

      res.status(201).json(newPreferences);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error creating preferences" });
    }
  });

  app.patch("/api/preferences/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let preferenceId = parseInt(req.params.id);
    if (isNaN(preferenceId)) {
      return res.status(400).json({ message: "Invalid preference ID" });
    }

    try {
      // Get the preference to verify ownership
      let preference = await storage.getUserPreferences(req.user.id);

      // If preferences don't exist for this user, create default ones
      if (!preference) {
        try {
          console.log(
            `Creating default preferences for user ${req.user.id} during PATCH operation`,
          );

          // Create default preferences object with null values for user choice fields
          const defaultPrefs = {
            userId: req.user.id,
            // Set age, height, and distance preferences to NULL so new users see "Not Specified"
            minAge: null,
            maxAge: null,
            distancePreference: null,
            minHeightPreference: null,
            maxHeightPreference: null,
            religionPreference: JSON.stringify([]),
            ethnicityPreference: JSON.stringify([]),
            educationLevelPreference: JSON.stringify([]),
            highSchoolPreference: JSON.stringify([]),
            hasChildrenPreference: null,
            wantsChildrenPreference: null,
            bodyTypePreference: JSON.stringify([]),
            dealBreakers: JSON.stringify([]),
            interestPreferences: JSON.stringify([]),
            matchingPriorities: JSON.stringify([]),
            relationshipGoalPreference: null, // Changed from "long-term" to null
          };

          // Save default preferences to database
          preference = await storage.createUserPreferences(defaultPrefs);
          console.log(
            `Created default preferences during PATCH for user ${req.user.id}:`,
            preference,
          );

          // Make sure we use the correct ID for update
          preferenceId = preference.id;
        } catch (createError) {
          console.error(
            `Error creating default preferences for user ${req.user.id}:`,
            createError,
          );
          return res
            .status(500)
            .json({ message: "Failed to create preferences before update" });
        }
      } else if (preference.id !== preferenceId) {
        // If the preference exists but the ID doesn't match the path parameter
        return res
          .status(403)
          .json({ message: "Not authorized to update these preferences" });
      }

      const preferencesData = userPreferencesSchema.partial().parse(req.body);
      const updatedPreferences = await storage.updateUserPreferences(
        preferenceId,
        preferencesData,
      );

      if (!updatedPreferences) {
        return res.status(404).json({ message: "Preferences not found" });
      }

      res.json(updatedPreferences);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error updating preferences" });
    }
  });

  // Update user nationality (for native homeland selection)
  app.put(
    "/api/user/nationality",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { nationality } = req.body;

        if (!nationality || typeof nationality !== "string") {
          return res
            .status(400)
            .json({ message: "Nationality is required and must be a string" });
        }

        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        // Update the user's nationality in their profile
        const updatedUser = await storage.updateUserProfile(userId, {
          countryOfOrigin: nationality,
        });

        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Also save the nationality to user preferences location_preference column
        try {
          await storage.updateUserLocationPreference(userId, nationality);
          console.log(
            `[NATIONALITY] Updated user ${userId} location preference to: ${nationality}`,
          );
        } catch (prefError) {
          console.warn(
            `[NATIONALITY] Failed to update location preference for user ${userId}:`,
            prefError,
          );
          // Don't fail the entire request if preference update fails
        }

        console.log(
          `[NATIONALITY] Updated user ${userId} nationality to: ${nationality}`,
        );
        res.status(200).json({
          message: "Nationality updated successfully",
          nationality: updatedUser.countryOfOrigin,
        });
      } catch (error) {
        console.error("Error updating user nationality:", error);
        res.status(500).json({ message: "Error updating nationality" });
      }
    },
  );

  // Update user pool country (app-specific: MEET vs SUITE)
  app.put(
    "/api/user/pool-country",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { poolCountry, appMode } = req.body;

        if (!poolCountry || typeof poolCountry !== "string") {
          return res
            .status(400)
            .json({ message: "Pool country is required and must be a string" });
        }

        if (!appMode || !["MEET", "SUITE"].includes(appMode)) {
          return res.status(400).json({
            message: "App mode is required and must be 'MEET' or 'SUITE'",
          });
        }

        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        // Update the user's app-specific pool country preference
        const updatedPreference =
          await storage.updateUserAppSpecificPoolCountry(
            userId,
            poolCountry,
            appMode,
          );

        if (!updatedPreference) {
          return res
            .status(404)
            .json({ message: "Failed to update pool country preference" });
        }

        const fieldName =
          appMode === "MEET" ? "meetPoolCountry" : "suitePoolCountry";
        const updatedValue =
          appMode === "MEET"
            ? updatedPreference.meetPoolCountry
            : updatedPreference.suitePoolCountry;

        console.log(
          `[POOL-COUNTRY] Updated user ${userId} ${appMode} pool country to: ${poolCountry}`,
        );
        res.status(200).json({
          message: "Pool country updated successfully",
          appMode,
          poolCountry: updatedValue,
          [fieldName]: updatedValue,
        });
      } catch (error) {
        console.error("Error updating user pool country:", error);
        res.status(500).json({ message: "Error updating pool country" });
      }
    },
  );

  // Get user pool country preferences (both MEET and SUITE)
  app.get(
    "/api/user/pool-country",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const preferences = await storage.getUserPreferences(userId);

        if (!preferences) {
          return res
            .status(404)
            .json({ message: "User preferences not found" });
        }

        console.log(
          `[POOL-COUNTRY] Retrieved pool countries for user ${userId}`,
        );
        res.status(200).json({
          meetPoolCountry: preferences.meetPoolCountry || "ANYWHERE",
          suitePoolCountry: preferences.suitePoolCountry || "ANYWHERE",
          // Legacy field for backward compatibility
          poolCountry: preferences.poolCountry || "ANYWHERE",
        });
      } catch (error) {
        console.error("Error getting user pool country:", error);
        res.status(500).json({ message: "Error getting pool country" });
      }
    },
  );

  // Discover page - Get all users except the logged-in user (optimized)
  app.get("/api/discover-users", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res
        .status(401)
        .json({ message: "Unauthorized", status: "login_required" });
    }

    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Get users with interests already included in single optimized query
      const discoverUsers = await storage.getDiscoverUsers(currentUserId);

      // Return users directly (interests already included)
      res.status(200).json(discoverUsers);
    } catch (error) {
      console.error("Error fetching discover users:", error);
      res
        .status(500)
        .json({ message: "Error fetching users for discover page" });
    }
  });

  // Match routes
  // Get users who have liked the current user but haven't been matched yet
  app.get("/api/liked-by/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = parseInt(req.params.userId);

      // Verify that the requesting user is the same as the userId in the route
      if (userId !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to view these likes" });
      }

      const matches = await storage.getMatchesByUserId(userId);

      // Filter to get only single-sided matches (where userId1 is the other user, userId2 is the current user, and matched is false)
      // These are users who have liked the current user but haven't been matched yet
      const likedByMatches = matches.filter(
        (match) => match.userId2 === userId && !match.matched,
      );

      // For each match, get the other user's profile
      const likedByUsers = await Promise.all(
        likedByMatches.map(async (match) => {
          const otherUserId = match.userId1; // This is always the user who liked the current user
          const otherUser = await storage.getUser(otherUserId);
          if (!otherUser) return null;

          // Don't send password in response
          const { password, ...userWithoutPassword } = otherUser;

          // GHOST MODE: If user has Ghost Mode enabled, always show as offline
          if (userWithoutPassword.ghostMode) {
            userWithoutPassword.isOnline = false;
          }

          // Calculate age if dateOfBirth is available
          let age = undefined;
          if (userWithoutPassword.dateOfBirth) {
            const birthDate = new Date(userWithoutPassword.dateOfBirth);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
          }

          return {
            id: match.id, // Using match id as a unique identifier
            matchId: match.id,
            userId: otherUserId,
            fullName: userWithoutPassword.fullName,
            photoUrl: userWithoutPassword.photoUrl,
            age: age,
            location: userWithoutPassword.location,
            bio: userWithoutPassword.bio,
            compatibility: Math.random() * 0.4 + 0.6, // Just for demo - this should be calculated properly
          };
        }),
      );

      // Remove null entries (where user wasn't found)
      const validLikedByUsers = likedByUsers.filter((user) => user !== null);

      res.json(validLikedByUsers);
    } catch (error) {
      console.error(
        "Error retrieving users who liked the current user:",
        error,
      );
      res
        .status(500)
        .json({ message: "Server error retrieving users who liked you" });
    }
  });

  // Get specific match by ID - optimized for chat page loading
  app.get("/api/match/:matchId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const matchId = parseInt(req.params.matchId);
    const userId = req.user.id;

    if (isNaN(matchId)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }

    try {
      // Get the specific match
      const match = await storage.getMatchById(matchId);

      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Verify user is authorized to access this match
      if (match.userId1 !== userId && match.userId2 !== userId) {
        return res
          .status(403)
          .json({ message: "Not authorized to access this match" });
      }

      // Get the other user's info
      const otherUserId =
        match.userId1 === userId ? match.userId2 : match.userId1;
      const otherUser = await storage.getUser(otherUserId);

      const enrichedMatch = {
        ...match,
        otherUser: otherUser
          ? {
              id: otherUser.id,
              fullName: otherUser.fullName,
              photoUrl: otherUser.photoUrl,
              bio: otherUser.bio,
              profession: otherUser.profession,
              location: otherUser.location,
            }
          : null,
      };

      res.json(enrichedMatch);
    } catch (error) {
      console.error("Error retrieving match:", error);
      res.status(500).json({ message: "Server error retrieving match" });
    }
  });

  // Get all matches between current user and specific other user (for multiple badges)
  app.get(
    "/api/matches/between/:userId",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const currentUserId = req.user.id;
        const otherUserId = parseInt(req.params.userId);

        if (isNaN(otherUserId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        console.log(
          `Fetching all matches between users ${currentUserId} and ${otherUserId}`,
        );

        // Get all matches between these two users (both directions)
        const allMatches = await storage.getAllMatchesBetweenUsers(
          currentUserId,
          otherUserId,
        );

        console.log(
          `Found ${allMatches.length} matches between users ${currentUserId} and ${otherUserId}`,
        );

        res.json(allMatches);
      } catch (error) {
        console.error("Error fetching matches between users:", error);
        res.status(500).json({ message: "Server error retrieving matches" });
      }
    },
  );

  app.get("/api/matches", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const startTime = Date.now();
    try {
      const userId = req.user.id;
      console.log(
        `[MATCH-PERFORMANCE] Starting optimized matches fetch for user ${userId}`,
      );

      // Get user matches using the original working method
      const optimizedMatches = await storage.getMatches(userId);

      if (optimizedMatches.length === 0) {
        console.log(`[MATCH-PERFORMANCE] No matches found for user ${userId}`);
        return res.json([]);
      }

      // CRITICAL FIX: Enrich all matches with user information FIRST
      const enrichedMatches = await Promise.all(
        optimizedMatches.map(async (match) => {
          const otherUserId =
            match.userId1 === userId ? match.userId2 : match.userId1;
          const otherUser = await storage.getUser(otherUserId);

          return {
            ...match,
            user: otherUser
              ? {
                  id: otherUser.id,
                  fullName: otherUser.fullName,
                  photoUrl: otherUser.photoUrl,
                  bio: otherUser.bio,
                  profession: otherUser.profession,
                  location: otherUser.location,
                }
              : null,
          };
        }),
      );

      // Separate confirmed matches and pending likes with optimized filtering
      const confirmedMatches = enrichedMatches.filter((match) => match.matched);

      // Get pending likes with same logic as before but pre-processed
      const pendingLikes = enrichedMatches
        .filter((match) => {
          // Only include pending likes (not dislikes or confirmed matches)
          if (match.matched || match.isDislike) return false;

          // SUITE CHAT FIX: For SUITE matches, show to both users regardless of userId position
          if (match.metadata) {
            try {
              const metadata =
                typeof match.metadata === "string"
                  ? JSON.parse(match.metadata)
                  : match.metadata;
              if (metadata && metadata.suiteType) {
                console.log(
                  `[SUITE-MATCH-DEBUG] Found SUITE match ${match.id} for user ${userId}, showing bidirectionally`,
                );
                return true; // Both users can see SUITE matches
              }
            } catch (e) {
              console.error(
                `[SUITE-MATCH-DEBUG] Failed to parse metadata for match ${match.id}:`,
                e,
              );
            }
          }

          // For regular MEET matches, keep existing dating app logic
          return match.userId1 !== userId && match.userId2 === userId;
        })
        // Sort by createdAt in descending order (newest first)
        .sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          }
          return b.id - a.id;
        });

      // Transform confirmed matches to add match type
      const confirmedMatchesWithType = confirmedMatches
        .filter((match) => match.user) // Filter out any null user entries
        .map((match) => ({
          ...match,
          matchType: "confirmed",
        }));

      // Transform pending matches to add match type
      const pendingLikesWithType = pendingLikes
        .filter((match) => match.user) // Filter out any null user entries
        .map((match) => ({
          ...match,
          matchType: "pending",
        }));

      // Combine both types of matches
      const allMatches = [...confirmedMatchesWithType, ...pendingLikesWithType];

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.log(
        `[MATCH-PERFORMANCE] ⚡ Optimized matches fetch completed in ${executionTime}ms for user ${userId}`,
      );
      console.log(
        `[MATCH-PERFORMANCE] ✅ Returning ${allMatches.length} matches (${confirmedMatchesWithType.length} confirmed, ${pendingLikesWithType.length} pending)`,
      );

      res.json(allMatches);
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      console.error(
        `[MATCH-PERFORMANCE] ❌ Error in optimized matches fetch after ${executionTime}ms:`,
        error,
      );
      res.status(500).json({ message: "Server error retrieving matches" });
    }
  });

  // Delete a match (reject a user who liked you)
  app.delete("/api/matches/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res
          .status(401)
          .json({ message: "Unauthorized", success: false });
      }

      const matchId = parseInt(req.params.id);
      if (isNaN(matchId)) {
        return res
          .status(400)
          .json({ message: "Invalid match ID", success: false });
      }

      // Verify that the match exists
      const match = await storage.getMatchById(matchId);
      if (!match) {
        return res
          .status(404)
          .json({ message: "Match not found", success: false });
      }

      // Verify that the current user is part of this match
      if (match.userId1 !== req.user.id && match.userId2 !== req.user.id) {
        return res.status(403).json({
          message: "Not authorized to delete this match",
          success: false,
        });
      }

      const currentUserId = req.user.id;
      const otherUserId =
        match.userId1 === currentUserId ? match.userId2 : match.userId1;

      console.log(
        `[SWIPE] User ${currentUserId} disliked user ${otherUserId} via Matches page`,
      );

      // CRITICAL FIX: Instead of just deleting, create bidirectional dislike records
      // This ensures both users never see each other in Discover pages again

      // First, delete the existing match
      await storage.deleteMatch(matchId);

      // Create dislike record from current user to other user
      try {
        await storage.createMatch({
          userId1: currentUserId,
          userId2: otherUserId,
          matched: false,
          isDislike: true,
          metadata: JSON.stringify({ origin: "MEET" }),
        });
        console.log(
          `[SWIPE] Created dislike record: ${currentUserId} -> ${otherUserId}`,
        );
      } catch (error) {
        // Handle duplicate constraint gracefully
        if (error instanceof Error && error.message.includes("duplicate")) {
          console.log(
            `[SWIPE] Dislike record ${currentUserId} -> ${otherUserId} already exists`,
          );
        } else {
          throw error;
        }
      }

      // Create reverse dislike record from other user to current user for bidirectional filtering
      try {
        await storage.createMatch({
          userId1: otherUserId,
          userId2: currentUserId,
          matched: false,
          isDislike: true,
          metadata: JSON.stringify({ origin: "MEET" }),
        });
        console.log(
          `[SWIPE] Created bidirectional dislike record: ${otherUserId} -> ${currentUserId}`,
        );
      } catch (error) {
        // Handle duplicate constraint gracefully
        if (error instanceof Error && error.message.includes("duplicate")) {
          console.log(
            `[SWIPE] Bidirectional dislike record ${otherUserId} -> ${currentUserId} already exists`,
          );
        } else {
          throw error;
        }
      }

      // Send WebSocket notifications to both users to update their Discover pages
      if (connectedUsers) {
        const otherUserSocket = connectedUsers.get(otherUserId);
        if (otherUserSocket && otherUserSocket.readyState === WebSocket.OPEN) {
          otherUserSocket.send(
            JSON.stringify({
              type: "swipe_action",
              action: "dislike",
              targetUserId: currentUserId,
              fromUserId: currentUserId,
            }),
          );
          console.log(
            `[SWIPE] Notified user ${otherUserId} about dislike action from user ${currentUserId}`,
          );
        }

        const currentUserSocket = connectedUsers.get(currentUserId);
        if (
          currentUserSocket &&
          currentUserSocket.readyState === WebSocket.OPEN
        ) {
          currentUserSocket.send(
            JSON.stringify({
              type: "discover:refresh",
              reason: "dislike_action",
              timestamp: new Date().toISOString(),
            }),
          );
        }
      }

      return res
        .status(200)
        .json({ message: "Match deleted successfully", success: true });
    } catch (error) {
      // Ensure all errors return JSON responses
      console.error("Error deleting match:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({
        message: "Server error deleting match",
        error: errorMessage,
        success: false,
      });
    }
  });

  // Unmatch endpoint that the client is currently using
  app.post("/api/matches/:id/unmatch", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res
          .status(401)
          .json({ message: "Unauthorized", success: false });
      }

      const matchId = parseInt(req.params.id);
      if (isNaN(matchId)) {
        return res
          .status(400)
          .json({ message: "Invalid match ID", success: false });
      }

      // Verify that the match exists
      const match = await storage.getMatchById(matchId);
      if (!match) {
        return res
          .status(404)
          .json({ message: "Match not found", success: false });
      }

      // Verify that the current user is part of this match
      if (match.userId1 !== req.user.id && match.userId2 !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to unmatch", success: false });
      }

      // Get the other user's ID to notify them via WebSocket
      const currentUserId = req.user.id;
      const otherUserId =
        match.userId1 === currentUserId ? match.userId2 : match.userId1;

      // Import the function from match-api to send the unmatch notification
      const { sendUnmatchNotification } = await import("./match-api");

      // COMPREHENSIVE ARCHIVING: Archive match and messages before deletion
      console.log(
        `[UNMATCH] Starting comprehensive archival for match ${matchId}`,
      );

      let archivedMatchId: number | null = null;
      let messageCount = 0;

      try {
        const { ArchivingService } = await import("./archiving-service");

        const archiveResult = await ArchivingService.archiveMatchWithMessages(
          matchId,
          currentUserId,
          "unmatch",
        );

        archivedMatchId = archiveResult.archivedMatchId;
        messageCount = archiveResult.messageCount;

        console.log(
          `[UNMATCH] Successfully archived match ${matchId} as archive ${archivedMatchId} with ${messageCount} messages`,
        );
      } catch (archiveError) {
        console.error(
          `[UNMATCH] Failed to archive match ${matchId}:`,
          archiveError,
        );
        // Continue with unmatch even if archiving fails
      }

      // Delete typing status records associated with this match (to handle foreign key constraint)
      await db().delete(typingStatus).where(eq(typingStatus.matchId, matchId));

      // Delete video call records associated with this match (to handle foreign key constraint)
      await db().delete(videoCalls).where(eq(videoCalls.matchId, matchId));

      // Delete messages associated with this match
      const messages = await storage.getMessagesByMatchId(matchId);
      if (messages && messages.length > 0) {
        // Delete each message (ideally this would be a batch operation)
        for (const message of messages) {
          await db
            .delete(messagesTable)
            .where(eq(messagesTable.id, message.id));
        }
      }

      // Delete the match
      await storage.deleteMatch(matchId);

      // CRITICAL FIX: Create bidirectional dislike records to prevent future discovery
      // This ensures both users are permanently excluded from each other's Discover page
      console.log(
        `[UNMATCH] Creating bidirectional dislike records for users ${currentUserId} and ${otherUserId}`,
      );

      try {
        // Create dislike record: current user "dislikes" other user
        await db().insert(matchesTable).values({
          userId1: currentUserId,
          userId2: otherUserId,
          matched: false,
          isDislike: true,
          createdAt: new Date(),
        });

        // Create dislike record: other user "dislikes" current user
        await db().insert(matchesTable).values({
          userId1: otherUserId,
          userId2: currentUserId,
          matched: false,
          isDislike: true,
          createdAt: new Date(),
        });

        console.log(
          `[UNMATCH] ✅ Bidirectional dislike records created successfully - users ${currentUserId} and ${otherUserId} will never appear in each other's discovery again`,
        );
      } catch (dislikeError) {
        console.error(
          `[UNMATCH] ❌ Failed to create dislike records:`,
          dislikeError,
        );
        // Continue with unmatch even if dislike creation fails
      }

      // Send a real-time notification to the other user to redirect them to messages page
      console.log(
        `Sending unmatch notification to user ${otherUserId} about match ${matchId}`,
      );
      await sendUnmatchNotification(otherUserId, matchId, currentUserId);

      // Include archival info in response for audit trail
      const responseData: any = {
        message: "Unmatched successfully",
        success: true,
      };

      if (archivedMatchId) {
        responseData.archived = {
          matchId: archivedMatchId,
          messageCount: messageCount,
          timestamp: new Date().toISOString(),
        };
      }

      return res.status(200).json(responseData);
    } catch (error) {
      // Ensure all errors return JSON responses
      console.error("Error unmatching:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({
        message: "Server error unmatching",
        error: errorMessage,
        success: false,
      });
    }
  });

  // Report User API endpoint
  app.post(
    "/api/report-user",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        // Get the reporting user's ID from authentication
        const reportingUserId = req.user!.id;

        // Add reporterUserId to the request body before validation
        const dataWithReporter = {
          ...req.body,
          reporterUserId: reportingUserId,
        };

        const validatedData =
          insertUserReportStrikeSchema.parse(dataWithReporter);

        // Ensure the reporting user isn't trying to report themselves
        if (reportingUserId === validatedData.reportedUserId) {
          return res.status(400).json({
            message: "Cannot report yourself",
            success: false,
          });
        }

        // Verify the reported user exists
        const reportedUser = await storage.getUser(
          validatedData.reportedUserId,
        );
        if (!reportedUser) {
          return res.status(404).json({
            message: "Reported user not found",
            success: false,
          });
        }

        // Check if there's an active match between the users
        let matchId: number | undefined = undefined;
        if (validatedData.matchId) {
          const match = await storage.getMatchById(validatedData.matchId);
          if (
            match &&
            ((match.userId1 === reportingUserId &&
              match.userId2 === validatedData.reportedUserId) ||
              (match.userId2 === reportingUserId &&
                match.userId1 === validatedData.reportedUserId))
          ) {
            matchId = validatedData.matchId;
          }
        }

        console.log(
          `[REPORT-USER] User ${reportingUserId} reporting user ${validatedData.reportedUserId} for: ${validatedData.reason}`,
        );

        // Create the report strike using validated data
        const reportStrike = await storage.createUserReportStrike({
          reporterUserId: validatedData.reporterUserId,
          reportedUserId: validatedData.reportedUserId,
          reason: validatedData.reason,
          description: validatedData.description,
          matchId,
        });

        // Get total number of strikes for the reported user
        const totalStrikes = await storage.getUserReportStrikeCount(
          validatedData.reportedUserId,
        );

        console.log(
          `[REPORT-USER] Report created successfully. User ${validatedData.reportedUserId} now has ${totalStrikes} total strikes`,
        );

        // If there's a match, unmatch them immediately
        if (matchId) {
          try {
            console.log(
              `[REPORT-USER] Unmatching users ${reportingUserId} and ${validatedData.reportedUserId} due to report`,
            );

            // Archive the match before deletion
            const { ArchivingService } = await import("./archiving-service");
            await ArchivingService.archiveMatchWithMessages(
              matchId,
              reportingUserId,
              "user_deletion",
            );

            // Delete the match
            await storage.deleteMatch(matchId);

            // Create bidirectional dislike records to prevent future matching
            await db()
              .insert(matchesTable)
              .values([
                {
                  userId1: reportingUserId,
                  userId2: validatedData.reportedUserId,
                  matched: false,
                  isDislike: true,
                  createdAt: new Date(),
                },
                {
                  userId1: validatedData.reportedUserId,
                  userId2: reportingUserId,
                  matched: false,
                  isDislike: true,
                  createdAt: new Date(),
                },
              ]);

            console.log(
              `[REPORT-USER] Successfully unmatched and created dislike records`,
            );
          } catch (unmatchError) {
            console.error(
              `[REPORT-USER] Error during unmatch process:`,
              unmatchError,
            );
            // Continue with report processing even if unmatch fails
          }
        }

        // Check if user should be suspended (3+ strikes triggers suspension and email)
        if (totalStrikes >= 3) {
          console.log(
            `[REPORT-USER] User ${validatedData.reportedUserId} reached suspension threshold with ${totalStrikes} strikes`,
          );

          try {
            // Suspend the user account for 3 days
            const suspensionExpiresAt = new Date();
            suspensionExpiresAt.setDate(suspensionExpiresAt.getDate() + 3);

            await storage.updateUserProfile(validatedData.reportedUserId, {
              isSuspended: true,
              suspendedAt: new Date(),
              suspensionExpiresAt: suspensionExpiresAt,
            });

            console.log(
              `[REPORT-USER] User ${validatedData.reportedUserId} suspended until ${suspensionExpiresAt.toISOString()}`,
            );

            // Send suspension email notification
            const { sendEmail } = await import("./services/sendgrid");

            const emailContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7, #dda0dd, #98d8c8); height: 6px;"></div>

              <div style="padding: 40px; text-align: center; background: white;">
                <h1 style="color: #333; margin: 0 0 20px 0; font-size: 28px; font-weight: 700;">
                  🚨 Account Suspension Notice
                </h1>

                <div style="background: linear-gradient(135deg, #ff6b6b, #ee5a52); padding: 20px; border-radius: 12px; margin: 20px 0;">
                  <h2 style="color: white; margin: 0; font-size: 18px;">
                    Your CHARLEY account has been suspended
                  </h2>
                </div>

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                  Dear ${reportedUser.fullName},
                </p>

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                  Your account has been suspended due to multiple reports received regarding your behavior on the platform. 
                  You have accumulated <strong>${totalStrikes} reports</strong>, which violates our community guidelines.
                </p>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #333; margin: 0 0 10px 0;">Suspension Details:</h3>
                  <p style="color: #666; margin: 5px 0;"><strong>Duration:</strong> 3 days</p>
                  <p style="color: #666; margin: 5px 0;"><strong>Reason:</strong> Multiple user reports</p>
                  <p style="color: #666; margin: 5px 0;"><strong>Total Reports:</strong> ${totalStrikes}</p>
                </div>

                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                  If you believe this suspension is incorrect, you can appeal by contacting our support team at 
                  <a href="mailto:admin@kronogon.com" style="color: #667eea;">admin@kronogon.com</a>
                </p>

                <div style="margin: 30px 0;">
                  <p style="color: #999; font-size: 14px; margin: 0;">
                    BTechnos Team<br>
                    CHARLEY Dating Platform
                  </p>
                </div>
              </div>
            </div>
          `;

            await sendEmail(process.env.SENDGRID_API_KEY!, {
              to: reportedUser.email,
              from: "admin@kronogon.com",
              subject: "🚨 CHARLEY Account Suspension Notice",
              html: emailContent,
              text: `Your CHARLEY account has been suspended due to multiple reports. You have ${totalStrikes} total reports. Contact admin@kronogon.com to appeal.`,
            });

            console.log(
              `[REPORT-USER] Suspension email sent to ${reportedUser.email}`,
            );
          } catch (emailError) {
            console.error(
              `[REPORT-USER] Failed to send suspension email:`,
              emailError,
            );
          }
        }

        return res.status(201).json({
          message: "Report submitted successfully",
          success: true,
          reportId: reportStrike.id,
          totalStrikes,
          suspended: totalStrikes >= 3,
        });
      } catch (error) {
        console.error("Error creating report:", error);

        if (error instanceof ZodError) {
          return res.status(400).json({
            message: "Validation failed",
            errors: fromZodError(error).details,
            success: false,
          });
        }

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return res.status(500).json({
          message: "Server error creating report",
          error: errorMessage,
          success: false,
        });
      }
    },
  );

  // Suspension Appeal endpoint
  app.post("/api/suspension/appeal", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { message } = req.body;
      const userId = req.user!.id;

      if (
        !message ||
        typeof message !== "string" ||
        message.trim().length === 0
      ) {
        return res.status(400).json({
          message: "Appeal message is required",
          success: false,
        });
      }

      // Get user info for email
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Send appeal email to admin
      try {
        const { sendEmail } = await import("./services/sendgrid");

        const emailContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7, #dda0dd, #98d8c8); height: 6px;"></div>

            <div style="padding: 40px; text-align: center; background: white;">
              <h1 style="color: #333; margin: 0 0 20px 0; font-size: 28px; font-weight: 700;">
                📝 Suspension Appeal Request
              </h1>

              <div style="background: linear-gradient(135deg, #4ecdc4, #45b7d1); padding: 20px; border-radius: 12px; margin: 20px 0;">
                <h2 style="color: white; margin: 0; font-size: 18px;">
                  Appeal from suspended user
                </h2>
              </div>

              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
                <h3 style="color: #333; margin: 0 0 10px 0;">User Details:</h3>
                <p style="color: #666; margin: 5px 0;"><strong>User ID:</strong> ${userId}</p>
                <p style="color: #666; margin: 5px 0;"><strong>Name:</strong> ${user.fullName}</p>
                <p style="color: #666; margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
                <p style="color: #666; margin: 5px 0;"><strong>Phone:</strong> ${user.phoneNumber || "Not provided"}</p>
              </div>

              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
                <h3 style="color: #333; margin: 0 0 10px 0;">Appeal Message:</h3>
                <p style="color: #856404; line-height: 1.6; white-space: pre-wrap;">${message.trim()}</p>
              </div>

              <div style="margin: 30px 0;">
                <p style="color: #999; font-size: 14px; margin: 0;">
                  BTechnos Admin Team<br>
                  CHARLEY Dating Platform
                </p>
              </div>
            </div>
          </div>
        `;

        await sendEmail(process.env.SENDGRID_API_KEY!, {
          to: "admin@kronogon.com",
          from: "admin@kronogon.com",
          subject: `🚨 Suspension Appeal - ${user.fullName} (ID: ${userId})`,
          html: emailContent,
          text: `Suspension Appeal Request\n\nUser: ${user.fullName} (ID: ${userId})\nEmail: ${user.email}\nPhone: ${user.phoneNumber || "Not provided"}\n\nMessage:\n${message.trim()}`,
        });

        console.log(
          `[SUSPENSION-APPEAL] Appeal submitted by user ${userId} sent to admin`,
        );

        return res.status(200).json({
          message: "Appeal submitted successfully",
          success: true,
        });
      } catch (emailError) {
        console.error(
          `[SUSPENSION-APPEAL] Failed to send appeal email:`,
          emailError,
        );
        return res.status(500).json({
          message: "Failed to send appeal. Please try again later.",
          success: false,
        });
      }
    } catch (error) {
      console.error("Error processing suspension appeal:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({
        message: "Server error processing appeal",
        error: errorMessage,
        success: false,
      });
    }
  });

  // Match Dashboard API endpoint
  app.get(
    "/api/match-dashboard/:matchId",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const matchId = parseInt(req.params.matchId);
        const userId = req.user.id;

        if (isNaN(matchId)) {
          return res.status(400).json({ message: "Invalid match ID" });
        }

        // Verify that the current user is part of this match
        const match = await storage.getMatchById(matchId);
        if (!match) {
          return res.status(404).json({ message: "Match not found" });
        }

        if (match.userId1 !== userId && match.userId2 !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to view this match dashboard" });
        }

        // Get the other user's information
        const otherUserId =
          match.userId1 === userId ? match.userId2 : match.userId1;
        const otherUser = await storage.getUser(otherUserId);

        if (!otherUser) {
          return res.status(404).json({ message: "Match user not found" });
        }

        // Don't send password in response
        const { password, ...otherUserWithoutPassword } = otherUser;

        // For now, return a skeleton structure with placeholder data
        // This will be replaced with actual GPT model integration later
        const dashboardData = {
          matchId: matchId,
          matchUser: {
            id: otherUserWithoutPassword.id,
            fullName: otherUserWithoutPassword.fullName,
            photoUrl:
              otherUserWithoutPassword.photoUrl ||
              "https://via.placeholder.com/150",
          },
          overallScore: 71, // This will come from GPT model
          // All other data will be populated by GPT model integration
          coreCompatibility: [],
          loveLanguages: [],
          personalityTraits: [],
          culturalFactors: [],
          lifestyleActivities: [],
          interactionMetrics: [],
          idealDateSuggestion: "Data will be provided by AI analysis system",
        };

        res.json(dashboardData);
      } catch (error) {
        console.error("Error retrieving match dashboard data:", error);
        res
          .status(500)
          .json({ message: "Server error retrieving match dashboard data" });
      }
    },
  );

  // Potential matches route
  app.get("/api/potential-matches", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.id;
      const potentialMatches = await storage.getPotentialMatches(userId);

      // Don't send passwords in response
      const sanitizedMatches = potentialMatches.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json(sanitizedMatches);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Server error retrieving potential matches" });
    }
  });

  /**
   * PRIVACY PROTECTION SYSTEM - Server-side implementation
   *
   * The server implements a strict privacy protection system to ensure message privacy:
   *
   * 1. All message endpoints verify the current user is a legitimate participant in the conversation
   * 2. WebSocket handlers include multi-layer authorization checks before any data transmission
   * 3. Message operations (create, read, update) verify both match and user validity
   * 4. All sensitive operations are logged with detailed information for security auditing
   * 5. Storage operations are designed to prevent cross-user data leakage
   */

  // Message routes
  // Get all messages for a specific match
  app.get("/api/messages/:matchId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const matchId = parseInt(req.params.matchId);
    const userId = req.user.id;

    if (isNaN(matchId)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }

    try {
      // Verify that the current user is part of this match
      const match = await storage.getMatchById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.userId1 !== userId && match.userId2 !== userId) {
        return res
          .status(403)
          .json({ message: "Not authorized to view these messages" });
      }

      // Use enhanced method with user validation for additional security
      const messages = await storage.getMessagesByMatchId(matchId, userId);

      // Mark messages as read if the user is the receiver
      for (const message of messages) {
        if (message.receiverId === userId && !message.read) {
          await storage.markMessageAsReadWithTimestamp(message.id);
        }
      }

      // Mark the match as read for the current user
      await storage.markMatchRead(matchId, userId);

      res.json(messages);
    } catch (error) {
      console.error("Error retrieving messages:", error);
      res.status(500).json({ message: "Server error retrieving messages" });
    }
  });

  // Get all messages (no matchId) - Useful for the messages overview
  app.get("/api/messages", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Get all matches for the current user
      const userId = req.user.id;
      const matches = await storage.getMatchesByUserId(userId);

      // Only include matches where the matched field is true
      const confirmedMatches = matches.filter((match) => match.matched);

      // Get messages for each match - use enhanced method with user validation
      const allMessages = await Promise.all(
        confirmedMatches.map(async (match) => {
          // Pass userId to ensure proper authorization
          const messages = await storage.getMessagesByMatchId(match.id, userId);

          // Check if the match has unread messages for the current user
          const hasUnreadMessages =
            match.userId1 === userId
              ? match.hasUnreadMessages1
              : match.hasUnreadMessages2;

          return {
            matchId: match.id,
            messages: messages,
            hasUnreadMessages,
            lastMessageAt: match.lastMessageAt,
          };
        }),
      );

      // Add additional security log for audit purposes
      console.log(
        `User ${userId} fetched messages for ${confirmedMatches.length} matches`,
      );

      res.json(allMessages);
    } catch (error) {
      console.error("Error fetching all messages:", error);
      res.status(500).json({ message: "Server error retrieving messages" });
    }
  });

  // Get unread message count for the current user
  app.get("/api/messages/unread/count", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.id;
      // Extract mode from query parameter (default to MEET if not provided)
      const mode = (req.query.mode as string) || "MEET";
      console.log(
        `Fetching unread message count for user ${userId} in mode ${mode}`,
      );

      // CRITICAL FIX: For now, all modes share the same matches/messages
      // Since matches don't have mode-specific fields yet, we return the same count for all modes
      // This ensures cross-platform message visibility until mode-specific filtering is implemented

      // For navigation badge: Get count of conversations with unread messages
      // (each conversation with unread messages counts as 1, regardless of how many unread messages)
      const conversationsWithUnread =
        await storage.getUnreadConversationsCount(userId);

      console.log(
        `[API] Returning unread count for ${mode} mode: ${conversationsWithUnread}`,
      );
      res.json({ count: conversationsWithUnread });
    } catch (error) {
      console.error("Error fetching unread message count:", error);
      res.status(500).json({ message: "Server error retrieving unread count" });
    }
  });

  app.post("/api/messages", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const messageData: InsertMessage = insertMessageSchema.parse(req.body);

      // Verify that the sender is the current user
      if (messageData.senderId !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to send message as this user" });
      }

      // Verify that the match exists and user is part of it
      const match = await storage.getMatchById(messageData.matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.userId1 !== req.user.id && match.userId2 !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to send message in this match" });
      }

      // Verify that the receiver is the other user in the match
      const validReceiver =
        match.userId1 === messageData.receiverId ||
        match.userId2 === messageData.receiverId;
      if (!validReceiver) {
        return res
          .status(400)
          .json({ message: "Receiver is not part of this match" });
      }

      const newMessage = await storage.createMessage(messageData);
      res.status(201).json(newMessage);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error creating message" });
    }
  });

  // Add new endpoint for sending messages to a specific match
  app.post("/api/messages/:matchId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const matchId = parseInt(req.params.matchId);
      if (isNaN(matchId)) {
        return res.status(400).json({ message: "Invalid match ID" });
      }

      const {
        content,
        receiverId,
        messageType,
        audioUrl,
        audioDuration,
        replyToMessageId,
        replyToMessage,
      } = req.body;

      // More robust content validation - log details for troubleshooting
      console.log("Message content received:", {
        contentType: typeof content,
        content:
          typeof content === "string"
            ? content.length > 30
              ? content.substring(0, 30) + "..."
              : content
            : content,
        receiverId,
        messageType,
      });

      // Ensure content is provided, not null, and is a non-empty string
      if (
        !content ||
        typeof content !== "string" ||
        content.trim().length === 0
      ) {
        console.error("Message content is null or empty:", {
          content,
          contentType: typeof content,
        });
        return res.status(400).json({
          message: "Message content is required and must be a non-empty string",
        });
      }

      // Verify that the match exists and user is part of it
      const match = await storage.getMatchById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.userId1 !== req.user.id && match.userId2 !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to send message in this match" });
      }

      // Verify that the receiver is the other user in the match
      const validReceiver =
        match.userId1 === receiverId || match.userId2 === receiverId;
      if (!validReceiver) {
        return res
          .status(400)
          .json({ message: "Receiver is not part of this match" });
      }

      // Create the message with verified content
      const trimmedContent = content.trim();

      // CRITICAL FIX: Enhanced duplicate message detection with multiple strategies
      // This ensures we never create duplicates even when clients navigate away/back
      try {
        console.log(
          `[DUPLICATE-PREVENTION] Checking for duplicates, content: "${trimmedContent.substring(0, 20)}..."`,
        );

        // STRATEGY 1: Check for exact duplicates within a longer time window (5 minutes)
        // This catches most navigation-related duplicates which happen within minutes
        const longWindow = new Date();
        longWindow.setMinutes(longWindow.getMinutes() - 5);
        const longWindowStr = longWindow.toISOString();

        const exactDuplicates = await storage.findRecentDuplicateMessages({
          matchId,
          senderId: req.user.id,
          content: trimmedContent,
          messageType: messageType || "text",
          since: longWindowStr,
        });

        if (exactDuplicates && exactDuplicates.length > 0) {
          // Found exact duplicate within a 5-minute window
          const duplicateMessage = exactDuplicates[0];
          console.log(
            `[DUPLICATE-PREVENTION] BLOCKED: Found exact duplicate message ${duplicateMessage.id} from ${duplicateMessage.createdAt}`,
          );

          // Return the existing message with a special header
          res.setHeader("X-Duplicate-Message", "true");
          res.setHeader("X-Duplicate-Strategy", "exact-match");
          return res.status(200).json(duplicateMessage);
        }

        // STRATEGY 2: For very short messages (like "hi", "hey"), use case-insensitive matching
        // These are common first messages that get duplicated when navigating
        if (trimmedContent.length <= 5) {
          // For very short messages, check case-insensitive in a 10-minute window
          const veryLongWindow = new Date();
          veryLongWindow.setMinutes(veryLongWindow.getMinutes() - 10);

          // Use enhanced duplicate check with case-insensitive matching for short messages
          const caseInsensitiveDuplicates =
            await storage.findRecentDuplicateMessages({
              matchId,
              senderId: req.user.id,
              content: trimmedContent,
              messageType: messageType || "text",
              since: veryLongWindow.toISOString(),
              caseInsensitive: true, // Enable case-insensitive matching for short messages
            });

          if (
            caseInsensitiveDuplicates &&
            caseInsensitiveDuplicates.length > 0
          ) {
            const duplicateMessage = caseInsensitiveDuplicates[0];
            console.log(
              `[DUPLICATE-PREVENTION] BLOCKED: Found case-insensitive match for short message "${trimmedContent}" (ID: ${duplicateMessage.id})`,
            );

            // Return the existing message
            res.setHeader("X-Duplicate-Message", "true");
            res.setHeader("X-Duplicate-Strategy", "case-insensitive-short");
            return res.status(200).json(duplicateMessage);
          }
        }

        // STRATEGY 3: Frequency limitation - prevent sending same content multiple times in quick succession
        // Using a very short window (30 seconds) to check if this exact message was just sent
        const veryRecentWindow = new Date();
        veryRecentWindow.setSeconds(veryRecentWindow.getSeconds() - 30);

        const recentDuplicates = await storage.findRecentDuplicateMessages({
          matchId,
          senderId: req.user.id,
          content: trimmedContent,
          messageType: messageType || "text",
          since: veryRecentWindow.toISOString(),
          caseInsensitive: false, // Case-sensitive for exact matching
        });

        if (recentDuplicates && recentDuplicates.length > 0) {
          const duplicateMessage = recentDuplicates[0];
          console.log(
            `[DUPLICATE-PREVENTION] BLOCKED: Message throttled, same content sent ${recentDuplicates.length} times in the last 30 seconds`,
          );

          // Return the existing message
          res.setHeader("X-Duplicate-Message", "true");
          res.setHeader("X-Duplicate-Strategy", "throttle");
          return res.status(200).json(duplicateMessage);
        }

        console.log(
          `[DUPLICATE-PREVENTION] No duplicates found, proceeding with message creation`,
        );
      } catch (duplicateError) {
        // Log the error but continue with message creation (fail open)
        console.error(
          "[DUPLICATE-PREVENTION] Error checking for duplicates:",
          duplicateError,
        );
      }

      // Determine if the user being replied to is the current user
      // This needs to be calculated on the server, not trusted from client
      let calculatedReplyToIsCurrentUser = null;
      if (replyToMessageId && replyToMessage) {
        // Get the original message to check who sent it
        const originalMessage = await storage.getMessageById(replyToMessageId);
        if (originalMessage) {
          // Check if the sender of the original message is the same as current user
          calculatedReplyToIsCurrentUser =
            originalMessage.senderId === req.user.id;
        }
      }

      const messageData = {
        matchId,
        senderId: req.user.id,
        receiverId,
        content: trimmedContent,
        messageType: messageType || "text",
        audioUrl: audioUrl || null,
        audioDuration: audioDuration || null,
        encryptedContent: null,
        iv: null, // Encryption removed as per requirements
        // Reply fields - don't calculate isCurrentUser here, it will be done dynamically when fetching
        replyToMessageId: replyToMessageId || null,
        replyToContent: replyToMessage?.content || null,
        replyToSenderName: replyToMessage?.senderName || null,
        replyToIsCurrentUser: null, // Will be calculated dynamically when fetching messages
      };

      console.log("Creating message with data:", {
        matchId,
        senderId: req.user.id,
        receiverId,
        contentLength: trimmedContent.length,
        messageType: messageType || "text",
        replyToMessageId: replyToMessageId || null,
        replyToContent: replyToMessage?.content?.substring(0, 20) || null,
      });

      const newMessage = await storage.createMessage(messageData);

      // CRITICAL FIX: Apply the same reply transformation that's used in getMessagesByMatchId
      // This ensures the client receives the complete message with replyToMessage object
      let transformedMessage: any = newMessage;
      if (
        newMessage.replyToMessageId &&
        newMessage.replyToContent &&
        newMessage.replyToSenderName
      ) {
        // Calculate isCurrentUser based on who is viewing the message (the sender in this case)
        let isCurrentUser = false;
        if (replyToMessageId) {
          // Get the original message to check who sent it
          const originalMessage =
            await storage.getMessageById(replyToMessageId);
          if (originalMessage) {
            isCurrentUser = originalMessage.senderId === req.user.id;

            console.log(
              `🔄 [REPLY-TRANSFORM-CREATE] Message ${newMessage.id} "${newMessage.content}"`,
            );
            console.log(
              `   📧 Replying to message ${replyToMessageId} "${newMessage.replyToContent}"`,
            );
            console.log(
              `   👤 Original message sender: ${originalMessage.senderId}, Current user: ${req.user.id}`,
            );
            console.log(
              `   🎯 isCurrentUser = ${isCurrentUser} (should show "${isCurrentUser ? "You" : newMessage.replyToSenderName}")`,
            );
          }
        }

        // Add the replyToMessage object to the response
        transformedMessage = {
          ...newMessage,
          replyToMessage: {
            id: newMessage.replyToMessageId,
            content: newMessage.replyToContent,
            senderName: newMessage.replyToSenderName,
            isCurrentUser: isCurrentUser,
          },
        };
      }

      // Check auto-delete settings for the sender and schedule deletion if needed
      try {
        const senderSettings = await storage.getUserMatchSettings(
          req.user.id,
          matchId,
        );

        if (senderSettings && senderSettings.autoDeleteMode !== "never") {
          let deleteAt: Date;

          if (senderSettings.autoDeleteMode === "always") {
            // For 'always' mode, schedule deletion when user exits chat (handled by navigation events)
            // For now, we'll mark it with the current mode
            await storage.scheduleMessageDeletion(
              newMessage.id,
              new Date(),
              "always",
            );
          } else if (senderSettings.autoDeleteMode === "custom") {
            // Calculate deletion time based on custom settings
            deleteAt = new Date();
            const value = senderSettings.autoDeleteValue || 5;

            switch (senderSettings.autoDeleteUnit) {
              case "minutes":
                deleteAt.setMinutes(deleteAt.getMinutes() + value);
                break;
              case "hours":
                deleteAt.setHours(deleteAt.getHours() + value);
                break;
              case "days":
                deleteAt.setDate(deleteAt.getDate() + value);
                break;
              case "weeks":
                deleteAt.setDate(deleteAt.getDate() + value * 7);
                break;
              case "months":
                deleteAt.setMonth(deleteAt.getMonth() + value);
                break;
            }

            await storage.scheduleMessageDeletion(
              newMessage.id,
              deleteAt,
              "custom",
            );
          }
        }
      } catch (autoDeleteError) {
        console.error(
          "Error scheduling auto-delete for message:",
          autoDeleteError,
        );
        // Don't fail the message creation if auto-delete scheduling fails
      }

      // CRITICAL FIX: Enhanced WebSocket broadcasting for symmetric message delivery
      // Send to recipient
      const recipientWs = connectedUsers.get(receiverId);
      if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
        try {
          recipientWs.send(
            JSON.stringify({
              type: "new_message",
              message: transformedMessage,
              for: "recipient",
              timestamp: new Date().toISOString(),
            }),
          );
          console.log(
            `✅ Message ${newMessage.id} delivered to recipient ${receiverId} via WebSocket`,
          );
        } catch (wsError) {
          console.error(
            `Failed to send message to recipient ${receiverId}:`,
            wsError,
          );
        }
      } else {
        console.log(`⚠️ Recipient ${receiverId} not connected via WebSocket`);
      }

      // CRITICAL FIX: Also send delivery confirmation to sender
      const senderWs = connectedUsers.get(req.user.id);
      if (senderWs && senderWs.readyState === WebSocket.OPEN) {
        try {
          senderWs.send(
            JSON.stringify({
              type: "message_sent",
              messageId: newMessage.id,
              matchId: match.id,
              message: transformedMessage,
              for: "sender",
              timestamp: new Date().toISOString(),
            }),
          );
          console.log(
            `✅ Message ${newMessage.id} delivery confirmed to sender ${req.user.id} via WebSocket`,
          );
        } catch (wsError) {
          console.error(
            `Failed to send delivery confirmation to sender ${req.user.id}:`,
            wsError,
          );
        }
      } else {
        console.log(`⚠️ Sender ${req.user.id} not connected via WebSocket`);
      }

      res.status(201).json(transformedMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Server error creating message" });
    }
  });

  app.patch("/api/messages/:id/read", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const messageId = parseInt(req.params.id);
    if (isNaN(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    try {
      const updatedMessage = await storage.markMessageAsRead(messageId);
      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found" });
      }

      res.json(updatedMessage);
    } catch (error) {
      res.status(500).json({ message: "Server error updating message" });
    }
  });

  // Add POST endpoint for marking messages as read (frontend compatibility)
  app.post("/api/messages/:id/read", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const messageId = parseInt(req.params.id);
    if (isNaN(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    try {
      const updatedMessage = await storage.markMessageAsRead(messageId);
      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found" });
      }

      res.json(updatedMessage);
    } catch (error) {
      res.status(500).json({ message: "Server error updating message" });
    }
  });

  // User interests routes
  app.get("/api/interests/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    try {
      // If user is looking at their own interests, session touch to keep session active
      if (req.isAuthenticated() && req.user?.id === userId) {
        if (req.session) {
          req.session.touch();
        }
      }

      const interests = await storage.getUserInterests(userId);
      res.json(interests);
    } catch (error) {
      console.error("Error retrieving user interests:", error);
      res.status(500).json({ message: "Server error retrieving interests" });
    }
  });

  // Delete all interests for a user (used when replacing the entire set)
  app.delete("/api/interests/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Ensure user can only delete their own interests
    if (req.user?.id !== userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete these interests" });
    }

    try {
      await storage.deleteAllUserInterests(userId);
      res.status(200).json({ message: "All interests deleted successfully" });
    } catch (error) {
      console.error("Error deleting user interests:", error);
      res.status(500).json({ message: "Server error deleting interests" });
    }
  });

  // Update visibility of all user interests
  app.patch(
    "/api/interests/:userId/visibility",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        console.log("User not authenticated for visibility update");
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Touch session to keep it alive
      if (req.session) {
        req.session.touch();
      }

      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Log user IDs to debug authorization issues
      console.log(
        `Requesting user ID: ${req.user.id}, Target user ID: ${userId}`,
      );

      // Ensure user can only update their own interests
      if (req.user?.id !== userId) {
        console.log(
          `User ${req.user.id} not authorized to update interests for user ${userId}`,
        );
        return res
          .status(403)
          .json({ message: "Not authorized to update these interests" });
      }

      const { showOnProfile } = req.body;
      if (typeof showOnProfile !== "boolean") {
        return res
          .status(400)
          .json({ message: "showOnProfile boolean value is required" });
      }

      try {
        console.log(
          `Updating interests visibility for user ${userId} to ${showOnProfile}`,
        );
        await storage.updateUserInterestsVisibility(userId, showOnProfile);
        res
          .status(200)
          .json({ message: "Interests visibility updated successfully" });
      } catch (error) {
        console.error("Error updating interests visibility:", error);
        res
          .status(500)
          .json({ message: "Server error updating interests visibility" });
      }
    },
  );

  app.post("/api/interests", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      console.log("User not authenticated when adding interest");
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Touch session to keep it alive
    if (req.session) {
      req.session.touch();
    }

    try {
      // Log the incoming request body
      console.log("Adding interest request body:", req.body);

      const { interest, userId } = req.body;
      if (!interest) {
        return res.status(400).json({ message: "Interest is required" });
      }

      // If userId is provided, make sure it matches authenticated user
      if (userId && parseInt(userId) !== req.user.id) {
        console.warn(
          `User ${req.user.id} attempted to add interest for a different user ID: ${userId}`,
        );
        return res
          .status(403)
          .json({ message: "Not authorized to add interests for other users" });
      }

      console.log(`Adding interest "${interest}" for user ${req.user.id}`);

      try {
        // First, add to global interests if it doesn't exist
        const globalInterest = await storage.getGlobalInterestByName(interest);
        if (!globalInterest) {
          // Add to global interests database
          console.log(`Adding "${interest}" to global interests database`);
          await storage.addGlobalInterest({
            interest,
            category: "user-added",
            createdBy: req.user.id,
          });
        }

        // Then add to user's personal interests
        const newInterest = await storage.addUserInterest({
          userId: req.user.id,
          interest,
          showOnProfile: true, // Explicitly set interest visibility to true
        });

        console.log(
          `Interest added successfully: ${JSON.stringify(newInterest)}`,
        );
        return res.status(201).json(newInterest);
      } catch (storageError) {
        console.error("Storage error adding interest:", storageError);
        return res.status(500).json({
          message: "Server error adding interest",
          details:
            storageError instanceof Error
              ? storageError.message
              : "Unknown error",
        });
      }
    } catch (error) {
      console.error("Error processing interest request:", error);
      res.status(500).json({
        message: "Server error processing interest request",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Global interests routes
  app.get("/api/global-interests", async (req: Request, res: Response) => {
    try {
      const interests = await storage.getAllGlobalInterests();
      res.json(interests);
    } catch (error) {
      console.error("Error fetching global interests:", error);
      res
        .status(500)
        .json({ message: "Server error retrieving global interests" });
    }
  });

  app.post("/api/global-interests", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      console.log("User not authenticated when adding global interest");
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Touch session to keep it alive
    if (req.session) {
      req.session.touch();
    }

    try {
      // Log the incoming request body
      console.log("Adding global interest request body:", req.body);

      // Validate request data
      let globalInterestData;
      try {
        globalInterestData = insertGlobalInterestSchema.parse(req.body);
      } catch (zodError) {
        if (zodError instanceof ZodError) {
          const errorMessage = fromZodError(zodError).message;
          console.error(
            "Validation error adding global interest:",
            errorMessage,
          );
          return res.status(400).json({ message: errorMessage });
        }
        throw zodError;
      }

      // Check if interest already exists
      try {
        const existingInterest = await storage.getGlobalInterestByName(
          globalInterestData.interest,
        );
        if (existingInterest) {
          console.log(
            `Interest "${globalInterestData.interest}" already exists in global database, returning existing interest`,
          );
          return res.status(200).json(existingInterest); // Return 200 OK with existing interest
        }
      } catch (lookupError) {
        console.error("Error checking for existing interest:", lookupError);
        // Continue with adding the interest even if lookup fails
      }

      // Add createdBy if not provided
      if (!globalInterestData.createdBy) {
        globalInterestData.createdBy = req.user.id;
      }

      // Add the interest to the database
      try {
        const newGlobalInterest =
          await storage.addGlobalInterest(globalInterestData);
        console.log(
          `Added new global interest: ${JSON.stringify(newGlobalInterest)}`,
        );
        return res.status(201).json(newGlobalInterest);
      } catch (storageError) {
        console.error("Storage error adding global interest:", storageError);
        return res.status(500).json({
          message: "Database error adding global interest",
          details:
            storageError instanceof Error
              ? storageError.message
              : "Unknown error",
        });
      }
    } catch (error) {
      console.error("Unexpected error adding global interest:", error);
      res.status(500).json({
        message: "Server error adding global interest",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Global deal breakers routes
  app.get("/api/global-deal-breakers", async (req: Request, res: Response) => {
    try {
      const dealBreakers = await storage.getAllGlobalDealBreakers();
      res.json(dealBreakers);
    } catch (error) {
      console.error("Error fetching global deal breakers:", error);
      res
        .status(500)
        .json({ message: "Server error retrieving global deal breakers" });
    }
  });

  app.post("/api/global-deal-breakers", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      console.log("User not authenticated when adding global deal breaker");
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Touch session to keep it alive
    if (req.session) {
      req.session.touch();
    }

    try {
      // Log the incoming request body
      console.log("Adding global deal breaker request body:", req.body);

      // Validate request data
      let globalDealBreakerData;
      try {
        globalDealBreakerData = insertGlobalDealBreakerSchema.parse(req.body);
      } catch (zodError) {
        if (zodError instanceof ZodError) {
          const errorMessage = fromZodError(zodError).message;
          console.error(
            "Validation error adding global deal breaker:",
            errorMessage,
          );
          return res.status(400).json({ message: errorMessage });
        }
        throw zodError;
      }

      // Check if deal breaker already exists
      try {
        const existingDealBreaker = await storage.getGlobalDealBreakerByName(
          globalDealBreakerData.dealBreaker,
        );
        if (existingDealBreaker) {
          console.log(
            `Deal breaker "${globalDealBreakerData.dealBreaker}" already exists in global database, returning existing deal breaker`,
          );
          return res.status(200).json(existingDealBreaker); // Return 200 OK with existing deal breaker
        }
      } catch (lookupError) {
        console.error("Error checking for existing deal breaker:", lookupError);
        // Continue with adding the deal breaker even if lookup fails
      }

      // Add createdBy if not provided
      if (!globalDealBreakerData.createdBy) {
        globalDealBreakerData.createdBy = req.user.id;
      }

      // Add the deal breaker to the database
      try {
        const newGlobalDealBreaker = await storage.addGlobalDealBreaker(
          globalDealBreakerData,
        );
        console.log(
          `Added new global deal breaker: ${JSON.stringify(newGlobalDealBreaker)}`,
        );
        return res.status(201).json(newGlobalDealBreaker);
      } catch (storageError) {
        console.error(
          "Storage error adding global deal breaker:",
          storageError,
        );
        return res.status(500).json({
          message: "Database error adding global deal breaker",
          details:
            storageError instanceof Error
              ? storageError.message
              : "Unknown error",
        });
      }
    } catch (error) {
      console.error("Unexpected error adding global deal breaker:", error);
      res.status(500).json({
        message: "Server error adding global deal breaker",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Global tribes routes
  app.get("/api/global-tribes", async (req: Request, res: Response) => {
    try {
      const tribes = await storage.getAllGlobalTribes();
      res.json(tribes);
    } catch (error) {
      console.error("Error fetching global tribes:", error);
      res
        .status(500)
        .json({ message: "Server error retrieving global tribes" });
    }
  });

  app.post("/api/global-tribes", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      console.log("User not authenticated when adding global tribe");
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Touch session to keep it alive
    if (req.session) {
      req.session.touch();
    }

    try {
      // Log the incoming request body
      console.log("Adding global tribe request body:", req.body);

      // Validate request data
      let globalTribeData;
      try {
        globalTribeData = insertGlobalTribeSchema.parse(req.body);
      } catch (zodError) {
        if (zodError instanceof ZodError) {
          const errorMessage = fromZodError(zodError).message;
          console.error("Validation error adding global tribe:", errorMessage);
          return res.status(400).json({ message: errorMessage });
        }
        throw zodError;
      }

      // Check if tribe already exists
      try {
        const existingTribe = await storage.getGlobalTribeByName(
          globalTribeData.tribe,
        );
        if (existingTribe) {
          console.log(
            `Tribe "${globalTribeData.tribe}" already exists in global database, returning existing tribe`,
          );
          return res.status(200).json(existingTribe); // Return 200 OK with existing tribe
        }
      } catch (lookupError) {
        console.error("Error checking for existing tribe:", lookupError);
        // Continue with adding the tribe even if lookup fails
      }

      // Add createdBy if not provided
      if (!globalTribeData.createdBy) {
        globalTribeData.createdBy = req.user.id;
      }

      // Add the tribe to the database
      try {
        const newGlobalTribe = await storage.addGlobalTribe(globalTribeData);
        console.log(
          `Added new global tribe: ${JSON.stringify(newGlobalTribe)}`,
        );
        return res.status(201).json(newGlobalTribe);
      } catch (storageError) {
        console.error("Storage error adding global tribe:", storageError);
        return res.status(500).json({
          message: "Database error adding global tribe",
          details:
            storageError instanceof Error
              ? storageError.message
              : "Unknown error",
        });
      }
    } catch (error) {
      console.error("Unexpected error adding global tribe:", error);
      res.status(500).json({
        message: "Server error adding global tribe",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Global religions routes
  app.get("/api/global-religions", async (req: Request, res: Response) => {
    try {
      const religions = await storage.getAllGlobalReligions();
      res.json(religions);
    } catch (error) {
      console.error("Error fetching global religions:", error);
      res
        .status(500)
        .json({ message: "Server error retrieving global religions" });
    }
  });

  app.post("/api/global-religions", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      console.log("User not authenticated when adding global religion");
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Touch session to keep it alive
    if (req.session) {
      req.session.touch();
    }

    try {
      // Log the incoming request body
      console.log("Adding global religion request body:", req.body);

      // Validate request data
      let globalReligionData;
      try {
        globalReligionData = insertGlobalReligionSchema.parse(req.body);
      } catch (zodError) {
        if (zodError instanceof ZodError) {
          const errorMessage = fromZodError(zodError).message;
          console.error(
            "Validation error adding global religion:",
            errorMessage,
          );
          return res.status(400).json({ message: errorMessage });
        }
        throw zodError;
      }

      // Check if religion already exists
      try {
        const existingReligion = await storage.getGlobalReligionByName(
          globalReligionData.religion,
        );
        if (existingReligion) {
          console.log(
            `Religion "${globalReligionData.religion}" already exists in global database, returning existing religion`,
          );
          return res.status(200).json(existingReligion); // Return 200 OK with existing religion
        }
      } catch (lookupError) {
        console.error("Error checking for existing religion:", lookupError);
        // Continue with adding the religion even if lookup fails
      }

      // Add createdBy if not provided
      if (!globalReligionData.createdBy) {
        globalReligionData.createdBy = req.user.id;
      }

      // Add the religion to the database
      try {
        const newGlobalReligion =
          await storage.addGlobalReligion(globalReligionData);
        console.log(
          `Added new global religion: ${JSON.stringify(newGlobalReligion)}`,
        );
        return res.status(201).json(newGlobalReligion);
      } catch (storageError) {
        console.error("Storage error adding global religion:", storageError);
        return res.status(500).json({
          message: "Database error adding global religion",
          details:
            storageError instanceof Error
              ? storageError.message
              : "Unknown error",
        });
      }
    } catch (error) {
      console.error("Unexpected error adding global religion:", error);
      res.status(500).json({
        message: "Server error adding global religion",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // MEET App Swipe Actions - Handle like/dislike for traditional dating
  app.post("/api/swipe", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { targetUserId, action } = req.body;
      const currentUserId = req.user.id;

      if (!targetUserId || !action || !["like", "dislike"].includes(action)) {
        return res.status(400).json({ message: "Invalid swipe data" });
      }

      console.log(
        `[SWIPE] User ${currentUserId} ${action}d user ${targetUserId}`,
      );

      // For dislikes, create a dislike record in the matches table
      if (action === "dislike") {
        try {
          await storage.createMatch({
            userId1: currentUserId,
            userId2: targetUserId,
            matched: false,
            isDislike: true,
            metadata: JSON.stringify({ origin: "MEET" }),
          });
          console.log(
            `[SWIPE] Created dislike record: ${currentUserId} -> ${targetUserId}`,
          );
        } catch (error) {
          // Handle duplicate constraint gracefully
          if (error instanceof Error && error.message.includes("duplicate")) {
            console.log(
              `[SWIPE] Dislike record ${currentUserId} -> ${targetUserId} already exists`,
            );
          } else {
            throw error;
          }
        }
      }
      // For likes, create a like record and check for matches
      else if (action === "like") {
        // 🔗 BIDIRECTIONAL DETECTION: Check if a SUITE match already exists between these users
        console.log(
          `🔍 [MEET-SWIPE] Checking for existing SUITE matches between users ${currentUserId} and ${targetUserId}`,
        );
        const existingMatches = await storage.getAllMatchesBetweenUsers(
          currentUserId,
          targetUserId,
        );
        console.log(
          `🔍 [MEET-SWIPE] Found ${existingMatches.length} existing matches between users`,
        );

        if (existingMatches.length > 0) {
          existingMatches.forEach((match, index) => {
            console.log(
              `🔍 [MEET-SWIPE] Match ${index + 1}: ID=${match.id}, metadata=${match.metadata}`,
            );
          });
        }

        // Check if any existing match is from SUITE
        const existingSuiteMatch = existingMatches.find((match) => {
          if (match.metadata) {
            try {
              const metadata =
                typeof match.metadata === "string"
                  ? JSON.parse(match.metadata)
                  : match.metadata;
              return metadata && metadata.origin === "SUITE";
            } catch (e) {
              console.error(
                `🔍 [MEET-SWIPE] Failed to parse metadata for match ${match.id}:`,
                e,
              );
              return false;
            }
          }
          return false;
        });

        if (existingSuiteMatch) {
          console.log(
            `🔗 [MEET-SWIPE] Found existing SUITE match ${existingSuiteMatch.id}, adding MEET as additional connection`,
          );

          try {
            const existingMetadata =
              typeof existingSuiteMatch.metadata === "string"
                ? JSON.parse(existingSuiteMatch.metadata)
                : existingSuiteMatch.metadata;

            console.log(
              `🔗 [MEET-SWIPE] Current metadata: ${JSON.stringify(existingMetadata)}`,
            );

            // Add MEET as additional connection to existing SUITE match
            if (!existingMetadata.additionalConnections) {
              existingMetadata.additionalConnections = [];
              console.log(
                `🔗 [MEET-SWIPE] Initialized additionalConnections array`,
              );
            }

            if (!existingMetadata.additionalConnections.includes("MEET")) {
              existingMetadata.additionalConnections.push("MEET");
              console.log(
                `🔗 [MEET-SWIPE] Adding MEET to additionalConnections for SUITE match ${existingSuiteMatch.id}`,
              );
              console.log(
                `🔗 [MEET-SWIPE] New additionalConnections: ${JSON.stringify(existingMetadata.additionalConnections)}`,
              );

              // Update the existing SUITE match with MEET as additional connection
              const updatedMatch = await storage.updateMatch(
                existingSuiteMatch.id,
                {
                  metadata: JSON.stringify(existingMetadata),
                },
              );

              console.log(
                `🔗 [MEET-SWIPE] Successfully added MEET to additionalConnections for existing SUITE match ${existingSuiteMatch.id}`,
              );
              console.log(
                `🔗 [MEET-SWIPE] Final updated metadata: ${updatedMatch?.metadata}`,
              );

              return res.json({
                success: true,
                action,
                isMatch: true,
                message:
                  "MEET added as additional connection to existing SUITE match",
              });
            } else {
              console.log(
                `🔗 [MEET-SWIPE] MEET already exists in additionalConnections, no update needed`,
              );
              return res.json({
                success: true,
                action,
                isMatch: true,
                message: "MEET connection already exists",
              });
            }
          } catch (error) {
            console.error(
              `🔗 [MEET-SWIPE] Error updating existing SUITE match:`,
              error,
            );
            // Fall through to create new MEET match if update fails
          }
        }

        try {
          // Create the like record with MEET origin metadata
          await storage.createMatch({
            userId1: currentUserId,
            userId2: targetUserId,
            matched: false,
            isDislike: false,
            metadata: JSON.stringify({ origin: "MEET" }),
          });
          console.log(
            `[SWIPE] Created like record: ${currentUserId} -> ${targetUserId}`,
          );

          // Check if target user also liked current user (mutual like = match)
          const mutualLike = await db
            .select()
            .from(matchesTable)
            .where(
              and(
                eq(matchesTable.userId1, targetUserId),
                eq(matchesTable.userId2, currentUserId),
                eq(matchesTable.matched, false),
                eq(matchesTable.isDislike, false),
              ),
            )
            .limit(1);

          if (mutualLike.length > 0) {
            // 🔗 CRITICAL FIX: Check for existing SUITE match again before creating mutual MEET match
            console.log(
              `🔍 [MEET-MUTUAL-MATCH] Checking for existing SUITE matches before creating mutual match`,
            );
            const allExistingMatches = await storage.getAllMatchesBetweenUsers(
              currentUserId,
              targetUserId,
            );
            const existingSuiteMatchForMutual = allExistingMatches.find(
              (match) => {
                if (match.metadata) {
                  try {
                    const metadata =
                      typeof match.metadata === "string"
                        ? JSON.parse(match.metadata)
                        : match.metadata;
                    return metadata && metadata.origin === "SUITE";
                  } catch (e) {
                    return false;
                  }
                }
                return false;
              },
            );

            let finalMetadata = { origin: "MEET" };

            if (existingSuiteMatchForMutual) {
              console.log(
                `🔗 [MEET-MUTUAL-MATCH] Found existing SUITE match ${existingSuiteMatchForMutual.id}, preserving SUITE metadata and adding MEET`,
              );
              try {
                const existingMetadata =
                  typeof existingSuiteMatchForMutual.metadata === "string"
                    ? JSON.parse(existingSuiteMatchForMutual.metadata)
                    : existingSuiteMatchForMutual.metadata;

                // Preserve SUITE metadata and add MEET to additionalConnections
                finalMetadata = { ...existingMetadata };
                if (!finalMetadata.additionalConnections) {
                  finalMetadata.additionalConnections = [];
                }
                if (!finalMetadata.additionalConnections.includes("MEET")) {
                  finalMetadata.additionalConnections.push("MEET");
                }
                console.log(
                  `🔗 [MEET-MUTUAL-MATCH] Final metadata: ${JSON.stringify(finalMetadata)}`,
                );
              } catch (error) {
                console.error(
                  `🔗 [MEET-MUTUAL-MATCH] Error parsing existing SUITE metadata:`,
                  error,
                );
                // Fall back to MEET-only metadata
              }
            }

            // Update both records to matched status and preserve/enhance metadata
            await db
              .update(matchesTable)
              .set({
                matched: true,
                metadata: JSON.stringify(finalMetadata),
              })
              .where(
                or(
                  and(
                    eq(matchesTable.userId1, currentUserId),
                    eq(matchesTable.userId2, targetUserId),
                  ),
                  and(
                    eq(matchesTable.userId1, targetUserId),
                    eq(matchesTable.userId2, currentUserId),
                  ),
                ),
              );

            console.log(
              `[SWIPE] Match created: ${currentUserId} ↔ ${targetUserId}`,
            );

            // CRITICAL: Remove swipe history records for matched users to protect match integrity
            // This prevents either user from undoing their swipe and destroying the match
            console.log(
              `[SWIPE-CLEANUP] About to clean up swipe history for users ${currentUserId} ↔ ${targetUserId}`,
            );
            try {
              await storage.removeMatchedUsersFromSwipeHistory(
                currentUserId,
                targetUserId,
              );
              console.log(
                `[SWIPE-CLEANUP] Successfully cleaned up swipe history for users ${currentUserId} ↔ ${targetUserId}`,
              );
            } catch (historyError) {
              console.error(
                "Error cleaning up swipe history for matched users:",
                historyError,
              );
              // Don't fail the match if cleanup fails, but log it for debugging
            }

            // Send match notifications AND bidirectional card removal via WebSocket if connected
            if (connectedUsers) {
              [currentUserId, targetUserId].forEach((userId) => {
                const userSocket = connectedUsers.get(userId);
                if (userSocket && userSocket.readyState === WebSocket.OPEN) {
                  // Send match notification
                  userSocket.send(
                    JSON.stringify({
                      type: "match_notification",
                      matchedUserId:
                        userId === currentUserId ? targetUserId : currentUserId,
                      timestamp: new Date().toISOString(),
                    }),
                  );

                  // 🚀 REAL-TIME CARD REMOVAL: Send bidirectional card removal message
                  userSocket.send(
                    JSON.stringify({
                      type: "card_removal",
                      removeUserId:
                        userId === currentUserId ? targetUserId : currentUserId,
                      reason: "mutual_match",
                      timestamp: new Date().toISOString(),
                    }),
                  );

                  console.log(
                    `🗑️ [CARD-REMOVAL] Sent card removal to user ${userId} for user ${userId === currentUserId ? targetUserId : currentUserId}`,
                  );
                }
              });
            }

            return res.json({ success: true, action, isMatch: true });
          }
        } catch (error) {
          // Handle duplicate constraint gracefully
          if (error instanceof Error && error.message.includes("duplicate")) {
            console.log(
              `[SWIPE] Like record ${currentUserId} -> ${targetUserId} already exists`,
            );
          } else {
            throw error;
          }
        }
      }

      res.json({ success: true, action, isMatch: false });
    } catch (error) {
      console.error("Error processing swipe action:", error);
      res.status(500).json({ message: "Failed to process swipe action" });
    }
  });

  // User photos routes
  // Get a specific photo by its ID
  app.get(
    "/api/photos/single/:photoId",
    async (req: Request, res: Response) => {
      try {
        const { photoId } = req.params;
        const photo = await storage.getUserPhotoById(parseInt(photoId));

        if (!photo) {
          return res.status(404).json({ error: "Photo not found" });
        }

        // Check authentication for viewing the photo
        if (req.isAuthenticated() && req.user.id !== photo.userId) {
          // Allow viewing others' photos if authenticated, but log access
          console.log(
            `User ${req.user.id} accessed photo ${photoId} of user ${photo.userId}`,
          );
        }

        res.json(photo);
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .json({ error: "An error occurred while fetching the photo" });
      }
    },
  );

  // Get all photos for a user
  app.get("/api/photos/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      // Validate userId parameter
      if (!userId || userId === "undefined" || userId === "null") {
        console.error("Invalid userId parameter:", userId);
        return res.status(400).json({ error: "Valid user ID is required" });
      }

      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        console.error("Invalid userId - not a number:", userId);
        return res
          .status(400)
          .json({ error: "User ID must be a valid number" });
      }

      const photos = await storage.getUserPhotos(userIdNum);
      res.json(photos);
    } catch (err) {
      console.error("Error fetching user photos:", err);
      res
        .status(500)
        .json({ error: "An error occurred while fetching user photos" });
    }
  });

  app.post("/api/photos", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { photoUrl, isPrimary = false } = req.body;
      if (!photoUrl) {
        return res.status(400).json({ message: "Photo URL is required" });
      }

      const photo = await storage.addUserPhoto({
        userId: req.user.id,
        photoUrl,
        isPrimary,
      });

      res.status(201).json(photo);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "An error occurred while adding a photo" });
    }
  });

  app.delete("/api/photos/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { id } = req.params;
      const photoId = parseInt(id);

      // Validate that the ID is within PostgreSQL integer range
      if (photoId > 2147483647 || isNaN(photoId)) {
        return res.status(400).json({
          error:
            "Invalid photo ID. Temporary photos cannot be deleted via server.",
        });
      }

      await storage.deleteUserPhoto(photoId);
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ error: "An error occurred while deleting the photo" });
    }
  });

  app.patch("/api/photos/:id/primary", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { id } = req.params;
      const photoId = parseInt(id);

      // Validate that the ID is within PostgreSQL integer range
      if (photoId > 2147483647 || isNaN(photoId)) {
        return res.status(400).json({
          error:
            "Invalid photo ID. Temporary photos cannot be set as primary via server.",
        });
      }

      const photo = await storage.setPrimaryPhoto(photoId, req.user.id);
      res.json(photo);
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ error: "An error occurred while setting primary photo" });
    }
  });

  // Avatar and Replicate API endpoints have been removed

  // Profile Photo Upload endpoint for cropped photos
  app.post("/api/profile/photo", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { photoData, photoId } = req.body;

      if (!photoData || !photoData.startsWith("data:image/")) {
        return res
          .status(400)
          .json({ message: "Valid image data is required" });
      }

      // If photoId is provided, update the existing photo instead of creating a new one
      if (photoId) {
        // Verify the photo belongs to this user
        const existingPhoto = await storage.getUserPhotoById(photoId);

        if (!existingPhoto) {
          return res.status(404).json({ message: "Photo not found" });
        }

        if (existingPhoto.userId !== req.user.id) {
          return res
            .status(403)
            .json({ message: "Not authorized to update this photo" });
        }

        // Update the existing photo
        const updatedPhoto = await storage.updateUserPhoto(photoId, {
          photoUrl: photoData,
        });

        // If this is a primary photo, also update the user's profile photoUrl
        if (existingPhoto.isPrimary) {
          await storage.updateUserProfile(req.user.id, { photoUrl: photoData });
        }

        return res.status(200).json(updatedPhoto);
      }

      // If no photoId, create a new photo as before
      // First, check if user already has a primary photo
      const existingPhotos = await storage.getUserPhotos(req.user.id);
      const isPrimary = existingPhotos.length === 0; // First photo becomes primary

      // Add the new photo
      const photo = await storage.addUserPhoto({
        userId: req.user.id,
        photoUrl: photoData,
        isPrimary,
      });

      // If this is the primary photo, update the user's profile photoUrl as well
      if (isPrimary) {
        await storage.updateUserProfile(req.user.id, { photoUrl: photoData });
      }

      res.status(201).json(photo);
    } catch (err) {
      console.error("Error uploading profile photo:", err);
      res.status(500).json({
        error: "An error occurred while uploading your profile photo",
      });
    }
  });

  // Section-specific Primary Photo Management endpoints

  // Update primary photo for a specific section
  app.patch(
    "/api/profile/photo/:photoId/primary/:section",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const photoId = parseInt(req.params.photoId);
        const section = req.params.section;

        if (isNaN(photoId)) {
          return res.status(400).json({ message: "Invalid photo ID" });
        }

        // Validate section parameter
        const validSections = ["meet", "job", "mentorship", "networking"];
        if (!validSections.includes(section)) {
          return res.status(400).json({
            message:
              "Invalid section. Must be one of: meet, job, mentorship, networking",
          });
        }

        // Verify the photo belongs to this user
        const existingPhoto = await storage.getUserPhotoById(photoId);
        if (!existingPhoto) {
          return res.status(404).json({ message: "Photo not found" });
        }

        if (existingPhoto.userId !== req.user.id) {
          return res.status(403).json({
            message: "Not authorized to update this photo",
          });
        }

        // Update section-specific primary photo
        const result = await storage.updateSectionPrimaryPhoto(
          req.user.id,
          photoId,
          section,
        );

        if (!result.success) {
          return res.status(500).json({ message: result.error });
        }

        // Get updated photos to return
        const updatedPhotos = await storage.getUserPhotos(req.user.id);

        res.status(200).json({
          message: `Primary photo updated for ${section} section`,
          photos: updatedPhotos,
          updatedPhotoId: photoId,
          section: section,
        });
      } catch (err) {
        console.error("Error updating section primary photo:", err);
        res.status(500).json({
          error: "An error occurred while updating the primary photo",
        });
      }
    },
  );

  // Get photos with section-specific primary status
  app.get(
    "/api/profile/photos/section/:section",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const section = req.params.section;

        // Validate section parameter
        const validSections = ["meet", "job", "mentorship", "networking"];
        if (!validSections.includes(section)) {
          return res.status(400).json({
            message:
              "Invalid section. Must be one of: meet, job, mentorship, networking",
          });
        }

        const photos = await storage.getUserPhotosWithSectionPrimary(
          req.user.id,
          section,
        );

        res.status(200).json({
          photos: photos,
          section: section,
        });
      } catch (err) {
        console.error("Error fetching section photos:", err);
        res.status(500).json({
          error: "An error occurred while fetching photos",
        });
      }
    },
  );

  // Get primary photo for a specific section
  app.get(
    "/api/profile/photo/primary/:section",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const section = req.params.section;

        // Validate section parameter
        const validSections = ["meet", "job", "mentorship", "networking"];
        if (!validSections.includes(section)) {
          return res.status(400).json({
            message:
              "Invalid section. Must be one of: meet, job, mentorship, networking",
          });
        }

        const primaryPhoto = await storage.getSectionPrimaryPhoto(
          req.user.id,
          section,
        );

        if (!primaryPhoto) {
          return res.status(404).json({
            message: `No primary photo found for ${section} section`,
            section: section,
          });
        }

        res.status(200).json({
          photo: primaryPhoto,
          section: section,
        });
      } catch (err) {
        console.error("Error fetching section primary photo:", err);
        res.status(500).json({
          error: "An error occurred while fetching the primary photo",
        });
      }
    },
  );

  // ICE servers endpoint for video calls
  app.get("/api/ice", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Using public TURN servers for testing
      // TODO: Replace with your own self-hosted TURN server later
      const iceServers = [
        // Free STUN servers for basic connectivity
        { urls: ["stun:stun.l.google.com:19302"] },
        { urls: ["stun:stun1.l.google.com:19302"] },

        // Public TURN servers for testing (rate limited)
        {
          urls: ["turn:openrelay.metered.ca:80"],
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: ["turn:openrelay.metered.ca:443"],
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: ["turn:openrelay.metered.ca:443?transport=tcp"],
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ];

      res.json({ ice_servers: iceServers });
    } catch (error) {
      console.error("Error generating ICE servers:", error);
      res.status(500).json({ message: "Server error generating ICE servers" });
    }
  });

  // Video Call routes
  app.post("/api/video-calls", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Parse request data
      const videoCallData = insertVideoCallSchema.parse(req.body);

      // Ensure the initiator is the current user
      if (videoCallData.initiatorId !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to initiate call as this user" });
      }

      // Verify that the match exists and user is part of it
      const match = await storage.getMatchById(videoCallData.matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.userId1 !== req.user.id && match.userId2 !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to start call in this match" });
      }

      // Generate a unique room name if not provided
      if (!videoCallData.roomName) {
        videoCallData.roomName = `charley-${randomBytes(10).toString("hex")}`;
      }

      // In a real implementation with Twilio, we would generate a token here
      // const token = twilioClient.tokens.create({
      //   identity: req.user.username,
      //   room: videoCallData.roomName
      // });

      // Create the video call record in our database
      const newVideoCall = await storage.createVideoCall(videoCallData);

      // Proactively notify the receiver via WebSocket that a call has been initiated.
      // This ensures the incoming call UI appears even if the caller's client misses sending the WS signal.
      try {
        const targetWs = connectedUsers.get(videoCallData.receiverId);
        console.log("📡 [WebSocket] Server-side call_initiate relay check:", {
          receiverId: videoCallData.receiverId,
          targetWsExists: !!targetWs,
          targetWsReady: targetWs?.readyState === WebSocket.OPEN,
          connectedUsersCount: connectedUsers.size,
          connectedUserIds: Array.from(connectedUsers.keys()),
        });
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          const initiatePayload = {
            type: "call_initiate",
            matchId: newVideoCall.matchId,
            callerId: newVideoCall.initiatorId,
            receiverId: newVideoCall.receiverId,
            toUserId: newVideoCall.receiverId,
            callId: newVideoCall.id,
            roomName: newVideoCall.roomName,
            timestamp: new Date().toISOString(),
          } as any;
          console.log(
            "📡 [WebSocket] Server-side initiating call signal:",
            initiatePayload,
          );
          targetWs.send(JSON.stringify(initiatePayload));
        } else {
          console.log(
            "📡 [WebSocket] Receiver not connected for server-side call_initiate",
            videoCallData.receiverId,
          );
        }
      } catch (e) {
        console.error("Error sending server-side call_initiate:", e);
      }

      // Return the video call details and token
      res.status(201).json({
        videoCall: newVideoCall,
        twilioToken: "DEMO_TOKEN", // This would be a real token in production
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error creating video call" });
    }
  });

  app.get("/api/video-calls/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const callId = parseInt(req.params.id);
    if (isNaN(callId)) {
      return res.status(400).json({ message: "Invalid call ID" });
    }

    try {
      const videoCall = await storage.getVideoCallById(callId);
      if (!videoCall) {
        return res.status(404).json({ message: "Video call not found" });
      }

      // Ensure user is part of this call
      if (
        videoCall.initiatorId !== req.user.id &&
        videoCall.receiverId !== req.user.id
      ) {
        return res
          .status(403)
          .json({ message: "Not authorized to access this call" });
      }

      // In a real implementation, generate a token for joining
      // const token = twilioClient.tokens.create({
      //   identity: req.user.username,
      //   room: videoCall.roomName
      // });

      res.json({
        videoCall,
        twilioToken: "DEMO_TOKEN", // This would be a real token in production
      });
    } catch (error) {
      res.status(500).json({ message: "Server error retrieving video call" });
    }
  });

  app.patch(
    "/api/video-calls/:id/status",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const callId = parseInt(req.params.id);
      if (isNaN(callId)) {
        return res.status(400).json({ message: "Invalid call ID" });
      }

      try {
        const { status } = req.body;
        if (!status || !["active", "completed", "declined"].includes(status)) {
          return res.status(400).json({
            message: "Valid status required (active, completed, or declined)",
          });
        }

        // Get the current video call
        const videoCall = await storage.getVideoCallById(callId);
        if (!videoCall) {
          return res.status(404).json({ message: "Video call not found" });
        }

        // Ensure user is part of this call
        if (
          videoCall.initiatorId !== req.user.id &&
          videoCall.receiverId !== req.user.id
        ) {
          return res
            .status(403)
            .json({ message: "Not authorized to update this call" });
        }

        // Set timestamps based on status
        const updateData: any = { status };
        if (status === "active" && !videoCall.startedAt) {
          updateData.startedAt = new Date();
        } else if (status === "completed" && !videoCall.endedAt) {
          updateData.endedAt = new Date();
        }

        const updatedCall = await storage.updateVideoCallStatus(
          callId,
          updateData,
        );

        try {
          // If declining, or completing a call that never started, create "no answer/missed" message
          const isDeclined = status === "declined";
          const isCompletedBeforeStart =
            status === "completed" && !videoCall.startedAt;

          if (isDeclined || isCompletedBeforeStart) {
            const callerId = videoCall.initiatorId;
            const receiverId = videoCall.receiverId;
            const matchIdForCall = videoCall.matchId;

            console.log(
              `📞 [CALL-SYSTEM][HTTP] Creating no-answer message for match=${matchIdForCall} caller=${callerId} receiver=${receiverId} (status=${status})`,
            );

            const callSystemMessage = await storage.createMessage({
              matchId: matchIdForCall,
              senderId: callerId,
              receiverId: receiverId,
              content: "_CALL:NO_ANSWER",
              messageType: "call",
              audioUrl: null,
              audioDuration: null,
            } as any);

            try {
              await storage.markMatchUnread(matchIdForCall, receiverId);
            } catch (e) {
              console.error(
                "[CALL-SYSTEM][HTTP] Failed to mark match unread:",
                e,
              );
            }

            // Broadcast to receiver (recipient)
            const rxWs = connectedUsers.get(receiverId);
            if (rxWs && rxWs.readyState === WebSocket.OPEN) {
              rxWs.send(
                JSON.stringify({
                  type: "new_message",
                  message: callSystemMessage,
                  for: "recipient",
                  receiptId: `call_no_answer_${callSystemMessage?.id}_rx_http`,
                  timestamp: new Date().toISOString(),
                }),
              );
            }

            // Broadcast to caller (sender)
            const txWs = connectedUsers.get(callerId);
            if (txWs && txWs.readyState === WebSocket.OPEN) {
              txWs.send(
                JSON.stringify({
                  type: "new_message",
                  message: callSystemMessage,
                  for: "sender",
                  receiptId: `call_no_answer_${callSystemMessage?.id}_tx_http`,
                  timestamp: new Date().toISOString(),
                }),
              );
            }
          }
        } catch (e) {
          console.error(
            "[CALL-SYSTEM][HTTP] Error creating/broadcasting no-answer:",
            e,
          );
        }

        res.json(updatedCall);
      } catch (error) {
        res.status(500).json({ message: "Server error updating video call" });
      }
    },
  );

  // Agora Video Call routes
  app.post("/api/agora-calls", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Parse request data for Agora call
      const { matchId, initiatorId, receiverId, channel, status } = req.body;

      // Validate input
      if (!matchId || !initiatorId || !receiverId || !channel) {
        return res.status(400).json({ 
          message: "matchId, initiatorId, receiverId, and channel are required" 
        });
      }

      // Ensure the initiator is the current user
      if (initiatorId !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to initiate call as this user" });
      }

      // Verify that the match exists and user is part of it
      const match = await storage.getMatchById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.userId1 !== req.user.id && match.userId2 !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to start call in this match" });
      }

      // Create the video call record in our database
      const videoCallData = {
        matchId,
        initiatorId,
        receiverId,
        roomName: channel,
        status: status || "pending"
      };

      const newCall = await storage.createVideoCall(videoCallData);

      // Generate Agora configuration (in production, you would get these from environment variables)
      const agoraConfig = {
        appId: process.env.AGORA_APP_ID || "demo-app-id", // Replace with actual Agora App ID
        channel: channel,
        token: null, // In production, generate a token using Agora SDK
      };

      // Proactively notify the receiver via WebSocket
      try {
        const targetWs = connectedUsers.get(receiverId);
        console.log("📞 [AgoraCall] Server-side call_initiate relay check:", {
          receiverId,
          targetWsExists: !!targetWs,
          targetWsReady: targetWs?.readyState === WebSocket.OPEN,
        });
        
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          const initiatePayload = {
            type: "call_initiate",
            matchId: newCall.matchId,
            callerId: newCall.initiatorId,
            receiverId: newCall.receiverId,
            toUserId: newCall.receiverId,
            callId: newCall.id,
            roomName: newCall.roomName,
            timestamp: new Date().toISOString(),
          };
          
          console.log("📞 [AgoraCall] Server-side initiating call signal:", initiatePayload);
          targetWs.send(JSON.stringify(initiatePayload));
        } else {
          console.log("📞 [AgoraCall] Receiver not connected for server-side call_initiate", receiverId);
        }
      } catch (e) {
        console.error("Error sending server-side call_initiate:", e);
      }

      // Return the call details and Agora configuration
      res.status(201).json({
        call: newCall,
        agoraConfig,
      });
    } catch (error) {
      console.error("Error creating Agora call:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Server error creating Agora call" });
    }
  });

  app.get("/api/agora-calls/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const callId = parseInt(req.params.id);
    if (isNaN(callId)) {
      return res.status(400).json({ message: "Invalid call ID" });
    }

    try {
      const call = await storage.getVideoCallById(callId);
      if (!call) {
        return res.status(404).json({ message: "Agora call not found" });
      }

      // Ensure user is part of this call
      if (call.initiatorId !== req.user.id && call.receiverId !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to access this call" });
      }

      // Generate Agora configuration
      const agoraConfig = {
        appId: process.env.AGORA_APP_ID || "demo-app-id",
        channel: call.roomName,
        token: null, // In production, generate a token
      };

      res.json({
        call,
        agoraConfig,
      });
    } catch (error) {
      console.error("Error retrieving Agora call:", error);
      res.status(500).json({ message: "Server error retrieving Agora call" });
    }
  });

  app.patch("/api/agora-calls/:id/status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const callId = parseInt(req.params.id);
    if (isNaN(callId)) {
      return res.status(400).json({ message: "Invalid call ID" });
    }

    try {
      const { status } = req.body;
      if (!status || !["active", "completed", "declined", "cancelled"].includes(status)) {
        return res.status(400).json({
          message: "Valid status required (active, completed, declined, or cancelled)",
        });
      }

      // Get the current call
      const call = await storage.getVideoCallById(callId);
      if (!call) {
        return res.status(404).json({ message: "Agora call not found" });
      }

      // Ensure user is part of this call
      if (call.initiatorId !== req.user.id && call.receiverId !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to update this call" });
      }

      // Set timestamps based on status
      const updateData: any = { status };
      if (status === "active" && !call.startedAt) {
        updateData.startedAt = new Date();
      } else if (status === "completed" && !call.endedAt) {
        updateData.endedAt = new Date();
      }

      const updatedCall = await storage.updateVideoCallStatus(callId, updateData);

      // Handle no-answer messages for declined or cancelled calls
      try {
        const isDeclined = status === "declined";
        const isCancelled = status === "cancelled";
        const isCompletedBeforeStart = status === "completed" && !call.startedAt;

        if (isDeclined || isCancelled || isCompletedBeforeStart) {
          const callerId = call.initiatorId;
          const receiverId = call.receiverId;
          const matchIdForCall = call.matchId;

          console.log(
            `📞 [AGORA-CALL] Creating no-answer message for match=${matchIdForCall} caller=${callerId} receiver=${receiverId} (status=${status})`,
          );

          const callSystemMessage = await storage.createMessage({
            matchId: matchIdForCall,
            senderId: callerId,
            receiverId: receiverId,
            content: "_CALL:NO_ANSWER",
            messageType: "call",
            audioUrl: null,
            audioDuration: null,
          } as any);

          try {
            await storage.markMatchUnread(matchIdForCall, receiverId);
          } catch (e) {
            console.error("[AGORA-CALL] Failed to mark match unread:", e);
          }

          // Broadcast to receiver
          const rxWs = connectedUsers.get(receiverId);
          if (rxWs && rxWs.readyState === WebSocket.OPEN) {
            rxWs.send(
              JSON.stringify({
                type: "new_message",
                message: callSystemMessage,
                for: "recipient",
                receiptId: `agora_call_no_answer_${callSystemMessage?.id}_rx`,
                timestamp: new Date().toISOString(),
              }),
            );
          }

          // Broadcast to caller
          const txWs = connectedUsers.get(callerId);
          if (txWs && txWs.readyState === WebSocket.OPEN) {
            txWs.send(
              JSON.stringify({
                type: "new_message",
                message: callSystemMessage,
                for: "sender",
                receiptId: `agora_call_no_answer_${callSystemMessage?.id}_tx`,
                timestamp: new Date().toISOString(),
              }),
            );
          }
        }
      } catch (e) {
        console.error("[AGORA-CALL] Error creating/broadcasting no-answer:", e);
      }

      res.json(updatedCall);
    } catch (error) {
      console.error("Error updating Agora call:", error);
      res.status(500).json({ message: "Server error updating Agora call" });
    }
  });

  // Phone verification cache (phone number → timestamp of last request)
  const phoneVerificationCache = new Map();
  // Phone verification rate limit (3 seconds)
  const PHONE_RATE_LIMIT = 3000;

  // Phone Verification routes - Optimized for performance
  app.post("/api/verify/phone/send", async (req: Request, res: Response) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // CRITICAL: Check if phone number is blocked (age compliance)
      console.log(
        `[AGE-COMPLIANCE] Checking if phone number ${phoneNumber} is blocked`,
      );
      const isBlocked = await storage.isPhoneNumberBlocked(phoneNumber);
      if (isBlocked) {
        console.log(
          `[AGE-COMPLIANCE] Blocked phone number attempted registration: ${phoneNumber}`,
        );
        const blockedRecord = await storage.getBlockedPhoneNumber(phoneNumber);

        // Return generic error message for security
        return res.status(403).json({
          message:
            "This phone number cannot be used for registration. Please contact admin@kronogon.com or call Customer Service on +1 (469) 496-5620 for assistance.",
          blocked: true,
          reason: blockedRecord?.reason || "Compliance violation",
        });
      }

      // Apply rate limiting to prevent DDoS and improve performance
      const lastVerificationAttempt = phoneVerificationCache.get(phoneNumber);
      const now = Date.now();

      if (
        lastVerificationAttempt &&
        now - lastVerificationAttempt < PHONE_RATE_LIMIT
      ) {
        // Return the same response but don't perform any database operations
        return res.status(200).json({
          message: `Verification code sent to ${phoneNumber} (throttled)`,
          phoneNumber,
          codeLength: 7,
          expiresAt: new Date(now + 10 * 60 * 1000),
          skipVerification: false,
        });
      }

      // Update the cache with the current timestamp
      phoneVerificationCache.set(phoneNumber, now);

      // Check if phone number already exists for a user - no need for extensive logging
      const existingUser = await storage.getUserByPhoneNumber(phoneNumber);

      // For existing users, check if two-factor authentication is enabled
      if (existingUser && existingUser.twoFactorEnabled === false) {
        // Skip verification code for users with 2FA disabled
        return res.status(200).json({
          message: "User found with two-factor authentication disabled",
          skipVerification: true,
          user: {
            id: existingUser.id,
            username: existingUser.username,
          },
        });
      }

      // Generate a 7-digit verification code
      const code = Math.floor(1000000 + Math.random() * 9000000).toString();

      // Set expiration time to 10 minutes from now
      const expiresAt = new Date(now + 10 * 60 * 1000);

      // Store the verification code in the database
      await storage.createVerificationCode({
        phoneNumber,
        code,
        expiresAt,
      });

      // Skip cleanup on every request - move to a cron job or scheduled task
      // Instead of running deleteExpiredVerificationCodes on every verification
      // We'll do it only every ~100 verifications
      if (Math.random() < 0.01) {
        // Only run cleanup occasionally to avoid performance impact
        storage
          .deleteExpiredVerificationCodes()
          .catch((err) => console.error("Background cleanup error:", err));
      }

      // In a real implementation, we would send an SMS with Twilio:
      /*
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        try {
          await twilioClient.messages.create({
            body: `Your CHARLEY verification code is: ${code}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
          });
        } catch (twilioError) {
          console.error("Error sending SMS:", twilioError);
          return res.status(500).json({ message: "Error sending SMS verification code" });
        }
      }
      */

      // For development, return the code in the response (would be removed in production)
      res.status(200).json({
        message: "Verification code sent successfully",
        code: code, // Remove this line in production
      });
    } catch (error) {
      console.error("Phone verification error:", error);
      console.error("Full error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });

      // Check if it's a table/relation error
      if (error.message?.includes("relation") || error.code === "42P01") {
        console.error("❌ Database table 'verification_codes' does not exist!");
        console.error("💡 Run: npx drizzle-kit push to create missing tables");
        res.status(500).json({
          message:
            "Database configuration error - verification_codes table missing",
        });
      } else {
        res.status(500).json({
          message: "Server error sending verification code",
        });
      }
    }
  });

  // Block phone number endpoint for age compliance
  app.post("/api/phone/block", async (req: Request, res: Response) => {
    try {
      const { phoneNumber, fullName, email, reason, metadata } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      if (!reason) {
        return res.status(400).json({ message: "Reason is required" });
      }

      console.log(
        `[AGE-COMPLIANCE] Blocking phone number ${phoneNumber} for ${fullName || "Unknown User"} (${email || "No Email"}) - Reason: ${reason}`,
      );

      // Check if phone number is already blocked
      const alreadyBlocked = await storage.isPhoneNumberBlocked(phoneNumber);
      if (alreadyBlocked) {
        console.log(
          `[AGE-COMPLIANCE] Phone number ${phoneNumber} already blocked`,
        );
        return res.status(200).json({
          message: "Phone number is already blocked",
          alreadyBlocked: true,
        });
      }

      // Add phone number to blocked list with user information
      const blockedRecord = await storage.addBlockedPhoneNumber(
        phoneNumber,
        reason,
        fullName,
        email,
        metadata,
      );

      console.log(
        `[AGE-COMPLIANCE] Successfully blocked phone number ${phoneNumber} with ID ${blockedRecord.id}`,
      );

      // Send apology email if user provided email and was blocked for age reasons
      if (email && fullName && reason.includes("under 14")) {
        console.log(
          `[AGE-COMPLIANCE] Sending apology email to blocked user: ${email}`,
        );

        try {
          // Import SendGrid service dynamically
          const { sendUnderAgeApologyEmail } = await import(
            "./services/sendgrid.js"
          );

          // Extract date of birth from metadata if available
          let dateOfBirth = null;
          if (metadata) {
            try {
              const parsedMetadata = JSON.parse(metadata);
              dateOfBirth = parsedMetadata.dateOfBirth;
            } catch (parseError) {
              console.warn(
                `[AGE-COMPLIANCE] Could not parse metadata for email: ${parseError}`,
              );
            }
          }

          // Send apology email
          const emailSent = await sendUnderAgeApologyEmail({
            name: fullName,
            email: email,
            dateOfBirth: dateOfBirth,
          });

          if (emailSent) {
            console.log(
              `[AGE-COMPLIANCE] Apology email sent successfully to blocked user: ${email}`,
            );
          } else {
            console.error(
              `[AGE-COMPLIANCE] Failed to send apology email to blocked user: ${email}`,
            );
          }
        } catch (emailError) {
          console.error(
            `[AGE-COMPLIANCE] Error sending apology email to ${email}:`,
            emailError,
          );
        }
      }

      res.status(200).json({
        message: "Phone number has been successfully blocked",
        blocked: true,
        id: blockedRecord.id,
      });
    } catch (error) {
      console.error("[AGE-COMPLIANCE] Error blocking phone number:", error);
      res.status(500).json({
        message: "Server error blocking phone number",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Password Reset Routes with 7-digit code system
  app.post(
    "/api/password/send-reset-code",
    async (req: Request, res: Response) => {
      try {
        const { email } = req.body;

        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }

        // Check if user exists with this email
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res
            .status(404)
            .json({ message: "No user found with this email address" });
        }

        // Generate a 7-digit reset code
        const resetCode = Math.floor(
          1000000 + Math.random() * 9000000,
        ).toString();

        // Set expiry to 10 minutes from now
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // Store the reset code in database
        await db().insert(passwordResetCodes).values({
          email: email,
          resetCode: resetCode,
          isUsed: false,
          expiresAt: expiresAt,
        });

        // Send email with reset code
        const emailSent = await sendEmail(process.env.SENDGRID_API_KEY!, {
          to: email,
          from: "admin@kronogon.com",
          subject: "CHARLEY - Password Reset Code",
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px;">
            <div style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 30px; text-align: center;">
              <h1 style="color: #4f46e5; margin-bottom: 20px; font-size: 28px;">Password Reset Code</h1>

              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h2 style="color: white; font-size: 36px; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">${resetCode}</h2>
              </div>

              <p style="color: #374151; font-size: 16px; margin: 20px 0;">
                Use this 7-digit code to reset your CHARLEY password. This code expires in 10 minutes.
              </p>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you didn't request this password reset, please ignore this email.
              </p>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  From the BTechnos Team<br>
                  CHARLEY - Connecting Communities Worldwide
                </p>
              </div>
            </div>
          </div>
        `,
          text: `Your CHARLEY password reset code is: ${resetCode}. This code expires in 10 minutes. If you didn't request this, please ignore this email.`,
        });

        if (emailSent) {
          res.status(200).json({
            message: "Reset code sent to your email",
            success: true,
          });
        } else {
          res.status(500).json({ message: "Failed to send reset code" });
        }
      } catch (error) {
        console.error("Password reset code error:", error);
        res
          .status(500)
          .json({ message: "Server error during password reset request" });
      }
    },
  );

  app.post(
    "/api/password/verify-reset-code",
    async (req: Request, res: Response) => {
      try {
        const { email, resetCode } = req.body;

        if (!email || !resetCode) {
          return res
            .status(400)
            .json({ message: "Email and reset code are required" });
        }

        // Find valid reset code
        const validCode = await db
          .select()
          .from(passwordResetCodes)
          .where(
            and(
              eq(passwordResetCodes.email, email),
              eq(passwordResetCodes.resetCode, resetCode),
              eq(passwordResetCodes.isUsed, false),
              gte(passwordResetCodes.expiresAt, new Date()),
            ),
          )
          .limit(1);

        if (validCode.length === 0) {
          return res
            .status(400)
            .json({ message: "Invalid or expired reset code" });
        }

        res.status(200).json({
          message: "Reset code verified successfully",
          success: true,
        });
      } catch (error) {
        console.error("Reset code verification error:", error);
        res
          .status(500)
          .json({ message: "Server error during code verification" });
      }
    },
  );

  app.post(
    "/api/password/reset-with-code",
    async (req: Request, res: Response) => {
      try {
        const { email, resetCode, newPassword } = req.body;

        if (!email || !resetCode || !newPassword) {
          return res.status(400).json({
            message: "Email, reset code, and new password are required",
          });
        }

        // Find and validate reset code
        const validCode = await db
          .select()
          .from(passwordResetCodes)
          .where(
            and(
              eq(passwordResetCodes.email, email),
              eq(passwordResetCodes.resetCode, resetCode),
              eq(passwordResetCodes.isUsed, false),
              gte(passwordResetCodes.expiresAt, new Date()),
            ),
          )
          .limit(1);

        if (validCode.length === 0) {
          return res
            .status(400)
            .json({ message: "Invalid or expired reset code" });
        }

        // Get user by email
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Hash the new password
        const hashedPassword = await hashPassword(newPassword);

        // Update user's password
        await storage.updateUserPassword(user.id, hashedPassword);

        // Mark reset code as used
        await db
          .update(passwordResetCodes)
          .set({ isUsed: true })
          .where(eq(passwordResetCodes.id, validCode[0].id));

        res.status(200).json({
          message: "Password reset successfully",
          success: true,
        });
      } catch (error) {
        console.error("Password reset error:", error);
        res.status(500).json({ message: "Server error during password reset" });
      }
    },
  );

  // Password change endpoint for authenticated users
  app.post("/api/password/change", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ message: "New password must be at least 6 characters long" });
      }

      // Get the user from the database
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify the current password
      const isPasswordValid = await comparePasswords(
        currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // Update the password in the database
      await storage.updateUserPassword(user.id, hashedPassword);

      // Send security notification email for password change (asynchronous - non-blocking)
      const userAgent = req.get("User-Agent") || "Unknown";
      const ipAddress = req.ip || req.connection.remoteAddress || "Unknown";

      console.log(
        `[SECURITY-NOTIFICATION] Sending password change notification for user ${user.id}`,
      );
      sendSecurityChangeNotification({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        changeType: "password",
        userAgent,
        ipAddress,
      }).catch((error) => {
        console.error(
          "[SECURITY-NOTIFICATION] Error sending password change notification:",
          error,
        );
      });

      // CRITICAL SECURITY FIX: Invalidate the current session to force re-login
      // This ensures only the new password works after password change
      req.logout((err) => {
        if (err) {
          console.error("Error logging out user after password change:", err);
          return res
            .status(500)
            .json({ message: "Password changed but logout failed" });
        }

        // Destroy the session completely
        req.session.destroy((sessionErr) => {
          if (sessionErr) {
            console.error(
              "Error destroying session after password change:",
              sessionErr,
            );
            return res
              .status(500)
              .json({ message: "Password changed but session cleanup failed" });
          }

          // Clear the session cookie
          res.clearCookie("connect.sid");

          return res.status(200).json({
            success: true,
            message:
              "Password successfully changed. Please log in again with your new password.",
            requiresRelogin: true,
          });
        });
      });
    } catch (error) {
      console.error("Error changing password:", error);
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack trace",
      );
      console.error("Error details:", JSON.stringify(error));
      res.status(500).json({ message: "Server error during password change" });
    }
  });

  // Premium access endpoints with subscription expiry checking
  app.get("/api/premium/status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If user has a Stripe subscription ID, check real-time status from Stripe
      if (user.stripeSubscriptionId && stripe) {
        try {
          console.log(
            `[STRIPE-SYNC] Checking real-time subscription status for user ${userId}, subscription: ${user.stripeSubscriptionId}`,
          );

          const stripeSubscription = await stripe.subscriptions.retrieve(
            user.stripeSubscriptionId,
          );

          console.log(`[STRIPE-SYNC] Stripe subscription details:`);
          console.log(`[STRIPE-SYNC] - Status: ${stripeSubscription.status}`);
          console.log(
            `[STRIPE-SYNC] - Cancel at period end: ${stripeSubscription.cancel_at_period_end}`,
          );
          console.log(
            `[STRIPE-SYNC] - Current period end: ${new Date((stripeSubscription as any).current_period_end * 1000)}`,
          );
          console.log(
            `[STRIPE-SYNC] - Current database status: ${user.subscriptionStatus}`,
          );

          // Update local database with current Stripe status
          let localSubscriptionStatus = user.subscriptionStatus;
          let localPremiumAccess = user.premiumAccess;
          let localSubscriptionExpiresAt = user.subscriptionExpiresAt;

          if (stripeSubscription.status === "active") {
            console.log(`[STRIPE-SYNC] User ${userId} has active subscription`);

            if (stripeSubscription.cancel_at_period_end) {
              // Active subscription scheduled for cancellation = grace period
              console.log(
                `[STRIPE-SYNC] - Subscription scheduled for cancellation at period end (grace period)`,
              );
              localSubscriptionStatus = "canceled";
              localPremiumAccess = true;
              localSubscriptionExpiresAt = new Date(
                (stripeSubscription as any).current_period_end * 1000,
              );
            } else {
              // Truly active subscription
              console.log(
                `[STRIPE-SYNC] - Subscription is truly active (not scheduled for cancellation)`,
              );
              localSubscriptionStatus = "active";
              localPremiumAccess = true;
              localSubscriptionExpiresAt = new Date(
                (stripeSubscription as any).current_period_end * 1000,
              );
            }
          } else if (
            stripeSubscription.status === "canceled" ||
            stripeSubscription.status === "unpaid"
          ) {
            // Subscription canceled - check if still in grace period
            const currentPeriodEnd = new Date(
              (stripeSubscription as any).current_period_end * 1000,
            );
            const now = new Date();

            if (now < currentPeriodEnd) {
              // Still in grace period - user keeps premium access until period ends
              localSubscriptionStatus = "canceled";
              localPremiumAccess = true;
              localSubscriptionExpiresAt = currentPeriodEnd;
            } else {
              // Grace period expired
              localSubscriptionStatus = "expired";
              localPremiumAccess = false;
              localSubscriptionExpiresAt = currentPeriodEnd;
            }
          }

          // Update database if status changed
          if (
            localSubscriptionStatus !== user.subscriptionStatus ||
            localPremiumAccess !== user.premiumAccess
          ) {
            console.log(
              `[STRIPE-SYNC] Updating user ${userId} status from Stripe: ${stripeSubscription.status}, premium: ${localPremiumAccess}`,
            );

            await storage.updateUserProfile(userId, {
              subscriptionStatus: localSubscriptionStatus,
              premiumAccess: localPremiumAccess,
              subscriptionExpiresAt: localSubscriptionExpiresAt,
            });
          }

          return res.json({
            premiumAccess: localPremiumAccess,
            subscriptionStatus: localSubscriptionStatus,
            subscriptionExpiresAt: localSubscriptionExpiresAt,
            gracePeriodActive:
              localSubscriptionStatus === "canceled" && localPremiumAccess,
            stripeStatus: stripeSubscription.status,
            stripeCancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          });
        } catch (stripeError) {
          console.error(
            `[STRIPE-SYNC] Error checking Stripe subscription for user ${userId}:`,
            stripeError,
          );
          // Fall through to local database check
        }
      }

      // Check if subscription has expired and user should lose premium access (local database check)
      if (
        user.subscriptionExpiresAt &&
        user.subscriptionStatus === "canceled"
      ) {
        const now = new Date();
        const expiresAt = new Date(user.subscriptionExpiresAt);

        if (now > expiresAt && user.premiumAccess) {
          console.log(
            `[SUBSCRIPTION-EXPIRY] User ${userId} subscription expired at ${expiresAt}, removing premium access`,
          );

          // Remove premium access - grace period has ended
          await storage.updateUserProfile(userId, {
            premiumAccess: false,
            subscriptionStatus: "expired",
          });

          return res.json({
            premiumAccess: false,
            subscriptionExpired: true,
            expiredAt: expiresAt,
          });
        }
      }

      res.json({
        premiumAccess: user.premiumAccess || false,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        gracePeriodActive:
          user.subscriptionStatus === "canceled" && user.premiumAccess,
      });
    } catch (error) {
      console.error("Error getting premium status:", error);
      res.status(500).json({ message: "Server error getting premium status" });
    }
  });

  app.post("/api/premium/toggle", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { premiumAccess } = req.body;

      if (typeof premiumAccess !== "boolean") {
        return res
          .status(400)
          .json({ message: "premiumAccess must be a boolean" });
      }

      const userId = req.user.id;
      console.log(
        `[PREMIUM-TOGGLE] User ${userId} toggling premium access to: ${premiumAccess}`,
      );

      // Simple toggle without complex Stripe sync
      await storage.updateUserProfile(userId, {
        premiumAccess: premiumAccess,
      });

      const updatedUser = await storage.getUser(userId);

      res.json({
        message: "Premium access updated successfully",
        premiumAccess: updatedUser?.premiumAccess || false,
      });
    } catch (error: any) {
      console.error("[PREMIUM-TOGGLE] Error:", error);
      res.status(500).json({
        message: "Server error updating premium access",
        error: error.message,
      });
    }
  });

  // Subscription cancellation endpoint for real Stripe subscription users
  app.post("/api/subscription/cancel", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(
        `[SUBSCRIPTION-CANCEL] User ${userId} requesting subscription cancellation`,
      );

      // Check if user has a Stripe subscription to cancel
      if (!user.stripeSubscriptionId) {
        console.log(
          `[SUBSCRIPTION-CANCEL] User ${userId} has no Stripe subscription, just removing premium access`,
        );

        // Just toggle premium access for non-subscription users
        await storage.updateUserProfile(userId, {
          premiumAccess: false,
        });

        return res.json({
          message: "Premium access cancelled successfully",
          gracePeriod: false,
          premiumAccess: false,
        });
      }

      // Cancel the Stripe subscription with grace period
      if (stripe) {
        try {
          console.log(
            `[SUBSCRIPTION-CANCEL] Canceling Stripe subscription: ${user.stripeSubscriptionId}`,
          );

          const canceledSubscription = await stripe.subscriptions.update(
            user.stripeSubscriptionId,
            {
              cancel_at_period_end: true,
            },
          );

          console.log(
            `[SUBSCRIPTION-CANCEL] Stripe subscription canceled with grace period until: ${new Date(canceledSubscription.current_period_end * 1000)}`,
          );

          // Update user to grace period status
          await storage.updateUserProfile(userId, {
            subscriptionStatus: "canceled",
            subscriptionCanceledAt: new Date(),
            // Keep premiumAccess: true during grace period
            // subscriptionExpiresAt stays the same for grace period end
          });

          // Create cancellation event
          try {
            const subscription = await storage.getSubscriptionByStripeId(
              user.stripeSubscriptionId,
            );
            if (subscription) {
              await storage.createSubscriptionEvent({
                subscriptionId: subscription.id,
                userId: userId,
                eventType: "subscription_canceled",
                provider: "stripe",
                providerEventId: canceledSubscription.id,
                oldStatus: "active",
                newStatus: "canceled",
                metadata: JSON.stringify({
                  canceledAt: new Date().toISOString(),
                  gracePeriodEnd: new Date(
                    canceledSubscription.current_period_end * 1000,
                  ).toISOString(),
                  cancelAtPeriodEnd: true,
                }),
              });
              console.log(
                `[SUBSCRIPTION-CANCEL] Created cancellation event for subscription: ${subscription.id}`,
              );
            }
          } catch (eventError) {
            console.error(
              `[SUBSCRIPTION-CANCEL] Failed to create cancellation event:`,
              eventError,
            );
          }

          const gracePeriodEnd = new Date(
            canceledSubscription.current_period_end * 1000,
          );

          res.json({
            message:
              "Subscription cancelled successfully. You'll retain premium access until your billing period ends.",
            gracePeriod: true,
            gracePeriodEnd: gracePeriodEnd,
            premiumAccess: true,
            subscriptionStatus: "canceled",
          });
        } catch (stripeError: any) {
          console.error(
            `[SUBSCRIPTION-CANCEL] Stripe cancellation failed:`,
            stripeError,
          );

          if (stripeError.code === "resource_missing") {
            // Subscription doesn't exist in Stripe, just update local status
            console.log(
              `[SUBSCRIPTION-CANCEL] Subscription not found in Stripe, updating local status only`,
            );

            await storage.updateUserProfile(userId, {
              premiumAccess: false,
              subscriptionStatus: "expired",
              stripeSubscriptionId: null,
            });

            return res.json({
              message: "Premium access cancelled successfully",
              gracePeriod: false,
              premiumAccess: false,
            });
          }

          throw stripeError;
        }
      } else {
        // Stripe not configured, just remove premium access
        console.log(
          `[SUBSCRIPTION-CANCEL] Stripe not configured, removing premium access locally`,
        );

        await storage.updateUserProfile(userId, {
          premiumAccess: false,
        });

        res.json({
          message: "Premium access cancelled successfully",
          gracePeriod: false,
          premiumAccess: false,
        });
      }
    } catch (error: any) {
      console.error("[SUBSCRIPTION-CANCEL] Error:", error);
      res.status(500).json({
        message: "Server error cancelling subscription",
        error: error.message,
      });
    }
  });

  // Background job endpoint to check and expire subscriptions
  app.post(
    "/api/subscriptions/check-expiry",
    async (req: Request, res: Response) => {
      try {
        console.log(
          `[SUBSCRIPTION-EXPIRY] Checking for expired subscriptions...`,
        );

        // Find users with canceled subscriptions that should expire
        const expiredUsers = await db
          .select()
          .from(users)
          .where(
            sql`subscription_status = 'canceled' 
              AND premium_access = true 
              AND subscription_expires_at < NOW()`,
          );

        let expiredCount = 0;

        for (const user of expiredUsers) {
          console.log(
            `[SUBSCRIPTION-EXPIRY] Expiring subscription for user ${user.id}`,
          );

          await storage.updateUserProfile(user.id, {
            premiumAccess: false,
            subscriptionStatus: "expired",
          });

          expiredCount++;
        }

        console.log(
          `[SUBSCRIPTION-EXPIRY] Expired ${expiredCount} subscriptions`,
        );

        res.json({
          success: true,
          expiredCount: expiredCount,
          message: `Expired ${expiredCount} subscriptions`,
        });
      } catch (error) {
        console.error("[SUBSCRIPTION-EXPIRY] Error checking expiry:", error);
        res.status(500).json({
          success: false,
          error: "Failed to check subscription expiry",
        });
      }
    },
  );

  app.post("/api/verify/phone/check", async (req: Request, res: Response) => {
    try {
      const { phoneNumber, code } = req.body;
      if (!phoneNumber || !code) {
        return res
          .status(400)
          .json({ message: "Phone number and verification code are required" });
      }

      // Check if the code matches and is valid
      const verification = await storage.getVerificationCode(phoneNumber, code);
      if (!verification) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Check if code has expired
      if (verification.expiresAt < new Date()) {
        await storage.deleteVerificationCode(verification.id);
        return res
          .status(400)
          .json({ message: "Verification code has expired" });
      }

      // Delete the verification code after successful verification
      await storage.deleteVerificationCode(verification.id);

      // Check if a user with this phone number already exists
      const existingUser = await storage.getUserByPhoneNumber(phoneNumber);

      if (existingUser) {
        // User exists - log them in automatically
        // Update user as verified by phone
        await storage.updateUserProfile(existingUser.id, {
          verifiedByPhone: true,
        } as Partial<UserProfile>);

        // Log the user in by starting a session
        req.login(existingUser, (err) => {
          if (err) {
            console.error(
              "Error logging in existing user after phone verification:",
              err,
            );
            return res
              .status(500)
              .json({ message: "Error logging in after verification" });
          }

          // Don't send password in response
          const { password, ...userWithoutPassword } = existingUser;

          res.status(200).json({
            message: "Phone number verified. User logged in successfully.",
            user: userWithoutPassword,
          });
        });
      } else {
        // No user exists with this phone number
        // Return success without creating a user - client will handle profile creation
        res.status(200).json({
          message: "Phone number verified. Please complete your profile.",
          phoneNumber: phoneNumber,
        });
      }
    } catch (error) {
      console.error("Phone verification check error:", error);
      res.status(500).json({ message: "Server error verifying code" });
    }
  });

  // Account deletion endpoint with password verification
  app.post("/api/user/delete", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { password } = req.body;
      const userId = req.user.id; // Use authenticated user's ID

      // Get the user from the database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify password
      const passwordValid = await comparePasswords(password, user.password);
      if (!passwordValid) {
        return res.status(400).json({
          message:
            "Password verification failed. Please enter your correct password.",
        });
      }

      console.log(
        `User ${userId} requested account deletion with valid password`,
      );

      // Cancel Stripe subscription if user has one
      let subscriptionCanceled = false;
      if (stripe && user.stripeSubscriptionId) {
        try {
          console.log(
            `[STRIPE-CANCELLATION] Canceling subscription ${user.stripeSubscriptionId} for user ${userId}`,
          );

          // Cancel the subscription immediately (not at period end)
          const canceledSubscription = await stripe.subscriptions.cancel(
            user.stripeSubscriptionId,
          );

          console.log(
            `[STRIPE-CANCELLATION] Successfully canceled subscription: ${canceledSubscription.id}, status: ${canceledSubscription.status}`,
          );
          subscriptionCanceled = true;

          // Update user subscription status in database
          await storage.updateUser(userId, {
            subscriptionStatus: "canceled",
            subscriptionCanceledAt: new Date(),
            premiumAccess: false,
          });
        } catch (error) {
          console.error(
            `[STRIPE-CANCELLATION] Error canceling subscription for user ${userId}:`,
            error,
          );
          // Continue with account deletion even if subscription cancellation fails
          // This ensures the user can still delete their account
        }
      } else if (user.stripeSubscriptionId && !stripe) {
        console.warn(
          `[STRIPE-CANCELLATION] User ${userId} has subscription ${user.stripeSubscriptionId} but Stripe is not initialized`,
        );
      }

      // Log the user out first
      req.logout((err) => {
        if (err) {
          console.error(
            `Error logging out user ${userId} during account deletion:`,
            err,
          );
          return res
            .status(500)
            .json({ message: "Error during logout process" });
        }

        // Proceed with account deletion after successful logout
        storage
          .deleteUser(userId)
          .then(() => {
            console.log(`User ${userId} successfully deleted`);
            const responseMessage = subscriptionCanceled
              ? "Account and subscription successfully canceled and deleted"
              : "Account successfully deleted";

            res.status(200).json({
              message: responseMessage,
              redirectUrl: "/auth",
            });
          })
          .catch((error) => {
            console.error(`Error deleting user ${userId}:`, error);
            res.status(500).json({
              message: "Server error deleting account. Please try again later.",
            });
          });
      });
    } catch (error) {
      console.error("Account deletion error:", error);
      res.status(500).json({
        message: "Server error processing account deletion request",
      });
    }
  });

  // Deactivate profile endpoint
  app.post(
    "/api/user/deactivate-profile",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;

        // Enhanced profile deactivation: reset all MY INFO fields and disable their visibility toggles
        await storage.updateUser(userId, {
          hasActivatedProfile: false,
          profileHidden: true, // Also hide the profile
          // Reset all MY INFO fields to null (Not specified)
          bio: null,
          location: null,
          countryOfOrigin: null,
          profession: null,
          religion: null,
          ethnicity: null,
          secondaryTribe: null,
          relationshipStatus: null,
          relationshipGoal: null,
          highSchool: null,
          collegeUniversity: null,
          interests: null,
          educationLevel: null,
          // Reset optional profile fields
          hasChildren: null,
          wantsChildren: null,
          smoking: null,
          drinking: null,
          // Reset OTHER section fields - Body Type and Height
          bodyType: null,
          height: null,
          // Reset photo visibility toggle
          showProfilePhoto: false,
          // Reset visibility preferences to disable MY INFO toggles only
          visibilityPreferences: JSON.stringify({
            bio: false,
            location: false,
            countryOfOrigin: false,
            profession: false,
            religion: false,
            ethnicity: false,
            relationshipStatus: false,
            relationshipGoal: false,
            highSchool: false,
            collegeUniversity: false,
            interests: false,
          }),
        });

        // Reset ALL Dating Preferences fields to null when MEET profile is deactivated
        try {
          const preferences = await storage.getUserPreferences(userId);
          if (preferences) {
            // CRITICAL FIX: Use preferences.id (the record ID), not userId
            await storage.updateUserPreferences(preferences.id, {
              // Reset children preferences
              hasChildrenPreference: null,
              wantsChildrenPreference: null,
              // Reset age range preferences to NULL
              minAge: null,
              maxAge: null,
              // Reset height range preferences to NULL
              minHeightPreference: null,
              maxHeightPreference: null,
              // Reset distance preference to NULL
              distancePreference: null,
              // Reset the 10 additional dating preference fields to NULL
              bodyTypePreference: null, // 1. Body Type
              religionPreference: null, // 3. Religion
              ethnicityPreference: null, // 4. Ghanaian Tribes
              educationLevelPreference: null, // 5. Education Level
              highSchoolPreference: null, // 6. High School Preferences (under-18 only)
              interestPreferences: null, // 7. Interests
              matchingPriorities: null, // 7. Matching Priorities
              dealBreakers: null, // 8. Deal Breakers
              relationshipGoalPreference: null, // 9. Relationship Goals
            });
            console.log(
              `CRITICAL BUG FIXED: Reset ALL Dating Preferences (age, height, distance + 9 additional fields) to NULL for user ${userId} using preferences record ID ${preferences.id}`,
            );
          } else {
            console.log(
              `No preferences record found for user ${userId} - skipping preferences reset`,
            );
          }
        } catch (preferencesError) {
          console.error(
            `Error resetting preferences for user ${userId}:`,
            preferencesError,
          );
          // Don't fail the entire operation if preferences reset fails
        }

        // Clear all user interests and set their visibility to false
        try {
          await storage.deleteAllUserInterests(userId);
          console.log(`Cleared all interests for user ${userId}`);
        } catch (interestError) {
          console.error(
            `Error clearing interests for user ${userId}:`,
            interestError,
          );
          // Don't fail the entire operation if interests clearing fails
        }

        // Also update any remaining interests to be hidden on profile
        try {
          await storage.updateUserInterestsVisibility(userId, false);
          console.log(
            `Set all interests visibility to hidden for user ${userId}`,
          );
        } catch (visibilityError) {
          console.error(
            `Error setting interests visibility for user ${userId}:`,
            visibilityError,
          );
          // Don't fail the entire operation if visibility setting fails
        }

        console.log(
          `User ${userId} deactivated their profile and reset all MY INFO fields`,
        );

        res.status(200).json({
          message: "Profile deactivated successfully",
          success: true,
        });
      } catch (error) {
        console.error("Profile deactivation error:", error);
        res.status(500).json({
          message: "Server error deactivating profile",
        });
      }
    },
  );

  // Test endpoint for resetting networking connections (development only)
  app.post(
    "/api/test/reset-networking",
    async (req: Request, res: Response) => {
      try {
        // Delete all networking connections to reset test state
        await storage.clearAllNetworkingConnections();
        res.json({ success: true, message: "Networking connections reset" });
      } catch (error) {
        console.error("Error resetting networking connections:", error);
        res.status(500).json({ message: "Failed to reset connections" });
      }
    },
  );

  const httpServer = createServer(app);

  // Setup WebSocket server for real-time chat with error handling for port conflicts
  let wss: WebSocketServer;

  try {
    // Setup WebSocket with authentication middleware, using noServer option to avoid direct port binding
    // This will use the existing HTTP server without binding to a separate port
    wss = new WebSocketServer({
      noServer: true,
    });

    // Set up the upgrade handling on the HTTP server
    httpServer.on("upgrade", (request, socket, head) => {
      // Only handle WebSocket upgrade requests for our specific path
      if (request.url === "/websocket" || request.url === "/ws") {
        console.log("📡 [WebSocket] Handling upgrade request for:", request.url);
        wss.handleUpgrade(request, socket, head, (ws) => {
          console.log("📡 [WebSocket] WebSocket connection established");
          wss.emit("connection", ws, request);
        });
      } else {
        console.log("📡 [WebSocket] Ignoring upgrade request for:", request.url);
        socket.destroy();
      }
    });

    // Log successful WebSocket server creation
    console.log("WebSocket server created successfully on path /ws");
  } catch (error) {
    console.error(
      `Failed to create WebSocket server: ${error instanceof Error ? error.message : String(error)}`,
    );
    // Create a dummy WebSocketServer that doesn't actually listen
    // This prevents the application from crashing if WebSocket setup fails
    wss = new WebSocketServer({ noServer: true });
  }

  // Map to store active connections by user ID
  const connectedUsers = new Map<number, WebSocket>();

  // Map to store typing status timeouts for auto-clearing
  const typingTimeouts = new Map<string, NodeJS.Timeout>();

  // Module-level variable to store the broadcast function for profile visibility changes
  let profileVisibilityBroadcaster:
    | ((userId: number, isHidden: boolean) => void)
    | null = null;

  // Module-level variable to store the broadcast function for Ghost Mode changes
  let ghostModeBroadcaster:
    | ((userId: number, isEnabled: boolean) => void)
    | null = null;

  // Module-level variable to store the broadcast function for verification status changes
  let verificationStatusBroadcaster:
    | ((userId: number, isVerified: boolean) => void)
    | null = null;

  // Function to broadcast networking profile updates to all connected users
  function broadcastNetworkingProfileUpdate(
    userId: number,
    updatedProfile: any,
  ): void {
    const updateMessage = JSON.stringify({
      type: "networking_profile_updated",
      userId,
      profile: updatedProfile,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `Broadcasting networking profile update for user ${userId} to ${connectedUsers.size} connected users`,
    );

    // Send to all connected users except the one who made the update
    connectedUsers.forEach((ws, connectedUserId) => {
      if (connectedUserId !== userId && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(updateMessage);
          console.log(
            `Sent networking profile update to user ${connectedUserId}`,
          );
        } catch (error) {
          console.error(
            `Failed to send networking profile update to user ${connectedUserId}:`,
            error,
          );
          // Remove dead connections
          connectedUsers.delete(connectedUserId);
        }
      }
    });
  }

  // Getter function for connectedUsers (used by DELETE message endpoint)
  function getConnectedUsers(): Map<number, WebSocket> {
    return connectedUsers;
  }

  // Share the WebSocket connections map with the match API
  setWebSocketConnections(connectedUsers);

  // Register SUITE connection API endpoints
  registerSuiteConnectionAPI(app);
  setSuiteWebSocketConnections(connectedUsers);

  // Share WebSocket connections with KWAME API
  setKwameWebSocketConnections(connectedUsers);

  // Map to store active chat matches that users are viewing
  const activeChats = new Map<number, Set<number>>();

  // Map to store rate limiting data for WebSocket messages
  const rateLimits = new Map<string, { count: number; resetTime: number }>();

  // WebSocket connection event
  wss.on("connection", (ws: WebSocket, req: Request) => {
    console.log("WebSocket connection established");
    let userId: number | null = null;

    // Handle incoming messages
    ws.on("message", async (message: string) => {
      try {
        const data = JSON.parse(message);

        // Debug: Log ALL incoming WebSocket messages to see what's reaching the server
        console.log("📡 [WebSocket] Received message:", {
          type: data.type,
          userId,
          timestamp: new Date().toISOString(),
        });

        // Debug: Log all incoming WebSocket messages
        if (data.type && data.type.includes("call")) {
          console.log("📡 [WebSocket] Received call signaling message:", {
            type: data.type,
            userId,
            matchId: data.matchId,
            callId: data.callId,
            fromUserId: data.fromUserId || data.callerId,
            toUserId: data.toUserId || data.receiverId,
          });
        }

        // Handle user authentication
        if (data.type === "auth") {
          userId = data.userId;
          if (userId) {
            try {
              // Verify the user actually exists before authentication
              const user = await storage.getUser(userId);

              if (!user) {
                ws.send(
                  JSON.stringify({
                    type: "auth_error",
                    message: "User not found",
                  }),
                );
                return;
              }

              // Store the connection reference by user ID
              connectedUsers.set(userId, ws);

              // Update user's online status
              await storage.updateUserOnlineStatus(userId, true);

              // Create a timestamp for this connect event
              const connectTime = new Date();
              const timestampISO = connectTime.toISOString();

              console.log(
                `[PRESENCE] User ${userId} authenticated and is now online at ${timestampISO}`,
              );

              // Send authentication success message back to the client
              ws.send(
                JSON.stringify({
                  type: "auth_success",
                  userId: userId,
                  timestamp: timestampISO,
                }),
              );

              // Send initial online users count to the newly connected user
              const onlineCount = connectedUsers.size;
              ws.send(
                JSON.stringify({
                  type: "online_count_update",
                  count: onlineCount,
                  timestamp: timestampISO,
                }),
              );

              // Get user's last active timestamp for when they were offline
              const userLastActive = await storage.getUserLastActive(userId);

              // Broadcast user's online status to all connected users
              broadcastToAllUsers({
                type: "user_status",
                userId: userId,
                status: "online",
                lastSeen: userLastActive ? userLastActive.toISOString() : null,
                timestamp: timestampISO,
                priority: "high", // Mark as high priority
              });

              // Broadcast updated online count to all users
              broadcastToAllUsers({
                type: "online_count_update",
                count: onlineCount,
                timestamp: timestampISO,
              });
            } catch (error) {
              console.error(
                `WebSocket authentication error for user ${userId}:`,
                error,
              );
              ws.send(
                JSON.stringify({
                  type: "auth_error",
                  message: "Authentication failed",
                }),
              );
            }
          } else {
            ws.send(
              JSON.stringify({
                type: "auth_error",
                message: "Invalid user ID",
              }),
            );
          }
        }
        // Handle new messages with comprehensive privacy validation
        else if (data.type === "message" && userId) {
          try {
            // 1. Verify all required fields are present
            if (!data.matchId) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} sent message without matchId`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Missing match ID for message",
                  code: "MISSING_MATCH_ID",
                }),
              );
              return;
            }

            if (!data.receiverId) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} sent message without receiverId`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Missing recipient ID for message",
                  code: "MISSING_RECIPIENT_ID",
                }),
              );
              return;
            }

            if (!data.content) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} attempted to send empty message content`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Message content cannot be empty",
                  code: "EMPTY_CONTENT",
                }),
              );
              return;
            }

            // 2. Verify content length and structure
            if (typeof data.content !== "string") {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} attempted to send invalid message content type: ${typeof data.content}`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Message content must be a string",
                  code: "INVALID_CONTENT_TYPE",
                }),
              );
              return;
            }

            if (data.content.trim().length === 0) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} attempted to send whitespace-only message`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Message content cannot be empty",
                  code: "EMPTY_CONTENT",
                }),
              );
              return;
            }

            // 3. Verify that the match exists
            const match = await storage.getMatchById(data.matchId);

            if (!match) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} attempted to send message for non-existent match ${data.matchId}`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Match not found",
                  code: "MATCH_NOT_FOUND",
                }),
              );
              return;
            }

            // 4. Verify sender is a legitimate participant in the match
            if (match.userId1 !== userId && match.userId2 !== userId) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} attempted to send message for match ${data.matchId} they're not part of. Match participants: ${match.userId1}, ${match.userId2}`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Not authorized to send messages in this match",
                  code: "UNAUTHORIZED_MATCH",
                }),
              );
              return;
            }

            // 5. Verify recipient is the other legitimate participant in the match
            const otherUserId =
              match.userId1 === userId ? match.userId2 : match.userId1;
            if (data.receiverId !== otherUserId) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} attempted to send message to unauthorized recipient ${data.receiverId} in match ${data.matchId}. Authorized recipient: ${otherUserId}`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Invalid recipient for this match",
                  code: "INVALID_RECIPIENT",
                }),
              );
              return;
            }

            // 6. Additional validation to prevent ID spoofing
            if (match.id !== data.matchId) {
              console.error(
                `[PRIVACY VIOLATION] Match ID mismatch: requested ${data.matchId}, found ${match.id}`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Match ID validation failed",
                  code: "MATCH_ID_MISMATCH",
                }),
              );
              return;
            }

            // 7. Additional logging for security audit
            console.log(
              `[PRIVACY] User ${userId} sending message to ${data.receiverId} in match ${data.matchId} (Verified: User is authorized participant)`,
            );

            const messageData = {
              matchId: data.matchId,
              senderId: userId,
              receiverId: data.receiverId,
              content: data.content,
              encryptedContent: null,
              iv: null, // Encryption removed as per requirements
            };

            // Save the message to the database
            const newMessage = await storage.createMessage(messageData);

            // Mark the match as having unread messages for the recipient
            await storage.markMatchUnread(data.matchId, data.receiverId);

            // PRIVACY FIX: Log secured message creation
            console.log(
              `[PRIVACY] Created secure message ${newMessage.id} for match ${data.matchId}`,
            );

            // Generate a unique message receipt ID to prevent duplicate processing
            const messageReceiptId = `${newMessage.id}_${Date.now()}`;

            // Send the message to the recipient if they're online
            // Use a different message type for recipient vs sender to prevent confusion
            const recipientWs = connectedUsers.get(data.receiverId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(
                JSON.stringify({
                  type: "new_message",
                  message: newMessage,
                  receiptId: messageReceiptId,
                  timestamp: new Date().toISOString(),
                  for: "recipient", // Explicitly mark this message for the recipient
                }),
              );
            }

            // Confirm message delivery to sender with a different type
            // This prevents the client from showing the message twice
            ws.send(
              JSON.stringify({
                type: "message_sent",
                messageId: newMessage.id,
                matchId: data.matchId,
                receiptId: messageReceiptId, // Same receipt ID to help client detect duplicates
                timestamp: new Date().toISOString(),
                for: "sender", // Explicitly mark this message for the sender
              }),
            );
          } catch (error) {
            console.error("Error processing message:", error);
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Failed to process message",
              }),
            );
          }
        }
        // Handle typing status updates with comprehensive privacy validation
        else if (data.type === "typing_status" && userId) {
          try {
            if (!data.matchId) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} sent typing status without matchId`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Missing match ID for typing status",
                  code: "MISSING_MATCH_ID",
                }),
              );
              return;
            }

            // ENHANCED PRIVACY VERIFICATION:
            // 1. First verify the match exists
            const match = await storage.getMatchById(data.matchId);

            if (!match) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} attempted to update typing status for non-existent match ${data.matchId}`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Match not found for typing status update",
                  code: "MATCH_NOT_FOUND",
                }),
              );
              return;
            }

            // 2. Verify user is part of the match
            if (match.userId1 !== userId && match.userId2 !== userId) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} attempted to update typing status for match ${data.matchId} they're not part of. Match participants: ${match.userId1}, ${match.userId2}`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message:
                    "Not authorized to update typing status in this match",
                  code: "UNAUTHORIZED_MATCH",
                }),
              );
              return;
            }

            // 3. Additional logging for security audit
            console.log(
              `[PRIVACY] User ${userId} updated typing status to ${data.isTyping} in match ${data.matchId} (Verified: User is authorized participant)`,
            );

            // Save typing status to the database
            await storage.updateTypingStatus(
              userId,
              data.matchId,
              data.isTyping,
            );

            // Get the other user in the match
            const otherUserId =
              match.userId1 === userId ? match.userId2 : match.userId1;

            // Send typing status to the other user if they're online
            const otherUserWs = connectedUsers.get(otherUserId);
            if (otherUserWs && otherUserWs.readyState === WebSocket.OPEN) {
              otherUserWs.send(
                JSON.stringify({
                  type: "typing_status",
                  userId: userId,
                  matchId: data.matchId,
                  isTyping: data.isTyping,
                  timestamp: new Date().toISOString(),
                }),
              );
            }

            // If starting to type, set a timeout to auto-clear after 10 seconds
            if (data.isTyping) {
              const timeoutKey = `typing_${userId}_${data.matchId}`;

              // Clear any existing timeout for this user/match
              if (typingTimeouts.has(timeoutKey)) {
                clearTimeout(typingTimeouts.get(timeoutKey));
              }

              // Set new timeout to auto-clear typing status
              const timeout = setTimeout(async () => {
                try {
                  console.log(
                    `[AUTO-CLEAR] Clearing stuck typing status for user ${userId} in match ${data.matchId}`,
                  );

                  // Clear from database
                  await storage.updateTypingStatus(
                    userId,
                    data.matchId!,
                    false,
                  );

                  // Send clear signal to other user
                  const currentOtherUserWs = connectedUsers.get(otherUserId);
                  if (
                    currentOtherUserWs &&
                    currentOtherUserWs.readyState === WebSocket.OPEN
                  ) {
                    currentOtherUserWs.send(
                      JSON.stringify({
                        type: "typing_status",
                        userId: userId,
                        matchId: data.matchId,
                        isTyping: false,
                        timestamp: new Date().toISOString(),
                        autoCleared: true,
                      }),
                    );
                  }

                  // Remove timeout from map
                  typingTimeouts.delete(timeoutKey);
                } catch (clearError) {
                  console.error(
                    "Error auto-clearing typing status:",
                    clearError,
                  );
                }
              }, 10000); // 10 seconds

              typingTimeouts.set(timeoutKey, timeout);
            } else {
              // If explicitly clearing typing status, remove any pending timeout
              const timeoutKey = `typing_${userId}_${data.matchId}`;
              if (typingTimeouts.has(timeoutKey)) {
                clearTimeout(typingTimeouts.get(timeoutKey));
                typingTimeouts.delete(timeoutKey);
              }
            }
          } catch (error) {
            console.error("Error updating typing status:", error);
          }
        }
        // Handle message read status with comprehensive privacy validation
        else if (data.type === "message_read" && userId) {
          try {
            if (!data.messageId) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} sent message_read without messageId`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Missing message ID for read status update",
                  code: "MISSING_MESSAGE_ID",
                }),
              );
              return;
            }

            // ENHANCED PRIVACY VERIFICATION:
            // 1. First verify the message exists
            const message = await storage.getMessageById(data.messageId);

            if (!message) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} attempted to mark non-existent message ${data.messageId} as read`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Message not found",
                  code: "MESSAGE_NOT_FOUND",
                }),
              );
              return;
            }

            // 2. Verify the match exists
            const match = await storage.getMatchById(message.matchId);

            if (!match) {
              console.error(
                `[PRIVACY VIOLATION] Message ${data.messageId} belongs to non-existent match ${message.matchId}`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Match not found for this message",
                  code: "MATCH_NOT_FOUND",
                }),
              );
              return;
            }

            // 3. Verify that the user is part of the match
            if (match.userId1 !== userId && match.userId2 !== userId) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} attempted to mark message as read for match ${message.matchId} they're not part of. Match participants: ${match.userId1}, ${match.userId2}`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Not authorized to access messages in this match",
                  code: "UNAUTHORIZED_MATCH",
                }),
              );
              return;
            }

            // 4. Verify the user is specifically the intended recipient
            if (message.receiverId !== userId) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} attempted to mark message ${data.messageId} as read but is not the recipient. Actual recipient: ${message.receiverId}`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Not authorized to mark this message as read",
                  code: "UNAUTHORIZED_RECIPIENT",
                }),
              );
              return;
            }

            // 5. Add validation to prevent ID spoofing
            if (message.id !== data.messageId) {
              console.error(
                `[PRIVACY VIOLATION] Message ID mismatch: requested ${data.messageId}, found ${message.id}`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Message ID validation failed",
                  code: "MESSAGE_ID_MISMATCH",
                }),
              );
              return;
            }

            // 6. Additional logging for security audit
            console.log(
              `[PRIVACY] User ${userId} marking message ${data.messageId} as read (Verified: User is authorized recipient)`,
            );

            // Always update message read status in the database for accurate message history
            const updatedMessage = await storage.markMessageAsReadWithTimestamp(
              data.messageId,
            );

            // Notify the sender that their message was read ONLY if the read receipt feature is enabled
            // The client sends message_read events only when read receipts are enabled on their side
            if (updatedMessage) {
              const senderWs = connectedUsers.get(updatedMessage.senderId);
              if (senderWs && senderWs.readyState === WebSocket.OPEN) {
                // If we got this far, read receipts are enabled on the recipient side
                // We're sending the notification to the sender now
                senderWs.send(
                  JSON.stringify({
                    type: "read_receipt",
                    messageId: updatedMessage.id,
                    matchId: updatedMessage.matchId,
                    readAt: updatedMessage.readAt,
                    timestamp: new Date().toISOString(),
                  }),
                );
              }
            }
          } catch (error) {
            console.error("Error marking message as read:", error);
          }
        }

        // Handle active chat status with comprehensive privacy safeguards
        else if (data.type === "active_chat" && userId) {
          try {
            const { matchId, active } = data;

            if (!matchId) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} sent active chat status without matchId`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Missing match ID for active chat status",
                  code: "MISSING_MATCH_ID",
                }),
              );
              return;
            }

            // ENHANCED PRIVACY VERIFICATION:
            // 1. First verify the match exists
            const match = await storage.getMatchById(matchId);

            if (!match) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} attempted to update active status for non-existent match ${matchId}`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Match not found for active chat status update",
                  code: "MATCH_NOT_FOUND",
                }),
              );
              return;
            }

            // 2. Verify user is a legitimate participant in the match
            if (match.userId1 !== userId && match.userId2 !== userId) {
              console.error(
                `[PRIVACY VIOLATION] User ${userId} attempted to update active status for match ${matchId} they're not part of. Match participants: ${match.userId1}, ${match.userId2}`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message:
                    "Not authorized to update active chat status in this match",
                  code: "UNAUTHORIZED_MATCH",
                }),
              );
              return;
            }

            // 3. Additional validation to prevent spoofing other matches
            if (match.id !== matchId) {
              console.error(
                `[PRIVACY VIOLATION] Match ID mismatch: requested ${matchId}, found ${match.id}`,
              );
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Match ID validation failed",
                  code: "MATCH_ID_MISMATCH",
                }),
              );
              return;
            }

            // 4. Additional logging for security audit
            console.log(
              `[PRIVACY] User ${userId} updated active chat status to ${active} in match ${matchId} (Verified: User is authorized participant)`,
            );

            // Determine the other user in the match
            const otherUserId =
              match.userId1 === userId ? match.userId2 : match.userId1;

            // Update the active chats map and database
            if (active) {
              // User is opening the chat window
              if (!activeChats.has(userId)) {
                activeChats.set(userId, new Set<number>());
              }
              activeChats.get(userId)!.add(matchId);

              // Update the database with active status
              await storage.updateActiveChatStatus(userId, matchId, true);

              // PRIVACY FIX: Log secure active chat status
              console.log(
                `[PRIVACY] User ${userId} set active status for match ${matchId} to true`,
              );

              // Get all users actively in this chat from the database
              const activeUsers = await storage.getUsersInActiveChat(matchId);
              const bothUsersActive =
                activeUsers.includes(userId) &&
                activeUsers.includes(otherUserId);

              // Notify the other user that this user is in the chat
              const otherUserWs = connectedUsers.get(otherUserId);
              if (otherUserWs && otherUserWs.readyState === WebSocket.OPEN) {
                // Current timestamp for all messages
                const currentTime = new Date();
                const timestampISO = currentTime.toISOString();

                // 1. First, send the standard chat partner active message
                otherUserWs.send(
                  JSON.stringify({
                    type: "chat_partner_active",
                    userId: userId,
                    matchId: matchId,
                    active: true,
                    inChat: bothUsersActive, // Both users are in the chat
                    timestamp: timestampISO,
                  }),
                );

                // 2. CRITICAL FIX: Always ensure we also send a current user_status message
                // when a user enters a chat to ensure consistent presence state
                otherUserWs.send(
                  JSON.stringify({
                    type: "user_status",
                    userId: userId,
                    status: "online",
                    inChatMatch: matchId, // This user is in this specific chat
                    timestamp: timestampISO,
                    priority: "high", // Override any previous status
                  }),
                );

                // 3. Double-ensure the current user also knows the other user is online
                // by sending a current status update to this user about the other user
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: "user_status",
                      userId: otherUserId,
                      status: "online",
                      inChatMatch: activeUsers.includes(otherUserId)
                        ? matchId
                        : null,
                      timestamp: timestampISO,
                      priority: "high", // Override any previous status
                    }),
                  );
                }
              }
            } else {
              // User is closing the chat window
              if (activeChats.has(userId)) {
                activeChats.get(userId)!.delete(matchId);
              }

              // Update the database with inactive status
              await storage.updateActiveChatStatus(userId, matchId, false);

              // PRIVACY FIX: Log secure active chat status
              console.log(
                `[PRIVACY] User ${userId} set active status for match ${matchId} to false`,
              );

              // Notify the other user that this user left the chat
              const otherUserWs = connectedUsers.get(otherUserId);
              if (otherUserWs && otherUserWs.readyState === WebSocket.OPEN) {
                otherUserWs.send(
                  JSON.stringify({
                    type: "chat_partner_active",
                    userId: userId,
                    matchId: matchId,
                    active: false,
                    inChat: false, // User has left the chat
                    timestamp: new Date().toISOString(),
                  }),
                );
              }
            }
          } catch (error) {
            console.error("Error updating active chat status:", error);
          }
        }
        // Handle match popup closed event
        else if (data.type === "match_popup_closed" && userId) {
          try {
            const { matchId, sendMessage } = data;

            if (!matchId) {
              console.error(
                `[MATCH] User ${userId} sent match_popup_closed without matchId`,
              );
              return;
            }

            // Validate the match exists and user is part of it
            const match = await storage.getMatchById(matchId);

            if (!match) {
              console.error(
                `[MATCH] User ${userId} attempted to close match popup for non-existent match ${matchId}`,
              );
              return;
            }

            // Verify user is a legitimate participant in the match
            if (match.userId1 !== userId && match.userId2 !== userId) {
              console.error(
                `[MATCH] User ${userId} attempted to close match popup for match ${matchId} they're not part of`,
              );
              return;
            }

            // Get the other user in the match
            const otherUserId =
              match.userId1 === userId ? match.userId2 : match.userId1;

            // Notify the other user that the match popup should be closed
            const otherUserWs = connectedUsers.get(otherUserId);
            if (otherUserWs && otherUserWs.readyState === WebSocket.OPEN) {
              otherUserWs.send(
                JSON.stringify({
                  type: "match_popup_closed",
                  matchId: matchId,
                  closedBy: userId,
                  sendMessage: sendMessage || false,
                  timestamp: new Date().toISOString(),
                }),
              );

              console.log(
                `[MATCH] Notified user ${otherUserId} that match popup for match ${matchId} was closed by user ${userId}`,
              );
            } else {
              console.log(
                `[MATCH] Other user ${otherUserId} not connected via WebSocket, could not notify about match popup closed`,
              );
            }
          } catch (error) {
            console.error("Error handling match popup closed event:", error);
          }
        }
        // Handle swipe card actions (like/dislike/message)
        else if (data.type === "swipe_action" && userId) {
          try {
            const { targetUserId, action, isMatch } = data;

            if (!targetUserId || !action) {
              console.error(
                `[SWIPE] User ${userId} sent swipe_action without targetUserId or action`,
              );
              return;
            }

            // Validate the target user exists
            const targetUser = await storage.getUser(targetUserId);
            if (!targetUser) {
              console.error(
                `[SWIPE] User ${userId} attempted to swipe on non-existent user ${targetUserId}`,
              );
              return;
            }

            console.log(
              `[SWIPE] User ${userId} ${action}d user ${targetUserId}`,
            );

            // Special handling for 'message' action type
            if (action === "message") {
              try {
                // Check if a match exists between these users
                let match = await storage.getMatchBetweenUsers(
                  userId,
                  targetUserId,
                );
                let matchId: number;

                // If no match exists, create one with matched=true
                if (!match) {
                  const newMatch = await storage.createMatch({
                    userId1: userId,
                    userId2: targetUserId,
                    matched: true,
                    metadata: JSON.stringify({ origin: "MEET" }),
                  });
                  matchId = newMatch.id;
                  console.log(
                    `[SWIPE-MESSAGE] Created new match ${matchId} between users ${userId} and ${targetUserId}`,
                  );
                }
                // If match exists but not confirmed, update it to matched
                else if (!match.matched) {
                  const updatedMatch = await storage.updateMatchStatus(
                    match.id,
                    true,
                  );
                  if (!updatedMatch) {
                    console.error(
                      `[SWIPE-MESSAGE] Failed to update match ${match.id} to matched=true`,
                    );
                    return;
                  }
                  matchId = updatedMatch.id;
                  console.log(
                    `[SWIPE-MESSAGE] Updated match ${matchId} to matched=true`,
                  );
                } else {
                  // Match exists and is already confirmed
                  matchId = match.id;
                }

                // Now matchId is definitely defined

                // Notify the target user that they received a message request
                const targetUserWs = connectedUsers.get(targetUserId);
                if (
                  targetUserWs &&
                  targetUserWs.readyState === WebSocket.OPEN
                ) {
                  // Get source user info to enhance notification
                  const sourceUser = await storage.getUser(userId);
                  const safeUserInfo = sourceUser
                    ? (({ password, ...rest }) => rest)(sourceUser)
                    : { id: userId, fullName: "Unknown User" };

                  targetUserWs.send(
                    JSON.stringify({
                      type: "message_request",
                      fromUserId: userId,
                      fromUserInfo: safeUserInfo,
                      matchId: matchId,
                      timestamp: new Date().toISOString(),
                    }),
                  );

                  console.log(
                    `[SWIPE-MESSAGE] Notified user ${targetUserId} about message request from user ${userId}`,
                  );
                }
              } catch (error) {
                console.error(
                  `[SWIPE-MESSAGE] Error in message action handling: ${error}`,
                );
              }
            }
            // Standard like/dislike handling
            else {
              // AGGRESSIVE REAL-TIME CARD REMOVAL: Remove cards instantly from both users' UIs
              const sourceUserWs = connectedUsers.get(userId);
              const targetUserWs = connectedUsers.get(targetUserId);

              // 1. Remove target's card from source user's discover deck immediately
              if (sourceUserWs && sourceUserWs.readyState === WebSocket.OPEN) {
                sourceUserWs.send(
                  JSON.stringify({
                    type: "remove_from_discover",
                    removeUserId: targetUserId,
                    reason: `${action}_action`,
                    timestamp: new Date().toISOString(),
                  }),
                );

                console.log(
                  `[REAL-TIME] Instantly removed user ${targetUserId}'s card from user ${userId}'s discover deck`,
                );
              }

              // 2. Remove source user's card from target user's discover deck immediately
              if (targetUserWs && targetUserWs.readyState === WebSocket.OPEN) {
                targetUserWs.send(
                  JSON.stringify({
                    type: "remove_from_discover",
                    removeUserId: userId,
                    reason: `received_${action}`,
                    timestamp: new Date().toISOString(),
                  }),
                );

                // Also send swipe notification for likes
                if (action === "like") {
                  const sourceUser = await storage.getUser(userId);
                  const safeUserInfo = sourceUser
                    ? (({ password, ...rest }) => rest)(sourceUser)
                    : { id: userId, fullName: "Unknown User" };

                  targetUserWs.send(
                    JSON.stringify({
                      type: "new_like_received",
                      fromUserId: userId,
                      fromUserInfo: safeUserInfo,
                      isMatch: isMatch || false,
                      timestamp: new Date().toISOString(),
                    }),
                  );
                }

                console.log(
                  `[REAL-TIME] Instantly removed user ${userId}'s card from user ${targetUserId}'s discover deck`,
                );
              }
            }

            // Broadcast to all connected users to refresh their discover and matches pages
            // This ensures that the card disappears in real-time from all instances
            for (const [
              connectedUserId,
              connectedWs,
            ] of connectedUsers.entries()) {
              if (connectedWs.readyState === WebSocket.OPEN) {
                // Send refresh event to target user and source user
                if (
                  connectedUserId === targetUserId ||
                  connectedUserId === userId
                ) {
                  connectedWs.send(
                    JSON.stringify({
                      type: "discover:refresh",
                      timestamp: new Date().toISOString(),
                    }),
                  );

                  // Also refresh matches page if it's a like or message action
                  if (action === "like" || action === "message") {
                    connectedWs.send(
                      JSON.stringify({
                        type: "matches:refresh",
                        timestamp: new Date().toISOString(),
                      }),
                    );
                  }
                }
              }
            }
          } catch (error) {
            console.error("Error handling swipe action event:", error);
          }
        }
        // Handle ping messages
        else if (data.type === "ping") {
          ws.send(
            JSON.stringify({
              type: "pong",
              timestamp: new Date().toISOString(),
            }),
          );
        }
        // Handle request for online users count
        else if (data.type === "get_online_count") {
          const onlineCount = connectedUsers.size;
          ws.send(
            JSON.stringify({
              type: "online_count_update",
              count: onlineCount,
              timestamp: new Date().toISOString(),
            }),
          );
        }
        // ===== Video/Voice Call Signaling =====
        else if (
          data.type === "call_initiate" ||
          data.type === "call_ringing" ||
          data.type === "call_cancel" ||
          data.type === "call_accept" ||
          data.type === "call_decline" ||
          data.type === "call_end" ||
          data.type === "webrtc_offer" ||
          data.type === "webrtc_answer" ||
          data.type === "webrtc_ice"
        ) {
          if (!userId) return;

          // Rate limiting for call signaling
          const now = Date.now();
          const rateLimitKey = `call_signaling_${userId}`;
          if (!rateLimits.has(rateLimitKey)) {
            rateLimits.set(rateLimitKey, { count: 0, resetTime: now + 60000 }); // 1 minute window
          }

          const userRateLimit = rateLimits.get(rateLimitKey)!;
          if (now > userRateLimit.resetTime) {
            userRateLimit.count = 0;
            userRateLimit.resetTime = now + 60000;
          }

          userRateLimit.count++;

          // Allow 50 signaling messages per minute (generous for WebRTC ICE candidates)
          if (userRateLimit.count > 50) {
            console.warn(
              `Rate limit exceeded for call signaling by user ${userId}`,
            );
            return;
          }

          // Enhanced validation for call messages
          const { matchId, callId } = data;
          if (!matchId || (data.type !== "webrtc_ice" && !callId)) {
            console.warn(
              `Invalid call signaling message from user ${userId}:`,
              data.type,
            );
            return;
          }
          const toUserId: number | undefined =
            data.toUserId ??
            data.receiverId ??
            (typeof data.callerId === "number" && data.callerId !== userId
              ? data.callerId
              : undefined) ??
            (typeof data.fromUserId === "number" && data.fromUserId !== userId
              ? data.fromUserId
              : undefined);
          if (!toUserId) return;
          // Validate the two users are part of the match
          try {
            // Fallback validation: ensure toUserId is the other side of any match involving userId
            // If storage.getMatchById is unavailable, skip strict validation but still relay
            if (storage.getMatchById) {
              const match = await storage.getMatchById(matchId);
              if (!match) {
                console.warn(
                  `Match ${matchId} not found for call signaling from user ${userId}`,
                );
                return;
              }
              const participants = new Set([match.userId1, match.userId2]);
              if (!participants.has(userId) || !participants.has(toUserId)) {
                console.warn(
                  `User ${userId} not authorized for match ${matchId} call signaling`,
                );
                return;
              }
            }
          } catch (error) {
            console.error(
              `Error validating match ${matchId} for call signaling:`,
              error,
            );
            return;
          }

          // Additional validation for call-specific messages
          if (callId && storage.getVideoCallById) {
            try {
              const call = await storage.getVideoCallById(callId);
              if (
                call &&
                call.initiatorId !== userId &&
                call.receiverId !== userId
              ) {
                console.warn(
                  `User ${userId} not authorized for call ${callId}`,
                );
                return;
              }
            } catch (error) {
              console.error(`Error validating call ${callId}:`, error);
            }
          }

          // Relay to the other participant if connected
          const targetWs = connectedUsers.get(toUserId);
          console.log("📡 [WebSocket] Attempting to relay call signal:", {
            toUserId,
            targetWsExists: !!targetWs,
            targetWsReady: targetWs?.readyState === WebSocket.OPEN,
            connectedUsersCount: connectedUsers.size,
            connectedUserIds: Array.from(connectedUsers.keys()),
          });

          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            console.log(
              "📡 [WebSocket] ✅ Relaying call signal to user",
              toUserId,
            );
            targetWs.send(
              JSON.stringify({
                ...data,
                timestamp: new Date().toISOString(),
              }),
            );
          } else {
            console.log(
              "📡 [WebSocket] ❌ Cannot relay - target user not connected",
              toUserId,
            );
          }

          // Update call status for certain events
          try {
            if (data.type === "call_initiate" && data.callId) {
              await storage.updateVideoCallStatus?.(data.callId, {
                status: "pending",
              });
            } else if (data.type === "call_accept" && data.callId) {
              await storage.updateVideoCallStatus?.(data.callId, {
                status: "active",
                startedAt: new Date(),
              });
            } else if (
              (data.type === "call_decline" || data.type === "call_cancel") &&
              data.callId
            ) {
              await storage.updateVideoCallStatus?.(data.callId, {
                status: "declined",
                endedAt: new Date(),
              });

              // Create a single call system message for "No answer/Missed" if the call never connected
              try {
                const call = await storage.getVideoCallById?.(data.callId);
                if (call && !call.startedAt) {
                  const callerId = call.initiatorId;
                  const receiverId = call.receiverId;
                  const matchIdForCall = call.matchId;

                  // Use a canonical content token so clients can render the proper bubble text
                  console.log(
                    `📞 [CALL-SYSTEM] Creating no-answer message for match=${matchIdForCall} caller=${callerId} receiver=${receiverId}`,
                  );
                  const callSystemMessage = await storage.createMessage({
                    matchId: matchIdForCall,
                    senderId: callerId,
                    receiverId: receiverId,
                    content: "_CALL:NO_ANSWER", // Caller sees: No answer; Receiver renders: Missed call
                    messageType: "call",
                    audioUrl: null,
                    audioDuration: null,
                  } as any);

                  // Mark unread for receiver and bump lastMessageAt
                  try {
                    await storage.markMatchUnread(matchIdForCall, receiverId);
                  } catch (e) {
                    console.error(
                      "[CALL-SYSTEM] Failed to mark match unread:",
                      e,
                    );
                  }

                  console.log(
                    `📞 [CALL-SYSTEM] Inserted call system message id=${callSystemMessage?.id} for match=${matchIdForCall}`,
                  );

                  // Notify receiver (as recipient)
                  const rxWs = connectedUsers.get(receiverId);
                  if (rxWs && rxWs.readyState === WebSocket.OPEN) {
                    rxWs.send(
                      JSON.stringify({
                        type: "new_message",
                        message: callSystemMessage,
                        for: "recipient",
                        receiptId: `call_no_answer_${callSystemMessage?.id}_rx`,
                        timestamp: new Date().toISOString(),
                      }),
                    );
                  }

                  // Notify caller to show their own bubble (as sender)
                  const txWs = connectedUsers.get(callerId);
                  if (txWs && txWs.readyState === WebSocket.OPEN) {
                    txWs.send(
                      JSON.stringify({
                        type: "new_message",
                        message: callSystemMessage,
                        for: "sender",
                        receiptId: `call_no_answer_${callSystemMessage?.id}_tx`,
                        timestamp: new Date().toISOString(),
                      }),
                    );
                  }
                }
              } catch (e) {
                console.error(
                  "Failed to create no-answer/missed call message:",
                  e,
                );
              }
            } else if (data.type === "call_end" && data.callId) {
              // Determine if this call ever connected; if not, treat as no-answer and emit system message
              let callRecord: any = null;
              try {
                if (storage.getVideoCallById) {
                  callRecord = await storage.getVideoCallById(data.callId);
                }
              } catch (e) {
                console.error(
                  "[CALL-SYSTEM] Error fetching call record on call_end:",
                  e,
                );
              }

              if (callRecord && !callRecord.startedAt) {
                // No SDP-connected call ever started → this is effectively a cancel/no-answer
                await storage.updateVideoCallStatus?.(data.callId, {
                  status: "declined",
                  endedAt: new Date(),
                });

                try {
                  const callerId = callRecord.initiatorId;
                  const receiverId = callRecord.receiverId;
                  const matchIdForCall = callRecord.matchId;

                  console.log(
                    `📞 [CALL-SYSTEM] call_end before start → creating no-answer message for match=${matchIdForCall} caller=${callerId} receiver=${receiverId}`,
                  );
                  const callSystemMessage = await storage.createMessage({
                    matchId: matchIdForCall,
                    senderId: callerId,
                    receiverId: receiverId,
                    content: "_CALL:NO_ANSWER",
                    messageType: "call",
                    audioUrl: null,
                    audioDuration: null,
                  } as any);

                  try {
                    await storage.markMatchUnread(matchIdForCall, receiverId);
                  } catch (e) {
                    console.error(
                      "[CALL-SYSTEM] Failed to mark match unread:",
                      e,
                    );
                  }

                  // Broadcast to receiver (recipient)
                  const rxWs = connectedUsers.get(receiverId);
                  if (rxWs && rxWs.readyState === WebSocket.OPEN) {
                    rxWs.send(
                      JSON.stringify({
                        type: "new_message",
                        message: callSystemMessage,
                        for: "recipient",
                        receiptId: `call_no_answer_${callSystemMessage?.id}_rx`,
                        timestamp: new Date().toISOString(),
                      }),
                    );
                  }

                  // Broadcast to caller (sender)
                  const txWs = connectedUsers.get(callerId);
                  if (txWs && txWs.readyState === WebSocket.OPEN) {
                    txWs.send(
                      JSON.stringify({
                        type: "new_message",
                        message: callSystemMessage,
                        for: "sender",
                        receiptId: `call_no_answer_${callSystemMessage?.id}_tx`,
                        timestamp: new Date().toISOString(),
                      }),
                    );
                  }
                } catch (e) {
                  console.error(
                    "[CALL-SYSTEM] Failed to create/broadcast no-answer on call_end:",
                    e,
                  );
                }
              } else {
                // Normal end for an active call
                await storage.updateVideoCallStatus?.(data.callId, {
                  status: "completed",
                  endedAt: new Date(),
                });
              }
            }
          } catch (e) {
            console.error("Call status update error:", e);
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });

    // Handle disconnection
    ws.on("close", async () => {
      if (userId) {
        console.log(`User ${userId} disconnected`);

        // Update user's online status with last seen timestamp
        await storage.updateUserOnlineStatus(userId, false);

        // If user had any active chats, mark them as inactive
        if (activeChats.has(userId)) {
          const userActiveChats = Array.from(activeChats.get(userId) || []);

          // For each active chat, update the database and notify the other user
          for (const matchId of userActiveChats) {
            try {
              // Get the match to find the other user
              const match = await storage.getMatchById(matchId);
              if (match) {
                // Mark chat as inactive in database
                await storage.updateActiveChatStatus(userId, matchId, false);

                // Determine the other user in the match
                const otherUserId =
                  match.userId1 === userId ? match.userId2 : match.userId1;

                // Notify the other user that this user is no longer in the chat
                const otherUserWs = connectedUsers.get(otherUserId);
                if (otherUserWs && otherUserWs.readyState === WebSocket.OPEN) {
                  otherUserWs.send(
                    JSON.stringify({
                      type: "chat_partner_active",
                      userId: userId,
                      matchId: matchId,
                      active: false,
                      inChat: false,
                      timestamp: new Date().toISOString(),
                    }),
                  );
                }
              }
            } catch (error) {
              console.error(
                `Error handling disconnection for match ${matchId}:`,
                error,
              );
            }
          }

          // Clear the active chats for this user
          activeChats.delete(userId);
        }

        // Remove from connected users map
        connectedUsers.delete(userId);

        // Create a timestamp for this disconnect event
        const disconnectTime = new Date();
        const timestampISO = disconnectTime.toISOString();

        // Broadcast updated online count to all remaining users
        const onlineCount = connectedUsers.size;
        broadcastToAllUsers({
          type: "online_count_update",
          count: onlineCount,
          timestamp: timestampISO,
        });

        // Notify any users that might be viewing this user's profile in the discover page
        // This ensures that when a user goes offline, their card is updated in real-time
        broadcastToAllUsers({
          type: "user_profile_update",
          userId: userId,
          isOnline: false,
          lastSeen: timestampISO,
          timestamp: timestampISO,
        });

        // Get all active chat matches for this user
        const activeMatchIds = activeChats.get(userId) || new Set<number>();

        // For each active match, send a deactivation message
        // Convert to array to avoid TypeScript iteration error
        Array.from(activeMatchIds).forEach((matchId) => {
          broadcastToAllUsers({
            type: "chat_partner_active",
            userId: userId,
            matchId: matchId,
            active: false,
            inChat: false,
            timestamp: timestampISO,
            priority: "high",
          });
        });

        // Also send a general deactivation for any other clients that might have stale state
        broadcastToAllUsers({
          type: "user_disconnected",
          userId: userId,
          timestamp: timestampISO,
        });

        // Then, broadcast offline status with a slight delay to ensure proper ordering
        setTimeout(() => {
          const offlineStatus = {
            type: "user_status",
            userId: userId,
            status: "offline",
            lastSeen: timestampISO,
            inChatMatch: null, // Clear any chat match on disconnect
            timestamp: timestampISO,
            priority: "high", // Mark as high priority to prevent race conditions
          };

          // Broadcast to all connected users
          broadcastToAllUsers(offlineStatus);

          // Save the offline status so even reconnecting clients will get this info
          console.log(
            `[PRESENCE] User ${userId} is now offline. Last seen: ${timestampISO}`,
          );

          // Update any active chats to reflect user has left completely
          // This fix helps ensure no "ghost" presence issues occur
          Array.from(connectedUsers.values()).forEach((clientWs) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: "chat_clear_user",
                  userId: userId,
                  timestamp: timestampISO,
                  priority: "high",
                }),
              );
            }
          });
        }, 50); // Small delay to ensure proper message ordering
      }
    });
  });

  // Helper function to broadcast to all connected users
  function broadcastToAllUsers(data: any) {
    connectedUsers.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  }

  /**
   * Broadcast a message to specific users
   * @param userIds Array of user IDs to send the message to
   * @param data The data to send
   */
  function broadcastToUsers(userIds: number[], data: any) {
    for (const userId of userIds) {
      const userSocket = connectedUsers.get(userId);
      if (userSocket && userSocket.readyState === WebSocket.OPEN) {
        userSocket.send(JSON.stringify(data));
      }
    }
  }

  /**
   * Broadcast profile visibility change to all other connected users
   * @param userId The user who changed their profile visibility
   * @param isHidden Whether the profile is now hidden
   */
  function broadcastProfileVisibilityChange(userId: number, isHidden: boolean) {
    const visibilityChangeMessage = {
      type: "profileVisibilityChanged",
      userId: userId,
      isHidden: isHidden,
      timestamp: new Date().toISOString(),
    };

    let notifiedCount = 0;
    connectedUsers.forEach((ws, connectedUserId) => {
      if (connectedUserId !== userId && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(visibilityChangeMessage));
          notifiedCount++;
        } catch (wsError) {
          console.error(
            `Failed to notify user ${connectedUserId} of profile visibility change:`,
            wsError,
          );
        }
      }
    });

    console.log(
      `Broadcasted profile visibility change for user ${userId} to ${notifiedCount} other users`,
    );
  }

  /**
   * Broadcast Ghost Mode change to all other connected users
   * @param userId The user who changed their Ghost Mode
   * @param isEnabled Whether Ghost Mode is now enabled
   */
  function broadcastGhostModeChange(userId: number, isEnabled: boolean) {
    const ghostModeChangeMessage = {
      type: "ghostModeChanged",
      userId: userId,
      isEnabled: isEnabled,
      timestamp: new Date().toISOString(),
    };

    let notifiedCount = 0;
    connectedUsers.forEach((ws, connectedUserId) => {
      if (connectedUserId !== userId && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(ghostModeChangeMessage));
          notifiedCount++;
        } catch (wsError) {
          console.error(
            `Failed to notify user ${connectedUserId} of Ghost Mode change:`,
            wsError,
          );
        }
      }
    });

    console.log(
      `Broadcasted Ghost Mode change for user ${userId} to ${notifiedCount} other users`,
    );
  }

  /**
   * Broadcast verification status change to all connected users
   * This allows users viewing swipe cards to see verification badges appear/disappear in real-time
   * @param userId The user whose verification status changed
   * @param isVerified Whether the user is now verified or not
   */
  function broadcastVerificationStatusChange(
    userId: number,
    isVerified: boolean,
  ) {
    const verificationChangeMessage = {
      type: "verificationStatusChanged",
      userId: userId,
      isVerified: isVerified,
      timestamp: new Date().toISOString(),
    };

    let notifiedCount = 0;
    connectedUsers.forEach((ws, connectedUserId) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(verificationChangeMessage));
          notifiedCount++;
        } catch (wsError) {
          console.error(
            `Failed to notify user ${connectedUserId} about verification status change:`,
            wsError,
          );
        }
      }
    });

    console.log(
      `Broadcasted verification status change for user ${userId} (isVerified: ${isVerified}) to ${notifiedCount} connected users`,
    );
  }

  // Check if chat exists for a match
  app.get(
    "/api/messages/check-chat/:matchId",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const matchId = parseInt(req.params.matchId);
        if (isNaN(matchId)) {
          return res.status(400).json({ message: "Invalid match ID" });
        }

        // Get the match to verify the user is part of it
        const match = await storage.getMatchById(matchId);
        if (!match) {
          return res.status(404).json({ message: "Match not found" });
        }

        // Verify user is part of this match
        if (match.userId1 !== req.user.id && match.userId2 !== req.user.id) {
          return res
            .status(403)
            .json({ message: "Not authorized to access this match" });
        }

        // Check if messages exist for this match
        const messages = await storage.getMessagesByMatchId(matchId);
        const chatExists = messages.length > 0;

        // If chat exists but match is not marked as matched, update it
        if (chatExists && !match.matched) {
          await storage.updateMatchStatus(matchId, true);
          console.log(
            `Auto-repaired match status for match ${matchId} - marked as matched since chat exists`,
          );
        }

        return res.status(200).json({
          chatExists,
          messageCount: messages.length,
          matchStatus: match.matched ? "confirmed" : "pending",
        });
      } catch (error) {
        console.error(`Error checking chat existence for match: ${error}`);
        return res.status(500).json({
          message: "Failed to check chat existence",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // DELETE individual message endpoint (for unsend functionality)
  app.delete(
    "/api/messages/:messageId",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const messageId = parseInt(req.params.messageId);
        if (isNaN(messageId)) {
          return res.status(400).json({ message: "Invalid message ID" });
        }

        const userId = req.user.id;

        // 1. Get the message to verify ownership and get match info
        const message = await storage.getMessageById(messageId);
        if (!message) {
          // If message doesn't exist, it might have been already deleted by another request or auto-delete
          console.log(
            `Message ${messageId} not found - likely already deleted by user ${userId} or auto-delete`,
          );

          // Return success status to prevent client-side error for race conditions
          return res.status(200).json({
            success: true,
            message: "Message already deleted",
            messageId: messageId,
            alreadyDeleted: true,
          });
        }

        // 2. Verify that the current user is the sender of this message
        if (message.senderId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to delete this message" });
        }

        // 3. Verify that the user is part of the match
        const match = await storage.getMatchById(message.matchId);
        if (!match) {
          // CRITICAL FIX: Better handling for match lookup failures
          console.error(
            `⚠️ CRITICAL: Match ${message.matchId} not found during message deletion by user ${userId}. This suggests a data consistency issue.`,
          );

          // Before failing, try to recover by checking if this is a race condition
          // or temporary database issue
          try {
            // Give it one more try after a small delay
            await new Promise((resolve) => setTimeout(resolve, 100));
            const retryMatch = await storage.getMatchById(message.matchId);

            if (retryMatch) {
              console.log(
                `✅ RECOVERY: Match ${message.matchId} found on retry. Continuing with deletion.`,
              );
              // Use the recovered match and continue execution below
            } else {
              // If still not found, this is a serious data consistency issue
              console.error(
                `❌ CRITICAL: Match ${message.matchId} still not found after retry. Data consistency issue detected.`,
              );

              // Instead of failing with "Match not found", provide a more helpful response
              return res.status(200).json({
                success: true,
                message:
                  "Message deletion completed (match verification skipped due to temporary issue)",
                messageId: messageId,
                warning: "temporary_match_lookup_issue",
                userFriendlyMessage:
                  "Your message was removed. If you experience any issues, please refresh the page.",
              });
            }
          } catch (retryError) {
            console.error(`Failed to retry match lookup:`, retryError);

            // Fallback: Allow the deletion to proceed but warn about the issue
            console.log(
              `⚠️ FALLBACK: Proceeding with message deletion despite match lookup failure`,
            );

            return res.status(200).json({
              success: true,
              message:
                "Message deletion completed (match verification bypassed)",
              messageId: messageId,
              warning: "match_lookup_failed",
              userFriendlyMessage:
                "Your message was removed. Your match is still active.",
            });
          }
        }

        // Continue with the existing match verification logic
        const actualMatch =
          match || (await storage.getMatchById(message.matchId));
        if (
          actualMatch &&
          actualMatch.userId1 !== userId &&
          actualMatch.userId2 !== userId
        ) {
          return res
            .status(403)
            .json({ message: "Not authorized to access this match" });
        }

        // 4. Delete associated media files if they exist
        if (message.messageType === "audio" && message.audioUrl) {
          try {
            // TODO: Implement media file deletion from storage
            console.log(`Would delete audio file: ${message.audioUrl}`);
          } catch (mediaError) {
            console.error("Error deleting media file:", mediaError);
            // Continue with message deletion even if media deletion fails
          }
        }

        if (
          message.messageType === "image" &&
          message.content?.startsWith("_!_IMAGE_!_")
        ) {
          try {
            // TODO: Implement image file deletion from storage
            const imageUrl = message.content.replace("_!_IMAGE_!_", "");
            console.log(`Would delete image file: ${imageUrl}`);
          } catch (mediaError) {
            console.error("Error deleting image file:", mediaError);
            // Continue with message deletion even if media deletion fails
          }
        }

        // 5. Hard delete the message from database with race condition handling
        const deleteResult = await db
          .delete(messagesTable)
          .where(eq(messagesTable.id, messageId));

        // 6. Verify deletion was successful (optional - some databases return affected rows)
        const verificationMessage = await storage.getMessageById(messageId);
        if (verificationMessage) {
          // If verification fails, it might be a temporary database issue
          console.warn(
            `Message ${messageId} deletion verification failed, but delete command executed`,
          );
        }

        // 7. Invalidate all message caches to ensure data consistency
        try {
          invalidateMessageCaches(connectedUsers, {
            matchId: message.matchId,
            userId: userId,
            messageId: messageId,
            reason: "message_delete",
          });
        } catch (cacheError) {
          console.error(
            `Failed to invalidate caches for match ${message.matchId}:`,
            cacheError,
          );
          // Continue with the response even if cache invalidation fails
        }

        // 8. Broadcast deletion to all participants via WebSocket (even if verification fails)
        const otherUserId = actualMatch
          ? actualMatch.userId1 === userId
            ? actualMatch.userId2
            : actualMatch.userId1
          : null; // Handle case where match verification was bypassed

        // Only broadcast if we have a valid other user
        if (otherUserId) {
          // Create deletion broadcast message
          const deletionMessage = {
            type: "messageDeleted",
            messageId: messageId,
            matchId: message.matchId,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
          };

          // Notify the sender (current user)
          const senderWs = connectedUsers.get(userId);
          if (senderWs && senderWs.readyState === WebSocket.OPEN) {
            try {
              senderWs.send(JSON.stringify(deletionMessage));
            } catch (wsError) {
              console.error(
                `Failed to notify sender ${userId} of message deletion:`,
                wsError,
              );
            }
          }

          // Notify the receiver
          const receiverWs = connectedUsers.get(otherUserId);
          if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            try {
              receiverWs.send(JSON.stringify(deletionMessage));
            } catch (wsError) {
              console.error(
                `Failed to notify receiver ${otherUserId} of message deletion:`,
                wsError,
              );
            }
          }
        } else {
          console.warn(
            `⚠️ Skipping WebSocket broadcast for message ${messageId} - other user ID could not be determined`,
          );
        }

        console.log(
          `Message ${messageId} successfully deleted by user ${userId} from match ${message.matchId}`,
        );

        res.status(200).json({
          success: true,
          message: "Message deleted successfully",
          messageId: messageId,
          matchId: message.matchId,
        });
      } catch (error) {
        console.error("Error deleting message:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const requestedMessageId = parseInt(req.params.messageId);

        // Handle specific database constraint errors that might indicate the message was already deleted
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("does not exist")
        ) {
          return res.status(200).json({
            success: true,
            message: "Message already deleted",
            messageId: requestedMessageId,
            alreadyDeleted: true,
          });
        }

        res.status(500).json({
          message: "Server error deleting message",
          error: errorMessage,
          success: false,
        });
      }
    },
  );

  // DELETE message for recipient only (hide from their view)
  app.delete(
    "/api/messages/:messageId/recipient",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const messageId = parseInt(req.params.messageId);
        if (isNaN(messageId)) {
          return res.status(400).json({ message: "Invalid message ID" });
        }

        const userId = req.user.id;

        // 1. Get the message to verify access and get match info
        const message = await storage.getMessageById(messageId);
        if (!message) {
          return res.status(404).json({ message: "Message not found" });
        }

        // 2. Verify that the user is part of the match
        const match = await storage.getMatchById(message.matchId);
        if (!match) {
          return res.status(404).json({ message: "Match not found" });
        }

        if (match.userId1 !== userId && match.userId2 !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to access this match" });
        }

        // 3. Mark the message as deleted for this user only (recipient-side deletion)
        await storage.markMessageAsDeletedForUser(messageId, userId);

        // 4. Invalidate caches for this specific user
        try {
          invalidateMessageCaches(connectedUsers, {
            matchId: message.matchId,
            userId: userId,
            messageId: messageId,
            reason: "message_delete",
          });
        } catch (cacheError) {
          console.error(
            `Failed to invalidate caches for user ${userId} in match ${message.matchId}:`,
            cacheError,
          );
          // Continue with the response even if cache invalidation fails
        }

        console.log(
          `Message ${messageId} marked as deleted for user ${userId} (recipient deletion)`,
        );

        res.status(200).json({
          success: true,
          message: "Message deleted from your view",
          messageId: messageId,
          matchId: message.matchId,
        });
      } catch (error) {
        console.error("Error deleting message for recipient:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({
          message: "Server error deleting message",
          error: errorMessage,
          success: false,
        });
      }
    },
  );

  // Message reactions endpoints
  app.post(
    "/api/messages/:messageId/reactions",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const messageId = parseInt(req.params.messageId);
        const { emoji } = req.body;
        const userId = req.user.id;

        if (isNaN(messageId) || !emoji) {
          return res
            .status(400)
            .json({ message: "Invalid message ID or emoji" });
        }

        // Verify the message exists and user has access to it
        const message = await storage.getMessageById(messageId);
        if (!message) {
          return res.status(404).json({ message: "Message not found" });
        }

        // Verify user has access to this match
        const match = await storage.getMatchById(message.matchId);
        if (!match || (match.userId1 !== userId && match.userId2 !== userId)) {
          return res.status(403).json({ message: "Access denied" });
        }

        // 🎯 SURGICAL FIX: Add the reaction (this will replace any existing reaction)
        const reaction = await storage.addMessageReaction({
          messageId,
          userId,
          emoji,
        });

        // Get the user's name for the WebSocket broadcast
        const reactingUser = await storage.getUser(userId);
        const userName =
          reactingUser?.fullName || reactingUser?.username || "Someone";

        // Broadcast the reaction to other participants
        const otherUserId =
          match.userId1 === userId ? match.userId2 : match.userId1;
        const otherUserSocket = connectedUsers.get(otherUserId);

        if (otherUserSocket && otherUserSocket.readyState === WebSocket.OPEN) {
          // 🎯 Enhanced broadcast message to indicate this replaces any existing reaction
          otherUserSocket.send(
            JSON.stringify({
              type: "reactionReplaced", // Changed from "reactionAdded" to be more accurate
              messageId,
              userId,
              emoji,
              matchId: message.matchId,
              reaction: {
                ...reaction,
                userName: userName,
              },
              isReplacement: true, // Flag to indicate this replaces the user's previous reaction
            }),
          );
        }

        res.json({ success: true, reaction });
      } catch (error) {
        console.error("Error adding message reaction:", error);
        res.status(500).json({ message: "Failed to add reaction" });
      }
    },
  );

  app.delete(
    "/api/messages/:messageId/reactions",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const messageId = parseInt(req.params.messageId);
        const { emoji } = req.body;
        const userId = req.user.id;

        if (isNaN(messageId) || !emoji) {
          return res
            .status(400)
            .json({ message: "Invalid message ID or emoji" });
        }

        // Verify the message exists and user has access to it
        const message = await storage.getMessageById(messageId);
        if (!message) {
          return res.status(404).json({ message: "Message not found" });
        }

        // Verify user has access to this match
        const match = await storage.getMatchById(message.matchId);
        if (!match || (match.userId1 !== userId && match.userId2 !== userId)) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Remove the reaction
        await storage.removeMessageReaction(messageId, userId, emoji);

        // Get the user's name for the WebSocket broadcast
        const removingUser = await storage.getUser(userId);
        const userName =
          removingUser?.fullName || removingUser?.username || "Someone";

        // Broadcast the reaction removal to other participants
        const otherUserId =
          match.userId1 === userId ? match.userId2 : match.userId1;
        const otherUserSocket = connectedUsers.get(otherUserId);

        if (otherUserSocket && otherUserSocket.readyState === WebSocket.OPEN) {
          otherUserSocket.send(
            JSON.stringify({
              type: "reactionRemoved",
              messageId,
              userId,
              emoji,
              matchId: message.matchId,
              userName: userName,
            }),
          );
        }

        res.json({ success: true });
      } catch (error) {
        console.error("Error removing message reaction:", error);
        res.status(500).json({ message: "Failed to remove reaction" });
      }
    },
  );

  app.get(
    "/api/messages/:messageId/reactions",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const messageId = parseInt(req.params.messageId);
        const userId = req.user.id;

        if (isNaN(messageId)) {
          return res.status(400).json({ message: "Invalid message ID" });
        }

        // Verify the message exists and user has access to it
        const message = await storage.getMessageById(messageId);
        if (!message) {
          return res.status(404).json({ message: "Message not found" });
        }

        // Verify user has access to this match
        const match = await storage.getMatchById(message.matchId);
        if (!match || (match.userId1 !== userId && match.userId2 !== userId)) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Get reactions for this message
        const reactions = await storage.getMessageReactions(messageId);

        res.json({ reactions });
      } catch (error) {
        console.error("Error getting message reactions:", error);
        res.status(500).json({ message: "Failed to get reactions" });
      }
    },
  );

  app.get(
    "/api/matches/:matchId/reactions",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const matchId = parseInt(req.params.matchId);
        const userId = req.user.id;

        if (isNaN(matchId)) {
          return res.status(400).json({ message: "Invalid match ID" });
        }

        // Verify user has access to this match
        const match = await storage.getMatchById(matchId);
        if (!match || (match.userId1 !== userId && match.userId2 !== userId)) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Get all reactions for this match
        const reactions = await storage.getMessageReactionsByMatch(matchId);

        res.json({ reactions });
      } catch (error) {
        console.error("Error getting match reactions:", error);
        res.status(500).json({ message: "Failed to get reactions" });
      }
    },
  );

  // Auto-delete settings endpoints
  app.get(
    "/api/matches/:matchId/auto-delete-settings",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const matchId = parseInt(req.params.matchId);
        const userId = req.user.id;

        if (isNaN(matchId)) {
          return res.status(400).json({ message: "Invalid match ID" });
        }

        // Verify user has access to this match
        const match = await storage.getMatchById(matchId);
        if (!match || (match.userId1 !== userId && match.userId2 !== userId)) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Get auto-delete settings for this user and match
        const settings = await storage.getUserMatchSettings(userId, matchId);

        res.json({
          settings: settings || {
            autoDeleteMode: "never",
            autoDeleteValue: 5,
            autoDeleteUnit: "minutes",
          },
        });
      } catch (error) {
        console.error("Error getting auto-delete settings:", error);
        res.status(500).json({ message: "Failed to get auto-delete settings" });
      }
    },
  );

  app.post(
    "/api/matches/:matchId/auto-delete-settings",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const matchId = parseInt(req.params.matchId);
        const userId = req.user.id;
        const { autoDeleteMode, autoDeleteValue, autoDeleteUnit } = req.body;

        if (isNaN(matchId)) {
          return res.status(400).json({ message: "Invalid match ID" });
        }

        // Validate auto-delete mode
        if (!["never", "always", "custom"].includes(autoDeleteMode)) {
          return res.status(400).json({ message: "Invalid auto-delete mode" });
        }

        // Validate auto-delete unit for custom mode
        if (autoDeleteMode === "custom") {
          if (
            !["minutes", "hours", "days", "weeks", "months"].includes(
              autoDeleteUnit,
            )
          ) {
            return res
              .status(400)
              .json({ message: "Invalid auto-delete unit" });
          }
          if (!autoDeleteValue || autoDeleteValue < 1) {
            return res
              .status(400)
              .json({ message: "Invalid auto-delete value" });
          }
        }

        // Verify user has access to this match
        const match = await storage.getMatchById(matchId);
        if (!match || (match.userId1 !== userId && match.userId2 !== userId)) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Get current settings to check if mode is changing
        const currentSettings = await storage.getUserMatchSettings(
          userId,
          matchId,
        );
        const isChangingToAlways =
          autoDeleteMode === "always" &&
          (!currentSettings || currentSettings.autoDeleteMode !== "always");

        // Update auto-delete settings with timestamp when switching to 'always'
        const settingsData: any = {
          autoDeleteMode,
          autoDeleteValue: autoDeleteValue || 5,
          autoDeleteUnit: autoDeleteUnit || "minutes",
        };

        // If switching to 'always' mode for the first time, record the timestamp
        if (isChangingToAlways) {
          settingsData.alwaysModeActivatedAt = new Date();
          console.log(
            `User ${userId} activated "always" mode for match ${matchId} at ${settingsData.alwaysModeActivatedAt}`,
          );
        }

        const settings = await storage.updateUserMatchSettings(
          userId,
          matchId,
          settingsData,
        );

        // Note: We no longer delete existing messages when switching to 'always' mode
        // Messages will only be deleted if they were sent/received after the 'always' mode was activated

        res.json({ success: true, settings });
      } catch (error) {
        console.error("Error updating auto-delete settings:", error);
        res
          .status(500)
          .json({ message: "Failed to update auto-delete settings" });
      }
    },
  );

  // Endpoint to trigger auto-delete processing (for scheduled tasks)
  app.post(
    "/api/admin/process-auto-delete",
    async (req: Request, res: Response) => {
      try {
        await storage.processAutoDeleteMessages();
        res.json({
          success: true,
          message: "Auto-delete processing completed",
        });
      } catch (error) {
        console.error("Error processing auto-delete messages:", error);
        res
          .status(500)
          .json({ message: "Failed to process auto-delete messages" });
      }
    },
  );

  // Trigger auto-delete when user exits chat (for "always" mode)
  app.post(
    "/api/matches/:matchId/trigger-auto-delete",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const matchId = parseInt(req.params.matchId);
        const userId = req.user.id;

        if (isNaN(matchId)) {
          return res.status(400).json({ message: "Invalid match ID" });
        }

        // Verify user has access to this match
        const match = await storage.getMatchById(matchId);
        if (!match || (match.userId1 !== userId && match.userId2 !== userId)) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Get user's auto-delete settings
        const settings = await storage.getUserMatchSettings(userId, matchId);

        if (settings && settings.autoDeleteMode === "always") {
          console.log(
            `Triggering auto-delete for user ${userId} in match ${matchId} (always mode)`,
          );

          // Delete messages sent/received after "always" mode was activated
          await storage.deleteMessagesForUser(userId, matchId);

          // Get updated messages after deletion to determine new lastMessage for both users
          const remainingMessagesForUser = await storage.getMessagesByMatchId(
            matchId,
            userId,
          );
          const remainingMessagesForOther = await storage.getMessagesByMatchId(
            matchId,
            match.userId1 === userId ? match.userId2 : match.userId1,
          );

          const newLastMessageForUser =
            remainingMessagesForUser.length > 0
              ? remainingMessagesForUser[remainingMessagesForUser.length - 1]
              : null;
          const newLastMessageForOther =
            remainingMessagesForOther.length > 0
              ? remainingMessagesForOther[remainingMessagesForOther.length - 1]
              : null;

          // Broadcast message deletion to BOTH users
          const otherUserId =
            match.userId1 === userId ? match.userId2 : match.userId1;

          // Send to the current user (who triggered the deletion)
          const currentUserSocket = connectedUsers.get(userId);
          if (
            currentUserSocket &&
            currentUserSocket.readyState === WebSocket.OPEN
          ) {
            currentUserSocket.send(
              JSON.stringify({
                type: "messagesDeletedForUser",
                matchId,
                deletedForUserId: userId,
                reason: "always_mode_exit",
                isCurrentUser: true,
                newLastMessage: newLastMessageForUser
                  ? {
                      content: newLastMessageForUser.content,
                      createdAt: newLastMessageForUser.createdAt,
                      senderId: newLastMessageForUser.senderId,
                    }
                  : null,
              }),
            );
          }

          // Send to the other user
          const otherUserSocket = connectedUsers.get(otherUserId);
          if (
            otherUserSocket &&
            otherUserSocket.readyState === WebSocket.OPEN
          ) {
            otherUserSocket.send(
              JSON.stringify({
                type: "messagesDeletedForUser",
                matchId,
                deletedForUserId: userId,
                reason: "always_mode_exit",
                isCurrentUser: false,
                newLastMessage: newLastMessageForOther
                  ? {
                      content: newLastMessageForOther.content,
                      createdAt: newLastMessageForOther.createdAt,
                      senderId: newLastMessageForOther.senderId,
                    }
                  : null,
              }),
            );
          }

          // Broadcast matches refresh to ensure chat tabs update immediately
          const matchRefreshData = {
            type: "matches:refresh",
            matchId,
            reason: "auto_delete_lastMessage_update",
            timestamp: new Date().toISOString(),
          };

          if (
            currentUserSocket &&
            currentUserSocket.readyState === WebSocket.OPEN
          ) {
            currentUserSocket.send(JSON.stringify(matchRefreshData));
          }

          if (
            otherUserSocket &&
            otherUserSocket.readyState === WebSocket.OPEN
          ) {
            otherUserSocket.send(JSON.stringify(matchRefreshData));
          }

          res.json({
            success: true,
            message: "Auto-delete triggered successfully",
          });
        } else {
          res.json({ success: true, message: "No auto-delete needed" });
        }
      } catch (error) {
        console.error("Error triggering auto-delete:", error);
        res.status(500).json({ message: "Failed to trigger auto-delete" });
      }
    },
  );

  // End of API endpoints

  // Assign the broadcast function to the module variable so it can be called from profile update route
  profileVisibilityBroadcaster = broadcastProfileVisibilityChange;
  ghostModeBroadcaster = broadcastGhostModeChange;
  verificationStatusBroadcaster = broadcastVerificationStatusChange;

  // ===================================
  // SUITE PROFILE SYSTEM API ENDPOINTS
  // ===================================

  // Get SUITE profile settings for a user
  app.get(
    "/api/suite/profile-settings",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        const settings = await storage.getSuiteProfileSettings(userId);

        res.json(
          settings || {
            jobProfileActive: false,
            mentorshipProfileActive: false,
            networkingProfileActive: false,
            hiddenInJobDiscovery: false,
            hiddenInMentorshipDiscovery: false,
            hiddenInNetworkingDiscovery: false,
            primaryProfileType: null,
          },
        );
      } catch (error) {
        console.error("Error fetching SUITE profile settings:", error);
        res.status(500).json({ message: "Failed to fetch profile settings" });
      }
    },
  );

  // Update SUITE profile settings
  app.put(
    "/api/suite/profile-settings",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        const settings = req.body;

        const updatedSettings = await storage.updateSuiteProfileSettings(
          userId,
          settings,
        );
        res.json(updatedSettings);
      } catch (error) {
        console.error("Error updating SUITE profile settings:", error);
        res.status(500).json({ message: "Failed to update profile settings" });
      }
    },
  );

  // ===== JOB PROFILE ROUTES =====

  // Get job profile by user ID (for compatibility URLs)
  app.get(
    "/api/suite/job-profile/:userId",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const targetUserId = parseInt(req.params.userId);
        console.log(
          `[JOB-PROFILE-API] Request from user ${req.user.id} for job profile of target user ${targetUserId}`,
        );

        // CRITICAL FIX: Ensure we're fetching the target user's profile, not the current user's profile
        const profile = await storage.getSuiteJobProfile(targetUserId);

        if (!profile) {
          console.log(
            `[JOB-PROFILE-API] No job profile found for target user ${targetUserId}`,
          );
          return res.status(404).json({ message: "Job profile not found" });
        }

        console.log(
          `[JOB-PROFILE-API] Found job profile for target user ${targetUserId}:`,
          {
            profileId: profile.id,
            profileUserId: profile.userId,
            jobTitle: profile.jobTitle,
            description: profile.description,
            whoShouldApply: profile.whoShouldApply,
            applicationUrl: profile.applicationUrl,
            applicationEmail: profile.applicationEmail,
          },
        );

        // Verify the profile belongs to the target user
        if (profile.userId !== targetUserId) {
          console.error(
            `[JOB-PROFILE-API] CRITICAL ERROR: Profile user ID ${profile.userId} does not match target user ID ${targetUserId}`,
          );
          return res.status(500).json({ message: "Data integrity error" });
        }

        res.json(profile);
      } catch (error) {
        console.error("Error fetching job profile by user ID:", error);
        res.status(500).json({ message: "Failed to fetch job profile" });
      }
    },
  );

  // Get user's job profile
  app.get("/api/suite/job-profile", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.id;
      const jobProfile = await storage.getSuiteJobProfile(userId);
      res.json(jobProfile);
    } catch (error) {
      console.error("Error fetching job profile:", error);
      res.status(500).json({ message: "Failed to fetch job profile" });
    }
  });

  // Create or update job profile
  app.post("/api/suite/job-profile", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.id;
      const jobProfileData = { ...req.body, userId };

      const jobProfile = await storage.createOrUpdateSuiteJobProfile(
        userId,
        jobProfileData,
      );

      // Activate job profile in settings and automatically disable hiding
      // When user creates a profile, they want to be discoverable
      await storage.updateSuiteProfileSettings(userId, {
        jobProfileActive: true,
        hiddenInJobDiscovery: false, // Automatically make profile visible in discovery
      });

      res.json(jobProfile);
    } catch (error) {
      console.error("Error creating/updating job profile:", error);
      res.status(500).json({ message: "Failed to save job profile" });
    }
  });

  // Update job profile visibility preferences
  app.patch("/api/suite/job-profile", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.id;
      const { visibilityPreferences } = req.body;

      if (!visibilityPreferences) {
        return res
          .status(400)
          .json({ message: "Visibility preferences required" });
      }

      const updatedProfile = await storage.updateSuiteJobProfileVisibility(
        userId,
        visibilityPreferences,
      );

      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating job profile visibility:", error);
      res
        .status(500)
        .json({ message: "Failed to update visibility preferences" });
    }
  });

  // Delete job profile
  app.delete("/api/suite/job-profile", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.id;
      console.log("Deleting job profile for user:", userId);

      // Delete the job profile
      await storage.deleteSuiteJobProfile(userId);

      // Broadcast profile removal to all connected users for real-time swipecard removal
      broadcastToAllUsers({
        type: "suite_profile_deleted",
        profileType: "job",
        userId: userId,
        timestamp: new Date().toISOString(),
      });

      console.log("Job profile deleted successfully for user:", userId);
      res.json({
        success: true,
        message: "Job profile deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting job profile:", error);
      res.status(500).json({
        message: "Failed to delete job profile",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ===== MENTORSHIP PROFILE ROUTES =====

  // Get mentorship profile by user ID (for compatibility URLs)
  app.get(
    "/api/suite/mentorship-profile/:userId",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = parseInt(req.params.userId);
        // Get the first active mentorship profile for this user
        const profiles = await storage.getSuiteMentorshipProfiles(userId);
        const profile = profiles && profiles.length > 0 ? profiles[0] : null;

        if (!profile) {
          return res
            .status(404)
            .json({ message: "Mentorship profile not found" });
        }

        res.json(profile);
      } catch (error) {
        console.error("Error fetching mentorship profile by user ID:", error);
        res.status(500).json({ message: "Failed to fetch mentorship profile" });
      }
    },
  );

  // Get user's mentorship profile(s) - supports role query parameter
  app.get(
    "/api/suite/mentorship-profile",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        const role = req.query.role as string;

        if (role) {
          // Get specific role profile
          const mentorshipProfile = await storage.getSuiteMentorshipProfile(
            userId,
            role,
          );
          res.json(mentorshipProfile);
        } else {
          // Get all active profiles for this user
          const mentorshipProfiles =
            await storage.getSuiteMentorshipProfiles(userId);
          res.json(mentorshipProfiles);
        }
      } catch (error) {
        console.error("Error fetching mentorship profile:", error);
        res.status(500).json({ message: "Failed to fetch mentorship profile" });
      }
    },
  );

  // Get all mentorship profiles for a user (both mentor and mentee)
  app.get(
    "/api/suite/mentorship-profiles",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        const mentorshipProfiles =
          await storage.getSuiteMentorshipProfiles(userId);
        res.json(mentorshipProfiles);
      } catch (error) {
        console.error("Error fetching mentorship profiles:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch mentorship profiles" });
      }
    },
  );

  // Create or update mentorship profile
  app.post(
    "/api/suite/mentorship-profile",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        console.log("Received mentorship profile data:", req.body);

        // Remove userId from body to avoid conflicts
        const { userId: bodyUserId, ...mentorshipProfileData } = req.body;
        console.log("Cleaned mentorship profile data:", mentorshipProfileData);

        // Ensure role is specified
        if (!mentorshipProfileData.role) {
          return res
            .status(400)
            .json({ message: "Role (mentor/mentee) is required" });
        }

        const role = mentorshipProfileData.role;
        console.log("Creating/updating mentorship profile for role:", role);

        // Get existing profile for this role to preserve visibility preferences
        const existingProfile = await storage.getSuiteMentorshipProfileByRole(
          userId,
          role,
        );
        if (existingProfile?.visibilityPreferences) {
          mentorshipProfileData.visibilityPreferences =
            existingProfile.visibilityPreferences;
          console.log(
            "POST: Preserving existing mentorship visibilityPreferences:",
            existingProfile.visibilityPreferences,
          );
        }

        const mentorshipProfile =
          await storage.createOrUpdateSuiteMentorshipProfile(
            userId,
            mentorshipProfileData,
          );

        // Activate mentorship profile in settings and automatically disable hiding
        // When user creates a profile, they want to be discoverable
        await storage.updateSuiteProfileSettings(userId, {
          mentorshipProfileActive: true,
          hiddenInMentorshipDiscovery: false, // Automatically make profile visible in discovery
        });

        console.log(
          "Successfully saved mentorship profile:",
          mentorshipProfile,
        );
        res.json(mentorshipProfile);
      } catch (error: any) {
        console.error("Error creating/updating mentorship profile:", error);
        console.error("Error stack:", error?.stack);
        res.status(500).json({
          message: "Failed to save mentorship profile",
          error: error?.message,
        });
      }
    },
  );

  // Delete mentorship profile
  app.delete(
    "/api/suite/mentorship-profile",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        const { role } = req.query;

        console.log(
          "Deleting mentorship profile for user:",
          userId,
          "role:",
          role,
        );

        // Delete the mentorship profile(s)
        if (role) {
          await storage.deleteSuiteMentorshipProfile(userId, role as string);
        } else {
          // Delete all mentorship profiles for the user
          await storage.deleteSuiteMentorshipProfile(userId);
        }

        // Broadcast profile removal to all connected users for real-time swipecard removal
        broadcastToAllUsers({
          type: "suite_profile_deleted",
          profileType: "mentorship",
          userId: userId,
          role: role || "all",
          timestamp: new Date().toISOString(),
        });

        console.log(
          "Mentorship profile deleted successfully for user:",
          userId,
        );
        res.json({
          success: true,
          message: "Mentorship profile deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting mentorship profile:", error);
        res.status(500).json({
          message: "Failed to delete mentorship profile",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Update mentorship profile (for immediate visibility preference saves)
  app.patch(
    "/api/suite/mentorship-profile",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        console.log("PATCH Mentorship profile request body:", req.body);
        console.log("User ID:", userId);

        // For PATCH, only update the specific fields provided
        const updateData = req.body;
        console.log("Mentorship profile PATCH data:", updateData);
        console.log(
          "visibilityPreferences in PATCH data:",
          updateData.visibilityPreferences,
        );
        console.log(
          "Type of visibilityPreferences:",
          typeof updateData.visibilityPreferences,
        );

        // Validate visibilityPreferences JSON if provided
        if (updateData.visibilityPreferences) {
          try {
            const parsed = JSON.parse(updateData.visibilityPreferences);
            console.log(
              "Successfully parsed visibilityPreferences:",
              Object.keys(parsed),
            );
          } catch (jsonError) {
            console.error("Invalid JSON in visibilityPreferences:", jsonError);
            return res.status(400).json({
              message: "visibilityPreferences must be a valid JSON string",
            });
          }
        }

        // If role is specified, use role-specific logic
        if (updateData.role) {
          const role = updateData.role;
          console.log("PATCH: Updating profile for role:", role);

          // Get existing profile for this role to preserve other data
          const existingProfile = await storage.getSuiteMentorshipProfileByRole(
            userId,
            role,
          );
          if (!existingProfile) {
            console.log(
              "No existing mentorship profile found for role - PATCH requires existing profile",
            );
            return res.status(404).json({
              message:
                "No mentorship profile found. Create a profile first before updating preferences.",
            });
          }
        } else {
          // Fallback to general profile lookup if no role specified
          const existingProfile =
            await storage.getSuiteMentorshipProfile(userId);
          if (!existingProfile) {
            console.log(
              "No existing mentorship profile found - PATCH requires existing profile",
            );
            return res.status(404).json({
              message:
                "No mentorship profile found. Create a profile first before updating preferences.",
            });
          }
        }

        // Log before calling storage layer
        console.log(
          "PATCH: About to call createOrUpdateSuiteMentorshipProfile with:",
          {
            userId,
            updateDataKeys: Object.keys(updateData),
            hasVisibilityPreferences: !!updateData.visibilityPreferences,
            visibilityPreferencesType: typeof updateData.visibilityPreferences,
          },
        );

        const mentorshipProfile =
          await storage.createOrUpdateSuiteMentorshipProfile(
            userId,
            updateData,
          );

        console.log(
          "Successfully updated mentorship profile via PATCH:",
          mentorshipProfile,
        );
        res.json(mentorshipProfile);
      } catch (error: any) {
        console.error("Error updating mentorship profile via PATCH:", error);
        console.error("Error stack:", error?.stack);
        console.error("Error message:", error?.message);
        res.status(500).json({
          message: "Failed to update mentorship profile",
          error: error?.message,
        });
      }
    },
  );

  // ===== NETWORKING PROFILE ROUTES =====

  // Get networking profile by user ID (for compatibility URLs)
  app.get(
    "/api/suite/networking-profile/:userId",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = parseInt(req.params.userId);
        const profile = await storage.getSuiteNetworkingProfile(userId);

        if (!profile) {
          return res
            .status(404)
            .json({ message: "Networking profile not found" });
        }

        res.json(profile);
      } catch (error) {
        console.error("Error fetching networking profile by user ID:", error);
        res.status(500).json({ message: "Failed to fetch networking profile" });
      }
    },
  );

  // Get user's networking profile
  app.get(
    "/api/suite/networking-profile",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        console.log("Fetching networking profile for user:", userId);
        const networkingProfile =
          await storage.getSuiteNetworkingProfile(userId);
        console.log("Retrieved networking profile:", networkingProfile);
        console.log(
          "visibilityPreferences field:",
          networkingProfile?.visibilityPreferences,
        );
        res.json(networkingProfile);
      } catch (error) {
        console.error("Error fetching networking profile:", error);
        res.status(500).json({ message: "Failed to fetch networking profile" });
      }
    },
  );

  // Create or update networking profile
  app.post(
    "/api/suite/networking-profile",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        console.log("Networking profile request body:", req.body);
        console.log("User ID:", userId);

        // Remove userId from body to avoid conflicts
        const { userId: bodyUserId, ...networkingProfileData } = req.body;
        console.log("Cleaned networking profile data:", networkingProfileData);

        // Preserve existing visibilityPreferences when saving form data
        const existingProfile = await storage.getSuiteNetworkingProfile(userId);
        if (existingProfile?.visibilityPreferences) {
          networkingProfileData.visibilityPreferences =
            existingProfile.visibilityPreferences;
          console.log(
            "POST: Preserving existing visibilityPreferences:",
            existingProfile.visibilityPreferences,
          );
        }

        const networkingProfile =
          await storage.createOrUpdateSuiteNetworkingProfile(
            userId,
            networkingProfileData,
          );

        // Activate networking profile in settings and automatically disable hiding
        // When user creates a profile, they want to be discoverable
        await storage.updateSuiteProfileSettings(userId, {
          networkingProfileActive: true,
          hiddenInNetworkingDiscovery: false, // Automatically make profile visible in discovery
        });

        // Broadcast networking profile update to all connected users
        broadcastNetworkingProfileUpdate(userId, networkingProfile);

        console.log(
          "Successfully saved networking profile:",
          networkingProfile,
        );
        res.json(networkingProfile);
      } catch (error) {
        console.error("Error creating/updating networking profile:", error);
        console.error("Error stack:", error.stack);
        console.error("Error message:", error.message);
        res.status(500).json({
          message: "Failed to save networking profile",
          error: error.message,
        });
      }
    },
  );

  // Update networking profile (PUT method for complete profile updates)
  app.put(
    "/api/suite/networking-profile",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        console.log("PUT Networking profile request body:", req.body);
        console.log("User ID:", userId);

        // Remove userId from body to avoid conflicts
        const { userId: bodyUserId, ...networkingProfileData } = req.body;
        console.log("Cleaned networking profile data:", networkingProfileData);

        // Preserve existing visibilityPreferences when saving form data
        const existingProfile = await storage.getSuiteNetworkingProfile(userId);
        if (existingProfile?.visibilityPreferences) {
          networkingProfileData.visibilityPreferences =
            existingProfile.visibilityPreferences;
          console.log(
            "PUT: Preserving existing visibilityPreferences:",
            existingProfile.visibilityPreferences,
          );
        }

        const networkingProfile =
          await storage.createOrUpdateSuiteNetworkingProfile(
            userId,
            networkingProfileData,
          );

        // Do not automatically activate networking profile in settings
        // Users must explicitly activate it when they're ready

        // Broadcast networking profile update to all connected users
        broadcastNetworkingProfileUpdate(userId, networkingProfile);

        console.log(
          "Successfully updated networking profile via PUT:",
          networkingProfile,
        );
        res.json(networkingProfile);
      } catch (error) {
        console.error("Error updating networking profile via PUT:", error);
        console.error("Error stack:", error.stack);
        console.error("Error message:", error.message);
        res.status(500).json({
          message: "Failed to update networking profile",
          error: error.message,
        });
      }
    },
  );

  // Delete networking profile
  app.delete(
    "/api/suite/networking-profile",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        console.log("Deleting networking profile for user:", userId);

        // Delete the networking profile
        await storage.deleteSuiteNetworkingProfile(userId);

        // Broadcast profile removal to all connected users for real-time swipecard removal
        broadcastToAllUsers({
          type: "suite_profile_deleted",
          profileType: "networking",
          userId: userId,
          timestamp: new Date().toISOString(),
        });

        console.log(
          "Networking profile deleted successfully for user:",
          userId,
        );
        res.json({
          success: true,
          message: "Networking profile deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting networking profile:", error);
        res.status(500).json({
          message: "Failed to delete networking profile",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Update networking profile (for immediate visibility preference saves)
  app.patch(
    "/api/suite/networking-profile",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        console.log("PATCH Networking profile request body:", req.body);
        console.log("User ID:", userId);

        // For PATCH, only update the specific fields provided
        const updateData = req.body;
        console.log("Networking profile PATCH data:", updateData);
        console.log(
          "visibilityPreferences in PATCH data:",
          updateData.visibilityPreferences,
        );
        console.log(
          "Type of visibilityPreferences:",
          typeof updateData.visibilityPreferences,
        );

        // Ensure we have an existing profile to update
        const existingProfile = await storage.getSuiteNetworkingProfile(userId);
        if (!existingProfile) {
          console.log(
            "No existing networking profile found - PATCH requires existing profile",
          );
          return res.status(404).json({
            message:
              "No networking profile found. Create a profile first before updating preferences.",
          });
        }

        const networkingProfile =
          await storage.createOrUpdateSuiteNetworkingProfile(
            userId,
            updateData,
          );

        // Broadcast networking profile update to all connected users
        broadcastNetworkingProfileUpdate(userId, networkingProfile);

        console.log(
          "Successfully updated networking profile via PATCH:",
          networkingProfile,
        );
        res.json(networkingProfile);
      } catch (error) {
        console.error("Error updating networking profile via PATCH:", error);
        console.error("Error stack:", error.stack);
        console.error("Error message:", error.message);
        res.status(500).json({
          message: "Failed to update networking profile",
          error: error.message,
        });
      }
    },
  );

  // Activate/deactivate networking profile
  app.patch(
    "/api/suite/networking-profile/activate",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        const { active } = req.body;

        if (typeof active !== "boolean") {
          return res
            .status(400)
            .json({ message: "Active status must be a boolean" });
        }

        // Update profile settings
        await storage.updateSuiteProfileSettings(userId, {
          networkingProfileActive: active,
        });

        res.json({ success: true, networkingProfileActive: active });
      } catch (error) {
        console.error("Error updating networking profile activation:", error);
        res
          .status(500)
          .json({ message: "Failed to update profile activation" });
      }
    },
  );

  // ===== FIELD VISIBILITY ROUTES =====

  // Get field visibility settings for a profile type
  app.get(
    "/api/suite/field-visibility/:profileType",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        const profileType = req.params.profileType as
          | "job"
          | "mentorship"
          | "networking";

        if (!["job", "mentorship", "networking"].includes(profileType)) {
          return res.status(400).json({ message: "Invalid profile type" });
        }

        const visibilitySettings = await storage.getFieldVisibility(
          userId,
          profileType,
        );

        // Convert array to object for easier frontend consumption
        const visibilityObject = visibilitySettings.reduce(
          (acc, setting) => {
            acc[setting.fieldName] = setting.isVisible;
            return acc;
          },
          {} as Record<string, boolean>,
        );

        res.json(visibilityObject);
      } catch (error) {
        console.error("Error fetching field visibility:", error);
        res.status(500).json({ message: "Failed to fetch field visibility" });
      }
    },
  );

  // Update field visibility settings for a profile type
  app.post(
    "/api/suite/field-visibility/:profileType",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        const profileType = req.params.profileType as
          | "job"
          | "mentorship"
          | "networking";
        const visibilityData = req.body;

        if (!["job", "mentorship", "networking"].includes(profileType)) {
          return res.status(400).json({ message: "Invalid profile type" });
        }

        if (!visibilityData || typeof visibilityData !== "object") {
          return res.status(400).json({ message: "Invalid visibility data" });
        }

        await storage.updateMultipleFieldVisibility(
          userId,
          profileType,
          visibilityData,
        );

        res.json({ message: "Field visibility updated successfully" });
      } catch (error) {
        console.error("Error updating field visibility:", error);
        res.status(500).json({ message: "Failed to update field visibility" });
      }
    },
  );

  // Update field visibility settings for a profile type (PUT method)
  app.put(
    "/api/suite/field-visibility/:profileType",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        const profileType = req.params.profileType as
          | "job"
          | "mentorship"
          | "networking";
        const visibilityData = req.body;

        if (!["job", "mentorship", "networking"].includes(profileType)) {
          return res.status(400).json({ message: "Invalid profile type" });
        }

        if (!visibilityData || typeof visibilityData !== "object") {
          return res.status(400).json({ message: "Invalid visibility data" });
        }

        await storage.updateMultipleFieldVisibility(
          userId,
          profileType,
          visibilityData,
        );

        res.json({ message: "Field visibility updated successfully" });
      } catch (error) {
        console.error("Error updating field visibility:", error);
        res.status(500).json({ message: "Failed to update field visibility" });
      }
    },
  );

  // ===== DISCOVERY ROUTES =====

  // Get active job profiles for discovery
  app.get("/api/suite/discovery/jobs", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = req.user.id;
      // LOAD ALL AVAILABLE PROFILES: Remove pagination limits to load everything at once
      // This eliminates "No more cards" states when profiles are still available
      const jobProfiles = await storage.getDiscoveryJobProfiles(
        userId,
        1000, // High limit to get all available profiles
        0,
      );
      console.log(`Loaded ${jobProfiles.length} job profiles for discovery`);
      // Rank with SUITE Hybrid Matching Engine
      const { suiteMatchingEngine } = await import("./suite-matching-engine");
      const ranked = await suiteMatchingEngine.rankJobs(userId, jobProfiles);
      res.json(ranked);
    } catch (error) {
      console.error("Error fetching job discovery profiles:", error);
      res.status(500).json({ message: "Failed to fetch job profiles" });
    }
  });

  // Job application/swipe endpoint
  app.post("/api/suite/jobs/apply", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { profileId, action } = req.body;
      const userId = req.user.id;

      if (!profileId || !action) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (!["like", "pass"].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      // Get the job profile to verify it exists
      const jobProfile = await storage.getSuiteJobProfileById(profileId);
      if (!jobProfile) {
        return res.status(404).json({ message: "Job profile not found" });
      }

      // Check if user already applied to this job
      const existingApplication = await storage.getSuiteJobApplication(
        userId,
        profileId,
      );
      if (existingApplication) {
        return res.status(409).json({ message: "Already applied to this job" });
      }

      // Create the job application record
      const applicationData = {
        userId,
        targetProfileId: profileId,
        targetUserId: jobProfile.userId,
        action: action,
        matched: false,
        applicationStatus: action === "like" ? "pending" : "rejected",
      };

      const application =
        await storage.createSuiteJobApplication(applicationData);

      // Record swipe history for undo functionality
      await storage.addSwipeHistory({
        userId,
        targetUserId: jobProfile.userId,
        action: action === "like" ? "like" : "dislike",
        appMode: "SUITE_JOBS",
      });
      console.log(
        `📝 [SUITE-JOBS-HISTORY] Recorded swipe history for user ${userId} -> ${jobProfile.userId} (${action})`,
      );

      // For likes, check if there's already a reciprocal like from the job poster
      let isMatch = false;
      if (action === "like") {
        // Check if the job poster has already liked this user back
        // This would happen if the job poster swiped on the applicant's profile first
        const reciprocalApplication =
          await storage.getSuiteJobApplicationByUsers(
            jobProfile.userId, // job poster
            userId, // current user (applicant)
          );

        if (reciprocalApplication && reciprocalApplication.action === "like") {
          // We have a mutual like! Update both applications to matched status
          await storage.updateSuiteJobApplication(application.id, {
            matched: true,
            applicationStatus: "matched",
          });
          await storage.updateSuiteJobApplication(reciprocalApplication.id, {
            matched: true,
            applicationStatus: "matched",
          });
          isMatch = true;

          // Create match record for messaging system
          const matchData = {
            userId1: Math.min(userId, jobProfile.userId),
            userId2: Math.max(userId, jobProfile.userId),
            matched: true,
            isDislike: false,
            metadata: JSON.stringify({
              origin: "SUITE",
              suiteType: "jobs",
              context: "professional",
            }),
          };
          await storage.createMatch(matchData);

          console.log(
            `💼 [SUITE-JOBS] Instant match created: ${userId} ↔ ${jobProfile.userId}`,
          );

          // CRITICAL: Remove swipe history records for matched users to protect match integrity
          // This prevents either user from undoing their swipe and destroying the job match
          try {
            await storage.removeMatchedUsersFromSwipeHistory(
              userId,
              jobProfile.userId,
            );
            console.log(
              `[JOBS-MATCH] Cleaned up swipe history for matched users: ${userId} ↔ ${jobProfile.userId}`,
            );
          } catch (historyError) {
            console.error(
              "Error cleaning up jobs swipe history for matched users:",
              historyError,
            );
            // Don't fail the match if cleanup fails, but log it for debugging
          }
        }
      }

      // CRITICAL: Send bidirectional card removal messages for real-time discovery
      // This ensures cards disappear from both users' discover decks immediately
      const removalMessage = {
        type: "suite_remove_from_discover",
        suiteType: "jobs", // Backend sends plural "jobs"
        removeProfileId: profileId,
        removeUserId: jobProfile.userId,
        reason: `jobs_${action}_action`,
        timestamp: new Date().toISOString(),
      };

      // Send removal message to current user (who swiped)
      const currentUserWs = connectedUsers.get(userId);
      if (currentUserWs && currentUserWs.readyState === 1) {
        currentUserWs.send(JSON.stringify(removalMessage));
        console.log(
          `🗑️ [JOBS-REMOVAL] Sent card removal to user ${userId} for profile ${profileId}`,
        );
      }

      // Send removal message to target user (profile owner) - remove current user's card from their deck
      const targetUserWs = connectedUsers.get(jobProfile.userId);
      if (targetUserWs && targetUserWs.readyState === 1) {
        // CRITICAL FIX: Need to find current user's job profile ID, not just user ID
        // Frontend compares card.id (profile ID) not card.userId
        try {
          const currentUserJobProfile =
            await storage.getSuiteJobProfileByUserId(userId);
          if (currentUserJobProfile) {
            const targetRemovalMessage = {
              type: "suite_remove_from_discover",
              suiteType: "jobs",
              removeProfileId: currentUserJobProfile.id, // Use profile ID, not user ID
              removeUserId: userId,
              reason: `jobs_bidirectional_${action}`,
              timestamp: new Date().toISOString(),
            };
            targetUserWs.send(JSON.stringify(targetRemovalMessage));
            console.log(
              `🗑️ [JOBS-REMOVAL] Sent bidirectional card removal to user ${jobProfile.userId} for profile ${currentUserJobProfile.id} (user ${userId})`,
            );
          }
        } catch (profileError) {
          console.error(
            "Error getting current user's job profile for bidirectional removal:",
            profileError,
          );
        }
      }

      // Send WebSocket notification to job poster for likes
      if (action === "like") {
        if (targetUserWs && targetUserWs.readyState === 1) {
          const notificationData = {
            type: isMatch ? "job_match" : "job_application",
            application: application,
            fromUserId: userId,
            isMatch,
            timestamp: new Date().toISOString(),
          };
          targetUserWs.send(JSON.stringify(notificationData));
          console.log(
            `WebSocket notification sent to user ${jobProfile.userId} for job application`,
          );
        }
      }

      res.json({
        success: true,
        action,
        profileId,
        isMatch,
        message: isMatch
          ? "It's a job match!"
          : action === "like"
            ? "Application submitted"
            : "Job passed",
      });
    } catch (error) {
      console.error("Error processing job application:", error);
      res.status(500).json({ message: "Failed to process job application" });
    }
  });

  // Job application response endpoint (accept/decline)
  app.post(
    "/api/suite/connections/jobs/:applicationId/respond",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const { action } = req.body; // "accept" or "decline"
        const applicationId = parseInt(req.params.applicationId);
        const currentUserId = req.user.id;

        if (!["accept", "decline"].includes(action)) {
          return res.status(400).json({ message: "Invalid action" });
        }

        // Get the existing job application
        const existingApplication =
          await storage.getSuiteJobApplicationById(applicationId);
        if (!existingApplication) {
          return res.status(404).json({ message: "Job application not found" });
        }

        // Verify the current user is the target (job poster)
        if (existingApplication.targetUserId !== currentUserId) {
          return res
            .status(403)
            .json({ message: "Not authorized to respond to this application" });
        }

        let isMatch = false;
        if (action === "accept") {
          // Update application to accepted and matched
          await storage.updateSuiteJobApplication(existingApplication.id, {
            applicationStatus: "accepted",
            matched: true,
          });

          isMatch = true;

          // AUTOMATIC ADDITIONAL CONNECTION DETECTION: Check for existing matches and networking connections
          const existingMatch = await storage.getMatchBetweenUsers(
            currentUserId,
            existingApplication.userId,
          );
          console.log(
            `🔍 [JOBS-ACCEPT-DEBUG] Existing match found: ${existingMatch ? `ID ${existingMatch.id}` : "none"}`,
          );

          // CRITICAL FIX: Also check for existing networking connections that aren't yet in matches table
          // Check both users' networking profiles and look for connections between them
          const currentUserNetworkingProfile =
            await storage.getSuiteNetworkingProfile(currentUserId);
          const targetUserNetworkingProfile =
            await storage.getSuiteNetworkingProfile(existingApplication.userId);

          console.log(
            `🔍 [JOBS-ACCEPT-DEBUG] Networking profiles - Current user ${currentUserId}: ${currentUserNetworkingProfile ? "exists" : "none"}, Target user ${existingApplication.userId}: ${targetUserNetworkingProfile ? "exists" : "none"}`,
          );

          let existingNetworkingConnection = null;
          if (currentUserNetworkingProfile && targetUserNetworkingProfile) {
            // Check for connection from current user to target
            const connection1 = await storage.getSuiteNetworkingConnection(
              currentUserId,
              targetUserNetworkingProfile.id,
            );
            // Check for connection from target to current user
            const connection2 = await storage.getSuiteNetworkingConnection(
              existingApplication.userId,
              currentUserNetworkingProfile.id,
            );

            console.log(
              `🔍 [JOBS-ACCEPT-DEBUG] Connection1 (${currentUserId} -> ${targetUserNetworkingProfile.id}): ${connection1 ? `matched=${connection1.matched}, action=${connection1.action}` : "none"}`,
            );
            console.log(
              `🔍 [JOBS-ACCEPT-DEBUG] Connection2 (${existingApplication.userId} -> ${currentUserNetworkingProfile.id}): ${connection2 ? `matched=${connection2.matched}, action=${connection2.action}` : "none"}`,
            );

            // Use the matched connection if available, otherwise any accepted connection
            existingNetworkingConnection =
              connection1?.matched || connection2?.matched
                ? connection1?.matched
                  ? connection1
                  : connection2
                : connection1?.action === "like" &&
                    connection2?.action === "like"
                  ? connection1
                  : null;
          }

          console.log(
            `🔍 [JOBS-ACCEPT-DEBUG] Final networking connection selected: ${existingNetworkingConnection ? `matched=${existingNetworkingConnection.matched}` : "none"}`,
          );
          let finalMatch;

          if (existingMatch) {
            // Parse existing metadata to check for additional connections
            try {
              let existingMetadata;

              if (existingMatch.metadata) {
                existingMetadata =
                  typeof existingMatch.metadata === "string"
                    ? JSON.parse(existingMatch.metadata)
                    : existingMatch.metadata;
              }

              console.log(
                `🔍 [JOBS-ACCEPT-DEBUG] Existing match metadata:`,
                existingMetadata,
              );

              if (existingMetadata) {
                // ENHANCED LOGIC: Always check for networking connections and add them to additionalConnections
                if (!existingMetadata.additionalConnections) {
                  existingMetadata.additionalConnections = [];
                }

                // Check if we need to add networking to additionalConnections
                if (
                  existingNetworkingConnection &&
                  existingNetworkingConnection.matched &&
                  !existingMetadata.additionalConnections.includes("networking")
                ) {
                  existingMetadata.additionalConnections.push("networking");
                  console.log(
                    `🔗 [JOBS-ACCEPT] Adding networking to additionalConnections for existing match ${existingMatch.id}`,
                  );
                }

                // Check if this is a new connection type (SUITE-to-SUITE or MEET-to-SUITE)
                if (
                  (existingMetadata.origin === "SUITE" &&
                    existingMetadata.suiteType !== "jobs") ||
                  existingMetadata.origin === "MEET"
                ) {
                  // Add jobs to additionalConnections if not already present
                  if (
                    !existingMetadata.additionalConnections.includes("jobs")
                  ) {
                    existingMetadata.additionalConnections.push("jobs");
                    console.log(
                      `🔗 [JOBS-ACCEPT] Adding jobs to additionalConnections for existing match ${existingMatch.id} between users ${currentUserId} and ${existingApplication.userId}`,
                    );
                  }

                  // Update existing match with enhanced metadata
                  finalMatch = await storage.updateMatch(existingMatch.id, {
                    matched: true,
                    metadata: JSON.stringify(existingMetadata),
                  });
                } else {
                  // Jobs is primary, but check if we need to add networking as additional
                  if (
                    existingNetworkingConnection &&
                    existingNetworkingConnection.matched &&
                    !existingMetadata.additionalConnections.includes(
                      "networking",
                    )
                  ) {
                    existingMetadata.additionalConnections.push("networking");
                    console.log(
                      `🔗 [JOBS-ACCEPT] Adding networking to additionalConnections for jobs match ${existingMatch.id}`,
                    );

                    // Update existing match with networking as additional connection
                    finalMatch = await storage.updateMatch(existingMatch.id, {
                      matched: true,
                      metadata: JSON.stringify(existingMetadata),
                    });
                  } else {
                    // Update existing match with jobs metadata (same origin or no additional connections)
                    finalMatch = await storage.updateMatch(existingMatch.id, {
                      matched: true,
                      metadata: JSON.stringify(existingMetadata),
                    });
                    console.log(
                      `🔗 [JOBS-ACCEPT] Updated existing match ${existingMatch.id} with jobs metadata`,
                    );
                  }
                }
              } else {
                // No existing metadata, create new metadata and check for networking connections
                const newMetadata = {
                  origin: "SUITE",
                  suiteType: "jobs",
                  context: "professional",
                  additionalConnections: [],
                };

                // Add networking if it exists and is matched
                if (
                  existingNetworkingConnection &&
                  existingNetworkingConnection.matched
                ) {
                  newMetadata.additionalConnections.push("networking");
                  console.log(
                    `🔗 [JOBS-ACCEPT] Adding networking to new metadata for match ${existingMatch.id}`,
                  );
                }

                finalMatch = await storage.updateMatch(existingMatch.id, {
                  matched: true,
                  metadata: JSON.stringify(newMetadata),
                });
                console.log(
                  `🔗 [JOBS-ACCEPT] Added jobs metadata with networking additional connection to existing match ${existingMatch.id}`,
                );
              }
            } catch (parseError) {
              console.error("Failed to parse existing metadata:", parseError);
              // Fallback to updating with new jobs metadata
              finalMatch = await storage.updateMatch(existingMatch.id, {
                matched: true,
                metadata: JSON.stringify({
                  origin: "SUITE",
                  suiteType: "jobs",
                  context: "professional",
                }),
              });
            }
          } else if (
            existingNetworkingConnection &&
            (existingNetworkingConnection.matched ||
              existingNetworkingConnection.action === "like")
          ) {
            // CRITICAL FIX: Found existing networking connection but no match record - create match with additional connection
            console.log(
              `🔗 [JOBS-ACCEPT] Found existing networking connection between users ${currentUserId} and ${existingApplication.userId}, creating match with jobs as additional connection`,
            );

            const matchData = {
              userId1: Math.min(currentUserId, existingApplication.userId),
              userId2: Math.max(currentUserId, existingApplication.userId),
              matched: true,
              isDislike: false,
              metadata: JSON.stringify({
                origin: "SUITE",
                suiteType: "networking",
                context: "professional",
                additionalConnections: ["jobs"],
              }),
            };
            finalMatch = await storage.createMatch(matchData);
            console.log(
              `🔗 [JOBS-ACCEPT] Created new match ${finalMatch.id} with networking as primary and jobs as additional connection`,
            );
          } else {
            // Create new match record for messaging system
            const matchData = {
              userId1: Math.min(currentUserId, existingApplication.userId),
              userId2: Math.max(currentUserId, existingApplication.userId),
              matched: true,
              isDislike: false,
              metadata: JSON.stringify({
                origin: "SUITE",
                suiteType: "jobs",
                context: "professional",
              }),
            };
            finalMatch = await storage.createMatch(matchData);
            console.log(
              `🔗 [JOBS-ACCEPT] Created new jobs match between users ${currentUserId} and ${existingApplication.userId}`,
            );
          }

          // CRITICAL: Remove swipe history records for matched users to protect match integrity
          // This prevents either user from undoing their swipe and destroying the job match
          try {
            await storage.removeMatchedUsersFromSwipeHistory(
              currentUserId,
              existingApplication.userId,
            );
            console.log(
              `[JOBS-ACCEPT-MATCH] Cleaned up swipe history for matched users: ${currentUserId} ↔ ${existingApplication.userId}`,
            );
          } catch (historyError) {
            console.error(
              "Error cleaning up jobs accept swipe history for matched users:",
              historyError,
            );
            // Don't fail the match if cleanup fails, but log it for debugging
          }

          // Get user details for match notification
          const acceptedByUser = await storage.getUser(currentUserId);
          const applicantUser = await storage.getUser(
            existingApplication.userId,
          );

          // Send WebSocket notification to the applicant
          const applicantWs = connectedUsers.get(existingApplication.userId);
          console.log(
            `[SUITE-JOBS-DEBUG] Applicant WebSocket for user ${existingApplication.userId}: ${applicantWs ? `found, readyState=${applicantWs.readyState}` : "NOT FOUND"}`,
          );
          if (applicantWs && applicantWs.readyState === 1) {
            const notificationData = {
              type: "job_match",
              application: {
                id: existingApplication.id,
                userId: existingApplication.userId,
                targetUserId: existingApplication.targetUserId,
              },
              acceptedBy: currentUserId,
              isMatch: true,
              timestamp: new Date().toISOString(),
              matchedUserName: acceptedByUser?.fullName,
              matchedUserPhoto: acceptedByUser?.photoUrl,
              matchedUserProfession: acceptedByUser?.profession,
              matchedUserLocation: acceptedByUser?.location,
            };
            applicantWs.send(JSON.stringify(notificationData));
            console.log(
              `[SUITE-JOBS] Sent job match notification to applicant (User ${existingApplication.userId})`,
            );
          } else {
            console.log(
              `[SUITE-JOBS-ERROR] Cannot send notification to applicant (User ${existingApplication.userId}) - WebSocket ${applicantWs ? "not ready" : "not found"}`,
            );
          }

          // Send WebSocket notification to the job poster (accepter)
          const accepterWs = connectedUsers.get(currentUserId);
          console.log(
            `[SUITE-JOBS-DEBUG] Accepter WebSocket for user ${currentUserId}: ${accepterWs ? `found, readyState=${accepterWs.readyState}` : "NOT FOUND"}`,
          );
          if (accepterWs && accepterWs.readyState === 1) {
            const notificationData = {
              type: "job_match",
              application: {
                id: existingApplication.id,
                userId: existingApplication.userId,
                targetUserId: existingApplication.targetUserId,
              },
              acceptedBy: currentUserId,
              isMatch: true,
              timestamp: new Date().toISOString(),
              matchedUserName: applicantUser?.fullName,
              matchedUserPhoto: applicantUser?.photoUrl,
              matchedUserProfession: applicantUser?.profession,
              matchedUserLocation: applicantUser?.location,
            };
            accepterWs.send(JSON.stringify(notificationData));
            console.log(
              `[SUITE-JOBS] Sent job match notification to accepter (User ${currentUserId})`,
            );
          } else {
            console.log(
              `[SUITE-JOBS-ERROR] Cannot send notification to accepter (User ${currentUserId}) - WebSocket ${accepterWs ? "not ready" : "not found"}`,
            );
          }
        } else {
          // For decline, update the application to rejected
          await storage.updateSuiteJobApplication(existingApplication.id, {
            applicationStatus: "rejected",
            matched: false,
          });
        }

        res.json({
          success: true,
          isMatch,
          action,
          message:
            action === "accept"
              ? "Application accepted"
              : "Application declined",
        });
      } catch (error) {
        console.error("Error responding to job application:", error);
        res
          .status(500)
          .json({ message: "Failed to respond to job application" });
      }
    },
  );

  // Get active mentorship profiles for discovery (ranked by SUITE engine)
  app.get(
    "/api/suite/discovery/mentorship",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        // LOAD ALL AVAILABLE PROFILES: Remove pagination limits to load everything at once
        // This eliminates "No more cards" states when profiles are still available
        const mentorshipProfiles = await storage.getDiscoveryMentorshipProfiles(
          userId,
          1000, // High limit to get all available profiles
          0,
        );
        console.log(
          `Loaded ${mentorshipProfiles.length} mentorship profiles for discovery`,
        );
        // Rank with SUITE Hybrid Matching Engine
        const { suiteMatchingEngine } = await import("./suite-matching-engine");
        const ranked = await suiteMatchingEngine.rankMentorship(
          userId,
          mentorshipProfiles,
        );
        res.json(ranked);
      } catch (error) {
        console.error("Error fetching mentorship discovery profiles:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch mentorship profiles" });
      }
    },
  );

  // Get active networking profiles for discovery (ranked by SUITE engine)
  app.get(
    "/api/suite/discovery/networking",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const userId = req.user.id;
        // LOAD ALL AVAILABLE PROFILES: Remove pagination limits to load everything at once
        // This eliminates "No more cards" states when profiles are still available
        const networkingProfiles = await storage.getDiscoveryNetworkingProfiles(
          userId,
          1000, // High limit to get all available profiles
          0,
        );

        console.log(
          `Loaded ${networkingProfiles.length} networking profiles for discovery`,
        );
        // Rank with SUITE Hybrid Matching Engine
        const { suiteMatchingEngine } = await import("./suite-matching-engine");
        const ranked = await suiteMatchingEngine.rankNetworking(
          userId,
          networkingProfiles,
        );
        res.json(ranked);
      } catch (error) {
        console.error("Error fetching networking discovery profiles:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch networking profiles" });
      }
    },
  );

  // SUITE networking swipe actions
  app.post(
    "/api/suite/networking/swipe",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const { profileId, action } = req.body;
        const currentUserId = req.user.id;

        if (!profileId || !action || !["like", "pass"].includes(action)) {
          return res.status(400).json({ message: "Invalid swipe data" });
        }

        // CRITICAL VALIDATION: Check if current user has a networking profile
        // Users must create their own profile before swiping on others
        const currentUserNetworkingProfile =
          await storage.getSuiteNetworkingProfile(currentUserId);
        if (!currentUserNetworkingProfile) {
          return res.status(403).json({
            message: "Profile required",
            action: "create_profile",
            profileType: "networking",
          });
        }

        // Get the target profile to get the target user ID
        const targetProfile =
          await storage.getSuiteNetworkingProfileById(profileId);
        if (!targetProfile) {
          return res.status(404).json({ message: "Profile not found" });
        }

        // Record the swipe action in database
        const connectionData = {
          userId: currentUserId,
          targetProfileId: profileId,
          targetUserId: targetProfile.userId,
          action: action,
          matched: false,
        };

        // Check if user already swiped on this profile
        const existingConnection = await storage.getSuiteNetworkingConnection(
          currentUserId,
          profileId,
        );
        if (existingConnection) {
          return res
            .status(409)
            .json({ message: "Already acted on this profile" });
        }

        // Create the connection record
        const connection =
          await storage.createSuiteNetworkingConnection(connectionData);

        // Delete compatibility score record if user dislikes/passes on the other
        if (action === "pass") {
          try {
            // Find and delete any existing compatibility score between these users
            const existingScore = await storage.getSuiteCompatibilityScore(
              currentUserId,
              profileId,
            );

            if (existingScore) {
              // Delete the compatibility score record
              await storage.deleteSuiteCompatibilityScore(existingScore.id);
              console.log(
                `🗑️ [COMPATIBILITY-CLEANUP] Deleted networking compatibility score ${existingScore.id} after user ${currentUserId} passed on profile ${profileId}`,
              );
            }
          } catch (cleanupError) {
            console.error(
              "Error cleaning up compatibility score after dislike:",
              cleanupError,
            );
            // Don't fail the request if cleanup fails
          }
        }

        // Record swipe history for undo functionality
        await storage.addSwipeHistory({
          userId: currentUserId,
          targetUserId: targetProfile.userId,
          action: action === "like" ? "like" : "dislike",
          appMode: "SUITE_NETWORKING",
        });
        console.log(
          `📝 [SUITE-NETWORKING-HISTORY] Recorded swipe history for user ${currentUserId} -> ${targetProfile.userId} (${action})`,
        );

        // Get source user's networking profile for both match checking and card removal
        const sourceNetworkingProfile =
          await storage.getSuiteNetworkingProfile(currentUserId);

        // Check for mutual like if this was a like action
        let isMatch = false;
        if (action === "like" && sourceNetworkingProfile) {
          const mutualConnection = await storage.getSuiteNetworkingConnection(
            targetProfile.userId,
            sourceNetworkingProfile.id,
          );
          if (mutualConnection && mutualConnection.action === "like") {
            // Update both connections to matched status
            await storage.updateSuiteNetworkingConnection(connection.id, {
              matched: true,
            });
            await storage.updateSuiteNetworkingConnection(mutualConnection.id, {
              matched: true,
            });
            isMatch = true;

            // Create or update match record for messaging system with automatic additionalConnections logic
            const existingMatch = await storage.getMatchBetweenUsers(
              currentUserId,
              targetProfile.userId,
            );
            let finalMatch;

            if (existingMatch) {
              // Handle existing match with potential metadata update for additional connections
              let metadata;

              if (!existingMatch.metadata) {
                // No existing metadata, create new
                metadata = {
                  origin: "SUITE",
                  suiteType: "networking",
                  context: "professional",
                };
              } else {
                // Parse existing metadata to check for additional connections
                try {
                  metadata =
                    typeof existingMatch.metadata === "string"
                      ? JSON.parse(existingMatch.metadata)
                      : existingMatch.metadata;

                  // Check if this is a new connection type
                  if (metadata.suiteType !== "networking") {
                    // Add to additionalConnections if not already present
                    if (!metadata.additionalConnections) {
                      metadata.additionalConnections = [];
                    }

                    if (
                      !metadata.additionalConnections.includes("networking")
                    ) {
                      metadata.additionalConnections.push("networking");
                      console.log(
                        `🔗 Adding networking to additionalConnections for existing match ${existingMatch.id}`,
                      );
                    }
                  }
                } catch (parseError) {
                  console.error(
                    "Failed to parse existing metadata:",
                    parseError,
                  );
                  // Fallback to new metadata
                  metadata = {
                    origin: "SUITE",
                    suiteType: "networking",
                    context: "professional",
                  };
                }
              }

              // Update existing match with enhanced metadata
              finalMatch = await storage.updateMatch(existingMatch.id, {
                matched: true,
                metadata: JSON.stringify(metadata),
              });
            } else {
              // Create new match
              const matchData = {
                userId1: Math.min(currentUserId, targetProfile.userId),
                userId2: Math.max(currentUserId, targetProfile.userId),
                matched: true,
                isDislike: false,
                metadata: JSON.stringify({
                  origin: "SUITE",
                  suiteType: "networking",
                  context: "professional",
                }),
              };
              finalMatch = await storage.createMatch(matchData);
            }

            console.log(
              `💝 [SUITE-NETWORKING] Match created: ${currentUserId} ↔ ${targetProfile.userId}`,
            );
          }
        }

        console.log(
          `🚀 [SUITE-NETWORKING] User ${currentUserId} ${action}d networking profile ${profileId}`,
        );

        // AGGRESSIVE REAL-TIME CARD REMOVAL: Remove cards instantly from both users' UIs
        const sourceUserWs = connectedUsers.get(currentUserId);
        const targetUserWs = connectedUsers.get(targetProfile.userId);

        // SURGICAL FIX: Bulletproof WebSocket connection management
        console.log(`[DEBUG-NETWORKING] WebSocket connections check:`);
        console.log(
          `  - Source user ${currentUserId}: ${sourceUserWs ? "CONNECTED" : "NOT FOUND"} (readyState: ${sourceUserWs?.readyState})`,
        );
        console.log(
          `  - Target user ${targetProfile.userId}: ${targetUserWs ? "CONNECTED" : "NOT FOUND"} (readyState: ${targetUserWs?.readyState})`,
        );
        console.log(`  - Total connected users: ${connectedUsers.size}`);
        console.log(
          `  - Connected user IDs: [${Array.from(connectedUsers.keys()).join(", ")}]`,
        );

        // FORCE IMMEDIATE CARD REMOVAL: Send to all connected users if specific user not found
        let sourceRemovalSent = false;
        let targetRemovalSent = false;

        // 1. Remove target's card from source user's discover deck immediately
        if (sourceUserWs && sourceUserWs.readyState === WebSocket.OPEN) {
          sourceUserWs.send(
            JSON.stringify({
              type: "suite_remove_from_discover",
              suiteType: "networking",
              removeProfileId: profileId,
              removeUserId: targetProfile.userId,
              reason: `networking_${action}_action`,
              timestamp: new Date().toISOString(),
            }),
          );

          console.log(
            `[REAL-TIME] Instantly removed networking profile ${profileId} from user ${currentUserId}'s discover deck`,
          );
          sourceRemovalSent = true;
        } else {
          // FALLBACK: Broadcast to all connected users if source user not found
          console.log(
            `[FALLBACK] Source user ${currentUserId} WebSocket not found, broadcasting removal to all users`,
          );
          connectedUsers.forEach((ws, userId) => {
            if (userId === currentUserId && ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "suite_remove_from_discover",
                  suiteType: "networking",
                  removeProfileId: profileId,
                  removeUserId: targetProfile.userId,
                  reason: `networking_${action}_action_fallback`,
                  timestamp: new Date().toISOString(),
                }),
              );
              sourceRemovalSent = true;
              console.log(
                `[FALLBACK] Successfully sent removal to source user ${currentUserId}`,
              );
            }
          });
        }

        // 2. Remove source user's card from target user's discover deck immediately
        if (
          sourceNetworkingProfile &&
          targetUserWs &&
          targetUserWs.readyState === WebSocket.OPEN
        ) {
          targetUserWs.send(
            JSON.stringify({
              type: "suite_remove_from_discover",
              suiteType: "networking",
              removeProfileId: sourceNetworkingProfile.id,
              removeUserId: currentUserId,
              reason: `received_networking_${action}`,
              timestamp: new Date().toISOString(),
            }),
          );

          console.log(
            `[REAL-TIME] Instantly removed networking profile ${sourceNetworkingProfile.id} from user ${targetProfile.userId}'s discover deck`,
          );
          targetRemovalSent = true;
        } else if (sourceNetworkingProfile) {
          // FALLBACK: Broadcast to all connected users if target user not found
          console.log(
            `[FALLBACK] Target user ${targetProfile.userId} WebSocket not found, broadcasting removal to all users`,
          );
          connectedUsers.forEach((ws, userId) => {
            if (
              userId === targetProfile.userId &&
              ws.readyState === WebSocket.OPEN
            ) {
              ws.send(
                JSON.stringify({
                  type: "suite_remove_from_discover",
                  suiteType: "networking",
                  removeProfileId: sourceNetworkingProfile.id,
                  removeUserId: currentUserId,
                  reason: `received_networking_${action}_fallback`,
                  timestamp: new Date().toISOString(),
                }),
              );
              targetRemovalSent = true;
              console.log(
                `[FALLBACK] Successfully sent removal to target user ${targetProfile.userId}`,
              );
            }
          });
        }

        // Log final removal status
        console.log(
          `[REMOVAL-STATUS] Source: ${sourceRemovalSent ? "✅ SENT" : "❌ FAILED"}, Target: ${targetRemovalSent ? "✅ SENT" : "❌ FAILED"}`,
        );

        // Send real-time WebSocket notification for networking likes
        if (action === "like") {
          try {
            if (targetUserWs && targetUserWs.readyState === WebSocket.OPEN) {
              // Get source user info for the notification
              const sourceUser = await storage.getUser(currentUserId);
              const safeUserInfo = sourceUser
                ? (({ password, ...rest }) => rest)(sourceUser)
                : { id: currentUserId, fullName: "Unknown User" };

              // Get connection counts for the target user
              const userNetworkingConnections =
                await storage.getUserNetworkingConnections(
                  targetProfile.userId,
                );
              const pendingConnections = userNetworkingConnections.filter(
                (conn) => !conn.matched && conn.action === "like",
              );
              const confirmedConnections = userNetworkingConnections.filter(
                (conn) => conn.matched,
              );

              // Send networking-specific notification
              targetUserWs.send(
                JSON.stringify({
                  type: isMatch ? "networking_match" : "networking_like",
                  connection: connection,
                  fromUserId: currentUserId,
                  fromUserInfo: safeUserInfo,
                  targetProfileId: profileId,
                  counts: {
                    pending: pendingConnections.length,
                    confirmed: confirmedConnections.length,
                  },
                  isMatch,
                  timestamp: new Date().toISOString(),
                }),
              );

              console.log(
                `🔔 [SUITE-NETWORKING] Sent ${isMatch ? "match" : "like"} notification to user ${targetProfile.userId} from user ${currentUserId}`,
              );
            }
          } catch (error) {
            console.error("Error sending networking notification:", error);
          }
        }

        // FINAL ENHANCEMENT: Broadcast discovery refresh to ALL users for seamless new profile updates
        console.log(
          `[DISCOVERY-REFRESH] Broadcasting discovery refresh to all connected users`,
        );

        // Send discovery refresh to all connected users to ensure fresh profiles appear instantly
        connectedUsers.forEach((ws, userId) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "discover:refresh",
                suiteType: "networking",
                reason: `networking_${action}_completed`,
                affectedUsers: [currentUserId, targetProfile.userId],
                timestamp: new Date().toISOString(),
              }),
            );
          }
        });

        // Also send connections refresh if it's a match
        if (isMatch) {
          connectedUsers.forEach((ws, userId) => {
            if (
              (userId === currentUserId || userId === targetProfile.userId) &&
              ws.readyState === WebSocket.OPEN
            ) {
              ws.send(
                JSON.stringify({
                  type: "connections:refresh",
                  suiteType: "networking",
                  reason: "networking_match_created",
                  timestamp: new Date().toISOString(),
                }),
              );
            }
          });
          console.log(
            `[CONNECTIONS-REFRESH] Sent connections refresh for new match`,
          );
        }

        res.json({
          success: true,
          action,
          profileId,
          isMatch,
          message:
            action === "like"
              ? isMatch
                ? "It's a match!"
                : "Connection request sent"
              : "Profile passed",
        });
      } catch (error) {
        console.error("Error processing networking swipe:", error as Error);
        res.status(500).json({ message: "Failed to process swipe action" });
      }
    },
  );

  // SUITE mentorship swipe actions
  app.post(
    "/api/suite/mentorship/swipe",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const { profileId, action } = req.body;
        const currentUserId = req.user.id;

        if (!profileId || !action || !["like", "pass"].includes(action)) {
          return res.status(400).json({ message: "Invalid swipe data" });
        }

        // CRITICAL VALIDATION: Check if current user has a mentorship profile
        // Users must create their own profile before swiping on others
        const currentUserMentorshipProfile =
          await storage.getSuiteMentorshipProfile(currentUserId);
        if (!currentUserMentorshipProfile) {
          return res.status(403).json({
            message: "Profile required",
            action: "create_profile",
            profileType: "mentorship",
          });
        }

        // Get the target profile to get the target user ID
        const targetProfile =
          await storage.getSuiteMentorshipProfileById(profileId);
        if (!targetProfile) {
          return res.status(404).json({ message: "Profile not found" });
        }

        // Record the swipe action in database
        const connectionData = {
          userId: currentUserId,
          targetProfileId: profileId,
          targetUserId: targetProfile.userId,
          action: action,
          matched: false,
        };

        // Check if user already swiped on this profile
        const existingConnection = await storage.getSuiteMentorshipConnection(
          currentUserId,
          profileId,
        );
        if (existingConnection) {
          return res
            .status(409)
            .json({ message: "Already acted on this profile" });
        }

        // Create the connection record
        const connection =
          await storage.createSuiteMentorshipConnection(connectionData);

        // Delete compatibility score record if user dislikes/passes on the other
        if (action === "pass") {
          try {
            // Find and delete any existing compatibility score between these users
            const existingScore =
              await storage.getSuiteMentorshipCompatibilityScore(
                currentUserId,
                profileId,
              );

            if (existingScore) {
              // Delete the compatibility score record
              await storage.deleteSuiteMentorshipCompatibilityScore(
                existingScore.id,
              );
              console.log(
                `🗑️ [COMPATIBILITY-CLEANUP] Deleted mentorship compatibility score ${existingScore.id} after user ${currentUserId} passed on profile ${profileId}`,
              );
            }
          } catch (cleanupError) {
            console.error(
              "Error cleaning up compatibility score after dislike:",
              cleanupError,
            );
            // Don't fail the request if cleanup fails
          }
        }

        // Check for mutual like if this was a like action
        let isMatch = false;
        if (action === "like") {
          // Get the current user's mentorship profile to find their profile ID
          const currentUserProfile =
            await storage.getSuiteMentorshipProfile(currentUserId);
          if (!currentUserProfile) {
            console.log(
              `[SUITE-MENTORSHIP] Current user ${currentUserId} has no mentorship profile`,
            );
            return res
              .status(404)
              .json({ message: "Current user mentorship profile not found" });
          }

          // Look for mutual connection: target user swiping on current user's profile
          const mutualConnection = await storage.getSuiteMentorshipConnection(
            targetProfile.userId,
            currentUserProfile.id,
          );
          if (mutualConnection && mutualConnection.action === "like") {
            // Update both connections to matched status
            await storage.updateSuiteMentorshipConnection(connection.id, {
              matched: true,
            });
            await storage.updateSuiteMentorshipConnection(mutualConnection.id, {
              matched: true,
            });
            isMatch = true;

            // Create or update match record for messaging system with automatic additionalConnections logic
            const existingMatch = await storage.getMatchBetweenUsers(
              currentUserId,
              targetProfile.userId,
            );
            let finalMatch;

            if (existingMatch) {
              // Handle existing match with potential metadata update for additional connections
              let metadata;

              if (!existingMatch.metadata) {
                // No existing metadata, create new
                metadata = {
                  origin: "SUITE",
                  suiteType: "mentorship",
                  context: "professional",
                };
              } else {
                // Parse existing metadata to check for additional connections
                try {
                  metadata =
                    typeof existingMatch.metadata === "string"
                      ? JSON.parse(existingMatch.metadata)
                      : existingMatch.metadata;

                  // Check if this is a new connection type
                  if (metadata.suiteType !== "mentorship") {
                    // Add to additionalConnections if not already present
                    if (!metadata.additionalConnections) {
                      metadata.additionalConnections = [];
                    }

                    if (
                      !metadata.additionalConnections.includes("mentorship")
                    ) {
                      metadata.additionalConnections.push("mentorship");
                      console.log(
                        `🔗 Adding mentorship to additionalConnections for existing match ${existingMatch.id}`,
                      );
                    }
                  }
                } catch (parseError) {
                  console.error(
                    "Failed to parse existing metadata:",
                    parseError,
                  );
                  // Fallback to new metadata
                  metadata = {
                    origin: "SUITE",
                    suiteType: "mentorship",
                    context: "professional",
                  };
                }
              }

              // Update existing match with enhanced metadata
              finalMatch = await storage.updateMatch(existingMatch.id, {
                matched: true,
                metadata: JSON.stringify(metadata),
              });
            } else {
              // Create new match
              const matchData = {
                userId1: Math.min(currentUserId, targetProfile.userId),
                userId2: Math.max(currentUserId, targetProfile.userId),
                matched: true,
                isDislike: false,
                metadata: JSON.stringify({
                  origin: "SUITE",
                  suiteType: "mentorship",
                  context: "professional",
                }),
              };
              finalMatch = await storage.createMatch(matchData);
            }

            console.log(
              `💝 [SUITE-MENTORSHIP] Match created: ${currentUserId} ↔ ${targetProfile.userId}`,
            );
          }
        }

        // Record swipe in history for undo functionality (limit to 9 recent swipes)
        try {
          const historyData = {
            userId: currentUserId,
            targetUserId: targetProfile.userId,
            action: action === "pass" ? "dislike" : action, // Normalize "pass" to "dislike" for history consistency
            appMode: "SUITE_MENTORSHIP", // Specific app mode for mentorship
          };
          await storage.addSwipeHistory(historyData);

          // Clean up old history entries to keep only the 9 most recent
          const userHistory = await storage.getUserSwipeHistory(
            currentUserId,
            "SUITE_MENTORSHIP",
            20,
          );
          if (userHistory.length > 9) {
            const entriesToDelete = userHistory.slice(9); // Keep first 9, delete the rest
            for (const entry of entriesToDelete) {
              await storage.removeSwipeHistory(entry.id);
            }
          }

          console.log(
            `📝 [SUITE-MENTORSHIP-HISTORY] Recorded swipe history for user ${currentUserId} -> ${targetProfile.userId} (${historyData.action})`,
          );
        } catch (historyError) {
          console.error("Error recording swipe history:", historyError);
          // Don't fail the swipe if history recording fails
        }

        console.log(
          `🚀 [SUITE-MENTORSHIP] User ${currentUserId} ${action}d mentorship profile ${profileId}`,
        );

        // AGGRESSIVE REAL-TIME CARD REMOVAL: Remove cards instantly from both users' UIs
        const sourceUserWs = connectedUsers.get(currentUserId);
        const targetUserWs = connectedUsers.get(targetProfile.userId);

        // 1. Remove target's card from source user's discover deck immediately
        if (sourceUserWs && sourceUserWs.readyState === WebSocket.OPEN) {
          sourceUserWs.send(
            JSON.stringify({
              type: "suite_remove_from_discover",
              suiteType: "mentorship",
              removeProfileId: profileId,
              removeUserId: targetProfile.userId,
              reason: `mentorship_${action}_action`,
              timestamp: new Date().toISOString(),
            }),
          );

          console.log(
            `[REAL-TIME] Instantly removed mentorship profile ${profileId} from user ${currentUserId}'s discover deck`,
          );
        }

        // 2. Remove source user's card from target user's discover deck immediately
        const sourceMentorshipProfile =
          await storage.getSuiteMentorshipProfile(currentUserId);
        if (
          sourceMentorshipProfile &&
          targetUserWs &&
          targetUserWs.readyState === WebSocket.OPEN
        ) {
          targetUserWs.send(
            JSON.stringify({
              type: "suite_remove_from_discover",
              suiteType: "mentorship",
              removeProfileId: sourceMentorshipProfile.id,
              removeUserId: currentUserId,
              reason: `received_mentorship_${action}`,
              timestamp: new Date().toISOString(),
            }),
          );

          console.log(
            `[REAL-TIME] Instantly removed mentorship profile ${sourceMentorshipProfile.id} from user ${targetProfile.userId}'s discover deck`,
          );
        }

        // Send mentorship notifications only for likes
        if (
          action === "like" &&
          targetUserWs &&
          targetUserWs.readyState === WebSocket.OPEN
        ) {
          try {
            const sourceUser = await storage.getUser(currentUserId);
            const safeUserInfo = sourceUser
              ? (({ password, ...rest }) => rest)(sourceUser)
              : { id: currentUserId, fullName: "Unknown User" };

            // Get user's mentorship connections for counts (CRITICAL: replicating networking logic exactly)
            const userMentorshipConnections =
              await storage.getUserMentorshipConnections(targetProfile.userId);
            const pendingConnections = userMentorshipConnections.filter(
              (conn) => !conn.matched && conn.action === "like",
            );
            const confirmedConnections = userMentorshipConnections.filter(
              (conn) => conn.matched,
            );

            // Send mentorship-specific notification
            targetUserWs.send(
              JSON.stringify({
                type: isMatch ? "mentorship_match" : "mentorship_like",
                connection: connection,
                fromUserId: currentUserId,
                fromUserInfo: safeUserInfo,
                targetProfileId: profileId,
                counts: {
                  pending: pendingConnections.length,
                  confirmed: confirmedConnections.length,
                },
                isMatch,
                timestamp: new Date().toISOString(),
              }),
            );

            console.log(
              `🔔 [SUITE-MENTORSHIP] Sent ${isMatch ? "match" : "like"} notification to user ${targetProfile.userId} from user ${currentUserId}`,
            );
          } catch (error) {
            console.error("Error sending mentorship notification:", error);
          }
        }

        res.json({
          success: true,
          action,
          profileId,
          isMatch,
          message:
            action === "like"
              ? isMatch
                ? "It's a match!"
                : "Interest expressed"
              : "Profile passed",
        });
      } catch (error) {
        console.error("Error processing mentorship swipe:", error);
        res.status(500).json({ message: "Failed to process swipe action" });
      }
    },
  );

  // DEBUG: Test endpoint to check reply transformation
  app.get(
    "/api/debug/messages/:matchId",
    async (req: Request, res: Response) => {
      try {
        const matchId = parseInt(req.params.matchId);
        const userId = parseInt(req.query.userId as string) || 6; // Default to user 6

        console.log(
          `🔍 [DEBUG-ENDPOINT] Testing reply transformation for match ${matchId}, user ${userId}`,
        );

        const messages = await storage.getMessagesByMatchId(matchId, userId);

        console.log(
          `🔍 [DEBUG-ENDPOINT] Retrieved ${messages.length} messages`,
        );
        messages.forEach((msg) => {
          console.log(`  Message ${msg.id}: "${msg.content}"`);
          if (msg.replyToMessageId) {
            console.log(
              `    Has reply: Reply to message ${msg.replyToMessageId}`,
            );
          } else {
            console.log(`    No reply context`);
          }
        });

        res.json(messages);
      } catch (error) {
        console.error("Debug endpoint error:", error);
        res.status(500).json({ error: (error as Error).message });
      }
    },
  );

  // Persistent Swipe History API for cross-session undo functionality
  app.post("/api/swipe/history", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { targetUserId, action, appMode } = req.body;

      if (!targetUserId || !action || !appMode) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const swipeData = {
        userId: req.user.id,
        targetUserId: parseInt(targetUserId),
        action,
        appMode,
      };

      const history = await storage.addSwipeHistory(swipeData);
      res.json(history);
    } catch (error) {
      console.error("Error adding swipe history:", error);
      res.status(500).json({ message: "Failed to add swipe history" });
    }
  });

  app.get("/api/swipe/history", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { appMode, limit } = req.query;

      if (!appMode) {
        return res.status(400).json({ message: "appMode parameter required" });
      }

      const history = await storage.getUserSwipeHistory(
        req.user.id,
        appMode as string,
        limit ? parseInt(limit as string) : 10,
      );

      res.json(history);
    } catch (error) {
      console.error("Error getting swipe history:", error);
      res.status(500).json({ message: "Failed to get swipe history" });
    }
  });

  app.delete("/api/swipe/history/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const historyId = parseInt(req.params.id);
      if (isNaN(historyId)) {
        return res.status(400).json({ message: "Invalid history ID" });
      }

      await storage.removeSwipeHistory(historyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing swipe history:", error);
      res.status(500).json({ message: "Failed to remove swipe history" });
    }
  });

  app.delete(
    "/api/swipe/history/clear",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const { appMode } = req.query;

        if (!appMode) {
          return res
            .status(400)
            .json({ message: "appMode parameter required" });
        }

        await storage.clearUserSwipeHistory(req.user.id, appMode as string);
        res.json({ success: true });
      } catch (error) {
        console.error("Error clearing swipe history:", error);
        res.status(500).json({ message: "Failed to clear swipe history" });
      }
    },
  );

  // Connections Preferences API
  app.get(
    "/api/connections/preferences",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const preferences = await storage.getConnectionsPreferences(
          req.user.id,
        );

        // CRITICAL FIX: Convert snake_case database fields to camelCase frontend fields
        if (preferences) {
          const mappedPreferences = convertDbFieldsToFrontend(preferences);
          res.json(mappedPreferences);
        } else {
          res.json(preferences);
        }
      } catch (error) {
        console.error("Error getting connections preferences:", error);
        res.status(500).json({ message: "Failed to get preferences" });
      }
    },
  );

  app.post(
    "/api/connections/preferences",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const preferences = await storage.saveConnectionsPreferences(
          req.user.id,
          req.body,
        );
        // CRITICAL FIX: Convert snake_case database fields to camelCase frontend fields
        const mappedPreferences = convertDbFieldsToFrontend(preferences);
        res.json(mappedPreferences);
      } catch (error) {
        console.error("Error saving connections preferences:", error);
        res.status(500).json({ message: "Failed to save preferences" });
      }
    },
  );

  // Verification Status Update API - Real-time broadcasting endpoint
  app.post(
    "/api/user/verification-status",
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const { userId, isVerified } = req.body;

        if (typeof userId !== "number" || typeof isVerified !== "boolean") {
          return res.status(400).json({
            message:
              "Invalid parameters. userId (number) and isVerified (boolean) are required.",
          });
        }

        // Update verification status in database
        const updatedUser = await storage.updateUserProfile(userId, {
          isVerified,
        });

        // Broadcast verification status change to all connected users
        if (verificationStatusBroadcaster) {
          verificationStatusBroadcaster(userId, isVerified);
          console.log(
            `Verification status update broadcasted via WebSocket for user ${userId}: isVerified=${isVerified}`,
          );
        }

        res.json({
          success: true,
          message: `User ${userId} verification status updated to ${isVerified}`,
          isVerified: updatedUser.isVerified,
        });
      } catch (error) {
        console.error("Error updating verification status:", error);
        res
          .status(500)
          .json({ message: "Failed to update verification status" });
      }
    },
  );

  // ID Verification Photos Update API - For Settings page verification
  app.patch("/api/user/verify-id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { idVerificationPhoto, liveVerificationPhoto } = req.body;

      if (!idVerificationPhoto || !liveVerificationPhoto) {
        return res.status(400).json({
          message:
            "Both ID verification photo and live verification photo are required",
        });
      }

      // Update verification photos in database
      const updatedUser = await storage.updateUserProfile(req.user.id, {
        idVerificationPhoto,
        liveVerificationPhoto,
      });

      console.log(
        `[ID-VERIFICATION] User ${req.user.id} submitted new verification photos`,
      );

      res.json({
        success: true,
        message: "Verification photos submitted successfully",
        user: {
          id: updatedUser.id,
          idVerificationPhoto: updatedUser.idVerificationPhoto,
          liveVerificationPhoto: updatedUser.liveVerificationPhoto,
        },
      });
    } catch (error) {
      console.error("Error updating verification photos:", error);
      res.status(500).json({ message: "Failed to update verification photos" });
    }
  });

  // Email Verification API
  app.post("/api/email/verify", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({
          success: false,
          message: "Valid email address is required",
        });
      }

      console.log(`[EMAIL-VERIFICATION] Starting verification for: ${email}`);

      // Import email verification service
      const { EmailVerificationService } = await import(
        "./services/email-verification"
      );

      // Perform comprehensive email verification
      const result = await EmailVerificationService.verifyEmail(
        email.trim().toLowerCase(),
      );

      console.log(`[EMAIL-VERIFICATION] Result for ${email}:`, result);

      res.json({
        success: true,
        email: email.trim().toLowerCase(),
        isValid: result.isValid,
        reason: result.reason,
        confidence: result.confidence,
      });
    } catch (error) {
      console.error("[EMAIL-VERIFICATION] API error:", error);
      res.status(500).json({
        success: false,
        message: "Email verification service temporarily unavailable",
        isValid: false,
        confidence: "low",
      });
    }
  });

  // Register SUITE compatibility API
  registerSuiteCompatibilityAPI(app);

  // SendGrid test endpoint
  app.get("/api/test/sendgrid", requireAuth, async (req, res) => {
    try {
      const { testSendGridConfig } = await import("./services/sendgrid.js");
      const result = await testSendGridConfig();

      res.json(result);
    } catch (error) {
      console.error("SendGrid test error:", error);
      res.status(500).json({
        success: false,
        message: "SendGrid test failed",
      });
    }
  });

  // Welcome email API
  app.post("/api/welcome/send", async (req, res) => {
    try {
      const { name, email, dateOfBirth } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: "Name and email are required",
        });
      }

      // Calculate user age to determine which email to send
      const calculateAge = (dateOfBirth: Date | string): number => {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }

        return age;
      };

      const userAge = dateOfBirth ? calculateAge(dateOfBirth) : null;
      const isUnder14 = userAge !== null && userAge < 14;
      const isTeenage = userAge !== null && userAge >= 14 && userAge < 18;
      const isAdult = userAge !== null && userAge >= 18;

      console.log(
        `[WELCOME-EMAIL] User ${name} (${email}) is ${userAge} years old - Under 14: ${isUnder14}, Teenage (14-17): ${isTeenage}, Adult (18+): ${isAdult}`,
      );

      // Import SendGrid services dynamically
      const {
        sendWelcomeEmail,
        sendTeenageWelcomeEmail,
        sendUnderAgeApologyEmail,
      } = await import("./services/sendgrid.js");

      let success = false;

      if (isUnder14) {
        // Send apology email for users under 14
        console.log(
          `[WELCOME-EMAIL] Sending under-age apology email to ${email} for ${name} (age: ${userAge})`,
        );
        success = await sendUnderAgeApologyEmail({
          name: name.trim(),
          email: email.trim(),
          dateOfBirth: dateOfBirth,
        });

        if (success) {
          console.log(
            `[WELCOME-EMAIL] Successfully sent under-age apology email to ${email}`,
          );
          res.json({
            success: true,
            message: "Under-age apology email sent successfully",
            emailType: "apology",
          });
        } else {
          console.error(
            `[WELCOME-EMAIL] Failed to send under-age apology email to ${email}`,
          );
          res.status(500).json({
            success: false,
            message: "Failed to send under-age apology email",
          });
        }
      } else if (isTeenage) {
        // Send teenage welcome email for users 14-17
        console.log(
          `[WELCOME-EMAIL] Sending teenage welcome email to ${email} for ${name} (age: ${userAge})`,
        );
        success = await sendTeenageWelcomeEmail({
          name: name.trim(),
          email: email.trim(),
          dateOfBirth: dateOfBirth,
        });

        if (success) {
          console.log(
            `[WELCOME-EMAIL] Successfully sent teenage welcome email to ${email}`,
          );
          res.json({
            success: true,
            message: "Teenage welcome email sent successfully",
            emailType: "teenage_welcome",
          });
        } else {
          console.error(
            `[WELCOME-EMAIL] Failed to send teenage welcome email to ${email}`,
          );
          res.status(500).json({
            success: false,
            message: "Failed to send teenage welcome email",
          });
        }
      } else if (isAdult) {
        // Send adult welcome email for users 18 and older
        console.log(
          `[WELCOME-EMAIL] Sending adult welcome email to ${email} for ${name} (age: ${userAge})`,
        );
        success = await sendWelcomeEmail({
          name: name.trim(),
          email: email.trim(),
          dateOfBirth: dateOfBirth,
        });

        if (success) {
          console.log(
            `[WELCOME-EMAIL] Successfully sent adult welcome email to ${email}`,
          );
          res.json({
            success: true,
            message: "Adult welcome email sent successfully",
            emailType: "adult_welcome",
          });
        } else {
          console.error(
            `[WELCOME-EMAIL] Failed to send adult welcome email to ${email}`,
          );
          res.status(500).json({
            success: false,
            message: "Failed to send adult welcome email",
          });
        }
      } else {
        // Fallback for invalid age data
        console.error(
          `[WELCOME-EMAIL] Invalid age data for user ${name} (${email}): age = ${userAge}`,
        );
        res.status(400).json({
          success: false,
          message: "Invalid age data - cannot determine appropriate email type",
        });
      }
    } catch (error) {
      console.error("[WELCOME-EMAIL] API error:", error);
      res.status(500).json({
        success: false,
        message: "Server error sending welcome email",
      });
    }
  });

  // Security dispute route
  app.get("/dispute", async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;

      if (!token) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Invalid Dispute Link</title>
            <style>body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }</style>
          </head>
          <body>
            <h1>❌ Invalid Dispute Link</h1>
            <p>This dispute link is invalid or malformed.</p>
            <p>If you received this link in a security email, please contact admin@kronogon.com</p>
          </body>
          </html>
        `);
      }

      const disputeInfo = getDisputeInfo(token);

      if (!disputeInfo) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Dispute Link Expired</title>
            <style>body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }</style>
          </head>
          <body>
            <h1>⏰ Dispute Link Expired</h1>
            <p>This dispute link has expired or has already been used.</p>
            <p>Dispute links are valid for 7 days after the security change.</p>
            <p>If you still need assistance, please contact admin@kronogon.com directly.</p>
          </body>
          </html>
        `);
      }

      // Process the dispute
      const success = await handleSecurityDispute(token, req);

      if (success) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Dispute Submitted Successfully</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin: 0;
              }
              .container {
                background: white;
                color: #333;
                border-radius: 16px;
                padding: 40px;
                max-width: 600px;
                margin: 0 auto;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              }
              .success-icon { font-size: 64px; margin-bottom: 20px; }
              h1 { color: #22c55e; margin-bottom: 20px; }
              .info-box {
                background: #f0f9ff;
                border: 2px solid #0ea5e9;
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
                text-align: left;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">🚨</div>
              <h1>Dispute Submitted Successfully</h1>
              <p><strong>Your security dispute has been received and processed.</strong></p>

              <div class="info-box">
                <h3>What happens next:</h3>
                <ul>
                  <li>Our security team has been immediately notified</li>
                  <li>We will contact you within 24 hours at <strong>${disputeInfo.email}</strong></li>
                  <li>We may temporarily secure your account during investigation</li>
                  <li>The unauthorized change will be reviewed and may be reversed</li>
                </ul>
              </div>

              <p><strong>Important:</strong> This dispute link has now been used and cannot be accessed again.</p>

              <p>If you have immediate concerns, contact us at:</p>
              <p><strong>admin@kronogon.com</strong></p>

              <hr style="margin: 30px 0;">
              <p style="font-size: 14px; color: #666;">
                CHARLEY Security System<br>
                Dispute processed at ${new Date().toLocaleString()}
              </p>
            </div>
          </body>
          </html>
        `);
      } else {
        return res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Dispute Processing Error</title>
            <style>body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }</style>
          </head>
          <body>
            <h1>❌ Error Processing Dispute</h1>
            <p>There was an error processing your security dispute.</p>
            <p>Please contact admin@kronogon.com directly with the following information:</p>
            <ul style="text-align: left; display: inline-block;">
              <li>Dispute Token: ${token}</li>
              <li>Your Email: ${disputeInfo.email}</li>
              <li>Change Type: ${disputeInfo.changeType}</li>
              <li>Timestamp: ${new Date().toLocaleString()}</li>
            </ul>
          </body>
          </html>
        `);
      }
    } catch (error) {
      console.error("[SECURITY-DISPUTE] Error handling dispute route:", error);
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>System Error</title>
          <style>body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }</style>
        </head>
        <body>
          <h1>❌ System Error</h1>
          <p>A system error occurred while processing your dispute.</p>
          <p>Please contact admin@kronogon.com immediately.</p>
        </body>
        </html>
      `);
    }
  });

  // Payment API Routes

  // Get regional pricing
  app.get("/api/pricing", async (req: Request, res: Response) => {
    try {
      const region = (req.query.region as string) || "global";
      const pricing = await storage.getRegionalPricing(region);
      res.json(pricing);
    } catch (error) {
      console.error("Error fetching pricing:", error);
      res.status(500).json({ message: "Failed to fetch pricing" });
    }
  });

  // Validate promotional code
  app.post("/api/promo/validate", async (req: Request, res: Response) => {
    try {
      const { code, region } = req.body;
      const userId = req.user?.id;

      if (!code || !region) {
        return res.status(400).json({
          valid: false,
          error: "Missing required fields",
        });
      }

      if (!userId) {
        return res.status(401).json({
          valid: false,
          error: "Authentication required",
        });
      }

      const validation = await storage.validatePromotionalCode(
        code,
        userId,
        region,
      );
      res.json(validation);
    } catch (error) {
      console.error("Error validating promo code:", error);
      res.status(500).json({
        valid: false,
        error: "Server error validating promotional code",
      });
    }
  });

  // Create Stripe subscription
  app.post(
    "/api/subscription/create",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        // Check if Stripe is configured
        if (!stripe) {
          return res.status(503).json({
            success: false,
            error:
              "Payment processing is currently unavailable. Please contact support.",
            code: "STRIPE_NOT_CONFIGURED",
          });
        }

        console.log(
          `[STRIPE-ENVIRONMENT-FIX] Creating subscription in ${isLiveMode ? "LIVE" : "TEST"} mode for user ${req.user!.id}`,
        );

        const {
          planType,
          region,
          promoCode,
          paymentMethod = "card",
          billingName,
          billingEmail,
          billingPhone,
          billingAddress,
          billingCity,
          billingState,
          billingPostalCode,
          billingCountry,
          nickname,
        } = req.body;
        const userId = req.user!.id;

        if (!planType || !region) {
          return res.status(400).json({
            success: false,
            error: "Missing required fields",
          });
        }

        // Get pricing information
        const pricingList = await storage.getRegionalPricing(region, planType);
        const pricing = pricingList[0];

        if (!pricing) {
          return res.status(400).json({
            success: false,
            error: "Invalid plan or region",
          });
        }

        // Check for existing active subscription
        const existingSubscription =
          await storage.getSubscriptionByUser(userId);
        if (existingSubscription && existingSubscription.status === "active") {
          return res.status(400).json({
            success: false,
            error: "User already has an active subscription",
          });
        }

        // Create or retrieve Stripe customer
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        let stripeCustomerId = user.stripeCustomerId;

        // Check if we need to create a new customer (no customer ID, or switching between test/live modes)
        let needsNewCustomer = !stripeCustomerId;

        // If customer ID exists, verify it's valid for current Stripe mode
        if (stripeCustomerId && stripe) {
          try {
            await stripe.customers.retrieve(stripeCustomerId);
            console.log(
              `[STRIPE] Using existing customer: ${stripeCustomerId}`,
            );
          } catch (error: any) {
            if (error.code === "resource_missing") {
              console.log(
                `[STRIPE] Customer ${stripeCustomerId} not found in current mode, creating new customer`,
              );
              needsNewCustomer = true;
            } else {
              throw error; // Re-throw other errors
            }
          }
        }

        if (needsNewCustomer && stripe) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.fullName,
            metadata: {
              userId: userId.toString(),
              region: region,
              mode: isLiveMode ? "live" : "test",
            },
          });
          stripeCustomerId = customer.id;

          console.log(
            `[STRIPE] Created new customer: ${stripeCustomerId} in ${isLiveMode ? "LIVE" : "TEST"} mode`,
          );

          // Update user with new Stripe customer ID
          await storage.updateUser(userId, { stripeCustomerId });
        }

        // Create Stripe subscription using proper API format with currency fallback
        console.log(
          `[STRIPE] Creating subscription for user ${userId}, plan: ${planType}, region: ${region}, amount: ${pricing.amount} ${pricing.currency}`,
        );

        // Currency fallback system - Stripe account supports USD for unsupported currencies
        const supportedCurrencies = ["usd", "eur", "gbp", "cad", "aud", "jpy"]; // Add more as needed
        const requestedCurrency = pricing.currency.toLowerCase();
        const isUnsupportedCurrency =
          !supportedCurrencies.includes(requestedCurrency);

        let stripeCurrency = requestedCurrency;
        let stripeAmount = pricing.amount;

        if (isUnsupportedCurrency) {
          // For unsupported currencies, convert to USD equivalent
          stripeCurrency = "usd";

          // Currency conversion rates (updated to current market rates)
          const conversionRates: Record<string, number> = {
            ghs: 10.44, // 10.44 GHS = 1 USD (current rate)
            ngn: 1600, // 1600 NGN = 1 USD (example for future)
            kes: 130, // 130 KES = 1 USD (example for future)
          };

          const conversionRate = conversionRates[requestedCurrency];
          if (conversionRate) {
            stripeAmount = Math.round(pricing.amount / conversionRate); // Convert to USD cents
          } else {
            // Fallback: assume 1:1 ratio if conversion rate not found
            stripeAmount = pricing.amount;
          }

          console.log(
            `[STRIPE-CURRENCY-FALLBACK] Converting ${pricing.amount} ${pricing.currency} to ${stripeAmount} ${stripeCurrency.toUpperCase()} (rate: ${conversionRate || "default"})`,
          );
        }

        // First create or get a product for this subscription
        let productId;
        if (stripe) {
          try {
            const product = await stripe.products.create({
              name: `CHARLEY Premium - ${planType.replace("_", " ").toUpperCase()}`,
              description: `Premium subscription for ${region} region`,
              metadata: {
                app: "charley",
                plan_type: planType,
                region: region,
                original_currency: pricing.currency,
                stripe_currency: stripeCurrency,
              },
            });
            productId = product.id;
            console.log(`[STRIPE] Created product: ${productId}`);
          } catch (productError: any) {
            console.error(
              `[STRIPE] Error creating product:`,
              productError.message,
            );
            throw new Error(
              `Failed to create product: ${productError.message}`,
            );
          }
        }

        const subscriptionParams = {
          customer: stripeCustomerId,
          items: [
            {
              price_data: {
                currency: stripeCurrency,
                unit_amount: stripeAmount,
                recurring: {
                  interval: planType.includes("yearly") ? "year" : "month",
                  interval_count: planType.includes("quarterly") ? 3 : 1,
                },
                product: productId,
              },
            },
          ],
          payment_behavior: "default_incomplete",
          payment_settings: {
            payment_method_types: ["card"],
            save_default_payment_method: "on_subscription",
          },
          expand: ["latest_invoice.payment_intent"],
          metadata: {
            userId: userId.toString(),
            region: region,
            planType: planType,
            paymentMethod: paymentMethod || "card",
            original_currency: pricing.currency,
            original_amount: pricing.amount.toString(),
            stripe_currency: stripeCurrency,
            stripe_amount: stripeAmount.toString(),
            // Billing Address Information
            billing_name: billingName || "",
            billing_email: billingEmail || "",
            billing_phone: billingPhone || "",
            billing_address: billingAddress || "",
            billing_city: billingCity || "",
            billing_state: billingState || "",
            billing_postal_code: billingPostalCode || "",
            billing_country: billingCountry || "",
            nickname: nickname || "",
          },
        };

        console.log(
          `[STRIPE] Subscription params:`,
          JSON.stringify(subscriptionParams, null, 2),
        );

        // Log currency conversion details for debugging
        if (isUnsupportedCurrency) {
          console.log(`[STRIPE-CURRENCY-CONVERSION] SUCCESSFUL FALLBACK:`);
          console.log(
            `[STRIPE-CURRENCY-CONVERSION] Original: ${pricing.amount} ${pricing.currency}`,
          );
          console.log(
            `[STRIPE-CURRENCY-CONVERSION] Stripe Processing: ${stripeAmount} ${stripeCurrency.toUpperCase()}`,
          );
          console.log(
            `[STRIPE-CURRENCY-CONVERSION] User sees: ${pricing.currency} pricing, Stripe charges: USD equivalent`,
          );
        }

        // Apply promotional code discount if provided
        if (promoCode && stripe) {
          const validation = await storage.validatePromotionalCode(
            promoCode,
            userId,
            region,
          );
          if (validation.valid && validation.discount) {
            const coupon = await stripe.coupons.create({
              percent_off: validation.discount,
              duration: "once",
              metadata: {
                promoCode: promoCode,
                userId: userId.toString(),
              },
            });
            subscriptionParams.coupon = coupon.id;
          }
        }

        let stripeSubscription = null;
        try {
          if (stripe) {
            console.log(
              `[STRIPE] Calling stripe.subscriptions.create with customer: ${stripeCustomerId}`,
            );
            stripeSubscription =
              await stripe.subscriptions.create(subscriptionParams);
            console.log(
              `[STRIPE] Successfully created subscription: ${stripeSubscription.id}`,
            );
          }
        } catch (stripeError: any) {
          console.error(`[STRIPE] Error creating subscription:`, stripeError);
          console.error(`[STRIPE] Error type:`, stripeError.type);
          console.error(`[STRIPE] Error code:`, stripeError.code);
          console.error(`[STRIPE] Error message:`, stripeError.message);
          console.error(`[STRIPE] Error details:`, stripeError.detail);
          throw new Error(
            `Stripe subscription creation failed: ${stripeError.message}`,
          );
        }

        if (!stripeSubscription) {
          return res.status(503).json({
            success: false,
            error:
              "Payment processing is currently unavailable. Please contact support.",
            code: "STRIPE_NOT_CONFIGURED",
          });
        }

        // Save subscription to database - preserve original currency for display
        const subscription = await storage.createSubscription({
          userId: userId,
          provider: "stripe",
          subscriptionId: stripeSubscription.id,
          planType: planType,
          status: stripeSubscription.status,
          currentPeriodStart: new Date(
            (stripeSubscription as any).current_period_start * 1000,
          ),
          currentPeriodEnd: new Date(
            (stripeSubscription as any).current_period_end * 1000,
          ),
          cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
          currency: pricing.currency, // Keep original currency for user display
          amount: pricing.amount, // Keep original amount for user display
          region: region,
          paymentMethod: paymentMethod || "card",
        });

        // Create subscription event for creation
        try {
          const subscriptionEvent = await storage.createSubscriptionEvent({
            subscriptionId: subscription.id,
            userId: userId,
            eventType: "created",
            provider: "stripe",
            providerEventId: stripeSubscription.id,
            oldStatus: null,
            newStatus: stripeSubscription.status,
            metadata: JSON.stringify({
              subscriptionId: stripeSubscription.id,
              planType: planType,
              amount: pricing.amount,
              currency: pricing.currency,
              region: region,
              stripe_currency: stripeCurrency,
              stripe_amount: stripeAmount,
              currency_converted: isUnsupportedCurrency,
              currentPeriodStart: (stripeSubscription as any)
                .current_period_start,
              currentPeriodEnd: (stripeSubscription as any).current_period_end,
            }),
          });
          console.log(
            `[SUBSCRIPTION-CREATION] Created subscription event: ${subscriptionEvent.id}`,
          );
        } catch (eventError) {
          console.error(
            `[SUBSCRIPTION-CREATION] Failed to create subscription event:`,
            eventError,
          );
        }

        const clientSecret = (stripeSubscription.latest_invoice as any)
          ?.payment_intent?.client_secret;
        const paymentIntentId = (stripeSubscription.latest_invoice as any)
          ?.payment_intent?.id;

        console.log(`[STRIPE] Payment intent ID: ${paymentIntentId}`);
        console.log(`[STRIPE] Client secret: ${clientSecret}`);
        console.log(
          `[STRIPE] Latest invoice:`,
          JSON.stringify(stripeSubscription.latest_invoice, null, 2),
        );

        if (!clientSecret) {
          console.error("[STRIPE] No client secret found in payment intent!");
          console.error(
            "[STRIPE] Subscription object:",
            JSON.stringify(stripeSubscription, null, 2),
          );
          throw new Error("Failed to get payment intent client secret");
        }

        res.json({
          success: true,
          subscription: {
            id: subscription.id,
            stripeSubscriptionId: stripeSubscription.id,
            planType: subscription.planType,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
          },
          clientSecret: clientSecret,
          paymentMethod: paymentMethod,
        });
      } catch (error) {
        console.error("Error creating subscription:", error);
        res.status(500).json({
          success: false,
          error: "Failed to create subscription",
        });
      }
    },
  );

  // Confirm payment with saved card details
  // Payment success webhook/status endpoint to update premium access after Stripe Elements payment
  app.post(
    "/api/subscription/payment-success",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { paymentIntentId } = req.body;
        const userId = req.user!.id;

        console.log(`[PAYMENT-SUCCESS] Request received for user ${userId}`);
        console.log(
          `[PAYMENT-SUCCESS] Request body:`,
          JSON.stringify(req.body, null, 2),
        );
        console.log(`[PAYMENT-SUCCESS] Payment intent ID:`, paymentIntentId);

        if (!stripe) {
          console.log(`[PAYMENT-SUCCESS] Stripe not configured`);
          return res.status(503).json({
            success: false,
            error:
              "Payment processing is currently unavailable. Please contact support.",
            code: "STRIPE_NOT_CONFIGURED",
          });
        }

        if (!paymentIntentId) {
          console.log(`[PAYMENT-SUCCESS] Missing payment intent ID in request`);
          return res.status(400).json({
            success: false,
            error: "Missing payment intent ID",
          });
        }

        console.log(
          `[STRIPE] Verifying payment success for user ${userId}, payment intent: ${paymentIntentId}`,
        );

        // Retrieve the payment intent to verify it succeeded with retry logic
        let paymentIntent;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            paymentIntent =
              await stripe.paymentIntents.retrieve(paymentIntentId);
            break; // Success, exit retry loop
          } catch (retrieveError: any) {
            retryCount++;
            console.log(
              `[STRIPE] Attempt ${retryCount}/${maxRetries} failed to retrieve payment intent:`,
              retrieveError.message,
            );

            if (retryCount >= maxRetries) {
              throw retrieveError; // Give up after max retries
            }

            // Wait 1 second before retry
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (!paymentIntent) {
          throw new Error(
            "Failed to retrieve payment intent after multiple attempts",
          );
        }

        console.log(
          `[PAYMENT-SUCCESS] Payment intent status: ${paymentIntent.status}`,
        );
        console.log(`[PAYMENT-SUCCESS] Payment intent details:`, {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        });

        if (paymentIntent.status === "succeeded") {
          // Get the correct subscription ID from payment intent metadata
          let currentSubscriptionId = null;
          let subscriptionExpiresAt = null;

          // First, try to get subscription ID from payment intent
          if (paymentIntent.invoice) {
            try {
              const invoice = await stripe.invoices.retrieve(
                paymentIntent.invoice as string,
              );
              if (invoice.subscription) {
                currentSubscriptionId = invoice.subscription as string;
                console.log(
                  `[PAYMENT-SUCCESS] Found subscription ID from invoice: ${currentSubscriptionId}`,
                );
              }
            } catch (invoiceError) {
              console.warn(
                `[PAYMENT-SUCCESS] Could not retrieve invoice:`,
                invoiceError,
              );
            }
          }

          // If we have a subscription ID, get its details from Stripe
          if (currentSubscriptionId && stripe) {
            try {
              const stripeSubscription = await stripe.subscriptions.retrieve(
                currentSubscriptionId,
              );
              subscriptionExpiresAt = new Date(
                stripeSubscription.current_period_end * 1000,
              );
              console.log(
                `[PAYMENT-SUCCESS] Retrieved subscription expiry from Stripe: ${subscriptionExpiresAt}`,
              );
              console.log(
                `[PAYMENT-SUCCESS] Stripe subscription status: ${stripeSubscription.status}`,
              );
            } catch (stripeError) {
              console.warn(
                `[PAYMENT-SUCCESS] Could not fetch subscription from Stripe:`,
                stripeError,
              );
            }
          }

          // Get subscription details from database for reference
          const subscription = await storage.getSubscriptionByUser(userId);

          if (subscription || currentSubscriptionId) {
            // Create payment method record if not exists
            try {
              if (
                paymentIntent.payment_method &&
                typeof paymentIntent.payment_method === "string"
              ) {
                // Get payment method details from Stripe
                const stripePaymentMethod =
                  await stripe.paymentMethods.retrieve(
                    paymentIntent.payment_method,
                  );

                // Check if payment method already exists
                const existingPaymentMethods =
                  await storage.getPaymentMethodsByUser(userId);
                const paymentMethodExists = existingPaymentMethods.some(
                  (pm) => pm.externalId === paymentIntent.payment_method,
                );

                if (!paymentMethodExists) {
                  // Get billing address from subscription metadata if available
                  let billingInfo = {};
                  if (currentSubscriptionId) {
                    try {
                      const stripeSubscription =
                        await stripe.subscriptions.retrieve(
                          currentSubscriptionId,
                        );
                      const metadata = stripeSubscription.metadata || {};
                      billingInfo = {
                        billingName: metadata.billing_name || null,
                        billingEmail: metadata.billing_email || null,
                        billingPhone: metadata.billing_phone || null,
                        billingAddress: metadata.billing_address || null,
                        billingCity: metadata.billing_city || null,
                        billingState: metadata.billing_state || null,
                        billingPostalCode: metadata.billing_postal_code || null,
                        billingCountry: metadata.billing_country || null,
                        nickname: metadata.nickname || null,
                      };
                    } catch (error) {
                      console.warn(
                        `[PAYMENT-SUCCESS] Could not retrieve subscription metadata for billing info:`,
                        error,
                      );
                    }
                  }

                  const paymentMethodRecord = await storage.createPaymentMethod(
                    {
                      userId: userId,
                      provider: "stripe",
                      externalId: paymentIntent.payment_method,
                      type: "card",
                      isDefault: existingPaymentMethods.length === 0, // First payment method becomes default
                      metadata: JSON.stringify({
                        last4: stripePaymentMethod.card?.last4,
                        brand: stripePaymentMethod.card?.brand,
                        expMonth: stripePaymentMethod.card?.exp_month,
                        expYear: stripePaymentMethod.card?.exp_year,
                        fingerprint: stripePaymentMethod.card?.fingerprint,
                        country: stripePaymentMethod.card?.country,
                      }),
                      // Include billing address information from subscription metadata
                      ...billingInfo,
                    },
                  );
                  console.log(
                    `[PAYMENT-SUCCESS] Created payment method record: ${paymentMethodRecord.id} with billing info`,
                  );
                }
              }
            } catch (paymentMethodError) {
              console.error(
                `[PAYMENT-SUCCESS] Failed to create payment method:`,
                paymentMethodError,
              );
            }

            // Create payment history record
            try {
              const paymentHistoryRecord = await storage.createPaymentHistory({
                subscriptionId: subscription.id,
                userId: userId,
                provider: "stripe",
                providerTransactionId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency.toUpperCase(),
                status: "succeeded",
                paymentMethod: "card",
                metadata: JSON.stringify({
                  paymentIntentId: paymentIntent.id,
                  customerEmail: paymentIntent.metadata?.customer_email,
                  planType: subscription.planType,
                  region: subscription.region,
                  stripePaymentMethodId: paymentIntent.payment_method,
                }),
              });
              console.log(
                `[PAYMENT-SUCCESS] Created payment history record: ${paymentHistoryRecord.id}`,
              );
            } catch (paymentHistoryError) {
              console.error(
                `[PAYMENT-SUCCESS] Failed to create payment history:`,
                paymentHistoryError,
              );
            }

            // Create subscription event
            try {
              const subscriptionEvent = await storage.createSubscriptionEvent({
                subscriptionId: subscription.id,
                userId: userId,
                eventType: "payment_succeeded",
                provider: "stripe",
                providerEventId: paymentIntent.id,
                oldStatus: subscription.status,
                newStatus: "active",
                metadata: JSON.stringify({
                  paymentIntentId: paymentIntent.id,
                  amount: paymentIntent.amount,
                  currency: paymentIntent.currency,
                  timestamp: new Date().toISOString(),
                }),
              });
              console.log(
                `[PAYMENT-SUCCESS] Created subscription event: ${subscriptionEvent.id}`,
              );
            } catch (eventError) {
              console.error(
                `[PAYMENT-SUCCESS] Failed to create subscription event:`,
                eventError,
              );
            }

            // Update user with premium access and subscription information
            await storage.updateUserProfile(userId, {
              premiumAccess: true,
              stripeSubscriptionId:
                currentSubscriptionId ||
                (subscription ? subscription.subscriptionId : null),
              subscriptionStatus: "active",
              subscriptionExpiresAt: subscriptionExpiresAt,
              subscriptionCanceledAt: null, // Clear any previous cancellation
            });

            console.log(
              `[PAYMENT-SUCCESS] Updated user ${userId} with premium access and subscription data`,
            );

            // Send premium subscription welcome email
            try {
              const user = await storage.getUser(userId);
              if (user && user.email) {
                const { sendPremiumSubscriptionEmail } = await import(
                  "./services/sendgrid"
                );

                const emailSuccess = await sendPremiumSubscriptionEmail({
                  name: user.fullName || user.username || "CHARLEY User",
                  email: user.email,
                  planType: subscription.planType,
                  subscriptionId: subscription.subscriptionId,
                  subscriptionExpiresAt: subscriptionExpiresAt || undefined,
                });

                if (emailSuccess) {
                  console.log(
                    `[PAYMENT-SUCCESS] Premium welcome email sent to ${user.email}`,
                  );
                } else {
                  console.warn(
                    `[PAYMENT-SUCCESS] Failed to send premium welcome email to ${user.email}`,
                  );
                }
              } else {
                console.warn(
                  `[PAYMENT-SUCCESS] Cannot send premium email - user not found or no email`,
                );
              }
            } catch (emailError) {
              console.error(
                `[PAYMENT-SUCCESS] Error sending premium welcome email:`,
                emailError,
              );
            }

            // Update subscription record to active status
            if (subscription.status === "incomplete") {
              await storage.updateSubscription(subscription.id, {
                status: "active",
              });
              console.log(
                `[PAYMENT-SUCCESS] Updated subscription ${subscription.id} status to active`,
              );
            }
          } else {
            // No subscription record found - just grant premium access
            await storage.updateUserProfile(userId, { premiumAccess: true });
            console.log(
              `[PAYMENT-SUCCESS] Updated user ${userId} premium access to true (no subscription record)`,
            );

            // Send premium subscription welcome email (fallback case)
            try {
              const user = await storage.getUser(userId);
              if (user && user.email) {
                const { sendPremiumSubscriptionEmail } = await import(
                  "./services/sendgrid"
                );

                const emailSuccess = await sendPremiumSubscriptionEmail({
                  name: user.fullName || user.username || "CHARLEY User",
                  email: user.email,
                  planType: "premium", // Generic plan type for fallback
                  subscriptionId: paymentIntentId, // Use payment intent as subscription reference
                  subscriptionExpiresAt: undefined, // No expiration for fallback case
                });

                if (emailSuccess) {
                  console.log(
                    `[PAYMENT-SUCCESS] Premium welcome email sent to ${user.email} (fallback case)`,
                  );
                } else {
                  console.warn(
                    `[PAYMENT-SUCCESS] Failed to send premium welcome email to ${user.email} (fallback case)`,
                  );
                }
              } else {
                console.warn(
                  `[PAYMENT-SUCCESS] Cannot send premium email - user not found or no email (fallback case)`,
                );
              }
            } catch (emailError) {
              console.error(
                `[PAYMENT-SUCCESS] Error sending premium welcome email (fallback case):`,
                emailError,
              );
            }
          }

          res.json({
            success: true,
            paymentIntent: paymentIntent,
          });
        } else {
          console.log(
            `[PAYMENT-SUCCESS] Payment intent not in succeeded status: ${paymentIntent.status}`,
          );
          res.status(400).json({
            success: false,
            error: `Payment verification failed: status is ${paymentIntent.status}`,
            details: {
              paymentIntentId: paymentIntent.id,
              status: paymentIntent.status,
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
            },
          });
        }
      } catch (error: any) {
        console.error("[STRIPE] Error verifying payment success:", error);
        res.status(500).json({
          success: false,
          error: error.message || "Payment verification failed",
        });
      }
    },
  );

  // Mobile money payment initiation (for Ghana users)
  app.post(
    "/api/subscription/mobile-money",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { planType, region, phoneNumber, provider } = req.body;
        const userId = req.user!.id;

        // Validate Ghana region for mobile money
        if (region !== "ghana") {
          return res.status(400).json({
            success: false,
            error: "Mobile money is only available for Ghana region",
          });
        }

        if (!planType || !phoneNumber || !provider) {
          return res.status(400).json({
            success: false,
            error: "Missing required fields for mobile money payment",
          });
        }

        // Get pricing information
        const pricingList = await storage.getRegionalPricing(region, planType);
        const pricing = pricingList[0];

        if (!pricing) {
          return res.status(400).json({
            success: false,
            error: "Invalid plan or region",
          });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Create subscription record with pending status
        const subscription = await storage.createSubscription({
          userId: userId,
          provider: "mobile_money",
          subscriptionId: `mm_${Date.now()}_${userId}`,
          planType: planType,
          status: "pending",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: false,
          currency: pricing.currency,
          amount: pricing.amount,
          region: region,
          paymentMethod: "mobile_money",
        });

        // In production, this would integrate with Flutterwave or Paystack
        // For now, we'll simulate the mobile money payment process
        res.json({
          success: true,
          subscription: {
            id: subscription.id,
            planType: subscription.planType,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
          },
          paymentInstructions: {
            message: `Please dial *170# and follow prompts to pay GHS ${(pricing.amount / 100).toFixed(2)} to complete your CHARLEY Premium subscription.`,
            amount: pricing.amount / 100,
            currency: pricing.currency,
            provider: provider,
            reference: subscription.subscriptionId,
          },
        });
      } catch (error) {
        console.error("Error initiating mobile money payment:", error);
        res.status(500).json({
          success: false,
          error: "Failed to initiate mobile money payment",
        });
      }
    },
  );

  // Get subscription status
  app.get(
    "/api/subscription/status",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        const subscription = await storage.getSubscriptionByUser(userId);

        if (!subscription) {
          return res.json({
            hasSubscription: false,
            subscription: null,
          });
        }

        res.json({
          hasSubscription: true,
          subscription: {
            id: subscription.id,
            planType: subscription.planType,
            status: subscription.status,
            provider: subscription.provider,
            paymentMethod: subscription.paymentMethod,
            currency: subscription.currency,
            amount: subscription.amount,
            region: subscription.region,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            cancelledAt: subscription.cancelledAt,
          },
        });
      } catch (error) {
        console.error("Error fetching subscription status:", error);
        res.status(500).json({
          hasSubscription: false,
          error: "Failed to fetch subscription status",
        });
      }
    },
  );

  // Confirm payment endpoint
  app.post(
    "/api/payment/confirm",
    requireAuth,
    async (req: Request, res: Response) => {
      await confirmPayment(req, res, storage);
    },
  );

  // Cancel subscription
  app.post(
    "/api/subscription/cancel",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        const subscription = await storage.getSubscriptionByUser(userId);

        if (!subscription) {
          return res.status(404).json({
            success: false,
            error: "No active subscription found",
          });
        }

        if (subscription.provider === "stripe" && stripe) {
          // Cancel Stripe subscription
          await stripe.subscriptions.update(subscription.subscriptionId, {
            cancel_at_period_end: true,
          });
        }

        // Update subscription in database
        const updatedSubscription = await storage.updateSubscription(
          subscription.id,
          {
            cancelAtPeriodEnd: true,
            cancelledAt: new Date(),
          },
        );

        res.json({
          success: true,
          subscription: {
            id: updatedSubscription.id,
            status: updatedSubscription.status,
            cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd,
            cancelledAt: updatedSubscription.cancelledAt,
          },
        });
      } catch (error) {
        console.error("Error cancelling subscription:", error);
        res.status(500).json({
          success: false,
          error: "Failed to cancel subscription",
        });
      }
    },
  );

  // Get user's subscription status
  app.get(
    "/api/subscription/status",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        const subscription = await storage.getSubscriptionByUser(userId);

        if (!subscription) {
          return res.json({
            hasActiveSubscription: false,
            planType: null,
            currentPeriodEnd: null,
            status: "inactive",
          });
        }

        res.json({
          hasActiveSubscription: subscription.status === "active",
          planType: subscription.planType,
          currentPeriodEnd: subscription.currentPeriodEnd,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        });
      } catch (error) {
        console.error("Error getting subscription status:", error);
        res.status(500).json({ message: "Failed to get subscription status" });
      }
    },
  );

  // Cancel subscription
  app.post(
    "/api/subscription/cancel",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        const subscription = await storage.getSubscriptionByUser(userId);

        if (!subscription) {
          return res
            .status(404)
            .json({ message: "No active subscription found" });
        }

        // Cancel subscription in Stripe
        if (stripe) {
          await stripe.subscriptions.update(subscription.subscriptionId, {
            cancel_at_period_end: true,
          });
        }

        // Update subscription in database
        await storage.updateSubscription(subscription.id, {
          cancelAtPeriodEnd: true,
          cancelledAt: new Date(),
        });

        res.json({
          success: true,
          message:
            "Subscription will be cancelled at the end of the current period",
        });
      } catch (error) {
        console.error("Error cancelling subscription:", error);
        res.status(500).json({ message: "Failed to cancel subscription" });
      }
    },
  );

  // Create/Save payment method endpoint
  app.post(
    "/api/payment/methods",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        const {
          paymentMethodId,
          isDefault = false,
          billingName,
          billingEmail,
          billingPhone,
          billingAddress,
          billingCity,
          billingState,
          billingPostalCode,
          billingCountry,
          nickname,
        } = req.body;

        if (!stripe) {
          return res.status(503).json({
            error: "Payment processing is currently unavailable",
          });
        }

        if (!paymentMethodId) {
          return res.status(400).json({
            error: "Payment method ID is required",
          });
        }

        // Get payment method details from Stripe
        const stripePaymentMethod =
          await stripe.paymentMethods.retrieve(paymentMethodId);

        // Check if payment method already exists
        const existingPaymentMethods =
          await storage.getPaymentMethodsByUser(userId);
        const paymentMethodExists = existingPaymentMethods.some(
          (pm) => pm.externalId === paymentMethodId,
        );

        if (paymentMethodExists) {
          return res.status(409).json({
            error: "Payment method already saved",
          });
        }

        // If this is set as default, unset all other defaults
        if (isDefault) {
          for (const pm of existingPaymentMethods) {
            if (pm.isDefault) {
              await storage.updatePaymentMethod(pm.id, { isDefault: false });
            }
          }
        }

        // Create payment method record with billing address information
        const paymentMethodRecord = await storage.createPaymentMethod({
          userId: userId,
          provider: "stripe",
          externalId: paymentMethodId,
          type: stripePaymentMethod.type,
          isDefault: isDefault || existingPaymentMethods.length === 0, // First becomes default
          metadata: JSON.stringify({
            last4: stripePaymentMethod.card?.last4,
            brand: stripePaymentMethod.card?.brand,
            expMonth: stripePaymentMethod.card?.exp_month,
            expYear: stripePaymentMethod.card?.exp_year,
            fingerprint: stripePaymentMethod.card?.fingerprint,
            country: stripePaymentMethod.card?.country,
            funding: stripePaymentMethod.card?.funding,
          }),
          // Billing Address Information
          billingName: billingName || null,
          billingEmail: billingEmail || null,
          billingPhone: billingPhone || null,
          billingAddress: billingAddress || null,
          billingCity: billingCity || null,
          billingState: billingState || null,
          billingPostalCode: billingPostalCode || null,
          billingCountry: billingCountry || null,
          nickname: nickname || null,
        });

        console.log(
          `[PAYMENT-METHOD] Saved payment method ${paymentMethodRecord.id} for user ${userId} with billing address`,
        );

        res.json({
          success: true,
          paymentMethod: paymentMethodRecord,
        });
      } catch (error: any) {
        console.error("[PAYMENT-METHOD] Error saving payment method:", error);
        res.status(500).json({
          error: "Failed to save payment method",
        });
      }
    },
  );

  // SUITE job swipe actions
  app.post("/api/suite/job/swipe", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { profileId, action } = req.body;
      const currentUserId = req.user.id;

      if (!profileId || !action || !["like", "pass"].includes(action)) {
        return res.status(400).json({ message: "Invalid swipe data" });
      }

      // CRITICAL VALIDATION: Check if current user has a job profile
      // Users must create their own profile before swiping on others
      const currentUserJobProfile =
        await storage.getSuiteJobProfile(currentUserId);
      if (!currentUserJobProfile) {
        return res.status(403).json({
          message: "Profile required",
          action: "create_profile",
          profileType: "jobs",
        });
      }

      // Get the target profile to get the target user ID
      const targetProfile = await storage.getSuiteJobProfileById(profileId);
      if (!targetProfile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Record the swipe action in database using job application system
      const applicationData = {
        userId: currentUserId,
        targetProfileId: profileId,
        targetUserId: targetProfile.userId,
        action: action,
        applicationStatus: action === "like" ? "pending" : "rejected",
        matched: false,
      };

      // Check if user already applied to this job profile
      const existingApplication = await storage.getSuiteJobApplicationByUsers(
        currentUserId,
        targetProfile.userId,
      );
      if (existingApplication) {
        return res
          .status(409)
          .json({ message: "Already acted on this profile" });
      }

      // Create the job application record
      const application =
        await storage.createSuiteJobApplication(applicationData);

      // Record swipe history for undo functionality
      await storage.addSwipeHistory({
        userId: currentUserId,
        targetUserId: targetProfile.userId,
        action: action === "like" ? "like" : "dislike",
        appMode: "SUITE_JOBS",
      });
      console.log(
        `📝 [SUITE-JOBS-HISTORY] Recorded swipe history for user ${currentUserId} -> ${targetProfile.userId} (${action})`,
      );

      // Check for mutual like if this was a like action
      let isMatch = false;
      if (action === "like") {
        // Get current user's job profile to check for mutual connection
        const currentUserJobProfile =
          await storage.getSuiteJobProfile(currentUserId);
        if (currentUserJobProfile) {
          const mutualApplication = await storage.getSuiteJobApplicationByUsers(
            targetProfile.userId,
            currentUserId,
          );
          if (mutualApplication && mutualApplication.action === "like") {
            // Update both applications to matched status
            await storage.updateSuiteJobApplication(application.id, {
              matched: true,
              applicationStatus: "accepted",
            });
            await storage.updateSuiteJobApplication(mutualApplication.id, {
              matched: true,
              applicationStatus: "accepted",
            });

            // Create or update match record for messaging system with automatic additionalConnections logic
            const existingMatch = await storage.getMatchBetweenUsers(
              currentUserId,
              targetProfile.userId,
            );
            let finalMatch;

            if (existingMatch) {
              // Handle existing match with potential metadata update for additional connections
              let metadata;

              if (!existingMatch.metadata) {
                // No existing metadata, create new
                metadata = {
                  origin: "SUITE",
                  suiteType: "jobs",
                  context: "professional",
                };
              } else {
                // Parse existing metadata to check for additional connections
                try {
                  metadata =
                    typeof existingMatch.metadata === "string"
                      ? JSON.parse(existingMatch.metadata)
                      : existingMatch.metadata;

                  // Check if this is a new connection type
                  if (metadata.suiteType !== "jobs") {
                    // Add to additionalConnections if not already present
                    if (!metadata.additionalConnections) {
                      metadata.additionalConnections = [];
                    }

                    if (!metadata.additionalConnections.includes("jobs")) {
                      metadata.additionalConnections.push("jobs");
                      console.log(
                        `🔗 Adding jobs to additionalConnections for existing match ${existingMatch.id}`,
                      );
                    }
                  }
                } catch (parseError) {
                  console.error(
                    "Failed to parse existing metadata:",
                    parseError,
                  );
                  // Fallback to new metadata
                  metadata = {
                    origin: "SUITE",
                    suiteType: "jobs",
                    context: "professional",
                  };
                }
              }

              // Update existing match with enhanced metadata
              finalMatch = await storage.updateMatch(existingMatch.id, {
                matched: true,
                metadata: JSON.stringify(metadata),
              });
            } else {
              // Create new match
              const matchData = {
                userId1: Math.min(currentUserId, targetProfile.userId),
                userId2: Math.max(currentUserId, targetProfile.userId),
                matched: true,
                isDislike: false,
                metadata: JSON.stringify({
                  origin: "SUITE",
                  suiteType: "jobs",
                  context: "professional",
                }),
              };
              finalMatch = await storage.createMatch(matchData);
            }

            isMatch = true;
            console.log(
              `💝 [SUITE-JOBS] Match created: ${currentUserId} ↔ ${targetProfile.userId}`,
            );

            // CRITICAL: Remove swipe history records for matched users to protect match integrity
            try {
              await storage.removeMatchedUsersFromSwipeHistory(
                currentUserId,
                targetProfile.userId,
              );
              console.log(
                `[JOBS-MATCH] Cleaned up swipe history for matched users: ${currentUserId} ↔ ${targetProfile.userId}`,
              );
            } catch (historyError) {
              console.error(
                "Error cleaning up jobs swipe history for matched users:",
                historyError,
              );
            }
          }
        }
      }

      console.log(
        `🚀 [SUITE-JOBS] User ${currentUserId} ${action}d job profile ${profileId}`,
      );

      // Send real-time WebSocket updates for card removal
      const sourceUserWs = connectedUsers.get(currentUserId);
      const targetUserWs = connectedUsers.get(targetProfile.userId);

      // 1. Remove target's card from source user's discover deck
      if (sourceUserWs && sourceUserWs.readyState === WebSocket.OPEN) {
        sourceUserWs.send(
          JSON.stringify({
            type: "suite_remove_from_discover",
            suiteType: "jobs",
            removeProfileId: targetProfile.id,
            removeUserId: targetProfile.userId,
            reason: action,
            timestamp: new Date().toISOString(),
          }),
        );
        console.log(
          `[REAL-TIME] Instantly removed jobs profile ${targetProfile.id} from user ${currentUserId}'s discover deck`,
        );
      }

      // 2. Remove source user's card from target user's discover deck immediately (CRITICAL FIX)
      const sourceJobProfile = await storage.getSuiteJobProfile(currentUserId);
      if (
        sourceJobProfile &&
        targetUserWs &&
        targetUserWs.readyState === WebSocket.OPEN
      ) {
        targetUserWs.send(
          JSON.stringify({
            type: "suite_remove_from_discover",
            suiteType: "jobs",
            removeProfileId: sourceJobProfile.id,
            removeUserId: currentUserId,
            reason: `received_jobs_${action}`,
            timestamp: new Date().toISOString(),
          }),
        );
        console.log(
          `[REAL-TIME] Instantly removed jobs profile ${sourceJobProfile.id} from user ${targetProfile.userId}'s discover deck`,
        );
      }

      // If it's a match, send notifications to both users
      if (isMatch) {
        // Send connections refresh to both users for new match
        [sourceUserWs, targetUserWs].forEach((ws, index) => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "suite_connections_refresh",
                suiteType: "jobs",
                reason: "new_match",
                timestamp: new Date().toISOString(),
              }),
            );
          }
        });
        console.log(
          `[CONNECTIONS-REFRESH] Sent connections refresh for new job match`,
        );
      }

      res.json({
        success: true,
        action,
        profileId,
        isMatch,
        message:
          action === "like"
            ? isMatch
              ? "It's a match!"
              : "Application sent"
            : "Profile passed",
      });
    } catch (error) {
      console.error("Error processing job swipe:", error as Error);
      res.status(500).json({ message: "Failed to process swipe action" });
    }
  });

  // Get user's saved payment methods
  app.get(
    "/api/payment/methods",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        const paymentMethods = await storage.getPaymentMethodsByUser(userId);

        res.json(paymentMethods);
      } catch (error: any) {
        console.error(
          "[PAYMENT-METHOD] Error retrieving payment methods:",
          error,
        );
        res.status(500).json({
          error: "Failed to retrieve payment methods",
        });
      }
    },
  );

  // Delete payment method
  app.delete(
    "/api/payment/methods/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        const paymentMethodId = parseInt(req.params.id);

        // Verify ownership
        const paymentMethod =
          await storage.getPaymentMethodById(paymentMethodId);
        if (!paymentMethod || paymentMethod.userId !== userId) {
          return res.status(404).json({
            error: "Payment method not found",
          });
        }

        await storage.deletePaymentMethod(paymentMethodId);

        console.log(
          `[PAYMENT-METHOD] Deleted payment method ${paymentMethodId} for user ${userId}`,
        );

        res.json({
          success: true,
        });
      } catch (error: any) {
        console.error("[PAYMENT-METHOD] Error deleting payment method:", error);
        res.status(500).json({
          error: "Failed to delete payment method",
        });
      }
    },
  );

  // Google Places API proxy endpoint
  app.get("/api/places/autocomplete", async (req: Request, res: Response) => {
    try {
      const { query } = req.query;

      if (!query || typeof query !== "string") {
        return res.status(400).json({
          error: "Query parameter is required",
        });
      }

      const apiKey =
        process.env.GOOGLE_PLACES_API_KEY ||
        process.env.VITE_GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        console.warn("[GOOGLE-PLACES] API key not available");
        return res.status(500).json({
          error: "Google Places API not configured",
        });
      }

      const googleResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&key=${apiKey}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!googleResponse.ok) {
        throw new Error(`Google Places API error: ${googleResponse.status}`);
      }

      const data = await googleResponse.json();

      if (data.status === "OK" && data.predictions) {
        console.log(
          `[GOOGLE-PLACES] Found ${data.predictions.length} suggestions for "${query}"`,
        );
        res.json({
          predictions: data.predictions.slice(0, 5), // Limit to 5 suggestions
          status: "OK",
        });
      } else {
        console.log(
          `[GOOGLE-PLACES] No results found for "${query}", status: ${data.status}`,
        );
        res.json({
          predictions: [],
          status: data.status || "NO_RESULTS",
        });
      }
    } catch (error) {
      console.error("[GOOGLE-PLACES] Error:", error);
      res.status(500).json({
        error: "Failed to search locations",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Professional Reviews API Routes
  app.get(
    "/api/professional-reviews/:userId",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = parseInt(req.params.userId);
        const reviews = await storage.getProfessionalReviewsForUser(userId);
        const stats = await storage.getProfessionalReviewStats(userId);

        res.json({
          reviews,
          stats,
          success: true,
        });
      } catch (error) {
        console.error("Error fetching professional reviews:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post("/api/professional-reviews", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { reviewedUserId, rating, reviewText, isAnonymous, category } =
        req.body;
      const reviewerUserId = req.user.id;

      // Validate required fields
      if (!reviewedUserId || !rating || !reviewText) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (rating < 1 || rating > 5) {
        return res
          .status(400)
          .json({ message: "Rating must be between 1 and 5" });
      }

      if (reviewedUserId === reviewerUserId) {
        return res.status(400).json({ message: "Cannot review yourself" });
      }

      // Check if review already exists
      const existingReview = await storage.getExistingReview(
        reviewedUserId,
        reviewerUserId,
        category || "overall",
      );

      if (existingReview) {
        // Update existing review
        const updatedReview = await storage.updateProfessionalReview(
          existingReview.id,
          {
            rating,
            reviewText,
            isAnonymous: isAnonymous || false,
          },
        );
        res.json({ review: updatedReview, success: true });
      } else {
        // Create new review
        const newReview = await storage.createProfessionalReview({
          reviewedUserId,
          reviewerUserId,
          rating,
          reviewText,
          isAnonymous: isAnonymous || false,
          category: category || "overall",
        });
        res.json({ review: newReview, success: true });
      }
    } catch (error) {
      console.error("Error creating/updating professional review:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(
    "/api/professional-reviews/:reviewedUserId/user/:reviewerUserId",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const reviewedUserId = parseInt(req.params.reviewedUserId);
        const reviewerUserId = parseInt(req.params.reviewerUserId);
        const category = (req.query.category as string) || "overall";

        const existingReview = await storage.getExistingReview(
          reviewedUserId,
          reviewerUserId,
          category,
        );

        res.json({
          review: existingReview || null,
          success: true,
        });
      } catch (error) {
        console.error("Error fetching existing review:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.delete(
    "/api/professional-reviews/:reviewId",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const reviewId = parseInt(req.params.reviewId);
        const userId = req.user!.id;

        const deleted = await storage.deleteProfessionalReview(
          reviewId,
          userId,
        );

        if (deleted) {
          res.json({
            success: true,
            message: "Review deleted successfully",
          });
        } else {
          res.status(404).json({
            success: false,
            message:
              "Review not found or you don't have permission to delete it",
          });
        }
      } catch (error) {
        console.error("Error deleting professional review:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Import unified API functions
  const { getHomePageData, getSuitePageData } = await import("./unified-api");

  // Unified API endpoints for parallel data loading
  app.get("/api/home-page-data", requireAuth, getHomePageData);
  app.get("/api/suite-page-data", requireAuth, getSuitePageData);

  // High school search routes
  app.use("/api/highschool", highSchoolSearchRoutes);

  // University search endpoint
  app.get("/api/university/search", searchUniversities);

  return httpServer;
}
