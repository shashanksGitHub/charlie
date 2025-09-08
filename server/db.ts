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

// Lazy database connection to prevent startup crashes
let pool: any = null;
let db: any = null;

function getPool() {
  if (!pool) {
    console.log("[DB] Creating database pool connection...");
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? true : false
    });
  }
  return pool;
}

function getDb() {
  if (!db) {
    console.log("[DB] Creating drizzle client...");
    db = drizzle(getPool(), {
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
  }
  return db;
}

// Export the lazy-loaded connections
export { getPool as pool };
export { getDb as db };
