/**
 * Direct Count Fix
 * 
 * This module provides a direct fix for the unread message count doubling issue
 * by maintaining a global set of processed messages with both in-memory and
 * multi-level storage-based tracking for durability.
 * 
 * ENHANCED VERSION:
 * - Uses both localStorage AND sessionStorage for better persistence
 * - Implements progressive fallback strategy for maximum reliability
 * - Syncs memory cache with storage for consistent behavior
 * - Adds event-based notification for data changes
 */

// Track which messages have already been processed for count updates
const processedMessages = new Set<number>();

// Track which messages have been included in count calculation
const countedMessages = new Set<number>();

// Storage keys (named consistently between localStorage and sessionStorage)
const PROCESSED_MESSAGES_KEY = 'direct_fix_processed_messages';
const COUNTED_MESSAGES_KEY = 'direct_fix_counted_messages';

// Timestamp key to track last update time
const LAST_UPDATE_KEY = 'direct_fix_last_update';

// Initialize from storage with progressive fallback strategy
function initializeFromStorage() {
  try {
    // First try localStorage for more persistent data
    let processedData = localStorage.getItem(PROCESSED_MESSAGES_KEY);
    let countedData = localStorage.getItem(COUNTED_MESSAGES_KEY);
    let dataSource = 'localStorage';
    
    // If not available in localStorage, try sessionStorage as fallback
    if (!processedData) {
      processedData = sessionStorage.getItem(PROCESSED_MESSAGES_KEY);
      dataSource = 'sessionStorage (fallback)';
    }
    
    if (!countedData) {
      countedData = sessionStorage.getItem(COUNTED_MESSAGES_KEY);
      dataSource = dataSource === 'localStorage' ? 'mixed sources' : 'sessionStorage (fallback)';
    }
    
    // Process the data from whatever source we found it
    if (processedData) {
      const ids = JSON.parse(processedData) as number[];
      ids.forEach(id => processedMessages.add(id));
      console.log(`[DIRECT-COUNT-FIX] Loaded ${ids.length} processed message IDs from ${dataSource}`);
      
      // Sync back to both storages to ensure consistency
      sessionStorage.setItem(PROCESSED_MESSAGES_KEY, processedData);
      localStorage.setItem(PROCESSED_MESSAGES_KEY, processedData);
    }
    
    if (countedData) {
      const ids = JSON.parse(countedData) as number[];
      ids.forEach(id => countedMessages.add(id));
      console.log(`[DIRECT-COUNT-FIX] Loaded ${ids.length} counted message IDs from ${dataSource}`);
      
      // Sync back to both storages to ensure consistency
      sessionStorage.setItem(COUNTED_MESSAGES_KEY, countedData);
      localStorage.setItem(COUNTED_MESSAGES_KEY, countedData);
    }
    
    // Update timestamp of last initialization
    const now = Date.now();
    sessionStorage.setItem(LAST_UPDATE_KEY, now.toString());
    localStorage.setItem(LAST_UPDATE_KEY, now.toString());
    
  } catch (error) {
    console.error('[DIRECT-COUNT-FIX] Error loading from storage:', error);
    
    // If JSON parsing failed, try to recover by clearing corrupted data
    try {
      console.log('[DIRECT-COUNT-FIX] Attempting to recover from corrupted storage data');
      sessionStorage.removeItem(PROCESSED_MESSAGES_KEY);
      sessionStorage.removeItem(COUNTED_MESSAGES_KEY);
      localStorage.removeItem(PROCESSED_MESSAGES_KEY);
      localStorage.removeItem(COUNTED_MESSAGES_KEY);
    } catch (cleanupError) {
      console.error('[DIRECT-COUNT-FIX] Failed to clean up corrupted storage:', cleanupError);
    }
  }
}

// Run initial loading
initializeFromStorage();

/**
 * Check if a message has already been processed for counting
 * Now with enhanced multi-storage lookup for better reliability
 */
export function isMessageProcessed(messageId: number): boolean {
  // First check memory cache (fastest)
  if (processedMessages.has(messageId)) {
    return true;
  }
  
  // Then check session storage
  try {
    // Check localStorage first (more persistent)
    let existingData = localStorage.getItem(PROCESSED_MESSAGES_KEY);
    let storageType = 'localStorage';
    
    // If not in localStorage, try sessionStorage
    if (!existingData) {
      existingData = sessionStorage.getItem(PROCESSED_MESSAGES_KEY);
      storageType = 'sessionStorage';
    }
    
    if (existingData) {
      const ids = JSON.parse(existingData) as number[];
      if (ids.includes(messageId)) {
        // Update memory cache for faster future lookups
        processedMessages.add(messageId);
        console.log(`[DIRECT-COUNT-FIX] Message ${messageId} found in ${storageType} as processed`);
        return true;
      }
    }
  } catch (error) {
    console.error('[DIRECT-COUNT-FIX] Error reading from storage:', error);
  }
  
  return false;
}

/**
 * Mark a message as processed with enhanced storage synchronization
 */
