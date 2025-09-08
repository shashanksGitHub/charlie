/**
 * Message Deduplication Module
 * 
 * This module provides utilities to prevent the same message from being processed multiple times,
 * which can cause unread message counts to double, triple, etc.
 * 
 * The deduplication system works on three levels:
 * 1. In-memory tracking during the current session
 * 2. Session storage tracking to persist across page refreshes in the same browser session
 * 3. Local storage tracking for longer-term deduplication across browser restarts
 * 
 * CRITICAL FIX FOR DOUBLE-COUNTING BUG:
 * This module is part of a comprehensive fix for the issue where messages
 * are counted multiple times in unread counts, causing them to increase
 * by 2, 4, 6 instead of 1, 2, 3.
 */

// Track processed message IDs in memory for fastest access
const processedMessages = new Set<number>();

// Message fingerprint type for content-based deduplication
interface MessageFingerprint {
  messageId: number;
  timestamp: string;
}

// Content-based fingerprinting to detect duplicate messages with different IDs
const messageFingerprints = new Map<string, MessageFingerprint>();

// Key for session storage
const SESSION_STORAGE_KEY = 'processed_message_ids';

// Key for local storage with timestamp
const LOCAL_STORAGE_KEY = 'processed_message_ids_with_time';

// Maximum age of message tracking (24 hours in milliseconds)
const MAX_TRACKING_AGE = 24 * 60 * 60 * 1000;

/**
 * Initialize the deduplication system with enhanced reconnection support
 * 
 * This function is responsible for:
 * 1. Loading any existing message tracking from session/local storage
 * 2. Setting up the global cache for cross-module access
 * 3. Implementing the "Message Recovery Protocol" to prevent messages from disappearing
 */
export function initMessageDeduplication(): void {
  // Track initialization time for performance metrics
  const startTime = performance.now();
  
  try {
    // First phase: Load session storage (fast, higher priority)
    const storedSessionIds = sessionStorage.getItem(SESSION_STORAGE_KEY);
    let sessionIdsCount = 0;
    
    if (storedSessionIds) {
      try {
        const ids = JSON.parse(storedSessionIds) as number[];
        ids.forEach(id => processedMessages.add(id));
        sessionIdsCount = ids.length;
        console.log(`[DEDUP] Loaded ${ids.length} message IDs from session storage`);
      } catch (parseErr) {
        // Handle JSON parse error by attempting to reset session storage
        console.error('[DEDUP] Error parsing session storage, resetting:', parseErr);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
    
    // Second phase: Load local storage (slower, fallback/persistence)
    try {
      const storedLocalIds = localStorage.getItem(LOCAL_STORAGE_KEY);
      let localIdsCount = 0;
      
      if (storedLocalIds) {
        try {
          const ids = JSON.parse(storedLocalIds) as number[];
          let newIdsCount = 0;
          
          // Only add IDs that aren't already in the set
          ids.forEach(id => {
            if (!processedMessages.has(id)) {
              processedMessages.add(id);
              newIdsCount++;
            }
          });
          
          localIdsCount = ids.length;
          console.log(`[DEDUP] Loaded ${localIdsCount} message IDs from local storage (${newIdsCount} new)`);
        } catch (parseErr) {
          console.error('[DEDUP] Error parsing local storage, resetting:', parseErr);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      }
      
      // Fingerprint database recovery 
      loadFingerprintDatabase();
    } catch (localStoreErr) {
      // Local storage might be disabled or over quota
      console.warn('[DEDUP] Could not access local storage:', localStoreErr);
    }
    
    // Clean up old entries to prevent storage from growing too large
    cleanupOldEntries();
    
    // Create global cache on window for cross-module access
    window.__meetMessageDeduplicationCache = processedMessages;
    
    // Record performance metrics
    const initTime = performance.now() - startTime;
    console.log(`[DEDUP] Global message deduplication system initialized in ${initTime.toFixed(2)}ms`);
  } catch (error) {
    console.error('[DEDUP] Error initializing message deduplication:', error);
  }
}

/**
 * Load the message fingerprint database from storage
 * This is used to prevent duplicate messages based on content hashing
 */
function loadFingerprintDatabase(): void {
  try {
    // First load from session storage
    let fingerprintCount = 0;
    
    // Process all session storage keys
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('msg_fingerprint_')) {
        try {
          const value = sessionStorage.getItem(key);
          if (value) {
            const fingerprint = JSON.parse(value);
            // Key format: msg_fingerprint_[matchId]_[senderId]
            const parts = key.split('_');
            if (parts.length >= 4) {
              const matchId = parseInt(parts[2], 10);
              const senderId = parseInt(parts[3], 10);
              
              // Add to in-memory fingerprint map
              const mapKey = `${matchId}:${senderId}:${fingerprint.hash}`;
              messageFingerprints.set(mapKey, {
                messageId: fingerprint.messageId,
                timestamp: fingerprint.timestamp
              });
              fingerprintCount++;
            }
          }
        } catch (err) {
          // Skip this fingerprint if there's an error
          console.warn(`[DEDUP] Error loading fingerprint ${key}:`, err);
        }
      }
    }
    
    if (fingerprintCount > 0) {
      console.log(`[DEDUP] Loaded ${fingerprintCount} message fingerprints`);
    }
  } catch (error) {
    console.error('[DEDUP] Error loading fingerprint database:', error);
  }
}

/**
 * Check if a message has already been processed
 */
export function isMessageProcessed(messageId: number): boolean {
  // First check in-memory cache (fastest)
  if (processedMessages.has(messageId)) {
    console.log(`[DEDUP] Message ${messageId} found in memory cache`);
    return true;
  }
  
  // Then check session storage
  try {
    const storedIds = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (storedIds) {
      const ids = JSON.parse(storedIds) as number[];
      if (ids.includes(messageId)) {
        // Add to in-memory cache for faster future lookups
        processedMessages.add(messageId);
        console.log(`[DEDUP] Message ${messageId} found in session storage`);
        return true;
      }
    }
  } catch (error) {
    console.error('[DEDUP] Error checking session storage:', error);
  }
  
  // Finally check local storage (with timestamps)
  try {
    const storedEntries = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedEntries) {
      const entries = JSON.parse(storedEntries) as Array<[number, number]>; // [messageId, timestamp]
      const found = entries.some(([id, _]) => id === messageId);
      if (found) {
        // Add to in-memory and session storage for faster future lookups
        markMessageAsProcessed(messageId);
        console.log(`[DEDUP] Message ${messageId} found in local storage`);
        return true;
      }
    }
  } catch (error) {
    console.error('[DEDUP] Error checking local storage:', error);
  }
  
  return false;
}

