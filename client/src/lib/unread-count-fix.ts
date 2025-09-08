/**
 * Unread Count Fix
 * 
 * This module handles the unread message count tracking to prevent
 * the double counting bug where unread messages count increases by 2, 4, 6
 * instead of 1, 2, 3
 */

// Import type definitions from storage-utils to fix TypeScript errors
import type { CleanupOptions } from './storage-utils';
import { safeStorageSet, safeStorageGet, safeStorageRemove, cleanupStorage } from './storage-utils';

// Track messages that have been processed for unread counts
const processedMessageIds = new Set<number>();

// Track messages that have been counted in unread totals
const countedMessageIds = new Set<number>();

// Message processing timestamp tracking
const messageProcessingTimestamps = new Map<number, number>();

/**
 * Track a message as processed to prevent double-processing
 */
export function markMessageAsProcessed(messageId: number): boolean {
  // If already processed, return false
  if (processedMessageIds.has(messageId)) {
    return false;
  }
  
  // Mark as processed and record timestamp
  processedMessageIds.add(messageId);
  messageProcessingTimestamps.set(messageId, Date.now());
  
  // Also store with safe storage mechanisms for cross-component deduplication
  try {
    const key = `processed_message_${messageId}`;
    safeStorageSet(key, Date.now().toString());
    
    // Record list of processed messages for debugging
    const allProcessedKey = 'all_processed_messages';
    const existingData = safeStorageGet(allProcessedKey);
    let allIds = [];
    
    if (existingData) {
      allIds = JSON.parse(existingData);
    }
    
    if (!allIds.includes(messageId)) {
      allIds.push(messageId);
      safeStorageSet(allProcessedKey, JSON.stringify(allIds));
    }
  } catch (error) {
    console.error('[UNREAD-COUNT-FIX] Error updating storage:', error);
  }
  
  console.log(`[UNREAD-COUNT-FIX] Marked message ${messageId} as processed`);
  return true;
}

/**
 * Check if a message has been processed already
 */
export function isMessageProcessed(messageId: number): boolean {
  // First check in-memory cache (fastest)
  if (processedMessageIds.has(messageId)) {
    console.log(`[UNREAD-COUNT-FIX] Message ${messageId} already processed (memory)`);
    return true;
  }
  
  // Then check storage with fallbacks for cross-component deduplication
  try {
    const key = `processed_message_${messageId}`;
    if (safeStorageGet(key)) {
      // Update in-memory cache for future checks
      processedMessageIds.add(messageId);
      console.log(`[UNREAD-COUNT-FIX] Message ${messageId} already processed (persistent storage)`);
      return true;
    }
  } catch (error) {
    console.error('[UNREAD-COUNT-FIX] Error checking storage:', error);
  }
  
  return false;
}

/**
 * Mark a message as counted in the unread count
 */
export function markMessageAsCounted(messageId: number): boolean {
  // If already counted, return false
  if (countedMessageIds.has(messageId)) {
    return false;
  }
  
  // Mark as counted
  countedMessageIds.add(messageId);
  
  // Also store with safe storage for cross-component deduplication
  try {
    const key = `counted_message_${messageId}`;
    safeStorageSet(key, Date.now().toString());
  } catch (error) {
    console.error('[UNREAD-COUNT-FIX] Error updating storage:', error);
  }
  
  console.log(`[UNREAD-COUNT-FIX] Marked message ${messageId} as counted in unread total`);
  return true;
}

/**
 * Check if a message has already been counted
 */
export function isMessageCounted(messageId: number): boolean {
  // First check in-memory cache (fastest)
  if (countedMessageIds.has(messageId)) {
    return true;
  }
  
  // Then check storage with fallbacks
  try {
    const key = `counted_message_${messageId}`;
    if (safeStorageGet(key)) {
      // Update in-memory cache for future checks
      countedMessageIds.add(messageId);
      return true;
    }
  } catch (error) {
    console.error('[UNREAD-COUNT-FIX] Error checking storage:', error);
  }
  
  return false;
}

/**
 * Reset tracking for all messages (use with caution, mainly for testing)
 */
export function resetMessageTracking(): void {
  processedMessageIds.clear();
  countedMessageIds.clear();
  messageProcessingTimestamps.clear();
  
  // Clear storage with safe utilities
  try {
    const processedKeys = [];
    const countedKeys = [];
    
    // Use cleanupStorage to automatically clean up all message-related entries
    cleanupStorage({
      messageTrackingOnly: true, 
      callback: (key: string, storage: Storage) => {
        if (key.startsWith('processed_message_')) {
          processedKeys.push(key);
        } else if (key.startsWith('counted_message_')) {
          countedKeys.push(key);
        }
        // Return true to remove this key
        return true;
      }
    });
    
    // Also remove tracking list
    safeStorageRemove('all_processed_messages');
    
    console.log(`[UNREAD-COUNT-FIX] Reset all message tracking (${processedKeys.length} processed, ${countedKeys.length} counted)`);
  } catch (error) {
    console.error('[UNREAD-COUNT-FIX] Error clearing storage:', error);
  }
}

/**
 * Clear old message tracking entries to prevent memory leaks
 * Messages older than the specified time will be removed from tracking
 */
export function cleanupOldMessages(olderThanMs: number = 24 * 60 * 60 * 1000): void {
  const now = Date.now();
  const keysToRemove: number[] = [];
  
  // Find old messages
  messageProcessingTimestamps.forEach((timestamp, messageId) => {
    if (now - timestamp > olderThanMs) {
      keysToRemove.push(messageId);
    }
  });
  
  // Remove from in-memory tracking
  keysToRemove.forEach(messageId => {
    processedMessageIds.delete(messageId);
    countedMessageIds.delete(messageId);
    messageProcessingTimestamps.delete(messageId);
    
    // Also remove from storage using safe utilities
    try {
      safeStorageRemove(`processed_message_${messageId}`);
      safeStorageRemove(`counted_message_${messageId}`);
    } catch (error) {
      console.error('[UNREAD-COUNT-FIX] Error removing old entries from storage:', error);
    }
  });
  
  if (keysToRemove.length > 0) {
    console.log(`[UNREAD-COUNT-FIX] Cleaned up ${keysToRemove.length} old message tracking entries`);
  }
}

// Setup periodic cleanup
setInterval(() => {
  cleanupOldMessages();
}, 30 * 60 * 1000); // Run every 30 minutes

// Initialize with a log statement
console.log('[UNREAD-COUNT-FIX] Unread count fix module initialized');