/**
 * Frontend Cache Invalidation Handler
 *
 * This module handles cache invalidation events from the server
 * and clears all relevant caches to maintain data consistency.
 *
 * MOBILE-FRIENDLY: Updated to be less aggressive to prevent user confusion
 */

import { QueryClient } from "@tanstack/react-query";
import { safeStorageRemove, safeStorageKeys } from "./storage-utils";

interface CacheInvalidationEvent {
  type: "cache:invalidate";
  action: "clear_message_cache";
  matchId: number;
  messageId?: number;
  reason: string;
  timestamp: string;
  clearTargets: string[];
}

/**
 * Detects if we're on a mobile browser
 */
function isMobileBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent;
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent,
    );
  const isSmallScreen = window.innerWidth <= 768;

  return isMobile || isSmallScreen;
}

/**
 * Clears React Query cache for message-related queries
 * MOBILE-FRIENDLY: More conservative approach
 */
function clearReactQueryCache(
  queryClient: QueryClient,
  matchId: number,
  reason: string,
) {
  console.log(
    `[CACHE-CLEAR] Clearing React Query cache for match ${matchId}, reason: ${reason}`,
  );

  try {
    const isMobile = isMobileBrowser();

    if (isMobile && reason === "message_delete") {
      // MOBILE: Be gentler - only invalidate specific queries, don't remove them
      console.log(`[CACHE-CLEAR] Using mobile-friendly cache invalidation`);

      // Only invalidate messages for this specific match
      queryClient.invalidateQueries({
        queryKey: ["/api/messages", matchId],
        refetchType: "none", // Don't force immediate refetch
      });

      // Don't invalidate matches query on mobile for message operations
      // This prevents matches from temporarily disappearing
      console.log(
        `[CACHE-CLEAR] Preserving matches cache on mobile for stability`,
      );
    } else {
      // DESKTOP: Use more aggressive cache clearing
      console.log(
        `[CACHE-CLEAR] Using standard cache invalidation for desktop`,
      );

      // Remove specific message queries
      queryClient.removeQueries({ queryKey: ["/api/messages", matchId] });
      queryClient.removeQueries({
        queryKey: ["/api/matches", matchId, "reactions"],
      });
      queryClient.removeQueries({
        queryKey: ["/api/matches", matchId, "auto-delete-settings"],
      });

      // Invalidate related queries to force refetch
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/messages/unread/count"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matches/counts"] });
    }

    console.log(`[CACHE-CLEAR] React Query cache cleared for match ${matchId}`);
  } catch (error) {
    console.error(`[CACHE-CLEAR] Error clearing React Query cache:`, error);
  }
}

/**
 * Clears localStorage and sessionStorage keys related to the match
 * MOBILE-FRIENDLY: More selective clearing
 */
function clearBrowserStorage(matchId: number, reason: string) {
  console.log(
    `[CACHE-CLEAR] Clearing browser storage for match ${matchId}, reason: ${reason}`,
  );

  try {
    const isMobile = isMobileBrowser();

    if (isMobile && reason === "message_delete") {
      // MOBILE: Only clear message-specific storage, preserve match data
      console.log(`[CACHE-CLEAR] Using selective storage clearing for mobile`);

      const messageKeys = [
        `MEET_messages_${matchId}`,
        `DISCOVER_messages_${matchId}`,
        `chat_messages_${matchId}`,
        `session_messages_${matchId}`,
      ];

      messageKeys.forEach((key) => {
        try {
          safeStorageRemove(key);
          console.log(`[CACHE-CLEAR] Cleared message storage key: ${key}`);
        } catch (error) {
          console.warn(`[CACHE-CLEAR] Failed to clear key ${key}:`, error);
        }
      });

      // Preserve match data and other important state
      console.log(`[CACHE-CLEAR] Preserving match data storage on mobile`);
    } else {
      // DESKTOP: More comprehensive clearing
      console.log(
        `[CACHE-CLEAR] Using comprehensive storage clearing for desktop`,
      );

      // Get all keys from both storage types
      const allKeys = safeStorageKeys();

      // Find keys that contain the match ID
      const matchKeys = allKeys.filter(
        (key) =>
          key.includes(`${matchId}`) &&
          (key.includes("messages") ||
            key.includes("reactions") ||
            key.includes("rq_persist") ||
            key.includes("match_data") ||
            key.includes("chat_") ||
            key.includes("auto_delete")),
      );

      console.log(
        `[CACHE-CLEAR] Found ${matchKeys.length} storage keys to clear:`,
        matchKeys,
      );

      // Remove each key
      matchKeys.forEach((key) => {
        try {
          safeStorageRemove(key);
          console.log(`[CACHE-CLEAR] Cleared storage key: ${key}`);
        } catch (error) {
          console.warn(`[CACHE-CLEAR] Failed to clear key ${key}:`, error);
        }
      });
    }
  } catch (error) {
    console.error(`[CACHE-CLEAR] Error clearing browser storage:`, error);
  }
}

/**
 * Clears persistent cache created by the query persistence system
 * MOBILE-FRIENDLY: Selective clearing based on context
 */
