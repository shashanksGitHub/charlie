/**
 * Storage utilities for handling localStorage and sessionStorage
 * with robust error handling and fallback mechanisms for quota issues
 */

/**
 * Safe storage setter: tries localStorage first, falls back to sessionStorage
 * if quota is exceeded or other errors occur
 */
export const safeStorageSet = (key: string, value: string) => {
  try {
    // Try localStorage first
    localStorage.setItem(key, value);
  } catch (error) {
    console.log(`[STORAGE] localStorage quota exceeded, using sessionStorage fallback for ${key}`);
    try {
      // Fall back to sessionStorage if localStorage fails
      sessionStorage.setItem(key, value);
    } catch (secondError) {
      console.warn(`[STORAGE] Both localStorage and sessionStorage failed: ${secondError}`);
      // No need to throw, just log and continue
    }
  }
};

/**
 * Safe storage getter: tries localStorage first, falls back to sessionStorage
 * Returns null if item doesn't exist in either storage
 */
export const safeStorageGet = (key: string): string | null => {
  try {
    // Try localStorage first
    const value = localStorage.getItem(key);
    if (value !== null) return value;
    
    // If not found in localStorage, try sessionStorage
    return sessionStorage.getItem(key);
  } catch (error) {
    console.warn(`[STORAGE] Error retrieving ${key} from storage: ${error}`);
    return null;
  }
};

/**
 * Safely removes item from both localStorage and sessionStorage
 */