/**
 * Mark a message as processed to prevent duplicate processing
 */
export function markMessageAsProcessed(messageId: number): void {
  // Add to in-memory set
  processedMessages.add(messageId);
  
  // Update session storage
  try {
    const storedIds = sessionStorage.getItem(SESSION_STORAGE_KEY);
    let ids: number[] = [];
    if (storedIds) {
      ids = JSON.parse(storedIds) as number[];
    }
    if (!ids.includes(messageId)) {
      ids.push(messageId);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(ids));
    }
  } catch (error) {
    console.error('[DEDUP] Error updating session storage:', error);
  }
  
  // Update local storage with timestamp
  try {
    const storedEntries = localStorage.getItem(LOCAL_STORAGE_KEY);
    let entries: Array<[number, number]> = []; // [messageId, timestamp]
    if (storedEntries) {
      entries = JSON.parse(storedEntries) as Array<[number, number]>;
    }
    
    // Check if message ID already exists in storage
    const existingIndex = entries.findIndex(([id, _]) => id === messageId);
    if (existingIndex === -1) {
      // Add new entry with current timestamp
      entries.push([messageId, Date.now()]);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
    }
  } catch (error) {
    console.error('[DEDUP] Error updating local storage:', error);
  }
}

/**
 * Clean up old entries from local storage to prevent it from growing too large
 */
function cleanupOldEntries(): void {
  try {
    const storedEntries = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!storedEntries) return;
    
    const entries = JSON.parse(storedEntries) as Array<[number, number]>;
    const now = Date.now();
    
    // Filter out entries older than MAX_TRACKING_AGE
    const validEntries = entries.filter(([_, timestamp]) => {
      return now - timestamp < MAX_TRACKING_AGE;
    });
    
    if (validEntries.length !== entries.length) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(validEntries));
      console.log(`[DEDUP] Cleaned up ${entries.length - validEntries.length} old entries`);
    }
  } catch (error) {
    console.error('[DEDUP] Error cleaning up old entries:', error);
  }
}

/**
 * Reset all message tracking (mainly for testing)
 */
export function resetMessageTracking(): void {
  // Clear in-memory caches
  processedMessages.clear();
  messageFingerprints.clear();
  
  try {
    // Clear standard tracking storage
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    
    // Clear fingerprint data from session storage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('msg_fingerprint_')) {
        sessionStorage.removeItem(key);
      }
    }
    
    console.log('[DEDUP] All message tracking has been reset');
  } catch (error) {
    console.error('[DEDUP] Error resetting message tracking:', error);
  }
}

/**
 * Clear all deduplication data - used during logout
 * 
 * There are two modes:
 * 1. preserveStorage=true (default): Clear memory but preserve persistent storage
 *    Used for page refreshes and reconnects to maintain message history
 * 2. preserveStorage=false: Clear everything including persistent storage
 *    Used for explicit logout to completely reset the message system
 */
