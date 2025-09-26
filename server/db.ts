import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import {
  users,
  userPreferences,
  matches,
  messages,
  userInterests,
  typingStatus,
  videoCalls,
  globalInterests,
  globalDealBreakers,
  globalTribes,
  globalReligions,
  verificationCodes,
  userPhotos,
  messageReactions,
  userMatchSettings,
  suiteJobProfiles,
  suiteMentorshipProfiles,
  suiteNetworkingProfiles,
  suiteProfileSettings,
  compatibilityAnalysis,
  kwameConversations,
} from "@shared/schema";

// Create Neon HTTP connection with enhanced timeout handling
const sql = neon(process.env.DATABASE_URL!, {
  // Disable connection pooling to prevent timeout issues
  fullResults: true,
});

// Create a drizzle client with HTTP driver (much faster and more reliable)
export const db = drizzle(sql, {
  schema: {
    users,
    userPreferences,
    matches,
    messages,
    userInterests,
    typingStatus,
    videoCalls,
    globalInterests,
    globalDealBreakers,
    globalTribes,
    globalReligions,
    verificationCodes,
    userPhotos,
    messageReactions,
    userMatchSettings,
    suiteJobProfiles,
    suiteMentorshipProfiles,
    suiteNetworkingProfiles,
    suiteProfileSettings,
    compatibilityAnalysis,
    kwameConversations,
  },
});