export const safeStorageRemove = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[STORAGE] Error removing ${key} from localStorage: ${error}`);
  }
  
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn(`[STORAGE] Error removing ${key} from sessionStorage: ${error}`);
  }
};

/**
 * Safely clears all items from both localStorage and sessionStorage
 * Use with caution!
 */
export const safeStorageClear = (): void => {
  try {
    localStorage.clear();
  } catch (error) {
    console.warn(`[STORAGE] Error clearing localStorage: ${error}`);
  }
  
  try {
    sessionStorage.clear();
  } catch (error) {
    console.warn(`[STORAGE] Error clearing sessionStorage: ${error}`);
  }
};

/**
 * Gets all keys from localStorage and sessionStorage combined
 */
export const safeStorageKeys = (): string[] => {
  const keys: Set<string> = new Set();
  
  try {
    // Get localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.add(key);
    }
  } catch (error) {
    console.warn(`[STORAGE] Error accessing localStorage keys: ${error}`);
  }
  
  try {
    // Get sessionStorage keys
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) keys.add(key);
    }
  } catch (error) {
    console.warn(`[STORAGE] Error accessing sessionStorage keys: ${error}`);
  }
  
  return Array.from(keys);
};

/**
 * Attempts to save a JSON object to storage
 * @param key The storage key
 * @param value Any value that can be serialized with JSON.stringify
 */
export const safeStorageSetObject = <T>(key: string, value: T): void => {
  try {
    const serialized = JSON.stringify(value);
    safeStorageSet(key, serialized);
  } catch (error) {
    console.warn(`[STORAGE] Failed to serialize or save object at ${key}: ${error}`);
  }
};

/**
 * Attempts to retrieve and parse a JSON object from storage
 * @param key The storage key
 * @param defaultValue Optional default value if key doesn't exist or parsing fails
 */
export const safeStorageGetObject = <T>(key: string, defaultValue?: T): T | null => {
  try {
    const serialized = safeStorageGet(key);
    if (serialized === null) return defaultValue ?? null;
    
    return JSON.parse(serialized) as T;
  } catch (error) {
    console.warn(`[STORAGE] Failed to retrieve or parse object at ${key}: ${error}`);
    return defaultValue ?? null;
  }
};

/**
 * Checks if we have enough storage quota to save data
 * @param testSize Size in bytes to test (default 1MB)
 */
export const checkStorageQuota = (testSize: number = 1024 * 1024): boolean => {
  try {
    const testKey = '_quota_test_' + Math.random().toString(36).substring(2);
    const testData = new Array(testSize).join('a');
    
    localStorage.setItem(testKey, testData);
    localStorage.removeItem(testKey);
    
    return true;
  } catch (error) {
    console.warn('[STORAGE] Storage quota check failed - might be running out of space');
    return false;
  }
};

/**
 * Gets an estimate of how much localStorage is being used
 * This is approximate since it doesn't account for key size and other metadata
 */
export const getStorageUsageEstimate = (): number => {
  let totalBytes = 0;
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        // Approximate: 2 bytes per character for UTF-16
        totalBytes += (key.length + value.length) * 2;
      }
    }
  } catch (error) {
    console.warn(`[STORAGE] Error calculating storage size: ${error}`);
  }
  
  return totalBytes;
};

/**
 * For backward compatibility - aliases to match the old function names
 */
export const safeSetItem = safeStorageSet;
export const safeGetItem = safeStorageGet;
export const safeRemoveItem = safeStorageRemove;

/**
 * Defines options for storage cleanup operations
 */
export interface CleanupOptions {
  keyPattern?: string;
  olderThan?: number;
  maxItems?: number;
  deleteAll?: boolean;
  messageTrackingOnly?: boolean;
  callback?: (key: string, storage: Storage) => boolean;
}

/**
 * Cleans up storage entries based on various criteria
 * @param options Cleanup options
 */
export const cleanupStorage = (
  options: CleanupOptions = {}
): void => {
  try {
    const { 
      keyPattern, 
      olderThan, 
      maxItems, 
      deleteAll, 
      messageTrackingOnly,
      callback
    } = options;
    
    // Determine which storage objects to process
    const storages: Storage[] = messageTrackingOnly ? 
      [localStorage, sessionStorage] : [localStorage];
    
    // Process each storage object
    storages.forEach(storageObj => {
      // Get all keys
      const allKeys: string[] = [];
      for (let i = 0; i < storageObj.length; i++) {
        const key = storageObj.key(i);
        if (key) allKeys.push(key);
      }
      
      // Handle message tracking specially
      if (messageTrackingOnly) {
        const messageKeys = allKeys.filter(key => 
          key.startsWith('processed_message_') || 
          key.startsWith('counted_message_')
        );
        
        if (callback) {
          // Use callback to process message keys
          messageKeys.forEach(key => {
            if (callback(key, storageObj)) {
              storageObj.removeItem(key);
            }
          });
        } else {
          // No callback, just remove all message keys
          messageKeys.forEach(key => storageObj.removeItem(key));
        }
        return; // Skip other processing for message tracking
      }
      
      // For standard cleanup, check if we have criteria
      if (!keyPattern && !deleteAll && !callback) {
        return;
      }
      
      // Filter keys by pattern if specified
      const matchingKeys = keyPattern 
        ? allKeys.filter(key => {
            const patterns = keyPattern.split('|');
            return patterns.some(pattern => key.includes(pattern));
          })
        : allKeys;
      
      // Handle callback case
      if (callback) {
        matchingKeys.forEach(key => {
          if (callback(key, storageObj)) {
            storageObj.removeItem(key);
          }
        });
        return;
      }
      
      // Handle simple deletion case
      if (deleteAll) {
        matchingKeys.forEach(key => storageObj.removeItem(key));
        return;
      }
      
      // Handle time-based filtering
      if (olderThan) {
        const now = Date.now();
        const timestampedItems: { key: string; timestamp: number }[] = [];
        
        // Collect timestamp information for each key
        matchingKeys.forEach(key => {
          try {
            // Try to extract timestamp from key
            const keyParts = key.split('_');
            const potentialTimestamp = parseInt(keyParts[keyParts.length - 1], 10);
            
            if (!isNaN(potentialTimestamp) && potentialTimestamp > 1000000000000) {
              timestampedItems.push({ key, timestamp: potentialTimestamp });
              return;
            }
            
            // Try to extract timestamp from value if JSON
            const value = storageObj.getItem(key);
            if (value) {
              try {
                const parsedValue = JSON.parse(value);
                if (parsedValue.timestamp && !isNaN(parsedValue.timestamp)) {
                  timestampedItems.push({ key, timestamp: parsedValue.timestamp });
                  return;
                }
              } catch (e) {
                // Not valid JSON, ignore
              }
            }
            
            // Default case - use current time
            timestampedItems.push({ key, timestamp: now });
          } catch (e) {
            console.warn(`[STORAGE] Error processing key ${key}:`, e);
          }
        });
        
        // Remove items older than threshold
        timestampedItems
          .filter(item => now - item.timestamp > olderThan)
          .forEach(item => storageObj.removeItem(item.key));
        
        // Handle maxItems limit if specified
        if (maxItems && maxItems > 0) {
          // Sort by timestamp (newest first)
          timestampedItems.sort((a, b) => b.timestamp - a.timestamp);
          
          // Remove items beyond the limit
          if (timestampedItems.length > maxItems) {
            timestampedItems
              .slice(maxItems)
              .forEach(item => storageObj.removeItem(item.key));
          }
        }
      }
    });
  } catch (error) {
    console.warn('[STORAGE] Error during cleanup:', error);
  }
};