import { Express, Request, Response } from "express";
import {
  kwameAI,
  KwameRequest,
  KwameResponse,
} from "./services/kwame-ai-service";
import big5ScoringService, {
  ResponseLevel,
  Big5Profile,
} from "./services/big5-scoring-service";
import { personalityDescriptionsService } from "./services/personality-descriptions-service";
import { storage } from "./storage";
import { WebSocket } from "ws";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Rate limiting configuration
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  premiumMultiplier: number;
}

// User rate limit tracking
interface UserRateLimit {
  requests: number;
  resetTime: number;
}

// Simple in-memory conversation store for recent context
interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  context?: string;
}

interface ConversationHistory {
  userId: number;
  messages: ConversationMessage[];
  lastActivity: Date;
}

// WebSocket connections for real-time updates
let connectedUsers: Map<number, WebSocket> = new Map();

/**
 * Set WebSocket connections map - shared with main routes
 */
export function setKwameWebSocketConnections(
  connections: Map<number, WebSocket>,
) {
  connectedUsers = connections;
}

// Rate limiting for AI requests
interface RateLimitInfo {
  userId: number;
  requests: number;
  resetTime: number;
}

class KwameRateLimiter {
  private limits = new Map<number, RateLimitInfo>();
  private readonly FREE_TIER_LIMIT = 20; // 20 requests per hour
  private readonly PREMIUM_TIER_LIMIT = 100; // 100 requests per hour
  private readonly WINDOW_MS = 60 * 60 * 1000; // 1 hour

  canMakeRequest(userId: number, isPremium: boolean = false): boolean {
    const now = Date.now();
    const limit = isPremium ? this.PREMIUM_TIER_LIMIT : this.FREE_TIER_LIMIT;

    const userLimit = this.limits.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or create new limit window
      this.limits.set(userId, {
        userId,
        requests: 1,
        resetTime: now + this.WINDOW_MS,
      });
      return true;
    }

    if (userLimit.requests >= limit) {
      return false;
    }

    userLimit.requests++;
    return true;
  }

  getRemainingRequests(userId: number, isPremium: boolean = false): number {
    const limit = isPremium ? this.PREMIUM_TIER_LIMIT : this.FREE_TIER_LIMIT;
    const userLimit = this.limits.get(userId);

    if (!userLimit || Date.now() > userLimit.resetTime) {
      return limit;
    }

    return Math.max(0, limit - userLimit.requests);
  }

  getResetTime(userId: number): number {
    const userLimit = this.limits.get(userId);
    return userLimit?.resetTime || Date.now() + this.WINDOW_MS;
  }
}

const rateLimiter = new KwameRateLimiter();

// Store conversation history (in production, use Redis or database)
interface ConversationHistory {
  userId: number;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    context?: string;
  }>;
  lastActivity: Date;
}

class ConversationStore {
  private conversations = new Map<number, ConversationHistory>();
  private readonly MAX_HISTORY_AGE = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_MESSAGES_PER_USER = 50;

  addMessage(
    userId: number,
    role: "user" | "assistant",
    content: string,
    context?: string,
  ): void {
    let conversation = this.conversations.get(userId);

    if (!conversation) {
      conversation = {
        userId,
        messages: [],
        lastActivity: new Date(),
      };
      this.conversations.set(userId, conversation);
    }

    // Add new message
    conversation.messages.push({
      role,
      content,
      timestamp: new Date(),
      context,
    });

    // Trim old messages
    if (conversation.messages.length > this.MAX_MESSAGES_PER_USER) {
      conversation.messages = conversation.messages.slice(
        -this.MAX_MESSAGES_PER_USER,
      );
    }

    conversation.lastActivity = new Date();
  }

  getHistory(userId: number): ConversationHistory["messages"] {
    const conversation = this.conversations.get(userId);

    if (!conversation) {
      return [];
    }

    // Check if conversation is too old
    const now = Date.now();
    if (now - conversation.lastActivity.getTime() > this.MAX_HISTORY_AGE) {
      this.conversations.delete(userId);
      return [];
    }

    return conversation.messages;
  }

  clearHistory(userId: number): void {
    this.conversations.delete(userId);
  }
}

const conversationStore = new ConversationStore();

// Utility function to build cultural context
async function buildCulturalContext(userId: number): Promise<any> {
  try {
    console.log(
      `[KWAME-API] 🔍 DEBUG: Fetching user data for userId: ${userId}`,
    );

    const [user, preferences, networkingProfile, mentorshipProfile] =
      await Promise.all([
        storage.getUser(userId),
        storage.getUserPreferences(userId),
        storage.getSuiteNetworkingProfile(userId),
        storage.getSuiteMentorshipProfile(userId),
      ]);

    console.log(`[KWAME-API] 🔍 DEBUG: Database results:`, {
      userFound: !!user,
      userKeys: user ? Object.keys(user) : [],
      userName: user?.fullName,
      userAge: user?.dateOfBirth,
      userNationality: user?.countryOfOrigin,
      preferencesFound: !!preferences,
      networkingProfileFound: !!networkingProfile,
      mentorshipProfileFound: !!mentorshipProfile,
    });

    if (!user) {
      console.log(
        `[KWAME-API] ⚠️ WARNING: No user found for userId: ${userId}`,
      );
      return null;
    }

    // Calculate user age for cultural adaptation
    const age = user.dateOfBirth
      ? new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear()
      : null;

    // Determine cultural context
    let location = "Both"; // Default
    let ageGroup = "26-35"; // Default

    if (age) {
      if (age >= 18 && age <= 25) ageGroup = "18-25";
      else if (age >= 26 && age <= 35) ageGroup = "26-35";
      else if (age >= 36) ageGroup = "35+";
    }

    // Enhanced cultural context with nationality awareness and all profiles
    const result = {
      location,
      ageGroup,
      userProfile: user,
      userPreferences: preferences,
      networkingProfile: networkingProfile,
      mentorshipProfile: mentorshipProfile,
      nationality: user.countryOfOrigin || null,
      hasNationality: !!user.countryOfOrigin,
      needsCountryInfo: !user.countryOfOrigin,
    };

    console.log(`[KWAME-API] 🔍 DEBUG: Built cultural context:`, {
      hasUserProfile: !!result.userProfile,
      hasUserPreferences: !!result.userPreferences,
      hasNetworkingProfile: !!result.networkingProfile,
      hasMentorshipProfile: !!result.mentorshipProfile,
      calculatedAge: age,
      nationality: result.nationality,
      needsCountryInfo: result.needsCountryInfo,
      location: result.location,
    });

    return result;
  } catch (error) {
    console.error(
      `[KWAME-API] ❌ ERROR: Failed to build cultural context for userId ${userId}:`,
      error,
    );
    return null;
  }
}

