/**
 * Age calculation utilities for CHARLEY app
 * Handles age-based restrictions and compliance
 */

/**
 * Calculate age from date of birth
 * @param dateOfBirth Date of birth as Date object or string
 * @returns Age in years
 */
export function calculateAge(dateOfBirth: Date | string | null): number {
  if (!dateOfBirth) return 0;
  
  const birth = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  if (isNaN(birth.getTime())) return 0;
  
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Check if user is under 18 years old
 * @param dateOfBirth Date of birth as Date object or string
 * @returns True if user is under 18
 */
export function isUnder18(dateOfBirth: Date | string | null): boolean {
  return calculateAge(dateOfBirth) < 18;
}

/**
 * Check if user is under 14 years old
 * @param dateOfBirth Date of birth as Date object or string
 * @returns True if user is under 14
 */
export function isUnder14(dateOfBirth: Date | string | null): boolean {
  return calculateAge(dateOfBirth) < 14;
}

/**
 * Get age display string
 * @param dateOfBirth Date of birth as Date object or string
 * @returns Age display string or empty string if invalid
 */
export function getAgeDisplay(dateOfBirth: Date | string | null): string {
  const age = calculateAge(dateOfBirth);
  return age > 0 ? age.toString() : '';
}