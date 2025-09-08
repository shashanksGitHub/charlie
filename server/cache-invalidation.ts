/**
 * Cache Invalidation Utility
 * 
 * This utility ensures that when messages are deleted from the database,
 * all related caches are also cleared to maintain data consistency.
 */

import WebSocket from 'ws';

interface CacheInvalidationOptions {
  matchId: number;
  userId?: number;
  messageId?: number;
  reason: 'message_delete' | 'match_delete' | 'bulk_delete' | 'auto_delete';
}

/**
 * Broadcasts cache invalidation events to connected WebSocket clients
 * This ensures all user sessions clear their caches in real-time
 */
export function broadcastCacheInvalidation(
  connectedUsers: Map<number, WebSocket>,
  options: CacheInvalidationOptions
) {
  const { matchId, userId, messageId, reason } = options;
  
  console.log(`[CACHE-INVALIDATION] Broadcasting cache clear for match ${matchId}, reason: ${reason}`);

  // Create the cache invalidation message
  const cacheInvalidationMessage = {
    type: 'cache:invalidate',
    action: 'clear_message_cache',
    matchId,
    messageId,
    reason,
    timestamp: new Date().toISOString(),
    clearTargets: [
      'react_query_cache',
      'local_storage',
      'session_storage',
      'persistent_cache'
    ]
  };

  // Broadcast to all connected users (they'll filter based on their access)
  connectedUsers.forEach((socket, connectedUserId) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(cacheInvalidationMessage));
        console.log(`[CACHE-INVALIDATION] Sent cache clear to user ${connectedUserId}`);
      } catch (error) {
        console.error(`[CACHE-INVALIDATION] Failed to send to user ${connectedUserId}:`, error);
      }
    }
  });
}

/**
 * Generates all possible cache keys for a given match
 * This ensures we clear all variations of cached data
 */
export function generateCacheKeysForMatch(matchId: number): string[] {
  const keys = [
    // React Query cache keys
    `["/api/messages",${matchId}]`,
    `["/api/messages/${matchId}"]`,
    `["/api/matches/${matchId}/reactions"]`,
    `["/api/matches/${matchId}/auto-delete-settings"]`,
    
    // Persistent cache keys (from queryClient.ts)
    `rq_persist_/api/messages_${matchId}`,
    `rq_persist__api_messages_${matchId}`,
    `rq_persist_apimessages${matchId}`,
    
    // Direct storage keys
    `match_data_${matchId}`,
    `messages_${matchId}`,
    `reactions_${matchId}`,
    `typing_status_${matchId}`,
    
    // Global message persistence keys
    `global_messages_${matchId}`,
    `match_${matchId}_messages`,
    `chat_${matchId}_data`,
    
    // Auto-delete related keys
    `MEET_chat_auto_delete_${matchId}`,
    `MEET_chat_auto_delete_unit_${matchId}`,
    
    // Any keys that might contain the match ID
    `*${matchId}*messages*`,
    `*messages*${matchId}*`,
  ];
  
  return keys;
}

/**
 * Complete cache invalidation workflow
 * This is the main function to call when messages are deleted
 */
export function invalidateMessageCaches(
  connectedUsers: Map<number, WebSocket>,
  options: CacheInvalidationOptions
) {
  const { matchId, reason } = options;
  
  console.log(`[CACHE-INVALIDATION] Starting complete cache invalidation for match ${matchId}`);
  
  try {
    // Broadcast to all connected clients
    broadcastCacheInvalidation(connectedUsers, options);
    
    console.log(`[CACHE-INVALIDATION] Complete cache invalidation initiated for match ${matchId}`);
    
    return {
      success: true,
      matchId,
      reason,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`[CACHE-INVALIDATION] Error during cache invalidation:`, error);
    return {
      success: false,
      matchId,
      reason,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}