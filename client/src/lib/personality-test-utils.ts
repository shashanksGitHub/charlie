import type { User } from '@shared/schema';

/**
 * Checks if a user has completed the personality test
 * @param user - The user object
 * @returns boolean indicating if the personality test is completed
 */
export function hasCompletedPersonalityTest(user?: User | null): boolean {
  if (!user) return false;
  return user.personalityTestCompleted === true;
}

/**
 * Checks if a user has personality test data (either completed or in progress)
 * @param user - The user object  
 * @returns boolean indicating if there is any personality test data
 */
export function hasPersonalityTestData(user?: User | null): boolean {
  if (!user) return false;
  return !!(user.personalityRecords && user.personalityRecords.trim() !== '' && user.personalityRecords !== 'null');
}

/**
 * Gets the personality test progress percentage
 * @param user - The user object
 * @returns number between 0-100 representing completion percentage, or null if no data
 */
export function getPersonalityTestProgress(user?: User | null): number | null {
  if (!user || !hasPersonalityTestData(user)) return null;
  
  try {
    const records = JSON.parse(user.personalityRecords!);
    if (records.responses && Array.isArray(records.responses)) {
      // Assuming 100 total statements
      return Math.round((records.responses.length / 100) * 100);
    }
  } catch (error) {
    console.warn('Error parsing personality records:', error);
  }
  
  return null;
}

/**
 * Determines if the user should be shown the personality test prompt
 * @param user - The user object
 * @returns boolean indicating if the test prompt should be shown
 */
export function shouldShowPersonalityTestPrompt(user?: User | null): boolean {
  if (!user) return false;
  
  // Don't show if already completed
  if (hasCompletedPersonalityTest(user)) return false;
  
  // Show if no data at all, or if data exists but not completed
  return true;
}
