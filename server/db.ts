import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
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
import ws from "ws";

// Configure WebSocket for Neon in Node.js environment
if (typeof process !== "undefined" && process.versions?.node) {
  neonConfig.fetchConnectionCache = true;
  neonConfig.webSocketConstructor = ws;
  // Disable SSL verification for self-signed certificates in development
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
}

// Create a connection pool with SSL configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? true : false
});

// Create a drizzle client
export const db = drizzle(pool, {
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