function clearPersistentCache(matchId: number, reason: string) {
  console.log(
    `[CACHE-CLEAR] Clearing persistent cache for match ${matchId}, reason: ${reason}`,
  );

  try {
    const isMobile = isMobileBrowser();

    if (isMobile && reason === "message_delete") {
      // MOBILE: Only clear message-related persistent cache
      console.log(
        `[CACHE-CLEAR] Using selective persistent cache clearing for mobile`,
      );

      const messageOnlyKeys = [
        `rq_persist_/api/messages_${matchId}`,
        `rq_persist__api_messages_${matchId}`,
        `rq_persist_apimessages${matchId}`,
        `rq_persist_["/api/messages",${matchId}]`,
      ];

      messageOnlyKeys.forEach((key) => {
        try {
          safeStorageRemove(key);
        } catch (error) {
          // Silently continue if key doesn't exist
        }
      });

      // Preserve match-related persistent cache
      console.log(`[CACHE-CLEAR] Preserving match persistent cache on mobile`);
    } else {
      // DESKTOP: Clear all persistent cache keys for this match
      console.log(
        `[CACHE-CLEAR] Using comprehensive persistent cache clearing`,
      );

      const persistentKeys = [
        `rq_persist_/api/messages_${matchId}`,
        `rq_persist__api_messages_${matchId}`,
        `rq_persist_apimessages${matchId}`,
        `rq_persist_["/api/messages",${matchId}]`,
        `global_messages_${matchId}`,
        `match_${matchId}_messages`,
      ];

      persistentKeys.forEach((key) => {
        try {
          safeStorageRemove(key);
        } catch (error) {
          // Silently continue if key doesn't exist
        }
      });
    }

    console.log(`[CACHE-CLEAR] Persistent cache cleared for match ${matchId}`);
  } catch (error) {
    console.error(`[CACHE-CLEAR] Error clearing persistent cache:`, error);
  }
}

/**
 * Resets global message persistence state
 * MOBILE-FRIENDLY: Conservative approach
 */
function resetGlobalMessagePersistence(matchId: number, reason: string) {
  console.log(
    `[CACHE-CLEAR] Resetting global message persistence for match ${matchId}, reason: ${reason}`,
  );

  try {
    const isMobile = isMobileBrowser();

    if (isMobile && reason === "message_delete") {
      // MOBILE: Be very conservative - don't clear global state unnecessarily
      console.log(
        `[CACHE-CLEAR] Skipping global state clearing on mobile for stability`,
      );
      return;
    }

    // Clear any global state that might be cached
    if (typeof window !== "undefined") {
      // Clear any global variables that might hold cached data
      const globalKeys = Object.keys(window).filter(
        (key) => key.includes("message") && key.includes(`${matchId}`),
      );

      globalKeys.forEach((key) => {
        try {
          delete (window as any)[key];
        } catch (error) {
          // Silently continue
        }
      });
    }
  } catch (error) {
    console.error(
      `[CACHE-CLEAR] Error resetting global message persistence:`,
      error,
    );
  }
}

/**
 * Main cache invalidation handler
 * This function is called when a cache invalidation event is received
 * MOBILE-FRIENDLY: Context-aware invalidation
 */
export function handleCacheInvalidation(
  queryClient: QueryClient,
  event: CacheInvalidationEvent,
) {
  const { matchId, reason, messageId } = event;

  console.log(
    `[CACHE-INVALIDATION] Processing cache clear for match ${matchId}, reason: ${reason}`,
  );

  // MOBILE CHECK: Log device type for debugging
  const isMobile = isMobileBrowser();
  console.log(
    `[CACHE-INVALIDATION] Device type: ${isMobile ? "mobile" : "desktop"}`,
  );

  try {
    // 1. Clear React Query cache
    clearReactQueryCache(queryClient, matchId, reason);

    // 2. Clear browser storage
    clearBrowserStorage(matchId, reason);

    // 3. Clear persistent cache
    clearPersistentCache(matchId, reason);

    // 4. Reset global message persistence
    resetGlobalMessagePersistence(matchId, reason);

    console.log(
      `[CACHE-INVALIDATION] Complete cache invalidation completed for match ${matchId}`,
    );

    return {
      success: true,
      matchId,
      reason,
      messageId,
      deviceType: isMobile ? "mobile" : "desktop",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      `[CACHE-INVALIDATION] Error during cache invalidation:`,
      error,
    );

    return {
      success: false,
      matchId,
      reason,
      error: error instanceof Error ? error.message : "Unknown error",
      deviceType: isMobile ? "mobile" : "desktop",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Utility function to manually trigger cache invalidation
 * Useful for testing or manual cleanup
 * MOBILE-FRIENDLY: Device-aware
 */
export function manualCacheInvalidation(
  queryClient: QueryClient,
  matchId: number,
) {
  const isMobile = isMobileBrowser();
  console.log(
    `[CACHE-INVALIDATION] Manual cache invalidation triggered for match ${matchId} on ${isMobile ? "mobile" : "desktop"}`,
  );

  return handleCacheInvalidation(queryClient, {
    type: "cache:invalidate",
    action: "clear_message_cache",
    matchId,
    reason: "manual_trigger",
    timestamp: new Date().toISOString(),
    clearTargets: [
      "react_query_cache",
      "local_storage",
      "session_storage",
      "persistent_cache",
    ],
  });
}