export function markMessageAsProcessed(messageId: number): void {
  // Skip if already in memory cache
  if (processedMessages.has(messageId)) {
    return;
  }
  
  // Add to memory cache
  processedMessages.add(messageId);
  
  // Store in both storage types for maximum persistence
  try {
    // Get existing IDs from localStorage first
    let existingData = localStorage.getItem(PROCESSED_MESSAGES_KEY);
    let ids: number[] = [];
    
    if (existingData) {
      ids = JSON.parse(existingData);
    } else {
      // If not in localStorage, try sessionStorage as fallback
      const sessionData = sessionStorage.getItem(PROCESSED_MESSAGES_KEY);
      if (sessionData) {
        ids = JSON.parse(sessionData);
      }
    }
    
    // Add the new ID if not already present
    if (!ids.includes(messageId)) {
      ids.push(messageId);
      const newData = JSON.stringify(ids);
      
      // Store in both storage mechanisms for reliability
      localStorage.setItem(PROCESSED_MESSAGES_KEY, newData);
      sessionStorage.setItem(PROCESSED_MESSAGES_KEY, newData);
      
      // Update timestamp
      const now = Date.now();
      localStorage.setItem(LAST_UPDATE_KEY, now.toString());
      sessionStorage.setItem(LAST_UPDATE_KEY, now.toString());
      
      console.log(`[DIRECT-COUNT-FIX] Marked message ${messageId} as processed and saved to all storage types`);
      
      // Dispatch event for any components that need to know about this change
      window.dispatchEvent(new CustomEvent('message:processed', { 
        detail: { messageId, timestamp: now }
      }));
    }
  } catch (error) {
    console.error('[DIRECT-COUNT-FIX] Error saving to storage:', error);
  }
}

/**
 * Check if a message is already counted in unread total
 * Using multi-storage lookup for better reliability
 */
export function isMessageCounted(messageId: number): boolean {
  // First check memory cache
  if (countedMessages.has(messageId)) {
    return true;
  }
  
  // Then check storage with fallback strategy
  try {
    // Try localStorage first (more persistent)
    let existingData = localStorage.getItem(COUNTED_MESSAGES_KEY);
    let storageType = 'localStorage';
    
    // If not in localStorage, try sessionStorage
    if (!existingData) {
      existingData = sessionStorage.getItem(COUNTED_MESSAGES_KEY);
      storageType = 'sessionStorage';
    }
    
    if (existingData) {
      const ids = JSON.parse(existingData) as number[];
      if (ids.includes(messageId)) {
        // Update memory cache for faster future lookups
        countedMessages.add(messageId);
        console.log(`[DIRECT-COUNT-FIX] Message ${messageId} found in ${storageType} as counted`);
        return true;
      }
    }
  } catch (error) {
    console.error('[DIRECT-COUNT-FIX] Error reading from storage:', error);
  }
  
  return false;
}

/**
 * Mark a message as counted with enhanced storage synchronization
 */
export function markMessageAsCounted(messageId: number): void {
  // Skip if already in memory cache
  if (countedMessages.has(messageId)) {
    return;
  }
  
  // Add to memory cache
  countedMessages.add(messageId);
  
  // Store in both storage types for maximum persistence
  try {
    // Get existing IDs from localStorage first
    let existingData = localStorage.getItem(COUNTED_MESSAGES_KEY);
    let ids: number[] = [];
    
    if (existingData) {
      ids = JSON.parse(existingData);
    } else {
      // If not in localStorage, try sessionStorage as fallback
      const sessionData = sessionStorage.getItem(COUNTED_MESSAGES_KEY);
      if (sessionData) {
        ids = JSON.parse(sessionData);
      }
    }
    
    // Add the new ID if not already present
    if (!ids.includes(messageId)) {
      ids.push(messageId);
      const newData = JSON.stringify(ids);
      
      // Store in both storage mechanisms for reliability
      localStorage.setItem(COUNTED_MESSAGES_KEY, newData);
      sessionStorage.setItem(COUNTED_MESSAGES_KEY, newData);
      
      // Update timestamp
      const now = Date.now();
      localStorage.setItem(LAST_UPDATE_KEY, now.toString());
      sessionStorage.setItem(LAST_UPDATE_KEY, now.toString());
      
      console.log(`[DIRECT-COUNT-FIX] Marked message ${messageId} as counted and saved to all storage types`);
      
      // Dispatch event for any components that need to know about this change
      window.dispatchEvent(new CustomEvent('message:counted', { 
        detail: { messageId, timestamp: now }
      }));
    }
  } catch (error) {
    console.error('[DIRECT-COUNT-FIX] Error saving to storage:', error);
  }
}

/**
 * Reset all trackers with complete cleanup across storage types
 */
export function resetTracking(): void {
  // Clear memory cache
  processedMessages.clear();
  countedMessages.clear();
  
  // Clear all storage across both mechanisms
  try {
    // Clear localStorage
    localStorage.removeItem(PROCESSED_MESSAGES_KEY);
    localStorage.removeItem(COUNTED_MESSAGES_KEY);
    localStorage.removeItem(LAST_UPDATE_KEY);
    
    // Clear sessionStorage
    sessionStorage.removeItem(PROCESSED_MESSAGES_KEY);
    sessionStorage.removeItem(COUNTED_MESSAGES_KEY);
    sessionStorage.removeItem(LAST_UPDATE_KEY);
    
    console.log('[DIRECT-COUNT-FIX] Reset all tracking information across all storage types');
    
    // Notify any listeners that tracking has been reset
    window.dispatchEvent(new CustomEvent('unread:tracking:reset', { 
      detail: { timestamp: Date.now() }
    }));
  } catch (error) {
    console.error('[DIRECT-COUNT-FIX] Error clearing storage:', error);
  }
}

// Log module initialization
console.log('[DIRECT-COUNT-FIX] Message counting fix module initialized');