export function clearAllDeduplicationData(preserveStorage: boolean = true): void {
  // Clear in-memory tracking
  processedMessages.clear();
  messageFingerprints.clear();
  
  // For explicit logout, also clear storage
  if (!preserveStorage) {
    try {
      // Clear session storage message tracking
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      
      // Clear all fingerprint data from session storage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('msg_fingerprint_') || key.startsWith('event_'))) {
          sessionStorage.removeItem(key);
        }
      }
      
      // Also clear local storage duplicates (if using persistence)
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        
        // Clear all fingerprint data from local storage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('msg_fingerprint_') || key.startsWith('msg_processed_'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (localErr) {
        // Ignore local storage errors - possibly blocked or not available
      }
      
      console.log('[DEDUP] All message tracking and fingerprint data has been cleared (full logout)');
    } catch (error) {
      console.error('[DEDUP] Error clearing storage data:', error);
    }
  } else {
    console.log('[DEDUP] In-memory message tracking cleared, storage preserved for reconnect');
  }
}

/**
 * Check if a message is a duplicate based on content fingerprinting
 * This is a more sophisticated method to catch duplicates even with different IDs
 * 
 * @param messageId - The ID of the message to check
 * @param content - The content of the message
 * @param senderId - The ID of the user who sent the message
 * @param matchId - The ID of the match this message belongs to
 * @returns true if the message is a duplicate, false otherwise
 */
export function isMessageDuplicate(messageId: number, content: string, senderId: number, matchId: number): boolean {
  // Skip empty content
  if (!content || content.trim() === '') {
    return false;
  }
  
  // Create a simple hash of the content to use as part of the key
  // This allows us to detect identical messages sent by the same person to the same match
  let contentHash = 0;
  for (let i = 0; i < content.length; i++) {
    contentHash = ((contentHash << 5) - contentHash) + content.charCodeAt(i);
    contentHash |= 0; // Convert to 32bit integer
  }
  
  // Create a map key that combines match, sender and content hash
  const mapKey = `${matchId}:${senderId}:${contentHash}`;
  
  // First check in-memory map (fastest)
  if (messageFingerprints.has(mapKey)) {
    const existingFingerprint = messageFingerprints.get(mapKey);
    if (existingFingerprint && existingFingerprint.messageId !== messageId) {
      console.log(`[DEDUP] Detected duplicate message by content fingerprint (memory)`);
      return true;
    }
  }
  
  // Then check session storage (slower)
  // Create a storage key for this fingerprint
  const fingerprintKey = `msg_fingerprint_${matchId}_${senderId}_${contentHash}`;
  
  try {
    const existingFingerprint = sessionStorage.getItem(fingerprintKey);
    if (existingFingerprint) {
      try {
        const fingerprint = JSON.parse(existingFingerprint);
        if (fingerprint && fingerprint.messageId !== messageId) {
          console.log(`[DEDUP] Detected duplicate message by content fingerprint (storage): ${content.substring(0, 20)}...`);
          
          // Add to in-memory cache for faster future lookups
          messageFingerprints.set(mapKey, {
            messageId: fingerprint.messageId,
            timestamp: fingerprint.timestamp
          });
          
          return true;
        }
      } catch (parseErr) {
        // Ignore parse errors and default to not a duplicate
        console.warn(`[DEDUP] Error parsing fingerprint ${fingerprintKey}:`, parseErr);
      }
    }
  } catch (error) {
    console.error('[DEDUP] Error checking content fingerprint:', error);
  }
  
  return false;
}

/**
 * Record a message in the deduplication system to prevent future duplicates
 * 
 * @param messageId - The ID of the message to record
 * @param content - The content of the message
 * @param senderId - The ID of the user who sent the message
 * @param matchId - The ID of the match this message belongs to
 */
export function recordMessageInDeduplicationSystem(messageId: number, content: string, senderId: number, matchId: number): void {
  // First mark the message as processed using the standard tracking
  markMessageAsProcessed(messageId);
  
  // Skip empty content
  if (!content || content.trim() === '') {
    return;
  }
  
  // Create a simple hash of the content
  let contentHash = 0;
  for (let i = 0; i < content.length; i++) {
    contentHash = ((contentHash << 5) - contentHash) + content.charCodeAt(i);
    contentHash |= 0; // Convert to 32bit integer
  }
  
  // Create a fingerprint map key
  const mapKey = `${matchId}:${senderId}:${contentHash}`;
  
  // Add to in-memory fingerprint map for fastest future lookups
  messageFingerprints.set(mapKey, {
    messageId: messageId,
    timestamp: new Date().toISOString()
  });
  
  // Create a storage key for this fingerprint
  const fingerprintKey = `msg_fingerprint_${matchId}_${senderId}_${contentHash}`;
  
  // Store this fingerprint in session storage with additional metadata
  try {
    const fingerprint = {
      messageId: messageId,
      hash: contentHash,
      timestamp: new Date().toISOString()
    };
    
    sessionStorage.setItem(fingerprintKey, JSON.stringify(fingerprint));
  } catch (error) {
    console.error('[DEDUP] Error recording message fingerprint:', error);
  }
}

// Initialize the deduplication system when the module is loaded
initMessageDeduplication();