// Main KWAME API routes
export function registerKwameAPI(app: Express): void {
  console.log("[KWAME-API] Registering KWAME AI routes...");

  /**
   * POST /api/kwame/chat
   * Main chat interface with KWAME AI
   */
  app.post("/api/kwame/chat", async (req: Request, res: Response) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          error: "Authentication required",
          code: "NOT_AUTHENTICATED",
        });
      }

      const userId = (req as any).user?.id;
      const { message, context, appMode } = req.body;

      console.log(`[KWAME-API] Chat request from user ${userId}`);

      // Validate input
      if (
        !message ||
        typeof message !== "string" ||
        message.trim().length === 0
      ) {
        return res.status(400).json({
          error: "Message is required and cannot be empty",
          code: "INVALID_MESSAGE",
        });
      }

      // Allow longer messages for image uploads (they contain base64 data)
      const isImageMessage = message.startsWith("_!_IMAGE_!_");
      // Increased limit to 10GB for image uploads, 2000 chars for text
      const maxLength = isImageMessage ? 10 * 1024 * 1024 * 1024 : 2000; // 10GB for images, 2000 chars for text

      if (message.length > maxLength) {
        return res.status(400).json({
          error: isImageMessage
            ? "Image too large (max 10GB)"
            : "Message too long (max 2000 characters)",
          code: "MESSAGE_TOO_LONG",
        });
      }

      // Quick command: if user asks KWAME to send/show their primary/profile photo, handle without OpenAI
      const normalized = message.toLowerCase();
      const wantsPrimaryPhoto =
        /\b(send|show)\b.*\b(my)\b.*\b(primary\s+photo|profile\s+photo|picture|dp)\b/.test(
          normalized,
        );
      if (wantsPrimaryPhoto) {
        try {
          const section =
            (appMode || "MEET").toLowerCase() === "meet" ? "meet" : "meet";
          let photoUrl: string | null = null;

          const primary = await storage.getSectionPrimaryPhoto(userId, section);
          if (primary?.photoUrl) photoUrl = primary.photoUrl;
          if (!photoUrl) {
            const me = await storage.getUser(userId);
            photoUrl = me?.photoUrl || null;
          }

          if (!photoUrl) {
            return res.status(404).json({
              error: "No primary photo found",
              code: "NO_PRIMARY_PHOTO",
            });
          }

          const kwameResponse: KwameResponse = {
            message: `_!_IMAGE_!_${photoUrl}`,
          } as any;

          // Persist conversation entries, mirroring normal flow
          await storage.createKwameConversation({
            userId,
            role: "user",
            content: message.trim(),
            context: context?.currentScreen ? JSON.stringify(context) : null,
            appMode: appMode || "MEET",
          });
          const assistantConversation = await storage.createKwameConversation({
            userId,
            role: "assistant",
            content: kwameResponse.message,
            context: null,
            appMode: appMode || "MEET",
          });

          const userSocket = connectedUsers.get(userId);
          if (userSocket && userSocket.readyState === WebSocket.OPEN) {
            try {
              userSocket.send(
                JSON.stringify({
                  type: "new_message",
                  message: {
                    id: assistantConversation.id,
                    matchId: -1,
                    senderId: -1,
                    receiverId: userId,
                    content: kwameResponse.message,
                    createdAt:
                      assistantConversation.createdAt?.toISOString() ||
                      new Date().toISOString(),
                    messageType: "text",
                  },
                  for: "recipient",
                  timestamp: new Date().toISOString(),
                }),
              );
            } catch {}
          }

          return res.json(kwameResponse);
        } catch (err) {
          console.error("[KWAME-API] Primary photo command failed:", err);
          return res
            .status(500)
            .json({ error: "Failed to retrieve primary photo" });
        }
      }

      // Image intent routing (edit or generate)
      const lower = message.toLowerCase();
      
      // Detect stylized avatar requests (anime, pixar, disney, cartoon, etc.)
      const avatarStyleMatch = message.match(/(create|generate|make|draw|design|turn)[^\n]{0,80}(anime|cartoon|manga|pixar|disney|comic|illustration)[^\n]{0,80}(avatar|image|photo|picture)/i) ||
        message.match(/(anime|cartoon|manga|pixar|disney|comic|illustration)[^\n]{0,80}(avatar|image|photo|picture)[^\n]{0,80}(of me|for me)/i) ||
        message.match(/create.*(anime|cartoon|manga|pixar|disney|comic|illustration).*avatar.*me/i);
      
      const wantsStylizedAvatar = !!avatarStyleMatch;
      const requestedStyle = avatarStyleMatch ? avatarStyleMatch[2]?.toLowerCase() || avatarStyleMatch[1]?.toLowerCase() : null;
      
      // More flexible matching: allow adjectives/words between verbs and target nouns
      const wantsImageEdit =
        /(edit|change|update|transform|improve|enhance|styl(?:e|ize)|turn)[^\n]{0,80}\b(my|the|this)\b[^\n]{0,80}\b(photo|picture|image|avatar|primary\s+photo)\b/i.test(
          lower,
        );
      let wantsImageGenerate =
        /(create|generate|make|draw|design)[^\n]{0,80}\b(image|picture|photo|avatar|logo|banner|poster)\b/i.test(
          lower,
        );
      const animeAvatarSignal =
        /(anime|cartoon|pixar|comic)/.test(lower) &&
        /(avatar|image|photo|picture)/.test(lower);
      const forceImageGenerate =
        /^\s*(create|generate|make|turn)[^\n]{0,80}(anime|cartoon|pixar|manga)[^\n]{0,80}(avatar|image|photo|picture)/i.test(
          message,
        );
      if (animeAvatarSignal) wantsImageGenerate = true;
      const wantsAnyImageAction =
        /(avatar|image|photo|picture)/.test(lower) &&
        /(create|generate|make|draw|design|turn|transform|styl|style|edit|change|update|improve|enhance)/.test(
          lower,
        );

      // Debug trace for detection
      console.log("[KWAME-API] 📥 Incoming message (trimmed):", message.trim());
      if (/(avatar|image|photo|picture)/.test(lower)) {
        console.log("[KWAME-API] 🔎 Image keywords present", { lower });
      }

      // Handle stylized avatar requests with immediate response
      if (wantsStylizedAvatar) {
        console.log("[KWAME-API] 🎨 Stylized avatar request detected:", message, "Style:", requestedStyle);
        try {
          // Get conversation history to find last shared image
          const dbConversationHistory = await storage.getRecentKwameContext(
            userId,
            20,
          );
          const conversationHistory = dbConversationHistory.map((conv) => ({
            role: conv.role as "user" | "assistant",
            content: conv.content,
            timestamp: conv.createdAt!,
            context: conv.context || undefined,
          }));

          // Find source image: last shared image in history, else section primary, else user photoUrl
          let sourceImage: string | null = null;
          for (let i = conversationHistory.length - 1; i >= 0; i--) {
            const c = conversationHistory[i]?.content as unknown as
              | string
              | undefined;
            if (typeof c === "string" && c.startsWith("_!_IMAGE_!_")) {
              sourceImage = c.substring("_!_IMAGE_!_".length);
              break;
            }
          }
          if (!sourceImage) {
            const primary = await storage.getSectionPrimaryPhoto(
              userId,
              (appMode || "MEET").toLowerCase(),
            );
            sourceImage =
              primary?.photoUrl ||
              (await storage.getUser(userId))?.photoUrl ||
              null;
          }

          // Generate stylized avatar using the dedicated method with requested style
          const dataUrl = await kwameAI.generateStylizedAvatar(sourceImage || undefined, requestedStyle || "anime");
          const photoMessage = `_!_IMAGE_!_${dataUrl}`;

          // Persist messages
          await storage.createKwameConversation({
            userId,
            role: "user",
            content: message.trim(),
            context: context?.currentScreen ? JSON.stringify(context) : null,
            appMode: appMode || "MEET",
          });
          const assistantConversation = await storage.createKwameConversation({
            userId,
            role: "assistant",
            content: photoMessage,
            context: null,
            appMode: appMode || "MEET",
          });

          // WebSocket notify
          const userSocket = connectedUsers.get(userId);
          if (userSocket && userSocket.readyState === WebSocket.OPEN) {
            try {
              userSocket.send(
                JSON.stringify({
                  type: "new_message",
                  message: {
                    id: assistantConversation.id,
                    matchId: -1,
                    senderId: -1,
                    receiverId: userId,
                    content: photoMessage,
                    createdAt:
                      assistantConversation.createdAt?.toISOString() ||
                      new Date().toISOString(),
                    messageType: "text",
                  },
                  for: "recipient",
                  timestamp: new Date().toISOString(),
                }),
              );
            } catch {}
          }

          // Return only the image response in the specified format
          return res.json({ message: photoMessage });
        } catch (err) {
          console.error("[KWAME-API] Anime avatar generation failed:", err);
          // Fall through to normal chat if anime generation fails
        }
      }

      if (
        wantsImageEdit ||
        wantsImageGenerate ||
        wantsAnyImageAction ||
        forceImageGenerate
      ) {
        console.log("[KWAME-API] 🖼️ Image intent detected", {
          wantsImageEdit,
          wantsImageGenerate,
          wantsAnyImageAction,
          animeAvatarSignal,
          forceImageGenerate,
          wantsStylizedAvatar,
          requestedStyle,
          message,
        });
        try {
          // Get conversation history from DB to search for last image
          const dbConversationHistory = await storage.getRecentKwameContext(
            userId,
            20,
          );
          const conversationHistory = dbConversationHistory.map((conv) => ({
            role: conv.role as "user" | "assistant",
            content: conv.content,
            timestamp: conv.createdAt!,
            context: conv.context || undefined,
          }));

          // Extract style/instruction after keywords like "to", "into", "in", "as"
          const styleMatch = message.match(/(?:to|into|in|as)\s+(.+)$/i);
          let styleInstruction = styleMatch
            ? styleMatch[1].trim()
            : "tasteful high-quality portrait";
          if (
            animeAvatarSignal &&
            !/anime|cartoon|manga/i.test(styleInstruction)
          ) {
            styleInstruction = `anime-style portrait, clean line art, soft cel-shading, expressive eyes, preserve identity. ${styleInstruction}`;
          }

          // Resolve source image: last shared image in history, else section primary, else user photoUrl
          let sourceImage: string | null = null;
          for (let i = conversationHistory.length - 1; i >= 0; i--) {
            const c = conversationHistory[i]?.content as unknown as
              | string
              | undefined;
            if (typeof c === "string" && c.startsWith("_!_IMAGE_!_")) {
              sourceImage = c.substring("_!_IMAGE_!_".length);
              break;
            }
          }
          if (!sourceImage) {
            const primary = await storage.getSectionPrimaryPhoto(
              userId,
              (appMode || "MEET").toLowerCase(),
            );
            sourceImage =
              primary?.photoUrl ||
              (await storage.getUser(userId))?.photoUrl ||
              null;
          }

          let dataUrl: string;
          if (
            (wantsImageEdit || /avatar|photo|picture|image/.test(lower)) &&
            sourceImage
          ) {
            dataUrl = await kwameAI.generatePixarStyleImage(
              sourceImage,
              styleInstruction,
            );
          } else {
            const prompt = styleInstruction.includes("photo")
              ? styleInstruction
              : `Generate ${styleInstruction}`;
            dataUrl = await kwameAI.generateImageFromPrompt(prompt);
          }

          const photoMessage = `_!_IMAGE_!_${dataUrl}`;

          // Persist messages
          await storage.createKwameConversation({
            userId,
            role: "user",
            content: message.trim(),
            context: context?.currentScreen ? JSON.stringify(context) : null,
            appMode: appMode || "MEET",
          });
          const assistantConversation = await storage.createKwameConversation({
            userId,
            role: "assistant",
            content: photoMessage,
            context: null,
            appMode: appMode || "MEET",
          });

          // WebSocket notify
          const userSocket = connectedUsers.get(userId);
          if (userSocket && userSocket.readyState === WebSocket.OPEN) {
            try {
              userSocket.send(
                JSON.stringify({
                  type: "new_message",
                  message: {
                    id: assistantConversation.id,
                    matchId: -1,
                    senderId: -1,
                    receiverId: userId,
                    content: photoMessage,
                    createdAt:
                      assistantConversation.createdAt?.toISOString() ||
                      new Date().toISOString(),
                    messageType: "text",
                  },
                  for: "recipient",
                  timestamp: new Date().toISOString(),
                }),
              );
            } catch {}
          }

          return res.json({ message: photoMessage });
        } catch (err) {
          console.error("[KWAME-API] Image intent handling failed:", err);
          // Fall through to normal chat if image generation fails
        }
      }

      // Get user data for premium status
      const user = await storage.getUser(userId);
      const isPremium = user?.premiumAccess || false;

      // Check rate limits
      if (!rateLimiter.canMakeRequest(userId, isPremium)) {
        const remaining = rateLimiter.getRemainingRequests(userId, isPremium);
        const resetTime = rateLimiter.getResetTime(userId);

        return res.status(429).json({
          error: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          remaining,
          resetTime,
          upgradeMessage: isPremium
            ? null
            : "Upgrade to Premium for more AI conversations!",
        });
      }

      // Build cultural context
      const culturalContext = await buildCulturalContext(userId);

      console.log(
        `[KWAME-API] 🔍 DEBUG: Cultural context for user ${userId}:`,
        {
          hasUserProfile: !!culturalContext?.userProfile,
          hasUserPreferences: !!culturalContext?.userPreferences,
          hasNetworkingProfile: !!culturalContext?.networkingProfile,
          userProfileKeys: culturalContext?.userProfile
            ? Object.keys(culturalContext.userProfile)
            : [],
          networkingProfileKeys: culturalContext?.networkingProfile
            ? Object.keys(culturalContext.networkingProfile)
            : [],
          userAge: culturalContext?.userProfile?.dateOfBirth
            ? Math.floor(
                (Date.now() -
                  culturalContext.userProfile.dateOfBirth.getTime()) /
                  (365.25 * 24 * 60 * 60 * 1000),
              )
            : null,
          userName: culturalContext?.userProfile?.fullName,
          userLocation: culturalContext?.userProfile?.location,
          userProfessionalTagline:
            culturalContext?.networkingProfile?.professionalTagline,
          userIndustry: culturalContext?.networkingProfile?.industry,
        },
      );

      // Get conversation history from database
      const dbConversationHistory = await storage.getRecentKwameContext(
        userId,
        20,
      );
      const conversationHistory = dbConversationHistory.map((conv) => ({
        role: conv.role as "user" | "assistant",
        content: conv.content,
        timestamp: conv.createdAt!,
        context: conv.context || undefined,
      }));

      // Build request for KWAME AI
      const kwameRequest: KwameRequest = {
        userId,
        message: message.trim(),
        context: {
          ...context,
          culturalContext: culturalContext
            ? {
                location: culturalContext.location,
                ethnicity: culturalContext.ethnicity,
                ageGroup: culturalContext.ageGroup,
              }
            : null,
          // Include user profile, preferences, networking and mentorship profiles for personalized responses
          userProfile: culturalContext?.userProfile,
          userPreferences: culturalContext?.userPreferences,
          networkingProfile: culturalContext?.networkingProfile,
          mentorshipProfile: culturalContext?.mentorshipProfile,
        },
        conversationHistory,
        appMode: appMode || "MEET",
      };

      console.log(
        `[KWAME-API] 🔍 DEBUG: Final context being sent to KWAME AI:`,
        {
          hasUserProfile: !!kwameRequest.context?.userProfile,
          hasUserPreferences: !!kwameRequest.context?.userPreferences,
          hasNetworkingProfile: !!kwameRequest.context?.networkingProfile,
          hasMentorshipProfile: !!kwameRequest.context?.mentorshipProfile,
          contextKeys: Object.keys(kwameRequest.context || {}),
        },
      );

      // Quick command: Stylize last shared image (Pixar/Anime/Hyper-Realistic)
      const normalizedPixar = message.toLowerCase();
      const wantsPixar =
        /pixar|disney/.test(normalizedPixar) &&
        /(transform|generate|styl(e|ize)|turn)/.test(normalizedPixar);
      const wantsAnime =
        /anime/.test(normalizedPixar) &&
        /(transform|generate|styl(e|ize)|turn)/.test(normalizedPixar);
      const wantsHyper =
        /(hyper[- ]?realistic|photoreal(istic)?)/.test(normalizedPixar) &&
        /(transform|generate|turn|styl(e|ize))/.test(normalizedPixar);
      if (wantsPixar) {
        try {
          // Find last shared image in history or use section primary
          let sourceImage: string | null = null;
          for (let i = conversationHistory.length - 1; i >= 0; i--) {
            const c = conversationHistory[i]?.content as unknown as
              | string
              | undefined;
            if (typeof c === "string" && c.startsWith("_!_IMAGE_!_")) {
              sourceImage = c.substring("_!_IMAGE_!_".length);
              break;
            }
          }
          if (!sourceImage) {
            const primary = await storage.getSectionPrimaryPhoto(
              userId,
              (appMode || "MEET").toLowerCase(),
            );
            sourceImage =
              primary?.photoUrl ||
              (await storage.getUser(userId))?.photoUrl ||
              null;
          }
          if (!sourceImage) {
            return res
              .status(400)
              .json({ error: "No image available to transform" });
          }

          const generated = await kwameAI.generatePixarStyleImage(sourceImage);
          const photoMessage = `_!_IMAGE_!_${generated}`;

          // Store and notify like normal
          await storage.createKwameConversation({
            userId,
            role: "user",
            content: message.trim(),
            context: context?.currentScreen ? JSON.stringify(context) : null,
            appMode: appMode || "MEET",
          });
          const assistantConversation = await storage.createKwameConversation({
            userId,
            role: "assistant",
            content: photoMessage,
            context: null,
            appMode: appMode || "MEET",
          });
          const userSocket = connectedUsers.get(userId);
          if (userSocket && userSocket.readyState === WebSocket.OPEN) {
            try {
              userSocket.send(
                JSON.stringify({
                  type: "new_message",
                  message: {
                    id: assistantConversation.id,
                    matchId: -1,
                    senderId: -1,
                    receiverId: userId,
                    content: photoMessage,
                    createdAt:
                      assistantConversation.createdAt?.toISOString() ||
                      new Date().toISOString(),
                    messageType: "text",
                  },
                  for: "recipient",
                  timestamp: new Date().toISOString(),
                }),
              );
            } catch {}
          }
          return res.json({ message: photoMessage });
        } catch (err) {
          console.error("[KWAME-API] Pixar transform failed:", err);
          return res
            .status(500)
            .json({ error: "Failed to generate Pixar-style image" });
        }
      }

      if (wantsAnime || wantsHyper) {
        try {
          let sourceImage: string | null = null;
          for (let i = conversationHistory.length - 1; i >= 0; i--) {
            const c = conversationHistory[i]?.content as unknown as
              | string
              | undefined;
            if (typeof c === "string" && c.startsWith("_!_IMAGE_!_")) {
              sourceImage = c.substring("_!_IMAGE_!_".length);
              break;
            }
          }
          if (!sourceImage) {
            const primary = await storage.getSectionPrimaryPhoto(
              userId,
              (appMode || "MEET").toLowerCase(),
            );
            sourceImage =
              primary?.photoUrl ||
              (await storage.getUser(userId))?.photoUrl ||
              null;
          }
          if (!sourceImage) {
            return res
              .status(400)
              .json({ error: "No image available to transform" });
          }

          const stylePrompt = wantsAnime
            ? "Transform this photo into a high-quality anime illustration while preserving recognizable facial features, hairstyle, and outfit colors. Use clean line art, soft cel-shading, expressive eyes, and a tasteful, softly blurred anime background."
            : "Transform this photo into a hyper-realistic portrait that preserves facial identity and outfit, with cinematic lighting, detailed textures, and shallow depth-of-field. Keep it tasteful and friendly.";

          const generated = await kwameAI.generatePixarStyleImage(
            sourceImage,
            stylePrompt,
          );
          const photoMessage = `_!_IMAGE_!_${generated}`;

          await storage.createKwameConversation({
            userId,
            role: "user",
            content: message.trim(),
            context: context?.currentScreen ? JSON.stringify(context) : null,
            appMode: appMode || "MEET",
          });
          const assistantConversation = await storage.createKwameConversation({
            userId,
            role: "assistant",
            content: photoMessage,
            context: null,
            appMode: appMode || "MEET",
          });
          const userSocket = connectedUsers.get(userId);
          if (userSocket && userSocket.readyState === WebSocket.OPEN) {
            try {
              userSocket.send(
                JSON.stringify({
                  type: "new_message",
                  message: {
                    id: assistantConversation.id,
                    matchId: -1,
                    senderId: -1,
                    receiverId: userId,
                    content: photoMessage,
                    createdAt:
                      assistantConversation.createdAt?.toISOString() ||
                      new Date().toISOString(),
                    messageType: "text",
                  },
                  for: "recipient",
                  timestamp: new Date().toISOString(),
                }),
              );
            } catch {}
          }
          return res.json({ message: photoMessage });
        } catch (err) {
          console.error("[KWAME-API] Alt style transform failed:", err);
          return res
            .status(500)
            .json({ error: "Failed to generate stylized image" });
        }
      }

      // Check if this is a pure image upload without any accompanying text/request
      if (isImageMessage) {
        console.log(`[KWAME-API] ⚠️  IMAGE UPLOAD DETECTED for user ${userId}`);
        console.log(`[KWAME-API] ⚠️  Message length: ${message.length}`);
        console.log(
          `[KWAME-API] ⚠️  Message starts with marker: ${message.startsWith("_!_IMAGE_!_")}`,
        );

        // For pure image uploads, the message should start with "_!_IMAGE_!_" and contain ONLY base64 data
        // If there's any text before the image marker, it means user is asking something about the image
        const imageMarker = "_!_IMAGE_!_";
        const isPureImageUpload =
          message.startsWith(imageMarker) &&
          message.length > imageMarker.length; // Has actual image data

        if (isPureImageUpload) {
          console.log(
            `[KWAME-API] ✅ PURE IMAGE UPLOAD - SKIPPING AI ANALYSIS (${message.length} chars)`,
          );

          // Store the image message without generating an automatic description
          const userConversation = await storage.createKwameConversation({
            userId,
            role: "user",
            content: message.trim(),
            context: context?.currentScreen ? JSON.stringify(context) : null,
            appMode: appMode || "MEET",
          });

          console.log(
            `[KWAME-API] Image message stored with ID: ${userConversation.id}`,
          );

          // Return success without generating a description
          return res.json({
            message: "Image received",
            imageStored: true,
            rateLimitInfo: {
              remaining: rateLimiter.getRemainingRequests(userId, isPremium),
              resetTime: rateLimiter.getResetTime(userId),
              isPremium,
            },
          });
        } else {
          console.log(
            `[KWAME-API] Image upload with text/request detected, proceeding with AI analysis`,
          );
        }
      }

      // Get AI response (for non-image messages or when image description is explicitly requested)
      console.log(`[KWAME-API] Getting AI response for user ${userId}`);
      const kwameResponse: KwameResponse = await kwameAI.chat(kwameRequest);
      console.log(`[KWAME-API] AI response received for user ${userId}`);

      // Store conversation in database
      console.log(`[KWAME-API] Storing user message for user ${userId}`);
      const userConversation = await storage.createKwameConversation({
        userId,
        role: "user",
        content: message.trim(),
        context: context?.currentScreen ? JSON.stringify(context) : null,
        appMode: appMode || "MEET",
      });
      console.log(
        `[KWAME-API] User message stored with ID: ${userConversation.id}`,
      );

      console.log(`[KWAME-API] Storing assistant message for user ${userId}`);
      const assistantConversation = await storage.createKwameConversation({
        userId,
        role: "assistant",
        content: kwameResponse.message,
        context: null,
        appMode: appMode || "MEET",
      });
      console.log(
        `[KWAME-API] Assistant message stored with ID: ${assistantConversation.id}`,
      );

      // Also add to in-memory store for immediate access
      conversationStore.addMessage(userId, "user", message.trim());
      conversationStore.addMessage(userId, "assistant", kwameResponse.message);

      // Send WebSocket notification for real-time chat updates
      const userSocket = connectedUsers.get(userId);
      if (userSocket && userSocket.readyState === WebSocket.OPEN) {
        try {
          // Send KWAME AI message as a new_message event with special matchId -1
          userSocket.send(
            JSON.stringify({
              type: "new_message",
              message: {
                id: assistantConversation.id,
                matchId: -1, // Special ID for KWAME AI
                senderId: -1, // KWAME AI sender ID
                receiverId: userId,
                content: kwameResponse.message,
                createdAt:
                  assistantConversation.createdAt?.toISOString() ||
                  new Date().toISOString(),
                messageType: "text",
              },
              for: "recipient",
              timestamp: new Date().toISOString(),
            }),
          );
          console.log(
            `[KWAME-API] ✅ Real-time notification sent to user ${userId}`,
          );
        } catch (wsError) {
          console.error(
            `[KWAME-API] Failed to send WebSocket notification to user ${userId}:`,
            wsError,
          );
        }
      } else {
        console.log(
          `[KWAME-API] ⚠️ User ${userId} not connected via WebSocket`,
        );
      }

      // Return response with rate limit info
      res.json({
        ...kwameResponse,
        rateLimitInfo: {
          remaining: rateLimiter.getRemainingRequests(userId, isPremium),
          resetTime: rateLimiter.getResetTime(userId),
          isPremium,
        },
      });
    } catch (error) {
      console.error("[KWAME-API] Chat error:", error);
      res.status(500).json({
        error: "Internal server error",
        message:
          "KWAME is having trouble right now. Please try again in a moment.",
        code: "INTERNAL_ERROR",
      });
    }
  });

  // Generate Pixar-style avatar, save to users.avatar_photo and enable show_avatar
  app.post(
    "/api/kwame/generate-avatar",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated() || !(req as any).user?.id) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        const userId = (req as any).user.id as number;
        const section = (req.body?.section || "meet").toString();

        // Find primary photo for the section; fallback to user.photoUrl
        const primary = await storage.getSectionPrimaryPhoto(userId, section);
        let source = primary?.photoUrl || null;
        if (!source) {
          const me = await storage.getUser(userId);
          source = me?.photoUrl || null;
        }
        if (!source) {
          return res
            .status(400)
            .json({ message: "No primary photo available to generate avatar" });
        }

        const dataUrl = await kwameAI.generatePixarStyleImage(source);
        await db
          .update(users)
          .set({
            avatarPhoto: dataUrl,
            showAvatar: true,
            updatedAt: new Date() as any,
          })
          .where(eq(users.id, userId));
        res.json({ success: true, avatarPhoto: dataUrl });
      } catch (err: any) {
        console.error("[KWAME-API][AVATAR]", err);
        res
          .status(500)
          .json({ message: err?.message || "Failed to generate avatar" });
      }
    },
  );

  // Delete avatar: clear avatar_photo and show_avatar
  app.delete("/api/user/avatar", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !(req as any).user?.id) {
        console.log("[KWAME-API][AVATAR-DELETE] Unauthorized request");
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = (req as any).user.id as number;
      console.log(
        `[KWAME-API][AVATAR-DELETE] Deleting avatar for user ${userId}`,
      );

      // Get user before update to see current state
      const userBefore = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      console.log(
        `[KWAME-API][AVATAR-DELETE] User before update: avatarPhoto=${userBefore[0]?.avatarPhoto}, showAvatar=${userBefore[0]?.showAvatar}`,
      );

      const result = await db
        .update(users)
        .set({
          avatarPhoto: null as any,
          showAvatar: false,
          updatedAt: new Date() as any,
        })
        .where(eq(users.id, userId));

      // Get user after update to confirm the changes
      const userAfter = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      console.log(
        `[KWAME-API][AVATAR-DELETE] User after update: avatarPhoto=${userAfter[0]?.avatarPhoto}, showAvatar=${userAfter[0]?.showAvatar}`,
      );

      console.log(
        `[KWAME-API][AVATAR-DELETE] Successfully deleted avatar for user ${userId}`,
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error("[KWAME-API][AVATAR-DELETE] Error:", err);
      res
        .status(500)
        .json({ message: err?.message || "Failed to delete avatar" });
    }
  });

  /**
   * POST /api/kwame/suggestions
   * Get contextual suggestions for specific scenarios
   */
  app.post("/api/kwame/suggestions", async (req: Request, res: Response) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          error: "Authentication required",
          code: "NOT_AUTHENTICATED",
        });
      }

      const userId = (req as any).user?.id;
      const { context, appMode, scenario } = req.body;

      console.log(`[KWAME-API] Suggestions request from user ${userId}`);

      // Build cultural context
      const culturalContext = await buildCulturalContext(userId);

      // Build request for suggestions
      const kwameRequest: KwameRequest = {
        userId,
        message: scenario || "Give me some conversation suggestions",
        context: {
          ...context,
          culturalContext: culturalContext
            ? {
                location: culturalContext.location,
                ethnicity: culturalContext.ethnicity,
                ageGroup: culturalContext.ageGroup,
              }
            : null,
          // Include user profile and preferences for personalized suggestions
          userProfile: culturalContext?.userProfile,
          userPreferences: culturalContext?.userPreferences,
        },
        appMode: appMode || "MEET",
      };

      // Get suggestions
      const suggestions = await kwameAI.getSuggestions(kwameRequest);

      res.json({
        suggestions,
        context: kwameRequest.context,
      });
    } catch (error) {
      console.error("[KWAME-API] Suggestions error:", error);
      res.status(500).json({
        error: "Failed to get suggestions",
        suggestions: [
          "Ask about their interests",
          "Share something about yourself",
          "Be genuine and authentic",
        ],
      });
    }
  });

  /**
   * POST /api/kwame/analyze-profile
   * Analyze user profile and provide improvement suggestions
   */
  app.post(
    "/api/kwame/analyze-profile",
    async (req: Request, res: Response) => {
      try {
        // Check authentication
        if (!req.isAuthenticated()) {
          return res.status(401).json({
            error: "Authentication required",
            code: "NOT_AUTHENTICATED",
          });
        }

        const userId = (req as any).user?.id;

        console.log(`[KWAME-API] Profile analysis request from user ${userId}`);

        // Get user data
        const [user, preferences] = await Promise.all([
          storage.getUser(userId),
          storage.getUserPreferences(userId),
        ]);

        if (!user) {
          return res.status(404).json({
            error: "User not found",
            code: "USER_NOT_FOUND",
          });
        }

        // Check rate limits (profile analysis uses more resources)
        const isPremium = user.premiumAccess || false;
        if (!rateLimiter.canMakeRequest(userId, isPremium)) {
          return res.status(429).json({
            error: "Rate limit exceeded for profile analysis",
            code: "RATE_LIMIT_EXCEEDED",
          });
        }

        // Get profile analysis
        const analysis = await kwameAI.analyzeProfile(
          user,
          preferences || undefined,
        );

        res.json({
          ...analysis,
          rateLimitInfo: {
            remaining: rateLimiter.getRemainingRequests(userId, isPremium),
            resetTime: rateLimiter.getResetTime(userId),
            isPremium,
          },
        });
      } catch (error) {
        console.error("[KWAME-API] Profile analysis error:", error);
        res.status(500).json({
          error: "Failed to analyze profile",
          message:
            "KWAME cannot analyze your profile right now. Please try again later.",
          code: "ANALYSIS_ERROR",
        });
      }
    },
  );

  /**
   * GET /api/kwame/conversation-history
   * Get user's conversation history with KWAME AI
   */
  app.get(
    "/api/kwame/conversation-history",
    async (req: Request, res: Response) => {
      try {
        // Check authentication
        if (!req.isAuthenticated()) {
          return res.status(401).json({
            error: "Authentication required",
            code: "NOT_AUTHENTICATED",
          });
        }

        const userId = (req as any).user?.id;
        const limit = parseInt(req.query.limit as string) || 20;

        console.log(`[KWAME-API] History request from user ${userId}`);

        // Fetch from database instead of in-memory store
        const dbHistory = await storage.getRecentKwameContext(userId, limit);

        // Transform database format to match expected API format
        const messages = dbHistory.map((conv) => ({
          role: conv.role,
          content: conv.content,
          timestamp: conv.createdAt?.toISOString() || new Date().toISOString(),
          context: conv.context,
        }));

        res.json({
          messages: messages,
          total: messages.length,
          hasMore: false, // For now, assuming we get all available messages
        });
      } catch (error) {
        console.error("[KWAME-API] History error:", error);
        res.status(500).json({
          error: "Failed to get conversation history",
          messages: [],
        });
      }
    },
  );

  /**
   * DELETE /api/kwame/conversation-history
   * Clear user's conversation history
   */
  app.delete(
    "/api/kwame/conversation-history",
    async (req: Request, res: Response) => {
      try {
        // Check authentication
        if (!req.isAuthenticated()) {
          return res.status(401).json({
            error: "Authentication required",
            code: "NOT_AUTHENTICATED",
          });
        }

        const userId = (req as any).user?.id;

        console.log(`[KWAME-API] Clear history request from user ${userId}`);

        conversationStore.clearHistory(userId);

        res.json({
          success: true,
          message: "Conversation history cleared",
        });
      } catch (error) {
        console.error("[KWAME-API] Clear history error:", error);
        res.status(500).json({
          error: "Failed to clear conversation history",
        });
      }
    },
  );

  /**
   * GET /api/kwame/status
   * Get KWAME AI service status and user limits
   */
  app.get("/api/kwame/status", async (req: Request, res: Response) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          error: "Authentication required",
          code: "NOT_AUTHENTICATED",
        });
      }

      const userId = (req as any).user?.id;

      // Get user data for premium status
      const user = await storage.getUser(userId);
      const isPremium = user?.premiumAccess || false;

      res.json({
        status: "online",
        available: true,
        rateLimitInfo: {
          remaining: rateLimiter.getRemainingRequests(userId, isPremium),
          resetTime: rateLimiter.getResetTime(userId),
          isPremium,
          limits: {
            free: rateLimiter["FREE_TIER_LIMIT"],
            premium: rateLimiter["PREMIUM_TIER_LIMIT"],
          },
        },
        features: {
          chat: true,
          suggestions: true,
          profileAnalysis: true,
          conversationHistory: true,
          culturalContext: true,
        },
      });
    } catch (error) {
      console.error("[KWAME-API] Status error:", error);
      res.status(500).json({
        status: "error",
        available: false,
        error: "Service temporarily unavailable",
      });
    }
  });

  /**
   * POST /api/kwame/feedback
   * Submit feedback on KWAME responses
   */
  app.post("/api/kwame/feedback", async (req: Request, res: Response) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          error: "Authentication required",
          code: "NOT_AUTHENTICATED",
        });
      }

      const userId = (req as any).user?.id;
      const { messageId, rating, feedback, responseType } = req.body;

      console.log(`[KWAME-API] Feedback from user ${userId}: ${rating}/5`);

      // In production, store this feedback in database for ML improvements
      // For now, just log it
      console.log(
        `[KWAME-FEEDBACK] User ${userId} rated response ${messageId}: ${rating}/5`,
      );
      if (feedback) {
        console.log(`[KWAME-FEEDBACK] Comments: ${feedback}`);
      }

      res.json({
        success: true,
        message: "Thank you for your feedback! This helps KWAME improve.",
      });
    } catch (error) {
      console.error("[KWAME-API] Feedback error:", error);
      res.status(500).json({
        error: "Failed to submit feedback",
      });
    }
  });

  /**
   * GET /api/kwame/history
   * Get conversation history with KWAME AI
   */
  app.get("/api/kwame/history", async (req: Request, res: Response) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          error: "Authentication required",
          code: "NOT_AUTHENTICATED",
        });
      }

      const userId = (req as any).user?.id;
      const limit = parseInt(req.query.limit as string) || 500;

      console.log(`[KWAME-API] History request from user ${userId}`);

      // Get conversation history from database
      const conversations = await storage.getKwameConversationHistory(
        userId,
        limit,
      );

      res.json({
        conversations: conversations.map((conv) => ({
          id: conv.id,
          role: conv.role,
          content: conv.content,
          context: conv.context ? JSON.parse(conv.context) : null,
          appMode: conv.appMode,
          timestamp: conv.createdAt,
        })),
        total: conversations.length,
      });
    } catch (error) {
      console.error("[KWAME-API] History error:", error);
      res.status(500).json({
        error: "Failed to fetch conversation history",
      });
    }
  });

  /**
   * DELETE /api/kwame/history
   * Clear conversation history with KWAME AI
   */
  app.delete("/api/kwame/history", async (req: Request, res: Response) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          error: "Authentication required",
          code: "NOT_AUTHENTICATED",
        });
      }

      const userId = (req as any).user?.id;

      console.log(`[KWAME-API] Clear history request from user ${userId}`);

      // Clear conversation history from database
      await storage.clearKwameConversationHistory(userId);

      res.json({
        success: true,
        message: "Conversation history cleared successfully",
      });
    } catch (error) {
      console.error("[KWAME-API] Clear history error:", error);
      res.status(500).json({
        error: "Failed to clear conversation history",
      });
    }
  });

  /**
   * POST /api/kwame/update-country
   * Update user's country of origin for cultural adaptation
   */
  app.post("/api/kwame/update-country", async (req: Request, res: Response) => {
    try {
      // Check authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          error: "Authentication required",
          code: "NOT_AUTHENTICATED",
        });
      }

      const userId = (req as any).user?.id;
      const { country } = req.body;

      if (!country || typeof country !== "string") {
        return res.status(400).json({
          error: "Country is required and must be a string",
          code: "INVALID_COUNTRY",
        });
      }

      console.log(
        `[KWAME-API] Updating country for user ${userId} to: ${country}`,
      );

      // Update user's country of origin
      const updatedUser = await storage.updateUser(userId, {
        countryOfOrigin: country.trim(),
      });

      if (!updatedUser) {
        return res.status(404).json({
          error: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      console.log(
        `[KWAME-API] ✅ Successfully updated country for user ${userId}`,
      );

      res.json({
        success: true,
        message: "Country updated successfully",
        country: country.trim(),
      });
    } catch (error) {
      console.error("[KWAME-API] Update country error:", error);
      res.status(500).json({
        error: "Failed to update country",
        code: "UPDATE_FAILED",
      });
    }
  });

  /**
   * POST /api/kwame/personalize-statement
   * Personalizes personality test statements based on user profile
   */
  app.post(
    "/api/kwame/personalize-statement",
    async (req: Request, res: Response) => {
      try {
        // Check authentication
        if (!req.isAuthenticated()) {
          return res.status(401).json({
            error: "Authentication required",
            code: "NOT_AUTHENTICATED",
          });
        }

        const userId = (req as any).user?.id;
        const { statement, index, languageCode } = req.body;

        // Validate input
        if (!statement || typeof statement !== "string") {
          return res.status(400).json({
            error: "Statement is required",
            code: "INVALID_STATEMENT",
          });
        }

        // Default to English if no language code provided
        const targetLanguage = languageCode || "en";

        // Clean the statement by removing surrounding quotes if they exist
        const cleanStatement = statement.replace(/^["']|["']$/g, "").trim();

        console.log(
          `[KWAME-API] Personalizing statement for user ${userId} in language ${targetLanguage}: "${cleanStatement}"`,
        );

        // Get user profile and context for personalization
        const culturalContext = await buildCulturalContext(userId);

        if (!culturalContext) {
          // If no context available, return original statement
          return res.json({ personalizedStatement: cleanStatement });
        }

        // Language-specific instructions
        const languageInstructions: Record<string, string> = {
          en: "- Write the personalized statement in English",
          fr: "- Write the personalized statement in French (français)",
          es: "- Write the personalized statement in Spanish (español)",
          tw: "- Write the personalized statement in Twi (Akan language from Ghana)",
          ak: "- Write the personalized statement in Akan (Twi language from Ghana)",
        };

        const languageInstruction =
          languageInstructions[targetLanguage] || languageInstructions["en"];

        // Create personalization request (shortened to avoid character limit)
        const contextLines = [
          culturalContext.userProfile?.profession &&
            `Profession: ${culturalContext.userProfile.profession}`,
          culturalContext.userProfile?.location &&
            `Location: ${culturalContext.userProfile.location}`,
          culturalContext.nationality &&
            `Culture: ${culturalContext.nationality}`,
        ]
          .filter(Boolean)
          .join(", ");

        const personalizationRequest: KwameRequest = {
          userId,
          message: `Rephrase this personality statement for a ${culturalContext.nationality || "global"} user: "${cleanStatement}"

Make it:
- Personal using "you"
- Statement (not question) for agree/disagree response
- Natural and conversational
${languageInstruction}
${contextLines ? `Context: ${contextLines}` : ""}

Return only the rephrased statement.`,
          context: {
            currentScreen: "personality-test",
            culturalContext,
            userProfile: culturalContext.userProfile,
            userPreferences: culturalContext.userPreferences,
            networkingProfile: culturalContext.networkingProfile,
            mentorshipProfile: culturalContext.mentorshipProfile,
          },
          appMode: "MEET",
        };

        // Get AI response for personalization
        const response = await kwameAI.chat(personalizationRequest);

        res.json({
          personalizedStatement: response.message.trim(),
          originalStatement: cleanStatement,
        });
      } catch (error) {
        console.error("[KWAME-API] Statement personalization error:", error);
        res.status(500).json({
          error: "Failed to personalize statement",
          code: "PERSONALIZATION_FAILED",
          // Fallback to original statement
          personalizedStatement: req.body.statement || "",
          originalStatement: req.body.statement || "",
        });
      }
    },
  );

  // Personality Assessment API Endpoints

  // Get personality assessment status
  app.get(
    "/api/kwame/personality/status",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user!.id;
        const userRecord = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (userRecord.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        const user = userRecord[0];
        const personalityRecords = user.personalityRecords
          ? JSON.parse(user.personalityRecords)
          : null;
        const big5Profile = user.big5Profile
          ? JSON.parse(user.big5Profile)
          : null;

        res.json({
          completed: user.personalityTestCompleted || false,
          progress: personalityRecords ? personalityRecords.length : 0,
          totalQuestions: 100,
          hasBig5Profile: !!big5Profile,
          big5ComputedAt: user.big5ComputedAt,
          personalityModelVersion: user.personalityModelVersion,
        });
      } catch (error) {
        console.error("[KWAME-API] Personality status error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Start or continue personality assessment
  app.post(
    "/api/kwame/personality/start",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user!.id;
        const userRecord = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (userRecord.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        const user = userRecord[0];
        const personalityRecords = user.personalityRecords
          ? JSON.parse(user.personalityRecords)
          : [];
        const statements = big5ScoringService.getStatements();

        res.json({
          currentProgress: personalityRecords.length,
          totalQuestions: statements.length,
          nextQuestion:
            personalityRecords.length < statements.length
              ? {
                  index: personalityRecords.length,
                  statement: statements[personalityRecords.length],
                  options: [
                    "StronglyDisagree",
                    "Disagree",
                    "Neutral",
                    "Agree",
                    "StronglyAgree",
                  ],
                }
              : null,
          completed: personalityRecords.length >= statements.length,
        });
      } catch (error) {
        console.error("[KWAME-API] Personality start error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Submit personality assessment answer
  app.post(
    "/api/kwame/personality/answer",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const { questionIndex, answer } = req.body;

        if (
          typeof questionIndex !== "number" ||
          !answer ||
          ![
            "StronglyDisagree",
            "Disagree",
            "Neutral",
            "Agree",
            "StronglyAgree",
          ].includes(answer)
        ) {
          return res
            .status(400)
            .json({ message: "Invalid question index or answer" });
        }

        const userId = req.user!.id;
        const userRecord = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (userRecord.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        const user = userRecord[0];
        const personalityRecords = user.personalityRecords
          ? JSON.parse(user.personalityRecords)
          : [];

        // Ensure array is large enough and update the specific index
        while (personalityRecords.length <= questionIndex) {
          personalityRecords.push(null);
        }
        personalityRecords[questionIndex] = answer;

        // Update database
        await db
          .update(users)
          .set({
            personalityRecords: JSON.stringify(personalityRecords),
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        const statements = big5ScoringService.getStatements();
        const isCompleted =
          personalityRecords.filter((r: any) => r !== null).length >=
          statements.length;

        res.json({
          success: true,
          progress: personalityRecords.filter((r: any) => r !== null).length,
          totalQuestions: statements.length,
          completed: isCompleted,
          nextQuestion:
            !isCompleted && personalityRecords.length < statements.length
              ? {
                  index: personalityRecords.length,
                  statement: statements[personalityRecords.length],
                  options: [
                    "StronglyDisagree",
                    "Disagree",
                    "Neutral",
                    "Agree",
                    "StronglyAgree",
                  ],
                }
              : null,
        });
      } catch (error) {
        console.error("[KWAME-API] Personality answer error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Complete personality assessment and compute Big 5 profile
  app.post(
    "/api/kwame/personality/complete",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user!.id;
        const userRecord = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (userRecord.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        const user = userRecord[0];
        const personalityRecords = user.personalityRecords
          ? JSON.parse(user.personalityRecords)
          : [];

        // Validate we have 100 complete responses
        if (
          personalityRecords.length !== 100 ||
          personalityRecords.some((r: any) => !r)
        ) {
          return res.status(400).json({
            message: "Incomplete personality assessment",
            progress: personalityRecords.filter((r: any) => r !== null).length,
            required: 100,
          });
        }

        // Validate responses
        const validation = big5ScoringService.validateResponses(
          personalityRecords as ResponseLevel[],
        );
        if (!validation.valid) {
          return res.status(400).json({
            message: "Invalid responses",
            errors: validation.errors,
          });
        }

        // Generate Big 5 profile
        const big5Profile = big5ScoringService.generateBig5Profile(
          personalityRecords as ResponseLevel[],
        );

        // Update database with completion and Big 5 results
        await db
          .update(users)
          .set({
            personalityTestCompleted: true,
            big5Profile: JSON.stringify(big5Profile),
            big5ComputedAt: new Date(),
            personalityModelVersion: big5Profile.metadata.modelVersion,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        console.log(`[KWAME-API] Big 5 profile computed for user ${userId}`);

        res.json({
          success: true,
          message: "Personality assessment completed successfully",
          big5Profile,
        });
      } catch (error) {
        console.error("[KWAME-API] Personality completion error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Get Big 5 profile results
  app.get(
    "/api/kwame/personality/results",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user!.id;
        const userRecord = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (userRecord.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        const user = userRecord[0];

        if (!user.personalityTestCompleted || !user.big5Profile) {
          return res.status(404).json({
            message: "Personality assessment not completed",
            completed: user.personalityTestCompleted || false,
          });
        }

        const big5Profile = JSON.parse(user.big5Profile) as Big5Profile;

        res.json({
          big5Profile,
          computedAt: user.big5ComputedAt,
          modelVersion: user.personalityModelVersion,
        });
      } catch (error) {
        console.error("[KWAME-API] Personality results error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Get detailed trait analysis for specific Big 5 trait
  app.get(
    "/api/kwame/personality/trait-analysis/:traitName",
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user!.id;
        const traitName = req.params.traitName;

        // Validate trait name
        const validTraits = [
          "Openness",
          "Agreeableness",
          "Conscientiousness",
          "Extraversion",
          "Neuroticism",
        ];
        if (!validTraits.includes(traitName)) {
          return res.status(400).json({
            message: "Invalid trait name",
            validTraits,
          });
        }

        const userRecord = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (userRecord.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        const user = userRecord[0];

        if (!user.personalityTestCompleted || !user.big5Profile) {
          return res.status(404).json({
            message: "Personality assessment not completed",
            completed: user.personalityTestCompleted || false,
          });
        }

        const big5Profile = JSON.parse(user.big5Profile) as Big5Profile;

        // Generate detailed analysis for all traits
        const detailedAnalyses =
          personalityDescriptionsService.generateDetailedAnalysis(
            big5Profile.aspectPercentiles,
          );

        // Find the requested trait analysis
        const traitAnalysis = detailedAnalyses.find(
          (analysis) => analysis.name === traitName,
        );

        if (!traitAnalysis) {
          return res.status(404).json({ message: "Trait analysis not found" });
        }

        res.json({
          traitAnalysis,
          computedAt: user.big5ComputedAt,
          modelVersion: user.personalityModelVersion,
        });
      } catch (error) {
        console.error("[KWAME-API] Trait analysis error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  console.log("[KWAME-API] ✅ KWAME AI routes registered successfully");
}
