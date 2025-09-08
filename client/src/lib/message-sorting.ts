/**
 * Message sorting utilities for sorting conversations by timestamps
 * Handles null/undefined values safely and provides consistent sorting across components
 */

/**
 * Safely creates a Date object's timestamp from a string or undefined/null value
 * @param dateStr - Date string or undefined/null
 * @returns Timestamp number
 */
export const getTimestamp = (dateStr: string | undefined | null): number => {
  if (!dateStr) return 0;
  try {
    return new Date(dateStr).getTime();
  } catch {
    return 0;
  }
};

/**
 * Compare two message timestamps for sorting, with most recent first
 * @param a First timestamp (string or null/undefined)
 * @param b Second timestamp (string or null/undefined)
 * @returns Comparison result (-1, 0, 1)
 */
export const compareMessageTimes = (
  a: string | undefined | null, 
  b: string | undefined | null
): number => {
  // If both have timestamps, compare those
  if (a && b) {
    return getTimestamp(b) - getTimestamp(a);
  }
  
  // If only one has a timestamp, prioritize that one
  if (a) return -1;
  if (b) return 1;
  
  // If neither has a timestamp, they're equal
  return 0;
};

/**
 * Compare two match objects by lastMessageTime, with fallback to createdAt
 * @param a First match object
 * @param b Second match object
 * @returns Comparison result for sorting (negative = a before b, positive = b before a)
 */
export const compareMatchesByActivity = (
  a: { lastMessageTime?: string; createdAt: Date | string | null },
  b: { lastMessageTime?: string; createdAt: Date | string | null }
): number => {
  // First compare by lastMessageTime
  const messageTimeComparison = compareMessageTimes(a.lastMessageTime, b.lastMessageTime);
  if (messageTimeComparison !== 0) return messageTimeComparison;
  
  // Convert createdAt to string if it's a Date object
  const createdAtA = a.createdAt instanceof Date 
    ? a.createdAt.toISOString() 
    : typeof a.createdAt === 'string' ? a.createdAt : '';
    
  const createdAtB = b.createdAt instanceof Date 
    ? b.createdAt.toISOString() 
    : typeof b.createdAt === 'string' ? b.createdAt : '';
  
  // Fallback to creation date if lastMessageTime comparison is equal
  return getTimestamp(createdAtB) - getTimestamp(createdAtA);
};